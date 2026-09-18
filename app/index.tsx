// app/index.tsx
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';

export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? '/(app)/today' : '/(auth)/sign-in'} />;
}
