# Report back to Codex — packet-13

**Snapshot:** `rr-20260905-c8403be16748c919`. **Packet:** `packet-13`.
Scope: `exp26-u11-009` through `exp26-u11-013` (5 scenarios, 50 questions, all U11).

## 1. Counts

- Assigned: 50 (5 scenarios x 10 questions). Reviewed: 50. Retained: 49. Repaired: 1
  (scenario, 1 question inside it). Blocked: 0. Unreviewed: 0. `completion: "complete"`.
- Every `baseContentHash`/`baseScenarioHash` in `review-packet-13.json` was recomputed
  with the real `questionContentHash`/`scenarioSnapshotHash` functions from
  `validation/tools/*.mjs` against both the packet's own scenario JSON and the live
  `bank-snapshot.json` and matches the manifest exactly on both — no stale-baseline
  drift, packet is current.
- Full structural validation (`validateExperimentalBank` from the real
  `experimentalBankCore.js`) returned zero errors on all 5 scenarios. `questionActorWarnings`
  and `positionSubjectIssue` (also the real functions) returned zero findings across all
  50 questions.

## 2. Highest-impact findings

1. **Repair — `exp26-u11-009-q8` (evasive-route/Skating, U11), the only real defect
   found.** Distractor option c read *"YOU still sees the puck"* — a subject-verb
   agreement error (YOU takes "see," not "sees"). This is the exact class of grammar
   defect the calibration packet already corrected once (U9-006 q7: "YOU still checks"
   -> "YOU still check"), and it slipped past every prior AI pass on this question
   (`catalog-review.json`, `combined-review.json`, `expansion/u11-first.json` via
   `luna-youth-peer-u11` all recorded "no-open-ai-finding"/"pass" on this exact content
   hash). I re-scanned the whole packet for the same pattern and found no other
   instance. Repaired to "YOU still see the puck," version bumped 1->2,
   `affectedQuestionIds: ["exp26-u11-009-q8"]`, self-checked and rehashed; hockey
   content, answer key (a,b) and every other question in the scene are unchanged.
2. **Confirmed clean — collinearity claims in `exp26-u11-011` and `exp26-u11-013`.**
   Both scenes assert a defender sits "between" two other actors (D1 between F1 and YOU
   in u11-011; D1 between YOU and the goal in u11-013). Verified numerically both times:
   all three actors share the same y and the defender's x is strictly between the
   other two x-values, so the collinearity is an exact, directly visible fact — and both
   questions phrase it as a positional cue ("difficult," "occupies the direct line"),
   never as a guaranteed block or save, matching calibration lesson 3.
3. **Confirmed clean — four previously-flagged sequence questions**
   (`exp26-u11-009-q3`, `-010-q3`, `-011-q3`, `-012-q3`): each carried a P3 "teaching"
   flag in `catalog-review.json` about rigid step ordering. Independently re-verified:
   each question's own explanation already hedges the order (e.g. u11-010-q3 explicitly
   notes "a skilled one-touch play would require different timing evidence"), and
   `followup/mixed-proposals.json` already resolved all four as "keep." I concur with
   that adjudication rather than just citing it; no further change needed.
4. **Confirmed clean — all previously-repaired questions in this packet**
   (across `exp26-u11-010-q7/q8/q9/q10`, `exp26-u11-011-q7/q8/q9/q10`,
   `exp26-u11-012-q7/q8/q9/q10`, from `final-roster-repairs.json` and
   `u11-actor-repairs.json`): re-verified independently rather than trusting the
   historical "pass" label — actorId now correctly targets the actual `YOU` actor (h2,
   not h1) in every position question, absent-actor references (a nonexistent "F2" in
   several scenes) are gone, and screen-relative wording ("above the defender") was
   replaced with named relationships ("neutral-zone side of D1") that check out against
   the real coordinates.
5. **Noted, not flagged — `exp26-u11-011-q8`'s "opposite point" wording.** The keyed
   option reads "whether D2 remains available at the opposite point." D2's actual
   position (23,1) is nearer centre/the net than "the point" (a blue-line-area term)
   would normally suggest. Read in context as "the opposite [bank-pass] point" (an
   alternate rebound-landing area, not a blue-line position), it's a defensible
   coaching description rather than a factual coordinate error, so I retained it and
   recorded the ambiguity in the coverage row rather than either failing it or silently
   passing it — this is a candidate for a future plain-language pass, not a repair.

## 3. Scene/answer conflicts, uncertainty, visual checks not performed

- No other scene/answer conflicts found across the 50 questions after checking every
  landmark-referencing phrase (net, slot, half wall, boards, neutral zone, blue line)
  in every option/explanation against real coordinates.
- No absent-roster or wrong-actor references found in the current (post-repair)
  content — `questionActorWarnings`/`positionSubjectIssue` from the real validator
  core returned nothing across all 50 questions.
- Grammar: regex-scanned every prompt, option and explanation for "YOU is/has/was/
  does/sees/were" and for "YOU <adverb> <verb>s" patterns; found exactly the one
  defect above (`exp26-u11-009-q8`), now repaired.
- No unsupported certainty found in any keyed/correct answer ("always," "never,"
  "guarantee," "certain," "will score/intercept" all appear only inside distractor
  options or explicitly-hedged explanations, never as an asserted correct claim).
- Visual/rendered-app check: **not performed** — no live app/browser access from this
  session; all geometry was verified against the real coordinate math
  (`isCoachRoutePoint`, the carried-puck formula, `makeScene`) and the manifest
  hashes, not a rendered screenshot.
- Human coach approval, app testing, and publication: **not claimed**, per the
  standing rule.

## 4. Sources checked (3 unique across this packet)

- Hockey Canada U11 Player Pathway (`hc-u11-pathway-2022`): fetched directly, confirmed
  the cited "U11 Skills Matrix" is on the document's own printed/PDF page 22 exactly as
  cited (Turning & Crossovers incl. evasive skating; Moving Passing & Receiving; etc.),
  supporting `exp26-u11-009`/`-010`.
- USA Hockey Skill Progressions (`usah-skill-progressions-2018`): fetched directly,
  confirmed the "10-and-Under" section (printed pp.17-19 / PDF pp.23-25) explicitly
  lists "indirect pass" and shooting/gap-control concepts, supporting
  `exp26-u11-011`/`-013`. This is a USA 10-and-Under resource adapted for Canadian U11;
  each scenario's own `sources[].use` field already discloses that, and 10-and-Under is
  the same functional age band as U11 (not a multi-band gap like the packet-11 finding).
- Hockey Canada "7 Principles for Coaches: Puck Control" (`hc-puck-control-2024`):
  a plain fetch 403'd; refetched with a standard browser User-Agent and got HTTP 200.
  Confirmed the cited section headings exist verbatim, supporting `exp26-u11-012`.

## 5. Curriculum bindings (planning signal only)

- `exp26-u11-009` (evasive-route/Skating) maps to the U11 matrix's "Turning &
  Crossovers"/"Backward Skating" (evasive skating) rows and to `u11.agility-mobility`
  (depth D) / `u11.decision-making` (depth D) in `curriculum-ledger.json`.
- `exp26-u11-010` (receiving-space/Receiving) and `exp26-u11-012`
  (missed-reception/Puck control) map to `u11.receiving` (depth M) and
  `u11.puck-control` (depth M).
- `exp26-u11-011` (indirect-pass/Passing) maps to `u11.passing` (depth M) and the USA
  source's explicit "indirect pass" item.
- `exp26-u11-013` (slot-shot-lane/Shooting) maps to `u11.shooting` (depth M) and
  `u11.off-puck-support-offense` (depth D, via F2's support angle).
- These are keyword/topic matches, not approved curriculum assignments — Codex's
  ledger reconciliation still governs actual binding decisions.

## 6. Files, validation, next packet

- `docs/factory/claude-project/claude-output/review-packet-13.json`
- `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-13.md` (this file)
- Validator run: `node validation/validate-return.mjs claude-output/review-packet-13.json`
  -> `{"errors":[],"warnings":[],"counts":{"assigned":50,"reviewed":50,"remaining":0,"repairedScenarios":1}}`.
  Structure/stale-baseline checks only, per its own stated limits; independent hockey
  review and rendered-scene verification remain required before any integration.
- Checks not run: no live app/browser rendering check (no app access this session);
  no independent second-reviewer pass (that remains Codex/Luna's role per the project
  contract — this is one full independent review, not two).
- Next packet to continue: packet-14 (not yet opened this session; packets 01-12 were
  reported done before this session started).
