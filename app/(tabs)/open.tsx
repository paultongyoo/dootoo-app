import { useContext, useEffect, useRef } from "react";
import { usePathname } from 'expo-router';
import { loadItems, deleteItem, updateItemHierarchy, updateItemText, updateItemOrder, updateItemDoneState, saveNewItems, DONE_ITEM_FILTER_ONLY_OPEN_PARENTS } from '@/components/Storage';
import { transcribeAudioToTasks } from '@/components/BackendServices';
import DootooItemEmptyUX from "@/components/DootooItemEmptyUX";
import DootooList, { listStyles, THINGNAME_ITEM } from "@/components/DootooList";
import DootooItemSidebar from "@/components/DootooItemSidebar";
import { ProfileCountEventEmitter } from "@/components/EventEmitters";
import { trackEvent } from '@/components/Helpers';

import {
  StyleSheet, Pressable, Alert
} from "react-native";
import { AppContext } from '@/components/AppContext';
import Reanimated, {
  configureReanimatedLogger,
  Easing,
  ReanimatedLogLevel,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { IndentIncrease } from "@/components/svg/indent-increase";
import { IndentDecrease } from "@/components/svg/indent-decrease";
import { Trash } from "@/components/svg/trash";
import { MoveToTop } from "@/components/svg/move-to-top";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DootooFirstLaunchUX from "@/components/DootooFirstLaunchUX";

export default function ListScreen() {
  const pathname = usePathname();
  const { anonymousId, username, openItems, setOpenItems, doneItems, setDoneItems, isFirstLaunch,
    initializeLocalUser, initializeDoneItems, hasMoreOpenItems,
    thingRowHeights, thingRowPositionXs, communityItems, refreshCommunityItems } = useContext(AppContext);

  const dootooList = useRef(null);

  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false
  });

  useEffect(() => {
    //console.log("Open.tsx useEffect([])");

    const checkFirstLaunch = async () => {
      const launchStatus = await AsyncStorage.getItem('isFirstLaunch');
      if (launchStatus === null) {
        isFirstLaunch.current = true;
      }
    };
    checkFirstLaunch();

    initializeLocalUser(() => {
      //console.log("Started initializeLocalUser callback method");

      if (dootooList.current) {
        dootooList.current.loadFirstPage();
      }

      // If community items haven't been initialized yet, initialize them!
      if (!communityItems) {
        refreshCommunityItems();
      }

      if (!doneItems) {
        initializeDoneItems();
      }
    });
  }, []);

  const saveItemOrder = async (uuidArray) => {
    updateItemOrder(uuidArray);
  }

  const handleMakeParent = (item) => {

    trackEvent("Item Made Into Parent", {
      anonymous_id: anonymousId,
      username: username,
      item_uuid: item.uuid
    });

    console.log("Setting new parent into list");
    setOpenItems((prevItems) => {

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

    // Asyncronously update item hierarchy in DB and then refresh community items if item is public
    updateItemHierarchy(item.uuid, null, () => {
      if (item.is_public) {
        refreshCommunityItems();
      }
    });
  }

  const handleMakeChild = (item, index) => {

    // Get UUID of nearest parent above item to be made into child
    let nearestParentUUID = '';
    let nearestParentText = '';
    let nearestParentPublic = false;
    for (var i = index - 1; i >= 0; i--) {
      const currItem = openItems[i];
      if (!currItem.parent_item_uuid) {
        console.log("Nearest Parent: " + currItem.text);
        nearestParentUUID = currItem.uuid;
        nearestParentText = currItem.text;
        nearestParentPublic = currItem.is_public;
        break;
      }
    }

    const makeChild = () => {

      trackEvent("Item Made Into Child", {
        anonymous_id: anonymousId,
        username: username,
        item_uuid: item.uuid,
        parent_item_uuid: nearestParentUUID
      });

      // If item had children, make those children children of nearest parent too
      const childrenOfItem = openItems.filter((prevItem) => prevItem.parent_item_uuid == item.uuid);
      childrenOfItem.forEach((child) => updateItemHierarchy(child.uuid, nearestParentUUID));

      console.log("Setting new child into list");
      setOpenItems((prevItems) => {

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

      // Make thing child of nearest parent
      updateItemHierarchy(item.uuid, nearestParentUUID, () => {
        if (item.is_public || nearestParentPublic) {
          refreshCommunityItems();
        }
      });
    }

    const hasChildren = openItems.some((existingItem) => existingItem.parent_item_uuid == item.uuid);
    if (!hasChildren) {
      makeChild();
    } else {
      Alert.alert(
        "Make Parent into Child?",
        `Make this item and all of its children subitems of "${nearestParentText}"?`,
        [
          {
            text: 'Cancel',
            onPress: () => {
              trackEvent("Make Parent into Child Cancelled", {
                anonymous_id: anonymousId,
                username: username,
                pathname: pathname
              });
            },
            style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
          },
          {
            text: 'Yes',
            onPress: () => {
              //console.log('Data Deletion OK Pressed');
              trackEvent("Make Parent into Child Confirmed", {
                anonymous_id: anonymousId,
                username: username,
                pathname: pathname
              });
              makeChild();
            },
          },
        ],
        { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
      );
    }
  }

  const handleDoneClick = async (item) => {

    try {

      trackEvent("Item Done Clicked", {
        anonymous_id: anonymousId,
        username: username,
        pathname: pathname,
        uuid: item.uuid,
        done_state_at_click: (item.is_done == true),
        parent_item_uuid: item.parent_item_uuid,
        item_type: (item.parent_item_uuid) ? 'child' : 'adult'
      });

      if (item.newKeyboardEntry && ((item.text?.length || 0) == 0)) {
        trackEvent("Empty Done Prompt Displayed", { 
          anonymous_id: anonymousId, username: username 
        });
        Alert.alert('', 'Oops! You need to add some text to your item before marking it as done.',
          [
            { text: 'OK', onPress: () => trackEvent("Empty Done Prompt Dismissed", { 
                anonymous_id: anonymousId, username: username 
              }) }
          ]);
        return;
      }


      // Check if item has open kids
      const openChildren = openItems.filter((child) => (child.parent_item_uuid == item.uuid) && !child.is_done);
      const doneChildren = openItems.filter((child) => (child.parent_item_uuid == item.uuid) && child.is_done);

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

          setOpenItems((prevItems) => {

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
            if (item.parent.is_public) {
              refreshCommunityItems();
            }
            ProfileCountEventEmitter.emit("incr_done");
          });

          // Add done item to top of done items list
          //console.log("Adding item to top of done list: " + JSON.stringify(item));
          setDoneItems(prevItems => [item, ...prevItems])

        } else {

          // Item is either an adult or parent, check if it has kids...
          const children = openItems.filter((obj) => obj.parent_item_uuid == item.uuid);

          // Item has kids....
          if (children.length > 0) {

            // item has open children, prompt user how to handle them
            if (openChildren.length > 0) {
              trackEvent("Doneify With Kids Prompt Displayed", {
                anonymous_id: anonymousId,
                username: username,
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
                      trackEvent("Doneify With Kids Prompt Cancelled", {
                        anonymous_id: anonymousId,
                        username: username,
                        pathname: pathname,
                        num_open_kids: openChildren.length
                      });
                    },
                    style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
                  },
                  {
                    text: 'Delete Them',
                    onPress: async () => {
                      trackEvent("Doneify With Kids Prompt: Delete Chosen", {
                        anonymous_id: anonymousId,
                        username: username,
                        pathname: pathname,
                        num_open_children: openChildren.length
                      });

                      // Delete item's kids
                      // var slideAnimationArray = [];
                      // var heightAnimationArray = [];

                      // Execute animations to collapse the parent and all of its items off the screen  
                      const collapseAnimationPromises = [
                        new Promise<void>((resolve) => thingRowHeights.current[item.uuid].value = withTiming(0, {
                          duration: 300,
                          easing: Easing.in(Easing.quad)
                        }, (isFinished) => { if (isFinished) { runOnJS(resolve)() } })
                        )
                      ];
                      openChildren.forEach((child) => {

                        // Call asyncronous delete to mark item as deleted in backend to sync database
                        deleteItem(child.uuid);

                        collapseAnimationPromises.push(
                          new Promise<void>((resolve) => thingRowHeights.current[child.uuid].value = withTiming(0, {
                            duration: 300,
                            easing: Easing.in(Easing.quad)
                          }, (isFinished) => { if (isFinished) { runOnJS(resolve)() } })
                          ));
                      });
                      doneChildren.forEach((child) => {
                        collapseAnimationPromises.push(
                          new Promise<void>((resolve) => thingRowHeights.current[child.uuid].value = withTiming(0, {
                            duration: 300,
                            easing: Easing.in(Easing.quad)
                          }, (isFinished) => { if (isFinished) { runOnJS(resolve)() } })
                          ));
                      });

                      await Promise.all(collapseAnimationPromises);

                      delete thingRowPositionXs.current[item.uuid];
                      delete thingRowHeights.current[item.uuid]
                      openChildren.forEach((child) => {
                        delete thingRowPositionXs.current[child.uuid];
                        delete thingRowHeights.current[child.uuid]
                      });
                      doneChildren.forEach((child) => {
                        delete thingRowPositionXs.current[child.uuid];
                        delete thingRowHeights.current[child.uuid]
                      });

                      // Asyncronously updated DB with item set done state
                      item.is_done = true;
                      updateItemDoneState(item, () => {
                        if (item.is_public) {
                          refreshCommunityItems();
                        }
                        ProfileCountEventEmitter.emit("incr_done");
                      });

                      // 1.6 Update list by removing the item and all of its children
                      const subtaskUUIDSet = new Set(openChildren.map(obj => obj.uuid));
                      doneChildren.forEach(obj => subtaskUUIDSet.add(obj.uuid));
                      setOpenItems((prevItems) => {

                        // First filter out deleted items and set clicked item to done
                        var filteredAndDonedList = prevItems.filter((obj) =>
                          (!subtaskUUIDSet.has(obj.uuid) && (obj.uuid != item.uuid)))

                        // Update Open list order in backend
                        const uuidArray = filteredAndDonedList.map((thing) => ({ uuid: thing.uuid }));
                        saveItemOrder(uuidArray);

                        // Return updated list to state setter
                        return filteredAndDonedList;
                      });

                      // 1.7 Append done item to top of the done list (it's ASSUmed its done children are already on the list)
                      setDoneItems((prevItems) => {

                        // Two changes needed:
                        // 1) Insert done item at the top of the done list
                        // 2) Set is_done=true on all of its done children's parent objects

                        // 1
                        let prependedList = [item, ...prevItems];

                        // 2
                        prependedList = prependedList.map(prevItem =>
                          (prevItem.parent_item_uuid == item.uuid)
                            ? {
                              ...prevItem,
                              parent: {
                                ...prevItem.parent,
                                is_done: true
                              }
                            }
                            : prevItem);

                        return prependedList;
                      });
                    }
                  },
                  {
                    text: 'Complete Them',
                    onPress: async () => {
                      trackEvent("Doneify With Kids Prompt: Complete Chosen", {
                        anonymous_id: anonymousId,
                        username: username,
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

                      // 1.7 Future TODO:  Make the following calls atomic to enforce doneAt ordering

                      // Set each OPEN child as done in backend and incr Profile counter
                      openChildren.forEach((child) => {
                        child.is_done = true;
                        updateItemDoneState(child, () => {
                          ProfileCountEventEmitter.emit("incr_done");
                        });
                        // We'll defer updating counts until the main item is updated below
                      });

                      // Set item as done in backend and incr Profile counter
                      item.is_done = true;
                      updateItemDoneState(item, () => {
                        if (item.is_public) {
                          refreshCommunityItems();
                        }
                        ProfileCountEventEmitter.emit("incr_done");
                      });

                      // 1.6 Update list by removing the item and all of its children
                      const subtaskUUIDSet = new Set(openChildren.map(obj => obj.uuid));
                      doneChildren.forEach(obj => subtaskUUIDSet.add(obj.uuid));
                      setOpenItems((prevItems) => {

                        // First filter out deleted items and set clicked item to done
                        var filteredAndDonedList = prevItems.filter((obj) =>
                          (!subtaskUUIDSet.has(obj.uuid) && (obj.uuid != item.uuid)))

                        // Update order in backend
                        const uuidArray = filteredAndDonedList.map((thing) => ({ uuid: thing.uuid }));
                        saveItemOrder(uuidArray);

                        // Return updated list to state setter
                        return filteredAndDonedList;
                      });

                      // 1.7 Append done items and its children to top of done list 
                      //     (list children after parent to reflect completing kids before completing parents)
                      setDoneItems((prevItems) => {
                        return [
                          item,
                          ...openChildren.map((child) => ({ ...child, is_done: true })),
                          ...prevItems]
                      });
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

                item.is_done = true;
                updateItemDoneState(item, () => {
                  if (item.is_public) {
                    refreshCommunityItems();
                  }
                  ProfileCountEventEmitter.emit("incr_done");
                });

                // 1.6 Update list by removing the item and all of its children
                const subtaskUUIDSet = new Set(doneChildren.map(obj => obj.uuid));
                setOpenItems((prevItems) => {

                  // First filter out deleted items and set clicked item to done
                  var filteredAndDonedList = prevItems.filter((obj) =>
                    (!subtaskUUIDSet.has(obj.uuid) && (obj.uuid != item.uuid)))

                  // Update order in backend
                  const uuidArray = filteredAndDonedList.map((thing) => ({ uuid: thing.uuid }));
                  saveItemOrder(uuidArray);

                  // Return updated list to state setter
                  return filteredAndDonedList;
                });

                // 1.7 Append done item to top of the done list (it's ASSUmed its done children are already on the list)
                setDoneItems((prevItems) => {

                  // Two changes needed:
                  // 1) Insert done item at the top of the done list
                  // 2) Set is_done=true on all of its done children's parent objects

                  // 1
                  let prependedList = [item, ...prevItems];

                  // 2
                  prependedList = prependedList.map(prevItem =>
                    (prevItem.parent_item_uuid == item.uuid)
                      ? {
                        ...prevItem,
                        parent: {
                          ...prevItem.parent,
                          is_done: true
                        }
                      }
                      : prevItem);

                  return prependedList;
                });

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
              if (item.is_public) {
                refreshCommunityItems();
              }
              ProfileCountEventEmitter.emit("incr_done");
            });

            // 1.6 Remove done parent from list; save new order in backend
            setOpenItems((prevItems) => {

              const filteredList = prevItems.filter((obj) => (obj.uuid != item.uuid));
              const uuidArray = filteredList.map((thing) => ({ uuid: thing.uuid }));
              saveItemOrder(uuidArray);

              return filteredList;
            });

            // Append the done item to the top of the done list
            setDoneItems((prevItems) => [item, ...prevItems]);
          }
        }
      } else {

        // Set item TO Open
        item.is_done = false;

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

          const [parent] = openItems.filter(obj => obj.uuid == item.parent_item_uuid);

          if (parent.is_done) {
            console.warn("Reached unexpected scenario for open page: opening child of done parent.");
          } else {

            // if Item's parent is open, move item to top of parent's done kids or bottom of fam if none
            setOpenItems((prevItems) => {

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

            // 1.7 Also remove from done list
            setDoneItems(prevItems => prevItems.filter(prevItem => prevItem.uuid != item.uuid));

            updateItemDoneState(item, () => {
              if (item.parent.is_public) {
                refreshCommunityItems();
              }
              ProfileCountEventEmitter.emit("decr_done");
            });

          }
        } else {
          console.warn("Reached unexpected scenario for list page: Opening a done parent.");
        }
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

  // 1.7  Turned auto child making OFF as this made it too easy
  //      to accidentally make a parent into a child, breaking large families and increasing
  //      chance of orphaning parent's children
  const onSwipeableOpen = (direction, item, index) => {
    //   //console.log("opSwipeableOpen: " + direction + " " + item.text + " " + index);
    //   if (!item.parent_item_uuid && (direction == "left")) {
    //     handleMakeChild(item, index);
    //   } else if (item.parent_item_uuid && (direction == "right")) {

    //     // Don't automatically do parent because the Delete swipe action is available too.
    //     // TODO:  Implement snapping(?) to only make parent if fully open
    //     // handleMakeParent(item);   
    //   }
  }

  const renderRightActions = (item, index, handleThingDeleteFunc, handleMoveToTopFunc, insertRecordingAction) => {

    // Used as part of visibility rules of Move To Top action (don't display if already at top of parent list)
    const idxOfParent =
      (item.parent_item_uuid) ? openItems.findIndex(prevItem => prevItem.uuid == item.parent_item_uuid) : -999;

    return (
      <>
        <Reanimated.View style={[listStyles.itemSwipeAction, styles.action_Delete]}>
          <Pressable
            onPress={() => handleThingDeleteFunc(item)}>
            <Trash wxh="25" color="white" />
          </Pressable>
        </Reanimated.View>
        {insertRecordingAction}
        {item.parent_item_uuid ?
          <Reanimated.View style={[listStyles.itemSwipeAction]}>
            <Pressable
              onPress={() => handleMakeParent(item)}>
              <IndentDecrease wxh="25" color="#3E2723" />
            </Pressable>
          </Reanimated.View>
          : <></>
        }
        {(!item.is_done && (index != 0) && (index != (idxOfParent + 1))) ?
          <Reanimated.View style={[listStyles.itemSwipeAction, styles.action_MoveToTop]}>
            <Pressable
              onPress={() => handleMoveToTopFunc(item)}>
              <MoveToTop wxh="25" color="#3E2723" strokeWidth="2" />
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
          <Reanimated.View style={[listStyles.itemSwipeAction]}>
            <Pressable
              onPress={() => handleMakeChild(item, index)}>
              <IndentIncrease wxh="25" color="#3E2723" />
            </Pressable>
          </Reanimated.View>
          : <></>
        }
      </>
    );
  };

  return (
    <DootooList
      ref={dootooList}
      thingName={THINGNAME_ITEM}
      listArray={openItems}
      listArraySetter={setOpenItems}
      styles={styles}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      swipeableOpenFunc={onSwipeableOpen}
      handleDoneClick={handleDoneClick}
      saveNewThings={saveNewItems}
      saveTextUpdateFunc={updateItemText}
      saveThingOrderFunc={saveItemOrder}
      loadAllThings={(isPullDown, page) => loadItems(isPullDown, page, DONE_ITEM_FILTER_ONLY_OPEN_PARENTS)}
      deleteThing={deleteItem}
      transcribeAudioToThings={transcribeAudioToTasks}
      ListThingSidebar={DootooItemSidebar}
      EmptyThingUX={(isFirstLaunch.current) ? DootooFirstLaunchUX : DootooItemEmptyUX}
      isThingPressable={() => { return true }}
      isThingDraggable={true}
      hasMoreThings={hasMoreOpenItems} />
  );

}