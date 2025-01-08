import { Redirect } from 'expo-router';
import { View } from 'react-native';

export default function Index() {
  return <View style={{ flex: 1, backgroundColor: '#DCC7AA' }}>
    <Redirect href="/(tabs)/open" />
  </View>
}
