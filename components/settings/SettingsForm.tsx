// components/settings/SettingsForm.tsx
import { View } from 'react-native';
import { Text } from '../ui/text';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { MacroField } from './MacroField';
import type { TargetDraft } from '../../lib/utils/meal-validation';

type Props = {
  draft: TargetDraft;
  apiKey: string;
  saving: boolean;
  disabled?: boolean;
  validationError?: string | null;
  onUpdateField: (field: keyof TargetDraft, value: string) => void;
  onApiKeyChange: (value: string) => void;
  onSave: () => void;
  onSignOut: () => void;
};

export function SettingsForm({
  draft,
  apiKey,
  saving,
  disabled = false,
  validationError,
  onUpdateField,
  onApiKeyChange,
  onSave,
  onSignOut,
}: Props) {
  return (
    <View className="gap-4">
      <Text variant="h2" className="mb-2">
        Daily Macro Targets
      </Text>

      <MacroField
        editable={!saving && !disabled}
        label="Calories"
        value={String(draft.daily_calories)}
        onChange={(v) => onUpdateField('daily_calories', v)}
      />
      <MacroField
        editable={!saving && !disabled}
        label="Protein (g)"
        value={String(draft.daily_protein_g)}
        onChange={(v) => onUpdateField('daily_protein_g', v)}
      />
      <MacroField
        editable={!saving && !disabled}
        label="Carbs (g)"
        value={String(draft.daily_carbs_g)}
        onChange={(v) => onUpdateField('daily_carbs_g', v)}
      />
      <MacroField
        editable={!saving && !disabled}
        label="Fat (g)"
        value={String(draft.daily_fat_g)}
        onChange={(v) => onUpdateField('daily_fat_g', v)}
      />

      <Text variant="h2" className="mb-2 mt-6">
        OpenRouter API Key
      </Text>
      <Input
        editable={!saving && !disabled}
        placeholder="sk-or-..."
        value={apiKey}
        onChangeText={onApiKeyChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text variant="caption">Stored securely on-device only.</Text>

      {validationError && (
        <Text accessibilityRole="alert" className="text-destructive">
          {validationError}
        </Text>
      )}

      <Button onPress={onSave} disabled={saving || disabled} className="mt-6">
        {saving ? 'Saving...' : 'Save'}
      </Button>
      <Button variant="outline" onPress={onSignOut} disabled={saving} className="mt-2">
        Sign out
      </Button>
    </View>
  );
}
