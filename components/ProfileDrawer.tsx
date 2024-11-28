import { usePathname } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Alert, Pressable, View, Image, StyleSheet, Text, ActivityIndicator, Linking, Platform } from "react-native";
import { AppContext } from "./AppContext";
import * as amplitude from '@amplitude/analytics-react-native';
import { formatNumber, showComingSoonAlert } from './Helpers';
import { loadUsername } from "./Storage";
import { ListItemEventEmitter } from "./ListItemEventEmitter";


const ProfileDrawer = ({ navigation }) => {
  const pathname = usePathname();
  const { username, anonymousId,
    resetUserContext, dootooItems
  } = useContext(AppContext);

  const [doneCount, setDoneCount] = useState(0);
  const [tipCount, setTipCount] = useState(0);

  useEffect(() => {
    //console.log("Inside Profile Drawer useEffect");
    let ignore = false;

    const fetchUsernameCounts = async () => {
      const usernameCounts = await loadUsername(username);
      if (!ignore) {
        //console.log("Updating latest profile counts: " + JSON.stringify(usernameCounts));
        setDoneCount(usernameCounts.doneCount);
        setTipCount(usernameCounts.tipCount);
      }
    }

    const eventHandler_afterSave = ListItemEventEmitter.addListener('items_saved', () => {
      //console.log("Calling fetch counts for: " + thing.text);
      fetchUsernameCounts();
    });

    return () => {
      // Race Condition Mgmt: Only allow last render of this compononent to update state
      ignore = true;
      eventHandler_afterSave.remove();
    }
  }, [dootooItems])


  const showConfirmationPrompt = () => {
    amplitude.track("User Data Deletion Started", {
      anonymous_id: anonymousId,
      pathname: pathname
    });
    Alert.alert(
      'Are you sure?', // Title of the alert
      'This will delete all your dootoo data and generate a new username.  This cannot be undone.', // Message of the alert
      [
        {
          text: 'Cancel',
          onPress: () => {
            amplitude.track("User Data Deletion Cancelled", {
              anonymous_id: anonymousId,
              pathname: pathname
            });
          },
          style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
        },
        {
          text: 'OK',
          onPress: () => {
            //console.log('Data Deletion OK Pressed');
            amplitude.track("User Data Deletion Completed", {
              anonymous_id: anonymousId,
              pathname: pathname
            });
            resetUserContext();
          },
        },
      ],
      { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
    );
  };

  const sendEmail = () => {
    amplitude.track("Email Feedback Link Clicked", {
      anonymous_id: anonymousId,
      pathname: pathname
    });

    const email = 'contact@thoughtswork.co'; // Replace with the desired email address
    const subject = `Feedback from ${username}`; // Optional: add a subject
    const body = '';

    // Construct the mailto URL
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Use Linking API to open email client
    Linking.openURL(url).catch(err => console.error('Error opening email client:', err));

    amplitude.track("Email Feedback Link Opened", {
      anonymous_id: anonymousId,
      pathname: pathname
    });
  };

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
      height: 30,
      width: 30
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
    }
  });

  return (
    <View style={styles.profileDrawerContainer}>
      <Pressable style={styles.profileDrawerCloseContainer}
        onPress={() => {
          amplitude.track("Profile Drawer Closed", {
            anonymous_id: anonymousId,
            pathname: pathname
          });
          navigation.closeDrawer();
        }}>
        <Image style={styles.profileDrawerCloseIcon} source={require('@/assets/images/cancel_icon_black.png')} />
      </Pressable>
      <View style={styles.profileDrawerProfileIconContainer}>
        <Image style={styles.profileDrawerProfileIcon} source={require('@/assets/images/profile_icon_green.png')} />
        <View style={styles.profileDrawerProfileNameContainer}>
          {(!username || username.length == 0) ?
            <ActivityIndicator size={"large"} color="#3E3723" />
            :
            <Text style={styles.profileDrawerProfileNameText}>{username}</Text>
          }
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
            <Image style={styles.statIcon_Tips} source={require('@/assets/images/light_bulb_blackyellow.png')} />
          </View>
          <Text style={styles.statNumber}>{formatNumber(tipCount) || '0'}</Text>
          <Text style={styles.statName}>Tips</Text>
        </Pressable>
      </View>
      <View style={styles.privacyContainer}>
        {/* <View style={styles.anonIdDisplayContainer}>
            <Text style={styles.anonIdDisplayText}>Your Anonymous ID:</Text>
            <Text selectable={true} style={styles.anonIdDisplayText}>{anonymousId}</Text>
          </View> */}
        <View style={styles.deleteDataLinkContainer}>
          <Pressable onPress={showConfirmationPrompt}>
            <Text style={styles.deleteDataLinkText}>Delete My Data</Text>
          </Pressable>
        </View>
        <View style={styles.feedbackLinkContainer}>
          <Pressable onPress={sendEmail}>
            <Text style={styles.feedbackLinkText}>Email Feedback</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default ProfileDrawer;