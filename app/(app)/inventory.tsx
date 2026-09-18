// app/(app)/inventory.tsx
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InventoryHeader } from '../../components/inventory/InventoryHeader';
import { LoadStatus } from '../../components/ui/load-status';
import { InventoryEmpty } from '../../components/inventory/InventoryEmpty';
import { InventoryList } from '../../components/inventory/InventoryList';
import { AddItemForm } from '../../components/inventory/AddItemForm';
import { useInventory } from '../../hooks/use-inventory';
import { groupByCategory } from '../../lib/utils/inventory-grouping';
import { useBreakpoint } from '../../hooks/use-breakpoint';

export default function Inventory() {
  const { items, loading, add, remove, error, reload } = useInventory();
  const [addOpen, setAddOpen] = useState(false);
  const { isTablet } = useBreakpoint();
  const groups = groupByCategory(items);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <InventoryHeader onAdd={() => setAddOpen(true)} />

      <LoadStatus
        loading={loading}
        error={error}
        label="Loading inventory..."
        onRetry={() => void reload()}
      />
      {items.length > 0 ? (
        <InventoryList groups={groups} isTablet={isTablet} onRemove={remove} />
      ) : !loading && !error ? (
        <InventoryEmpty onAdd={() => setAddOpen(true)} />
      ) : null}

      <AddItemForm visible={addOpen} onClose={() => setAddOpen(false)} onAdd={add} />
    </SafeAreaView>
  );
}
