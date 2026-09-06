# Report back — packet-19

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-19`. Split across three agents on
different scenarios within the same packet, merged by the controller. This packet
surfaced a significant **cross-cutting geometry defect spanning multiple scenarios**,
resolved with conflicting theories by two independent agents before being reconciled
against each scene's own text — flagged prominently below since it likely affects at
least one scenario outside this packet too.

- **Part A:** `exp26b-u11-014`, `exp26b-u11-015` (12 questions)
- **Part B:** `exp26b-u11-016`, `exp26b-u11-017` (12 questions)
- **Part C:** `exp26b-u11-018` (6 questions)

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
  (One question, `exp26b-u11-015-q4`, carries verdict `blocked` — still a completed review
  row, just not resolved to retain/repair; see §2 and §5.)
- Verdicts: 0 `retain`, 29 `repair`, 1 `blocked`.
- Repairs proposed: 5 scenario replacements, all v1→v2: `exp26b-u11-014`, `-015`, `-016`,
  `-017`, `-018`. Every scenario in this packet needed at least a grammar fix; four of the
  five also needed a real content/geometry fix.

## 2. Five highest-impact before/after examples (plus the cross-cutting finding)

**The cross-cutting finding, most important item in this packet:** all four scenarios
`exp26b-u11-015` through `-018` place a "home"-team goalie actor at `x=26` — but Navy
(home) is fixed to always attack `+x` (per `AUTHORING-CONTRACT.md` and the app's own board
label), meaning Navy's own net/goalie should sit at `-x`. Two agents, working
independently on different scenarios in this same family, found the identical
inconsistency and proposed **opposite, mutually exclusive fixes**:
- Reposition the goalie to `x=-26`, keeping `team: "home"` (assumes the team label is
  correct and the coordinate was the typo).
- Keep the goalie at `x=26`, relabel to `team: "away"` (assumes the coordinate is correct
  — it's actually Gold's net, which Navy is attacking — and the team label was the typo).

Both produce an internally-consistent scene; they cannot both be right for the same
actor. Resolved per-scenario by reading each scene's own briefing text rather than
guessing or defaulting to one agent's pattern:
- **`exp26b-u11-015`**: briefing explicitly reads "Navy YOU **defends** the right net" —
  defensive framing, no offensive/shooting content anywhere in the scenario. This
  unambiguously supports the reposition theory (it's genuinely Navy's own goalie, wrongly
  placed). Fixed: goalie moved to `x=-26`, direction/net-side language flipped throughout
  (briefing, cues, q1 answer, q2 option, q4 prompt).
- **`exp26b-u11-016`, `-017`**: fixed via the reposition theory (goalie → `x=-26`) by the
  agent who first found the pattern — **not yet independently re-confirmed against these
  two scenes' own briefing text** the way `-015` was. Worth a second look.
- **`exp26b-u11-018`**: fixed via the relabel theory (keep `x=26`, `team` → `"away"`) by a
  third agent who found the same `(26,0,facing:3.1)` template pairs with `team:"away"` in
  dozens of bank-wide scenarios, and only shows up mislabeled `"home"` in this scenario and
  its immediate neighbors.

**Both fix theories are live in the merged output for different scenarios in the same
family — this is a deliberate, evidence-based split, not an oversight, but it means the
four scenarios are not fixed by a single uniform rule.** Codex should independently verify
each of the four before trusting this pattern to generalize, and should check whether a
fifth scenario, `exp26b-u11-018`'s report mentions `exp26b-u11-019` as a likely-affected
neighbor not yet reached by any packet.

**Escalated, not silently resolved:** fixing `-015`'s goalie position exposed a deeper
problem — the corrected net side puts YOU (x=15) and F1 (x=9) on the *wrong side* of the
new net position, and F1/F2 still face away from it. The whole actor layout looks authored
for the old (wrong) net side, not just the goalie. Rather than invent a ~10-13m
repositioning of every actor, `exp26b-u11-015-q4` (a position question) was left at
**verdict `blocked`**, with the issue documented for a human/Codex call on how to properly
re-author this scenario's full geometry.

Other repairs in this packet, all subject-verb-agreement on "YOU" (the recurring class):
`exp26b-u11-014` (2 grammar fixes), `-016` (5 instances), `-017` (1), `-018` (already
folded into its main repair above).

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- One real, unresolved scene/answer conflict: `exp26b-u11-015-q4`, left `blocked` (§2).
- The cross-cutting goalie-placement defect (§2) is itself a scene/answer-adjacent
  conflict, resolved per-scenario with documented evidence rather than a single rule.
- `exp26b-u11-018`: F2's facing (0 rad) was left unchanged — the briefing never asserts
  F2's current direction of travel as fact (only that it "trails"), so not treated as a
  defect the way F1's explicit facing claim was.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet. All geometry verified offline via the project's own tooling.

## 4. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. Part A confirmed `exp26b-u11-014` →
`u11.net-front-play` and `-015` → `u11.gap-control` as exact existing ledger matches, no
new binding needed.

## 5. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-19.json` — merged final
  envelope, schema-validated clean
- `review-packet-19-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file (same harness restriction as packets
  17-18); each agent's full report content is folded into this combined report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-19.json` → clean on the merge attempt:
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":5}}`.
No schema-completeness gaps this time (the `alternative`-field and `evidence`-field
requirements from packet-18 were included in every dispatch and all three agents
complied).

**Mid-packet correction made by the controller:** Part A's agent was initially instructed
to apply the reposition theory to `-015` (based on Part B's finding, which arrived first).
Before it applied that fix, Part C's independently-derived relabel theory arrived,
revealing the conflict described in §2. The controller sent a correction asking Part A to
resolve based on `-015`'s own scene text rather than either prior pattern — which is what
produced the correctly-evidenced fix now in the merged file.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval; `exp26b-u11-016`/`-017`'s
goalie fix not independently re-confirmed against those scenes' own briefing text (only
`-015` and `-018` got that treatment).

**Next packet to continue:** packet-20. Recommend checking `exp26b-u11-019` specifically
when it's reached, given the flagged likely-shared defect.
