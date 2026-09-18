// app/modals/log-meal.tsx
import { View, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/text';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  VerificationScreen,
  VerificationResult,
} from '../../components/logging/VerificationScreen';
import { VoiceRecorder } from '../../components/logging/VoiceRecorder';
import { extractMeal } from '../../lib/ai/calls/extract-meal';
import { AIError } from '../../lib/ai/client';
import type { MealExtraction } from '../../lib/ai/schemas';
import { useDailyLogs } from '../../hooks/use-daily-logs';
import { cn } from '../../lib/utils/cn';

type Tab = 'text' | 'voice';

export default function LogMeal() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('text');
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [extraction, setExtraction] = useState<MealExtraction | null>(null);
  const [rawInput, setRawInput] = useState('');
  const [source, setSource] = useState<'text' | 'voice'>('text');
  const { add } = useDailyLogs();
  const mounted = useRef(true);
  const inFlight = useRef<'parse' | 'save' | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function dismiss() {
    if (inFlight.current === 'save' || !mounted.current) return;
    mounted.current = false;
    router.back();
  }

  async function handleParse(text: string, tabSource: 'text' | 'voice', hint?: string) {
    if (inFlight.current || !mounted.current) return;
    inFlight.current = 'parse';
    const combined = hint ? `${text}\n\nHint from user: ${hint}` : text;
    setParsing(true);
    try {
      const result = await extractMeal(combined);
      if (!mounted.current) return;
      setExtraction(result);
      setRawInput(text);
      setSource(tabSource);
    } catch (e) {
      if (!mounted.current) return;
      if (e instanceof AIError) handleAIError(e);
      else Alert.alert('Failed to parse', String(e));
    } finally {
      inFlight.current = null;
      if (mounted.current) setParsing(false);
    }
  }

  function handleAIError(e: AIError) {
    switch (e.kind) {
      case 'no_key':
        Alert.alert('API key missing', 'Add your OpenRouter key in Settings.');
        break;
      case 'network':
        Alert.alert('No connection', 'Check your network and try again.');
        break;
      case 'timeout':
        Alert.alert('AI is slow', 'Request timed out. Try again.');
        break;
      case 'http_4xx':
        Alert.alert('AI unavailable', `Check your API key.\n\n${e.message}`);
        break;
      case 'http_5xx':
        Alert.alert('OpenRouter is having issues', 'Try again in a moment.');
        break;
      case 'invalid_json':
        Alert.alert('AI returned unexpected format', 'Try rephrasing your meal.');
        break;
    }
  }

  async function handleConfirm(result: VerificationResult) {
    if (inFlight.current || !mounted.current) return;
    inFlight.current = 'save';
    try {
      await add({
        recipe_id: null,
        name: result.name,
        calories: result.calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        logged_at: new Date().toISOString(),
        source,
        raw_input: rawInput,
      });
      if (mounted.current) {
        mounted.current = false;
        router.back();
      }
    } finally {
      inFlight.current = null;
    }
  }

  if (extraction) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <VerificationScreen
          extraction={extraction}
          rawInput={rawInput}
          onConfirm={handleConfirm}
          onReparse={(hint) => handleParse(rawInput, source, hint)}
          onCancel={() => {
            if (!inFlight.current && mounted.current) setExtraction(null);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-6 flex-1">
        <View className="flex-row justify-between items-center mb-4">
          <Text variant="h2">Log meal</Text>
          <Button variant="ghost" onPress={dismiss}>
            Cancel
          </Button>
        </View>

        <View className="flex-row gap-2 mb-4">
          <Pressable
            disabled={parsing}
            onPress={() => setTab('text')}
            className={cn(
              'flex-1 py-3 rounded-lg border',
              tab === 'text' ? 'bg-primary border-primary' : 'bg-background border-border',
            )}
          >
            <Text
              className={cn(
                'text-center',
                tab === 'text' ? 'text-primary-foreground' : 'text-foreground',
              )}
            >
              Text
            </Text>
          </Pressable>
          <Pressable
            disabled={parsing}
            onPress={() => setTab('voice')}
            className={cn(
              'flex-1 py-3 rounded-lg border',
              tab === 'voice' ? 'bg-primary border-primary' : 'bg-background border-border',
            )}
          >
            <Text
              className={cn(
                'text-center',
                tab === 'voice' ? 'text-primary-foreground' : 'text-foreground',
              )}
            >
              Voice
            </Text>
          </Pressable>
        </View>

        {tab === 'text' ? (
          <View className="flex-1">
            <Input
              placeholder="e.g., grilled chicken salad, 150g chicken, olive oil"
              value={input}
              editable={!parsing}
              onChangeText={setInput}
              multiline
              className="min-h-[120px]"
              style={{ textAlignVertical: 'top', paddingTop: 12 }}
            />
            <Button
              className="mt-4"
              onPress={() => handleParse(input, 'text')}
              disabled={parsing || !input.trim()}
            >
              {parsing ? <ActivityIndicator color="white" /> : 'Parse'}
            </Button>
          </View>
        ) : (
          <VoiceRecorder onParse={(text) => handleParse(text, 'voice')} parsing={parsing} />
        )}
      </View>
    </SafeAreaView>
  );
}
