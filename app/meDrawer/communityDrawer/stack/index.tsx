import { useContext } from "react";
import { router, usePathname } from 'expo-router';
import { saveItems, loadItems, deleteItem, updateItemHierarchy, updateItemText, updateItemOrder, updateItemDoneState } from '@/components/Storage';
import { transcribeAudioToTasks } from '@/components/BackendServices';
import DootooItemEmptyUX from "@/components/DootooItemEmptyUX";
import DootooList from "@/components/DootooList";
import DootooItemSidebar from "@/components/DootooItemSidebar";
import DootooSwipeAction_Delete from "@/components/DootooSwipeAction_Delete";
import { ListItemEventEmitter, ProfileCountEventEmitter } from "@/components/EventEmitters";
import * as amplitude from '@amplitude/analytics-react-native';


import {
  Image, StyleSheet, Pressable,
  Animated,
  Easing,
  Platform,
  Alert
} from "react-native";
import { AppContext } from '@/components/AppContext';
import Reanimated, {
  SharedValue,
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

export default function Index() {
  const pathname = usePathname();
  const { anonymousId, setSelectedItem, dootooItems, setDootooItems,
    thingRowHeights, thingRowPositionXs } = useContext(AppContext);
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
    updateItemOrder(uuidArray, () => {
      //ListItemEventEmitter.emit("items_saved");
    });
  }

  const handleMakeParent = (item) => {

    // Asyncronously update item hierarhcy in DB
    updateItemHierarchy(item.uuid, null);

    setDootooItems((prevItems) => {

      var newListToReturn = prevItems.map((obj) =>
        (obj.uuid == item.uuid)
          ? {
            ...obj,
            parent_item_uuid: null
          }
          : obj);

      // If item was above one or more children when
      // it became a parent, move it below the family
      const itemIdx = newListToReturn.findIndex((thing) => thing.uuid == item.uuid);
      var newItemIdx = itemIdx;
      while (newListToReturn[newItemIdx + 1] &&
        newListToReturn[newItemIdx + 1].parent_item_uuid) {
        newItemIdx += 1;
      }
      if (itemIdx != newItemIdx) {
        const [movedItem] = newListToReturn.splice(itemIdx, 1);
        newListToReturn.splice(newItemIdx, 0, movedItem);

        const uuidArray = newListToReturn.map((thing) => ({ uuid: thing.uuid }));
        saveItemOrder(uuidArray);
      }

      return newListToReturn;
    }); // This should update UI only and not invoke any syncronous backend operations

    amplitude.track("Item Made Into Parent", {
      anonymous_id: anonymousId.current,
      item_uuid: item.uuid
    });
  }

  const handleMakeChild = (item, index) => {

    let nearestParentUUID = '';
    for (var i = index - 1; i >= 0; i--) {
      const currItem = dootooItems[i];
      if (!currItem.parent_item_uuid) {
        console.log("Nearest Parent: " + currItem.text);
        nearestParentUUID = currItem.uuid;
        break;
      }
    }

    // Asyncronously update item hierarhcy in DB
    updateItemHierarchy(item.uuid, nearestParentUUID);

    setDootooItems((prevItems) => prevItems.map((obj) =>
      (obj.uuid == item.uuid)
        ? {
          ...obj,
          parent_item_uuid: nearestParentUUID
        }
        : obj)); // This should update UI only and not invoke any syncronous backend operations

    amplitude.track("Item Made Into Child", {
      anonymous_id: anonymousId.current,
      item_uuid: item.uuid,
      parent_item_uuid: nearestParentUUID
    });
  }

  const handleDoneClick = (item) => {

    /*
    Rules as of v1.1.1 in priority order:

      1) Scenarios attempting to set item TO Done :
        1.1) If user sets an item that has no children to Done, item is moved to top of
           Done Adults With No Kids (DAWNK) list or end of the list if no DAWNKs exist.
        1.2) If user attempts to set a parent item to done that has open children,
              DISPLAY PROMPT to user that:
              1.2.1) Informs them their item has open subitems
              1.2.2) Asks them if they want to Complete or Delete their open items
                 --- Choosing this option will affect the open items as chosen and set the parent to done
              1.2.3) Gives them Cancel button
                 --- Choosing this option will simply dismiss the prompt; no change made to item or list
        1.3) If user sets a child to Done, item is moved to top of Kids list if kids exist, otherwise left
           underneath parent.  The child is NOT separated from its parent.

      2) Scenarios setting item TO Open:
        2.1) If item is an DAWNK, move it to the top of the DAWNK list if it exists, or end of the list if no DAWNKs
        2.2) If item is a child of a Done parent, move it to the top of the AWNK list (or end of list if no DAWNKS) and make it a parent
        2.3) If item is a child of an Open parent, move it to the top of the Done Kids list (or end of maily list of no DKs)
    */
    try {

      // 1) If attempting to set item TO done
      if (!item.is_done) {

        const children = dootooItems.filter((child) => (child.parent_item_uuid == item.uuid) && !child.is_done);
        if (children.length > 0) {
          Alert.alert(
            `Item Has ${children.length} Open Subitems`,
            `You're setting an item to done that has open subitems.  What do you want to do with the subitems?`, // Message of the alert
            [
              {
                text: 'Cancel',
                onPress: () => {
                  amplitude.track("Doneify With Kids Prompt Cancelled", {
                    anonymous_id: anonymousId.current,
                    pathname: pathname
                  });
                },
                style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
              },
              {
                text: 'Delete Them',
                onPress: () => {
                  amplitude.track("Doneify With Kids Prompt: Delete Chosen", {
                    anonymous_id: anonymousId.current,
                    pathname: pathname
                  });

                  // Delete item's kids
                  var slideAnimationArray = [];
                  var heightAnimationArray = [];
                  children.forEach((child) => {

                    // Call asyncronous delete to mark item as deleted in backend to sync database
                    deleteItem(child.uuid);

                    amplitude.track(`Item Deleted`, {
                      anonymous_id: anonymousId.current,
                      thing_uuid: child.uuid,
                      thing_type: 'Item'
                    });

                    // Add the animatios to slide/collapse the item off the screen
                    slideAnimationArray.push(
                      Animated.timing(thingRowPositionXs.current[child.uuid], {
                        toValue: -600,
                        duration: 300,
                        easing: Easing.in(Easing.quad),
                        useNativeDriver: false
                      })
                    );
                    heightAnimationArray.push(
                      Animated.timing(thingRowHeights.current[child.uuid], {
                        toValue: 0,
                        duration: 300,
                        easing: Easing.in(Easing.quad),
                        useNativeDriver: false
                      })
                    );
                  });
                  Animated.parallel(slideAnimationArray).start(() => {
                    Animated.parallel(heightAnimationArray).start(() => {

                      children.forEach((child) => {
                        delete thingRowPositionXs.current[child.uuid];
                        delete thingRowHeights.current[child.uuid]
                      });

                      // Asyncronously updated DB with item set done state
                      item.is_done = true;
                      updateItemDoneState(item);

                      // Update latest list by filtering out the deleted children PLUS setting the item to done
                      const subtaskUUIDSet = new Set(children.map(obj => obj.uuid));
                      setDootooItems((prevItems) => prevItems.filter((obj) => !subtaskUUIDSet.has(obj.uuid))
                                                             .map((obj) => 
                                                                (obj.uuid == item.uuid)
                                                                    ? { ...obj, is_done: true }
                                                                    : obj));
                    })
                  });
                },
              },
              {
                text: 'Complete Them',
                onPress: () => {
                  amplitude.track("Doneify With Kids Prompt: Complete Chosen", {
                    anonymous_id: anonymousId.current,
                    pathname: pathname
                  });
                },
              },
            ],
            { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
          );
        }
      }

      return;



      //console.log("Done clicked for item index: " + index);
      //var updatedTasks = [...dootooItems];
      var updatedTasks = dootooItems.map((obj) => ({ ...obj }));


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

        if (item.is_done) {



          const [item] = updatedTasks.splice(index, 1);   // remove the item from its current location

          if (firstDoneItemIdx == -1) {
            updatedTasks = updatedTasks.concat(item);         // Place at end of list
          } else {
            updatedTasks.splice(firstDoneItemIdx - 1, 0, item)
          }

        } else {

          const [item] = updatedTasks.splice(index, 1);   // remove the item
        }

        // Asyncronously save new item order
        const uuid_array = updatedTasks.map(obj => ({ uuid: obj.uuid }));
        updateItemOrder(uuid_array);

        // This should update UI only and not invoke any synchronous backend operations
        // Reorder items to match updated list above
        const reviseItems = (updatedTasks: any, uuid_array: any, newItem: any) => {
          const stateMap = new Map(updatedTasks.map(obj => [obj.uuid,
          (obj.uuid == newItem.uuid)
            ? {
              ...obj,
              is_done: newItem.is_done,
              index_backup: index
            }
            : obj]));
          const reorderedArray = uuid_array.map((ordered_obj_uuid) => stateMap.get(ordered_obj_uuid.uuid));
          return reorderedArray;
        }
        setDootooItems((prevItems) => reviseItems(prevItems, uuid_array, item));

        if (item.is_done) {
          ProfileCountEventEmitter.emit("incr_done");
        } else {
          ProfileCountEventEmitter.emit("decr_done");
        }

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
      paddingRight: 5
    },
    itemTextInput: {
      fontSize: 16,
      paddingTop: 5,
      paddingBottom: 5,
      paddingRight: 10,
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


  const renderRightActions = (item, index) => {
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
        {item.parent_item_uuid ?
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

  const renderLeftActions = (item, index) => {
    return (
      <>
        {(!item.parent_item_uuid && (index != 0)) ?
          <Reanimated.View style={[styles.itemSwipeAction]}>
            <Pressable
              onPress={() => handleMakeChild(item, index)}>
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

