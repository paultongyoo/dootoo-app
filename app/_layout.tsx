import { Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack 
        screenOptions={{
          headerStyle: {
            backgroundColor: "#FAF3E0"
          },
          headerTitle: props => <MainLogo/>,
          headerBackTitleVisible: false
        }}
      />
    </GestureHandlerRootView>
  );
}