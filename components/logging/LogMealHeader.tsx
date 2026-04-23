// components/logging/LogMealHeader.tsx
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../ui/text';
import { Button } from '../ui/button';

export function LogMealHeader() {
  const router = useRouter();

  return (
    <View className="flex-row justify-between items-center mb-4">
      <Text variant="h2">Log meal</Text>
      <Button variant="ghost" onPress={() => router.back()}>
        Cancel
      </Button>
    </View>
  );
}
