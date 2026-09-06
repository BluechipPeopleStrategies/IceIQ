# Report back to Codex — packet-02

**Snapshot:** `rr-20260905-c8403be16748c919` · **Packet:** `packet-02` · Prepared 2026-09-05 by Claude.
**Files returned:** `claude-output/review-packet-02.json`, this report.

This is a review draft. It is not an independent second review, not a rendered-scene check,
not app testing, and not human coach approval. Nothing here has been applied to the bank,
and no git write of any kind was performed.

## 0. Calibration feedback applied

I read `docs/factory/research/question-review/calibration/calibration-adjudication.md` before
touching this packet. The ten forward lessons were used as working rules, not as background.
Where they changed what I did:

- **Lesson 1 (newest applicable receipt).** The packet carries P1 `missing-gold1` findings against
  `exp26-u7-002/-004/-005` q7-q10 from `expansion/youth-first.json`. Those are **resolved**, not open:
  `youth-repairs.json` replaced all twelve questions, the `afterContentHash` of every one matches this
  packet's manifest exactly, and `expansion/youth-second.json` records an independent pass on those
  same hashes. I have not re-reported them. I re-verified each of the twelve myself rather than
  accepting the pass label.
- **Lesson 2 (grammar across the whole scene).** I swept all 50 questions — every prompt, option and
  explanation — for `YOU is / YOU has / Where is YOU` and the rest of that class. **Packet-02 contains
  none.** All `grammar` passes in this return are from that sweep, not copied from a prior label.
  Separately, once I found a possession inversion in `exp26-u7-003-q8` I checked all ten linked
  questions and found the same class in `-q10`; same in `exp26-u7-006`, where it appears in q7, q8
  **and** q10. That "check the siblings" habit is where three of this packet's findings came from.
- **Lesson 3 (rendered carry offset, not actor centres).** Every passing/lane claim here is measured
  from the drawn carried puck via `makeScene()`, not from an actor centre. Example: `exp26-u7-003-q9`'s
  replacement lane is measured from the puck at `(-2.00,-0.30)`, not from YOU at `(-3,-1)`. I have
  not called any lane blocked anywhere in this packet.
- **Lesson 4 (no invented minimum movement distance).** I explicitly declined to flag
  `exp26-u7-004-q9` (Navy2 moves only 3.83 m, already outside the circle) and `exp26-u7-005-q9`
  (Navy2 moves 4.00 m) on distance grounds. Where I *did* move a reference — `exp26-u7-003-q9` — the
  argument is duplication with a sibling at 1.41 m, not that the move was too small.
- **Lesson 5 (preserve the objective; solve the demonstrated defect).** Every replacement keeps the
  original teaching objective. `exp26-u7-003-q10` keeps "show you are ready to receive" and only adds
  the missing stated condition. `exp26-u7-006-q7/q8/q10` stay inside the scene's own receiving
  objective rather than becoming a new tactical situation.
- **Lesson 6 (credible distractors).** Four repairs are distractor repairs. I also **declined** several
  candidates on the same ground applied in reverse — see section 3.
- **Lesson 7 (explain the conditions).** No replacement asserts a completed pass, a guaranteed
  turnover or a universally better spot. Each names what changes the answer.
- **Lesson 8 (repetition vs duplication).** Two duplication findings, each with the specific reason
  the later item adds no cue, decision or responsibility: `exp26-u7-004` q5/q7 and `exp26-u7-003`
  q4/q9.
- **Lesson 9 (flexible tactics, age and jurisdiction).** Sources record the Canada/US age-band gap
  explicitly (Hockey Canada U7 = 5-6; USA Hockey 8U is roughly 7-8).
- **Lesson 10 (narrow approval claims).** Validator output below is structural only. Every
  `replacementReview` is `self-checked`, which is not an independent review.

**No contact, safety or playing-rule claim is asserted as the basis for any repair in this packet.**
The one place a contact-flavoured option was touched (`exp26-u7-004-q5`, "Stand on Navy2") the stated
defect is that the action is physically impossible, not that it is illegal — deliberately, after the
declined goalie-separation repair.

## 1. Counts

| | |
|---|---|
| Scenarios assigned / reviewed | 5 / 5 |
| Questions assigned / reviewed | 50 / 50 |
| Retained | 35 |
| Repair proposed | 15 |
| Blocked | 0 |
| Unreviewed | 0 (`completion: "complete"`) |
| Scenarios with a proposed replacement | 5 (all to version 2) |
| Question hashes affected | 21 |

Per scenario — repair verdicts, then `affectedQuestionIds` (hash changes, which is the larger number
wherever the setup moved):

| Scenario | Repair verdicts | Affected hashes | Why the two differ |
|---|---|---|---|
| `exp26-u7-002` | q5 | 1 | question-only change |
| `exp26-u7-003` | q8, q9, q10 | 3 | question-only changes |
| `exp26-u7-004` | q2, q5, q7, q10 | **10** | setup change moves one actor, so every linked question rehashes |
| `exp26-u7-005` | q4, q5 | 2 | question-only changes |
| `exp26-u7-006` | q2, q7, q8, q9, q10 | 5 | question-only changes |

Six `exp26-u7-004` questions carry `retain` while appearing in `affectedQuestionIds`. That is
deliberate and is stated in each row's reason: their **text** is kept verbatim and passed review;
their **hash** changes only because the scene moved. `exp26-u7-004-q10` is the reverse case — its text
is kept verbatim but its verdict is `repair`, because in version 1 the question is false and the setup
fix is what repairs it.

## 2. Five highest-impact before / after

### 2.1 exp26-u7-006 q7, q8, q10 — possession invented, three questions, previously passed

The setup has `puck.owner: "home-skater-2"`. Navy2 holds the puck, YOU is the invited receiver, and
the briefing says "No pass has happened yet" and that Gold1 "stands outside this first activity and is
**not challenging**". All three extension questions ignore that.

- q7 before: *"If Gold1 closes the wall side, what could you choose?"* — options "Keep the puck there
  without looking", "Pass through Gold1"; key "Look for Navy2 or another safe lane". That is a
  carrier's outlet read given to a player with no puck, and it puts Gold1 into a drill the briefing
  removes Gold1 from.
- q8 before: *"What two cues tell you where to protect?"*, explanation "...how to shield the puck...".
- q10 before: *"How can your body help the puck?"*, explanation "Put your body between Gold1 and the
  puck, then look for Navy2."

`expansion/youth-first.json` records all four `exp26-u7-006` extensions as **pass**. That review
checked whether a Gold1 actor exists in the roster — it does — and did not check possession. This is
the packet's largest finding and it sits behind an existing pass label.

After: q7 becomes a receiver-recovery question (a pass sliding a little behind YOU); q8 becomes two
cues the drawing actually contains; q10 becomes *"Gold1 is not in this try. What would change if Gold1
joined in?"* — which turns the same Gold1 material into honest conditional reasoning instead of a
contradiction.

Supporting context, offered as context and not as the basis of the repair: the locked curriculum
ledger v3.1.0 introduces `puck-protection` at **U9** (`U9=I, U11=D`), not U7, and the bank already
carries a dedicated U7 protection scene at `exp26b-u7-006` — so taking protection out of this
*receiving* scene costs no coverage. Ledger vs. bank is your call, not mine; see section 4.

### 2.2 exp26-u7-004 setup — YOU is standing inside the circle they are told to return to

Owner's headline failure class (word says one thing, picture shows another), in a new place.

Briefing: "YOU are near the side boards... return to its middle." q2 explanation: YOU are "outside the
circle centre". q10: "Can you skate **across the painted circle line** to reach the middle?"

Measured against the circle the app actually paints:

| Item | Value |
|---|---|
| Painted circle | centre `(20.7264, 6.7056)`, r = `4.572` |
| YOU (v1) | `(20.7, 10.5)` gives **3.794 m** from centre = **0.78 m inside** the painted line |
| Path to the middle (v1) | never leaves the circle, so q10 has no line to cross |
| YOU (proposed v2) | `(20.7, 11.9)` gives 5.094 m from centre = 0.52 m **outside**; 1.054 m off the straight side board at y=12.954; carried puck `(21.40, 10.90)`, on ice |
| Path to the middle (v2) | crosses the painted line at y = 11.278 |

Verified in three independent code paths that agree: `ExperimentalPractice.jsx` (2D board,
20.7/6.7/4.572), `rinkMaterials.js` `makeIceTexture()` (3D ice texture, 20.7264/6.7056/4.572 plus dot
and hash marks), `CameraViewControls.jsx`. So the circle is genuinely drawn in both the overhead and
3D views — that part of the scene is sound; only the actor placement is wrong.

Cost of the fix: every one of the ten linked hashes changes. Only `home-skater-1.y` moves; the
briefing, cues, sources and limits are byte-identical.

### 2.3 exp26-u7-006-q9 — every spatial claim inverted against its own reference

Before: *"Place YOU above the puck with Gold1 below you."* with reference `(-3,-6)`.

| Claim | Measurement | Verdict |
|---|---|---|
| "above the puck" | drawn puck `(-6.57, 1.14)`; reference y = -6 | **7.14 m below** it |
| "with Gold1 below you" | Gold1 `(5,-5)`; reference y = -6 | YOU is **below** Gold1 |
| "leaves Navy2 in the forward picture" | bearing to Navy2 = 2.159 rad vs facing -2.500 rad | **93 degrees off** — beside, not forward |

After: reference `(-4, 6)` as a receiver's second waiting spot — on ice, 5.10 m move, the line to
Navy2 clears Gold1 by 13.1 m, Navy2 turns only 29 degrees from its drawn 0.600 rad facing to see it,
and it is 3.61 m from q4's reference so it is a distinguishable second example rather than a repeat.

### 2.4 exp26-u7-003 q8 and q10 — possession inverted, found by checking the siblings

`puck.owner: "home-skater-1"`; the drawn carried puck is at `(-4.00, 1.70)`, attached to YOU.

- q8 before: option a *"Navy2 with the puck"*, explanation *"Navy2 decides whether a pass can be
  made"*. After: both keyed options name players ("Navy2, who is waiting for a pass", "Gold1, who
  may have moved"), which also fixes the parallelism against a prompt asking for "two players", and
  the explanation returns the decision to YOU.
- q10 before: *"How can you show Navy2 that you are ready?"* with *"present a visible target"* — a
  receiver's actions. After: *"Imagine YOU pass to Navy2 and Navy2 now has the puck. How can you show
  you are ready for a return pass?"* The objective is unchanged; the missing condition is now stated,
  following the U7-001 q10 precedent you accepted.

q7 of the same scene was checked for the identical defect and **does not have it** — "your first
angle" correctly belongs to the carrier — so it is retained.

### 2.5 exp26-u7-004 q5 and q7 — an absurd distractor, and a repair that recreated a duplicate

- q5 option b before: *"Stand on Navy2"* — a physically impossible action. After: *"Skate to the
  middle anyway"*, the realistic error of following the instruction literally. Option c *"Push Navy2
  away"* is **kept on purpose**: it is a real five-year-old behaviour and the explanation now names
  why it is wrong. No contact rule is invoked.
- q7 before duplicated q5: same premise (Navy2 occupies the circle), same key (wait outside with
  room), same format, same scene. q7 is your `youth-repairs.json` content — that pass correctly
  removed a Gold1 absent from this two-player setup, but was not compared against the q5 already in
  the scene. After, following the U13-001 q9 precedent ("revise to a distinct job"): *"While YOU wait
  for your turn, what helps YOU look after the puck?"* YOU is `puck.owner` in this scene and no other
  question mentions the puck at all.

## 3. Scene/answer conflicts, uncertainty, and what I did NOT do

**Conflicts found and repaired:** listed in section 2. All are scene/answer disagreements or
credibility defects; none required a rule, contact or safety claim.

**Deliberately declined — candidates I judged were not demonstrated defects:**

| Item | Why declined |
|---|---|
| `exp26-u7-003-q5` c "Assume space never changes" and `exp26-u7-005-q5` c "Assume every whistle has the same meaning" | Both use an absolute word, but each names one specific misconception the explanation then teaches against — the outdated-plan distractor the adjudication *prefers*. Flagging them would be formatting preference. |
| `exp26-u7-003-q7` vocabulary ("angle", "lane", "clear target") at U7 | USA Hockey's 8U progression, which I read, names "creating and finding passing lanes" as a beginning concept at this level, and the scene's limits allow adult co-reading. Age check passes. |
| `exp26-u7-004-q9` (3.83 m move) and `exp26-u7-005-q9` (4.00 m move) | Short illustrative moves. Lesson 4 forbids inventing a minimum movement distance. Both are geometrically correct as written. |
| `exp26-u7-002-q9` reference (3,0) | Depends on a post-pickup YOU the still frame does not draw, but the explanation states "from the pickup area", and the move shortens the line measured from either the pickup point (6.40 to 4.00 m) or the drawn YOU (13.45 to 10.30 m). |
| `exp26-u7-005-q1` c "Change the score" | Looks like trivia but is a real beginner belief, and the U7 rules page confirms no score is kept at U7 — so it is wrong for a sourced reason. |

**One reservation recorded, not repaired:** `exp26-u7-005-q8` asks what helps YOU give Navy2 room while
the freeze puts them 12.81 m apart in separate lanes, so the picture does not dramatise the problem.
The item is coaching-basis and teaches a habit, and manufacturing a crowding problem into the setup
would exceed the demonstrated defect. It is the weakest link in that scene; flagging it here rather
than acting on it.

**One open contract question, surfaced not reconciled:** `exp26-u7-005-q4` ("Is stopping the same as
skating faster?") carries `basis: "scene"` while its claim is general knowledge, not a visible or
stated scene fact. I repaired its trivia distractor but **left the basis alone**, because
`reviewResponse()` in `experimentalBankCore.js` only objectively grades scene-basis
choice/multi/sequence items, so demoting it to `coaching` would make an objectively answerable
question ungraded. That is an owner decision. It is recorded as `answer: "blocked"` in that question's
`replacementReview` row so the replacement is not presented as fully settled.

**Visual checks not performed.** No application access in this session. Camera framing, on-screen
legibility, whether a five-year-old reads the painted ring as "the faceoff circle", and how the
two-player scenes read at the default 3D camera are all **unverified**. All geometry above is offline
computation against the repository's own `isCoachRoutePoint`, `makeScene` and rink-marking source, run
executably rather than estimated. Nothing was "tested in 3D".

**Source access — correction to the packet-01 return.** Packet-01 recorded four `hockeycanada.ca` URLs
as `access: "unavailable"` on an HTTP 403. **That was a fetch-tool artefact, not the site.** All five
sources cited by this packet return HTTP 200 to plain `curl -L` with a normal browser User-Agent, and
all five are recorded in the JSON as `access: "read"` with quoted content:

| Source | Result |
|---|---|
| HC Timbits U7 skills matrix | read — "5- and 6-year olds"; LTPD Fundamentals 1; "Only 15% of practice time ... individual tactics, 85% ... skills"; full skills matrix including Edge Control and open-ice carry |
| HC U7 set-up / game play / rules | read — cross-ice, max 100x60 ft; "No score is kept"; "body-checking is not permitted"; "Blue puck (4 oz) is preferred" |
| HC 7 Principles: Puck Control | read — stationary to moving to teammates progression; "Developing strong scanning habits is essential" |
| HC Skating Pathway | read — general; explicitly **does not** support the practice-stop answers, and I did not treat it as if it did |
| USA Hockey Skill Progressions 2019, PDF pp.12-14 | read (68 pp., pypdf) — 8U Puck Support / "getting open"; "creating and finding passing lanes"; "not at a cognitive level where they should be lectured on" these topics |

The blue-puck line is load-bearing for one repair: `exp26-u7-002-q5`'s "Only if it is blue" is not
merely silly, it invites a child who *correctly* knows U7 pucks are blue to pick a wrong answer.

## 4. Curriculum bindings and ranked gaps

Bindings proposed against locked ledger v3.1.0. U7 introduces exactly twelve concepts, all at depth
`I`: edges-balance, agility-mobility, puck-control, passing, receiving, shooting,
battles-and-compete, scanning, reading-the-play, decision-making, time-and-space,
creativity-under-pressure.

| Scenario | Proposed binding | Fit |
|---|---|---|
| `exp26-u7-002` | `puck-control` (primary), `reading-the-play`, `decision-making`; q7-q9 add `passing`, `scanning` | clean |
| `exp26-u7-003` | `puck-control` (primary), `scanning`, `time-and-space`; q7-q10 add `passing` | clean |
| `exp26-u7-004` | **no ledger concept fits** — see Gap A | unbound |
| `exp26-u7-005` | `edges-balance` for the stopping content only; the actual teaching is **unbound** — see Gap A | partial |
| `exp26-u7-006` | `receiving` (primary), `passing`, `scanning` | clean **after repair**; q8/q9/q10 currently bind to `puck-protection`, which the ledger does not introduce until U9 |

**Gap A (ranked 1) — "practice literacy" has no concept, yet 6 of the 20 U7 scenes teach it.**
Rink-landmark comprehension, practice signals, turn-taking and resetting after a mistake:
`exp26-u7-001` (Rink awareness), `-004` (Rink awareness), `-005` (Skating awareness / practice-stop),
`-007` (Rink awareness), `-010` (Teamwork / reset-after-mistake), `exp26b-u7-009` (Rink awareness).
That is **30% of the U7 bank** teaching something the ledger has no node for. This is a **ledger gap,
not a content gap** — the right response is a new concept (something like `practice-literacy`, U7=I,
U9=I), not authoring more scenes. It is also a *teaching concept* gap, distinct from format and from
tactical situation: the formats are already varied and the situations are already distinct.

**Gap B (ranked 2) — `puck-protection` band conflict, surfaced not reconciled.** The locked ledger
introduces it at U9. The bank contains a dedicated U7 protection scene (`exp26b-u7-006`, "Use body
position and a changing pressure cue to protect a l...") plus, before this repair, protection content
inside a U7 *receiving* scene. Either the ledger's U7 row should be revisited or the U7 protection
content is above band. **I have not resolved this.** My `exp26-u7-006` repair does not depend on it:
that repair stands on possession and the false "boards beside YOU" claim alone.

**Gap C (ranked 3) — U7 depth.** 20 of 200 scenes are U7 against 50 each for U11 and U13. If U7 is a
real product band rather than an on-ramp, coverage is thin, and the twelve introduced concepts are
unevenly served: shooting, battles-and-compete and creativity-under-pressure are barely visible in
this packet's five scenes. This is a *tactical situation* gap and would justify new content — but per
the remit, after the repair audit, not now.

## 5. Files, what was run, what was not, and where to continue

**Returned:**
- `docs/factory/claude-project/claude-output/review-packet-02.json`
- `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-02.md` (this file)

**Structural validation actually run** — `node validate-return.mjs ../claude-output/review-packet-02.json`
from `docs/factory/claude-project/validation/`, verbatim output:

    {
      "errors": [],
      "warnings": [],
      "counts": {
        "assigned": 50,
        "reviewed": 50,
        "remaining": 0,
        "repairedScenarios": 5
      },
      "limits": [
        "Structure and stale-content checks only. Independent hockey review and rendered-scene verification remain required. No files were imported or changed."
      ]
    }

Also run, executably, against the repository's own modules rather than by hand: `isCoachRoutePoint`
on every actor, reference point and carried puck (original and replacement); `makeScene` for every
position question's moved-carrier puck; `validateExperimentalBank` on all five replacements;
`positionSubjectIssue` and `questionActorWarnings` on all 50 questions (zero prompt/actorId
mismatches, zero unresolved actor names — `H2` renders as "Navy 2" and `A1` as "Gold 1" via
`actorLabel.js`, so the Navy2/Gold1 question text does resolve to drawn players).

**Not run / not claimed:** independent second review; rendered-scene or screenshot verification; any
camera, device or game-state check; human coach approval; any application testing; any git operation.
`bank-snapshot.json`, application source and the live scenario engine were read only. No file outside
`claude-output/` was created or modified.

**Continue with `packet-03`** (5 scenarios, 46 questions, U7). Two things to carry into it: the same
possession-vs-briefing check that produced most of this packet's findings, and the corrected source
access above — the Hockey Canada pages are readable, so future packets should not record them as
unavailable.

New content (remit item 3, five new situations / thirty questions) remains **not started**, correctly:
the repair audit is 2 of 40 packets complete.
