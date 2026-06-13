# Cognitive Gym: Shootout Drill ("Pick Your Spot")

Date: 2026-06-13
Status: Design approved, ready for implementation plan
Scope: U7 / U9 / U11 only
Author: brainstorming session (Thomas + Claude)

## Context

A new Cognitive Gym drill. It is meant to be the easiest, most fun drill in the gym while still
training a real read: shoot where the goalie is not. The player reads which part of the net is
open and shoots there before the goalie closes it. It slots into the existing gym as drill
number 11, reusing the engine, adaptive level, points, streak, and storage exactly like the
others.

## Goals

1. An easy, satisfying, repeatable game that a U7 can play and an U11 can still find challenging.
2. Train shot selection and reading the goalie (pick the open net, not a covered one).
3. Reuse the gym engine and storage; mirror the existing drill structure.

## Core mechanic

- The net is divided into a small grid of tap targets (suggested 3 columns x 2 rows = 6 cells:
  glove-high, middle-high, blocker-high, glove-low, five-hole, blocker-low). Big, forgiving tap
  areas for young hands.
- A goalie covers some cells (the covered cells are saves). The remaining cells are open (goals).
- A short shot clock runs. The player taps an open cell to score.
- Tap an open cell in time: goal (points + juice). Tap a covered cell, or run out of time: save.
- N shots per session (suggested 10). Score is goals; points are weighted by speed and level.

```
   ┌───────────────────────────────┐
   │  [glove-hi]  [mid-hi]  [blkr-hi]│   goalie covers mid-hi + blkr-lo
   │     OPEN       ███       OPEN   │   open: glove-hi, blkr-hi,
   │  [glove-lo]  [5-hole]  [blkr-lo]│         glove-lo, 5-hole
   │     OPEN       OPEN      ███     │   tap an OPEN cell before it closes
   └───────────────────────────────┘
                  🥅 goalie
```

## Difficulty curve (adaptive, reuses createAdaptiveLevel)

Difficulty rises with level along three axes. The goalie covers more net, the open holes close
sooner, and the closing accelerates at the top end ("bigger faster"). Map level to a 0..1
fraction `t = levelT(level)` and interpolate (constants tunable):

1. **Goalie coverage grows with level.** Cells covered at the start of the shot:
   `coveredAtStart = round(lerp(1, 4, t))` on the 6-cell net (level 1 covers 1 cell leaving 5
   open; top level covers 4 leaving 2 open).
2. **Holes close faster (the goalie gets bigger during the shot).** During the shot, additional
   cells close on a schedule, so an open hole does not stay open. The number that close during
   the shot and how soon both scale with level:
   - `closesDuringShot = round(lerp(0, 2, t))` (at low levels nothing closes mid-shot; at high
     levels up to 2 more cells close before the clock ends).
   - `holeOpenMs = lerp(2200, 550, pow(t, 1.5))` is how long a closing hole stays open. The
     `pow(t, 1.5)` curve makes the window shrink slowly early and then drop off hard at high
     levels, so the goalie effectively gets bigger faster the better you get.
3. **Shot clock shrinks.** `shotClockMs = lerp(2600, 900, t)`. Even open cells must be hit before
   this expires.

Worked feel:
- **U7 / low level:** 1 cell covered, nothing closes mid-shot, ~2.6s clock. Pure "shoot where it
  is open." Goalie sits clearly to one side.
- **U9 / mid level:** 2-3 cells covered, maybe 1 closes mid-shot, ~1.7s clock.
- **U11 / high level:** 4 cells covered, up to 2 more slam shut quickly, ~0.9s clock. You must
  read the opening and shoot it now.

Age also seeds the starting level via the calibration system in the gym progression spec
(`2026-06-13-gym-progression-incentives-design.md`), so a U7 starts on the easy end and an U11
starts mid-curve.

## Scoring

- Goal: tapped an open cell while it was still open and before the shot clock expired.
- Save: tapped a covered/closed cell, or the clock expired.
- Points per goal weighted by how fast the tap was relative to the shot clock and by level (a
  fast goal at a high level is worth more), matching how other drills award points.
- Session result (score = goals out of N, points total, level, streak) flows through the
  existing `saveSession` pipeline unchanged.

## Architecture (mirrors existing drills)

| File | Responsibility | Action |
|------|----------------|--------|
| `src/cognitive-gym/shootoutCore.js` | Pure: build a shot situation for a level (covered cells, close schedule, clocks), score a tap | Create |
| `src/cognitive-gym/ShootoutDrill.jsx` | Canvas: draw net + cells + goalie, handle taps, run the clock, save the session | Create |
| `src/cognitive-gym/CognitiveGym.jsx` | Register the drill in the `DRILLS` array | Modify |

- Reuses `setupCanvas`, `pointerPos`, `levelT`, `lerp`, `rand`, and `createAdaptiveLevel` from
  `gymEngine.js`. Adds a small local net-and-goalie draw helper (the existing `drawRink` draws a
  full sheet; the shootout wants a net close-up).
- `shootoutCore.js` is deterministic given a seed so a session is reproducible (needed for the
  head-to-head challenge link in the gym progression spec).

## Drill registry entry (shape)

Mirrors the existing `DRILLS` entries:
- `id: "shootout"`
- `name: "Pick Your Spot"` (working title; alternatives: Top Shelf, Snipe, Beat the Goalie)
- `skill: "Shot Read"`
- `blurb`, `goal`, `why`, `trains`, `build: "canvas"`, `component: ShootoutDrill`

## Testing

Plain `node --test` unit tests on `shootoutCore.js` (pure):
- Higher level covers more cells at start (`coveredAtStart` rises with level).
- Higher level closes more cells mid-shot and shrinks `holeOpenMs` and `shotClockMs`.
- The `pow(t, 1.5)` window shrinks slowly at low levels and fast at high levels (assert the
  high-level drop is steeper than the low-level drop).
- Scoring: open-cell tap in time is a goal; covered-cell tap is a save; a tap after the hole
  closed is a save; a tap after the clock expired is a save.
- Determinism: the same seed and level produce the same situation.

## Open items

- Final drill name (lean: "Pick Your Spot").
- Whether to start with a 6-cell grid or a simpler 4-cell grid for the very youngest.
- The net-and-goalie art style (canvas drawing detail).

## Non-goals

- No live multiplayer shootout (head-to-head is async via the seeded challenge link).
- No goalie AI beyond the scheduled coverage and closing (no learning opponent).
- No deke/stickhandling input; this is a tap-the-open-net read, not a dexterity game.
