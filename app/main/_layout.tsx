import {
  View, Text, StyleSheet, Image, ActivityIndicator,
  Pressable, Alert, Platform, Linking,
  Animated,
  Easing
} from "react-native";
import { useEffect, useContext, useRef } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Drawer } from 'expo-router/drawer';
import { AppProvider, AppContext } from '../../components/AppContext';
import Toast from 'react-native-toast-message';
import toastConfig from '../../components/ToastConfig';
import { useSegments, usePathname, Stack } from 'expo-router';
import * as amplitude from '@amplitude/analytics-react-native';


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

export default function MainLayout() {
  const segments = useSegments();
  const pathname = usePathname();
  const headerPosition = useRef(new Animated.Value(-200)).current;

  const INDEX_PATHNAME_1 = "/main/screens";
  const INDEX_PATHNAME_2 = "/main";

  useEffect(() => {
    console.log("Main Layout pathname: " + pathname);
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

  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProvider>
          <Drawer
            drawerContent={(props) => <ProfileDrawer {...props} />}
            screenOptions={
              {
                drawerPosition: 'right',
                headerTransparent: true,
                header: ({ navigation, route, options }) => {
                  return (
                    <Animated.View style={[styles.headerContainer, { transform: [{ translateY: headerPosition }] }]}>
                      <View style={styles.headerLeftContainer}>
                        {((pathname == INDEX_PATHNAME_1) || (pathname == INDEX_PATHNAME_2)) ?
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
              }
            } />
        </AppProvider>
        <Toast config={toastConfig} />
      </GestureHandlerRootView>
      <StatusBar style="dark" />
    </>
  );
}

function ProfileDrawer({ navigation }) {
  const pathname = usePathname();
  const { username, anonymousId,
    doneCount, tipCount,
    resetUserContext
  } = useContext(AppContext);

  const showComingSoonAlert = (featureName) => {
    Alert.alert(
      `${featureName} Feature Coming Soon`, // Title of the alert
      "Look for this in a future release.  We've noted you're looking for it.  Thanks!", // Message of the alert
      [
        {
          text: 'OK',
          onPress: () => {
            console.log('Data Deletion OK Pressed');
            amplitude.track("Coming Soon Popup Displayed", {
              anonymous_id: anonymousId,
              pathname: pathname,
              featureName: featureName
            });
          },
        },
      ],
      { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
    );
  };

  const showConfirmationPrompt = () => {
    Alert.alert(
      'Are you sure?', // Title of the alert
      'This will delete all data stored by dootoo and generate a new username and anonymous ID for you.', // Message of the alert
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Data Deletion Cancel Pressed'),
          style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
        },
        {
          text: 'OK',
          onPress: () => {
            console.log('Data Deletion OK Pressed');
            resetUserContext();
          },
        },
      ],
      { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
    );
  };

  const sendEmail = () => {
    const email = 'contact@thoughtswork.co'; // Replace with the desired email address
    const subject = `Feedback from User ${username}`; // Optional: add a subject
    const body = '';

    // Construct the mailto URL
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;



    // Use Linking API to open email client
    Linking.openURL(url).catch(err => console.error('Error opening email client:', err));
  };

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
            <ActivityIndicator size={"large"} color="black" />
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
          <Text style={styles.statNumber}>{doneCount || '0'}</Text>
          <Text style={styles.statName}>Done</Text>
        </Pressable>
        <Pressable style={styles.statContainer}
          onPress={() => showComingSoonAlert("'All Tips'")}>
          <View style={styles.statIconContainer}>
            <Image style={styles.statIcon_Tips} source={require('@/assets/images/give_icon_556B2F.png')} />
          </View>
          <Text style={styles.statNumber}>{tipCount || '0'}</Text>
          <Text style={styles.statName}>Tips</Text>
        </Pressable>
      </View>
      <View style={styles.privacyContainer}>
        {/* <View style={styles.anonIdDisplayContainer}>
          <Text style={styles.anonIdDisplayText}>Your Anonymous ID:</Text>
          <Text selectable={true} style={styles.anonIdDisplayText}>{anonymousId}</Text>
        </View>
        <View style={styles.deleteDataLinkContainer}>
          <Pressable onPress={showConfirmationPrompt}>
            <Text style={styles.deleteDataLinkText}>Delete My Data</Text>
          </Pressable>
        </View> */}
        <View style={styles.feedbackLinkContainer}>
          <Pressable onPress={sendEmail}>
            <Text style={styles.feedbackLinkText}>Email Feedback</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}