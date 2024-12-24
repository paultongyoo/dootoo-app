import { Text, StyleSheet, Easing } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useContext } from 'react';
import { AppContext } from './AppContext';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';

const DootooDoneEmptyUX = () => {
  
  const opacity = useSharedValue(0)

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 800 })
      return () => {
        opacity.value = withTiming(0, { duration: 800 })
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
    <Text style={[emptyStyles.emptyListContainer_words, { color: '#556B2F' }]}>Let's get to work!</Text>
  </Animated.View>;
};

export default DootooDoneEmptyUX;