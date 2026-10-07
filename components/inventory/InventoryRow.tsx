import { View, Switch, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { InventoryItem } from '../../lib/supabase/queries';

type Props = {
  item: InventoryItem;
  onRemove: (id: string) => Promise<unknown>;
  onSetStock: (id: string, inStock: boolean) => Promise<unknown>;
  onEdit: (item: InventoryItem) => void;
};

export function InventoryRow({ item, onRemove, onSetStock, onEdit }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function change(action: () => Promise<unknown>, deleting = false) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await action();
      if (mounted.current && deleting) setShowConfirm(false);
    } catch (error) {
      if (mounted.current)
        Alert.alert(
          deleting ? 'Delete failed' : 'Stock change failed',
          error instanceof Error
            ? error.message
            : 'Could not update this ingredient. Please retry.',
        );
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <>
      <View className="border-b border-border py-3 px-2">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text>{item.name}</Text>
            <Text variant="muted">{item.in_stock ? 'In stock' : 'Out of stock'}</Text>
          </View>
          <Switch
            value={item.in_stock}
            disabled={busy}
            accessibilityLabel={`${item.name} in stock`}
            onValueChange={(value) => void change(() => onSetStock(item.id, value))}
          />
        </View>
        <View className="flex-row justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onPress={() => {
              if (!inFlight.current) onEdit(item);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onPress={() => {
              if (!inFlight.current) setShowConfirm(true);
            }}
          >
            Delete
          </Button>
        </View>
      </View>
      <ConfirmDialog
        visible={showConfirm}
        title="Permanently delete ingredient?"
        message={`Delete "${item.name}" permanently? To keep it for later, mark it out of stock instead.`}
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        busy={busy}
        onConfirm={() => void change(() => onRemove(item.id), true)}
        onCancel={() => {
          if (!inFlight.current) setShowConfirm(false);
        }}
      />
    </>
  );
}
