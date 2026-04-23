// components/macros/MacroProgressBar.tsx
import { View } from 'react-native';
import { Text } from '../ui/text';
import { percentConsumed } from '../../lib/utils/macros';
import { cn } from '../../lib/utils/cn';

type Props = {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
};

export function MacroProgressBar({ label, consumed, target, unit = '' }: Props) {
  const pct = percentConsumed(consumed, target);
  const over = pct > 100;
  const widthPct = Math.min(pct, 100);

  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text variant="label">{label}</Text>
        <Text variant="muted">
          {consumed}{unit} / {target}{unit}
        </Text>
      </View>
      <View className="h-3 rounded-full bg-muted overflow-hidden">
        <View
          className={cn(
            'h-full rounded-full',
            over ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${widthPct}%` }}
        />
      </View>
    </View>
  );
}
