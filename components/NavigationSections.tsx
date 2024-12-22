import { View, Pressable, StyleSheet, Text } from "react-native";
import { formatNumber } from "./Helpers";
import { CircleCheck } from "./svg/circle-check";
import { List } from "./svg/list";
import { UserRound } from "./svg/user-round";
import Animated, { Easing, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useEffect, useState } from "react";
import { ProfileCountEventEmitter } from "./EventEmitters";
import { loadUsername } from "./Storage";

const NavigationSections = () => {

    const [doneCount, setDoneCount] = useState(0);

    useEffect(() => {
        const listener_set_username = ProfileCountEventEmitter.addListener('username_set', async (data) => {
            const username = data.name;
            const usernameCounts = await loadUsername(username);
            setDoneCount(usernameCounts.doneCount);
        });

        const listener_incr_done = ProfileCountEventEmitter.addListener('incr_done', () => {
            setDoneCount((prev) => prev + 1);
        });
        const listener_descr_done = ProfileCountEventEmitter.addListener('decr_done', () => {
            setDoneCount((prev) => prev - 1);
        });

        return () => {
            listener_set_username.remove();
            listener_incr_done.remove();
            listener_descr_done.remove();
        }
    }, [])

    const listIconColor = useSharedValue("#3e2723");
    const doneIconColor = useSharedValue("#3e2723");
    const profileIconColor = useSharedValue("#3e2723");
    const barTranslateX = useSharedValue(0);
    const animateCurrentSectionIndicator = (sectionIndex) => {
        // 0 = First section
        // 1 = Second section
        // 2 = Third Section
        barTranslateX.value = withTiming(sectionIndex * 80, {
            duration: 150,
            easing: Easing.out(Easing.exp)
        });

        // 1.6 KNOWN ISSUE Colors aren't changing, at least on Android
        //
        //console.log("sectionIndex value: " + sectionIndex);
        listIconColor.value = withTiming((sectionIndex == 0) ? "#556b2f" : "#3e2723", { duration: 500 });
        doneIconColor.value = withTiming((sectionIndex == 1) ? "#556b2f" : "#3e2723", { duration: 500 });
        profileIconColor.value = withTiming((sectionIndex == 2) ? "#556b2f" : "#3e2723", { duration: 500 });
    }

    // Pulse the badge on every change of doneCount, even on
    // the initial mount
    const doneBadgeScaleX = useSharedValue(0);
    useEffect(() => {
        doneBadgeScaleX.value = withSequence(
            withTiming(1.4, { duration: 200, easing: Easing.out(Easing.cubic) }),
            withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })
        );
    }, [doneCount])

    const styles = StyleSheet.create({
        sectionContainer: {

        },
        iconContainer: {
            flexDirection: 'row',
            height: 48,
            justifyContent: 'center',
            alignItems: 'center'
        },
        sectionIconContainer: {
            position: 'relative',   // For positioning any badging
            paddingRight: 28,       // Keep these synced with currentSectionIndicator margin
            paddingLeft: 28
        },
        currentSectionIndicator: {
            marginLeft: 18,         // Keep these synced with sectionIcon padding
            marginRight: 18,
            width: 42,
            height: 3,
            backgroundColor: "#556b2f"
        },
        doneCountContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#556B2F',
            borderRadius: 9,
            borderWidth: 2,
            borderColor: '#FAF3E0',
            width: (doneCount < 10) ? 20 : (doneCount < 100) ? 26 : 36,
            position: 'absolute',
            left: 12,
            top: -6,
            paddingHorizontal: 3
        },
        doneCountText: {
            fontSize: 12,
            color: 'white',
            position: 'relative',
            top: -0.5,
            textAlign: 'center'
        },
        doneIconContainer: {
            position: 'relative'
        }
    });

    return (
        <View style={styles.sectionContainer}>
            <Animated.View style={[styles.currentSectionIndicator, { transform: [{ translateX: barTranslateX }] }]}></Animated.View>
            <View style={styles.iconContainer}>
                <Pressable hitSlop={10} style={styles.sectionIconContainer} onPress={() => {
                    animateCurrentSectionIndicator(0);
                    //Alert.alert("Implement Me!")
                }}>
                    <List wxh="24" color={listIconColor} />
                </Pressable>
                <Pressable hitSlop={10} style={styles.sectionIconContainer} onPress={() => {
                    animateCurrentSectionIndicator(1);
                    //Alert.alert("Implement Me!")
                }}><View style={styles.doneIconContainer}>
                        <CircleCheck wxh="24" color={doneIconColor} />
                        {(doneCount > 0) ?
                            <Animated.View style={[styles.doneCountContainer, { transform: [{ scale: doneBadgeScaleX }] }]}>
                                <Text style={styles.doneCountText}>{formatNumber(doneCount)}</Text>
                            </Animated.View>
                            : <></>
                        }
                    </View>
                </Pressable>
                <Pressable hitSlop={10} style={styles.sectionIconContainer} onPress={() => {
                    animateCurrentSectionIndicator(2);
                    //Alert.alert("Implement Me!")
                }}>
                    <UserRound wxh="24" color={profileIconColor} />
                </Pressable>
            </View>
        </View>
    )
}

export default NavigationSections;