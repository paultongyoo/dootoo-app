import { Stack } from 'expo-router';

export default function StackLayout() {
    return (
        <Stack screenOptions={{
            headerTransparent: true,
            headerTitle: '',
        }}>
            <Stack.Screen name="index"/>
            <Stack.Screen name="tips"/>
        </Stack>
    )
};