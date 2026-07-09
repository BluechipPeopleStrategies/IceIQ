# Cognitive Gym Overhaul — Design Spec

Date: 2026-07-09
Status: awaiting owner review
Inputs: full code audit of `src/cognitive-gym/` (11 drills), competitor teardown
(Lumosity, Peak, Elevate, CogniFit, NeuroNation, Impulse, IntelliGym,
NeuroTracker, MentalUP), youth game-design + perceptual-cognitive training
research, BlueChip advisory panel verdict (consensus, Option C phased).

## Lineage and connections

- **Supersedes (future-work sections of):**
  `docs/superpowers/specs/2026-06-13-gym-progression-incentives-design.md` —
  its Plan 1 shipped (calibration + incentives, via
  `docs/superpowers/plans/2026-06-14-gym-progression-plan1.md`); this spec
  fixes the age-seed wiring bug that plan introduced and takes over the
  progression roadmap. Its Plan 2 (server-validated leaderboards, rides with
  pricing Phase 2) stays deferred and is unchanged here.
- **Builds on:** `docs/superpowers/specs/2026-06-13-cognitive-gym-expansion-design.md`
  (graded points, 5 drills) and `2026-06-13-shootout-drill-design.md`.
- **Roadmap:** `docs/roadmap/2026-07-09-next-7.md` — Phase 1 slots after item
  2 (playtest gate) and never blocks item 1 (share the beta). Phase 2 rides
  with item 6 (Daily Faceoff owns the calendar streak; Today's Practice
  credits it, no second streak). Phase 3 rides with item 7 (Rink Map feeds the
  parent/coach card). Phase 1 absorbs the gym half of the on-deck
  "mascot + sound pass"; mascots are Phase 3.
- **MVP:** per `docs/factory/MVP-VIABILITY.md`, the gym is retention
  mechanic #7 (post-MVP). Only Phase 1 (beta hygiene) sits near the MVP window.
- **Implementation plans:** Phase 1:
  `docs/superpowers/plans/2026-07-09-cognitive-gym-phase1-fix-and-juice.md`.
  Phases 2–3: planned when their turn comes, same folder.

## Owner decisions (locked)

- Every game hockey-themed. Panel picked how: hockey-native mechanics under an
  age-banded identity layer, delivered in phases so the beta ships first.
- Launch 6 starter drills + earned unlocks for the other 5.
- New gym-only headline score: **Rink Rating**, with a 6-domain **Rink Map**
  radar. The question-based Hockey IQ score stays separate.
- Two age-band experiences now (U7–U11 "Practice Rink", U13+ "The Combine");
  a third middle band later.

## Why (one paragraph)

The gym today is mechanically sound (11 procedural drills, adaptive 1–20
levels) but user-hostile for its actual audience: 90–140-word text intros,
zero sound/celebration, "off by 43 px" feedback, a free-choice grid with no
session structure, scoring so inconsistent that two drills barely earn points,
and an age-calibration system that is dead code (`player.level` arrives as
`"U11 / Atom"`; the seed matches bare `"U7"/"U9"/"U11"`, so every child starts
at level 1). Every successful competitor converged on the same skeleton — a
one-button daily workout, one branded score over per-domain sub-scores, demo
tutorials, personal bests, forgiving streaks — and the training literature
(85% success-rate rule, 2–4 sessions/week, sport-specific stimuli for
transfer) tells us the parameters.

## The six cognitive domains

Every drill maps to exactly one domain; domains drive the Rink Map, the
Rink Rating, and Today's Practice selection.

| Domain | Drills |
| --- | --- |
| Anticipation | Read the Pass |
| Awareness | Baylor's Pick, Two Things at Once |
| Reaction | Shoot or Hold |
| Vision | Eyes Up, Find the Lane, Read the Numbers |
| Memory | Snapshot |
| Decisions | Best Option, Late Read, Pick Your Spot |

Starters (one per domain): Read the Pass, Baylor's Pick, Shoot or Hold,
Eyes Up, Snapshot, Best Option.
Unlocks (a domain's level = the highest drill level within it): Find the Lane
(Vision ≥5), Read the Numbers (Vision ≥8), Late Read (Decisions ≥5), Pick Your
Spot (Decisions ≥8), Two Things at Once (Awareness ≥5). Unlock = celebration moment ("Coach opened a new station"),
never a paywall.

## Phase 1 — Fix and juice (small, ships alongside beta)

1. **Age-band bug fix.** New `gymBand.js`: resolve `player.level` division
   strings to band keys in one place (`"U11 / Atom"` → `U11`; bands: `U7`,
   `U9`, `U11`, `U13`, `U15`, `U18`). Extend starting-level seeds to all bands
   (U7→2, U9→4, U11→6, U13→7, U15/U18→8). Seeds stay a fallback once the
   Rookie Combine (Phase 2) exists.
2. **Scoring normalization.** Reaction and Tracking move to the same graded
   0–1000/rep scale as the other nine (Reaction: grade by reaction time within
   the window, penalty reps stay 0; Tracking: grade by targets held per shift,
   bonus for the puck pickup). Career XP stops being unfairly starved by two
   drills.
3. **Juice pass — no new dependencies.**
   - `gymAudio.js`: WebAudio-synthesized sounds (no asset files): tap, hit,
     perfect, miss (soft), level-up, session fanfare, and an audible go-signal
     in Shoot or Hold (also an accessibility fix). Mute toggle, persisted.
   - CSS keyframes: score count-up on results, level-up burst, new-best shine,
     card hover polish. Canvas confetti on level-up, personal best, and unlock.
   - Haptics: guarded `navigator.vibrate` on hit/perfect (mobile only).
4. **Feedback language.** All distance feedback in rink feet (kill "off by
   43 px" in Eyes Up and Snapshot — reuse Anticipation's real-feet
   conversion). Reveal lines use hockey language ("Tape-to-tape!", "Just
   wide", "Picked it off!").
5. **Personal bests.** Lumosity-style "Personal Best" / "Top 5" tags on every
   session result.

## Phase 2 — Practice structure and Rink Rating

1. **Today's Practice (one-button daily workout).** Hub leads with a single
   Start button: 3 auto-picked drills (~5–8 min): weakest domain, strongest
   domain, rotating third. Interleaved across domains per the
   contextual-interference research; never the same drill twice in one
   practice. Daily goal becomes "complete Today's Practice." Ends on a
   celebration screen with a hard stop ("Great work — your brain builds
   hockey sense between sessions"). Free-play grid remains below the fold.
   No one-more-game loops; rest framing is a feature, matching CogniFit /
   IntelliGym's 2–4 sessions/week prescription.
2. **Rink Rating + Rink Map.** Per-domain rating 0–1000 computed in a pure
   module from a recency-weighted window of recent sessions (level reached ×
   graded accuracy), so it moves smoothly, can drift down gently with long
   inactivity, and is robust to one bad day. Headline Rink Rating = weighted
   mean of the six domains. Rink Map = 6-axis radar that visibly fills in
   (Peak's single most effective feedback pattern). Difficulty level and
   rating are deliberately separate axes (Elevate pattern): level dropping is
   "calibration," never a rating loss.
3. **Rookie Combine (first-session placement).** One-time ~4-minute flow: 3
   short staircased drills estimate starting levels per domain, then reveal
   the player's first Rink Map ("your player card"). Framed as getting your
   player card, not a test. Replaces the static seed as the primary
   calibration.
4. **Adaptive target.** Keep the 3-up/2-down staircase; tune drill parameter
   curves so the staircase settles near ~85% success (the empirically optimal
   learning rate), ~90% for U7–U9.

## Phase 3 — Age-banded identity layer

Band resolution from `gymBand.js`; two experiences now.

**U7–U11 "Practice Rink":**

- Near-zero text: one-line goal + ghost-hand demo on first play + one untimed
  practice rep that doesn't count (Lumosity practice-mode pattern).
- Bigger tap targets, celebration on every success, misses show the
  consequence and the rally continues — no fail-state screens (Toca Boca /
  PBS rule, consistent with the app's existing young-age research doc).
- Linear "next station" path instead of a stats grid; collectible sticker
  cards for milestones instead of stat tiles.
- Replace Baylor's Pick's ⚽ + 🐰🐻 emoji with pucks and jerseys.

**U13+ "The Combine":**

- Clean athlete-dashboard aesthetic: Rink Map front and center, ms/accuracy
  trend lines, personal bests, session history. Optional-depth stats (tap to
  expand). No mascots, no childish celebration (subtle but satisfying juice).
- Streak with repair, using the app's existing "Backup Goalie" language from
  the arcade layer — earned, "paused" never "lost."

**Hockey-native stimulus upgrades (all bands):**

- Shoot or Hold: abstract blue/orange light → net-opens (shoot) vs ref's arm
  up / defender closes (hold) — a real hockey inhibition cue.
- Two Things at Once: abstract shapes → coach's bench signals (line change,
  glove up, helmet tap).
- Eyes Up: fixation point becomes the puck on your stick; the flash is a
  teammate calling for it (stick-tap audio).
- Remaining drills are already hockey-native (pass lanes, jersey numbers,
  goalie holes); they get copy/sound polish only.

## Honest-claims guardrail (applies to every phase)

Copy claims only what we measure: "trains and tracks the skills hockey minds
use — anticipation, tracking, decision speed — and measures your improvement
in these drills." Never on-ice performance numbers (Lumosity's FTC settlement;
IntelliGym's 30% claim is the anti-pattern). Positioning: supplement to ice
time, never a substitute. No loss-framed streaks for kids, no guilt
notifications, no session-stretching, no purchasable streak repairs. Cohort
comparisons live in the future parent report, not in the kid's UI.

## Architecture

New pure modules (all unit-testable, repo's hand-rolled `*.test.mjs`
convention): `gymBand.js` (band resolution — the bug fix), `gymDomains.js`
(drill→domain registry), `rinkRating.js`, `gymSession.js` (Today's Practice
selection), `gymUnlocks.js`, plus `gymAudio.js` (WebAudio, capability-guarded).
`CognitiveGym.jsx` becomes a band-aware shell; the DRILLS registry gains
`domain`, `starter`, `unlock` fields. Drill cores untouched except the two
scoring normalizations and the stimulus swaps. Storage stays localStorage
(`gymStorage.js`) with the same documented swap-to-Supabase path; new fields
are additive so existing records survive.

## Out of scope (explicitly)

- Supabase persistence for gym data (future; storage API already isolates it).
- Parent/coach report card (roadmap item 7 hooks into Rink Rating later).
- New drill types (Simon-style sequence memory is the one real gap in the
  lineup — flagged as a future candidate, not built now).
- The third (middle) age band; tier-gating changes; leaderboards.

## Testing

- Unit tests for every new pure module + the two rescored drills.
- Manual playtest checklist per band (U9 profile and U15 profile) following
  the repo's `docs/manual-playtest/` pattern.

## Sequencing vs the beta

Phase 1 is days-scale and safe to ship with the beta. Phase 2 follows as its
own plan→build cycle off this spec. Phase 3 rides after, aligned with the arcade-shell
work (roadmap item 6) so streak language and identity stay consistent.
This satisfies the Farm Stakeholder's panel condition: the beta is never
blocked by the gym.
