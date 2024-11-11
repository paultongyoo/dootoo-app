import { useContext, useEffect } from 'react';
import { View, Image, Text, Pressable, Alert, Linking } from 'react-native';
import { AppContext } from './AppContext';


const DootooTipSidebar = ({ thing, styles, listArray, listThingIndex }) => {
    const { anonymousId } = useContext(AppContext);

    const handleTipFlagContest = async (index: number) => {
        Alert.alert(
            'Tip Flagged', // Title of the alert
            'This tip was flagged as abusive and was removed from the community\'s view.  Repeated offenses will result in your account being deleted.  If you want to contest the flag, you can email your reasoning to the administrators.', // Message of the alert
            [
                {
                    text: 'Email Admins',
                    onPress: () => {
                        console.log('Tip Flag Contest Email Pressed')
                        sendFlagContextEmail(index);
                    }
                },
                {
                    text: 'I Understand',
                    onPress: () => {
                        console.log('Tip Flag Contest Understood Pressed');
                    },
                },
            ]
        );
    }

    const sendFlagContextEmail = (index) => {
        const email = 'contact@thoughtswork.co'; // Replace with the desired email address
        const subject = `User ${anonymousId} Tip Flag Objection`; // Optional: add a subject
        const body = `Tip text: ${listArray[listThingIndex].text} - Reason I'm contesting flagging this: `;

        // Construct the mailto URL
        const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        // Use Linking API to open email client
        Linking.openURL(url).catch(err => console.error('Error opening email client:', err));
    }

    return (
        <>
            {
                (!thing.is_flagged && thing.upvote_count && thing.upvote_count != 0) ?
                    <View style={styles.scoreContainer}>
                        <Text style={styles.scoreText}>{thing.upvote_count}</Text>
                        {(thing.upvote_count > 0) ?
                            <Image style={styles.scoreIcon} source={require("../assets/images/thumbs_up_556B2F.png")} />
                            : <Image style={styles.scoreIcon} source={require("../assets/images/thumbs_down_A23E48.png")} />
                        }
                    </View> : (thing.is_flagged) ?
                        <Pressable style={styles.flaggedContainer}
                            onPress={() => handleTipFlagContest(listThingIndex)}>
                            <Text style={styles.flaggedText}>Flagged</Text>
                            <Image style={styles.flaggedIcon} source={require("../assets/images/flag_A23E48.png")} />
                        </Pressable>
                        : <View style={styles.scoreContainer}></View>
            }
        </>
    );
};

export default DootooTipSidebar;