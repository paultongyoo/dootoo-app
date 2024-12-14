import { useContext } from "react";
import { usePathname } from 'expo-router';
import { saveItems, loadItems, deleteItem, updateItemHierarchy, updateItemText, updateItemOrder, updateItemDoneState, saveNewItem } from '@/components/Storage';
import { transcribeAudioToTasks } from '@/components/BackendServices';
import DootooItemEmptyUX from "@/components/DootooItemEmptyUX";
import DootooList from "@/components/DootooList";
import DootooItemSidebar from "@/components/DootooItemSidebar";
import { LIST_ITEM_EVENT__UPDATE_COUNTS, ListItemEventEmitter, ProfileCountEventEmitter } from "@/components/EventEmitters";
import * as amplitude from '@amplitude/analytics-react-native';

import {
  Image, StyleSheet, Pressable,
  Platform,
  Alert
} from "react-native";
import { AppContext } from '@/components/AppContext';
import Reanimated, {
  configureReanimatedLogger,
  Easing,
  ReanimatedLogLevel,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';

export default function Index() {
  const pathname = usePathname();
  const { anonymousId, dootooItems, setDootooItems,
    thingRowHeights, thingRowPositionXs } = useContext(AppContext);

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
    updateItemText(item, async () => {
      ListItemEventEmitter.emit(LIST_ITEM_EVENT__UPDATE_COUNTS);

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
      anonymous_id: anonymousId.current,
      item_uuid: item.uuid
    });

    // Asyncronously update item hierarhcy in DB
    updateItemHierarchy(item.uuid, null);

    console.log("Setting new parent into list");
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

  }

  const handleMakeChild = (item, index) => {

    // Get UUID of nearest parent above item to be made into child
    let nearestParentUUID = '';
    for (var i = index - 1; i >= 0; i--) {
      const currItem = dootooItems[i];
      if (!currItem.parent_item_uuid) {
        console.log("Nearest Parent: " + currItem.text);
        nearestParentUUID = currItem.uuid;
        break;
      }
    }

    amplitude.track("Item Made Into Child", {
      anonymous_id: anonymousId.current,
      item_uuid: item.uuid,
      parent_item_uuid: nearestParentUUID
    });

    // Make thing child of nearest parent
    updateItemHierarchy(item.uuid, nearestParentUUID);

    // If item had children, make those children children of nearest parent too
    const childrenOfItem = dootooItems.filter((prevItem) => prevItem.parent_item_uuid == item.uuid);
    childrenOfItem.forEach((child) => updateItemHierarchy(child.uuid, nearestParentUUID));

    console.log("Setting new child into list");
    setDootooItems((prevItems) => {

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
        anonymous_id: anonymousId.current,
        pathname: pathname,
        uuid: item.uuid,
        done_state_at_click: item.is_done,
        parent_item_uuid: item.parent_item_uuid,
        item_type: (item.parent_item_uuid) ? 'child' : 'adult'
      });

      // Check if item has open kids
      const openChildren = dootooItems.filter((child) => (child.parent_item_uuid == item.uuid) && !child.is_done);
      const doneChildren = dootooItems.filter((child) => (child.parent_item_uuid == item.uuid) && child.is_done);

      // 1) If attempting to set item TO done
      if (!item.is_done) {

        // 1.3 If item being doned is a child...
        if (item.parent_item_uuid) {

          // Collapse single done item
          await new Promise<void>((resolve) => {
            thingRowHeights.current[item.uuid].value = withTiming(0, { duration: 300 },
              (isFinished) => {
                if (isFinished) {
                  runOnJS(resolve)()
                }
              })
          });

          setDootooItems((prevItems) => {

            // Create beginnings of new state, setting item to done
            const donedList = prevItems.map((obj) => (obj.uuid == item.uuid) ? { ...obj, is_done: true } : obj);

            // Check whether child has done siblings...
            const doneSiblings = donedList.filter((child) => ((child.parent_item_uuid == item.parent_item_uuid) && child.is_done && (child.uuid != item.uuid)));
            if (doneSiblings.length > 0) {

              // Relocate item to first done sibling location
              const itemIdx = donedList.findIndex((obj) => obj.uuid == item.uuid);
              const [movedItem] = donedList.splice(itemIdx, 1);
              const firstDoneSibilingIdx = donedList.findIndex((obj) => obj.uuid == doneSiblings[0].uuid);
              donedList.splice(firstDoneSibilingIdx, 0, movedItem);

            } else {

              // Child has no done siblings, now check if it has any siblings
              const siblings = donedList.filter((child) => ((child.parent_item_uuid == item.parent_item_uuid) && (child.uuid != item.uuid)));

              // if it has siblings, relocate item to after last sibling
              if (siblings.length > 0) {
                const itemIdx = donedList.findIndex((obj) => obj.uuid == item.uuid);
                const [movedItem] = donedList.splice(itemIdx, 1);
                const lastSibilingIdx = donedList.findIndex((obj) => obj.uuid == siblings[siblings.length - 1].uuid);
                donedList.splice(lastSibilingIdx + 1, 0, movedItem);
              } else {
                // Leave child where it is, no further ops needed
              }
            }

            // Save new order to DB
            const uuidArray = donedList.map((thing) => ({ uuid: thing.uuid }));
            saveItemOrder(uuidArray);

            // Return updated list to state setter
            return donedList;
          });

          // Update done state in DB
          item.is_done = true;
          updateItemDoneState(item, () => {
            ProfileCountEventEmitter.emit("incr_done");
            ListItemEventEmitter.emit(LIST_ITEM_EVENT__UPDATE_COUNTS);
          });

        } else {

          // Item is either an adult or parent, check if it has kids...
          const children = dootooItems.filter((obj) => obj.parent_item_uuid == item.uuid);

          // Item has kids....
          if (children.length > 0) {

            // item has open children, prompt user how to handle them
            if (openChildren.length > 0) {
              amplitude.track("Doneify With Kids Prompt Displayed", {
                anonymous_id: anonymousId.current,
                pathname: pathname,
                num_open_kids: openChildren.length
              });

              Alert.alert(
                `Item Has ${openChildren.length} Open Subitems`,  // 1.2.1
                `You're setting an item to done that has open subitems.  What do you want to do with the subitems?`, // 1.2.2
                [
                  {
                    text: 'Cancel', // 1.2.3
                    onPress: () => {
                      amplitude.track("Doneify With Kids Prompt Cancelled", {
                        anonymous_id: anonymousId.current,
                        pathname: pathname,
                        num_open_kids: openChildren.length
                      });
                    },
                    style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
                  },
                  {
                    text: 'Delete Them',
                    onPress: async () => {
                      amplitude.track("Doneify With Kids Prompt: Delete Chosen", {
                        anonymous_id: anonymousId.current,
                        pathname: pathname,
                        num_open_children: openChildren.length
                      });

                      // Delete item's kids
                      // var slideAnimationArray = [];
                      // var heightAnimationArray = [];

                      // Execute animations to slide/collapse the item off the screen  
                      const deleteAnimationPromises = [];
                      openChildren.forEach((child) => {

                        // Call asyncronous delete to mark item as deleted in backend to sync database
                        deleteItem(child.uuid);

                        deleteAnimationPromises.push(
                          new Promise<void>((resolve) => thingRowPositionXs.current[child.uuid].value = withTiming(-600, {
                            duration: 300,
                            easing: Easing.in(Easing.quad)
                          }, (isFinished) => { if (isFinished) { runOnJS(resolve)() } })
                          ));
                        deleteAnimationPromises.push(
                          new Promise<void>((resolve) => thingRowHeights.current[child.uuid].value = withTiming(0, {
                            duration: 300,
                            easing: Easing.in(Easing.quad)
                          }, (isFinished) => { if (isFinished) { runOnJS(resolve)() } })
                          ));
                      });

                      await Promise.all(deleteAnimationPromises);

                      openChildren.forEach((child) => {
                        delete thingRowPositionXs.current[child.uuid];
                        delete thingRowHeights.current[child.uuid]
                      });

                      // Asyncronously updated DB with item set done state
                      item.is_done = true;
                      updateItemDoneState(item, () => {
                        ProfileCountEventEmitter.emit("incr_done");
                        ListItemEventEmitter.emit(LIST_ITEM_EVENT__UPDATE_COUNTS);
                      });

                      // Collapse the doned item and of its done children
                      const uuidsToCollapse = [item.uuid];
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

                      // Update latest list by:
                      // 1) filtering out the deleted children
                      // 2) Setting the item to done
                      // 3) Moving doned item plus any of its done children to top of done adults
                      const subtaskUUIDSet = new Set(openChildren.map(obj => obj.uuid));
                      setDootooItems((prevItems) => {

                        // First filter out deleted items and set clicked item to done
                        var filteredAndDonedList = prevItems.filter((obj) => !subtaskUUIDSet.has(obj.uuid))
                          .map((obj) =>
                            (obj.uuid == item.uuid)
                              ? { ...obj, is_done: true }
                              : obj);

                        // Move done item and any of its kids to top of DAWNKs
                        const dawnkedList = moveItemFamilyToTopOfDoneAdults(filteredAndDonedList, item.uuid);

                        // Update order in backend
                        const uuidArray = dawnkedList.map((thing) => ({ uuid: thing.uuid }));
                        saveItemOrder(uuidArray);

                        // Return updated list to state setter
                        return dawnkedList;
                      });
                    }
                  },
                  {
                    text: 'Complete Them',
                    onPress: async () => {
                      amplitude.track("Doneify With Kids Prompt: Complete Chosen", {
                        anonymous_id: anonymousId.current,
                        pathname: pathname,
                        num_open_children: openChildren.length
                      });

                      // Collapse the doned item and of ALL of its children
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

                      // Set each OPEN child as done in backend and incr Profile counter
                      openChildren.forEach((child) => {
                        child.is_done = true;
                        updateItemDoneState(child);
                        ProfileCountEventEmitter.emit("incr_done");
                        // We'll defer updating counts until the main item is updated below
                      });

                      // Set item as done in backend and incr Profile counter
                      item.is_done = true;
                      updateItemDoneState(item, () => {
                        ProfileCountEventEmitter.emit("incr_done");
                        ListItemEventEmitter.emit(LIST_ITEM_EVENT__UPDATE_COUNTS);
                      });

                      // Set item and ALL of its children (previously open as well as pre-existing closed) to done, move them to top of Done Parents List 
                      doneItemAndMoveFamilyToTopOfDoneAdults(setDootooItems, item, saveItemOrder);
                    },
                  },
                ],
                { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
              );
            } else {

              // Collapse the doned item and of all its done children
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

              // All the item's kids must be done
              if (doneChildren.length > 0) {

                // Item is a DAWNK with only done kids; set it to done and move it and its kids to Top of DAWNKs
                // Set item as done in backend and incr Profile counter
                item.is_done = true;
                updateItemDoneState(item, () => {
                  ProfileCountEventEmitter.emit("incr_done");
                  ListItemEventEmitter.emit(LIST_ITEM_EVENT__UPDATE_COUNTS);
                });

                doneItemAndMoveFamilyToTopOfDoneAdults(setDootooItems, item, saveItemOrder);

              } else {
                console.log("Assuming reaching this log is unexpected given preceding logic tree.")
              }
            }
          } else {

            // Collapse single done item
            await new Promise<void>((resolve) => {
              thingRowHeights.current[item.uuid].value = withTiming(0, { duration: 300 },
                (isFinished) => {
                  if (isFinished) {
                    runOnJS(resolve)()
                  }
                })
            });

            // Item doesn't have any kids, simply set it to done and move it to top of doneAdults
            item.is_done = true;
            updateItemDoneState(item, () => {
              ProfileCountEventEmitter.emit("incr_done");
              ListItemEventEmitter.emit(LIST_ITEM_EVENT__UPDATE_COUNTS);
            });

            // Update item done state and position in UI; save new order in backend
            setDootooItems((prevItems) => {

              const donedList = prevItems.map((obj) => (obj.uuid == item.uuid) ? { ...obj, is_done: true } : obj);
              const doneAdults = moveItemFamilyToTopOfDoneAdults(donedList, item.uuid);

              const uuidArray = doneAdults.map((thing) => ({ uuid: thing.uuid }));
              saveItemOrder(uuidArray);

              return doneAdults;
            });
          }
        }
      } else {

        // Set item TO Open
        item.is_done = false;
        updateItemDoneState(item, () => {
          ProfileCountEventEmitter.emit("decr_done");
          ListItemEventEmitter.emit(LIST_ITEM_EVENT__UPDATE_COUNTS);
        });

        // if item is a child
        if (item.parent_item_uuid) {

          // Collapse single undone item
          await new Promise<void>((resolve) => {
            thingRowHeights.current[item.uuid].value = withTiming(0, { duration: 300 },
              (isFinished) => {
                if (isFinished) {
                  runOnJS(resolve)()
                }
              })
          });

          const [parent] = dootooItems.filter(obj => obj.uuid == item.parent_item_uuid);

          // If Item's parent is done, convert item to adult and move it above the parent
          if (parent.is_done) {
            updateItemHierarchy(item.uuid, null);

            setDootooItems((prevItems) => {

              const openedItems = prevItems.map(obj =>
                (obj.uuid == item.uuid)
                  ? {
                    ...obj,
                    parent_item_uuid: null,
                    is_done: false
                  }
                  : obj);

              const doneAdults = openedItems.filter((obj) => obj.is_done && !obj.parent_item_uuid && (obj.uuid != item.uuid));

              // If DA(s) exist, move item to top of DA list
              const itemIdx = openedItems.findIndex(obj => obj.uuid == item.uuid);
              const [movedItem] = openedItems.splice(itemIdx, 1);
              if (doneAdults.length > 0) {
                const firstDoneAdultIdx = openedItems.findIndex(obj => obj.uuid == doneAdults[0].uuid);
                openedItems.splice(firstDoneAdultIdx, 0, movedItem);
              } else {
                openedItems.push(movedItem);
              }

              const uuidArray = openedItems.map((thing) => ({ uuid: thing.uuid }));
              saveItemOrder(uuidArray);

              return openedItems;
            });
          } else {
            // if Item's parent is open, move item to top of parent's done kids or bottom of fam if none

            setDootooItems((prevItems) => {

              const openedItems = prevItems.map(obj =>
                (obj.uuid == item.uuid)
                  ? {
                    ...obj,
                    is_done: false
                  }
                  : obj);

              const doneSiblings = openedItems.filter((obj) =>
                obj.is_done && (obj.parent_item_uuid == item.parent_item_uuid) && (obj.uuid != item.uuid));
              console.log("doneSiblings.length: " + doneSiblings.length);

              // If DoneSib(s) exist, move item to top of DoneSib list
              if (doneSiblings.length > 0) {
                const itemIdx = openedItems.findIndex(obj => obj.uuid == item.uuid);
                const [movedItem] = openedItems.splice(itemIdx, 1);
                const firstDoneSiblingIdx = openedItems.findIndex(obj => obj.uuid == doneSiblings[0].uuid);
                openedItems.splice(firstDoneSiblingIdx, 0, movedItem);
              } else {
                // Leave it where it is, should already be at bottom of list
              }

              const uuidArray = openedItems.map((thing) => ({ uuid: thing.uuid }));
              saveItemOrder(uuidArray);

              return openedItems;
            });
          }


        } else {

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

          // Item is a parent -- move it and any of its children to the top of DA list
          setDootooItems((prevItems) => {

            const openedList = prevItems.map(obj => (obj.uuid == item.uuid) ? { ...obj, is_done: false } : obj);
            const children = openedList.filter(obj => obj.parent_item_uuid == item.uuid);
            const doneAdults = openedList.filter(obj => !obj.parent_item_uuid && obj.is_done);
            const itemIdx = openedList.findIndex(obj => obj.uuid == item.uuid);
            const removed = openedList.splice(itemIdx, 1 + children.length);
            if (doneAdults.length > 0) {
              const firstDoneAdultsIdx = openedList.findIndex(obj => obj.uuid == doneAdults[0].uuid);
              openedList.splice(firstDoneAdultsIdx, 0, ...removed);
            } else {
              openedList.push(...removed);
            }

            const uuidArray = openedList.map((thing) => ({ uuid: thing.uuid }));
            saveItemOrder(uuidArray);

            return openedList;
          });
        }
      }
    } catch (error) {
      console.error("Unexpected error occurred handling done click", error);
    }
  }

  const styles = StyleSheet.create({
    listContainer: {
      //padding: 10,
      flex: 1,
      //justifyContent: "center",
      backgroundColor: "#DCC7AA",
      paddingTop: (Platform.OS == 'ios') ? 100 : 90
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
      bottom: (Platform.OS == 'ios') ? -190 : -190,
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
      backgroundColor: '#556B2F50',
      borderWidth: 0
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
    },
    timerIconContainer: {
      justifyContent: 'center',
      paddingRight: 10
    },
    timerIcon: {
      height: 16,
      width: 16
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

  const renderRightActions = (item, handleThingDeleteFunc) => {
    return (
      <>
        <Reanimated.View style={[styles.itemSwipeAction, styles.action_Delete]}>
          <Pressable
            onPress={() => handleThingDeleteFunc(item)}>
            <Image style={styles.swipeActionIcon_trash} source={require("@/assets/images/trash_icon_white.png")} />
          </Pressable>
        </Reanimated.View>
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
      swipeableOpenFunc={onSwipeableOpen}
      handleDoneClick={handleDoneClick}
      saveAllThings={saveAllItems}
      saveTextUpdateFunc={saveTextUpdate}
      saveThingOrderFunc={saveItemOrder}
      loadAllThings={loadItems}
      deleteThing={deleteItem}
      saveNewThing={saveNewItem}
      transcribeAudioToThings={transcribeAudioToTasks}
      ListThingSidebar={DootooItemSidebar}
      EmptyThingUX={DootooItemEmptyUX}
      isThingPressable={() => { return true }}
      isThingDraggable={true} />
  );

}

// 1.3 Modified to include family and then noticed function right after it is named to do same thing
//     Consolidate at some point?
function moveItemFamilyToTopOfDoneAdults(itemList, item_uuid) {

  // Check if item has any kids
  const itemChildren = itemList.filter((obj) => obj.parent_item_uuid == item_uuid);
  const itemIdx = itemList.findIndex((obj) => obj.uuid == item_uuid);

  // Extract the item and any of its kids, we ASSume they're listed immediately after it!!!  TODO Dehack this!
  const movedItems = itemList.splice(itemIdx, 1 + itemChildren.length);

  const doneAdults = itemList.filter((obj) => obj.is_done && !obj.parent_item_uuid);
  if (doneAdults.length == 0) {
    return itemList.concat(movedItems);
  } else {
    const firstDoneAdultIdx = itemList.findIndex((obj) => obj.uuid == doneAdults[0].uuid);
    itemList.splice(firstDoneAdultIdx, 0, ...movedItems);
    return itemList;
  }
}

// 1.3  See potentially redundant function above!
function
  doneItemAndMoveFamilyToTopOfDoneAdults(setDootooItems: any, item: any, saveItemOrder: (uuidArray: any) => Promise<void>) {
  setDootooItems((prevItems) => {

    const allChildrenUUIDSet = new Set(prevItems.filter(obj => obj.parent_item_uuid == item.uuid));

    const donedList = prevItems.map((obj) => ((obj.uuid == item.uuid) || allChildrenUUIDSet.has(obj.uuid))
      ? { ...obj, is_done: true }
      : obj);

    const doneParentsList = donedList.filter((obj) => !obj.parent_item_uuid && obj.is_done && obj.uuid != item.uuid);
    if (doneParentsList.length > 0) {
      const itemIdx = donedList.findIndex(obj => obj.uuid == item.uuid);
      const removed = donedList.splice(itemIdx, 1 + allChildrenUUIDSet.size);
      const firstParentIdx = donedList.findIndex((obj) => obj.uuid == doneParentsList[0].uuid);
      donedList.splice(firstParentIdx, 0, ...removed);
    } else {
      // Move item and its children to bottom of list
      const itemIdx = donedList.findIndex(obj => obj.uuid == item.uuid);
      const removed = donedList.splice(itemIdx, 1 + allChildrenUUIDSet.size);
      donedList.push(...removed);
    }

    const uuidArray = donedList.map((thing) => ({ uuid: thing.uuid }));
    saveItemOrder(uuidArray);

    return donedList;
  });
}

