# Packets 21–34: adjudication and review failures

Date: 2026-09-06. Scope: 14 completed Claude returns, 572 question records across 70 scenes. Experimental practice only. Supabase, human coach approval and mastery admission are outside this release.

## What was found

The original source returns remain unchanged. Initial Luna proposals and any initial independent receipts are retained as `superseded-initial-*`; `luna-amended-proposal.json` preserves the intermediate proposal before root's final amendments. Those files are historical evidence, not permission to apply their contents. Only the exact current `proposed-repairs.json` and matching `independent-final-recheck.json` authorize the applicator.

Root's serialized-payload review overturned initial passes. Concrete examples:

- `exp26-u13-015-q1`: Gold 1 at x=-6 is between the blue lines, not at a half wall. The keyed location now says a wide neutral-zone lane.
- `exp26-u13-016-q10`, `exp26b-u13-013-q6`, and `exp26b-u13-017-q4`: feedback reversed the net-side relationship. Final wording puts the defender nearer Navy's net and keeps changing threats in the read.
- `exp26-u13-023-q9`: the earlier collecting target moved farther from the loose puck. The final target approaches it without assigning control. Q10 also no longer requires settling the puck before a one-touch pass.
- `exp26b-u15-003`: the existing bank showed only two Navy skaters, while the source replacement and initial proposal showed six under four-versus-five wording. The final scene depicts four Navy and five Gold skaters. These were different defects at different stages, not one identical bank error.
- `exp26b-u15-005-q4`: the initial high-support point was deeper toward the attacking net than F2. The final point is behind F2 toward the blue line, with YOU remaining a support player.
- `exp26b-u15-004`: Gold 1 is closer to the loose puck than YOU. The briefing now says so. The later possession question requires clear control rather than treating arrival first as ownership.
- `exp26-u15-015-q7`: YOU was incorrectly speaking as the low off-puck support despite owning the puck. The final call identifies YOU as carrier, F1 low and F2 inside.
- `exp26-u15-002-q7`: Gold 1 was described as occupying the F2 route; the coordinates place that defender nearer the F3 route. The call now names the correct pressure relationship.
- Several attempted fixes left the original false briefing intact, introduced agreement errors, or appended a disclaimer after an unsupported promise. Root corrected the actual serialized text and replaced those promises with concrete comparisons and conditional next checks.

The second review also raised a false positive: stored A1/A2 labels versus Gold 1/Gold 2 in prose. `src/visuals/actorLabel.js` deliberately maps those away-team labels to the Gold display name; `actorLabel.test.mjs` verifies the mapping. That finding was rejected rather than changing correct names. A proposed “does YOU” grammar correction was also rejected in favour of “do YOU”.

## Verification boundaries

Five regression tests were run against the unrepaired bank and all five failed for the intended roster, support-depth, collection-distance, rebound-distance and neutral-zone-answer defects. Their post-repair results belong in the release evidence.

Per-packet `root-review.md` exposes final question text, roster/possession and measured position movement for the reviewer. Measurements and hashes do not establish tactical correctness, gaze, stick reach, arrival time, physical safety or player comprehension. The final exact-content independent review is separate from browser checks and deployment. No claim is made that every possible content defect has been eliminated.
