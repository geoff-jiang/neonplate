# Phase 5 — Recipe Suggestions

**Goal:** Full suggestion loop — AI generates 3 suggestions (recipes, assemblies, or single items) based on inventory + remaining macros + meal type + optional quick-options toggle. "Cook this" saves to recipes table and optionally logs. Recipes tab shows saved library.

**Exit criteria:** You can get 3 suggestions on demand, mark one as cooked, see it in your Recipes tab, and log it to Today. "Quick options only" toggle works. Cook-again from recipes tab works.

---

### Task 1: Build suggestion prompt builder (TDD)

**Files:**
- Modify: `lib/ai/prompts.ts`
- Create: `tests/unit/suggestion-prompt.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/suggestion-prompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildSuggestionPrompt } from '../../lib/ai/prompts';

const baseParams = {
  inventory: ['chicken breast', 'eggs', 'spinach', 'rice'],
  mealType: 'dinner' as const,
  remainingMacros: { calories: 1200, protein_g: 80, carbs_g: 100, fat_g: 40 },
  exclusions: [] as string[],
  quickOptionsOnly: false,
};

describe('buildSuggestionPrompt', () => {
  it('includes all inventory items', () => {
    const msgs = buildSuggestionPrompt(baseParams);
    const combined = msgs.map((m) => m.content).join('\n');
    for (const item of baseParams.inventory) {
      expect(combined).toContain(item);
    }
  });

  it('includes remaining macros', () => {
    const msgs = buildSuggestionPrompt(baseParams);
    const combined = msgs.map((m) => m.content).join('\n');
    expect(combined).toContain('1200');
    expect(combined).toContain('80');
  });

  it('includes meal type', () => {
    const msgs = buildSuggestionPrompt(baseParams);
    const combined = msgs.map((m) => m.content).join('\n');
    expect(combined.toLowerCase()).toContain('dinner');
  });

  it('mentions quick_options_only when true', () => {
    const msgs = buildSuggestionPrompt({ ...baseParams, quickOptionsOnly: true });
    const combined = msgs.map((m) => m.content).join('\n').toLowerCase();
    expect(combined).toMatch(/quick|single item|assembly|under 5/);
  });

  it('includes exclusions when provided', () => {
    const msgs = buildSuggestionPrompt({
      ...baseParams,
      exclusions: ['Chicken Stir Fry', 'Egg Scramble'],
    });
    const combined = msgs.map((m) => m.content).join('\n');
    expect(combined).toContain('Chicken Stir Fry');
    expect(combined).toContain('Egg Scramble');
  });

  it('requires exactly 3 suggestions', () => {
    const msgs = buildSuggestionPrompt(baseParams);
    const combined = msgs.map((m) => m.content).join('\n').toLowerCase();
    expect(combined).toMatch(/exactly 3|3 suggestions/);
  });

  it('allows single items explicitly', () => {
    const msgs = buildSuggestionPrompt(baseParams);
    const combined = msgs.map((m) => m.content).join('\n').toLowerCase();
    expect(combined).toContain('single item');
  });

  it('mentions missing ingredients cap', () => {
    const msgs = buildSuggestionPrompt(baseParams);
    const combined = msgs.map((m) => m.content).join('\n').toLowerCase();
    expect(combined).toMatch(/missing.*2|up to 2/);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm test tests/unit/suggestion-prompt.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add `buildSuggestionPrompt` to prompts.ts**

Append to `lib/ai/prompts.ts`:

```typescript
// Appended to lib/ai/prompts.ts

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type SuggestionParams = {
  inventory: string[];
  mealType: MealType;
  remainingMacros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  exclusions: string[]; // names of suggestions already declined this session
  quickOptionsOnly: boolean;
};

const SUGGESTION_SYSTEM = `You suggest meals based on available ingredients and macro targets.

Suggestions can be:
- Full recipes (cooked meals with ingredients and instructions)
- Simple assemblies (under 5 min prep, e.g., "yogurt + berries + granola")
- Single items from inventory (e.g., "banana", "protein bar")

Rules:
- Use only the provided inventory plus common pantry staples (oil, salt, pepper, garlic, common spices) — staples are always assumed available.
- You MAY suggest a recipe missing up to 2 non-staple ingredients; if so, list those in "missing_ingredients" and mark their "in_stock" as false.
- Rank suggestions to best fit the remaining macro targets.
- Do not repeat anything from the exclusion list.
- For single items: ingredients is an array with ONE entry, instructions is an empty string, prep_time_minutes is 0, difficulty is "easy".
- Propose exactly 3 suggestions, ordered best-fit first.
- Output valid JSON matching the schema.

Schema:
{
  "suggestions": [
    {
      "name": string,
      "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
      "prep_time_minutes": integer,
      "difficulty": "easy" | "medium" | "hard",
      "ingredients": [{ "name": string, "quantity": string, "in_stock": boolean }],
      "missing_ingredients": string[],
      "instructions": string,
      "estimated_calories": integer,
      "estimated_protein_g": integer,
      "estimated_carbs_g": integer,
      "estimated_fat_g": integer
    }
  ]
}`;

export function buildSuggestionPrompt(params: SuggestionParams): ChatMessage[] {
  const { inventory, mealType, remainingMacros, exclusions, quickOptionsOnly } = params;

  const userParts = [
    `Meal type: ${mealType}`,
    `Inventory: ${inventory.length === 0 ? '(empty)' : inventory.join(', ')}`,
    `Remaining macros today: ${remainingMacros.calories} kcal, ${remainingMacros.protein_g}g protein, ${remainingMacros.carbs_g}g carbs, ${remainingMacros.fat_g}g fat`,
  ];

  if (exclusions.length > 0) {
    userParts.push(`Exclusion list (do not suggest): ${exclusions.join(', ')}`);
  }

  if (quickOptionsOnly) {
    userParts.push(
      'Quick options only: strongly prefer single items or assemblies with prep_time_minutes <= 5.',
    );
  }

  userParts.push('Respond with valid JSON only.');

  return [
    { role: 'system', content: SUGGESTION_SYSTEM },
    { role: 'user', content: userParts.join('\n') },
  ];
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pnpm test tests/unit/suggestion-prompt.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ai): add suggestion prompt builder with tests"
```

---

### Task 2: Wire suggest call

**Files:**
- Create: `lib/ai/calls/suggest.ts`

- [ ] **Step 1: Create call**

```typescript
// lib/ai/calls/suggest.ts
import { chatJson } from '../client';
import { buildSuggestionPrompt, SuggestionParams } from '../prompts';
import { SuggestionsSchema, type Suggestions } from '../schemas';
import { AI_CONFIG } from '../config';

export async function suggestRecipes(params: SuggestionParams): Promise<Suggestions> {
  return chatJson(
    {
      messages: buildSuggestionPrompt(params),
      temperature: AI_CONFIG.tempSuggestion,
    },
    (raw) => {
      const parsed = JSON.parse(raw);
      return SuggestionsSchema.parse(parsed);
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
git commit -m "feat(ai): add suggestRecipes call"
```

---

### Task 3: Add recipe query helpers

**Files:**
- Modify: `lib/supabase/queries.ts`

- [ ] **Step 1: Append recipe queries**

Append to `lib/supabase/queries.ts`:

```typescript
export type Recipe = Database['public']['Tables']['recipes']['Row'];
export type RecipeInsert = Database['public']['Tables']['recipes']['Insert'];

export const recipeQueries = {
  async listAll(userId: string): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', userId)
      .order('last_cooked_at', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Recipe | null> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async insert(insert: RecipeInsert): Promise<Recipe> {
    const { data, error } = await supabase
      .from('recipes')
      .insert(insert)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markCooked(id: string): Promise<Recipe> {
    // Fetch current times_cooked, then increment
    const current = await recipeQueries.getById(id);
    if (!current) throw new Error('Recipe not found');
    const { data, error } = await supabase
      .from('recipes')
      .update({
        times_cooked: current.times_cooked + 1,
        last_cooked_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
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
git commit -m "feat(db): add recipe query helpers"
```

---

### Task 4: Build useRecipes hook

**Files:**
- Create: `hooks/use-recipes.ts`

- [ ] **Step 1: Create hook**

```typescript
// hooks/use-recipes.ts
import { useState, useEffect, useCallback } from 'react';
import { recipeQueries, Recipe, RecipeInsert } from '../lib/supabase/queries';
import { useAuth } from './use-auth';

export function useRecipes() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await recipeQueries.listAll(user.id);
      setRecipes(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const saveFromSuggestion = useCallback(
    async (insert: Omit<RecipeInsert, 'user_id' | 'times_cooked' | 'last_cooked_at'>): Promise<Recipe> => {
      if (!user) throw new Error('Not signed in');
      const payload: RecipeInsert = {
        ...insert,
        user_id: user.id,
        times_cooked: 1,
        last_cooked_at: new Date().toISOString(),
      };
      const saved = await recipeQueries.insert(payload);
      setRecipes((prev) => [saved, ...prev]);
      return saved;
    },
    [user],
  );

  const cookAgain = useCallback(async (id: string): Promise<Recipe> => {
    const updated = await recipeQueries.markCooked(id);
    setRecipes((prev) => {
      const others = prev.filter((r) => r.id !== id);
      return [updated, ...others];
    });
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    const snapshot = recipes;
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    try {
      await recipeQueries.remove(id);
    } catch (e) {
      setRecipes(snapshot);
      throw e;
    }
  }, [recipes]);

  return { recipes, loading, error, saveFromSuggestion, cookAgain, remove, reload };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add useRecipes hook"
```

---

### Task 5: Build SuggestionCard component

**Files:**
- Create: `components/recipes/SuggestionCard.tsx`

- [ ] **Step 1: Create component**

```typescript
// components/recipes/SuggestionCard.tsx
import { View } from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import type { Suggestion } from '../../lib/ai/schemas';

type Props = {
  suggestion: Suggestion;
  onCook: () => void;
  onDecline: () => void;
};

export function SuggestionCard({ suggestion, onCook, onDecline }: Props) {
  const isSingleItem =
    suggestion.ingredients.length === 1 && suggestion.prep_time_minutes === 0;

  return (
    <Card className="mb-4">
      <View className="flex-row justify-between items-start mb-2">
        <Text variant="h3" className="flex-1">{suggestion.name}</Text>
        <View className="items-end">
          <Text variant="caption">
            {suggestion.prep_time_minutes === 0 ? 'no prep' : `${suggestion.prep_time_minutes} min`}
          </Text>
          <Text variant="caption">{suggestion.difficulty}</Text>
        </View>
      </View>

      <Text variant="muted" className="mb-3">
        {suggestion.estimated_calories} kcal · {suggestion.estimated_protein_g}p · {suggestion.estimated_carbs_g}c · {suggestion.estimated_fat_g}f
      </Text>

      {!isSingleItem ? (
        <View className="mb-3">
          <Text variant="label" className="mb-1">Ingredients</Text>
          {suggestion.ingredients.map((ing, i) => (
            <Text key={i} className={ing.in_stock ? 'text-foreground' : 'text-warning'}>
              {ing.in_stock ? '✓' : '⚠'} {ing.quantity} {ing.name}
            </Text>
          ))}
          {suggestion.missing_ingredients.length > 0 ? (
            <Text variant="caption" className="text-warning mt-1">
              Missing: {suggestion.missing_ingredients.join(', ')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {suggestion.instructions ? (
        <Text variant="caption" className="mb-3">{suggestion.instructions}</Text>
      ) : null}

      <View className="flex-row gap-2 mt-2">
        <Button variant="outline" className="flex-1" onPress={onDecline}>
          Not this one
        </Button>
        <Button className="flex-1" onPress={onCook}>
          Cook this
        </Button>
      </View>
    </Card>
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
git commit -m "feat(recipes): add SuggestionCard component"
```

---

### Task 6: Build Suggest modal screen

**Files:**
- Create: `app/modals/suggest.tsx`
- Modify: `app/_layout.tsx` to register suggest modal

- [ ] **Step 1: Register modal in root layout**

Modify the Stack in `app/_layout.tsx` — add one more screen:

```typescript
<Stack.Screen
  name="modals/suggest"
  options={{ presentation: 'modal' }}
/>
```

- [ ] **Step 2: Create suggest modal**

```typescript
// app/modals/suggest.tsx
import { View, ScrollView, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import { SuggestionCard } from '../../components/recipes/SuggestionCard';
import {
  VerificationScreen,
  VerificationResult,
} from '../../components/logging/VerificationScreen';
import { useInventory } from '../../hooks/use-inventory';
import { useSettings } from '../../hooks/use-settings';
import { useDailyLogs } from '../../hooks/use-daily-logs';
import { useRecipes } from '../../hooks/use-recipes';
import { useBreakpoint } from '../../hooks/use-breakpoint';
import { sumMacros, remainingMacros } from '../../lib/utils/macros';
import { suggestRecipes } from '../../lib/ai/calls/suggest';
import { AIError } from '../../lib/ai/client';
import type { Suggestion, Suggestions, MealExtraction } from '../../lib/ai/schemas';
import type { MealType } from '../../lib/ai/prompts';
import type { Recipe } from '../../lib/supabase/queries';
import { cn } from '../../lib/utils/cn';

function mealTypeFromNow(now: Date = new Date()): MealType {
  const h = now.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 11 && h < 14) return 'lunch';
  if (h >= 17 && h < 21) return 'dinner';
  return 'snack';
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function Suggest() {
  const router = useRouter();
  const { items: inventory } = useInventory();
  const { settings } = useSettings();
  const { logs, add: addLog } = useDailyLogs();
  const { saveFromSuggestion } = useRecipes();
  const { isTablet } = useBreakpoint();

  const [mealType, setMealType] = useState<MealType>(mealTypeFromNow());
  const [quickOnly, setQuickOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [declined, setDeclined] = useState<string[]>([]);
  const [pendingLog, setPendingLog] = useState<{
    suggestion: Suggestion;
    recipeId: string;
  } | null>(null);

  const consumed = useMemo(() => sumMacros(logs), [logs]);
  const remaining = useMemo(
    () => remainingMacros(
      {
        calories: settings.daily_calories,
        protein_g: settings.daily_protein_g,
        carbs_g: settings.daily_carbs_g,
        fat_g: settings.daily_fat_g,
      },
      consumed,
    ),
    [settings, consumed],
  );

  async function fetchSuggestions(currentExclusions: string[] = declined) {
    if (inventory.length === 0) {
      Alert.alert(
        'Empty inventory',
        'Add some ingredients first and then come back for suggestions.',
      );
      return;
    }
    setLoading(true);
    try {
      const result = await suggestRecipes({
        inventory: inventory.map((i) => i.name),
        mealType,
        remainingMacros: remaining,
        exclusions: currentExclusions,
        quickOptionsOnly: quickOnly,
      });
      setSuggestions(result);
    } catch (e) {
      if (e instanceof AIError) {
        Alert.alert('AI error', aiErrorMessage(e));
      } else {
        Alert.alert('Failed to get suggestions', String(e));
      }
    } finally {
      setLoading(false);
    }
  }

  function aiErrorMessage(e: AIError): string {
    switch (e.kind) {
      case 'no_key': return 'Add your OpenRouter key in Settings.';
      case 'network': return 'No connection. Check your network.';
      case 'timeout': return 'Request timed out. Try again.';
      case 'http_4xx': return `Check your API key. ${e.message}`;
      case 'http_5xx': return 'OpenRouter is having issues. Try again in a moment.';
      case 'invalid_json': return 'AI returned an unexpected response. Try again.';
    }
  }

  async function handleCook(s: Suggestion) {
    try {
      const saved = await saveFromSuggestion({
        name: s.name,
        // ingredients is jsonb — cast via unknown since generated types expect Json
        ingredients: s.ingredients as unknown as Recipe['ingredients'],
        instructions: s.instructions,
        prep_time_minutes: s.prep_time_minutes,
        difficulty: s.difficulty,
        meal_type: s.meal_type,
        estimated_calories: s.estimated_calories,
        estimated_protein_g: s.estimated_protein_g,
        estimated_carbs_g: s.estimated_carbs_g,
        estimated_fat_g: s.estimated_fat_g,
      });
      setPendingLog({ suggestion: s, recipeId: saved.id });
    } catch (e) {
      Alert.alert('Save failed', String(e));
    }
  }

  function handleDecline(name: string) {
    const next = [...declined, name];
    setDeclined(next);
    setSuggestions((prev) =>
      prev ? { suggestions: prev.suggestions.filter((s) => s.name !== name) } : prev,
    );
  }

  async function handleConfirmLog(result: VerificationResult) {
    if (!pendingLog) return;
    await addLog({
      recipe_id: pendingLog.recipeId,
      name: result.name,
      calories: result.calories,
      protein_g: result.protein_g,
      carbs_g: result.carbs_g,
      fat_g: result.fat_g,
      logged_at: new Date().toISOString(),
      source: 'recipe',
      raw_input: null,
    });
    setPendingLog(null);
    router.back();
  }

  // Stage 3: verification screen for pending log
  if (pendingLog) {
    const extraction: MealExtraction = {
      name: pendingLog.suggestion.name,
      calories: pendingLog.suggestion.estimated_calories,
      protein_g: pendingLog.suggestion.estimated_protein_g,
      carbs_g: pendingLog.suggestion.estimated_carbs_g,
      fat_g: pendingLog.suggestion.estimated_fat_g,
      confidence: 'high',
      notes: 'From recipe suggestion — adjust if you ate a different portion.',
    };
    return (
      <SafeAreaView className="flex-1 bg-background">
        <VerificationScreen
          extraction={extraction}
          onConfirm={handleConfirmLog}
          onCancel={() => {
            setPendingLog(null);
            router.back();
          }}
        />
      </SafeAreaView>
    );
  }

  // Stage 2: suggestions display
  if (suggestions) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row justify-between items-center p-6">
          <Text variant="h2">Suggestions</Text>
          <Button variant="ghost" onPress={() => router.back()}>Close</Button>
        </View>
        <ScrollView
          className="flex-1 px-6"
          contentContainerClassName={isTablet ? undefined : 'pb-6'}
        >
          <View className={isTablet ? 'flex-row flex-wrap gap-4 pb-6' : undefined}>
            {suggestions.suggestions.map((s, i) => (
              <View key={`${s.name}-${i}`} className={isTablet ? 'flex-1 min-w-[280px]' : undefined}>
                <SuggestionCard
                  suggestion={s}
                  onCook={() => handleCook(s)}
                  onDecline={() => handleDecline(s.name)}
                />
              </View>
            ))}
          </View>
          {suggestions.suggestions.length === 0 ? (
            <View className="items-center py-6">
              <Text variant="muted" className="mb-4">All suggestions declined.</Text>
              <Button onPress={() => fetchSuggestions()}>Get new suggestions</Button>
            </View>
          ) : (
            <Button
              variant="outline"
              className="mb-6"
              onPress={() => fetchSuggestions()}
              disabled={loading}
            >
              {loading ? <ActivityIndicator /> : 'Shuffle (get different suggestions)'}
            </Button>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Stage 1: configure request
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="p-6 gap-4">
        <View className="flex-row justify-between items-center">
          <Text variant="h2">What should I eat?</Text>
          <Button variant="ghost" onPress={() => router.back()}>Cancel</Button>
        </View>

        <View>
          <Text variant="label" className="mb-2">Meal type</Text>
          <View className="flex-row gap-2 flex-wrap">
            {MEAL_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setMealType(t)}
                className={cn(
                  'px-4 py-2 rounded-full border',
                  mealType === t ? 'bg-primary border-primary' : 'bg-background border-border',
                )}
              >
                <Text className={mealType === t ? 'text-primary-foreground' : 'text-foreground'}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => setQuickOnly((q) => !q)}
          className={cn(
            'flex-row items-center justify-between p-4 rounded-lg border',
            quickOnly ? 'bg-primary border-primary' : 'bg-background border-border',
          )}
        >
          <View className="flex-1">
            <Text className={quickOnly ? 'text-primary-foreground font-medium' : 'text-foreground font-medium'}>
              Quick options only
            </Text>
            <Text
              variant="caption"
              className={quickOnly ? 'text-primary-foreground' : undefined}
            >
              Single items or under-5-min assemblies
            </Text>
          </View>
          <Text className={quickOnly ? 'text-primary-foreground' : 'text-muted-foreground'}>
            {quickOnly ? 'ON' : 'OFF'}
          </Text>
        </Pressable>

        <View className="mt-4">
          <Text variant="label">Remaining today</Text>
          <Text variant="muted">
            {remaining.calories} kcal · {remaining.protein_g}g protein · {remaining.carbs_g}g carbs · {remaining.fat_g}g fat
          </Text>
        </View>

        <Button
          className="mt-4"
          onPress={() => {
            setDeclined([]);
            fetchSuggestions([]);
          }}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : 'Suggest'}
        </Button>
      </ScrollView>
    </SafeAreaView>
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
git commit -m "feat(suggest): add suggest modal with 3-stage flow"
```

---

### Task 7: Build Recipes tab list

**Files:**
- Modify: `app/(app)/recipes.tsx`
- Create: `components/recipes/RecipeCard.tsx`

- [ ] **Step 1: Create RecipeCard**

```typescript
// components/recipes/RecipeCard.tsx
import { View, Pressable } from 'react-native';
import { Text } from '../ui/text';
import { Card } from '../ui/card';
import type { Recipe } from '../../lib/supabase/queries';

type Props = {
  recipe: Recipe;
  onPress: () => void;
};

export function RecipeCard({ recipe, onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      <Card className="mb-3">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text variant="h3">{recipe.name}</Text>
            <Text variant="muted" className="mt-1">
              {recipe.meal_type} · {recipe.prep_time_minutes === 0 ? 'no prep' : `${recipe.prep_time_minutes} min`} · {recipe.difficulty}
            </Text>
            <Text variant="caption" className="mt-1">
              {recipe.estimated_calories} kcal · {recipe.estimated_protein_g}p · {recipe.estimated_carbs_g}c · {recipe.estimated_fat_g}f
            </Text>
            <Text variant="caption" className="mt-1">
              Cooked {recipe.times_cooked}×
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
```

- [ ] **Step 2: Update recipes tab**

```typescript
// app/(app)/recipes.tsx
import { View, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import { RecipeCard } from '../../components/recipes/RecipeCard';
import { useRecipes } from '../../hooks/use-recipes';
import { useBreakpoint } from '../../hooks/use-breakpoint';
import { cn } from '../../lib/utils/cn';
import { Pressable } from 'react-native';

type Sort = 'recent' | 'most_cooked' | 'prep_time';

export default function Recipes() {
  const router = useRouter();
  const { recipes, loading, error } = useRecipes();
  const { isTablet } = useBreakpoint();
  const [sort, setSort] = useState<Sort>('recent');

  const sorted = [...recipes].sort((a, b) => {
    switch (sort) {
      case 'most_cooked':
        return b.times_cooked - a.times_cooked;
      case 'prep_time':
        return a.prep_time_minutes - b.prep_time_minutes;
      case 'recent':
      default: {
        const ad = a.last_cooked_at ? new Date(a.last_cooked_at).getTime() : 0;
        const bd = b.last_cooked_at ? new Date(b.last_cooked_at).getTime() : 0;
        return bd - ad;
      }
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-6">
        <Text variant="h1" className="mb-4">Recipes</Text>

        <View className="flex-row gap-2 mb-4">
          {(['recent', 'most_cooked', 'prep_time'] as Sort[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSort(s)}
              className={cn(
                'px-3 py-2 rounded-full border',
                sort === s ? 'bg-primary border-primary' : 'bg-background border-border',
              )}
            >
              <Text className={sort === s ? 'text-primary-foreground' : 'text-foreground'}>
                {s === 'recent' ? 'Recent' : s === 'most_cooked' ? 'Most cooked' : 'Quickest'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text variant="muted">Loading...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-destructive text-center">
            Couldn't load recipes.
          </Text>
        </View>
      ) : sorted.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text variant="muted" className="text-center mb-4">
            Your saved recipes will appear here.
          </Text>
          <Button onPress={() => router.push('/modals/suggest')}>
            Get suggestions
          </Button>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6">
          <View className={isTablet ? 'flex-row flex-wrap gap-3 pb-6' : 'pb-6'}>
            {sorted.map((r) => (
              <View key={r.id} className={isTablet ? 'flex-1 min-w-[300px]' : undefined}>
                <RecipeCard
                  recipe={r}
                  onPress={() => router.push(`/(app)/recipes/${r.id}`)}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
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
git commit -m "feat(recipes): add recipes list with sort options"
```

---

### Task 8: Build recipe detail screen with cook-again

**Files:**
- Create: `app/(app)/recipes/[id].tsx`

- [ ] **Step 1: Create detail screen**

```typescript
// app/(app)/recipes/[id].tsx
import { View, ScrollView, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../../components/ui/text';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import {
  VerificationScreen,
  VerificationResult,
} from '../../../components/logging/VerificationScreen';
import { recipeQueries, type Recipe } from '../../../lib/supabase/queries';
import { useRecipes } from '../../../hooks/use-recipes';
import { useDailyLogs } from '../../../hooks/use-daily-logs';
import type { MealExtraction } from '../../../lib/ai/schemas';

type Ingredient = { name: string; quantity: string; in_stock?: boolean };

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { cookAgain, remove } = useRecipes();
  const { add: addLog } = useDailyLogs();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    recipeQueries
      .getById(id)
      .then((r) => { setRecipe(r); setLoading(false); })
      .catch((e) => { Alert.alert('Failed', String(e)); setLoading(false); });
  }, [id]);

  async function handleCookAgain() {
    if (!recipe) return;
    try {
      const updated = await cookAgain(recipe.id);
      setRecipe(updated);
      setShowLog(true);
    } catch (e) {
      Alert.alert('Failed', String(e));
    }
  }

  async function handleConfirmLog(result: VerificationResult) {
    if (!recipe) return;
    await addLog({
      recipe_id: recipe.id,
      name: result.name,
      calories: result.calories,
      protein_g: result.protein_g,
      carbs_g: result.carbs_g,
      fat_g: result.fat_g,
      logged_at: new Date().toISOString(),
      source: 'recipe',
      raw_input: null,
    });
    setShowLog(false);
    router.back();
  }

  async function handleDelete() {
    if (!recipe) return;
    Alert.alert('Delete recipe?', `Remove "${recipe.name}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove(recipe.id);
            router.back();
          } catch (e) {
            Alert.alert('Failed', String(e));
          }
        },
      },
    ]);
  }

  if (showLog && recipe) {
    const extraction: MealExtraction = {
      name: recipe.name,
      calories: recipe.estimated_calories,
      protein_g: recipe.estimated_protein_g,
      carbs_g: recipe.estimated_carbs_g,
      fat_g: recipe.estimated_fat_g,
      confidence: 'high',
      notes: 'Adjust if your portion was different.',
    };
    return (
      <SafeAreaView className="flex-1 bg-background">
        <VerificationScreen
          extraction={extraction}
          onConfirm={handleConfirmLog}
          onCancel={() => setShowLog(false)}
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text variant="muted">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text variant="muted">Recipe not found.</Text>
        <Button variant="ghost" onPress={() => router.back()} className="mt-2">
          Back
        </Button>
      </SafeAreaView>
    );
  }

  const ingredients = (recipe.ingredients as unknown as Ingredient[]) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: recipe.name, headerShown: true }} />
      <ScrollView className="flex-1" contentContainerClassName="p-6 gap-4">
        <Text variant="h2">{recipe.name}</Text>
        <Text variant="muted">
          {recipe.meal_type} · {recipe.prep_time_minutes === 0 ? 'no prep' : `${recipe.prep_time_minutes} min`} · {recipe.difficulty}
        </Text>
        <Text variant="muted">
          {recipe.estimated_calories} kcal · {recipe.estimated_protein_g}p · {recipe.estimated_carbs_g}c · {recipe.estimated_fat_g}f
        </Text>
        <Text variant="caption">Cooked {recipe.times_cooked}×</Text>

        {ingredients.length > 0 ? (
          <Card>
            <Text variant="label" className="mb-2">Ingredients</Text>
            {ingredients.map((ing, i) => (
              <Text key={i}>{ing.quantity} {ing.name}</Text>
            ))}
          </Card>
        ) : null}

        {recipe.instructions ? (
          <Card>
            <Text variant="label" className="mb-2">Instructions</Text>
            <Text>{recipe.instructions}</Text>
          </Card>
        ) : null}

        <View className="flex-row gap-3 mt-2">
          <Button variant="outline" className="flex-1" onPress={handleDelete}>
            Delete
          </Button>
          <Button className="flex-1" onPress={handleCookAgain}>
            Cook again
          </Button>
        </View>
      </ScrollView>
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

- Ensure OpenRouter API key is set, inventory has ≥5 items
- On Today, tap "Suggest [meal_type]"
- Toggle meal type, toggle quick-options-only
- Tap Suggest → see 3 cards
- Tap "Not this one" on one → verify it disappears, only 2 cards left
- Tap "Shuffle" → new 3 cards
- Tap "Cook this" on one → saved to recipes → verification screen → save → Today updates
- Go to Recipes tab → see the cooked recipe
- Tap it → detail screen with cook-again
- "Cook again" → verification → save → counter increments

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(recipes): add recipe detail with cook-again flow"
```

---

### Phase 5 Exit Checklist

- [ ] Suggestion prompt builder tested
- [ ] Suggest modal with meal type + quick-options toggle
- [ ] 3 suggestions render as cards (responsive)
- [ ] Decline removes card from session
- [ ] Shuffle re-queries with exclusions
- [ ] Cook this saves recipe and prompts log
- [ ] Recipes tab with sort options
- [ ] Recipe detail with cook-again flow
- [ ] Full core loop works end-to-end
