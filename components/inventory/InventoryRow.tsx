// components/inventory/InventoryRow.tsx
import { View, Alert } from 'react-native';
import { useState } from 'react';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { InventoryItem } from '../../lib/supabase/queries';

type Props = {
  item: InventoryItem;
  onRemove: (id: string) => Promise<void>;
};

export function InventoryRow({ item, onRemove }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  const [busy, setBusy] = useState(false);

  async function handleRemove() {
    if (busy) return;
    setBusy(true);
    try {
      await onRemove(item.id);
      setShowConfirm(false);
    } catch (error) {
      Alert.alert('Remove failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

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
        busy={busy}
        onConfirm={handleRemove}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
