import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Platform, View, StyleSheet, Easing, Text, Pressable, Image } from "react-native";
import * as amplitude from '@amplitude/analytics-react-native';

const DootooHeader = ({ navigation, route }) => {
    const pathname = usePathname();
    const headerPosition = useRef(new Animated.Value(-200)).current;

    const ITEMS_PATHNAME = "/drawer/stack";

    useEffect(() => {
        Animated.sequence([
            Animated.delay(500),
            Animated.timing(headerPosition, {
                toValue: 0,
                duration: 800,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true
            })
        ]).start();
    }, [pathname]);

    const styles = StyleSheet.create({
        headerContainer: {
            backgroundColor: '#FAF3E0',
            height: (Platform.OS == 'ios') ? 100 : 75
        },
        headerLeftContainer: {
            position: 'absolute',
            left: 10,
            bottom: 5
        },
        headerRightContainer: {
            position: 'absolute',
            right: 10,
            bottom: 5
        },
        mainLogoContainer: {
            flexDirection: 'row',
            position: 'relative',
            bottom: -4
        },
        mainLogoPart: {
            fontSize: 28
        },
        secondLogoPart: {
            color: "#A23E48"
        },
        mainProfileIconContainer: {
            position: 'relative',
            bottom: -4
        },
        profileIcon: {
            height: 40,
            width: 40
        },
        backButtonContainer: {
            width: 40,
            paddingTop: 20
        },
        backIcon_ios: {
            height: 30,
            width: 15,
            marginLeft: 5
        },
        backIcon_android: {
            height: 25,
            width: 25,
            marginBottom: 3,
            marginLeft: 2
        }
    });

    return (
        <Animated.View style={[styles.headerContainer, { transform: [{ translateY: headerPosition }] }]}>
            <View style={styles.headerLeftContainer}>
                {((pathname == ITEMS_PATHNAME)) ?
                    <View style={styles.mainLogoContainer}>
                        <Text style={styles.mainLogoPart}>doo</Text>
                        <Text style={[styles.mainLogoPart, styles.secondLogoPart]}>too</Text>
                    </View>
                    : <View style={styles.backButtonContainer}>
                        <Pressable onPress={navigation.goBack}>
                            {(Platform.OS == 'ios') ? <Image style={styles.backIcon_ios} source={require('@/assets/images/back_arrow_556B2F_ios.png')} />
                                : <Image style={styles.backIcon_android} source={require('@/assets/images/back_arrow_556B2F_android.png')} />}
                        </Pressable>
                    </View>}
            </View>
            <View style={styles.headerRightContainer}>
                <Pressable style={styles.mainProfileIconContainer}
                    onPress={() => {
                        amplitude.track("Profile Drawer Opened", {
                            pathname: pathname
                        });
                        navigation.openDrawer()
                    }}>
                    <Image style={styles.profileIcon} source={require('@/assets/images/profile_icon_green.png')} />
                </Pressable>
            </View>
        </Animated.View>
    );
}

export default DootooHeader;

