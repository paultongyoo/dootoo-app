import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { AppProvider } from '@/components/AppContext';
import Toast from "react-native-toast-message";
import toastConfig from "@/components/ToastConfig";
import ProfileDrawer from "@/components/ProfileDrawer";
import DootooHeader from '@/components/DootooHeader';

export default function MyProfileDrawerLayout() {
    return (
        <>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <AppProvider>
                    <Drawer
                        drawerContent={(props) => <ProfileDrawer {...props} />}
                        screenOptions={
                            {
                                drawerPosition: 'right',
                                headerShown: false
                            }}>
                        <Drawer.Screen name="communityDrawer" />
                    </Drawer>
                </AppProvider>
                <Toast config={toastConfig} />
            </GestureHandlerRootView>
        </>
    );
}