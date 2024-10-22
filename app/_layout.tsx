import { Stack } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack 
        screenOptions={{
          headerStyle: {
            backgroundColor: "#FAF3E0"
          },
          headerTitle: '',
          headerBackTitleVisible: false
        }}
      />
    </GestureHandlerRootView>
  );
}