import { Drawer } from 'expo-router/drawer';
import DootooHeader from '@/components/DootooHeader';
import { useNavigation } from 'expo-router';
import CommunityDrawer from '@/components/CommunityDrawer';

export default function CommunityDrawerLayout() {
    const meDrawerNavigation = useNavigation();
    return (
            <Drawer
                drawerContent={(props) => <CommunityDrawer {...props} />}
                screenOptions={
                    {
                        swipeEnabled: false,
                        drawerPosition: 'left',
                        headerTransparent: true,
                        header: ({ navigation, route }) => <DootooHeader meDrawerNavigation={meDrawerNavigation} />
                    }}>
                <Drawer.Screen name="stack" />
            </Drawer>
    );
}