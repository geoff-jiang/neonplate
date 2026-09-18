import { ActivityIndicator, View } from 'react-native';
import { Text } from './text';
import { Button } from './button';

type Props = {
  loading: boolean;
  error?: Error | null;
  label: string;
  onRetry: () => void;
};

export function LoadStatus({ loading, error, label, onRetry }: Props) {
  if (!loading && !error) return null;
  return (
    <View className="px-6 py-3 gap-2" accessibilityLiveRegion="polite">
      {loading ? (
        <View className="flex-row gap-2 items-center">
          <ActivityIndicator />
          <Text variant="muted">{label}</Text>
        </View>
      ) : (
        <>
          <Text className="text-destructive">{error?.message || 'Could not load data.'}</Text>
          <Button variant="outline" onPress={onRetry}>
            Retry
          </Button>
        </>
      )}
    </View>
  );
}
