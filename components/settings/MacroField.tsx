// components/settings/MacroField.tsx
import { View } from 'react-native';
import { Text } from '../ui/text';
import { Input } from '../ui/input';

type Props = {
  label: string;
  value: string;
  editable?: boolean;
  onChange: (value: string) => void;
};

export function MacroField({ label, value, onChange, editable = true }: Props) {
  return (
    <View>
      <Text variant="label">{label}</Text>
      <Input editable={editable} keyboardType="number-pad" value={value} onChangeText={onChange} />
    </View>
  );
}
