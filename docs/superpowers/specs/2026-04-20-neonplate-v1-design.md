# NeonPlate V1 — Design Spec

**Status:** V1.0 design locked, ready for implementation planning
**Date:** 2026-04-20

## 1. Problem & Goal

Daily decision fatigue around cooking — especially while trying to stay in a caloric deficit or hit high-protein targets — leads to poor dietary choices and wasted ingredients. NeonPlate is a single-user tablet-first (mobile-compatible) app that:

1. Tracks household food inventory (boolean presence)
2. Generates recipe suggestions on demand from available ingredients and remaining daily macros
3. Logs meals via voice or text, extracting macros via LLM with mandatory manual verification
4. Tracks daily macro progress against user-set targets

Secondary goal: level up full-stack mobile development with AI-assisted workflows.

## 2. Scope

**V1 Must-Haves:**
- Inventory management (boolean presence)
- AI-driven recipe suggestion with macro-aware ranking
- Voice and text meal logging with verification step
- Daily macro progress tracking
- User-set macro targets
- Supabase auth (magic link), RLS-scoped data
- Tablet-first responsive layout, mobile-compatible

**Explicitly Out of V1 (V2+ backlog):**
- Cyberpunk visual redesign + animations (primary V2 goal)
- Image recognition for meal logging
- Manual recipe entry
- Trend charts / history analytics
- Push notifications
- Multi-user / sharing
- Offline support
- Shopping list generation
- Prompt externalization to Supabase

## 3. Architecture

**Client-only application.** No custom server.

- **Frontend:** Expo (React Native) + TypeScript
  - Expo Router for navigation
  - NativeWind for styling (Tailwind-in-RN)
  - react-native-reusables for components (wrapped, not imported directly into screens)
  - react-native-reanimated installed from Phase 1 (V2 will need it)
  - expo-speech-recognition for device-native STT
  - expo-secure-store for OpenRouter API key
- **Backend:** Supabase
  - Postgres + Row Level Security
  - Magic-link email auth (single user)
  - Client-direct database access (no custom backend server)
- **AI:** OpenRouter via client-direct HTTP
  - Default model: `anthropic/claude-3.5-haiku` or `openai/gpt-4o-mini`
  - Prompts as string constants in code, iterated via `eas update` OTA

### Data flow

**Recipe suggestion:**
```
Client reads inventory + today's macro totals from Supabase
→ builds prompt with inventory + remaining macros + exclusion list
→ POST OpenRouter
→ parse JSON (Zod schema) with one retry on failure
→ render 3 recipe cards
→ on "Cook this": INSERT into recipes table, optionally INSERT into daily_logs
```

**Meal logging:**
```
User speaks or types
→ device STT transcribes (voice path) / text direct (text path)
→ POST OpenRouter with extraction prompt
→ parse JSON (Zod schema)
→ verification screen (editable fields, confidence indicator)
→ user confirms
→ INSERT into daily_logs (optimistic UI)
```

## 4. Data Model

All tables scoped by `user_id` with RLS `auth.uid() = user_id`.

### `user_settings` (one row per user)
| Column | Type | Notes |
|---|---|---|
| user_id | uuid | PK, FK → auth.users |
| daily_calories | int | |
| daily_protein_g | int | |
| daily_carbs_g | int | |
| daily_fat_g | int | |
| updated_at | timestamptz | |

### `inventory_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| name | text | freeform, e.g., "chicken breast" |
| category | text | nullable: protein / produce / staple / other |
| created_at | timestamptz | |

Unique constraint: `(user_id, lower(name))`.

### `recipes`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| name | text | |
| ingredients | jsonb | `[{name, quantity}, ...]` |
| instructions | text | |
| prep_time_minutes | int | |
| difficulty | text | easy / medium / hard |
| meal_type | text | breakfast / lunch / dinner / snack |
| estimated_calories | int | |
| estimated_protein_g | int | |
| estimated_carbs_g | int | |
| estimated_fat_g | int | |
| times_cooked | int | default 0 |
| last_cooked_at | timestamptz | nullable; used for suggestion exclusion list |
| created_at | timestamptz | |

### `daily_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| recipe_id | uuid | nullable, FK → recipes |
| name | text | denormalized from recipe so log survives deletion |
| calories | int | |
| protein_g | int | |
| carbs_g | int | |
| fat_g | int | |
| logged_at | timestamptz | device-local timestamp |
| source | text | voice / text / recipe |
| raw_input | text | nullable, original transcription for debugging |

### Design decisions

- **Ingredients as jsonb, not relational table.** LLM handles matching; we never query "which recipes use X."
- **No inventory↔recipe join table.** Prompt sends inventory as a list.
- **Denormalized recipe name in daily_logs.** Historical integrity.
- **No soft deletes in V1.** Logs persist via denormalization.
- **Day-boundary math client-side.** Using device-local time, midnight reset.

## 5. Screens & Flows

### Layout strategy (tablet-first, mobile-compatible)

- Expo config: `orientation: "default"`, `supportsTablet: true`, `resizeableActivity: true`
- Responsive breakpoint at 768px via NativeWind
- Primary designs target tablet; mobile is a stacking fallback
- Navigation: bottom tabs on phone, consider sidebar rail on tablet (decide in Phase 1)

### Tab 1: Today

- Macro progress: 4 horizontal bars (calories, protein, carbs, fat) — consumed / target / remaining
- Today's meal list (newest first), tap to edit/delete
- Primary actions: **Log Meal**, **Suggest [meal type]** (label adapts to time of day)
- Tablet: two columns (macros + actions left, meal list right). Phone: stacked.

### Tab 2: Inventory

- List grouped by category (Protein / Produce / Staples / Other)
- Swipe-to-delete, tap-to-toggle
- Floating "+" → add form (name + category)
- Search bar when list grows
- Tablet: category grid (4 across). Phone: single scrolling list.

### Tab 3: Recipes

- List: name, meal type, prep time, macros
- Tap → detail (full ingredients, instructions, "Cook again" → increments `times_cooked`, updates `last_cooked_at`, opens pre-filled verification screen)
- Sort: most cooked / recently added / prep time
- Tablet: master-detail. Phone: stacked navigation.
- **No manual recipe entry in V1** (YAGNI — revisit if friction appears)

### Tab 4: History

- Scroll of past days, each a collapsible section with totals + meals
- No charts/trends in V1

### Settings (gear icon, top-right of Today)

- Daily macro targets
- OpenRouter API key (masked, secure-store backed)
- Sign out

### Modal A: Suggest Recipes

1. User taps **Suggest [meal type]**
2. Loading state
3. 3 recipe cards side-by-side (tablet) or stacked (phone):
   - Name, prep time, difficulty
   - Estimated macros
   - Ingredients with ✓ (in stock) / ⚠ (missing: X)
   - Buttons: **Cook this** / **Not this one**
4. Cook → save to `recipes` (sets `last_cooked_at`, increments `times_cooked`) → prompt "Log now?" → verification screen pre-filled with recipe's estimated macros (still editable, e.g., for half portions) → save to `daily_logs`
5. All three declined → shuffle re-queries with exclusions

### Modal B: Log Meal

1. Two tabs: **Text** / **Voice**
2. Text: input + Parse button
3. Voice: mic button toggles recording; device STT shows transcription in editable field
4. Parse → loading → verification screen
5. Verification screen:
   - Editable fields: name, calories, protein_g, carbs_g, fat_g
   - Raw input shown for reference
   - Confidence indicator (low = yellow/orange)
   - Buttons: **Save** / **Cancel** / **Re-parse** (with optional hint field)
6. Save → optimistic UI update on Today → Supabase insert

### Empty states

- No targets set: "Set your goals" card
- Empty inventory: "Add your first ingredient"
- Suggest with empty inventory: "Add ingredients first"
- Empty recipes: "Your saved recipes will appear here"

## 6. AI Integration

### Model & config

- Default: `anthropic/claude-3.5-haiku` or `openai/gpt-4o-mini`
- Centralized in `lib/ai/config.ts`: model name, temperature, retries, timeout, system prompts
- Temperatures: 0.3 extraction, 0.7 suggestion
- Max 1 retry per call
- 15s timeout
- `response_format: { type: "json_object" }` or structured outputs when available

### Call 1: Recipe Suggestion

**Input context:**
- Inventory (array of names)
- Meal type (from time of day, user-overridable)
- Remaining macros (target − today's totals)
- Exclusion list (declined recipes this session + recently-cooked recipes from last 3 days)

**System prompt (conceptual):**
```
You are a recipe suggester. Given ingredients and macro targets,
propose exactly 3 recipes for a [meal_type].

Rules:
- Use only provided ingredients plus common pantry staples
  (oil, salt, pepper, garlic, common spices) — assumed always available.
- You MAY suggest a recipe missing up to 2 non-staple ingredients;
  if so, list them in "missing_ingredients".
- Rank suggestions to best fit the remaining macro targets.
- Do not suggest anything in the exclusion list.
- Output valid JSON matching the schema.
```

**Response schema:**
```json
{
  "suggestions": [
    {
      "name": "Lemon Garlic Salmon",
      "meal_type": "dinner",
      "prep_time_minutes": 20,
      "difficulty": "easy",
      "ingredients": [
        {"name": "salmon fillet", "quantity": "200g", "in_stock": true},
        {"name": "capers", "quantity": "1 tbsp", "in_stock": false}
      ],
      "missing_ingredients": ["capers"],
      "instructions": "...",
      "estimated_calories": 420,
      "estimated_protein_g": 38,
      "estimated_carbs_g": 4,
      "estimated_fat_g": 28
    }
  ]
}
```

### Call 2: Meal Log Extraction

**Input:** raw transcribed text (e.g., "grilled chicken salad, 150g chicken, olive oil and balsamic")

**System prompt:**
```
Extract meal information from the user's description.
Estimate macros based on typical portions.

If the description is ambiguous about quantities, use reasonable defaults
and set "confidence": "low". Otherwise "medium" or "high".

Round all macros to integers.
```

**Response schema:**
```json
{
  "name": "Grilled Chicken Salad",
  "calories": 380,
  "protein_g": 42,
  "carbs_g": 8,
  "fat_g": 20,
  "confidence": "medium",
  "notes": "Assumed 1 tbsp olive oil and 1 tbsp balsamic"
}
```

`confidence: low` triggers yellow/orange highlight on verification screen.

### Error handling

| Failure | Behavior |
|---|---|
| Network offline | Inline banner, no retry spam |
| OpenRouter 4xx | Modal: check API key in Settings |
| OpenRouter 5xx / timeout | One silent retry → toast on second fail |
| Invalid JSON | One retry with correction prompt → fallback to raw text + manual log |
| Empty suggestions | "Not enough ingredients — add more or try a different meal type" |

## 7. Styling & V2 Readiness

V2 is a cyberpunk visual redesign + animations. V1 must set us up for a theme-swap, not a rewrite.

- **Centralized theme** in `lib/theme.ts` consumed by NativeWind config. All colors, spacing, typography, radii as tokens.
- **Component wrapping.** Screens import from `components/ui/*`. Those wrap rn-reusables. V2 edits the wrappers, screens don't change.
- **No inline styles.** Lint rule: no `style={{}}` except for dynamic values.
- **react-native-reanimated** installed in Phase 1 (painful to add later).
- **Don't fork rn-reusables components into the repo until V2** (stay on library defaults through wrappers).

## 8. Auth & Security

- Supabase magic-link email auth (one-time setup)
- RLS policies on every table: `auth.uid() = user_id`
- OpenRouter API key in `expo-secure-store` (device-only)
- Supabase anon key in app bundle (acceptable — RLS is the real boundary)

## 9. Testing Strategy

Pragmatic, focused on high-ROI targets for a solo-use app.

| Layer | Approach |
|---|---|
| Prompt builders (pure functions) | Unit (Vitest) |
| AI response parsers (Zod) | Unit with fixture files |
| Day-boundary logic | Unit with fixed clock |
| Supabase queries & RLS | Integration against local `supabase start` |
| Screens / components | Skip in V1 |
| E2E | Skip in V1 (daily use = E2E) |

**CI:** GitHub Actions, one workflow — lint + typecheck + unit on push. No CI builds.

## 10. Milestones

**Phase 0 — Design & Schema** *(this doc)*

**Phase 1 — Foundation** *(~1-2 days)*
- Init Expo + TS + Expo Router + NativeWind + rn-reusables + reanimated
- Supabase project, schema migration, RLS policies
- Magic-link auth flow
- expo-secure-store setup
- Settings screen (targets + API key)
- Build to both iPad and iPhone
- **Exit:** signed in on both form factors, targets saved, API key in secure store

**Phase 2 — Inventory** *(~1 day)*
- Inventory tab with CRUD, category grouping, responsive layout
- **Exit:** fully usable on device

**Phase 3 — Meal Logging (text)** *(~2-3 days)*
- OpenRouter client module
- Extraction prompt + Zod schema
- Text-log flow: input → parse → verify → save
- Today tab: progress bars + meal list
- Day-boundary utilities
- **Exit:** end-to-end text logging. Dogfood for 2-3 days before Phase 4.

**Phase 4 — Voice Logging** *(~1 day)*
- Voice tab, expo-speech-recognition, reuse parse/verify
- **Exit:** voice logging works

**Phase 5 — Recipe Suggestions** *(~2-3 days)*
- Suggestion prompt builder + Zod schema
- Suggestion UI (3-card responsive layout)
- "Cook this" flow: save + optional log
- Recipes tab with list + detail + cook-again
- Empty/missing-ingredient states
- **Exit:** full core loop functioning

**Phase 6 — History + Polish** *(~1-2 days)*
- History tab
- Error, loading, empty states across app
- Prompt refinement from real usage
- **Exit:** V1 complete. Dogfood for a week before V2 planning.

**Estimated effort: ~8-12 focused days.**

## 11. V2 Backlog (explicit non-goals for V1)

- Cyberpunk visual redesign + animations (primary V2)
- Manual recipe entry
- Trend charts / history analytics
- Push notifications (e.g., under-protein reminders)
- Image recognition for meals
- Multi-user / sharing
- Offline support (local-first with sync)
- Shopping list generation
- Prompt externalization to Supabase
- Whisper-based voice (if device STT quality disappoints)
