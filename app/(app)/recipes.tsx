// app/(app)/recipes.tsx
import { View } from 'react-native';
import { Text } from '../../components/ui/text';

export default function Recipes() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text variant="h2">Recipes</Text>
    </View>
  );
}