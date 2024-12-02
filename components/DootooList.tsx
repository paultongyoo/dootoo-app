import { View, Text, ActivityIndicator, Pressable, TextInput, Image, Keyboard, Animated, Easing, TouchableWithoutFeedback } from 'react-native';
import { useState, useRef, useContext, useEffect, useMemo, memo } from 'react';
import DraggableFlatList, { ScaleDecorator } from '@bwjohns4/react-native-draggable-flatlist';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { AppContext } from './AppContext';
import DootooFooter from './DootooFooter';
import Toast from 'react-native-toast-message';
import { RefreshControl } from 'react-native-gesture-handler';
import * as amplitude from '@amplitude/analytics-react-native';
import { usePathname } from 'expo-router';
import { ProfileCountEventEmitter } from './EventEmitters';

const DootooList = ({ thingName = 'item', loadingAnimMsg = null, listArray, listArraySetter, ListThingSidebar, EmptyThingUX, styles,
    renderLeftActions = (item, index) => { return <></> },
    renderRightActions = (item, index) => { return <></> },
    isDoneable = true, handleDoneClick = (index) => { return; },
    saveAllThings, saveTextUpdateFunc, saveThingOrderFunc, loadAllThings,
    transcribeAudioToThings,
    isThingPressable,
    isThingDraggable,
    hideRecordButton = false,
    shouldInitialLoad = true }) => {

    const pathname = usePathname();
    const { anonymousId, lastRecordedCount, initializeLocalUser,
        fadeInListOnRender, listOpacity, listFadeInAnimation, listFadeOutAnimation,
        thingRowPositionXs, thingRowHeights, swipeableRefs
    } = useContext(AppContext);
    const [screenInitialized, setScreenInitialized] = useState(false);
    const [errorMsg, setErrorMsg] = useState();
    const [isRefreshing, setRefreshing] = useState(false);

    // References:  Changing these should intentionally NOT cause this list to re-render
    //const itemFlatList = useRef(null);              // TODO: Consider deprecate
    const onChangeInputValue = useRef('');
    const isPageLoading = useRef(false);
    const hasMoreThings = useRef(true);
    const initialLoad = useRef(true);

    // State Variables:  Changing these should intentionally cause this list to re-render
    const [currentlyTappedThing, setCurrentlyTappedThing] = useState();
    const [page, setPage] = useState(1);

    const initialLoadFadeInOpacity = useRef(new Animated.Value(0)).current;
    const initialLoadFadeInAnimation = Animated.timing(initialLoadFadeInOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
    });

    useEffect(() => {
        //console.log(`useEffect([]) ${Date.now()}`);
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
    }, []);

    useEffect(() => {
        //console.log(`useEffect[listArray] called`);
        //console.log(`useEffect[listArray]: current contents: ${JSON.stringify(listArray)}`);

        if (initialLoad.current) {

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
                            listArraySetter((prevItems) => prevItems.slice(lastRecordedCount.current)); // This should update UI only and not invoke any syncronous backend operations
                        }
                    }
                });
                lastRecordedCount.current = 0;
            } else {

                // This call has to be in this "main UI thread" in order to work
                Toast.hide();
            }

        } else {
            //console.log("UseEffect called before initial load completed, skipping..");
        }
    }, [listArray]);

    const resetListWithFirstPageLoad = async (isPullDown = false) => {
        if (page == 1) {
            // If current page is already 1, manually invoke LoadThingsForCurrentPage 
            // as useEffect(page) won't be called
            loadThingsForCurrentPage(isPullDown);
        } else {
            //console.log("Setting page var to 1 to trigger loadThingsForCurrentPage().")
            setPage(1);
        }
    };

    const loadNextPage = () => {
        //console.log("loadNextPage called");
        if (hasMoreThings.current) {
            if (!isRefreshing && !isPageLoading) {
                //console.log(`List end reached, incrementing current page var (currently ${page}).`);
                isPageLoading.current = true;
                setPage((prevPage) => prevPage + 1);
            } else {
                //console.log(`Ignoring pull down action as page ${page} currently loading or full list is refreshing.`);
            }
        } else {
            //console.log(`Ignoring onEndReach call as user doesn't have more ${thingName} to return`);
        }
    };

    useEffect(() => {
        //console.log("useEffect(page) called for pathname " + Date.now());
        if (screenInitialized) {
            loadThingsForCurrentPage();
        } else {
            //("Not calling loadThingsForCurrentPage in useEffect(page) as it was called during first useEffect([]) call.");
        }
    }, [page]);

    const loadThingsForCurrentPage = async (isPullDown = false) => {
        //console.log(`Calling loadAllThings(page) with page = ${page}.`);
        const loadResponse = await loadAllThings(page);
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

    function handleThingDrag(newData: unknown[], draggedThing) {

        if (isThingDraggable) {
            const parentChildOrderedData = [];
            const childrenToAnimate = [];
            newData.forEach((thing) => {
                if (!thing.parent_item_uuid) {
                    parentChildOrderedData.push(thing);
                    const children = newData.filter((child) => child.parent_item_uuid == thing.uuid);
                    if (children.length > 0) {
                        parentChildOrderedData.push(...children);
                        children.forEach((child) => {
                            if (child.parent_item_uuid == draggedThing.uuid) {
                                child.shouldAnimateIntoView = true
                                childrenToAnimate.push(child);
                            }                          
                        });                                        
                    }
                }
            });

            const heightAnimationArray = []
            childrenToAnimate.forEach((child) => {
                heightAnimationArray.push(
                    Animated.timing(thingRowHeights.current[child.uuid], {
                        toValue: 0,
                        duration: 300,
                        easing: Easing.in(Easing.quad),
                        useNativeDriver: false
                    })
                );
            });
            Animated.parallel(heightAnimationArray).start(() => {

                // This should update UI only and not invoke any synchronous backend operations
                // We use ... spread operate to guarantee we're treating previous data as immutable
                listArraySetter([...parentChildOrderedData]);

                // Asynchronously save all items to DB as rank_idxes will have changed
                //saveAllThings(newData);
                const uuidArray = parentChildOrderedData.map((thing) => ({ uuid: thing.uuid }));
                saveThingOrderFunc(uuidArray);
            });
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
                                //ref={itemFlatList}  TODO: Deprecate
                                data={listArray.filter(item => !item.is_deleted)}
                                onDragEnd={({ data, from, to }) => {
                                    amplitude.track("List Item Dragged", {
                                        anonymous_id: anonymousId.current,
                                        pathname: pathname,
                                        from: from,
                                        to: to
                                    });
                                    if (from != to) {
                                        handleThingDrag(data, data[to]);
                                    }
                                }}
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
                                onEndReached={({ distanceFromEnd }) => {
                                    //console.log("onEndReached called, distance from end: " + distanceFromEnd);
                                    if (distanceFromEnd > 0) {
                                        loadNextPage();
                                    }
                                }}
                                onEndReachedThreshold={0.1}
                                ListFooterComponent={
                                    <View style={{ paddingTop: 20 }}>
                                        {isPageLoading.current && <ActivityIndicator size={"small"} color="#3E3723" />}
                                        <View style={{ height: 40 }} />
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
            </View>
        </TouchableWithoutFeedback>
    );

};

export default DootooList;