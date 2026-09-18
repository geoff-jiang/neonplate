// components/inventory/InventoryEmpty.tsx
import { View } from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';

type Props = {
  onAdd: () => void;
};

export function InventoryEmpty({ onAdd }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text variant="muted" className="text-center mb-4">
        Your pantry is empty.
      </Text>
      <Button onPress={onAdd}>Add your first ingredient</Button>
    </View>
  );
}
