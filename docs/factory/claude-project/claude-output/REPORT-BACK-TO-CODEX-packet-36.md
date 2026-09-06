# Report back — packet-36

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-36`. Five U15 scenarios, 6
questions each (30 total). Split across three agents (the last packet reviewed with the
3-way split methodology; packets 37-40 switch to a single agent per packet per updated
instruction), merged by the controller, validated clean (zero errors) with four
already-investigated benign warnings.

- **Part A:** `exp26b-u15-011` (goalie-outlet-reception), `exp26b-u15-012`
  (two-on-one-lane-read) (12 questions)
- **Part B:** `exp26b-u15-013` (wall-battle-second-touch), `exp26b-u15-014`
  (line-change-possession) (12 questions)
- **Part C:** `exp26b-u15-015` (slot-crowding-reset) (6 questions)

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Repairs proposed: 5 scenario replacements: `exp26b-u15-011` (v1→v2), `-012` (v1→v2),
  `-013` (v1→v2), `-014` (v1→v2), `-015` (v2→v3).

## 2. Highest-impact finding: a "two-on-one" scenario that was actually 2-on-3, compounded by a geometry defect

`exp26b-u15-012`'s family, title, and objective all describe a two-on-one rush read, but
the scene's own roster carried three live Gold skaters plus a goalie against only two
Navy attackers, a 2-on-3, not a two-on-one. This was confirmed by cross-referencing every
other "two-on-one" family scenario in the 200-scenario bank (`exp26-u11-021`,
`exp26b-u11-021`, `exp26-u15-012`), all of which carry exactly one live opposing skater.
Neither of the two extra Gold actors was referenced by any question, option, or
explanation, confirming they were a stray artifact rather than intentional complexity.
Compounding this, the briefing separately claimed "Gold 1 has moved into the direct pass
lane," but the named defender's actual coordinates sat entirely outside the x-range of
the line connecting the two Navy attackers, nowhere near the stated lane. Both defects
were fixed together (removing the two extra actors, repositioning the named defender
onto the actual computed pass line), since both were needed simultaneously to make the
scenario's stated premise true. This had passed a prior "no-open-ai-finding" label on all
six of its questions.

## 3. Other highest-impact findings

1. **`exp26b-u15-013` — a "wall battle" scene that was actually 9.48m from the boards,
   open ice.** The same defect class as Codex's own historical `exp26-u13-001`
   rim-in-open-ice case. Relocated the whole battle cluster into the actual attacking-zone
   corner while preserving every actor's role and relative separation.
2. **`exp26b-u15-011` and `-012` — forced-order sequence explanations**, resolved the
   same way as every prior packet: kept the sequence/answer key, disclosed the overlap in
   the explanation.
3. Grammar defects (the standing "YOU is/has/carries/owns" class and lowercase "you")
   were found in four of the five scenarios, several surviving prior "no-open-ai-finding"
   labels.
4. `exp26b-u15-015`'s straight-line pass route was independently computed to pass within
   0.5-2.5m of two Gold defenders; the reviewing agent correctly declined to treat this as
   a hard defect since the questions are coaching-basis, the app doesn't model
   rim/interception mechanics, and the scene's own explanation already hedges that
   naming an outlet doesn't guarantee it's open, recording it as `unproven` evidence
   instead.

## 4. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- Two major structural defects found and repaired (§2), plus a real zone-description
  mismatch (§3, item 1).
- No rule/system uncertainty encountered.
- Four benign validator warnings, already investigated: `exp26b-u15-014-q1/q3/q5/q6`
  trip the automated actor-name check on "F3," because the scene deliberately omits F3
  from `setup.actors` (the teaching point is reasoning about possession while a teammate
  is off for a line change) and reintroduces F3 only as an explicit hypothetical in later
  questions — confirmed intentional, the same pattern as packet-33's F3 finding.
- One judgment call flagged, not silently resolved: `exp26b-u15-015`'s pass-route
  proximity to defenders (§3, item 4).
- All cited sources were fetched and actually read (several needed a browser
  User-Agent to bypass 403s), and confirmed to support age/topic placement as claimed.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet.

## 5. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. No new gaps identified.

## 6. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-36.json` — merged final
  envelope, schema-validated clean (zero errors)
- `review-packet-36-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file (same harness restriction as recent
  packets); each agent's full report content is folded into this combined report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-36.json` →
`{"errors":[],"warnings":["exp26b-u15-014-q1/q3/q5/q6: F3 is not a displayed actor name..."],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":5}}`.
Zero errors; the four warnings are the already-investigated benign F3-hypothetical case.

**Process note:** this is the last packet reviewed with the 3-way parallel split.
Packets 37-40 will use a single agent per packet, per updated instruction.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Next packet to continue:** packet-37 (36 of 40 complete, 4 remaining).
