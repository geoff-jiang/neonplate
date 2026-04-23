// components/logging/LogMealHeader.tsx
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../ui/text';
import { Button } from '../ui/button';

export function LogMealHeader() {
  const router = useRouter();

  return (
    <View className="mb-4 flex-row items-center justify-between shrink-0">
      <Text variant="h2">Log meal</Text>
      <Button variant="ghost" onPress={() => router.back()}>
        Cancel
      </Button>
    </View>
  );
}
