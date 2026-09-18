// hooks/use-settings.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { useAuth } from './use-auth';

export type UserSettings = {
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
};

const DEFAULT_SETTINGS: UserSettings = {
  daily_calories: 2000,
  daily_protein_g: 150,
  daily_carbs_g: 200,
  daily_fat_g: 65,
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('user_settings')
      .select('daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!error && data) setSettings(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (updates: UserSettings) => {
      if (!user) return;
      // Optimistic update
      setSettings(updates);
      const { error } = await supabase
        .from('user_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) {
        await load(); // revert on failure
        throw error;
      }
    },
    [user, load],
  );

  return { settings, loading, save, reload: load };
}
