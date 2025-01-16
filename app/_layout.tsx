import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import * as amplitude from '@amplitude/analytics-react-native';
import { AppProvider } from "@/components/AppContext";
const AMPLITUDE_KEY_DEV = "28fd28b2a8714bea3efa4a0bc73fbd0b";
const AMPLITUDE_KEY_PROD = "ac9cdda8bd0d54ba50553219f407d353";
import { setJSExceptionHandler } from "react-native-exception-handler";
import { Alert, AppState, BackHandler, Platform } from "react-native";
import { checkOpenAPIStatus } from "@/components/BackendServices";
import { trackEvent } from '@/components/Helpers';
import { isTWEmployee } from "@/components/Storage";

export default function StackLayout() {
  const pathname = usePathname();

  useEffect(() => {

    // Initialize App State event handlers
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "active") {
        checkOpenAPIHealth();
      }
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);

    // Initialize Analytics Tracking
    const initializeAmplitude = async() => {
      const twEmployee = await isTWEmployee();
      const apiKey =  (__DEV__ || twEmployee) ? AMPLITUDE_KEY_DEV : AMPLITUDE_KEY_PROD;
      console.log("Initializing Amplitude with key: " + ((AMPLITUDE_KEY_DEV == apiKey) ? 'dev' : 'prod'));
      amplitude.init(apiKey);
      checkOpenAPIHealth();
    }
    initializeAmplitude();
    
    return () => {
      subscription.remove();
    }
  }, [])

  const checkOpenAPIHealth = async () => {
    const status = await checkOpenAPIStatus();
    console.log("OpenAPI Health Status: " + status);
    if (status != "operational") {
      trackEvent("OpenAI API Impacted Prompt Displayed");
      Alert.alert(
        "AI Features May Be Impacted",
        "Please be aware that our AI partner is currently experiencing issues that may impact new voice recordings and text edits.  " +
        "This message will cease to appear once their issues are resolved.",
        [
          {
            text: 'OK',
            onPress: () => {
              trackEvent("OpenAI API Impacted Prompt OK'd");
            },
          },
        ],
        { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
      );
    }
  }


  useEffect(() => {
    if (pathname && pathname != '/') {
      trackEvent(`${pathname} Screen Viewed`, { pathname: pathname });
    }
  }, [pathname]);

  const reporter = (error) => {
    trackEvent('Unexpected Error Occurred', {
      pathname: pathname,
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack
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
        <Stack 
          initialRouteName="(tabs)"
          screenOptions={{ headerShown: false }}>
          {/* <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" /> */}
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        </Stack>
      </GestureHandlerRootView>
    </AppProvider>
  )
};





