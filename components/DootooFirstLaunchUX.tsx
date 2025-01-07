import { Text, StyleSheet, View, Pressable, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { AppContext } from './AppContext';
import * as amplitude from '@amplitude/analytics-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DootooItemEmptyUX from './DootooItemEmptyUX';
import { ArrowDown } from './svg/arrow-down';

const DootooFirstLaunchUX = () => {
  const { isFirstLaunch } = useContext(AppContext);

  const [currentStep, setCurrentStep] = useState(1);

  const opacity = useSharedValue(0);
  const stepOpacity = useSharedValue(1);
  const stepAnimatedOpacity = useAnimatedStyle(() => {
    return { opacity: stepOpacity.value }
  })

  const coachmarkOpacity = useSharedValue(0);
  const coachmarkAnimatedOpacity = useAnimatedStyle(() => {
    return { opacity: coachmarkOpacity.value }
  })

  const BOTTOM_BUTTON_WIDTH_INCL_MARGINS = 50 + 20 + 20;
  const BOTTOM_BUTTON_HEIGHT_INCL_DIST_FROM_FOOTER = 50 + 20;
  const coachmarkTranslateX = useSharedValue(
    BOTTOM_BUTTON_WIDTH_INCL_MARGINS / 2 * -1
  );

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
  }

  const executeStep2Animation = async () => {
    amplitude.track("Onboarding Step 2 Viewed");
    await new Promise<void>((resolve) => stepOpacity.value = withDelay(1000, withTiming(0, { duration: 1000 }, (isFinished) => {
      if (isFinished) {
        runOnJS(resolve)();
      }
    })));
    setCurrentStep(3);
  }

  const executeStep3Animation = async () => {
    amplitude.track("Onboarding Step 3 Viewed");
    await new Promise<void>((resolve) => stepOpacity.value = withDelay(1000, withTiming(0, { duration: 1000 }, (isFinished) => {
      if (isFinished) {
        runOnJS(resolve)();
      }
    })));
    setCurrentStep(4);
  }

  const speakNaturallyOpacity = useSharedValue(0);
  const speakNaturallyAnimatedStyle = useAnimatedStyle(() => {
    return { opacity: speakNaturallyOpacity.value }
  })
  const executeStep4Animation = async () => {
    await new Promise<void>((resolve) => 
      coachmarkOpacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
        if (isFinished) {
          runOnJS(resolve)();
        }
    }));

    await new Promise<void>((resolve) => 
      speakNaturallyOpacity.value = withDelay(1000, withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(resolve)();
        }
    })));

    amplitude.track("Onboarding Step 4 Viewed");
    await new Promise<void>((resolve) => stepOpacity.value = withDelay(1000, withTiming(0, { duration: 1000 }, (isFinished) => {
      if (isFinished) {
        runOnJS(resolve)();
      }
    })));
    setCurrentStep(5);
  }

  const executeStep5Animation = async () => {
    coachmarkTranslateX.value = withTiming(BOTTOM_BUTTON_WIDTH_INCL_MARGINS / 2, 
      { 
        duration: 300,
        easing: Easing.out(Easing.exp)
      }
    )
    amplitude.track("Onboarding Step 5 Viewed");
    // await new Promise<void>((resolve) => stepOpacity.value = withDelay(1000, withTiming(0, { duration: 1000 }, (isFinished) => {
    //   if (isFinished) {
    //     runOnJS(resolve)();
    //   }
    // })));
    //setCurrentStep(6);
  }

  const executeStep6Animation = async () => {
    amplitude.track("Onboarding Step 6 Viewed");
    //isFirstLaunch.current = false;
    //await AsyncStorage.setItem('isFirstLaunch', 'false');
  }

  const initialMount = useRef(true);
  useEffect(() => {

    // Discard initial mount assuming step 1 rendering handled by FocusEffect
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }

    if (currentStep == 2) {
      stepOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeStep2Animation)();
        }
      });
    } else if (currentStep == 3) {
      stepOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeStep3Animation)();
        }
      });
    } else if (currentStep == 4) {
      stepOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeStep4Animation)();
        }
      });
    } else if (currentStep == 5) {
      stepOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeStep5Animation)();
        }
      });
    } else if (currentStep == 6) {
      stepOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeStep6Animation)();
        }
      });
    }

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
    },
    centerCopy: {
      fontSize: 40,
      color: '#3E2723',
      paddingLeft: 30,
      paddingRight: 60,
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
      opacity: 0.5,
      fontSize: 16
    },
    coachmarksContainer: {
      position: 'absolute',
      bottom: BOTTOM_BUTTON_HEIGHT_INCL_DIST_FROM_FOOTER + 10,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center'
    },
    downArrowContainer: {

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
      {(currentStep == 3) && (
        <>
          <Text style={styles.centerCopy}>...and 
          <Text style={styles.green}> connects you with a community of doo-ers </Text>
          like you.</Text>
        </>
      )}
      {(currentStep == 4) && (
        <>
          <Text style={styles.centerCopy}>tap the 
          <Text style={styles.green}> microphone to quickly add many things at once</Text>
          .</Text>
          <Animated.View style={[{position: 'relative', top: -10 }, speakNaturallyAnimatedStyle]}>
            <Text style={styles.centerCopy}><Text style={styles.green}>speak naturally </Text>
            and 
            <Text style={styles.green}> just let your thoughts flow</Text>
            .</Text>
          </Animated.View>
        </>
      )}
      {(currentStep == 5) && (
        <>
          <Text style={styles.centerCopy}>tap the
          <Text style={styles.green}> keyboard to add one thing at a time</Text>
          .</Text>
        </>
      )}
    </Animated.View>
    <Animated.View style={[styles.coachmarksContainer, coachmarkAnimatedOpacity]}>
      <Animated.View style={[styles.downArrowContainer, { transform: [{ translateX: coachmarkTranslateX }] }]}>
        <ArrowDown wxh="50" color="#556B2F" />
       </Animated.View>
    </Animated.View>
  </Animated.View>;
};


export default DootooFirstLaunchUX;