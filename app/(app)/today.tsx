// app/(app)/today.tsx
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Today() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between p-6">
        <Text variant="h1">Today</Text>
        <Button variant="ghost" onPress={() => router.push('/(app)/settings' as any)}>
          Settings
        </Button>
      </View>
    </SafeAreaView>
  );
}