# Task A: Geometry Verification Summary

**Checked:** 4 flagged questions, plus a related sanity-check question in each
of their scenes (8 spatial claims total). **Result: all 4 consistent, 0
discrepancies found.**

## What was checked

Two of the four (`exp26b-u9-010-q5`, `exp26b-u13-020-q5`) are simple
"which point is closer" questions — plain distance between two dots. Both
check out: the app's marked answer is the numerically shorter distance.

The other two (`exp26-u18-001-q5`, `exp26b-u18-001-q5`) are the harder case:
"which passing line stays farther from a defender." A passing line is really
a line *segment* between two players, not an infinite line, so there are two
possible ways to measure "distance from a defender to that line" — the
straight perpendicular distance to the *infinite* line, or the distance to
the nearest point actually *on the segment* between the two players. These
can disagree when the defender is positioned off to the side, beyond one end
of the pass.

For both of these questions, I computed the distance both ways. In every
case here, the defender's nearest point on the infinite line happened to
fall inside the actual passing lane (not past either player), so the two
methods gave the same number. The app's marked answer was correct under
both measurements.

One related question in the same scene as `exp26-u18-001-q5` (comparing
lines to two different players, D2 and F3) is the one case where the two
measuring methods gave visibly different numbers (4.03 vs. 4.47). Even so,
the correct answer didn't change — the segment-based number just made the
gap between the two options bigger, not smaller or reversed.

## Bottom line

The specific bug pattern I was asked to hunt for — a question whose marked
answer only holds if the app measures "distance to a line" the wrong way
(infinite line instead of the actual pass) — was not found in these four
questions. Their coordinates and marked answers hold up under hand
calculation either way. This does not clear the questions on coaching
quality or teaching value; it only confirms the numbers behind them are
correct arithmetic.

Full working (coordinates, both computed distances, and notes) is in
`geometry-verification.json` in this same folder.
