import { Platform, StyleSheet, View, Pressable, Image} from 'react-native';
import { useRouter } from 'expo-router';

const OnboardingHeader = () => {
    const router = useRouter();

    const styles = StyleSheet.create({
        onboardingHeaderContainer: {
            position: 'absolute',
            top: 40,
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
            <Pressable style={styles.backButtonContainer} onPress={router.back}>
                { (Platform.OS == 'ios') ?
                    <Image style={styles.backButtonIcon} source={require('@/assets/images/back_arrow_FAF3E0_ios.png')} />
                    : <Image style={styles.backButtonIcon} source={require('@/assets/images/back_arrow_FAF3E0_android.png')} />
                }
            </Pressable>
        </View>
    );
}

export default OnboardingHeader;