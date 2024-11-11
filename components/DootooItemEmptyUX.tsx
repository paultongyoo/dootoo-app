import { Animated, Text, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRef, useCallback } from 'react';

const DootooItemEmptyUX = ({ styles }) => {

    const fadeCTA = useRef(new Animated.Value(0)).current;
    const fadeAnimGoals = useRef(new Animated.Value(0.1)).current;
    const fadeAnimDreams = useRef(new Animated.Value(0.1)).current;
    const fadeAnimChallenges = useRef(new Animated.Value(0.1)).current;
  
    const ctaAnimation = Animated.sequence([
      Animated.timing(fadeCTA, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.delay(1000),
      Animated.timing(fadeAnimGoals, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnimDreams, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnimChallenges, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnimChallenges, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true
      })
    ]);

    useFocusEffect(
        useCallback(() => {
            ctaAnimation.start();
            return () => {
                ctaAnimation.reset();
            }
        }, [])
     );
  
    return <Animated.View style={[styles.emptyListContainer, { opacity: fadeCTA }]}>
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
      <Image style={styles.emptyListContainer_arrow} source={require("../assets/images/sketch_arrow_556B2F.png")} />
    </Animated.View>;
  };

  export default DootooItemEmptyUX;