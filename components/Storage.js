import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import uuid from 'react-native-uuid';
import { uniqueNamesGenerator, adjectives, animals, NumberDictionary } from 'unique-names-generator';

// Local storage column keys
const DONE_COUNT_KEY = "user_done_count";
const TIP_COUNT_KEY = "user_tip_count";
const USER_OBJ_KEY = "user_obj";
const ITEM_LIST_KEY = "item_list";
const TIP_LIST_KEY_PREFIX = "tip_list_";    // Append item UUID to key

const CREATEUSER_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/createUser_Dev' 
                                 : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/createUser';

const DELETEITEM_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/deleteItem_Dev'
                                 : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/deleteItem';

const LOADITEMS_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadItems_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/loadItems';

const LOADITEMCOUNTS_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadItemCounts_Dev'
                               : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/loadItemCounts';

const SAVEITEMS_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/saveItems_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/saveItems';

const UPDATEITEMORDER_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateItemOrder_Dev'
                                       : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateItemOrder';

const UPDATEITEMTEXT_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateItemText_Dev'
                                     : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateItemText';
                                     
const UPDATEITEMDONESTATE_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateItemDoneState_Dev'
                                     : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateItemDoneState';

const LOADTIPS_URL =  (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadTips_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/loadTips';

const SAVETIPS_URL =  (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/saveTips_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/saveTips';

const UPDATETIPORDER_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateTipOrder_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateTipOrder';
                                
const UPDATETIPTEXT_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateTipText_Dev'
                                    : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateTipText';

const TIPVOTE_URL =  (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/tipVote_Dev'
                               : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/tipVote';

const FLAGTIP_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/flagTip_Dev'
                              : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/flagTip';

const UPDATEITEMHIERARCHY_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateItemHierarchy_Dev'
                                          : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateItemHierarchy';

const DELETETIP_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/deleteTip_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/deleteTip';

const DELETEUSER_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/deleteUser_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/deleteUser';

const LOADUSER_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadUser_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/loadUser';

const BLOCKUSER_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/blockUser_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/blockUser';
                             
const UPDATEUSERNAME_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateUsername_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateUsername';


export const saveItems = async (item_list_obj, callback) => {
  if (item_list_obj === undefined) {
    //console.log("saveItems called with undefined parameter, exiting...");
    return;
  }

  // Asyncronously save to backend to enable community features and refresh user counts.
  // Ensure all UI data uses only locally stored data and is not reliant on real-time backend state.
  saveItemsToBackend(item_list_obj, (updatedUser) => {

    // Deprecated in v1.1.1
    //saveUserLocally(updatedUser);

    if (callback) {

      // Used to allow UI to update its user UI based on latest user counts
      callback();
    }
  });
}

export const updateItemOrder = async (uuid_array, callback) => {
  try {
    //console.log("Entering tip vote, uuid: " + tip_uuid + "  vote_value: " + voteValue);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(UPDATEITEMORDER_URL,
      {
        anonymous_id : localAnonId,
        uuid_array: JSON.stringify(uuid_array)
      }
    );
    if (callback) {
      callback();
    }
    //console.log("updateItemOrder Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling updateItemOrder API:', error);
  }
}

export const updateItemText = async (item, callback) => {
  try {
    //console.log("Entering tip vote, uuid: " + tip_uuid + "  vote_value: " + voteValue);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(UPDATEITEMTEXT_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item.uuid,
        text: item.text
      }
    );

    if (callback) {
      callback();
    }
    //console.log("updateItemText Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling updateItemText API:', error);
  }
}

export const updateItemDoneState = async (item, callback) => {
  try {
    //console.log("Entering tip vote, uuid: " + tip_uuid + "  vote_value: " + voteValue);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(UPDATEITEMDONESTATE_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item.uuid,
        is_done: item.is_done
      }
    );

    if (callback) {
      callback();
    }
    //console.log("updateDoneState Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling updateDoneState API:', error);
  }
}

export const updateTipText = async (tip, callback) => {
  try {
    //console.log("Entering tip vote, uuid: " + tip_uuid + "  vote_value: " + voteValue);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(UPDATETIPTEXT_URL,
      {
        anonymous_id : localAnonId,
        tip_uuid: tip.uuid,
        text: tip.text
      }
    );

    if (callback) {
      callback();
    }
    //console.log("updateTipText Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling updateTipText API:', error);
  }
}

export const saveTips = async (item_obj, tip_list_obj, callback) => {
  if (tip_list_obj === undefined) {
    //console.log("saveTips called with undefined parameter, exiting...");
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

export const updateTipOrder = async (selectedItem, uuid_array, callback) => {
  try {
    //console.log("Entering tip vote, uuid: " + tip_uuid + "  vote_value: " + voteValue);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(UPDATETIPORDER_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: selectedItem.uuid,
        uuid_array: JSON.stringify(uuid_array)
      }
    );
    if (callback) {
      callback();
    }
    //console.log("updateTipsOrder Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling updateTipsOrder API:', error);
  }
}

export const initalizeUser = async() => {
  //console.log("initalizeUser");
  try {  

    // Populate user vars with what's in local storage, if anything
    const localUser = await loadLocalUser();
    if (localUser) {
      localUser.isNew = false;
      return localUser;
    } else {
      const newUserData = await createUser();
      newUserData.isNew = true;
      return newUserData;
    }
  } catch (e) {
      //console.log("Error reading user data:", e);
  }
};

export const loadItems = async (page, callback) => {
  try {
    const localUserStr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserStr) {
      //console.log("Received null local anon Id, aborting loadItems!");
      return [];
    }
    const localUser = JSON.parse(localUserStr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(LOADITEMS_URL,
      {
        anonymous_id : localAnonId,
        page: page
      }
    );
    const item_array = response.data.body.items;
    const hasMore = response.data.body.hasMore;
    // console.log(`item_array: ${item_array}`);
    // console.log(`hasMore: ${hasMore}`);
    return { hasMore: hasMore, things: item_array };
  } catch (error) {
    console.error('Error calling loadItems API:', error);
  }
};

export const loadItemCounts = async (item_uuid) => {
  try {
    const localUserStr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserStr) {
      console.log("Received null local anon Id, aborting loadItems!");
      return [];
    }
    const localUser = JSON.parse(localUserStr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(LOADITEMCOUNTS_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid
      }
    );
    const counts_obj = response.data.body;
    //console.log(`counts_obj: ${JSON.stringify(counts_obj)}`);
    return counts_obj;
  } catch (error) {
    console.error('Error calling loadItemCounts API:', error);
  }
};

export const loadTips = async (item_uuid, page) => {
  //console.log("loadTips called with item_uuid: " + item_uuid);
  try {

    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return [];
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(LOADTIPS_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid,
        page: page
      }
    );
    const tip_array = response.data.body.tips;
    const hasMore = response.data.body.hasMore;
    // console.log(`tip_array: ${tip_array}`);
    // console.log(`hasMore: ${hasMore}`);
    return { hasMore: hasMore, things: tip_array };
  } catch (error) {
    console.error('Error calling loadTips API:', error);
  }
};

export const tipVote = async(tip_uuid, voteValue) => {
  try {
    //console.log("Entering tip vote, uuid: " + tip_uuid + "  vote_value: " + voteValue);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
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
    //console.log("Entering flag tip, uuid: " + tip_uuid);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(FLAGTIP_URL,
      {
        anonymous_id : localAnonId,
        tip_uuid: tip_uuid
      }
    );
    //console.log("Flag Tip Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling flagTip API:', error);
  }
}

export const deleteItem = async(item_uuid) => {
  try {
    //console.log("Entering delete item, uuid: " + item_uuid);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(DELETEITEM_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid
      }
    );
    //console.log("Delete Item Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling Delete Item API:', error);
  }
}

export const updateItemHierarchy = async(item_uuid, parent_item_uuid) => {
  try {
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(UPDATEITEMHIERARCHY_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid,
        parent_item_uuid: parent_item_uuid
      }
    );
    //console.log("updateItemHierarchy Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling updateItemHierarchy API:', error);
  }
}

export const deleteTip = async(tip_uuid) => {
  try {
    //console.log("Entering deleteTip, uuid: " + tip_uuid);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return ;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(DELETETIP_URL,
      {
        anonymous_id : localAnonId,
        tip_uuid: tip_uuid
      }
    );
    //console.log("deleteTip Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling deleteTip API:', error);
  }
}

export const loadUsername = async(name) => {
  try {
    console.log("Entering loadUsername, uuid: " + name);
    const response = await axios.post(LOADUSER_URL,
      {
        name: name
      }
    );
    console.log("loadUsername Response Obj: " + JSON.stringify(response.data.body));
    return response.data.body
  } catch (error) {
    console.error('Error calling loadUsername API:', error);
  }
}

export const updateUsername = async(new_name) => {
  try {
    //console.log("updateUsername: " + new_name);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return ;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(UPDATEUSERNAME_URL,
      {
        anonymous_id: localAnonId,
        name: new_name
      }
    );
    //console.log("updateUsername Response Obj: " + JSON.stringify(response.data.body));
    return response.data.statusCode
  } catch (error) {
    console.error('Error calling updateUsername API:', error);
  }
}

export const blockUser = async(name, reason) => {
  try {
    //console.log("Entering deleteTip, uuid: " + tip_uuid);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return ;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(BLOCKUSER_URL,
      {
        anonymous_id : localAnonId,
        name: name,
        reason: reason
      }
    );
    const wasUserBlockSuccessful = response.data.body;
    return wasUserBlockSuccessful;
  } catch (error) {
    console.error('Error calling blockUser API:', error);
  }
}


export const resetAllData = async () => {
  console.log("Inside resetAllData");

  try {
    //console.log("Entering deleteTip, uuid: " + tip_uuid);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      console.log("Received null local anon Id, aborting tipVote!");
      return ;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(DELETEUSER_URL,
      {
        anonymous_id : localAnonId
      }
    );
    const deletionInfo = response.data.body;
    console.log("Deleted Info: " + JSON.stringify(deletionInfo));

    if (response.data.statusCode == 200) {
      await AsyncStorage.clear();
      //console.log('All storage cleared');
      return deletionInfo;
    } else {
      throw new Error(response.data.body);
    }
  } catch (e) {
    console.error('Error calling deleteTip API:', error);
  }
};

export const saveUserLocally = async(user_obj) => {
  //console.log("Saving user data to local storage...");

  try {
    //console.log("Saving user to local storage...");
    const user_obj_str = JSON.stringify(user_obj);
    await AsyncStorage.setItem(USER_OBJ_KEY, user_obj_str);
    await AsyncStorage.setItem(DONE_COUNT_KEY, `${user_obj.doneCount || '0'}`);
    await AsyncStorage.setItem(TIP_COUNT_KEY, `${user_obj.tipCount  || '0'}`);
    //console.log(`Saved user to local storage.`)
  } catch (e) {
    console.log("Error saving user to local storage.", e);
  }
}

// ******** BEGIN Non-EXPORTED METHODS *********

const loadLocalUser = async() => {
  //console.log("loadLocalUser");
  try {

    const local_user_str = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (local_user_str != null) {
      const localUserObj = JSON.parse(local_user_str);
      localUserObj.doneCountStr = await AsyncStorage.getItem(DONE_COUNT_KEY);
      localUserObj.tipCountStr = await AsyncStorage.getItem(TIP_COUNT_KEY);
      return localUserObj;
    } else {
      return null;
    }
    //console.log("Retrieved user from local storage: " + JSON.stringify(loadedUser));
  } catch (error) {
    console.error('Error loading user from local storage:', error);
  }
};


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
    //console.log("Error updated user counts in local storage.", e);
  }
}

const createUser = async () => {
  //console.log("createUser");
  try {
    // If username or anonymous doesn't exist, assume we're at first launch OR data has gotten corrupt.
    // (Re)initialize user name and anonymous UUID and store locally
    //console.log("Generating new username and anonymous ID...");

    // Create username, anonymous ID, and initial user counts
    const newUsername = generateUsername();
    const newAnonymousId = uuid.v4();
    const doneCountStr = '0';
    const tipCountStr = '0';
    //console.log(`Username created ${newUsername} with Anon ID ${newAnonymousId}`);

    // Asyncronously pass generated user name and anonymous ID to backend to store on server
    saveUserToBackend(newUsername, newAnonymousId, (savedUserObj) => {

        // Store user data locally to accelerate future loads
        saveUserLocally(savedUserObj);
    });
    
    return { 
      name: newUsername, 
      anonymous_id: newAnonymousId, 
      doneCountStr: doneCountStr, 
      tipCountStr: tipCountStr 
    }
  } catch (error) {
    //console.error('Error calling create User API:', error);
  }
};

const saveItemsToBackend = async(item_list_obj, callback) => {
  if (!item_list_obj || item_list_obj.length == 0) {
    //console.log("saveItemsToBackend called with empty list, aborting backend call!");
    return null;
  }

  try {
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return ;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    //console.log("Saving to backend for anon Id: " + localAnonId);
    const response = await axios.post(SAVEITEMS_URL,
      {
        anonymous_id: localAnonId,
        items_str: JSON.stringify(item_list_obj),
        skipLoad: true,
        skipUserLoad: true
      }
    );
    const response_obj = JSON.parse(response.data.body);
    const updatedUser = response_obj.user;
    // console.log("Updated User: " + JSON.stringify(updatedUser));
    
    if (callback) {
      callback(updatedUser);
    }

  } catch (e) {
    //console.log("Error saving item list to backend", e);
  }
}

const saveTipsToBackend = async(item_obj, tip_list_obj, callback) => {
  if (!tip_list_obj || tip_list_obj.length == 0) {
    //console.log("saveTipsToBackend called with empty list, aborting backend call!");
    return null;
  }

  try {
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return ;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
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
    //console.log("Error saving tip list to backend", e);
  }
}

const saveItemsLocally = async(item_list_obj) => {
  try {
    //console.log("Saving to local storage...");
    const item_list_str = JSON.stringify(item_list_obj);
    await AsyncStorage.setItem(ITEM_LIST_KEY, item_list_str);
    //console.log(`Saved list to local storage with ${item_list_obj.length} items.`)
  } catch (e) {
    //console.log("Error saving list to local storage.", e);
  }
}

const saveTipsLocally = async(item_obj, tip_list_obj) => {
  try {
    //console.log("Saving to local storage...");
    const tip_list_str = JSON.stringify(tip_list_obj);
    await AsyncStorage.setItem(`${TIP_LIST_KEY_PREFIX}_${item_obj.uuid}`, tip_list_str);
    //console.log(`Saved tip list to local storage with ${tip_list_obj.length} tips.`)
  } catch (e) {
    //console.log("Error saving list to local storage.", e);
  }
}

export const generateUsername = () => {
  const numberDictionary = NumberDictionary.generate({ min: 100, max: 999 });
  const characterName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals, numberDictionary],
      length: 3,
      separator: '',
      style: 'capital'
    });
  return characterName;
};

// Pass generated user name and anonymous ID to backend to store on server
const saveUserToBackend = async(newUsername, newAnonymousId, callback) => {
  const response = await axios.post(CREATEUSER_URL, {
    username: newUsername,
    anonymous_id: newAnonymousId
  });

  if (callback) {
    callback(response.data.body);
  }
  //console.log('User saved to backend storage');
}

