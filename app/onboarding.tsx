import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet, Platform, Pressable, Image, Alert, GestureResponderEvent, Linking } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as amplitude from '@amplitude/analytics-react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DootooItemSidebar from '@/components/DootooItemSidebar';
import { generateUsername } from '@/components/Storage';

const { width: screenWidth } = Dimensions.get('window');


const OnboardingScreen = () => {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const translationX = useRef(new Animated.Value(0)).current;

    const onSwipe = ({ nativeEvent }) => {
        if (nativeEvent.state === State.END) {
            const { translationX } = nativeEvent;
            
            if (translationX < -50) {
                swipeLeft();
            } else if (translationX > 50) {
                swipeRight();
            }
        }
    };

    // Go forward
    const swipeLeft = () => {
        if (step < 5) {
            Animated.timing(translationX, {
                toValue: -screenWidth,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setStep((prev) => prev + 1);
                translationX.setValue(0);
            });
        } else {
            completeOnboarding();
        }
    }

    // Go back
    const swipeRight = () => {
        if (step > 1) {
            Animated.timing(translationX, {
                toValue: screenWidth,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setStep((prev) => prev - 1);
                translationX.setValue(0);
            });
        }
    }

    const completeOnboarding = async () => {
        if (Platform.OS == 'ios') {
            const result = await check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
            if (result === RESULTS.DENIED) {

                // The permission has not been requested, so request it.
                amplitude.track("iOS ATT Prompt Started");
                const result = await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
                amplitude.track("iOS ATT Prompt Completed", { result: result });
            }
        }

        await AsyncStorage.setItem('isFirstLaunch', 'false');
        router.replace('/drawer/stack');
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#DCC7AA',
            justifyContent: 'center'
        }
    });

    return (
        <View style={styles.container}>
            {(step > 1) ? <OnboardingHeader swipeLeft={swipeRight} />
                : <></>}

            <PanGestureHandler onHandlerStateChange={onSwipe}>
                <Animated.View style={{ transform: [{ translateX: translationX }] }}>
                    {
                        (step == 1) ? <Step1 />
                            : (step == 2) ? <Step2 />
                                : (step == 3) ? <Step3 />
                                    : (step == 4) ? <Step4 />
                                        : (step == 5) ? <Step5 />
                                            : <Text>You should never see this!!</Text>
                    }
                </Animated.View>
            </PanGestureHandler>

            <OnboardingFooter step={step} onForwardButtonPress={swipeLeft} />
        </View>
    );
};

const Step1 = () => {
    const fadeIn = useRef(new Animated.Value(0)).current;
    const fadeInAnimation = Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
    });

    useEffect(() => {
        fadeInAnimation.start();
        amplitude.track("Onboarding Step 1 Viewed");
    }, []);

    const styles = StyleSheet.create({
        container: {
            paddingLeft: 40,
            paddingRight: 40
        },
        centerCopy: {
            fontSize: 40,
            color: '#3E2723'
        },
        red: {
            color: '#A23E48'
        },
        green: {
            color: '#556B2F'
        }
    });

    return (
        <Animated.View style={[styles.container, { opacity: fadeIn }]}>
            <Text style={styles.centerCopy}>doing things{'\n'}can be <Text style={styles.red}>hard</Text>.</Text>
            <Text style={styles.centerCopy}>doing things{'\n'}<Text style={styles.green}>together is{'\n'}easier</Text>.</Text>
        </Animated.View>
    )
}

const Step2 = () => {

    useEffect(() => {
        amplitude.track("Onboarding Step 2 Viewed");
    }, []);

    const styles = StyleSheet.create({
        container: {
            paddingLeft: 40,
            paddingRight: 40
        },
        centerCopy: {
            fontSize: 40,
            color: '#3E2723'
        },
        green: {
            color: '#556B2F'
        },
        micAndVoice: {
            position: 'relative',
            marginBottom: 60
        },
        voiceContainer: {
            width: '65%'
        },
        voiceCopy: {
            fontSize: 24,
            fontStyle: 'italic',
            lineHeight: 32
        },
        micContainer: {
            position: 'absolute',
            bottom: -30,
            right: 0
        },
        micImage: {
            width: 150,
            height: 201
        }
    });

    return (
        <View style={styles.container}>
            <View style={styles.micAndVoice}>
                <View style={styles.micContainer}>
                    <Image style={styles.micImage} source={require('@/assets/images/microphone_white.png')} />
                </View>
                <View style={styles.voiceContainer}>
                    <Text style={styles.voiceCopy}>"alright...first I gotta <Text style={styles.green}>drop off my kid at school</Text>...and then I'm
                        gonna <Text style={styles.green}>go for a run</Text>...when I come back I
                        gotta <Text style={styles.green}>resume my job search</Text>....which
                        starts with <Text style={styles.green}>updating my resume</Text>..”</Text>
                </View>
            </View>
            <Text style={styles.centerCopy}>start by <Text style={styles.green}>naturally speaking</Text> what you have to do.</Text>
        </View>
    );
}

const Step3 = () => {

    useEffect(() => {
        amplitude.track("Onboarding Step 3 Viewed");
    }, []);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#DCC7AA',
            justifyContent: 'center'
        },
        onboardingCopyContainer: {
            paddingLeft: 40,
            paddingRight: 40
        },
        centerCopy: {
            fontSize: 40,
            color: '#3E2723'
        },
        red: {
            color: '#A23E48'
        },
        green: {
            color: '#556B2F'
        },
        itemsContainer: {
            position: 'relative',
            marginBottom: 70
        },
        itemContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 20,
            paddingTop: 4
        },
        taskTitle: {
            fontSize: 16,
            textAlign: 'left',
            paddingBottom: 5,
            paddingTop: 5
        },
        subtaskFiller: {
            width: 20
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
        headerItemNameContainer: {
            marginLeft: 15,
            paddingBottom: 10,
            paddingTop: 10,
            flex: 1,
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: '#3E272333'
        },
        itemNamePressable: {
            flex: 1,
            width: '100%'
        },
        similarCountContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            paddingLeft: 15
        },
        similarCountText: {
            fontSize: 15
        },
        similarCountIcon: {
            width: 16,
            height: 16,
            opacity: 0.45,
            marginLeft: 10
        },
        tipCountContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row'
        },
        tipCountText: {
            fontSize: 15
        },
        tipCountIcon: {
            width: 16,
            height: 16,
            borderRadius: 8, // Half of the width and height for a perfect circle
            borderColor: '#3E2723',
            backgroundColor: '#556B2F60',
            marginLeft: 10
        },
        countDisclaimer: {
            fontSize: 14,
            fontStyle: 'italic',
            color: '#3E272399',
            position: 'absolute',
            right: 20,
            bottom: -30
        }
    });

    return (
        <>
            <View style={styles.itemsContainer}>
                <View style={styles.itemContainer}>
                    <View style={styles.itemCircleOpen}></View>
                    <View style={styles.headerItemNameContainer}>
                        <View style={styles.itemNamePressable}>
                            <Text style={styles.taskTitle}>Drop off kid at school</Text>
                        </View>
                        <DootooItemSidebar thing={{ tip_count: 127, similar_count: 251 }} styles={styles} />
                    </View>
                </View>
                <View style={styles.itemContainer}>
                    <View style={styles.itemCircleOpen}></View>
                    <View style={styles.headerItemNameContainer}>
                        <View style={styles.itemNamePressable}>
                            <Text style={styles.taskTitle}>Go for a run</Text>
                        </View>
                        <DootooItemSidebar thing={{ tip_count: 3300, similar_count: 6200 }} styles={styles} />
                    </View>
                </View>
                <View style={styles.itemContainer}>
                    <View style={styles.itemCircleOpen}></View>
                    <View style={styles.headerItemNameContainer}>
                        <View style={styles.itemNamePressable}>
                            <Text style={styles.taskTitle}>Resume job search</Text>
                        </View>
                        <DootooItemSidebar thing={{ tip_count: 23, similar_count: 503 }} styles={styles} />
                    </View>
                </View>
                <View style={styles.itemContainer}>
                    <View style={styles.subtaskFiller}></View>
                    <View style={styles.itemCircleOpen}></View>
                    <View style={styles.headerItemNameContainer}>
                        <View style={styles.itemNamePressable}>
                            <Text style={styles.taskTitle}>Update resume</Text>
                        </View>
                        <DootooItemSidebar thing={{ tip_count: 201, similar_count: 1500 }} styles={styles} />
                    </View>
                </View>
                <Text style={styles.countDisclaimer}>*actual numbers vary</Text>
            </View>
            <View style={styles.onboardingCopyContainer}>
                <Text style={styles.centerCopy}>see which things were <Text style={styles.green}>done by the community</Text>.</Text>
            </View>
        </>
    );
}

const Step4 = () => {

    useEffect(() => {
        amplitude.track("Onboarding Step 4 Viewed");
    }, []);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#DCC7AA',
            justifyContent: 'center'
        },
        onboardingCopyContainer: {
            paddingLeft: 40,
            paddingRight: 40
        },
        centerCopy: {
            fontSize: 40,
            color: '#3E2723',
            marginBottom: 10
        },
        red: {
            color: '#A23E48'
        },
        green: {
            color: '#556B2F'
        },
        itemAndTipsContainer: {
            marginBottom: 50
        },
        itemContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 20,
            paddingTop: 4
        },
        taskTitle: {
            fontSize: 16,
            textAlign: 'left',
            paddingBottom: 5,
            paddingTop: 5
        },
        subtaskFiller: {
            width: 20
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
        headerItemNameContainer: {
            marginLeft: 15,
            paddingBottom: 10,
            paddingTop: 10,
            flex: 1,
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: '#3E272333'
        },
        headerTipNameContainer: {
            marginLeft: 25,
            paddingBottom: 10,
            paddingTop: 10,
            flex: 1,
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: '#3E272333'
        },
        itemNamePressable: {
            flex: 1,
            width: '100%'
        },
        similarCountContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            paddingLeft: 15
        },
        similarCountText: {
            fontSize: 15
        },
        similarCountIcon: {
            width: 16,
            height: 16,
            opacity: 0.45,
            marginLeft: 10
        },
        tipCountContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row'
        },
        tipCountText: {
            fontSize: 15
        },
        tipCountIcon: {
            width: 16,
            height: 16,
            borderRadius: 8, // Half of the width and height for a perfect circle
            borderColor: '#3E2723',
            backgroundColor: '#556B2F60',
            marginLeft: 10
        },
        tipsContainer: {
            backgroundColor: '#EBDDC5',
            paddingBottom: 25
        },
        scoreContainer: {
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexDirection: 'row',
            width: 80
        },
        scoreText: {
            fontSize: 16,
            paddingRight: 10
        },
        scoreIcon: {
            width: 16,
            height: 16,
            opacity: 0.5
        }
    });

    return (
        <>
            <View style={styles.itemAndTipsContainer}>
                <View style={styles.itemContainer}>
                    <View style={styles.itemCircleOpen}></View>
                    <View style={styles.headerItemNameContainer}>
                        <View style={styles.itemNamePressable}>
                            <Text style={styles.taskTitle}>Go for a run</Text>
                        </View>
                        <DootooItemSidebar thing={{ tip_count: 3100, similar_count: 6200 }} styles={styles} />
                    </View>
                </View>
                <View style={styles.tipsContainer}>
                    <View style={styles.itemContainer}>
                        <View style={styles.headerTipNameContainer}>
                            <View style={styles.itemNamePressable}>
                                <Text style={styles.taskTitle}>Take some shot blocks an hour before</Text>
                            </View>
                            <View style={styles.scoreContainer}>
                                <Text style={styles.scoreText}>173</Text>
                                <Image style={styles.scoreIcon} source={require("@/assets/images/thumbs_up_556B2F.png")} />
                            </View>
                        </View>
                    </View>
                    <View style={styles.itemContainer}>
                        <View style={styles.headerTipNameContainer}>
                            <View style={styles.itemNamePressable}>
                                <Text style={styles.taskTitle}>Dress appropriately</Text>
                            </View>
                            <View style={styles.scoreContainer}>
                                <Text style={styles.scoreText}>75</Text>
                                <Image style={styles.scoreIcon} source={require("@/assets/images/thumbs_up_556B2F.png")} />
                            </View>
                        </View>
                    </View>
                    <View style={styles.itemContainer}>
                        <View style={styles.headerTipNameContainer}>
                            <View style={styles.itemNamePressable}>
                                <Text style={styles.taskTitle}>Pick a scenic route for motivation</Text>
                            </View>
                            <View style={styles.scoreContainer}>
                                <Text style={styles.scoreText}>66</Text>
                                <Image style={styles.scoreIcon} source={require("@/assets/images/thumbs_up_556B2F.png")} />
                            </View>
                        </View>
                    </View>
                </View>
            </View>
            <View style={styles.onboardingCopyContainer}>
                <Text style={styles.centerCopy}>get tips to <Text style={styles.green}>get things done</Text>.</Text>
                <Text style={styles.centerCopy}>share tips to{'\n'}<Text style={styles.green}>give back</Text>.</Text>
            </View>
        </>
    );
}

const Step5 = () => {
    const [currentUsername, setCurrentUsername] = useState(generateUsername());
    const [counter, setCounter] = useState(0);
    const fadeInOut = useRef(new Animated.Value(1)).current;
    const fadeInOutAnimation = Animated.sequence([
        Animated.timing(fadeInOut, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
        }),
        Animated.delay(5000),
        Animated.timing(fadeInOut, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true
        })
    ]);

    useEffect(() => {
        amplitude.track("Onboarding Step 5 Viewed");
    }, []);

    useEffect(() => {
        fadeInOutAnimation.start(() => {
            if (counter <= 2) {
                setCurrentUsername(generateUsername())
                setCounter((prev) => prev + 1);
            }
        });

        return () => fadeInOutAnimation.stop();
    }, [currentUsername]);

    async function handleTermsClick(event: GestureResponderEvent): void {
        //console.log("Inside terms click");
        amplitude.track("Terms Link Clicked");
        await Linking.openURL('https://dootoo.app/terms.html').catch(err => console.error('Error opening link:', err));
    }

    async function handlePrivacyPolicyClick(event: GestureResponderEvent): void {
        //console.log("Inside privacy click");
        amplitude.track("Privacy Link Clicked");
        await Linking.openURL('https://dootoo.app/privacy.html').catch(err => console.error('Error opening link:', err));
    }

    const styles = StyleSheet.create({
        container: {
            paddingLeft: 40,
            paddingRight: 40
        },
        centerCopy: {
            fontSize: 40,
            color: '#3E2723',
            marginBottom: 10
        },
        green: {
            color: '#556B2F'
        },
        underline: {
            textDecorationLine: 'underline'
        },
        supplementalCopyContainer: {
            paddingTop: 40
        },
        supplementalCopy: {
            fontSize: 16,
            textAlign: 'right',
            lineHeight: 23
        },
        profileDrawerProfileIconContainer: {
            alignItems: 'center',
            paddingBottom: 60
        },
        profileDrawerProfileIcon: {
            height: 150,
            width: 150
        },
        profileNameText: {
            fontSize: 20
        }
    });

    return (
        <View style={styles.container}>
            <View style={styles.profileDrawerProfileIconContainer}>
                <Image style={styles.profileDrawerProfileIcon} source={require('@/assets/images/profile_icon_green.png')} />
                <View>
                    <Animated.Text style={[styles.profileNameText, { opacity: fadeInOut }]}>{currentUsername}</Animated.Text>
                </View>
            </View>
            <Text style={styles.centerCopy}>your personal information{'\n'}<Text style={styles.green}>stays with you</Text>.</Text>
            <View style={styles.supplementalCopyContainer}>
                <Text style={styles.supplementalCopy}>By continuing, you agree to{'\n'}dootoo's <Text style={[styles.green, styles.underline]} onPress={handleTermsClick}>Terms</Text> and understand{'\n'}how we protect your <Text style={[styles.green, styles.underline]} onPress={handlePrivacyPolicyClick}>Privacy</Text>.</Text>
            </View>
        </View>
    );
}

const OnboardingHeader = ({ swipeLeft }) => {
    const router = useRouter();

    const styles = StyleSheet.create({
        onboardingHeaderContainer: {
            position: 'absolute',
            top: (Platform.OS == 'ios') ? 60 : 40,
            left: 20,
        },
        backButtonContainer: {

        },
        backButtonIcon: {
            height: 40,
            width: 40
        }
    });

    return (
        <View style={styles.onboardingHeaderContainer}>
            <Pressable style={styles.backButtonContainer} onPress={swipeLeft}>
                {(Platform.OS == 'ios') ?
                    <Image style={styles.backButtonIcon} source={require('@/assets/images/back_arrow_FAF3E0_ios.png')} />
                    : <Image style={styles.backButtonIcon} source={require('@/assets/images/back_arrow_FAF3E0_android.png')} />
                }
            </Pressable>
        </View>
    );
}

const OnboardingFooter = ({ step = 1, onForwardButtonPress = () => { Alert.alert('Implement Me') } }) => {

    const styles = StyleSheet.create({
        onboardingFooterContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            bottom: 70,
            left: 0,
            right: 0
        },
        stepCircle: {
            height: 20,
            width: 20,
            borderRadius: 10,
            backgroundColor: '#FAF3E0',
            marginRight: 7
        },
        stepCurrent: {
            backgroundColor: '#556B2F'
        },
        forwardButtonContainer: {
            position: 'absolute',
            right: 30
        },
        forwardButtonIcon: {
            height: 40,
            width: 40
        }
    });

    return (
        <View style={styles.onboardingFooterContainer}>
            <View style={[styles.stepCircle, (step == 1) && styles.stepCurrent]}></View>
            <View style={[styles.stepCircle, (step == 2) && styles.stepCurrent]}></View>
            <View style={[styles.stepCircle, (step == 3) && styles.stepCurrent]}></View>
            <View style={[styles.stepCircle, (step == 4) && styles.stepCurrent]}></View>
            <View style={[styles.stepCircle, (step == 5) && styles.stepCurrent]}></View>
            <Pressable style={styles.forwardButtonContainer} onPress={onForwardButtonPress}>
                {(Platform.OS == 'ios') ?
                    <Image style={styles.forwardButtonIcon} source={require('@/assets/images/forward_arrow_556B2F_ios.png')} />
                    : <Image style={styles.forwardButtonIcon} source={require('@/assets/images/forward_arrow_556B2F_android.png')} />
                }
            </Pressable>
        </View>
    );
}

export default OnboardingScreen;
