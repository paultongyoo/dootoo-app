import OnboardingFooter from '@/components/OnboardingFooter';
import OnboardingHeader from '@/components/OnboardingHeader';
import { generateUsername } from '@/components/Storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet, Image, GestureResponderEvent, Linking, Animated, Platform } from 'react-native'
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import * as amplitude from '@amplitude/analytics-react-native';

export default function Step5() {
    const router = useRouter();
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
    },[]);

    useEffect(() => {
        fadeInOutAnimation.start(() => {
            if (counter <= 2) {
                setCurrentUsername(generateUsername())
                setCounter((prev) => prev + 1);
            }
        });

        return () => fadeInOutAnimation.stop();
    }, [currentUsername]);

    const completeOnboarding = async () => {

        if (Platform.OS == 'ios') {
            const result = await check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
            if (result === RESULTS.DENIED) {

                // The permission has not been requested, so request it.
                amplitude.track("iOS ATT Prompt Started");
                const result = await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
                amplitude.track("iOS ATT Prompt Completed", { result: result});
            }
        }

        await AsyncStorage.setItem('isFirstLaunch', 'false');
        router.replace('/main'); // Navigate to the main app
    };

    const onSwipe = ({ nativeEvent }) => {
        if (nativeEvent.state === State.END) {
            const { translationX } = nativeEvent;

            if (translationX < -50) {
                completeOnboarding();
            } else if (translationX > 50) {
                router.back();
            }
        }
    }

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#DCC7AA',
            justifyContent: 'center',
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

    return (
        <PanGestureHandler onHandlerStateChange={onSwipe}>
            <View style={styles.container}>
                <OnboardingHeader />
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
                <OnboardingFooter step={5} onForwardButtonPress={completeOnboarding} />
            </View>
        </PanGestureHandler>
    );
}