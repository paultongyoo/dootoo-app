import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet, Platform, Pressable, Image, Alert, GestureResponderEvent, Linking, Easing } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as amplitude from '@amplitude/analytics-react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DootooItemSidebar from '@/components/DootooItemSidebar';
import { generateUsername } from '@/components/Storage';
import { AppContext } from '@/components/AppContext';
import { Microphone } from '@/components/svg/microphone';
import { ChevronLeft } from '@/components/svg/chevron-left';
import { ArrowLeft } from '@/components/svg/arrow-left';
import { Bulb } from '@/components/svg/bulb';
import { ChevronRight } from '@/components/svg/chevron-right';
import { ArrowRight } from '@/components/svg/arrow-right';
import { ThumbUp } from '@/components/svg/thumb-up';

const { width: screenWidth } = Dimensions.get('window');


const OnboardingScreen = () => {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const { itemCountsMap } = useContext(AppContext);
    const translationX = useRef(new Animated.Value(0)).current;
    const onboardingOpacity = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.timing(onboardingOpacity, {
            toValue: 1,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true
        }).start();

        // Initialize map for downstream screens
        itemCountsMap.current = new Map();
        itemCountsMap.current.set("1", { tip_count: 3100, similar_count: 6200 });
        itemCountsMap.current.set("2", { tip_count: 3300, similar_count: 5300 });
        itemCountsMap.current.set("3", { tip_count: 23, similar_count: 503 });
        itemCountsMap.current.set("4", { tip_count: 201, similar_count: 1500 });
    },[]);
    
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
        Animated.timing(onboardingOpacity, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true
        }).start(() => {    
            router.replace('/meDrawer/communityDrawer/stack');
        });
    };

    const styles = StyleSheet.create({
        background: {
            flex: 1,
            backgroundColor: '#DCC7AA',        
        },
        container: {
            flex: 1,
            justifyContent: 'center'
        }
    });

    return (
        <View style={styles.background}>
            <Animated.View style={[styles.container, {opacity: onboardingOpacity}]}>
                {(step > 1) ? <OnboardingHeader swipeRight={swipeRight} />
                    : <></>}

                <PanGestureHandler onHandlerStateChange={onSwipe}>
                    <Animated.View style={[styles.container, { transform: [{ translateX: translationX }]}]}>
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
            </Animated.View>
        </View>
    );
};

const Step1 = () => {
    const fadeIn = useRef(new Animated.Value(0)).current;
    const fadeInAnimation = Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
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
    const fadeIn = useRef(new Animated.Value(0)).current;
    const fadeInAnimation = Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
    });

    useEffect(() => {
        fadeInAnimation.start();
        amplitude.track("Onboarding Step 2 Viewed");
    }, []);

    const styles = StyleSheet.create({
        container: {
            paddingLeft: 40,
            paddingRight: 40
        },
        centerCopy: {
            fontSize: 40,
            color: '#3E2723',
            marginBottom: 50
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
        <Animated.View style={[styles.container, { opacity: fadeIn }]}>
            <Text style={styles.centerCopy}>start by <Text style={styles.green}>naturally speaking</Text> what you have to do.</Text>
            <View style={styles.micAndVoice}>
                <View style={styles.micContainer}>
                    <Microphone wxh={201} />
                </View>
                <View style={styles.voiceContainer}>
                    <Text style={styles.voiceCopy}>"alright...first I gotta <Text style={styles.green}>drop off my kid at school</Text>...and then I'm
                        gonna <Text style={styles.green}>go for a run</Text>...when I come back I
                        gotta <Text style={styles.green}>resume my job search</Text>....which
                        starts with <Text style={styles.green}>updating my resume</Text>..”</Text>
                </View>
            </View>         
        </Animated.View>
    );
}

const Step3 = () => {
    const fadeIn = useRef(new Animated.Value(0)).current;
    const fadeInAnimation = Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
    });

    useEffect(() => {
        fadeInAnimation.start();
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
            color: '#3E2723',
            marginBottom: 30
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
        <Animated.View style={{opacity: fadeIn}}>
            <View style={styles.onboardingCopyContainer}>
                <Text style={styles.centerCopy}>see which things were <Text style={styles.green}>done by the community</Text>.</Text>
            </View>
            <View style={styles.itemsContainer}>
                <View style={styles.itemContainer}>
                    <View style={styles.itemCircleOpen}></View>
                    <View style={styles.headerItemNameContainer}>
                        <View style={styles.itemNamePressable}>
                            <Text style={styles.taskTitle}>Drop off kid at school</Text>
                        </View>
                        <DootooItemSidebar disabled={true} thing={{ uuid: "1" }} styles={styles} />
                    </View>
                </View>
                <View style={styles.itemContainer}>
                    <View style={styles.itemCircleOpen}></View>
                    <View style={styles.headerItemNameContainer}>
                        <View style={styles.itemNamePressable}>
                            <Text style={styles.taskTitle}>Go for a run</Text>
                        </View>
                        <DootooItemSidebar disabled={true} thing={{ uuid: "2" }} styles={styles} />
                    </View>
                </View>
                <View style={styles.itemContainer}>
                    <View style={styles.itemCircleOpen}></View>
                    <View style={styles.headerItemNameContainer}>
                        <View style={styles.itemNamePressable}>
                            <Text style={styles.taskTitle}>Resume job search</Text>
                        </View>
                        <DootooItemSidebar disabled={true} thing={{ uuid: "3" }} styles={styles} />
                    </View>
                </View>
                <View style={styles.itemContainer}>
                    <View style={styles.subtaskFiller}></View>
                    <View style={styles.itemCircleOpen}></View>
                    <View style={styles.headerItemNameContainer}>
                        <View style={styles.itemNamePressable}>
                            <Text style={styles.taskTitle}>Update resume</Text>
                        </View>
                        <DootooItemSidebar disabled={true} thing={{ uuid: "4" }} styles={styles} />
                    </View>
                </View>
                <Text style={styles.countDisclaimer}>*actual numbers vary</Text>
            </View>
        </Animated.View>
    );
}

const Step4 = () => {
    const fadeIn = useRef(new Animated.Value(0)).current;
    const fadeInAnimation = Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
    });

    useEffect(() => {
        fadeInAnimation.start();
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
            paddingRight: 40,
            marginBottom: 30
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
            marginLeft: 13,
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
        tipCountContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row'
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
        tipListIconContainer: {
            marginLeft: 15
        },
        tipListIcon: {
            width: 28,
            height: 28,
            opacity: 1
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
        <Animated.View style={{opacity: fadeIn}}>
            <View style={styles.onboardingCopyContainer}>
                <Text style={styles.centerCopy}>get tips to <Text style={styles.green}>get things done</Text>.</Text>
                <Text style={styles.centerCopy}>share tips to{'\n'}<Text style={styles.green}>give back</Text>.</Text>
            </View>
            <View style={styles.itemAndTipsContainer}>
                <View style={styles.itemContainer}>
                    <View style={styles.itemCircleOpen}></View>
                    <View style={styles.headerItemNameContainer}>
                        <View style={styles.itemNamePressable}>
                            <Text style={styles.taskTitle}>Go for a run</Text>
                        </View>
                        <DootooItemSidebar disabled={true} thing={{uuid: "2"}} styles={styles} />
                    </View>
                </View>
                <View style={styles.tipsContainer}>
                    <View style={styles.itemContainer}>
                        <View style={styles.tipListIconContainer}>
                            <Bulb wxh="28" color="#556B2F" />
                        </View> 
                        <View style={styles.headerTipNameContainer}>
                            <View style={styles.itemNamePressable}>
                                <Text style={styles.taskTitle}>Take some shot blocks an hour before</Text>
                            </View>
                            <View style={styles.scoreContainer}>
                                <Text style={styles.scoreText}>173</Text>
                                <ThumbUp wxh="16" opacity="0.5" color="#556B2F" />
                            </View>
                        </View>
                    </View>
                    <View style={styles.itemContainer}>
                        <View style={styles.tipListIconContainer}>
                            <Bulb wxh="28" color="#556B2F" />
                        </View> 
                        <View style={styles.headerTipNameContainer}>
                            <View style={styles.itemNamePressable}>
                                <Text style={styles.taskTitle}>Dress appropriately</Text>
                            </View>
                            <View style={styles.scoreContainer}>
                                <Text style={styles.scoreText}>75</Text>
                                <ThumbUp wxh="16" opacity="0.5" color="#556B2F" />
                            </View>
                        </View>
                    </View>
                    <View style={styles.itemContainer}>
                        <View style={styles.tipListIconContainer}>
                            <Bulb wxh="28" color="#556B2F" />
                        </View> 
                        <View style={styles.headerTipNameContainer}>
                            <View style={styles.itemNamePressable}>
                                <Text style={styles.taskTitle}>Pick a scenic route for motivation</Text>
                            </View>
                            <View style={styles.scoreContainer}>
                                <Text style={styles.scoreText}>66</Text>
                                <ThumbUp wxh="16" opacity="0.5" color="#556B2F" />
                            </View>
                        </View>
                    </View>
                </View>
                <Text style={styles.countDisclaimer}>*actual numbers vary</Text>
            </View>
        </Animated.View>
    );
}

const Step5 = () => {
    const [currentUsername, setCurrentUsername] = useState(generateUsername());
    const [counter, setCounter] = useState(0);
    const stepFadeIn =  useRef(new Animated.Value(0)).current;
    const stepFadeInAnimation = Animated.timing(stepFadeIn, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
    });
    const usernameFadeInOut = useRef(new Animated.Value(1)).current;
    const usernameFadeInOutAnimation = Animated.sequence([
        Animated.timing(usernameFadeInOut, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
        }),
        Animated.delay(5000),
        Animated.timing(usernameFadeInOut, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true
        })
    ]);

    useEffect(() => {
        stepFadeInAnimation.start();
        amplitude.track("Onboarding Step 5 Viewed");
    }, []);

    useEffect(() => {
        usernameFadeInOutAnimation.start(() => {
            if (counter <= 2) {
                setCurrentUsername(generateUsername())
                setCounter((prev) => prev + 1);
            }
        });

        return () => usernameFadeInOutAnimation.stop();
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
            paddingTop: 40,
            marginBottom: 60
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
        },
        profileNameContainer: {
            paddingTop: 15
        }
    });

    return (
        <Animated.View style={[styles.container, {opacity: stepFadeIn }]}>
            <Text style={styles.centerCopy}>your personal information{'\n'}<Text style={styles.green}>stays with you</Text>.</Text>
            <View style={styles.supplementalCopyContainer}>
                <Text style={styles.supplementalCopy}>By continuing, you agree to{'\n'}dootoo's <Text style={[styles.green, styles.underline]} onPress={handleTermsClick}>Terms</Text> and understand{'\n'}how we protect your <Text style={[styles.green, styles.underline]} onPress={handlePrivacyPolicyClick}>Privacy</Text>.</Text>
            </View>
            <View style={styles.profileDrawerProfileIconContainer}>
                <Image style={styles.profileDrawerProfileIcon} source={require('@/assets/images/profile_icon_green.png')} />
                <View style={styles.profileNameContainer}>
                    <Animated.Text style={[styles.profileNameText, { opacity: usernameFadeInOut }]}>{currentUsername}</Animated.Text>
                </View>
            </View>
        </Animated.View>
    );
}

const OnboardingHeader = ({ swipeRight }) => {
    const fadeIn = useRef(new Animated.Value(0)).current;
    const fadeInAnimation = Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
    });

    useEffect(() => {
        fadeInAnimation.start();
    },[]);

    const styles = StyleSheet.create({
        onboardingHeaderContainer: {
            position: 'absolute',
            top: (Platform.OS == 'ios') ? 60 : 40,
            left: 20,
            zIndex: 99
        },
        backButtonContainer: {

        },
        backButtonIcon: {
            height: 40,
            width: 40
        }
    });

    return (
        <Animated.View style={[styles.onboardingHeaderContainer, {opacity: fadeIn}]}>
            <Pressable style={styles.backButtonContainer} onPress={swipeRight}>
                {(Platform.OS == 'ios') ?
                    <ChevronLeft wxh={40} strokeWidth="2" color="#FAF3E0" />
                    : <ArrowLeft wxh={40} strokeWidth="2" color="#FAF3E0" />
                }
            </Pressable>
        </Animated.View>
    );
}

const OnboardingFooter = ({ step = 1, onForwardButtonPress = () => { return; } }) => {

    const currentStepCirclePosition = useRef(new Animated.Value(0)).current;
    const circleSize = 20;
    const spaceBetweenCircles = 7;

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
        backgroundCirclesContainer: {
            flexDirection: 'row'
        },
        backgroundStepCircle: {
            height: circleSize,
            width: circleSize,
            borderRadius: (circleSize / 2),
            backgroundColor: '#FAF3E0',
            marginRight: spaceBetweenCircles
        },
        stepCurrent: {
            backgroundColor: '#556B2F',
            position: 'absolute',
            left: 0
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

    useEffect(() => {
        // Animate the white circle to the new position whenever the step changes
        Animated.timing(currentStepCirclePosition, {
          toValue: (step - 1) * (circleSize + spaceBetweenCircles), // adjust spacing between circles
          duration: 300,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }).start();
      }, [step]);

    return (
        <View style={styles.onboardingFooterContainer}>
            <View style={styles.backgroundCirclesContainer}>
                <View style={styles.backgroundStepCircle}></View>
                <View style={styles.backgroundStepCircle}></View>
                <View style={styles.backgroundStepCircle}></View>
                <View style={styles.backgroundStepCircle}></View>
                <View style={styles.backgroundStepCircle}></View>
                <Animated.View style={[
                    styles.backgroundStepCircle, styles.stepCurrent, 
                    {transform: [{ translateX: currentStepCirclePosition}]}
                    ]}></Animated.View>
            </View>
            <Pressable style={styles.forwardButtonContainer} onPress={onForwardButtonPress}>
                {(Platform.OS == 'ios') ? <ChevronRight wxh="40" color="#556B2F" />
                                        : <ArrowRight wxh="40" color="#556B2F" />
                }
            </Pressable>
        </View>
    );
}

export default OnboardingScreen;
