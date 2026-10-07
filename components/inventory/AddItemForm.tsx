import { View, Modal, Pressable } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Text } from '../ui/text';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { CATEGORY_ORDER, type Category } from '../../lib/utils/inventory-grouping';
import { cn } from '../../lib/utils/cn';
import type { InventoryItem } from '../../lib/supabase/queries';

type Props = {
  visible: boolean;
  item?: InventoryItem;
  onClose: () => void;
  onAdd: (name: string, category: Category) => Promise<unknown>;
  onUpdate: (id: string, patch: { name: string; category: Category }) => Promise<unknown>;
};

export function AddItemForm({ visible, item, onClose, onAdd, onUpdate }: Props) {
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState<Category>(
    CATEGORY_ORDER.includes(item?.category as Category)
      ? (item!.category as Category)
      : item
        ? 'other'
        : 'protein',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function handleSubmit() {
    if (inFlight.current || !name.trim()) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      if (item) await onUpdate(item.id, { name, category });
      else await onAdd(name, category);
      if (mounted.current) onClose();
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : 'Could not save this ingredient. Please retry.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  const close = () => {
    if (!inFlight.current) onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <View className="flex-1 bg-background p-6">
        <View className="flex-row items-center justify-between mb-6">
          <Text variant="h2">{item ? 'Edit ingredient' : 'Add ingredient'}</Text>
          <Button variant="ghost" onPress={close} disabled={saving}>
            Cancel
          </Button>
        </View>
        <Text variant="label" className="mb-2">
          Name
        </Text>
        <Input
          placeholder="e.g., chicken breast"
          value={name}
          onChangeText={setName}
          editable={!saving}
          autoFocus
          autoCapitalize="none"
          className="mb-4"
        />
        <Text variant="label" className="mb-2">
          Category
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {CATEGORY_ORDER.map((c) => (
            <Pressable
              key={c}
              disabled={saving}
              onPress={() => setCategory(c)}
              accessibilityRole="radio"
              accessibilityState={{ selected: category === c, disabled: saving }}
              accessibilityLabel={c}
              className={cn(
                'px-4 py-2 rounded-full border',
                category === c ? 'bg-primary border-primary' : 'bg-background border-border',
              )}
            >
              <Text className={category === c ? 'text-primary-foreground' : 'text-foreground'}>
                {c}
              </Text>
            </Pressable>
          ))}
        </View>
        {error ? (
          <Text className="text-destructive mb-4" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Button onPress={handleSubmit} disabled={saving || !name.trim()}>
          {saving ? 'Saving...' : item ? 'Save' : 'Add'}
        </Button>
      </View>
    </Modal>
  );
}
