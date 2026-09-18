// app/(auth)/sign-in.tsx
import { View, Alert } from 'react-native';
import { useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AUTH_REDIRECT_URL } from '@/lib/auth/callback';
import { supabase } from '../../lib/supabase/client';
import { Text } from '../../components/ui/text';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [mode, setMode] = useState<'link' | 'password'>('link');

  const requestInFlight = useRef(false);
  const { error: authError, clearError, processingLink } = useAuth();

  async function submit() {
    if (requestInFlight.current || processingLink) return;
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    requestInFlight.current = true;
    setSending(true);
    clearError();
    try {
      const { error } =
        mode === 'link'
          ? await supabase.auth.signInWithOtp({
              email: normalizedEmail,
              options: { emailRedirectTo: AUTH_REDIRECT_URL },
            })
          : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) throw error;
      if (mode === 'link') setSent(true);
    } catch (error) {
      Alert.alert(
        'Sign-in failed',
        error instanceof Error ? error.message : 'Check your connection and try again.',
      );
    } finally {
      requestInFlight.current = false;
      setSending(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-md">
          <Text variant="h1" className="mb-2 text-center">
            NeonPlate
          </Text>
          <Text variant="muted" className="mb-8 text-center">
            {mode === 'link' ? 'Sign in with a magic link' : 'Sign in with email + password'}
          </Text>

          {authError && <Text className="mb-4 text-destructive">{authError}</Text>}
          {processingLink && <Text className="mb-4">Finishing sign-in...</Text>}
          {sent ? (
            <View className="gap-4">
              <Text className="text-center">
                Check your inbox for a sign-in link sent to {email.trim()}. Open it on this device.
              </Text>
              <Button variant="outline" onPress={() => setSent(false)} disabled={processingLink}>
                Use another email or resend
              </Button>
            </View>
          ) : (
            <>
              <Input
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                editable={!sending && !processingLink}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="mb-4"
              />
              {mode === 'password' && (
                <Input
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  editable={!sending && !processingLink}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="mb-4"
                />
              )}
              {mode === 'password' ? (
                <Button
                  onPress={submit}
                  disabled={sending || processingLink || !email || !password}
                >
                  {sending ? 'Signing in...' : 'Sign in'}
                </Button>
              ) : (
                <Button onPress={submit} disabled={sending || processingLink || !email}>
                  {sending ? 'Sending...' : 'Send magic link'}
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={sending || processingLink}
                className="mt-2"
                onPress={() => setMode(mode === 'link' ? 'password' : 'link')}
              >
                {mode === 'link' ? 'Or sign in with password' : 'Or sign in with magic link'}
              </Button>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
