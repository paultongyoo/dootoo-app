import { Platform, Text, View, StyleSheet, Pressable, ActivityIndicator, Alert, AppState } from "react-native";
import { AppContext } from './AppContext.js';
import { useContext, useRef, useEffect } from "react";
import mobileAds, { BannerAd, TestIds, useForeground, BannerAdSize } from 'react-native-google-mobile-ads';
import Reanimated, { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import * as amplitude from '@amplitude/analytics-react-native';
import { usePathname } from 'expo-router';
import { checkOpenAPIStatus } from "./BackendServices.js";
import Animated from "react-native-reanimated";
import { generateNewKeyboardEntry } from './Helpers'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Keyboard } from "./svg/keyboard";
import { Plus } from "./svg/plus";
import MicButton from "./MicButton";
import { List } from "./svg/list";
import { CircleCheck } from "./svg/circle-check";
import { UserRound } from "./svg/user-round";

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
    const FOOTER_BUTTON_HEIGHT = 50;

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
        footerButtonsContainer: {
            flexDirection: 'row',
            flex: 1,
            position: 'relative',
            top: -95,
            alignItems: 'center'
        },
        footerButtonContainer: {
            height: 50
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
        },
        sectionContainer: {

        },
        iconContainer: {
            flexDirection: 'row',
            height: 48,
            justifyContent: 'center',
            alignItems: 'center'
        },
        sectionIconContainer: {
            position: 'relative',   // For positioning any badging
            paddingRight: 28,       // Keep these synced with currentSectionIndicator margin
            paddingLeft: 28
        },
        currentSectionIndicator: {
            marginLeft: 18,         // Keep these synced with sectionIcon padding
            marginRight: 18,
            width: 42,
            height: 3,
            backgroundColor: "#3E2723"
        }
    });

    const barTranslateX = useSharedValue(0);
    const animateCurrentSectionIndicator = (sectionIndex) => {
        // 0 = First section
        // 1 = Second section
        // 2 = Third Section
        barTranslateX.value = withTiming(sectionIndex * 80, {
            duration: 150,
            easing: Easing.out(Easing.exp)
        });
    }

    if (!hideRecordButton) {
        return (
            <>
                <Animated.View style={[(pathname == ITEMS_PATHNAME) && { opacity }, styles.footerContainer]}>
                    <View style={styles.navigationContainer}>
                        <View style={styles.sectionContainer}>
                            <Animated.View style={[styles.currentSectionIndicator, {transform: [{ translateX: barTranslateX }]}]}></Animated.View>
                            <View style={styles.iconContainer}>
                                <Pressable hitSlop={10} style={styles.sectionIconContainer} onPress={() => {
                                    animateCurrentSectionIndicator(0);
                                    //Alert.alert("Implement Me!")
                                }}>
                                    <List wxh="24" color="#3E2723" />
                                </Pressable>
                                <Pressable hitSlop={10} style={styles.sectionIconContainer} onPress={() => {
                                    animateCurrentSectionIndicator(1);
                                    //Alert.alert("Implement Me!")
                                }}>
                                    <CircleCheck wxh="24" color="#3E2723" />
                                </Pressable>
                                <Pressable hitSlop={10} style={styles.sectionIconContainer} onPress={() => {
                                    animateCurrentSectionIndicator(2);
                                    //Alert.alert("Implement Me!")
                                }}>
                                    <UserRound wxh="24" color="#3E2723" />
                                </Pressable>
                            </View>
                        </View>
                        <View style={styles.footerButtonsContainer}>
                            <MicButton 
                                buttonHeight={FOOTER_BUTTON_HEIGHT} 
                                buttonUnderlayStyle={styles.footerButton_Underlay} 
                                buttonStyle={styles.footerButton}
                                listArray={listArray}
                                listArraySetterFunc={listArraySetterFunc}
                                saveNewThingsFunc={saveNewThingsFunc}
                                transcribeFunc={transcribeFunction} />
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