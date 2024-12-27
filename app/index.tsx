import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function Index() {
    const router = useRouter();

    useEffect(() => {
        //console.log("Index.useEffect([])");
        
        const checkFirstLaunch = async () => {
            const launchStatus = await AsyncStorage.getItem('isFirstLaunch');
            if (launchStatus === null) {
                router.replace('/onboarding');
            } else {
                router.replace('/(tabs)/open');
            }
        };
        checkFirstLaunch();
    }, []);
  
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#DCC7AA',
            justifyContent: 'center',
            alignItems: 'center'
        }
    });

    return (
        <View style={styles.container}>
            {/* <ActivityIndicator size={"large"} color="black" /> */}
        </View>
    );
}
