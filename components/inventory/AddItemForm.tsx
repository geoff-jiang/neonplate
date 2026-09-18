// components/inventory/AddItemForm.tsx
import { View, Modal, Pressable, Alert } from 'react-native';
import { useState } from 'react';
import { Text } from '../ui/text';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { CATEGORY_ORDER, type Category } from '../../lib/utils/inventory-grouping';
import { cn } from '../../lib/utils/cn';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, category: Category) => Promise<unknown>;
};

export function AddItemForm({ visible, onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('protein');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (saving || !name.trim()) return;
    setSaving(true);
    try {
      await onAdd(name.trim(), category);
      setName('');
      setCategory('protein');
      onClose();
    } catch (e) {
      Alert.alert('Add failed', String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (!saving) onClose();
      }}
    >
      <View className="flex-1 bg-background p-6">
        <View className="flex-row items-center justify-between mb-6">
          <Text variant="h2">Add ingredient</Text>
          <Button variant="ghost" onPress={onClose} disabled={saving}>
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
              onPress={() => setCategory(c)}
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

        <Button onPress={handleSubmit} disabled={saving || !name.trim()}>
          {saving ? 'Adding...' : 'Add'}
        </Button>
      </View>
    </Modal>
  );
}
