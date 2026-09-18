// app/(app)/_layout.tsx
import { Tabs } from 'expo-router';
import { colors } from '../../lib/theme';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="inventory" options={{ title: 'Inventory' }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recipes', href: null }} />
      <Tabs.Screen name="history" options={{ title: 'History', href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
