import { Slot } from 'expo-router';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

export default function Index() {

  const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#DCC7AA',
            justifyContent: 'center',
            alignItems: 'center'
        }
    });

    return <Slot/>;
}
