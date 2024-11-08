import {
  Image, Text, View, StyleSheet, Pressable, Animated, Alert,
  TouchableWithoutFeedback, Keyboard, ActivityIndicator, TextInput
} from "react-native";
import { useState, useRef, useContext, useEffect, useCallback } from 'react';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import DraggableFlatList, { ScaleDecorator } from '@bwjohns4/react-native-draggable-flatlist';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import { AppContext } from '../components/AppContext';
import DootooFooter from '../components/DootooFooter';
import Toast from 'react-native-toast-message';
import { transcribeAudioToTips } from '../components/BackendServices';
import { loadTips, saveTips, tipVote } from '../components/Storage';

export default function ItemTips() {
  const { item_idx } = useLocalSearchParams();
  const { dootooItems, setDootooItems, lastRecordedCount,
    setLastRecordedCount, updateUserCountContext,
    selectedItem, setSelectedItem } = useContext(AppContext);
  const [initialLoad, setInitialLoad] = useState(false);
  const [itemIdxToEdit, setItemIdxToEdit] = useState(-1);
  const [tips, setTips] = useState([]);
  const [emptyTipsCTA, setEmptyTipsCTA] = useState('');
  const inputFieldIndex = useRef(-1);
  const inputValueRef = useRef('');
  const swipeableRefs = useRef([]);
  const [errorMsg, setErrorMsg] = useState();
  const fadeCTA = useRef(new Animated.Value(0)).current;
  const ctaAnimation = Animated.timing(fadeCTA, {
    toValue: 1,
    duration: 500,
    useNativeDriver: true
  });

  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false
  });

  const handleSaveItems = async () => {
    if (tips && tips.length > 0) {
      console.log(`Passing ${tips.length} to saveItems method...`);
      await saveTips(selectedItem, tips, () => updateUserCountContext());
      console.log("Tip save successful.");
    }
  };

  // This is expected to be called on any item change, reorder, deletion, etc
  useEffect(() => {
    if (selectedItem == null) {
      console.log("Aborting useEffect([]) call on null selected item");
      return;
    }

    if (!tips || tips.length == 0) {
      console.log("tips useEffect called with empty tips array, exitting...");
      return;
    } else {
      console.log("tips useEffect called tips array length " + tips.length);
    }

    if (initialLoad) {
      if (lastRecordedCount > 0) {
        // If we're inside here, we were called after recording new items

        // Display Toast
        Toast.show({
          type: 'undoableToast',
          text1: `Added ${lastRecordedCount} tip${(lastRecordedCount > 1) ? 's' : ''}.`,
          position: 'bottom',
          bottomOffset: 240,
          props: {
            onUndoPress: () => {

              // Remove the items just added to the list
              console.log(`Undoing recording op; removing first ${lastRecordedCount} tip(s).`);
              var updatedTips = [...tips];
              console.log("dootooItems length: " + dootooItems.length);
              updatedTips.splice(0, lastRecordedCount);
              console.log("List to update now has " + updatedTips.length + " in it.");
              setLastRecordedCount(0);
              setTips(updatedTips);
            }
          }
        });
      } else {

        // This call has to be in this "main UI thread" in order to work
        Toast.hide();
      }

      handleSaveItems();

    } else {
      console.log("UseEffect called before initial load completed, skipping..");
    }
  }, [tips]);

  useFocusEffect(
    useCallback(() => {

      if (selectedItem == null) {
        console.log("Aborting useFocusEffect call on null selected item");
        return;
      }

      setInitialLoad(false);
      setLastRecordedCount(0);
      setItemIdxToEdit(-1);
      ctaAnimation.reset();
      console.log("Selected item: " + selectedItem.text);

      return () => {
        console.log('User has navigated away from this tips route');
        setInitialLoad(false);
        setLastRecordedCount(0);
        setItemIdxToEdit(-1);
        setSelectedItem(null);
        ctaAnimation.reset();
      }
    }, [])
  );

  useEffect(() => {
    if (selectedItem == null) {
      console.log("Aborting useEffect[selectedItem] call on null selected item");
      return;
    }

    console.log("Calling loadTipsFromBackend for item: " + selectedItem.text);
    loadTipsFromBackend();
  }, [selectedItem]);

  const loadTipsFromBackend = async () => {
    const { cta, loadedTips } = await loadTips(selectedItem.uuid);
    console.log(`Loaded ${(loadedTips && loadedTips.length > 0) ? loadedTips.length : 'empty list'} tips from backend`);
    setTips(loadedTips);
    setInitialLoad(true);

    if (loadedTips && loadedTips.length == 0) {
      setEmptyTipsCTA(cta);
      ctaAnimation.start();
    }
  };

  const handleItemTextTap = (itemText: string, index: number) => {
    setItemIdxToEdit(index);
  }

  const handleBlur = (index: number) => {
    console.log(`Inside handleBlur for index ${index}`);
    setItemIdxToEdit(-1);

    if (index != -1 && (inputFieldIndex.current == index)) {
      const currentValue = inputValueRef.current;
      console.log("Text changed to: " + currentValue);

      var updatedTips = [...tips];
      updatedTips![index].text = currentValue;
      setTips(updatedTips);
    } else {
      console.log(`Previous field ${inputFieldIndex.current} exited with no change, ignoring blur`);
    }
  }

  const handleItemDelete = (index: number) => {
    console.log("Entering handle delete item...");
    setLastRecordedCount(0);
    var updatedTips = [...tips];
    updatedTips[index].is_deleted = true;
    setTips(updatedTips);
    setItemIdxToEdit(-1);
    console.log("Exiting handle delete item...");
  }

  const handleDoneClick = () => {
    setLastRecordedCount(0);
    console.log("Unfinishing item for item index: " + item_idx);
    var updatedTasks = [...dootooItems];
    updatedTasks![item_idx].is_done = false;
    setDootooItems(updatedTasks);
    router.back();
  }

  const handleTipVote = async (index, voteValue : number) => {
    await tipVote(tips[index].uuid, voteValue);
    const updatedTips = [...tips];
    updatedTips[index].upvote_count += voteValue;
    setTips(updatedTips);
  }

  const handleTipFlag = (index) => {
    Alert.alert(
      'Report Abuse', // Title of the alert
      'Are you sure you want to report this tip as abusive? Reporting helps us keep our community safe. Your report will remain anonymous.', // Message of the alert
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Tip Flag Cancel Pressed'),
          style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
        },
        {
          text: 'Yes',
          onPress: () => {
            console.log('Tip Flag OK Pressed');
            // TODO: Save flag to backend
            // TODO: Remove tip from user lifetime view
          },
        },
      ],
      { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
    );
  }

    // Function to close all Swipeables except the one being opened
    const closeOtherSwipeables = (index) => {
      swipeableRefs.current.forEach((ref, i) => {
        if (ref && i !== index) {
          ref.close();
        }
      });
    };

  const renderRightActions = (progress: SharedValue<number>, dragX: SharedValue<number>, index: number) => {
    return (
      <> 
        { (tips[index].user_id == selectedItem.user_id) ?
        <Reanimated.View style={[styles.itemSwipeAction, styles.action_Delete]}>
          <Pressable
            onPress={() => handleItemDelete(index)}>
            <Image style={styles.swipeActionIcon_trash} source={require("../assets/images/trash_icon_white.png")} />
          </Pressable>
        </Reanimated.View>
        :
        <>
          <Reanimated.View style={styles.voteContainer}>
            <Pressable style={styles.voteIconContainer}
                onPress={() => { handleTipVote(index, 1) }}>
              <Image style={[styles.voteThumbIcon, (tips[index].user_vote_value == 1) && {opacity: 1.0}]} source={require("../assets/images/thumbs_up_556B2F.png")} />
            </Pressable>
            <View style={styles.voteCountContainer}>
              <Text style={styles.voteCountText}>{tips[index].upvote_count || 'vote'}</Text>                        
            </View> 
            <Pressable style={styles.voteIconContainer}
                onPress={() => { handleTipVote(index, -1) }}>
              <Image style={[styles.voteThumbIcon, (tips[index].user_vote_value == -1) && {opacity: 1.0}]} source={require("../assets/images/thumbs_down_556B2F.png")} />
            </Pressable>
          </Reanimated.View>
          <Reanimated.View style={[styles.itemSwipeAction, styles.action_Flag]}>
            <Pressable
              onPress={() => { handleTipFlag(index) }}>
              <Image style={styles.swipeActionIcon_flag} source={require("../assets/images/flag_A23E48.png")} />
            </Pressable>
          </Reanimated.View>
        </>
        }
      </>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: "#DCC7AA"
    },
    initialLoadAnimContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    emptyListContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingLeft: 30,
      paddingRight: 60
    },
    emptyListContainer_words: {
      fontSize: 40,
      lineHeight: 48
    },
    emptyListContainer_arrow: {
      position: 'absolute',
      bottom: 0,
      right: 80,
      height: 150,
      width: 50,
      opacity: 0.4,
      transform: [{ rotate: '18deg' }]
    },
    taskContainer: {
      flex: 1
    },
    taskTitle: {
      fontSize: 16,
      textAlign: 'left',
      padding: 5
    },
    taskTitle_isDone: {
      color: '#556B2F',
      textDecorationLine: 'line-through'
    },
    itemContainer: {
      flexDirection: 'row', // Lays out children horizontally
      alignItems: 'center', // Aligns children vertically (centered in this case)
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333' //#322723 with approx 20% alpha
    },
    tipsContainer: {
      flex: 1,
      backgroundColor: '#EBDDC5'
    },
    swipeableContainer: {
      backgroundColor: '#EBDDC5'
    },
    tipContainer: {
      flexDirection: 'row', // Lays out children horizontally
      alignItems: 'center', // Aligns children vertically (centered in this case)
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333', //#322723 with approx 20% alpha
      marginLeft: 20
    },
    itemCircleOpen: {
      width: 26,
      height: 26,
      borderRadius: 13, // Half of the width and height for a perfect circle
      borderColor: 'black',
      borderWidth: 2,
      backgroundColor: 'white',
      marginLeft: 15
    },
    itemCircleOpen_isDone: {
      backgroundColor: '#556B2F50'
    },
    itemNameContainer: {
      marginLeft: 15,
      paddingBottom: 10,
      paddingTop: 10,
      flex: 1,
      flexDirection: 'row'
    },
    tipNameContainer: {
      marginTop: 4,
      paddingBottom: 10,
      paddingTop: 10,
      paddingRight: 10,
      flex: 1,
      flexDirection: 'row'
    },
    itemNamePressable: {
      flex: 1,
      width: '100%'
    },
    tipNamePressable: {
      flex: 1,
      width: '100%'
    },
    itemTextInput: {
      fontSize: 16,
      padding: 5,
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
      borderBottomColor: '#3E272333'
    },
    itemLeftSwipeActions: {
      width: 50,
      backgroundColor: 'green',
      justifyContent: 'center',
      alignItems: 'center'
    },
    errorTextContainer: {
      padding: 20
    },
    errorText: {
      color: 'red',
      fontSize: 10
    },
    similarCountContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingRight: 15,
      flexDirection: 'row'
    },
    similarCountText: {
      fontSize: 15
    },
    similarCountIcon: {
      width: 28,
      height: 28,
      opacity: 0.6
    },
    voteThumbIcon: {
      width: 28,
      height: 28,
      opacity: 0.6
    },
    swipeActionIcon_trash: {
      height: 30,
      width: 30
    },
    swipeActionIcon_flag: {
      height: 20,
      width: 20,
      opacity: 0.6
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
    giveTipText: {
      fontSize: 15,
      paddingRight: 10
    },
    tipCountContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingRight: 15,
      flexDirection: 'row'
    },
    tipCountText: {
      fontSize: 15
    },
    tipCountIcon: {
      width: 16,
      height: 16,
      borderRadius: 8, // Half of the width and height for a perfect circle
      borderColor: '#3E2723',
      backgroundColor: '#556B2F60',
      marginLeft: 10
    }, 
    initialLoadMsg: {
      fontSize: 20,
      paddingBottom: 15
    },
    voteContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingRight: 20,
      paddingLeft: 20,
      backgroundColor: '#FAF3E090',
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333'
    },
    voteIconContainer: {
      opacity: 0.6
    },
    voteCountContainer: {

    },
    voteCountText: {
      paddingLeft: 10,
      paddingRight: 10,
      fontSize: 15,
      textAlign: 'center'
    },
    action_Flag: {
      backgroundColor: '#FAF3E090',
      borderRightWidth: 1,
      borderRightColor: '#3E272333',
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333'
    }
  });

  if (selectedItem == null) {
    console.log("Selected Item is null, aborting render of tips page");
    return;
  } else {

    return (
      <TouchableWithoutFeedback onPress={() => {
        if (itemIdxToEdit != -1) {
          if (Keyboard.isVisible()) {
            Keyboard.dismiss();
          }
          handleBlur(itemIdxToEdit);
          setItemIdxToEdit(-1);
        }
      }} >
        <View style={styles.container}>
          <View style={styles.taskContainer}>
            <View style={styles.itemContainer}>
              <Pressable style={[styles.itemCircleOpen, selectedItem.is_done && styles.itemCircleOpen_isDone]} onPress={() => handleDoneClick()}></Pressable>
              <View style={styles.itemNameContainer}>
                <View style={styles.itemNamePressable}>
                  <Text style={[styles.taskTitle, selectedItem.is_done && styles.taskTitle_isDone]}>{selectedItem.text}</Text>
                </View>
                {
                  (selectedItem.tip_count && selectedItem.tip_count > 0) ?
                    <View style={styles.tipCountContainer}>
                      <Text style={styles.tipCountText}>{selectedItem.tip_count}</Text>
                      <View style={styles.tipCountIcon}></View>
                    </View> : <></>
                }
                {
                  (selectedItem.similar_count && selectedItem.similar_count > 0) ?
                    <View style={styles.similarCountContainer}>
                      <Text style={styles.similarCountText}>{selectedItem.similar_count}</Text>
                      <Image style={styles.similarCountIcon} source={require("../assets/images/person_icon_556B2F.png")} />
                    </View> : <></>
                }
              </View>
            </View>
            <View style={styles.tipsContainer}>
              {(initialLoad == false) ?
                <View style={styles.initialLoadAnimContainer}>
                  <Text style={styles.initialLoadMsg}>{(selectedItem.is_done) ? 'Loading your tips' : 'Loading tips from the community'}</Text>
                  <ActivityIndicator size={"large"} color="black" />
                </View>
                :
                (tips && tips.filter(item => !item.is_deleted)!.length > 0) ?
                  <DraggableFlatList
                    data={tips.filter(item => !item.is_deleted)}
                    onDragEnd={({ data }) => {

                      // Only support dragging items if user owns the tips
                      if (tips[0].user_id == selectedItem.user_id) {
                        setLastRecordedCount(0);
                        setTips(data)
                      } else {
                        console.log("Ignoring drag operation as user doesn't own the first tip.");
                      }
                    }}
                    keyExtractor={(item, index) => index.toString()}
                    ListHeaderComponent={<View style={{ height: 0 }} />}
                    ListFooterComponent={<View style={{ height: 200 }} />}
                    renderItem={({ item, getIndex, drag, isActive }) =>
                      <Swipeable
                        key={Math.random()}
                        ref={(ref) =>{
                          swipeableRefs.current[getIndex()] = ref;
                        }}
                        onSwipeableOpen={() => closeOtherSwipeables(getIndex())}
                        childrenContainerStyle={styles.swipeableContainer}
                        overshootLeft={false}
                        overshootRight={false}
                        renderRightActions={(progress, dragX) =>
                          renderRightActions(progress, dragX, getIndex())
                        }
                      >
                        <ScaleDecorator>
                          <View style={styles.tipContainer}>
                            <View style={styles.tipNameContainer}>
                              {(itemIdxToEdit == getIndex()) ?
                                <TextInput
                                  multiline={false}
                                  style={styles.itemTextInput}
                                  defaultValue={item.text}
                                  autoFocus={true}
                                  onChangeText={(text) => {
                                    setLastRecordedCount(0);
                                    inputFieldIndex.current = getIndex();
                                    inputValueRef.current = text;
                                  }}
                                  onBlur={() => handleBlur(getIndex())}
                                />
                                : (item.user_id == selectedItem.user_id) ?
                                <Pressable
                                  style={styles.tipNamePressable}
                                  onLongPress={drag}
                                  disabled={isActive}
                                  onPress={() => handleItemTextTap(item.text, getIndex())}>
                                  <Text style={[styles.taskTitle]}>{item.text}</Text>
                                </Pressable> 
                                : <View style={styles.tipNamePressable}>
                                    <Text style={[styles.taskTitle]}>{item.text}</Text>
                                  </View>
                              }
                            </View>
                          </View>
                        </ScaleDecorator>
                      </Swipeable>
                    }
                  /> : (initialLoad == true) ?
                    <Animated.View style={[styles.emptyListContainer, { opacity: fadeCTA }]}>
                      <Text style={styles.emptyListContainer_words}>{emptyTipsCTA}</Text>
                      <Image style={styles.emptyListContainer_arrow} source={require("../assets/images/sketch_arrow_556B2F.png")} />
                    </Animated.View> : <></>
              }
              {(errorMsg) ?
                <View style={styles.errorTextContainer}>
                  <Text style={styles.errorText}>{JSON.stringify(errorMsg)}</Text>
                </View>
                : <View style={styles.errorTextContainer}>
                  <Text style={styles.errorText}>{JSON.stringify(errorMsg)}</Text>
                </View>}
            </View>
          </View>
          <DootooFooter transcribeFunction={transcribeAudioToTips} listArray={tips || []} listArraySetterFunc={setTips} />
        </View>
      </TouchableWithoutFeedback>
    );
  }
}