// app/(app)/today.tsx
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TodayHeader } from '../../components/today/TodayHeader';
import { TodayMacros } from '../../components/today/TodayMacros';
import { TodayActions } from '../../components/today/TodayActions';
import { TodayMealsList } from '../../components/today/TodayMealsList';
import { useSettings } from '../../hooks/use-settings';
import { useDailyLogs } from '../../hooks/use-daily-logs';
import { LoadStatus } from '../../components/ui/load-status';
import { useBreakpoint } from '../../hooks/use-breakpoint';

export default function Today() {
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    reload: reloadSettings,
  } = useSettings();
  const { logs, remove, loading, error, reload } = useDailyLogs();
  const { isTablet } = useBreakpoint();

  const status = (
    <>
      <LoadStatus
        loading={settingsLoading}
        error={settingsError}
        label="Loading targets..."
        onRetry={() => void reloadSettings()}
      />
      <LoadStatus
        loading={loading}
        error={error}
        label="Loading meals..."
        onRetry={() => void reload()}
      />
    </>
  );

  if (isTablet) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <TodayHeader />
        {status}
        <View className="flex-row flex-1">
          <View className="flex-1">
            {!settingsLoading && !settingsError && !loading && !error ? (
              <TodayMacros logs={logs} settings={settings} />
            ) : null}
            <TodayActions />
          </View>
          <ScrollView className="flex-1">
            {logs.length > 0 || (!loading && !error) ? (
              <TodayMealsList logs={logs} onRemove={remove} />
            ) : null}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <TodayHeader />
        {status}
        {!settingsLoading && !settingsError && !loading && !error ? (
          <TodayMacros logs={logs} settings={settings} />
        ) : null}
        <TodayActions />
        {logs.length > 0 || (!loading && !error) ? (
          <TodayMealsList logs={logs} onRemove={remove} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
