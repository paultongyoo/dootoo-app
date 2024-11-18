import { Animated, Text, Image, Easing } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRef, useCallback, useContext } from 'react';
import { AppContext } from './AppContext';

const DootooItemEmptyUX = ({ styles }) => {
  const { emptyListCTAOpacity, emptyListCTAFadeInAnimation } = useContext(AppContext);

  const fadeAnimGoals = useRef(new Animated.Value(0.1)).current;
  const fadeAnimDreams = useRef(new Animated.Value(0.1)).current;
  const fadeAnimChallenges = useRef(new Animated.Value(0.1)).current;
  const fadeAnimArrow = useRef(new Animated.Value(0)).current;

  const ctaAnimation = Animated.sequence([
    Animated.timing(fadeAnimGoals, {
      toValue: 1,
      duration: 1500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true
    }),
    Animated.timing(fadeAnimDreams, {
      toValue: 1,
      duration: 1500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true
    }),
    Animated.timing(fadeAnimChallenges, {
      toValue: 1,
      duration: 1500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true
    }),
    Animated.delay(1000),
    Animated.timing(fadeAnimArrow, {
      toValue: 1,
      duration: 800,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true
    }),
  ]);

  useFocusEffect(
    useCallback(() => {
      emptyListCTAFadeInAnimation.start(() => {
        ctaAnimation.start()
      });
      return () => {
        emptyListCTAFadeInAnimation.reset();
        ctaAnimation.reset();
      }
    }, [])
  );

  return <Animated.View style={[styles.emptyListContainer, { opacity: emptyListCTAOpacity }]}>
    <Text style={styles.emptyListContainer_words}>what are your</Text>
    <Animated.View>
      <Text style={[styles.emptyListContainer_words, { color: '#556B2F' }]}>tasks?</Text>
    </Animated.View>
    <Animated.View style={[{ opacity: fadeAnimGoals }]}>
      <Text style={[styles.emptyListContainer_words, { color: '#556B2F' }]}>goals?</Text>
    </Animated.View>
    <Animated.View style={[{ opacity: fadeAnimDreams }]}>
      <Text style={[styles.emptyListContainer_words, { color: '#556B2F' }]}>dreams?</Text>
    </Animated.View>
    <Animated.View style={[{ opacity: fadeAnimChallenges }]}>
      <Text style={[styles.emptyListContainer_words, { color: '#556B2F' }]}>challenges?</Text>
    </Animated.View>
    <Animated.View style={{ opacity: fadeAnimArrow }}>
      <Image style={styles.emptyListContainer_arrow} source={require("@/assets/images/sketch_arrow_556B2F.png")} />
    </Animated.View>
  </Animated.View>;
};

export default DootooItemEmptyUX;