import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const { session, loading, processingLink, error, clearError } = useAuth();
  const router = useRouter();
  if (loading || processingLink)
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator accessibilityLabel="Signing in" />
      </View>
    );
  if (!error && session) return <Redirect href="/(app)/today" />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-background px-6">
      <Text>{error ?? 'Open the link from your email to finish signing in.'}</Text>
      <Button
        onPress={() => {
          clearError();
          router.replace(session ? '/(app)/today' : '/(auth)/sign-in');
        }}
      >
        {session ? 'Return to app' : 'Back to sign in'}
      </Button>
    </SafeAreaView>
  );
}
