import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const ITEM_LIST_KEY = "item_list";
const USERNAME_KEY = "username";
const ANON_ID_KEY = "anonymous_id";
const CREATEUSER_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/createUser_Dev';
const LOADUSER_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadUser_Dev';
const LOADITEMS_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadItems_Dev';
const SAVEITEMS_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/saveItems_Dev';

export const saveItems = async (item_list_obj) => {
  if (item_list_obj === undefined) {
    console.log("saveItems called with undefined parameter, exiting...");
    return;
  }
  try {  
    const item_list_str = JSON.stringify(item_list_obj);
    //console.log("String to save: " + item_list_str);

    console.log("Saving to local storage...");
    await AsyncStorage.setItem(ITEM_LIST_KEY, item_list_str);
    console.log("Local storage save complete.");

    console.log("Saving to backend...");
    const localAnonId = await getLocalAnonId();
    await axios.post(SAVEITEMS_URL,
      {
        anonymous_id : localAnonId,
        items_str: item_list_str
      }
    );
    console.log("Backend save complete.");
  } catch (e) {
    console.log("Error saving item list", e);
  }
  console.log(`Saved list with ${item_list_obj.length} items.`);
};

export const initalizeUser = async() => {
  try {  

    // Check if username exists, if yes return it
    const username = await AsyncStorage.getItem(USERNAME_KEY);
    const anonId = await AsyncStorage.getItem(ANON_ID_KEY);
    if (username) {
        console.log(`Loading existing user data: ${username} ${anonId}`);
        const existingUser = await loadUser(anonId);
        return { 
          name: username, 
          anonymousId: anonId, 
          taskCount: existingUser.taskCount, 
          doneCount: existingUser.doneCount 
        };
    } else {

        // If username doesn't exist, assume we're at first launch
        // so initialize user name and anonymous UUID
        console.log("No username, retrieving new user from backend...");
        const userData = await createUser();
        const newName = userData.name;
        const newAnonId = userData.anonymousId; 
        console.log(`Username created ${newName} with Anon ID ${newAnonId}`);
        console.log("Saving new user data to localStorage...");
        await AsyncStorage.setItem(USERNAME_KEY, newName);
        await AsyncStorage.setItem(ANON_ID_KEY, newAnonId);
        console.log("Save complete.");
        return { name: newName, anonymousId: newAnonId };
    }
  } catch (e) {
      console.log("Error reading or saving user name", e);
  }
};

export const getLocalAnonId = async() => {
  try {  
      const localAnonId = await AsyncStorage.getItem(ANON_ID_KEY);
      if (localAnonId) {
          console.log(`Retrieved local anon ID ${localAnonId}`);
          return localAnonId;
      } else {
          console.log("No local anonId found, unexpected?  Returning null...");
          return null;
      }
  } catch (e) {
      console.log("Error reading local anon Id list", e);
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

export const createUser = async () => {
  try {
    const response = await axios.post(CREATEUSER_URL);
    console.log("Retreived new user from backend: " + JSON.stringify(response.data.body));
    return response.data.body;
  } catch (error) {
    console.error('Error calling create User API:', error);
  }
};

export const loadUser = async (anonymous_id) => {
  try {
    const response = await axios.post(LOADUSER_URL, {
      anonymous_id: anonymous_id
    });
    console.log("Retreived user from backend: " + JSON.stringify(response.data.body));
    return response.data.body;
  } catch (error) {
    console.error('Error calling load User API:', error);
  }
};

export const loadItems = async () => {
  try {

    const localAnonId = await getLocalAnonId();
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