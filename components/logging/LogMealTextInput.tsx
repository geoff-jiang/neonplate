// components/logging/LogMealTextInput.tsx
import { View, ActivityIndicator } from 'react-native';
import { Text } from '../ui/text';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onParse: () => void;
  parsing: boolean;
};

export function LogMealTextInput({ value, onChange, onParse, parsing }: Props) {
  return (
    <View className="flex-1">
      <Input
        placeholder="e.g., grilled chicken salad, 150g chicken, olive oil"
        value={value}
        onChangeText={onChange}
        multiline
        className="min-h-[120px]"
        style={{ textAlignVertical: 'top', paddingTop: 12 }}
      />
      <Button className="mt-4" onPress={onParse} disabled={parsing || !value.trim()}>
        {parsing ? <ActivityIndicator color="white" /> : 'Parse'}
      </Button>
    </View>
  );
}
