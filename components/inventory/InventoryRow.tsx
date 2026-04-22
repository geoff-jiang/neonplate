// components/inventory/InventoryRow.tsx
import { View, Alert } from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import type { InventoryItem } from '../../lib/supabase/queries';

type Props = {
  item: InventoryItem;
  onRemove: (id: string) => void;
};

export function InventoryRow({ item, onRemove }: Props) {
  function confirmRemove() {
    Alert.alert(
      'Remove item?',
      `Remove "${item.name}" from inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemove(item.id) },
      ],
    );
  }

  return (
    <View className="flex-row items-center justify-between border-b border-border py-3 px-2">
      <Text className="flex-1">{item.name}</Text>
      <Button variant="ghost" size="sm" onPress={confirmRemove}>
        Remove
      </Button>
    </View>
  );
}
