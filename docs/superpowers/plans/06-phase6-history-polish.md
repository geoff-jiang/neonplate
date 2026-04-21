# Phase 6 — History + Polish

**Goal:** Build the history tab, fill in any missing error/loading/empty states, refine prompts from real usage, and ship V1.

**Exit criteria:** V1 is dogfoodable without friction. You've been using it daily for a week.

---

### Task 1: Build date-bucketing utility (TDD)

**Files:**
- Create: `tests/unit/history-buckets.test.ts`, `lib/utils/history-buckets.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/history-buckets.test.ts
import { describe, it, expect } from 'vitest';
import { bucketByLocalDay } from '../../lib/utils/history-buckets';
import type { DailyLog } from '../../lib/supabase/queries';

function log(isoDate: string, name: string, calories = 100): DailyLog {
  return {
    id: `${isoDate}-${name}`,
    user_id: 'u',
    recipe_id: null,
    name,
    calories,
    protein_g: 10,
    carbs_g: 10,
    fat_g: 5,
    logged_at: isoDate,
    source: 'text',
    raw_input: null,
  };
}

describe('bucketByLocalDay', () => {
  it('groups logs into per-day buckets', () => {
    // Use local-time constructors so the test is timezone-agnostic
    const d1 = new Date(2026, 3, 20, 12).toISOString();
    const d1b = new Date(2026, 3, 20, 18).toISOString();
    const d2 = new Date(2026, 3, 19, 9).toISOString();

    const buckets = bucketByLocalDay([
      log(d1, 'A'), log(d1b, 'B'), log(d2, 'C'),
    ]);

    expect(buckets).toHaveLength(2);
    // Newest first
    expect(buckets[0].logs.map((l) => l.name)).toEqual(['A', 'B']);
    expect(buckets[1].logs.map((l) => l.name)).toEqual(['C']);
  });

  it('sums totals per bucket', () => {
    const d = new Date(2026, 3, 20, 12).toISOString();
    const buckets = bucketByLocalDay([
      log(d, 'A', 300),
      log(d, 'B', 500),
    ]);
    expect(buckets[0].totals.calories).toBe(800);
  });

  it('returns empty array for empty input', () => {
    expect(bucketByLocalDay([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/unit/history-buckets.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// lib/utils/history-buckets.ts
import type { DailyLog } from '../supabase/queries';
import { startOfLocalDay } from './day-boundary';
import { sumMacros } from './macros';

export type DayBucket = {
  dayKey: string; // YYYY-MM-DD in local time
  dayStart: Date;
  logs: DailyLog[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
};

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function bucketByLocalDay(logs: DailyLog[]): DayBucket[] {
  const map = new Map<string, DailyLog[]>();
  for (const log of logs) {
    const dayStart = startOfLocalDay(new Date(log.logged_at));
    const key = dayKey(dayStart);
    const list = map.get(key) ?? [];
    list.push(log);
    map.set(key, list);
  }

  const buckets: DayBucket[] = [];
  for (const [key, group] of map.entries()) {
    const dayStart = startOfLocalDay(new Date(group[0].logged_at));
    const sorted = [...group].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
    );
    buckets.push({
      dayKey: key,
      dayStart,
      logs: sorted,
      totals: sumMacros(sorted),
    });
  }

  // Newest day first
  buckets.sort((a, b) => b.dayStart.getTime() - a.dayStart.getTime());
  return buckets;
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pnpm test tests/unit/history-buckets.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(history): add day-bucketing utility with tests"
```

---

### Task 2: Add useHistory hook

**Files:**
- Create: `hooks/use-history.ts`

- [ ] **Step 1: Create hook**

```typescript
// hooks/use-history.ts
import { useEffect, useState, useCallback } from 'react';
import { dailyLogQueries } from '../lib/supabase/queries';
import { useAuth } from './use-auth';
import { bucketByLocalDay, DayBucket } from '../lib/utils/history-buckets';

export function useHistory(limit = 200) {
  const { user } = useAuth();
  const [buckets, setBuckets] = useState<DayBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const logs = await dailyLogQueries.listAll(user.id, limit);
      setBuckets(bucketByLocalDay(logs));
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => { reload(); }, [reload]);

  return { buckets, loading, error, reload };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(history): add useHistory hook"
```

---

### Task 3: Build History screen

**Files:**
- Modify: `app/(app)/history.tsx`

- [ ] **Step 1: Replace placeholder**

```typescript
// app/(app)/history.tsx
import { View, ScrollView, Pressable } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/text';
import { Card } from '../../components/ui/card';
import { useHistory } from '../../hooks/use-history';

function formatDayHeader(dayStart: Date, todayKey: string, dayKey: string): string {
  if (todayKey === dayKey) return 'Today';
  const yesterday = new Date(dayStart);
  yesterday.setDate(yesterday.getDate() + 1);
  const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (yKey === todayKey) return 'Yesterday';
  return dayStart.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function History() {
  const { buckets, loading, error } = useHistory();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text variant="muted">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-destructive text-center">
          Couldn't load history.
        </Text>
      </SafeAreaView>
    );
  }

  if (buckets.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text variant="muted" className="text-center">
          Your meal history will appear here once you start logging.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="p-6 gap-3">
        <Text variant="h1" className="mb-2">History</Text>
        {buckets.map((bucket) => {
          const isOpen = expanded[bucket.dayKey] ?? bucket.dayKey === todayKey;
          const header = formatDayHeader(bucket.dayStart, todayKey, bucket.dayKey);
          return (
            <View key={bucket.dayKey}>
              <Pressable
                onPress={() =>
                  setExpanded((prev) => ({ ...prev, [bucket.dayKey]: !isOpen }))
                }
              >
                <Card>
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text variant="h3">{header}</Text>
                      <Text variant="muted">
                        {bucket.totals.calories} kcal · {bucket.totals.protein_g}p · {bucket.totals.carbs_g}c · {bucket.totals.fat_g}f
                      </Text>
                    </View>
                    <Text variant="muted">{isOpen ? '▲' : '▼'}</Text>
                  </View>
                  {isOpen ? (
                    <View className="mt-3 gap-2">
                      {bucket.logs.map((log) => (
                        <View key={log.id} className="border-t border-border pt-2">
                          <Text>{log.name}</Text>
                          <Text variant="caption">
                            {log.calories} kcal · {log.protein_g}p · {log.carbs_g}c · {log.fat_g}f
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            </View>
          );
        })}
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

- Log meals across 2-3 days (change device clock if needed, or just wait)
- Verify days bucket correctly
- Verify "Today" / "Yesterday" / date labels
- Verify collapsed/expanded toggling

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(history): add collapsible day-bucketed history view"
```

---

### Task 4: Add global network error banner

**Files:**
- Create: `hooks/use-network-status.ts`, `components/ui/NetworkBanner.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Install NetInfo**

```bash
pnpm add @react-native-community/netinfo
```

- [ ] **Step 2: Create hook**

```typescript
// hooks/use-network-status.ts
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected && state.isInternetReachable !== false);
    });
    return () => unsub();
  }, []);
  return online;
}
```

- [ ] **Step 3: Create banner**

```typescript
// components/ui/NetworkBanner.tsx
import { View } from 'react-native';
import { Text } from './text';
import { useNetworkStatus } from '../../hooks/use-network-status';
import { SafeAreaView } from 'react-native-safe-area-context';

export function NetworkBanner() {
  const online = useNetworkStatus();
  if (online) return null;
  return (
    <SafeAreaView edges={['top']} className="bg-destructive">
      <View className="px-4 py-2">
        <Text className="text-destructive-foreground text-center">
          No internet connection. Some features may not work.
        </Text>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Mount banner in root layout**

Modify `app/_layout.tsx`:

```typescript
// app/_layout.tsx
import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useAuth } from '../hooks/use-auth';
import { NetworkBanner } from '../components/ui/NetworkBanner';

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
      <NetworkBanner />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="modals/log-meal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="modals/suggest" options={{ presentation: 'modal' }} />
        </Stack>
      </AuthGate>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 5: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 6: Test**

- Turn on airplane mode in simulator; banner appears.
- Turn off airplane mode; banner disappears.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add global offline banner"
```

---

### Task 5: Write README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write README**

```markdown
# NeonPlate

Solo-use tablet-first meal tracking app: inventory management, AI-powered recipe suggestions, and voice/text meal logging with macro verification.

## Stack

- Expo (React Native) + TypeScript + Expo Router
- NativeWind + react-native-reusables for UI
- Supabase (Postgres + Auth + RLS) for data
- OpenRouter (BYOK) for LLM calls
- expo-speech-recognition for voice input

## Development

### Prerequisites

- Node 20+
- pnpm
- Docker Desktop (for local Supabase)
- Supabase CLI: `brew install supabase/tap/supabase`
- Expo CLI: bundled via `pnpm exec expo`

### Setup

```bash
pnpm install
supabase start
cp .env.example .env.local
# Edit .env.local with values from `supabase status`
```

### Running

```bash
# Start local Supabase if not already running
supabase start

# Start Expo dev server
pnpm expo start

# On a physical device (for voice features)
pnpm expo run:ios --device
```

### Testing

```bash
pnpm test              # unit + integration tests (requires supabase start)
pnpm test:watch        # watch mode
pnpm typecheck
pnpm lint
```

### Schema changes

```bash
supabase migration new <name>     # creates a new migration file
# Edit the .sql file
supabase db reset                 # wipes local DB and re-applies migrations
supabase gen types typescript --local > lib/supabase/types.ts
```

### Deploying schema to hosted project

```bash
supabase link --project-ref <ref>
supabase db push
```

## Architecture

See `docs/superpowers/specs/2026-04-20-neonplate-v1-design.md`.

## Roadmap

V2 work tracked in the spec's "V2 Backlog" section. Primary V2 goals:

- Cyberpunk visual redesign + animations
- Preference learning
- Manual recipe entry
- Trend charts

## License

Private. Solo project.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and dev instructions"
```

---

### Task 6: Polish pass — quick audit checklist

This task is less prescriptive — it's an audit you run after dogfooding for a few days.

- [ ] **Step 1: Review error messages for clarity**

Search the codebase for `Alert.alert(`. For each one, verify:
- The title clearly identifies what happened.
- The message tells the user what to do (or at least what went wrong).
- Destructive actions have a Cancel option.

- [ ] **Step 2: Review loading states**

For each screen that fetches data, verify there's a visible loading state (spinner or "Loading..." text). No "blank screen then pop" surprises.

- [ ] **Step 3: Review empty states**

- Today with no logs today: "No meals logged yet"
- Today with no macros set: Settings link prominent
- Inventory empty: "Add your first ingredient"
- Recipes empty: "Try the suggest button"
- History empty: "Your meal history will appear here"

- [ ] **Step 4: Review prompt accuracy**

After ~20 real meal logs, check `daily_logs.raw_input` in Supabase Studio. Find cases where AI got macros wrong. Update `MEAL_EXTRACTION_SYSTEM` in `lib/ai/prompts.ts` with examples that fix the pattern.

- [ ] **Step 5: Commit any prompt tweaks**

```bash
git add -A
git commit -m "fix(ai): refine extraction prompt from real-usage examples"
```

---

### Phase 6 Exit Checklist

- [ ] History tab shows bucketed days with collapsible sections
- [ ] Global offline banner
- [ ] README documents setup, dev, testing, deploy
- [ ] Error, loading, and empty states audited across the app
- [ ] Prompt refined from real usage
- [ ] V1 dogfooded daily for ≥1 week without major friction

---

### V1 Shipped

When this phase is complete:

1. Tag the commit: `git tag v1.0.0`
2. Deploy schema to the hosted Supabase project: `supabase db push`
3. Build a release for your device: `pnpm expo run:ios --device --configuration Release`
4. Move to V2 planning using `brainstorming` on the cyberpunk redesign.
