import { View, Pressable, ActivityIndicator, StyleSheet, Platform, Alert } from "react-native";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { Microphone } from "./svg/microphone";
import { Plus } from "./svg/plus";
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useContext, useRef, useState } from "react";
import * as amplitude from '@amplitude/analytics-react-native';
import { usePathname } from "expo-router";
import { AppContext } from "./AppContext";
import { calculateAndroidButtonScale, deleteFile, insertArrayAfter } from "./Helpers";
import Toast from "react-native-toast-message";

const MicButton = ({buttonHeight, buttonUnderlayStyle, buttonStyle, 
                    selectedThing = null, listArray, listArraySetterFunc, transcribeFunc, saveNewThingsFunc }) => {
    const { anonymousId, lastRecordedCount, emptyListCTAFadeOutAnimation } = useContext(AppContext);
    const pathname = usePathname();
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const [recording, setRecording] = useState(null);
    const [isRecordingProcessing, setIsRecordingProcessing] = useState(false);
    const recordButtonOpacity = useSharedValue(1);
    const recordingTimeStart = useRef(null);
    const selectedThingAtRecord = useRef(null);
    const audioTreshold = useRef(0);
    const silenceTimer = useRef(null);
    const SILENCE_DURATION = 1000;  // 1 second
    const hasBreachedThreshold = useRef(false);
    const meteringLevel = useSharedValue(1); // shared value for animated scale
    var retryCount = 0;
    const recorderProcessLocked = useRef(false);


    const startRecording = async (selectedThing = null) => {

        // If Start Recording was invoekd from a thing's swipe action
        // store that thing in a ref so that we can use it to decide
        // where to place the recorded things.  If nothing was selected
        // when record was placed (i.e. record was invoked from footer),
        // reset the selected thing ref so that we just insert based on
        // base behavior.
        if (selectedThing) {
            console.log("Noting selected thing for processing after recording: " + selectedThing.text);
            selectedThingAtRecord.current = selectedThing;
        } else {
            selectedThingAtRecord.current = null;
        }

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
                if (status.isRecording) {
                    //console.log("Unmodified sound level: " + status.metering);
                    meteringLevel.value =
                        (Platform.OS == 'ios')
                            ? withTiming(1 + Math.max(0, 1 + (status.metering / 30)), { duration: 100 })
                            : withTiming(calculateAndroidButtonScale(status.metering), { duration: 100 });
                    //console.log(`Platform: ${Platform.OS} | status.metering: ${status.metering} | Metering Level: ${meteringLevel.value} `);

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

    const processRecording = async (localRecordingObject = null, isAutoStop = false) => {
        //console.log(`processingRecording - localRecordingObject: ${localRecordingObject}`);
        //console.log(`recorderProcessLocked.current: ${recorderProcessLocked.current}`)

        if (recorderProcessLocked.current) {
            console.log("Recorder already processing, exiting...");
            return;
        }

        // Re-renders footer to display loading animation; make
        // sure this happens prior to stop recording so you don't see a flicker
        setIsRecordingProcessing(true);

        const { fileUri, duration } = await stopRecording(localRecordingObject, isAutoStop);
        try {

            if (hasBreachedThreshold.current) {
                recorderProcessLocked.current = true;

                amplitude.track("Recording Processing Started", {
                    anonymous_id: anonymousId.current,
                    pathname: pathname,
                    stop_type: (isAutoStop) ? 'auto' : 'manual'
                });


                const response = await callBackendTranscribeService(fileUri, duration);

                const numScheduledItems = (response) ? response.filter((thing) => thing.scheduled_datetime_utc).length : 0
                //console.log("Number of scheduled items recorded: " + numScheduledItems);
                amplitude.track("Recording Processing Completed", {
                    anonymous_id: anonymousId.current,
                    flagged: (response == "flagged"),
                    thing_count: (response && response.length >= 0) ? response.length : -1,
                    numScheduledItems: numScheduledItems,
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

                        // If list is empty, we ASSume that the empty CTA is visible so we first
                        // fade it out before displaying the list to user.
                        if (listArray.length == 0) {
                            emptyListCTAFadeOutAnimation.start(() => {

                                //If list is initially empty, fade in the new list
                                // If user had nothing selected, simply prepend their new items above
                                // their existing items
                                listArraySetterFunc((prevThings) => {
                                    if (prevThings.length != 0) {
                                        console.error("Prev things unexpectedly non-empty in empty scenario!");
                                    }

                                    const updatedList = response;    // Assuming prevThings is empty
                                    const latestUuidOrder = updatedList.map((thing) => ({ uuid: thing.uuid }));
                                    saveNewThingsFunc(updatedList, latestUuidOrder);
                                    return updatedList;
                                });

                                emptyListCTAFadeOutAnimation.reset();
                            });
                        } else if (selectedThingAtRecord.current) {
                            console.log("Attempting to insert new items above selected item...");

                            // TWO ASSumptions on user's desires being made here:
                            // 
                            // 1) If user invoked recording from a parent item, ASSume the want to 
                            //    place their new recorded things as children directly
                            //    beneath the selected item.  
                            // 
                            // 2) If their tapped item is a child, ASSume the user wants
                            //    their new records to be made children/sibilings as well, so assign the
                            //    same parent and insert beneath the selected child.
                            let recordedThings = response;
                            listArraySetterFunc((prevThings) => {

                                // If selected thing doesn't have a parent, assign all recorded things as children
                                // of selected thing
                                const parentUuidOfSelectedThing = selectedThingAtRecord.current.parent_item_uuid;
                                if (!parentUuidOfSelectedThing) {
                                    console.log("Assigning recorded things as child of selected thing");
                                    recordedThings = recordedThings.map(thing => ({ ...thing, parent_item_uuid: selectedThingAtRecord.current.uuid }));
                                } else {
                                    console.log("Assigning recorded things as siblings of selected thing");
                                    recordedThings = recordedThings.map(thing => ({ ...thing, parent_item_uuid: parentUuidOfSelectedThing }));
                                }

                                // Insert recorded things below the selected thing
                                const idxOfSelectedThing = prevThings.findIndex(thing => thing.uuid == selectedThingAtRecord.current.uuid);
                                const updatedList = insertArrayAfter(prevThings, recordedThings, idxOfSelectedThing);

                                // Make sure this function is asynchronous!!!
                                const latestUuidOrder = updatedList.map((thing) => ({ uuid: thing.uuid }));
                                saveNewThingsFunc(updatedList, latestUuidOrder);

                                return updatedList;
                            });
                        } else {

                            // If user had nothing selected, simply prepend their new items above
                            // their existing items
                            listArraySetterFunc((prevThings) => {
                                const updatedList = response.concat(prevThings);
                                const latestUuidOrder = updatedList.map((thing) => ({ uuid: thing.uuid }));
                                saveNewThingsFunc(updatedList, latestUuidOrder);
                                return updatedList;
                            });
                        }


                    } else {
                        //console.log("Did not call setter with updated list, attempting to show toast.");
                        amplitude.track("Empty Recording Toast Displayed", {
                            anonymous_id: anonymousId.current,
                            pathname: pathname
                        });
                        Toast.show({
                            type: 'msgOpenWidth',
                            text1: `We couldn't transcribe your voice.\n\nPlease try again.`,
                            position: 'bottom',
                            bottomOffset: (Platform.OS == 'ios') ? 260 : 240
                        });
                    }
                }
            } else {
                //console.log("Abandoning audio processing as threshold was not breached; proceeding to file cleanup.");
                Toast.show({
                    type: 'msgOpenWidth',
                    text1: `We couldn't distinguish your voice from the background noise.\n\nPlease try again.`,
                    position: 'bottom',
                    bottomOffset: (Platform.OS == 'ios') ? 260 : 240
                });
            }
        } catch (error) {
            console.error("Unexpected error occurred during recording processing!!", error);
            console.error("Error message:", error.message); // Basic error message
            console.error("Error stack trace:", error.stack); // Full stack trace
            console.error("Full error object:", error); // Log the complete error object
            Alert.alert(
                "An Unexpected Error Occurred",
                "Your voice recording may have been too long or we were unable to transcribe it into items.  Please try again."
            )
        } finally {
            setIsRecordingProcessing(false);
            recorderProcessLocked.current = false;      // Reset process lock for future
            console.log("Finished parsing file, deleting...");
            deleteFile(fileUri);
        }
    }

    const callBackendTranscribeService = async (fileUri: string, durationSeconds: number) => {
        return await transcribeFunc(fileUri, durationSeconds, anonymousId.current);
    }

    const stopRecording = async (localRecordingObject = null, isAutoStop = false) => {
        const recordingDurationEnd = performance.now();
        const recordingDuration = (recordingDurationEnd - recordingTimeStart.current) / 1000;
        amplitude.track("Recording Stopped", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            durationSeconds: recordingDuration,
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
        return { fileUri: uri, duration: recordingDuration }
    }

    // 1.6 Keeping this func around incase we use it in future
    // // if button was pressed while recording was already processed,
    // // the current processing may be taking too long; treat the user action as
    // // an attempt to cancel the recording and try again
    // const cancelRecordingProcessing = async () => {
    //     //console.log("Cancelling recording...");
    //     if (recording) {
    //         const { fileUri, duration } = await stopRecording();
    //         deleteFile(fileUri);
    //         amplitude.track("Recording Processing Cancelled", {
    //             anonymous_id: anonymousId.current,
    //             pathname: pathname,
    //             durationSeconds: duration
    //         });
    //     }
    //     setIsRecordingProcessing(false);
    //     //console.log("Recording cancelled...");
    // }

    const styles = StyleSheet.create({
        stopRecordButton: {
            backgroundColor: '#A23E48',
        },
        recordButton: {
            backgroundColor: '#556B2F',
        },
        loadingAnim: {
            margin: 10,
            position: 'relative',
            left: 1
        },
        micButtonIcon_Stop: {
            width: 18,
            height: 18,
            backgroundColor: 'white'
        },
        iconPlusContainer: {
            position: 'relative'
        },
        plusContainer: {
            position: 'absolute',
            right: -5,
            top: -5
        },
    });

    const recordButton_handlePressIn = () => {
        recordButtonOpacity.value = withTiming(0.7, { duration: 150 }); // Dim button on press
    };

    const recordButton_handlePressOut = () => {
        recordButtonOpacity.value = withTiming(1, { duration: 150 }); // Return to full opacity
    };

    const scaleAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: meteringLevel.value }],
    }));

    return (
        <View style={{height: buttonHeight}}>
            <View style={buttonUnderlayStyle}></View>
            <Reanimated.View style={[buttonStyle, scaleAnimatedStyle,
                ((recording || isRecordingProcessing)
                    ? styles.stopRecordButton
                    : styles.recordButton),
                { opacity: recordButtonOpacity }]}>
                <Pressable
                    disabled={isRecordingProcessing}
                    onPress={() => {
                        if (!isRecordingProcessing) {
                            if (recording) {
                                processRecording();
                            } else {
                                startRecording(selectedThing);
                            }
                        }
                    }}
                    onPressIn={recordButton_handlePressIn}
                    onPressOut={recordButton_handlePressOut}>
                    {(isRecordingProcessing) ?
                        <View style={styles.loadingAnim}>
                            <ActivityIndicator size={"small"} color="white" />
                        </View>
                        : (recording) ?
                            <View style={styles.micButtonIcon_Stop}></View>
                            : <View style={styles.iconPlusContainer}>
                                <Microphone wxh={27} />
                                <View style={styles.plusContainer}>
                                    <Plus wxh="15" color="white" bgColor="#556B2F" bgStrokeWidth="8" />
                                </View>
                            </View>
                    }
                </Pressable>
            </Reanimated.View>
        </View>
    );

}

export default MicButton;