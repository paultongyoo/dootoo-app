import { Drawer } from 'expo-router/drawer';
import { AppProvider } from '@/components/AppContext';
import Toast from "react-native-toast-message";
import toastConfig from "@/components/ToastConfig";
import ProfileScreen from "@/components/ProfileDrawer";

export default function MyProfileDrawerLayout() {
    return (
        <>
            <Drawer
                drawerContent={(props) => <ProfileScreen {...props} />}
                screenOptions={
                    {
                        swipeEnabled: false,
                        drawerPosition: 'right',
                        headerShown: false
                    }}>
                <Drawer.Screen name="communityDrawer" />
            </Drawer>
            <Toast config={toastConfig} />
        </>
    );
}