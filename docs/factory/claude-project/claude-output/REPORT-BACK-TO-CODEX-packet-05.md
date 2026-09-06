# Report back to Codex — packet-05

**Snapshot:** `rr-20260905-c8403be16748c919` · **Packet:** `packet-05` · **Date checked:** 2026-09-05
**Return file:** `claude-output/review-packet-05.json`

This is a self-checked draft review. It is not an independent review, not a rendered-scene
verification, not human coach approval, and nothing here is tested in the application or
published. No file in the snapshot, the bank, the scenario engine or the application was
modified.

---

## 1. Counts

| | |
|---|---|
| Scenarios assigned / reviewed | 5 / 5 |
| Questions assigned / reviewed | 34 / 34 |
| Retained | 19 |
| Repair proposed | 15 |
| Blocked | 0 |
| Unreviewed | 0 (`completion: complete`, `remainingQuestionIds: []`) |
| Scenario replacements proposed | 5 (all to version 2) |
| Question hashes affected | 34 (every question in the packet) |

Scenes: `exp26b-u7-007`, `exp26b-u7-008`, `exp26b-u7-009`, `exp26b-u7-010` (U7, 6 questions
each) and `exp26-u9-001` (U9, 10 questions).

Every scenario needed a scene-level edit (briefing, cue, limits or sources), so every linked
question hash changes even where the question text is untouched. `affectedQuestionIds` lists
all of them and `replacementReview` re-checks all 34 final questions once each.

### Repair-receipt coverage check (requested)

`packet-05.repairReceipts` is **empty**. Searching `docs/factory/research/question-review/`
(`repairs/*.json`, `calibration/*.json`, `combined-review.json`, `catalog-review.json`,
`young-first.json`, `reviewed-question-manifest.json`) confirms **no prior repair receipt
exists for any of the five scenes**. The only prior coverage is a first-pass AI review with
`firstReviewed: true`, `secondReviewed: false`, `revisionRechecked: false`, status
`no-open-ai-finding`, and for `exp26-u9-001` that first pass covers only q1-q6; q7-q10 carry
no historical row at all. These scenes were treated as unproven, not as clean. Fifteen
findings resulted.

---

## 2. The finding that drove most of this packet: the two shipped views disagree on +y

This is the highest-impact item and it is a **repository issue, not only a content issue**.
It is reported here as unresolved for Codex; no application source was touched.

Executable evidence, all read from the current working tree:

| View | Where rink `+y` appears on screen |
|---|---|
| `ExperimentalBoard` (2D overhead board, `src/one-on-one/ExperimentalPractice.jsx`, `translate(${a.x},${-a.y})`) | **top** |
| `getReadSceneCamera` landscape `overhead` (`src/one-on-one/readSequenceVisuals.js`) | **bottom** (screen-up axis is rink y exactly -1.000) |
| landscape `broadcast` (the default preset) | **bottom** (screen-up rink y -0.802) |
| landscape `rink-side` | **bottom** (-0.516) |
| landscape `behind-net` | **screen-left** |
| portrait `broadcast` / `overhead` | **screen-right** |
| `validation/src/scenario-engine/rinkFrame.js` (documented convention) | **bottom** |

I recomputed the screen axes from the module's own `backward` / `rightAxis` / `upAxis`
construction rather than trusting the doc comment. `ExperimentalPractice.jsx` defaults to the
3D view (`board` state starts `false`), and its own "Show example on overhead board" button
switches a position answer into the mirrored 2D board.

The four U7 scenes are internally consistent with each other and with the 2D board: they all
treat `+y` as up. That convention is the opposite of the default 3D view. **Whichever
renderer is judged correct, the two disagree, so any "upper / lower / above / below" word
keyed to `y` is wrong in at least one shipped view, and meaningless in portrait, where `y`
maps to left/right.** That is what makes this a content defect regardless of how the
renderer question is settled.

Packet-04 flagged this pattern as `unproven` and recorded that "the camera orientation was
not inspected." It has now been inspected in code. In packet-05 the wording is **load-bearing
on scored `basis: scene` options** (`exp26b-u7-008-q2`, `exp26b-u7-009-q2`,
`exp26b-u7-010-q2`), where the learner is expected to verify the claim against the picture.

**The repair does not flip the words.** Flipping would fix the 3D view and break the 2D board
and still fail portrait. Every affected phrase is rewritten to be camera-independent — the
side boards, the middle, "your side", "the far side of the puck" — which reads the same in
all six views. Codex still needs to decide separately which renderer is wrong; the wording
repair is safe either way.

Two things I did **not** do: I did not run the application, and I did not inspect a rendered
frame or screenshot. Visual verification is **unavailable**. This finding rests entirely on
reading shipped source and recomputing its constants.

---

## 3. The five highest-impact before / after examples

### 3.1 `exp26-u9-001-q9` — a position question that duplicated q3 and used an unresolvable direction

- **Before:** prompt "Place YOU above the circle with a clear view to Navy2.", reference `(21, 1)`.
- **After:** prompt "Place YOU closer to Navy2 for a shorter pass, off the boards.", reference `(14, 8)`.
- **Why:** two defects. (a) "above the circle" resolves opposite ways between the two views,
  and on the hockey reading of "above the circles" — higher toward the blue line — `(21, 1)`
  is not above it either, because its `x` of 21 is level with the circle's `x` of 20.7.
  (b) `(21, 1)` sits only **2.022 m** from the q3 example point `(20.7, 3)`, so the scenario
  asked for effectively the same placement twice; the contract states small coordinate shifts
  do not prove a different tactical situation.
- **Geometry of the new point:** on the ice by `isCoachRoutePoint`; 9.341 m of movement;
  8.360 m from the q3 point; 4.954 m off the boards versus 2.363 m at the start, so it still
  "leaves the boards" as the title requires; 5.099 m from Navy2; Gold1 4.140 m off a 3.899 m
  lane from the rendered carried puck at `(13.430, 4.142)`.
- **Teaching:** q3 is now the far-support offer and q9 the near-support offer — the exact
  pairing USA Hockey's 8-and-Under Team Concepts section names. The explanation states that
  Gold1 can step across, so no completed pass is claimed.

### 3.2 `exp26-u9-001-q7` — a near-verbatim duplicate of q5, revised to a distinct job

- **Before:** "If Gold1 keeps the circle window closed, what can YOU do?" -> key "Move to
  another angle Navy2 can see"; distractor "Ask for the blocked pass".
- **q5, for comparison:** "Imagine Gold1 follows into your new window. What might help?" ->
  key "Find another window"; distractor "Ask for the same blocked pass".
- **After:** "No window opens for YOU right now. What is a fair read?" -> key "Navy2 can keep
  the puck or move while YOU keep working for space"; distractors "Navy2 has to pass right
  away" and "YOU should skate straight back to the boards".
- **Why:** same hypothetical, same key, same format, near-verbatim distractor — it added no
  new cue, decision or actor responsibility, which is the redundancy test in calibration
  lesson 8. Following the remedy the adjudication applied at U13-001 q9, it is revised rather
  than deleted. The new job — a pass is not owed, and the carrier has options — uses only
  actors and conditions already in the scene, and introduces no contact, rule or system claim.

### 3.3 `exp26b-u7-008-q2` — a scored `basis: scene` option a learner cannot verify

- **Before:** option a "Navy3 on the lower side" (plus the briefing, a cue, the q3 explanation
  and q5 option a).
- **After:** "Navy3 out wide, away from the middle".
- **Why:** Navy3 is at `y = -6`, which renders toward the **top** of the screen in the default
  3D presets and toward the **bottom** on the 2D board. This is a `basis: scene` question, so
  the learner is being asked to confirm it against the picture. The replacement is true in
  every view: Navy3 is 8 m across the ice from YOU and 6.954 m from the nearest boards.
- The same repair applies to `exp26b-u7-009-q2` ("Gold1 below" -> "Gold1 wider on your side,
  near the boards"; Gold1 is 3.954 m off the boards while YOU are 8.954 m off them) and to
  `exp26b-u7-010-q2` ("Gold1 above the puck" / "Navy2 below the puck" -> "far side of the
  puck" / "on your side of the puck"; the puck sits at `y = 1` with YOU and Navy2 on one side
  and Gold1 on the other).

### 3.4 Six giveaway or trivia distractors across four scenes

Same class the calibration adjudication amended at U7-001 q5 and U9-006 q5.

| ID | Before | After |
|---|---|---|
| `exp26b-u7-007-q2` c | Stand on Navy2's skates | Skate right beside Navy2 and follow the puck |
| `exp26b-u7-008-q5` b | Pass straight through Gold1 without looking | Pass into the middle where Gold1 is standing |
| `exp26b-u7-009-q5` b | Go there without looking because it is named | Go straight to the line because the coach named it |
| `exp26b-u7-009-q5` c | Leave the puck and skate away | Pass to Navy2 through the space Gold1 is entering |
| `exp26b-u7-010-q5` b | Reach through Gold1 without looking | Keep skating at the puck without changing anything |
| `exp26-u9-001-q1` c | A second puck | Open ice with nobody in it |
| `exp26-u9-001-q2` c | The colour of a seat in the arena | Where YOU were standing before |
| `exp26-u9-001-q5` b | Stand still because the circle is always right | Stand still because the circle is the named spot |

The standard applied, consistently across the packet: a distractor is defective if it is
physically absurd, or if it labels itself wrong ("without looking") so that no player would
choose it. `exp26b-u7-007-q5` option c "Hide behind Gold1" was **kept** under the same
standard — it is the exact failure that scenario's objective names, so it is a realistic
error, not a joke. `exp26-u9-001-q1` option b "A goalie" was **kept**: it asserts no goalie
exists and remains a plausible wrong guess.

`exp26b-u7-010-q5` option b matters beyond distractor quality: "reach through Gold1" implied
a contact action that the scene's own `limits` field says the still frame does not establish.
The replacement makes no contact or safety claim, per the calibration rule against inventing
contact claims without a verified source.

### 3.5 `exp26b-u7-007-q4` — a sequence that postponed the pressure check behind a committing move

- **Before:** option c "Show a target and check Gold1"; explanation "Start by locating the
  carrier, create a lane, then check whether Gold1 has taken it away."
- **After:** option c "Show a target while checking Gold1"; explanation now states that
  looking and skating overlap and that the order is a suggestion, not a fixed timeline.
- **Why:** the order put the defender check after the committing move — the postponed-scan
  pattern recorded against `exp26-u9-006-q3`. The remedy follows the adjudication at
  U13-010 q3: clarify the overlap, do not delete the routine. Basis is `coaching`, so
  `reviewResponse` never grades this order in the first place.
- The other four sequences in the packet (`u7-008-q4`, `u7-009-q4`, `u7-010-q4`,
  `u9-001-q4`) were checked against the same standard and **retained**: each puts the
  pressure look before the committing action.

---

## 4. Scene / answer conflicts, rule and system uncertainty, checks not performed

### Conflicts resolved in this return

- Screen-direction claims versus rendered output — section 2, six phrases across three scenes.
- Duplicate placement and duplicate decision inside `exp26-u9-001` — 3.1 and 3.2.
- `exp26-u9-001` briefing "Gold1 stands directly between you" was ambiguous, because YOU is a
  single named learner everywhere else in the bank, and q1 asks the learner to state that exact
  relationship. It now reads "between YOU and Navy2".

### Checked and found sound — recorded so they are not re-opened as findings

- **Roster in `exp26-u9-001` is correct despite the labels.** The actors are labelled `H2`
  and `A1`, but `compactActorLabel` reduces them to `2` and `1` and `actorDisplayName`
  renders **Navy 2** and **Gold 1**, so the prose names `Navy2` and `Gold1` do match the
  displayed roster and `questionActorWarnings` raises nothing. Flagging this would have been
  a false review flag of the kind the project file warns about.
- **`exp26-u9-001-q1` collinearity.** Gold1 sits exactly on the actor-centre line from Navy2
  to YOU (0.000 m offset, 50 % of a 12.500 m span). Per calibration lesson 3 I re-checked
  from the **rendered carry offset**, not the actor centre: the carried puck renders at
  `(13.430, 4.142)` and Gold1 is 0.357 m off that line at 45.7 %. "Between" survives as a
  visible fact; nothing establishes a blocked or intercepted pass, and the evidence ledger
  says so.
- **`exp26b-u7-010` has no carried puck.** The puck is loose (`owner: null`), so the
  impossible move-relative-to-your-own-puck pattern from `exp26-u7-001-q9` cannot arise; q3's
  reference is safe.
- **Every actor, every example point and every carried-puck position** in all five scenes was
  run through `isCoachRoutePoint`. All are on the ice. No point was declared off-ice.
- **Blue-line and landmark claims** in `exp26b-u7-009` match the coordinates: the left blue
  line is `x = -7.62`, YOU are 0.38 m behind it, Navy2 and Gold1 are beyond it.

### Rule, system and age uncertainty

- **U7 format versus a full-ice blue line.** Hockey Canada's U7 set-up page, read today,
  states U7 is played cross-ice for the entire season on a surface of at most 100 x 60 ft,
  4-on-4, with **no icing or offside**. `exp26b-u7-009` builds its activity on a full-ice blue
  line. The existing `limits` already disclaimed offside; the repair adds the format point and
  declares the practice area in the briefing, which the authoring contract requires for
  small-area youth teaching. The scene now rests explicitly on the stated coach instruction.
  **The other three U7 scenes do not invoke a full-ice-only marking, so no practice-area
  sentence was forced into them.**
- **No rule, contact or safety claim was added anywhere in this packet**, and one was removed
  (3.4, `exp26b-u7-010-q5`).
- **Not settled, for Codex:** whether the four U7 scenes belong at U7 at all — see section 5.

### Checks not performed

- The application was not run. No rendered frame, screenshot, camera framing, legibility or
  device check was made. **Visual verification is unavailable.**
- No independent second review. `replacementReview.status` is `self-checked`; that is my own
  check of the exact final content and its hashes, and it is not an independent review.
- No human coach approval, no mastery admission, no import, no publication.
- Jack Han's *Hockey Tactics 2026* was not consulted: none of these scenes cite it, and no
  purchased copy is available.

---

## 5. Curriculum bindings and ranked gaps

Bindings are proposed against the locked ledger v3.1 concept IDs. The coverage map's keyword
matches were treated as planning signals only.

| Scenario | Teaching concept (proposed binding) | Tactical situation | Ledger depth at this band |
|---|---|---|---|
| `exp26b-u7-007` | `off-puck-support-offense` (primary), `time-and-space`, `scanning` | Support beside a carrier in the middle, one defender on the far side | **no U7 node for `off-puck-support-offense`** |
| `exp26b-u7-008` | `receiving` (primary), `scanning`, `puck-carrier-options` | The moment after a completed reception, pressure ahead, a wide teammate | `receiving` I; **no U7 node for `puck-carrier-options`** |
| `exp26b-u7-009` | `scanning` (primary), `reading-the-play` | A coach-named landmark as an orientation target with pressure nearby | `scanning` I, `reading-the-play` I |
| `exp26b-u7-010` | `battles-and-compete` (primary), `reading-the-play`, `decision-making` | Loose puck after a missed pass, closest player, one opponent converging | `battles-and-compete` I |
| `exp26-u9-001` | `off-puck-support-offense` (primary), `passing`, `scanning` | Getting open off the boards with a defender on the direct line | `off-puck-support-offense` I, `passing` D |

### Ranked gaps and issues, with the evidence

1. **U7 off-puck support has no curriculum node and no age-matched source.** The ledger v3.1
   introduces `off-puck-support-offense` at **U9**, not U7. Hockey Canada's U7 skills matrix,
   read in full today, contains **no** off-puck support, spacing, passing-lane or team-tactic
   item — Individual Offensive Tactics are limited to body fakes and stick fakes, and the page
   caps individual tactics at 15 % of practice time for 5- and 6-year-olds. Yet
   `exp26b-u7-007` is titled and topic-tagged as off-puck support, and `-008` and `-009` carry
   support families. The only source among the four I read that supports this teaching is
   **USA Hockey's 8-and-Under Player Knowledge**, which does list "Puck Support ... the
   beginning of the idea of 'getting open'" — but that is a United States band, it covers
   ages up to eight, and it puts team systems at **0 %** at this age.
   **Action taken:** the USA Hockey source was appended to `exp26b-u7-007` with a `use` string
   stating all three limits. **Action for Codex:** decide whether these three U7 support scenes
   should be re-banded to U9, kept at U7 with an explicit "beginning of getting open" framing,
   or whether the ledger should introduce `off-puck-support-offense` at U7. I did not change
   any `ageBand`; the contract forbids it in a repair.
2. **Format templating across the U7 set.** All four U7 scenes use the identical six-question
   template in the identical order: choice, multi, position, sequence, choice, explain. The
   authoring contract says "Do not force the same question order on every scenario," and the
   historical record holds back bulk drafts for "repeated patterns." This is a **delivery and
   format** gap, not a tactical one, and it is too large to fix inside a repair — it needs a
   rotation or re-authoring proposal. Packet totals: choice 11, multi 6, position 6, explain 6,
   sequence 5; basis coaching 26, scene 8.
3. **Reflection delivery in `exp26-u9-001`.** It carries **two** explain questions (q6 and
   q10) while routine practice shows at most one per scenario, so one rotates out of the
   routine 1,500. Both IDs are preserved; the contract asks that rotation be proposed
   separately rather than by deleting an ID. Flagged, not repaired.
4. **`exp26-u9-001` q2 / q8 overlap.** Both are multi questions keyed to the same two players.
   q8 does add a genuinely new cue — that Gold1 has a *new* place once YOU have moved — so it
   reads as retrieval practice on a changed picture rather than a repeat, and it was
   **retained**. Recorded so Codex can weigh it rather than rediscover it.
5. **Not a gap — a note.** Four of the five scenes carry `topic: Off-puck support / Passing /
   Rink awareness / Puck recovery` and only one has a `scene`-basis majority. The
   coaching-basis share (26 of 34) is appropriate given the contract reserves `basis: scene`
   for directly visible or explicitly stated facts, and all eight `scene`-basis questions in
   this packet were checked against the coordinates individually.

No new content was drafted in this packet. The `newContent` field is absent; remit item 3
stays open until the repair audit is further along.

---

## 6. Files, validation run, and what comes next

**Files returned**

- `docs/factory/claude-project/claude-output/review-packet-05.json`
- `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-05.md` (this file)

**Structural validation actually run**

```
node validation/validate-return.mjs claude-output/review-packet-05.json
{
  "errors": [],
  "warnings": [],
  "counts": { "assigned": 34, "reviewed": 34, "remaining": 0, "repairedScenarios": 5 },
  "limits": ["Structure and stale-content checks only. Independent hockey review and
              rendered-scene verification remain required. No files were imported or changed."]
}
```

Zero errors and zero warnings. That run includes `validateExperimentalBank` on all five
replacements, `positionSubjectIssue` and `questionActorWarnings` on every replacement
question, the carried-puck-on-ice check, exact base-hash and current-content comparison
against the live bank, and the exact final-content hashes in `replacementReview`.

Separately, before building the return I re-derived every `baseScenarioHash` and
`baseContentHash` in the packet with the repository's own `questionContentHash` and
`scenarioSnapshotHash`; all 39 reproduced exactly, which is what makes the proposed final
hashes trustworthy.

**Checks not run:** everything in section 4 — no application run, no rendered frame, no
independent second review, no human coach approval, no import, no publication.

**Open for Codex, in priority order**

1. Decide the `+y` renderer question (section 2). `ExperimentalBoard` and
   `getReadSceneCamera` currently mirror each other, and "Show example on overhead board"
   moves a learner between them mid-question. The wording repairs here are safe either way,
   but other packets almost certainly carry the same phrasing.
2. Independently review the two substantive content proposals: the revised
   `exp26-u9-001-q7` (new teaching job) and the moved `exp26-u9-001-q9` reference. Both are
   larger than a wording fix and both should get a fresh independent review of their exact
   final content.
3. Rule on the U7 off-puck-support banding question (section 5, gap 1).
4. Decide `exp26b-u7-009-q2` option c, "A rule that says you must pass" — not a visible
   object and non-parallel with its siblings, but it targets a real misconception. Replacing
   it was judged over-repair and it is retained unchanged.
5. Continue with **packet-06**.
