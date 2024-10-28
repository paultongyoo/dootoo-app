import { Platform, Image, Text, View, StyleSheet, Pressable, Animated, Alert,
         TouchableWithoutFeedback, Keyboard, ActivityIndicator, TextInput } from "react-native";
import { useState, useRef, useEffect, useContext } from "react";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';  
import { transcribeAudioToTasks } from '../components/BackendServices';
import { saveItems, loadItems } from '../components/Storage';
import { UserContext } from '../components/UserContext.js';
import RNFS from 'react-native-fs';
import DraggableFlatList, { ScaleDecorator } from '@bwjohns4/react-native-draggable-flatlist';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import mobileAds, { BannerAd, TestIds, useForeground, BannerAdSize } from 'react-native-google-mobile-ads';

export default function Index() {
  const { dootooItems, setDootooItems, anonymousId } = useContext(UserContext);
  const [initialLoad, setInitialLoad] = useState(false);

  const swipeableRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState();
  const [itemIdxToEdit, setItemIdxToEdit] = useState(-1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [errorMsg, setErrorMsg] = useState();
  var retryCount = 0;
  const inputFieldIndex = useRef(-1);
  const inputValueRef = useRef('');
  const bannerAdId = __DEV__ ? 
    TestIds.ADAPTIVE_BANNER : 
      (Platform.OS === 'ios' ? "ca-app-pub-6723010005352574/5609444195" : 
                               "ca-app-pub-6723010005352574/8538859865");
  const bannerRef = useRef<BannerAd>(null);

  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false
  });

  useForeground(() => {
    Platform.OS === 'ios' && bannerRef.current?.load();
  })

  const initializeMobileAds = async () => {
    const adapterStatuses = await mobileAds().initialize();
}

  const generateStubData = () => {
    return {
      tasks: [
        { item_text: 'Clean my room', is_child: false},
        { item_text: 'Make my bed', is_child: true},
        { item_text: 'Organize my desk', is_child: true},
        { item_text: 'Dust my shelves', is_child: true},
        { item_text: 'Clean out my closet', is_child: true}
      ]
    };
  }

  const startRecording = async() => {
    try {
      if (permissionResponse!.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      console.log('Recording started');
      setErrorMsg(undefined);   // Clear error message if no error
    } catch (err) {
      if (retryCount < 99999999999) { // TODO: Resolve this hack to prevent the "recorder not prepared error"
        startRecording();
        retryCount += 1;
      } else {
        console.error('Failed to start recording', err);
        setErrorMsg(err);
      }
    }
  }

  const stopRecording = async() : Promise<string> => {
    console.log('Stopping recording..');
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync(
      {
        allowsRecordingIOS: false,
      }
    );
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);
    return uri;
  }

  const callBackendTranscribeService = async (fileUri: string) => {
      return await transcribeAudioToTasks(fileUri, anonymousId);
  }

  const deleteFile = async (fileUri : string) => {
    try {
      // Check if the file exists
      const fileExists = await RNFS.exists(fileUri);
      
      if (fileExists) {
        // Delete the file
        await RNFS.unlink(fileUri);
        console.log('File deleted successfully');
      } else {
        console.log('File does not exist');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const loadStubData = () => {
    setLoading(true);
    const response = generateStubData();
    setLoading(false);
    if (dootooItems && dootooItems.length > 0) {
      setDootooItems(dootooItems.concat(response.tasks));
    } else {
      setDootooItems(response.tasks);
    }
  }

  const processRecording = async () => {
    setLoading(true);
    const fileUri  = await stopRecording();
    const response = await callBackendTranscribeService(fileUri); 
    //const response =  generateStubData(); 
    console.log("Received response: " + JSON.stringify(response));
    setLoading(false);
    setItemIdxToEdit(-1);

    if (dootooItems && dootooItems.length > 0) {
      setDootooItems(dootooItems.concat(response));
    } else {
      setDootooItems(response);
    }
    
    console.log("Finished parsing file, deleting...");
    deleteFile(fileUri);
  }

  const cancelRecording = async() => {
    console.log("Cancelling recording...");
    const fileUri  = await stopRecording();
    console.log("Deleting file..");
    deleteFile(fileUri);
  }

  const loadItemsFromBackend = async() => {
    console.log("Loading items from backend...");
    const savedItems = await loadItems();
    console.log(`Loaded ${(savedItems && savedItems.length > 0) ? savedItems.length : 'empty list'} items from backend`);  
    setInitialLoad(true);
    setDootooItems(savedItems);
  };

  const handleSaveItems = async() => {

    if (dootooItems == undefined || dootooItems.length == 0) {
      console.log("Calling saveItems with empty list (expecting backend to clear items for user.");
      await saveItems([]);
    } else {
      console.log(`Passing ${dootooItems.length} to saveItems method...`);
      await saveItems(dootooItems);
      console.log("Save successful.");
    }

    if (dootooItems && dootooItems.length == 0) {
      ctaAnimation.start();
    } else {
      ctaAnimation.stop();
    }
  };

  useEffect(() => {
    setInitialLoad(false);
    initializeMobileAds();
    loadItemsFromBackend();
  }, []);

  useEffect(() => {
    if (initialLoad) {
      handleSaveItems();
    } else {
      console.log("UseEffect called before initial load completed, skipping..");
    }
  }, [dootooItems]);

  /********************** END Audio Recording CODE **** BEGIN View Code *****/

  const handleItemTextTap = (itemText, index) => {
    setItemIdxToEdit(index);
  }

  const handleBlur = (index) => { 
    console.log(`Inside handleBlur for index ${index}`);
    setItemIdxToEdit(-1);

    Keyboard.dismiss();

    if (index != -1 && (inputFieldIndex.current == index)) {
      const currentValue = inputValueRef.current;
      console.log("Text changed to: " + currentValue);

      var updatedTasks = [...dootooItems];
      updatedTasks![index].item_text = currentValue;
      setDootooItems(updatedTasks);
    } else {
      console.log(`Previous field ${inputFieldIndex.current} exited with no change, ignoring blur`);
    }
  }

  const handleItemDelete = (index : number) => {
    var updatedTasks = [...dootooItems];
    updatedTasks!.splice(index, 1);
    setDootooItems(updatedTasks);
    setItemIdxToEdit(-1);
  }

  const handleMakeParent = (index : number) => {
    var updatedTasks = [...dootooItems];
    updatedTasks![index].is_child = false;
    setDootooItems(updatedTasks);
  }

  const handleMakeChild = (index : number) => {
    var updatedTasks = [...dootooItems];
    updatedTasks![index].is_child = true;
    setDootooItems(updatedTasks);
  }

  const showClearListConfirmationPrompt = () => {
    Alert.alert(
      'Clear your list?', // Title of the alert
      'This deletes all items in your list and can\'t be undone.', // Message of the alert
      [
        {
          text: 'Cancel',
          onPress: () => console.log('List Clear Pressed'),
          style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
        },
        {
          text: 'Yes',
          onPress: () => {
            console.log('List Clear OK Pressed');
            setDootooItems([]);
          },
        },
      ],
      { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
    );
  };

  //const fadeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnimTasks = useRef(new Animated.Value(1)).current;
  const fadeAnimGoals = useRef(new Animated.Value(0.1)).current;
  const fadeAnimDreams = useRef(new Animated.Value(0.1)).current;
  const fadeAnimChallenges = useRef(new Animated.Value(0.1)).current;
  //const wordCycle = Animated.loop(
  const ctaAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnimTasks, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true
        }),
        // Animated.timing(fadeAnimChallenges, {
        //   toValue: 0.1,
        //   duration: 1500,
        //   useNativeDriver: true
        // }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnimGoals, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true
        }),
        // Animated.timing(fadeAnimTasks, {
        //   toValue: 0.1,
        //   duration: 1500,
        //   useNativeDriver: true
        // }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnimDreams, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true
        }),
        // Animated.timing(fadeAnimGoals, {
        //   toValue: 0.1,
        //   duration: 1500,
        //   useNativeDriver: true
        // }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnimChallenges, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true
        }),
        // Animated.timing(fadeAnimDreams, {
        //   toValue: 0.1,
        //   duration: 1500,
        //   useNativeDriver: true
        // }),
      ]),
      Animated.timing(fadeAnimChallenges, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true
      }),
      Animated.parallel([
        Animated.timing(fadeAnimTasks, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true
        }),
        // Animated.timing(fadeAnimChallenges, {
        //   toValue: 0.1,
        //   duration: 1500,
        //   useNativeDriver: true
        // }),
      ]),
    ]);
  //);

  const styles = StyleSheet.create({
    container: {
      //padding: 10,
      flex:   1,
      justifyContent: "center",
      backgroundColor: "#DCC7AA"
      //alignItems: "center"
    },
    footerContainer: {
      backgroundColor: '#FAF3E0',
      alignItems: 'center',
      height: 140
    },
    bannerAdContainer: {
      position: 'absolute',
      bottom: 40
    },
    footerButton: {
      height: 100,
      width: 100,
      borderRadius: 50,
      borderColor: '#3E2723',
      borderWidth: 1,
      position: 'absolute',
      bottom: 120,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    footerButtonImage_Record: {
      height: 60,
      width: 60
    },
    footerButtonImage_Restart: {
      height: 49,
      width: 49
    },
    footerButtonImage_Cancel: {
      height: 49,
      width: 49
    },
    footerButtonTitle: {
      fontWeight: 'bold',
      color: 'white',
      fontSize: 20
    },
    cancelButton: {
      backgroundColor: '#FAF3E0',
      left: 34
    },
    recordButton: {
      backgroundColor: '#556B2F'
    },
    stopRecordButton: {
      backgroundColor: '#A23E48'
    },
    clearButton: {
      backgroundColor: '#FAF3E0',
      left: 269
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
    loadingAnim: {
      margin: 10,
      position: 'relative',
      left: 1
    },
    itemContainer: {
      flexDirection: 'row', // Lays out children horizontally
      alignItems: 'center' // Aligns children vertically (centered in this case)
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
    }
  });

  const renderRightActions = (progress : SharedValue<number>, dragX : SharedValue<number>, index : number) => {
    return (
      <>
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
        { (!dootooItems![index].is_child) ? 
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

  const showComingSoon = () => {
    Alert.alert(
      'Feature Coming Soon', // Title of the alert
      'Stay tuned!', // Message of the alert 
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => {
        if (Keyboard.isVisible()) {
          Keyboard.dismiss();
        }
        handleBlur(itemIdxToEdit); 
        setItemIdxToEdit(-1); 
        setRefreshKey((prevKey) => prevKey + 1)
      }} >
      <View style={styles.container}>
        {/* <View>
          <Text>initialLoad: {JSON.stringify(initialLoad)}</Text>
          <Text>itemIdxToEdit: {JSON.stringify(itemIdxToEdit)}</Text>
          <Text>inputFieldIndex.current: {JSON.stringify(inputFieldIndex.current)}</Text>
          <Text>inputValueRef.current: {JSON.stringify(inputValueRef.current)}</Text>
          <Text>refreshKey: {JSON.stringify(refreshKey)}</Text>
        </View> */}
          { (initialLoad == false) ? 
            <View style={styles.initialLoadAnimContainer}>
              <ActivityIndicator size={"large"} color="black" /> 
            </View>
              : 
          <View  style={styles.taskContainer}>
            { dootooItems && dootooItems!.length > 0 ? 
              <DraggableFlatList
                data={dootooItems}
                onDragEnd={({ data }) => setDootooItems(data)}
                keyExtractor={(item, index) => index.toString()}
                ListFooterComponent={<View style={{ height: 100 }} />}
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
                      <Pressable style={styles.itemCircleOpen} onPress={showComingSoon}></Pressable>
                      <View style={styles.itemNameContainer}>
                        { (itemIdxToEdit == getIndex()) ?
                            <TextInput
                              multiline={false}
                              style={styles.itemTextInput}
                              defaultValue={item.item_text}
                              autoFocus={true}
                              onChangeText={(text) => { 
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
                            onPress={() => handleItemTextTap(item.item_text, getIndex()) }>
                            <Text style={styles.taskTitle}>{item.item_text}</Text>
                          </Pressable>
                        }
                        { (item.similar_count && item.similar_count > 0) ?<>
                          <View style={styles.similarCountContainer}>
                            <Text style={styles.similarCountText}>{item.similar_count}</Text>
                            <Image style={styles.similarCountIcon} source={require("../assets/images/person_icon_556B2F.png")} />
                          </View></> : <></>
                        }
                      </View>
                    </View>
                  </ScaleDecorator>
                </Swipeable>
              }
            /> : (initialLoad == true) ?
              <Animated.View style={styles.emptyListContainer}>
                <Text style={styles.emptyListContainer_words}>what are your</Text>
                <Animated.View style={[{opacity: fadeAnimTasks }]}>
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
          <View style={styles.footerContainer}>
            { recording ? 
              <Pressable 
                  style={[styles.footerButton, styles.cancelButton]}
                  onPress={cancelRecording}>
                  <Image style={styles.footerButtonImage_Cancel} source={require("../assets/images/cancel_icon_black.png")}/>
              </Pressable>
              : <></>  }
            <Pressable 
                style={[styles.footerButton, (recording) ? styles.stopRecordButton : styles.recordButton]}
                onPress={recording ? processRecording : startRecording}>
            { (loading) ? 
                <View style={styles.loadingAnim}>
                  <ActivityIndicator size={"large"} color="white" /> 
                </View> : (recording) ? 
                    <Text style={styles.footerButtonTitle}>Stop</Text> : 
                    <Image style={styles.footerButtonImage_Record} source={require("../assets/images/microphone_white.png")}/> }
            </Pressable>
          {/* { (dootooItems && dootooItems.length > 0) ?
            <Pressable 
                style={[styles.footerButton, styles.clearButton]}
                onPress={showClearListConfirmationPrompt}>
              <Image style={styles.footerButtonImage_Restart} source={require("../assets/images/restart_icon_black.png")}/>
            </Pressable> : <></>
          } */}
            <View style={styles.bannerAdContainer}>
              <BannerAd ref={bannerRef} unitId={bannerAdId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
            </View>
          </View>
      </View>
    </TouchableWithoutFeedback>
    
  );
}