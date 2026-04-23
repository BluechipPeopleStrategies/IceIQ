# Ice-IQ Consistency Audit

Read-only audit of the Ice-IQ codebase (React + Vite, Supabase, Vercel).
Conducted against the conventions in [CLAUDE.md](CLAUDE.md) — inline styles
and monolithic `src/App.jsx` are **intentional** and not flagged.

---

## Executive summary

| Severity | Count |
|---|---:|
| HIGH   | 5  |
| MED    | 15 |
| LOW    | 5  |
| Total  | 25 |

### Top 5 themes

1. **Auth gating has gaps.** Tier override bypassable without dev bypass; coach dashboard gated only at render; no client-side verification that `coach.id === currentUserId` before RLS-protected writes. Server RLS is the real safety net — client UX around it is inconsistent.
2. **Data layer duplication + inconsistent shapes.** Supabase getters return different shapes (`null` vs `{}` vs `{ratings, notes}`); localStorage wrappers are re-implemented in 6+ utils; error handling ranges from throw → console.error fallback → silent swallow with no documented rule.
3. **Repo-root hygiene.** 24+ orphaned JSON/txt files, 5 misplaced root scripts, one broken `npm run audit-u13` reference, and a committed `.env` file.
4. **Styling tokens missing.** `#CF4520` hardcoded in 5 spots instead of `C.purple`; `borderRadius` values (8/10/12/16) appear 200+ times without semantic tokens; primary gradient duplicated 4×.
5. **Error handling inconsistency.** `alert()` for user-facing errors (blocks UI); 40+ `try { } catch {}` silent swallows; debug `console.log` left behind.

### Three things to fix first (one-night punch list)

1. **Remove `.env` from repo + rotate Supabase anon key** (HIGH, security).
2. **Gate `iceiq_tier_override` behind `isDevBypassEnabled()`** so a production user can't flip themselves to TEAM tier via DevTools (HIGH).
3. **Delete or archive the 24 orphaned root files + move 5 stray scripts to `tools/`** (MED, but 15-minute cognitive-load win for the whole repo).

---

## HIGH-severity findings

### H-1 · `.env` committed to repository
- **Category:** Config & Env · **Effort:** M
- **File:** `/c/Users/mtsli/IceIQ/.env`
- **Issue:** `.env` containing `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` is checked into git. While `anon` keys are designed for client-side use and RLS is the real guardrail, committing any API credentials is a security smell — and anon keys still identify the project to attackers looking for RLS misconfigurations.
- **Fix:** Add `.env` to `.gitignore`, run `git rm --cached .env`, rotate the anon key in Supabase, and commit a `.env.example` template. Rewrite history if the project is public-facing.
- **Evidence:** `src/supabase.js:3-4` reads from `import.meta.env.VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

### H-2 · Tier override bypassable from DevTools
- **Category:** Auth & Permissions · **Effort:** S
- **Files:** [src/App.jsx:37-45](src/App.jsx#L37)
- **Issue:** `resolveTier()` reads `localStorage.iceiq_tier_override` unconditionally. Any user can open DevTools, run `localStorage.setItem("iceiq_tier_override","TEAM")`, refresh, and reach the coach dashboard. RLS will block backend writes, but UI state (SMART goals, weekly challenge, Pro features) renders as if upgraded.
- **Fix:** Gate the override read on `isDevBypassEnabled()` from `src/utils/devBypass.js` so only dev-bypass sessions can use it.

### H-3 · Coach dashboard gated at render, not at role creation
- **Category:** Auth & Permissions · **Effort:** M
- **Files:** [src/App.jsx:5510-5531](src/App.jsx#L5510)
- **Issue:** The `if (profile.role === "coach")` branch renders a tier-denial card if not TEAM. But any path that creates a profile with `role=coach` (demo, signup, dev) reaches this branch first. A non-TEAM user who assigns themselves a coach role sees the denial card and could script around it. RLS protects writes, but the UI story is "we tell you no" instead of "you can't even try."
- **Fix:** Gate coach-role assignment earlier — block the signup/onboarding step from picking `coach` unless TEAM tier is resolved.

### H-4 · No client-side coach verification before RLS-protected save
- **Category:** Error Handling + Auth · **Effort:** S
- **Files:** [src/App.jsx:5810-5811](src/App.jsx#L5810)
- **Issue:** `SB.saveCoachRatingsForPlayer(coach.id, player.id, ...)` is called with `coach.id` pulled from `profile` without verifying it matches the authenticated user. RLS rejects silently if `auth.uid() !== coach_id`, and the rejection surfaces only as `alert(e.message)` — no helpful user-facing context.
- **Fix:** Verify `coach.id === session.user.id` before the SB call; throw with context if mismatch; replace `alert` with a proper error card that explains the likely cause ("Your session may have expired — try signing in again").

### H-5 · Broken npm script references missing file
- **Category:** Routing & File Structure (but really config hygiene) · **Effort:** S
- **Files:** [package.json:10](package.json#L10)
- **Issue:** `"audit-u13": "node audit_u13.mjs"` — the referenced file does not exist. Running `npm run audit-u13` immediately errors out. Either the script was renamed (likely → `audit_demo_types.mjs` / `audit_scope.mjs` at root?) or removed without updating package.json.
- **Fix:** Delete the script entry. If the intent still exists, rewrite it to point to the surviving audit script in `tools/quality-scan.mjs`.

---

## MED-severity findings

### M-1 · Inconsistent Supabase error-handling patterns
- **Category:** Data Layer · **Effort:** M
- **Files:** [src/supabase.js:167](src/supabase.js#L167), [:216](src/supabase.js#L216), [:269](src/supabase.js#L269), [:278](src/supabase.js#L278), [:303](src/supabase.js#L303), [:326](src/supabase.js#L326)
- **Issue:** Three different patterns in one file: (a) throw on error (`saveGoal`, `saveCoachRatingsForPlayer`), (b) `console.error` + return fallback (`reportQuestion`, `getQuestionReports`), (c) silent swallow (`recordQuestionAnswer`, `recordQuestionAnswersBatch`). Callers can't predict behavior.
- **Fix:** Adopt a rule: writes throw; reads return `{ data, error }` or a sentinel; silent only for telemetry with a comment explaining why.

### M-2 · Inconsistent return shapes in Supabase getters
- **Category:** Data Layer · **Effort:** M
- **Files:** [src/supabase.js:68](src/supabase.js#L68), [:172](src/supabase.js#L172), [:195](src/supabase.js#L195), [:220](src/supabase.js#L220)
- **Issue:** `getProfile` → `data | null`; `getPlayerGoals` → `{}`; `getSelfRatings` → `{}`; `getCoachRatingsForPlayer` → `{ ratings, notes }`. Callers unwrap differently.
- **Fix:** Standardize — either all return the raw object or all wrap `{ data, error }`.

### M-3 · localStorage wrappers scattered across 6+ files
- **Category:** Data Layer · **Effort:** M
- **Files:** [src/App.jsx:175-180](src/App.jsx#L175), [src/utils/profiles.js:15-21](src/utils/profiles.js#L15), [src/utils/devBypass.js:16](src/utils/devBypass.js#L16), [src/utils/seasonPass.js:14](src/utils/seasonPass.js#L14), [src/utils/deviceLock.js:16](src/utils/deviceLock.js#L16), [src/utils/trainingLog.js:4](src/utils/trainingLog.js#L4)
- **Issue:** Each utility re-implements its own `try{}catch{}` localStorage wrapper. No single source of truth. Also means the `JSON.parse` protection varies by file.
- **Fix:** Extract `src/utils/storage.js` with `lsGet`, `lsSet`, `lsGetJSON`, `lsSetJSON`; have all utils import from there.

### M-4 · `JSON.parse` without try/catch
- **Category:** Data Layer · **Effort:** S
- **Files:** [src/utils/rinkProgress.js:29](src/utils/rinkProgress.js#L29), [src/utils/depthChart.js:49](src/utils/depthChart.js#L49), [src/utils/weeklyChallenge.js:94](src/utils/weeklyChallenge.js#L94), [:116](src/utils/weeklyChallenge.js#L116)
- **Issue:** Corrupted localStorage (quota overflow, half-written JSON, extension interference) can crash the app.
- **Fix:** Route all through the centralized `lsGetJSON` from M-3 (automatic try/catch).

### M-5 · 24+ orphaned files in repo root
- **Category:** Routing & File Structure · **Effort:** S
- **Files:** `batch2_*.json` (10), `output2_*.json` (10), `truncated_*.json` (2), `u13_*.json` (3), `u13_bluelinereads_rewrite.txt`, `u15_rewrite_request.txt`, `correct_answers_to_rewrite.txt`, `rewrite_manifest.txt`
- **Issue:** Zero references from `src/` or `tools/`. Temp data-processing artifacts from earlier quality passes (dates April 17-18).
- **Fix:** Move to `archive/` or delete. Add `.gitignore` entries for future temp patterns (`batch*.json`, `output*.json`).

### M-6 · Root-level scripts outside the `tools/` convention
- **Category:** Routing & File Structure · **Effort:** S
- **Files:** `/_check.js`, `/_check2.cjs`, `/audit_demo_types.mjs`, `/audit_scope.mjs`, `/build_batches2.mjs`, `/build_output.cjs`
- **Issue:** All production scripts live in `tools/`. These root scripts violate the convention and are hard to find.
- **Fix:** Move surviving scripts into `tools/`; delete dead ones.

### M-7 · Demo / ephemeral ID variants inconsistent
- **Category:** Auth & Permissions · **Effort:** M
- **Files:** [src/App.jsx:46](src/App.jsx#L46), [src/utils/devBypass.js:11](src/utils/devBypass.js#L11)
- **Issue:** Six variants: `__demo__`, `__demo_coach__`, `__dev__`, `__dev_coach__`, `__preview__`, `__coach__`. `resolveTier` and `isEphemeralPlayer` handle different subsets. Unclear which marker gets what tier/flags.
- **Fix:** Consolidate to 2–3 documented IDs (e.g., `__demo_player__`, `__demo_coach__`, `__dev_bypass__`). Update all callers.

### M-8 · `alert()` for feature-level errors
- **Category:** Error Handling · **Effort:** M
- **Files:** [src/App.jsx:4945](src/App.jsx#L4945), [:5816](src/App.jsx#L5816)
- **Issue:** Create-team failure and coach-form save failure surface as `alert(e.message)`. Raw Supabase error text is user-hostile; alert blocks UI.
- **Fix:** Replace with toast or inline error card; map known RLS errors to friendly messages.

### M-9 · Silent `try { } catch {}` in 40+ places
- **Category:** Error Handling · **Effort:** M
- **Files:** Repeated across `src/App.jsx`, `src/screens.jsx`, `src/utils/*.js`. Examples: [src/App.jsx:5401](src/App.jsx#L5401) (streak save swallow), [src/utils/depthChart.js:54](src/utils/depthChart.js#L54) (depth-chart persist swallow).
- **Issue:** Silent catches hide localStorage quota overflow, corrupted state, SB downtime. No telemetry.
- **Fix:** Either log (`catch (e) { console.warn("<operation> failed:", e.message); }`) or annotate why silent is intended (e.g. "// private mode — fine to drop").

### M-10 · Hardcoded `#CF4520` instead of `C.purple`
- **Category:** Styling · **Effort:** S
- **Files:** [src/App.jsx:141](src/App.jsx#L141), [:303](src/App.jsx#L303), [:333](src/App.jsx#L333), [:5703](src/App.jsx#L5703), [src/screens.jsx:827](src/screens.jsx#L827)
- **Issue:** The brand secondary `#CF4520` appears inline in 5 gradients. `C.purple` in `shared.jsx:15` is exactly `"#CF4520"` — single source of truth exists but isn't used.
- **Fix:** Replace all `#CF4520` with `${C.purple}` in the gradient template strings.

### M-11 · `borderRadius` tokens missing
- **Category:** Styling · **Effort:** M
- **Files:** `src/App.jsx`, `src/widgets.jsx`, `src/screens.jsx`
- **Issue:** 200+ hardcoded borderRadius values: `8` (54×), `10` (37×), `12` (25×), plus 20/16/14/6/4/999. No semantic mapping.
- **Fix:** Add `radius: { sm:8, md:10, lg:12, xl:16, round:999 }` to `C` in `shared.jsx` and migrate over time.

### M-12 · Duplicated padding/spacing values
- **Category:** Styling · **Effort:** M
- **Files:** `src/App.jsx`, `src/widgets.jsx`
- **Issue:** `padding:".65rem .85rem"`, `".85rem 1rem"`, `".9rem"`, `"1.1rem"` all repeated 20+ times without centralization.
- **Fix:** Define a spacing scale in `shared.jsx`; reference it. Lower priority than M-11 (radii at least have a named convention).

### M-13 · Duplicated primary gradient
- **Category:** Styling · **Effort:** S
- **Files:** [src/App.jsx](src/App.jsx) (multiple), [src/screens.jsx:827](src/screens.jsx#L827), [src/widgets.jsx:45](src/widgets.jsx#L45)
- **Issue:** `linear-gradient(135deg, ${C.gold}, #CF4520)` appears 4+ times.
- **Fix:** Export `C.gradientPrimary` in `shared.jsx`; reuse.

### M-14 · Mixed export styles in `shared.jsx`
- **Category:** Component Patterns · **Effort:** S
- **Files:** [src/shared.jsx](src/shared.jsx)
- **Issue:** Some primitives are `export const Screen = (...) =>`, others are `export function IceIQLogo(...)`. Rest of codebase uses `export function`.
- **Fix:** Standardize to `export function ComponentName(...)` in `shared.jsx`.

### M-15 · No shared data-shape definitions
- **Category:** Types · **Effort:** M
- **Files:** `src/App.jsx`, `src/screens.jsx`, `src/utils/*`
- **Issue:** The "player" object is constructed inline in 10+ places with slightly different fields (sometimes `id+name`, sometimes with `quizHistory`, sometimes with `iq`, sometimes with `__dev`). No central shape.
- **Fix:** Add JSDoc `@typedef` blocks in `src/utils/types.js` for Player / Coach / Team / Session. Not full TS, but agreed shapes reduce drift.

---

## LOW-severity findings

### L-1 · `console.log` left in production code
- **Category:** Error Handling · **Effort:** S
- **Files:** [src/App.jsx:1547-1549](src/App.jsx#L1547) ("Quiz useEffect running"), [src/App.jsx:5311](src/App.jsx#L5311) ("[Ice-IQ] Dev bypass active" — already gated by dev check, OK)
- **Fix:** Delete 1547–1549. Leave 5311.

### L-2 · Duplicate `getCoachRatingsForPlayer` call for same player
- **Category:** Data Layer · **Effort:** S
- **Files:** [src/App.jsx:2741](src/App.jsx#L2741), [:5794](src/App.jsx#L5794)
- **Issue:** Same player ratings fetched twice per session (profile load + coach form open).
- **Fix:** Cache on the app-level or pass via props.

### L-3 · Generic `const data` in QuestionReviewScreen
- **Category:** Naming · **Effort:** S
- **Files:** [src/screens.jsx:1017](src/screens.jsx#L1017)
- **Fix:** Rename to `reviewQuestions`.

### L-4 · Inconsistent callback-prop naming (`onNav` vs `onNavigate`)
- **Category:** Component Patterns · **Effort:** S
- **Files:** `src/App.jsx`, `src/screens.jsx`, `src/widgets.jsx`
- **Issue:** `onNav`, `onNavigate`, `onTap`, `onClick`, `onAction`, `onX` — all roughly interchangeable but inconsistently applied.
- **Fix:** Pick one style (e.g. `onX` for semantic actions, `onClick` for raw DOM) and document.

### L-5 · Minimal JSDoc coverage
- **Category:** Types · **Effort:** M
- **Files:** `src/utils/*`
- **Fix:** Low priority. Add JSDoc on exports as you touch files, not as a sweep.

---

## Cross-cutting patterns (systemic fixes)

Three issues above surface the same root pattern — a **missing centralized data/storage/error layer**. Rather than fix each findings one-at-a-time:

### Pattern A — "Storage + data layer needs a single module"
M-1, M-2, M-3, M-4 all point to this. **Single fix:** create `src/utils/storage.js` (localStorage wrappers with try/catch + JSON safety) and normalize `src/supabase.js` return shapes in one pass. This collapses 4 MED findings into one M-sized sweep.

### Pattern B — "Tier/role gating is checked at render, not at entry"
H-2, H-3, H-4, M-7 all surface the same problem: gating is scattered across the render tree, so multiple paths can reach a privileged code region and only then discover "you can't be here." **Single fix:** a central `gate(tier, feature)` helper at each route boundary (hash route handler, screen switch) that redirects before render rather than denying in render. Collapses 3 HIGH + 1 MED finding.

### Pattern C — "Styling tokens half-extracted"
M-10, M-11, M-12, M-13 all say the same thing: `C` has colors + fonts but not radii, spacing, or gradients. **Single fix:** extend `C` in `shared.jsx` to include `radius`, `space`, and `gradient` sub-maps, then run `replace_all` sweeps file-by-file. Collapses 4 MED findings.

### Pattern D — "Root-of-repo hygiene is drifting"
H-5, M-5, M-6 all point at the repo root. **Single fix:** one "janitor" commit that deletes orphans, moves scripts to `tools/`, fixes package.json, and tightens `.gitignore`. 15 min of work.

---

## What this audit did NOT cover

See [AUDIT_NOTES.md](AUDIT_NOTES.md) for assumptions, skipped areas, and items needing human clarification.
