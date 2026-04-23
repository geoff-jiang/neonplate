// app/(app)/today.tsx
import { View, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { MacroProgressBar } from '../../components/macros/MacroProgressBar';
import { useSettings } from '../../hooks/use-settings';
import { useDailyLogs } from '../../hooks/use-daily-logs';
import { sumMacros } from '../../lib/utils/macros';
import { useBreakpoint } from '../../hooks/use-breakpoint';

function mealTypeFromNow(now: Date = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = now.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 11 && h < 14) return 'lunch';
  if (h >= 17 && h < 21) return 'dinner';
  return 'snack';
}

export default function Today() {
  const router = useRouter();
  const { settings } = useSettings();
  const { logs, remove } = useDailyLogs();
  const { isTablet } = useBreakpoint();
  const consumed = sumMacros(logs);
  const mealType = mealTypeFromNow();

  async function handleDelete(id: string, name: string) {
    Alert.alert(
      'Delete meal?',
      `Remove "${name}" from today's log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try { await remove(id); } catch (e) { Alert.alert('Failed', String(e)); }
          },
        },
      ],
    );
  }

  const Header = (
    <View className="flex-row items-center justify-between p-6">
      <Text variant="h1">Today</Text>
      <Button variant="ghost" onPress={() => router.push('/(app)/settings')}>
        Settings
      </Button>
    </View>
  );

  const Macros = (
    <Card className="m-6 mt-0">
      <Text variant="h3" className="mb-4">Macros</Text>
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

  const Actions = (
    <View className="flex-row gap-3 px-6 mb-4">
      <Button className="flex-1" onPress={() => router.push('/modals/log-meal')}>
        Log meal
      </Button>
      <Button
        className="flex-1"
        variant="outline"
        onPress={() => router.push('/modals/suggest' as any)}
      >
        Suggest {mealType}
      </Button>
    </View>
  );

  const MealsList = (
    <View className="px-6 pb-6">
      <Text variant="h3" className="mb-2">Today's meals</Text>
      {logs.length === 0 ? (
        <Text variant="muted">No meals logged yet today.</Text>
      ) : (
        logs.map((log) => (
          <Card key={log.id} className="mb-2">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="font-semibold">{log.name}</Text>
                <Text variant="caption">
                  {log.calories} kcal · {log.protein_g}p · {log.carbs_g}c · {log.fat_g}f
                </Text>
              </View>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleDelete(log.id, log.name)}
              >
                Delete
              </Button>
            </View>
          </Card>
        ))
      )}
    </View>
  );

  if (isTablet) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {Header}
        <View className="flex-row flex-1">
          <View className="flex-1">
            {Macros}
            {Actions}
          </View>
          <ScrollView className="flex-1">{MealsList}</ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {Header}
        {Macros}
        {Actions}
        {MealsList}
      </ScrollView>
    </SafeAreaView>
  );
}
