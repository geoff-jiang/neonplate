# Personal V1 completion plan

Updated: 2026-10-06. This document is the source of truth; it supersedes the historical plans in `docs/superpowers/`.

## Goal and agreed decisions

Make NeonPlate reliable enough for daily personal use on iPad and iPhone:

**Inventory → suggest something to eat → confirm a portion and macros → log it → see the remaining daily budget.**

- Personal use first. No public onboarding, billing, shared households, or App Store launch requirement.
- Keep the existing Expo + Supabase + OpenRouter architecture and personal device-stored API key.
- Keep inventory entries when they run out. An in-stock toggle controls availability; permanent deletion is a separate action.
- Suggestions may include up to two missing non-staple ingredients, clearly labeled before selection. Pantry basics (oil, salt, pepper, garlic, common spices) are assumed available and disclosed in the UI.
- Allow recipes, quick assemblies, and single items. Keep the quick-options toggle.
- Each suggestion describes one serving with ingredient quantities and estimated macros for that serving. The user can adjust the amount and numbers before saving. Batch-recipe management is deferred.
- Manual meal entry works without an AI request or API key. Online database access is still required; full offline support is deferred.
- Keep a small saved-recipe list and basic history. Defer recipe sorting modes, cooking statistics, preference learning, analytics, and visual redesign.
- Keep theme tokens and useful shared components; native controls and simple screen-local UI are fine.

## Current state

The April implementation was on `origin/v1-implementation` at `6d27e41`; main originally held only plans. The September cleanup integrates that work, removes unused starter code, updates working agreements, and makes this plan authoritative. Stages 1 and 2 are merged. Stage 3 inventory changes are implemented and pass automated checkpoint review; stages 4–5 remain.

| Area | Evidence in code | Remaining work |
| --- | --- | --- |
| Foundation | Shared auth, callback handling, protected routes, compatible Expo packages, ownership migration/tests | Native build, live backend and real-device verification (deferred) |
| Settings | Targets/key storage, errors/retry, cross-screen refresh | Final device verification |
| Inventory | Persistent stock toggle, categorized stock-first listing, add/edit/delete, recoverable failure feedback | Final device/live-backend verification |
| Meal logging | Manual/text/voice entry, editable verification, meal editing, guarded saves/deletes, synchronized totals, bounded AI retries | Final device/live-backend verification |
| Voice | Speech hook with permission/cancellation guards, transcript retention and cleanup | Physical-device permissions, lifecycle and transcription verification |
| Suggestions | Response schema and an unfinished navigation action | Suggestion prompt/request, screen, exclusions, selection and log flow |
| Recipes / history | Tables and placeholder screens | Minimal usable views and reuse flow |
| Verification | Automated auth/data/UI regressions and PostgreSQL ownership checks, typecheck, CI | Remaining-feature regression tests and final device/live-backend checks |

Baseline review: 30 tests and typecheck passed; lint had two JSX escaping errors and three unused imports, corrected during cleanup. No hosted database, native build, or end-to-end device behavior was verified in this repository review.

Cleanup validation (2026-09-17): frozen-lockfile installation with pnpm 9.15.9, typecheck, lint, formatting, and all 30 unit tests pass locally. Native builds and hosted services remain unverified.

## 1. Stabilize the existing foundation

**Implementation and automated review complete.** Native/device and live-backend validation is deferred by user decision (2026-09-18) until all five stages are implemented. The backend was probably local; no NeonPlate hosted project or local credentials have been recovered. Do not create or reuse a hosted project without resolving that setup.

Work from main in a short-lived branch. Keep runtime fixes separate from the documentation/cleanup integration.

- [x] Align dependencies within Expo SDK 54 and verify package compatibility (18/18 Expo doctor checks). Export an iOS JavaScript bundle.
- [ ] Run a native development build at final device validation. The JS bundle export does not establish native build readiness.
- [x] Inspect existing infrastructure and document local Supabase setup and native Auth redirect URLs without credentials. Connected hosted projects are unrelated and unchanged.
- [ ] Recover/start the selected backend and choose the personal-device install route at final validation; likely local Supabase, per user.
- [x] Implement cold/warm magic-link callbacks, shared session restore/sign-out, and protected navigation. Add callback/session race tests; retain password fallback until device validation.
- [x] Give auth one shared owner rather than each consumer creating another session subscription.
- [x] Fix `useDailyLogs`' unstable default Date dependency, which retriggers loading after renders. Use stable day boundaries and explicitly refresh on local midnight and app foreground.
- [x] Choose one small data-refresh strategy for Today, settings, and logging. Start with shared auth plus explicit screen-focus/mutation refresh; add a query cache only if that materially simplifies the code.
- [x] Ensure save/delete/target changes refresh visible totals and list data without reopening the app. Clear user-scoped state on sign-out.
- [x] Expose loading and failure states; do not silently swallow failed deletes or settings reads. Prevent duplicate submissions and stale request results.
- [x] Disable unfinished navigation actions until their destination exists.
- [x] Test database ownership isolation with two test users across all four tables, including inserts, updates, and recipe/log associations. Verify deleting a recipe preserves its meal logs.

**Implementation evidence:** shared user-scoped mutation notifications replace independent stale screen state; tests cover stable dates, midnight/foreground refresh, account changes during requests, settings refresh, failures/retries, and duplicate writes. A new migration enforces same-owner recipe/log associations and preserves historical logs. Eighteen PGlite integration tests exercise PostgreSQL RLS, grants, migration upgrades, and delete preservation with synthetic users; live Supabase Auth/PostgREST is not covered.

**Checkpoint review:** subagent implementation/self-review plus an independent read-only review. Findings addressed include loaded lists unmounting during background refresh (which lost open delete dialogs), missing legacy-key fallback when the optional publishable-key field is blank, and save/cancel navigation races. Automated regression coverage accompanies these fixes.

**Checkpoint checks (2026-09-18):** 86 tests pass across 12 files, including 18 PostgreSQL integration tests. Typecheck, lint, formatting, Expo compatibility checks (doctor 18/18), and a final iOS Metro/Hermes export pass. Subagents completed implementation/self-review; a separate read-only review and parent review found no remaining Stage 1 code blockers. No native application was compiled or installed, and no live backend was changed.

**Final validation exit (deferred):** sign in on both device sizes, save targets/key, add/delete meals, and see consistent totals with no request loop. Confirm native permissions, live backend behavior, midnight/foreground transitions, and account sign-out.

## 2. Finish dependable logging

**Implementation and automated review complete.** Physical-device and live-backend acceptance remain deferred until all stages are implemented.

This makes the app useful before the suggestion feature is completed.

- [x] Add a manual-entry action that opens the same verification form without calling AI. Offer it after AI failure too. Decide an explicit manual source value and migrate the database check constraint/types if adding it.
- [x] Support editing existing meals from Today and later from History. Preserve their original date unless explicitly changed.
- [x] Validate nonempty names and finite, nonnegative macro values and sensible targets. Keep empty numeric input editable rather than immediately forcing zero.
- [x] Fix re-parse behavior: new extraction results currently do not reset the form's initial draft. Show parsing state and prevent overlapping saves/re-parses.
- [x] Explain that macros are estimates and display assumed quantities. Keep editable confirmation mandatory for AI and recipe logs.
- [x] Implement the intended bounded retry behavior for transient AI failures; JSON correction already exists. Separate missing key, account/request errors, network failures, and malformed output. Preserve entered text throughout.
- [ ] Verify voice on a physical device: permission allowed/denied, start/stop, editing transcript, leaving the screen while recording, retry, and correct source on save. Clean up recording on unmount.
- [x] Add focused automated regression tests for validation, manual/edit routes, extraction parsing, retries, speech lifecycles, and date/provenance preservation.
- [ ] Manually exercise the full text/manual/voice flows at final device/live-backend validation.

**Implementation exit:** logging can be added, corrected, and deleted without AI; verify with automated tests and checkpoint review. The original two-to-three-day dogfood gate is deferred to final device validation per user.

**Implementation evidence:** Manual entry uses the same editable form without an AI call or key; Today exposes owner-scoped editing that preserves the original timestamp, source, raw input, and recipe association. Numeric drafts retain empty input until validation; meals require a name and nonnegative whole-number nutrition, and calorie targets must be positive. Re-parse replaces the form draft and blocks overlapping operations. AI requests share a maximum of two HTTP attempts across transient retries and JSON correction, with deadlines covering response bodies and safe user-facing errors. Voice lifecycle guards preserve edited transcripts and cancel pending permissions/recording on background or unmount.

**Migration:** `20261006222453_manual_logging_validation.sql` adds the manual source and validates future writes. Existing invalid nutrition/targets are preserved for explicit repair when edited rather than silently rewritten. No live database was modified.

**Checkpoint review:** Three delegated tasks covered route regressions, AI/voice reliability, and independent review, followed by parent integration review. A stale decimal success test was corrected to match integer storage; review also caught and fixed a voice unmount/remount race using a shared recording guard that waits for the previous terminal event. No remaining Stage 2 code blockers were found.

**Checkpoint checks (2026-10-06):** 152 tests pass across 17 files, including 22 PostgreSQL integration tests. Typecheck, lint, formatting, and the final iOS Metro/Hermes export pass. Native speech/permissions, installed-device interactions, Supabase Auth/PostgREST connectivity, and dogfooding remain unverified and deferred. The new migration must be applied to the selected backend before manual logging is used.

## 3. Make inventory persistent and useful

**Implementation and automated review complete.** Native/device and live-backend validation remain deferred.

- [x] Add `in_stock boolean not null default true` through a new migration; preserve existing entries. Align database types with the schema verified by PostgreSQL introspection.
- [ ] Regenerate database types against the selected backend at final validation. The CLI generation attempt was blocked by missing Docker/Podman; the three stock type fields were updated manually, not generated.
- [x] Toggle in/out of stock, edit names/categories, and retain a separate permanent delete action. Keep case-insensitive per-user uniqueness and normalize whitespace on new/edit writes.
- [x] Show in-stock items first within category groups, with out-of-stock items still available to restore. Avoid advanced filtering.
- [x] Keep displayed stock unchanged on failed writes and offer retry with feedback. Preserve failed edit drafts. Test toggling, duplicates, edits, and access isolation.
- [x] Expose only in-stock names to suggestions through `availableNames`; disclose assumed pantry basics in the inventory screen. The suggestion request itself belongs to Stage 4.

**Implementation evidence:** The shared add/edit form retains drafts after errors and prevents overlapping submissions. Stock switches wait for persisted refresh rather than keeping an optimistic state after failure. Owner-scoped update queries patch only the intended fields; editing names/categories leaves stock, ownership, IDs, and creation timestamps intact. Successful mutations refresh all mounted inventory readers; sign-out clears availability. Category grouping keeps stocked items first without changing the fetched array.

**Migration:** `20261007041143_inventory_stock.sql` adds the non-null stock field with a true default and preserves existing entries, metadata, RLS, and the existing per-user `lower(name)` unique index. Legacy names are not rewritten or merged; old whitespace aliases can still coexist. New/edit writes trim and collapse whitespace. Stage 4 ingredient matching should normalize names when comparing inventory with AI output.

**Checkpoint review:** Three delegated tasks implemented UI, query/hook behavior, and database changes, with independent cross-reviews and parent review. Findings resolved include StrictMode effect cleanup leaving mounted guards false, legacy uncategorized edits defaulting to Protein instead of Other, and an old migration-upgrade test retaining the simulated client role before subsequent schema changes.

**Checkpoint checks (2026-10-06):** 171 tests pass across 19 files, including 27 PostgreSQL integration tests. Node 22.23.3 and pnpm 9.15.9 were used for the final typecheck, lint, formatting, unit/integration run, and iOS Metro/Hermes export; all pass. Parent review and independent cross-reviews found no remaining Stage 3 code blockers. No native app was installed or live database migrated.

**Exit (deferred device acceptance):** Run out of an item, restock it with one toggle, restart the installed app, and see the correct availability without retyping it.

## 4. Build the smallest complete suggestion loop

Depends on reliable daily totals/logging and the inventory availability field.

- [ ] Build the prompt and request using in-stock inventory, remaining daily macros, meal type, quick-options preference, and session-only declines.
- [ ] Request exactly three suggestions; validate structure, one-serving quantities, nonnegative macros, and no more than two missing non-staple ingredients. Treat ingredient matching as a validation concern, not a reason to build a full food catalog.
- [ ] Clearly show quantities, estimated macros, time, and missing ingredients. Handle single-item suggestions without empty instruction panels.
- [ ] Define sensible behavior when a daily target is already exceeded; do not request negative portions or treat estimates as exact optimization.
- [ ] Allow individual declines and another set of suggestions, preserving session exclusions and editable controls. Preserve the previous usable results if regeneration fails.
- [ ] On selection, save the recipe once, then offer optional logging through the shared verification form. Canceling a log must not create a meal; repeated taps must not duplicate it.
- [ ] Build a basic saved list and detail screen with ingredients, instructions, and “Log this meal.” Reuse saved recipes without another AI call. Skip sort selectors and cooking-statistics UI; existing unused statistics columns can remain.
- [ ] Test prompt context, response validation, missing-ingredient limits, selection/cancel/save behavior, and totals after logging. Calibrate estimates with representative meals during personal use.

**Exit:** choose ingredients, obtain useful suggestions, understand any missing items, log a verified portion, and see updated remaining macros. Reuse a saved recipe without another generation request.

## 5. Basic history and personal release

- [ ] Show recent days with totals and meals using bounded loading/pagination; reuse meal editing/deletion. Skip charts, trends, and elaborate collapsible layouts.
- [ ] Check empty, loading, offline, and error states across the completed flows. Offline messaging must not imply unsaved data was persisted.
- [ ] Smoke-test iPad and iPhone layouts, keyboard behavior, rotation, scrolling, safe areas, and long meal/ingredient names.
- [ ] Confirm production/personal-project configuration and a repeatable native install/update process. Document how to export/back up personal data using the existing backend facilities.
- [ ] Remove remaining placeholders and reconcile README with the actual working setup. Record device/build versions and validation results here.
- [ ] Run typecheck, lint, formatting checks, unit tests, relevant database integration checks, and the device acceptance checklist below.
- [ ] Use the full loop daily for one week. Fix blockers before declaring V1 complete; record optional improvements separately.

**Exit:** the installed app supports the entire personal daily loop for a week without blocking failures or unexplained data loss. All known limitations are documented.

## Device acceptance checklist

- [ ] Fresh sign-in, cold-start restoration, and sign-out work.
- [ ] Targets and API key survive restart; target changes update Today.
- [ ] Inventory add/edit/toggle/delete persists and missing ingredients are labeled honestly.
- [ ] Manual, text, and voice logs save exactly once and appear in Today immediately.
- [ ] Re-parse replaces estimates; edit/delete adjusts totals and preserves the intended day.
- [ ] Midnight and background/foreground transitions show the correct day's data.
- [ ] Missing/invalid AI key, failed AI request, failed database write, and denied microphone permission preserve recoverable input and show clear feedback.
- [ ] Suggestions, optional logging, canceled logging, saved-recipe reuse, and historical edits work on both device sizes.

## Deferred scope

Cyberpunk redesign/animations, public distribution and onboarding, multi-user sharing, offline sync, shopping lists, barcode/photo recognition, manual recipe authoring, recipe sort modes, cooking statistics, preference learning, trend charts, push notifications, and backend prompt management.

## Execution order and reporting

Complete milestones 1–5 in order, using small reviewed commits and updating this checklist with evidence. Delegate independent tasks to subagents, review every checkpoint, and check in with the user after each stage before starting the next. Continue automated checks throughout; defer native builds, physical-device tests, live-backend validation, and dogfooding to the final validation phase, as requested. Do not call the app release-ready until that validation passes. Estimate each milestone after the foundation runs on an actual device; the original eight-to-twelve-day estimate is not a reliable remaining-work estimate.

No unresolved product decision blocks this plan. Infrastructure discovery found a likely local setup but no recovered NeonPlate credentials. Resolve live-backend and physical-device/build access at final validation before choosing or creating a release setup. Ask if those checks reveal a choice requiring a new account, paid service, replacement database, or broader product scope.
