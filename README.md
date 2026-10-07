# NeonPlate

A personal iPad/iPhone food assistant: track ingredients, decide what to eat, and log meals against daily macro targets.

**Status:** in development. Inventory, text/voice logging, and today's macro display exist; suggestions and history are unfinished. Stages 1–2 are merged; Stage 3 adds persistent inventory stock toggles, name/category editing, and recoverable failures; native/device validation is deferred until all five stages are implemented. See [the current plan](docs/PLAN.md) for the remaining work and release criteria.

## Development

The app uses Expo SDK 54, React Native, TypeScript, NativeWind, Supabase, and OpenRouter. There is no custom server. iPad is the primary layout; iPhone is supported. Web is not a V1 release target.

1. Use Node 22 (`nvm use` if installed) and pnpm 9.15.9, as pinned in `package.json`.
2. Run `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env.local`. Set the Supabase URL and public publishable key (or legacy anon key) for your development project. Do not put a service-role key in the app.
4. Ensure the database has the migrations in `supabase/migrations/` applied. For a fresh local environment, install the Supabase CLI and Docker, then run `supabase start` and `supabase migration up --local`. Use the local URL and anon key reported by the CLI. A physical device needs a reachable host address, not its own localhost.
5. Run `pnpm start` for Metro. Voice recognition requires a native development build with the configured microphone/speech permissions; Expo Go is not the target for full-app validation. `pnpm ios` builds locally on macOS with Xcode; `pnpm android` requires an Android development environment.
6. Enter your personal OpenRouter key in Settings; it is stored on-device, separately from `.env.local`.

The repository is configured for local Supabase (`neonplate-v1`, PostgreSQL 17). The previously used backend has not been recovered; the connected account contains no NeonPlate project. Do not reuse unrelated projects. Local Supabase still requires Docker; the database tests below do not.

Magic-link callbacks now handle cold and already-open app launches. The local redirect allowlist includes `neonplate://auth/callback` and the legacy `neonplate://` URL. If a hosted project is chosen later, add these exact URLs to its Auth redirect allowlist. Open the email link on the device with the development build installed. Password sign-in remains available until device verification is complete.

Run new migrations against the selected backend before using the app. The ownership migration preserves existing logs while removing invalid cross-user recipe links and enforcing same-owner associations. The logging migration adds the `manual` source and input checks for future writes, preserving existing records for explicit repair. No hosted migrations have been applied during implementation.

Inventory keeps out-of-stock ingredients for one-toggle restocking. Edit changes the name/category; Delete is permanent and separately confirmed. Apply the stock migration before using these controls. Existing ingredients start in stock; old names remain intact, while new/edit writes normalize whitespace. Database types were manually aligned and schema-checked because local CLI generation requires unavailable Docker/Podman; regenerate them against the selected backend during final validation.

Manual entry is available from Log meal and after an AI failure; it needs no API key, but saving still needs the database. Today’s Edit action keeps the meal’s original date and source. Nutrition fields use whole numbers, matching the database; AI estimates and portion assumptions require your review before saving.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

Use `pnpm format` to format application code. CI runs these checks on main pushes and pull requests. Tests cover utilities, AI schemas/prompts, auth callback/session races, actual React data-hook lifecycles, and PostgreSQL row-level ownership rules. Database tests run all repository migrations inside PGlite (PostgreSQL in WASM), using non-superuser roles and two synthetic users; they do not validate Supabase Auth, JWT verification, PostgREST, or a deployed project's settings.

`pnpm exec expo install --check` and `pnpm dlx expo-doctor` check Expo compatibility. A Metro iOS export checks JavaScript/native-module bundling, not Xcode compilation or installed-device behavior. Native builds, live backend connectivity, and physical-device acceptance are intentionally deferred until the five implementation stages are complete.

## Repository map

- `app/`: Expo Router screens and modals.
- `components/`: shared primitives and feature UI.
- `hooks/`: auth, database state, responsive layout, and speech.
- `lib/`: AI, database queries/types, theme, and utilities.
- `supabase/`: local configuration and versioned schema/access-policy migrations.
- `tests/unit/`: utility, hook, and screen regression tests.
- `tests/integration/`: PostgreSQL migrations and ownership tests.
- [docs/PLAN.md](docs/PLAN.md): current decisions, remaining milestones, and release checklist.
- [docs/superpowers/README.md](docs/superpowers/README.md): historical planning archive.

The original implementation branch is preserved in Git history. `main` is the integration branch going forward; use short-lived branches for remaining milestones.
