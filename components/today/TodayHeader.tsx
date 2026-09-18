// components/today/TodayHeader.tsx
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../ui/text';
import { Button } from '../ui/button';

export function TodayHeader() {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between p-6">
      <Text variant="h1">Today</Text>
      <Button variant="ghost" onPress={() => router.push('/(app)/settings')}>
        Settings
      </Button>
    </View>
  );
}
