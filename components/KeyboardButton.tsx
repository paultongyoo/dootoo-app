import { useContext } from "react";
import { generateNewKeyboardEntry } from "./Helpers";
import * as amplitude from '@amplitude/analytics-react-native';
import { AppContext } from "./AppContext";
import { usePathname } from "expo-router";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";
import { Keyboard } from "./svg/keyboard";
import { Plus } from "./svg/plus";


const KeyboardButton = ({ listArray, listArraySetterFunc }) => {

    const { anonymousId, currentlyTappedThing, emptyListCTAFadeOutAnimation } = useContext(AppContext);
    const pathname = usePathname();
    const keyboardButtonOpacity = useSharedValue(1);

    const handleKeyboardButtonPress = () => {
        const newItem = generateNewKeyboardEntry();
        currentlyTappedThing.current = newItem;

        amplitude.track("Keyboard Entry Started", {
            anonymous_id: anonymousId,
            pathname: pathname,
            uuid: newItem.uuid
        });

        if (listArray.length == 0) {

            // If the list is empty, we ASSume the empty list CTA is visible.  Fade it out first before
            // adding the first item
            emptyListCTAFadeOutAnimation.start(() => {
                listArraySetterFunc((prevItems) => [newItem, ...prevItems]);
            });
        } else {
            listArraySetterFunc((prevItems) => [newItem, ...prevItems]);
        }
    }

    const styles = StyleSheet.create({
        footerButtonContainer: {
            height: 50
        },
        footerButton: {
            height: 50,
            width: 50,
            borderRadius: 25,
            borderColor: '#3E2723',
            borderWidth: 1,
            marginRight: 20,
            marginLeft: 20,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 2, height: 4 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: 4, // Elevation for Android        
        },
        footerButton_Underlay: {
            height: 50,
            width: 50,
            borderRadius: 25,
            marginRight: 20,
            marginLeft: 20,
            position: 'absolute',
            top: 0,
            backgroundColor: 'black'
        },
        keyboardButton: {
            backgroundColor: '#556B2F'
        },
        iconPlusContainer: {
            position: 'relative'
        },
        plusContainer: {
            position: 'absolute',
            right: -5,
            top: -5
        },
    })

    return (
        <View style={styles.footerButtonContainer}>
            <View style={styles.footerButton_Underlay}></View>
            <Animated.View style={[styles.footerButton, styles.keyboardButton, { opacity: keyboardButtonOpacity }]}>
                <Pressable
                    onPress={handleKeyboardButtonPress}
                    onPressIn={() => keyboardButtonOpacity.value = withTiming(0.7, { duration: 150 })}
                    onPressOut={() => keyboardButtonOpacity.value = withTiming(1, { duration: 150 })}>
                    <View style={styles.iconPlusContainer}>
                        <Keyboard wxh={27} />
                        <View style={styles.plusContainer}>
                            <Plus wxh="15" color="white" bgColor="#556B2F" bgStrokeWidth="8" />
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        </View>
    )

}

export default KeyboardButton;