import { Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const DootooCommunityEmptyUX = () => {

  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 800 });
      return () => {
        opacity.value = withTiming(0, { duration: 800 });
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
    <Text style={emptyStyles.emptyListContainer_words}>Be the first to share your goals with the community!</Text>
  </Animated.View>;
};

export default DootooCommunityEmptyUX;