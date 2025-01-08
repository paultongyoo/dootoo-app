import { Text, StyleSheet, View, Pressable, Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { AppContext } from './AppContext';
import * as amplitude from '@amplitude/analytics-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DootooItemEmptyUX from './DootooItemEmptyUX';
import { ArrowDown } from './svg/arrow-down';
import { NAVIGATION_EVENT__GO_TO_SECTION, NavigationEventEmitter } from './EventEmitters';
import { NAVIGATION_SECTION_IDX_OPEN } from './Constants';
import { check, PERMISSIONS, RESULTS, request } from 'react-native-permissions';

const DootooFirstLaunchUX = ({buttonContainerScaleSV}) => {
  const { isFirstLaunch } = useContext(AppContext);

  const [currentStep, setCurrentStep] = useState(1);
  const skipped = useRef(false);
  const skipOpacity = useSharedValue(1);
  const skipAnimatedOpacity = useAnimatedStyle(() => {
    return { opacity: skipOpacity.value }
  })

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

  const fadeAnimGoals = useSharedValue(0);
  const goalsAnimatedOpacity = useAnimatedStyle(() => {
    return { opacity: fadeAnimGoals.value }
  })
  const fadeAnimDreams = useSharedValue(0);
  const dreamsAnimatedOpacity = useAnimatedStyle(() => {
    return { opacity: fadeAnimDreams.value }
  })

  const fadeAnimChallenges = useSharedValue(0);
  const challengesAnimatedOpacity = useAnimatedStyle(() => {
    return { opacity: fadeAnimChallenges.value }
  })

  // Step 1
  const fadeTogether = useSharedValue(0);
  const togetherAnimatedOpacity = useAnimatedStyle(() => {
    return { opacity: fadeTogether.value }
  })


  const executeStep1Animation = async () => {
    await new Promise<void>((resolve) => {
      fadeTogether.value = withDelay(1000, withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(resolve)();
        }
      }))
    });

    amplitude.track("Onboarding Step 1 Viewed");
    await new Promise<void>((resolve) => stepOpacity.value = withDelay(2000, withTiming(0, { duration: 500 }, (isFinished) => {
      if (isFinished) {
        runOnJS(resolve)();
      }
    })));

    setCurrentStep(2);
  }

  const executeStep2Animation = async () => {
    amplitude.track("Onboarding Step 2 Viewed");
    await new Promise<void>((resolve) => stepOpacity.value = withDelay(2000, withTiming(0, { duration: 500 }, (isFinished) => {
      if (isFinished) {
        runOnJS(resolve)();
      }
    })));
    setCurrentStep(3);
  }

  const executeStep3Animation = async () => {
    amplitude.track("Onboarding Step 3 Viewed");
    await new Promise<void>((resolve) => stepOpacity.value = withDelay(2000, withTiming(0, { duration: 500 }, (isFinished) => {
      if (isFinished) {
        runOnJS(resolve)();
      }
    })));
    setCurrentStep(4);
  }

  const executeStep4Animation = async () => {
    await new Promise<void>((resolve) =>
      coachmarkOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(resolve)()
        }
      }));
    amplitude.track("Onboarding Step 4 Viewed");
    await new Promise<void>((resolve) => stepOpacity.value = withDelay(2000, withTiming(0, { duration: 500 }, (isFinished) => {
      if (isFinished) {
        runOnJS(resolve)();
      }
    })));
    setCurrentStep(5);
  }

  const executeStep5Animation = async () => {
    amplitude.track("Onboarding Step 5 Viewed");
    await new Promise<void>((resolve) => stepOpacity.value = withDelay(2000, withTiming(0, { duration: 500 }, (isFinished) => {
      if (isFinished) {
        runOnJS(resolve)();
      }
    })));
    setCurrentStep(6);
  }

  const executeStep6Animation = async () => {
    const animationPromises = [
      new Promise<void>((resolve) =>
        stepOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
          if (isFinished) {
            runOnJS(resolve)()
          }
        })),
      new Promise<void>((resolve) =>
        coachmarkTranslateX.value = withTiming(BOTTOM_BUTTON_WIDTH_INCL_MARGINS / 2,
          {
            duration: 500,
            easing: Easing.out(Easing.exp)
          },
          (isFinished) => {
            if (isFinished) {
              runOnJS(resolve)();
            }
          }))
    ];
    await Promise.all(animationPromises);
    amplitude.track("Onboarding Step 6 Viewed");
    await new Promise<void>((resolve) => stepOpacity.value = withDelay(2000, withTiming(0, { duration: 500 }, (isFinished) => {
      if (isFinished) {
        runOnJS(resolve)();
      }
    })));
    setCurrentStep(7)
  }

  const executeStep7Animation = async () => {
    const animationPromises = [
      new Promise<void>((resolve) =>
        stepOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
          if (isFinished) {
            runOnJS(resolve)()
          }
        })),
      new Promise<void>((resolve) =>
        coachmarkOpacity.value = withTiming(0, { duration: 500 }, (isFinished) => {
          if (isFinished) {
            runOnJS(resolve)();
          }
        })),
      new Promise<void>((resolve) =>
        skipOpacity.value = withTiming(0, { duration: 500 }, (isFinished) => {
          if (isFinished) {
            runOnJS(resolve)();
          }
        }))
    ];
    await Promise.all(animationPromises);
    await new Promise<void>((resolve) => {
      fadeAnimGoals.value = withDelay(200, withTiming(1, { duration: 800 }, (isFinished) => {
        if (isFinished) {
          runOnJS(resolve)();
        }
      }))
    });
    await new Promise<void>((resolve) => {
      fadeAnimDreams.value = withDelay(200, withTiming(1, { duration: 800 }, (isFinished) => {
        if (isFinished) {
          runOnJS(resolve)();
        }
      }))
    });
    await new Promise<void>((resolve) => {
      fadeAnimChallenges.value = withDelay(200, withTiming(1, { duration: 800 }, (isFinished) => {
        if (isFinished) {
          runOnJS(resolve)();
        }
      }))
    });
    await new Promise<void>((resolve) => {
      buttonContainerScaleSV.value = withDelay(200, withSequence(
        withTiming(1.2, { duration: 300, easing: Easing.out(Easing.ease) }), 
        withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }, 
        (isFinished) => {
          if (isFinished) {
            runOnJS(resolve)();
          }
      })))
    });
    amplitude.track("Onboarding Step 7 Viewed");
    endFirstLaunchUX();
  }

  const handleSkipTap = async () => {
    amplitude.track("Onboarding Skipped", { step: currentStep });
    skipped.current = true;
    await new Promise<void>((resolve) => stepOpacity.value = withTiming(0, { duration: 500 }, (isFinished) => {
      if (isFinished) {
        runOnJS(resolve)();
      }
    }));
    setCurrentStep(7)
  }

  const endFirstLaunchUX = async () => {
    isFirstLaunch.current = false;
    await AsyncStorage.setItem('isFirstLaunch', 'false');
  }



  const initialMount = useRef(true);
  useEffect(() => {
    console.log("Inside FirstLaunchUX.useEffect([currentStep]): " + currentStep);

    // Discard initial mount assuming step 1 rendering handled by FocusEffect
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }

    if (currentStep == 2 && !skipped.current) {
      stepOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeStep2Animation)();
        }
      });
    } else if (currentStep == 3 && !skipped.current) {
      stepOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeStep3Animation)();
        }
      });
    } else if (currentStep == 4 && !skipped.current) {
      stepOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeStep4Animation)();
        }
      });
    } else if (currentStep == 5 && !skipped.current) {
      stepOpacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeStep5Animation)();
        }
      });
    } else if (currentStep == 6 && !skipped.current) {
      executeStep6Animation();
    } else if (currentStep == 7) {
      executeStep7Animation();
    }
  }, [currentStep])

  useFocusEffect(
    useCallback(() => {
      const displayATTPrompt = async () => {
        if (Platform.OS == 'ios') {
          const result = await check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
          if (result === RESULTS.DENIED) {

            // The permission has not been requested, so request it.
            amplitude.track("iOS ATT Prompt Started");
            const result = await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
            amplitude.track("iOS ATT Prompt Completed", { result: result });
          }
        }

        opacity.value = withTiming(1, { duration: 1000 }, (isFinished) => {
          if (isFinished) {
            runOnJS(executeStep1Animation)();
          }
        });
      }
      displayATTPrompt();

      return () => {
        opacity.value = withTiming(0, { duration: 400 }, (isFinished) => {
          if (isFinished) {
            runOnJS(resetState)();
          }
        });
      }
    }, [])
  );

  const resetState = () => {
    skipped.current = false;
    fadeTogether.value = 0;
    coachmarkTranslateX.value = BOTTOM_BUTTON_WIDTH_INCL_MARGINS / 2 * -1
    fadeAnimGoals.value = 0;
    fadeAnimDreams.value = 0;
    fadeAnimChallenges.value = 0;
    skipOpacity.value = 1;
    setCurrentStep(1);
  }

  const styles = StyleSheet.create({
    emptyListContainer: {
      flex: 1,
      justifyContent: 'center'
    },
    centerCopy: {
      fontSize: 40,
      color: '#3E2723',
      paddingLeft: 30,
      paddingRight: 60
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
      fontSize: 20,
      padding: 5
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
    <Animated.View style={[styles.skipButtonContainer, skipAnimatedOpacity]}>
      <Pressable hitSlop={10}
        style={({ pressed }) => pressed && { backgroundColor: '#3e272310' }}
        onPress={handleSkipTap}>
        <Text style={styles.skipButtonText}>skip</Text>
      </Pressable>
    </Animated.View>
    <Animated.View style={stepAnimatedOpacity}>
      {(currentStep == 1) && (
        <>
          <Text style={styles.centerCopy}>doing things{'\n'}can be <Text style={styles.red}>hard</Text>.</Text>
          <Animated.View style={togetherAnimatedOpacity}>
            <Text style={styles.centerCopy}>doing things{'\n'}<Text style={styles.green}>together can be easier</Text>.</Text>
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
        </>
      )}
      {(currentStep == 5) && (
        <>
          <Text style={styles.centerCopy}><Text style={styles.green}>speak naturally </Text>
            and
            <Text style={styles.green}> just let your thoughts flow</Text>
            .</Text>
        </>
      )}
      {(currentStep == 6) && (
        <>
          <Text style={styles.centerCopy}>tap the
            <Text style={styles.green}> keyboard to add one thing at a time</Text>
            .</Text>
        </>
      )}
      {(currentStep == 7) && (
        <>
          <Text style={styles.centerCopy}>what are your</Text>
          <Animated.View>
            <Text style={[styles.centerCopy, styles.green]}>tasks?</Text>
          </Animated.View>
          <Animated.View style={goalsAnimatedOpacity}>
            <Text style={[styles.centerCopy, styles.green]}>goals?</Text>
          </Animated.View>
          <Animated.View style={dreamsAnimatedOpacity}>
            <Text style={[styles.centerCopy, styles.green]}>dreams?</Text>
          </Animated.View>
          <Animated.View style={challengesAnimatedOpacity}>
            <Text style={[styles.centerCopy, styles.green]}>challenges?</Text>
          </Animated.View>
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