import { Image, Text, View, StyleSheet, Pressable, Animated, Alert,
         TouchableWithoutFeedback, Keyboard, ActivityIndicator, TextInput } from "react-native";
import { useState, useRef, useEffect, useContext } from "react";
import { router } from 'expo-router';
import { saveItems, loadItems } from '../components/Storage';
import { AppContext } from '../components/AppContext';
import DraggableFlatList, { ScaleDecorator } from '@bwjohns4/react-native-draggable-flatlist';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import DootooFooter from '../components/DootooFooter';
import Toast from 'react-native-toast-message';
import { transcribeAudioToTasks } from './../components/BackendServices';


export default function Index() {
  const { dootooItems, setDootooItems,
          lastRecordedCount, setLastRecordedCount, 
          initializeLocalUser, updateUserCountContext } = useContext(AppContext);
  const [initialLoad, setInitialLoad] = useState(false);
  const itemFlatList = useRef(null);
  const swipeableRef = useRef(null);
  const [itemIdxToEdit, setItemIdxToEdit] = useState(-1);
  const [errorMsg, setErrorMsg] = useState();
  const inputFieldIndex = useRef(-1);
  const inputValueRef = useRef('');
  const fadeCTA = useRef(new Animated.Value(0)).current;
  const fadeAnimGoals = useRef(new Animated.Value(0.1)).current;
  const fadeAnimDreams = useRef(new Animated.Value(0.1)).current;
  const fadeAnimChallenges = useRef(new Animated.Value(0.1)).current;
  
  const ctaAnimation = Animated.sequence([
      Animated.timing(fadeCTA, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.delay(1000),
      Animated.timing(fadeAnimGoals, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnimDreams, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnimChallenges, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnimChallenges, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true
      })
    ]);


  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false
  });

  const loadItemsFromBackend = async(isNew : boolean) => {
    if (!isNew) {
      console.log("Loading items from backend for existing user...");
      const savedItems = await loadItems();
      console.log(`Loaded ${(savedItems && savedItems.length > 0) ? savedItems.length : 'empty list'} items from backend`);  
      setDootooItems(savedItems);
    } else {
      console.log("Skipping backend item load as user is new.");
    }
    setInitialLoad(true);
    ctaAnimation.start();
  };

  const handleSaveItems = async() => {
    console.log("handleSaveItems called with dootooitems length: " + dootooItems.length);
    ctaAnimation.reset();

    if (dootooItems && dootooItems.length > 0) {
      console.log(`Passing ${dootooItems.length} to saveItems method...`);
      await saveItems(dootooItems, () => updateUserCountContext());
      console.log("Save successful.");
    }

    var nonDeletedItems = dootooItems.filter(item => !item.is_deleted);
    if (nonDeletedItems && nonDeletedItems.length == 0) {
        ctaAnimation.start();
    }
  };

  useEffect(() => {
    setInitialLoad(false);
    initializeLocalUser((isNew : boolean) => {
      loadItemsFromBackend(isNew);
    });
  }, []);

   // This is expected to be called on any item change, reorder, deletion, etc
  useEffect(() => {
    if (initialLoad) {
      if (lastRecordedCount > 0) {
        // If we're inside here, we were called after recording new items

        // Display Toast
        Toast.show({
          type: 'undoableToast',
          text1: `Added ${lastRecordedCount} item${(lastRecordedCount > 1) ? 's' : ''}.`,
          position: 'bottom',
          bottomOffset: 240,
          props: { onUndoPress: () => {

            // Remove the items just added to the list
            console.log(`Undoing recording op; removing first ${lastRecordedCount} item(s).`);
            var updatedItems = [...dootooItems];
            console.log("dootooItems length: " + dootooItems.length);
            updatedItems.splice(0, lastRecordedCount);
            console.log("List to update now has " + updatedItems.length + " in it.");
            setLastRecordedCount(0);
            setDootooItems(updatedItems);          
          }}
        }); 
      } else {

        // This call has to be in this "main UI thread" in order to work
        Toast.hide();
      }

      handleSaveItems();

    } else {
      console.log("UseEffect called before initial load completed, skipping..");
    }
  }, [dootooItems]);

  const handleItemTextTap = (itemText : string, index : number) => {
    setItemIdxToEdit(index);
  }

  const handleBlur = (index : number) => { 
    console.log(`Inside handleBlur for index ${index}`);
    setItemIdxToEdit(-1);

    if (index != -1 && (inputFieldIndex.current == index)) {
      const currentValue = inputValueRef.current;
      console.log("Text changed to: " + currentValue);

      var updatedTasks = [...dootooItems];
      updatedTasks![index].text = currentValue;
      setDootooItems(updatedTasks);
    } else {
      console.log(`Previous field ${inputFieldIndex.current} exited with no change, ignoring blur`);
    }
  }

  const handleItemDelete = (index : number) => {
    console.log("Entering handle delete item...");
    setLastRecordedCount(0);
    var updatedTasks = [...dootooItems];

    // If the item is a parent and has one or more children, ask user if they want to remove all children too
    if (!dootooItems[index].is_child && ((index + 1) <= (dootooItems.length-1)) && dootooItems[index+1].is_child) {
        
      // Count how many subtasks this item has
      var numSubtasks = 0;
      for (var idx = index+1; idx < dootooItems.length; idx++) {
        if (dootooItems[idx].is_child == true) {
          numSubtasks += 1;
        } else {
          break;
        }
      }
      Alert.alert(
          `Item Has ${numSubtasks} Subtask${numSubtasks > 1 ? 's' : ''}`, 
          `Deleting this item will delete its subtask${numSubtasks > 1 ? 's' : ''} too.  Continue?`,
          [
            {
              text: 'Yes',
              onPress: () => {

                // Mark the item and its subtasks as is_deleted: true
                for (var i = index; i <= index + numSubtasks; i++) {
                  updatedTasks[i].is_deleted = true;
                }
                setDootooItems(updatedTasks);
                setItemIdxToEdit(-1);
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

      console.log("Deleting sole item...");

      // Just mark the item as deleted
      updatedTasks[index].is_deleted = true;
      setDootooItems(updatedTasks);
      setItemIdxToEdit(-1);
    }
    console.log("Exiting handle delete item...");
  }

  const handleMakeParent = (index : number) => {
    setLastRecordedCount(0);
    var updatedTasks = [...dootooItems];
    updatedTasks![index].is_child = false;
    setDootooItems(updatedTasks);
  }

  const handleMakeChild = (index : number) => {
    setLastRecordedCount(0);
    var updatedTasks = [...dootooItems];
    updatedTasks![index].is_child = true;
    setDootooItems(updatedTasks);
  }

  const handleDoneClick = (index : number) => {
    setLastRecordedCount(0);
    console.log("Done clicked for item index: " + index);
    var updatedTasks = [...dootooItems];
    updatedTasks![index].is_done = !updatedTasks![index].is_done;
    if (updatedTasks![index].is_done ) {

      // Backup previous location of item in current session in case user un-done's item
      updatedTasks![index].index_backup = index;

      // Move item to above the first is_done item in the list
      var firstUnDoneItemIdxFromBottom = -1;
      for (var i = updatedTasks.length - 1; i >= 0; i--) {
        var currItem = updatedTasks[i];
        if (!currItem.is_done) {
          firstUnDoneItemIdxFromBottom = i;
          break;
        }
      }
      
      const [item] = updatedTasks.splice(index, 1);   // remove the item
      updatedTasks.splice(firstUnDoneItemIdxFromBottom, 0, item)  // insert it in new location
    } else {

      // If item was undone, move item to its previous location if it was saved
      if (updatedTasks![index].index_backup) {
        const [item] = updatedTasks.splice(index, 1);   // remove the item
        updatedTasks.splice(updatedTasks![index].index_backup, 0, item)  // insert it in new location
      }
    }
    
    setDootooItems(updatedTasks);
  }

  const styles = StyleSheet.create({
    container: {
      //padding: 10,
      flex:   1,
      justifyContent: "center",
      backgroundColor: "#DCC7AA"
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
    emptyListContainer: {
      flex: 1,
      //flexDirection: 'row',
      //backgroundColor: 'yellow',
      justifyContent: 'center',
      paddingLeft: 20
    },
    emptyListContainer_words: {
      fontSize: 50
    },
    emptyListContainer_arrow: {
      position: 'absolute',
      bottom: -9,
      right: 100,
      height: 150,
      width: 50,
      opacity: 0.4,
      transform: [{ rotate: '18deg'}]
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
      alignItems: 'center' // Aligns children vertically (centered in this case)
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
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333', //#322723 with approx 20% alpha
      flex: 1,
      flexDirection: 'row'
    },
    itemNamePressable: { 
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
      backgroundColor: 'red'
    },
    action_Give: {
      backgroundColor: '#556B2F'
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
    }
  });

  const renderRightActions = (progress : SharedValue<number>, dragX : SharedValue<number>, index : number) => {
    return (
      <>
        { (dootooItems![index].is_done)  ?
        <Reanimated.View style={[styles.itemSwipeAction, styles.action_Give]}>
            <Pressable
                onPress={() => { router.navigate({ 
                    pathname: '/item/tips/[item_idx]',
                    params: { item_idx: index }
                  })}}>
                <Image style={styles.giveTipIcon} source={require("../assets/images/give_icon_white.png")} />
            </Pressable>
        </Reanimated.View>
        : <></>}
        <Reanimated.View style={[styles.itemSwipeAction, styles.action_Delete]}>
          <Pressable 
            onPress={() => handleItemDelete(index) }>
            <Image style={styles.swipeActionIcon_trash} source={require("../assets/images/trash_icon_white.png")}/>
          </Pressable>
        </Reanimated.View>
        { (dootooItems![index].is_child) ? 
          <Reanimated.View style={[styles.itemSwipeAction]}>
            <Pressable 
              onPress={() => handleMakeParent(index) }>
              <Image style={styles.swipeActionIcon_ident} source={require("../assets/images/left_outdent_3E2723.png")}/>
            </Pressable>
          </Reanimated.View>
        : <></>
        }
      </>
    );
  };

  const renderLeftActions = (progress : SharedValue<number>, dragX : SharedValue<number>, index : number) => {
    return (
      <>
        { (!dootooItems![index].is_child && (index != 0) && (!dootooItems[index-1].is_done)) ? 
          <Reanimated.View style={[styles.itemSwipeAction]}>
            <Pressable 
              onPress={() => handleMakeChild(index) }>
                            <Image style={styles.swipeActionIcon_ident} source={require("../assets/images/left_indent_3E2723.png")}/>

            </Pressable>
          </Reanimated.View>
        : <></>
        }
      </>
    );
  };

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
          { (initialLoad == false) ? 
            <View style={styles.initialLoadAnimContainer}>
              <ActivityIndicator size={"large"} color="black" /> 
            </View>
              : 
          <View  style={styles.taskContainer}>
            { dootooItems && dootooItems.filter(item => !item.is_deleted)!.length > 0 ? 
              <DraggableFlatList
                ref={itemFlatList}
                data={dootooItems.filter(item => !item.is_deleted)}
                onDragEnd={({ data }) => {
                  setLastRecordedCount(0);
                  setDootooItems(data)
                }}
                keyExtractor={(item, index) => index.toString()}
                ListHeaderComponent={<View style={{ height: 4 }} />}
                ListFooterComponent={<View style={{ height: 200 }} />}
                renderItem={({item, getIndex, drag, isActive}) => 
                <Swipeable
                    key={Math.random()}
                    ref={swipeableRef}
                    childrenContainerStyle={styles.swipeableContainer}
                    overshootLeft={false}
                    overshootRight={false}
                    renderLeftActions={(progress, dragX) =>
                      renderLeftActions(progress, dragX, getIndex())
                    }
                    renderRightActions={(progress, dragX) =>
                      renderRightActions(progress, dragX, getIndex())
                    }

                    //onSwipeableOpen={(direction) => onSwipedOpen(direction, getIndex(), this)}
                  >
                  <ScaleDecorator>
                    <View style={styles.itemContainer}>
                      { (item.is_child) ?
                        <View style={styles.childItemSpacer}></View> 
                        : <></>
                      }
                      <Pressable style={[styles.itemCircleOpen, item.is_done && styles.itemCircleOpen_isDone]} onPress={() => handleDoneClick(getIndex())}></Pressable>
                      <View style={styles.itemNameContainer}>
                        { (itemIdxToEdit == getIndex()) ?
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
                          :
                          <Pressable 
                            style={styles.itemNamePressable}
                            onLongPress={drag}
                            disabled={isActive}
                            onPress={() => handleItemTextTap(item.text, getIndex()) }>
                            <Text style={[styles.taskTitle, item.is_done && styles.taskTitle_isDone]}>{item.text}</Text>
                          </Pressable>
                        }
                        { 
                          (item.similar_count && item.similar_count > 0) ?
                          <View style={styles.similarCountContainer}>
                            <Text style={styles.similarCountText}>{item.similar_count}</Text>
                            <Image style={styles.similarCountIcon} source={require("../assets/images/person_icon_556B2F.png")} />
                          </View> : <></>
                        }
                      </View>
                    </View>
                  </ScaleDecorator>
                </Swipeable>
              }
            /> : (initialLoad == true) ?
              <Animated.View style={[styles.emptyListContainer, { opacity: fadeCTA }]}>
                <Text style={styles.emptyListContainer_words}>what are your</Text>
                <Animated.View>
                  <Text style={[styles.emptyListContainer_words, {color: '#556B2F'}]}>tasks?</Text>
                </Animated.View>
                <Animated.View style={[{opacity: fadeAnimGoals }]}>
                  <Text style={[styles.emptyListContainer_words, {color: '#556B2F'}]}>goals?</Text>
                </Animated.View>
                <Animated.View style={[{opacity: fadeAnimDreams }]}>
                  <Text style={[styles.emptyListContainer_words, {color: '#556B2F'}]}>dreams?</Text>
                </Animated.View>
                <Animated.View style={[{opacity: fadeAnimChallenges }]}>
                  <Text style={[styles.emptyListContainer_words, {color: '#556B2F'}]}>challenges?</Text>
                </Animated.View>
                <Image style={styles.emptyListContainer_arrow} source={require("../assets/images/sketch_arrow_556B2F.png")}/>
              </Animated.View> : <></>
              }
                  { (errorMsg) ?
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorText}>{JSON.stringify(errorMsg)}</Text>
            </View>
          : <View style={styles.errorTextContainer}>
              <Text style={styles.errorText}>{JSON.stringify(errorMsg)}</Text>
            </View>}
          </View>  
          }
          <DootooFooter transcribeFunction={transcribeAudioToTasks} listArray={dootooItems} listArraySetterFunc={setDootooItems} />
      </View>
    </TouchableWithoutFeedback>
    
  );
}