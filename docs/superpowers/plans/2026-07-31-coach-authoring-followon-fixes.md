# Coach Authoring Follow-On Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Important/Minor findings the Phase 8 final whole-branch
review parked or deferred: physically-realistic route-leg duration, actors
moving concurrently instead of serially, stationary actors rendering,
provenance-hash recomputation on save, finalized-row delete immutability,
and a small bundle of cosmetic/robustness cleanups.

**Architecture:** No new components, no new artifact types, no new tables.
Every fix modifies existing code in place: `coachPlayEditorCanvas.jsx`'s
route/duration math, `simulator.js`'s sample generation, `supabase.js`'s
save path, a new narrow RLS migration, and small UI/error-message polish.

**Tech Stack:** Same as the parent plan — React 18, Supabase, Node ESM, the
existing hand-rolled `.test.mjs` convention.

## Global Constraints

- Same standing guardrails as the parent plan
  (`docs/superpowers/plans/2026-07-31-coach-authoring-video-export.md`):
  free-only, no push/PR/merge without being asked, never weaken an existing
  test or gate, never bypass `compileTeachingPlay()`'s refusal.
- Design reference for every choice below:
  `docs/superpowers/specs/2026-07-31-coach-authoring-followon-fixes-design.md`
  (sections cited inline as `§N`).
- Still no live Supabase project or browser available in this worktree —
  every task's live-verification step is deferred to Thomas, same as the
  parent plan. Say so explicitly in each task's report.
- `src/scenario-engine/*.test.mjs` files use the existing hand-rolled
  `ok(name, condition)` runner, appended to `test:scenario-engine` in
  `package.json`.

---

## Task 1: Physically-realistic route-leg duration + concurrent actor start

**Files:**
- Modify: `src/coachPlayEditorCanvas.jsx:96-115` (`addRoutePointFor`)
- Modify: `src/scenario-engine/physics/hardFailureDetectors.js:32` (export
  `TELEPORT_MIN_DURATION_S`)

**Interfaces:**
- Consumes: `TELEPORT_MIN_DURATION_S` (newly exported) from
  `physics/hardFailureDetectors.js`; `U13_PHYSICS_PROFILE` (already
  imported in this file, `coachPlayEditorCanvas.jsx:26`).
- Produces: `addRoutePointFor`'s new behavior — no new exports.

- [ ] **Step 1: Export the teleportation-duration floor**

In `src/scenario-engine/physics/hardFailureDetectors.js:32`, change:

```js
const TELEPORT_MIN_DURATION_S = 0.05;
```

to:

```js
export const TELEPORT_MIN_DURATION_S = 0.05;
```

(Leave `TELEPORT_MIN_DISTANCE_M` alone — only the duration floor is needed
elsewhere.)

- [ ] **Step 2: Rewrite `addRoutePointFor`**

Replace `src/coachPlayEditorCanvas.jsx:96-115` with:

```js
import { TELEPORT_MIN_DURATION_S } from "./scenario-engine/physics/hardFailureDetectors.js"; // add to imports at top of file

function addRoutePointFor(actorId, x, y) {
  if (!isWithinBounds([x, y], NHL_200X85_PROFILE)) return;
  setDef((d) => {
    const actorsOwnActions = d.intendedActions.filter((a) => a.actorId === actorId);
    const actor = d.initialState.actors.find((a) => a.id === actorId);
    const fromPos = actorsOwnActions.length
      ? actorsOwnActions[actorsOwnActions.length - 1].toPosition
      : actor.position;
    // This actor's own waypoints still chain sequentially off their own
    // prior endTime -- but a NEWLY selected actor's first waypoint starts
    // at t=0, not after whatever an earlier-drawn actor's route reached,
    // per design doc §2 (actors move concurrently by default). This means
    // intendedActions is no longer necessarily appended in ascending
    // startTime order -- it's sorted below, at return time, so the saved
    // array always satisfies validateScenarioDefinition's global
    // non-decreasing-startTime requirement regardless of click order.
    const startTime = actorsOwnActions.length
      ? actorsOwnActions[actorsOwnActions.length - 1].endTime
      : 0;
    // Duration derived from the acceleration-from-rest model
    // detectImpossibleAcceleration actually checks (requiredAccel =
    // 2*distance/duration^2, capped at avgAccelMPS2): solving for duration
    // at exactly the cap gives the shortest physically-clean duration for
    // this distance. See design doc §1 for the full derivation.
    const dist = Math.hypot(x - fromPos[0], y - fromPos[1]);
    const accelCap = U13_PHYSICS_PROFILE.player.avgAccelMPS2.value;
    const duration = Math.max(TELEPORT_MIN_DURATION_S, Math.sqrt((2 * dist) / accelCap));
    const endTime = startTime + duration;
    const newAction = { actorId, kind: "skate", startTime, endTime, toPosition: [x, y] };
    const intendedActions = [...d.intendedActions, newAction].sort((a, b) => a.startTime - b.startTime);
    return { ...d, intendedActions };
  });
}
```

Note this also fixes a latent bug in the pre-existing code: the old version
always measured distance `fromPos` as the CLICKED position rather than each
actor's own last placed point when a `removeActor` call had shifted indices
— re-deriving `fromPos` from `actorsOwnActions`/`actor.position` here is the
same approach the old code already used (`existing` filter), just renamed
for clarity; this is not a behavior change from before, only the
timing/duration formula changed.

- [ ] **Step 3: Hand-trace the fix against three scenarios**

No live app available — verify by tracing the logic yourself and writing
the trace into your report:
1. Single actor, 3 waypoints 10m apart each: confirm each leg's duration is
   `sqrt(2*10/4.13) ≈ 2.2s`, each `startTime` chains off the previous
   `endTime`, sequence is `0, 2.2, 4.4`.
2. Two actors, interleaved (A one waypoint 5m away, B one waypoint 8m away,
   A a second waypoint 5m away): confirm A's first leg is `startTime: 0`,
   B's leg is ALSO `startTime: 0` (concurrent), A's second leg is
   `startTime: <A's first leg's endTime>`. Confirm the final sorted array is
   non-decreasing in `startTime` (A@0, B@0, A@<A's first endTime> — order of
   the two `startTime: 0` entries doesn't matter, sort is stable enough that
   validation only cares about non-decreasing, not strict ordering between
   equal values).
3. A single very-short click (sub-1m distance): confirm `duration` floors at
   `TELEPORT_MIN_DURATION_S` (0.05s) via the `Math.max`, not a near-zero
   value that would itself trip `detectTeleportation`.

- [ ] **Step 4: Build check**

Run: `npx vite build`
Expected: succeeds, no new errors.

- [ ] **Step 5: Run the scenario-engine suite**

Run: `npm run test:scenario-engine`
Expected: all pass (this task doesn't touch test files, but confirms the
`hardFailureDetectors.js` export change didn't break anything).

- [ ] **Step 6: Commit**

```bash
git add src/coachPlayEditorCanvas.jsx src/scenario-engine/physics/hardFailureDetectors.js
git commit -m "fix(coach-authoring): physically-realistic route duration, concurrent actor start"
```

---

## Task 2: Stationary (routeless) actors render in preview/export

**Files:**
- Modify: `src/scenario-engine/physics/simulator.js`
- Modify: `src/scenario-engine/physics/simulator.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `simulate()`'s returned `trace.samples` now includes a static
  sample for every actor with zero action-derived samples. No signature
  change.

- [ ] **Step 1: Read the current end of `simulate()`'s sample-building loop**

Read `src/scenario-engine/physics/simulator.js` from the `def.intendedActions.forEach(...)` loop (starts ~line 137) through wherever `samples`/`findings` are finalized before being returned in the trace object (the `return Object.freeze({... samples, ...})` near the end). Confirm the exact variable names before editing — do not assume the line numbers above are exact.

- [ ] **Step 2: Write the failing test**

This file already has a `baseDefinition(overrides = {})` fixture helper
(`simulator.test.mjs:22-51`) building a real 4-actor `dz-breakout`
definition, plus a module-level `u13Profile` (loaded from
`./profiles/u13.json`, `simulator.test.mjs:13`) — reuse both rather than
inventing a new fixture. `baseDefinition()`'s default `intendedActions` is
already `[]`, and its actors are `D1` (puckCarrier), `W1` (support), `F1`/
`F2` (defenders, `away` team) — `F2` is a real actor already present in the
base fixture that gets ZERO `intendedActions` in every existing test case
in this file (every existing case only ever gives `D1` an action), so it is
already, silently, the exact routeless-actor case this fix targets. Append:

```js
// F2 never gets an intendedAction in ANY case in this file (including the
// base fixture's default []) -- it's the existing routeless-actor case,
// which every prior test in this file passed without checking. Confirms
// the new fallback sample fires for a real fixture actor, not a
// hand-invented one.
{
  const def = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 2, toPosition: D1_ESCAPE }],
  });
  const trace = await simulate(def, u13Profile);
  const f2Samples = trace.samples.filter((s) => s.actorId === "F2");
  ok("routeless actor F2 gets at least one sample", f2Samples.length >= 1);
  ok("F2's sample sits at their initial position", f2Samples[0].pos[0] === F2_POS[0] && f2Samples[0].pos[1] === F2_POS[1]);
  ok("F2's sample is at t=0", f2Samples[0].t === 0);
  const d1Samples = trace.samples.filter((s) => s.actorId === "D1");
  ok("D1 (who has a real action) is unaffected -- still has action-derived samples", d1Samples.length >= 1);
}
```

- [ ] **Step 3: Run it, confirm it fails**

Run: `node src/scenario-engine/physics/simulator.test.mjs`
Expected: FAIL — `F2` has zero samples.

- [ ] **Step 4: Implement the fallback**

After the `def.intendedActions.forEach(...)` loop finishes (and before the
`findings`/`samples` are frozen into the returned trace object), add:

```js
// An actor with no intendedActions produces zero action-derived samples
// and would otherwise be invisible to every consumer that derives "which
// actors exist" from trace.samples (playbackClock.js's frameAt, the
// Remotion export composition) -- a placed-but-routeless actor (a
// stationary goalie, an off-puck defender who's part of the read) must
// still render. One static sample at their initial position, held for the
// whole play via playbackClock's own clamp-to-nearest-sample behavior.
// Never interacts with any hard-failure detector -- those walk
// def.intendedActions directly, never trace.samples.
for (const actor of def.initialState.actors) {
  const hasSample = samples.some((s) => s.actorId === actor.id);
  if (!hasSample) {
    samples.push({ t: 0, pos: [round6(actor.position[0]), round6(actor.position[1])], actorId: actor.id });
  }
}
```

Place this using the actual local variable names you found in Step 1 (the
array might be named `samples`, and there should already be a `round6`
helper in scope — reuse it, don't reimplement rounding).

- [ ] **Step 5: Run the test, confirm it passes**

Run: `node src/scenario-engine/physics/simulator.test.mjs`
Expected: all PASS, 0 failed.

- [ ] **Step 6: Run the full scenario-engine suite**

Run: `npm run test:scenario-engine`
Expected: all pass — confirms this doesn't affect any existing fixture
where every actor already has an action.

- [ ] **Step 7: Commit**

```bash
git add src/scenario-engine/physics/simulator.js src/scenario-engine/physics/simulator.test.mjs
git commit -m "fix(scenario-engine): stationary actors get a static sample so they render"
```

---

## Task 3: Provenance hash recomputed on every save

**Files:**
- Modify: `src/coachPlayEditorCanvas.jsx` (`handleSave`, and the initial
  `blankScenarioDefinition()` in `src/coachPlayAuthoring.jsx` if it sets a
  non-null placeholder)

**Interfaces:**
- Consumes: `versionedContentHash` from
  `./scenario-engine/canonicalHash.js` (already used elsewhere in the
  scenario-engine, e.g. `compiledTeachingPlay.js`); `SCENARIO_DEFINITION_SCHEMA_VERSION`
  from `./scenario-engine/scenarioDefinition.js`.
- Produces: `handleSave` now writes a real `contentHash` and increments
  `version` on every save, not just `revision`.

Read `src/scenario-engine/canonicalHash.js`'s actual `versionedContentHash(kind, version, value)` signature and `src/scenario-engine/promotedArtifact.js`'s hashing pattern (lines ~26-46: it excludes volatile metadata like `promotedAt` from the hashed payload) before implementing — follow that same idempotency precedent: the definition's `contentHash` should reflect its own content fields, excluding `contentHash` itself (circular) and `version` (which increments independently of content — two saves with identical content but different version numbers should still be recognizable as "the same content," matching the promoted-artifact convention).

- [ ] **Step 1: Read the current `handleSave` in `coachPlayEditorCanvas.jsx`**

Confirm its exact current shape (it calls `updateCoachPlayDraft(draftId, revision, def)`) before editing.

- [ ] **Step 2: Add a contentHash/version recompute before every save**

In `handleSave`, before calling `updateCoachPlayDraft`, add:

```js
import { versionedContentHash } from "./scenario-engine/canonicalHash.js";
import { SCENARIO_DEFINITION_SCHEMA_VERSION } from "./scenario-engine/scenarioDefinition.js";

// ...inside handleSave, before the updateCoachPlayDraft call:
const { contentHash: _omit, version: _omitVersion, ...hashableFields } = def;
const contentHash = await versionedContentHash("scenario-definition", SCENARIO_DEFINITION_SCHEMA_VERSION, hashableFields);
const nextDef = { ...def, contentHash, version: (def.version ?? 1) + (contentHash === def.contentHash ? 0 : 1) };
```

Then pass `nextDef` (not the raw `def`) to `updateCoachPlayDraft`, and update
local `def` state from the result the same way `revision` is already
updated from the save response. The `version` bump only happens when the
hash actually changed (matching the promoted-artifact "identical content is
a genuine no-op" precedent) — a save with no real content change (e.g. a
race that resaved the same state) doesn't inflate the version number for
no reason.

- [ ] **Step 3: Hand-trace two scenarios**

Since there's no live app: trace through the code for (a) a save where the
coach actually changed something (added a waypoint) — confirm `contentHash`
differs from the previous saved value and `version` increments; (b) a
hypothetical no-op save with identical `def` content — confirm `contentHash`
matches the prior value and `version` does NOT increment. Write both traces
into your report.

- [ ] **Step 4: Build check**

Run: `npx vite build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/coachPlayEditorCanvas.jsx
git commit -m "fix(coach-authoring): recompute contentHash and bump version on every real save"
```

---

## Task 4: Finalized rows are immutable but currently still deletable

**Files:**
- Create: `supabase/migration_0021_coach_play_drafts_delete_restriction.sql`

**Interfaces:**
- Produces: a narrowed delete policy on `coach_play_drafts` — no schema
  change, no new columns.

- [ ] **Step 1: Read the current policy shape**

Read `supabase/migration_0020_coach_play_drafts.sql`'s current `"coach
manages own team drafts"` policy (a single `for all` policy) to confirm the
exact `using`/`with check` predicate you need to narrow, and its own
`drop policy if exists` idempotent-migration convention (matches
`migration_0017`/`migration_0019`) — follow the same style.

- [ ] **Step 2: Write the migration**

Create `supabase/migration_0021_coach_play_drafts_delete_restriction.sql`:

```sql
-- Narrow coach_play_drafts' delete access: a finalized row is meant to be
-- durable proof (immutable via the existing before-update trigger), but the
-- original "coach manages own team drafts" for-all policy still permitted
-- DELETE on a finalized row -- for-all covers every command, and the
-- immutability trigger only guards UPDATE. Split delete out into its own
-- policy, restricted to status = 'draft'.
-- See docs/superpowers/plans/2026-07-31-coach-authoring-followon-fixes.md
-- Task 4 and the final-review finding it fixes.

drop policy if exists "coach manages own team drafts" on public.coach_play_drafts;

create policy "coach manages own team drafts" on public.coach_play_drafts
  for select using (
    auth.uid() = coach_id
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
    and exists (select 1 from public.coach_play_drafts_allowlist a where a.coach_id = auth.uid())
  );

create policy "coach inserts own team drafts" on public.coach_play_drafts
  for insert with check (
    auth.uid() = coach_id
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
    and exists (select 1 from public.coach_play_drafts_allowlist a where a.coach_id = auth.uid())
  );

create policy "coach updates own team drafts" on public.coach_play_drafts
  for update using (
    auth.uid() = coach_id
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
    and exists (select 1 from public.coach_play_drafts_allowlist a where a.coach_id = auth.uid())
  ) with check (
    auth.uid() = coach_id
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
    and exists (select 1 from public.coach_play_drafts_allowlist a where a.coach_id = auth.uid())
  );

create policy "coach deletes own draft-status team drafts" on public.coach_play_drafts
  for delete using (
    auth.uid() = coach_id
    and status = 'draft'
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
    and exists (select 1 from public.coach_play_drafts_allowlist a where a.coach_id = auth.uid())
  );
```

(Note: multiple permissive policies for the SAME command on the same table
are OR'd together in Postgres RLS — but here each of select/insert/update/
delete has exactly ONE policy governing it, so there's no OR-composition
risk. This mirrors the same care Task 3's original allowlist-policy fix
took.)

- [ ] **Step 3: Self-review by inspection (no live DB, same constraint as every prior migration task)**

Answer explicitly in your report: does splitting the single `for all`
policy into four separate policies preserve EXACTLY the same access for
select/insert/update as before (same three-condition predicate, just
duplicated across policies instead of one shared block)? Does the new
delete policy add exactly one more condition (`status = 'draft'`) on top of
the same three, with no accidental loosening?

- [ ] **Step 4: Commit**

```bash
git add supabase/migration_0021_coach_play_drafts_delete_restriction.sql
git commit -m "fix(supabase): restrict coach_play_drafts delete to draft-status rows only"
```

Note: like migration_0020, this is applied out-of-band by Thomas against a
real Supabase project — say so explicitly in your report.

---

## Task 5: Minor cleanups bundle

**Files:**
- Modify: `src/coachPlayEditorCanvas.jsx` (puckless precheck)
- Modify: `src/supabase.js` (`finalizeCoachPlayDraft` — bump `updated_at`)
- Modify: `src/App.jsx` (collapse the duplicated `canAccess` conditional)
- Modify: `src/coachPlayEditorCanvas.jsx`, `src/coachPlayAuthoring.jsx`
  (swap raw HTML controls for `shared.jsx` primitives where a direct
  equivalent exists)

**Interfaces:** No new exports; purely internal polish.

- [ ] **Step 1: Puckless precheck**

In `handlePreview` and `handleFinalize` (both in `coachPlayEditorCanvas.jsx`),
before calling `simulate()`, add a check:

```js
if (!def.initialState.puck) {
  setPreviewError("Place the puck before previewing."); // or setFinalizeError, matching whichever handler
  return;
}
```

Read both handlers' current shape first — match their existing early-return
style (they likely already have a similar "select a declared actor" guard
from Tasks 6/7 — mirror that pattern exactly).

- [ ] **Step 2: `finalizeCoachPlayDraft` bumps `updated_at`**

In `src/supabase.js`'s `finalizeCoachPlayDraft`, add `updated_at: new
Date().toISOString()` to the `.update({...})` payload, alongside the
existing `status`/`compiled_artifact`/`finalized_at` fields.

- [ ] **Step 3: Collapse the duplicated `canAccess` conditional in `App.jsx`**

Read the current state of the two adjacent blocks (added across Task 9 of
the parent plan — one wraps `CoachPlayAuthoringSection`, one wraps
`CoachTrainingSection`, both gated on the identical
`canAccess("coachDashboard", subscriptionTier || "FREE").allowed`
condition). Collapse into one:

```jsx
{canAccess("coachDashboard", subscriptionTier || "FREE").allowed && (
  <>
    <CoachPlayAuthoringSection teamId={t.id} coachId={profile.id} roster={roster}/>
    <CoachTrainingSection teamId={t.id} roster={roster}/>
  </>
)}
```

- [ ] **Step 4: Swap raw HTML controls for shared primitives where a direct equivalent exists**

Read `src/shared.jsx`'s actual exports (confirm exact names —
`PrimaryBtn`/`SecBtn` were named in the review as likely candidates, verify
before using). In `coachPlayEditorCanvas.jsx` and `coachPlayAuthoring.jsx`,
replace raw `<button>` elements with the shared button primitive(s) where
one exists with equivalent behavior (onClick, disabled, children) — do NOT
force a swap for `<input>`/`<select>` if `shared.jsx` has no direct
equivalent for those; only convert what has a real match. This is cosmetic
polish, not a rewrite — don't change any handler logic, only the rendered
element/import.

- [ ] **Step 5: Build check**

Run: `npx vite build`
Expected: succeeds, no new errors, no missing-import errors from the
`shared.jsx` swap.

- [ ] **Step 6: Run the full scenario-engine suite**

Run: `npm run test:scenario-engine`
Expected: all pass (this task shouldn't touch scenario-engine files at all,
confirms no accidental cross-contamination).

- [ ] **Step 7: Commit**

```bash
git add src/coachPlayEditorCanvas.jsx src/supabase.js src/App.jsx src/coachPlayAuthoring.jsx
git commit -m "polish(coach-authoring): puckless precheck, updated_at bump, dedup gate, shared UI primitives"
```

---

## Explicitly out of scope (per the design doc, not solved here)

- Per-actor start-time offsets (deliberately staggered/delayed motion).
- Turning-radius/board-contact-aware route suggestions or auto-correction.
- Any live Supabase/browser verification — still Thomas's, unchanged.
