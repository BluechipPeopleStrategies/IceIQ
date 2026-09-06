# Report back to Codex — packet-15

Snapshot: `rr-20260905-c8403be16748c919`. Packet: `packet-15`.

## 1. Counts

- Assigned: 5 scenarios / 50 questions (exp26-u11-019 through exp26-u11-023, all U11).
- Reviewed: 50 / 50. Retained: 49. Repaired: 1 (exp26-u11-019-q8). Blocked: 0.
- Completion: **complete**. `remainingQuestionIds`: none.
- Repairs proposed: 1 scenario replacement (exp26-u11-019, version 1 -> 2). No new scenarios/questions proposed this run (repair-only packet).

## 2. Five highest-impact examples

1. **exp26-u11-019-q8 (repair)** — wrong-answer option c read "YOU was previously supporting F1." Incorrect subject-verb agreement for second-person YOU (matches the recurring "YOU is/was" defect class called out in this assignment). The option was already correctly excluded from the answer key (`answer:["a","b"]`), so only the wording was defective. Fixed to "YOU were previously supporting F1." A full-file grep of packet-15 for every `YOU + verb` pattern found exactly this one instance and no others; recomputed `questionContentHash` for all 10 questions in the scenario confirms only q8's hash changed.
2. **exp26-u11-021-q3 / exp26-u11-022-q3 / exp26-u11-023-q3 (retain, independently re-affirmed)** — these three sequence questions carried a historical P3 "teaching" flag (`catalog-review.json`) questioning whether the ordered steps are actually timing-independent. `followup/mixed-proposals.json` already adjudicated all three "keep," reasoning that each sequence integrates a scan/recognize/support routine that the scenario's sibling questions (q2, q5, q6) don't otherwise test as a whole. On independent re-review I concur: each explanation already concedes the steps can overlap ("Rechecking can happen during the approach; it is not a requirement to pause with the puck," etc.), so the sequence teaches an emphasis order, not a rigid stop-motion checklist. No change proposed; retained.
3. **exp26-u11-022-q9 / exp26-u11-023-q9 (retain, historical repair verified)** — both carry an already-applied, already-rechecked repair (`u11-actor-repairs.json`) that replaced screen-relative wording ("above the centre-ice contest" / "above F2") with named relationships ("Navy side of the centre-ice contest" / "between F2 and Gold's net"). I independently re-verified the geometry behind the new wording: navy C sits at x=-1 (negative-x side of the centre dot), matching the -019/-023-q9 "Navy side" reference at x=-2.1; and the -023-q9 reference (21,-4.4) is numerically farther from Gold's net than D1, matching "between F2 and Gold's net." Both confirmed accurate; retained as-is.
4. **exp26-u11-020-q4 (retain, geometry-verified)** — position reference (18,5) is claimed to "come near the diagonal outlet route" between D1 (20,7) and D2 (8,-7). I computed the actual D1-D2 line and confirmed the reference sits within 0.33 m of the interpolated point at x=18 — a genuine, numerically grounded collinearity claim, not an assumption. The explanation still correctly hedges that this is "not proof that the pass is blocked," matching the calibration lesson that actor/line collinearity is a warning, not proof of a blocked pass.
5. **exp26-u11-023-q4 (retain, geometry-verified)** — explanation claims the support reference (19,-3) sits "farther out than the net-front defender" (D1). Computed distances to the net confirm this: D1 at (24,-6) is 6.77 m from the net; the reference (19,-3) is 8.67 m from the net — the explanation's specific spatial claim is numerically true, not merely plausible-sounding.

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- No scene/answer conflicts found. No wrong-actor, invented-possession, or off-ice-point defects found (structural validator + `isCoachRoutePoint` ran clean on every actor, puck, carried-puck position, and position-question reference across all 5 scenarios).
- No hockey-rule or contact/safety claims are made anywhere in this packet; all tactical statements use `basis: coaching` with explicit hedging language, and no correct answer relies on an unverified rule.
- Visual/rendered-UI verification was **not performed** — no live app or browser access is available to this session. Only offline coordinate/geometry verification (via the bundled `experimentalBankCore.js` / `coachRouteSurfaceInput.js` helpers) and JSON-level review were done. Camera framing, stick/label legibility, and on-screen readability remain unverified, per the assignment's own limits.
- Human coach approval, app testing, and publication are not claimed anywhere in this return.

## 4. Curriculum bindings and gaps (this packet's contribution)

Domain signals (from `curriculum-coverage.json`, keyword-matched, planning signal only — not an approved binding):
- exp26-u11-019 (turnover-transition) -> Transition & Compete / Defensive Play / Offensive Play. Best-fit concept: `u11.transition-reads` (depth D).
- exp26-u11-020 (forecheck-outlet) -> Defensive Play / Hockey Sense / Puck Skills. Best-fit concept: `u11.forecheck-pressure` (depth I).
- exp26-u11-021 (two-on-one-read) -> Offensive Play / Hockey Sense. Best-fit concept: `u11.odd-man-reads` (depth I) — directly supported by the cited USA Hockey source, which names "2-on-1 situations" verbatim under Team Play (10-and-Under).
- exp26-u11-022 (faceoff-second-play) -> Transition & Compete / Offensive Play. No single existing concept names "faceoff" or "second play" specifically; closest is `u11.off-puck-support-offense` (depth D) plus a general team-play/possession-check framing. Possible genuine gap: a dedicated "faceoff / restart possession-check" node does not exist in the locked curriculum spine — flagging as a candidate gap rather than assuming a binding.
- exp26-u11-023 (corner-role-separation) -> Offensive Play / Hockey Sense / Puck Skills. Best-fit concept: `u11.off-puck-support-offense` (depth D).

These are keyword/domain signals only, per the project's own caution that the coverage map's matches are "planning signals, not approved curriculum assignments." No binding decision is asserted here; a full gap-plan synthesis across all 200 scenarios is out of scope for a single-packet return.

## 5. Files, validation run, next packet

- `docs/factory/claude-project/claude-output/review-packet-15.json` — this packet's review + 1 repair proposal.
- `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-15.md` — this file.
- Structural validation run: `node validation/validate-return.mjs claude-output/review-packet-15.json` from `docs/factory/claude-project/`. Result: `{"errors":[],"warnings":[],"counts":{"assigned":50,"reviewed":50,"remaining":0,"repairedScenarios":1}}`.
- Checks NOT run: no rendered/app/browser visual check (unavailable in this session); no human coach review; no independent second-AI (Luna) re-review of the new repair (that remains Codex's separate step per the project instructions).
- Geometry/hash verification method: ran the bundled `experimentalBankCore.js`, `coachRouteSurfaceInput.js`, and the `questionContentHash` / `scenarioSnapshotHash` helpers directly under Node against every scenario/question in this packet — confirmed all 5 `baseScenarioHash` and all 50 `baseContentHash` values match the packet exactly, `validateExperimentalBank` returned zero structural errors, and every actor/puck/reference point is on-ice per `isCoachRoutePoint`.
- Source checks actually performed (not just cited): all 3 unique source URLs used in this packet were fetched and read (one required a browser User-Agent retry after an initial 403, consistent with the known hockeycanada.ca behaviour); each is recorded in `sourceChecks` with what it does and does not support.
- Next packet to continue: packet-16 (per the numbered-packet sequence; packet-14 is being reviewed concurrently by another agent and was not touched here).
