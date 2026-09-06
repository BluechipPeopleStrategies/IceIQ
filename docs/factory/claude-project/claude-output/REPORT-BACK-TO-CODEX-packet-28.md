# Report back — packet-28

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-28`. Five U13 scenarios. Split
across three agents, merged by the controller, validated clean on the first pass. One
finding needed controller adjudication before merge, detailed in §2.

- **Part A:** `exp26b-u13-011`, `exp26b-u13-012` (12 questions)
- **Part B:** `exp26b-u13-013`, `exp26b-u13-014` (12 questions)
- **Part C:** `exp26b-u13-015` (6 questions)

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Repairs proposed: 5 scenario replacements, all v2→v3: `exp26b-u13-011`, `-012`, `-013`,
  `-014`, `-015`.

## 2. Named finding: a genuine zone-placement defect, and where its boundary actually sits

**The real defect.** `exp26b-u13-014` ("Choose the second rebound job," family
`rebound-role-choice`, topic `net-front defence`) places an actual `"Navy goalie"` actor
at x=27, in Gold's end of the ice. Per `AUTHORING-CONTRACT.md`, Navy/home attacks +x,
which means Navy's own net (and its own goalie) belongs at negative x, near x=-27, not
positive x. `exp26b-u13-013` ("Cover the far-side low slot," family
`weak-side-low-coverage`, topic `defensive-zone coverage`) has the same problem without
an explicit goalie actor: its own family/topic name it as a defensive-zone scene, but its
actors sit at x=20-23, in Gold's end rather than Navy's own end. Part B (assigned both
scenarios) confirmed this by auditing every goalie across all 35 goalie-bearing scenarios
in `bank-snapshot.json`: home/Navy goalies sit at x≈-26/-27 and away/Gold goalies at
x≈+26/+27 with zero exceptions anywhere in the 200-scenario bank outside this cluster.
Fixed both via a full scene mirror (negate x, reflect facing = π−facing), recomputing the
carried-puck position with the app's actual carried-puck formula rather than naive
negation, since that formula isn't symmetric under simple negation.

**Where Part B's flag did not extend.** Part B's report additionally suggested that
sibling scenarios `exp26b-u13-011`, `-012`, and `-015` (outside its own scope) "show the
identical positive-x zone mismatch." The controller checked this independently before
merge rather than propagating it as a blanket fix, and it does not hold up:

- `exp26b-u13-011` (family `angle-to-wall`, topic `defensive angling`) and
  `exp26b-u13-012` (family `backcheck-middle`, topic `transition defence`) describe
  puck-battle/backcheck action that starts in the neutral zone or the attacking end and
  transitions toward the defending zone. Neither family requires deep own-zone
  positioning the way `defensive-zone coverage` or `net-front defence` do, and neither
  scenario has a goalie actor to anchor the claim. Part A, working these two scenarios in
  full geometric detail, found different real defects (a reversed positional claim, a
  vague blue-line reference) but no zone-flip issue.
- `exp26b-u13-015` (family `pinch-recovery`, briefing: "D1 pinched at the right blue
  line... Gold 1 won the puck and exits along the wall") describes a Navy defenceman's
  offensive pinch near Gold's blue line, i.e. Navy's *attacking* end at positive x, which
  is exactly where this scene's actors sit (x=11-22). This is the geometrically correct
  end for this specific action, not a mismatch. Part C, working this scenario
  independently, found no zone issue either.

**Conclusion:** the zone-flip defect is real and scoped to exactly the two scenarios
whose own family/topic names explicitly require own-net proximity
(`defensive-zone coverage`, `net-front defence`) and where a goalie actor's position could
be checked against the bank-wide convention directly. The other three scenarios in this
packet were independently reviewed in full geometric detail by two different agents and
correctly found clean on this axis; extending the fix to them without evidence would have
been an unrequested, unverified change. No re-dispatch was needed.

## 3. Other repairs this packet

All five scenarios also carried the standing "YOU is" grammar defect (briefing-level in
every scenario, plus scattered instances inside q2/q5 options in a few), fixed alongside
the geometry defects noted above. `exp26b-u13-011` also had a reversed positional claim
(a "trailing" defender was actually 5m *ahead* along the breakout direction) and a vague
"Navy's blue line" reference (bank-wide unique phrasing, simplified). `exp26b-u13-015`
had a stale distractor left over from an earlier repair, whose explanation still refuted
the removed option instead of the current one.

## 4. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- Real scene/geometry conflicts found and repaired: the zone-flip defect (§2, two
  scenarios), the reversed positional claim in `-011`, the stale distractor in `-015`.
- No rule/system uncertainty encountered.
- Both cited sources across the packet (USA Hockey articles, Hockey Canada PDFs) were
  fetched and actually read, not just URL-checked; one older/elite-bracket source
  (U17 Program of Excellence) was disclosed as an adaptation, not rejected.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet.

## 5. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. No new gaps identified.

## 6. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-28.json` — merged final
  envelope, schema-validated clean on the first pass
- `review-packet-28-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file (same harness restriction as recent
  packets); each agent's full report content is folded into this combined report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-28.json` →
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":5}}`.
Zero errors, zero warnings.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Recommendation for Codex:** worth a bank-wide sweep of the `exp26b-*` cluster
specifically checking any scenario whose family/topic implies own-net proximity
(`net-front defence`, `defensive-zone coverage`, and similar) against actor x-sign, since
this defect class (correct team/role labels, wrong end of the ice) evaded every prior
historical pass's `no-open-ai-finding` label and was only caught by an explicit
bank-wide goalie-position audit.

**Next packet to continue:** packet-29.
