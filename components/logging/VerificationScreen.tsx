// components/logging/VerificationScreen.tsx
import { View, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { Text } from '../ui/text';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import type { MealExtraction } from '../../lib/ai/schemas';

export type VerificationResult = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type Props = {
  extraction: MealExtraction;
  rawInput?: string;
  onConfirm: (result: VerificationResult) => Promise<void>;
  onReparse?: (hint?: string) => Promise<void>;
  onCancel: () => void;
};

export function VerificationScreen({
  extraction,
  rawInput,
  onConfirm,
  onReparse,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState<VerificationResult>({
    name: extraction.name,
    calories: extraction.calories,
    protein_g: extraction.protein_g,
    carbs_g: extraction.carbs_g,
    fat_g: extraction.fat_g,
  });
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState('');

  function intField(field: keyof Omit<VerificationResult, 'name'>) {
    return {
      value: String(draft[field]),
      onChangeText: (v: string) => {
        const n = parseInt(v, 10);
        setDraft((d) => ({ ...d, [field]: Number.isFinite(n) ? n : 0 }));
      },
      keyboardType: 'number-pad' as const,
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onConfirm(draft);
    } catch (e) {
      Alert.alert('Save failed', String(e));
    } finally {
      setSaving(false);
    }
  }

  const confidenceColor =
    extraction.confidence === 'low'
      ? 'text-warning'
      : extraction.confidence === 'medium'
        ? 'text-muted-foreground'
        : 'text-success';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-6 gap-4">
      <Text variant="h2">Verify meal</Text>

      {rawInput ? (
        <Card>
          <Text variant="caption">You said:</Text>
          <Text>{rawInput}</Text>
        </Card>
      ) : null}

      <View>
        <Text variant="label">
          Confidence: <Text className={confidenceColor}>{extraction.confidence}</Text>
        </Text>
        {extraction.notes ? <Text variant="caption">{extraction.notes}</Text> : null}
      </View>

      <View>
        <Text variant="label">Meal name</Text>
        <Input value={draft.name} onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))} />
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text variant="label">Calories</Text>
          <Input {...intField('calories')} />
        </View>
        <View className="flex-1">
          <Text variant="label">Protein (g)</Text>
          <Input {...intField('protein_g')} />
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text variant="label">Carbs (g)</Text>
          <Input {...intField('carbs_g')} />
        </View>
        <View className="flex-1">
          <Text variant="label">Fat (g)</Text>
          <Input {...intField('fat_g')} />
        </View>
      </View>

      {onReparse ? (
        <View>
          <Text variant="label">Re-parse with hint</Text>
          <Input placeholder="e.g., it was 2 servings, not 1" value={hint} onChangeText={setHint} />
          <Button variant="outline" className="mt-2" onPress={() => onReparse(hint)}>
            Re-parse
          </Button>
        </View>
      ) : null}

      <View className="flex-row gap-3 mt-4">
        <Button variant="outline" className="flex-1" onPress={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1" onPress={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </View>
    </ScrollView>
  );
}
