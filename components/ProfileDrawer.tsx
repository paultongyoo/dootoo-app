import { usePathname } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Pressable, View, Image, StyleSheet, Text, ActivityIndicator, Linking, Platform } from "react-native";
import { AppContext } from "./AppContext";
import * as amplitude from '@amplitude/analytics-react-native';
import { formatNumber, showComingSoonAlert } from './Helpers';
import { loadUsername, saveUserLocally, updateUsername } from "./Storage";
import { ProfileCountEventEmitter } from "./EventEmitters";
import Dialog from "react-native-dialog";


const ProfileDrawer = ({ navigation }) => {
  const pathname = usePathname();
  const { anonymousId, resetUserContext } = useContext(AppContext);

  const [username, setUsername] = useState('');
  const [doneCount, setDoneCount] = useState(0);
  const [tipCount, setTipCount] = useState(0);
  const [loadingNewUsername, setLoadingNewUsername] = useState(false);
  const [usernameDialogVisible, setUsernameDialogVisible] = useState(false);
  const [usernameInvalid, setUsernameInvalid] = useState(false);
  const usernameTextInputValue = useRef(username);
  const [dupeUsernameDialogVisible, setDupeUsernameDialogVisible] = useState(false);
  const [usernameModerationFailedDialogVisible, setUsernameModerationFailedDialogVisible] = useState(false);
  const [usernameSpammingFailedDialogVisible, setUsernameSpammingFailedDialogVisible] = useState(false);
  const [usernameUnexpectedDialogVisible, setUsernameUnexpectedDialogVisible] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
        const listener_set_username = ProfileCountEventEmitter.addListener('username_set', (data) => {
          setUsername(data.name)
        });

        return () => {
          listener_set_username.remove();
        }
  }, []);
  
  useEffect(() => {
    //console.log("Inside Profile Drawer useEffect");

    if (isInitialMount.current) {
      console.log("ProfileDrawer skipping useEffect(username) on initial mount.");
      isInitialMount.current = false;
    } else {
      let ignore = false;

      const fetchUsernameCounts = async () => {
        const usernameCounts = await loadUsername(username);
        if (!ignore) {
          //console.log("Updating latest profile counts: " + JSON.stringify(usernameCounts));
          setDoneCount(usernameCounts.doneCount);
          setTipCount(usernameCounts.tipCount);
        }
      }
      // Initialize counts
      fetchUsernameCounts();

      const listener_incr_done = ProfileCountEventEmitter.addListener('incr_done', () => {
        setDoneCount((prev) => prev + 1);
      });
      const listener_descr_done = ProfileCountEventEmitter.addListener('decr_done', () => {
        setDoneCount((prev) => prev - 1);
      });
      const listener_incr_tips = ProfileCountEventEmitter.addListener('incr_tips', (data) => {
        setTipCount((prev) => prev + data.count);
      });
      const listener_decr_tips = ProfileCountEventEmitter.addListener('decr_tips', () => {
        setTipCount((prev) => prev - 1);
      });

      return () => {
        // Race Condition Mgmt: Only allow last render of this compononent to update state
        ignore = true;
        listener_incr_done.remove();
        listener_descr_done.remove();
        listener_incr_tips.remove();
        listener_decr_tips.remove();
      }
    }
  }, [username])

  const showConfirmationPrompt = () => {
    amplitude.track("User Data Deletion Started", {
      anonymous_id: anonymousId.current,
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
              anonymous_id: anonymousId.current,
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
              anonymous_id: anonymousId.current,
              pathname: pathname
            });
            resetUserData();
          },
        },
      ],
      { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
    );
  };

  const resetUserData = async() => {
    setLoadingNewUsername(true);
    await resetUserContext();
    setLoadingNewUsername(false);
  }

  const sendEmail = () => {
    amplitude.track("Email Feedback Link Clicked", {
      anonymous_id: anonymousId.current,
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
      anonymous_id: anonymousId.current,
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
      top: (Platform.OS == 'ios') ? 62 : 55
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
    },
    refreshNameContainer: {
      paddingTop: 10
    },
    refreshNameIcon: {
      width: 21,
      height: 21,
      opacity: 0.6
    },
    usernameDialogTextInput_Invalid: {
      color: 'red'
    }
  });

  const handleEditUsername = () => {
    amplitude.track("Edit Username Started", {
      anonymous_id: anonymousId.current,
      pathname: pathname
    });
    usernameTextInputValue.current = username;
    setUsernameDialogVisible(true);
  }

  function handleUsernameEditTextInputChange(text: string) {
    usernameTextInputValue.current = text;

    const regex = /^[a-zA-Z0-9]+$/;

    if (regex.test(text) && text.length >= 5 && text.length <= 20) {
      setUsernameInvalid(false);
      return;
    }

    if (!regex.test(text) || text.length < 5 || text.length > 20) {
      setUsernameInvalid(true);
      return;
    }
  }

  function handleUsernameDialogCancel(): void {
    setUsernameDialogVisible(false);
    usernameTextInputValue.current = username;
  }

  const handleUsernameDialogSubmit = async () => {
    setUsernameDialogVisible(false);
    setLoadingNewUsername(true);
    const statusCode = await updateUsername(usernameTextInputValue.current);
    if (statusCode == 200) {
      setUsername(usernameTextInputValue.current);

      const updatedUserObj = {
        name: usernameTextInputValue.current,
        anonymous_id: anonymousId.current,
        tipCount: tipCount,
        doneCount: doneCount
      };
      await saveUserLocally(updatedUserObj);
      setLoadingNewUsername(false);

      amplitude.track("Edit Username Completed", {
        anonymous_id: anonymousId.current,
        pathname: pathname,
        username: usernameTextInputValue.current
      });
    } else if (statusCode == 409) {
      setLoadingNewUsername(false);
      setDupeUsernameDialogVisible(true);

      amplitude.track("Edit Username Submission Invalid", {
        anonymous_id: anonymousId.current,
        pathname: pathname,
        error_type: 'dupe',
        username: usernameTextInputValue.current
      });
    } else if (statusCode == 422) {
      setLoadingNewUsername(false);
      setUsernameModerationFailedDialogVisible(true);

      amplitude.track("Edit Username Submission Invalid", {
        anonymous_id: anonymousId.current,
        pathname: pathname,
        error_type: 'moderation_failed',
        username: usernameTextInputValue.current
      });
    } else if (statusCode == 423) {
      setLoadingNewUsername(false);
      setUsernameSpammingFailedDialogVisible(true);

      amplitude.track("Edit Username Submission Invalid", {
        anonymous_id: anonymousId.current,
        pathname: pathname,
        error_type: 'spam',
        username: usernameTextInputValue.current
      });
    } else {
      setLoadingNewUsername(false);
      setUsernameUnexpectedDialogVisible(true);

      amplitude.track("Edit Username Submission Invalid", {
        anonymous_id: anonymousId.current,
        pathname: pathname,
        error_type: 'unexpected',
        username: usernameTextInputValue.current
      });
    }
    usernameTextInputValue.current = username;
  }

  return (
    <View style={styles.profileDrawerContainer}>
      <Pressable style={styles.profileDrawerCloseContainer}
        onPress={() => {
          amplitude.track("Profile Drawer Closed", {
            anonymous_id: anonymousId.current,
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
        <Pressable style={styles.refreshNameContainer}
          disabled={loadingNewUsername}
          onPress={handleEditUsername}>
          {(loadingNewUsername)
            ? <ActivityIndicator size={"small"} color="#3E3723" />
            : <Image style={styles.refreshNameIcon} source={require('@/assets/images/edit_icon_556B2F.png')} />
          }
        </Pressable>
      </View>
      <View style={styles.statsContainer}>
        <Pressable style={styles.statContainer}
          onPress={() => showComingSoonAlert(anonymousId.current, "'Done'", pathname)}>
          <View style={styles.statIconContainer}>
            <View style={[styles.statIconTask, styles.statIconTask_Done]}></View>
          </View>
          <Text style={styles.statNumber}>{formatNumber(doneCount) || '0'}</Text>
          <Text style={styles.statName}>Done</Text>
        </Pressable>
        <Pressable style={styles.statContainer}
          onPress={() => showComingSoonAlert(anonymousId.current, "'Tips'", pathname)}>
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
          <Text selectable={true} style={styles.anonIdDisplayText}>{anonymousId.current}</Text>
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
      <Dialog.Container visible={usernameDialogVisible} onBackdropPress={handleUsernameDialogCancel}>
        <Dialog.Title>Change Username</Dialog.Title>
        <Dialog.Input
          multiline={false}
          style={usernameInvalid && styles.usernameDialogTextInput_Invalid}
          autoFocus={true}
          onSubmitEditing={handleUsernameDialogSubmit}
          defaultValue={usernameTextInputValue.current}
          onChangeText={(text) => {
            handleUsernameEditTextInputChange(text);
          }} />
        <Dialog.Description>
          Must be between 5 to 20 characters long, use only letters and numbers (no spaces or special characters) and follow community guidelines: no profanity, impersonation, spamming, or harmful content.
        </Dialog.Description>
        <Dialog.Button label="Cancel" onPress={handleUsernameDialogCancel} />
        <Dialog.Button label="Submit" onPress={handleUsernameDialogSubmit} disabled={usernameInvalid} />
      </Dialog.Container>
      <Dialog.Container visible={dupeUsernameDialogVisible} onBackdropPress={() => setDupeUsernameDialogVisible(false)}>
        <Dialog.Title>Username Already Taken</Dialog.Title>
        <Dialog.Description>Please choose another username.</Dialog.Description>
        <Dialog.Button label="OK" onPress={() => setDupeUsernameDialogVisible(false)} />
      </Dialog.Container>
      <Dialog.Container visible={usernameModerationFailedDialogVisible} onBackdropPress={() => setUsernameModerationFailedDialogVisible(false)}>
        <Dialog.Title>Username Violates Community Guidelines</Dialog.Title>
        <Dialog.Description>Please choose a username that refrains from containing profanity or harmful content.</Dialog.Description>
        <Dialog.Button label="OK" onPress={() => setUsernameModerationFailedDialogVisible(false)} />
      </Dialog.Container>
      <Dialog.Container visible={usernameSpammingFailedDialogVisible} onBackdropPress={() => setUsernameSpammingFailedDialogVisible(false)}>
        <Dialog.Title>Username Violates Community Guidelines</Dialog.Title>
        <Dialog.Description>Please choose a username that refrains from spamming or appearing to promote any products or services.</Dialog.Description>
        <Dialog.Button label="OK" onPress={() => setUsernameSpammingFailedDialogVisible(false)} />
      </Dialog.Container>
      <Dialog.Container visible={usernameUnexpectedDialogVisible} onBackdropPress={() => setUsernameUnexpectedDialogVisible(false)}>
        <Dialog.Title>Unable To Change Username</Dialog.Title>
        <Dialog.Description>An unexpected error occurred while trying to save your new username.  Please try again later.</Dialog.Description>
        <Dialog.Button label="OK" onPress={() => setUsernameUnexpectedDialogVisible(false)} />
      </Dialog.Container>
    </View>
  );
}

export default ProfileDrawer;