import DootooFooter from '@/components/DootooFooter';
import DootooHeader from '@/components/DootooHeader';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => (<DootooFooter {...props} />)}
      screenOptions={{
        header: (props) => (<DootooHeader {...props} />)
      }}>
      <Tabs.Screen name="list" />
      <Tabs.Screen name="done" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}