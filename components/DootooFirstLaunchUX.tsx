import { Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useContext } from 'react';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppContext } from './AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DootooFirstLaunchUX = () => {
   const { isFirstLaunch } = useContext(AppContext);

  const opacity = useSharedValue(0);

  const fadeTogether = useSharedValue(0);
  const togetherAnimatedOpacity = useAnimatedStyle(() => {
    return { opacity: fadeTogether.value }
  })

  const executeCTAAnimation = async () => {
    await new Promise<void>((resolve) => {
      fadeTogether.value = withTiming(1, { duration: 800 }, (isFinished) => {
        if (isFinished) {
          runOnJS(resolve)();
        }
      })
    });

    isFirstLaunch.current = false;
    await AsyncStorage.setItem('isFirstLaunch', 'false');
  }

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 800 }, (isFinished) => {
        if (isFinished) {
          runOnJS(executeCTAAnimation)();
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

  const emptyStyles = StyleSheet.create({
    emptyListContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingLeft: 30,
      paddingRight: 60        // Tips specific
    },
    centerCopy: {
      fontSize: 40,
      color: '#3E2723',
      paddingBottom: 20
    },
    red: {
      color: '#A23E48'
    },
    green: {
      color: '#556B2F'
    }
  })

  return <Animated.View style={[emptyStyles.emptyListContainer, { opacity }]}>
    <Text style={emptyStyles.centerCopy}>doing things{'\n'}can be <Text style={emptyStyles.red}>hard</Text>.</Text>
    <Animated.View style={togetherAnimatedOpacity}>
      <Text style={emptyStyles.centerCopy}>doing things{'\n'}<Text style={emptyStyles.green}>together is{'\n'}easier</Text>.</Text>
    </Animated.View>
  </Animated.View>;
};

export default DootooFirstLaunchUX;