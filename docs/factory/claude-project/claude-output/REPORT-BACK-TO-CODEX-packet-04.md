# Report back to Codex — packet-04

**Snapshot:** `rr-20260905-c8403be16748c919`
**Packet:** `packet-04`
**Prepared by:** Claude (Claude Code session, RinkReads content repair project)
**Date:** September 5, 2026
**Status of this return:** `draft-not-reviewed`. Structural validation passed. This is
one self-review, not an independent second review, not a rendered-scene check and not
human coach approval.

---

## 1. Counts

| Item | Count |
|---|---|
| Scenarios assigned | 5 (`exp26b-u7-002` ... `exp26b-u7-006`, all U7, all version 1) |
| Questions assigned | 30 |
| Questions reviewed | 30 |
| Retained | 18 |
| Repair verdict | 12 |
| Blocked | 0 |
| Unreviewed | 0 |
| Completion | `complete` |
| Replacement scenarios proposed | 5 (each version 1 -> 2) |
| Question hashes affected by the repairs | 20 of 30 |

Per-scene verdicts:

| Scenario | Retain | Repair | Change type | Affected hashes |
|---|---|---|---|---|
| `exp26b-u7-002` | q1 q2 q3 q4 q6 | q5 | question only | 1 |
| `exp26b-u7-003` | q1 q2 q3 q4 q6 | q5 | briefing + cues + q5 | 6 |
| `exp26b-u7-004` | q1 q3 | q2 q4 q5 q6 | setup facing + q2 + q5 | 6 |
| `exp26b-u7-005` | q1 q2 q3 q4 q6 | q5 | question only | 1 |
| `exp26b-u7-006` | q1 | q2 q3 q4 q5 q6 | setup coordinates + facing + q2 + q3 + q5 | 6 |

**Verdict-versus-hash convention.** A `repair` verdict means that question's own content
carries a defect. `affectedQuestionIds` separately lists every question whose hash moves,
including questions whose text is untouched but whose scene metadata changed. Nine
questions are `retain` with a changed hash; each of those coverage rows says so
explicitly, and each appears in the replacement's `replacementReview` with a fresh
`contentHash` computed from the replacement.

---

## 2. Repair-receipt gap check (the packet-03 follow-up)

Packet-03 found that `docs/factory/research/question-review/repairs/youth-repairs.json`
swept most scenes' q7-q10 blocks but skipped three, and all three were broken. I checked
that receipt against packet-04 first, before reviewing content.

- `youth-repairs.json` (`applied-awaiting-independent-recheck`, root, 2026-09-05T19:34:37Z)
  contains 36 changes across nine scenarios: `exp26-u7-002`, `-004`, `-005`, `-008`,
  `exp26-u9-010`, `-011`, `-013`, `-014`, and `exp26b-u7-001`.
- **None of packet-04's five scenarios appears in it.** `youth-branch-clarity.json` and
  `team-recognition-repairs.json` also contain none of them. `packet-04.json`'s own
  `repairReceipts` array is empty, and both historical reports it carries
  (`combined-review.json`, `expansion/youth-first.json`) record all 30 questions as
  `firstReviewed: true`, `secondReviewed: false`, `revisionRechecked: false`, status
  `no-open-ai-finding` / `pass`, with zero findings.
- The q7-q10 shape of the packet-03 gap **does not apply here**: all five scenes are
  six-question scenes, so no q7-q10 block exists. The scenes are, however, entirely
  uncovered by any repair receipt and carry only a single first-pass AI review with no
  findings. I treated the clean history as unproven and reviewed every question from the
  coordinates up. Twelve questions failed.
- One directly transferable lesson did come from the receipt. `exp26b-u7-001` — the
  sibling immediately before this packet, same `exp26b` U7 expansion batch, same
  six-question template — was repaired for three classes: a false board-side scene claim,
  an artificial one-and-done scanning sequence, and an instruction that assumed a
  possession the player did not hold. I checked all five packet-04 scenes for each class.
  The false-board class recurs twice (`-003`, `-006`). The scanning-sequence class does
  **not** recur: every q4 in this packet ends on a continuing look, so I did not repair
  any of them.

---

## 3. The five highest-impact before/after examples

### 3.1 `exp26b-u7-006` — the depicted carry contradicts the protection the whole scene teaches

Highest-impact finding in the packet. This is the calibration-lesson-3 check ("passing
geometry starts at the rendered carry offset, not the actor's centre") applied to
protection geometry.

- **Before.** YOU at `(-1,-7)` facing `1.4` rad own the puck. The engine's carried-puck
  formula puts the puck at **`(-1.520, -5.896)`** — *toward* the inside, where Gold1 is.
  Measured: puck-to-Gold1 **3.838 m**, carrier-to-Gold1 **4.472 m**; the offset vector
  projected onto the carrier-to-Gold1 direction is **+0.755**, i.e. the puck is on the
  defender's side of the carrier.
- **What that contradicts.** q2's keyed option a, "Keep your body between Gold1 and the
  puck"; q4's keyed step b, "Keep the puck on the far side"; q6's explanation, "Keeping
  your body between the defender and puck can buy a moment"; and the scene's own title
  ("Turn your body to the safe side") and objective. A learner comparing the words with
  the picture is shown the opposite of the lesson. Facing `1.4` rad points toward `+y`,
  which is the side Gold1 is on.
- **Compounding it,** the board landmarks are false. YOU are **5.954 m** from the nearest
  side board and Navy2 **4.954 m**, yet the briefing says "beside the boards" and "on the
  wall side", q3 says "a little closer to the wall side", and q5 says "Gold1 reaches the
  wall side". q3's reference `(-2,-9)` is still 3.954 m off the boards and leaves the puck
  still exposed (dot **+0.754**), so the move does not deliver the space its explanation
  promises.
- **After.** YOU -> `(-1,-10.5)` facing `-1.7` rad; Navy2 -> `(7,-11)`; Gold1 -> `(1,-6.5)`.
  Every relative relationship is preserved: carrier-to-Gold1 stays **4.472 m**, and
  carrier-to-Navy2 moves 8.062 -> **8.016 m**. The puck now renders at
  **`(-0.435, -11.582)`**: **5.280 m** from Gold1 against the carrier's 4.472 m, offset dot
  **-0.715** — shielded. YOU are 2.454 m off the board, Navy2 1.954 m, the puck 1.372 m, so
  the board and wall wording is now true. Gold1 stays **4.117 m** off the YOU-to-Navy2 line,
  so Navy2 remains a usable outlet. q3's reference -> `(0,-11)`, which moves the puck to
  `(0.565, -12.082)` (on ice) at **5.599 m** from Gold1 against the carrier's 4.610 m, so the
  move now measurably increases the separation it claims.
- **Briefing, cues, limits and the text of q1, q4 and q6 are untouched** — the coordinates
  were wrong, not the words.
- Hockey Canada's Vision & Scanning drill 1 ("Forwards / Puck Protection / Vision
  Sequence") describes a protector keeping their back to the pressure while continuing to
  read changing information. That is the posture the corrected facing depicts. Read
  2026-09-05.

### 3.2 `exp26b-u7-006-q2` — a contact/safety judgement with no rules source

- **Before.** Option c is "Push Gold1 with your stick" and the explanation rules it out
  with "Pushing is not a safe puck-control choice."
- **Why that fails.** The scenario cites only the Hockey Canada U7 skills page and the
  Hockey Canada puck-control principle. I read both in full; neither addresses legal or
  illegal contact at all. The calibration adjudication declined a proposed replacement on
  exactly this ground (U13-010 q8: "adds unnecessary contact/safety claims without a
  verified rule source").
- **After.** Option c -> "Send the puck up the wall without looking", and the explanation
  drops the safety assertion: "Sending the puck away before looking gives it up without
  knowing where Navy2 or Gold1 are." That wording follows the adjudication's own approved
  phrasing on U7-001 q5.
- **Note for your call, not applied.** USA Hockey's *Skill Progressions for Youth Hockey*
  (2019), PDF pp. 12-13, would supply a properly scoped basis if you prefer to keep a
  contact distractor: 8U Player Knowledge item 4, "Allowable Contact with Opponents",
  teaches stick-on-puck and stick-lift and names slashing among contact that is not
  allowed. I read those pages and deliberately did **not** use them, because that is a US
  8U source and this is a Canadian U7 scene with no rules source in its own `sources`
  array. Adding it would be a jurisdiction claim I am not in a position to make.

### 3.3 `exp26b-u7-004` — the freeze already answers the recognition it asks for

- **Before.** All three actors face within 8 degrees of the -x direction: YOU at
  `facing 3`, Navy2 `3.1`, Gold1 `3.1`. Navy attacks +x, so -x is the end navy defends, and
  the picture therefore already shows YOU turned back. But q4 asks the learner to order
  "Notice Gold1 has it -> **Turn toward the navy end** -> Skate back", and q6's explanation
  says "**Turning back** and watching Gold1 lets YOU choose a useful support route". The
  scene depicts as finished the very step the questions teach, so it does not show the
  problem before asking a player to solve it — and the objective is literally "Recognize a
  change from attacking to defending".
- **After.** `setup.actors[0].facing` `3` -> `0.2`, so YOU are still oriented toward the
  attacking end when possession flips. No coordinate moves, no other actor changes, and
  YOU do not own the puck, so no carried-puck position is affected. No question text
  changes for this reason.
- **This one is a judgement call and I am flagging it as such.** The narrower alternative
  is to leave the facing alone and instead rewrite q4's option b and q6's explanation. I
  chose the setup change because it preserves the teaching objective and both question
  texts, and because it makes q3 ("bring YOU back toward the play") coherent as well. If
  you prefer the narrower route, decline this reason and keep the other two for this
  scenario; they are independent.

### 3.4 `exp26b-u7-003` — two false spatial claims in the briefing

Same class as the owner's rim failure case: words describing a place the coordinates do
not put the player in.

- **Before.** "Navy2 has the puck **near the boards**." Navy2 sits at `(-8,-2)`, which is
  **10.954 m** from the nearest side board at `y=-12.954` and closer to centre ice than to
  any board. Also "**Gold1 is between YOU and the middle**": Gold1 at `(-5,-5)` is **3.43 m**
  off the straight line from YOU to centre ice and only about 15% along it. A third cue uses
  the undefined phrase "the first line".
- **What is actually true, and is the pedagogically useful fact:** Gold1 lies **0.384 m** off
  the line joining YOU and Navy2, and **0.943 m** off the line from the *rendered carried
  puck* at `(-7.075,-1.204)` to YOU, about halfway along it. Per calibration lesson 3 I am
  recording that as a contested-lane warning, **not** as proof of a blocked or intercepted
  pass — and the scene's own questions never claim one.
- **After.** Briefing -> "Navy2 has the puck in open ice, closer to the navy end. YOU wait
  below and ahead of Navy2. Gold1 is between YOU and Navy2." Cues 2 and 3 reworded to
  match. **No question text changes for this reason** and no teaching objective changes;
  q2's existing explanation already said "Gold1 between the players", which the geometry
  supports. All six hashes move because the briefing moved.

### 3.5 All five q5 questions narrate an imagined movement as visible fact

The most systematic defect in the packet — one instance per scene, five in total.

| Question | Before (prompt opens) | After |
|---|---|---|
| `-002-q5` | "Gold1 shifts toward the upper side." | "Imagine Gold1 shifts toward the upper side. What should **YOU** do?" |
| `-003-q5` | "Gold1 follows your first move." | "Imagine Gold1 follows your first move." |
| `-004-q5` | "Gold1 moves toward the lower side." | "Imagine Gold1 moves toward the lower side." |
| `-005-q5` | "Gold1 leaves the net side and follows YOU." | "Imagine Gold1 leaves the net side and follows YOU." |
| `-006-q5` | "Gold1 reaches the wall side too." | "Imagine Gold1 reaches the wall side too." |

Each explanation now opens with "The freeze does not show Gold1 moving, so this is an
imagined change." The static schema carries no timed movement, and each scene records
Gold1 at one fixed position. The calibration adjudication accepted this exact treatment
for U7-001 q10 ("Explicitly imagine Gold1 moving closer; the static scene does not show
that movement"), and `youth-branch-clarity.json` applied the same "For the next branch,
imagine..." framing to `exp26-u9-013-q7`. Keys, bases and — apart from the four distractor
fixes below — options are unchanged.

Three distractor fixes travel with those prompts, each replacing an option a learner
cannot read as one identifiable misunderstanding:

- `-002-q5` c: "Drop the stick and stop watching" -> "Keep skating into the space Gold1
  just took". The original is the banned giveaway class; the adjudication required the
  same replacement on U7-001 q5's eyes-closed distractor.
- `-004-q5` b: "Chase only the nearest navy player" -> "Chase Gold1 without looking for
  Navy2". YOU are navy, and the nearest navy player is the teammate Navy2 at 4.123 m, so
  the original instructed a player to chase their own teammate — either incoherent or a
  wrong-team slip, and a learner cannot tell which.
- `-006-q5` c: "Assume Navy2 can see through Gold1" -> "Send the pass to Navy2 without
  checking the lane". The original is a physical impossibility rather than a believable
  decision error.
- A fourth, outside q5: `-004-q2` c, "YOU should stay in the attacking end" ->
  "Navy2 is between YOU and Gold1". The original was a directive among two observations in
  a `basis: scene` question, so the options were not parallel and one was not a scene fact,
  while the explanation supplied tactical advice inside an objectively graded question. The
  replacement is a parallel factual statement that is **false and checkable**: Navy2 at
  `(3,1)` is 4.09 m off the YOU-to-Gold1 segment and 1.10 of the way along it, *past* Gold1.
  It is also distinguishable from the true briefing statement that Navy2 is between YOU and
  the navy end, so it tests reading rather than memory.

---

## 4. Scene/answer conflicts, rule and system uncertainty, and checks not performed

### Scene/answer conflicts found (all high risk, all repaired)

1. `exp26b-u7-006` q2/q4/q6 — keyed protection actions contradicted by the rendered carry
   offset. Quantified in section 3.1.
2. `exp26b-u7-006` q3 — prompt and explanation promise wall-side space that the reference
   does not produce.
3. `exp26b-u7-004` q4/q6 — instructed turn already depicted as complete.
4. `exp26b-u7-003` briefing — two false spatial claims inherited by all six questions.
5. Five q5 prompts — imagined movement stated as visible fact.

### Rule, contact and system uncertainty

- **One unsourced safety claim found and removed** (`exp26b-u7-006-q2`, section 3.2). No new
  contact, safety or rule claim is introduced anywhere in this return.
- **Age/system caveat, recorded not repaired.** USA Hockey's 8U manual assigns **0%** of
  practice time to team systems (PDF p. 11, repeated p. 13), and Hockey Canada's U7 page
  states only **15%** of practice time should go to individual tactics. `exp26b-u7-004`
  ("Help when the puck changes teams") is the packet's most system-adjacent scene. It stays
  at concept level — notice the new owner, turn back, keep two players in view — which both
  sources support as age-appropriate *concepts* (USA Hockey 8U Player Knowledge: puck
  pursuit, puck support). I did **not** repair it on age grounds, but neither its
  explanations nor its alternatives should ever be tightened into a required route.
- **Puck protection is not a named U7 matrix item.** The Hockey Canada U7 skills matrix
  lists Moving Puck Control ("Open ice carry - forehand & backhand", "Weaving with puck")
  but no protection entry; Individual Offensive Tactics is limited to body fakes and stick
  fakes, Individual Defensive Tactics to angling. `exp26b-u7-006`'s topic is therefore
  supported as a puck-control extension and by the Vision & Scanning protection drill, not
  by a U7 matrix line. Flagged, not repaired.
- **No jurisdiction claim is made.** No Canadian rule is asserted as US or vice versa, and
  no on-ice rule is asserted at all.

### Visual checks NOT performed

- **No application, no rendered view, no screenshots.** All geometry in this return is
  offline coordinate work using the engine's own modules (`isCoachRoutePoint`,
  `makeScene`, `questionContentHash`). Nothing here establishes camera framing, legibility,
  stick appearance or which cues a child actually sees. Nothing was "tested in 3D".
- **Open orientation question, and it affects all five scenes — please resolve it against a
  rendered view.** This batch consistently names `+y` "upper" / "above" and `-y` "lower" /
  "below" (`-002` briefing and q3, `-004` briefing, `-005` q3, `-003` briefing). But
  `src/scenario-engine/rinkFrame.js` documents the canonical frame as "**+y: toward the
  bottom of the canonical top-down view**". If the app renders that canonical orientation,
  every "upper"/"above" in this batch is inverted on screen.
  - I did **not** repair it. The batch is internally self-consistent, the project brief
    explicitly warns against inferring direction from screen-left/right, and
    `docs/factory/SCENARIO-ENGINE-DECISIONS.md` records no orientation decision.
  - **No answer key depends on it.** `reviewResponse` marks only `basis: scene` choice /
    multi / sequence questions objectively, and no scene-basis question in this packet uses
    an up/down word. The three position questions that do are `basis: coaching` and are
    never scored. So the exposure is comprehension, not mis-grading.
  - It is recorded in `sceneEvidence.unproven` on all 30 coverage rows.
- **Facing is never read as gaze.** Recorded as unproven throughout — including
  `exp26b-u7-002`, where Navy2 faces about 106 degrees away from YOU, and no question claims
  Navy2 is looking.

### Observations recorded but deliberately NOT repaired

Listed so you can see the line I drew, per calibration lesson 5.

- `exp26b-u7-002` briefing "near the middle" for `x=-11` (3.38 m behind the -7.62 blue
  line) and `exp26b-u7-004` "near the middle" for `x=7`. Both actors sit at or beside
  `y=0`, which is literally mid-width, and no question depends on a zone claim. Low-severity
  wording ambiguity; recorded in `unproven`, not repaired.
- `exp26b-u7-004-q3` reference `(5,3)` puts YOU 2.828 m from Navy2, close to the teammate
  who is already back — mild tension with `exp26b-u7-005`'s own don't-crowd-your-teammate
  lesson. A small reference move is a legitimate illustration choice (calibration U7-001 q9
  and U11-002 q9), so this is a note, not a change.
- `exp26b-u7-004-q5` option c, "Stop watching because Navy2 is closer". Borderline against
  the giveaway ban, but it carries a stated rationale, so it reads as real disengagement
  rather than an absurd action. Kept; worth watching if the class recurs.
- `exp26b-u7-003-q6` "Why does your place matter to Navy2?" is grammatical but abstract for
  a read-aloud U7 prompt. "Why does where YOU stand matter to Navy2?" would be clearer.
  Style, not a defect — retained.
- `exp26b-u7-002-q2` announces the answer count ("Which **two** clues...") where the
  parallel question in `-005` does not. Scaffolding, defensible at U7, inconsistent across
  the batch.
- **Batch-level:** all five scenes use an identical six-question template (q1 who-has-the-
  puck choice -> q2 multi -> q3 position -> q4 sequence -> q5 changed-condition choice -> q6
  explain), with `-002/-003/-005` sharing the near-identical prompt "Who has the puck?".
  That is the "formulaic bulk content" pattern in `historical-checks.json`. It is a batch
  design question, not a per-question defect, so I did not repair it — but it is why every
  q4 and q5 in this packet needed the same check, and why two of them failed the same way.

---

## 5. Proposed curriculum bindings and ranked gaps

Bindings below are proposals against `curriculum-ledger.json` v3.1.0. The ledger emits
**12 U7 nodes, all at depth `I` (introduced)**. The coverage map's keyword `domainSignals`
are planning signals only; these are my reads of each scene's actual teaching objective.

| Scenario | Primary node | Secondary nodes | Why |
|---|---|---|---|
| `exp26b-u7-002` | `u7.puck-control` | `u7.time-and-space`, `u7.scanning` | Open-ice carry toward room while re-reading pressure. Matches the HC U7 matrix line "Open ice carry - forehand & backhand". |
| `exp26b-u7-003` | `u7.passing` | `u7.reading-the-play`, `u7.scanning` | Getting available on a new angle for a carrier. USA Hockey 8U "creating and finding passing lanes". |
| `exp26b-u7-004` | `u7.reading-the-play` | `u7.decision-making`, `u7.battles-and-compete` | Possession-change recognition. Concept level only — see the 0%-systems caveat in section 4. |
| `exp26b-u7-005` | `u7.passing` | `u7.receiving`, `u7.time-and-space` | Off-puck spacing to give the carrier a second target. USA Hockey 8U near/far support. |
| `exp26b-u7-006` | `u7.puck-control` | `u7.creativity-under-pressure`, `u7.scanning` | Shielded carry under inside pressure. Supported as a puck-control extension plus the HC Vision & Scanning protection drill, **not** by a named U7 matrix item. |

### Ranked U7 gaps, from actual counts

The U7 band holds **20 scenarios / 160 questions** across 9 topics and 20 families
(`ageRows[0]`; topic counts from the snapshot).

1. **`u7.shooting` has no scenario at all.** Zero of the 20 U7 scenarios carry a shooting
   topic, yet the ledger emits `u7.shooting` at depth `I` and the HC U7 matrix lists four
   shot types (forehand sweep, wrist, backhand sweep, flip). This is a genuine **tactical /
   concept gap**, the clearest one in the band. Caveat: a static freeze cannot show a shot
   result, so any new scene must teach the *decision* (shoot or pass, where the lane is),
   never an outcome.
2. **`skating-movement` is nearly empty.** `u7.edges-balance` and `u7.agility-mobility` are
   both depth `I`, but only 1 of 20 U7 scenarios carries a skating topic ("Skating
   awareness"). Partly a real gap, partly a **delivery-format limit** — the renderer has no
   speed, stride or edge representation — so distinguish those two before commissioning
   content. What the static schema *can* teach is route choice and where to be next.
3. **`u7.receiving` is thin as a distinct skill.** One family (`beginner-receiving`) of 20.
   Most support scenes stop at getting open; almost none ask what the receiver does at the
   moment the puck arrives. That is a **concept gap inside an already-covered topic**, not a
   missing topic.
4. **Format, not concept: `sequence` is exactly one per scenario, 20 of 160 questions.**
   Given the contract's "sequence belongs only where order itself teaches something", a flat
   one-per-scene distribution suggests the format is being filled to quota rather than
   chosen. Packet-04 is a clean example — five scenes, five sequences, all the same
   notice -> act -> re-check shape. Recommend varying the count rather than adding sequences.
5. **Not a gap: reflections.** U7 authoring holds 30 explain questions in 160 (18.75%),
   above the 13.3% delivery figure — which is expected, since the extra 100 reflections are
   retained in the authoring bank by design. No action.

**No new content is proposed in this return.** Remit item 3 says new situations come after
the repair audit, and 36 of 40 packets are still unreviewed.

---

## 6. Files, validation run, and what to continue

### Files returned

- `docs/factory/claude-project/claude-output/review-packet-04.json`
- `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-04.md` (this file)

Nothing else was written. `bank-snapshot.json`, the packet files, the historical receipts,
application source and the live scenario engine were read only and are unmodified. No git
operation was run.

### Structural validation actually run

```
node validation/validate-return.mjs claude-output/review-packet-04.json
{
  "errors": [],
  "warnings": [],
  "counts": { "assigned": 30, "reviewed": 30, "remaining": 0, "repairedScenarios": 5 },
  "limits": [ "Structure and stale-content checks only. Independent hockey review and
               rendered-scene verification remain required. No files were imported or
               changed." ]
}
exit 0
```

I additionally ran `validateExperimentalBank` and `makeScene` directly against each of the
five replacements: **0 structural errors each**, every actor, initial carried puck and
position-question moved puck inside the ice by `isCoachRoutePoint`, no duplicate option
text, no lowercase-`you` subject left in any prompt.

### Checks NOT run

- No independent second review. This is one self-review; `replacementReview.status` is
  `self-checked` on all five, which claims exactly that and nothing more.
- No rendered-scene or application check of any kind (see section 4).
- No human coach review. Nothing here is approved, imported, published, or eligible for
  mastery credit.
- The `newContent` batch validator was not exercised; this return proposes no new content.

### Source reads (all four recorded in `sourceChecks`, all `access: read`, checked 2026-09-05)

| Source | Note |
|---|---|
| HC - Timbits U7 fundamental skill development | Bare fetch returned **HTTP 403**; a browser User-Agent returned **HTTP 200**. Full skills matrix + the 85/15 skills-to-tactics split. |
| HC - 7 Principles: Puck Control | Same 403-then-200 pattern. Time & space; puck control paired with continuous scanning. |
| HC - 7 Principles: Vision & Scanning | Same pattern. "Key Information to Identify" (teammates + pressure direction); protection drills 1 and 2. |
| USA Hockey - Skill Progressions for Youth Hockey (2019) | PDF pp. 11-15 read. 8U puck pursuit / puck support / passing lanes; 0% systems; allowable-contact material read but deliberately unused (section 3.2). |

The 403-on-bare-fetch, 200-on-browser-UA pattern held for all three Hockey Canada pages, as
the packet-03 handoff warned. None of these sources certifies any coordinate, route,
outcome or answer key in this bank; each `scope` field records that limit.

### Continue with

**`packet-05`.** Packets 01-04 are returned; 36 packets remain. Two things from this packet
are worth carrying into the next one: the five-scene `exp26b` U7 template is uniform enough
that a defect in one scene's q4/q5 slot is worth checking in every sibling immediately, and
any scene whose objective is protection or shielding needs its **rendered carry offset**
computed before its answer key is read.
