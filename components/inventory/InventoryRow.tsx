// components/inventory/InventoryRow.tsx
import { View } from 'react-native';
import { useState } from 'react';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { InventoryItem } from '../../lib/supabase/queries';

type Props = {
  item: InventoryItem;
  onRemove: (id: string) => void;
};

export function InventoryRow({ item, onRemove }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <View className="flex-row items-center justify-between border-b border-border py-3 px-2">
        <Text className="flex-1">{item.name}</Text>
        <Button variant="ghost" size="sm" onPress={() => setShowConfirm(true)}>
          Remove
        </Button>
      </View>

      <ConfirmDialog
        visible={showConfirm}
        title="Remove item?"
        message={`Remove "${item.name}" from inventory?`}
        confirmText="Remove"
        cancelText="Cancel"
        destructive
        onConfirm={() => {
          onRemove(item.id);
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
