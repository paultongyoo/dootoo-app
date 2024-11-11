import { Platform, Image, Text, View, StyleSheet, Pressable, ActivityIndicator, Animated } from "react-native";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import RNFS from 'react-native-fs';
import { AppContext } from './AppContext.js';
import { useState, useContext, useRef, useEffect } from "react";
import mobileAds, { BannerAd, TestIds, useForeground, BannerAdSize } from 'react-native-google-mobile-ads';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const DootooFooter = ({ transcribeFunction, listArray, listArraySetterFunc, saveAllThingsFunc, hideRecordButton = false }) => {
    const { anonymousId,
        setLastRecordedCount } = useContext(AppContext);
    const [loading, setLoading] = useState(false);
    const [recording, setRecording] = useState();
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const meteringLevel = useSharedValue(1); // shared value for animated scale
    const recordButtonOpacity = useSharedValue(1);

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

            // Poll metering level and update the animated scale
            const interval = setInterval(async () => {
                const status = await recording.getStatusAsync();
                const metering_divisor = (Platform.OS == 'ios') ? 30 : 100;
                if (status.isRecording) {
                    meteringLevel.value = withTiming(1 + Math.max(0, 1 + (status.metering / metering_divisor)), { duration: 100 });
                    console.log(`Platform: ${Platform.OS} - status.metering: ${status.metering} - Metering Level: ${meteringLevel.value} - Metering modifier: ${1 + (status.metering / metering_divisor)}`);
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
                console.error('Failed to start recording', err);
                //setErrorMsg(err);
            }
        }
    }

    const processRecording = async () => {
        setLoading(true);
        const fileUri = await stopRecording();
        const response = await callBackendTranscribeService(fileUri);
        //const response =  generateStubData(); 
        console.log(`Transcribed audio into ${response.length} items: ${JSON.stringify(response)}`);
        setLoading(false);

        if (listArray && response && response.length > 0) {
            setLastRecordedCount(response.length);  // Set for future toast undo potential

            var updatedItems = response.concat(listArray);
            listArraySetterFunc(updatedItems);

            // Make sure this function is asynchronous!!!
            saveAllThingsFunc(updatedItems);
        } else {
            console.log("Did not call setter with updated list");
        }

        console.log("Finished parsing file, deleting...");
        deleteFile(fileUri);
    }

    const stopRecording = async (): Promise<string> => {
        console.log('Stopping recording..');
        setRecording(undefined);
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync(
            {
                allowsRecordingIOS: false,
            }
        );
        meteringLevel.value = withTiming(1); // reset scale when stopped
        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);
        return uri;
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
                        <Image style={styles.footerButtonImage_Cancel} source={require("../assets/images/cancel_icon_black.png")} />
                    </Pressable>
                    : <></>} */}
                <View style={styles.footerButton_Underlay}></View>
                <Reanimated.View style={[animatedStyle, styles.footerButton, ((recording || loading) ? styles.stopRecordButton : styles.recordButton), recordButtonOpacityAnimatedStyle]}>
                    <Pressable
                        onPress={(recording) ? processRecording : startRecording }
                        onPressIn={recordButton_handlePressIn}
                        onPressOut={recordButton_handlePressOut}>
                        {(loading) ?
                            <View style={styles.loadingAnim}>
                                <ActivityIndicator size={"large"} color="white" />
                            </View> : (recording) ?
                                <View style={styles.footerButtonIcon_Stop}></View> :
                                <Image style={styles.footerButtonImage_Record} source={require("../assets/images/microphone_white.png")} />}
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
                    <BannerAd ref={bannerRef} unitId={bannerAdId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
                </View>
            </View>
        );
    }
};

export default DootooFooter;