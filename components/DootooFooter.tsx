import { Platform, Image, View, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import RNFS from 'react-native-fs';
import { AppContext } from './AppContext.js';
import { useState, useContext, useRef, useEffect } from "react";
import mobileAds, { BannerAd, TestIds, useForeground, BannerAdSize } from 'react-native-google-mobile-ads';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Toast from "react-native-toast-message";
import * as amplitude from '@amplitude/analytics-react-native';
import { usePathname } from 'expo-router';
import { ListItemEventEmitter } from "./EventEmitters";
import { checkOpenAPIStatus } from "./BackendServices.js";
import Animated from "react-native-reanimated";

const DootooFooter = ({ transcribeFunction, listArray, listArraySetterFunc, saveAllThingsFunc, hideRecordButton = false }) => {
    const pathname = usePathname();
    const { anonymousId, listFadeInAnimation, fadeInListOnRender,
        lastRecordedCount, emptyListCTAOpacity, emptyListCTAFadeOutAnimation } = useContext(AppContext);
    const [isRecordingProcessing, setIsRecordingProcessing] = useState(false);
    const recorderProcessLocked = useRef(false);
    const [recording, setRecording] = useState();
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const meteringLevel = useSharedValue(1); // shared value for animated scale
    const recordButtonOpacity = useSharedValue(1);
    const recordingTimeStart = useRef(null);        // Var used for calculating time

    // Auto stop threshold feature
    const audioTreshold = useRef(0);
    const silenceTimer = useRef(null);
    const SILENCE_DURATION = 1000;  // 1 seconds
    const hasBreachedThreshold = useRef(false);

    const bannerAdId = __DEV__ ?
        TestIds.ADAPTIVE_BANNER :
        (Platform.OS === 'ios' ? "ca-app-pub-6723010005352574/5609444195" :
            "ca-app-pub-6723010005352574/8538859865");
    const bannerRef = useRef<BannerAd>(null);
    var retryCount = 0;

    const opacity = useSharedValue(0);

    const ITEMS_PATHNAME = "/meDrawer/communityDrawer/stack";

    useEffect(() => {
        if (!hideRecordButton) {
            checkOpenAPIHealth();
        }
    }, []);

    const checkOpenAPIHealth = async () => {
        const status = await checkOpenAPIStatus();
        if (status != "operational") {
            amplitude.track("OpenAI API Impacted Prompt Displayed", {
                anonymous_id: anonymousId.current,
                pathname: pathname
            });
            Alert.alert(
                "Voice Transcription May Be Impacted",
                "Please be aware that our AI partner is currently experiencing issues that may impact posting new tasks and tips.  " + 
                "This message will cease to appear once their issues are resolved.",
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            amplitude.track("OpenAI API Impacted Prompt OK'd", {
                                anonymous_id: anonymousId.current,
                                pathname: pathname
                            });
                        },
                    },
                ],
                { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
            );
        }
    }

    useEffect(() => {
        initializeMobileAds();
        //console.log(`Pathname: ${pathname}`);
        if (pathname == ITEMS_PATHNAME) {
            //console.log("Attempting to animate footer in...");
            opacity.value = withTiming(1, {
                duration: 500
            });
        }
    }, [pathname]);

    useForeground(() => {
        Platform.OS === 'ios' && bannerRef.current?.load();
    })

    const initializeMobileAds = async () => {
        const adapterStatuses = await mobileAds().initialize();
    }

    const startRecording = async () => {
        recordingTimeStart.current = performance.now();
        //console.log("Logging start time: " + new Date(recordingTimeStart.current).toLocaleString());
        amplitude.track("Recording Started", {
            anonymous_id: anonymousId.current,
            pathname: pathname
        });
        try {
            if (permissionResponse!.status !== 'granted') {
                //console.log('Requesting permission..');
                amplitude.track("Recording Permission Prompt Started");
                const result = await requestPermission();
                amplitude.track("Recording Permission Prompt Completed", {
                    result: (result) ? result.status : '(null)'
                });
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

            //console.log('Starting recording..');
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);

            await determineAudioInputThreshold(recording);

            // Poll metering level and update the animated scale
            const interval = setInterval(async () => {
                const status = await recording.getStatusAsync();
                const metering_divisor = (Platform.OS == 'ios') ? 30 : 100;
                if (status.isRecording) {
                    //console.log("Unmodified sound level: " + status.metering);
                    meteringLevel.value = withTiming(1 + Math.max(0, 1 + (status.metering / metering_divisor)), { duration: 100 });
                    //console.log(`Platform: ${Platform.OS} - status.metering: ${status.metering} - Metering Level: ${meteringLevel.value} - Metering modifier: ${1 + (status.metering / metering_divisor)}`);

                    // Sound Level Threshold Auto Stop Feature
                    const soundLevel = status.metering || 0;
                    //console.log(`Sound Level ${soundLevel} - Threshold ${audioTreshold.current} - HasBreached ${hasBreachedThreshold.current}`)

                    // Only auto-stop after the user started talking
                    if (soundLevel > (audioTreshold.current + 10)) {
                        hasBreachedThreshold.current = true;
                    }

                    // If sound level drops below audio threshold and they had started talking...
                    if ((soundLevel < audioTreshold.current) && hasBreachedThreshold.current) {
                        if (!silenceTimer.current) {
                            silenceTimer.current = setTimeout(() => {
                                //console.log('Silence detected, processing recording..');
                                processRecording(recording, true);
                                clearTimeout(silenceTimer.current);
                                silenceTimer.current = null;
                            }, SILENCE_DURATION);
                        }
                    } else {
                        clearTimeout(silenceTimer.current);
                        silenceTimer.current = null;
                    }
                }
            }, 100);

            recording.setOnRecordingStatusUpdate((status: Audio.RecordingStatus) => {
                if (!status.isRecording) clearInterval(interval);
            });
            //console.log('Recording started');
            //setErrorMsg(undefined);   // Clear error message if no error
        } catch (err) {
            if (retryCount < 99999999999) { // TODO: Resolve this hack to prevent the "recorder not prepared error"
                startRecording();
                retryCount += 1;
            } else {
                //console.error('Failed to start recording', err);
                amplitude.track("Recording Error Occurred", {
                    anonymous_id: anonymousId.current,
                    pathname: pathname,
                    error: err
                });
                //setErrorMsg(err);
            }
        }
    }

    const determineAudioInputThreshold = async (recordingObject) => {
        //console.log('Determining threshold..');
        const levels = [];
        const DURATION = 1000; // 1 second
        const INTERVAL = 100; // Poll every 100ms

        audioTreshold.current = 999999;
        hasBreachedThreshold.current = false;
        silenceTimer.current = null
        let intervalCounter = 0;
        const interval = setInterval(async () => {
            intervalCounter += 1;
            try {
                const status = await recordingObject.getStatusAsync();
                if (status.isRecording) {
                    const soundLevel = status.metering || 0;
                    levels.push(soundLevel);
                    //console.log("Initial Sound Level: ", soundLevel);
                }
                if (intervalCounter * INTERVAL == DURATION) {
                    const avgLevel = levels.reduce((sum, level) => sum + level, 0) / levels.length;
                    const dynamicThreshold = avgLevel + 0.05; // Slightly above the average
                    //console.log('Dynamic Threshold Set To:', dynamicThreshold);
                    audioTreshold.current = dynamicThreshold;
                    clearInterval(interval);
                }
            } catch (error) {
                console.error('Error while determining threshold', error);
                clearInterval(interval);
            }
        }, 100);
    }

    const stopRecording = async (localRecordingObject = null, isAutoStop = false): Promise<string> => {
        const recordingDurationEnd = performance.now();
        amplitude.track("Recording Stopped", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            durationSeconds: (recordingDurationEnd - recordingTimeStart.current) / 1000,
            stop_type: (isAutoStop) ? 'auto' : 'manual'
        });
        //console.log('Stopping recording..');
        let uri;
        if (recording) {
            //console.log("Audio manually stopped");
            await recording.stopAndUnloadAsync();
            uri = recording.getURI();
        } else if (localRecordingObject) {
            //console.log("Audio automatically stopped");
            if (localRecordingObject.stopAndUnloadAsync != undefined) {
                await localRecordingObject.stopAndUnloadAsync();
            }
            uri = localRecordingObject.getURI();
        }  
        setRecording(undefined);
        await Audio.setAudioModeAsync(
            {
                allowsRecordingIOS: false,
            }
        );
        meteringLevel.value = withTiming(1); // reset scale when stopped
        
        //console.log('Recording stopped and stored at', uri);
        return uri;
    }

    // if button was pressed while recording was already processed,
    // the current processing may be taking too long; treat the user action as
    // an attempt to cancel the recording and try again
    const cancelRecordingProcessing = async () => {
        //console.log("Cancelling recording...");
        if (recording) {
            const fileUri = await stopRecording();
            deleteFile(fileUri);
        }
        setIsRecordingProcessing(false);
        //console.log("Recording cancelled...");
        amplitude.track("Recording Processing Cancelled", {
            anonymous_id: anonymousId.current,
            pathname: pathname
        });
    }

    const processRecording = async (localRecordingObject = null, isAutoStop = false) => {
        //console.log(`processingRecording - localRecordingObject: ${localRecordingObject}`);
        //console.log(`recorderProcessLocked.current: ${recorderProcessLocked.current}`)

        if (recorderProcessLocked.current) {
            console.log("Recorder already processing, exiting...");
            return;
        }

        recorderProcessLocked.current = true;

        amplitude.track("Recording Processing Started", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            stop_type: (isAutoStop) ? 'auto' : 'manual'
        });
        setIsRecordingProcessing(true);
        const fileUri = await stopRecording(localRecordingObject, isAutoStop);
        const response = await callBackendTranscribeService(fileUri);
        amplitude.track("Recording Processing Completed", {
            anonymous_id: anonymousId.current,
            flagged: (response == "flagged"),
            thing_count: (response && response.length >= 0) ? response.length : -1,
            pathname: pathname
        });

        if (response == "flagged") {
            //console.log(`Audio flagged, displaying alert prompt`);
            amplitude.track("Recording Flagged", {
                anonymous_id: anonymousId.current,
                pathname: pathname
            });
            amplitude.track("Recording Flagged Prompt Displayed", {
                anonymous_id: anonymousId.current,
                pathname: pathname
            });
            Alert.alert(
                'Content Advisory', // Title of the alert
                'Our app detected language that may not align with our guidelines for a safe and supportive experience. Please consider using positive, constructive expressions.', // Message of the alert
                [
                    {
                        text: 'I Understand',
                        onPress: () => {
                            //console.log('Audio Content Advisory Acknowledgement button Pressed');
                            amplitude.track("Recording Flagged Prompt Dismissed", {
                                anonymous_id: anonymousId.current,
                                pathname: pathname
                            });
                        },
                    },
                ]
            );
        } else {
            //const response =  generateStubData(); 
            //console.log(`Transcribed audio into ${response.length} items: ${JSON.stringify(response)}`);

            if (listArray && response && response.length > 0) {
                lastRecordedCount.current = response.length;  // Set for future toast undo potential

                // Set UI flag to inform user that counts may change after async backend save complete
                // Update v1.1.1:  Commented out counts_updating as item counts refresh on any update
                // for (var i = 0; i < response.length; i++) {
                //     response[i].counts_updating = true; 
                // }


                if (listArray.length == 0) {

                    // Assume the empty list CTA is visible, so fade it out first
                    //("Attempting to fade out empty CTA animation...");
                    // console.log("Current emptyListCTAOpacity value: " + JSON.stringify(emptyListCTAOpacity));
                    // emptyListCTAFadeOutAnimation.reset();
                    // emptyListCTAOpacity.current = 1;
                    // console.log("Current emptyListCTAOpacity value: " + JSON.stringify(emptyListCTAOpacity));

                    emptyListCTAFadeOutAnimation.start(() => {

                        //If list is initially empty, fade in the new list
                        listArraySetterFunc((prevThings) => response.concat(prevThings));

                        // fadeInListOnRender.current = true;
                        // listFadeInAnimation.start(() => {
                        //     fadeInListOnRender.current = false;
                        //     listFadeInAnimation.reset();
                        // });

                        emptyListCTAFadeOutAnimation.reset();
                    });
                } else {

                    // TODO:  When appending, move current list down and to insert new items
                    listArraySetterFunc((prevThings) => response.concat(prevThings));
                }

                // Make sure this function is asynchronous!!!
                var updatedItems = response.concat(listArray);
                saveAllThingsFunc(updatedItems, () => {
                    ListItemEventEmitter.emit("items_saved");
                });
            } else {
                //console.log("Did not call setter with updated list, attempting to show toast.");
                amplitude.track("Empty Recording Toast Displayed", {
                    anonymous_id: anonymousId.current,
                    pathname: pathname
                });
                Toast.show({
                    type: 'msgWithLink',
                    text1: `Please try again.`,
                    position: 'bottom',
                    bottomOffset: 220
                });
            }
        }
        setIsRecordingProcessing(false);
        recorderProcessLocked.current = false;      // Reset process lock for future
        //console.log("Finished parsing file, deleting...");
        deleteFile(fileUri);
    }

    const callBackendTranscribeService = async (fileUri: string) => {
        return await transcribeFunction(fileUri, anonymousId.current);
    }

    const cancelRecording = async () => {
        //console.log("Cancelling recording...");
        const fileUri = await stopRecording();
        //console.log("Deleting file..");
        deleteFile(fileUri);
    }

    const deleteFile = async (fileUri: string) => {
        try {
            // Check if the file exists
            const fileExists = await RNFS.exists(fileUri);

            if (fileExists) {
                // Delete the file
                await RNFS.unlink(fileUri);
                //console.log('File deleted successfully');
            } else {
                //console.log('File does not exist');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    };

    const recordButtonOpacityAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: recordButtonOpacity.value,
        };
    });

    const recordButton_handlePressIn = () => {
        recordButtonOpacity.value = withTiming(0.7, { duration: 150 }); // Dim button on press
    };

    const recordButton_handlePressOut = () => {
        recordButtonOpacity.value = withTiming(1, { duration: 150 }); // Return to full opacity
    };

    const styles = StyleSheet.create({
        footerContainer: {
            backgroundColor: '#FAF3E0',
            alignItems: 'center',
            height: (hideRecordButton) ? 142 : 158
        },
        bannerAdContainer: {
            position: 'absolute',
            bottom: 40
        },
        footerButton: {
            height: 76,
            width: 76,
            borderRadius: 38,
            borderColor: '#3E2723',
            borderWidth: 1,
            position: 'absolute',
            bottom: 120,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center'
        },
        footerButton_Underlay: {
            height: 76,
            width: 76,
            borderRadius: 38,
            position: 'absolute',
            bottom: 120,
            backgroundColor: 'black'
        },
        footerButtonImage_Record: {
            height: 43,
            width: 43
        },
        footerButtonImage_Restart: {
            height: 43,
            width: 43
        },
        footerButtonImage_Cancel: {
            height: 43,
            width: 43
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
        loadingAnim: {
            margin: 10,
            position: 'relative',
            left: 1
        },
        footerButtonIcon_Stop: {
            width: 25,
            height: 25,
            backgroundColor: 'white'
        }
    });

    // Animated style for scaling the button
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: meteringLevel.value }],
    }));

    const makeTestData = () => {
        const testData = [
            {
                "uuid": 1,
                "text": "take a bath",
                "is_done": false,
                "is_deleted": false
            },
            {
                "uuid": 2,
                "text": "make waffles",
                "is_done": false,
                "is_deleted": false
            },
            {
                "uuid": 3,
                "text": "do some jumping jacks",
                "is_done": false,
                "is_deleted": false
            },
            {
                "uuid": 4,
                "text": "take a ride a bike",
                "is_done": false,
                "is_deleted": false
            }
        ];
        listArraySetterFunc(testData);

    }

    if (!hideRecordButton) {
        return (
            <Animated.View style={[(pathname == ITEMS_PATHNAME) && { opacity }, styles.footerContainer]}>
                {/* <Pressable
                    style={[styles.footerButton, styles.cancelButton]}
                    onPress={makeTestData}>
                    <Text>Test Data</Text>
                </Pressable> */}
                <View style={styles.footerButton_Underlay}></View>
                <Reanimated.View style={[animatedStyle, styles.footerButton, ((recording || isRecordingProcessing) ? styles.stopRecordButton : styles.recordButton), recordButtonOpacityAnimatedStyle]}>
                    <Pressable
                        onPress={() => {
                            if (isRecordingProcessing) {
                                cancelRecordingProcessing();
                            } else if (recording) {
                                processRecording();
                            } else {
                                startRecording();
                            }
                        }}
                        onPressIn={recordButton_handlePressIn}
                        onPressOut={recordButton_handlePressOut}>
                        {(isRecordingProcessing) ?
                            <View style={styles.loadingAnim}>
                                <ActivityIndicator size={"large"} color="white" />
                            </View>
                            : (recording) ?
                                <View style={styles.footerButtonIcon_Stop}></View>
                                : <Image style={styles.footerButtonImage_Record} source={require("@/assets/images/microphone_white.png")} />}
                    </Pressable>
                </Reanimated.View>
                <View style={styles.bannerAdContainer}>
                    <BannerAd ref={bannerRef} unitId={bannerAdId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} 
                            onPaid={() => amplitude.track("Banner Ad Paid")}
                            onAdLoaded={() => amplitude.track("Banner Ad Loaded")}
                            onAdOpened={() => amplitude.track("Banner Ad Opened")}
                            onAdFailedToLoad={() => amplitude.track("Banner Ad Failed to Load")} />
                </View>
            </Animated.View>
        );
    } else {
        return (
            <View style={styles.footerContainer}>
                <View style={styles.bannerAdContainer}>
                    <BannerAd ref={bannerRef} unitId={bannerAdId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                        onPaid={() => amplitude.track("Banner Ad Paid")}
                        onAdLoaded={() => amplitude.track("Banner Ad Loaded")}
                        onAdOpened={() => amplitude.track("Banner Ad Opened")}
                        onAdFailedToLoad={() => amplitude.track("Banner Ad Failed to Load")} />
                </View>
            </View>
        );
    }
};

export default DootooFooter;