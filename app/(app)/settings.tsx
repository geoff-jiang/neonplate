import { ScrollView, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsForm } from '../../components/settings/SettingsForm';
import { LoadStatus } from '../../components/ui/load-status';
import { useSettings, UserSettings } from '../../hooks/use-settings';
import { useAuth } from '../../hooks/use-auth';
import { getOpenRouterKey, setOpenRouterKey } from '../../lib/auth/secure-storage';

export default function Settings() {
  const { settings, save, loading, error, reload } = useSettings();
  const { signOut } = useAuth();
  const [draft, setDraft] = useState<UserSettings>(settings);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyLoading, setKeyLoading] = useState(true);
  const [keyAttempt, setKeyAttempt] = useState(0);
  const [keyError, setKeyError] = useState<Error | null>(null);
  const dirty = useRef(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (!dirty.current) setDraft(settings);
  }, [settings]);

  useEffect(() => {
    let active = true;
    setKeyLoading(true);
    setKeyError(null);
    getOpenRouterKey()
      .then((key) => {
        if (active) setApiKey(key ?? '');
      })
      .catch(() => {
        if (active) setKeyError(new Error('Could not read your saved API key. Please retry.'));
      })
      .finally(() => {
        if (active) setKeyLoading(false);
      });
    return () => {
      active = false;
    };
  }, [keyAttempt]);

  async function handleSave() {
    if (submitting.current || loading || keyLoading || error || keyError) return;
    submitting.current = true;
    setSaving(true);
    try {
      if (apiKey) await setOpenRouterKey(apiKey);
      await save(draft);
      dirty.current = false;
      Alert.alert('Saved');
    } catch (cause) {
      Alert.alert('Save failed', cause instanceof Error ? cause.message : String(cause));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  async function handleSignOut() {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    try {
      await signOut();
    } catch (cause) {
      Alert.alert('Sign-out failed', cause instanceof Error ? cause.message : String(cause));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  function updateField(field: keyof UserSettings, value: string) {
    dirty.current = true;
    const n = parseInt(value, 10);
    setDraft((previous) => ({ ...previous, [field]: Number.isFinite(n) ? n : 0 }));
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-6">
        <LoadStatus
          loading={loading || keyLoading}
          error={error || keyError}
          label="Loading settings..."
          onRetry={() => {
            if (keyError) setKeyAttempt((attempt) => attempt + 1);
            void reload();
          }}
        />
        <SettingsForm
          draft={draft}
          apiKey={apiKey}
          saving={saving}
          disabled={loading || keyLoading || !!error || !!keyError}
          onUpdateField={updateField}
          onApiKeyChange={setApiKey}
          onSave={handleSave}
          onSignOut={handleSignOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
