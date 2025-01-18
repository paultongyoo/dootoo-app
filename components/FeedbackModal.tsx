import { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert} from "react-native";
import { TextInput } from "react-native-gesture-handler";
import Modal from "react-native-modal";
import { trackEvent } from "./Analytics";
import { AppContext } from "./AppContext";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const FeedbackModal = ({ modalVisible, modalVisibleSetter, animationIn, animationOut }) => {
    const { anonymousId, username } = useContext(AppContext);
    
    const [relatedAppsInput, setRelatedAppsInput] = useState('');
    const [switchInput, setSwitchInput] = useState('');

    useEffect(() => {
        if (modalVisible) {
            formOpacity.value = 1;
            thanksOpacity.value = 0;
        }
    }, [modalVisible])

    const styles = StyleSheet.create({
        modalBackground: {
            borderTopLeftRadius: 10,
            borderBottomLeftRadius: 10,
            padding: 15,
            backgroundColor: '#FAF3E0',
            position: 'absolute',
            right: -20,
            width: '50%'
        },
        thanksContainer: {
            position: 'absolute',
            top: 15,
            left: 15,
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center'
        },
        formFieldGroup: {

        },
        formText: {
            fontWeight: 'bold'
        },
        formField: {
            borderWidth: 1,
            color: '#3e2723',
            backgroundColor: 'white',
            paddingVertical: 6,
            paddingHorizontal: 10,
            marginVertical: 10
        },
        buttonContainer: {

        },
        buttonBackground: {
            backgroundColor: '#556B2F',
            borderRadius: 5,
            padding: 7,
            shadowColor: '#000',
            shadowOffset: { width: 2, height: 4 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: 4, // Elevation for Android    
        },
        buttonText: {
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center'
        },
        thanksText: {
            fontWeight: 'bold',
            fontSize: 14
        }
    })

    const formOpacity = useSharedValue(1);
    const formAnimatedOpacity = useAnimatedStyle(() => {
        return { opacity: formOpacity.value }
    })
    const thanksOpacity = useSharedValue(0);
    const thanksAnimatedOpacity = useAnimatedStyle(() => {
        return { opacity: thanksOpacity.value }
    })

    const handleSubmitTap = () => {
        if (((relatedAppsInput?.length || 0) == 0) && ((relatedAppsInput?.length || 0) == 0)) {
            Alert.alert('', 'Please answer at least one of the questions.  Your responses will help!');
        } else {
            // TODO Save response to backend asynchronously
            formOpacity.value = withTiming(0, { duration: 500 }, (isFinished) => {
                if (isFinished) {
                    runOnJS(thankAnimation)();
                }
            })
        }
    }

    const thankAnimation = async () => {
        await new Promise<void>((resolve) => thanksOpacity.value = withTiming(1, { duration: 500 }, (isFinished) => {
            if (isFinished) {
                runOnJS(resolve)();
            }
        }));
        setTimeout(() => {
            modalVisibleSetter(false)
        }, 1000);
    }

    return (
        <Modal
            isVisible={modalVisible}
            onBackdropPress={() => { modalVisibleSetter(false) }}
            onModalHide={() => trackEvent("Feedback Modal Hidden", {
                anonymous_id: anonymousId,
                username: username
            })}
            backdropOpacity={0.3}
            animationIn={animationIn}
            animationOut={animationOut}>
            <View style={styles.modalBackground}>
                 <Animated.View style={[styles.thanksContainer, thanksAnimatedOpacity]}>
                    <Text style={styles.thanksText}>Thank you for your feedback!</Text>
                </Animated.View>
                <Animated.View style={formAnimatedOpacity}>
                    <View style={styles.formFieldGroup}>
                        <Text style={styles.formText}>What related apps do you use today?</Text>
                        <TextInput style={styles.formField} 
                                multiline={true} 
                                numberOfLines={3}
                                maxLength={255}
                                onChangeText={(text) => setRelatedAppsInput(text.trim())}
                        />
                    </View>
                    <View style={styles.formFieldGroup}>
                        <Text style={styles.formText}>What app changes would switch you to doo<Text style={{color: '#A23E48'}}>too</Text>?</Text>
                        <TextInput style={styles.formField} 
                                multiline={true} 
                                numberOfLines={3}
                                maxLength={255}
                                onChangeText={(text) => setSwitchInput(text.trim())}
                        />
                    </View>
                    <View style={styles.buttonContainer}>
                        <Pressable onPress={handleSubmitTap} 
                                style={({pressed}) => [styles.buttonBackground, pressed && { backgroundColor: '#445823'}]}>
                                    <Text style={styles.buttonText}>Submit</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    )
}

export default FeedbackModal;