// app/(app)/inventory.tsx
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InventoryHeader } from '../../components/inventory/InventoryHeader';
import { InventoryLoading } from '../../components/inventory/InventoryLoading';
import { InventoryError } from '../../components/inventory/InventoryError';
import { InventoryEmpty } from '../../components/inventory/InventoryEmpty';
import { InventoryList } from '../../components/inventory/InventoryList';
import { AddItemForm } from '../../components/inventory/AddItemForm';
import { useInventory } from '../../hooks/use-inventory';
import { groupByCategory } from '../../lib/utils/inventory-grouping';
import { useBreakpoint } from '../../hooks/use-breakpoint';

export default function Inventory() {
  const { items, loading, add, remove, error } = useInventory();
  const [addOpen, setAddOpen] = useState(false);
  const { isTablet } = useBreakpoint();
  const groups = groupByCategory(items);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <InventoryHeader onAdd={() => setAddOpen(true)} />

      {loading ? (
        <InventoryLoading />
      ) : error ? (
        <InventoryError />
      ) : items.length === 0 ? (
        <InventoryEmpty onAdd={() => setAddOpen(true)} />
      ) : (
        <InventoryList groups={groups} isTablet={isTablet} onRemove={remove} />
      )}

      <AddItemForm visible={addOpen} onClose={() => setAddOpen(false)} onAdd={add} />
    </SafeAreaView>
  );
}
