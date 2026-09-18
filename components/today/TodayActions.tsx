// components/today/TodayActions.tsx
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../ui/button';

function mealTypeFromNow(now: Date = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = now.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 11 && h < 14) return 'lunch';
  if (h >= 17 && h < 21) return 'dinner';
  return 'snack';
}

export function TodayActions() {
  const router = useRouter();
  const mealType = mealTypeFromNow();

  return (
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
}
