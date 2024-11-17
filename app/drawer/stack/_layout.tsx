import DootooHeader from '@/components/DootooHeader';
import { Stack } from 'expo-router';

export default function StackLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="tips"/>
        </Stack>
    )
};