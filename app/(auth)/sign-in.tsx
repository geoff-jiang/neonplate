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
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSendLink() {
    if (!email) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'neonplate://',
      },
    });
    setSending(false);
    if (error) {
      Alert.alert('Sign-in failed', error.message);
      return;
    }
    setSent(true);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-md">
          <Text variant="h1" className="mb-2 text-center">NeonPlate</Text>
          <Text variant="muted" className="mb-8 text-center">
            Sign in with a magic link
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
              <Button onPress={handleSendLink} disabled={sending || !email}>
                {sending ? 'Sending...' : 'Send magic link'}
              </Button>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}