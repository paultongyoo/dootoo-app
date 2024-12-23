import { checkOpenAPIStatus } from '@/components/BackendServices';
import DootooFooter from '@/components/DootooFooter';
import DootooHeader from '@/components/DootooHeader';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import * as amplitude from '@amplitude/analytics-react-native';
import Toast from "react-native-toast-message";
import toastConfig from "@/components/ToastConfig";

export default function TabLayout() {

  useEffect(() => {
    console.log("TabLayout.useEffect([])");

    // Initialize App State event handlers
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "active") {
        checkOpenAPIHealth();
      }
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    checkOpenAPIHealth();

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


  return (
    <>
      <Tabs
        tabBar={(props) => (<DootooFooter {...props} />)}
        screenOptions={{
          header: (props) => (<DootooHeader {...props} />),
        }}>
        <Tabs.Screen name="list" />
        <Tabs.Screen name="done" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <Toast config={toastConfig} />
    </>
  );
}