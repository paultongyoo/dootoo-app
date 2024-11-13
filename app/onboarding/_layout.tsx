import { View, Pressable, Platform, Image, StyleSheet } from 'react-native';
import { Stack } from "expo-router";
import OnboardingFooter from "@/components/OnboardingFooter";

export default function OnboardingLayout() {

    const styles = StyleSheet.create({
        headerContainer: {
            backgroundColor: '#DCC7AA',
            height: (Platform.OS == 'ios') ? 100 : 75
        },
        headerLeftContainer: {
            position: 'absolute',
            left: 10,
            bottom: 5
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

    return (
        <Stack
            screenOptions={{
                headerShown: false
            }}>
            <Stack.Screen name="step1" options={{ title: 'Step 1' }} />
            <Stack.Screen name="step2" options={{ title: 'Step 2' }} />
            <Stack.Screen name="step3" options={{ title: 'Step 3' }} />
            <Stack.Screen name="step4" options={{ title: 'Step 4' }} />
            <Stack.Screen name="step5" options={{ title: 'Step 5' }} />
        </Stack>
    );
}