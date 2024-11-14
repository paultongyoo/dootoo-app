import { Platform, Image, Text, View, StyleSheet, Pressable, ActivityIndicator, Animated, Alert } from "react-native";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import RNFS from 'react-native-fs';
import { AppContext } from './AppContext.js';
import { useState, useContext, useRef, useEffect } from "react";
import mobileAds, { BannerAd, TestIds, useForeground, BannerAdSize } from 'react-native-google-mobile-ads';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Toast from "react-native-toast-message";
import * as amplitude from '@amplitude/analytics-react-native';
import { usePathname } from 'expo-router'; 

const DootooFooter = ({ transcribeFunction, listArray, listArraySetterFunc, saveAllThingsFunc, hideRecordButton = false }) => {
    const pathname = usePathname();
    const { anonymousId,
        setLastRecordedCount } = useContext(AppContext);
    const [isRecordingProcessing, setIsRecordingProcessing] = useState(false);
    const [recording, setRecording] = useState();
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const meteringLevel = useSharedValue(1); // shared value for animated scale
    const recordButtonOpacity = useSharedValue(1);
    const recordingTimeStart = useRef(null);        // Var used for calculating time

    const bannerAdId = __DEV__ ?
        TestIds.ADAPTIVE_BANNER :
        (Platform.OS === 'ios' ? "ca-app-pub-6723010005352574/5609444195" :
            "ca-app-pub-6723010005352574/8538859865");
    const bannerRef = useRef<BannerAd>(null);
    var retryCount = 0;

    useEffect(() => {
        initializeMobileAds();
    }, []);

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
            anonymous_id: anonymousId,
            pathname: pathname
        });
        try {
            if (permissionResponse!.status !== 'granted') {
                //console.log('Requesting permission..');
                amplitude.track("Recording Permission Prompt Started");
                const result = await requestPermission();
                amplitude.track("Recording Permission Prompt Completed", {result: result});
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

            // Poll metering level and update the animated scale
            const interval = setInterval(async () => {
                const status = await recording.getStatusAsync();
                const metering_divisor = (Platform.OS == 'ios') ? 30 : 100;
                if (status.isRecording) {
                    meteringLevel.value = withTiming(1 + Math.max(0, 1 + (status.metering / metering_divisor)), { duration: 100 });
                    //console.log(`Platform: ${Platform.OS} - status.metering: ${status.metering} - Metering Level: ${meteringLevel.value} - Metering modifier: ${1 + (status.metering / metering_divisor)}`);
                }
            }, 100);

            recording.setOnRecordingStatusUpdate((status: Audio.RecordingStatus) => {
                if (!status.isRecording) clearInterval(interval);
            });
            console.log('Recording started');
            //setErrorMsg(undefined);   // Clear error message if no error
        } catch (err) {
            if (retryCount < 99999999999) { // TODO: Resolve this hack to prevent the "recorder not prepared error"
                startRecording();
                retryCount += 1;
            } else {
                //console.error('Failed to start recording', err);
                amplitude.track("Recording Error Occurred", { 
                    anonymous_id: anonymousId,
                    pathname: pathname,
                    error: err
                 });
                //setErrorMsg(err);
            }
        }
    }

    const stopRecording = async (): Promise<string> => {
        const recordingDurationEnd = performance.now();
        // console.log("Logging end time: " + new Date(recordingDurationEnd).toLocaleString());
        // console.log("Recalling start time: " + new Date(recordingTimeStart.current).toLocaleString());
        // console.log("Recording Duration: " + (recordingDurationEnd - recordingTimeStart.current)/1000);
        amplitude.track("Recording Stopped", {
            anonymous_id: anonymousId,
            pathname: pathname,
            durationSeconds: (recordingDurationEnd - recordingTimeStart.current)/1000
        });
        //console.log('Stopping recording..');
        setRecording(undefined);
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync(
            {
                allowsRecordingIOS: false,
            }
        );
        meteringLevel.value = withTiming(1); // reset scale when stopped
        const uri = recording.getURI();
        //console.log('Recording stopped and stored at', uri);
        return uri;
    }

    // if button was pressed while recording was already processed,
    // the current processing may be taking too long; treat the user action as
    // an attempt to cancel the recording and try again
    const cancelRecordingProcessing = async() => {
        console.log("Cancelling recording...");
        const fileUri = await stopRecording();
        deleteFile(fileUri);
        setIsRecordingProcessing(false);
        console.log("Recording cancelled...");
        amplitude.track("Recording Processing Cancelled", {
            anonymous_id: anonymousId,
            pathname: pathname
        });
    }

    const processRecording = async () => {
        amplitude.track("Recording Processing Started", {
            anonymous_id: anonymousId,
            pathname: pathname
        });
        setIsRecordingProcessing(true);
        const fileUri = await stopRecording();
        const response = await callBackendTranscribeService(fileUri);
        amplitude.track("Recording Processing Completed", {
            anonymous_id: anonymousId,
            flagged: (response == "flagged"),
            thing_count: (response && response.length >= 0) ? response.length : -1,
            pathname: pathname
        });

        if (response == "flagged") {
            //console.log(`Audio flagged, displaying alert prompt`);
            amplitude.track("Recording Flagged", {
                anonymous_id: anonymousId,
                pathname: pathname  
            });
            amplitude.track("Recording Flagged Prompt Displayed", {
                anonymous_id: anonymousId,
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
                                anonymous_id: anonymousId,
                                pathname: pathname  
                            });
                        },
                    },
                ]
            );
        } else {
            //const response =  generateStubData(); 
            console.log(`Transcribed audio into ${response.length} items: ${JSON.stringify(response)}`);
            
            if (listArray && response && response.length > 0) {
                setLastRecordedCount(response.length);  // Set for future toast undo potential

                // Set UI flag to inform user that counts may change after async backend save complete
                for (var i = 0; i < response.length; i++) {
                    response[i].counts_updating = true; 
                }

                var updatedItems = response.concat(listArray);
                listArraySetterFunc(updatedItems);

                // Make sure this function is asynchronous!!!
                saveAllThingsFunc(updatedItems);
            } else {
                console.log("Did not call setter with updated list, attempting to show toast.");
                amplitude.track("Empty Recording Toast Displayed", {
                    anonymous_id: anonymousId,
                    pathname: pathname  
                });
                Toast.show({
                    type: 'msgOnlyToast',
                    text1: `Please try again.`,
                    position: 'bottom',
                    bottomOffset: 220
                });
            }
        }
        setIsRecordingProcessing(false);
        console.log("Finished parsing file, deleting...");
        deleteFile(fileUri);
    }

    const callBackendTranscribeService = async (fileUri: string) => {
        return await transcribeFunction(fileUri, anonymousId);
    }

    const cancelRecording = async () => {
        console.log("Cancelling recording...");
        const fileUri = await stopRecording();
        console.log("Deleting file..");
        deleteFile(fileUri);
    }

    const deleteFile = async (fileUri: string) => {
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
            height: 158
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

    if (!hideRecordButton) {
        return (
            <View style={styles.footerContainer}>
                {/* {recording ?
                    <Pressable
                        style={[styles.footerButton, styles.cancelButton]}
                        onPress={cancelRecording}>
                        <Image style={styles.footerButtonImage_Cancel} source={require("@/assets/images/cancel_icon_black.png")} />
                    </Pressable>
                    : <></>} */}
                <View style={styles.footerButton_Underlay}></View>
                <Reanimated.View style={[animatedStyle, styles.footerButton, ((recording || isRecordingProcessing) ? styles.stopRecordButton : styles.recordButton), recordButtonOpacityAnimatedStyle]}>
                    <Pressable
                        onPress={(isRecordingProcessing) ? cancelRecordingProcessing : ((recording) ? processRecording : startRecording) }
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
                    <BannerAd ref={bannerRef} unitId={bannerAdId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
                </View>
            </View>
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