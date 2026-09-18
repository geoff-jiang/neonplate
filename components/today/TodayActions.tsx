// components/today/TodayActions.tsx
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../ui/button';

export function TodayActions() {
  const router = useRouter();

  return (
    <View className="flex-row gap-3 px-6 mb-4">
      <Button className="flex-1" onPress={() => router.push('/modals/log-meal')}>
        Log meal
      </Button>
    </View>
  );
}
