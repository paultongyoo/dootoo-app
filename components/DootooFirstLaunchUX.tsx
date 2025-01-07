import { Text, StyleSheet, View, Pressable, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { AppContext } from './AppContext';
import * as amplitude from '@amplitude/analytics-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DootooFirstLaunchUX = () => {
  const { isFirstLaunch } = useContext(AppContext);

  const [currentStep, setCurrentStep] = useState(1);

  const opacity = useSharedValue(0);
  const stepOpacity = useSharedValue(1);
  const stepAnimatedOpacity = useAnimatedStyle(() => {
    return { opacity: stepOpacity.value }
  })

  // Step 1
  const fadeTogether = useSharedValue(0);
  const togetherAnimatedOpacity = useAnimatedStyle(() => {
    return { opacity: fadeTogether.value }
  })


  const executeStep1Animation = async () => {
    await new Promise<void>((resolve) => {
      fadeTogether.value = withDelay(500, withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(resolve)();
        }
      }))
    });

    amplitude.track("Onboarding Step 1 Viewed");
    await new Promise<void>((resolve) => stepOpacity.value = withDelay(800, withTiming(0, { duration: 1000 }, (isFinished) => {
      if (isFinished) {
        runOnJS(resolve)();
      }
    })));

    setCurrentStep(2);

    //isFirstLaunch.current = false;
    //await AsyncStorage.setItem('isFirstLaunch', 'false');
  }

  const executeStep2Animation = async () => {


    // TODO

    amplitude.track("Onboarding Step 2 Viewed");
    // TODO
  }

  const initialMount = useRef(true);
  useEffect(() => {

    // Discard initial mount assuming step 1 rendering handled by FocusEffect
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }

    stepOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
      if (isFinished) {
        if (currentStep == 2) runOnJS(executeStep2Animation)();
      }
    });
  }, [currentStep])

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeStep1Animation)();
        }
      });
      return () => {
        opacity.value = withTiming(0, { duration: 400 }, (isFinished) => {
          if (isFinished) {
            fadeTogether.value = 0;
          }
        });
      }
    }, [])
  );

  const styles = StyleSheet.create({
    emptyListContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingLeft: 30,
      paddingRight: 60        // Tips specific
    },
    centerCopy: {
      fontSize: 40,
      color: '#3E2723',
      paddingBottom: 20
    },
    red: {
      color: '#A23E48'
    },
    green: {
      color: '#556B2F'
    },
    skipButtonContainer: {
      position: 'absolute',
      right: 25,
      top: 20
    },
    skipButtonText: {
      color: '#3e2723',
      opacity: 0.5
    }
  })

  return <Animated.View style={[styles.emptyListContainer, { opacity }]}>
    <View style={styles.skipButtonContainer}>
      <Pressable hitSlop={10} onPress={() => Alert.alert("Implement Me")}>
        <Text style={styles.skipButtonText}>skip</Text>
      </Pressable>
    </View>
    <Animated.View style={stepAnimatedOpacity}>
      {(currentStep == 1) && (
        <>
          <Text style={styles.centerCopy}>doing things{'\n'}can be <Text style={styles.red}>hard</Text>.</Text>
          <Animated.View style={togetherAnimatedOpacity}>
            <Text style={styles.centerCopy}>doing things{'\n'}<Text style={styles.green}>together is{'\n'}easier</Text>.</Text>
          </Animated.View>
        </>
      )}
      {(currentStep == 2) && (
        <>
          <Text style={styles.centerCopy}>doo<Text style={styles.red}>too</Text> helps you
          <Text style={styles.green}> easily capture your most important things to do</Text>...</Text>
        </>
      )}
    </Animated.View>
  </Animated.View>;
};


export default DootooFirstLaunchUX;