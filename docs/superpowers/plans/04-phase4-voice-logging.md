# Phase 4 — Voice Logging

**Goal:** Hook voice input into the existing meal logging flow using device-native speech-to-text.

**Exit criteria:** You can tap the mic button on the Voice tab, speak a meal description, see the transcription appear, edit it if needed, and have it flow through the same parse → verify → save pipeline.

---

### Task 1: Install expo-speech-recognition

**Files:**
- Modify: `package.json`, `app.config.ts`

- [ ] **Step 1: Install package**

```bash
pnpm add expo-speech-recognition
```

- [ ] **Step 2: Update app.config.ts with required permissions**

Modify the `plugins` array in `app.config.ts`:

```typescript
plugins: [
  'expo-router',
  'expo-secure-store',
  [
    'expo-speech-recognition',
    {
      microphonePermission: 'NeonPlate needs your microphone to log meals via voice.',
      speechRecognitionPermission: 'NeonPlate uses speech recognition to transcribe your meal descriptions.',
    },
  ],
],
```

Also add iOS usage descriptions explicitly as a fallback:

```typescript
ios: {
  supportsTablet: true,
  bundleIdentifier: 'com.geoffjiang.neonplate',
  infoPlist: {
    NSMicrophoneUsageDescription: 'NeonPlate needs your microphone to log meals via voice.',
    NSSpeechRecognitionUsageDescription: 'NeonPlate uses speech recognition to transcribe meal descriptions.',
  },
},
```

- [ ] **Step 3: Prebuild to apply native config**

```bash
pnpm expo prebuild --clean
```

This generates/updates `ios/` and `android/` native directories. Commit these.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: install expo-speech-recognition with permissions"
```

---

### Task 2: Build VoiceRecorder component

**Files:**
- Create: `components/logging/VoiceRecorder.tsx`, `hooks/use-speech-recognition.ts`

- [ ] **Step 1: Create hook wrapping expo-speech-recognition**

```typescript
// hooks/use-speech-recognition.ts
import { useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export type SpeechState = 'idle' | 'listening' | 'error';

export function useSpeechRecognition() {
  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const interimRef = useRef('');

  useSpeechRecognitionEvent('start', () => {
    setState('listening');
    setError(null);
    interimRef.current = '';
  });

  useSpeechRecognitionEvent('end', () => {
    setState('idle');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const latest = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      setTranscript((prev) => (prev ? `${prev} ${latest}`.trim() : latest));
      interimRef.current = '';
    } else {
      interimRef.current = latest;
      setTranscript((prev) => {
        const base = prev.endsWith(interimRef.current) ? prev : prev;
        return base;
      });
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setState('error');
    setError(event.message ?? 'Unknown speech recognition error');
  });

  async function start() {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError('Microphone or speech recognition permission denied.');
      setState('error');
      return;
    }
    setTranscript('');
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
    });
  }

  function stop() {
    ExpoSpeechRecognitionModule.stop();
  }

  function reset() {
    setTranscript('');
    setError(null);
    setState('idle');
  }

  return {
    state,
    transcript,
    setTranscript,
    error,
    start,
    stop,
    reset,
  };
}
```

- [ ] **Step 2: Create VoiceRecorder component**

```typescript
// components/logging/VoiceRecorder.tsx
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '../ui/text';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useSpeechRecognition } from '../../hooks/use-speech-recognition';
import { cn } from '../../lib/utils/cn';

type Props = {
  onParse: (text: string) => void;
  parsing: boolean;
};

export function VoiceRecorder({ onParse, parsing }: Props) {
  const { state, transcript, setTranscript, error, start, stop } =
    useSpeechRecognition();

  const listening = state === 'listening';

  return (
    <View className="flex-1">
      <View className="items-center mb-6">
        <Pressable
          onPress={listening ? stop : start}
          className={cn(
            'w-24 h-24 rounded-full items-center justify-center',
            listening ? 'bg-destructive' : 'bg-primary',
          )}
        >
          <Text className="text-primary-foreground text-3xl">
            {listening ? '■' : '●'}
          </Text>
        </Pressable>
        <Text variant="muted" className="mt-3">
          {listening ? 'Listening... tap to stop' : 'Tap to start recording'}
        </Text>
      </View>

      {error ? (
        <Text className="text-destructive mb-3">{error}</Text>
      ) : null}

      <Text variant="label" className="mb-2">Transcription (editable)</Text>
      <Input
        value={transcript}
        onChangeText={setTranscript}
        multiline
        className="min-h-[120px]"
        style={{ textAlignVertical: 'top', paddingTop: 12 }}
        placeholder={listening ? 'Keep speaking...' : 'Your transcription will appear here'}
      />

      <Button
        className="mt-4"
        onPress={() => onParse(transcript)}
        disabled={parsing || !transcript.trim() || listening}
      >
        {parsing ? <ActivityIndicator color="white" /> : 'Parse'}
      </Button>
    </View>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(logging): add VoiceRecorder with speech recognition"
```

---

### Task 3: Wire VoiceRecorder into LogMeal modal

**Files:**
- Modify: `app/modals/log-meal.tsx`

- [ ] **Step 1: Update LogMeal modal**

Replace the voice tab placeholder with the real component. The full file becomes:

```typescript
// app/modals/log-meal.tsx
import { View, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useState } from 'react';
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

  async function handleParse(text: string, tabSource: 'text' | 'voice', hint?: string) {
    const combined = hint ? `${text}\n\nHint from user: ${hint}` : text;
    setParsing(true);
    try {
      const result = await extractMeal(combined);
      setExtraction(result);
      setRawInput(text);
      setSource(tabSource);
    } catch (e) {
      if (e instanceof AIError) handleAIError(e);
      else Alert.alert('Failed to parse', String(e));
    } finally {
      setParsing(false);
    }
  }

  function handleAIError(e: AIError) {
    switch (e.kind) {
      case 'no_key':
        Alert.alert('API key missing', 'Add your OpenRouter key in Settings.'); break;
      case 'network':
        Alert.alert('No connection', 'Check your network and try again.'); break;
      case 'timeout':
        Alert.alert('AI is slow', 'Request timed out. Try again.'); break;
      case 'http_4xx':
        Alert.alert('AI unavailable', `Check your API key.\n\n${e.message}`); break;
      case 'http_5xx':
        Alert.alert('OpenRouter is having issues', 'Try again in a moment.'); break;
      case 'invalid_json':
        Alert.alert('AI returned unexpected format', 'Try rephrasing your meal.'); break;
    }
  }

  async function handleConfirm(result: VerificationResult) {
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
    router.back();
  }

  if (extraction) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <VerificationScreen
          extraction={extraction}
          rawInput={rawInput}
          onConfirm={handleConfirm}
          onReparse={(hint) => handleParse(rawInput, source, hint)}
          onCancel={() => setExtraction(null)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-6 flex-1">
        <View className="flex-row justify-between items-center mb-4">
          <Text variant="h2">Log meal</Text>
          <Button variant="ghost" onPress={() => router.back()}>Cancel</Button>
        </View>

        <View className="flex-row gap-2 mb-4">
          <Pressable
            onPress={() => setTab('text')}
            className={cn(
              'flex-1 py-3 rounded-lg border',
              tab === 'text' ? 'bg-primary border-primary' : 'bg-background border-border',
            )}
          >
            <Text className={cn('text-center', tab === 'text' ? 'text-primary-foreground' : 'text-foreground')}>
              Text
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('voice')}
            className={cn(
              'flex-1 py-3 rounded-lg border',
              tab === 'voice' ? 'bg-primary border-primary' : 'bg-background border-border',
            )}
          >
            <Text className={cn('text-center', tab === 'voice' ? 'text-primary-foreground' : 'text-foreground')}>
              Voice
            </Text>
          </Pressable>
        </View>

        {tab === 'text' ? (
          <View className="flex-1">
            <Input
              placeholder="e.g., grilled chicken salad, 150g chicken, olive oil"
              value={input}
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
          <VoiceRecorder
            onParse={(text) => handleParse(text, 'voice')}
            parsing={parsing}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Manual smoke test**

```bash
pnpm expo start
```

**Important:** Voice features require a real device or a properly configured simulator. Preferably test on a physical iPad or iPhone:

```bash
pnpm expo run:ios --device
```

Then:
- Open Log Meal → Voice tab
- Tap record button, grant mic + speech recognition permission
- Say "grilled chicken breast, 200 grams, with rice and broccoli"
- Stop recording, confirm transcript looks right, edit if needed
- Parse → verification screen shows extracted macros
- Save

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(logging): wire VoiceRecorder into LogMeal modal"
```

---

### Phase 4 Exit Checklist

- [ ] expo-speech-recognition installed with permissions
- [ ] Voice tab records, transcribes, and pipes into parse flow
- [ ] Transcript is editable before parsing
- [ ] Source field correctly set to 'voice' on save
- [ ] Tested on physical device
