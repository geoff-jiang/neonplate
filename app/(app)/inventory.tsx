// app/(app)/inventory.tsx
import { View } from 'react-native';
import { Text } from '../../components/ui/text';

export default function Inventory() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text variant="h2">Inventory</Text>
    </View>
  );
}