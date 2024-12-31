import { useEffect, useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const CommunityScreen = () => {

    const [screenInitialized, setScreenInitialized] = useState(false);
    const initialLoadFadeInOpacity = useSharedValue(0);
    const initialLoadAnimatedOpacity = useAnimatedStyle(() => {
        return { opacity: initialLoadFadeInOpacity.value }
    })

    useEffect(() => {
        console.log("Community.useEffect([])");
        initialLoadFadeInOpacity.value = withTiming(1, { duration: 300});
        return () => {
            console.log("Community.useEffect([]) cleanup");
            initialLoadFadeInOpacity.value = withTiming(0, { duration: 300}); 
        }
    }, []);
    

    const styles = StyleSheet.create({
        container: {
            backgroundColor: '#DCC7AA',
            flex: 1
        },
        initialLoadAnimContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
        },
    })
    return (
        <View style={styles.container}>
            {(!screenInitialized) ?
                <Animated.View style={[styles.initialLoadAnimContainer, initialLoadAnimatedOpacity]}>
                    <ActivityIndicator size={"large"} color="#3E3723" />
                </Animated.View>
                : <></>
            }
        </View>
    )
}

export default CommunityScreen;