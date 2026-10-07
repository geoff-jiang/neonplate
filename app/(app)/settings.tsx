import { ScrollView, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsForm } from '../../components/settings/SettingsForm';
import { LoadStatus } from '../../components/ui/load-status';
import { useSettings } from '../../hooks/use-settings';
import { useAuth } from '../../hooks/use-auth';
import {
  targetsToDraft,
  parseTargetDraft,
  type TargetDraft,
} from '../../lib/utils/meal-validation';
import { getOpenRouterKey, setOpenRouterKey } from '../../lib/auth/secure-storage';

export default function Settings() {
  const { settings, save, loading, error, reload } = useSettings();
  const { signOut } = useAuth();
  const [draft, setDraft] = useState(() => targetsToDraft(settings));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyLoading, setKeyLoading] = useState(true);
  const [keyAttempt, setKeyAttempt] = useState(0);
  const [keyError, setKeyError] = useState<Error | null>(null);
  const dirty = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const submitting = useRef(false);

  useEffect(() => {
    if (!dirty.current) setDraft(targetsToDraft(settings));
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
    let values;
    try {
      values = parseTargetDraft(draft);
    } catch (cause) {
      setValidationError(cause instanceof Error ? cause.message : 'Check your daily targets.');
      return;
    }
    setValidationError(null);
    submitting.current = true;
    setSaving(true);
    try {
      if (apiKey) await setOpenRouterKey(apiKey);
      await save(values);
      dirty.current = false;
      if (mounted.current) Alert.alert('Saved');
    } catch (cause) {
      if (mounted.current)
        Alert.alert('Save failed', cause instanceof Error ? cause.message : String(cause));
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  async function handleSignOut() {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    try {
      await signOut();
    } catch (cause) {
      if (mounted.current)
        Alert.alert('Sign-out failed', cause instanceof Error ? cause.message : String(cause));
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  function updateField(field: keyof TargetDraft, value: string) {
    if (submitting.current) return;
    dirty.current = true;
    setValidationError(null);
    setDraft((previous) => ({ ...previous, [field]: value }));
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
          validationError={validationError}
          apiKey={apiKey}
          saving={saving}
          disabled={loading || keyLoading || !!error || !!keyError}
          onUpdateField={updateField}
          onApiKeyChange={(value) => {
            if (!submitting.current) setApiKey(value);
          }}
          onSave={handleSave}
          onSignOut={handleSignOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
