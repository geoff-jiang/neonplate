import { Stack } from 'expo-router/stack';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

function RootNavigator() {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator accessibilityLabel="Restoring session" />
      </View>
    );
  return (
    <Stack key={session?.user.id ?? 'signed-out'} screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
        <Stack.Screen
          name="modals/log-meal"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="modals/edit-meal"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="index" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
