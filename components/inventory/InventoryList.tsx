// components/inventory/InventoryList.tsx
import { View, ScrollView } from 'react-native';
import { Text } from '../ui/text';
import { InventoryRow } from './InventoryRow';
import type { InventoryItem } from '../../lib/supabase/queries';

type Group = {
  category: string;
  items: InventoryItem[];
};

const CATEGORY_LABELS: Record<string, string> = {
  protein: 'Protein',
  produce: 'Produce',
  staple: 'Staples',
  other: 'Other',
};

type Props = {
  groups: Group[];
  onRemove: (id: string) => Promise<void>;
  isTablet: boolean;
  onSetStock: (id: string, inStock: boolean) => Promise<unknown>;
  onEdit: (item: InventoryItem) => void;
};

export function InventoryList({ groups, onRemove, isTablet, onSetStock, onEdit }: Props) {
  if (isTablet) {
    return (
      <ScrollView className="flex-1 px-6">
        <View className="flex-row flex-wrap gap-4 pb-6">
          {groups.map((group) => (
            <View key={group.category} className="flex-1 min-w-[220px]">
              <Text variant="h3" className="mb-2">
                {CATEGORY_LABELS[group.category]}
              </Text>
              {group.items.map((item) => (
                <InventoryRow
                  key={item.id}
                  item={item}
                  onRemove={onRemove}
                  onSetStock={onSetStock}
                  onEdit={onEdit}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 px-6 pb-6">
      {groups.map((group) => (
        <View key={group.category} className="mb-6">
          <Text variant="h3" className="mb-2">
            {CATEGORY_LABELS[group.category]}
          </Text>
          {group.items.map((item) => (
            <InventoryRow
              key={item.id}
              item={item}
              onRemove={onRemove}
              onSetStock={onSetStock}
              onEdit={onEdit}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
