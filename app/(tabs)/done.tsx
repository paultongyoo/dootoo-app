import { useContext, useEffect } from "react";
import { usePathname } from 'expo-router';
import { loadItems, deleteItem, updateItemHierarchy, updateItemText, updateItemOrder, updateItemDoneState, saveNewItem, saveNewItems, DONE_ITEM_FILTER_ONLY_DONE_PARENTS, clearItemCache, ITEM_LIST_KEY } from '@/components/Storage';
import { transcribeAudioToTasks } from '@/components/BackendServices';
import DootooItemEmptyUX from "@/components/DootooItemEmptyUX";
import DootooList, { listStyles, THINGNAME_DONE_ITEM } from "@/components/DootooList";
import DootooItemSidebar from "@/components/DootooItemSidebar";
import { ProfileCountEventEmitter } from "@/components/EventEmitters";
import * as amplitude from '@amplitude/analytics-react-native';

import {
  StyleSheet, Pressable,
  Alert
} from "react-native";
import { AppContext } from '@/components/AppContext';
import Reanimated, {
  configureReanimatedLogger,
  ReanimatedLogLevel,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { IndentIncrease } from "@/components/svg/indent-increase";
import { IndentDecrease } from "@/components/svg/indent-decrease";
import { Trash } from "@/components/svg/trash";
import { MoveToTop } from "@/components/svg/move-to-top";
import DootooDoneEmptyUX from "@/components/DootooDoneEmptyUX";

export default function DoneScreen() {
  const pathname = usePathname();
  const { anonymousId, doneItems, setDoneItems, clearOpenItems,
    thingRowHeights, thingRowPositionXs } = useContext(AppContext);

  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false
  });

  useEffect(() => {
    console.log("DoneScreen.useEffect([])");
  }, []);


  // 1.5 Deprecated, remove in future
  // const saveAllItems = async (latestItems, callback) => {

  //   // console.log("saveAllItems called with latestItems length: " + doneItems.length);
  //   if (latestItems && latestItems.length > 0) {
  //     //console.log(`Passing ${latestItems.length} to saveItems method...`);

  //     //console.log("saveAllItems started...");
  //     // Asynchronously sync DB with latest items
  //     saveItems(latestItems, () => {
  //       if (callback) {
  //         callback();
  //       }
  //     });
  //     //console.log("saveAllItems successful.");
  //   }
  // };

  const saveTextUpdate = async (item) => {
    updateItemText(item, async () => {

      // 1.2 Event Text edit not working for some reason TODO revisit
      // if (item.event_id) {
      //    const response = await Calendar.updateEventAsync(item.event_id, {
      //         title: item.text
      //     });
      //     console.log("Event ID Event Update Response: " + JSON.stringify(response));
      //     console.log("Calendar Event title updated asyncronously to (" + item.event_id + "): " + item.text);
      // }   
    });
  }

  const saveItemOrder = async (uuidArray) => {
    updateItemOrder(uuidArray);
  }

  const handleMakeParent = (item) => {

    amplitude.track("Item Made Into Parent", {
      anonymous_id: anonymousId,
      item_uuid: item.uuid
    });

    // Asyncronously update item hierarhcy in DB
    updateItemHierarchy(item.uuid, null);

    console.log("Setting new parent into list");
    setDoneItems((prevItems) => {

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

  }

  const handleMakeChild = (item, index) => {

    // Get UUID of nearest parent above item to be made into child
    let nearestParentUUID = '';
    for (var i = index - 1; i >= 0; i--) {
      const currItem = doneItems[i];
      if (!currItem.parent_item_uuid) {
        console.log("Nearest Parent: " + currItem.text);
        nearestParentUUID = currItem.uuid;
        break;
      }
    }

    amplitude.track("Item Made Into Child", {
      anonymous_id: anonymousId,
      item_uuid: item.uuid,
      parent_item_uuid: nearestParentUUID
    });

    // Make thing child of nearest parent
    updateItemHierarchy(item.uuid, nearestParentUUID);

    // If item had children, make those children children of nearest parent too
    const childrenOfItem = doneItems.filter((prevItem) => prevItem.parent_item_uuid == item.uuid);
    childrenOfItem.forEach((child) => updateItemHierarchy(child.uuid, nearestParentUUID));

    console.log("Setting new child into list");
    setDoneItems((prevItems) => {

      // Make selected item child of nearest parent
      const listWithUpdatedItem = prevItems.map((obj) =>
        (obj.uuid == item.uuid)
          ? {
            ...obj,
            parent_item_uuid: nearestParentUUID
          }
          : obj);

      // Make any children of selected item children of nearest parent
      const listWithUpdatedItemKids = listWithUpdatedItem.map((obj) =>
        (obj.parent_item_uuid == item.uuid)
          ? {
            ...obj,
            parent_item_uuid: nearestParentUUID
          }
          : obj);

      return listWithUpdatedItemKids
    });
  }

  const handleDoneClick = async (item) => {

    /*
    Rules as of v1.1.1 in priority order:

      1) Scenarios attempting to set item TO Done :
        1.1) If user sets an item that has no children to Done, item is moved to top of
           Done Adults list or end of the list if no DAs exist.
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
        2.1) If item is an DA, move it to the top of the DA list if it exists, or end of the list if no DAs
        2.2) If item is a child of a DA, move it to the top of the DA list (or end of list if no DAs) and make it a parent
        2.3) If item is a child of an Open parent, move it to the top of the Done Kids list (or end of maily list of no DKs)
    */
    try {

      amplitude.track("Item Done Clicked", {
        anonymous_id: anonymousId,
        pathname: pathname,
        uuid: item.uuid,
        done_state_at_click: item.is_done,
        parent_item_uuid: item.parent_item_uuid,
        item_type: (item.parent_item_uuid) ? 'child' : 'adult'
      });

      // Check if item has open kids
      const openChildren = doneItems.filter((child) => (child.parent_item_uuid == item.uuid) && !child.is_done);
      const doneChildren = doneItems.filter((child) => (child.parent_item_uuid == item.uuid) && child.is_done);

      // 1) If attempting to set item TO done
      if (!item.is_done) {

        console.warn("Setting an item _to_ done should not be possible on done page!")

      } else {

        amplitude.track("Item Reopen Prompt Displayed", {
          anonymous_id: anonymousId.current,
          pathname: pathname
        });

        Alert.alert(
          "Reopen Item?",
          (doneChildren.length == 0) 
            ? "Your item will appear at the top of your opened items list."
            : "Your item and its subitems will appear at the top of your opened items list.",
          [
            {
              text: 'Cancel',
              onPress: () => {
                amplitude.track("Item Reopen Cancelled", {
                  anonymous_id: anonymousId.current,
                  pathname: pathname
                });
              },
              style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
            },
            {
              text: 'Yes',
              onPress: () => {

                amplitude.track("Item Reopen Completed", {
                  anonymous_id: anonymousId.current,
                  pathname: pathname
                });

                // Clear the opposite list and cache to force a DB load on next load of opposite screen
                clearItemCache(ITEM_LIST_KEY);
                clearOpenItems();

                // Set item TO Open
                item.is_done = false;
                updateItemDoneState(item, async () => {
                  ProfileCountEventEmitter.emit("decr_done");
                });

                // if item is a child
                if (item.parent_item_uuid) {
                  console.warn("Entering scenario that shouldn't happen on the done page: Opening a subitem");
                } else {

                  const reopenFamily = async () => {

                    // Collapse opened item and all of its children
                    const uuidsToCollapse = [item.uuid];
                    uuidsToCollapse.push(...openChildren.map((child) => child.uuid));
                    uuidsToCollapse.push(...doneChildren.map((child) => child.uuid));
                    const collapseAnimationPromises = [];
                    uuidsToCollapse.forEach((uuid) => {
                      collapseAnimationPromises.push(
                        new Promise<void>((resolve) => {
                          thingRowHeights.current[uuid].value =
                            withTiming(0, { duration: 300 }, (isFinished) => { if (isFinished) { runOnJS(resolve)() } })
                        })
                      );
                    });

                    await Promise.all(collapseAnimationPromises);

                    // 1.6 Item is a parent -- remove it and its children from its list (to be rendered on the list screen)
                    setDoneItems((prevItems) => {

                      const openedList = prevItems.map(obj => (obj.uuid == item.uuid) ? { ...obj, is_done: false } : obj);
                      const children = openedList.filter(obj => obj.parent_item_uuid == item.uuid);
                      const itemIdx = openedList.findIndex(obj => obj.uuid == item.uuid);
                      openedList.splice(itemIdx, 1 + children.length);

                      const uuidArray = openedList.map((thing) => ({ uuid: thing.uuid }));
                      saveItemOrder(uuidArray);

                      return openedList;
                    });
                  }
                  reopenFamily();
                }
              },
            },
          ],
          { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
        );
      }
    } catch (error) {
      console.error("Unexpected error occurred handling done click", error);
    }
  }

  const styles = StyleSheet.create({
    listContainer: {
      backgroundColor: "#DCC7AA"
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
      backgroundColor: '#556B2F50',
      borderWidth: 0
    },
    childItemSpacer: {
      width: 20
    },
    childDoneSpacer: {
      width: 40,
      backgroundColor: 'red'
    },
    action_Delete: {
      backgroundColor: 'red'
    },
    swipeableContainer: {
      backgroundColor: '#DCC7AA'
    },
    swipeIconsContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end'
    },
    action_MoveToTop: {
      borderRightWidth: 1,
      borderRightColor: '#3E272333'
    }
  });

  const onSwipeableOpen = (direction, item, index) => {
    //console.log("opSwipeableOpen: " + direction + " " + item.text + " " + index);
    if (!item.parent_item_uuid && (direction == "left")) {
      handleMakeChild(item, index);
    } else if (item.parent_item_uuid && (direction == "right")) {

      // Don't automatically do parent because the Delete swipe action is available too.
      // TODO:  Implement snapping(?) to only make parent if fully open
      // handleMakeParent(item);   
    }
  }

  const renderRightActions = (item, index, handleThingDeleteFunc, handleMoveToTopFunc, insertRecordingAction) => {

    // Used as part of visibility rules of Move To Top action (don't display if already at top of parent list)
    const idxOfParent =
      (item.parent_item_uuid) ? doneItems.findIndex(prevItem => prevItem.uuid == item.parent_item_uuid) : -999;

    return (
      <Reanimated.View style={[listStyles.itemSwipeAction, styles.action_Delete]}>
        <Pressable
          onPress={() => handleThingDeleteFunc(item)}>
          <Trash wxh="25" color="white" />
        </Pressable>
      </Reanimated.View>
    );
  };

  const renderLeftActions = (item, index) => {
    return (
      <></>
    );
  };

  return (
    <DootooList
      thingName={THINGNAME_DONE_ITEM}
      listArray={doneItems}
      listArraySetter={setDoneItems}
      styles={styles}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      swipeableOpenFunc={onSwipeableOpen}
      handleDoneClick={handleDoneClick}
      saveNewThings={saveNewItems}
      saveTextUpdateFunc={saveTextUpdate}
      saveThingOrderFunc={saveItemOrder}
      loadAllThings={(isPullDown) => loadItems(isPullDown, DONE_ITEM_FILTER_ONLY_DONE_PARENTS)}
      deleteThing={deleteItem}
      saveNewThing={saveNewItem}
      transcribeAudioToThings={transcribeAudioToTasks}
      ListThingSidebar={DootooItemSidebar}
      EmptyThingUX={DootooDoneEmptyUX}
      isThingPressable={() => { return true }}
      isThingDraggable={true}
      hideBottomButtons={true} />
  );

}