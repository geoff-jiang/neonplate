// components/logging/LogMealTabs.tsx
import { View, Pressable } from 'react-native';
import { Text } from '../ui/text';
import { cn } from '../../lib/utils/cn';

type Tab = 'text' | 'voice';

type Props = {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
};

export function LogMealTabs({ activeTab, onChange }: Props) {
  return (
    <View className="flex-row gap-2 mb-4">
      <Pressable
        onPress={() => onChange('text')}
        className={cn(
          'flex-1 py-3 rounded-lg border',
          activeTab === 'text' ? 'bg-primary border-primary' : 'bg-background border-border',
        )}
      >
        <Text
          className={cn(
            'text-center',
            activeTab === 'text' ? 'text-primary-foreground' : 'text-foreground',
          )}
        >
          Text
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('voice')}
        className={cn(
          'flex-1 py-3 rounded-lg border',
          activeTab === 'voice' ? 'bg-primary border-primary' : 'bg-background border-border',
        )}
      >
        <Text
          className={cn(
            'text-center',
            activeTab === 'voice' ? 'text-primary-foreground' : 'text-foreground',
          )}
        >
          Voice
        </Text>
      </Pressable>
    </View>
  );
}
