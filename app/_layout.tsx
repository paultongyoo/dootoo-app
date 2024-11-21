import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect } from 'react';
import { usePathname } from 'expo-router';
import * as amplitude from '@amplitude/analytics-react-native';
import { AppProvider } from "@/components/AppContext";
const AMPLITUDE_KEY_DEV = "28fd28b2a8714bea3efa4a0bc73fbd0b";
const AMPLITUDE_KEY_PROD = "ac9cdda8bd0d54ba50553219f407d353";

export default function StackLayout() {
  const pathname = usePathname();

  useEffect(() => {
    amplitude.init((__DEV__) ? AMPLITUDE_KEY_DEV : AMPLITUDE_KEY_PROD);
  }, []);

  useEffect(() => {
    amplitude.track('Screen Viewed', { pathname: pathname });
  }, [pathname]);

  return (
    <AppProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{
          headerShown: false
        }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
          <Stack.Screen name="meDrawer" options={{ animation: 'none' }} />
        </Stack>
      </GestureHandlerRootView>
    </AppProvider>
  )
};



