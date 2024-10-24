import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { uniqueNamesGenerator, adjectives, animals, NumberDictionary } from 'unique-names-generator';

const ITEM_LIST_KEY = "item_list";
const USERNAME_KEY = "username";
const ANON_ID_KEY = "anonymous_id";

export const saveItems = async (item_list_obj) => {
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

export const loadItems = async() => {
    try {  
        const item_list_str = await AsyncStorage.getItem(ITEM_LIST_KEY);
        if (item_list_str) {
            const item_list_obj = JSON.parse(item_list_str);
            console.log(`Loaded list with ${item_list_obj.length} items from disk.`);
            return item_list_obj;
        } else {
            console.log("No list found in local storage, returning empty list");
            return [];
        }
    } catch (e) {
        console.log("Error reading item list", e);
    }
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
        console.log("No username, creating and saving new username and anonymous ID...");
        const newName = generateUsername();
        const newAnonId = uuid.v4(); 
        console.log(`Username created ${newName} with Anon ID ${newAnonId}`);
        console.log("Saving new user data to disk...");
        await AsyncStorage.setItem(USERNAME_KEY, newName);
        await AsyncStorage.setItem(ANON_ID_KEY, newAnonId);
        console.log("Save complete.");
        return { name: newName, anonymousId: newAnonId };
    }
  } catch (e) {
      console.log("Error reading or saving user name", e);
  }
};

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

export const getUser = async() => {
  try {  
    const username = await AsyncStorage.getItem(USERNAME_KEY);
    const anonymousId = await AsyncStorage.getItem(ANON_ID_KEY);
    if (username) {
        return {name: username, anonymousId: anonymousId};
    } else {
        console.log("No username present, was it initialized?");
        return null;
    }
  } catch (e) {
      console.log("Error reading username", e);
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