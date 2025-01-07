import DootooFooter from '@/components/DootooFooter';
import DootooHeader from '@/components/DootooHeader';
import { Tabs, usePathname } from 'expo-router';
import Toast from "react-native-toast-message";
import toastConfig from "@/components/ToastConfig";
import { setJSExceptionHandler } from 'react-native-exception-handler';
import { Alert, AppState, BackHandler, Platform } from 'react-native';
import { useEffect } from 'react';
import { checkOpenAPIStatus } from '@/components/BackendServices';
import { StatusBar } from "expo-status-bar";

import * as amplitude from '@amplitude/analytics-react-native';
import { AppProvider } from '@/components/AppContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
const AMPLITUDE_KEY_DEV = "28fd28b2a8714bea3efa4a0bc73fbd0b";
const AMPLITUDE_KEY_PROD = "ac9cdda8bd0d54ba50553219f407d353";

export default function TabLayout() {
  const pathname = usePathname();

  const opacity = useSharedValue(0);
  const opacityAnimatedStyle = useAnimatedStyle(() => {
    return { opacity: opacity.value }
  })

  useEffect(() => {

    // Initialize Analytics Tracking
    amplitude.init((__DEV__) ? AMPLITUDE_KEY_DEV : AMPLITUDE_KEY_PROD);

    // Initialize App State event handlers
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "active") {
        checkOpenAPIHealth();
      }
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    checkOpenAPIHealth();

    opacity.value = withTiming(1, { duration: 1000 });

    return () => {
      subscription.remove();
    }
  }, [])

  const checkOpenAPIHealth = async () => {
    const status = await checkOpenAPIStatus();
    console.log("OpenAPI Health Status: " + status);
    if (status != "operational") {
      amplitude.track("OpenAI API Impacted Prompt Displayed");
      Alert.alert(
        "AI Features May Be Impacted",
        "Please be aware that our AI partner is currently experiencing issues that may impact new voice recordings and text edits.  " +
        "This message will cease to appear once their issues are resolved.",
        [
          {
            text: 'OK',
            onPress: () => {
              amplitude.track("OpenAI API Impacted Prompt OK'd");
            },
          },
        ],
        { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
      );
    }
  }


  useEffect(() => {
    amplitude.track('Screen Viewed', { pathname: pathname });
  }, [pathname]);

  const reporter = (error) => {
    amplitude.track('Unexpected Error Occurred', {
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
        <Animated.View style={[{flex: 1}, opacityAnimatedStyle]}>
          <StatusBar backgroundColor="#FAF3E0" />
          <Tabs
            initialRouteName="open"
            tabBar={(props) => (<DootooFooter {...props} />)}
            screenOptions={{
              header: (props) => (<DootooHeader {...props} />)
            }}>
            <Tabs.Screen name="open" />
            <Tabs.Screen name="community" />
            <Tabs.Screen name="done" />
            <Tabs.Screen name="profile" />
          </Tabs>
        </Animated.View>
        <Toast config={toastConfig} />
      </GestureHandlerRootView>
    </AppProvider>
  );
}