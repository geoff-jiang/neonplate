# NeonPlate — working agreements

## Scope and source of truth

- Build a personal iPad/iPhone app. Read `docs/PLAN.md` for current scope, status, and acceptance criteria.
- `docs/superpowers/` contains historical designs and implementation examples, not an executable current checklist. The current plan takes precedence.
- Finish the daily-use loop before visual redesign or new product scope.

## Implementation

- Keep Expo + TypeScript + Supabase + OpenRouter; no custom server for personal V1.
- Keep database queries in `lib/supabase/queries.ts` and AI requests in `lib/ai/`.
- Use existing `components/ui/` primitives and `lib/theme.ts` where useful. Native layout components, native alerts, and justified inline styles are allowed.
- Extract components for reuse or clarity, not to satisfy a line limit. Do not add abstractions solely for a future redesign.
- Keep auth and fetched data consistent between screens; avoid independent copies without a refresh strategy.
- Treat AI nutrition as estimates. Require editable confirmation and keep manual entry available.
- Never commit credentials or real meal data. Keep database changes in versioned migrations; do not rewrite migrations that may already be applied.

## Validation and commits

- Use the pnpm version pinned in `package.json`; Node 22 is the CI baseline.
- Run `pnpm format` before commits that touch app code.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm test` before merging.
- Add meaningful tests for changed logic and regressions. Device smoke tests cover native interactions; do not treat unit checks as proof of device readiness.
- Update `docs/PLAN.md` when a milestone is completed, recording what was actually verified.
