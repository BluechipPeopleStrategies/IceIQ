# Golden-Test Rules — 15 New Lessons (2026-06-11)

Fifteen new deterministic validators added to [`validators.js`](./validators.js), each a
permanent gate in the self-improving loop (see [`LESSONS.md`](./LESSONS.md)). Generated with
the four coach lenses (spatial/proxemics, hockey-IQ, antagonistic, kid-clarity/age) and
reconciled against the existing 32 rules so none duplicates a prior gate.

Each rule is a pure function `(s) => null | {kind:"err"|"warn", msg}`. `err` hard-rejects a
board; `warn` flags it for author review. **All 15 return `null` on the locked GOOD seed**
and leave the existing five regression fixtures green. Helpers used: `distance`,
`lineHitsCircle`, `resolveTargetCoords`, `INTERCEPT_RADIUS` (0.035), plus a new local
`youngestU(s)` that parses the youngest U-number out of `s.levels`.

## Summary

| #  | Rule | Lens | Kind | One-line lesson |
|----|------|------|------|-----------------|
| 1  | `exactlyOnePuck` | Hockey-IQ | err | A board must show exactly one puck — 0 or 2 is physically incoherent. |
| 2  | `numbersThemeMatchesActors` | Hockey-IQ | err | A `2-on-1`/`3-on-2` tag must match the skaters on the ice; the label is the lesson. |
| 3  | `oddManRushIsActuallyOdd` | Hockey-IQ | err/warn | Odd-man / power-play / penalty-kill must actually show the man-advantage. |
| 4  | `shootTargetsAttackingNet` | Hockey-IQ | err | A `shoot` must go at the attacking net, never your own. |
| 5  | `backcheckHeadsToOwnNet` | Hockey-IQ | err | A `backcheck` must travel back toward your own net, not up-ice. |
| 6  | `noDefenderInsideCrease` | Spatial | warn | Only the goalie belongs in the blue paint. |
| 7  | `goalieOnPuckToNetAngle` | Spatial | warn | The goalie must sit on the puck-to-net shooting line. |
| 8  | `netFrontThemeNeedsNetFrontPresence` | Spatial | warn | A `net-front` board needs a teammate planted at the net. |
| 9  | `selectionAllLanesBlocked` | Antagonistic | err | A receiver-pick board must leave at least one open receiver — never unsolvable. |
| 10 | `selectionSingleClearLane` | Antagonistic | warn | Only one receiver should be cleanly open; two+ open wrongs = ambiguous read. |
| 11 | `noPositionTagsOnYoungBoards` | Kid-clarity | err | U7/U9 use generic players — only `YOU`, no position tags. |
| 12 | `skaterCountWithinAgeCap` | Kid-clarity | err | U7 ≤ 5 / U9 ≤ 6 skaters — don't crowd young boards. |
| 13 | `advancedThemesGatedByAge` | Kid-clarity | err | Power-play, breakout, gap-control, cycle, etc. are U11+ concepts. |
| 14 | `noPressureMechanicsOnYoungBoards` | Kid-clarity | err | No timers / scan-windows / preview-locks on U7/U9. |
| 15 | `difficultyCeilingByAge` | Kid-clarity | err | U7 caps at difficulty 1, U9 at 2. |

Net: **11 hard errors, 4 warnings.** Errors are unambiguous broken-board or illegal-hockey /
age-gate cases; warnings are reads a coach might keep on purpose, so they route to review.

---

## The rules

### 1. `exactlyOnePuck` — err _(Hockey-IQ)_
**Lesson:** A board with zero or multiple pucks must never ship, because the entire read is
"where is the puck right now" and 0/2 pucks makes the play incoherent.
**Detection:** count `actors` of kind `puck`; if not exactly 1 → err. No gate (every board).
**Bad:** a duplicated board left two `puck` actors. **Good:** one puck on the carrier's stick.

### 2. `numbersThemeMatchesActors` — err _(Hockey-IQ)_
**Lesson:** A strict `N-on-M` theme must match the board, because the tag is what the kid is
being taught to recognize.
**Detection:** if a theme matches `/^\d+-on-\d+$/`, parse `A-on-D`; attackers = `player` +
`teammate`, defenders = `defender` (goalie excluded). Mismatch → err.
**Bad:** themed `2-on-1` but 3 attackers vs 1 defender on the ice. **Good:** `2-on-1` with
exactly 2 attackers vs 1 defender. _Note: a `2-on-1` drawn with a backchecker is really a
2-on-2; retag it or this fires (by design)._

### 3. `oddManRushIsActuallyOdd` — err/warn _(Hockey-IQ)_
**Lesson:** Advantage themes must show the advantage on the ice — there's no "odd man" if the
numbers are even.
**Detection:** `odd-man-rush` ⇒ attackers must exceed defenders (**err** otherwise);
`power-play` ⇒ attackers > defenders (**warn**, since a half-view can crop a teammate);
`penalty-kill` ⇒ defenders > your side (**warn**).
**Bad:** `odd-man-rush` with 2 attackers vs 2 defenders. **Good:** the GOOD seed (3 vs 1).

### 4. `shootTargetsAttackingNet` — err _(Hockey-IQ)_
**Lesson:** A `shoot` answer must terminate at the attacking net; shooting at your own net is
the opposite of the read and teaches a catastrophic habit. Goes beyond `verbMatchesContext`
(which accepts *either* net).
**Detection:** path + verb `shoot`; resolve `correct.end`; attacking net x = 0.92 (right/full)
or 0.08 (left-view); if the endpoint is closer to your own net than the attacking net → err.
**Bad:** right-view off-zone `shoot` ending at x≈0.10. **Good:** `shoot` ending at x≈0.91.

### 5. `backcheckHeadsToOwnNet` — err _(Hockey-IQ)_
**Lesson:** Backchecking is by definition skating back to defend; a forward-moving "backcheck"
inverts the lesson.
**Detection:** path + verb `backcheck`; if the endpoint moves toward the attacking net
(Δ-toward-own < −0.03) → err.
**Bad:** `backcheck` from x0.74 to x0.90 (toward the attacking net). **Good:** `backcheck`
from x0.55 back to x0.25.

### 6. `noDefenderInsideCrease` — warn _(Spatial)_
**Lesson:** A field defender drawn in the crease reads as a second goalie and corrupts the
net-front picture. (Warn, not err — a goal-line scramble can legitimately put a defender on
the paint; flag for a human look.)
**Detection:** any `defender` inside the right crease (x∈[0.88,0.95], |y−0.5|<0.08) or left
crease (x∈[0.05,0.12], |y−0.5|<0.08) → warn.
**Bad:** a defender at (0.91, 0.55). **Good:** defenders at the net-front but outside the paint.

### 7. `goalieOnPuckToNetAngle` — warn _(Spatial)_
**Lesson:** A goalie parked off the puck-to-net line misrepresents the save geometry the kid
is learning to read. Distinct from `goalieInCrease` (which only checks the goalie is *in* the
crease, not that it's on-angle).
**Detection:** with a goalie deep in its net (|gx−netX|<0.10) and the puck off the goal line
(|netX−puckX|≥0.05), interpolate the expected goalie y on the puck→net-center line; if the
goalie's y is off by >0.12 → warn.
**Bad:** puck low-and-wide, goalie parked on the top of the crease. **Good:** goalie centered
on the shooting line.

### 8. `netFrontThemeNeedsNetFrontPresence` — warn _(Spatial)_
**Lesson:** A board tagged `net-front` must have a teammate at the net, or it contradicts its
own premise (a body in front of the goalie).
**Detection:** theme `net-front` present and no `teammate` within 0.16 of the attacking net →
warn.
**Bad:** `net-front` board with both wingers out by the dots. **Good:** a teammate parked at
the top of the crease.

### 9. `selectionAllLanesBlocked` — err _(Antagonistic)_
**Lesson:** A receiver-pick board where every selectable teammate's lane is blocked is
unsolvable — the "correct" answer is a forced loss. Complements `selectionOpenLaneClear` (which
only checks the correct lane in isolation).
**Detection:** selection/sequence whose candidates are all `teammate`s; if no candidate has a
clear lane from the player (`lineHitsCircle(player, cand, def, 0.035)` for every defender) → err.
**Bad:** a defender on every passing lane. **Good:** at least one receiver with a clean lane.

### 10. `selectionSingleClearLane` — warn _(Antagonistic)_
**Lesson:** Exactly one receiver should be cleanly open; if two+ *wrong* candidates also have
clear lanes the player can be marked wrong for an equally-valid pass.
**Detection:** selection/sequence of teammates; count wrong candidates with a fully clear lane;
≥2 → warn.
**Bad:** three open wingers, only one keyed correct. **Good:** the GOOD seed (open winger +
one contested decoy).

### 11. `noPositionTagsOnYoungBoards` — err _(Kid-clarity)_
**Lesson:** U7/U9 kids don't think in positions; only `YOU` is meaningful, so position tags
(RW/LW/C/LD/RD) must never appear on those boards. (Encodes the project diagram-marker rule;
distinct from `positionTagsAlignWithLocation`, which is geometry, not age.)
**Detection:** `youngestU(s) ≤ 10` and any actor has a `tag` other than `YOU` → err.
**Bad:** a U9 board with a teammate tagged `RW`. **Good:** a U9 board where teammates carry no
tag and the player is `YOU`.

### 12. `skaterCountWithinAgeCap` — err _(Kid-clarity)_
**Lesson:** Young brains overload past a handful of moving bodies, so skater counts are capped
by age. (Distinct from `difficultyMatchesComplexity`, which caps *difficulty* by complexity,
not actors by *age*.)
**Detection:** skaters = `player`+`teammate`+`defender`; cap = 5 (U7) / 6 (U9); over → err.
**Bad:** a U7 board with 9 skaters. **Good:** a U7 board with 4 skaters + goalie.

### 13. `advancedThemesGatedByAge` — err _(Kid-clarity)_
**Lesson:** Structured systems (power-play, penalty-kill, gap-control, cycle, regroup,
neutral-zone-trap, breakout, backcheck) aren't introduced until U11+, so tagging them on a
U7/U9 board teaches the wrong model at the wrong time.
**Detection:** `youngestU(s) ≤ 10` and a normalized theme is in the gated set → err.
**Bad:** a U9 board themed `breakout`. **Good:** a U9 board themed `give-and-go` / `open-ice`.

### 14. `noPressureMechanicsOnYoungBoards` — err _(Kid-clarity)_
**Lesson:** IntelliGym pressure tools (hard timer, hide-defenders scan window, pre-read lock)
are for older, game-ready players and only frustrate little kids.
**Detection:** `youngestU(s) ≤ 10` and any of `s.timer` / `s.scanWindow` / `s.preview` present
→ err.
**Bad:** a U7 board with a 6-second timer. **Good:** a U7 board with no pressure mechanics.

### 15. `difficultyCeilingByAge` — err _(Kid-clarity)_
**Lesson:** A 3-star cognitive demand exceeds what these ages can handle no matter how few
actors are on the ice, so difficulty has a flat age ceiling. (Independent of
`difficultyMatchesComplexity` — a "simple" board rated 3 at U7 still fails here.)
**Detection:** ceiling = 1 (U7) / 2 (U9); `s.difficulty` over ceiling → err.
**Bad:** a U7 board at difficulty 3. **Good:** a U9 board at difficulty 2.

---

## Deferred candidates (next batch)

Strong proposals from the lenses that were held back to keep this batch at 15 and avoid
over-stacking the selection family — promote when a real board justifies them:

- `selectionDecoyNotStrictlyBetter` — a *wrong* receiver that is both open and strictly closer
  to the net than the keyed answer (decoy is secretly the better play). Hold as a future **warn**
  pending a bank sweep (risk of false positives on legit lower-angle reads).
- `mcCorrectNotSubsetOfWrong` — an MC `ok` option that is a near-duplicate / superset of a wrong
  option (two defensibly-correct answers).
- `oneDefenderMustBeNetSideOnOddManRush` — odd-man-specific tightening of `defenderGoalSide`
  (catches a single *trailing* defender that fakes a rush). Mostly covered by `defenderGoalSide`.
- `defendersNotStackedIntoUnsolvableWall` — overlaps rule 9 for the selection case; keep for
  path/point boards.
- `passTargetNotCrossRinkBombOrBuriedBehindPuck` — the keyed pass target is an implausible
  cross-rink bomb or buried behind the puck on a rush.
- `possessionPuckWithCarrier` — on a your-possession read the puck must sit with the player
  (warn).
- `promptSimplicityForYoungAges` — age-indexed readability cap on U7/U9 prompts (warn).

Also promoted from the LESSONS.md "formation-design lessons" backlog as covered-in-spirit:
the odd-man second-defender lesson is partially served by `defenderGoalSide` + rule 3.

## Verification

- `npm run test:rules` — all existing + 15 new fixtures green (one known-bad fixture per rule
  plus the locked GOOD seed). The harness gained an `expectWarn` mode for the 4 warning rules.
- Each rule was hand-checked to return `null` on the GOOD seed and to leave the prior five
  regression fixtures (`offsidesOnEntry`, `defenderGoalSide`, `actorsDoNotOverlap`,
  `promptLengthSane`, GOOD-passes) unchanged.
