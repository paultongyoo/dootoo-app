import { ActivityIndicator, StyleSheet, View } from 'react-native';
import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import * as amplitude from '@amplitude/analytics-react-native';
const AMPLITUDE_KEY_DEV = "28fd28b2a8714bea3efa4a0bc73fbd0b";
const AMPLITUDE_KEY_PROD = "ac9cdda8bd0d54ba50553219f407d353";

export default function Index() {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        amplitude.init((__DEV__) ? AMPLITUDE_KEY_DEV : AMPLITUDE_KEY_PROD);

        const checkFirstLaunch = async () => {
            console.log("Entering checkFirstLaunch");
            const launchStatus = await AsyncStorage.getItem('isFirstLaunch');
            console.log("launchStatus: " + launchStatus);
            if (launchStatus === null) {
                console.log("Attempting to navigate to /screens/step1");
                router.navigate('/screens');
            } else {
                console.log("Attempting to navigate to /screens/items");
                router.navigate('/screens/items');
            }
        };
        checkFirstLaunch();
    }, []);

    useEffect(() => {
        //console.log("Pathname logged: " + pathname);
        amplitude.track('Screen Viewed', { pathname: pathname });
    }, [pathname]);
  
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
            <ActivityIndicator size={"large"} color="black" />
        </View>
    );
}
