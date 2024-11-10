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
const TIP_LIST_KEY_PREFIX = "tip_list_";    // Append item UUID to key

const CREATEUSER_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/createUser_Dev';
const LOADITEMS_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadItems_Dev';
const SAVEITEMS_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/saveItems_Dev';
const LOADTIPS_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadTips_Dev';
const SAVETIPS_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/saveTips_Dev';
const TIPVOTE_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/tipVote_Dev';
const FLAGTIP_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/flagTip_Dev';
const DELETEITEM_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/deleteItem_Dev';


export const saveItems = async (item_list_obj, callback) => {
  if (item_list_obj === undefined) {
    console.log("saveItems called with undefined parameter, exiting...");
    return;
  }

  // Local data is the source of truth for the app (most reliable and lowest latency)
  // STRATEGY UPDATED 11.7.24: We no longer save items locally because we want to requery latest
  // data on every save in case items text and therefore tips, similar items, etc counts should be updated.
  // We actually never loaded the UI from local data anyway.
  //
  //await saveItemsLocally(item_list_obj);

  // Asyncronously save to backend to enable community features and refresh user counts.
  // Ensure all UI data uses only locally stored data and is not reliant on real-time backend state.
  saveItemsToBackend(item_list_obj, (updatedUser, updatedItems) => {
    updateLocalUserCounts(updatedUser)
    callback(updatedItems);
  });
}

export const saveTips = async (item_obj, tip_list_obj, callback) => {
  if (tip_list_obj === undefined) {
    console.log("saveTips called with undefined parameter, exiting...");
    return;
  }

  // Local data is the source of truth for the app (most reliable and lowest latency)
  await saveTipsLocally(item_obj, tip_list_obj);

  // Asyncronously save to backend to enable community features and refresh user counts.
  // Ensure all UI data uses only locally stored data and is not reliant on real-time backend state.
  saveTipsToBackend(item_obj, tip_list_obj, (updatedUser) => {
    updateLocalUserCounts(updatedUser)
    callback();
  });
}

export const initalizeUser = async() => {
  try {  

    // Populate user vars with what's in local storage, if anything
    var username = await AsyncStorage.getItem(USERNAME_KEY);
    var anonId = await AsyncStorage.getItem(ANON_ID_KEY);
    var isNewUser = null;
    var doneCountStr = '-1';
    var tipCountStr = '-1';
    
    // Username and/or anonId are empty, assume we're at first launch or corrupt and recreate user 
    if (!username || !anonId) {
        const userData = await createUser();
        username = userData.name;
        anonId = userData.anonymousId;
        doneCountStr = userData.doneCountStr;
        tipCountStr = userData.tipCountStr;
        isNewUser = true;
    } else {

      // Syncronously retrieve existing user's done and tip counts from backend
      // because they can count historical items not currently listed in local storage


      doneCountStr = await AsyncStorage.getItem(DONE_COUNT_KEY);
      tipCountStr = await AsyncStorage.getItem(TIP_COUNT_KEY);
      isNewUser = false;
    }
    return { 
      name: username, 
      anonymousId: anonId, 
      doneCountStr: doneCountStr,
      tipCountStr: tipCountStr,
      isNew: isNewUser
    };
  } catch (e) {
      console.log("initializeUser: Error reading user data:", e);
  }
};

export const loadLocalUser = async() => {
  try {
    const loadedUser  = {
      username: await AsyncStorage.getItem(USERNAME_KEY),
      anonymousId: await AsyncStorage.getItem(ANON_ID_KEY),
      doneCountStr: await AsyncStorage.getItem(DONE_COUNT_KEY),
      tipCountStr: await AsyncStorage.getItem(TIP_COUNT_KEY)
    }
    //console.log("Retrieved user from local storage: " + JSON.stringify(loadedUser));
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
    //console.log(`Retrieved ${item_array.length} items from backend.`);
    //console.log("Item JSON: " + JSON.stringify(item_array));
    return item_array;
  } catch (error) {
    console.error('Error calling loadItems API:', error);
  }
};

export const loadTips = async (item_uuid) => {
  try {

    const localAnonId = await AsyncStorage.getItem(ANON_ID_KEY);
    if (!localAnonId) {
      console.log("Received null local anon Id, aborting loadItems!");
      return [];
    }
    const response = await axios.post(LOADTIPS_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid
      }
    );
    const response_obj = JSON.parse(response.data.body);
    const tip_cta = response_obj.cta;
    const tip_array = response_obj.tips;
    //console.log(`Retrieved CTA from backend: ${tip_cta}`);
    //console.log(`Retrieved ${tip_array.length} tips from backend.`);
    //console.log("Tip JSON: " + JSON.stringify(tip_array));
    return { cta: tip_cta, loadedTips : tip_array };
  } catch (error) {
    console.error('Error calling loadTips API:', error);
  }
};

export const tipVote = async(tip_uuid, voteValue) => {
  try {
    //console.log("Entering tip vote, uuid: " + tip_uuid + "  vote_value: " + voteValue);
    const localAnonId = await AsyncStorage.getItem(ANON_ID_KEY);
    if (!localAnonId) {
      console.log("Received null local anon Id, aborting tipVote!");
      return [];
    }
    const response = await axios.post(TIPVOTE_URL,
      {
        anonymous_id : localAnonId,
        tip_uuid: tip_uuid,
        vote_value: voteValue
      }
    );
    //console.log("Tip Vote Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling tipVote API:', error);
  }
}

export const flagTip = async(tip_uuid) => {
  try {
    console.log("Entering flag tip, uuid: " + tip_uuid);
    const localAnonId = await AsyncStorage.getItem(ANON_ID_KEY);
    if (!localAnonId) {
      console.log("Received null local anon Id, aborting tipVote!");
      return [];
    }
    const response = await axios.post(FLAGTIP_URL,
      {
        anonymous_id : localAnonId,
        tip_uuid: tip_uuid
      }
    );
    console.log("Flag Tip Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling flagTip API:', error);
  }
}

export const deleteItem = async(item_uuid) => {
  try {
    console.log("Entering delete item, uuid: " + item_uuid);
    const localAnonId = await AsyncStorage.getItem(ANON_ID_KEY);
    if (!localAnonId) {
      console.log("Received null local anon Id, aborting tipVote!");
      return [];
    }
    const response = await axios.post(DELETEITEM_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid
      }
    );
    console.log("Delete Item Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling Delete Item API:', error);
  }
}

export const resetAllData = async () => {
  try {
    await AsyncStorage.clear();
    console.log('All storage cleared');
  } catch (e) {
    console.error('Failed to clear AsyncStorage', e);
  }
};

// ******** BEGIN Non-EXPORTED METHODS *********

// Update this to account for pre-existing done/tips in DB
const updateLocalUserCounts = async(updatedUser) => {
  try {
    var doneCount = -1;
    var tipCount = -1;
    if (updatedUser) {
      //console.log("Inside updateLocalUserCounts: " + JSON.stringify(updatedUser));
      doneCount = updatedUser.doneCount;
      tipCount = updatedUser.tipCount;
    } else {
      // Assume called on first launch / new user
      doneCount = 0;
      tipCount = 0;
    }
    await AsyncStorage.setItem(DONE_COUNT_KEY, `${doneCount}`);
    await AsyncStorage.setItem(TIP_COUNT_KEY, `${tipCount}`);
    //console.log(`Updated local counts: Done Count (${doneCount}) Tip Count (${tipCount})`);
  } catch (e) {
    console.log("Error updated user counts in local storage.", e);
  }
}

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
    //console.log(`Username created ${newUsername} with Anon ID ${newAnonymousId}`);

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

const saveItemsToBackend = async(item_list_obj, callback) => {
  if (!item_list_obj || item_list_obj.length == 0) {
    console.log("saveItemsToBackend called with empty list, aborting backend call!");
    return null;
  }

  try {

    const localAnonId = await AsyncStorage.getItem(ANON_ID_KEY);
    //console.log("Saving to backend for anon Id: " + localAnonId);
    const response = await axios.post(SAVEITEMS_URL,
      {
        anonymous_id: localAnonId,
        items_str: JSON.stringify(item_list_obj)
      }
    );
    const response_obj = JSON.parse(response.data.body);
    const updatedUser = response_obj.user;
    const updatedItems = response_obj.items;  // 11.10.24:  Updated Lambda to always return empty lsit for now
    //console.log("Updated User: " + JSON.stringify(updatedUser));
    //console.log("Updated items: " + JSON.stringify(updatedItems));
    
    if (callback) {
      callback(updatedUser, updatedItems);
    }

  } catch (e) {
    console.log("Error saving item list to backend", e);
  }
}

const saveTipsToBackend = async(item_obj, tip_list_obj, callback) => {
  if (!tip_list_obj || tip_list_obj.length == 0) {
    console.log("saveTipsToBackend called with empty list, aborting backend call!");
    return null;
  }

  try {

    const localAnonId = await AsyncStorage.getItem(ANON_ID_KEY);
    //console.log("Saving to backend for anon Id: " + localAnonId);
    const response = await axios.post(SAVETIPS_URL,
      {
        anonymous_id: localAnonId,
        item_uuid: item_obj.uuid,
        tips_str: JSON.stringify(tip_list_obj)
      }
    );
    const updatedUser = JSON.parse(response.data.body);
    //console.log(`Saved tip list to backend storage with ${tip_list_obj.length} tips.`);
    //console.log(`User returned with save operation: ${JSON.stringify(updatedUser)}`);
    
    if (callback) {
      callback(updatedUser);
    }

  } catch (e) {
    console.log("Error saving tip list to backend", e);
  }
}

const saveItemsLocally = async(item_list_obj) => {
  try {
    //console.log("Saving to local storage...");
    const item_list_str = JSON.stringify(item_list_obj);
    await AsyncStorage.setItem(ITEM_LIST_KEY, item_list_str);
    //console.log(`Saved list to local storage with ${item_list_obj.length} items.`)
  } catch (e) {
    console.log("Error saving list to local storage.", e);
  }
}

const saveTipsLocally = async(item_obj, tip_list_obj) => {
  try {
    //console.log("Saving to local storage...");
    const tip_list_str = JSON.stringify(tip_list_obj);
    await AsyncStorage.setItem(`${TIP_LIST_KEY_PREFIX}_${item_obj.uuid}`, tip_list_str);
    //console.log(`Saved tip list to local storage with ${tip_list_obj.length} tips.`)
  } catch (e) {
    console.log("Error saving list to local storage.", e);
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
  //console.log("Saved user data to local storage successfully.");
}

// Pass generated user name and anonymous ID to backend to store on server
const saveUserToBackend = async(newUsername, newAnonymousId) => {
  const response = await axios.post(CREATEUSER_URL, {
    username: newUsername,
    anonymous_id: newAnonymousId
  });
  //console.log('User saved to backend storage');
}

