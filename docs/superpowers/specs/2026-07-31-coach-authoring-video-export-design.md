# Coach Authoring & Video Export — Design

**Status:** Draft — for Thomas's review. Phase 8 does not start until this is approved.
**Prepared:** 2026-07-31
**Scope:** Phase 7 of `docs/superpowers/plans/2026-07-29-scenario-engine-foundation-plan.md`
— design only, no code in this doc's own scope.

## Authority

Same authority chain as the parent plan. This doc does not reopen any of the 5 owner
decisions or 9 framework-fit decisions in
`docs/factory/SCENARIO-ENGINE-DECISIONS.md`; it settles the specifics those decisions
explicitly deferred to Phase 7 (decision 2, decision 5, framework-fit decisions 4-7).

## Correction to the parent plan's premise

The parent plan (written 2026-07-29) assumes `src/scenario-engine/` does not exist yet
and Phase 7 is "design only, no code." As of today (2026-07-31) that directory is
already built and actively developed: `scenarioDefinition.js`, `compiledTeachingPlay.js`,
`decisionEvaluation.js`, `canonicalHash.js`, `playbackClock.js`, `rinkFrame.js`, plus
`breakout/`, `physics/`, `tactics/` submodules, each with a co-located test, wired into
`npm run test:scenario-engine`. This changes nothing about what Phase 7 needs to decide,
but it means Phase 7 is designing against a real, load-bearing artifact contract rather
than a hypothetical one — and that contract already anticipates coach authorship:
`scenarioDefinition.js` ships `proofMode: "coach-declared"` as a first-class value
alongside `"kernel-derived"` and `"approved-claim-derived"`. This design builds on that
existing hook rather than inventing a parallel one.

## 1. Editor surface — confirmed mount point

The "TEAM coach dashboard" named in decision 4 is not a single component; it's
`CoachHome` in `src/App.jsx`, which renders one expanded `<Card>` per team the coach
owns, with existing coach-authored-content sections mounted as siblings:

```
src/App.jsx:7484-7500 (inside {expanded && (...)}, per-team card):
  <CoachTeamAnalyticsSection roster={roster}/>
  <CoachAssignmentsSection teamId={t.id} coachId={profile.id} roster={roster}/>
  <CoachChallengeSection teamId={t.id} coachId={profile.id} teamLevel={t.level} roster={roster}/>
  {canAccess("coachDashboard", subscriptionTier || "FREE").allowed && (
    <CoachTrainingSection teamId={t.id} roster={roster}/>
  )}
```

New section, same convention: `CoachPlayAuthoringSection` at `src/coachPlayAuthoring.jsx`
(new file, following the existing flat `src/*.jsx` naming for coach sections — matches
`assignments.jsx`, `teamChallenges.jsx`, `coachAnalytics.jsx`, `trainingLogCoach.jsx`).
Mounted at `App.jsx:7500` (after `CoachChallengeSection`), same `{teamId, coachId,
roster}` props, gated behind the same `canAccess("coachDashboard", ...)` tier check
already wrapping `CoachTrainingSection` — no new entitlement mechanism needed at the
route level (see §4 for why this alone is not sufficient for the write path).

The collapsed-card quick-access chip row (`App.jsx:7469-7482`, currently
`💪Training / 📋Homework / 🏆Challenges / 📊Analytics`) gets a 5th chip, `🎬 Plays`,
that expands the card to the same section — following the existing pattern exactly,
no new navigation concept.

`assignments.jsx` is the closest structural analog (coach creates content for the
roster to consume) and is the reference implementation to follow for the new file's
shape (props, data-fetching, save flow).

## 2. Editor interaction model

Per decision 6 (already settled, restated here for completeness): a top-down schematic
editor on a rink surface. The coach:

1. Places actors (attackers, defenders, goalie) and the puck at initial positions.
2. Draws one or more routes/passes/shots as ordered waypoint sequences per actor
   (mirrors the `intendedActions` shape `ScenarioDefinition` already expects —
   time-ordered actions per actor, not free-hand paths).
3. Sets a decision-freeze time and marks which actors/cues are observable at that
   freeze (`decisionFreeze.observableCues`).
4. Names 2+ answer options and marks the declared-correct one (`declaredRead`,
   `proofMode: "coach-declared"`).
5. Previews (see §6 for what preview means before/after compilation succeeds).
6. Saves as a draft, or finalizes.

This produces a `ScenarioDefinition` directly — the editor's output format *is* the
existing scenario-engine input format, not a separate coach-only schema that later gets
translated. That's what lets an authored play flow through the same physics/decision
pipeline (Phases 1-6) as a generated one, per decision 2's explicit requirement.

**Not in MVP scope** (explicitly deferred, restated from decision 2 and framework-fit
decision 5): assistant-coach collaboration, multi-team drafts, freehand/curved drawing
(waypoints are straight-segment polylines for MVP — matches what `rinkAnchors.js` and
the existing kernel authoring pattern already use), custom rink dimensions.

## 3. Storage

New Supabase table, `coach_play_drafts`:

```sql
create table public.coach_play_drafts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  coach_id uuid not null references auth.users(id),
  scenario_definition jsonb not null,      -- the ScenarioDefinition, proofMode always
                                            -- "coach-declared" for rows written here
  revision integer not null default 1,     -- optimistic concurrency: client sends the
                                            -- revision it read; write is rejected
                                            -- (via RLS-adjacent app-level check) if it
                                            -- doesn't match the current stored revision
  status text not null default 'draft'
    check (status in ('draft', 'finalized')),
  finalized_at timestamptz,                -- set once, on transition to 'finalized'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index coach_play_drafts_finalized_immutable
  on public.coach_play_drafts (id) where status = 'finalized';
```

- **In-progress drafts**: mutable, optimistic-revision-checked writes (client reads
  `revision`, submits `expectedRevision`; a mismatch means someone/something else
  wrote since, and the client must reload before retrying — this is the "optimistic
  hash/revision check" decision 6 calls for).
- **Finalized versions**: immutable once `status = 'finalized'`. Enforced two ways:
  the app never issues an update to a finalized row, and a trigger rejects any
  `update` where `old.status = 'finalized'` regardless of client behavior (belt and
  suspenders — RLS alone can't express "immutable after a state transition" cleanly).
- **Local autosave**: browser-side only (localStorage keyed by draft id), crash
  recovery only, never a substitute for the Supabase write — matches decision 6
  verbatim ("local autosave for crash recovery only").
- One draft belongs to exactly one team and one owning coach for MVP (framework-fit
  decision 5); no shared-draft concept.

## 4. Auth/ownership

Framework-fit decision 5 names the gap precisely: `profiles.tier` is client-writable
(`for update using (auth.uid() = id)`, no column restriction — confirmed,
`schema.sql:142-144`) and `question_overrides` accepts writes from any authenticated
user (`auth.role() = 'authenticated'`, not an ownership check — confirmed,
`migration_0017_question_overrides.sql:29-42`). The new table must not repeat either
mistake.

`coach_play_drafts` RLS follows the existing, already-correct `teams` ownership
pattern (`schema.sql:146-225`, e.g. `coach manages own teams`: `auth.uid() =
coach_id`), not the `profiles`/`question_overrides` anti-pattern:

```sql
alter table public.coach_play_drafts enable row level security;

create policy "coach manages own team drafts" on public.coach_play_drafts
  for all using (
    auth.uid() = coach_id
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
  )
  with check (
    auth.uid() = coach_id
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
  );
```

**Server-owned TEAM entitlement**, closing the client-writable-`tier` gap for this
surface specifically: the write path (draft save, finalize, export-request) is not
"any authenticated user with `profile.tier = 'TEAM'` client-side" — it re-checks
entitlement server-side. Because there is no Edge Function layer for this yet, the
cheapest correct mechanism for MVP is a Postgres function invoked via RLS `using`
clause that checks a **server-controlled** entitlement signal, not the client-writable
`profiles.tier` column directly. Concretely: `teams` rows already carry
`coach_id` set at team-creation time by existing (already-trusted) server logic — this
design reuses that trust boundary (team ownership) as the entitlement gate, rather than
re-deriving entitlement from `profiles.tier` at all. A coach who owns a `TEAM`-created
team can author drafts for it; a coach whose team's TEAM subscription lapses is out of
scope for this design (existing `seasonIsReadOnly()` / `canAccess()` read-only-season
handling in `tierGate.js` is the model to extend later, not solved here).

"Coach role" itself: there is no separate role table today: team ownership
(`teams.coach_id = auth.uid()`) *is* the coach-role signal everywhere else in the
codebase (`coachAnalytics.jsx`, `assignments.jsx`, etc. all key off `coachId` /
`teamId`, not a role flag). This design keeps that convention rather than introducing
a new roles table for one feature.

Allowlist gating (decision 4, "gated to an allowlist of coaches initially"): a
`coach_play_drafts_allowlist` table (`coach_id uuid primary key`) checked in the same
RLS policy's `using`/`with check` clauses, additive to the ownership check above.
Removed once the feature graduates past MVP gating — tracked as a follow-on, not
designed further here.

## 5. Video export

**Isolated Node worker**, per the answered question above: `remotion/` stays its own
package (React 19, `@remotion/cli`/`@remotion/renderer`, currently just dependency
pins with no composition source). No reconciliation with the main app's React 18 —
the worker never runs in a browser alongside the app, so the version mismatch is a
non-issue. Composition code is written fresh in `remotion/src/`, consuming
`CompiledTeachingPlay` (§6) directly and rendering with plain SVG/canvas primitives
against the rink coordinate space already defined in `rinkFrame.js` — not by importing
the app's React components.

Trigger: a server-side export job (Node script invoked out-of-band for MVP — no
queue/worker infrastructure exists yet and building one is out of scope for this
design) that:

1. Loads the finalized draft's compiled artifact (§6).
2. Invokes `@remotion/renderer`'s `renderMedia()` against the new composition,
   producing a 1080p 16:9 MP4.
3. Uploads the MP4 to a private Supabase Storage bucket (`coach-play-exports`,
   not public).
4. Writes a signed URL (Supabase Storage signed URL, team-scoped expiry — 30 days,
   renewable by re-requesting export) back onto the draft row
   (`export_url`, `export_expires_at` columns added to `coach_play_drafts`).

No anonymous public export in MVP (framework-fit decision 7, restated): the signed
URL is handed only to the owning coach's session; there is no public share page yet.
"Team-only" for MVP means "shared out-of-band by the coach" (copy the link, send it
to players) rather than a built-in team roster distribution UI — building in-app
distribution is a real follow-on, not solved here, since it implies its own
access-control surface (which roster members can view) that decision 2 didn't scope.

**Retention**: exported MP4s and their signed links live for 30 days from generation,
then the Storage object is deleted by a scheduled cleanup (reuses whatever cron/cleanup
mechanism the project already has for other time-boxed artifacts, or a manual `psql`/
Storage API sweep for MVP if none exists — not designing new infrastructure here).
Re-export from the still-live draft is always available; nothing about the draft
itself expires, only the rendered artifact.

## 6. Compile pipeline wiring and the draft/export safety boundary

Per the answered question above: a new, explicitly separate `DraftTeachingPlay`
artifact type (`src/scenario-engine/draftTeachingPlay.js`, new file) for anything that
hasn't cleared `compileTeachingPlay()`'s AGREE/physicsClean gate:

```js
export const DRAFT_TEACHING_PLAY_SCHEMA_VERSION = "draft-teaching-play-v1";

export function buildDraftTeachingPlay(definition, trace, evaluation, declaredCandidateId) {
  const comparison = compareDeclaredToDerived(declaredCandidateId, evaluation);
  return Object.freeze({
    schemaVersion: DRAFT_TEACHING_PLAY_SCHEMA_VERSION,
    id: definition.id,
    version: definition.version,
    samples: trace.samples,
    eventTimes: /* same derivation as compileTeachingPlay */,
    questionFreezeTime: definition.decisionFreeze.time,
    observableCues: definition.decisionFreeze.observableCues,
    declaredRead: definition.declaredRead,
    physicsClean: trace.physicsClean,
    comparison,                 // may be any AGREEMENT value, not just AGREE
    failedChecks: [
      ...(trace.physicsClean ? [] : trace.physicsFailures),
      ...(comparison.agreement === AGREEMENT.AGREE ? [] : [comparison.explanation]),
    ],
  });
}
```

Rules, matching decision 2 verbatim:

- **Preview** (in the editor, coach-only): always available, for both a clean draft
  and a failed one. Clean drafts preview via `DraftTeachingPlay` too — the coach never
  needs a successful `compileTeachingPlay()` call just to see their own work; that
  call only happens at finalize-time (see below). Preview consumes
  `DraftTeachingPlay` through the same shared `playbackClock.js` that
  `CompiledTeachingPlay` uses (framework-fit decision 1: one clock, all consumers) —
  `playbackClock.js` is written against the fields both artifact types share
  (`samples`, `eventTimes`, `questionFreezeTime`, `observableCues`), so it does not
  need to know which artifact type it's walking.
- **Finalize**: attempts `compileTeachingPlay()`. Success → row's `scenario_definition`
  is locked (`status = 'finalized'`), and a real `CompiledTeachingPlay` is produced and
  cached (new `compiled_artifact jsonb` column on the finalized row, so export doesn't
  recompile every time). Failure → finalize is refused; the draft stays editable and
  the UI surfaces exactly why (`failedChecks`), matching decision 2's "the compiler
  must derive the physically and tactically supported read independently and surface
  any disagreement before export."
- **Diagnostic export** (optional, explicit coach action, only available on a draft
  that failed finalize): renders from `DraftTeachingPlay`, not `CompiledTeachingPlay`.
  The Remotion composition burns an unavoidable `DRAFT — NOT VALIDATED` watermark plus
  the `failedChecks` list into the video itself (not just a UI label that a downloaded
  file could shed) — this is the one export path where a fresh MP4 exists but its
  provenance is `DraftTeachingPlay`.
- **Clean export**: only reachable from a `finalized` row's cached
  `CompiledTeachingPlay`. This is the only path that produces an unwatermarked MP4.
- Neither export path — clean or diagnostic — writes anything into the shared
  catalog/promotion pipeline (Phase 8's `factoryPipeline.js`/promotion machinery).
  Coach-authored plays stay a private-per-team artifact for MVP; catalog promotion
  for coach-authored content is out of scope for this design and not decided here
  (would need its own review-tier call, per decision 3's "high confidence... auto-
  promote" language, which was written with generated content in mind, not
  coach-declared reads).

## Files touched/created (by this design, for Phase 8 to build)

- `src/coachPlayAuthoring.jsx` (create) — editor UI, mounted per §1.
- `src/scenario-engine/draftTeachingPlay.js` (create) — per §6.
- `supabase/migration_00XX_coach_play_drafts.sql` (create) — table + RLS + allowlist
  table + immutability trigger, per §3-4.
- `remotion/src/` (create) — composition source; `remotion/package.json` unchanged.
- `remotion/render-worker.mjs` (create) — export job entry point, per §5.
- `App.jsx:7469-7500` (modify) — mount `CoachPlayAuthoringSection`, add the `🎬 Plays`
  quick-access chip.

## Explicitly out of scope for this design (real follow-ons, not solved here)

- In-app team-roster distribution UI for exported videos (link-sharing only for MVP).
- Assistant-coach collaboration / multi-owner drafts.
- Catalog promotion path for coach-authored content.
- TEAM-tier lapse/read-only-season handling for the authoring write path specifically
  (existing `seasonIsReadOnly()` machinery is the model, not extended here).
- Freehand/curved route drawing (straight-segment waypoints only for MVP).
- Any queue/worker infrastructure for export (MVP export is an out-of-band script
  invocation, not a managed job queue).

## Exit gate

This document, reviewed and approved by Thomas. Nothing in Phase 8 starts before
that approval, per the parent plan's own exit gate for Phase 7.
