import DootooHeader from '@/components/DootooHeader';
import { Stack } from 'expo-router';

export default function StackLayout() {
    return (
        <Stack screenOptions={{
            headerTransparent: true,
            header: ({ navigation, route }) => <DootooHeader navigation={navigation} route={route} />
        }}>
            <Stack.Screen name="index" options={{ headerShown: false}} />
            <Stack.Screen name="step2" options={{ headerShown: false}} />
            <Stack.Screen name="step3" options={{ headerShown: false}} />
            <Stack.Screen name="step4" options={{ headerShown: false}} />
            <Stack.Screen name="step5" options={{ headerShown: false}} />
            <Stack.Screen name="items" options={{ animation: 'none'}} />
            <Stack.Screen name="tips"/>
        </Stack>
    )
};