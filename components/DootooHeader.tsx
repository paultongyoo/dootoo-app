import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform, View, StyleSheet, Text, Pressable, Image } from "react-native";
import * as amplitude from '@amplitude/analytics-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const DootooHeader = ({ meDrawerNavigation }) => {
    const router = useRouter();
    const pathname = usePathname();
    const opacity = useSharedValue(0);

    const ITEMS_PATHNAME = "/meDrawer/communityDrawer/stack";

    useEffect(() => {
        opacity.value = withTiming(1, {
            duration: 500
        })
    }, [pathname]);

    const styles = StyleSheet.create({
        headerContainer: {
            backgroundColor: '#FAF3E0',
            height: (Platform.OS == 'ios') ? 100 : 90,
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 4 }, 
            shadowOpacity: 0.2, 
            shadowRadius: 5,
            elevation: 5, // Elevation for Android       
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
            paddingRight: 2,
            paddingBottom: 2
        },
        profileIcon: {
            height: 30,
            width: 30
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
        <Animated.View style={[styles.headerContainer, { opacity }]}>
            <View style={styles.headerLeftContainer}>
                {((pathname == ITEMS_PATHNAME)) ?
                    <View style={styles.mainLogoContainer}>
                        <Text style={styles.mainLogoPart}>doo</Text>
                        <Text style={[styles.mainLogoPart, styles.secondLogoPart]}>too</Text>
                    </View>
                    : <View style={styles.backButtonContainer}>
                        <Pressable onPress={router.back}>
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
                        meDrawerNavigation.openDrawer()
                    }}>
                    <Image style={styles.profileIcon} source={require('@/assets/images/profile_icon_green.png')} />
                </Pressable>
            </View>
        </Animated.View>
    );
}

export default DootooHeader;

