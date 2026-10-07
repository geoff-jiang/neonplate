// app/(app)/inventory.tsx
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InventoryHeader } from '../../components/inventory/InventoryHeader';
import { Text } from '../../components/ui/text';
import { LoadStatus } from '../../components/ui/load-status';
import { InventoryEmpty } from '../../components/inventory/InventoryEmpty';
import { InventoryList } from '../../components/inventory/InventoryList';
import { AddItemForm } from '../../components/inventory/AddItemForm';
import { useInventory } from '../../hooks/use-inventory';
import { groupByCategory } from '../../lib/utils/inventory-grouping';
import type { InventoryItem } from '../../lib/supabase/queries';
import { useBreakpoint } from '../../hooks/use-breakpoint';

export default function Inventory() {
  const { items, loading, add, update, setStock, remove, error, reload } = useInventory();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | undefined>();
  const { isTablet } = useBreakpoint();
  const groups = groupByCategory(items);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <InventoryHeader onAdd={() => setAddOpen(true)} />
      <Text variant="muted" className="px-6 pb-3">
        Suggestions will use in-stock items and assume oil, salt, pepper, garlic, and common spices
        are available.
      </Text>

      <LoadStatus
        loading={loading}
        error={error}
        label="Loading inventory..."
        onRetry={() => void reload()}
      />
      {items.length > 0 ? (
        <InventoryList
          groups={groups}
          isTablet={isTablet}
          onRemove={remove}
          onSetStock={setStock}
          onEdit={setEditing}
        />
      ) : !loading && !error ? (
        <InventoryEmpty onAdd={() => setAddOpen(true)} />
      ) : null}

      {addOpen || editing ? (
        <AddItemForm
          key={editing?.id ?? 'new'}
          visible
          item={editing}
          onClose={() => {
            setAddOpen(false);
            setEditing(undefined);
          }}
          onAdd={add}
          onUpdate={update}
        />
      ) : null}
    </SafeAreaView>
  );
}
