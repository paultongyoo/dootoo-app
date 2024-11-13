import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';

export default function Index() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<null | boolean>(null);

  useEffect(() => {
    const checkFirstLaunch = async () => {        
      const launchStatus = await AsyncStorage.getItem('isFirstLaunch');
      if (launchStatus === null) {
        setIsFirstLaunch(true);
      } else {
        setIsFirstLaunch(false);
      }
    };
    checkFirstLaunch();
  }, []);

  if (isFirstLaunch == null) return null;

  return (
    <>
      {isFirstLaunch ? <Redirect href="/onboarding/step1" /> : <Redirect href="/main" />}
    </>
  );
}
