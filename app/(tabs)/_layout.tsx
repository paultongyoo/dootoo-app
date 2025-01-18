import DootooFooter from '@/components/DootooFooter';
import DootooHeader from '@/components/DootooHeader';
import { Tabs } from 'expo-router';
import Toast from "react-native-toast-message";
import toastConfig from "@/components/ToastConfig";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import FeedbackTab from '@/components/FeedbackTab';
import FeedbackModal from '@/components/FeedbackModal';

export default function TabLayout() {

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);

  const opacity = useSharedValue(1);
  const opacityAnimatedStyle = useAnimatedStyle(() => {
    return { opacity: opacity.value }
  })

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
  }, []);

  return (
    <>
      <Animated.View style={[{ flex: 1 }, opacityAnimatedStyle]}>
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
        <FeedbackModal modalVisible={feedbackModalVisible} modalVisibleSetter={setFeedbackModalVisible} 
                       animationIn={"slideInRight"} animationOut={"fadeOut"} />
        <FeedbackTab modalVisible={feedbackModalVisible} modalVisibleSetter={setFeedbackModalVisible} />
      </Animated.View>
      <Toast config={toastConfig} />
    </>
  );
}