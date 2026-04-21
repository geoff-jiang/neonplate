# Phase 2 — Inventory

**Goal:** Fully functional inventory management: add items with categories, view grouped list, delete, responsive layout (grid on tablet, list on phone).

**Exit criteria:** You can add, view, and delete inventory items on both iPad and iPhone simulators. Items persist across app restarts.

---

### Task 1: Write inventory query helpers (pure functions, no tests needed yet — thin wrappers)

**Files:**
- Create: `lib/supabase/queries.ts`

- [ ] **Step 1: Create queries module**

```typescript
// lib/supabase/queries.ts
import { supabase } from './client';
import type { Database } from './types';

export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
export type InventoryInsert = Database['public']['Tables']['inventory_items']['Insert'];

export const inventoryQueries = {
  async listAll(userId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async add(userId: string, name: string, category: string | null): Promise<InventoryItem> {
    const insert: InventoryInsert = {
      user_id: userId,
      name: name.trim(),
      category,
    };
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(insert)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) throw error;
  },
};
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(db): add inventory query helpers"
```

---

### Task 2: Build useInventory hook with optimistic updates

**Files:**
- Create: `hooks/use-inventory.ts`

- [ ] **Step 1: Create hook**

```typescript
// hooks/use-inventory.ts
import { useState, useEffect, useCallback } from 'react';
import { inventoryQueries, InventoryItem } from '../lib/supabase/queries';
import { useAuth } from './use-auth';

export function useInventory() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await inventoryQueries.listAll(user.id);
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(
    async (name: string, category: string | null) => {
      if (!user) return;
      const temp: InventoryItem = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        name: name.trim(),
        category,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, temp].sort((a, b) => a.name.localeCompare(b.name)));
      try {
        const saved = await inventoryQueries.add(user.id, name, category);
        setItems((prev) =>
          prev
            .map((i) => (i.id === temp.id ? saved : i))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch (e) {
        setItems((prev) => prev.filter((i) => i.id !== temp.id));
        throw e;
      }
    },
    [user],
  );

  const remove = useCallback(async (id: string) => {
    const snapshot = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await inventoryQueries.remove(id);
    } catch (e) {
      setItems(snapshot);
      throw e;
    }
  }, [items]);

  return { items, loading, error, add, remove, reload };
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(inventory): add useInventory hook with optimistic updates"
```

---

### Task 3: Build category grouping utility (TDD)

**Files:**
- Create: `tests/unit/inventory-grouping.test.ts`, `lib/utils/inventory-grouping.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/inventory-grouping.test.ts
import { describe, it, expect } from 'vitest';
import { groupByCategory, CATEGORY_ORDER } from '../../lib/utils/inventory-grouping';
import type { InventoryItem } from '../../lib/supabase/queries';

function item(name: string, category: string | null): InventoryItem {
  return {
    id: name,
    user_id: 'u',
    name,
    category,
    created_at: new Date().toISOString(),
  };
}

describe('groupByCategory', () => {
  it('returns groups in canonical order', () => {
    const items = [
      item('Eggs', 'protein'),
      item('Spinach', 'produce'),
      item('Salt', 'staple'),
      item('Weird Thing', null),
    ];
    const groups = groupByCategory(items);
    expect(groups.map((g) => g.category)).toEqual(['protein', 'produce', 'staple', 'other']);
  });

  it('puts null-category items in other', () => {
    const items = [item('X', null)];
    const groups = groupByCategory(items);
    expect(groups[0].category).toBe('other');
    expect(groups[0].items).toHaveLength(1);
  });

  it('omits categories with zero items', () => {
    const items = [item('Eggs', 'protein')];
    const groups = groupByCategory(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe('protein');
  });

  it('sorts items alphabetically within a category', () => {
    const items = [
      item('Zucchini', 'produce'),
      item('Apple', 'produce'),
    ];
    const groups = groupByCategory(items);
    expect(groups[0].items.map((i) => i.name)).toEqual(['Apple', 'Zucchini']);
  });

  it('exposes CATEGORY_ORDER constant', () => {
    expect(CATEGORY_ORDER).toEqual(['protein', 'produce', 'staple', 'other']);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm test tests/unit/inventory-grouping.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// lib/utils/inventory-grouping.ts
import type { InventoryItem } from '../supabase/queries';

export const CATEGORY_ORDER = ['protein', 'produce', 'staple', 'other'] as const;
export type Category = (typeof CATEGORY_ORDER)[number];

export type InventoryGroup = {
  category: Category;
  items: InventoryItem[];
};

export function groupByCategory(items: InventoryItem[]): InventoryGroup[] {
  const buckets = new Map<Category, InventoryItem[]>();
  for (const cat of CATEGORY_ORDER) buckets.set(cat, []);

  for (const item of items) {
    const cat: Category =
      item.category && (CATEGORY_ORDER as readonly string[]).includes(item.category)
        ? (item.category as Category)
        : 'other';
    buckets.get(cat)!.push(item);
  }

  const result: InventoryGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    const items = buckets.get(cat)!;
    if (items.length === 0) continue;
    items.sort((a, b) => a.name.localeCompare(b.name));
    result.push({ category: cat, items });
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pnpm test tests/unit/inventory-grouping.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(inventory): add category grouping utility with tests"
```

---

### Task 4: Build InventoryItem row component

**Files:**
- Create: `components/inventory/InventoryRow.tsx`

- [ ] **Step 1: Create component**

```typescript
// components/inventory/InventoryRow.tsx
import { View, Alert } from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import type { InventoryItem } from '../../lib/supabase/queries';

type Props = {
  item: InventoryItem;
  onRemove: (id: string) => void;
};

export function InventoryRow({ item, onRemove }: Props) {
  function confirmRemove() {
    Alert.alert(
      'Remove item?',
      `Remove "${item.name}" from inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemove(item.id) },
      ],
    );
  }

  return (
    <View className="flex-row items-center justify-between border-b border-border py-3 px-2">
      <Text className="flex-1">{item.name}</Text>
      <Button variant="ghost" size="sm" onPress={confirmRemove}>
        Remove
      </Button>
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
git commit -m "feat(inventory): add InventoryRow component"
```

---

### Task 5: Build AddItemForm modal component

**Files:**
- Create: `components/inventory/AddItemForm.tsx`

- [ ] **Step 1: Create component**

```typescript
// components/inventory/AddItemForm.tsx
import { View, Modal, Pressable, Alert } from 'react-native';
import { useState } from 'react';
import { Text } from '../ui/text';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { CATEGORY_ORDER, type Category } from '../../lib/utils/inventory-grouping';
import { cn } from '../../lib/utils/cn';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, category: Category) => Promise<void>;
};

export function AddItemForm({ visible, onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('protein');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onAdd(name.trim(), category);
      setName('');
      setCategory('protein');
      onClose();
    } catch (e) {
      Alert.alert('Add failed', String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-background p-6">
        <View className="flex-row items-center justify-between mb-6">
          <Text variant="h2">Add ingredient</Text>
          <Button variant="ghost" onPress={onClose}>Cancel</Button>
        </View>

        <Text variant="label" className="mb-2">Name</Text>
        <Input
          placeholder="e.g., chicken breast"
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="none"
          className="mb-4"
        />

        <Text variant="label" className="mb-2">Category</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {CATEGORY_ORDER.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              className={cn(
                'px-4 py-2 rounded-full border',
                category === c
                  ? 'bg-primary border-primary'
                  : 'bg-background border-border',
              )}
            >
              <Text className={category === c ? 'text-primary-foreground' : 'text-foreground'}>
                {c}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button onPress={handleSubmit} disabled={saving || !name.trim()}>
          {saving ? 'Adding...' : 'Add'}
        </Button>
      </View>
    </Modal>
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
git commit -m "feat(inventory): add AddItemForm modal"
```

---

### Task 6: Build responsive breakpoint hook

**Files:**
- Create: `hooks/use-breakpoint.ts`

- [ ] **Step 1: Create hook**

```typescript
// hooks/use-breakpoint.ts
import { useWindowDimensions } from 'react-native';

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    width,
    isTablet: width >= 768,
    isPhone: width < 768,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add useBreakpoint hook for responsive layouts"
```

---

### Task 7: Wire up Inventory screen with responsive layout

**Files:**
- Modify: `app/(app)/inventory.tsx`

- [ ] **Step 1: Replace inventory.tsx**

```typescript
// app/(app)/inventory.tsx
import { View, ScrollView, FlatList, Alert } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import { InventoryRow } from '../../components/inventory/InventoryRow';
import { AddItemForm } from '../../components/inventory/AddItemForm';
import { useInventory } from '../../hooks/use-inventory';
import { groupByCategory, CATEGORY_ORDER } from '../../lib/utils/inventory-grouping';
import { useBreakpoint } from '../../hooks/use-breakpoint';

const CATEGORY_LABELS: Record<string, string> = {
  protein: 'Protein',
  produce: 'Produce',
  staple: 'Staples',
  other: 'Other',
};

export default function Inventory() {
  const { items, loading, add, remove, error } = useInventory();
  const [addOpen, setAddOpen] = useState(false);
  const { isTablet } = useBreakpoint();
  const groups = groupByCategory(items);

  async function handleRemove(id: string) {
    try {
      await remove(id);
    } catch (e) {
      Alert.alert('Remove failed', String(e));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between p-6">
        <Text variant="h1">Inventory</Text>
        <Button onPress={() => setAddOpen(true)}>+ Add</Button>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text variant="muted">Loading...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-destructive text-center">
            Couldn't load inventory. Check your connection.
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text variant="muted" className="text-center mb-4">
            Your pantry is empty.
          </Text>
          <Button onPress={() => setAddOpen(true)}>Add your first ingredient</Button>
        </View>
      ) : isTablet ? (
        <ScrollView className="flex-1 px-6">
          <View className="flex-row flex-wrap gap-4 pb-6">
            {groups.map((group) => (
              <View key={group.category} className="flex-1 min-w-[220px]">
                <Text variant="h3" className="mb-2">
                  {CATEGORY_LABELS[group.category]}
                </Text>
                {group.items.map((item) => (
                  <InventoryRow key={item.id} item={item} onRemove={handleRemove} />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1 px-6 pb-6">
          {groups.map((group) => (
            <View key={group.category} className="mb-6">
              <Text variant="h3" className="mb-2">
                {CATEGORY_LABELS[group.category]}
              </Text>
              {group.items.map((item) => (
                <InventoryRow key={item.id} item={item} onRemove={handleRemove} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <AddItemForm
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={add}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

```bash
pnpm expo start
```

- Launch on iPhone simulator
- Add 5+ items across all 4 categories
- Verify they appear grouped correctly
- Quit and relaunch app → verify items persist
- Remove an item, confirm removal works
- Switch to iPad simulator, verify grid layout kicks in
- Test adding/removing on iPad

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(inventory): add responsive inventory screen with CRUD"
```

---

### Task 8: Integration test for inventory RLS

**Files:**
- Create: `tests/integration/rls-inventory.test.ts`, `tests/integration/helpers.ts`

This test verifies that users can't read each other's inventory. Requires local Supabase running.

- [ ] **Step 1: Install dotenv for loading env vars in tests**

```bash
pnpm add -D dotenv
```

- [ ] **Step 2: Create a .env.test for service-role access**

```bash
# Get the service_role key from supabase status
supabase status
```

Create `.env.test`:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Add to `.gitignore`:

```
.env.test
```

- [ ] **Step 3: Create test helpers**

```typescript
// tests/integration/helpers.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase/types';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function serviceClient(): SupabaseClient<Database> {
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createTestUser(email: string): Promise<string> {
  const admin = serviceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'test-password-123',
  });
  if (error) throw error;
  return data.user.id;
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = serviceClient();
  await admin.auth.admin.deleteUser(userId);
}

export async function signInAs(email: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(url, anonKey);
  const { error } = await client.auth.signInWithPassword({
    email,
    password: 'test-password-123',
  });
  if (error) throw error;
  return client;
}
```

- [ ] **Step 4: Write RLS integration test**

```typescript
// tests/integration/rls-inventory.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  deleteTestUser,
  signInAs,
  serviceClient,
} from './helpers';

describe('inventory RLS', () => {
  let userAId = '';
  let userBId = '';
  const emailA = `a-${Date.now()}@test.local`;
  const emailB = `b-${Date.now()}@test.local`;

  beforeAll(async () => {
    userAId = await createTestUser(emailA);
    userBId = await createTestUser(emailB);

    // Seed one inventory item for user A via service role
    const admin = serviceClient();
    await admin.from('inventory_items').insert({
      user_id: userAId,
      name: 'user-a-only',
      category: 'protein',
    });
  });

  afterAll(async () => {
    await deleteTestUser(userAId);
    await deleteTestUser(userBId);
  });

  it('user A can see their own inventory', async () => {
    const client = await signInAs(emailA);
    const { data, error } = await client.from('inventory_items').select('*');
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.some((i) => i.name === 'user-a-only')).toBe(true);
  });

  it('user B cannot see user A inventory', async () => {
    const client = await signInAs(emailB);
    const { data, error } = await client.from('inventory_items').select('*');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('user B cannot insert with user A user_id', async () => {
    const client = await signInAs(emailB);
    const { error } = await client.from('inventory_items').insert({
      user_id: userAId,
      name: 'hacked',
      category: 'protein',
    });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 5: Configure Vitest to load env for integration tests**

Update `vitest.config.ts`:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    testTimeout: 15000,
  },
});
```

- [ ] **Step 6: Run integration test**

```bash
supabase start  # if not already running
pnpm test tests/integration/rls-inventory.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: add RLS integration tests for inventory"
```

---

### Phase 2 Exit Checklist

- [ ] Inventory CRUD works end-to-end
- [ ] Category grouping tested and used in UI
- [ ] Responsive layout: grid on tablet (≥768px), list on phone
- [ ] Optimistic updates make adds/removes feel instant
- [ ] RLS enforced and integration-tested
- [ ] App dogfooded on iPad and iPhone simulators
