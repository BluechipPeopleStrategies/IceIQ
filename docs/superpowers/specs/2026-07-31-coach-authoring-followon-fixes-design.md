# Coach Authoring Follow-On Fixes — Design

**Status:** Approved (design choices confirmed with Thomas, 2026-07-31).
**Scope:** Fixes to the Important/Minor findings parked or deferred by the
Phase 8 final whole-branch review
(`docs/superpowers/plans/2026-07-31-coach-authoring-video-export.md`), on the
same branch (`feature/coach-authoring-video-export`). No new features, no new
owner decisions — every item here was already identified by that review;
this doc only settles the two genuine implementation choices among them.

## 1. Route-leg duration (was: fixed 1s per leg, fails physics on any real distance)

**Chosen approach: auto-derive from distance, no new UI.**

`detectImpossibleAcceleration` (`physics/hardFailureDetectors.js:73-101`) models
every leg as starting from rest: required acceleration is `2*distance /
duration²`, capped at `profile.player.avgAccelMPS2.value * 1.15`. So the
duration-safe formula, solved for duration, is:

```
duration = sqrt(2 * distance / avgAccelMPS2)
```

(using the profile's plain `avgAccelMPS2.value`, not the padded 1.15× cap,
so a route sits inside the safety margin rather than exactly on its edge).
This is the physically-grounded default — not a flat speed like
"distance / topSpeedMPS", which would understate required acceleration for
short legs and silently trip the check anyway. A floor of `TELEPORT_MIN_DURATION_S`
(imported from the detector module, not re-guessed) prevents a
near-zero-distance click from producing a near-zero duration.

Turning-radius and board-contact checks (`detectImpossibleTurning`,
`detectPossibleBoardContact`) are NOT solved by this change — a route with a
sharp-angle direction change between consecutive legs can still fail
finalize on turning-radius grounds. That's a real, correct physics
constraint (not a bug), and stays out of scope here; `compileTeachingPlay()`
already surfaces it as a named `failedChecks` entry for the coach to see and
redraw around.

## 2. Concurrent actor motion (was: one actor's whole route finishes before the next actor's route starts)

**Chosen approach: every actor's route starts at t=0 by default, no new UI.**

Each actor's OWN waypoints still chain off their OWN previous `endTime` (so
an actor's multi-leg route is still internally sequential), but the first
waypoint for a NEWLY selected actor starts at `t=0`, not at the end of
whatever the previously-drawn actor's route reached. This matches how a real
play actually unfolds (players move simultaneously) and requires no new
timeline/offset UI. `validateScenarioDefinition`'s time-ordering check only
requires the flat `intendedActions` array to be globally non-decreasing in
`startTime` — it does not require actions to be assigned in wall-clock
order, so `intendedActions` must be sorted by `startTime` before save
(not just appended) to satisfy that non-decreasing invariant when a
later-drawn actor's waypoint has an earlier `startTime` than an
earlier-drawn actor's later waypoint.

Deliberately staggered starts (a delayed second-wave support read) remain
out of scope — a real, useful future feature, not solved here.

## 3. Stationary (routeless) actors invisible in preview/export

Mechanical fix, no design choice: `simulate()` only ever produces samples
from `intendedActions` (`physics/simulator.js:137` onward walks the actions
array, not the actor list), so a placed actor with zero drawn actions gets
zero samples and vanishes from both the live preview and the exported
video. Fix in `simulate()`: after the existing action loop, for every actor
in `def.initialState.actors` with no samples in the `samples` array, push
one static sample at their initial position, `{t: 0, pos: actor.position,
actorId: actor.id}`. `playbackClock.js`'s `sampleAt` already clamps to the
nearest sample at any queried time, so a single static sample makes that
actor render motionless for the play's full duration, which is exactly the
intended "goalie/off-puck defender who doesn't move but is part of the read"
case. This sample never interacts with any hard-failure detector (those
walk `intendedActions`, never `samples`), so it introduces no new physics
claim to validate.

## 4. Provenance hash never recomputed (contentHash null, version frozen at 1)

Mechanical fix: `updateCoachPlayDraft`'s caller must recompute
`contentHash` via `versionedContentHash(...)` (the same helper
`compiledTeachingPlay.js` already uses) over the definition's real content
fields before every save, and bump `version`. Exact field set and whether to
follow the promoted-artifact idempotency pattern (identical content ⇒
identical hash regardless of volatile metadata) is left to the implementing
task to settle against `canonicalHash.js`'s actual contract and
`promotedArtifact.js`'s existing precedent — a mechanical correctness fix,
not a new design decision.

## 5. Finalized rows deletable despite being "immutable"

Mechanical fix: the `coach_play_drafts` RLS is currently one `for all`
policy plus a separate `before update` trigger. `for all` covers `DELETE`
too, so a finalized row can be deleted even though it can't be edited. Needs
a new migration narrowing delete access to `status = 'draft'` rows only —
exact policy shape (split `for all` into per-command policies, or add a
`for delete using (status = 'draft')` alongside a `for all` restricted to
insert/select/update) is an implementation detail for the task, following
the same idempotent-migration/RLS-composition conventions Task 3 already
established and had independently re-verified.

## 6. Minor cleanups (bundled, no design decisions)

- `simulate()` throws a raw `TypeError` when `initialState.puck` is `null`
  (a fresh, not-yet-authored draft) — add a friendly precheck in the
  editor's preview/finalize handlers ("Place the puck before previewing")
  rather than letting the raw error reach the coach.
- `finalizeCoachPlayDraft` doesn't bump `updated_at`, so a newly-finalized
  draft doesn't sort to the top of the team's draft list.
- `src/App.jsx` has two adjacent, identical `canAccess("coachDashboard",
  ...)` conditionals (one wrapping `CoachPlayAuthoringSection`, one wrapping
  `CoachTrainingSection`) that should collapse into one gated block.
- Editor controls (`<button>`/`<input>`/`<select>`) use raw HTML instead of
  this codebase's shared `PrimaryBtn`/`SecBtn` primitives from
  `shared.jsx`, rendering as unstyled browser-default chrome on the app's
  dark theme. Swap to the shared primitives where a direct equivalent
  exists.

## Explicitly out of scope (real follow-ons, not solved here)

- Per-actor start-time offsets (deliberately staggered/delayed motion).
- Turning-radius/board-contact-aware route suggestions.
- A live Supabase/browser verification pass — still entirely Thomas's,
  unchanged from the Phase 8 plan's own limitation.
