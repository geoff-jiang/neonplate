// app/(auth)/sign-in.tsx
import { View, Alert } from 'react-native';
import { useState } from 'react';
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

  async function handleSendLink() {
    if (!email) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'neonplate://' },
    });
    setSending(false);
    if (error) {
      Alert.alert('Sign-in failed', error.message);
      return;
    }
    setSent(true);
  }

  async function handlePasswordSignIn() {
    if (!email || !password) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSending(false);
    if (error) {
      Alert.alert('Sign-in failed', error.message);
      return;
    }
    // Auth gate will redirect to app on session change
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-md">
          <Text variant="h1" className="mb-2 text-center">NeonPlate</Text>
          <Text variant="muted" className="mb-8 text-center">
            {mode === 'link'
              ? 'Sign in with a magic link'
              : 'Sign in with email + password'}
          </Text>

          {sent ? (
            <Text className="text-center">
              Check your inbox for a sign-in link sent to {email}.
            </Text>
          ) : (
            <>
              <Input
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
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
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="mb-4"
                />
              )}
              {mode === 'password' ? (
                <Button
                  onPress={handlePasswordSignIn}
                  disabled={sending || !email || !password}
                >
                  {sending ? 'Signing in...' : 'Sign in'}
                </Button>
              ) : (
                <Button onPress={handleSendLink} disabled={sending || !email}>
                  {sending ? 'Sending...' : 'Send magic link'}
                </Button>
              )}
              <Button
                variant="ghost"
                className="mt-2"
                onPress={() => setMode(mode === 'link' ? 'password' : 'link')}
              >
                {mode === 'link'
                  ? 'Or sign in with password'
                  : 'Or sign in with magic link'}
              </Button>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
