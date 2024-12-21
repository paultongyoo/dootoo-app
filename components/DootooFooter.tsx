import { Platform, Text, View, StyleSheet, Pressable, ActivityIndicator, Alert, AppState } from "react-native";
import { AppContext } from './AppContext.js';
import { useState, useContext, useRef, useEffect } from "react";
import mobileAds, { BannerAd, TestIds, useForeground, BannerAdSize } from 'react-native-google-mobile-ads';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as amplitude from '@amplitude/analytics-react-native';
import { usePathname } from 'expo-router';
import { checkOpenAPIStatus } from "./BackendServices.js";
import Animated from "react-native-reanimated";
import { generateNewKeyboardEntry } from './Helpers'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Keyboard } from "./svg/keyboard";
import { Plus } from "./svg/plus";
import MicButton from "./MicButton";

const DootooFooter = ({ listArray, listArraySetterFunc, saveNewThingsFunc, transcribeFunction, hideRecordButton = false }) => {

    const pathname = usePathname();
    const { anonymousId, currentlyTappedThing, emptyListCTAFadeOutAnimation } = useContext(AppContext);
    const keyboardButtonOpacity = useSharedValue(1);

    const bannerAdId = __DEV__ ?
        TestIds.ADAPTIVE_BANNER :
        (Platform.OS === 'ios' ? "ca-app-pub-6723010005352574/5609444195" :
            "ca-app-pub-6723010005352574/8538859865");
    const bannerRef = useRef<BannerAd>(null);

    const opacity = useSharedValue(0);

    const ITEMS_PATHNAME = "/meDrawer/communityDrawer/stack";

    useEffect(() => {
        if (!hideRecordButton) {
            checkOpenAPIHealth();
        }

        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === "active") {
                checkOpenAPIHealth();
            }
        };
        const subscription = AppState.addEventListener("change", handleAppStateChange);

        return () => {
            subscription.remove();
        }
    }, []);

    useEffect(() => {

    }, [listArray]);

    const checkOpenAPIHealth = async () => {
        const status = await checkOpenAPIStatus();
        console.log("OpenAPI Health Status: " + status);
        if (status != "operational") {
            amplitude.track("OpenAI API Impacted Prompt Displayed", {
                anonymous_id: anonymousId.current,
                pathname: pathname
            });
            Alert.alert(
                "AI Features May Be Impacted",
                "Please be aware that our AI partner is currently experiencing issues that may impact new voice recordings and text edits.  " +
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

    const handleKeyboardButtonPress = () => {
        const newItem = generateNewKeyboardEntry();
        currentlyTappedThing.current = newItem;

        amplitude.track("Keyboard Entry Started", {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: newItem.uuid
        });

        if (listArray.length == 0) {

            // If the list is empty, we ASSume the empty list CTA is visible.  Fade it out first before
            // adding the first item
            emptyListCTAFadeOutAnimation.start(() => {
                listArraySetterFunc((prevItems) => [newItem, ...prevItems]);
            });
        } else {
            listArraySetterFunc((prevItems) => [newItem, ...prevItems]);
        }
    }

    const insets = useSafeAreaInsets();
    const styles = StyleSheet.create({
        footerContainer: {

            // height: 170,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: "#c0c0c0"
        },
        navigationContainer: {
            width: '100%',
            backgroundColor: '#FAF3E0',
            alignItems: 'center',
            height: 50,
            borderBottomWidth: 1,
            borderBottomColor: "#00000033",
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 4 // Elevation for Android      
        },
        bannerAdContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 20,
            paddingBottom: (insets.bottom && insets.bottom > 0) ? insets.bottom : 10
        },
        footerButton: {
            height: 50,
            width: 50,
            borderRadius: 25,
            borderColor: '#3E2723',
            borderWidth: 1,
            marginRight: 20,
            marginLeft: 20,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 2, height: 4 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: 4, // Elevation for Android        
        },
        footerButton_Underlay: {
            height: 50,
            width: 50,
            borderRadius: 25,
            marginRight: 20,
            marginLeft: 20,
            position: 'absolute',
            top: 0,
            backgroundColor: 'black'
        },
        keyboardButton: {
            backgroundColor: '#556B2F'
        },
        footerButtonsContainer: {
            //backgroundColor: 'orange',
            flexDirection: 'row',
            flex: 1,
            position: 'relative',
            top: -28,
            alignItems: 'center'
        },
        footerButtonContainer: {
            height: 50
        },
        iconPlusContainer: {
            position: 'relative'
        },
        plusContainer: {
            position: 'absolute',
            right: -5,
            top: -5
        },
        bannerAdCopyContainer: {
            alignItems: 'center',
            paddingBottom: 5
        },
        bannerAdCopy: {
            color: '#808080',
            fontSize: 12,
            letterSpacing: 1
        }
    });

    if (!hideRecordButton) {
        return (
            <>
                <Animated.View style={[(pathname == ITEMS_PATHNAME) && { opacity }, styles.footerContainer]}>
                    <View style={styles.navigationContainer}>
                        <View style={styles.footerButtonsContainer}>
                            <View style={styles.footerButtonContainer}>
                                <MicButton listArray={listArray} 
                                           listArraySetterFunc={listArraySetterFunc} 
                                           saveNewThingsFunc={saveNewThingsFunc} 
                                           transcribeFunc={transcribeFunction} />
                            </View>
                            <View style={styles.footerButtonContainer}>
                                <View style={styles.footerButton_Underlay}></View>
                                <Reanimated.View style={[styles.footerButton, styles.keyboardButton, { opacity: keyboardButtonOpacity }]}>
                                    <Pressable
                                        onPress={handleKeyboardButtonPress}
                                        onPressIn={() => keyboardButtonOpacity.value = withTiming(0.7, { duration: 150 })}
                                        onPressOut={() => keyboardButtonOpacity.value = withTiming(1, { duration: 150 })}>
                                        <View style={styles.iconPlusContainer}>
                                            <Keyboard wxh={27} />
                                            <View style={styles.plusContainer}>
                                                <Plus wxh="15" color="white" bgColor="#556B2F" bgStrokeWidth="8" />
                                            </View>
                                        </View>
                                    </Pressable>
                                </Reanimated.View>
                            </View>
                        </View>
                    </View>
                    <View style={styles.bannerAdContainer}>
                        <View style={styles.bannerAdCopyContainer}>
                            <Text style={styles.bannerAdCopy}>ADVERTISEMENT</Text>
                        </View>
                        <BannerAd ref={bannerRef} unitId={bannerAdId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                            onPaid={() => amplitude.track("Banner Ad Paid")}
                            onAdLoaded={() => amplitude.track("Banner Ad Loaded")}
                            onAdOpened={() => amplitude.track("Banner Ad Opened")}
                            onAdFailedToLoad={() => amplitude.track("Banner Ad Failed to Load")} />
                    </View>
                </Animated.View>
            </>
        );
    } else {
        return (
            <>
                <View style={styles.footerContainer}>
                    <View style={styles.navigationContainer}>
                        { /* TODO */ }
                    </View>
                    <View style={styles.bannerAdContainer}>
                        <BannerAd ref={bannerRef} unitId={bannerAdId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                            onPaid={() => amplitude.track("Banner Ad Paid")}
                            onAdLoaded={() => amplitude.track("Banner Ad Loaded")}
                            onAdOpened={() => amplitude.track("Banner Ad Opened")}
                            onAdFailedToLoad={() => amplitude.track("Banner Ad Failed to Load")} />
                    </View>
                </View>
            </>
        );
    }
};

export default DootooFooter;