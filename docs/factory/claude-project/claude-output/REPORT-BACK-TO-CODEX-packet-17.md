# Report back — packet-17

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-17`. Split across three agents on
different scenarios within the same packet, merged by the controller, validated clean on
the first pass.

- **Part A:** `exp26b-u11-004`, `exp26b-u11-005` (12 questions)
- **Part B:** `exp26b-u11-006`, `exp26b-u11-007` (12 questions)
- **Part C:** `exp26b-u11-008` (6 questions)

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Verdicts: 6 `retain` (all of `exp26b-u11-008`), 24 `repair`, 0 `blocked`.
- Repairs proposed: 4 scenario replacements (`exp26b-u11-004`, `-005`, `-006`, `-007`, all
  v1→v2). `exp26b-u11-008` needed no repair — fully retained clean, and confirmed to
  already reflect two prior repair rounds (a briefing geometry fix and a q1 phrasing
  rewrite), independently re-verified rather than trusted.

As in packet-16, most affected-question counts are driven by scenario-level briefing
grammar fixes cascading to every linked question's hash, not by widespread content
rewrites. Only 3 of the 30 questions have their own text changed (2 in `-004`'s q1
explanation plus the briefing fixes below); every other repaired question is
byte-identical to version 1 apart from the shared briefing.

## 2. Five highest-impact before/after examples

1. **`exp26b-u11-004` briefing**: "YOU **has** just passed to F2" → "YOU **have**...";
   plus q1's own explanation "so YOU's **job**" → "so **your** job" (the same
   possessive-pronoun fix already made once in packet-16).
2. **`exp26b-u11-005` briefing**: "YOU **is** ahead of F1" → "YOU **are** ahead of F1." No
   question text needed changes — an otherwise clean scenario apart from this one line.
3. **`exp26b-u11-006` briefing**: "YOU **is** the closest navy skater" → "YOU **are**..."
4. **`exp26b-u11-007` briefing AND its own first cue**: "YOU **carries** near the
   right-side lane" → "YOU **carry**..." — the identical typo appeared twice in the same
   scenario (briefing and cue), both caught and fixed together.
5. **`exp26b-u11-008`** (Part C): zero repairs, but two prior repair rounds independently
   re-verified rather than assumed correct — a briefing geometry fix ("D1 behind" → "D1
   ahead") and a later q1 phrasing rewrite, both confirmed via recomputed hashes matching
   the current manifest exactly.

Every repair in this packet is again a subject-verb-agreement fix on "YOU" — the same
single defect class that has dominated every packet since the calibration adjudication.
No roster, answer-key, or age-mismatch defects were found anywhere in packet-17.

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- No scene/answer conflicts found in any of the five scenarios.
- No rule/system uncertainty encountered.
- Two descriptive-imprecision notes, flagged but **not** repaired (no answer key depends
  on either):
  - `exp26b-u11-006-q1`: the puck at (23,-5) is actually inside the nearest faceoff
    circle (2.86 m from centre, radius 4.572 m), not literally south of it, despite the
    answer text "Below the circle." Treated as a coarse-but-defensible landmark
    description, same precedent as packet-16's "beside the wall" call.
  - `exp26b-u11-008-q2`: three multi-select options aren't perfectly grammatically
    parallel (two "Whether..." phrasings plus one declarative). Assessed as
    non-substantive per the calibration lessons against over-fixing small wording issues.
  - Source age-band note: `exp26b-u11-004`'s USA Hockey "10-and-Under" citation is
    nominally age ≤10, slightly younger than the Canadian U11 band it's cited for — the
    source's own catalog entry already discloses this as a cross-border adaptation, so
    not treated as an undisclosed mismatch.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet — no runtime/browser access this session. All geometry (carried-puck
  positions, actor separations, on-ice checks) verified offline via the project's own
  tooling (`questionContentHash`, `scenarioSnapshotHash`, `isCoachRoutePoint`, `makeScene`,
  `validateExperimentalBank`, `positionSubjectIssue`/`questionActorWarnings`). No app
  testing, coach approval, or publication is claimed.

## 4. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape, same as packet-16.

## 5. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-17.json` — merged final
  envelope, schema-validated clean on the first pass (no post-merge fixes needed this
  time)
- `review-packet-17-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file this packet (the harness's subagent
  report-file restriction applied to all three, not just some as in packet-16); each
  agent's full report content was captured in its reply and folded into this combined
  report instead.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-17.json` against the merged envelope →
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":4}}`.
No schema-completeness gaps this time — the sourceUrls/evidence-field requirements
surfaced in packet-16 were included directly in each agent's dispatch instructions for
this packet and all three complied on the first attempt.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Process note:** one agent (Part B) reported that the shared scratchpad/temp directory
was used concurrently by two of the three parallel agents, causing one same-named
scratch-script collision; it switched to uniquely-named files once noticed. This did not
affect any of the three agents' actual output files (each writes to its own
part-N/scenario-scoped path) or the validated result, but is worth knowing if future
parallel splits reuse scratch filenames across agents.

**Next packet to continue:** packet-18.
