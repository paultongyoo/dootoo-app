import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useNavigation } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function Index() {
    const router = useRouter();
    const [isMounted, setMounted] = useState(false)

    useEffect(() => {
        //console.log("Index.useEffect([])");
        
        // const checkFirstLaunch = async () => {
        //     const launchStatus = await AsyncStorage.getItem('isFirstLaunch');
        //     if (launchStatus === null) {
        //         router.replace('/onboarding');
        //     } else {
        //         router.replace('/(tabs)/open');
        //     }
        // };
        // checkFirstLaunch();
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            router.replace('/(tabs)/open');
        }
    }, [isMounted])
  
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
