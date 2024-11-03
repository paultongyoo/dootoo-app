import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import uuid from 'react-native-uuid';
import { uniqueNamesGenerator, adjectives, animals, NumberDictionary } from 'unique-names-generator';

// Local storage column keys
const DONE_COUNT_KEY = "user_done_count";
const TIP_COUNT_KEY = "user_tip_count";
const USERNAME_KEY = "user_username";
const ANON_ID_KEY = "user_anonymous_id";
const ITEM_LIST_KEY = "item_list";

const CREATEUSER_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/createUser_Dev';
const LOADITEMS_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadItems_Dev';
const SAVEITEMS_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/saveItems_Dev';

export const saveItems = async (item_list_obj) => {
  if (item_list_obj === undefined) {
    console.log("saveItems called with undefined parameter, exiting...");
    return;
  }

  // Local data is the source of truth for the app (most reliable and lowest latency)
  await saveItemsLocally(item_list_obj);

  // Asyncronously save to backend to enable community features. 
  // Ensure all UI data uses only locally stored data and is not reliant on real-time backend state.
  saveItemsToBackend(item_list_obj);
};

export const initalizeUser = async() => {
  try {  

    // Populate user vars with what's in local storage, if anything
    var username = await AsyncStorage.getItem(USERNAME_KEY);
    var anonId = await AsyncStorage.getItem(ANON_ID_KEY);
    var doneCountStr = '-1';
    var tipCountStr = '-1';
    
    // Username and/or anonId are empty, assume we're at first launch or corrupt and recreate user 
    if (!username || !anonId) {
        const userData = await createUser();
        username = userData.name;
        anonId = userData.anonymousId;
        doneCountStr = userData.doneCountStr;
        tipCountStr = userData.tipCountStr;
    } else {
      doneCountStr = await AsyncStorage.getItem(DONE_COUNT_KEY);
      tipCountStr = await AsyncStorage.getItem(TIP_COUNT_KEY);
    }
    return { 
      name: username, 
      anonymousId: anonId, 
      doneCount: doneCountStr,
      tipCount: tipCountStr
    };
  } catch (e) {
      console.log("initializeUser: Error reading user data:", e);
  }
};

export const loadUser = async() => {
  try {
    const loadedUser  = {
      username: await AsyncStorage.getItem(USERNAME_KEY),
      anonymousId: await AsyncStorage.getItem(ANON_ID_KEY),
      doneCountStr: await AsyncStorage.getItem(DONE_COUNT_KEY),
      tipCountStr: await AsyncStorage.getItem(TIP_COUNT_KEY)
    }
    console.log("Retrieved user from local storage: " + JSON.stringify(loadedUser));
    return loadedUser;
  } catch (error) {
    console.error('Error loading user from local storage:', error);
  }
};

export const loadItems = async () => {
  try {

    const localAnonId = await AsyncStorage.getItem(ANON_ID_KEY);
    if (!localAnonId) {
      console.log("Received null local anon Id, aborting loadItems!");
      return [];
    }
    const response = await axios.post(LOADITEMS_URL,
      {
        anonymous_id : localAnonId
      }
    );
    const item_array = JSON.parse(response.data.body);
    console.log(`Retrieved ${item_array.length} items from backend.`);
    //console.log("Item JSON: " + JSON.stringify(item_array));
    return item_array;
  } catch (error) {
    console.error('Error calling loadItems API:', error);
  }
};

export const resetAllData = async () => {
  try {
    await AsyncStorage.clear();
    console.log('All storage cleared');
  } catch (e) {
    console.error('Failed to clear AsyncStorage', e);
  }
};

// ******** BEGIN Non-EXPORTED METHODS *********

const createUser = async () => {

  try {
    // If username or anonymous doesn't exist, assume we're at first launch OR data has gotten corrupt.
    // (Re)initialize user name and anonymous UUID and store locally
    console.log("Generating new username and anonymous ID...");

    // Create username, anonymous ID, and initial user counts
    const newUsername = generateUsername();
    const newAnonymousId = uuid.v4();
    const doneCountStr = '0';
    const tipCountStr = '0';
    console.log(`Username created ${newUsername} with Anon ID ${newAnonymousId}`);

    // Store user data locally
    await saveUserLocally(newUsername, newAnonymousId, doneCountStr, tipCountStr);

    // Asyncronously pass generated user name and anonymous ID to backend to store on server
    saveUserToBackend(newUsername, newAnonymousId);
    
    return { 
      name: newUsername, 
      anonymousId: newAnonymousId, 
      doneCountStr: doneCountStr, 
      tipCountStr: tipCountStr 
    }
  } catch (error) {
    console.error('Error calling create User API:', error);
  }
};

const saveItemsToBackend = async(item_list_obj) => {
  try {

    const localAnonId = await AsyncStorage.getItem(ANON_ID_KEY);
    console.log("Saving to backend for anon Id: " + localAnonId);
    await axios.post(SAVEITEMS_URL,
      {
        anonymous_id: localAnonId,
        items_str: JSON.stringify(item_list_obj)
      }
    );
    console.log(`Saved list to backend storage with ${item_list_obj.length} items.`);
  } catch (e) {
    console.log("Error saving item list to backend", e);
  }
}

const saveItemsLocally = async(item_list_obj) => {
  try {
    console.log("Saving to local storage...");
    const item_list_str = JSON.stringify(item_list_obj);
    await AsyncStorage.setItem(ITEM_LIST_KEY, item_list_str);
    console.log(`Saved list to local storage with ${item_list_obj.length} items.`);

    var doneCount = 0;
    var tipCount = 0;
    for (var i = 0; i < item_list_obj.length; i++) {
      var currItem = item_list_obj[i];
      if (currItem.is_done) doneCount += 1;
      if (currItem.has_tip) tipCount += 1;
    }
    await AsyncStorage.setItem(DONE_COUNT_KEY, `${doneCount}`);
    await AsyncStorage.setItem(TIP_COUNT_KEY, `${tipCount}`);

  } catch (e) {
    console.log("Error saving list or user counts to local storage.", e);
  }
}

const generateUsername = () => {
  const numberDictionary = NumberDictionary.generate({ min: 100, max: 999 });
  const characterName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals, numberDictionary],
      length: 3,
      separator: '',
      style: 'capital'
    });
  return characterName;
};

const saveUserLocally = async(newUsername, newAnonymousId, doneCount, tipCount) => {
  console.log("Saving user data to local storage...");
  await AsyncStorage.setItem(USERNAME_KEY, newUsername);
  await AsyncStorage.setItem(ANON_ID_KEY, newAnonymousId);
  await AsyncStorage.setItem(DONE_COUNT_KEY, doneCount);
  await AsyncStorage.setItem(TIP_COUNT_KEY, tipCount);
  console.log("Saved user data to local storage successfully.");
}

// Pass generated user name and anonymous ID to backend to store on server
const saveUserToBackend = async(newUsername, newAnonymousId) => {
  const response = await axios.post(CREATEUSER_URL, {
    username: newUsername,
    anonymous_id: newAnonymousId
  });
  console.log('User saved to backend storage');
}

