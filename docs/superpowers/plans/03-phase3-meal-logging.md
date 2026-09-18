# Phase 3 — Text Meal Logging

> Historical reference. See [the current personal V1 plan](../../PLAN.md) for authoritative scope, progress, and remaining work.

**Goal:** End-to-end text-based meal logging: type or paste a meal description → AI extracts macros → user verifies/edits → save to daily_logs. Today screen shows live macro progress and today's meal list.

**Exit criteria:** You can log 5+ meals via text on device, see macros update live, edit them from the verification screen, and trust the numbers. Dogfood this for 2-3 days before moving to Phase 4.

---

### Task 1: Create AI config and OpenRouter client

**Files:**
- Create: `lib/ai/config.ts`, `lib/ai/client.ts`

- [ ] **Step 1: Create config**

```typescript
// lib/ai/config.ts
export const AI_CONFIG = {
  // Default model — cheap, fast, reliable JSON output
  model: 'anthropic/claude-3.5-haiku',

  // Temperatures per call type
  tempExtraction: 0.3,
  tempSuggestion: 0.7,

  // Behavior
  maxRetries: 1,
  timeoutMs: 15000,

  // OpenRouter endpoint
  baseUrl: 'https://openrouter.ai/api/v1',
} as const;
```

- [ ] **Step 2: Create OpenRouter client**

```typescript
// lib/ai/client.ts
import { AI_CONFIG } from './config';
import { getOpenRouterKey } from '../auth/secure-storage';

export class AIError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | 'no_key'
      | 'network'
      | 'timeout'
      | 'http_4xx'
      | 'http_5xx'
      | 'invalid_json',
    public readonly raw?: string,
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatParams = {
  messages: ChatMessage[];
  temperature: number;
  responseFormat?: { type: 'json_object' };
};

async function postWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function chat(params: ChatParams): Promise<string> {
  const key = await getOpenRouterKey();
  if (!key) throw new AIError('No OpenRouter API key set', 'no_key');

  let response: Response;
  try {
    response = await postWithTimeout(
      `${AI_CONFIG.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'https://neonplate.local',
          'X-Title': 'NeonPlate',
        },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          messages: params.messages,
          temperature: params.temperature,
          response_format: params.responseFormat,
        }),
      },
      AI_CONFIG.timeoutMs,
    );
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new AIError('Request timed out', 'timeout');
    }
    throw new AIError('Network error', 'network');
  }

  if (response.status >= 500) {
    throw new AIError(`OpenRouter returned ${response.status}`, 'http_5xx');
  }
  if (!response.ok) {
    const text = await response.text();
    throw new AIError(`OpenRouter returned ${response.status}: ${text}`, 'http_4xx', text);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new AIError('OpenRouter returned no content', 'invalid_json', JSON.stringify(json));
  }
  return content;
}

/** Parse JSON with one retry via correction prompt if the first attempt fails. */
export async function chatJson<T>(
  params: ChatParams,
  parse: (raw: string) => T,
): Promise<T> {
  let raw = await chat({ ...params, responseFormat: { type: 'json_object' } });
  try {
    return parse(raw);
  } catch (e) {
    // One correction retry
    const correctionMessages: ChatMessage[] = [
      ...params.messages,
      { role: 'assistant', content: raw },
      {
        role: 'user',
        content: `Your last response could not be parsed. Error: ${String(e)}. Respond with valid JSON only, matching the requested schema exactly.`,
      },
    ];
    raw = await chat({
      ...params,
      messages: correctionMessages,
      responseFormat: { type: 'json_object' },
    });
    try {
      return parse(raw);
    } catch (e2) {
      throw new AIError('AI returned invalid JSON twice', 'invalid_json', raw);
    }
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ai): add OpenRouter client with JSON parsing + retry"
```

---

### Task 2: Define Zod schemas for AI responses

**Files:**
- Create: `lib/ai/schemas.ts`, `tests/unit/ai-schemas.test.ts`

- [ ] **Step 1: Install Zod**

```bash
pnpm add zod
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/unit/ai-schemas.test.ts
import { describe, it, expect } from 'vitest';
import { MealExtractionSchema, SuggestionsSchema } from '../../lib/ai/schemas';

describe('MealExtractionSchema', () => {
  it('accepts a valid meal extraction', () => {
    const valid = {
      name: 'Grilled Chicken Salad',
      calories: 380,
      protein_g: 42,
      carbs_g: 8,
      fat_g: 20,
      confidence: 'medium',
      notes: 'Assumed 1 tbsp olive oil',
    };
    expect(MealExtractionSchema.parse(valid)).toEqual(valid);
  });

  it('coerces floats to integers', () => {
    const input = {
      name: 'X',
      calories: 380.7,
      protein_g: 42.2,
      carbs_g: 8,
      fat_g: 20,
      confidence: 'low',
      notes: '',
    };
    const result = MealExtractionSchema.parse(input);
    expect(result.calories).toBe(381);
    expect(result.protein_g).toBe(42);
  });

  it('rejects invalid confidence values', () => {
    const invalid = {
      name: 'X', calories: 100, protein_g: 5, carbs_g: 10, fat_g: 2,
      confidence: 'certain', notes: '',
    };
    expect(() => MealExtractionSchema.parse(invalid)).toThrow();
  });

  it('rejects negative calories', () => {
    const invalid = {
      name: 'X', calories: -10, protein_g: 5, carbs_g: 10, fat_g: 2,
      confidence: 'low', notes: '',
    };
    expect(() => MealExtractionSchema.parse(invalid)).toThrow();
  });
});

describe('SuggestionsSchema', () => {
  it('accepts exactly 3 suggestions', () => {
    const valid = {
      suggestions: [
        {
          name: 'Banana',
          meal_type: 'snack',
          prep_time_minutes: 0,
          difficulty: 'easy',
          ingredients: [{ name: 'banana', quantity: '1', in_stock: true }],
          missing_ingredients: [],
          instructions: '',
          estimated_calories: 105,
          estimated_protein_g: 1,
          estimated_carbs_g: 27,
          estimated_fat_g: 0,
        },
        {
          name: 'Chicken Wrap',
          meal_type: 'lunch',
          prep_time_minutes: 10,
          difficulty: 'easy',
          ingredients: [
            { name: 'chicken', quantity: '150g', in_stock: true },
            { name: 'tortilla', quantity: '1', in_stock: true },
          ],
          missing_ingredients: [],
          instructions: 'Wrap it.',
          estimated_calories: 420,
          estimated_protein_g: 38,
          estimated_carbs_g: 28,
          estimated_fat_g: 14,
        },
        {
          name: 'Protein Shake',
          meal_type: 'snack',
          prep_time_minutes: 2,
          difficulty: 'easy',
          ingredients: [{ name: 'protein powder', quantity: '1 scoop', in_stock: true }],
          missing_ingredients: [],
          instructions: 'Mix with water.',
          estimated_calories: 120,
          estimated_protein_g: 24,
          estimated_carbs_g: 3,
          estimated_fat_g: 1,
        },
      ],
    };
    expect(SuggestionsSchema.parse(valid).suggestions).toHaveLength(3);
  });

  it('rejects responses with fewer than 3 suggestions', () => {
    expect(() => SuggestionsSchema.parse({ suggestions: [] })).toThrow();
  });

  it('rejects invalid difficulty', () => {
    const invalid = {
      suggestions: [
        {
          name: 'X', meal_type: 'lunch', prep_time_minutes: 5,
          difficulty: 'impossible', ingredients: [], missing_ingredients: [],
          instructions: '', estimated_calories: 100, estimated_protein_g: 5,
          estimated_carbs_g: 10, estimated_fat_g: 2,
        },
      ],
    };
    expect(() => SuggestionsSchema.parse(invalid)).toThrow();
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

```bash
pnpm test tests/unit/ai-schemas.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Implement schemas**

```typescript
// lib/ai/schemas.ts
import { z } from 'zod';

const intFromNumber = z.number().transform((n) => Math.round(n));
const nonNegativeInt = intFromNumber.refine((n) => n >= 0, 'Must be >= 0');

export const MealExtractionSchema = z.object({
  name: z.string().min(1),
  calories: nonNegativeInt,
  protein_g: nonNegativeInt,
  carbs_g: nonNegativeInt,
  fat_g: nonNegativeInt,
  confidence: z.enum(['low', 'medium', 'high']),
  notes: z.string().default(''),
});

export type MealExtraction = z.infer<typeof MealExtractionSchema>;

export const SuggestionSchema = z.object({
  name: z.string().min(1),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  prep_time_minutes: nonNegativeInt,
  difficulty: z.enum(['easy', 'medium', 'hard']),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      in_stock: z.boolean(),
    }),
  ),
  missing_ingredients: z.array(z.string()),
  instructions: z.string(),
  estimated_calories: nonNegativeInt,
  estimated_protein_g: nonNegativeInt,
  estimated_carbs_g: nonNegativeInt,
  estimated_fat_g: nonNegativeInt,
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const SuggestionsSchema = z.object({
  suggestions: z.array(SuggestionSchema).length(3),
});
export type Suggestions = z.infer<typeof SuggestionsSchema>;
```

- [ ] **Step 5: Run tests to verify pass**

```bash
pnpm test tests/unit/ai-schemas.test.ts
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ai): add Zod schemas for extraction and suggestions"
```

---

### Task 3: Write meal extraction prompt builder (TDD)

**Files:**
- Create: `lib/ai/prompts.ts`, `tests/unit/prompts.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/prompts.test.ts
import { describe, it, expect } from 'vitest';
import {
  buildMealExtractionPrompt,
} from '../../lib/ai/prompts';

describe('buildMealExtractionPrompt', () => {
  it('includes the raw user input', () => {
    const result = buildMealExtractionPrompt('grilled chicken with rice');
    const userMsg = result.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain('grilled chicken with rice');
  });

  it('has a system message requiring JSON', () => {
    const result = buildMealExtractionPrompt('x');
    const sys = result.find((m) => m.role === 'system');
    expect(sys).toBeDefined();
    expect(sys!.content.toLowerCase()).toContain('json');
  });

  it('mentions confidence levels in the system prompt', () => {
    const result = buildMealExtractionPrompt('x');
    const sys = result.find((m) => m.role === 'system');
    expect(sys!.content).toContain('confidence');
    expect(sys!.content).toMatch(/low|medium|high/);
  });

  it('instructs integer rounding', () => {
    const result = buildMealExtractionPrompt('x');
    const sys = result.find((m) => m.role === 'system');
    expect(sys!.content.toLowerCase()).toMatch(/integer|round/);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm test tests/unit/prompts.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement prompts**

```typescript
// lib/ai/prompts.ts
import type { ChatMessage } from './client';

const MEAL_EXTRACTION_SYSTEM = `You extract meal information from a user's description.

Estimate macros based on typical portions and preparations.

If the description is ambiguous about quantities, use reasonable defaults and set "confidence": "low". Otherwise use "medium" or "high".

Round all macro values to integers. Never return negative numbers.

Respond with valid JSON matching exactly this schema:
{
  "name": string,
  "calories": integer,
  "protein_g": integer,
  "carbs_g": integer,
  "fat_g": integer,
  "confidence": "low" | "medium" | "high",
  "notes": string
}

In "notes", briefly describe any assumptions you made (e.g., portion size, preparation method). Keep notes under 100 characters.`;

export function buildMealExtractionPrompt(rawInput: string): ChatMessage[] {
  return [
    { role: 'system', content: MEAL_EXTRACTION_SYSTEM },
    { role: 'user', content: rawInput },
  ];
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pnpm test tests/unit/prompts.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ai): add meal extraction prompt builder with tests"
```

---

### Task 4: Wire meal extraction call together

**Files:**
- Create: `lib/ai/calls/extract-meal.ts`

- [ ] **Step 1: Create call**

```typescript
// lib/ai/calls/extract-meal.ts
import { chatJson } from '../client';
import { buildMealExtractionPrompt } from '../prompts';
import { MealExtractionSchema, type MealExtraction } from '../schemas';
import { AI_CONFIG } from '../config';

export async function extractMeal(rawInput: string): Promise<MealExtraction> {
  return chatJson(
    {
      messages: buildMealExtractionPrompt(rawInput),
      temperature: AI_CONFIG.tempExtraction,
    },
    (raw) => {
      const parsed = JSON.parse(raw);
      return MealExtractionSchema.parse(parsed);
    },
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ai): add extractMeal call"
```

---

### Task 5: Add daily logs query helpers

**Files:**
- Modify: `lib/supabase/queries.ts`

- [ ] **Step 1: Add log queries**

Append to `lib/supabase/queries.ts`:

```typescript
export type DailyLog = Database['public']['Tables']['daily_logs']['Row'];
export type DailyLogInsert = Database['public']['Tables']['daily_logs']['Insert'];

export const dailyLogQueries = {
  async listForDay(userId: string, startISO: string, endISO: string): Promise<DailyLog[]> {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', startISO)
      .lte('logged_at', endISO)
      .order('logged_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listAll(userId: string, limit = 100): Promise<DailyLog[]> {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async insert(log: DailyLogInsert): Promise<DailyLog> {
    const { data, error } = await supabase
      .from('daily_logs')
      .insert(log)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, patch: Partial<DailyLogInsert>): Promise<DailyLog> {
    const { data, error } = await supabase
      .from('daily_logs')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('daily_logs').delete().eq('id', id);
    if (error) throw error;
  },
};
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(db): add daily_logs query helpers"
```

---

### Task 6: Build useDailyLogs hook (today's logs with optimistic updates)

**Files:**
- Create: `hooks/use-daily-logs.ts`

- [ ] **Step 1: Create hook**

```typescript
// hooks/use-daily-logs.ts
import { useState, useEffect, useCallback } from 'react';
import { dailyLogQueries, DailyLog, DailyLogInsert } from '../lib/supabase/queries';
import { useAuth } from './use-auth';
import { startOfLocalDay, endOfLocalDay } from '../lib/utils/day-boundary';

export function useDailyLogs(day: Date = new Date()) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await dailyLogQueries.listForDay(
        user.id,
        startOfLocalDay(day).toISOString(),
        endOfLocalDay(day).toISOString(),
      );
      setLogs(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [user, day]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(
    async (insert: Omit<DailyLogInsert, 'user_id'>): Promise<DailyLog> => {
      if (!user) throw new Error('Not signed in');
      const payload: DailyLogInsert = { ...insert, user_id: user.id };
      const temp: DailyLog = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        recipe_id: payload.recipe_id ?? null,
        name: payload.name,
        calories: payload.calories ?? 0,
        protein_g: payload.protein_g ?? 0,
        carbs_g: payload.carbs_g ?? 0,
        fat_g: payload.fat_g ?? 0,
        logged_at: payload.logged_at ?? new Date().toISOString(),
        source: payload.source,
        raw_input: payload.raw_input ?? null,
      };
      setLogs((prev) => [temp, ...prev]);
      try {
        const saved = await dailyLogQueries.insert(payload);
        setLogs((prev) => prev.map((l) => (l.id === temp.id ? saved : l)));
        return saved;
      } catch (e) {
        setLogs((prev) => prev.filter((l) => l.id !== temp.id));
        throw e;
      }
    },
    [user],
  );

  const update = useCallback(async (id: string, patch: Partial<DailyLogInsert>) => {
    const snapshot = logs;
    setLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } as DailyLog : l)),
    );
    try {
      await dailyLogQueries.update(id, patch);
    } catch (e) {
      setLogs(snapshot);
      throw e;
    }
  }, [logs]);

  const remove = useCallback(async (id: string) => {
    const snapshot = logs;
    setLogs((prev) => prev.filter((l) => l.id !== id));
    try {
      await dailyLogQueries.remove(id);
    } catch (e) {
      setLogs(snapshot);
      throw e;
    }
  }, [logs]);

  return { logs, loading, error, add, update, remove, reload };
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add useDailyLogs hook"
```

---

### Task 7: Build MacroProgressBar component

**Files:**
- Create: `components/macros/MacroProgressBar.tsx`

- [ ] **Step 1: Create component**

```typescript
// components/macros/MacroProgressBar.tsx
import { View } from 'react-native';
import { Text } from '../ui/text';
import { percentConsumed } from '../../lib/utils/macros';
import { cn } from '../../lib/utils/cn';

type Props = {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
};

export function MacroProgressBar({ label, consumed, target, unit = '' }: Props) {
  const pct = percentConsumed(consumed, target);
  const over = pct > 100;
  const widthPct = Math.min(pct, 100);

  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text variant="label">{label}</Text>
        <Text variant="muted">
          {consumed}{unit} / {target}{unit}
        </Text>
      </View>
      <View className="h-3 rounded-full bg-muted overflow-hidden">
        <View
          className={cn(
            'h-full rounded-full',
            over ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${widthPct}%` }}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(macros): add MacroProgressBar component"
```

---

### Task 8: Build VerificationScreen component

**Files:**
- Create: `components/logging/VerificationScreen.tsx`

- [ ] **Step 1: Create component**

```typescript
// components/logging/VerificationScreen.tsx
import { View, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { Text } from '../ui/text';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import type { MealExtraction } from '../../lib/ai/schemas';

export type VerificationResult = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type Props = {
  extraction: MealExtraction;
  rawInput?: string;
  onConfirm: (result: VerificationResult) => Promise<void>;
  onReparse?: (hint?: string) => Promise<void>;
  onCancel: () => void;
};

export function VerificationScreen({
  extraction,
  rawInput,
  onConfirm,
  onReparse,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState<VerificationResult>({
    name: extraction.name,
    calories: extraction.calories,
    protein_g: extraction.protein_g,
    carbs_g: extraction.carbs_g,
    fat_g: extraction.fat_g,
  });
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState('');

  function intField(field: keyof Omit<VerificationResult, 'name'>) {
    return {
      value: String(draft[field]),
      onChangeText: (v: string) => {
        const n = parseInt(v, 10);
        setDraft((d) => ({ ...d, [field]: Number.isFinite(n) ? n : 0 }));
      },
      keyboardType: 'number-pad' as const,
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onConfirm(draft);
    } catch (e) {
      Alert.alert('Save failed', String(e));
    } finally {
      setSaving(false);
    }
  }

  const confidenceColor =
    extraction.confidence === 'low'
      ? 'text-warning'
      : extraction.confidence === 'medium'
        ? 'text-muted-foreground'
        : 'text-success';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-6 gap-4">
      <Text variant="h2">Verify meal</Text>

      {rawInput ? (
        <Card>
          <Text variant="caption">You said:</Text>
          <Text>{rawInput}</Text>
        </Card>
      ) : null}

      <View>
        <Text variant="label">Confidence: <Text className={confidenceColor}>{extraction.confidence}</Text></Text>
        {extraction.notes ? <Text variant="caption">{extraction.notes}</Text> : null}
      </View>

      <View>
        <Text variant="label">Meal name</Text>
        <Input
          value={draft.name}
          onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
        />
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text variant="label">Calories</Text>
          <Input {...intField('calories')} />
        </View>
        <View className="flex-1">
          <Text variant="label">Protein (g)</Text>
          <Input {...intField('protein_g')} />
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text variant="label">Carbs (g)</Text>
          <Input {...intField('carbs_g')} />
        </View>
        <View className="flex-1">
          <Text variant="label">Fat (g)</Text>
          <Input {...intField('fat_g')} />
        </View>
      </View>

      {onReparse ? (
        <View>
          <Text variant="label">Re-parse with hint</Text>
          <Input
            placeholder="e.g., it was 2 servings, not 1"
            value={hint}
            onChangeText={setHint}
          />
          <Button
            variant="outline"
            className="mt-2"
            onPress={() => onReparse(hint)}
          >
            Re-parse
          </Button>
        </View>
      ) : null}

      <View className="flex-row gap-3 mt-4">
        <Button variant="outline" className="flex-1" onPress={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1" onPress={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(logging): add VerificationScreen component"
```

---

### Task 9: Build LogMeal modal (text-only for now, voice tab placeholder)

**Files:**
- Create: `app/modals/log-meal.tsx`

- [ ] **Step 1: Create modal screen**

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
  const { add } = useDailyLogs();

  async function handleParse(text: string, hint?: string) {
    const combined = hint ? `${text}\n\nHint from user: ${hint}` : text;
    setParsing(true);
    try {
      const result = await extractMeal(combined);
      setExtraction(result);
      setRawInput(text);
    } catch (e) {
      if (e instanceof AIError) {
        handleAIError(e);
      } else {
        Alert.alert('Failed to parse', String(e));
      }
    } finally {
      setParsing(false);
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
        Alert.alert('AI unavailable', `Check your API key in Settings.\n\n${e.message}`);
        break;
      case 'http_5xx':
        Alert.alert('OpenRouter is having issues', 'Try again in a moment.');
        break;
      case 'invalid_json':
        Alert.alert(
          'AI returned unexpected format',
          'Try rephrasing your meal description.',
        );
        break;
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
      source: 'text',
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
          onReparse={(hint) => handleParse(rawInput, hint)}
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
              onChangeText={setInput}
              multiline
              className="min-h-[120px]"
              style={{ textAlignVertical: 'top', paddingTop: 12 }}
            />
            <Button
              className="mt-4"
              onPress={() => handleParse(input)}
              disabled={parsing || !input.trim()}
            >
              {parsing ? <ActivityIndicator color="white" /> : 'Parse'}
            </Button>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text variant="muted">Voice coming in Phase 4</Text>
          </View>
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

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(logging): add log-meal modal with text input and verification flow"
```

---

### Task 10: Wire Today screen with macro bars, meal list, and log button

**Files:**
- Modify: `app/(app)/today.tsx`
- Modify: `app/_layout.tsx` to register the log-meal modal

- [ ] **Step 1: Register modal in root Stack**

Update `app/_layout.tsx` — change the `<Stack>` component to declare the modal:

```typescript
// app/_layout.tsx
import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/use-auth';
import { View } from 'react-native';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(app)/today');
    }
  }, [session, loading, segments]);

  if (loading) return <View className="flex-1 bg-background" />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen
            name="modals/log-meal"
            options={{ presentation: 'modal' }}
          />
        </Stack>
      </AuthGate>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Update Today screen**

```typescript
// app/(app)/today.tsx
import { View, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { MacroProgressBar } from '../../components/macros/MacroProgressBar';
import { useSettings } from '../../hooks/use-settings';
import { useDailyLogs } from '../../hooks/use-daily-logs';
import { sumMacros } from '../../lib/utils/macros';
import { useBreakpoint } from '../../hooks/use-breakpoint';

function mealTypeFromNow(now: Date = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = now.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 11 && h < 14) return 'lunch';
  if (h >= 17 && h < 21) return 'dinner';
  return 'snack';
}

export default function Today() {
  const router = useRouter();
  const { settings } = useSettings();
  const { logs, remove } = useDailyLogs();
  const { isTablet } = useBreakpoint();
  const consumed = sumMacros(logs);
  const mealType = mealTypeFromNow();

  async function handleDelete(id: string, name: string) {
    Alert.alert(
      'Delete meal?',
      `Remove "${name}" from today's log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try { await remove(id); } catch (e) { Alert.alert('Failed', String(e)); }
          },
        },
      ],
    );
  }

  const Header = (
    <View className="flex-row items-center justify-between p-6">
      <Text variant="h1">Today</Text>
      <Button variant="ghost" onPress={() => router.push('/(app)/settings')}>
        Settings
      </Button>
    </View>
  );

  const Macros = (
    <Card className="m-6 mt-0">
      <Text variant="h3" className="mb-4">Macros</Text>
      <MacroProgressBar
        label="Calories"
        consumed={consumed.calories}
        target={settings.daily_calories}
      />
      <MacroProgressBar
        label="Protein"
        consumed={consumed.protein_g}
        target={settings.daily_protein_g}
        unit="g"
      />
      <MacroProgressBar
        label="Carbs"
        consumed={consumed.carbs_g}
        target={settings.daily_carbs_g}
        unit="g"
      />
      <MacroProgressBar
        label="Fat"
        consumed={consumed.fat_g}
        target={settings.daily_fat_g}
        unit="g"
      />
    </Card>
  );

  const Actions = (
    <View className="flex-row gap-3 px-6 mb-4">
      <Button className="flex-1" onPress={() => router.push('/modals/log-meal')}>
        Log meal
      </Button>
      <Button
        className="flex-1"
        variant="outline"
        onPress={() => router.push('/modals/suggest')}
      >
        Suggest {mealType}
      </Button>
    </View>
  );

  const MealsList = (
    <View className="px-6 pb-6">
      <Text variant="h3" className="mb-2">Today's meals</Text>
      {logs.length === 0 ? (
        <Text variant="muted">No meals logged yet today.</Text>
      ) : (
        logs.map((log) => (
          <Card key={log.id} className="mb-2">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="font-semibold">{log.name}</Text>
                <Text variant="caption">
                  {log.calories} kcal · {log.protein_g}p · {log.carbs_g}c · {log.fat_g}f
                </Text>
              </View>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleDelete(log.id, log.name)}
              >
                Delete
              </Button>
            </View>
          </Card>
        ))
      )}
    </View>
  );

  if (isTablet) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {Header}
        <View className="flex-row flex-1">
          <View className="flex-1">
            {Macros}
            {Actions}
          </View>
          <ScrollView className="flex-1">{MealsList}</ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {Header}
        {Macros}
        {Actions}
        {MealsList}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 4: Manual smoke test**

```bash
pnpm expo start
```

- Sign in on iPhone simulator
- Ensure OpenRouter API key is set in Settings
- Tap "Log meal" → enter "chicken and rice, 200g chicken, 1 cup rice"
- Verify extraction runs, verification screen shows macros
- Edit calories, save
- Meal appears on Today, macro bars update
- Delete the meal, verify macros reset
- Test on iPad simulator, verify two-column layout
- Run `pnpm expo start` with airplane mode → verify network error alert

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire Today screen with macros, meals list, and log flow"
```

---

### Phase 3 Exit Checklist

- [ ] OpenRouter client with timeout, error classification, JSON retry
- [ ] Zod schemas covering meal extraction
- [ ] Prompt builder unit-tested
- [ ] Text logging flow: input → parse → verify → save end-to-end
- [ ] Verification screen editable, shows confidence + notes
- [ ] Today screen: macro bars, meals list, log button
- [ ] Responsive layout working on iPad and iPhone
- [ ] **Dogfood for 2-3 days before Phase 4**
