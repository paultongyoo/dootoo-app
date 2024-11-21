import { Drawer } from 'expo-router/drawer';
import ProfileDrawer from "@/components/ProfileDrawer";
import DootooHeader from '@/components/DootooHeader';
import { useNavigation } from 'expo-router';

export default function CommunityDrawerLayout() {
    const parentNavigation = useNavigation();
    return (
            <Drawer
                drawerContent={(props) => <ProfileDrawer {...props} />}
                screenOptions={
                    {
                        drawerPosition: 'left',
                        headerTransparent: true,
                        header: ({ navigation, route }) => <DootooHeader meDrawerNavigation={parentNavigation} />
                    }}>
                <Drawer.Screen name="stack" />
            </Drawer>
    );
}