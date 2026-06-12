# Scenario QC Lessons — the self-improving rule loop

**The rule: a hockey-logic mistake gets fixed ONCE, then can never recur.**

Every time a bad board is caught — by a validator, by the QC grid, or by a human
(coach/founder) — we do not just fix that one board. We encode the *general*
lesson as a permanent gate so the whole factory inherits it. The gate-set only
grows; the generator can only get more correct over time.

## The loop (follow this every time)

1. **Catch** — a board looks wrong (validator parks it, QC grid review, or a coach
   flags it).
2. **Generalize** — state the rule in words: "X must never happen because Y."
3. **Encode** — add it as a rule in `validators.js` (machine-checkable hockey
   logic) or as a formation invariant in `formation-to-seed.mjs`. Now it runs on
   EVERY compile of EVERY formation and seed, forever.
4. **Regress-test** — add a known-bad fixture that must FAIL and a known-good that
   must PASS (golden test), so the rule can't silently break later.
5. **Sweep** — relint the existing bank; the new rule usually finds older boards
   with the same flaw (e.g. offsides-on-entry found 6). Log them as debt.
6. **Record** — add a row below.

Two layers of memory work together:
- **Deterministic validators** (`validators.js`) — hard hockey rules, zero tokens.
- **The gauntlet's visual rubric/lessons** (`tools/gauntlet/visual-lessons.json`,
  `visual-rubric.json`) — softer learned heuristics the LLM path accumulates.

## Lessons encoded so far

| Date | Lesson | Where | Kind |
|------|--------|-------|------|
| 2026-06-11 | Every off-zone scene needs a defender goal-side (between puck and net) — else the rush has no one to beat. | `validators.js` `defenderGoalSide` | err |
| 2026-06-11 | A selection answer's lane must be CLEAR from the carrier, and ≥1 wrong option BLOCKED — geometry is the read. | `validators.js` `selectionOpenLaneClear` | warn |
| 2026-06-11 | Carry-puck off-zone board with the puck at the blue line + teammates deeper reads as an illegal entry (offsides). Establish the puck inside the zone. | `validators.js` `offsidesOnEntry` | err |
| 2026-06-11 | A board must show exactly one puck — 0 or 2 is physically incoherent. | `validators.js` `exactlyOnePuck` | err |
| 2026-06-11 | A literal `N-on-M` theme must match the skaters on the ice (the tag is the lesson). | `validators.js` `numbersThemeMatchesActors` | err |
| 2026-06-11 | Odd-man-rush must show attackers > defenders; power-play/penalty-kill must show the man-advantage in frame. | `validators.js` `oddManRushIsActuallyOdd` | err / warn |
| 2026-06-11 | A `shoot` must terminate at the attacking net, never your own (shooting the wrong way teaches a catastrophic habit). | `validators.js` `shootTargetsAttackingNet` | err |
| 2026-06-11 | A `backcheck` path must travel back toward your own net, not up-ice toward the attack. | `validators.js` `backcheckHeadsToOwnNet` | err |
| 2026-06-11 | Only the goalie belongs in the blue paint — a field defender in the crease reads as a second goalie. | `validators.js` `noDefenderInsideCrease` | warn |
| 2026-06-11 | The goalie must sit on the puck-to-net shooting line, not parked off-angle. | `validators.js` `goalieOnPuckToNetAngle` | warn |
| 2026-06-11 | A `net-front`-themed board needs a teammate planted at the net (the screen/tip premise). | `validators.js` `netFrontThemeNeedsNetFrontPresence` | warn |
| 2026-06-11 | A receiver-pick board must leave at least one open receiver — never every lane blocked (unsolvable). | `validators.js` `selectionAllLanesBlocked` | err |
| 2026-06-11 | Only one receiver should be cleanly open; two-plus open wrong candidates make the read ambiguous. | `validators.js` `selectionSingleClearLane` | warn |
| 2026-06-11 | U7/U9 use generic players — only `YOU`, never position tags (RW/LW/C/LD/RD). | `validators.js` `noPositionTagsOnYoungBoards` | err |
| 2026-06-11 | Cap skaters by age — U7 ≤ 5, U9 ≤ 6 — so young boards stay readable. | `validators.js` `skaterCountWithinAgeCap` | err |
| 2026-06-11 | Structured systems (power-play, breakout, gap-control, cycle, …) are U11+; gate them off U7/U9. | `validators.js` `advancedThemesGatedByAge` | err |
| 2026-06-11 | No IntelliGym pressure mechanics (timer / scan-window / preview) on U7/U9 boards. | `validators.js` `noPressureMechanicsOnYoungBoards` | err |
| 2026-06-11 | Flat difficulty ceiling by age — U7 caps at 1, U9 at 2. | `validators.js` `difficultyCeilingByAge` | err |

See `GOLDEN-RULES-2026-06-11.md` for the full spec, lens attribution, and deferred candidates.

## Formation-design lessons (not yet validator rules — candidates to encode)

- **Odd-man 2nd defender** must play the middle (goal-side of the carrier), not
  drift net-side of the open winger, or the "open" answer looks covered.
  (Fixed in `odd-man-rush.js`; could become a rule: no non-shading defender within
  the correct receiver's lane.)
- **"Pick the spot" must have a CONCRETE referent** *(recurred twice — strong
  rule)* — a point answer must target a player or a self-relative position (e.g.
  "where YOU step up to"), never abstract empty ice or "the lane." First hit:
  `oz-backdoor` tapping empty ice (fixed with a real backdoor teammate). Second
  hit: `nz-gap-1on1` "tap the lane to steer into" (fixed → "tap where you step up
  to tighten the gap," a concrete spot between the D and the carrier, plus an MC
  stating the read). When a point target isn't a player, it must be defined
  relative to an actor.

When a formation-design lesson recurs, promote it to a `validators.js` rule.
