// components/today/MealItem.tsx
import { View } from 'react-native';
import { Card } from '../ui/card';
import { Text } from '../ui/text';
import { Button } from '../ui/button';

type Props = {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  onDelete: (id: string, name: string) => void;
};

export function MealItem({ id, name, calories, protein_g, carbs_g, fat_g, onDelete }: Props) {
  return (
    <Card className="mb-2">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="font-semibold">{name}</Text>
          <Text variant="caption">
            {calories} kcal · {protein_g}p · {carbs_g}c · {fat_g}f
          </Text>
        </View>
        <Button variant="ghost" size="sm" onPress={() => onDelete(id, name)}>
          Delete
        </Button>
      </View>
    </Card>
  );
}
