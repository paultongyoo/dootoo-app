import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

export default function ItemTips() {
  const { item_id } = useLocalSearchParams();

  return <Text>Item ID: {item_id}</Text>;
}