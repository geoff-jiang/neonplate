// components/inventory/InventoryHeader.tsx
import { View } from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';

type Props = {
  onAdd: () => void;
};

export function InventoryHeader({ onAdd }: Props) {
  return (
    <View className="flex-row items-center justify-between p-6">
      <Text variant="h1">Inventory</Text>
      <Button onPress={onAdd}>+ Add</Button>
    </View>
  );
}
