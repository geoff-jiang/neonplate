import { useCallback } from 'react';
import { settingsQueries, UserSettings } from '../lib/supabase/queries';
import { useAuth } from './use-auth';
import { useUserResource } from './use-user-resource';

export type { UserSettings } from '../lib/supabase/queries';

const DEFAULT_SETTINGS: UserSettings = {
  daily_calories: 2000,
  daily_protein_g: 150,
  daily_carbs_g: 200,
  daily_fat_g: 65,
};

export function useSettings() {
  const { user } = useAuth();
  const {
    data: settings,
    mutate,
    ...state
  } = useUserResource(user?.id, 'settings', '', settingsQueries.get, DEFAULT_SETTINGS);
  const save = useCallback(
    (updates: UserSettings) => mutate((userId) => settingsQueries.save(userId, updates)),
    [mutate],
  );
  return { settings, ...state, save };
}
