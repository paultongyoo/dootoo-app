import { usePathname, useRouter } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Pressable, View, Image, StyleSheet, Text, ActivityIndicator, TextInput, Platform } from "react-native";
import { AppContext } from "./AppContext";
import * as amplitude from '@amplitude/analytics-react-native';
import { formatNumber, showComingSoonAlert } from './Helpers';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { blockUser, loadUsername } from "./Storage";
import Dialog from "react-native-dialog";
import RNPickerSelect from 'react-native-picker-select';


const CommunityDrawer = ({ navigation }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { anonymousId, selectedProfile, setSelectedProfile } = useContext(AppContext);
  const animatedOpacity = useSharedValue(0);
  const animatedOpacityStyle = useAnimatedStyle(() => {
    return { opacity: animatedOpacity.value }
  });
  const TIPS_PATHNAME = '/meDrawer/communityDrawer/stack/tips';

  const [blockDialogVisible, setBlockDialogVisible] = useState(false);
  const [blockSuccessDialogVisible, setBlockSuccessDialogVisible] = useState(false);
  const [selectedBlockReason, setSelectedBlockReason] = useState('no_reason');
  const [blockReasonOtherText, setBlockReasonOtherText] = useState();
  const [isBlockProcessing, setIsBlockingProcessing] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    //console.log("Checking selectedItem context: " + JSON.stringify(selectedItem));

    if (isInitialMount.current) {
      console.log("CommunityDrawer skipping useEffect(selectedProfile) on initial mount.");
      isInitialMount.current = false;
    } else {
      animatedOpacity.value = 0;
      animatedOpacity.value = withTiming(1, {
        duration: 300
      });

      if (selectedProfile && !selectedProfile.doneCount) {
        loadSelectedProfile();

        amplitude.track("Community Profile Viewed", {
          anonymous_id: anonymousId.current,
          pathname: pathname,
          name: selectedProfile.name
        });
      }
    }
  }, [selectedProfile]);

  const loadSelectedProfile = async () => {
    const loadedProfile = await loadUsername(selectedProfile.name);
    animatedOpacity.value = withTiming(0, {
        duration: 300
      }, (isFinished) => { 
        if (isFinished) {
          runOnJS(setSelectedProfile)(loadedProfile);
        } 
      }
    );
  }

  const handleBlockProfileTap = () => {
    setSelectedBlockReason('no_reason');
    setBlockSuccessDialogVisible(false)
    setIsBlockingProcessing(false);
    setBlockDialogVisible(true);
  }

  const styles = StyleSheet.create({
    profileDrawerContainer: {
      backgroundColor: '#FAF3E0',
      flex: 1,
      borderRightWidth: 1,
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
      right: 0,
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
    loadingProfileText: {
      fontSize: 20,
      marginBottom: 15
    },
    dialogContainer: {
      flex: 1,
      //justifyContent: 'center',
      //alignItems: 'center',
    },
    dialogBoxContainer: {
      //height: 220,
      justifyContent: 'center',
      alignItems: 'center'
    },
    blockedReasonTextInput: {
      // borderWidth: 1,
      // borderColor: "3E3723",
      height: 50,
      padding: 10,
      width: 200
    },
    dialogBoxLoadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1
    }
  });

  const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
      fontSize: 14,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: 'gray',
      borderRadius: 4,
      color: 'black',
      textAlign: 'center',
      marginLeft: 20,
      marginRight: 20,
      marginBottom: 20,
      backgroundColor: 'white'
    },
    inputAndroid: {
      fontSize: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 0.5,
      borderColor: 'purple',
      borderRadius: 8,
      color: 'black',
      paddingRight: 30, // to ensure the text is never behind the icon
    },
  });

  function handleBlockCancel(): void {
    setBlockDialogVisible(false);

    amplitude.track("Block Profile Cancelled", {
      anonymous_id: anonymousId.current,
      pathname: pathname,
      name: selectedProfile.name,
      doneCount: selectedProfile.doneCount,
      tipCount: selectedProfile.tipCount
    });
  }

  function handleBlockSubmit(): void {
    console.log("Selected Block Reason: " + selectedBlockReason);
    if (blockReasonOtherText) console.log("Block Reason Other Text: " + blockReasonOtherText);
    submitUserBlock();
  }

  const submitUserBlock = async () => {
    setBlockDialogVisible(false);
    setIsBlockingProcessing(true);
    const reasonString = (selectedBlockReason == "other") ? `${selectedBlockReason}: ${blockReasonOtherText}` : selectedBlockReason
    const wasBlockSuccessful = await blockUser(selectedProfile.name, reasonString)
    setIsBlockingProcessing(false);
    if (wasBlockSuccessful) {
      setBlockSuccessDialogVisible(true)

      amplitude.track("Block Profile Blocked", {
        anonymous_id: anonymousId.current,
        pathname: pathname,
        name: selectedProfile.name,
        doneCount: selectedProfile.doneCount,
        tipCount: selectedProfile.tipCount
      });
    } else {
      Alert.alert("Unexpected error occurred", "An unexpected error occurred when attempting to block the user.  We will fix this issue as soon as possible.");
    }
  }

  if (!selectedProfile || !selectedProfile.doneCount) {
    return (
      <View style={styles.profileDrawerContainer}>
        <Animated.View style={[styles.loadingAnimContainer, animatedOpacityStyle]}>
          <Text style={styles.loadingProfileText}>Loading profile</Text>
          <ActivityIndicator size={"large"} color={"#3E2723"} />
        </Animated.View>
      </View>
    );
  } else {

    return (
      <View style={styles.profileDrawerContainer}>
        <Animated.View style={[animatedOpacityStyle]}>
          <View style={styles.profileDrawerProfileIconContainer}>
            <Pressable style={styles.profileBlockIconContainer}
              onPress={() => {
                amplitude.track("Block Profile Button Tapped", {
                  anonymous_id: anonymousId.current,
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
              onPress={() => showComingSoonAlert(anonymousId.current, "'Done'", pathname)}>
              <View style={styles.statIconContainer}>
                <View style={[styles.statIconTask, styles.statIconTask_Done]}></View>
              </View>
              <Text style={styles.statNumber}>{formatNumber(selectedProfile.doneCount) || '0'}</Text>
              <Text style={styles.statName}>Done</Text>
            </Pressable>
            <Pressable style={styles.statContainer}
              onPress={() => showComingSoonAlert(anonymousId.current, "'Tips'", pathname)}>
              <View style={styles.statIconContainer}>
                <Image style={styles.statIcon_Tips} source={require('@/assets/images/light_bulb_blackyellow.png')} />
              </View>
              <Text style={styles.statNumber}>{formatNumber(selectedProfile.tipCount) || '0'}</Text>
              <Text style={styles.statName}>Tips</Text>
            </Pressable>
          </View>
        </Animated.View>
        <View style={styles.dialogContainer}>
          <Dialog.Container contentStyle={styles.dialogBoxContainer} visible={blockDialogVisible} onBackdropPress={handleBlockCancel}>
            <Dialog.Title>Report & Block User</Dialog.Title>
            <Dialog.Description>This currently cannot be undone.</Dialog.Description>
            <RNPickerSelect
              onValueChange={(value) => setSelectedBlockReason(value)}
              placeholder={{ label: 'Select a reason', value: 'no_reason' }}
              style={pickerSelectStyles}
              items={[
                { label: 'Just don\'t want to see their tips', value: 'just_dont_want_to_see' },
                { label: 'Hate Speech', value: 'hate_speech' },
                { label: 'Cyberbullying', value: 'cyberbulling' },
                { label: 'Violent threats', value: 'violent_threats' },
                { label: 'Promoting Services, Spam', value: 'sell_promote_spam' },
                { label: 'Other', value: 'other' },
              ]} />
            {(selectedBlockReason == 'other') ?
              <Dialog.Input
                multiline={true}
                numberOfLines={2}
                style={styles.blockedReasonTextInput}
                placeholder={'Enter reason'}
                onChangeText={(text) => {
                  setBlockReasonOtherText(text);
                }} /> : <></>
            }
            <Dialog.Button label="Cancel" onPress={handleBlockCancel} />
            <Dialog.Button label="Block" onPress={handleBlockSubmit} />
          </Dialog.Container>
          <Dialog.Container contentStyle={styles.dialogBoxContainer} visible={isBlockProcessing} onBackdropPress={handleBlockCancel}>
            <ActivityIndicator size={"large"} />
          </Dialog.Container>
          <Dialog.Container contentStyle={styles.dialogBoxContainer} visible={blockSuccessDialogVisible} onBackdropPress={handleBlockCancel}>
            <Dialog.Title>User Reported & Blocked</Dialog.Title>
            <Dialog.Description>You will no longer see each other's tips.</Dialog.Description>
            <Dialog.Button label="Dismiss" onPress={() => {
              setBlockSuccessDialogVisible(false);
              navigation.closeDrawer();
              router.replace(TIPS_PATHNAME);
            }} />
          </Dialog.Container>
          {/* {(blockSuccessDialogVisible) ? <><Dialog.Title>User Reported & Blocked</Dialog.Title>
              <Dialog.Description>You will no longer see each other's tips.</Dialog.Description>
              <Dialog.Button label="Dismiss" onPress={() => {
                setBlockDialogVisible(false);
                navigation.closeDrawer();
                router.replace(TIPS_PATHNAME);
              }} />
            </>
              : (isBlockProcessing) ? <ActivityIndicator size={"large"} /> :
                <>
                  <Dialog.Title>Report & Block User</Dialog.Title>
                  <Dialog.Description>This currently cannot be undone.</Dialog.Description>
                  <RNPickerSelect
                    onValueChange={(value) => setSelectedBlockReason(value)}
                    placeholder={{ label: 'Select a reason', value: 'no_reason' }}
                    items={[
                      { label: 'Just don\'t want to see their tips', value: 'just_dont_want_to_see' },
                      { label: 'Hate Speech', value: 'hate_speech' },
                      { label: 'Cyberbullying', value: 'cyberbulling' },
                      { label: 'Violent threats', value: 'violent_threats' },
                      { label: 'Selling, Promoting Services, Spam', value: 'sell_promote_spam' },
                      { label: 'Other', value: 'other' },
                    ]} />
                  {(selectedBlockReason == 'other') ?
                    <Dialog.Input
                      multiline={true}
                      numberOfLines={2}
                      style={styles.blockedReasonTextInput}
                      placeholder={'Enter reason'}
                      onChangeText={(text) => {
                        setBlockReasonOtherText(text);
                      }} />
                    : <></>
                  }
                  <View style={{ flexDirection: 'row' }}>
                    <Dialog.Button label="Cancel" onPress={(handleBlockCancel)} />
                    <Dialog.Button label="Block" onPress={handleBlockSubmit} />
                  </View>
                </>
            } */}

        </View>
      </View>
    );
  }
}

export default CommunityDrawer;