import { View, Pressable, StyleSheet, Text } from "react-native";
import { formatNumber } from "./Helpers";
import { CircleCheck } from "./svg/circle-check";
import { List } from "./svg/list";
import { UserRound } from "./svg/user-round";
import Animated, { Easing, runOnJS, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useContext, useEffect, useRef, useState } from "react";
import { NAVIGATION_EVENT__GO_TO_SECTION, NavigationEventEmitter, ProfileCountEventEmitter } from "./EventEmitters";
import { loadUsername } from "./Storage";
import { AppContext } from "./AppContext";
import { UsersRound } from "./svg/users-round";

const NavigationSections = ({ navigation }) => {

    const { username, doneCount, setDoneCount, tipCount, setTipCount } = useContext(AppContext);
    const [refreshKey, setRefreshKey] = useState(0);


    useEffect(() => {
        //console.log("NavigationSections.useEffect([])");

        const listener_incr_done = ProfileCountEventEmitter.addListener('incr_done', () => {
            setDoneCount(prevVal => prevVal + 1);
        });
        const listener_descr_done = ProfileCountEventEmitter.addListener('decr_done', (data) => {
            if (data && data.count) {
                setDoneCount(prevVal => prevVal - data.count);
            } else {
                setDoneCount(prevVal => prevVal - 1);
            }
        });

        const navigation_event_listener = NavigationEventEmitter.addListener(
            NAVIGATION_EVENT__GO_TO_SECTION, (sectionIndex) => {
                animateCurrentSectionIndicator(sectionIndex);
            }
        )

        return () => {
            listener_incr_done.remove();
            listener_descr_done.remove();
            navigation_event_listener.remove();
        }
    }, [])


    const initialUsernameMount = useRef(true);
    useEffect(() => {
        //console.log("NavigationSections.useEffect([username]), username " + username);
        if (initialUsernameMount.current) {
            initialUsernameMount.current = false
        } else {
            if (username) {
                const initUsername = async () => {
                    const usernameCounts = await loadUsername(username);
                    setDoneCount(usernameCounts.doneCount);
                    setTipCount(usernameCounts.tipCount);
                }
                initUsername();
            } else {
               console.log("NavigationSections.useEffect([username]) called with null username, unexpected?");
            }
        }
    }, [username])

    const navigateToSection = (idx) => {
        navigation.navigate((idx == 0) ? 'open'
            : (idx == 1) ? 'community'
            : (idx == 2) ? 'done' 
            : 'profile');
    }

    const listIconColor = useSharedValue("#3e2723");
    const doneIconColor = useSharedValue("#3e2723");
    const profileIconColor = useSharedValue("#3e2723");
    const communityIconColor = useSharedValue("#3e2723");
    const barTranslateX = useSharedValue(0);
    const animateCurrentSectionIndicator = (sectionIndex) => {
        // 0 = First section
        // 1 = Second section
        // 2 = Third Section
        barTranslateX.value = withTiming(sectionIndex * 80, {
            duration: 150,
            easing: Easing.out(Easing.exp)
        }, (isFinished) => {
            if (isFinished) {
                // 1.6 KNOWN ISSUE Colors aren't changing, at least on Android
                //
                //console.log("sectionIndex value: " + sectionIndex);
                // listIconColor.value = withTiming((sectionIndex == 0) ? "#556b2f" : "#3e2723", { duration: 500 });
                // communityIconColor.value = withTiming((sectionIndex == 1) ? "#556b2f" : "#3e2723", { duration: 500 });
                // doneIconColor.value = withTiming((sectionIndex == 2) ? "#556b2f" : "#3e2723", { duration: 500 });
                // profileIconColor.value = withTiming((sectionIndex == 3) ? "#556b2f" : "#3e2723", { duration: 500 });  

                runOnJS(navigateToSection)(sectionIndex);
            }
        });
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
            paddingLeft: 28,
            top: -2
        },
        currentSectionIndicator: {
            marginLeft: 18,         // Keep these synced with sectionIcon padding
            marginRight: 18,
            width: 42,
            height: 4,
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
            left: 16,
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
                }}>
                    <List wxh="24" color={listIconColor} />
                </Pressable>
                <Pressable hitSlop={10} style={styles.sectionIconContainer} onPress={() => {
                    animateCurrentSectionIndicator(1);
                }}>
                    <UsersRound wxh="24" color={communityIconColor} />
                </Pressable>
                <Pressable hitSlop={10} style={styles.sectionIconContainer} onPress={() => {
                    animateCurrentSectionIndicator(2);
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
                    animateCurrentSectionIndicator(3);
                }}>
                    <UserRound wxh="24" color={profileIconColor} />
                </Pressable>
            </View>
        </View>
    )
}

export default NavigationSections;