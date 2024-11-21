import { usePathname } from "expo-router";
import { useContext, useEffect } from "react";
import { Alert, Pressable, View, Image, StyleSheet, Text, ActivityIndicator, Linking, Platform } from "react-native";
import { AppContext } from "./AppContext";
import * as amplitude from '@amplitude/analytics-react-native';
import { formatNumber, showComingSoonAlert } from './Helpers';
//import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";


const CommunityDrawer = ({ navigation }) => {
  const pathname = usePathname();
  const { anonymousId, selectedProfile
  } = useContext(AppContext);
  //const animatedOpacity = useSharedValue(0);
  //const animatedOpacityStyle = useAnimatedStyle(() => {
  //  return { opacity: animatedOpacity.value }
  //});

  useEffect(() => {


  }, [selectedProfile])

  const styles = StyleSheet.create({
    profileDrawerContainer: {
      backgroundColor: '#FAF3E0',
      flex: 1,
      borderLeftWidth: 1,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#3E2723',
      alignItems: 'center',
      justifyContent: 'center'
    },
    profileDrawerCloseContainer: {
      position: 'absolute',
      right: 20,
      top: (Platform.OS == 'ios') ? 62 : 40
    },
    profileDrawerCloseIcon: {
      opacity: 0.4,
      height: 32,
      width: 30
    },
    profileDrawerProfileIconContainer: {
      marginTop: 100,
      // position: 'relative',
      // top: 100,
      //backgroundColor: 'red',
      alignItems: 'center'
    },
    profileDrawerProfileIcon: {
      height: 150,
      width: 150,
      //backgroundColor: 'yellow'
    },
    profileDrawerProfileNameContainer: {

    },
    profileDrawerProfileNameText: {
      fontSize: 20,
      paddingLeft: 20,
      paddingRight: 20
    },
    privacyContainer: {
      position: 'absolute',
      bottom: 70
    },
    anonIdDisplayContainer: {
      alignItems: 'center',
      width: 190,
      paddingBottom: 10
    },
    anonIdDisplayText: {
      textAlign: 'center'
    },
    deleteDataLinkContainer: {
      alignItems: 'center'
    },
    deleteDataLinkText: {
      color: "#A23E48",
      textDecorationLine: 'underline'
    },
    feedbackLinkContainer: {
      paddingTop: 20,
      alignItems: 'center'
    },
    feedbackLinkText: {
      color: "#556B2F",
      textDecorationLine: 'underline'
    },
    statsContainer: {
      flexDirection: 'row',
    },
    statContainer: {
      alignItems: 'center',
      paddingTop: 20,
      paddingRight: 30,
      paddingLeft: 30
    },
    statIconContainer: {
      paddingTop: 20,
      paddingBottom: 20,
      height: 60,
      justifyContent: 'center'
    },
    statIconTask: {
      width: 26,
      height: 26,
      borderRadius: 13, // Half of the width and height for a perfect circle
      borderColor: 'black',
      borderWidth: 2,
      backgroundColor: 'white'
    },
    statIconTask_Done: {
      backgroundColor: '#556B2F70'
    },
    statIcon_Tips: {
      height: 35,
      width: 55
    },
    statNumber: {
      fontWeight: 'bold',
      fontSize: 30,
      color: "#556B2F"
    },
    statName: {
      fontWeight: 'normal',
      fontSize: 18,
      paddingTop: 5
    },
    loadingProfileText: {
      fontSize: 20,
      marginBottom: 15
    }
  });

  if (selectedProfile == null) {
    return (
        <View style={styles.profileDrawerContainer}>
          {/* <Animated.View style={animatedOpacityStyle}> */}
          <View>
            <Text style={styles.loadingProfileText}>Loading profile</Text>
            <ActivityIndicator size={"large"} color={"#3E2723"} />
          </View>
        </View>
      );
  } else {

    return (
      <View style={styles.profileDrawerContainer}>
        <Pressable style={styles.profileDrawerCloseContainer}
          onPress={() => {
            amplitude.track("Block Profile Button Tapped", {
              anonymous_id: anonymousId,
              usrename: pathname
            });
            navigation.closeDrawer();
          }}>
          <Image style={styles.profileDrawerCloseIcon} source={require('@/assets/images/cancel_icon_black.png')} />
        </Pressable>
        <View style={styles.profileDrawerProfileIconContainer}>
          <Image style={styles.profileDrawerProfileIcon} source={require('@/assets/images/profile_icon_red.png')} />
          <View style={styles.profileDrawerProfileNameContainer}>
            <Text style={styles.profileDrawerProfileNameText}>{username}</Text>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <Pressable style={styles.statContainer}
            onPress={() => showComingSoonAlert("'All Done'")}>
            <View style={styles.statIconContainer}>
              <View style={[styles.statIconTask, styles.statIconTask_Done]}></View>
            </View>
            <Text style={styles.statNumber}>{formatNumber(doneCount) || '0'}</Text>
            <Text style={styles.statName}>Done</Text>
          </Pressable>
          <Pressable style={styles.statContainer}
            onPress={() => showComingSoonAlert("'All Tips'")}>
            <View style={styles.statIconContainer}>
              <Image style={styles.statIcon_Tips} source={require('@/assets/images/give_icon_556B2F.png')} />
            </View>
            <Text style={styles.statNumber}>{formatNumber(tipCount) || '0'}</Text>
            <Text style={styles.statName}>Tips</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

export default CommunityDrawer;