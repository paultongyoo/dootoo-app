import { View, Text, ActivityIndicator, Pressable, TextInput, Image, Keyboard, Animated, TouchableWithoutFeedback, AppState, StyleSheet, Platform, Alert } from 'react-native';
import { useState, useRef, useContext, useEffect } from 'react';
import Reanimated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import DraggableFlatList, { ScaleDecorator } from '@bwjohns4/react-native-draggable-flatlist';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { AppContext } from './AppContext';
import DootooFooter from './DootooFooter';
import Toast from 'react-native-toast-message';
import { RefreshControl } from 'react-native-gesture-handler';
import * as amplitude from '@amplitude/analytics-react-native';
import { usePathname } from 'expo-router';
import { LIST_ITEM_EVENT__POLL_ITEM_COUNTS_RESPONSE, LIST_ITEM_EVENT__UPDATE_COUNTS, ListItemEventEmitter, ProfileCountEventEmitter } from './EventEmitters';
import { enrichItem, loadItemsCounts, updateItemEventId, updateItemHierarchy, updateItemsCache, updateItemSchedule, updateItemText, updateTipsCache } from './Storage';
import usePolling from './Polling';
import * as Calendar from 'expo-calendar';
import Dialog from "react-native-dialog";
import RNPickerSelect from 'react-native-picker-select';
import * as Linking from 'expo-linking';
import { areDateObjsEqual, calculateTextInputRowHeight, deriveAlertMinutesOffset, extractDateInLocalTZ, extractTimeInLocalTZ, fetchWithRetry, generateCalendarUri, generateEventCreatedMessage, generateNewKeyboardEntry, getLocalDateObj, isThingOverdue } from './Helpers';
import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

const THINGNAME_ITEM = "item";
const DootooList = ({ thingName = THINGNAME_ITEM, loadingAnimMsg = null, listArray, listArraySetter, ListThingSidebar, EmptyThingUX, styles,
    renderLeftActions = (item, index) => { return <></> },
    renderRightActions = (item, index) => { return <></> },
    swipeableOpenFunc = (direction, thing, index) => { return; },
    isDoneable = true,
    handleDoneClick = (thing) => { return; },
    saveAllThings,
    saveTextUpdateFunc,
    saveThingOrderFunc,
    loadAllThings,
    deleteThing,
    saveNewThing,
    transcribeAudioToThings,
    isThingPressable,
    isThingDraggable,
    hideRecordButton = false,
    shouldInitialLoad = true }) => {
    const pathname = usePathname();
    const { anonymousId, lastRecordedCount, initializeLocalUser,
        thingRowPositionXs, thingRowHeights, swipeableRefs, itemCountsMap, selectedItem,
        currentlyTappedThing
    } = useContext(AppContext);
    const [screenInitialized, setScreenInitialized] = useState(false);
    const [isRefreshing, setRefreshing] = useState(false);
    const [showCalendarSelectionDialog, setShowCalendarSelectionDialog] = useState(false);
    const [calendarSelectionInvalid, setCalendarSelectionInvalid] = useState(false);
    const [calendarSelectionInputValue, setCalendarSelectionInputValue] = useState('no_calendar');
    const [showScheduleEditDialog, setShowScheduleEditDialog] = useState(false);
    const [scheduleEditDialogDate, setScheduleEditDialogDate] = useState(new Date());

    // References:  Changing these should intentionally NOT cause this list to re-render
    //const itemFlatList = useRef(null);              // TODO: Consider deprecate
    const onChangeInputValue = useRef('');
    const hasMoreThings = useRef(true);
    const editableCalendars = useRef<Calendar.Calendar[]>([]);
    const selectedCalendar = useRef();
    const selectedTimerThing = useRef(null);
    const blurredOnSubmit = useRef(false);

    const firstListRendered = useSharedValue(false);
    const initialLoadFadeInOpacity = useSharedValue(0);
    const listOpacity = useSharedValue(0);

    /* 1.2 Note: DEACTIVATING PAGINATION for now to prevent accidental 
    //           orphaning as well as testing UX of maintaining local/cached list
    //           instead.  
                 -- DB loads only occur on Pull Down to Refresh actions.
                 -- DB continues to be updated asynchrously in background.
                 -- Lambda will be updated to return entire list on call.
                 -- Counts were removed from load in prior release, so this
                    call should be less heavy and less frequent given app
                    will only call on pull down to refresh actions with this release.             
                 -- All operations to sync backend DB updated to also update local cache

    const isPageLoading = useRef(false);
    */

    // 1.2 Page state var will remain and stay at its value of (1)
    const [page, setPage] = useState(1);

    useEffect(() => {
        initializeLocalUser((isNew: boolean) => {
            //console.log("initializeLocalUser callback method");
            if (shouldInitialLoad) {
                if (!isNew) {
                    initialLoadFadeInOpacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
                        if (isFinished) {
                            runOnJS(resetListWithFirstPageLoad)();
                        }
                    });
                } else {
                    //console.log("Skipping loading things for user as they are brand new.");
                }
            } else {
                //console.log("Skipping initial load for user per shouldInitialLoad == false.");
            }
        });
        return () => {
            //console.log("DootooList.useEffect([]) component unmounted " + new Date(Date.now()).toLocaleString());
        }
    }, []);

    const initialListArrayMount = useRef(true);
    useEffect(() => {
        if (initialListArrayMount.current) {
            initialListArrayMount.current = false;
        } else {
            // console.log(`useEffect[listArray] called: List length ${listArray.length}`);
            // console.log(`useEffect[listArray]: current contents: ${JSON.stringify(listArray)}`);
    
            // Asyncronously update local cache with latest listArray update
            if (thingName == THINGNAME_ITEM) {
                updateItemsCache(listArray);
            } else {
                updateTipsCache(selectedItem, listArray);
            }
    
            if (lastRecordedCount.current > 0) {
                // If we're inside here, we were called after recording new things
    
                if (thingName == 'tip') {
                    ProfileCountEventEmitter.emit('incr_tips', { count: lastRecordedCount.current });
                }
    
                // Display Toast
                Toast.show({
                    type: 'msgOpenWidth',
                    text1: `Added ${lastRecordedCount.current} ${thingName}${(lastRecordedCount.current > 1) ? 's' : ''}.`,
                    position: 'bottom',
                    bottomOffset: 220,
                    visibilityTime: 8000,
                    props: {
    
                        // 1.3 TODO Revise undo logic with upcoming speaking into subtasks
                        //      (items can no longer be assumed to have been just appended to top of list);
                        //
                        // numItemsRecorded: lastRecordedCount.current,
                        // onUndoPress: (numItemsToUndo) => {
    
                        //     // TODO: This doesn't delete in DB, FIX
                        //     listArraySetter((prevItems) => prevItems.slice(numItemsToUndo)); // This should update UI only and not invoke any syncronous backend operations            
                        // }
                    }
                });
                lastRecordedCount.current = 0;
            } else {
    
                // This call has to be in this "main UI thread" in order to work
                Toast.hide();
            }
    
            // Immediately look for new counts on any list update
            restartPolling();
    
            if (thingName == THINGNAME_ITEM) {
                syncItemCalendarUpdates();
            }
    
            if (!screenInitialized) {
                initialLoadFadeInOpacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
                    if (isFinished) {
                        runOnJS(setScreenInitialized)(true);
                    }
                });
            }
    
            // Check for count updates since user just made an action
            pollThingCounts();
        }
    }, [listArray]);

    const pollThingCounts = async () => {
        let ignore = false;
        if (!ignore) {
            ignore = true;
            console.log(`Polling for ${thingName} latest counts: ${new Date(Date.now()).toLocaleString()}`);
            if (listArray.length > 0) {
                if (thingName == THINGNAME_ITEM) {
                    const itemUUIDs = listArray.map(thing => thing.uuid);
                    if (itemUUIDs.length > 0) {
                        itemCountsMap.current = await loadItemsCounts(itemUUIDs);
                        if (itemCountsMap.current) {
                            const mappedUUIDs = [...itemCountsMap.current.keys()];
                            ListItemEventEmitter.emit(LIST_ITEM_EVENT__POLL_ITEM_COUNTS_RESPONSE, mappedUUIDs);
                        } else {
                            console.log("itemCountsMap.current is null - inspecting itemUUIDs: " + JSON.stringify(itemUUIDs));
                        }
                    } else {
                        console.log("itemUUIDs.length unexpectedly zero given listArray.length > 0 -- is app in bad state?");
                    }
                } else {
                    console.log("Ignoring poll call for tips, not supported at this time");
                }
            } else {
                console.log(`${thingName} list empty, calling stopPolling...`);
                stopPolling();
            }
            ignore = false;
        } else {
            console.log("Poll already in progress, ignoring duplicate call");
        }
    }

    const { startPolling, stopPolling, restartPolling } = usePolling(pollThingCounts);
    useEffect(() => {

        const forceItemCountsUpdate = ListItemEventEmitter.addListener(LIST_ITEM_EVENT__UPDATE_COUNTS, restartPolling);

        const handleAppStateChange = (nextAppState) => {
            console.log("App State Changed: " + nextAppState);
            if (nextAppState === "active") {
                startPolling();

                // Asynchronously check if updated any events in Calendar app
                if (thingName == THINGNAME_ITEM) {
                    syncItemCalendarUpdates();
                }
            } else {
                stopPolling();
            }
        };

        const subscription = AppState.addEventListener("change", handleAppStateChange);

        return () => {
            forceItemCountsUpdate.remove();
            subscription.remove();
        }
    }, [startPolling, stopPolling]);

    // 1.2 This function is modified to always execute the page = 1 scenario on all calls,
    //     whether it is first launch scenario or on refresh pull down
    const resetListWithFirstPageLoad = async (isPullDown = false) => {
        //        if (page == 1) {
        // If current page is already 1, manually invoke LoadThingsForCurrentPage 
        // as useEffect(page) won't be called
        loadThingsForCurrentPage(isPullDown);
        // } else {
        //     //console.log("Setting page var to 1 to trigger loadThingsForCurrentPage().")
        //     setPage(1);
        // }
    };

    // 1.2 We deactivate this effect because the page value will now longer change from 1
    // useEffect(() => {
    //     //console.log("useEffect(page) called for pathname " + Date.now());
    //     if (screenInitialized) {
    //         loadThingsForCurrentPage();
    //     } else {
    //         //("Not calling loadThingsForCurrentPage in useEffect(page) as it was called during first useEffect([]) call.");
    //     }
    // }, [page]);

    // 1.2 Pagination deactivated, see note at start of file
    // const loadNextPage = () => {
    //     //console.log("loadNextPage called");
    //     if (hasMoreThings.current) {
    //         if (!isRefreshing && !isPageLoading.current) {
    //             //console.log(`List end reached, incrementing current page var (currently ${page}).`);
    //             isPageLoading.current = true;
    //             setPage((prevPage) => prevPage + 1);
    //         } else {
    //             //console.log(`Ignoring pull down action as page ${page} currently loading or full list is refreshing.`);
    //         }
    //     } else {
    //         //console.log(`Ignoring onEndReach call as user doesn't have more ${thingName} to return`);
    //     }
    // };

    // 1.2 Pagination deactivated, see note at start of file
    //     Even with pagination deactivated, we can keep the following
    //     function as unchanged as the page = 1 scenario will retrieve entire list
    //     as desired, we just will never hit the concatenation scenario which
    //     breaks UX in unexpected orphan and done-ing situations.
    //
    //     The pulldown boolean becomes the switch that executes cache load (pulldown == false) or DB load (pulldown == true)
    //     -- boolean is passed to loadAllThings so backend can distinguish
    const loadThingsForCurrentPage = async (isPullDown = false) => {
        //console.log(`Calling loadAllThings(page) with page = ${page}.`);

        // 1.2 Removed page parameter pass to loadAllThings
        //const loadResponse = await loadAllThings(isPullDown, page);
        const loadResponse = await loadAllThings(isPullDown);

        let things = loadResponse.things || [];
        const hasMore = loadResponse.hasMore;

        // Immediately update hasMore state to prevent future backend calls if hasMore == false
        hasMoreThings.current = hasMore;

        //isPageLoading.current = false;
        setRefreshing(false);

        // If we're loading the first page, assume we want to reset the displays list to only the first page
        // (e.g. on a pull-down-to-refresh action).  If page > 1, assume we want to append the page to what's currently
        // displayed.
        if (page == 1) {
            //console.log(`(Re)setting displayed list to page 1, containing ${things.length} ${thingName}(s).`)

            // 1.3 Deactivated fade in animation to prevent flicker on launch
            // if (isPullDown) {
            //     //console.log("Loading page 1 as part of pulldown refresh, attempting to fade out current list before fading in new list");
            //     fadeInListOnRender.current = true;
            //     listFadeOutAnimation.start(() => {
            //         listArraySetter([...things]);
            //     });
            // } else {
            //fadeInListOnRender.current = true;

            //console.log("Loading page 1 outside of pulldown refresh, simply fading in list");
            listArraySetter([...things]);
            // }
        } else {
            //console.log(`Appending ${things.length} ${thingName}(s) from page ${page} to current list.`)
            listArraySetter((prevItems) => prevItems.concat(things));
        }
    }

    function handleThingDrag(newData: unknown[], fromIndex, toIndex, draggedThing) {

        amplitude.track("List Item Dragged", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: draggedThing.uuid,
            item_type: (draggedThing.parent_item_uuid) ? 'child' : 'adult'
        });

        if (isThingDraggable) {

            // If draggedThing is a child but was dragged immediately above a parent and is NOT being 
            // dragged to the bottom of its family list,
            // assume user wnats to make the thing a parent / detach it from its siblings
            if (draggedThing.parent_item_uuid &&
                (!newData[toIndex - 1] || (newData[toIndex - 1].parent_item_uuid != draggedThing.parent_item_uuid)) &&
                (newData[toIndex + 1] && !newData[toIndex + 1].parent_item_uuid)) {

                amplitude.track(`Child Dragged Outside Of Family`, {
                    anonymous_id: anonymousId.current,
                    pathname: pathname,
                    uuid: draggedThing.uuid
                });

                newData[toIndex].parent_item_uuid = null;
                updateItemHierarchy(newData[toIndex].uuid, null);
            }

            // If draggedThing is a child and is dragged immediately above a child from another family
            // assume the user wants to move the child to the new family
            if (draggedThing.parent_item_uuid &&
                newData[toIndex + 1] &&
                newData[toIndex + 1].parent_item_uuid &&
                newData[toIndex + 1].parent_item_uuid != draggedThing.parent_item_uuid) {

                amplitude.track(`Child Dragged to New Family`, {
                    anonymous_id: anonymousId.current,
                    pathname: pathname,
                    uuid: draggedThing.uuid
                });

                newData[toIndex].parent_item_uuid = newData[toIndex + 1].parent_item_uuid;
                updateItemHierarchy(newData[toIndex].uuid, newData[toIndex + 1].parent_item_uuid);
            }


            // If thing is a parent but was dragged immediately above a child,
            // assume user wants to make the thing a sibling.
            // If the thing has children, make the thing's children siblings too
            if (!draggedThing.parent_item_uuid &&
                (newData[toIndex + 1] && newData[toIndex + 1].parent_item_uuid)) {

                const newParentUUID = newData[toIndex + 1].parent_item_uuid;

                // Grow any kids the thing has into siblings
                var kidCount = 0;
                newData.filter((child) => child.parent_item_uuid == draggedThing.uuid)
                    .forEach((child) => {
                        kidCount += 1;
                        child.parent_item_uuid = newParentUUID;

                        // Async update
                        updateItemHierarchy(child.uuid, newParentUUID);
                    });

                // Make Thing a sibling
                newData[toIndex].parent_item_uuid = newParentUUID;
                updateItemHierarchy(newData[toIndex].uuid, newParentUUID);

                amplitude.track(`Adult Dragged Into Family`, {
                    anonymous_id: anonymousId.current,
                    pathname: pathname,
                    uuid: draggedThing.uuid,
                    kid_count: kidCount
                });
            }

            // If thing is an open adult and was dragged beneath a done adult, 
            // cancel the drag operation (move it back to where it was)
            if ((!draggedThing.parent_item_uuid && !draggedThing.is_done) &&
                (newData[toIndex - 1] && newData[toIndex - 1].is_done && !newData[toIndex - 1].parent_item_uuid)) {
                const [itemToMoveBack] = newData.splice(toIndex, 1);  // Yes, redundant to draggedThing param
                newData.splice(fromIndex, 0, itemToMoveBack);
            }

            // 1.2 NOTE:  The following logic assumes no orphans (children with missing parents) are in the list.
            //            The likelihood of orphans was reduced by making parent/child deletion atomic in 1.2 release
            //            Length check between parentChildOrderData and newData performed to check if orphans exist after the loop
            //            completes (array lengths should match; if newData ends up larger, orphans existed).
            //              
            // TODO: Make this more efficient (loops through entire list regardless of what was dragged)
            const parentChildOrderedData = [];
            newData.forEach((thing) => {
                if (!thing.parent_item_uuid) {
                    parentChildOrderedData.push(thing);
                    const children = newData.filter((child) => child.parent_item_uuid == thing.uuid);
                    parentChildOrderedData.push(...children);
                }
            });
            if (newData.length != parentChildOrderedData.length) {
                console.warn(`ALERT: newData length (${newData.length}) / parentChildOrderedData length (${parentChildOrderedData.length}) mismatch occurred, potential orphan(s) stripped!!`)
            }

            // This should update UI only and not invoke any synchronous backend operations
            // We use ... spread operate to guarantee we're treating previous data as immutable
            listArraySetter([...parentChildOrderedData]);

            // Asynchronously save all items to DB as rank_idxes will have changed
            //saveAllThings(newData);
            // TODO save new order to back end only
            const uuidArray = parentChildOrderedData.map((thing) => ({ uuid: thing.uuid }));
            saveThingOrderFunc(uuidArray);
        } else {
            console.log("Ignoring drag operation given isThingDraggable == false");
        }
    }

    const handleThingDelete = (thing: any) => {
        //console.log("Entering handle delete item...");
        const listArrayCopy = listArray.map((obj) => ({ ...obj }));

        // If the thing is a parent and has one or more children, ask user if they want to remove all children too
        const thingSubtasks = listArrayCopy.filter((obj) => obj.parent_item_uuid == thing.uuid);

        if (!thing.parent_item_uuid && (thingSubtasks.length > 0)) {

            Alert.alert(
                `${(thingName == THINGNAME_ITEM) ? "Item" : "Tip"} Has ${thingSubtasks.length} Sub${thingName.toLowerCase()}${thingSubtasks.length > 1 ? 's' : ''}`,
                `Deleting this ${thingName.toLowerCase()} will delete its sub${thingName.toLowerCase()}${thingSubtasks.length > 1 ? 's' : ''} too.  Continue?`,
                [
                    {
                        text: 'Yes',
                        onPress: async () => {

                            // Three step process:
                            // 1) Animate away the item and its subitems
                            // 2) Delete each item from backend
                            // 3) Remove each item from UI array
                            const index = listArrayCopy.findIndex(obj => obj.uuid == thing.uuid);

                            // Call asyncronous delete to mark item as deleted in backend to sync database
                            // 1.2  Deleting parent thing will delete its children too in DB
                            // 1.3  We don't try to DB delete new keyboard entries as they weren't saved to DB yet
                            if (!thing.newKeyboardEntry) deleteThing(thing.uuid);

                            const animationPromises = [];
                            for (var i = index; i <= index + thingSubtasks.length; i++) {

                                amplitude.track(`${thingName} Deleted`, {
                                    anonymous_id: anonymousId.current,
                                    thing_uuid: listArrayCopy[i].uuid,
                                    thing_type: thingName
                                });

                                animationPromises.push(
                                    new Promise<void>((resolve) => {
                                        thingRowPositionXs.current[listArrayCopy[i].uuid].value = withTiming(-600, {
                                            duration: 300,
                                            easing: Easing.in(Easing.quad)
                                        }, (isFinished) => {
                                            if (isFinished) {
                                                runOnJS(resolve)()
                                            }
                                        });
                                    })
                                );
                                animationPromises.push(
                                    new Promise<void>((resolve) => {
                                        thingRowHeights.current[listArrayCopy[i].uuid].value = withTiming(0, {
                                            duration: 300,
                                            easing: Easing.in(Easing.quad)
                                        }, (isFinished) => {
                                            if (isFinished) {
                                                runOnJS(resolve)()
                                            }
                                        });
                                    })
                                );
                            }

                            await Promise.all(animationPromises);

                            delete thingRowPositionXs.current[thing.uuid];
                            delete thingRowHeights.current[thing.uuid];
                            for (const subtask in thingSubtasks) {
                                delete thingRowPositionXs.current[subtask.uuid];
                                delete thingRowHeights.current[subtask.uuid]
                            }

                            listArraySetter((prevThings) => {
                                const subtaskUUIDSet = new Set(thingSubtasks.map(obj => obj.uuid));
                                return prevThings.filter((obj) => (obj.uuid != thing.uuid) && !subtaskUUIDSet.has(obj.uuid))
                            });
                        }
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    }
                ],
                { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
            );
        } else {

            //console.log("thingRowPositionXs contents: " + JSON.stringify(thingRowPositionXs.current));
            const currentRowPositionX = thingRowPositionXs.current[thing.uuid];
            const currentRowHeight = thingRowHeights.current[thing.uuid]
            const index = listArrayCopy.findIndex(obj => obj.uuid == thing.uuid);

            //console.log(`Stats of row before deleting - positionX ${JSON.stringify(currentRowPositionX)}, rowHeight ${JSON.stringify(currentRowHeight)}`);
            currentRowPositionX.value = withTiming(-600, {
                duration: 300,
                easing: Easing.in(Easing.quad)
            }, (isFinished) => {
                if (isFinished) {
                    currentRowHeight.value = withTiming(0, {
                        duration: 300,
                        easing: Easing.in(Easing.quad)
                    }, (isFinished) => {
                        if (isFinished) {
                            runOnJS(postSingleDeletionActions)(listArrayCopy, index, thing);
                        }
                    });
                }
            });
        }
    }

    const postSingleDeletionActions = (listArrayCopy, index, thing) => {

        amplitude.track(`${thingName} Deleted`, {
            anonymous_id: anonymousId.current,
            thing_uuid: thing.uuid,
            thing_type: thingName
        });

        // Call asyncronous delete to mark item as deleted in backend to sync database
        // 1.3  We don't try to DB delete new keyboard entries as they weren't saved to DB yet
        if (!thing.newKeyboardEntry) deleteThing(thing.uuid);

        // Remove item from displayed and thingRowPositionXs lists
        listArrayCopy.splice(index, 1);
        delete thingRowPositionXs.current[thing.uuid];
        delete thingRowHeights.current[thing.uuid];

        //console.log(`updatedThings post delete (${updatedThings.length}): ${JSON.stringify(updatedThings)}`);

        listArraySetter((prevThings) => prevThings.filter((obj) => (obj.uuid != thing.uuid)));
    }

    // Function to close all Swipeables except the one being opened
    const closeOtherSwipeables = (current_item_uuid) => {
        //console.log(`closeOtherSwipeables (${current_item_uuid}): ${JSON.stringify(swipeableRefs)}`);
        for (const uuid in swipeableRefs.current) {
            if ((uuid != current_item_uuid) && swipeableRefs.current.hasOwnProperty(uuid)) {
                swipeableRefs.current[uuid].close();
            }
        }
    };

    async function openAppSettings() {
        const canOpenSettings = await Linking.canOpenURL('app-settings:');
        if (canOpenSettings) {
            Linking.openURL('app-settings:');
        } else {
            Alert.alert(
                'Unable to open settings',
                'Please navigate to your device settings to re-enable calendar permissions.'
            );
        }
    }

    const handleTimerClick = (thing) => {
        amplitude.track("Item Timer Icon Tapped", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: thing.uuid
        });
        Toast.show({
            type: 'timerInfo',
            visibilityTime: 8000,
            position: 'bottom',
            bottomOffset: 220,
            props: {
                thing: thing,
                onEditIconClick: () => handleTimerToastEditClick(thing),
                onCalendarIconClick: () => handleTimerToastCalendarClick(thing)
            }
        });
    }

    const handleTimerToastEditClick = (thing) => {
        amplitude.track("Edit Schedule Icon Tapped", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: thing.uuid
        });
        selectedTimerThing.current = thing;
        setScheduleEditDialogDate(new Date(thing.scheduled_datetime_utc));
        setShowScheduleEditDialog(true);
    }

    const handleScheduleEditDialogCancel = () => {
        amplitude.track("Edit Schedule Dialog Cancelled", {
            anonymous_id: anonymousId.current,
            pathname: pathname
        });
        setShowScheduleEditDialog(false);
    }

    const handleScheduleEditDialogClear = () => {
        amplitude.track("Item Schedule Clear Message Displayed", {
            anonymous_id: anonymousId.current,
            pathname: pathname
        });
        Alert.alert(
            "Clear Schedule",
            `Are you sure you want to remove the schedule from this item? ` +
            `${(selectedTimerThing.current.event_id) ? 'This will delete your calendar event as well.' : ''}`,
            [
                {
                    text: 'Cancel',
                    onPress: () => {
                        amplitude.track("Item Schedule Clear Message Cancelled", {
                            anonymous_id: anonymousId.current,
                            pathname: pathname
                        });
                    },
                    style: 'cancel'
                },
                {
                    text: 'Yes',
                    onPress: () => {
                        amplitude.track("Item Schedule Cleared", {
                            anonymous_id: anonymousId.current,
                            pathname: pathname
                        });
                        clearScheduleInfo();
                    }
                }
            ],
            { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
        );
    }

    const clearScheduleInfo = async () => {
        const thingToUpdateUUID = selectedTimerThing.current.uuid;
        const eventIdToDelete = selectedTimerThing.current.event_id;

        // Asyncronously delete calendar event
        if (eventIdToDelete) {
            Calendar.deleteEventAsync(eventIdToDelete);
            console.log("Calendar Event ID Deleted asynchronously: " + eventIdToDelete)
        }

        // Clear both scheduled_datetime_utc and event_id fields
        listArraySetter((prevList) => prevList.map((thing) =>
            (thing.uuid == thingToUpdateUUID)
                ? {
                    ...thing,
                    scheduled_datetime_utc: null,
                    event_id: null
                }
                : thing));

        updateItemSchedule(thingToUpdateUUID, null);
        updateItemEventId(thingToUpdateUUID, null);
        setShowScheduleEditDialog(false);
    }

    const updateThingEventId = (eventId) => {
        const thingToUpdateUUID = selectedTimerThing.current.uuid;

        listArraySetter((prevList) => prevList.map((thing) =>
            (thing.uuid == thingToUpdateUUID)
                ? {
                    ...thing,
                    event_id: eventId
                }
                : thing));

        if (thingName == THINGNAME_ITEM) {
            updateItemEventId(thingToUpdateUUID, eventId);
        } else {
            console.log("Event Ids currently not supported on " + thingName + "s");
        }
        setShowScheduleEditDialog(false);
    }

    const handleScheduleEditDialogSubmission = () => {
        if (!selectedTimerThing.current) {
            console.log("selectedTimerThing.current unexpectedly null on edit submit, exiting!!");
            return;
        }

        amplitude.track("Edit Schedule Dialog Submitted", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: selectedTimerThing.current.uuid
        });

        const thingToUpdateUUID = selectedTimerThing.current.uuid;
        const newScheduledDateTimeUTCStr = scheduleEditDialogDate.toISOString();
        const eventIdToUpdate = selectedTimerThing.current.event_id;       // May be null

        console.log("Updated schedule date time UTC String: " + newScheduledDateTimeUTCStr);

        listArraySetter((prevList) => prevList.map((thing) =>
            (thing.uuid == thingToUpdateUUID)
                ? {
                    ...thing,
                    scheduled_datetime_utc: newScheduledDateTimeUTCStr
                }
                : thing));

        updateItemSchedule(thingToUpdateUUID, newScheduledDateTimeUTCStr);

        if (eventIdToUpdate) {
            const updatedTimerThing = { ...selectedTimerThing.current, scheduled_datetime_utc: newScheduledDateTimeUTCStr };
            const updatedDate = getLocalDateObj(updatedTimerThing);
            const alertMinutesOffset = deriveAlertMinutesOffset(updatedTimerThing);
            console.log("Updated alertMinutesOffset: " + alertMinutesOffset);
            Calendar.updateEventAsync(eventIdToUpdate, {
                alarms: [{ relativeOffset: alertMinutesOffset, method: Calendar.AlarmMethod.ALERT }],
                startDate: updatedDate,
                endDate: updatedDate
            });
            //console.log("Calendar Event Updated Asyncronously: " + eventIdToUpdate);
        }

        setShowScheduleEditDialog(false);
    }

    const handleScheduleEditDialogEditDateClick = () => {
        amplitude.track("Edit Schedule Dialog Date Tapped", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: (selectedTimerThing.current) ? selectedTimerThing.current.uuid : null
        });
        if (Platform.OS == 'android') {
            DateTimePickerAndroid.open({
                mode: 'date',
                value: scheduleEditDialogDate,
                onChange: (event, date) => setScheduleEditDialogDate(date)
            })
        } else {
            console.log("This shouldn't be reached on iOS as field should be hidden.");
        }
    }

    const handleScheduleEditDialogEditTimeClick = () => {
        amplitude.track("Edit Schedule Dialog Time Tapped", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: (selectedTimerThing.current) ? selectedTimerThing.current.uuid : null
        });
        if (Platform.OS == 'android') {
            DateTimePickerAndroid.open({
                mode: 'time',
                value: scheduleEditDialogDate,
                onChange: (event, date) => setScheduleEditDialogDate(date)
            })
        } else {
            console.log("This shouldn't be reached on iOS as field should be hidden.");
        }
    }


    const handleTimerToastCalendarClick = async (thing) => {
        amplitude.track("Calendar Icon Tapped", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: thing.uuid
        });
        //console.log("handleTimerToastCalendarClick called");
        selectedTimerThing.current = thing;

        // If thing already has an event_id, assume the event already exists in the
        // user's calendar so do not create another one.  Navigate them to the thing's scheduled date
        // NOTE AT THIS TIME the thing's scheduled date is not guranteed to match the calendar event time
        if (thing.event_id) {
            const calendarUri = generateCalendarUri(selectedTimerThing.current.scheduled_datetime_utc);
            if (calendarUri) {
                amplitude.track("Calendar App URI Opened", {
                    anonymous_id: anonymousId.current,
                    pathname: pathname,
                    uuid: thing.uuid
                });
                Linking.openURL(calendarUri).catch(err =>
                    console.error("Couldn't load calendar", err)
                );
            }
            return;
        }

        // Else, assume the calendar event hasn't been created so proceed with creation UX

        const permissionsResponse = await Calendar.requestCalendarPermissionsAsync();
        amplitude.track("Calendar Permissions Requested", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: thing.uuid,
            permissionsResponse: permissionsResponse.status
        });
        if (permissionsResponse.status === 'granted') {
            const readCalendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            console.log("readCalendars.length: " + readCalendars.length);
            editableCalendars.current = readCalendars.filter(calendar => calendar.allowsModifications);
            console.log("Attempting to display calendar selection dialog");
            if (editableCalendars.current.length == 1) {
                selectedCalendar.current = editableCalendars.current[0];
                const eventId = await createCalendarEvent();
                console.log("Created new calendar event after default calendar selection: " + eventId);
            } else if (editableCalendars.current.length > 1) {
                amplitude.track("Calendar Selection Dialog Displayed", {
                    anonymous_id: anonymousId.current,
                    pathname: pathname
                });
                setShowCalendarSelectionDialog(true);
            } else if (editableCalendars.current.length == 0) {
                amplitude.track("No Calendars Found Message Displayed", {
                    anonymous_id: anonymousId.current,
                    pathname: pathname
                });
                Alert.alert(
                    "No Calendars Found",
                    "Sign into a calendar app on this device so that dootoo can access it.",
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                amplitude.track("No Calendars Found Message Dimissed", {
                                    anonymous_id: anonymousId.current,
                                    pathname: pathname
                                });
                            }
                        }
                    ],
                    { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
                );
            }
        } else {
            amplitude.track("Calendar Permissions Required Displayed", {
                anonymous_id: anonymousId.current,
                pathname: pathname
            });
            Alert.alert(
                "Calendar Permissions Required",
                "The access will allow dootoo to create and edit calendar events for your items.",
                [
                    {
                        text: 'Cancel',
                        onPress: () => {
                            amplitude.track("Calendar Permissions Required Dimissed", {
                                anonymous_id: anonymousId.current,
                                pathname: pathname
                            });
                        },
                        style: 'cancel'
                    },
                    {
                        text: 'Go to Settings',
                        onPress: () => {
                            amplitude.track("Calendar Permissions Required Go to Settings Pressed", {
                                anonymous_id: anonymousId.current,
                                pathname: pathname
                            });
                            openAppSettings();
                        }
                    },
                ],
                { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
            );
        }
    }

    const handleCalendarSelectDialogCancel = () => {
        amplitude.track("Calendar Selection Dialog Cancelled", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: (selectedTimerThing.current) ? selectedTimerThing.current.uuid : null
        });
        setShowCalendarSelectionDialog(false);
        setCalendarSelectionInvalid(false);
        setCalendarSelectionInputValue('no_calendar');
    }

    const handleCalendarSelectDialogSubmission = async () => {
        amplitude.track("Calendar Selection Dialog Submitted", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: (selectedTimerThing.current) ? selectedTimerThing.current.uuid : null
        });
        try {
            //console.log("Inside handleCalendarSelectDialogSubmission");
            if (calendarSelectionInputValue == 'no_calendar') {
                setCalendarSelectionInvalid(true);
            } else {
                setCalendarSelectionInvalid(false);
                setShowCalendarSelectionDialog(false);
                const selectedCalendarId = calendarSelectionInputValue;
                const calIdx = editableCalendars.current.findIndex((calendar) => calendar.id == selectedCalendarId);
                console.log("calIdx: " + calIdx);
                selectedCalendar.current = editableCalendars.current[calIdx];
                console.log("selectedCalendar.current: " + selectedCalendar.current);
                const eventId = await createCalendarEvent();

                // Asyncronous
                updateThingEventId(eventId);

                amplitude.track("Calendar Event Created", {
                    anonymous_id: anonymousId.current,
                    pathname: pathname,
                    uuid: (selectedTimerThing.current) ? selectedTimerThing.current.uuid : null
                });

                if (eventId) {
                    console.log("Created new calendar event after manual calendar selection: " + eventId);

                    Alert.alert("Calendar Event Created",
                        generateEventCreatedMessage(selectedCalendar.current.title, selectedTimerThing.current.scheduled_datetime_utc, deriveAlertMinutesOffset(selectedTimerThing.current)),
                        [
                            {
                                text: 'Go to Calendar',
                                onPress: () => {
                                    amplitude.track("Calendar Event Created Go to Calendar Button Pressed", {
                                        anonymous_id: anonymousId.current,
                                        pathname: pathname
                                    });

                                    const calendarUri = generateCalendarUri(selectedTimerThing.current.scheduled_datetime_utc);
                                    if (calendarUri) {
                                        Linking.openURL(calendarUri).catch(err =>
                                            console.error("Couldn't load calendar", err)
                                        );
                                    }
                                }
                            },
                            {
                                text: 'OK',
                                onPress: () => {
                                    amplitude.track("Calendar Event Created Message Dimissed", {
                                        anonymous_id: anonymousId.current,
                                        pathname: pathname
                                    });
                                }
                            }
                        ]
                    );
                } else {
                    Alert.alert("Unexpected Error Occurred",
                        `An unexpected error occurred trying to create a new calendar event.  We've logged this issue and will fix it as soon as possible.`
                    );
                }
            }
        } catch (error) {
            console.error("Unexpected error occurred submitting calendar selection: ", error);
        }
    }

    const createCalendarEvent = async () => {
        if (!selectedCalendar.current) {
            console.log("Selected Calendar unexpectedly null, cancelling creation of event!");
            return;
        }
        const calendarId = selectedCalendar.current.id;
        console.log("calendarId: " + calendarId);
        if (!calendarId || calendarId.length == 0) {
            Alert.alert(
                'No Default Calendar Found',
                'Not able to create an event because we couldn\'t find a default calendar on your device.'
            );
            return;
        }
        const alertMinutesOffset = deriveAlertMinutesOffset(selectedTimerThing.current);
        const eventTitle = selectedTimerThing.current?.text
        const startEndDate = getLocalDateObj(selectedTimerThing.current);
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const eventId = await Calendar.createEventAsync(calendarId, {
            title: eventTitle,
            alarms: [{ relativeOffset: alertMinutesOffset, method: Calendar.AlarmMethod.ALERT }],
            startDate: startEndDate,
            endDate: startEndDate,
            allDay: false,
            availability: Calendar.Availability.BUSY,
            location: '',
            notes: 'Event created by dootoo',
            status: Calendar.EventStatus.CONFIRMED,
            timeZone: timeZone
        });
        return eventId;
    }

    const syncItemCalendarUpdates = async () => {
        if (listArray && listArray.length > 0) {
            const calendaredThings = listArray.filter((thing) => thing.event_id);
            if (calendaredThings.length > 0) {
                console.log(`Asynchronously ${calendaredThings.length} scheduled items to see if updated in Calendar...`);
                calendaredThings.forEach(async (thing) => {
                    const event_id = thing.event_id;
                    const saved_thing_text = thing.text;
                    const saved_scheduled_local_date = getLocalDateObj(thing);
                    try {
                        const calEvent = await Calendar.getEventAsync(event_id);
                        if (calEvent) {
                            const calStartLocalDate = new Date(calEvent.startDate);

                            // 1.2 TODO REVISIT: Deactivating text sync here as there's a bug with Calendar.updateEventAsync for title updating
                            //     preventing edits from sticking (see corresponding comment on Items index.tsx)
                            if (!areDateObjsEqual(saved_scheduled_local_date, calStartLocalDate)) { //||
                                //!(saved_thing_text === calEvent.title)) {
                                console.log("Calendar Event " + calEvent.title + " has different start date than scheduled event, updating saved item...");
                                console.log("saved_scheduled_local_date: " + saved_scheduled_local_date);
                                console.log("calStartLocalDate: " + calStartLocalDate);

                                // Clear both scheduled_datetime_utc and event_id fields
                                listArraySetter((prevList) => prevList.map((prevThing) =>
                                    (prevThing.uuid == thing.uuid)
                                        ? {
                                            ...prevThing,
                                            scheduled_datetime_utc: calStartLocalDate.toISOString(),
                                            //text: calEvent.title
                                        }
                                        : prevThing));

                                updateItemSchedule(thing.uuid, calStartLocalDate.toISOString());
                                //updateItemText({ uuid: thing.uuid, text: calEvent.title });                 
                            } else {
                                //console.log("Calendar Event " + calEvent.title + " matches what's saved.");
                            }
                        }
                    } catch (error) {
                        console.log("Error was thrown calling getEventAsync on event_id: " + event_id);
                        console.log("Currently ASSUMING (bad!) this means event was removed and we should clear the item's event schedule");

                        // Clear both scheduled_datetime_utc and event_id fields
                        listArraySetter((prevList) => prevList.map((prevThing) =>
                            (prevThing.uuid == thing.uuid)
                                ? {
                                    ...prevThing,
                                    scheduled_datetime_utc: null,
                                    event_id: null
                                }
                                : prevThing));

                        updateItemSchedule(thing.uuid, null);
                        updateItemEventId(thing.uuid, null);
                    }
                });
            } else {
                //console.log("No calendar items to try to sync.");
            }
        }
    }

    const renderThing = ({ item, getIndex, drag, isActive }) => {
        const textInputRef = useRef(null);
        const rowPositionX = useSharedValue(0);
        const rowHeight = useSharedValue(undefined);                // Setting to -1 forces initial calculation of actual row height and onLayout call
        thingRowPositionXs.current[item.uuid] = rowPositionX;       // Pass shared values to global map so they can be animated
        thingRowHeights.current[item.uuid] = rowHeight;             // via user actions such as handleThingDelete
        const [refreshKey, setRefreshKey] = useState(1);
        const lastEnrichedText = useRef('');

        const fullRowHeight = useRef(-1);
        const lastTextInputHeight = useRef(0);         // iOS-specific var used to keep track of last input height and
        // only alter rowHeight.value if difference exceeds 5 px (i.e. new line is formed by text)

        // 1.3 This boolean is used to only set rowHeight.value at explict times to prevent continuous layout changes/loops
        const [rowHeightKnown, setRowHeightKnown] = useState(false);

        // 1.3  Using AnimatedStyle for row height as access is needed to the rowHeight SV 
        //      in order to grow/shrink row height based on text input height changes
        //      -- We only activate rowHeight after the first list on the screen
        //         has been rendered to minimize first list wait time for user
        const rowHeightAnimatedStyle = useAnimatedStyle(() => ({
            height: (firstListRendered.value) ? rowHeight.value : undefined
        }));

        const timerContainerWidth = useSharedValue(0);
        const timerContainerWidthAnimatedStyle = useAnimatedStyle(() => {
            return { width: timerContainerWidth.value }
        });
        const timerOpacity = useSharedValue(0);
        const timerOpacityAnimatedStyle = useAnimatedStyle(() => {
            return { opacity: timerOpacity.value }
        });
        const textOpacity = useSharedValue(1);
        const textOpacityAnimatedStyle = useAnimatedStyle(() => {
            return { opacity: textOpacity.value }
        });

        useEffect(() => {
            //console.log("renderItem.useEffect([]) " + item.text + " rowHeight: " + rowHeight.value);

            // If we've started rendering items for the first time on this list
            // and the list is hidden, reveal it
            if (listOpacity.value == 0) {
                listOpacity.value = withTiming(1, { duration: 300 });
            }

            // If row had a height of 0 on render, assume it was just collapsed via a prior animation
            // and restore it to full height.  See special case for first reveal of list in the isFinished clause
            if (rowHeight.value == 0) {
                //console.log("Expanding row " + getIndex() + " to full height, firstListRendered.value: " + firstListRendered.value);
                rowHeight.value = withTiming(fullRowHeight.current, { duration: 300 }, (isFinished) => {
                    if (isFinished) {

                        // When users launch the app with items already in their
                        // DB, we don't want to show each item animate individually.
                        // Instead we've hid the list on launch and perform the following
                        // check to see whether we're ready to reveal the list as a whole
                        runOnJS(revealListIfLastRowRendered)();
                    }
                });
            }

            // If row had a text opacity of 0 on render, assume its text was just faded out and changed
            // to be faded in again to display its new value
            if (textOpacity.value == 0) {
                textOpacity.value = withTiming(1, { duration: 300 });
            }
        });

        const revealListIfLastRowRendered = () => {

            // Reveal the list if we've rendered the last of the 
            // user's items or the 15th item, whichever index is lesser
            // (we choose 15 because all visible items on user's list will have been rendered;
            //  we can afford janky animations the user won't be able to see)
            // 1.3 Needed to include Math.min op to "ensure" boolean was set for long lists
            if (getIndex() == Math.min(15, listArray.length - 1)) {
                console.log("Setting boolean indicating first list has been rendered");
                firstListRendered.value = true;
            }
        }

        useEffect(() => {

            // If item has a schedule but the timer container width is zero
            // ASSume the schedule was added to an existing item through enrichment
            // and thus fade in the timer
            if (item.scheduled_datetime_utc && (timerContainerWidth.value == 0)) {
                const animateTimerAppearance = async () => {
                    await new Promise<void>((resolve) => {
                        timerContainerWidth.value = withTiming(30, { duration: 300 }, (isFinished) => {
                            if (isFinished) {
                                runOnJS(resolve)();
                            }
                        })
                    });
                    await new Promise<void>((resolve) => {
                        timerOpacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
                            if (isFinished) {
                                runOnJS(resolve)();
                            }
                        })
                    });
                };
                animateTimerAppearance();
            }
        }, [item.scheduled_datetime_utc]);

        const isInitialTextMount = useRef(true);
        useEffect(() => {
            //console.log("renderItem useEFfect([item.text]) - item.text: " + item.text);
            if (isInitialTextMount.current) {
                isInitialTextMount.current = false;
            } else if ((thingName == THINGNAME_ITEM) && item.text && (item.text.length > 0) && (item.text != lastEnrichedText.current)) {
                const attemptToEnrichedItem = async (itemToEnrich) => {
                    try {
                        const enrichmentResponse = await fetchWithRetry(() => enrichItem(itemToEnrich));
                        if (enrichmentResponse && enrichmentResponse.enriched) {
                            //console.log("Enriched Item Response: " + JSON.stringify(enrichedItem));

                            lastEnrichedText.current = enrichmentResponse.text;

                            await new Promise<void>((resolve) => {
                                textOpacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
                                    if (isFinished) {
                                        runOnJS(resolve)();
                                    }
                                })
                            })

                            // Overwrite enriched data in DB and UI
                            listArraySetter((prevThings) => prevThings.map((thing) =>
                                (thing.uuid == itemToEnrich.uuid)
                                    ? {
                                        ...thing,
                                        text: enrichmentResponse.text,
                                        scheduled_datetime_utc: enrichmentResponse.scheduled_datetime_utc
                                    }
                                    : thing
                            ));

                            // 1.3 Intentionally NOT implementing the below functions in the enrichment lambda
                            //     to minimize time required to return enrichment back to client
                            const deepItemCopy = {
                                ...item,
                                text: enrichmentResponse.text,
                                scheduled_datetime_utc: enrichmentResponse.scheduled_datetime_utc
                            }
                            updateItemText(deepItemCopy);
                            updateItemSchedule(item.uuid, enrichmentResponse.scheduled_datetime_utc);

                            const eventIdToUpdate = item.event_id;
                            if (eventIdToUpdate) {
                                const updatedTimerThing = { ...selectedTimerThing.current, scheduled_datetime_utc: enrichmentResponse.scheduled_datetime_utc };
                                const updatedDate = getLocalDateObj(updatedTimerThing);
                                const alertMinutesOffset = deriveAlertMinutesOffset(updatedTimerThing);
                                //console.log("Updated alertMinutesOffset: " + alertMinutesOffset);
                                Calendar.updateEventAsync(eventIdToUpdate, {
                                    title: enrichmentResponse.text,
                                    alarms: [{ relativeOffset: alertMinutesOffset, method: Calendar.AlarmMethod.ALERT }],
                                    startDate: updatedDate,
                                    endDate: updatedDate
                                });
                                //console.log("Calendar Event Updated Asyncronously: " + eventIdToUpdate);
                            }
                        } else {
                            console.log("Enrichment response had no updates");
                        }
                    } catch (error) {
                        // Log a message to console and abandon updating UI
                        console.warn("Enrichment calls were not successful, potential issue?", error);
                    }
                }
                console.log("Calling attemptToEnrichedItem for changed text: " + item.text);
                attemptToEnrichedItem(item);
            } else if (item.text == lastEnrichedText.current) {
                console.log("Discarding enrichment call as item text equals last enrichment text: " + item.text);
            } else {
                console.log("Discarding enrichment call for blanked text");
            }
        }, [item.text])

        const handleThingTextTap = (thing) => {
            //console.log(`handleItemTextTap for ${thing.text}`);

            // Update currently tapped thing to cause
            // list to re-render and display text field for currently tapped thing
            currentlyTappedThing.current = thing;

            // Remember/baseline future handleBlur comparision with original value
            // We use a ref instead of state var to not invoke state change / re-render
            onChangeInputValue.current = thing.text;

            // Full list update needed to deactivate text field of prior field
            // 1.3 Confirmed need to refresh entire list, not just renderItem component
            listArraySetter((prevItems) => prevItems.map((prevItem) => prevItem));
        }

        const handleBlur = (thing) => {
            //console.log(`Inside handleBlur for index ${getIndex()}`);

            const textOnChange = onChangeInputValue.current;
            //console.log("textOnChange: " + textOnChange);

            // If blur after field changed to empty, assume the user wants to delete it
            if (!textOnChange || textOnChange.length == 0) {
                //console.log("Blur occurred on empty field, deleting it!");
                handleThingDelete(thing);
            } else if (textOnChange != thing.text) {
                //console.log("Text changed to: " + textOnChange);

                //// Make a deep copy of thing before editting to ensure
                //// we don't accidentally change React state and cause re-renders
                const updatedThing = JSON.parse(JSON.stringify(thing));
                updatedThing.text = textOnChange;

                if (thing.newKeyboardEntry) {
                    const latestUuidOrder = listArray.map((thing) => ({ uuid: thing.uuid }));
                    saveNewThing(updatedThing, latestUuidOrder);
                } else {
                    // Asynchronously sync new item text to DB
                    saveTextUpdateFunc(updatedThing);
                }

                amplitude.track("Thing Text Edited", {
                    anonymous_id: anonymousId.current,
                    pathname: pathname,
                    thing_uuid: thing.uuid,
                    thing_type: thingName
                });


            } else {
                console.log(`Ignoring blur as text has not changed (${textOnChange})`);
            }

            // Always treat React state as immutable!  
            // React was designed to only react to state changes of new objects/values
            // therefore use 'map' to create new object from previous
            // 1.3:  Always reset entry newKeyboardEntry state to prevent future new entry treatment
            listArraySetter((prevArray) => {

                let updatedArray = prevArray.map((prevThing) =>
                    prevThing.uuid == thing.uuid
                        ? {
                            ...prevThing,
                            text: textOnChange,
                            newKeyboardEntry: false
                        }
                        : prevThing);

                // If blur occurred on submit of a non empty item, assume
                // the user would appreciate creation of another item
                if (blurredOnSubmit.current && textOnChange && (textOnChange.length > 0) && !thing.is_done) {
                    const newItem = generateNewKeyboardEntry();

                    // Set this so new item textinput automatically appears on re-render
                    currentlyTappedThing.current = newItem;

                    // Make new keyboard entry a child of the current item IF:
                    // 1) the current item is a child itself
                    // 2) the current item is a parent with existing children
                    const hasChild = updatedArray.some((updatedThing) => updatedThing.parent_item_uuid == thing.uuid);
                    if (thing.parent_item_uuid) {
                        newItem.parent_item_uuid = thing.parent_item_uuid;
                    } else if (hasChild) {
                        newItem.parent_item_uuid = thing.uuid;
                    }

                    const thingIdx = updatedArray.findIndex((prevThing) => prevThing.uuid == thing.uuid);
                    if (thingIdx < (updatedArray.length - 1)) {
                        const insertIdx = thingIdx + 1;
                        updatedArray = [...updatedArray.slice(0, insertIdx), newItem, ...updatedArray.slice(insertIdx)]
                    } else {
                        updatedArray = [...updatedArray, newItem]
                    }
                } else {

                    // Reset currently tapped thing so no item's text input appears on re-render
                    currentlyTappedThing.current = null;
                }
                onChangeInputValue.current = null;

                // Reset blurredOnSubmit state
                blurredOnSubmit.current = false
                return updatedArray;
            });
        }

        return (
            <Reanimated.View style={[
                //{ backgroundColor: 'red' },                                           // For Debugging: If seen, unexpected row height change/non-change likely
                isActive && { opacity: 0.6 },
                { transform: [{ translateX: rowPositionX }] },
                rowHeightAnimatedStyle,                                                   // 1.3 Using AnimatedStyle for height
                firstListRendered.value && !rowHeightKnown && { position: 'absolute', opacity: 0 }                // 1.3 Opacity set to 0 until full row height determined below
            ]}
                onLayout={(event) => {

                    // 1.3 NOTE OnLayout does NOT fire when TextInput grows because we've given the containing view the fixed SharedValue height.
                    //          rowHeight.value must be explicitly reset in TextInput onContentSizeChange handler
                    /*                     console.log("Index " + getIndex() + ": onLayout fired with height: " + event.nativeEvent.layout.height +
                                            ", rowHeightKnown: " + rowHeightKnown +
                                            ", rowHeight: " + rowHeight.value +
                                            ", firstListRendered: " + firstListRendered.value); */
                    if (!rowHeightKnown) {
                        const layoutHeight = event.nativeEvent.layout.height;
                        fullRowHeight.current = layoutHeight;
                        rowHeight.value = withTiming(0, { duration: 1 }, (isFinished) => {
                            if (isFinished) {
                                runOnJS(setRowHeightKnown)(true);
                            }
                        })
                    }
                }}>
                <Swipeable
                    key={Math.random()}
                    ref={(ref) => {
                        if (ref) {
                            swipeableRefs.current[item.uuid] = ref;
                        } else {
                            delete swipeableRefs.current[item.uuid];
                        }
                    }}
                    onSwipeableOpen={(direction) => {
                        closeOtherSwipeables(item.uuid);
                        swipeableOpenFunc(direction, item, getIndex());
                    }}
                    childrenContainerStyle={styles.swipeableContainer}
                    overshootLeft={false}
                    overshootRight={false}
                    onSwipeableWillOpen={(direction) => {
                        amplitude.track(`Swipe ${direction.toUpperCase()} Actions Opened`, {
                            anonymous_id: anonymousId.current,
                            pathname: pathname,
                            thing_uuid: item.uuid,
                            thing_type: thingName
                        });
                    }}
                    renderLeftActions={(progress, dragX) => { if (renderLeftActions) { return renderLeftActions(item, getIndex()) } else { return <></> } }}
                    renderRightActions={(progress, dragX) => { if (renderRightActions) { return renderRightActions(item, handleThingDelete) } else { return <></> } }}>
                    <ScaleDecorator>
                        <View style={[listStyles.itemContainer, styles.itemContainer]}>
                            {(item.parent_item_uuid) ?
                                <View style={styles.childItemSpacer}></View>
                                : <></>
                            }
                            {(isDoneable) ?
                                <Pressable style={[styles.itemCircleOpen, item.is_done && styles.itemCircleOpen_isDone]} onPress={() => handleDoneClick(item)}></Pressable>
                                : <></>
                            }
                            {(thingName == 'tip') ?
                                <Pressable style={styles.tipListIconContainer}
                                    onPress={() => {
                                        console.log("Tapping bulb");
                                        swipeableRefs.current[item.uuid].openLeft()
                                    }}>
                                    <Image style={styles.tipListIcon} source={require("@/assets/images/light_bulb_blackyellow.png")} />
                                </Pressable> : <></>
                            }
                            <View style={listStyles.itemNameContainer}>
                                {((thingName == THINGNAME_ITEM) && item.scheduled_datetime_utc) ?
                                    <Reanimated.View style={[listStyles.timerIconContainer, timerContainerWidthAnimatedStyle]}>
                                        <Pressable hitSlop={10} onPress={() => handleTimerClick(item)}>
                                            <Reanimated.Image style={[listStyles.timerIcon, timerOpacityAnimatedStyle]} source={
                                                (isThingOverdue(item) && !item.is_done)
                                                    ? require("@/assets/images/timer_icon_FF0000.png")
                                                    : require("@/assets/images/timer_icon_556B2F.png")
                                            } />
                                        </Pressable>
                                    </Reanimated.View>
                                    : <></>}
                                {(currentlyTappedThing.current && (currentlyTappedThing.current.uuid == item.uuid)) ?
                                    <TextInput
                                        ref={textInputRef}
                                        blurOnSubmit={true}
                                        multiline={true}
                                        style={listStyles.itemTextInput}
                                        defaultValue={item.text}
                                        autoFocus={true}
                                        onContentSizeChange={(event) => {
                                            const newHeight = event.nativeEvent.contentSize.height;
                                            if (Platform.OS === 'android' || Math.abs(lastTextInputHeight.current - newHeight) > 5) {
                                                rowHeight.value = withTiming(calculateTextInputRowHeight(newHeight), { duration: 150 });
                                                lastTextInputHeight.current = newHeight;
                                            }
                                        }}
                                        onKeyPress={({ nativeEvent }) => {
                                            if (nativeEvent.key == 'Backspace' && (!onChangeInputValue.current || onChangeInputValue.current.length == 0)) {
                                                handleBlur(item);   // As of 1.3, this should delete the row
                                            }
                                        }}
                                        onSubmitEditing={(event) => {
                                            blurredOnSubmit.current = true;
                                            onChangeInputValue.current = event.nativeEvent.text;
                                        }}
                                        onChangeText={(text) => {
                                            onChangeInputValue.current = text;
                                        }}
                                        contextMenuHidden={true}
                                        onBlur={() => handleBlur(item)}
                                    />
                                    : (
                                        (isThingPressable(item)) ?
                                            <Pressable
                                                style={listStyles.itemNamePressable}
                                                onLongPress={drag}
                                                disabled={isActive}
                                                onPress={() => handleThingTextTap(item)}>
                                                <Reanimated.Text style={[textOpacityAnimatedStyle, listStyles.taskTitle, item.is_done && listStyles.taskTitle_isDone]}>{item.text}</Reanimated.Text>
                                            </Pressable>
                                            : <View style={styles.tipNamePressable}>
                                                <Text style={[listStyles.taskTitle]}>{item.text}</Text>
                                            </View>
                                    )}
                                <ListThingSidebar thing={item} styles={styles} />
                            </View>
                        </View>
                    </ScaleDecorator>
                </Swipeable>
            </Reanimated.View>
        );
    }

    const pickerSelectStyles = StyleSheet.create({
        inputIOS: {
            fontSize: 14,
            paddingVertical: 12,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: 'gray',
            borderRadius: 4,
            color: 'black',
            textAlign: 'center',
            marginLeft: 20,
            marginRight: 20,
            marginBottom: 20,
            backgroundColor: 'white'
        },
        inputAndroid: {
            fontSize: 14,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderWidth: 0.5,
            borderColor: 'purple',
            borderRadius: 8,
            color: 'black',
            paddingRight: 30, // to ensure the text is never behind the icon
        }
    });

    const formStyles = StyleSheet.create({
        formValidationMessage: {
            color: 'red',
            paddingBottom: 20,
            paddingLeft: (Platform.OS == 'android') ? 10 : 0,
            textAlign: (Platform.OS == 'ios') ? 'center' : 'left'
        },
        scheduleEditDialogDateLink: {
            textAlign: 'right',
            fontWeight: 'bold',
            color: (Platform.OS == 'ios') ? '#007ff9' : '#169689'
        },
        dateTimeContainer: {
            padding: 10,
            flexDirection: 'row',
            justifyContent: 'space-between'
        },
        dateTimeTextContainer: {
            justifyContent: 'center'
        },
        dateTimeText: {
            fontSize: 16
        },
        dateTimeEditLinkContainer: {
            paddingRight: 60,
            justifyContent: 'center'
        },
        dateTimePickerContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            paddingBottom: 20
        },
        dateTimePicker: {
            // borderWidth: 1,
            // borderColor: 'black',
            paddingLeft: 0,
            position: 'relative',
            left: -3    // Accounts for padding left of date field that won't remove with paddingLeft: 0
        }
    });

    return (
        <TouchableWithoutFeedback onPress={() => {
            if (currentlyTappedThing != null) {
                if (Keyboard.isVisible()) {
                    Keyboard.dismiss();
                }
                //handleBlur(currentlyTappedThing);
            }
        }} >
            <View style={[listStyles.listContainer, styles.listContainer]}>
                {(!screenInitialized) ?
                    <Reanimated.View style={[listStyles.initialLoadAnimContainer, { opacity: initialLoadFadeInOpacity }]}>
                        <Text style={listStyles.initialLoadMsg}>{loadingAnimMsg}</Text>
                        <ActivityIndicator size={"large"} color="#3E3723" />
                    </Reanimated.View>
                    : (listArray && (listArray.length > 0) && listArray.filter(item => !item.is_deleted)!.length > 0) ?
                        <Reanimated.View style={[listStyles.taskContainer, { opacity: listOpacity }]}>
                            <DraggableFlatList
                                data={listArray.filter(item => !item.is_deleted)}
                                onDragEnd={({ data, from, to }) => {
                                    if (from != to) {
                                        handleThingDrag(data, from, to, data[to]);
                                    }
                                }}
                                nestedScrollEnabled={true}
                                keyExtractor={(item, index) => item.uuid}
                                ListHeaderComponent={<View style={{ height: 0 }} />}
                                refreshControl={
                                    <RefreshControl
                                        tintColor="#3E3723"
                                        onRefresh={() => {
                                            setRefreshing(true);
                                            resetListWithFirstPageLoad(true);
                                        }}
                                        refreshing={isRefreshing} />
                                }
                                renderItem={renderThing}

                                // 1.2 Pagination deactivated, see note at start of file
                                // onEndReached={({ distanceFromEnd }) => {
                                //     //console.log("onEndReached called, distance from end: " + distanceFromEnd);
                                //     if (distanceFromEnd > 0) {
                                //         loadNextPage();
                                //     }
                                // }}
                                // onEndReachedThreshold={0.1}

                                ListFooterComponent={
                                    <View style={{ paddingTop: 10 }}>
                                        {/* {isPageLoading.current && <ActivityIndicator size={"small"} color="#3E3723" />} */}
                                        <View style={{ height: 50 }} />
                                    </View>}
                            />
                        </Reanimated.View>
                        : <EmptyThingUX />
                }
                <DootooFooter hideRecordButton={hideRecordButton} transcribeFunction={transcribeAudioToThings} listArray={listArray} listArraySetterFunc={listArraySetter} saveAllThingsFunc={saveAllThings} />
                <Dialog.Container visible={showCalendarSelectionDialog} onBackdropPress={handleCalendarSelectDialogCancel}>
                    <Dialog.Title>Select Calendar</Dialog.Title>
                    <Dialog.Description>Which calendar to put this item?</Dialog.Description>
                    <RNPickerSelect
                        value={calendarSelectionInputValue}
                        onValueChange={(value) => {
                            setCalendarSelectionInputValue(value);
                            if (value != 'no_calendar') {
                                setCalendarSelectionInvalid(false);
                            }
                        }}
                        placeholder={{ label: 'Select a calendar', value: 'no_calendar' }}
                        style={pickerSelectStyles}
                        items={editableCalendars.current.map((calendar) => ({ label: calendar.title, value: calendar.id }))} />
                    {(calendarSelectionInvalid)
                        ? <Text style={formStyles.formValidationMessage}>Please select a calendar.</Text>
                        : <></>}
                    <Dialog.Button label="Cancel" onPress={handleCalendarSelectDialogCancel} />
                    <Dialog.Button label="Continue" onPress={handleCalendarSelectDialogSubmission} />
                </Dialog.Container>
                <Dialog.Container visible={showScheduleEditDialog} onBackdropPress={handleScheduleEditDialogCancel}>
                    <Dialog.Title>Edit Scheduled Date & Time</Dialog.Title>
                    {(Platform.OS == 'android')
                        ?
                        <View style={formStyles.dateTimeContainer}>
                            <View style={formStyles.dateTimeTextContainer}>
                                <Text onPress={handleScheduleEditDialogEditDateClick} style={formStyles.dateTimeText}>{extractDateInLocalTZ(scheduleEditDialogDate)}</Text>
                            </View>
                            <View style={formStyles.dateTimeTextContainer}>
                                <Text onPress={handleScheduleEditDialogEditTimeClick} style={formStyles.dateTimeText}>{extractTimeInLocalTZ(scheduleEditDialogDate)}</Text>
                            </View>
                        </View>
                        : <View style={formStyles.dateTimePickerContainer}>
                            <RNDateTimePicker style={formStyles.dateTimePicker} mode="datetime" value={scheduleEditDialogDate} onChange={(event, date) => setScheduleEditDialogDate(date)} />
                        </View>
                    }
                    <Dialog.Button label="Cancel" onPress={handleScheduleEditDialogCancel} />
                    <Dialog.Button label="Clear" onPress={handleScheduleEditDialogClear} />
                    <Dialog.Button label="Submit" onPress={handleScheduleEditDialogSubmission} />
                </Dialog.Container>
            </View>
        </TouchableWithoutFeedback>
    );

};

// Used by Tips screen as well
export const listStyles = StyleSheet.create({
    initialLoadAnimContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    listContainer: {
        flex: 1
    },
    taskContainer: {
        flex: 1
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 5
    },
    itemNameContainer: {
        marginLeft: 15,                 // Tips had marginLeft 17 - necessary?
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
        paddingRight: 10,
        flex: 1,
        //paddingRight: 25              // Tips had this, necessary?
        //backgroundColor: 'red'    
    },
    taskTitle: {
        fontSize: 16,
        textAlign: 'left',
        paddingRight: 5,
        paddingTop: 3,                  // 1.3 DO NOT ADJUST TaskTitle padding Top/Bottom without accounting for row height affect
        paddingBottom: 2                //     when items lose focus!!!!                         
        //backgroundColor: 'blue',    
    },
    taskTitle_isDone: {
        color: '#556B2F',
        textDecorationLine: 'line-through'
    },
    initialLoadMsg: {
        fontSize: 20,
        paddingBottom: 15
    },
    itemSwipeAction: {
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        backgroundColor: '#FAF3E0'
    },
    swipeActionIcon: {
        height: 25,
        width: 25
    },
    timerIconContainer: {
        justifyContent: 'center',
        paddingRight: 10
    },
    timerIcon: {
        height: 16,
        width: 16
    },
})

export default DootooList;
