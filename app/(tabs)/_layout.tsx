import DootooFooter from '@/components/DootooFooter';
import DootooHeader from '@/components/DootooHeader';
import { Tabs } from 'expo-router';
import Toast from "react-native-toast-message";
import toastConfig from "@/components/ToastConfig";

export default function TabLayout() {

  return (
    <>
      <Tabs
        tabBar={(props) => (<DootooFooter {...props} />)}
        screenOptions={{
          header: (props) => (<DootooHeader {...props} />)
        }}>
        <Tabs.Screen name="open" />
        <Tabs.Screen name="tips" />
        <Tabs.Screen name="done" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <Toast config={toastConfig} />
    </>
  );
}