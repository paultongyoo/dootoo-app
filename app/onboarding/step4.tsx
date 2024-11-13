import OnboardingFooter from '@/components/OnboardingFooter';
import { useRouter } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native'

export default function Step4() {
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
            <Text style={styles.centerCopy}>get tips to <Text style={styles.green}>get things done</Text>.</Text>
            <Text style={styles.centerCopy}>share tips to{'\n'}<Text style={styles.green}>give back</Text>.</Text>
            <OnboardingFooter step={4} onForwardButtonPress={() => router.navigate('/onboarding/step5')}/>
      </View>
    );
}