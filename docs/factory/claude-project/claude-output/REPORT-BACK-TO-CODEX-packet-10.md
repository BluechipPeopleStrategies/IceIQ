# Report back to Codex — packet-10

## 1. Snapshot/packet IDs and counts

- Snapshot: `rr-20260905-c8403be16748c919`. Packet: `packet-10`.
- Expected: 5 scenarios / 30 questions. Reviewed: 5 scenarios / 30 questions (complete).
- Verdicts: 24 `repair` (4 scenarios x 6 linked questions each), 6 `retain` (`exp26b-u9-009`, all six questions). 0 `blocked`. 0 unreviewed.
- Scenarios repaired (version 1 -> 2): `exp26b-u9-008`, `exp26b-u9-010`, `exp26b-u9-011`, `exp26b-u9-012`. `exp26b-u9-009` retained as-is: all seven checks passed independently, no shared or per-question defect found.

## 2. Five highest-impact before/after examples

1. **`exp26b-u9-008`, briefing/cues + Q1's explanation** — claimed YOU controls the puck "beside the boards"/"by the boards." Computed distance to the nearest side boards (corner-radius geometry, real tooling): **5.95 m** — under half the ice half-width away, not "beside." Reworded to "in the attacking end, off to one side" (Q1's explanation also directly repeated the false claim and was fixed).
2. **`exp26b-u9-008`, briefing/cues + Q2 option b** — claimed "Navy2 waits inside near the faceoff circle" (this was also baked into a scored `basis: scene` option). Faceoff-circle centres sit at (+-20.7,+-6.7) with a 4.572 m drawn radius; Navy2 is actually **5.98 m from the nearest centre — 1.41 m outside the circle**. Meanwhile **YOU sits 0.42 m from that same centre**, essentially on it, and is never described that way. This is a wrong-actor/landmark mismatch, not just an overstatement. Reworded Navy2's description to "farther inside, away from the boards"; Q2 option b changed from "Navy2 near the circle" to "Navy2 waiting farther inside."
3. **`exp26b-u9-011`, briefing/cues + Q2 option b/explanation** — claimed "Gold2 is behind YOU," restated in a scored option and its explanation. Computed the actual facing-dot-product (YOU's facing 0.1 rad vs. the direction to Gold2): **+1.39, positive**, meaning Gold2 sits on the same side as YOU's facing (~77 degrees off-centre, near the edge of forward vision) — not behind. Reworded to "off to your side, easy to miss without a scan," which preserves the real teaching point (this opponent needs a deliberate scan) without the false directional claim.
4. **`exp26b-u9-010`, briefing/cues + Q1 prompt + Q2 option b** — claimed Navy2's puck was "near the navy end boards" (actual: 5.48 m off) and Navy3 "waits near the blue line" (actual: 6.38 m off a thin-line landmark). Both claims were baked into question text (Q1's own prompt, Q2's own option), not just flavor text. Reworded to "in the defending end, off to one side" and "farther up, toward the neutral zone" respectively.
5. **`exp26b-u9-012`, briefing/cues** — claimed Gold1 carries "along the lower boards." Actual distance to boards: **7.95 m**, the largest overstatement found in this packet. Notably, the *relative* "lower"/"above the play" framing between Gold1 and YOU **is** correct for the app's actual 2D renderer (`ExperimentalBoard` in `ExperimentalPractice.jsx` draws `transform="translate(a.x,-a.y)"`, i.e. +y renders toward the TOP — confirmed by reading the actual render code, not assumed) — so only the boards-proximity clause was corrected, the "above/lower" language was kept.

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- No scene/answer-key conflicts found (every Q1 puck-ownership answer matches `setup.puck.owner` exactly across all 5 scenes; no invented possession).
- `exp26b-u9-012`'s "Defending" topic plays out with Gold1 carrying just inside what is technically gold's own defensive zone (x=8, past the +7.62 blue line) while Navy pressures — a defensible forecheck/support reading (flexible roles, not a fixed defensive-zone-only concept), but worth a human coach's eye; not changed since it is a legitimate tactical interpretation, not a geometry error.
- `usah-u14-situational-roles` (cited in `exp26b-u9-012`) is explicitly a 14U-level concept per the source itself; used here only as an older-age-inspired principle for a U9 activity, consistent with the AUTHORING-CONTRACT and the source's own "not a universal youth system" caveat.
- No rendered/live-app screenshot verification was performed (no browser access); all geometry was computed offline from the real validation tooling (`experimentalBankCore.js`, `coachRouteSurfaceInput.js`, `rinkAnchors.js`) and cross-checked against the actual `ExperimentalBoard` render code in `src/one-on-one/ExperimentalPractice.jsx`.
- No human coach review, app testing, or publication is claimed anywhere in this packet.

## 4. Curriculum bindings and gaps

- All 5 scenarios map to existing `curriculum-coverage.json` entries by ID (`exp26b-u9-008` through `-012`); no new curriculum binding is proposed in this packet — this run was a repair pass, not a gap-analysis pass. Domains already tagged: Puck Skills, Hockey Sense, Offensive Play, Defensive Play (per `curriculum-coverage.json`'s existing `domainSignals`).
- Format variety per scenario meets the >=4-type contract (choice, multi, position, sequence, explain all appear); no format gap identified in this packet's 5 scenes.
- No new content (`AUTHORING-CONTRACT.md` envelope) is included in this return; out of scope for this repair-focused run.

## 5. Files, validation, +y sweep, next packet

- **Files:** `docs/factory/claude-project/claude-output/review-packet-10.json`, this report.
- **Validator run:** `node validation/validate-return.mjs claude-output/review-packet-10.json` from the `claude-project` directory. Result: `{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":4}}`. Structure/stale-baseline checks only, per the tool's own stated limits.
- **Repair-receipt coverage check:** all 5 scenes in this packet were covered only by `combined-review.json` ("no-open-ai-finding") and `expansion/youth-first.json` (reviewer `luna-u13-peer-youth`, all "pass," zero findings) — no real repair receipt existed for any of them in `docs/factory/research/question-review/repairs/`. That "passed a zero-finding first-pass review with no repair receipt" pattern held again: 4 of 5 scenes had real, computable defects.
- **+y orientation sweep:** performed on every up/down/above/below-style spatial claim found in this packet (I read the actual `ExperimentalBoard` render code — `translate(a.x, -a.y)` — to confirm +y renders toward the TOP in the real 2D UI, matching the documented cross-view bug). Found 4 such claims: "YOU are below the puck" (`u9-010`) and "YOU are above the play" / Gold1's "lower boards" (`u9-012`) were all **verified correct** for the actual 2D renderer and left unchanged. No up/down-language defect was found in this packet — the defects found here were all board/circle/blue-line **distance** overstatements (and one facing/front-back mismatch in `u9-011`), a related but distinct geometry-check category from the +y bug itself.
- **Next packet:** packet-11 (per `PACKET-INDEX.md`), continuing sequentially.
