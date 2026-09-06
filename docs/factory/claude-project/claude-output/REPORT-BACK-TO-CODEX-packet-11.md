# Report back to Codex — packet-11

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-11`. Expected 5 scenarios / 38
questions. Reviewed 38/38, 0 remaining. `completion: "complete"`.

## Verdict breakdown

| Scenario | Questions | Verdict |
|---|---|---|
| exp26b-u9-013 | q1-q6 (6) | repair |
| exp26b-u9-014 | q1-q6 (6) | retain |
| exp26b-u9-015 | q1-q6 (6) | retain |
| exp26-u11-001 | q1-q10 (10) | retain |
| exp26-u11-003 | q1-q10 (10) | retain |

1 scenario repaired (6 questions affected), 32 questions retained, 0 blocked, 0
unreviewed.

## Repair-receipt coverage check (per the packet-04-10 pattern)

Grepped `docs/factory/research/question-review/repairs/*.json` for each scene ID before
reviewing. Result: `exp26b-u9-013`, `exp26b-u9-014`, `exp26b-u9-015` and `exp26-u11-001`
have **never** received a real repair receipt — only zero-finding passes
(`combined-review.json`, `expansion/youth-first.json`, `catalog-review.json`,
`expansion/u11-first.json`). Per the flagged historical pattern (high real defect rate in
exactly this bucket across packets 04-10), all four got extra scrutiny. Only
`exp26-u11-003` has real applied repairs (`u11-repairs.json`, `u11-actor-repairs.json`),
both independently re-verified as still correct on the current content.

Outcome of the extra scrutiny: found one real defect (in `exp26b-u9-013`, detailed
below). The other three "no-repair-receipt" scenes checked out clean under full
geometric re-verification — the pattern is a strong prior, not a guarantee.

## The one repair: exp26b-u9-013 ("Change roles after a lost puck")

Two independently-verified issues in the shared scene (briefing + sources), affecting
all 6 linked question hashes even though no question text/option/answer changed:

1. **Overstated landmark distance** (the dominant packets-09-10 defect class). Briefing
   said "Navy2 loses the puck near the attacking blue line." Navy2's actual coordinate is
   (16,1). Navy attacks +x, so the attacking blue line is x=7.62 (AUTHORING-CONTRACT.md).
   Distance = 16-7.62 = **8.38m past the line, 43% of the way through the 19.51m-deep
   attacking zone** — mid-zone, not "near" the blue line. Fixed by rewording to "Navy2
   loses the puck well into the attacking zone" (no coordinate/actor change).
2. **Age-mismatched source citation.** `usah-u14-situational-roles` was cited to justify
   a U9 scene's role-change teaching. Fetched the actual article (plain fetch → 403;
   retried with a browser User-Agent → 200, per the source-fetch note). It states the
   cited four-roles framework explicitly at **"the 14U level"** and discusses no younger
   age band. Citing a 14U-specific framework for a U9 scene overstates its applicability.
   Fixed by removing that source; `hc-u9-development` (independently verified, explicitly
   U9-general) remains as the sole source.

Version bumped 1→2. `baseScenarioHash` of the original and every original
`baseContentHash` verified against `bank-snapshot.json` before writing the repair (no
stale baseline). Replacement self-checked (`replacementReview.status:"self-checked"`),
all 6 final questions pass all 7 checks on the corrected content.

## Other highest-impact findings (retained, not repaired — nothing else needed changing)

- **exp26-u11-003 q8/q9** (already-repaired in an earlier packet): re-verified
  independently rather than trusting the "applied" label. q8's distractor ("Hold the
  same direct lane while D1 remains between F1 and YOU") is now credible; q9's actorId
  is `h2` (YOU), matching the prompt's subject. Both confirmed still correct on today's
  content.
- **exp26-u11-003 q1**: D1 (12.5,-4.5) sits at the *exact* computed midpoint of the
  straight line from F1 (10,-5) to YOU (15,-4) — true collinearity (0m deviation), not
  just the "actor-centre collinearity is a warning" case from the calibration doc.
- **exp26b-u9-015**: verified Gold1 (19,-1) sits within 0.27m of the straight line from
  Navy2's carried-puck position to YOU — "Gold1 has moved onto the old return lane" is
  tightly, not loosely, supported. Navy3 (y=-7 vs the others' y=-1) is genuinely lower on
  screen, matching "waits below" under the verified `translate(a.x,-a.y)` convention.
- **exp26-u11-001**: "F2 is an outlet toward the middle" and "D1 is approaching from up
  ice" both verified against actual coordinates; the only borderline call was "near the
  side wall" for a puck 4.95m off the boards (vs 8m from mid-ice) — judged a defensible,
  non-precise description per calibration guidance, not repaired.

## +y orientation check

Read the actual render source, `src/one-on-one/ExperimentalPractice.jsx`
(`ExperimentalBoard`): `transform="translate(${a.x},${-a.y})"` confirms **+y renders
toward the top of the screen** in this 2D board (same convention packet-10 verified).
Checked every "above/below"/"behind" phrase against this convention and against actual
coordinates:
- `exp26b-u9-014` "Navy2 waits above the circle": Navy2 y=-1 vs circle-centre y=-6.7 →
  higher y → genuinely above. Correct.
- `exp26b-u9-015` "Navy3 waits below": Navy3 y=-7 vs others' y=-1 → lower y → genuinely
  below. Correct.
- `exp26b-u9-013` "Navy3 is behind you": not a facing-relative claim (dot product of
  YOU's facing vector with the vector to Navy3 is actually *positive*, i.e. Navy3 is
  geometrically in front of YOU's facing direction) — but it IS accurate as a
  defensive-depth claim (Navy3 x=9 is closer to navy's own defending end than YOU's
  x=13), and it is explicitly stated in the briefing, so it qualifies as `basis:scene`
  regardless of the facing ambiguity. Not treated as a defect.
- No real +y defect found in this packet (0 of 5 scenes). This differs from packets
  05-09 (real defects) and matches packet-10 (verified correct) — the pattern is
  scene-by-scene, not packet-wide, exactly as the assignment predicted.

## Sources checked (4 unique URLs; all read with a browser User-Agent after the plain
fetch 403'd, per the source-fetch note)

1. `hockeycanada.ca/.../under-9` — read, supports U9 small-area decision practice
   generally (not this scene's exact answers).
2. `usahockey.com/news_article/show/1093178` — read; source itself scopes its role
   framework to 14U (see repair above).
3. `hockeycanada.ca/.../seven-coaching-principles-vision-scanning-2024-ncw` — read,
   directly supports "check teammates + check pressure" scanning claims across 4 of the
   5 scenes, explicitly "at all ages."
4. `hockeycanada.ca/.../seven-coaching-principles-puck-control-2024-ncw` — read,
   loosely supports the "re-read after a completed pass" premise in `exp26b-u9-015`,
   explicitly "at all age levels."

Full `access`/`scope`/`jurisdiction` detail is in `sourceChecks` in the JSON.

## Scene/answer conflicts, uncertainty, visual checks not performed

No scene/answer conflicts found. No rule/system uncertainty beyond the one source-age
mismatch above (fixed by removal, not asserted as a rule violation). No app/browser
rendering was opened (per the no-browser-preview standing rule and because this task has
no local app access); all geometry was computed from the real coordinate math and the
actual render source (`ExperimentalPractice.jsx`, `coachRouteSurfaceInput.js`,
`rinkFrame.js`), not eyeballed or invented. No human coach review, no app testing, no
publication claimed anywhere in this packet.

## Curriculum bindings / gaps

Out of scope confirmation only (not skipped): packet-11's 5 scenes are all
already-authored repair/audit targets, not new-content candidates, so no new curriculum
binding or gap proposal is made from this packet. `curriculum-coverage.json` and
`curriculum-ledger.json` were read for context per the assignment's start-here list; no
scene in this packet triggered a binding question distinct from its own stated
`family`/`topic`/`objective` fields.

## Files / validation

- `docs/factory/claude-project/claude-output/review-packet-11.json`
- `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-11.md` (this file)
- Validator: `node validation/validate-return.mjs claude-output/review-packet-11.json`
  → `{"errors":[],"warnings":[],"counts":{"assigned":38,"reviewed":38,"remaining":0,
  "repairedScenarios":1}}`. Zero errors, zero warnings.
- Hashes were computed with the real tooling
  (`validation/tools/question-batch-core.mjs` `questionContentHash`,
  `validation/tools/claude-return-core.mjs` `scenarioSnapshotHash`), not hand-typed.
  Geometry was computed with `isCoachRoutePoint`/`makeScene`
  (`validation/src/one-on-one/*`), not eyeballed.
- Next packet to continue: **packet-12** (`exp26-u11-004`, `exp26-u11-005`,
  `exp26-u11-006`, per `bank-snapshot.json`).

## Approval-claim scope (explicit)

This review is AI-assisted content audit only. No app testing, no independent
second-AI review, no human coach approval, and no publication is claimed for any part of
this packet. The validator result above confirms structural correctness and
stale-baseline safety only, per its own printed `limits`.
