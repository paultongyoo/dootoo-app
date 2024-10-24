import AsyncStorage from '@react-native-async-storage/async-storage';

// WARNING:  Cyclical ref between LocalStorage -> BackendServices -> LocalStorage -- do not initialize variables in either file!
import { createUser } from './BackendServices.js';

const ITEM_LIST_KEY = "item_list";
const USERNAME_KEY = "username";
const ANON_ID_KEY = "anonymous_id";

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