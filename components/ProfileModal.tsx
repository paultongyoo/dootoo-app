import { useEffect, useState } from "react";
import { StyleSheet, View, Image, Text, ActivityIndicator } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { formatNumber } from "./Helpers";
import { CircleCheck } from "./svg/circle-check";
import { loadUsername } from "./Storage";
import Modal from "react-native-modal";

const ProfileModal = ({ username, modalVisible, modalVisibleSetter }) => {

    const [user, setUser] = useState(null);
    const opacity = useSharedValue(0);
    const animatedOpacityStyle = useAnimatedStyle(() => {
        return { opacity: opacity.value }
    })
    const greenSV = useSharedValue('#556B2F');

    const retrieveUser = async () => {

        await new Promise<void>((resolve) => {
            opacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
                if (isFinished) {
                    runOnJS(resolve)();
                }
            })
        });
        const loadedUser = await loadUsername(username);

        await new Promise<void>((resolve) => {
            opacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
                if (isFinished) {
                    runOnJS(resolve)();
                }
            })
        });
        setUser(loadedUser);
    }

    useEffect(() => {
        if (username && username.length > 0) {
            retrieveUser();
        }
    }, [username]);

    const styles = StyleSheet.create({
        profileDrawerContainer: {
            backgroundColor: '#FAF3E0',
            flexShrink: 1,
            alignItems: 'center',
            borderRadius: 10,
            paddingTop: 40,
            paddingBottom: 30
        },
        profileDrawerProfileIconContainer: {
            
            alignItems: 'center'
        },
        profileDrawerProfileIcon: {
            height: 150,
            width: 150,
            //backgroundColor: 'yellow'
        },
        profileDrawerProfileNameContainer: {
            paddingTop: 15
        },
        profileDrawerProfileNameText: {
            fontSize: 20,
            paddingLeft: 20,
            paddingRight: 20
        },
        profileDrawerProfileAffirmationContainer: {
            marginTop: 20,
            padding: 15,
            width: '75%',
            justifyContent: 'center',
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: '#556B2F30',
            borderBottomWidth: 1,
            borderBottomColor: '#556B2F30'
        },
        profileDrawerProfileAffirmationText: {
            textAlign: 'center',
            color: '#556B2F',
            fontWeight: 'bold',
            fontSize: 20
        },
        statsContainer: {
            flexDirection: 'row',
        },
        statContainer: {
            alignItems: 'center',
            paddingVertical: 15
        },
        statIconContainer: {
            paddingTop: 10,
            justifyContent: 'center'
        },
        statNumber: {
            fontWeight: 'bold',
            fontSize: 30,
            color: "#556B2F",
            paddingVertical: 7
        },
        statName: {
            fontWeight: 'normal',
            fontSize: 18
        },
        loadingProfileText: {
            fontSize: 20,
            marginBottom: 15
        },
        loadingAnimContainer: {
            justifyContent: 'center',
            flex: 1
        }
    });

    return (
        <Modal
            isVisible={modalVisible}
            onBackdropPress={() => { modalVisibleSetter(false) }}
            backdropOpacity={0.3}
            animationIn="fadeIn"
            animationOut="fadeOut">
            <View style={styles.profileDrawerContainer}>
                {(!user) ?
                    <Animated.View style={[styles.loadingAnimContainer, animatedOpacityStyle]}>
                        <Text style={styles.loadingProfileText}>Loading profile</Text>
                        <ActivityIndicator size={"large"} color={"#3E2723"} />
                    </Animated.View>
                    : <>
                        <View style={styles.profileDrawerProfileIconContainer}>
                            <Image source={require("@/assets/images/profile_icon_red.png")} />
                            <View style={styles.profileDrawerProfileNameContainer}>
                                <Text style={styles.profileDrawerProfileNameText}>{user.name}</Text>
                            </View>
                            {(user.affirmation && user.affirmation.length > 0) ?
                                <View style={styles.profileDrawerProfileAffirmationContainer}>
                                    <Text style={styles.profileDrawerProfileAffirmationText}>{user.affirmation}</Text>
                                </View>
                                : <></>
                            }
                        </View>
                        <View style={styles.statsContainer}>
                            <View style={styles.statContainer}>
                                <View style={styles.statIconContainer}>
                                    <CircleCheck wxh="40" color={greenSV} />
                                </View>
                                <Text style={styles.statNumber}>{formatNumber(user.doneCount) || '0'}</Text>
                                <Text style={styles.statName}>Done</Text>
                            </View>
                        </View>
                    </>
                }
            </View>
        </Modal>
    );
}

export default ProfileModal;