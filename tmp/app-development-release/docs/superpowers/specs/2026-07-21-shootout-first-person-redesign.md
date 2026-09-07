# Shootout Drill: First-Person Redesign + Gym Combo Layer

Date: 2026-07-21
Status: approved direction from Thomas ("make it like a hockey shootout where a
player is picking certain spots"); autonomous build session.
Supersedes the presentation layer of `2026-06-13-shootout-drill-design.md`
(its core mechanics, scoring, and difficulty curve are kept verbatim).

## Context

Pick Your Spot was pulled from the Brain Gym lineup on 2026-07-12 "pending a
first-person redesign" (commit `9edc670`). This spec is that redesign, plus a
small all-drill upgrade layer. Mechanics are borrowed from proven games:

- **NHL (EA) shootout mode** — first-person skate-in: the net and goalie grow
  as you approach; the approach itself is the shot clock.
- **Penalty-kick games (FIFA / Score! Hero)** — round-based shootout framing
  with a scoreboard and shot pips; the keeper commits/dives as you release.
- **Punch-Out!! pattern reads** — the goalie has a per-session tendency
  (a one-line scouting report) that biases which spots he covers, so there is
  a learnable pattern, not just a twitch read.
- **Peggle / Fruit Ninja combo escalation** — rising-pitch success cues on
  streaks, wired once into the shared engine so every drill benefits.

## What is kept (tested, unchanged)

`shootoutCore.js` scoring and difficulty: 3x2 cell net, `coveredAtStart`,
`closeSchedule`, `holeOpenMs` pow-curve, `shotClockMs`, `isCellOpenAt`,
`scoreShot`, graded 0-1000 speed-weighted points. `npm run test:shootout`
stays green with no test edits.

## Shootout presentation (ShootoutDrill.jsx rewrite)

First-person POV on a breakaway:

1. **Ready** — you're at center ice, puck on your stick (bottom center), net
   small in the distance. A session-long scouting-report banner is visible.
   Tap Go (whistle cue).
2. **Skating (live)** — over `shotClockMs(level)` the net + goalie scale up
   (~0.42 -> 1.0) toward you; perspective ice lines scroll to sell speed.
   Open cells show target rings on the net; the goalie's limbs sweep closed
   per the close schedule (same REACH animation, now in perspective). Tap a
   cell to release. Clock expiry = you held it too long, goalie poke-checks.
3. **Shooting** — puck flies from your stick to the chosen spot (shrinking
   with distance), goalie dives toward it; goal if the cell was open at
   release, save otherwise (existing scoring, verbatim).
4. **Reveal** — GOAL!/SAVE banner, scoreboard + pips update, Next shot.

**Shootout framing:** 10 shots vs the Goalie. Scoreboard "You N — Goalie N"
(a save or expiry scores for the goalie). Pips row: filled = goal, X = save,
open = upcoming. End card declares the shootout result ("You won the shootout
6–4") over the usual points/level/best block. Win threshold: goals > saves.

**Goalie tendency (new, core):** `makeGoalieProfile(rng)` returns cell
weights + a report line, e.g. "Scouting report: hugs the glove side — the
blocker side opens up late." `makeShot(level, {rng, weights})` picks covered
cells with those weights; omitted weights = uniform (existing behavior, so
existing tests and the head-to-head seed path are untouched). The report is
honest: weights genuinely bias coverage. Trains pattern learning across the
session, not just single-shot reads.

**Forgiving aim:** `nearestCellWithin(rects, x, y, slack)` — a tap that
misses every cell snaps to the nearest cell center within ~0.6 cell sizes
(the far-away net is small early in the approach; U7 thumbs are big).

## Combo layer (all drills, one edit point)

- `createAdaptiveLevel` gains `combo` / `bestCombo` counters (reset on miss,
  never on level-up — distinct from `ups`).
- `gymAudio.js` gains `hit2`/`hit3` cues (same motif, higher pitch);
  `gymCueHooks()` escalates hit -> hit2 (3+ streak) -> hit3 (6+ streak).
  Every drill already routes reps through these hooks, so all 10 active
  drills get hot-streak audio with zero per-drill changes.
- ShootoutDrill shows a combo chip and stores `bestCombo` in session meta;
  other drills can adopt the chip later (display-only, no scoring change:
  points scale stays 0-1000/rep so records remain comparable).

## Registry

Re-add the drill to `DRILLS` in `CognitiveGym.jsx` with id `shootout`
(existing player records and levels persist), name "Shootout", skill
"Shot Read", updated blurb/goal/why + new intro SVG (perspective net).

## Testing

- `scripts/test-shootout.mjs`: add — weighted pick biases coverage toward
  heavy cells (deterministic rng); uniform default matches old behavior;
  profile determinism (same rng seed -> same profile); nearestCellWithin
  inside/outside slack.
- `scripts/test-gym.mjs`: add — combo increments on success, resets on miss,
  bestCombo retained, survives a level-up.

## Out of scope

Deke/stickhandling input (still a read drill, not dexterity); live
multiplayer; the Phase-2 Rink Rating work; Simon-style sequence drill
(separate candidate, still open in the overhaul spec).
