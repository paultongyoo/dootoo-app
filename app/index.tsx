import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function Index() {
    const router = useRouter();

    useEffect(() => {
        const checkFirstLaunch = async () => {
            const launchStatus = await AsyncStorage.getItem('isFirstLaunch');
            if (launchStatus === null) {
                router.navigate('/step1');
            } else {
                router.navigate('/drawer/stack');
            }
        };
        checkFirstLaunch();
    }, []);
  
    // const styles = StyleSheet.create({
    //     container: {
    //         flex: 1,
    //         backgroundColor: '#DCC7AA',
    //         justifyContent: 'center',
    //         alignItems: 'center'
    //     }
    // });

    return null;
    // return (
    //     <View style={styles.container}>
    //         <ActivityIndicator size={"large"} color="black" />
    //     </View>
    // );
}
