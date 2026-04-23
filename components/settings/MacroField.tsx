// components/settings/MacroField.tsx
import { View } from 'react-native';
import { Text } from '../ui/text';
import { Input } from '../ui/input';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function MacroField({ label, value, onChange }: Props) {
  return (
    <View>
      <Text variant="label">{label}</Text>
      <Input keyboardType="number-pad" value={value} onChangeText={onChange} />
    </View>
  );
}
