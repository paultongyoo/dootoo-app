import { Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useContext } from 'react';
import { AppContext } from './AppContext';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const DootooDoneEmptyUX = () => {

  const opacity = useSharedValue(0)

  const workOpacity = useSharedValue(0);
  const workAnimatedOpacity = useAnimatedStyle(() => {
    return { opacity: workOpacity.value }
  });

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
        if (isFinished) {
          workOpacity.value = withTiming(1, { duration: 400 });
        }
      })
      return () => {
        opacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
          if (isFinished) {
            workOpacity.value = withTiming(0, { duration: 0 });
          }
        })
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
    <Text style={emptyStyles.emptyListContainer_words}>Your done items will appear here.</Text>
    <Animated.View style={workAnimatedOpacity}>
      <Text style={[emptyStyles.emptyListContainer_words, { color: '#556B2F' }]}>Let's get to work!</Text>
    </Animated.View>
  </Animated.View>;
};

export default DootooDoneEmptyUX;