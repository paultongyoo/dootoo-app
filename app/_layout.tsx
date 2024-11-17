import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect } from 'react';
import { usePathname } from 'expo-router';
import * as amplitude from '@amplitude/analytics-react-native';
const AMPLITUDE_KEY_DEV = "28fd28b2a8714bea3efa4a0bc73fbd0b";
const AMPLITUDE_KEY_PROD = "ac9cdda8bd0d54ba50553219f407d353";

export default function StackLayout() {
  const pathname = usePathname();

  useEffect(() => {
    amplitude.init((__DEV__) ? AMPLITUDE_KEY_DEV : AMPLITUDE_KEY_PROD);
  }, []);

  useEffect(() => {
    //console.log("Pathname logged: " + pathname);
    amplitude.track('Screen Viewed', { pathname: pathname });
  }, [pathname]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{
        headerShown: false
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
        {/* <Stack.Screen name="step1" options={{ animation: 'none' }} />
        <Stack.Screen name="step2" />
        <Stack.Screen name="step3" />
        <Stack.Screen name="step4" />
        <Stack.Screen name="step5" /> */}
        <Stack.Screen name="drawer" options={{ animation: 'none' }} />
      </Stack>
    </GestureHandlerRootView>
  )
};



