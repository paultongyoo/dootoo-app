import OnboardingFooter from '@/components/OnboardingFooter';
import OnboardingHeader from '@/components/OnboardingHeader';
import { useRouter } from 'expo-router';
import { Text, View, StyleSheet, Image } from 'react-native'
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as amplitude from '@amplitude/analytics-react-native';
import { useEffect } from 'react';

export default function Step2() {
    const router = useRouter();

    useEffect(() => {
        amplitude.track("Onboarding Step 2 Viewed");
    },[]);
    
    const onSwipe = ({ nativeEvent }) => {
        if (nativeEvent.state === State.END) {
            const { translationX } = nativeEvent;

            if (translationX < -50) {
                router.navigate('/step3');
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
            color: '#3E2723'
        },
        red: {
            color: '#A23E48'
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
        <PanGestureHandler onHandlerStateChange={onSwipe}>
            <View style={styles.container}>
                <OnboardingHeader />
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
                <OnboardingFooter step={2} onForwardButtonPress={() => router.navigate('/step3')} />
            </View>
        </PanGestureHandler>
    );
}