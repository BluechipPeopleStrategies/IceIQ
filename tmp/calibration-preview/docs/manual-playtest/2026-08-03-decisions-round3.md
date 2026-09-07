# Decisions — round 3, 2026-08-03

Four decided. Recorded with the reasoning so none needs re-asking.

---

## 1. Run the Play — **IN-ZONE ONLY**

The screenshot (`12:15:43`) shows five skaters scattered across the full 200-foot
sheet: one deep in the left end, one at centre, one at the right blue line, two in the
right end. A pass from `16` to `19` spans the whole rink, and skaters sit on both sides
of both blue lines with no puck established — so any sequence crosses lines illegally.
Thomas: *"it would actually be offside, and we don't really want to shoot something 200
feet."*

**Confine every skater to one end zone and render that zone filling the canvas.**

Both complaints die at once: the longest pass becomes ~60 ft, and there is no line to
cross. The memory task is untouched, and the markers get *bigger* rather than smaller
because one zone now fills the space that previously held the whole sheet.

Rejected: full-sheet-made-legal (needs a puck-carrier concept the drill does not have,
*and* still needs a distance cap) and dropping the rink backdrop (cheapest, but throws
away the hockey feel for a hockey product).

---

## 2. `blue line` at U7/U9 — **REWRITE AROUND THE IDEA, AND MATCH THE VISUALS**

> "I'm okay with rewriting around an idea, but then we should be showing only cross-ice
> clips for U7 and U9."

**The second half is the important half, and it is a real catch.** Banning the *word*
while still drawing a full sheet with blue lines would have been half a fix — the
picture would keep making a promise the language had just withdrawn. If U7/U9 do not
have a blue line, they must not be shown one.

So this is now two pieces of work:

**2a. The six questions** — keep the support concept, drop the rule. The six are all
distractors about waiting or not getting too far ahead, which is the offside idea:
*"Stop at the blue line so you do not get too close"* → *"Wait until your teammate is
ready before you go."*

**2b. The visuals** — U7/U9 must render cross-ice / half-ice, never a full sheet with
blue lines.

Scope, checked before assuming the worst:

- **0 of 69** U7/U9 bank questions carry an image at all, so there is nothing to redraw
  there.
- **All 5** U7/U9 seeds already use a half-ice view (`view: right|left`,
  `zone: off-zone|def-zone`) rather than a full sheet.
- `RinkStage.jsx` **already** swaps zone vocabulary by age —
  `young ? "OUR END" : "DEFENDING ZONE"` — so the age concept exists in the render
  layer and only needs extending.

The remaining question is whether the half-ice crop still *draws* a blue line at the
zone boundary, and whether U7 (true cross-ice, nets on the side boards) should differ
from U9 (half-ice, regular net). That is the work.

---

## 3. `u9_dz_positioning_v1` — **MOVE BOTH PLAYERS**

The checking forward is drawn ~12 m up-ice from the goal line while the prompt calls it
parked in front of the net, and the goalie was 6.9 m off its own net centre (already
fixed).

**The audit's own suggested fix was wrong and must not be applied.** Moving `check` to
0.115 alone gives `net 0.067 < check 0.115 < YOU 0.19` — which puts YOU puck-side of
the check, the exact mistake the board teaches against. It would also still score the
wrong answer, at 0.0995 against a 0.10 tolerance.

**Move the check to genuine net-front AND move the keyed spot to ≈(0.091, 0.48)**, so
`net < YOU < check` still holds and the lesson survives. This changes the keyed answer,
so it needs a hockey eye on the result.

---

## 4. QA gate — **BOTH FIXES**

The misplaced goalie shipped despite two validators catching it. The root cause is not
the goalie:

> `scripts/qa-sweep.mjs` line 64 exits 0 when everything is a warning.

Warnings gate nothing, so a third warning would have changed nothing.

**4a.** Add a narrow new **error**: goalie more than ~0.7 m behind its own goal line, or
more than ~3 m off the net's centre line, skipped when the goalie is a placeable item.
Deliberately *not* flipping the existing `goalieInCrease` rule to error — a goalie
legitimately leaves the crease.

**4b.** Make `qa-sweep` exit non-zero on warnings **above a recorded baseline**, so new
warnings block while the six known ones do not. Without this, 4a fixes one class and
leaves every other warning still gating nothing.

---

## Still open

- The 28-stem review sheet ([here](2026-08-03-missing-asks-review-sheet.md)) — five
  decisions, two of them accept-all blocks.
- `migration_0007` — creates `training_sessions`, which does not exist in production.
  Thomas's to run.
- Shootout rendering approach, and the Shoot-or-Hold trial count (`avgRt` gets noisy at
  5 trials).
- Two Things is still not rail-converted.
- `u13_breakout_position_place_v1` `fc2` blocks the keyed centre outlet — no lint rule
  catches it, and fixing it moves either a forechecker or the answer.
