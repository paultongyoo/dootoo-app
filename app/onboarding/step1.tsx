import OnboardingFooter from '@/components/OnboardingFooter';
import { useRouter } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native'

export default function Step1() {
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
            <Text style={styles.centerCopy}>doing things{'\n'}can be <Text style={styles.red}>hard</Text>.</Text>
            <Text style={styles.centerCopy}>doing things{'\n'}<Text style={styles.green}>together is{'\n'}easier</Text>.</Text>
            <OnboardingFooter step={1} onForwardButtonPress={() => router.navigate('/onboarding/step2')}/>
      </View>
    );
}