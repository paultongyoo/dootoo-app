import { View, StyleSheet, ActivityIndicator } from 'react-native';
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

  const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#DCC7AA',
            justifyContent: 'center',
            alignItems: 'center'
        }
    });

  if (isFirstLaunch === null) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size={"large"} color={"black"}/>
        </View>
    );
  }

  return (
    <>
      {isFirstLaunch ? <Redirect href="/onboarding/step1" /> : <Redirect href="/main" />}
    </>
  );
}
