import AsyncStorage from '@react-native-async-storage/async-storage';

const ITEM_LIST_KEY = "item_list";

export const saveItems = async (item_list_obj) => {
  if (item_list_obj === undefined) {
    console.log("saveItems called with undefined parameter, exiting...");
    return;
  }
  try {  
    const item_list_str = JSON.stringify(item_list_obj);
    await AsyncStorage.setItem(ITEM_LIST_KEY, item_list_str);
  } catch (e) {
    console.log("Error saving item list", e);
  }
  console.log(`Saved list with ${item_list_obj.length} items to disk`);
}

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
}