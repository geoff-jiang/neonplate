# Phase 1 — Foundation

> Historical reference. See [the current personal V1 plan](../../PLAN.md) for authoritative scope, progress, and remaining work.

**Goal:** Project scaffolded, Supabase running locally with schema + RLS, magic-link auth works on iPad and iPhone, settings screen saves macro targets and OpenRouter API key.

**Exit criteria:** You can sign in on both an iPad simulator and an iPhone simulator, set macro targets that persist, and save an OpenRouter API key to secure storage.

---

### Task 1: Initialize Expo project with TypeScript and Expo Router

**Files:**
- Create: `package.json`, `app.config.ts`, `tsconfig.json`, `app/_layout.tsx`, `app/index.tsx`, `.gitignore`

- [ ] **Step 1: Run Expo project init**

```bash
cd /Users/geoff_jiang/Documents/Projects/neonplate
pnpm create expo-app@latest . --template default --no-install
```

If the directory isn't empty (it has `docs/`), create a temp dir, scaffold there, move files back:

```bash
mkdir -p /tmp/neonplate-scaffold
cd /tmp/neonplate-scaffold
pnpm create expo-app@latest . --template default --no-install
# Copy everything except any existing files in the real project
rsync -av --ignore-existing /tmp/neonplate-scaffold/ /Users/geoff_jiang/Documents/Projects/neonplate/
rm -rf /tmp/neonplate-scaffold
cd /Users/geoff_jiang/Documents/Projects/neonplate
pnpm install
```

Expected: `package.json`, `app/` with starter screens, `tsconfig.json` all present.

- [ ] **Step 2: Verify the scaffold runs**

```bash
pnpm expo start --tunnel
```

Expected: Metro bundler starts without errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo app with TypeScript and Expo Router"
```

---

### Task 2: Configure app.config.ts for tablet support

**Files:**
- Modify: `app.config.ts` (may need to convert from `app.json`)

- [ ] **Step 1: Convert app.json to app.config.ts if needed**

If `app.json` exists, delete it after creating `app.config.ts`.

```typescript
// app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'NeonPlate',
  slug: 'neonplate',
  version: '0.1.0',
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: 'neonplate',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.geoffjiang.neonplate',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.geoffjiang.neonplate',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
  },
});
```

```bash
rm -f app.json
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: configure app.config.ts with tablet support"
```

---

### Task 3: Install and configure NativeWind + Tailwind

**Files:**
- Modify: `package.json`, `tailwind.config.js`, `babel.config.js`, `metro.config.js`, `global.css`, `app/_layout.tsx`
- Create: `nativewind-env.d.ts`

- [ ] **Step 1: Install dependencies**

```bash
pnpm add nativewind react-native-reanimated react-native-safe-area-context
pnpm add -D tailwindcss@^3.4.0
```

- [ ] **Step 2: Initialize Tailwind config**

```bash
pnpm exec tailwindcss init
```

Then overwrite `tailwind.config.js`:

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 3: Create global.css**

```css
/* global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Configure metro.config.js**

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 5: Configure babel.config.js**

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

**Note:** `react-native-reanimated/plugin` must be the last plugin.

- [ ] **Step 6: Create nativewind-env.d.ts**

```typescript
/// <reference types="nativewind/types" />
```

- [ ] **Step 7: Import global.css in root layout**

Modify `app/_layout.tsx` to add this import at the top:

```typescript
import '../global.css';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}
```

- [ ] **Step 8: Verify it builds**

```bash
pnpm expo start
```

Open iOS simulator. Expected: app launches without errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: configure NativeWind, Tailwind, and Reanimated"
```

---

### Task 4: Create theme tokens file

**Files:**
- Create: `lib/theme.ts`

- [ ] **Step 1: Write theme.ts**

```typescript
// lib/theme.ts
// V1 theme. V2 will replace this file with cyberpunk tokens.
// All styling throughout the app MUST reference these tokens,
// either directly or via NativeWind config.

export const colors = {
  background: '#ffffff',
  foreground: '#0a0a0a',
  muted: '#f4f4f5',
  mutedForeground: '#71717a',
  border: '#e4e4e7',
  primary: '#18181b',
  primaryForeground: '#fafafa',
  accent: '#f4f4f5',
  accentForeground: '#18181b',
  destructive: '#ef4444',
  destructiveForeground: '#fafafa',
  success: '#22c55e',
  warning: '#eab308',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;
```

- [ ] **Step 2: Wire theme colors into tailwind.config.js**

Replace `theme.extend` in `tailwind.config.js`:

```javascript
const { colors } = require('./lib/theme');

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: colors.background,
        foreground: colors.foreground,
        muted: colors.muted,
        'muted-foreground': colors.mutedForeground,
        border: colors.border,
        primary: colors.primary,
        'primary-foreground': colors.primaryForeground,
        accent: colors.accent,
        'accent-foreground': colors.accentForeground,
        destructive: colors.destructive,
        'destructive-foreground': colors.destructiveForeground,
        success: colors.success,
        warning: colors.warning,
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add V1 theme tokens"
```

---

### Task 5: Install react-native-reusables base components

**Files:**
- Create: `components/ui/button.tsx`, `components/ui/text.tsx`, `components/ui/input.tsx`, `components/ui/card.tsx`

react-native-reusables uses a copy-paste model. We'll create thin wrappers so screens never import from rn-reusables directly.

- [ ] **Step 1: Install peer dependencies**

```bash
pnpm add class-variance-authority clsx tailwind-merge
pnpm add @rn-primitives/slot @rn-primitives/portal
```

- [ ] **Step 2: Create utility for className merging**

Create `lib/utils/cn.ts`:

```typescript
// lib/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create Button wrapper**

Create `components/ui/button.tsx`:

```typescript
// components/ui/button.tsx
import { Pressable, Text, type PressableProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils/cn';
import { forwardRef } from 'react';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-lg',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        destructive: 'bg-destructive',
        outline: 'border border-border bg-background',
        ghost: 'bg-transparent',
      },
      size: {
        default: 'h-12 px-4',
        sm: 'h-10 px-3',
        lg: 'h-14 px-6',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const textVariants = cva('text-base font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      ghost: 'text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    children: React.ReactNode;
    className?: string;
  };

export const Button = forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
  ({ variant, size, className, children, ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text className={textVariants({ variant })}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    );
  },
);
Button.displayName = 'Button';
```

- [ ] **Step 4: Create Text wrapper**

Create `components/ui/text.tsx`:

```typescript
// components/ui/text.tsx
import { Text as RNText, type TextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils/cn';
import { forwardRef } from 'react';

const textVariants = cva('text-foreground', {
  variants: {
    variant: {
      default: 'text-base',
      muted: 'text-sm text-muted-foreground',
      h1: 'text-3xl font-bold',
      h2: 'text-2xl font-semibold',
      h3: 'text-xl font-semibold',
      label: 'text-sm font-medium',
      caption: 'text-xs text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

type Props = TextProps & VariantProps<typeof textVariants> & { className?: string };

export const Text = forwardRef<RNText, Props>(
  ({ variant, className, ...props }, ref) => {
    return <RNText ref={ref} className={cn(textVariants({ variant }), className)} {...props} />;
  },
);
Text.displayName = 'Text';
```

- [ ] **Step 5: Create Input wrapper**

Create `components/ui/input.tsx`:

```typescript
// components/ui/input.tsx
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '../../lib/utils/cn';
import { forwardRef } from 'react';
import { colors } from '../../lib/theme';

type Props = TextInputProps & { className?: string };

export const Input = forwardRef<TextInput, Props>(({ className, ...props }, ref) => {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.mutedForeground}
      className={cn(
        'h-12 rounded-lg border border-border bg-background px-3 text-base text-foreground',
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';
```

- [ ] **Step 6: Create Card wrapper**

Create `components/ui/card.tsx`:

```typescript
// components/ui/card.tsx
import { View, type ViewProps } from 'react-native';
import { cn } from '../../lib/utils/cn';
import { forwardRef } from 'react';

type Props = ViewProps & { className?: string };

export const Card = forwardRef<View, Props>(({ className, ...props }, ref) => {
  return (
    <View
      ref={ref}
      className={cn('rounded-xl border border-border bg-background p-4', className)}
      {...props}
    />
  );
});
Card.displayName = 'Card';
```

- [ ] **Step 7: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add UI component wrappers (Button, Text, Input, Card)"
```

---

### Task 6: Install and configure Supabase CLI, init local stack

**Files:**
- Create: `supabase/config.toml`, `supabase/seed.sql`

- [ ] **Step 1: Install Supabase CLI if not already installed**

```bash
brew install supabase/tap/supabase
supabase --version
```

Expected: version string printed.

- [ ] **Step 2: Initialize Supabase in project**

```bash
cd /Users/geoff_jiang/Documents/Projects/neonplate
supabase init
```

Expected: `supabase/` directory created with `config.toml`.

- [ ] **Step 3: Start local Supabase stack**

```bash
supabase start
```

Expected output includes local URLs like:
```
         API URL: http://127.0.0.1:54321
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
        anon key: eyJhbGci...
service_role key: eyJhbGci...
```

**Copy the `anon key` for the next task.**

- [ ] **Step 4: Commit Supabase config**

```bash
git add supabase/
git commit -m "chore: initialize Supabase local stack"
```

---

### Task 7: Create initial schema migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Create migration file**

```bash
supabase migration new init
```

This creates `supabase/migrations/<timestamp>_init.sql`. Rename the timestamp prefix to `0001` for simpler ordering, or keep as generated — both work.

- [ ] **Step 2: Write schema**

```sql
-- supabase/migrations/0001_init.sql

-- user_settings: one row per user with macro targets
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_calories int not null default 2000,
  daily_protein_g int not null default 150,
  daily_carbs_g int not null default 200,
  daily_fat_g int not null default 65,
  updated_at timestamptz not null default now()
);

-- inventory_items: boolean presence of ingredients
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  created_at timestamptz not null default now()
);
create unique index inventory_items_user_name_unique
  on public.inventory_items (user_id, lower(name));
create index inventory_items_user_id_idx on public.inventory_items (user_id);

-- recipes: grows organically from AI suggestions the user cooks
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  ingredients jsonb not null default '[]'::jsonb,
  instructions text not null default '',
  prep_time_minutes int not null default 0,
  difficulty text not null default 'easy',
  meal_type text not null,
  estimated_calories int not null default 0,
  estimated_protein_g int not null default 0,
  estimated_carbs_g int not null default 0,
  estimated_fat_g int not null default 0,
  times_cooked int not null default 0,
  last_cooked_at timestamptz,
  created_at timestamptz not null default now()
);
create index recipes_user_id_idx on public.recipes (user_id);

-- daily_logs: one row per logged meal
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  name text not null,
  calories int not null default 0,
  protein_g int not null default 0,
  carbs_g int not null default 0,
  fat_g int not null default 0,
  logged_at timestamptz not null default now(),
  source text not null check (source in ('voice', 'text', 'recipe')),
  raw_input text
);
create index daily_logs_user_logged_at_idx on public.daily_logs (user_id, logged_at desc);

-- Auto-create user_settings row on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 3: Apply migration locally**

```bash
supabase db reset
```

Expected: migrations apply, no errors.

- [ ] **Step 4: Verify tables exist**

Visit `http://127.0.0.1:54323` in a browser, navigate to Table Editor. You should see `user_settings`, `inventory_items`, `recipes`, `daily_logs`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(db): add initial schema for settings, inventory, recipes, logs"
```

---

### Task 8: Add RLS policies migration

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`

- [ ] **Step 1: Create migration**

```bash
supabase migration new rls_policies
```

- [ ] **Step 2: Write policies**

```sql
-- supabase/migrations/0002_rls_policies.sql

-- Enable RLS on all tables
alter table public.user_settings enable row level security;
alter table public.inventory_items enable row level security;
alter table public.recipes enable row level security;
alter table public.daily_logs enable row level security;

-- user_settings policies
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

-- inventory_items policies
create policy "Users can view own inventory"
  on public.inventory_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own inventory"
  on public.inventory_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own inventory"
  on public.inventory_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own inventory"
  on public.inventory_items for delete
  using (auth.uid() = user_id);

-- recipes policies
create policy "Users can view own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);

create policy "Users can insert own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on public.recipes for update
  using (auth.uid() = user_id);

create policy "Users can delete own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);

-- daily_logs policies
create policy "Users can view own logs"
  on public.daily_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on public.daily_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own logs"
  on public.daily_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own logs"
  on public.daily_logs for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 3: Apply migration**

```bash
supabase db reset
```

Expected: all migrations apply cleanly.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(db): add RLS policies for all tables"
```

---

### Task 9: Generate TypeScript types from Supabase schema

**Files:**
- Create: `lib/supabase/types.ts`

- [ ] **Step 1: Generate types**

```bash
supabase gen types typescript --local > lib/supabase/types.ts
```

Expected: `lib/supabase/types.ts` created with a `Database` type export.

- [ ] **Step 2: Verify types**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "chore(db): generate TypeScript types from schema"
```

---

### Task 10: Install Supabase client and set up env vars

**Files:**
- Create: `lib/supabase/client.ts`, `.env.local`, `.env.example`
- Modify: `.gitignore`, `app.config.ts`

- [ ] **Step 1: Install supabase-js and storage adapter**

```bash
pnpm add @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

- [ ] **Step 2: Create .env.local with local Supabase values**

Get the anon key from `supabase status`:

```bash
supabase status
```

Create `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<paste-anon-key-from-supabase-status>
```

- [ ] **Step 3: Create .env.example**

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 4: Ensure .env.local is gitignored**

Append to `.gitignore`:

```
.env.local
.env.*.local
```

- [ ] **Step 5: Create Supabase client**

Create `lib/supabase/client.ts`:

```typescript
// lib/supabase/client.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in environment',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 6: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Supabase client with env config"
```

---

### Task 11: Install testing tools (Vitest)

**Files:**
- Create: `vitest.config.ts`, `tests/unit/sanity.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest @types/node
```

- [ ] **Step 2: Create vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
});
```

- [ ] **Step 3: Add test script to package.json**

Add/update these scripts in `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "expo lint"
  }
}
```

- [ ] **Step 4: Write sanity test**

```typescript
// tests/unit/sanity.test.ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: set up Vitest with sanity test"
```

---

### Task 12: Write day-boundary utility (TDD)

**Files:**
- Create: `tests/unit/day-boundary.test.ts`, `lib/utils/day-boundary.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/day-boundary.test.ts
import { describe, it, expect } from 'vitest';
import {
  startOfLocalDay,
  endOfLocalDay,
  belongsToDay,
} from '../../lib/utils/day-boundary';

describe('startOfLocalDay', () => {
  it('returns midnight of the same date', () => {
    const input = new Date(2026, 3, 20, 14, 30, 0); // Apr 20 2026, 2:30 PM local
    const result = startOfLocalDay(input);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getDate()).toBe(20);
  });
});

describe('endOfLocalDay', () => {
  it('returns 23:59:59.999 of the same date', () => {
    const input = new Date(2026, 3, 20, 14, 30, 0);
    const result = endOfLocalDay(input);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
  });
});

describe('belongsToDay', () => {
  it('returns true for a timestamp on the same local day', () => {
    const day = new Date(2026, 3, 20, 12, 0, 0);
    const ts = new Date(2026, 3, 20, 23, 58, 0);
    expect(belongsToDay(ts, day)).toBe(true);
  });

  it('returns false for a timestamp on the next local day', () => {
    const day = new Date(2026, 3, 20, 12, 0, 0);
    const ts = new Date(2026, 3, 21, 0, 1, 0);
    expect(belongsToDay(ts, day)).toBe(false);
  });

  it('returns false for a timestamp on the previous local day', () => {
    const day = new Date(2026, 3, 20, 12, 0, 0);
    const ts = new Date(2026, 3, 19, 23, 59, 59);
    expect(belongsToDay(ts, day)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm test tests/unit/day-boundary.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement day-boundary.ts**

```typescript
// lib/utils/day-boundary.ts
/**
 * Returns midnight of the given date in the local timezone.
 */
export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns 23:59:59.999 of the given date in the local timezone.
 */
export function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * True if `timestamp` falls on the same local calendar day as `day`.
 */
export function belongsToDay(timestamp: Date, day: Date): boolean {
  return (
    timestamp.getFullYear() === day.getFullYear() &&
    timestamp.getMonth() === day.getMonth() &&
    timestamp.getDate() === day.getDate()
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pnpm test tests/unit/day-boundary.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add day-boundary utilities with tests"
```

---

### Task 13: Write macros utility (TDD)

**Files:**
- Create: `tests/unit/macros.test.ts`, `lib/utils/macros.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/macros.test.ts
import { describe, it, expect } from 'vitest';
import { sumMacros, remainingMacros, percentConsumed } from '../../lib/utils/macros';

const target = { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 };

describe('sumMacros', () => {
  it('sums an empty array to zeros', () => {
    expect(sumMacros([])).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it('sums multiple log rows', () => {
    const logs = [
      { calories: 300, protein_g: 30, carbs_g: 10, fat_g: 12 },
      { calories: 500, protein_g: 40, carbs_g: 50, fat_g: 20 },
    ];
    expect(sumMacros(logs)).toEqual({
      calories: 800, protein_g: 70, carbs_g: 60, fat_g: 32,
    });
  });
});

describe('remainingMacros', () => {
  it('subtracts consumed from target', () => {
    const consumed = { calories: 500, protein_g: 40, carbs_g: 60, fat_g: 15 };
    expect(remainingMacros(target, consumed)).toEqual({
      calories: 1500, protein_g: 110, carbs_g: 140, fat_g: 50,
    });
  });

  it('can go negative (over target)', () => {
    const consumed = { calories: 2500, protein_g: 200, carbs_g: 250, fat_g: 80 };
    expect(remainingMacros(target, consumed)).toEqual({
      calories: -500, protein_g: -50, carbs_g: -50, fat_g: -15,
    });
  });
});

describe('percentConsumed', () => {
  it('returns 0 when nothing consumed', () => {
    expect(percentConsumed(0, 2000)).toBe(0);
  });

  it('returns 50 at half consumption', () => {
    expect(percentConsumed(1000, 2000)).toBe(50);
  });

  it('can exceed 100', () => {
    expect(percentConsumed(2500, 2000)).toBe(125);
  });

  it('handles zero target without NaN', () => {
    expect(percentConsumed(500, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm test tests/unit/macros.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement macros.ts**

```typescript
// lib/utils/macros.ts
export type Macros = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function sumMacros(rows: Macros[]): Macros {
  return rows.reduce<Macros>(
    (acc, r) => ({
      calories: acc.calories + r.calories,
      protein_g: acc.protein_g + r.protein_g,
      carbs_g: acc.carbs_g + r.carbs_g,
      fat_g: acc.fat_g + r.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export function remainingMacros(target: Macros, consumed: Macros): Macros {
  return {
    calories: target.calories - consumed.calories,
    protein_g: target.protein_g - consumed.protein_g,
    carbs_g: target.carbs_g - consumed.carbs_g,
    fat_g: target.fat_g - consumed.fat_g,
  };
}

export function percentConsumed(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((consumed / target) * 100);
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pnpm test tests/unit/macros.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add macros sum/remaining/percent utilities with tests"
```

---

### Task 14: Build secure-storage wrapper for OpenRouter API key

**Files:**
- Create: `lib/auth/secure-storage.ts`

- [ ] **Step 1: Install expo-secure-store**

```bash
pnpm add expo-secure-store
```

- [ ] **Step 2: Create wrapper**

```typescript
// lib/auth/secure-storage.ts
import * as SecureStore from 'expo-secure-store';

const OPENROUTER_KEY = 'openrouter_api_key';

export async function getOpenRouterKey(): Promise<string | null> {
  return SecureStore.getItemAsync(OPENROUTER_KEY);
}

export async function setOpenRouterKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(OPENROUTER_KEY, key);
}

export async function clearOpenRouterKey(): Promise<void> {
  await SecureStore.deleteItemAsync(OPENROUTER_KEY);
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): add secure-storage wrapper for OpenRouter key"
```

---

### Task 15: Build auth hook and sign-in screen

**Files:**
- Create: `hooks/use-auth.ts`, `app/(auth)/_layout.tsx`, `app/(auth)/sign-in.tsx`
- Modify: `app/_layout.tsx`, `app/index.tsx`

- [ ] **Step 1: Create auth hook**

```typescript
// hooks/use-auth.ts
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    signOut: () => supabase.auth.signOut(),
  };
}
```

- [ ] **Step 2: Create auth layout**

```typescript
// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Create sign-in screen**

```typescript
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
```

- [ ] **Step 4: Update root layout with auth gate**

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
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGate>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 5: Replace app/index.tsx with redirect**

```typescript
// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(app)/today" />;
}
```

- [ ] **Step 6: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors. (You'll get "Cannot find module" for `/(app)/today` until Task 16.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(auth): add magic-link sign-in with auth gate"
```

---

### Task 16: Scaffold (app) route group with placeholder tabs

**Files:**
- Create: `app/(app)/_layout.tsx`, `app/(app)/today.tsx`, `app/(app)/inventory.tsx`, `app/(app)/recipes.tsx`, `app/(app)/history.tsx`, `app/(app)/settings.tsx`

- [ ] **Step 1: Create tab layout**

```typescript
// app/(app)/_layout.tsx
import { Tabs } from 'expo-router';
import { colors } from '../../lib/theme';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="inventory" options={{ title: 'Inventory' }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recipes' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create placeholder screens**

Each file is a small stub. Create:

```typescript
// app/(app)/today.tsx
import { View } from 'react-native';
import { Text } from '../../components/ui/text';

export default function Today() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text variant="h2">Today</Text>
    </View>
  );
}
```

```typescript
// app/(app)/inventory.tsx
import { View } from 'react-native';
import { Text } from '../../components/ui/text';

export default function Inventory() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text variant="h2">Inventory</Text>
    </View>
  );
}
```

```typescript
// app/(app)/recipes.tsx
import { View } from 'react-native';
import { Text } from '../../components/ui/text';

export default function Recipes() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text variant="h2">Recipes</Text>
    </View>
  );
}
```

```typescript
// app/(app)/history.tsx
import { View } from 'react-native';
import { Text } from '../../components/ui/text';

export default function History() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text variant="h2">History</Text>
    </View>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold tab navigation with placeholder screens"
```

---

### Task 17: Build settings hook and settings screen

**Files:**
- Create: `hooks/use-settings.ts`, `app/(app)/settings.tsx`
- Modify: `app/(app)/today.tsx` (to add settings button)

- [ ] **Step 1: Create settings hook**

```typescript
// hooks/use-settings.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { useAuth } from './use-auth';

export type UserSettings = {
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
};

const DEFAULT_SETTINGS: UserSettings = {
  daily_calories: 2000,
  daily_protein_g: 150,
  daily_carbs_g: 200,
  daily_fat_g: 65,
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('user_settings')
      .select('daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!error && data) setSettings(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (updates: UserSettings) => {
      if (!user) return;
      // Optimistic update
      setSettings(updates);
      const { error } = await supabase
        .from('user_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) {
        await load(); // revert on failure
        throw error;
      }
    },
    [user, load],
  );

  return { settings, loading, save, reload: load };
}
```

- [ ] **Step 2: Create settings screen**

```typescript
// app/(app)/settings.tsx
import { View, ScrollView, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { Text } from '../../components/ui/text';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useSettings, UserSettings } from '../../hooks/use-settings';
import { useAuth } from '../../hooks/use-auth';
import {
  getOpenRouterKey,
  setOpenRouterKey,
} from '../../lib/auth/secure-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Settings() {
  const { settings, save } = useSettings();
  const { signOut } = useAuth();
  const [draft, setDraft] = useState<UserSettings>(settings);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    getOpenRouterKey().then((k) => setApiKey(k ?? ''));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await save(draft);
      if (apiKey) await setOpenRouterKey(apiKey);
      Alert.alert('Saved');
    } catch (e) {
      Alert.alert('Save failed', String(e));
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof UserSettings, value: string) {
    const n = parseInt(value, 10);
    setDraft((d) => ({ ...d, [field]: Number.isFinite(n) ? n : 0 }));
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-6" contentContainerClassName="gap-4">
        <Text variant="h2" className="mb-2">Daily Macro Targets</Text>

        <View>
          <Text variant="label">Calories</Text>
          <Input
            keyboardType="number-pad"
            value={String(draft.daily_calories)}
            onChangeText={(v) => updateField('daily_calories', v)}
          />
        </View>
        <View>
          <Text variant="label">Protein (g)</Text>
          <Input
            keyboardType="number-pad"
            value={String(draft.daily_protein_g)}
            onChangeText={(v) => updateField('daily_protein_g', v)}
          />
        </View>
        <View>
          <Text variant="label">Carbs (g)</Text>
          <Input
            keyboardType="number-pad"
            value={String(draft.daily_carbs_g)}
            onChangeText={(v) => updateField('daily_carbs_g', v)}
          />
        </View>
        <View>
          <Text variant="label">Fat (g)</Text>
          <Input
            keyboardType="number-pad"
            value={String(draft.daily_fat_g)}
            onChangeText={(v) => updateField('daily_fat_g', v)}
          />
        </View>

        <Text variant="h2" className="mb-2 mt-6">OpenRouter API Key</Text>
        <Input
          placeholder="sk-or-..."
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text variant="caption">Stored securely on-device only.</Text>

        <Button onPress={handleSave} disabled={saving} className="mt-6">
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button variant="outline" onPress={signOut} className="mt-2">
          Sign out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Add a Settings button to Today screen**

Replace `app/(app)/today.tsx`:

```typescript
// app/(app)/today.tsx
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Today() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between p-6">
        <Text variant="h1">Today</Text>
        <Button variant="ghost" onPress={() => router.push('/(app)/settings')}>
          Settings
        </Button>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual smoke test on iPad + iPhone simulators**

```bash
pnpm expo start
```

- Press `i` to launch iOS simulator, then switch to iPad simulator manually via Xcode
- Sign in with your email (Supabase local inbucket receives the email at http://127.0.0.1:54324)
- Open the magic link; verify you land on Today screen
- Open Settings, save macro targets, save API key, verify they persist after quit/reopen

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add settings screen with macro targets and API key"
```

---

### Task 18: Write CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "ci: add typecheck/lint/test workflow"
```

---

### Phase 1 Exit Checklist

- [ ] Expo app scaffolded with TypeScript, Expo Router, NativeWind, Reanimated
- [ ] Theme tokens + UI wrappers created
- [ ] Supabase local stack running with schema + RLS migrations
- [ ] Magic-link auth working on iPad and iPhone simulators
- [ ] Settings screen persists macro targets to Supabase and API key to secure-store
- [ ] Day-boundary and macros utilities covered by unit tests
- [ ] CI runs typecheck, lint, tests on push
