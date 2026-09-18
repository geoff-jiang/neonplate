// components/inventory/InventoryLoading.tsx
import { View } from 'react-native';
import { Text } from '../ui/text';

export function InventoryLoading() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text variant="muted">Loading...</Text>
    </View>
  );
}
