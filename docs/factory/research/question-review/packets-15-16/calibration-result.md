# Known-case calibration

This is a regression calibration, not an unseen blind test: several cases were previously reviewed in this thread. Findings were recorded from the case payloads before opening the answer key, then reconciled.

| Case | Pre-key finding | Key | Result |
|---|---|---|---|
| exp26-u11-006-q7 | repair: puck is inside circle; D1 is centre-ice-side, not between puck and net. | repair: Puck is inside the circle; D1 is centre-ice-side of the puck, not between it and the net. | match |
| exp26-u11-006-q9 | repair: old point is farther from puck (8.06m to 9.23m) and not at opposite boards. | repair: The reference moves farther from the puck (8.06 m to 9.23 m) and is not at the opposite boards. | match |
| exp26-u11-006-q10 | repair: covered puck must explicitly include whistle/stoppage; no continued pressure. | repair: Covered-puck feedback needs an explicit stoppage scenario and must not advise continuing pressure after the whistle. | match |
| exp26-u11-011-q8 | repair: D2 is away defender, not support; key must condition on closing receiving area. | repair: D2 is an away-team defender, not opposite-point support. | match |
| exp26-u11-012-q7 | repair: below is camera-relative; use side-board relation. | repair: Below me depends on the camera; the puck is closer to the side boards than YOU. | match |
| exp26-u11-012-q5 | repair: reaching first does not establish control; state control explicitly. | repair: Reaching the puck first does not establish control. | match |
| exp26-u11-016-q1 | repair: preserve comparator and correct YOU grammar; y=2 is closer middle than F1 y=7. | repair: YOU takes do, not does; preserve Compared with F1. | match |
| exp26-u11-016-q7 | repair: recipient is teammate/goalie, not opposing F1; avoid guaranteed containment. | repair: F1 is an opponent. Communicate the defensive plan to the shown teammate/goalie, without guaranteeing containment. | match |

All eight expected repairs were detected. This confirms the checks to reapply: rink-relative landmarks, measured movement, possession versus arrival, explicit stoppage, roster/team ownership, and preserved grammatical comparators. It does not establish correctness of packets 15–16 or replace independent review.
