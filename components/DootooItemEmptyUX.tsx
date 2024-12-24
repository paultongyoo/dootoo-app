import { Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import Animated, { runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';

const DootooItemEmptyUX = () => {

  const opacity = useSharedValue(0);

  const fadeAnimGoals = useSharedValue(0.1);
  const fadeAnimDreams = useSharedValue(0.1);
  const fadeAnimChallenges = useSharedValue(0.1);

  const executeCTAAnimation = async () => {
    await new Promise<void>((resolve) => {
      fadeAnimGoals.value = withTiming(1, { duration: 1500 }, (isFinished) => {
        if (isFinished) {
          runOnJS(resolve)();
        }
      })
    });
    await new Promise<void>((resolve) => {
      fadeAnimDreams.value = withTiming(1, { duration: 1500 }, (isFinished) => {
        if (isFinished) {
          runOnJS(resolve)();
        }
      })
    });
    await new Promise<void>((resolve) => {
      fadeAnimChallenges.value = withTiming(1, { duration: 1500 }, (isFinished) => {
        if (isFinished) {
          runOnJS(resolve)();
        }
      })
    });
  }

  useFocusEffect(
    useCallback(() => {
      console.log("Inside DootooItemEmptyUX.useFocusEffect()")
      opacity.value = withTiming(1, { duration: 800 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeCTAAnimation)();
        }
      });
      return () => {
        console.log("Cleaning up DootooItemEmptyUX.useFocusEffect()")
        opacity.value = withTiming(0, { duration: 800 }, (isFinished) => {
          if (isFinished) {
            fadeAnimGoals.value = 0.1;
            fadeAnimDreams.value = 0.1;
            fadeAnimChallenges.value = 0.1;
          }
        });
      }
    }, [])
  );

  const emptyStyles = StyleSheet.create({
    emptyListContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingLeft: 30,
      paddingRight: 60        // Tips specific
    },
    emptyListContainer_words: {
      fontSize: 40,
      lineHeight: 48          // Tips specific
    },
  })

  return <Animated.View style={[emptyStyles.emptyListContainer, { opacity }]}>
    <Text style={emptyStyles.emptyListContainer_words}>what are your</Text>
    <Animated.View>
      <Text style={[emptyStyles.emptyListContainer_words, { color: '#556B2F' }]}>tasks?</Text>
    </Animated.View>
    <Animated.View style={[{ opacity: fadeAnimGoals }]}>
      <Text style={[emptyStyles.emptyListContainer_words, { color: '#556B2F' }]}>goals?</Text>
    </Animated.View>
    <Animated.View style={[{ opacity: fadeAnimDreams }]}>
      <Text style={[emptyStyles.emptyListContainer_words, { color: '#556B2F' }]}>dreams?</Text>
    </Animated.View>
    <Animated.View style={[{ opacity: fadeAnimChallenges }]}>
      <Text style={[emptyStyles.emptyListContainer_words, { color: '#556B2F' }]}>challenges?</Text>
    </Animated.View>
  </Animated.View>;
};

export default DootooItemEmptyUX;