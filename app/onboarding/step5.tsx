import OnboardingFooter from '@/components/OnboardingFooter';
import OnboardingHeader from '@/components/OnboardingHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Text, View, StyleSheet, Pressable, GestureResponderEvent, Linking } from 'react-native'
import { PanGestureHandler, State } from 'react-native-gesture-handler';

export default function Step5() {
    const router = useRouter();

    const completeOnboarding = async () => {
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
        }
    });

    async function handleTermsClick(event: GestureResponderEvent): void {
        console.log("Inside terms click");
        await Linking.openURL('https://dootoo.app/terms.html').catch(err => console.error('Error opening link:', err));
    }

    async function handlePrivacyPolicyClick(event: GestureResponderEvent): void {
        console.log("Inside privacy click");
        await Linking.openURL('https://dootoo.app/privacy.html').catch(err => console.error('Error opening link:', err));
    }

    return (
        <PanGestureHandler onHandlerStateChange={onSwipe}>
            <View style={styles.container}>
                <OnboardingHeader />
                <Text style={styles.centerCopy}>your personal information{'\n'}<Text style={styles.green}>stays with you</Text>.</Text>
                <View style={styles.supplementalCopyContainer}>
                    <Text style={styles.supplementalCopy}>By continuing, you agree to{'\n'}dootoo's <Text style={[styles.green, styles.underline]} onPress={handleTermsClick}>Terms of Use</Text> and{'\n'}<Text style={[styles.green, styles.underline]} onPress={handlePrivacyPolicyClick}>Privacy Policy</Text>.</Text>
                </View>
                <OnboardingFooter step={5} onForwardButtonPress={completeOnboarding} />
            </View>
        </PanGestureHandler>
    );
}