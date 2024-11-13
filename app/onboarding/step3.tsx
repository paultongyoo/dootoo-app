import OnboardingFooter from '@/components/OnboardingFooter';
import { useRouter } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native'

export default function Step3() {
    const router = useRouter();

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
        }
    });

    return (
      <View style={styles.container}>
            <Text style={styles.centerCopy}>see which things were <Text style={styles.green}>done by the community</Text>.</Text>
            <OnboardingFooter step={3} onForwardButtonPress={() => router.navigate('/onboarding/step4')}/>
      </View>
    );
}