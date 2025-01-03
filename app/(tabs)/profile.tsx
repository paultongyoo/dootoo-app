import { usePathname } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Pressable, View, Image, StyleSheet, Text, ActivityIndicator, Linking, Platform } from "react-native";
import { AppContext } from "@/components/AppContext";
import * as amplitude from '@amplitude/analytics-react-native';
import { formatNumber, showComingSoonAlert } from '@/components/Helpers';
import { overrideUserAnonId as overrideUser, saveUserLocally, updateUsername } from "@/components/Storage";
import { NAVIGATION_EVENT__GO_TO_SECTION, NavigationEventEmitter, ProfileCountEventEmitter } from "@/components/EventEmitters";
import Dialog from "react-native-dialog";
import { Bulb } from "@/components/svg/bulb";
import { Edit } from "@/components/svg/edit";
import { NAVIGATION_SECTION_IDX_DONE } from "@/components/Constants";


const ProfileScreen = ({ navigation }) => {
    const pathname = usePathname();
    const { username, doneCount, tipCount, setTipCount, anonymousId, resetUserContext } = useContext(AppContext);

    //const [username, setUsername] = useState('');
    // const [doneCount, setDoneCount] = useState(0);
    // const [tipCount, setTipCount] = useState(0);
    const [loadingNewUsername, setLoadingNewUsername] = useState(false);
    const [usernameDialogVisible, setUsernameDialogVisible] = useState(false);
    const [usernameInvalid, setUsernameInvalid] = useState(false);
    const usernameTextInputValue = useRef(username.current);
    const [dupeUsernameDialogVisible, setDupeUsernameDialogVisible] = useState(false);
    const [usernameModerationFailedDialogVisible, setUsernameModerationFailedDialogVisible] = useState(false);
    const [usernameSpammingFailedDialogVisible, setUsernameSpammingFailedDialogVisible] = useState(false);
    const [usernameUnexpectedDialogVisible, setUsernameUnexpectedDialogVisible] = useState(false);
    //const isInitialMount = useRef(true);
    const [overrideUserDialogVisible, setOverrideUserDialogVisible] = useState(false);
    const [overrideUserDialogInputValue, setOverrideUserDialogInputValue] = useState('');

    useEffect(() => {
        //console.log("ProfileScreen.useEffect([])");

        const listener_incr_tips = ProfileCountEventEmitter.addListener('incr_tips', (data) => {
            setTipCount(prevCount => prevCount + data.count);
        });
        const listener_decr_tips = ProfileCountEventEmitter.addListener('decr_tips', () => {
            setTipCount(prevCount => prevCount - 1);;
        });

        return () => {
            listener_incr_tips.remove();
            listener_decr_tips.remove();
        }
    }, []);

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
                        resetUserData();
                    },
                },
            ],
            { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
        );
    };

    const resetUserData = async () => {
        setLoadingNewUsername(true);
        await resetUserContext();
        setLoadingNewUsername(false);
    }

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
            backgroundColor: '#DCC7AA',
            flex: 1,
            alignItems: 'center'
        },
        profileDrawerProfileIconContainer: {
            marginTop: 50,
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
            bottom: 40
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
            // borderColor: 'black',
            // borderWidth: 2,
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
            paddingTop: 5
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
            anonymous_id: anonymousId,
            pathname: pathname
        });
        usernameTextInputValue.current = username.current;
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
            username.current = usernameTextInputValue.current;

            const updatedUserObj = {
                name: usernameTextInputValue.current,
                anonymous_id: anonymousId,
                tipCount: tipCount,
                doneCount: doneCount
            };
            await saveUserLocally(updatedUserObj);
            setLoadingNewUsername(false);

            amplitude.track("Edit Username Completed", {
                anonymous_id: anonymousId,
                pathname: pathname,
                username: usernameTextInputValue.current
            });
        } else if (statusCode == 409) {
            setLoadingNewUsername(false);
            setDupeUsernameDialogVisible(true);

            amplitude.track("Edit Username Submission Invalid", {
                anonymous_id: anonymousId,
                pathname: pathname,
                error_type: 'dupe',
                username: usernameTextInputValue.current
            });
        } else if (statusCode == 422) {
            setLoadingNewUsername(false);
            setUsernameModerationFailedDialogVisible(true);

            amplitude.track("Edit Username Submission Invalid", {
                anonymous_id: anonymousId,
                pathname: pathname,
                error_type: 'moderation_failed',
                username: usernameTextInputValue.current
            });
        } else if (statusCode == 423) {
            setLoadingNewUsername(false);
            setUsernameSpammingFailedDialogVisible(true);

            amplitude.track("Edit Username Submission Invalid", {
                anonymous_id: anonymousId,
                pathname: pathname,
                error_type: 'spam',
                username: usernameTextInputValue.current
            });
        } else {
            setLoadingNewUsername(false);
            setUsernameUnexpectedDialogVisible(true);

            amplitude.track("Edit Username Submission Invalid", {
                anonymous_id: anonymousId,
                pathname: pathname,
                error_type: 'unexpected',
                username: usernameTextInputValue.current
            });
        }
        usernameTextInputValue.current = username;
    }

    const showOverrideUserPrompt = () => {
        setOverrideUserDialogVisible(true);
    }

    const handleUserOverrideDialogCancel = () => {
        setOverrideUserDialogVisible(false);
    }

    const handleUserOverrideDialogSubmit = async () => {
        const success = await overrideUser(overrideUserDialogInputValue);
        if (success) {
            setOverrideUserDialogVisible(false);
            Alert.alert("User Override Successful", "Close the app and reopen it to load the new user's data.");
        } else {
            Alert.alert("User Override Unsuccessful", "An unexpected error occurred.  Did you input the override string correctly?");
        }
    }

    const handleDoneStatTap = () => {
        NavigationEventEmitter.emit(NAVIGATION_EVENT__GO_TO_SECTION, NAVIGATION_SECTION_IDX_DONE);
    }

    return (
        <View style={styles.profileDrawerContainer}>
            <View style={styles.profileDrawerProfileIconContainer}>
                <Image source={require("@/assets/images/profile_icon_green.png")} />
                <View style={styles.profileDrawerProfileNameContainer}>
                    {(!username || username.length == 0) ?
                        <ActivityIndicator size={"large"} color="#3E3723" />
                        :
                        <Text style={styles.profileDrawerProfileNameText}>{username}</Text>
                    }
                </View>
                <Pressable hitSlop={10} style={styles.refreshNameContainer}
                    disabled={loadingNewUsername}
                    onPress={handleEditUsername}>
                    {(loadingNewUsername)
                        ? <ActivityIndicator size={"small"} color="#3E3723" />
                        : <Edit wxh="21" color="#556B2F" />
                    }
                </Pressable>
            </View>
            <View style={styles.statsContainer}>
                <Pressable style={styles.statContainer}
                    onPress={handleDoneStatTap}>
                    <View style={styles.statIconContainer}>
                        <View style={[styles.statIconTask, styles.statIconTask_Done]}></View>
                    </View>
                    <Text style={styles.statNumber}>{formatNumber(doneCount) || '0'}</Text>
                    <Text style={styles.statName}>Done</Text>
                </Pressable>
                {/* <Pressable style={styles.statContainer}
                    onPress={() => showComingSoonAlert(anonymousId, "'Tips'", pathname)}>
                    <View style={styles.statIconContainer}>
                        <Bulb wxh="40" color="#556B2F" strokeWidth="1.5" />
                    </View>
                    <Text style={styles.statNumber}>{formatNumber(tipCount) || '0'}</Text>
                    <Text style={styles.statName}>Tips</Text>
                </Pressable> */}
            </View>
            <View style={styles.privacyContainer}>
                {/* <View style={styles.anonIdDisplayContainer}>
                    <Text style={styles.anonIdDisplayText}>Your Anonymous ID:</Text>
                    <Text selectable={true} style={styles.anonIdDisplayText}>{anonymousId}</Text>
                    <Pressable onPress={showOverrideUserPrompt}>
                        <Text style={styles.deleteDataLinkText}>Override User</Text>
                    </Pressable>
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
            <Dialog.Container visible={overrideUserDialogVisible} onBackdropPress={handleUserOverrideDialogCancel}>
                <Dialog.Title>Override User</Dialog.Title>
                <Dialog.Description>Submit new user info in the format <Text style={{fontWeight: 'bold'}}>user:anonId</Text> to override the current user.</Dialog.Description>
                <Dialog.Input
                    multiline={false}
                    autoFocus={true}
                    onSubmitEditing={handleUserOverrideDialogSubmit}
                    onChangeText={(text) => {
                        setOverrideUserDialogInputValue(text);
                    }} />
                <Dialog.Button label="Cancel" onPress={handleUserOverrideDialogCancel} />
                <Dialog.Button label="Submit" onPress={handleUserOverrideDialogSubmit} disabled={overrideUserDialogInputValue.length == 0} />
            </Dialog.Container>
        </View>
    );
}

export default ProfileScreen;