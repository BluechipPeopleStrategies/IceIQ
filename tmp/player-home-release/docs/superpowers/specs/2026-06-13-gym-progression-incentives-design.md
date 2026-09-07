# Cognitive Gym: Progression, Incentives & Calibration

Date: 2026-06-13
Status: Design approved, ready for implementation plan
Scope: U7 / U9 / U11 only (U13-U18 paused for now)
Author: brainstorming session (Thomas + Claude)

## Context

The Cognitive Gym (`src/cognitive-gym/`) has 10 canvas drills, each with adaptive per-drill
difficulty (`gymEngine.js` `createAdaptiveLevel`: 3 wins promote, 2 losses relegate, levels
1-20), and `gymStorage.js` already tracks levels, day streaks, career points, best scores, and
session history. What is missing is a *structure* on top of those raw materials that drives
repetition, learning, and a desire to compete, tuned for 6 to 11 year olds.

This design adds that structure in three parts: a smarter start (calibration), an incentive
system (mastery, XP, badges, daily goal), and age-appropriate competition. It deliberately
avoids ranking mechanics that stress young kids.

## Goals

1. Put every kid in flow from their first rep by starting drills at the right difficulty.
2. Give visible, compounding progress so coming back tomorrow feels worth it.
3. Add competition that motivates without humiliating a 7 year old.
4. Reuse the existing engine and storage; do not rewrite the drills.

## Design frame (game design)

Kids keep playing when three needs are met (Self-Determination Theory):
- **Competence:** clear, visible progress (stars, XP, level-ups, new bests).
- **Autonomy:** they choose what to train and set their own daily goal.
- **Relatedness:** they play with and against people they know (friends, team, league).

The retention loop is: pick a drill, get satisfying feedback, earn a visible reward, see
progress tick up, return tomorrow for the streak and the daily goal.

## Component 1: Smarter start (calibration)

Problem: every drill starts at level 1, so a capable kid grinds through trivial reps and a
young kid can still get overwhelmed by the wrong drill.

Design:
- **Seed by age band** as a floor: U7 starts low, U9 mid-low, U11 mid (concrete starting levels
  are tunable constants, suggested U7 = 2, U9 = 4, U11 = 6 on the 1-20 scale).
- **Placement first session:** the first time a kid plays a drill, use bigger up-steps (promote
  on 2 wins instead of 3, and allow a multi-level jump on a strong run) so they reach their real
  level in one sitting. After the first session, revert to the normal 3-up / 2-down adaptation.
- **One-time per drill**, stored as `calibrated: true`; a re-calibrate option resets it.
- Calibration reads the age band from the player profile (onboarding already captures age).

Architecture:
- Extend `gymEngine.js` with `calibratedStartLevel(ageBand)` (pure) and a `placement` option on
  `createAdaptiveLevel` (bigger up-steps for the first N reps).
- `gymStorage.js` gains a `calibrated` flag per drill record.

## Component 2: Incentives

- **Mastery stars:** bronze / silver / gold per drill at level thresholds (suggested 5 / 10 /
  15). Shown on a gym "mastery map" so progress is visible at a glance. Use icon plus label,
  never color alone (project accessibility rule).
- **Gym XP and rank:** a meta-progression separate from per-drill level. Every session grants XP
  (scaled by points and level) toward a gym-wide rank, so even a hard day pays off.
- **Daily goal and streak ring:** a simple daily goal ("train 2 drills today") with a progress
  ring, building on the day-streak `gymStorage` already computes.
- **Badges:** milestone badges (first level-up, 7-day streak, all drills tried, beat the goalie
  10 times) plus a few surprise/variable ones. Variable rewards add a dopamine hit without being
  gambling-like (no loot boxes, no currency to spend).
- **Juice:** level-up celebration, star fills, streak flames, new-best banners. For U7-U9 a
  friendly character frames the feedback.

Architecture:
- New `gymProgress.js` (meta-progression: XP, rank, daily goal, badge rules), layered on
  `gymStorage`. Pure rule functions (XP from a session, rank from XP, star tier from level,
  badge unlock checks) live in a `gymProgressCore.js` for unit testing.

## Component 3: Competition (age-gated, and it is the Pro upsell)

- **Beat your best (free floor, all ages):** personal bests, a "you vs last week" graph, the
  level climb. Always on, zero social pressure. This is the baseline for the youngest kids.
- **Challenge a friend or teammate (Pro):** send a *seeded* challenge link (same drill, same
  difficulty seed encoded in the URL). Both players run the identical set; scores compare when
  both are done. Async and friendly, no live-pressure timer race.
- **Leagues, not raw rankings (Pro):** Duolingo-style promotion leagues of roughly 20-30
  age-banded kids, with weekly promote/relegate, instead of a global leaderboard that tells a
  young kid he is four-thousandth. U7-U9 are friends-only or opt-in; U11 leagues are on.
- These map directly to the `competitiveLayer` Pro features in the pricing redesign spec
  (`2026-06-13-pricing-redesign-design.md`), so this work realizes part of that Pro tier.

Architecture:
- `challenges.js`: encode and decode a seeded challenge (drill id, difficulty seed, challenger
  score) in a shareable link. The seed makes both runs identical and is verifiable locally.
- Leaderboards and leagues require accounts plus Supabase, so they ride with pricing Phase 2.

## Phasing (so the first plan is plan-sized)

- **Plan 1 (buildable now, local):** calibration, mastery stars, XP and rank, daily goal and
  streak ring, badges, juice, and beat-your-best. Plus head-to-head via the seeded challenge
  link (no server needed).
- **Plan 2 (needs backend, rides with pricing Phase 2):** server-validated leaderboards and
  promotion leagues, gated to the Pro tier.

## Files

| File | Responsibility | Action |
|------|----------------|--------|
| `src/cognitive-gym/gymEngine.js` | Add `calibratedStartLevel`, placement option | Modify |
| `src/cognitive-gym/gymStorage.js` | Add `calibrated` flag per drill | Modify |
| `src/cognitive-gym/gymProgressCore.js` | Pure XP/rank/star/badge rules | Create |
| `src/cognitive-gym/gymProgress.js` | Storage-backed meta-progression | Create |
| `src/cognitive-gym/challenges.js` | Seeded head-to-head challenge links | Create |
| `src/cognitive-gym/CognitiveGym.jsx` | Mastery map, XP/rank, daily goal, badges UI | Modify |
| Individual `*Drill.jsx` | Use placement on first session | Modify (light) |

## Testing

Plain `node --test` unit tests (matching repo convention), pure cores only:
- `calibratedStartLevel` returns the right band per age; placement reaches a target level faster
  than normal adaptation on a winning run.
- `gymProgressCore`: XP from a session, rank thresholds, star tier from level, each badge rule.
- `challenges`: encode then decode round-trips the drill id, seed, and score.

## Open items

- Exact starting levels per age band and star thresholds (tunable constants).
- Mascot/character art for the U7-U9 framing (content, not code).
- Whether U7-U9 leagues are off entirely or opt-in.

## Non-goals

- No rewrite of the 10 existing drills' core mechanics.
- No real-money currency, loot boxes, or anything purchasable with in-game points.
- Leaderboards/leagues backend is out of the first plan (Plan 2 / pricing Phase 2).
