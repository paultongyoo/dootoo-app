import { Image, Text, View, StyleSheet, Pressable, Animated, Alert,
  TouchableWithoutFeedback, Keyboard, ActivityIndicator, TextInput } from "react-native";
import { useState, useRef, useContext, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import DraggableFlatList, { ScaleDecorator } from '@bwjohns4/react-native-draggable-flatlist';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import { AppContext } from '../../../components/AppContext';
import DootooFooter from '../../../components/DootooFooter';
import Toast from 'react-native-toast-message';
import { transcribeAudioToTips } from './../../../components/BackendServices';

export default function ItemTips() {
  const { item_idx } = useLocalSearchParams();
  const { dootooItems, lastRecordedCount, setLastRecordedCount, updateUserCountContext } = useContext(AppContext);
  const selectedItem = dootooItems[item_idx];
  const [initialLoad, setInitialLoad] = useState(false);
  const [itemIdxToEdit, setItemIdxToEdit] = useState(-1);
  const [tips, setTips] = useState([]);
  const inputFieldIndex = useRef(-1);
  const inputValueRef = useRef('');
  const [errorMsg, setErrorMsg] = useState();
  const fadeCTA = useRef(new Animated.Value(0)).current;

  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false
  });

  const handleSaveItems = async() => {
    console.log("handleSaveItems called with tips length: " + tips.length);

    if (tips && tips.length > 0) {
      console.log(`Passing ${tips.length} to saveItems method...`);
      //await saveTips(tips, () => updateUserCountContext());
      console.log("Save successful.");
    }
  };

     // This is expected to be called on any item change, reorder, deletion, etc
     useEffect(() => {
      if (initialLoad) {
        if (lastRecordedCount > 0) {
          // If we're inside here, we were called after recording new items
  
          // Display Toast
          Toast.show({
            type: 'undoableToast',
            text1: `Added ${lastRecordedCount} tip${(lastRecordedCount > 1) ? 's' : ''}.`,
            position: 'bottom',
            bottomOffset: 240,
            props: { onUndoPress: () => {
  
              // Remove the items just added to the list
              console.log(`Undoing recording op; removing first ${lastRecordedCount} tip(s).`);
              var updatedTips = [...tips];
              console.log("dootooItems length: " + dootooItems.length);
              updatedTips.splice(0, lastRecordedCount);
              console.log("List to update now has " + updatedTips.length + " in it.");
              setLastRecordedCount(0);
              setTips(updatedTips);          
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
    }, [tips]);

  useEffect(() => {
    setInitialLoad(false);
    console.log("Selected item: " + JSON.stringify(selectedItem));
    loadTipsFromBackend();
  }, []);

  const loadTipsFromBackend = async() => {
    console.log("Loading tips from backend for existing item...");
    const savedTips = null // TODO: await loadTips();
    //console.log(`Loaded ${(savedTips && savedTips.length > 0) ? savedTips.length : 'empty list'} tips from backend`);  
    //setTips(savedTips);
    setInitialLoad(true);
  };

  const handleItemTextTap = (itemText : string, index : number) => {
    setItemIdxToEdit(index);
  }

  const handleBlur = (index : number) => { 
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

  const handleItemDelete = (index : number) => {
    console.log("Entering handle delete item...");
    setLastRecordedCount(0);
    var updatedTips = [...tips];
    updatedTips[index].is_deleted = true;
    setTips(updatedTips);
    setItemIdxToEdit(-1);
    console.log("Exiting handle delete item...");
  }

  const handleDoneClick = () => {
    Alert.alert("Coming soon!");
    //setLastRecordedCount(0);
    //console.log("Done clicked for item index: " + index);
    //var updatedTasks = [...dootooItems];
    //updatedTasks![index].is_done = !updatedTasks![index].is_done;
    //setDootooItems(updatedTasks);
  }

  const renderRightActions = (progress : SharedValue<number>, dragX : SharedValue<number>, index : number) => {
    return (
      <>
        <Reanimated.View style={[styles.itemSwipeAction, styles.action_Delete]}>
          <Pressable 
            onPress={() => handleItemDelete(index) }>
            <Image style={styles.swipeActionIcon_trash} source={require("../../../assets/images/trash_icon_white.png")}/>
          </Pressable>
        </Reanimated.View>
      </>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex:   1,
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
      alignItems: 'center', // Aligns children vertically (centered in this case)
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333', //#322723 with approx 20% alpha
    },
    tipContainer: {
      flex: 1,
      backgroundColor: '#FAF3E075'
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
      marginTop: 4,
      marginLeft: 15,
      paddingBottom: 10,
      paddingTop: 10,
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
      height: 28,
      width: 50
    }
  });

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
        <View  style={styles.taskContainer}>
          <View style={styles.itemContainer}>
            <Pressable style={[styles.itemCircleOpen, selectedItem.is_done && styles.itemCircleOpen_isDone]} onPress={() => handleDoneClick()}></Pressable>
            <View style={styles.itemNameContainer}>
                <View style={styles.itemNamePressable}>
                  <Text style={[styles.taskTitle, selectedItem.is_done && styles.taskTitle_isDone]}>{selectedItem.text}</Text>
                </View>
                <View style={styles.giveTipContainer}>
                    <Image style={styles.giveTipIcon} source={require("../../../assets/images/give_icon_556B2F.png")} />
                </View>
            </View>
          </View>
          { (initialLoad == false) ? 
          <View style={styles.initialLoadAnimContainer}>
            <ActivityIndicator size={"large"} color="black" /> 
          </View>
            : 
           (tips && tips.filter(item => !item.is_deleted)!.length > 0) ? 
          <View style={styles.tipContainer}>
            { (initialLoad == false) ? 
            <View style={styles.initialLoadAnimContainer}>
              <ActivityIndicator size={"large"} color="black" /> 
            </View>
              : 
            (tips && tips.filter(item => !item.is_deleted)!.length > 0) ? 
              <DraggableFlatList
                data={tips.filter(item => !item.is_deleted)}
                onDragEnd={({ data }) => {
                  setLastRecordedCount(0);
                  setTips(data)
                }}
                keyExtractor={(item, index) => index.toString()}
                ListHeaderComponent={<View style={{ height: 4 }} />}
                ListFooterComponent={<View style={{ height: 200 }} />}
                renderItem={({item, getIndex, drag, isActive}) => 
                <Swipeable
                    key={Math.random()}
                    childrenContainerStyle={styles.swipeableContainer}
                    overshootLeft={false}
                    overshootRight={false}
                    renderRightActions={(progress, dragX) =>
                      renderRightActions(progress, dragX, getIndex())
                    }
                  >
                  <ScaleDecorator>
                    <View style={styles.itemContainer}>
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
                          (item.upvote_count && item.upvote_count > 0) ?
                          <View style={styles.similarCountContainer}>
                            <Text style={styles.similarCountText}>{item.upvote_count}</Text>
                            <Image style={styles.similarCountIcon} source={require("../../../assets/images/thumbs_up_556B2F.png")} />
                          </View> : <></>
                        }
                      </View>
                    </View>
                  </ScaleDecorator>
                </Swipeable>
              }
            /> : (initialLoad == true) ?
              <Animated.View style={[styles.emptyListContainer, { opacity: fadeCTA }]}>
                <Text style={styles.emptyListContainer_words}>Share your best tips with the community</Text>
                <Image style={styles.emptyListContainer_arrow} source={require("../../../assets/images/sketch_arrow_556B2F.png")}/>
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
        </View>  
        <DootooFooter transcribeFunction={transcribeAudioToTips} listArray={tips} listArraySetterFunc={setTips}/>
    </View>
  </TouchableWithoutFeedback>
  );
}