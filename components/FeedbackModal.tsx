import { useContext, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, Platform, KeyboardAvoidingView } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import Modal from "react-native-modal";
import { trackEvent } from "./Analytics";
import { AppContext } from "./AppContext";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const FeedbackModal = ({ modalVisible, modalVisibleSetter, animationIn, animationOut }) => {
    const { anonymousId, username } = useContext(AppContext);

    const relatedAppsInputRef = useRef(null);
    const [relatedAppsInput, setRelatedAppsInput] = useState('');
    const [switchInput, setSwitchInput] = useState('');
    const FIELD_NUMLINES = 3;

    useEffect(() => {
        if (modalVisible) {
            formOpacity.value = 1;
            setSwitchInput('');
            setRelatedAppsInput('');
        }
    }, [modalVisible])

    const styles = StyleSheet.create({
        modalContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            margin: 0
        },
        modalBackground: {
            borderRadius: 10,
            padding: 20,
            backgroundColor: '#FAF3E0',
            width: '75%',
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
        }
    })

    const formOpacity = useSharedValue(1);
    const formAnimatedOpacity = useAnimatedStyle(() => {
        return { opacity: formOpacity.value }
    })

    const handleSubmitTap = () => {
        if (((relatedAppsInput?.length || 0) == 0) && ((switchInput?.length || 0) == 0)) {
            Alert.alert('', 'Please answer at least one of the questions.  Your responses will help!');
        } else {
            // TODO Save response to backend asynchronously
            modalVisibleSetter(false);
            Alert.alert('', 'Thank you for your feedback!');
        }
    }


    return (
        <Modal
            style={styles.modalContainer}
            isVisible={modalVisible}
            onBackdropPress={() => { modalVisibleSetter(false) }}
            onModalHide={() => trackEvent("Feedback Modal Hidden", {
                anonymous_id: anonymousId,
                username: username
            })}
            backdropOpacity={0.3}
            animationIn={animationIn}
            animationOut={animationOut}
            onModalShow={() => {
                if (relatedAppsInputRef.current) {
                    relatedAppsInputRef.current.focus();
                }
            }}>
            <KeyboardAvoidingView
                          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
            <View style={styles.modalBackground}>
                <Animated.View style={formAnimatedOpacity}>
                    <View style={styles.formFieldGroup}>
                        <Text style={styles.formText}>What related apps do you use today?</Text>
                        <TextInput ref={relatedAppsInputRef} style={[styles.formField,
                        Platform.OS == 'ios' && { height: FIELD_NUMLINES * 20 }]}
                            value={relatedAppsInput}
                            multiline={true}
                            numberOfLines={FIELD_NUMLINES}
                            maxLength={255}
                            onChangeText={(text) => setRelatedAppsInput(text.trim())}
                        />
                    </View>
                    <View style={styles.formFieldGroup}>
                        <Text style={styles.formText}>What app changes would switch you to doo<Text style={{ color: '#A23E48' }}>too</Text>?</Text>
                        <TextInput style={[styles.formField,
                        Platform.OS == 'ios' && { height: FIELD_NUMLINES * 20 }]}
                            value={switchInput}
                            multiline={true}
                            numberOfLines={FIELD_NUMLINES}
                            maxLength={255}
                            onChangeText={(text) => setSwitchInput(text.trim())}
                        />
                    </View>
                    <View style={styles.buttonContainer}>
                        <Pressable onPress={handleSubmitTap}
                            style={({ pressed }) => [styles.buttonBackground, pressed && { backgroundColor: '#445823' }]}>
                            <Text style={styles.buttonText}>Submit</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

export default FeedbackModal;