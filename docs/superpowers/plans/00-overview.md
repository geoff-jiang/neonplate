# NeonPlate V1 Implementation Plan — Overview

> Historical reference. See [the current personal V1 plan](../../PLAN.md) for authoritative scope, progress, and remaining work.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tablet-first, mobile-compatible React Native app (NeonPlate V1) that manages household food inventory, suggests recipes via LLM, logs meals via voice/text with manual macro verification, and tracks daily macro progress.

**Architecture:** Expo (React Native) client with TypeScript, styling via NativeWind + wrapped react-native-reusables components, data persisted to Supabase (Postgres + RLS + magic-link auth), AI calls direct to OpenRouter from the client. No custom server.

**Tech Stack:** Expo SDK (latest), expo-router, TypeScript, NativeWind, react-native-reusables, react-native-reanimated, @supabase/supabase-js, expo-secure-store, expo-speech-recognition, Zod, Vitest.

**Spec:** See `docs/superpowers/specs/2026-04-20-neonplate-v1-design.md`.

---

## Plan Files

Execute in order. Each phase produces a working increment.

| File | Phase | Outcome |
|---|---|---|
| `01-phase1-foundation.md` | Foundation | Signed in on iPad + iPhone; macro targets savable; OpenRouter key stored securely. |
| `02-phase2-inventory.md` | Inventory | Full inventory CRUD with responsive layout. |
| `03-phase3-meal-logging.md` | Text Meal Logging | Text input → AI extraction → verify → save; Today tab with live macro bars. |
| `04-phase4-voice-logging.md` | Voice Logging | Voice input pipes into the same extraction flow. |
| `05-phase5-suggestions.md` | Recipe Suggestions | AI-generated suggestions; saved on cook; Recipes tab with detail + cook-again. |
| `06-phase6-history-polish.md` | History + Polish | History tab; error/loading/empty states; prompt refinement. |

**Checkpoint after each phase.** Dogfood on your actual device between phases, especially before Phase 4 (voice) and after Phase 5 (full loop).

---

## File Structure

```
neonplate/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout, auth gate, theme provider
│   ├── (auth)/
│   │   └── sign-in.tsx           # Magic-link email screen
│   ├── (app)/
│   │   ├── _layout.tsx           # Tab bar / sidebar
│   │   ├── today.tsx             # Tab 1
│   │   ├── inventory.tsx         # Tab 2
│   │   ├── recipes.tsx           # Tab 3
│   │   ├── recipes/[id].tsx      # Recipe detail
│   │   ├── history.tsx           # Tab 4
│   │   └── settings.tsx          # Settings screen
│   └── modals/
│       ├── log-meal.tsx          # Log modal (text + voice)
│       └── suggest.tsx           # Suggest modal
├── components/
│   ├── ui/                       # Wrapped rn-reusables (Button, Card, Input, etc.)
│   ├── macros/                   # MacroProgressBar, MacroEditRow
│   ├── inventory/                # InventoryItem, AddItemForm
│   ├── recipes/                  # RecipeCard, SuggestionCard, IngredientRow
│   └── logging/                  # VerificationScreen, VoiceRecorder
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createClient()
│   │   ├── queries.ts            # typed queries per table
│   │   └── types.ts              # DB types (generated)
│   ├── ai/
│   │   ├── client.ts             # OpenRouter HTTP client
│   │   ├── config.ts             # model, temps, timeouts
│   │   ├── prompts.ts            # prompt strings
│   │   ├── schemas.ts            # Zod schemas for responses
│   │   └── calls/
│   │       ├── suggest.ts        # recipe suggestion call
│   │       └── extract-meal.ts   # meal extraction call
│   ├── auth/
│   │   └── secure-storage.ts     # API key wrapper around expo-secure-store
│   ├── theme.ts                  # Design tokens (V1 defaults, V2 will swap)
│   └── utils/
│       ├── day-boundary.ts       # today-start, today-end, belongs-to-today
│       └── macros.ts             # sum, remaining, percent calcs
├── hooks/
│   ├── use-auth.ts
│   ├── use-inventory.ts
│   ├── use-recipes.ts
│   ├── use-daily-logs.ts
│   └── use-settings.ts
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 0001_init.sql
│       ├── 0002_rls_policies.sql
│       └── ...
├── tests/
│   ├── unit/
│   │   ├── prompts.test.ts
│   │   ├── schemas.test.ts
│   │   ├── day-boundary.test.ts
│   │   └── macros.test.ts
│   ├── integration/
│   │   └── rls.test.ts
│   └── fixtures/
│       └── ai-responses/
├── .github/workflows/ci.yml
├── app.config.ts                 # Expo config
├── tailwind.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Design Principles Enforced Throughout

- **TDD.** Pure functions (prompts, schemas, day-boundary, macros) have tests written first. UI code is manually dogfooded.
- **DRY.** Extract shared UI to `components/ui/*`. Never duplicate prompt templates, schemas, or query logic.
- **YAGNI.** No speculative abstractions. If the spec doesn't call for it, don't build it.
- **Frequent commits.** Every task ends with a commit. Commits are small, scoped, and message-prefixed (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`).
- **No inline styles.** All styling via NativeWind classes or theme tokens from `lib/theme.ts`.
- **Component wrapping.** Screens never import from `react-native-reusables` directly — always from `components/ui/*`.
- **Tablet-first.** Every screen designed for ≥768px first; mobile is a stacking fallback. Test on both iPad and iPhone from Phase 1.

## Commit Message Convention

```
<type>: <short description>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `style`.

## Test Commands Reference

Throughout the plans you'll see these commands:

- `pnpm test` — run all Vitest tests once
- `pnpm test <path>` — run a specific test file
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — ESLint
- `supabase start` — boot local Supabase
- `supabase db reset` — wipe local DB and re-apply migrations
- `pnpm expo start` — start Expo dev server
