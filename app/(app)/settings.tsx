// app/(app)/settings.tsx
import { ScrollView, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsForm } from '../../components/settings/SettingsForm';
import { useSettings, UserSettings } from '../../hooks/use-settings';
import { useAuth } from '../../hooks/use-auth';
import { getOpenRouterKey, setOpenRouterKey } from '../../lib/auth/secure-storage';

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
      <ScrollView className="flex-1 p-6">
        <SettingsForm
          draft={draft}
          apiKey={apiKey}
          saving={saving}
          onUpdateField={updateField}
          onApiKeyChange={setApiKey}
          onSave={handleSave}
          onSignOut={signOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
