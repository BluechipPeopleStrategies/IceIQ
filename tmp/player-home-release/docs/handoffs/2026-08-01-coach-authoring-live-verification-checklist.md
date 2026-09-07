# Coach-Authoring Live Verification Checklist

**PARKED by Thomas, 2026-08-01 (same day this was written).** Thomas looked at
the live editor and called it not worth polishing right now; the feature
(and this checklist) is parked, not abandoned — see `docs/roadmap/TASKS.md`
Parking Lot. Branch/worktree left untouched. Do not resume this walkthrough
without checking TASKS.md first for current priority.

**Purpose:** the scenario-engine foundation (Phases 0-6) is built and committed
on `feature/shareable-beta` (HEAD `f0511e8`); the coach-authoring MVP
(Phases 7-8) is built, code-reviewed, and final-review-clean on the unmerged
branch `feature/coach-authoring-video-export` (HEAD `b718838`, worktree at
`.worktrees/coach-authoring-video-export`). Every ledger entry for that work
says the same thing: **live Supabase + browser verification was deferred to
you** — no subagent has a live database or a browser. This is that pass.

Engine test suite (`npm run test:scenario-engine`) reconfirmed green in the
worktree just now: 13/13 on the promoted-artifact suite spot-checked, full
suite wired in `package.json`.

---

## 0. What you are actually looking at (read first)

Corrected 2026-08-01 by reading `src/coachPlayAuthoring.jsx`,
`src/coachPlayEditorCanvas.jsx`, and `remotion/render-worker.mjs` against
this checklist. Three steps below promised more UI than exists. The
underlying engine work is real; the surface is thinner than the wording
suggested.

**Where it lives:** CoachHome → expand a team card → a `🎬 Plays` card.
`+ New play` creates a row and drops you straight into the editor.

**The editor is one screen**, top to bottom:
1. `Place actor` / `Place puck` toggle, plus Role (puck carrier / support /
   defender / goalie) and Team (home/away) pickers.
2. A pale-blue SVG rink, roughly 490 × 210 px — no lines, circles, or
   creases drawn, just the boards rectangle. Click = place. Placing an actor
   **auto-selects it**, and while an actor is selected every rink click adds
   a route waypoint instead of placing anything. Click the actor's dot again
   to deselect. Blue dots = home, firebrick = away, orange = selected. Puck
   is a small black dot.
3. Decision freeze time (s), observable cues (free text, add/remove).
4. Declared-correct read: actor dropdown + a description field.
5. `Save draft`, then `Preview`, then `Finalize`.

**Correction 1 — Preview does not animate.** There is no playback of actors
moving. Preview runs the real physics sim and shows: `Physics clean: yes/no`,
`Declared/derived agreement: <verdict>`, a list of failed checks, and a
scrub slider whose only output is `JSON.stringify(frameAt(play, t))` printed
as raw text. So step 5's "actors/puck move as drawn, no snapping/skipping"
is not judgeable from this screen. What you *can* verify: scrubbing changes
the numbers monotonically, and the positions at the end of the slider match
where you drew the route.

**Correction 2 — there is no Export button.** Once a draft is finalized the
list card prints a command for you to run yourself:
`node remotion/render-worker.mjs <id>-compiled.json <id>.mp4` — and you must
first dump that row's `compiled_artifact` column to that filename by hand.
`setDraftExportInfo()` exists in `src/supabase.js` but **has zero callers**,
so `export_url` is never written by the app and the "View exported video"
link is unreachable without a manual DB update. This is acknowledged as
out of scope in the design (§5), but the checklist read as though a button
existed.

**Correction 3 — no separate Validate step.** Preview reports, Finalize
gates. `compileTeachingPlay()` throws unless the trace is physics-clean and
the declared/derived comparison is a clean AGREE; on a throw the draft just
stays editable with the reason shown.

**Also true of the export path:** the worker only uploads and prints a signed
URL when `SUPABASE_URL` *and* `SUPABASE_SERVICE_ROLE_KEY` are in its env,
and it uploads to a private bucket named `coach-play-exports` — **which no
migration creates.** Create that bucket in the dashboard first, or the
worker renders a local MP4 and skips the upload (it says so on stdout, and
does not fail).

**The watermark test can't run the way step 6 describes.** Finalize refuses
to produce a `compiled_artifact` for a broken draft, so there's no artifact
to export. The watermark path is exercised by handing the worker a
`draft-teaching-play-v1` JSON instead — the worker watermarks that
unconditionally, regardless of the `--watermark` flag.

---

## 1. Apply the two new migrations (idempotent, safe to re-run)

In Supabase Dashboard -> SQL Editor -> New query, paste and run, in order:
1. `supabase/migration_0020_coach_play_drafts.sql` — creates
   `coach_play_drafts` + `coach_play_drafts_allowlist`, RLS scoped to
   `auth.uid() = coach_id` AND team ownership AND allowlist membership (not
   the two known anti-patterns elsewhere in the schema — `profiles.tier`
   client-writable, `question_overrides` open to any signed-in user).
2. `supabase/migration_0021_coach_play_drafts_delete_restriction.sql` —
   restricts delete to draft-status rows only (finalized rows can't be
   deleted via the client).

## 2. Add yourself to the allowlist (MVP is allowlist-gated, not tier-gated)

The DB-level gate is `coach_play_drafts_allowlist`, separate from the UI's
`canAccess("coachDashboard", tier)` check. In SQL Editor:
```sql
insert into public.coach_play_drafts_allowlist (coach_id)
values ('<your auth.users id>');
```
(No self-service insert path exists by design — allowlist is owner-managed
only.)

## 3. Run the app against this branch

```
cd .worktrees/coach-authoring-video-export
npm run dev
```
Log in as a coach with a team, with `profile.tier` at TEAM (or whatever the
UI gate requires) so `CoachPlayAuthoringSection` renders.

## 4. Walk the golden path

In a team's expanded dashboard card, find the new coach-play-authoring
section and:
1. Place actors + puck, draw a route/pass.
2. Set timing and a declared read.
3. Confirm physics/tactical feedback appears (declared vs derived agreement
   or an explained mismatch — never a silently "corrected" declared answer).
4. Save, reload the page, reopen the draft — confirm it's unchanged.
5. Preview — no animation exists (see §0). Confirm instead: `Physics clean`
   and `Declared/derived agreement` both report, failed checks are readable
   and specific, and scrubbing the slider moves the printed frame positions
   smoothly from your start positions to your drawn endpoints.
6. Finalize. Confirm:
   - A clean draft finalizes, the row flips to `✅`, and the list card shows
     the manual `render-worker.mjs` command.
   - A deliberately-broken draft (e.g. an impossible pass) is **refused**
     with a readable reason and stays editable — it should never finalize.
   - Export is manual: dump `compiled_artifact` to `<id>-compiled.json`, run
     the worker, confirm a real MP4 lands. For the watermark path, feed the
     worker a `draft-teaching-play-v1` JSON instead and confirm it comes out
     stamped `DRAFT - NOT VALIDATED` even without `--watermark`.
7. Try deleting a finalized draft from the UI — the delete control should be
   absent/blocked (client-side today; migration 0021 is the DB backstop).

## 5. Known open items — not blockers to playtesting, but need your call before this merges

From the branch's own final review, still unresolved:
- **Declared/derived agreement is currently tautological** — with only one
  candidate evaluated, "finalized" means physics-clean, not independently
  corroborated. Either downgrade the design doc's language or (later) build
  a real candidate generator.
- **`contentHash` freezes at version 1** — never recomputed after the first
  save, so the compiled artifact's provenance hash doesn't track later
  edits. Real gap, not yet fixed.
- **Finalized rows are immutable but still deletable at the RLS layer** for
  anyone who bypasses the UI — only the client hides the delete button.
- Minor, parked: raw HTML controls instead of the shared `.jsx` primitives
  (off-brand styling); export has no rink markings/freeze-hold (diagnostic
  quality only); a duplicated `canAccess` conditional in `App.jsx`.

## 5b. Already verified headlessly (2026-08-01, no browser needed)

Steps 1, 2, and the whole of step 6 turned out not to need you. Results:

**Steps 1-2 were already done.** `coach_play_drafts` and
`coach_play_drafts_allowlist` both exist and answer queries; coach
`a1bc9b0e-86e9-42cb-8984-8d1badf7426d` is on the allowlist and owns team
`a7a04993-9f11-490f-9cc4-4d1e6a4c3a7f` ("Demo Mites"). There is already one
**finalized** draft, `da3d944d-c061-4312-ad4d-43b6c720152d`, revision 2,
finalized 2026-08-01 17:52 UTC — so someone walked the golden path at least
once already.

**Provenance hash: PASS.** That row's
`compiled_artifact.dependencyHashes.definitionContentHash` equals its
`scenario_definition.contentHash`. The b718838 fix is holding on a real row.

**Export: PASS (locally).** Dumped the artifact, ran
`node remotion/render-worker.mjs <id>-compiled.json <id>.mp4` → a real
1920×1080 h264 MP4, 3.16 s, 93 frames, 149 KB. Upload correctly skipped with
`SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set -- skipping upload, local
MP4 only.` — and the `coach-play-exports` bucket does not exist anyway (the
project has only `pov-images`), so the signed-URL path has never run.

**Finalize gate: PASS.** Built a synthetic definition with an impossible
skate (28 m in 0.2 s). `compileTeachingPlay()` refused it, with a specific
and readable reason: `Actor actor-1 (U13) needs 1400.00 m/s^2 to cover
28.00m in 0.20s, exceeding this age band's cited/estimated capability
(4.13 m/s^2, +15% headroom).`

**Watermark: PASS, and confirmed by looking at the pixels.** Rendered that
broken draft **without** `--watermark`; the worker stamped it anyway on the
strength of its `draft-teaching-play-v1` schemaVersion. Extracted frame 20
of each MP4: the broken one carries `DRAFT — NOT VALIDATED` in red at
bottom-left, the clean one has no watermark.

### New defect found while looking at those frames

**The exported video never shows the player.** In `CoachPlayComposition.jsx`
the actor and the puck are both drawn as `r={12}` circles, and for a
puck-carrying actor the simulator deliberately mirrors the carrier's samples
onto the `"puck"` track (`simulator.js:183`) — so they occupy exactly the
same coordinates for the whole clip. `actorIds` orders `"puck"` last, so the
black puck is painted over the steelblue player at identical size and
position and hides it completely. Both test renders are a single black dot
moving across empty ice, with no visible player at all.

This is cosmetic-only in the sense that no data is wrong, but it makes every
export of a puck-carrier play useless as a teaching video. Cheapest fix:
drop the puck to `r={5}` and draw it after actors, or offset it slightly off
the carrier's centre. The in-app editor has the inverse of the same overlap
(puck `r={4}` drawn *before* actors, so the player covers the puck) — at
least players stay visible there.

**Open question, not a bug claim:** the coach placed the puck at centre ice
in that finalized draft, but the puck's `t=0` sample is the carrier's start
position — the placed position never appears. Correct semantics for a
`puckCarrier` role, but the editor accepts a puck placed anywhere and then
silently ignores it. Worth deciding whether that should warn.

## 5c. Golden path, driven live in Playwright (2026-08-01)

Signed in as the allowlisted coach (`demo-coach@rinkreads.demo`, the account
already on the allowlist) by minting a one-time magic link with the
service-role key and injecting the resulting session — no password was read
or changed. Real mouse clicks at computed rink coordinates, against team
"Demo Mites".

**Built:** puck + `actor-1` (puckCarrier) at (-20, 5), one route waypoint to
(-8, 2), `actor-2` (support) at (-5, -8), freeze 1.5 s, one observable cue,
declared read on actor-1.

| Step | Result |
| --- | --- |
| Place actors/puck, draw route | **PASS** — auto-select-after-place and click-dot-to-deselect both behave as documented |
| Save draft | **PASS** — row `8c310d7f-5655-41c7-9480-9c6197853944`, every coordinate, the cue, freeze and declared read persisted exactly as clicked |
| Reload + reopen | **PASS** — identical after a full page reload |
| Physics/tactical feedback | **PASS** — `Physics clean: yes`, `Declared/derived agreement: agree` |
| Scrub | **PASS** — monotonic, actor-1 -20.01 → -8.30 m, actor-2 stationary, puck tracks the carrier |
| Finalize | **PASS** — "Finalized -- ready to export."; the list flips to ✅ and shows the manual render command |
| Delete control on finalized row | **PASS** — Delete renders on the draft row, absent on the finalized one |

**Note:** this created a second finalized row in the live DB. Finalized rows
are immutable and client-undeletable by design, so `8c310d7f…` is permanent
unless removed with the service-role key.

### Second defect: the validated motion is not the motion that plays

The editor derives a route's duration from an accelerate-from-rest model
(`duration = sqrt(2·distance / avgAccel)`, `coachPlayEditorCanvas.jsx`), and
`detectImpossibleAcceleration` certifies it with the same model — it checks
`requiredAccel = 2·d/duration²` against the profile cap and records
`assumptions: ["starts from rest", …]`. It reads only the action's endpoints.

But `sampleAction` (`simulator.js:74-88`) interpolates **linearly** in `t`.
The trace it emits is constant-velocity. Confirmed by scrubbing the live
preview: actor-1 covers 2.93 m in each of the first two 0.6 s intervals —
a flat ~4.9 m/s from a standing start, not a curve.

So the thing the physics gate certifies and the thing the player/exporter
actually shows are different curves. Constant velocity from rest implies
infinite acceleration at t=0 — precisely what that detector exists to catch —
and it cannot see it, because it never inspects the samples it authorized.
Peak speed also differs by 2× between the two models, so any speed-based
check is measuring something the viewer never sees.

Not a blocker for playtesting, but it undercuts two of the foundation's
stated guarantees ("sourced physics profiles and kinematic validation",
"timing-faithful playback"). Fix is a choice, not a patch: either sample the
accel curve the validator assumes, or derive duration from a constant-velocity
model and validate against speed instead. Worth deciding before Phase 9/10.

## 6. After you've played through it

Tell me pass/fail per step above. If it's clean, next steps are: merge
`feature/coach-authoring-video-export` into `feature/shareable-beta`,
reconcile `TASKS.md` to reality (Phases 0-8 done, this branch merged), and
only then pick up Phase 9 (compliant scheduled-runner proof — Windows task
stays `Disabled` throughout) or Phase 10 (throughput benchmark). If anything
fails, report it here and I'll route the fix through the same review loop
the rest of this branch went through.
