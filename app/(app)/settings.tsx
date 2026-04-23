// app/(app)/settings.tsx
import { View, ScrollView, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { Text } from '../../components/ui/text';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { MacroField } from '../../components/settings/MacroField';
import { useSettings, UserSettings } from '../../hooks/use-settings';
import { useAuth } from '../../hooks/use-auth';
import { getOpenRouterKey, setOpenRouterKey } from '../../lib/auth/secure-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Settings() {
  const { settings, save } = useSettings();
  const { signOut } = useAuth();
  const [draft, setDraft] = useState<UserSettings>(settings);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    getOpenRouterKey().then((k) => setApiKey(k ?? ''));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await save(draft);
      if (apiKey) await setOpenRouterKey(apiKey);
      Alert.alert('Saved');
    } catch (e) {
      Alert.alert('Save failed', String(e));
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof UserSettings, value: string) {
    const n = parseInt(value, 10);
    setDraft((d) => ({ ...d, [field]: Number.isFinite(n) ? n : 0 }));
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-6" contentContainerClassName="gap-4">
        <Text variant="h2" className="mb-2">
          Daily Macro Targets
        </Text>

        <MacroField
          label="Calories"
          value={String(draft.daily_calories)}
          onChange={(v) => updateField('daily_calories', v)}
        />
        <MacroField
          label="Protein (g)"
          value={String(draft.daily_protein_g)}
          onChange={(v) => updateField('daily_protein_g', v)}
        />
        <MacroField
          label="Carbs (g)"
          value={String(draft.daily_carbs_g)}
          onChange={(v) => updateField('daily_carbs_g', v)}
        />
        <MacroField
          label="Fat (g)"
          value={String(draft.daily_fat_g)}
          onChange={(v) => updateField('daily_fat_g', v)}
        />

        <Text variant="h2" className="mb-2 mt-6">
          OpenRouter API Key
        </Text>
        <Input
          placeholder="sk-or-..."
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text variant="caption">Stored securely on-device only.</Text>

        <Button onPress={handleSave} disabled={saving} className="mt-6">
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button variant="outline" onPress={signOut} className="mt-2">
          Sign out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
