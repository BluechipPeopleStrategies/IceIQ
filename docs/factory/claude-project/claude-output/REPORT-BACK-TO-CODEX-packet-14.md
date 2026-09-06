# Report back to Codex — packet-14

**Snapshot:** `rr-20260905-c8403be16748c919`. **Packet:** `packet-14`. **Scenarios:** 5 (`exp26-u11-014` .. `exp26-u11-018`, all U11). **Questions:** 50 (10 per scenario). **Completion:** complete — 50/50 reviewed, 0 remaining, 0 blocked.

## 1. Counts

| | Count |
|---|---|
| Reviewed | 50 / 50 |
| Retained (all 7 checks pass) | 48 |
| Repair proposed | 2 |
| Blocked | 0 |
| Unreviewed | 0 |

Both repairs are single-field grammar fixes inside otherwise-sound scenes; no scenario setup, geometry, roster, answer key, or hockey content changed.

## 2. Highest-impact findings

1. **`exp26-u11-015-q1` — subject/verb agreement.** Prompt read "Which net **is** YOU protecting as the gold defender?" This is the exact defect class the calibration adjudication already fixed once (U13-010: "Why is YOU" -> "Why are YOU") and that the assignment brief specifically asked this pass to hunt for. Repaired to "Which net **are** YOU protecting as the gold defender?" -- answer key and every other field unchanged.
2. **`exp26-u11-016-q8` option c -- subject/verb agreement.** Distractor text read "**YOU sees** the puck." Same defect class as the packet-13 calibration finding ("YOU still sees the puck" -> "YOU still see the puck"), here inside an unselected multi-select distractor rather than a prompt. Repaired to "YOU **see** the puck." Answer key (`a`,`b`) unchanged.
3. **`exp26-u11-018-q7` and `-q9` -- already correctly repaired, verified not re-broken.** The packet's own embedded `historicalReports`/`repairReceipts` show these two questions originally sent the gold defender toward the "left net" (wrong -- Navy attacks +x/right, so gold defends the right net). Independently re-verified against the packet's live text: both now read "right net" and the content hashes match the manifest exactly, confirming the fix is the live state, not a stale proposal. No further action needed; recorded as retained with the history noted, per the calibration lesson to use the newest applicable receipt rather than re-flagging a closed issue.
4. **Two P3 "sequence conditionality" notes on `exp26-u11-017-q3` and `exp26-u11-018-q3`** (from `catalog-review.json`) were superseded by a newer, more specific decision in `followup/mixed-proposals.json` ("keep" -- the ordering teaches a repeatable defensive read, not a rigid rule). Independently re-read both sequences against that reasoning; agree they are fine as authored. No repair proposed.
5. **All 10 geometry-bearing `position` questions per scenario (`q4`/`q9` pairs) were run through the actual `isCoachRoutePoint`, `positionSubjectIssue`, and `questionActorWarnings` helpers plus manual distance math** -- every reference point is on ice, every `actorId` targets the actor actually labelled YOU, and every reference moves the actor by >=0.1 m. No wrong-player, off-ice, or "impossible relative to own carried puck" defects found anywhere in this packet.

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- No scene/answer conflicts found beyond the two grammar items above.
- No contact/safety or playing-rule claims are made anywhere in this packet; all tactical content stays at the "coaching suggestion, conditional" level the contract requires.
- **Visual/rendered verification was not performed** -- no access to the live app or a browser session. Camera framing, label legibility, and stick/puck rendering were not inspected; only offline geometry (rink bounds, corner radius, carried-puck formula) was checked numerically via the real `experimentalBankCore.js`/`coachRouteSurfaceInput.js`/`rinkFrame.js` helpers.
- Curriculum note: this packet's `net-front-space` scenario (`exp26-u11-014`) explicitly stays "a non-contact spacing discussion, not a screen or rebound battle," which lines up with `curriculum-ledger.json`'s own U11/U13 net-front-play open-nit ("recognition-only... not contested net battles").

## 4. Curriculum bindings and gaps

All five scenarios map to U11 curriculum nodes already present at U11 depth in `curriculum-ledger.json` (locked spine v3.1.0):

| Scenario | Family / Topic | Ledger concept | U11 depth |
|---|---|---|---|
| exp26-u11-014 | net-front-space / Positioning | `net-front-play` | I (introduced) |
| exp26-u11-015 | inside-gap / Gap control | `gap-control` | I (introduced) |
| exp26-u11-016 | wide-angling / Angling | `angling-steering` | D (developing) |
| exp26-u11-017 | defensive-recovery / Skating | `backward-transitions` / `backcheck-recovery`-adjacent | D / I |
| exp26-u11-018 | backcheck-assignment / Backchecking | `backcheck-recovery` | I (introduced) |

These are five distinct tactical situations (positioning, gap, angling, recovery, assignment-based backcheck), not five reskins of one idea -- each teaches a different decision. No new gap identified from this packet alone; a gap ranking needs the full-bank view, which is out of scope for a single-packet pass (this run did not reread `bank-snapshot.json` wholesale, per instructions).

## 5. Files, validation, and next steps

- `docs/factory/claude-project/claude-output/review-packet-14.json` -- full envelope, 50 coverage rows (7 checks + scene-evidence ledger + alternative/sourceUrls each), 2 repairs with complete replacement scenarios and per-question self-checks.
- `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-14.md` -- this file.
- **Validator run:** `node docs/factory/claude-project/validation/validate-return.mjs docs/factory/claude-project/claude-output/review-packet-14.json` -> `{"errors":[],"warnings":[],"counts":{"assigned":50,"reviewed":50,"remaining":0,"repairedScenarios":2}}`. Zero errors, zero warnings.
- **Hash verification:** every one of the 50 `baseContentHash` values and both scenarios' `baseScenarioHash` values were independently recomputed with the repo's real `questionContentHash`/`scenarioSnapshotHash` functions (not hand-typed) and matched the packet's manifest exactly before any review began.
- **Source checks actually run:** all 3 unique source URLs cited across this packet's 5 scenarios were fetched and read (two PDFs via WebFetch + the PDF skill's page-range reader, confirming the exact cited page numbers; the Hockey Canada angling article via a browser-User-Agent retry after an initial 403, confirming the exact cited section headings). See `sourceChecks` in the JSON for full scope/limits per source -- all are age/topic support only, none certify exact answers.
- **Checks not run:** rendered/visual verification (no app or browser access), human coach approval, app testing, publication -- none of these are claimed anywhere in this output.
- **Next packet:** packet-15 (continue in scenario-ID order per the project's numbered-packet convention).
