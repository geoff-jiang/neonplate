// app/(app)/today.tsx
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TodayHeader } from '../../components/today/TodayHeader';
import { TodayMacros } from '../../components/today/TodayMacros';
import { TodayActions } from '../../components/today/TodayActions';
import { TodayMealsList } from '../../components/today/TodayMealsList';
import { useSettings } from '../../hooks/use-settings';
import { useDailyLogs } from '../../hooks/use-daily-logs';
import { useBreakpoint } from '../../hooks/use-breakpoint';

export default function Today() {
  const { settings } = useSettings();
  const { logs, remove } = useDailyLogs();
  const { isTablet } = useBreakpoint();

  if (isTablet) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <TodayHeader />
        <View className="flex-row flex-1">
          <View className="flex-1">
            <TodayMacros logs={logs} settings={settings} />
            <TodayActions />
          </View>
          <ScrollView className="flex-1">
            <TodayMealsList logs={logs} onRemove={remove} />
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <TodayHeader />
        <TodayMacros logs={logs} settings={settings} />
        <TodayActions />
        <TodayMealsList logs={logs} onRemove={remove} />
      </ScrollView>
    </SafeAreaView>
  );
}
