import { Platform, Image, Text, View, StyleSheet, Pressable, Animated,
         TouchableWithoutFeedback, Keyboard, ActivityIndicator, TextInput } from "react-native";
import { useState, useRef, useEffect, useCallback } from "react";
import { useFocusEffect } from 'expo-router';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';  
import { transcribeAudioToTasks } from '../components/BackendServices.js';
import { saveItems, loadItems } from '../components/LocalStorage.js';
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
  const swipeableRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState();
  const [itemIdxToEdit, setItemIdxToEdit] = useState(-1);
  const [parsedTasks, setParsedTasks] =  useState();
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [refreshKey, setRefreshKey] = useState(0);
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
        { name: 'Clean my room', isChild: false},
        { name: 'Make my bed', isChild: true},
        { name: 'Organize my desk', isChild: true},
        { name: 'Dust my shelves', isChild: true},
        { name: 'Clean out my closet', isChild: true}
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
      if (retryCount < 3) {
        console.log("Retry count less than 3, trying to startRecording again...");
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
      return await transcribeAudioToTasks(fileUri);
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
    if (parsedTasks && parsedTasks.length > 0) {
      setParsedTasks(parsedTasks.concat(response.tasks));
    } else {
      setParsedTasks(response.tasks);
    }
  }

  const processRecording = async () => {
    setLoading(true);
    const fileUri  = await stopRecording();
    const response = await callBackendTranscribeService(fileUri); 
    //const response =  generateStubData(); 
    console.log("Received response: " + JSON.stringify(response));
    setLoading(false);

    if (parsedTasks && parsedTasks.length > 0) {
      setParsedTasks(parsedTasks.concat(response.tasks));
    } else {
      setParsedTasks(response.tasks);
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

  const loadItemsFromLocalStorage = async() => {
    console.log("Loading items from disk...");
    const savedItems = await loadItems();
    console.log(`Loaded ${savedItems.length} items from disk`);
    setParsedTasks(savedItems);
  };

  useEffect(() => {
    console.log("Initializing mobile ads...");
    initializeMobileAds();
    console.log("Initialization complete.");
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItemsFromLocalStorage();
    }, [])
  );

  const saveItemsToLocalStorage = async() => {
    if (parsedTasks != undefined) {
      console.log("Saving items to local storage...");

      // Whenever parsedTasks changes, save it to local storage
      await saveItems(parsedTasks);
      console.log("Save successful.");
    }
  };

  useEffect(() => {
    saveItemsToLocalStorage();
    if (parsedTasks && parsedTasks.length == 0) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true
      }).start();
    }
  }, [parsedTasks]);

  /********************** END Audio Recording CODE **** BEGIN View Code *****/

  const handleItemTextTap = (itemText, index) => {
    setItemIdxToEdit(index);
  }

  const handleBlur = (index) => { 
    console.log(`Inside handleBlur for index ${index}`);

    if (inputFieldIndex.current == index) {
      const currentValue = inputValueRef.current;
      console.log("Text changed to: " + currentValue);

      var updatedTasks = parsedTasks;
      updatedTasks![index].name = currentValue;
      setParsedTasks(updatedTasks);
    } else {
      console.log(`Previous field ${inputFieldIndex.current} exited with no change, ignoring blur`);
    }
  }

  const handleItemDelete = (index : number) => {
    var updatedTasks = parsedTasks;
    updatedTasks!.splice(index, 1);
    setParsedTasks(updatedTasks);
    setItemIdxToEdit(-1);
    setRefreshKey((prevKey) => prevKey + 1);
  }

  const handleMakeParent = (index : number) => {
    var updatedTasks = parsedTasks;
    updatedTasks![index].isChild = false;
    setParsedTasks(updatedTasks);
    setRefreshKey((prevKey) => prevKey + 1);
  }

  const handleMakeChild = (index : number) => {
    var updatedTasks = parsedTasks;
    updatedTasks![index].isChild = true;
    setParsedTasks(updatedTasks);
    setRefreshKey((prevKey) => prevKey + 1);
  }

  const fadeAnim = useRef(new Animated.Value(0)).current;

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
      left: 285
    },
    link: {
      fontWeight: 'bold',
      fontSize: 20,
      color: 'blue'
    },
    emptyListContainer: {
      flex: 1,
      //flexDirection: 'row',
      //backgroundColor: 'yellow',
      justifyContent: 'center',
      paddingLeft: 20
    },
    emptyListContainer_words: {
      fontSize: 60
    },
    emptyListContainer_arrow: {
      position: 'absolute',
      bottom: -20,
      right: 50,
      height: 300,
      width: 100,
      opacity: 0.4,
      transform: [{ rotate: '10deg'}]
    },
    taskContainer: {
      flex: 1,
      marginTop: 10,
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
      flex: 1
    },
    itemTextInput: {
      fontSize: 16,
      padding: 5
    },
    itemSwipeAction: {
      width: 50,
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
    }
  });

  const renderRightActions = (progress : SharedValue<number>, dragX : SharedValue<number>, index : number) => {
    return (
      <>
        <Reanimated.View style={[styles.itemSwipeAction, styles.action_Delete]}>
          <Pressable 
            onPress={() => handleItemDelete(index) }>
            <Text>Delete</Text>
          </Pressable>
        </Reanimated.View>
        { (parsedTasks![index].isChild) ? 
          <Reanimated.View style={[styles.itemSwipeAction, styles.action_MakeParent]}>
            <Pressable 
              onPress={() => handleMakeParent(index) }>
              <Text>Make Parent</Text>
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
        { (!parsedTasks![index].isChild) ? 
          <Reanimated.View style={[styles.itemSwipeAction, styles.action_MakeParent]}>
            <Pressable 
              onPress={() => handleMakeChild(index) }>
              <Text>Make Child</Text>
            </Pressable>
          </Reanimated.View>
        : <></>
        }
      </>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
          <View  style={styles.taskContainer}>
            { parsedTasks && parsedTasks!.length > 0 ? 
              <DraggableFlatList
                data={parsedTasks}
                extraData={refreshKey}
                onDragEnd={({ data }) => setParsedTasks(data)}
                keyExtractor={(item, index) => index.toString()}
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
                      { (item.isChild) ?
                        <View style={styles.childItemSpacer}></View> 
                        : <></>
                      }
                      <View style={styles.itemCircleOpen}></View>
                      <View style={styles.itemNameContainer}>
                        { (itemIdxToEdit == getIndex()) ?
                            <TextInput
                              multiline={false}
                              style={styles.itemTextInput}
                              defaultValue={item.name}
                              onChangeText={(text) => { 
                                inputFieldIndex.current = getIndex() || -1;
                                inputValueRef.current = text;
                              }}
                              onBlur={() => handleBlur(getIndex())}
                            />           
                          :
                          <Pressable 
                            onLongPress={drag}
                            disabled={isActive}
                            onPress={() => handleItemTextTap(item.name, getIndex()) }>
                            <Text style={styles.taskTitle}>{item.name}</Text>
                          </Pressable>
                        }
                      </View>
                    </View>
                  </ScaleDecorator>
                </Swipeable>
              }
            /> : 
              <Animated.View style={[{opacity: fadeAnim }, styles.emptyListContainer]}>
                <Text style={styles.emptyListContainer_words}>what do you gotta do?</Text>
                <Image style={styles.emptyListContainer_arrow} source={require("../assets/images/sketch_arrow_556B2F.png")}/>
              </Animated.View>

              }
                  { (errorMsg) ?
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorText}>{JSON.stringify(errorMsg)}</Text>
            </View>
          : <View style={styles.errorTextContainer}>
              <Text style={styles.errorText}>{JSON.stringify(errorMsg)}</Text>
            </View>}
          </View>  
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
          { (parsedTasks && parsedTasks.length > 0) ?
            <Pressable 
                style={[styles.footerButton, styles.clearButton]}
                onPress={() => { setParsedTasks([])}}>
              <Image style={styles.footerButtonImage_Restart} source={require("../assets/images/restart_icon_black.png")}/>
            </Pressable> : <></>
          }
            <View style={styles.bannerAdContainer}>
              <BannerAd ref={bannerRef} unitId={bannerAdId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
            </View>
          </View>
      </View>
    </TouchableWithoutFeedback>
    
  );
}