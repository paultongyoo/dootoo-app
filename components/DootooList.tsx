import { View, Text, ActivityIndicator, Pressable, TextInput, Image, Keyboard, Animated, Easing, TouchableWithoutFeedback, AppState, StyleSheet, Platform, Alert } from 'react-native';
import { useState, useRef, useContext, useEffect, useMemo, memo } from 'react';
import DraggableFlatList, { ScaleDecorator } from '@bwjohns4/react-native-draggable-flatlist';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { AppContext } from './AppContext';
import DootooFooter from './DootooFooter';
import Toast from 'react-native-toast-message';
import { RefreshControl } from 'react-native-gesture-handler';
import * as amplitude from '@amplitude/analytics-react-native';
import { usePathname } from 'expo-router';
import { LIST_ITEM_EVENT__POLL_ITEM_COUNTS_RESPONSE, LIST_ITEM_EVENT__UPDATE_COUNTS, ListItemEventEmitter, ProfileCountEventEmitter } from './EventEmitters';
import { loadItemsCounts, updateItemHierarchy, updateItemsCache, updateItemSchedule, updateTipsCache } from './Storage';
import usePolling from './Polling';
import * as Calendar from 'expo-calendar';
import Dialog from "react-native-dialog";
import RNPickerSelect from 'react-native-picker-select';
import * as Linking from 'expo-linking';
import { extractDateInLocalTZ, extractTimeInLocalTZ, isThingOverdue } from './Helpers';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

const DootooList = ({ thingName = 'item', loadingAnimMsg = null, listArray, listArraySetter, ListThingSidebar, EmptyThingUX, styles,
    renderLeftActions = (item, index) => { return <></> },
    renderRightActions = (item, index) => { return <></> },
    isDoneable = true,
    handleDoneClick = (thing) => { return; },
    saveAllThings, saveTextUpdateFunc, saveThingOrderFunc, loadAllThings,
    transcribeAudioToThings,
    isThingPressable,
    isThingDraggable,
    hideRecordButton = false,
    shouldInitialLoad = true }) => {

    const pathname = usePathname();
    const { anonymousId, lastRecordedCount, initializeLocalUser,
        fadeInListOnRender, listOpacity, listFadeInAnimation, listFadeOutAnimation,
        thingRowPositionXs, thingRowHeights, swipeableRefs, itemCountsMap, selectedItem
    } = useContext(AppContext);
    const [screenInitialized, setScreenInitialized] = useState(false);
    const [errorMsg, setErrorMsg] = useState();
    const [isRefreshing, setRefreshing] = useState(false);
    const [showCalendarSelectionDialog, setShowCalendarSelectionDialog] = useState(false);
    const [calendarSelectionInvalid, setCalendarSelectionInvalid] = useState(false);
    const [calendarSelectionInputValue, setCalendarSelectionInputValue] = useState('no_calendar');
    const [showScheduleEditDialog, setShowScheduleEditDialog] = useState(false);
    const [scheduleEditDialogDate, setScheduleEditDialogDate] = useState(new Date());

    // References:  Changing these should intentionally NOT cause this list to re-render
    //const itemFlatList = useRef(null);              // TODO: Consider deprecate
    const isInitialMount = useRef(true);
    const onChangeInputValue = useRef('');
    const isPageLoading = useRef(false);
    const hasMoreThings = useRef(true);
    const initialLoad = useRef(true);
    const editableCalendars = useRef<Calendar.Calendar[]>([]);
    const selectedCalendar = useRef();
    const selectedTimerThing = useRef(null);

    // State Variables:  Changing these should intentionally cause this list to re-render
    const [currentlyTappedThing, setCurrentlyTappedThing] = useState();

    const initialLoadFadeInOpacity = useRef(new Animated.Value(0)).current;
    const initialLoadFadeInAnimation = Animated.timing(initialLoadFadeInOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
    });

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
    */

    // 1.2 Page state var will remain and stay at its value of (1)
    const [page, setPage] = useState(1);

    useEffect(() => {
        //console.log(`DootooList.useEffect([]) ${Date.now()}`);
        initializeLocalUser((isNew: boolean) => {
            //console.log("initializeLocalUser callback method");
            if (shouldInitialLoad) {
                if (!isNew) {
                    initialLoad.current = false;
                    initialLoadFadeInAnimation.start();

                    resetListWithFirstPageLoad();
                } else {
                    //console.log("Skipping loading things for user as they are brand new.");
                }
            } else {
                //console.log("Skipping initial load for user per shouldInitialLoad == false.");
            }
            setScreenInitialized(true);
        });

        return () => {
            console.log("DootooList.useEffect([]) component unmounted " + new Date(Date.now()).toLocaleString());
        }
    }, []);

    useEffect(() => {
        //console.log(`useEffect[listArray] called: List length ${listArray.length}, initialLoad: ${initialLoad.current}`);
        //console.log(`useEffect[listArray]: current contents: ${JSON.stringify(listArray)}`); 

        if (initialLoad.current && !isInitialMount.current) {

            // Asyncronously update local cache with latest listArray update
            if (thingName == 'item') {
                updateItemsCache(listArray);
            } else {
                updateTipsCache(selectedItem, listArray);
            }

            if (fadeInListOnRender.current) {
                listFadeInAnimation.start(() => {
                    fadeInListOnRender.current = false;
                });
            }

            if (lastRecordedCount.current > 0) {
                // If we're inside here, we were called after recording new things

                if (thingName == 'tip') {
                    ProfileCountEventEmitter.emit('incr_tips', { count: lastRecordedCount.current });
                }

                // Display Toast
                Toast.show({
                    type: 'undoableToast',
                    text1: `Added ${lastRecordedCount.current} ${thingName}${(lastRecordedCount.current > 1) ? 's' : ''}.`,
                    position: 'bottom',
                    bottomOffset: 220,
                    props: {
                        onUndoPress: () => {

                            // TODO: This doesn't delete in DB, check if there's a bug?
                            listArraySetter((prevItems) => prevItems.slice(lastRecordedCount.current)); // This should update UI only and not invoke any syncronous backend operations            
                        }
                    }
                });
                lastRecordedCount.current = 0;
            } else {

                // This call has to be in this "main UI thread" in order to work
                Toast.hide();
            }

            // Immediately look for new counts on any list update
            restartPolling();
        } else if (isInitialMount.current) {

            console.log("Bypassing useEffect(listArray) logic on initial mount");
            isInitialMount.current = false;
        }
    }, [listArray]);

    const pollThingCounts = async () => {
        let ignore = false;
        if (!ignore) {
            ignore = true;
            console.log(`Polling for ${thingName} latest counts: ${new Date(Date.now()).toLocaleString()}`);
            if (listArray.length > 0) {
                if (thingName == "item") {
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

        const things = loadResponse.things || [];
        const hasMore = loadResponse.hasMore;

        // Immediately update hasMore state to prevent future backend calls if hasMore == false
        hasMoreThings.current = hasMore;

        initialLoad.current = true;
        isPageLoading.current = false;
        initialLoadFadeInAnimation.reset();
        setRefreshing(false);

        // If we're loading the first page, assume we want to reset the displays list to only the first page
        // (e.g. on a pull-down-to-refresh action).  If page > 1, assume we want to append the page to what's currently
        // displayed.
        if (page == 1) {
            //console.log(`(Re)setting displayed list to page 1, containing ${things.length} ${thingName}(s).`)

            if (isPullDown) {
                //console.log("Loading page 1 as part of pulldown refresh, attempting to fade out current list before fading in new list");
                fadeInListOnRender.current = true;
                listFadeOutAnimation.start(() => {
                    listArraySetter([...things]);
                });
            } else {
                fadeInListOnRender.current = true;

                //console.log("Loading page 1 outside of pulldown refresh, simply fading in list");
                listArraySetter([...things]);
            }
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
        selectedTimerThing.current = thing;
        setScheduleEditDialogDate(new Date(thing.scheduled_datetime_utc));
        setShowScheduleEditDialog(true);
    }

    const handleScheduleEditDialogCancel = () => {
        setShowScheduleEditDialog(false);
    }

    const handleScheduleEditDialogSubmission = () => {
        if (!selectedTimerThing.current) {
            console.log("selectedTimerThing.current unexpectedly null on edit submit, exiting!!");
            return;
        }

        const thingToUpdateUUID = selectedTimerThing.current.uuid;
        const newScheduledDateTimeUTCStr = scheduleEditDialogDate.toISOString();

        console.log("Updated schedule date time UTC String: " + newScheduledDateTimeUTCStr);

        listArraySetter((prevList) => prevList.map((thing) =>
            (thing.uuid == thingToUpdateUUID) 
                ? { ...thing, 
                    scheduled_datetime_utc: newScheduledDateTimeUTCStr
                  }
                : thing));

        updateItemSchedule(thingToUpdateUUID, newScheduledDateTimeUTCStr) ;  
        setShowScheduleEditDialog(false);
    }

    const handleScheduleEditDialogEditDateClick = () => {
        if (Platform.OS == 'android') {
            DateTimePickerAndroid.open({
                mode: 'date',
                value: scheduleEditDialogDate,
                onChange: (event, date) => setScheduleEditDialogDate(date)
            })
        } else {
            Alert.alert("Implement me differently on iOS!");
        }
    }

    const handleScheduleEditDialogEditTimeClick = () => {
        if (Platform.OS == 'android') {
            DateTimePickerAndroid.open({
                mode: 'time',
                value: scheduleEditDialogDate,
                onChange: (event, date) => setScheduleEditDialogDate(date)
            })
        } else {
            Alert.alert("Implement me differently on iOS!");
        }
    }


    const handleTimerToastCalendarClick = async (thing) => {
        console.log("handleTimerToastCalendarClick called");
        selectedTimerThing.current = thing;

        const permissionsResponse = await Calendar.requestCalendarPermissionsAsync();
        if (permissionsResponse.status === 'granted') {
            const readCalendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
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
                    "Please confirm you can access an existing calendar on this device via your calendar app.",
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
            Alert.alert(
                "Calendar Permissions Required",
                "Please grant dootoo permission to access your calendar via app settings.",
                [
                    {
                        text: 'Cancel',
                        onPress: () => {
                            amplitude.track("Calendar Permissions Required Prompt Dimissed", {
                                anonymous_id: anonymousId.current,
                                pathname: pathname
                            });
                        },
                        style: 'cancel'
                    },
                    {
                        text: 'Go to Settings',
                        onPress: () => {
                            amplitude.track("Calendar Permissions Required Prompt: Go to Settings Pressed", {
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
        setShowCalendarSelectionDialog(false);
        setCalendarSelectionInvalid(false);
        setCalendarSelectionInputValue('no_calendar');
    }

    const handleCalendarSelectDialogSubmission = async () => {
        console.log("Inside handleCalendarSelectDialogSubmission");
        if (calendarSelectionInputValue == 'no_calendar') {
            setCalendarSelectionInvalid(true);
        } else {
            setCalendarSelectionInvalid(false);
            setShowCalendarSelectionDialog(false);
            const selectedCalendarId = calendarSelectionInputValue;
            const calIdx = editableCalendars.current.findIndex((calendar) => calendar.id == selectedCalendarId);
            selectedCalendar.current = editableCalendars.current[calIdx];
            const eventId = await createCalendarEvent();
            if (eventId) {
                console.log("Created new calendar event after manual calendar selection: " + eventId);
                Alert.alert("Calendar Event Created",
                    `New calendar event created named '${selectedTimerThing.current.text}' in your '${selectedCalendar.current.title}' calendar.`
                );
            } else {
                Alert.alert("Unexpected Error Occurred",
                    `An unexpected error occurred trying to create a new calendar event.  We've logged this issue and will fix it as soon as possible.`
                );
            }
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
        const eventTitle = (selectedTimerThing.current) ? selectedTimerThing.current.text : 'New Dootoo Item'; // Later case should not happen
        const eventId = await Calendar.createEventAsync(calendarId, {
            title: eventTitle,
            alarms: [{ relativeOffset: -60, method: Calendar.AlarmMethod.ALERT }],
            startDate: new Date(),
            endDate: new Date(),
            allDay: false,
            availability: Calendar.Availability.BUSY,
            location: '',
            notes: 'Event created by dootoo',
            recurrenceRule: null,   // assume one time event
            status: Calendar.EventStatus.CONFIRMED,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        return eventId;
    }

    const renderThing = ({ item, getIndex, drag, isActive }) => {
        const rowPositionX = useRef(new Animated.Value(0)).current;
        thingRowPositionXs.current[item.uuid] = rowPositionX;
        const [allowHeightOverride, setAllowHeightOverride] = useState(true);
        const [rowHeightKnown, setRowHeightKnown] = useState(false);
        const fullRowHeight = useRef(-1);                                    // Placeholder set in onLayout handler
        const rowHeight = useRef(new Animated.Value(1)).current;   // Set once onLayout event fires for Animated.View
        thingRowHeights.current[item.uuid] = rowHeight;

        // useEffect(() => {

        //     TODO:  Move these events somewhere else as render is firing more times than just once
        //     if (thingName == 'tip') {
        //         amplitude.track("Tip Viewed", {
        //             anonymousId: anonymousId.current,
        //             pathname: pathname,
        //             tip_uuid: item.uuid,
        //             tip_score: item.upvote_count
        //         });
        //     } else if (item.text && item.text == "(flagged)") {
        //         amplitude.track("Flagged Thing Rendered", {
        //             anonymousId: anonymousId.current,
        //             pathname: pathname,
        //             thing_uuid: item.uuid,
        //             thing_type: thingName
        //         });
        //     } 
        // }, [item]);

        // useEffect(() => {
        //     console.log("Row rendering: " + item.text);
        // })

        useEffect(() => {
            //console.log("renderThing useEffect([listArray]) for thing: " + item.text);
            //console.log("thingRowHeights: " + JSON.stringify(thingRowHeights));
            if (item.shouldAnimateIntoView) {
                //console.log("Inside shouldAnimateIntoView for index " + getIndex());
                Animated.timing(rowHeight, {
                    toValue: fullRowHeight.current,
                    duration: 300,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: false
                }).start();
            }
        }, [listArray]);

        const handleThingTextTap = (thing) => {
            //console.log(`handleItemTextTap for ${JSON.stringify(thing)}`);

            // Disable the fixed height override to allow the item height
            // to grow or shrink with the text field.  We'll re-enable the
            // override and reset the fixed height setting in handleBlur
            setAllowHeightOverride(false);

            // Update currently tapped thing to cause
            // list to re-render and display text field for currently tapped thing
            setCurrentlyTappedThing(thing);

            // Remember/baseline future handleBlur comparision with original value
            // We use a ref instead of state var to not invoke state change / re-render
            onChangeInputValue.current = thing.text;
        }

        const handleBlur = (item) => {
            //console.log(`Inside handleBlur for item ${item.text}`);

            const textOnChange = onChangeInputValue.current;
            if (textOnChange != item.text) {
                //console.log("Text changed to: " + textOnChange);

                // Asynchronously sync new item text to DB
                //// Make a deep copy of item before editting to ensure
                //// we don't accidentally change React state and cause re-renders
                const deepItem = JSON.parse(JSON.stringify(item));
                deepItem.text = textOnChange;
                saveTextUpdateFunc(deepItem);

                // Update v1.1.1:  Commented out counts_updating as item counts refresh on any update
                //updatedTasks![index].counts_updating = true;    // Set this in case new text results in new counts

                // Always treat React state as immutable!  
                // React was designed to only react to state changes of new objects/values
                // therefore use 'map' to create new object from previous
                listArraySetter((prevArray) => prevArray.map((thing) =>
                    thing.uuid == item.uuid
                        ? { ...thing, text: textOnChange }
                        : thing));

                amplitude.track("Thing Text Edited", {
                    anonymous_id: anonymousId.current,
                    pathname: pathname,
                    thing_uuid: item.uuid,
                    thing_type: thingName
                });
            } else {
                //console.log(`Ignoring blur as text has not changed (${textOnChange})`);
            }

            // Renable the height override + reset known row height
            setAllowHeightOverride(true);
            setRowHeightKnown(false);

            // Clear currently tapped thing re-renders list and causes thing to display as pressable again
            setCurrentlyTappedThing(null);
        }

        return (
            <Animated.View style={[
                { transform: [{ translateX: rowPositionX }] },
                allowHeightOverride && rowHeightKnown && { height: rowHeight }]}
                onLayout={(event) => {
                    if (!rowHeightKnown && allowHeightOverride) {
                        //console.log(`Resetting row height for row ${getIndex()} ${Date.now()}`);
                        fullRowHeight.current = event.nativeEvent.layout.height;
                        rowHeight.setValue(fullRowHeight.current);
                        setRowHeightKnown(true);
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
                    onSwipeableOpen={() => closeOtherSwipeables(item.uuid)}
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
                    renderRightActions={(progress, dragX) => { if (renderRightActions) { return renderRightActions(item, getIndex()) } else { return <></> } }}>
                    <ScaleDecorator>
                        <View style={[styles.itemContainer, (getIndex() == 0) && styles.itemContainer_firstItem]}>
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
                            <View style={styles.itemNameContainer}>
                                {((thingName == 'item') && item.scheduled_datetime_utc) ?
                                    <Pressable hitSlop={10} style={styles.timerIconContainer}
                                        onPress={() => handleTimerClick(item)}>
                                        <Image style={styles.timerIcon} source={
                                            (isThingOverdue(item))
                                                ? require("@/assets/images/timer_icon_FF0000.png")
                                                : require("@/assets/images/timer_icon_556B2F.png")
                                        } />
                                    </Pressable>
                                    : <></>}
                                {(currentlyTappedThing?.uuid == item.uuid) ?
                                    <TextInput
                                        blurOnSubmit={true}
                                        multiline={true}
                                        style={styles.itemTextInput}
                                        defaultValue={item.text}
                                        autoFocus={true}
                                        onChangeText={(text) => {
                                            onChangeInputValue.current = text;
                                        }}
                                        onBlur={() => handleBlur(item)} />
                                    :
                                    (isThingPressable(item)) ?
                                        <Pressable
                                            style={styles.itemNamePressable}
                                            onLongPress={drag}
                                            disabled={isActive}
                                            onPress={() => handleThingTextTap(item)}>
                                            <Text style={[styles.taskTitle, item.is_done && styles.taskTitle_isDone]}>{item.text}</Text>
                                        </Pressable>
                                        : <View style={styles.tipNamePressable}>
                                            <Text style={[styles.taskTitle]}>{item.text}</Text>
                                        </View>
                                }
                                <ListThingSidebar thing={item} styles={styles} />
                            </View>
                        </View>
                    </ScaleDecorator>
                </Swipeable>
            </Animated.View>
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
            color: (Platform.OS == 'ios') ? '#007ff9' :'#169689'
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
            <View style={styles.listContainer}>
                {(initialLoad.current == false) ?
                    <Animated.View style={[styles.initialLoadAnimContainer, { opacity: initialLoadFadeInOpacity }]}>
                        <Text style={styles.initialLoadMsg}>{loadingAnimMsg}</Text>
                        <ActivityIndicator size={"large"} color="#3E3723" />
                    </Animated.View>
                    :
                    <Animated.View style={[styles.taskContainer, fadeInListOnRender.current && { opacity: listOpacity }]}>
                        {listArray && (listArray.length > 0) && listArray.filter(item => !item.is_deleted)!.length > 0 ?
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
                                        {isPageLoading.current && <ActivityIndicator size={"small"} color="#3E3723" />}
                                        <View style={{ height: 50 }} />
                                    </View>}
                            /> : (initialLoad.current == true) ? <EmptyThingUX styles={styles} /> : <></>
                        }
                        {(errorMsg) ?
                            <View style={styles.errorTextContainer}>
                                <Text style={styles.errorText}>{JSON.stringify(errorMsg)}</Text>
                            </View>
                            : <View style={styles.errorTextContainer}>
                                <Text style={styles.errorText}>{JSON.stringify(errorMsg)}</Text>
                            </View>}
                    </Animated.View>
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
                    <View style={formStyles.dateTimeContainer}>
                        <View style={formStyles.dateTimeTextContainer}>
                            <Text onPress={handleScheduleEditDialogEditDateClick} style={formStyles.dateTimeText}>{extractDateInLocalTZ(scheduleEditDialogDate)}</Text>
                        </View>
                        <View style={formStyles.dateTimeTextContainer}>
                            <Text onPress={handleScheduleEditDialogEditTimeClick} style={formStyles.dateTimeText}>{extractTimeInLocalTZ(scheduleEditDialogDate)}</Text>
                        </View>
                    </View>
                    <Dialog.Button label="Cancel" onPress={handleScheduleEditDialogCancel} />
                    <Dialog.Button label="Submit" onPress={handleScheduleEditDialogSubmission} />
                </Dialog.Container>
            </View>
        </TouchableWithoutFeedback>
    );

};

export default DootooList;
