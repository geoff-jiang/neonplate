# Personal V1 completion plan

Updated: 2026-09-17. This document is the source of truth; it supersedes the historical plans in `docs/superpowers/`.

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

The April implementation was on `origin/v1-implementation` at `6d27e41`; main originally held only plans. The September cleanup integrates that work, removes unused starter code, updates working agreements, and makes this plan authoritative. It does not implement the remaining features.

| Area | Evidence in code | Remaining work |
| --- | --- | --- |
| Foundation | Expo routes, theme, responsive layouts, Supabase migrations and policies | Native dependency/build checks, reliable auth/session lifecycle, real-device setup |
| Settings | Targets and secure API-key storage | Validation, error handling, refresh Today after changes |
| Inventory | Categorized listing and add/remove | Persistent in-stock toggle, rename/category editing, failure feedback |
| Meal logging | AI text extraction, editable verification, saves, deletion, Today totals | Manual entry, meal editing, refresh correctness, validation and retry behavior |
| Voice | Speech hook and recorder connected to extraction | Physical-device permissions, lifecycle and transcription verification |
| Suggestions | Response schema and an unfinished navigation action | Suggestion prompt/request, screen, exclusions, selection and log flow |
| Recipes / history | Tables and placeholder screens | Minimal usable views and reuse flow |
| Verification | 30 unit tests, typecheck, CI workflow | Regression coverage, database isolation checks, device smoke tests |

Baseline review: 30 tests and typecheck passed; lint had two JSX escaping errors and three unused imports, corrected during cleanup. No hosted database, native build, or end-to-end device behavior was verified in this repository review.

Cleanup validation (2026-09-17): frozen-lockfile installation with pnpm 9.15.9, typecheck, lint, formatting, and all 30 unit tests pass locally. Native builds and hosted services remain unverified.

## 1. Stabilize the existing foundation

Work from main in a short-lived branch. Keep runtime fixes separate from the documentation/cleanup integration.

- [ ] Install from the pinned lockfile; check Expo package compatibility and run a native development build. Resolve compatibility findings deliberately, without a wholesale SDK upgrade unless needed.
- [ ] Pick and verify the existing development/hosted Supabase project and personal-device build/distribution route. Record setup steps and required redirect URLs in README, without credentials. Do not create replacement infrastructure until existing setup is checked.
- [ ] Complete magic-link callback handling for both cold starts and an already-open app. Verify session restore and sign-out. Remove redundant sign-in modes only after the chosen path works.
- [ ] Give auth one shared owner rather than each consumer creating another session subscription.
- [ ] Fix `useDailyLogs`' unstable default Date dependency, which retriggers loading after renders. Use stable day boundaries and explicitly refresh on local midnight and app foreground.
- [ ] Choose one small data-refresh strategy for Today, settings, and logging. Start with shared auth plus explicit screen-focus/mutation refresh; add a query cache only if that materially simplifies the code.
- [ ] Ensure save/delete/target changes refresh visible totals and list data without reopening the app. Clear user-scoped state on sign-out.
- [ ] Expose loading and failure states; do not silently swallow failed deletes or settings reads. Prevent duplicate submissions and stale request results.
- [ ] Disable unfinished navigation actions until their destination exists.
- [ ] Test database ownership isolation with two test users across all four tables, including inserts, updates, and recipe/log associations. Verify deleting a recipe preserves its meal logs.

**Exit:** sign in on both device sizes, save targets and key, add/delete a meal, and see consistent totals with no request loop. Refresh, midnight rollover, sign-out, and failed requests behave predictably. Unit/static checks pass; database and device results are recorded.

## 2. Finish dependable logging

This makes the app useful before the suggestion feature is completed.

- [ ] Add a manual-entry action that opens the same verification form without calling AI. Offer it after AI failure too. Decide an explicit manual source value and migrate the database check constraint/types if adding it.
- [ ] Support editing existing meals from Today and later from History. Preserve their original date unless explicitly changed.
- [ ] Validate nonempty names and finite, nonnegative macro values and sensible targets. Keep empty numeric input editable rather than immediately forcing zero.
- [ ] Fix re-parse behavior: new extraction results currently do not reset the form's initial draft. Show parsing state and prevent overlapping saves/re-parses.
- [ ] Explain that macros are estimates and display assumed quantities. Keep editable confirmation mandatory for AI and recipe logs.
- [ ] Implement the intended bounded retry behavior for transient AI failures; JSON correction already exists. Separate missing key, account/request errors, network failures, and malformed output. Preserve entered text throughout.
- [ ] Verify voice on a physical device: permission allowed/denied, start/stop, editing transcript, leaving the screen while recording, retry, and correct source on save. Clean up recording on unmount.
- [ ] Add focused regression tests for validation, extraction parsing, and date/totals behavior; manually exercise the full text/manual/voice flows.

**Exit:** a meal can be added, corrected, and deleted even when AI is unavailable (with database connectivity). Use logging for two or three days and resolve blocking friction before expanding scope.

## 3. Make inventory persistent and useful

- [ ] Add `in_stock boolean not null default true` through a new migration; regenerate database types. Preserve existing entries.
- [ ] Toggle in/out of stock, edit names/categories, and retain a separate permanent delete action. Keep case-insensitive per-user uniqueness and normalize whitespace.
- [ ] Show in-stock items first, with out-of-stock items still easy to find and restore. Keep category grouping; avoid advanced filtering until needed.
- [ ] Ensure failed changes visibly revert or offer retry. Test toggling, duplicates, edits, and access isolation.
- [ ] Expose only in-stock names to suggestions. Make assumed pantry basics explicit rather than silently treating all stored inventory as available.

**Exit:** run out of an item, restock it with one toggle, restart the app, and see the correct availability without retyping it.

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

Complete milestones 1–5 in order, using small reviewed commits and updating this checklist with evidence. Estimate each milestone after the foundation runs on an actual device; the original eight-to-twelve-day estimate is not a reliable remaining-work estimate.

No unresolved product decision blocks this plan. Infrastructure availability and physical-device/build access must be checked at milestone 1 before choosing or creating a release setup. Ask if those checks reveal a choice requiring a new account, paid service, replacement database, or broader product scope.
