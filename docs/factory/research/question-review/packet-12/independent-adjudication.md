# Independent adjudication: packet 12

Status: review complete with follow-up flags. This is an independent hockey-content and exact-hash review, not human coach approval, mastery approval, deployment approval, or evidence that a static scene simulates movement or rebound outcomes.

Source return SHA-256: `92c43a0d33b69b4adfa6d786f492820305f334a85b0960f4763fc9dc213c3f6c`

The packet contains one proposed repair for `exp26-u11-006-q7` and 49 retained questions across five U11 scenarios. All 50 current content hashes matched the packet’s review coverage. The initial retained pass for q9/q10 was corrected after follow-up: q9’s reference was farther from the puck and not at a board, while q10 advised a next pressure/reset without explicitly stating the whistle/stoppage.

## Replacement

`exp26-u11-006-q7` correctly repairs both landmark claims. The loose puck at `(23,5)` is inside the nearest faceoff circle, and D1 at `(22,1)` is on the centre-ice side of the puck rather than between the puck and the net. The call preserves loose ownership and does not promise a rebound shot, goal, or arrival order.

## Retained coverage

The retained questions were reread against their complete authored scenes for ownership versus loose puck state, actor identity, coordinates, facing and landmark claims, screen-independent wording, defensible alternatives, age fit, and unsupported outcomes. Two follow-up defects were found and are recorded as flags in the JSON: `exp26-u11-006-q9` and `exp26-u11-006-q10`. Root’s amended proposal corrects both; the final exact-hash receipt must cover q7, q9, and q10 after those amendments.

Exact before/after question hashes, current/replacement scenario hashes, coverage counts, and review limits are in `independent-adjudication.json`.
