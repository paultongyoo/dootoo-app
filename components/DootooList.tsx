import { View, Text, ActivityIndicator, Pressable, TextInput, Image, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useState, useRef, useContext, useEffect, useCallback } from 'react';
import DraggableFlatList, { ScaleDecorator } from '@bwjohns4/react-native-draggable-flatlist';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { AppContext } from './AppContext';
import DootooFooter from './DootooFooter';
import Toast from 'react-native-toast-message';
import { RefreshControl } from 'react-native-gesture-handler';
import * as amplitude from '@amplitude/analytics-react-native';
import { usePathname } from 'expo-router';

const DootooList = ({ thingName = 'item', loadingAnimMsg = "Loading your items", listArray, listArraySetter, ListThingSidebar, EmptyThingUX, ThingToDriveEmptyListCTA = null, styles,
    renderLeftActions = (progress, dragX, index) => { return <></> },
    renderRightActions = (progress, dragX, index) => { return <></> },
    isDoneable = true, handleDoneClick = (index) => { return; },
    saveAllThings, saveSingleThing, loadAllThings,
    transcribeAudioToThings,
    isThingPressable,
    isThingDraggable,
    hideRecordButton = false,
    shouldInitialLoad = true }) => {

    const pathname = usePathname();
    const {anonymousId, lastRecordedCount, setLastRecordedCount, initializeLocalUser } = useContext(AppContext);
    const [initialLoad, setInitialLoad] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState();
    const itemFlatList = useRef(null);              // TODO: Consider deprecate
    const swipeableRefs = useRef([]);
    const [thingIdxToEdit, setThingIdxToEdit] = useState(-1);
    const [thingTextOnTap, setThingTextOnTap] = useState('');
    const inputValueRef = useRef('');

    useEffect(() => {
        //console.log(`useEffect([]) - shouldInitialLoad ${shouldInitialLoad}`);
        initializeLocalUser((isNew: boolean) => {
            //console.log("initializeLocalUser callback method started...");
            if (shouldInitialLoad) {
                if (!isNew) {
                    setInitialLoad(false);
                    loadThingsFromBackend();
                } else {
                    //console.log("Skipping loading things for user as they are brand new.");
                }
            } else {
                //console.log("Skipping initial load for user per shouldInitialLoad == false.");
            }
        });
    }, []);

    useEffect(() => {
        //console.log(`useEffect[listArray] called`);
        //console.log(`useEffect[listArray] called: listArray parse: ${JSON.stringify(listArray)}`);

        if (initialLoad) {
            if (lastRecordedCount > 0) {
                // If we're inside here, we were called after recording new things

                // Display Toast
                Toast.show({
                    type: 'undoableToast',
                    text1: `Added ${lastRecordedCount} ${thingName}${(lastRecordedCount > 1) ? 's' : ''}.`,
                    position: 'bottom',
                    bottomOffset: 220,
                    props: {
                        onUndoPress: () => {

                            // Remove the things just added to the list
                            console.log(`Undoing recording op; removing first ${lastRecordedCount} things(s).`);
                            var updatedItems = [...listArray];
                            console.log("listArray length: " + listArray.length);
                            updatedItems.splice(0, lastRecordedCount);
                            console.log("List to update now has " + updatedItems.length + " in it.");
                            setLastRecordedCount(0);
                            listArraySetter(updatedItems); // This should update UI only and not invoke any syncronous backend operations
                        }
                    }
                });
                setLastRecordedCount(0);
            } else {

                // This call has to be in this "main UI thread" in order to work
                Toast.hide();
            }

            // Commented out backend call from useEffect after moving all sync operations to their respective actions
            // Leaving line here to remove after enough time user tests verify things still work
            //saveAllItems();  // TODO:  Have save items return full list to populate with new counts

        } else {
            //console.log("UseEffect called before initial load completed, skipping..");
        }
    }, [listArray]);

    const handleBlur = (index: number) => {
        //console.log(`Inside handleBlur for index ${index}`);
        setThingIdxToEdit(-1);

        if (index != -1 && (thingIdxToEdit == index)) {
            const currentValue = inputValueRef.current;
            if (currentValue != thingTextOnTap) {
                //console.log("Text changed to: " + currentValue);

                var updatedTasks = [...listArray];
                updatedTasks![index].text = currentValue;

                // Asynchronously sync new item text to DB
                saveSingleThing(updatedTasks![index]);

                updatedTasks![index].counts_updating = true;    // Set this in case new text results in new counts
                listArraySetter(updatedTasks); // This should update UI only and not invoke any syncronous backend operations
            
                amplitude.track("Thing Text Edited", {
                    anonymous_id: anonymousId,
                    pathname: pathname,
                    thing_uuid: updatedTasks![index].uuid,
                    thing_type: thingName
                });
            
            } else {
                console.log(`${currentValue} not changed on blur, ignoring..`);
            }
        } else {
            console.log(`Previous field ${thingIdxToEdit} exited with no change, ignoring blur`);
        }
    }

    const handleThingTextTap = (itemText: string, index: number) => {
        //console.log(`handleItemTextTap called with text (${itemText}) and index (${index})`);
        inputValueRef.current = itemText;
        setThingTextOnTap(itemText);
        setThingIdxToEdit(index);
    }

    function handleThingDrag(data: unknown[]) {
        if (isThingDraggable(data)) {
            setLastRecordedCount(0);
            listArraySetter(data);  // This should update UI only and not invoke any syncronous backend operations

            // Asynchronously save all items to DB as rank_idxes will have changed
            saveAllThings(data);
        } else {
            console.log("Ignoring drag operation given isThingDraggable(data) == false");
        }
    }

    const loadThingsFromBackend = async () => {
        const savedItems = await loadAllThings();
        //console.log("Loaded things: " + JSON.stringify(savedItems));
        //console.log(`Loaded ${(savedItems && savedItems.length > 0) ? savedItems.length : 'empty list'} ${thingName}(s) from backend`);
        listArraySetter(savedItems);
        setInitialLoad(true);
        setRefreshing(false);
    };

    // Function to close all Swipeables except the one being opened
    const closeOtherSwipeables = (index) => {
        swipeableRefs.current.forEach((ref, i) => {
            if (ref && i !== index) {
                ref.close();
            }
        });
    };

    const renderThing = ({ item, getIndex, drag, isActive }) => {

        useEffect(() => {
            
            // If tip is being loaded, fire a Tip Viewed event with its displayed vote count
            if (thingName == 'tip') {
                amplitude.track("Tip Viewed", {
                    anonymousId: anonymousId,
                    pathname: pathname,
                    tip_uuid: item.uuid,
                    tip_score: item.upvote_count
                });
            } else if (item.text && item.text == "(flagged)") {
                amplitude.track("Flagged Thing Rendered", {
                    anonymousId: anonymousId,
                    pathname: pathname,
                    thing_uuid: item.uuid,
                    thing_type: thingName
                });
            }

        }, [item]);

        return (<Swipeable
            key={Math.random()}
            ref={(ref) => {
                swipeableRefs.current[getIndex()] = ref;
            }}
            onSwipeableOpen={() => closeOtherSwipeables(getIndex())}
            childrenContainerStyle={styles.swipeableContainer}
            overshootLeft={false}
            overshootRight={false}
            onSwipeableWillOpen={(direction) => {
                amplitude.track(`Swipe ${direction.toUpperCase()} Actions Opened`, {
                    anonymous_id: anonymousId,
                    pathname: pathname,
                    thing_uuid: listArray[getIndex()].uuid,
                    thing_type: thingName
                });
            }}
            renderLeftActions={(progress, dragX) => { if (renderLeftActions) { return renderLeftActions(progress, dragX, getIndex()) } else { return <></> } }}
            renderRightActions={(progress, dragX) => { if (renderRightActions) { return renderRightActions(progress, dragX, getIndex()) } else { return <></> } }}>
            <ScaleDecorator>
                <View style={[styles.itemContainer, (getIndex() == 0) && styles.itemContainer_firstItem]}>
                    {(item.is_child) ?
                        <View style={styles.childItemSpacer}></View>
                        : <></>
                    }
                    {(isDoneable) ?
                        <Pressable style={[styles.itemCircleOpen, item.is_done && styles.itemCircleOpen_isDone]} onPress={() => handleDoneClick(getIndex())}></Pressable>
                        : <></>
                    }
                    <View style={styles.itemNameContainer}>
                        {(thingIdxToEdit == getIndex()) ?
                            <TextInput
                                multiline={false}
                                style={styles.itemTextInput}
                                defaultValue={item.text}
                                autoFocus={true}
                                onChangeText={(text) => {
                                    setLastRecordedCount(0);
                                    inputValueRef.current = text;
                                }}
                                onBlur={() => handleBlur(getIndex())} />
                            :
                            (isThingPressable(item)) ?
                                <Pressable
                                    style={styles.itemNamePressable}
                                    onLongPress={drag}
                                    disabled={isActive}
                                    onPress={() => handleThingTextTap(item.text, getIndex())}>
                                    <Text style={[styles.taskTitle, item.is_done && styles.taskTitle_isDone]}>{item.text}</Text>
                                </Pressable>
                                : <View style={styles.tipNamePressable}>
                                    <Text style={[styles.taskTitle]}>{item.text}</Text>
                                </View>
                        }
                        <ListThingSidebar thing={item} styles={styles} listArray={listArray} listThingIndex={getIndex()} />
                    </View>
                </View>
            </ScaleDecorator>
        </Swipeable>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={() => {
            if (thingIdxToEdit != -1) {
                if (Keyboard.isVisible()) {
                    Keyboard.dismiss();
                }
                handleBlur(thingIdxToEdit);
                setThingIdxToEdit(-1);
            }
        }} >
            <View style={styles.listContainer}>
                {(initialLoad == false) ?
                    <View style={styles.initialLoadAnimContainer}>
                        <Text style={styles.initialLoadMsg}>{loadingAnimMsg}</Text>
                        <ActivityIndicator size={"large"} color="black" />
                    </View>
                    :
                    <View style={styles.taskContainer}>
                        {listArray && (listArray.length > 0) && listArray.filter(item => !item.is_deleted)!.length > 0 ?
                            <DraggableFlatList
                                ref={itemFlatList}
                                data={listArray.filter(item => !item.is_deleted)}
                                onDragEnd={({ data }) => {
                                    amplitude.track("List Item Dragged", {
                                        anonymous_id: anonymousId,
                                        pathname: pathname
                                    });
                                    handleThingDrag(data);
                                }}
                                keyExtractor={(item, index) => index.toString()}
                                ListHeaderComponent={<View style={{ height: 0 }} />}
                                ListFooterComponent={<View style={{ height: 60 }} />}
                                refreshControl={
                                    <RefreshControl
                                        onRefresh={() => {
                                            setLastRecordedCount(0);
                                            setRefreshing(true);
                                            loadThingsFromBackend(false);
                                        }}
                                        refreshing={refreshing} />
                                }
                                renderItem={renderThing}
                            /> : (initialLoad == true) ? <EmptyThingUX styles={styles} ThingToDriveEmptyListCTA={ThingToDriveEmptyListCTA} /> : <></>
                        }
                        {(errorMsg) ?
                            <View style={styles.errorTextContainer}>
                                <Text style={styles.errorText}>{JSON.stringify(errorMsg)}</Text>
                            </View>
                            : <View style={styles.errorTextContainer}>
                                <Text style={styles.errorText}>{JSON.stringify(errorMsg)}</Text>
                            </View>}
                    </View>
                }
                <DootooFooter hideRecordButton={hideRecordButton} transcribeFunction={transcribeAudioToThings} listArray={listArray} listArraySetterFunc={listArraySetter} saveAllThingsFunc={saveAllThings} />
            </View>
        </TouchableWithoutFeedback>
    );

};

export default DootooList;