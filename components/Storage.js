import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axios from 'axios';
import uuid from 'react-native-uuid';
import { generateCurrentTimeAPIHeaders } from './Helpers';

// Local storage column keys
const DONE_COUNT_KEY = "user_done_count";
const TIP_COUNT_KEY = "user_tip_count";
const USER_OBJ_KEY = "user_obj";
export const OPEN_ITEM_LIST_KEY = "open_item_list";
export const DONE_ITEM_LIST_KEY = "done_item_list";
const OPEN_ITEM_LIST_LAST_LOADED_PAGE_KEY = "open_item_list_last_page";
const DONE_ITEM_LIST_LAST_LOADED_PAGE_KEY = "done_item_list_last_page";
const TIP_LIST_KEY_PREFIX = "tip_list_";    // Append item UUID to key
const HAS_RECORDED_BEFORE = "has_recorded_before";
const TW_EMPLOYEE_KEY = "tw_employee";

const CREATEUSER_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/createUser_Dev' 
                                 : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/createUser';

const DELETEITEM_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/deleteItem_Dev'
                                 : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/deleteItem';

const LOADITEMS_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadItems_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/loadItems';

const LOADITEMCOUNTS_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadItemCounts_Dev'
                               : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/loadItemCounts';

const LOADITEMSCOUNTS_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadItemsCounts_Dev'
                               : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/loadItemsCounts';                            

// const SAVEITEMS_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/saveItems_Dev'
//                                 : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/saveItems';

const UPDATEITEMORDER_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateItemOrder_Dev'
                                       : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateItemOrder';

const UPDATEITEMTEXT_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateItemText_Dev'
                                     : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateItemText';
                                     
const UPDATEITEMDONESTATE_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateItemDoneState_Dev'
                                     : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateItemDoneState';

const UPDATEITEMSCHEDULE_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateItemSchedule_Dev'
                                     : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateItemSchedule';
                               
const UPDATEITEMEVENTID_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateItemEventId_Dev'
                                     : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateItemEventId';

const UPDATEITEMPUBLICSTATE_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateItemPublicState_Dev'
                                     : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateItemPublicState';

// const SAVENEWITEM_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/saveNewItem_Dev'
//                                   : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/saveNewItem';    // Plan to deprecate

const SAVENEWITEMS_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/saveNewItems_Dev'
                                  : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/saveNewItems';

const ENRICHITEM_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/enrichItem_Dev'
                                  : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/enrichItem';

const LOADTIPS_URL =  (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadTips_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/loadTips';

const SAVETIPS_URL =  (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/saveTips_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/saveTips';

const UPDATETIPORDER_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateTipOrder_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateTipOrder';
                                
const UPDATETIPTEXT_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateTipText_Dev'
                                    : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateTipText';

const SAVENEWTIP_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/saveNewTip_Dev'
                                 : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/saveNewTip';    

const SAVENEWTIPS_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/saveNewTips_Dev'
                                 : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/saveNewTips';               

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

const BLOCKITEM_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/blockItem_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/blockItem';
                             
const UPDATEUSERNAME_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateUsername_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateUsername';

const UPDATEAFFIRMATION_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/updateAffirmation_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/updateAffirmation';

const LOADCOMMUNITYITEMS_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadCommunityItems_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/loadCommunityItems';
                              
const REACTTOITEM_URL = (__DEV__) ?  'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/reactToItem_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/reactToItem';

const LOADITEMSREACTIONS_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadItemsReactions_Dev'
                                : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/loadItemsReactions';

const CLICKSTREAM_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/clickStream_Dev'
                                  : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/clickStream';

const FEEDBACK_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/feedback_Dev'
                               : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/feedback';


export const loadCommunityItems = async(requestedPage) => {
  try {
    const localUserStr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserStr) {
      console.log("Received null local anon Id, aborting loadCommunityItems!");
      return { hasMore: false, items: [] };
    }
    const localUser = JSON.parse(localUserStr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(LOADCOMMUNITYITEMS_URL,
      {
        anonymous_id : localAnonId,
        page: requestedPage                                                                         
      }
    );
    const item_array = response.data.body.items;
    const hasMore = response.data.body.hasMore;

    return { hasMore: hasMore, items: item_array};
  } catch (error) {
    console.error('Error calling loadCommunityItems API:', error);
  }
}                          




export const DONE_ITEM_FILTER_ONLY_OPEN_PARENTS = "onlyOpenParents";
export const DONE_ITEM_FILTER_ONLY_DONE_ITEMS = "onlyDoneItems";
export const loadItems = async (isPullDown, requestedPage, doneFilterString = null) => {
  //console.log(`loadItems: isPullDown ${isPullDown}, page ${page}, doneFilterString: ${doneFilterString}`);
  
  // Load local items from cache (or empty list) if
  // not called from pulldown (i.e. on first and return launches of app.
  // Assume we only want to check cache when the caller requests page == 1 (i.e. on initialization).
  // Requests for any other page will call the backend.
  if (requestedPage == 1 && !isPullDown) {
    const cachedItems = (doneFilterString == DONE_ITEM_FILTER_ONLY_DONE_ITEMS) 
                           ? await loadDoneItemsCache()
                           : await loadItemsCache();

    // If app had local items cached, we'll return those immediately.
    // If an empty / no list is cached (which will occur for returning users too),
    // we'll execute pre-existing logic to look for BE data for the user
    if (cachedItems.length > 0 ) {
      //console.log(`Cached items found ${cachedItems.length}, returning those to user...`)

      // Since we're pulling from cache, retrieve the last loaded page number for the UI to increment from
      // if the user scrolls down to retrieve more items
      const lastCachedPage = await loadLocalListLastCachedPage(doneFilterString);

      // set hasMore to true to always allow scrolls after cached data to check for more data
      return { hasMore: true, things: cachedItems, lastPageLoaded: lastCachedPage };  
    } else {
      //console.log(doneFilterString + ": No cached items found, proceeding with backend lookup for user");
    }
  } else if (requestedPage != 1) {
    //console.log(`Page ${requestedPage} being requested by app, pulling from backend...`);
  } else {
    console.log("Load called on pull down, executing backend load...");
  }

  try {
    const localUserStr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserStr) {
      //console.log("Received null local anon Id, aborting loadItems!");
      return { hasMore: hasMore, things: [] };
    }
    const localUser = JSON.parse(localUserStr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(LOADITEMS_URL,
      {
        anonymous_id : localAnonId,
        page: requestedPage,                          
        skipCounts: true,
        onlyOpenParents: (doneFilterString == DONE_ITEM_FILTER_ONLY_OPEN_PARENTS),    //  Added in 1.6 for "list" screen
        onlyDoneItems: (doneFilterString == DONE_ITEM_FILTER_ONLY_DONE_ITEMS) //  Added in 1.6 for "done" screen                                                                           
      }
    );
    const item_array = response.data.body.items;
    const hasMore = response.data.body.hasMore;

    // Save Requested Page number to local storage so that subsequent
    // launches of app can reset page number state to the requested page number
    // to resume pulling next page if user continues to scroll downwards
    updateLocalListLastCachedPage(doneFilterString, requestedPage);    // Async

    return { hasMore: hasMore, things: item_array, lastPageLoaded: requestedPage};
  } catch (error) {
    console.error('Error calling loadItems API:', error);
  }
};

export const updateItemsCache = async(item_list_obj) => {
  try {
    if (item_list_obj) {
      //console.log(`Updating Open items cache with ${(item_list_obj) ? item_list_obj.length : 0} size list.`);
      const item_list_str = JSON.stringify(item_list_obj);
      await AsyncStorage.setItem(OPEN_ITEM_LIST_KEY, item_list_str);
    } else {
      //console.log("Update items cache based null param, ignoring call (was this unexpected?");
    }
  } catch (e) {
    console.log("Error in updateItemsCache", e);
  }
}

export const updateDoneItemsCache = async(item_list_obj) => {
  try {
    if (item_list_obj) {
      //console.log(`Updating Done items cache with ${(item_list_obj) ? item_list_obj.length : 0} size list.`);
      const item_list_str = JSON.stringify(item_list_obj);
      await AsyncStorage.setItem(DONE_ITEM_LIST_KEY, item_list_str);
    } else {
      //console.log("Update items cache based null param, ignoring call (was this unexpected?");
    }
  } catch (e) {
    console.log("Error in updateDoneItemsCache", e);
  }
}

export const updateTipsCache = async(item_obj, tip_list_obj) => {
  try {
    if (item_obj && tip_list_obj) {
      const storageKey = `${TIP_LIST_KEY_PREFIX}_${item_obj.uuid}`;
      //console.log('Generated Tips AsyncStorage key: ' + storageKey);
      //console.log(`Updating tips cache with ${(tip_list_obj) ? tip_list_obj.length : 0} size list.`);
      const tip_list_str = JSON.stringify(tip_list_obj);
      await AsyncStorage.setItem(storageKey, tip_list_str);
    } else {
      //console.log("Update tips cache based with one or more null params, ignoring call (was this unexpected?");
    }
  } catch (e) {
    console.log("Error in updateTipsCache", e);
  }
}

export const areItemsCached = async(cacheKeyStr = null) => {
  try {
    if (cacheKeyStr == null) {
      throw new Error("Null cache key provided");
    } else if ((cacheKeyStr != DONE_ITEM_LIST_KEY) && (cacheKeyStr != OPEN_ITEM_LIST_KEY)) {
      throw new Error("Unrecognized item list cache key");
    }
    return await AsyncStorage.getItem(cacheKeyStr) != null;
  } catch (e) {
    console.error("Error in areItemsCached", e);
  }
}


// export const saveItems = async (item_list_obj, callback) => {
//   if (item_list_obj === undefined) {
//     //console.log("saveItems called with undefined parameter, exiting...");
//     return;
//   }

//   // Asyncronously save to backend to enable community features and refresh user counts.
//   // Ensure all UI data uses only locally stored data and is not reliant on real-time backend state.
//   saveItemsToBackend(item_list_obj, (updatedUser) => {

//     // Deprecated in v1.1.1
//     //saveUserLocally(updatedUser);

//     if (callback) {

//       // Used to allow UI to update its user UI based on latest user counts
//       callback();
//     }
//   });
// }

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
    //console.log("updateItemText Response Obj: " + JSON.stringify(response.data));
    if (callback) {
      callback(response.data);
    }
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
        is_done: item.is_done,
        newOpenDoneLists: true
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

// export const saveNewItem = async (item, latest_item_uuids) => {
//   try {
//     //console.log("Entering tip vote, uuid: " + tip_uuid + "  vote_value: " + voteValue);
//     const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
//     if (!localUserSr) {
//       //console.log("Received null local anon Id, aborting tipVote!");
//       return;
//     }
//     const localUser = JSON.parse(localUserSr);
//     const localAnonId = localUser.anonymous_id;
//     const response = await axios.post(SAVENEWITEM_URL,
//       {
//         anonymous_id : localAnonId,
//         item_str: JSON.stringify(item),
//         uuid_array: JSON.stringify(latest_item_uuids)
//       }
//     );
//     //console.log("saveNewItem Response Obj: " + JSON.stringify(response.data.body));
//   } catch (error) {
//     console.error('Error calling saveNewItem API:', error);
//   }
// }

export const saveNewItems = async (items, latest_item_uuids, callback = null) => {
  try {
    //console.log("Entering tip vote, uuid: " + tip_uuid + "  vote_value: " + voteValue);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(SAVENEWITEMS_URL,
      {
        anonymous_id : localAnonId,
        items_str: JSON.stringify(items),
        uuid_array: JSON.stringify(latest_item_uuids)
      }
    );
    console.log("saveNewItems Response Obj: " + JSON.stringify(response.data));
    if (callback) {
      callback(response.data);
    }
  } catch (error) {
    console.error('Error calling saveNewItems API:', error);
  }
}

export const enrichItem = async (item) => {
  try {
    //console.log("Entering tip vote, uuid: " + tip_uuid + "  vote_value: " + voteValue);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;

    const currentTimeAPIHeaders = generateCurrentTimeAPIHeaders();
    //console.log("Current Time Obj: " + JSON.stringify(currentTimeAPIHeaders));

    const response = await axios.post(ENRICHITEM_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item.uuid,
        text: item.text,
        userlocaltime : currentTimeAPIHeaders.userlocaltime,
        usertimezone  : currentTimeAPIHeaders.usertimezone,
        utcdatetime : currentTimeAPIHeaders.utcdatetime
      }
    );
    //console.log("response obj: " + JSON.stringify(response.data.body));
    return response.data.body;
  } catch (error) {
    console.error('Error calling enrichItem API:', error);
  }
}

export const saveNewTip = async (tip, item_uuid, latest_tip_uuids, callback) => {
  try {
    //console.log("Entering tip vote, uuid: " + tip_uuid + "  vote_value: " + voteValue);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(SAVENEWTIP_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid,
        tip_str: JSON.stringify(tip),
        uuid_array: JSON.stringify(latest_tip_uuids)
      }
    );
    if (callback) {
      callback();
    }
    //console.log("saveNewTip Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling saveNewTip API:', error);
  }
}

export const saveNewTips = async (tips, item_uuid, latest_tip_uuids, callback = null) => {
  try {
    //console.log("Entering tip vote, uuid: " + tip_uuid + "  vote_value: " + voteValue);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(SAVENEWTIPS_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid,
        tips_str: JSON.stringify(tips),
        uuid_array: JSON.stringify(latest_tip_uuids)
      }
    );
    //console.log("saveNewTips Response Obj: " + JSON.stringify(response.data.body));
    if (callback) {
      callback();
    }
  } catch (error) {
    console.error('Error calling saveNewTips API:', error);
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
      return localUser;
    } else {
      return await createUser();
    }
  } catch (e) {
      //console.log("Error reading user data:", e);
  }
};

export const loadItemsCounts = async (item_uuids) => {
  try {
    const localUserStr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserStr) {
      console.log("Received null local anon Id, aborting loadItems!");
      return [];
    }
    const localUser = JSON.parse(localUserStr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(LOADITEMSCOUNTS_URL,
      {
        anonymous_id : localAnonId,
        item_uuids: item_uuids
      }
    );
    const statusCode = response.data.statusCode;
    const itemData = response.data.body;
    if (statusCode == 200) {
      const itemDataMap = new Map(Object.entries(JSON.parse(itemData)));
      return itemDataMap;
    } else {
      console.log("HTTP 403 returned: " + itemData);
      return null;
    }
  } catch (error) {
    console.error('Error calling loadItemsCounts API:', error);
  }
};

export const loadItemsReactions = async (item_uuids) => {
  try {
    const localUserStr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserStr) {
      console.log("Received null local anon Id, aborting loadItems!");
      return [];
    }
    const localUser = JSON.parse(localUserStr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(LOADITEMSREACTIONS_URL,
      {
        anonymous_id : localAnonId,
        item_uuids: item_uuids
      }
    );
    const statusCode = response.data.statusCode;
    const itemData = response.data.body;
    // console.log("Parsed itemData: " + JSON.stringify(JSON.parse(itemData)));
    if (statusCode == 200) {
      const itemDataMap = JSON.parse(itemData);
      return itemDataMap;
    } else {
      console.log("HTTP 403 returned: " + itemData);
      return null;
    }
  } catch (error) {
    console.error('Error calling loadItemsReactions API:', error);
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

// 1.2  This function updated to load items from local cache if isPullDown == false
//      and load from DB if isPullDown == true
export const loadTips = async (isPullDown, item_uuid) => {
  //console.log("loadTips called with item_uuid: " + item_uuid);

  // Load local tips from cache (or empty list) if
  // not called from pulldown (i.e. on first and return launches of app
  if (!isPullDown) {
    const cachedTips = await loadTipsCache(item_uuid);

    // If app had local tips cached, we'll return those immediately.
    // If an empty / no list is cached (which will occur for returning users too),
    // we'll execute pre-existing logic to look for BE data for the user WITH THE
    // ADDITION of "skipPagination" boolean to deactivate BE pagination for 1.2+ users
    if (cachedTips.length > 0 ) {
      //console.log(`Cached tips found ${cachedTips.length}, returning those to user...`)
      return { hasMore: false, things: cachedTips };
    } else {
      //console.log("No cached tips found, proceeding with backend lookup for user");
    }
  } else {
    //console.log("Load called on pull down, executing backend load...");
  }

  try {

    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      console.log("Received null local anon Id, aborting loadTips!");
      return { hasMore: false, things: [] };
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(LOADTIPS_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid,
        skipPagination: true
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

export const flushTipsCache = async(item_uuid, callback) => {
  try {
    const storageKey = `${TIP_LIST_KEY_PREFIX}_${item_uuid}`;
    //console.log('Generated Tips AsyncStorage key: ' + storageKey);
    await AsyncStorage.removeItem(storageKey);
    //console.log("Tips cache flushed for storage key " + storageKey);
    if (callback) {
      callback();
    }
  } catch (e) {
    console.log("Error in loadTipsCache", e);
  }
}

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

// 1.2 Will delete any children of item as well
export const deleteItem = async(item_uuid, callback = null) => {
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
    if (callback) {
      callback();
    }
    //console.log("Delete Item Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling Delete Item API:', error);
  }
}

export const updateItemHierarchy = async(item_uuid, parent_item_uuid, callback = null) => {
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
    if (callback) {
      callback();
    }
  } catch (error) {
    console.error('Error calling updateItemHierarchy API:', error);
  }
}

export const updateItemSchedule = async(item_uuid, scheduled_datetime_utc, callback = null) => {
  try {
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(UPDATEITEMSCHEDULE_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid,
        scheduled_datetime_utc: scheduled_datetime_utc
      }
    );
    if (callback) {
      callback();
    }
    //console.log("updateItemSchedule Response Obj: " + JSON.stringify(response.data.body));
    return response.data;
  } catch (error) {
    console.error('Error calling updateItemSchedule API:', error);
  }
}

export const updateItemEventId = async(item_uuid, event_id) => {
  try {
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(UPDATEITEMEVENTID_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid,
        event_id: event_id
      }
    );
    //console.log("updateItemEventId Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling updateItemEventId API:', error);
  }
}

export const updateItemPublicState = async(item_uuid, new_public_state, callback = null) => {
  try {
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(UPDATEITEMPUBLICSTATE_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid,
        is_public: new_public_state
      }
    );
    if (callback) {
      callback();
    }
    //console.log("updateItemPublicState Response Obj: " + JSON.stringify(response.data.body));
  } catch (error) {
    console.error('Error calling updateItemPublicState API:', error);
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
    //console.log("Entering loadUsername, uuid: " + name);
    const response = await axios.post(LOADUSER_URL,
      {
        name: name
      }
    );
    //console.log("loadUsername Response Obj: " + JSON.stringify(response.data.body));
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

export const updateAffirmation = async(new_affirmation) => {
  try {
    //console.log("updateUsername: " + new_name);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return ;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(UPDATEAFFIRMATION_URL,
      {
        anonymous_id: localAnonId,
        affirmation: new_affirmation
      }
    );
    console.log("updateAffirmation Response Obj: " + JSON.stringify(response.data.body));
    return response.data
  } catch (error) {
    console.error('Error calling updateAffirmation API:', error);
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

export const blockItem = async(item_uuid, reason) => {
  try {
    //console.log("Entering deleteTip, uuid: " + tip_uuid);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return ;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(BLOCKITEM_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid,
        reason: reason
      }
    );
    const wasItemBlockSuccessful = response.data.body;
    return wasItemBlockSuccessful;
  } catch (error) {
    console.error('Error calling blockItem API:', error);
  }
}

export const reactToItem = async(item_uuid, reaction_str, remove = false) => {
  try {
    //console.log("Entering deleteTip, uuid: " + tip_uuid);
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return ;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(REACTTOITEM_URL,
      {
        anonymous_id : localAnonId,
        item_uuid: item_uuid,
        reaction: reaction_str,
        delete: remove
      }
    );
    const reactionSuccessful = response.data.body;
    return reactionSuccessful;
  } catch (error) {
    console.error('Error calling reactToItem API:', error);
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
    console.error('Error calling resetAllData API:', e);
  }
};

export const overrideUserAnonId = async(newUserInfo) => {
  try {
    console.log("Inside overrideUserAnonId, input value: " + newUserInfo);
    const curr_user_obj_str = await AsyncStorage.getItem(USER_OBJ_KEY);
    const curr_user_obj = JSON.parse(curr_user_obj_str);
    console.log("Current User Object: " + JSON.stringify(curr_user_obj));
    
    const [newUsername, newAnonId] = newUserInfo.split(":");

    const new_user_obj = {...curr_user_obj, 
      name: newUsername,
      anonymous_id: newAnonId 
    };
    console.log("Current User Obj: " + JSON.stringify(new_user_obj));
    const user_obj_str = JSON.stringify(new_user_obj);
    await AsyncStorage.setItem(USER_OBJ_KEY, user_obj_str);
    console.log("Override successful");
    return true;
  } catch (e) {
    console.log("Error saving user to local storage.", e);
    return false;
  }
}

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

export const loadLocalListLastCachedPage = async(doneFilterString) => {
  try {
    const key = (doneFilterString == OPEN_ITEM_LIST_KEY) 
      ? OPEN_ITEM_LIST_LAST_LOADED_PAGE_KEY
      : DONE_ITEM_LIST_LAST_LOADED_PAGE_KEY;
    const lastCachedPageNumStr = await AsyncStorage.getItem(key);
    //console.log(`loadLocalListLastCachedPage: ${doneFilterString}) Last Cached Page (${lastCachedPageNumStr})`);
    if (lastCachedPageNumStr) {
      return Number(lastCachedPageNumStr);
    } else {
      return '<Should not happen>'
    }
  } catch (e) {
    console.log("loadLocalListLastCachedPage", e);
  }
}

export const hasRecordedBefore = async() => {
  try {
    return await AsyncStorage.getItem(HAS_RECORDED_BEFORE) != null
  } catch (e){
    console.warn("Error retrieving hasRecordedBefore", e);
    return false;
  }
}

export const setRecordedBefore = async() => {
  try {
    await AsyncStorage.setItem(HAS_RECORDED_BEFORE, "yes");
  } catch (e){
    console.warn("Error setting HAS_RECORDED_BEFORE key", e);
  }
}

export const clearRecordedBefore = async() => {
  try {
    await AsyncStorage.removeItem(HAS_RECORDED_BEFORE);
  } catch (e){
    console.warn("Error removing HAS_RECORDED_BEFORE key", e);
  }
}

export const isTWEmployee = async() => {
  try {
    return await AsyncStorage.getItem(TW_EMPLOYEE_KEY) != null
  } catch (e){
    console.warn("Error retrieving TW_EMPLOYEE_KEY", e);
    return false;
  }
}

export const setTWEmployee = async() => {
  try {
    await AsyncStorage.setItem(TW_EMPLOYEE_KEY, "yes");
  } catch (e){
    console.warn("Error setting TW_EMPLOYEE_KEY key", e);
  }
}

export const clearTWEmployee = async() => {
  try {
    await AsyncStorage.removeItem(TW_EMPLOYEE_KEY);
  } catch (e){
    console.warn("Error removing TW_EMPLOYEE_KEY key", e);
  }
}

export const trackClickstream = async(event_name, event_properties) => {
  try {
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return ;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(CLICKSTREAM_URL,
      {
        anonymous_id : localAnonId,
        platform: Platform.OS,
        eventName: event_name,
        eventProperties: JSON.stringify(event_properties)
      }
    );
  } catch (error) {
    console.error('Error calling trackClickstream API:', error);
  }
}

export const feedback = async(form_input_json) => {
  try {
    const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
    if (!localUserSr) {
      //console.log("Received null local anon Id, aborting tipVote!");
      return ;
    }
    const localUser = JSON.parse(localUserSr);
    const localAnonId = localUser.anonymous_id;
    const response = await axios.post(FEEDBACK_URL,
      {
        anonymous_id : localAnonId,
        form_input: form_input_json
      }
    );
  } catch (error) {
    console.error('Error calling feedback API:', error);
  } 
}


// ******** BEGIN Non-EXPORTED METHODS ***************************************************

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

const updateLocalListLastCachedPage = async(doneFilterString, page) => {
  try {
    const key = (doneFilterString == OPEN_ITEM_LIST_KEY) 
      ? OPEN_ITEM_LIST_LAST_LOADED_PAGE_KEY
      : DONE_ITEM_LIST_LAST_LOADED_PAGE_KEY;
    await AsyncStorage.setItem(key, `${page}`);
    //console.log(`updateLocalListLastCachedPage: ${doneFilterString}) Last Cached Page (${page})`);
  } catch (e) {
    console.log("updateLocalListLastCachedPage", e);
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
    const affirmation = null;
    const doneCountStr = '0';
    const tipCountStr = '0';
    //console.log(`Username created ${newUsername} with Anon ID ${newAnonymousId}`);

    // Asyncronously pass generated user name and anonymous ID to backend to store on server
    await saveUserToBackend(newUsername, newAnonymousId, async (savedUserObj) => {

        // Store user data locally to accelerate future loads
        await saveUserLocally(savedUserObj);
    });
    
    return { 
      name: newUsername, 
      anonymous_id: newAnonymousId, 
      affirmation: affirmation,
      doneCountStr: doneCountStr, 
      tipCountStr: tipCountStr,
      createdAt: new Date().toISOString()
    }
  } catch (error) {
    //console.error('Error calling create User API:', error);
  }
};

// const saveItemsToBackend = async(item_list_obj, callback) => {
//   if (!item_list_obj || item_list_obj.length == 0) {
//     //console.log("saveItemsToBackend called with empty list, aborting backend call!");
//     return null;
//   }

//   try {
//     const localUserSr = await AsyncStorage.getItem(USER_OBJ_KEY);
//     if (!localUserSr) {
//       //console.log("Received null local anon Id, aborting tipVote!");
//       return ;
//     }
//     const localUser = JSON.parse(localUserSr);
//     const localAnonId = localUser.anonymous_id;
//     //console.log("Saving to backend for anon Id: " + localAnonId);
//     const response = await axios.post(SAVEITEMS_URL,
//       {
//         anonymous_id: localAnonId,
//         items_str: JSON.stringify(item_list_obj),
//         skipLoad: true,
//         skipUserLoad: true
//       }
//     );
//     const response_obj = JSON.parse(response.data.body);
//     const updatedUser = response_obj.user;
//     // console.log("Updated User: " + JSON.stringify(updatedUser));
    
//     if (callback) {
//       callback(updatedUser);
//     }

//   } catch (e) {
//     //console.log("Error saving item list to backend", e);
//   }
// }

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

const loadDoneItemsCache = async () => {
  try {
    
    const items_list_str = await AsyncStorage.getItem(DONE_ITEM_LIST_KEY);
    //console.log("loadDoneItemsCache: " + items_list_str);
    return (items_list_str) ? JSON.parse(items_list_str) : [];
  } catch (e) {
    console.log("Error in loadDoneItemsCache", e);
  }
}

const loadItemsCache = async () => {
  try {
    
    const items_list_str = await AsyncStorage.getItem(OPEN_ITEM_LIST_KEY);
    //console.log("loadItemsCache: " + items_list_str);
    return (items_list_str) ? JSON.parse(items_list_str) : [];
  } catch (e) {
    console.log("Error in loadItemsCache", e);
  }
}

const loadTipsCache = async(item_uuid) => {
  try {
    const storageKey = `${TIP_LIST_KEY_PREFIX}_${item_uuid}`;
    //console.log('Generated Tips AsyncStorage key: ' + storageKey);
    const tip_list_str = await AsyncStorage.getItem(storageKey);
    return (tip_list_str) ? JSON.parse(tip_list_str) : [];
  } catch (e) {
    console.log("Error in loadTipsCache", e);
  }
}

export const generateUsername = () => {
  const adjectives = [
      "Efficient", "Focused", "Tasky", "Proactive", "Dynamic", "Motivated",
      "Diligent", "Organized", "Productive", "Hustling", "Energetic", "Ambitious",
      "Driven", "Tenacious", "Swift", "Agile", "Innovative", "Persistent",
      "Visionary", "Resilient", "Hardworking", "Thorough", "Strategic", "Purposeful",
      "Optimistic", "Clever", "Bright", "Brilliant", "Adaptable", "Determined",
      "Energetic", "Reliable", "Inventive", "Logical", "Resourceful", "Enterprising",
      "Passionate", "Committed", "Punctual", "Bold", "Savvy", "Disciplined",
      "Confident", "Vigorous", "Quick", "Resolute", "Analytical", "Creative",
      "Fearless", "Goal-Oriented"
  ];

  const nouns = [
      "Ninja", "Guru", "Wizard", "Hamster", "Machine", "Champion",
      "Avocado", "Overlord", "Commander", "Slayer", "Hero", "Titan",
      "Panda", "Cyclone", "Phoenix", "Rocket", "Dynamo", "Inventor",
      "Mastermind", "Conqueror", "Builder", "Doer", "Creator", "Executor",
      "Strategist", "Leader", "Achiever", "Pioneer", "Visionary", "Planner",
      "Hustler", "Developer", "Crafter", "Thinker", "Solver", "Trainer",
      "Innovator", "Motivator", "Fixer", "Architect", "Pilot", "Trailblazer",
      "Explorer", "Adventurer", "Hunter", "Maker", "Go-Getter", "Operator"
  ];

  // Generate random parts
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(1000 + Math.random() * 9000); // Random 4-digit number

  // Combine parts into a username
  return `${randomAdjective}${randomNoun}${randomNumber}`;
};

// Pass generated user name and anonymous ID to backend to store on server
const saveUserToBackend = async(newUsername, newAnonymousId, callback) => {
  const response = await axios.post(CREATEUSER_URL, {
    username: newUsername,
    anonymous_id: newAnonymousId
  });
  console.log("User creation backend response: " + JSON.stringify(response.data.body));

  if (callback) {
    callback(response.data.body);
  }
  //console.log('User saved to backend storage');
}

