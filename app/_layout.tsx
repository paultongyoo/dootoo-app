import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect } from 'react';
import { usePathname } from 'expo-router';
import * as amplitude from '@amplitude/analytics-react-native';
import { AppProvider } from "@/components/AppContext";
const AMPLITUDE_KEY_DEV = "28fd28b2a8714bea3efa4a0bc73fbd0b";
const AMPLITUDE_KEY_PROD = "ac9cdda8bd0d54ba50553219f407d353";
import { setJSExceptionHandler } from "react-native-exception-handler";
import { Alert, BackHandler, Platform } from "react-native";

export default function StackLayout() {
  const pathname = usePathname();

  useEffect(() => {
    amplitude.init((__DEV__) ? AMPLITUDE_KEY_DEV : AMPLITUDE_KEY_PROD);
  }, []);

  useEffect(() => {
    amplitude.track('Screen Viewed', { pathname: pathname });
  }, [pathname]);

  const reporter = (error) => {
    amplitude.track('Unexpected Error Occurred', {
      pathname: pathname,
      error_name: error.name,
      error_message: error.message
    });
    console.log(error);
  };

  const errorHandler = (e, isFatal) => {
    reporter(e);
    if (isFatal) {
      Alert.alert(
        "Unexpected Error Occurred",
        `Oops! Something went wrong. Don't worry, we've logged this issue and will fix it soon. Please restart the app to continue.`,
        [
          (Platform.OS == 'ios')
            ? {
              text: "OK"
            }
            : {
              text: "Close",
              onPress: () => {
                BackHandler.exitApp();
              },
            }
        ]
      );
    } else {
      console.log(e); // So that we can see it in the ADB logs in case of Android if needed
    }
  };
  setJSExceptionHandler(errorHandler);

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





