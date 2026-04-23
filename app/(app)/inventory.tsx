// app/(app)/inventory.tsx
import { View, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import { InventoryRow } from '../../components/inventory/InventoryRow';
import { AddItemForm } from '../../components/inventory/AddItemForm';
import { useInventory } from '../../hooks/use-inventory';
import { groupByCategory, CATEGORY_ORDER } from '../../lib/utils/inventory-grouping';
import { useBreakpoint } from '../../hooks/use-breakpoint';

const CATEGORY_LABELS: Record<string, string> = {
  protein: 'Protein',
  produce: 'Produce',
  staple: 'Staples',
  other: 'Other',
};

export default function Inventory() {
  const { items, loading, add, remove, error } = useInventory();
  const [addOpen, setAddOpen] = useState(false);
  const { isTablet } = useBreakpoint();
  const groups = groupByCategory(items);

  async function handleRemove(id: string) {
    try {
      await remove(id);
    } catch (e) {
      Alert.alert('Remove failed', String(e));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between p-6">
        <Text variant="h1">Inventory</Text>
        <Button onPress={() => setAddOpen(true)}>+ Add</Button>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text variant="muted">Loading...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-destructive text-center">
            Couldn't load inventory. Check your connection.
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text variant="muted" className="text-center mb-4">
            Your pantry is empty.
          </Text>
          <Button onPress={() => setAddOpen(true)}>Add your first ingredient</Button>
        </View>
      ) : isTablet ? (
        <ScrollView className="flex-1 px-6">
          <View className="flex-row flex-wrap gap-4 pb-6">
            {groups.map((group) => (
              <View key={group.category} className="flex-1 min-w-[220px]">
                <Text variant="h3" className="mb-2">
                  {CATEGORY_LABELS[group.category]}
                </Text>
                {group.items.map((item) => (
                  <InventoryRow key={item.id} item={item} onRemove={handleRemove} />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1 px-6 pb-6">
          {groups.map((group) => (
            <View key={group.category} className="mb-6">
              <Text variant="h3" className="mb-2">
                {CATEGORY_LABELS[group.category]}
              </Text>
              {group.items.map((item) => (
                <InventoryRow key={item.id} item={item} onRemove={handleRemove} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <AddItemForm visible={addOpen} onClose={() => setAddOpen(false)} onAdd={add} />
    </SafeAreaView>
  );
}
