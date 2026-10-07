// components/logging/VerificationScreen.tsx
import { View, ScrollView, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Text } from '../ui/text';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import type { MealExtraction } from '../../lib/ai/schemas';

import {
  mealToDraft,
  parseMealDraft,
  type VerificationResult,
} from '../../lib/utils/meal-validation';
export type { VerificationResult } from '../../lib/utils/meal-validation';

type Props = {
  extraction: MealExtraction;
  mode?: 'ai' | 'manual' | 'edit';
  rawInput?: string;
  onConfirm: (result: VerificationResult) => Promise<void>;
  onReparse?: (hint?: string) => Promise<void>;
  onCancel: () => void;
};

export function VerificationScreen({
  extraction,
  mode = 'ai',
  rawInput,
  onConfirm,
  onReparse,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState(() => mealToDraft(extraction, mode === 'manual'));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState('');
  const [reparsing, setReparsing] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const busy = saving || reparsing;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    setDraft(mealToDraft(extraction, mode === 'manual'));
    setValidationError(null);
  }, [extraction, mode]);

  function intField(field: keyof Omit<VerificationResult, 'name'>) {
    return {
      value: draft[field],
      editable: !busy,
      onChangeText: (v: string) => {
        if (inFlight.current) return;
        setDraft((d) => ({ ...d, [field]: v }));
        setValidationError(null);
      },
      keyboardType: 'number-pad' as const,
    };
  }

  async function handleSave() {
    if (inFlight.current || !mounted.current) return;
    let result: VerificationResult;
    try {
      result = parseMealDraft(draft);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Check your meal details.');
      return;
    }
    setValidationError(null);
    inFlight.current = true;
    setSaving(true);
    try {
      await onConfirm(result);
    } catch (e) {
      if (mounted.current) Alert.alert('Save failed', String(e));
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  async function handleReparse() {
    if (inFlight.current || !mounted.current || !onReparse) return;
    inFlight.current = true;
    setReparsing(true);
    try {
      await onReparse(hint);
    } catch (error) {
      if (mounted.current) Alert.alert('Failed to parse', String(error));
    } finally {
      inFlight.current = false;
      if (mounted.current) setReparsing(false);
    }
  }

  function handleCancel() {
    if (!inFlight.current && mounted.current) onCancel();
  }

  const confidenceColor =
    extraction.confidence === 'low'
      ? 'text-warning'
      : extraction.confidence === 'medium'
        ? 'text-muted-foreground'
        : 'text-success';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-6 gap-4">
      <Text variant="h2">
        {mode === 'manual' ? 'Add meal manually' : mode === 'edit' ? 'Edit meal' : 'Verify meal'}
      </Text>
      <Text variant="muted">
        {mode === 'ai'
          ? 'AI nutrition is an estimate. Check the assumed portions and adjust the numbers for what you ate before saving.'
          : 'Enter the amounts for the portion you ate. Use whole numbers; enter 0 when there is none.'}
      </Text>

      {rawInput ? (
        <Card>
          <Text variant="caption">You said:</Text>
          <Text>{rawInput}</Text>
        </Card>
      ) : null}

      {mode === 'ai' && (
        <View>
          <Text variant="label">
            AI confidence: <Text className={confidenceColor}>{extraction.confidence}</Text>
          </Text>
          <Text variant="label">Assumed portions and notes</Text>
          <Text variant="caption">
            {extraction.notes ||
              'No portion assumptions were provided. Check the amounts before saving.'}
          </Text>
        </View>
      )}

      <View>
        <Text variant="label">Meal name</Text>
        <Input
          value={draft.name}
          editable={!busy}
          onChangeText={(v) => {
            if (!inFlight.current) {
              setDraft((d) => ({ ...d, name: v }));
              setValidationError(null);
            }
          }}
        />
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

      {onReparse && mode === 'ai' ? (
        <View>
          <Text variant="label">Re-parse with hint</Text>
          <Input
            placeholder="e.g., it was 2 servings, not 1"
            value={hint}
            editable={!busy}
            onChangeText={(value) => {
              if (!inFlight.current) setHint(value);
            }}
          />
          <Button variant="outline" className="mt-2" onPress={handleReparse} disabled={busy}>
            {reparsing ? 'Parsing...' : 'Re-parse'}
          </Button>
        </View>
      ) : null}

      {validationError && (
        <Text accessibilityRole="alert" className="text-destructive">
          {validationError}
        </Text>
      )}

      <View className="flex-row gap-3 mt-4">
        <Button variant="outline" className="flex-1" onPress={handleCancel} disabled={busy}>
          Cancel
        </Button>
        <Button className="flex-1" onPress={handleSave} disabled={busy}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </View>
    </ScrollView>
  );
}
