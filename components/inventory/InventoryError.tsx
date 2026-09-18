// components/inventory/InventoryError.tsx
import { View } from 'react-native';
import { Text } from '../ui/text';

export function InventoryError() {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-destructive text-center">
        Couldn&apos;t load inventory. Check your connection.
      </Text>
    </View>
  );
}
