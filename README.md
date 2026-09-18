# NeonPlate

A personal iPad/iPhone food assistant: track ingredients, decide what to eat, and log meals against daily macro targets.

**Status:** in development. Inventory, text/voice logging, and today's macro display exist; suggestions and history are unfinished. Existing flows still need stabilization and device verification. See [the current plan](docs/PLAN.md) for the remaining work and release criteria.

## Development

The app uses Expo SDK 54, React Native, TypeScript, NativeWind, Supabase, and OpenRouter. There is no custom server. iPad is the primary layout; iPhone is supported. Web is not a V1 release target.

1. Use Node 22 (`nvm use` if installed) and pnpm 9.15.9, as pinned in `package.json`.
2. Run `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env.local`. Set the Supabase URL and public anon key for your development project. Do not put a service-role key in the app.
4. Ensure the database has the migrations in `supabase/migrations/` applied. For a fresh local environment, install the Supabase CLI and Docker, then run `supabase start` and `supabase migration up --local`. Use the local URL and anon key reported by the CLI. A physical device needs a reachable host address, not its own localhost.
5. Run `pnpm start` for Metro. Voice recognition requires a native development build with the configured microphone/speech permissions; Expo Go is not the target for full-app validation. `pnpm ios` builds locally on macOS with Xcode; `pnpm android` requires an Android development environment.
6. Enter your personal OpenRouter key in Settings; it is stored on-device, separately from `.env.local`.

Authentication setup and hosted-device connectivity still need verification; follow the stabilization milestone in the plan. Do not assume sending a magic link completes sign-in—the callback flow is a known gap.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

Use `pnpm format` to format application code. CI runs these checks on main pushes and pull requests. Current tests cover pure utilities, prompts, and AI schemas; database integration and physical-device checks remain on the plan.

## Repository map

- `app/`: Expo Router screens and modals.
- `components/`: shared primitives and feature UI.
- `hooks/`: auth, database state, responsive layout, and speech.
- `lib/`: AI, database queries/types, theme, and utilities.
- `supabase/`: local configuration and versioned schema/access-policy migrations.
- `tests/unit/`: unit tests.
- [docs/PLAN.md](docs/PLAN.md): current decisions, remaining milestones, and release checklist.
- [docs/superpowers/README.md](docs/superpowers/README.md): historical planning archive.

The original implementation branch is preserved in Git history. `main` is the integration branch going forward; use short-lived branches for remaining milestones.
