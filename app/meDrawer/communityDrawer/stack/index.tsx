import { useContext } from "react";
import { router } from 'expo-router';
import { saveItems, loadItems, deleteItem, updateItemHierarchy, updateItemText, updateItemOrder, updateItemDoneState } from '@/components/Storage';
import { transcribeAudioToTasks } from '@/components/BackendServices';
import DootooItemEmptyUX from "@/components/DootooItemEmptyUX";
import DootooList from "@/components/DootooList";
import DootooItemSidebar from "@/components/DootooItemSidebar";
import DootooSwipeAction_Delete from "@/components/DootooSwipeAction_Delete";
import { ListItemEventEmitter }  from "@/components/ListItemEventEmitter";
import * as amplitude from '@amplitude/analytics-react-native';


import {
  Image, StyleSheet, Pressable,
  Animated,
  Easing,
  Platform
} from "react-native";
import { AppContext } from '@/components/AppContext';
import Reanimated, {
  SharedValue,
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

export default function Index() {
  const { anonymousId, setSelectedItem, dootooItems, setDootooItems,
          thingRowHeights } = useContext(AppContext);
  const TIPS_PATHNAME = '/meDrawer/communityDrawer/stack/tips';

  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false
  });

  const saveAllItems = async (latestItems, callback) => {

    // console.log("saveAllItems called with latestItems length: " + dootooItems.length);
    if (latestItems && latestItems.length > 0) {
      //console.log(`Passing ${latestItems.length} to saveItems method...`);

      //console.log("saveAllItems started...");
      // Asynchronously sync DB with latest items
      saveItems(latestItems, () => {
        if (callback) {
          callback();
        }
      });
      //console.log("saveAllItems successful.");
    }
  };

  const saveTextUpdate = async (item) => {
    updateItemText(item, () => { 
      ListItemEventEmitter.emit("items_saved");
    });
  }

  const saveItemOrder = async (uuidArray) => {
    updateItemOrder(uuidArray);
  }

  const handleMakeParent = (item) => {

    // Asyncronously update item hierarhcy in DB
    updateItemHierarchy(item.uuid, false);

    setDootooItems((prevItems) => prevItems.map((obj) =>
        (obj.uuid == item.uuid) 
              ? { ...obj, is_child: false }
              : obj)); // This should update UI only and not invoke any syncronous backend operations

    amplitude.track("Item Made Into Parent", {
      anonymous_id: anonymousId.current,
      item_uuid: item.uuid
    });
  }

  const handleMakeChild = (item) => {

    // Asyncronously update item hierarhcy in DB
    updateItemHierarchy(item.uuid, true);

    setDootooItems((prevItems) => prevItems.map((obj) =>
      (obj.uuid == item.uuid) 
            ? { ...obj, is_child: true }
            : obj)); // This should update UI only and not invoke any syncronous backend operations

    amplitude.track("Item Made Into Child", {
      anonymous_id: anonymousId.current,
      item_uuid: item.uuid
    });
  }

  const handleDoneClick = (item) => {
    try {
      //console.log("Done clicked for item index: " + index);
      //var updatedTasks = [...dootooItems];
      var updatedTasks = dootooItems.map((obj) => ({ ...obj }));

      // Before making changes, remember index of first done item in the list, if any
      var firstDoneItemIdx = -1;
      for (var i = 0; i < updatedTasks.length; i++) {
        var currItem = updatedTasks[i];
        if (currItem.is_done) {
          firstDoneItemIdx = i;
          break;
        }
      }
      //console.log("firstDoneItemIdx before changing list: " + firstDoneItemIdx);

      item.is_done = !item.is_done;

      amplitude.track("Item Done Clicked", {
        anonymous_id: anonymousId.current,
        item_uuid: item.uuid,
        is_done: item.is_done
      });

      // Set this to instruct UI to hide item counts until async save op returns and removes the value
      // Update v1.1.1:  Commented out counts_updating as item counts refresh on any update
      //updatedTasks![index].update_counts = true;

      // Set this to instruct list to animate new item into view
      // Update v1.1.1 Deactivating the following feature given removal of post save array overwritting
      item.shouldAnimateIntoView = true

      // Shrink height of item to zero before moving it to new location
      const heightRefOfCurrentRow = thingRowHeights.current[item.uuid];
      Animated.timing(heightRefOfCurrentRow, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false
      }).start(() => {

        const index = updatedTasks.findIndex(obj => obj.uuid == item.uuid);
        updatedTasks[index] = item;

        if (item.is_done == true) {

          //console.log(`Backing index of item ${updatedTasks![index].text}: ${index}`);

          // v1.1.1 Replacing index_backup with top of the list for now to avoid race conditions
          //item.index_backup = index;

          // Move item to the bottom of the list if it's the only done item, otherwise make it the new first done item
          
          const [item] = updatedTasks.splice(index, 1);   // remove the item from its current location

          if (firstDoneItemIdx == -1) {
            updatedTasks = updatedTasks.concat(item);         // Place at end of list
          } else {
            //console.log("Attempting to insert at top of first item list - firstDoneItemIdx: " + firstDoneItemIdx);
            updatedTasks.splice(firstDoneItemIdx - 1, 0, item)    // Insert it at firstDoneItem location
          }

        } else {

          const backupVal = index;
          const [item] = updatedTasks.splice(index, 1);   // remove the item

          if (backupVal != null && (backupVal > firstDoneItemIdx)) {
            //console.log("Placing item at firstDoneItemIdx: " + firstDoneItemIdx);
            updatedTasks.splice(firstDoneItemIdx, 0, item)  // insert it in new location
          } else {
            //console.log("Placing item at backup index: " + backupVal);
            updatedTasks.splice(backupVal, 0, item)  // insert it in new location
          }
        }

        // Asyncronously save new item order
        const uuid_array = updatedTasks.map(obj => ({ uuid: obj.uuid }));
        updateItemOrder(uuid_array); 

        // This should update UI only and not invoke any synchronous backend operations
        // Reorder items to match updated list above
        const reviseItems = (updatedTasks: any, uuid_array: any, newItem: any) => {
          const stateMap = new Map(updatedTasks.map(obj => [obj.uuid, 
            (obj.uuid == newItem.uuid) 
                ? { ...obj, is_done: newItem.is_done }
                : obj]));
          const reorderedArray = uuid_array.map((ordered_obj_uuid) => stateMap.get(ordered_obj_uuid.uuid));
          return reorderedArray;
        }
        setDootooItems((prevItems) => reviseItems(prevItems, uuid_array, item));

        // Asyncronously save updated item done state
        updateItemDoneState(item, () => { 
          ListItemEventEmitter.emit("items_saved");
        });     
      });

    } catch (error) {
      console.log("Error occurred during done logic!", error);
    }
  }

  const styles = StyleSheet.create({
    listContainer: {
      //padding: 10,
      flex: 1,
      //justifyContent: "center",
      backgroundColor: "#DCC7AA",
      paddingTop: (Platform.OS == 'ios') ? 100 : 75
      //alignItems: "center"
    },
    link: {
      fontWeight: 'bold',
      fontSize: 20,
      color: 'blue'
    },
    initialLoadAnimContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    initialLoadMsg: {
      paddingBottom: 15,
      fontSize: 20
    },
    emptyListContainer: {
      flex: 1,
      //flexDirection: 'row',
      //backgroundColor: 'yellow',
      justifyContent: 'center',
      paddingLeft: 30
    },
    emptyListContainer_words: {
      fontSize: 40
    },
    emptyListContainer_arrow: {
      position: 'absolute',
      bottom: -190,
      right: 100,
      height: 200,
      width: 80,
      opacity: 0.4,
      transform: [{ rotate: '9deg' }]
    },
    taskContainer: {
      flex: 1
    },
    taskTitle: {
      fontSize: 16,
      textAlign: 'left',
      paddingTop: 5,
      paddingBottom: 5,
      paddingRight: 5
    },
    taskTitle_isDone: {
      color: '#556B2F',
      textDecorationLine: 'line-through'
    },
    itemContainer: {
      flexDirection: 'row', // Lays out children horizontally
      alignItems: 'center' // Aligns children vertically (centered in this case)
    },
    itemContainer_firstItem: {
      paddingTop: 4
    },
    itemCircleOpen: {
      width: 26,
      height: 26,
      borderRadius: 13, // Half of the width and height for a perfect circle
      borderColor: '3E2723',
      borderWidth: 2,
      backgroundColor: 'white',
      marginLeft: 15
    },
    itemCircleOpen_isDone: {
      backgroundColor: '#556B2F50'
    },
    childItemSpacer: {
      width: 20
    },
    itemNameContainer: {
      marginLeft: 15,
      paddingBottom: 10,
      paddingTop: 10,
      paddingRight: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333', //#322723 with approx 20% alpha
      flex: 1,
      flexDirection: 'row'
    },
    itemNamePressable: {
      flex: 1,
      width: '100%',
      paddingRight: 10
    },
    itemTextInput: {
      fontSize: 16,
      paddingTop: 5,
      paddingBottom: 5,
      paddingRight: 25,
      flex: 1
    },
    itemSwipeAction: {
      width: 70,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      backgroundColor: '#FAF3E0'
    },
    action_Delete: {
      backgroundColor: 'red',
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333' //#322723 with approx 20% alpha
    },
    action_Give: {
      backgroundColor: '#556B2F',
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333' //#322723 with approx 20% alpha
    },
    itemLeftSwipeActions: {
      width: 50,
      backgroundColor: 'green',
      justifyContent: 'center',
      alignItems: 'center'
    },
    swipeableContainer: {
      backgroundColor: '#DCC7AA'
    },
    errorTextContainer: {
      padding: 20
    },
    errorText: {
      color: 'red',
      fontSize: 10
    },
    itemNameSpaceFiller: {
      flex: 1
    },
    similarCountContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      paddingLeft: 15
    },
    similarCountText: {
      fontSize: 15
    },
    similarCountIcon: {
      width: 16,
      height: 16,
      opacity: 0.45,
      marginLeft: 10
    },
    tipCountContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row'
    },
    tipCountText: {
      fontSize: 15
    },
    tipCountIcon: {
      width: 16,
      height: 16,
      borderRadius: 8, // Half of the width and height for a perfect circle
      //borderWidth: 1,
      borderColor: '#3E2723',
      backgroundColor: '#556B2F60',
      marginLeft: 10
    },
    tipCountImageIcon: {
      height: 16,
      width: 16,
      opacity: 0.5,
      marginLeft: 8
    },
    swipeActionIcon_trash: {
      height: 30,
      width: 30
    },
    swipeActionIcon_ident: {
      height: 30,
      width: 30
    },
    giveTipContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingRight: 15,
      flexDirection: 'row'
    },
    giveTipIcon: {
      height: 30,
      width: 50
    },
    simliarTipsIcon: {
      height: 16,
      width: 16,
      borderRadius: 8,
      backgroundColor: 'white'
    },
    receiveTipIcon: {
      height: 40,
      width: 45
    },
    itemCountsRefreshingAnimContainer: {
      justifyContent: 'center'
    }
  });


  const renderRightActions = (item) => {
    return (
      <>
        {(item.is_done) ?
          <Reanimated.View style={[styles.itemSwipeAction, styles.action_Give]}>
            <Pressable
              onPress={() => {
                //console.log("Give Tips button tapped on item: " + dootooItems![index].text);
                amplitude.track("Give Tips Clicked", {
                  anonymous_id: anonymousId.current,
                  item_uuid: item.uuid
                });
                setSelectedItem(item);
                router.push(TIPS_PATHNAME);
              }}>
              <Image style={styles.giveTipIcon} source={require("@/assets/images/give_icon_white.png")} />
            </Pressable>
          </Reanimated.View>
          : (item.tip_count && item.tip_count > 0) ?
            // <Reanimated.View style={[styles.itemSwipeAction, styles.action_Give]}>
            //   <Pressable
            //     onPress={() => {
            //       amplitude.track("Receive Tips Clicked", {
            //         anonymous_id: anonymousId.current,
            //         item_uuid: dootooItems![index].uuid
            //       });
            //       //console.log("Similar Tips button tapped on item: " + dootooItems![index].text);
            //       setSelectedItem(dootooItems![index]);
            //       router.push(TIPS_PATHNAME);
            //     }}>
            //     {/* <View style={styles.simliarTipsIcon}></View> */}
            //     <Image style={styles.receiveTipIcon} source={require("@/assets/images/receive_tip_white.png")} />
            //   </Pressable>
            // </Reanimated.View>
            <></>
            : <></>
        }
        <DootooSwipeAction_Delete
          styles={styles}
          listArray={dootooItems} listArraySetter={setDootooItems}
          listThing={item}
          deleteThing={deleteItem} />
        {item.is_child ?
          <Reanimated.View style={[styles.itemSwipeAction]}>
            <Pressable
              onPress={() => handleMakeParent(item)}>
              <Image style={styles.swipeActionIcon_ident} source={require("@/assets/images/left_outdent_3E2723.png")} />
            </Pressable>
          </Reanimated.View>
          : <></>
        }
      </>
    );
  };

  const renderLeftActions = (item) => {
    return (
      <>
        {(!item.is_child /*&& (index != 0) && (!dootooItems[index - 1].is_done)*/) ?
          <Reanimated.View style={[styles.itemSwipeAction]}>
            <Pressable
              onPress={() => handleMakeChild(item)}>
              <Image style={styles.swipeActionIcon_ident} source={require("@/assets/images/left_indent_3E2723.png")} />
            </Pressable>
          </Reanimated.View>
          : <></>
        }
      </>
    );
  };

  return (
    <DootooList listArray={dootooItems}
      listArraySetter={setDootooItems}
      styles={styles}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      handleDoneClick={handleDoneClick}
      saveAllThings={saveAllItems}
      saveTextUpdateFunc={saveTextUpdate}
      saveThingOrderFunc={saveItemOrder}
      loadAllThings={loadItems}
      transcribeAudioToThings={transcribeAudioToTasks}
      ListThingSidebar={DootooItemSidebar}
      EmptyThingUX={DootooItemEmptyUX}
      isThingPressable={() => { return true }}
      isThingDraggable={true} />
  );




  // Update v1.1.1:  This function will likely be deprecated/removed as now item counts
  // refresh at the DootooItemSidebar component level
  // function refreshItemCounts(latestItems: any, updatedItems: any) {
  //   var displayedListToUpdate = [...latestItems];
  //   for (var i = 0; i < updatedItems.length; i++) {
  //     const currUpdatedItem = updatedItems[i];
  //     for (var j = 0; j < displayedListToUpdate.length; j++) {
  //       if (displayedListToUpdate[j].uuid == currUpdatedItem.uuid) {
  //         displayedListToUpdate[j].tip_count = currUpdatedItem.tip_count;
  //         displayedListToUpdate[j].similar_count = currUpdatedItem.similar_count;
  //         displayedListToUpdate[j].counts_updating = false;

  //         // Fire a tracking event if user is displayed an item with non zero count(s)
  //         if (displayedListToUpdate[j].tip_count + displayedListToUpdate[j].similar_count > 0) {
  //           amplitude.track("Item Counts UI Refreshed", {
  //             anonymous_id: anonymousId.current,
  //             item_uuid: displayedListToUpdate[j].uuid,
  //             item_is_done: displayedListToUpdate[j].is_done,
  //             tip_count: displayedListToUpdate[j].tip_count,
  //             similar_count: displayedListToUpdate[j].similar_count
  //           });
  //         }

  //         break;
  //       }
  //     }
  //   }
  //   return displayedListToUpdate;
  // }
}

