import { Animated, Text, StyleSheet, Easing } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useContext } from 'react';
import { AppContext } from './AppContext';

const DootooDoneEmptyUX = () => {
  const { emptyListCTAOpacity, emptyListCTAFadeInAnimation } = useContext(AppContext);


  useFocusEffect(
    useCallback(() => {
      emptyListCTAFadeInAnimation.start();
      return () => {
        emptyListCTAFadeInAnimation.reset();
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

  return <Animated.View style={[emptyStyles.emptyListContainer, { opacity: emptyListCTAOpacity }]}>
    <Text style={emptyStyles.emptyListContainer_words}>Your done items will appear here.</Text>
    <Text style={[emptyStyles.emptyListContainer_words, { color: '#556B2F' }]}>Let's get to work!</Text>
  </Animated.View>;
};

export default DootooDoneEmptyUX;