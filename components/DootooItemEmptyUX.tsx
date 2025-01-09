import { Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, Easing } from 'react-native-reanimated';

const DootooItemEmptyUX = ({buttonContainerScaleSV}) => {

  const opacity = useSharedValue(0);

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

  const executeCTAAnimation = async () => {
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
  }

  useFocusEffect(
    useCallback(() => {
      //console.log("Inside EmptyItemUX focus effect");

      opacity.value = withTiming(1, { duration: 400 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeCTAAnimation)();
        }
      });
      return () => {
        opacity.value = withTiming(0, { duration: 400 }, (isFinished) => {
          if (isFinished) {
            fadeAnimGoals.value = 0;
            fadeAnimDreams.value = 0;
            fadeAnimChallenges.value = 0;
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
    <Animated.View style={goalsAnimatedOpacity}>
      <Text style={[emptyStyles.emptyListContainer_words, { color: '#556B2F' }]}>goals?</Text>
    </Animated.View>
    <Animated.View style={dreamsAnimatedOpacity}>
      <Text style={[emptyStyles.emptyListContainer_words, { color: '#556B2F' }]}>dreams?</Text>
    </Animated.View>
    <Animated.View style={challengesAnimatedOpacity}>
      <Text style={[emptyStyles.emptyListContainer_words, { color: '#556B2F' }]}>challenges?</Text>
    </Animated.View>
  </Animated.View>;
};

export default DootooItemEmptyUX;