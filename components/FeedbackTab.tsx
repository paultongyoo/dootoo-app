import { useContext, useEffect } from "react";
import { Text, StyleSheet, Pressable, Alert } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { AppContext } from "./AppContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trackEvent } from "./Analytics";


const FeedbackTab = ({modalVisible, modalVisibleSetter}) => {
    const { username, anonymousId, feedbackTabOpacity } = useContext(AppContext);

    const opacityAnimatedStyle = useAnimatedStyle(() => {
        return { opacity: feedbackTabOpacity.value };
    })

    const TAB_WIDTH = 60;
    const positionX = useSharedValue(TAB_WIDTH * -1);

    useEffect(() => {
        const checkFirstLaunch = async () => {
            const launchStatus = await AsyncStorage.getItem('isFirstLaunch');

            // If this isn't the first launch, animate the tab into view immediately
            if (launchStatus != null) {
                positionX.value = withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) });
            }
          };
          checkFirstLaunch();       
    }, []);
    
    const styles = StyleSheet.create({
        tabContainer: {
            position: 'absolute',
            //right: 0,                 // Overridden using animated inline style
            top: '50%',
        },
        tabBackground: {
            width: TAB_WIDTH,
            padding: 10,
            backgroundColor: '#556B2F',
            borderTopLeftRadius: 10,
            borderBottomLeftRadius: 10,
            shadowColor: '#000',
            shadowOffset: { width: 2, height: 4 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: 4, // Elevation for Android    
        },
        tabText: {
            color: 'white',
            fontWeight: 'bold',
            fontSize: 12,
            textAlign: 'left'
        }
    })

    const handleFeedbackTabTap = () => {
        trackEvent("Feedback Tab Pressed", {
            anonymous_id: anonymousId,
            username: username,
            was_visible: modalVisible
        });
        modalVisibleSetter(prevVal => !prevVal);
    }

    return (
        <Animated.View style={[styles.tabContainer, { right: positionX }, opacityAnimatedStyle]}>
            <Pressable  style={({pressed}) => [styles.tabBackground, pressed && { backgroundColor: '#445823' }]}
                        onPress={handleFeedbackTabTap}>
                <Text style={styles.tabText}>Make App Better</Text>
            </Pressable>
        </Animated.View>
    )
}

export default FeedbackTab;