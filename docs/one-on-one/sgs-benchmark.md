# SGS positioning prototype benchmark

Measured 2026-09-05T13:45:20.263Z with v24.14.1. Reproduce with `node tools/benchmark-positioning-sgs.mjs`. Runtime: **11.54 seconds** on this host.

This is **640 configurations of two teaching families across five team formats**, not 640 reviewed lessons. All remain local coach-review drafts.

| Format | Configurations | Distinct exact freeze sequences | Button paths completed | Button paths blocked |
|---|---:|---:|---:|---:|
| 1v1 | 128 | 128 | 2586 | 870 |
| 2v2 | 128 | 128 | 3456 | 0 |
| 3v3 | 128 | 128 | 3264 | 192 |
| 4v4 | 128 | 128 | 3264 | 192 |
| 5v5 | 128 | 128 | 3264 | 192 |
| Total | 640 | 640 | 15834 | 1446 |

All 640 isolated-placement probes completed, validated their snapshots/owner attachment, and restored exactly. Each configuration also attempted all 27 Stay/Back/Forward sequences (17280 paths total). The JSON contains guard categories and the read where each path stopped. **Guard-blocked is not an incorrect hockey answer; completion is not proof of good positioning.**

The geometry fingerprint includes only the actual three freezes, excluding configuration IDs, labels of parameters and titles. The family axes change carrier depth/width, defender gap or inside position, support spacing/lane cover and the subsequent carry or receiver depth. No mirror or cosmetic variation earns uniqueness credit.

Physics assessed: **0**; physics-clean: **unassessed**. AI reviewed: **0**; AI approved: **unassessed**. Admitted to the bank: **0**. Movement guards describe the illustration and do not certify biomechanics, contact, skating speed, tactical correctness or learning effects.

Template SHA-256: `0a3ee638800e0c73a61660f70d35036ea4c6f680295310d03e4ecfe0b37de850`. Exact source and core hashes, timings, per-format counts and methods are in [sgs-benchmark.json](sgs-benchmark.json). Sources: [Gap Control](../library/gap-control.md), [Defensive Angling](../library/defensive-angling.md), [Off-Puck Support](../library/off-puck-support-offense.md), [Scanning](../library/scanning.md).

Authored pose provenance: Authored opening: F1 faces the attacking end; other skaters and G face the actual puck. F1 faces its carry path; the support-family D1 pressure pose faces F1. G turns toward each resulting puck freeze. The selected player keeps their submitted pose.

Saved answers currently bind the registered template, exact before-state, chosen point and reason. **Input-method/choice-ID capture and per-session source-file hash binding remain planned.** The source hashes in this benchmark identify this measured implementation; they do not add those fields to saved sessions.
