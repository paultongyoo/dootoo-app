import { usePathname } from "expo-router";
import { useContext, useEffect } from "react";
import { Alert, Pressable, View, Image, StyleSheet, Text, ActivityIndicator } from "react-native";
import { AppContext } from "./AppContext";
import * as amplitude from '@amplitude/analytics-react-native';
import { formatNumber, showComingSoonAlert } from './Helpers';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { loadUsername } from "./Storage";


const CommunityDrawer = ({ navigation }) => {
  const pathname = usePathname();
  const { anonymousId, selectedProfile, setSelectedProfile
  } = useContext(AppContext);
  const animatedOpacity = useSharedValue(0);
  const animatedOpacityStyle = useAnimatedStyle(() => {
   return { opacity: animatedOpacity.value }
  });

  useEffect(() => {
    //console.log("Inside CommunityDrawer.useEffect([])");
    //console.log("Selected Profile: " + JSON.stringify(selectedProfile));  
    console.log("Attempting to fade in loading animation...");
    animatedOpacity.value = withTiming(1, {
      duration: 500
    });

    if (!selectedProfile || !selectedProfile.doneCount) {
      loadSelectedProfile();
    }

  }, [selectedProfile]);

  const loadSelectedProfile = async() => {
    //console.log("Loading user counts for selected Username: " + selectedProfile.name);
    const loadedProfile = await loadUsername(selectedProfile.name);
    //console.log("Loaded Profile: " + JSON.stringify(loadedProfile));
    setSelectedProfile(loadedProfile);
  }

  const handleBlockProfileTap = () => {
    Alert.alert("Implement me!");
  }

  const styles = StyleSheet.create({
    profileDrawerContainer: {
      backgroundColor: '#FAF3E0',
      flex: 1,
      borderLeftWidth: 1,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#3E2723',
      alignItems: 'center'
    },
    loadingAnimContainer: {
      justifyContent: 'center',
      flex: 1
    },
    profileDrawerProfileIconContainer: {
      marginTop: 100,
      alignItems: 'center'
    },
    profileBlockIconContainer: {
      position: 'absolute',
      right: -20,
      top: -30
    },
    profileBlockIcon: {
      opacity: 0.6,
      height: 30,
      width: 30
    },
    profileDrawerProfileIcon: {
      height: 150,
      width: 150
    },
    profileDrawerProfileNameContainer: {
      paddingTop: 15
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

  if (!selectedProfile || !selectedProfile.doneCount) {
    return (
        <Animated.View style={[styles.profileDrawerContainer, animatedOpacityStyle]}>
          <View style={styles.loadingAnimContainer}>
            <Text style={styles.loadingProfileText}>Loading profile</Text>
            <ActivityIndicator size={"large"} color={"#3E2723"} />
          </View>
        </Animated.View>
      );
  } else {
    return (
      <Animated.View style={[styles.profileDrawerContainer, animatedOpacityStyle]}>
        <View style={styles.profileDrawerProfileIconContainer}>
          <Pressable style={styles.profileBlockIconContainer}
            onPress={() => {
              amplitude.track("Block Profile Button Tapped", {
                anonymous_id: anonymousId,
                usrename: pathname
              });
              handleBlockProfileTap();
            }}>
            <Image style={styles.profileBlockIcon} source={require('@/assets/images/block_icon_3E2723.png')} />
          </Pressable>
          <Image style={styles.profileDrawerProfileIcon} source={require('@/assets/images/profile_icon_red.png')} />
          <View style={styles.profileDrawerProfileNameContainer}>
            <Text style={styles.profileDrawerProfileNameText}>{selectedProfile.name}</Text>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <Pressable style={styles.statContainer}
            onPress={() => showComingSoonAlert("'All Done'")}>
            <View style={styles.statIconContainer}>
              <View style={[styles.statIconTask, styles.statIconTask_Done]}></View>
            </View>
            <Text style={styles.statNumber}>{formatNumber(selectedProfile.doneCount) || '0'}</Text>
            <Text style={styles.statName}>Done</Text>
          </Pressable>
          <Pressable style={styles.statContainer}
            onPress={() => showComingSoonAlert("'All Tips'")}>
            <View style={styles.statIconContainer}>
              <Image style={styles.statIcon_Tips} source={require('@/assets/images/give_icon_556B2F.png')} />
            </View>
            <Text style={styles.statNumber}>{formatNumber(selectedProfile.tipCount) || '0'}</Text>
            <Text style={styles.statName}>Tips</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }
}

export default CommunityDrawer;