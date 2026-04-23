// components/logging/LogMealTextInput.tsx
import { ActivityIndicator, View } from 'react-native';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onParse: () => void;
  parsing: boolean;
};

export function LogMealTextInput({ value, onChange, onParse, parsing }: Props) {
  return (
    <View className="flex-1 min-h-0">
      <Input
        placeholder="e.g., grilled chicken salad, 150g chicken, olive oil"
        value={value}
        onChangeText={onChange}
        multiline
        className="min-h-[120px] flex-1"
        style={{ textAlignVertical: 'top', paddingTop: 12 }}
      />
      <Button className="mt-4 shrink-0" onPress={onParse} disabled={parsing || !value.trim()}>
        {parsing ? <ActivityIndicator color="white" /> : 'Parse'}
      </Button>
    </View>
  );
}
