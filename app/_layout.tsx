import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function StackLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{
        headerShown: false
      }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="step1" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="step2" options={{ headerShown: false }} />
        <Stack.Screen name="step3" options={{ headerShown: false }} />
        <Stack.Screen name="step4" options={{ headerShown: false }} />
        <Stack.Screen name="step5" options={{ headerShown: false }} />
        <Stack.Screen name="drawer" options={{ headerShown: false, animation: 'none'  }} />
      </Stack>
    </GestureHandlerRootView>
  )
};



