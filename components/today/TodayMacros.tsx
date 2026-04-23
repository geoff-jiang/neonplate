// components/today/TodayMacros.tsx
import { View } from 'react-native';
import { Card } from '../ui/card';
import { Text } from '../ui/text';
import { MacroProgressBar } from '../macros/MacroProgressBar';
import type { DailyLog } from '../../lib/supabase/queries';
import type { UserSettings } from '../../hooks/use-settings';
import { sumMacros } from '../../lib/utils/macros';

type Props = {
  logs: DailyLog[];
  settings: UserSettings;
};

export function TodayMacros({ logs, settings }: Props) {
  const consumed = sumMacros(logs);

  return (
    <Card className="m-6 mt-0">
      <Text variant="h3" className="mb-4">
        Macros
      </Text>
      <MacroProgressBar
        label="Calories"
        consumed={consumed.calories}
        target={settings.daily_calories}
      />
      <MacroProgressBar
        label="Protein"
        consumed={consumed.protein_g}
        target={settings.daily_protein_g}
        unit="g"
      />
      <MacroProgressBar
        label="Carbs"
        consumed={consumed.carbs_g}
        target={settings.daily_carbs_g}
        unit="g"
      />
      <MacroProgressBar
        label="Fat"
        consumed={consumed.fat_g}
        target={settings.daily_fat_g}
        unit="g"
      />
    </Card>
  );
}
