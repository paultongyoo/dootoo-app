import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function OnboardingLayout() {
    return (
        <GestureHandlerRootView>
            <Stack
                screenOptions={{
                    headerShown: false
                }}>
                <Stack.Screen name="step1" />
                <Stack.Screen name="step2" />
                <Stack.Screen name="step3" />
                <Stack.Screen name="step4" />
                <Stack.Screen name="step5" />
            </Stack>
        </GestureHandlerRootView>
    );
}