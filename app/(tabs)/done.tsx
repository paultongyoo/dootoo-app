import { useContext, useEffect } from "react";
import { usePathname } from 'expo-router';
import { loadItems, deleteItem, updateItemText, updateItemOrder, updateItemDoneState, saveNewItem, saveNewItems, DONE_ITEM_FILTER_ONLY_DONE_ITEMS, updateItemHierarchy } from '@/components/Storage';
import { transcribeAudioToTasks } from '@/components/BackendServices';
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
import { Trash } from "@/components/svg/trash";
import DootooDoneEmptyUX from "@/components/DootooDoneEmptyUX";

/*
  1.7 Latest MVP UX: 
        -- Flat page of ALL completed parents and children, listed by Item.updatedAt descending
        --- Page updated to list completed subitems that ARE listed on opened items page too
        -- Completed children have their parents' text listed above them in smaller font (they are NOT separate list items) 

      Actions allowed from this page at the moment
        1) Reopening individual items:
            - User prompted to confirm
            - Item moved to top of opened list
            - Reopened children scenarios
            -- If child's parent is open, reopened child is removed from done page 
                and opened in place on opened page
            -- If child's parent is done, reopened child is removed from done page 
                and moved to top of opened page as new adult
            -- Reopened parents only are removed from the done page (any completed children stay on done page) 
                and their entire family (should be only done items) moved to top of opened page
        2) Deleting individual items
        3) Making item public (yes, currently want to test allowing completed items to be made public to see if users do this to celebrate)
        4) Pagination load on scroll
        5) Pull down to refresh
*/

export default function DoneScreen() {
  const pathname = usePathname();
  const { anonymousId, username, doneItems, setDoneItems, setOpenItems,
    thingRowHeights, refreshCommunityItems } = useContext(AppContext);

  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false
  });

  // useEffect(() => {
  //   console.log("DoneScreen.useEffect([])");
  // }, []);

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

  const handleDoneClick = async (item) => {

    try {

      amplitude.track("Item Done Clicked", {
        anonymous_id: anonymousId,
        username: username,
        pathname: pathname,
        uuid: item.uuid,
        done_state_at_click: item.is_done,
        parent_item_uuid: item.parent_item_uuid,
        item_type: (item.parent_item_uuid) ? 'child' : 'adult'
      });

      // Build list of done children on the page
      const doneChildren = doneItems.filter((child) => (child.parent_item_uuid == item.uuid) && child.is_done);

      // 1) If attempting to set item TO done
      if (!item.is_done) {

        console.warn("Setting an item _to_ done should not be possible on done page!")

      } else {

        amplitude.track("Item Reopen Prompt Displayed", {
          anonymous_id: anonymousId.current,
          username: username,
          pathname: pathname
        });

        Alert.alert(
          "Reopen Item?",
          (item.parent) 
            ? ((item.parent.is_done)
                ? "The item will appear at the top of your Open Items list."
                : "The item will be reopened under its parent on your Open Items list.")
            : ((doneChildren.length == 0) 
                ? "The item will appear at the top of your opened items list."
                : "The item and its subitems will appear at the top of your opened items list."),
          [
            {
              text: 'Cancel',
              onPress: () => {
                amplitude.track("Item Reopen Cancelled", {
                  anonymous_id: anonymousId.current,
                  username: username,
                  pathname: pathname
                });
              },
              style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
            },
            {
              text: 'Yes',
              onPress: () => {

                // Set item TO Open
                item.is_done = false;

                // if item is a child
                if (item.parent_item_uuid) {

                  const reopenChild = async () => {

                    // Collpase child
                    await new Promise<void>((resolve) => {
                      thingRowHeights.current[item.uuid].value =
                        withTiming(0, { duration: 300 }, (isFinished) => { if (isFinished) { runOnJS(resolve)() } })
                    })

                    // Remove item from done page
                    setDoneItems((prevItems) => {

                      // Create new list from existing excluding the child 
                      const filteredList = prevItems.filter(prevItem => (prevItem.uuid != item.uuid));

                      // Save the new list's order in the DB
                      const uuidArray = filteredList.map((thing) => ({ uuid: thing.uuid }));
                      saveItemOrder(uuidArray);

                      // return the list to render it
                      return filteredList;
                    });

                    // Update the opened list in one of two ways based on parent's done state
                    if (item.parent.is_done) {
                      
                      // Clear the item's parent and move to top of the list
                      updateItemHierarchy(item.uuid, null, () => {
                        updateItemDoneState(item, async () => {
                          if (item.parent.is_public) {
                            refreshCommunityItems();
                          }
                          ProfileCountEventEmitter.emit("decr_done");
                        });
                      });
                      setOpenItems((prevItems) => {
                        return [{...item, parent_item_uuid: null, parent: null }, ...prevItems];
                      });
                    } else {

                      // Update done state of item in place (it's ASSumed the item is still present in the list)
                      setOpenItems((prevItems) => prevItems.map(prevItem =>
                          (prevItem.uuid == item.uuid)
                            ? { ...prevItem, is_done: false }
                            : prevItem
                      ));

                      updateItemDoneState(item, async () => {
                        if (item.parent.is_public) {
                          refreshCommunityItems();
                        }
                        ProfileCountEventEmitter.emit("decr_done");
                        
                        amplitude.track("Item Reopen Completed", {
                          anonymous_id: anonymousId.current,
                          username: username,
                          pathname: pathname,
                          item_type: 'child'
                        });
                      });
                    }
                  }
                  reopenChild();

                } else {

                  const reopenAdult = async () => {

                    // Collapse reopened item
                    await new Promise<void>((resolve) => {
                      thingRowHeights.current[item.uuid].value =
                        withTiming(0, { duration: 300 }, (isFinished) => { if (isFinished) { runOnJS(resolve)() } })
                    });


                    // 1) Remove item from done page, and 2) set any children parent objects to open
                    setDoneItems((prevItems) => {

                      // 1) Create new list from existing excluding the child 
                      let filteredList = prevItems.filter(prevItem => (prevItem.uuid != item.uuid));

                      // 2)
                      filteredList = filteredList.map(prevItem =>
                        (prevItem.parent_item_uuid == item.uuid) 
                          ? { ...prevItem,
                            parent: {
                              ...prevItem.parent,
                              is_done: false
                            }
                          }
                          : prevItem);

                      // Save the new list's order in the DB
                      const uuidArray = filteredList.map((thing) => ({ uuid: thing.uuid }));
                      saveItemOrder(uuidArray);

                      // return the list to render it
                      return filteredList;
                    });

                    // 1.7 Prepend reopened item and its done children to the top of the opened items list
                    setOpenItems((prevItems) => [item, ...doneChildren, ...prevItems]);

                    updateItemDoneState(item, async () => {
                      if (item.is_public) {
                        refreshCommunityItems();
                      }
                      ProfileCountEventEmitter.emit("decr_done");

                      amplitude.track("Item Reopen Completed", {
                        anonymous_id: anonymousId.current,
                        username: username,
                        pathname: pathname,
                        item_type: 'adult'
                      });
                    });
                  }
                  reopenAdult();
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
    },
    doneItemParentContainer: {
      paddingLeft: 10,
      paddingTop: 0,
      position: 'relative',
      top: 6,
      //backgroundColor: 'red'
    },
    doneItemParentText: {
      fontSize: 12,
      color: "#3e2723"
    }
  });

  const onSwipeableOpen = (direction, item, index) => {
    // //console.log("opSwipeableOpen: " + direction + " " + item.text + " " + index);
    // if (!item.parent_item_uuid && (direction == "left")) {
    //   handleMakeChild(item, index);
    // } else if (item.parent_item_uuid && (direction == "right")) {

    //   // Don't automatically do parent because the Delete swipe action is available too.
    //   // TODO:  Implement snapping(?) to only make parent if fully open
    //   // handleMakeParent(item);   
    // }
  }

  const renderRightActions = (item, index, handleThingDeleteFunc, handleMoveToTopFunc, insertRecordingAction) => {

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
      loadAllThings={(isPullDown, page) => loadItems(isPullDown, page, DONE_ITEM_FILTER_ONLY_DONE_ITEMS)}
      deleteThing={deleteItem}
      transcribeAudioToThings={transcribeAudioToTasks}
      ListThingSidebar={DootooItemSidebar}
      EmptyThingUX={DootooDoneEmptyUX}
      isThingPressable={() => { return true }}
      isThingDraggable={true}
      hideBottomButtons={true} />
  );

}