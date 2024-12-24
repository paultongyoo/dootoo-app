import { Platform, View, StyleSheet, Text, Pressable, Image } from "react-native";
import Animated from "react-native-reanimated";

const DootooHeader = ({ navigation, route, options }) => {

    const styles = StyleSheet.create({
        headerContainer: {
            backgroundColor: '#FAF3E0',
            height: (Platform.OS == 'ios') ? 100 : 90,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 2 // Elevation for Android      
        },
        headerLeftContainer: {
            position: 'absolute',
            left: 10,
            bottom: 5
        },
        headerRightContainer: {
            position: 'absolute',
            right: 10,
            bottom: 6
        },
        mainLogoContainer: {
            flexDirection: 'row',
            position: 'relative',
            bottom: -4
        },
        mainLogoPart: {
            fontSize: 28,
            fontWeight: 500
        },
        secondLogoPart: {
            color: "#A23E48"
        },
        mainProfileIconContainer: {
            position: 'relative',
            paddingRight: 4,
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
        <Animated.View style={[styles.headerContainer]}>
            <View style={styles.headerLeftContainer}>
                <View style={styles.mainLogoContainer}>
                    <Text style={[{ fontWeight: 500 }, styles.mainLogoPart]}>doo</Text>
                    <Text style={[styles.mainLogoPart, styles.secondLogoPart]}>too</Text>
                </View>
            </View>
            {/* <View style={styles.headerRightContainer}>
                <Pressable style={styles.mainProfileIconContainer}
                    onPress={() => {
                        navigation.navigate('/profile')
                    }}>
                    <UserRound wxh="24" color={useSharedValue("#556B2F")} />
                </Pressable>
            </View> */}
        </Animated.View>
    );
}

export default DootooHeader;

