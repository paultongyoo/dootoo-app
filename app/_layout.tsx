import { Stack } from "expo-router";
import { View, Text, StyleSheet, Image } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';


const styles = StyleSheet.create({
  mainLogoContainer: {
    flexDirection: 'row',
    position: 'relative',
    bottom: -4
  },
  mainLogoPart: {
    fontSize: 28
  },
  secondLogoPart: {
    color: "#A23E48"
  },
  mainProfileIconContainer: {
    position: 'relative',
    bottom: -4
  },
  profileIcon: {
    height: 40,
    width: 40
  }
});

function MainLogo() {
  return (
    <View style={styles.mainLogoContainer}>
      <Text style={styles.mainLogoPart}>doo</Text>
      <Text style={[styles.mainLogoPart, styles.secondLogoPart]}>too</Text>
    </View>

  );
}

function MainProfileIcon() {
  return (
    <View style={styles.mainProfileIconContainer}>
      <Image style={styles.profileIcon} source={require('../assets/images/profile_icon_green.png')} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack 
        screenOptions={{
          headerStyle: {
            backgroundColor: "#FAF3E0"
          },
          headerTitle: '',
          headerLeft: props => <MainLogo/>,
          headerRight: props => <MainProfileIcon/>,
          headerBackTitleVisible: false
        }}
      />
    </GestureHandlerRootView>
  );
}