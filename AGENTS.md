# NeonPlate — Agent Rules

## Styling
- **Zero inline `style={{}}`** except for dynamic runtime values that cannot be expressed as Tailwind classes (e.g., animated `width` percentages).
- All colors, spacing, typography, and radii must come from `lib/theme.ts` tokens or NativeWind classes mapped to them.
- V2 will swap `lib/theme.ts` for a cyberpunk theme — no component code should reference hex values directly.

## Components
- Screens import UI primitives from `components/ui/*`, NOT directly from `react-native`.
- `components/ui/` is the single chokepoint for visual redesign. Never bypass it.
- **Use `ConfirmDialog` from `components/ui/ConfirmDialog` instead of `Alert.alert`.** The native alert cannot be styled and will break the V2 redesign. Use `Alert.alert` ONLY for system-level errors where a custom dialog is impractical (e.g., network unreachable, app crash recovery).
- Extract sub-components when a file exceeds ~150 lines or contains multiple logical sections (headers, lists, forms, etc.).
- Each file should have one clear responsibility. If a screen file grows unwieldy, extract reusable sections into `components/<feature>/` files.

## Code Quality
- **Run `pnpm format` before every commit.** Prettier is configured for the project.
- Follow TDD for pure functions (prompts, schemas, utilities). Skip UI/E2E tests in V1.
- Use `forwardRef` on all UI primitive wrappers.
- Use `displayName` on all forwardRef components.

## Architecture
- Supabase queries live in `lib/supabase/queries.ts`. Hooks import from there.
- AI calls are structured as: `config.ts` → `prompts.ts` → `schemas.ts` → `calls/*.ts` → `client.ts`.
- No custom server. Client-direct to Supabase and OpenRouter.
