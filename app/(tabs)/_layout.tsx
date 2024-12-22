import DootooFooter from '@/components/DootooFooter';
import { CircleCheck } from '@/components/svg/circle-check';
import { List } from '@/components/svg/list';
import { UserRound } from '@/components/svg/user-round';
import { Tabs } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';

export default function TabLayout() {
  return (
    <Tabs 
      tabBar={(props) => (<DootooFooter {...props} />)}>
      <Tabs.Screen
        name="list"
        options={{
          title: 'List',
          tabBarIcon: ({ color }) => <List wxh={28} color={useSharedValue(color)} />,
        }}
      />
      {/* <Tabs.Screen
        name="done"
        options={{
          title: 'Done',
          tabBarIcon: ({ color }) => <CircleCheck wxh={28} color={useSharedValue(color)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <UserRound wxh={28} color={useSharedValue(color)} />,
        }}
      /> */}
    </Tabs>
  );
}