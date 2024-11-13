import OnboardingFooter from '@/components/OnboardingFooter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native'

export default function Step5() {
    const router = useRouter();

    const completeOnboarding = async () => {
        await AsyncStorage.setItem('isFirstLaunch', 'false');
        router.replace('/main'); // Navigate to the main app
    };

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
        }
    });

    return (
      <View style={styles.container}>
            <Text style={styles.centerCopy}>your personal information{'\n'}<Text style={styles.green}>stays with you</Text>.</Text>
            <OnboardingFooter step={5} onForwardButtonPress={completeOnboarding}/>
      </View>
    );
}