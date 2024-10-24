import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const ITEM_LIST_KEY = "item_list";
const USERNAME_KEY = "username";
const ANON_ID_KEY = "anonymous_id";
const CREATEUSER_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/createUser_Dev';
const LOADITEMS_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadItems_Dev';

export const saveItemsToLocalStorage = async (item_list_obj) => {
  if (item_list_obj === undefined) {
    console.log("saveItems called with undefined parameter, exiting...");
    return;
  }
  try {  
    const item_list_str = JSON.stringify(item_list_obj);
    console.log("String to save to disk: " + item_list_str);
    await AsyncStorage.setItem(ITEM_LIST_KEY, item_list_str);
  } catch (e) {
    console.log("Error saving item list", e);
  }
  console.log(`Saved list with ${item_list_obj.length} items to disk`);
};

export const initalizeUser = async() => {
  try {  

    // Check if username exists, if yes return it
    const username = await AsyncStorage.getItem(USERNAME_KEY);
    const anonId = await AsyncStorage.getItem(ANON_ID_KEY);
    if (username) {
        console.log(`Returning existing user data: ${username} ${anonId}`);
        return { name: username, anonymousId: anonId };
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
    console.log(`Retrieved ${response.data.body.length} items from backend: ${JSON.stringify(response.data.body)}`);
    return response.data.body;
  } catch (error) {
    console.error('Error calling loadItems API:', error);
  }
};