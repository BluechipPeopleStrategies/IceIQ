# Report back to Codex — packet-06

**Snapshot:** `rr-20260905-c8403be16748c919`
**Packet:** `packet-06`
**Assignment date:** 2026-09-05
**Status of this return:** `draft-not-reviewed`. JSON validation and my own self-check
only. No independent review, no rendered-scene check, no application run, no coach
approval, no publication.

---

## 1. Counts

| | |
|---|---|
| Scenarios assigned | 5 (`exp26-u9-002`, `-003`, `-004`, `-005`, `-007`) |
| Questions assigned | 50 |
| Questions reviewed | 50 |
| Retained | 23 |
| Repair proposed | 27 |
| Blocked | 0 |
| Unreviewed | 0 |
| Scenarios with a replacement | 5 of 5 |
| Completion | `complete` |

Every replacement preserves the scenario ID, `ageBand`, all ten question IDs, and the
`setup`, `briefing`, `cues`, `sources` and `limits` **verbatim**. Version goes 1 to 2 in
each case. Because no scene metadata changed, only the 27 repaired questions change
hash; the other 23 keep their baseline hashes exactly.

**Prior-coverage check.** I searched `docs/factory/` for repair receipts. There are
thirteen receipt files under `docs/factory/research/question-review/repairs/` and **none
of them touches any scene in this packet**. `historical-checks.json` carries 50 coverage
rows for these questions, all `no-open-ai-finding` with `historicalHashMatches: true`.
The packet's own `repairReceipts` array is empty. So every question here had a
zero-finding first-pass AI review and nothing else. q1 to q6 of each scene came through
`catalog-review.json` and `combined-review.json`; q7 to q10 came through
`expansion/youth-first.json`, which recorded all twenty as `pass`, `highRisk: false`,
`findingIds: []`. **That expansion block is where almost every defect in this packet
lives.** Twenty questions, twenty clean pass labels, and on inspection sixteen of them
carry a real defect.

**Delivery impact.** `selectPracticeQuestions` shows only the first `explain` per
scenario, which is q6 in all five scenes. q10 is therefore authoring-bank only. The
other 22 repaired questions, including every one of the possession contradictions and
every broken position reference, **are in routine practice delivery today**.

---

## 2. The five highest-impact before/after examples

### 2.1 `exp26-u9-004-q8` — a keyed answer that contradicts puck ownership

*Highest severity in the packet: a scored option asserts the opposite of the scene.*

- **Before.** Prompt "What two players help you read the transition?"; keyed options
  **a "Gold1 with the puck"** and b "Navy2 nearer the middle"; explanation "Gold1 is the
  carrier and Navy2 is the nearby defender/support reference."
- **Evidence.** `setup.puck.owner` is `home-skater-1`. **YOU** hold the puck at this
  freeze; the briefing says so ("YOU have just controlled a short pass"). Gold1 is a
  defender at (-17, 5). There is no turnover drawn or stated anywhere in the scenario.
- **After.** "Which two facts about the gold players matter most right now?" keyed on
  "Gold1 is the nearer pressure" and "Gold1 stands in the line to Navy2", with "Gold2 is
  already beaten" as the distractor the explanation names as unproven.
- **Geometry supporting the new key.** Gold1 is 4.072 m from YOU against Gold2's
  12.719 m. From the rendered carried puck at (-19.700, 7.400) the lane to Navy2 passes
  **0.130 m** from Gold1 at t=0.390, while the lane to Navy3 passes 3.602 m from Gold1.

### 2.2 `exp26-u9-003-q7/q8/q9/q10` — a four-question block written for a different scene

*The single largest block of wrong content here.*

- **Before.** q7 asks what to check "If Gold1 reaches the corner first" and offers "The
  old loose-puck plan"; q8 opens "After YOU control the puck" and keys "Navy2 behind
  you"; q9 says "Place YOU between Gold1 and Navy2 after the pickup" with
  `reference {x: 20, y: -6}`; q10's explanation reads "Being nearest helps YOU reach the
  puck, but Gold1 may contest it."
- **Evidence.** `setup.puck.owner` is `home-skater-1`, so YOU already hold the puck.
  There is no loose puck, no race and no pickup. The nearest board is 8.954 m from YOU
  and no actor is anywhere near a corner. Navy2 at (-1, 4) is **5.000 m directly ahead**
  of YOU at (-6, 4) whose facing is 0 toward +x, so "behind you" is false. The q9
  reference is **27.857 m** from YOU at the opposite end of the rink and is not between
  Gold1 (-3.5, 4) and Navy2 (-1, 4) by any reading.
- **After.** q7 asks what changes if Gold1 leaves the Navy2 line to chase the puck; q8
  asks which two players govern the far option (keyed on Navy3 and Gold2, since Gold2 is
  7.616 m from Navy3 against Gold1's 11.102 m); q9 places YOU at (-9, 1); q10 asks what
  to do if both teammates are covered.
- **New q9 geometry.** On the ice by `isCoachRoutePoint`; moves YOU 4.243 m; the carried
  puck moves to (-8.000, 1.700), also on the ice; the puck-to-Gold1 distance rises from
  **1.655 m to 5.054 m**; Navy2 sits 20.6 degrees and Navy3 -26.6 degrees off the facing
  direction, so both are genuinely ahead. It is 4.123 m from q4's example and does a
  different job.

This is the historical **possession-invented** class recorded at `exp26-u7-001-q7`
and `-q8`. Per calibration lesson 2 I checked every sibling once I found the first
instance, and then checked the same q7 to q10 slot in all five scenes, which is how
2.3 and 2.4 below were found.

### 2.3 `exp26-u9-005-q9` — a position reference 19 m away, and an instruction the engine cannot execute

- **Before.** "Place YOU a little toward Navy2 while facing Gold1", `reference {x: 6, y: -2}`.
- **Evidence.** That point is **19.209 m** from YOU at (21, 10), past the blue line at
  x=7.62 and out of the attacking end the briefing describes. Navy2 is at (17, 3). It is
  not "a little toward Navy2" by any measure. Separately, `makeScene` assigns only `x`
  and `y` to a moved actor and leaves `facing` untouched, so **no position response can
  ever satisfy "while facing Gold1"**.
- **After.** The question now moves **Navy2** (`actorId: home-skater-2`) 4.123 m to
  (18, 7) to give the board-side carrier a short clear outlet. The offer shortens from
  7.622 m to 4.206 m and Gold1 stays 2.300 m off that line with its closest approach
  behind the line's start. YOU still own the puck, so the carried puck does not move.
  Retargeting a position question to a teammate follows the calibration precedent at
  U13-001 q9.

### 2.4 The +y orientation defect — confirmed present, 3 questions across 2 scenes

*See section 3.1 for the renderer evidence.*

- **`exp26-u9-002-q9`** — "Place YOU **below** Navy2", explanation "gives Navy2 a
  **lower** option", reference y = -2 against Navy2 at y = 0.
- **`exp26-u9-002-q10`** — explanation "Navy3 already offers a **lower** angle". Navy3
  is at **y = +5, the highest rink y in the scene**, so on the 2D board, where rink +y
  renders toward the top, Navy3 draws *above* everyone. This one is wrong in the 2D
  view outright, not merely camera-dependent, and it uses "lower" for the opposite y-sign
  to q9 in the same scenario.
- **`exp26-u9-007-q9`** — "Place YOU **below** Navy2", reference y = -3 against Navy2 at
  y = -5, i.e. **higher** rink y. So this packet uses "below" with two opposite
  conventions eleven questions apart. Whichever the author intended, one of the two
  contradicts the 2D board.
- **After.** All three now use actor- and landmark-relative wording: "on the side of
  Navy2 away from Gold1", "farther up the ice" (the stated +x attacking direction), and
  "where Navy2 would have a new option away from Gold1". No `above`, `below`, `upper`,
  `lower`, `top`, `bottom` or `higher` remains anywhere in the five replacements,
  verified by regex sweep over every prompt, option and explanation.

### 2.5 `exp26-u9-003-q2` — a scene-basis key that the carry offset makes unfair

*Found only by measuring from the rendered puck, per calibration lesson 3.*

- **Before.** "Which direct line is occupied by Gold1?" keyed **a "YOU to Navy2"**, with
  b "YOU to Navy3" as a distractor. `basis: scene`.
- **Evidence.** Against **actor centres** the key looks clean: Gold1 lies exactly on the
  YOU-to-Navy2 segment (both at y=4) and 2.500 m off the YOU-to-Navy3 segment. Against
  the **rendered carry offset** at (-5.000, 4.700), which is where a pass actually starts,
  Gold1 is **0.431 m** from the Navy2 line at t=0.394 and **0.712 m** from the Navy3 line
  at t=0.119, because Gold1 stands only 1.655 m from the puck itself. The distractor is
  very nearly as true as the key, on an objectively graded item.
- **After.** The question becomes "Where is Gold1 standing in this picture?", keyed on
  "Close to YOU, almost on the line to Navy2", with distractors separated by measurable
  distances (Gold1 to Navy3 is 11.102 m; Gold1 at x=-3.5 is ahead of YOU at x=-6 in a +x
  attack). Its sibling `q6` was repaired in the same pass, because its explanation
  implied the far line was the available one; the 0.712 m figure says otherwise.

---

## 3. Conflicts, uncertainty, and checks not performed

### 3.1 App defect, confirmed by reading the shipped code — NOT fixed here

`ExperimentalPractice.jsx`'s `ExperimentalBoard` draws every actor, the example marker
and the puck at a `translate(x, -y)` transform inside an SVG with
`viewBox="-33 -16 66 32"`, whose y grows downward. **Rink +y therefore renders toward
the TOP of the 2D board.**

`readSequenceVisuals.js` `getReadSceneCamera` builds world points as `[y, height, -x]`
and derives `rightAxis = normalize(cross([0,1,0], backward))` and
`upAxis = cross(backward, rightAxis)`. Recomputing that construction from its own preset
vectors:

| Preset | `backward` | Screen-up | Screen-right | Where rink +y lands |
|---|---|---|---|---|
| broadcast, landscape | `[1, 1.6, .3]` | approx (-0.79, 0.54, -0.24) | approx (0.29, 0, -0.96) | bottom |
| rink-side | `[1, .62, .16]` | approx (-0.51, 0.85, -0.08) | approx (0.16, 0, -0.99) | bottom |
| overhead, landscape | `[.001, 1, 0]` | (-1.000, 0.001, 0) | (0, 0, -1) | bottom (exactly) |
| broadcast / overhead, portrait | `[0, 1.6, 1]` / `[0, 1, .001]` | — | (1, 0, 0) | screen-right |
| behind-net | `[0, 1.45, -1]` | — | (-1, 0, 0) | screen-left |

The world X axis is rink y, so a -X screen-up means rink **+y is at the bottom** in
every landscape 3D preset, while the 2D board puts it at the top. The two renderers
mirror each other. **Any wording using upper / lower / above / below relative to the
rink y-axis is correct in at most one shipped view.** This matches what packet-05
found and I re-derived it independently rather than inheriting the claim.

**This is an application defect and I did not touch the renderer, the scenario engine or
any app source.** The three affected questions were repaired in content only, by naming
actors, landmarks and the stated attacking direction instead of screen directions.
Whether the renderers should be reconciled, and which one is canonical given that
`rinkFrame.js` documents "+y: toward the bottom of the canonical top-down view" while
the 2D board draws the opposite, is an owner decision outside this assignment.

### 3.2 Scene/answer conflicts found (all repaired, none left open)

| Question | Conflict |
|---|---|
| `exp26-u9-004-q8` | keyed option says Gold1 has the puck; `setup.puck.owner` is `home-skater-1` |
| `exp26-u9-005-q8` | keyed option "Gold1's puck"; `setup.puck.owner` is `home-skater-1` |
| `exp26-u9-005-q7` | prompt supposes "Gold1 passes" and "you move back"; neither is in the scene or the schema |
| `exp26-u9-003-q8` | keyed option "Navy2 behind you"; Navy2 is 5.000 m directly ahead of a facing-0 YOU |
| `exp26-u9-007-q8` | `basis: scene` on a post-pass state; the briefing fixes this freeze *before* the pass, and the "wrong" option c is a state YOU never held |
| `exp26-u9-003-q9`, `-004-q9`, `-005-q9`, `-007-q9` | position references 27.857 m, 31.815 m, 19.209 m and 12.207 m from the actor, describing relationships that do not exist |

### 3.3 Rule and system uncertainty

No contact, safety, checking or playing-rule claim is asserted anywhere in these
replacements, and none was needed. `exp26-u9-005`'s briefing already states "This is a
puck-control activity, not a checking drill", and my rewritten `q8` deliberately stops at
"the room narrows" rather than saying anything about a defender arriving into that space.

The USA Hockey 8-and-Under source I read limits Body Contact at that age to "stick on
puck" and "stick lift", and states that no time should be spent on teaching systems
related to team-play in 8-and-Under hockey while still endorsing near- and far-support
concepts. That caution is a real limit on how tactical these five U9 scenes should get,
and I stayed inside it: every rewrite is a cue-reading or availability question, not a
system.

**Jurisdiction:** the 8-and-Under band is a United States category covering players up
to eight and is adjacent to, not identical with, Hockey Canada U9. I have not treated
any USA Hockey statement as a Canadian rule.

### 3.4 Checks NOT performed

- **No rendered view of any scene.** No screenshot, no browser, no device, no
  application run. Camera framing, legibility, marker overlap and which cues are
  actually visible are all **unverified**. The camera table in 3.1 is derived from source
  arithmetic, not from a rendered frame.
- **No independent second review.** My self-check is not independent review. Every
  `replacementReview` is `status: "self-checked"`.
- **No human coach approval, no app testing, no publication, no bank admission.**
- **No git write of any kind** was performed, and `bank-snapshot.json`, the packet files
  and all application source are untouched. Only the two files in section 5 were written.

### 3.5 Systemic patterns I flagged but did NOT repair wholesale

Two bank-wide patterns are visible in this packet. Piecemeal repair would make the bank
*less* consistent, so I repaired them only where I was already repairing the question and
I am reporting them for a separate systematic pass:

1. **The "guaranteed" distractor.** `002-q2` ("A guaranteed completed pass"), `005-q2`
   ("A promise that every route works") and `007-q2` ("A guaranteed shooting chance") all
   use certainty as the obvious wrong option in the same slot. Each is individually
   defensible and each explanation refuses the certainty properly, but the writing
   contract asks not to use it *repeatedly*, and at this rate a child learns the shape of
   the answer rather than the read. I retained all three.
2. **`+x` / `-x` notation in player-facing text.** Every briefing in the bank ends "Navy
   attacks the +x end; gold attacks the -x end", and `004-q1` option b reads "Inside the
   gold goal at the +x end". The authoring contract says coordinate notation should stay
   in the setup. This is a bank-wide convention, so changing it in one packet would
   fragment it. I left it alone and left `004-q1` option b verbatim while repairing only
   its joke distractor.

### 3.6 One judgement call worth Codex's attention

`exp26-u9-003`'s underlying geometry is weaker than its own briefing implies. Gold1
stands **1.655 m from the carried puck**, which puts him within about 0.7 m of *both*
illustrated passing lines near their origins. I repaired this in the feedback (`q2`,
`q6`) rather than by moving Gold1, because a setup change rewrites all ten hashes and I
cannot check the sibling effects against a rendered scene. If you would rather fix the
geometry, moving Gold1 slightly along the puck-to-Navy2 line is the candidate, but note
that doing so degrades `q4`'s example, whose whole value is raising Gold1's clearance
from 0.431 m to 1.850 m. I recommend keeping the setup and taking the feedback repair.

---

## 4. Curriculum bindings and gaps

Bindings against `curriculum-ledger.json` v3.1.0 (locked 2026-06-04). All five scenes are
U9, where the ledger has `scanning`, `reading-the-play`, `decision-making`,
`time-and-space`, `puck-carrier-options` and `off-puck-support-offense` at depth **I**
(introduced), and `puck-control`, `passing`, `receiving` and `battles-and-compete` at
depth **D** (developing).

| Scenario | Primary binding | Secondary | Depth fit |
|---|---|---|---|
| `exp26-u9-002` support-spacing | `u9.off-puck-support-offense` (I) | `u9.time-and-space` (I) | Fits. First exposure to leaving room while staying available; matches USA Hockey's "close to the puck or further away" puck-support definition. |
| `exp26-u9-003` near-far-support | `u9.passing` (D) | `u9.puck-carrier-options` (I), `u9.scanning` (I) | Fits. Comparing a screened near option with a far one is exactly the "creating and finding passing lanes" item. |
| `exp26-u9-004` receive-rescan | `u9.receiving` (D) | `u9.scanning` (I), `u9.reading-the-play` (I) | Fits. The scan-after-reception habit is the cited Hockey Canada article's core. |
| `exp26-u9-005` board-side control | `u9.puck-control` (D) | `u9.puck-protection` (I) | Fits. Note `puck-protection` is only **I** at U9, so the repaired `q8` deliberately stops at "the room narrows" rather than teaching a protection technique. |
| `exp26-u9-007` wall-reception | `u9.receiving` (D) | `u9.scanning` (I), `u9.off-puck-support-offense` (I) | Fits. Reading the pressure side before a wall reception maps directly onto the source's Drill 3. |

**Ranked observations, grounded in this packet's counts. These are teaching-format
gaps, not tactical gaps.**

1. **The q7 to q10 expansion block has no scene-fit gate.** 16 of 20 expansion questions
   in this packet contradict their own scene, and four position references average 22.8 m
   from their actor. Whatever generated that block was not reading `setup.puck.owner` or
   the coordinates. Before any further expansion runs, a mechanical pre-check would catch
   most of it: (a) does any keyed option or explanation name a puck owner other than
   `setup.puck.owner`; (b) is a position `reference` more than, say, 8 m from its actor
   without the prompt saying so; (c) does any text use a rink-y screen word. All three are
   cheap and deterministic. This is a **tooling** gap, and it is the single highest-value
   item in this report.
2. **Reflection ratio is 2 per scenario in the bank, 1 in delivery.** All five scenes carry
   two `explain` questions, and `selectPracticeQuestions` hides the second. That is the
   documented design, but it means q10 receives no player traffic and, visibly here,
   received the least authoring care. Either rotate the two reflections or stop authoring
   a second one; the current arrangement pays for content nobody sees.
3. **`sequence` is used for the same shape three times.** `002-q4`, `004-q3` and `005-q4`
   are all "locate, notice, act" routines. Each carries an honest caveat and I retained
   all three, but across a U9 band the format is not earning its variety credit. A genuine
   ordering task, for example what must be true *before* a pass is released, would.
4. **No genuine tactical gap surfaced in this packet.** These five scenes cover off-puck
   support, near/far passing, receiving and re-scanning, board-side control and wall
   reception, a coherent U9 set. The problem is execution quality, not coverage.

---

## 5. Files, validation, and what comes next

**Files written (only these two):**

- `docs/factory/claude-project/claude-output/review-packet-06.json`
- `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-06.md`

**Structural validation actually run** — `node validation/validate-return.mjs claude-output/review-packet-06.json`
from `docs/factory/claude-project`, against `bank-snapshot.json`:

```json
{
  "errors": [],
  "warnings": [],
  "counts": { "assigned": 50, "reviewed": 50, "remaining": 0, "repairedScenarios": 5 },
  "limits": [
    "Structure and stale-content checks only. Independent hockey review and rendered-scene verification remain required. No files were imported or changed."
  ]
}
```

**Additional checks I ran on the five replacements** (all clean): `validateExperimentalBank`
returned no errors; `questionActorWarnings` produced no warnings, so every `Navy n` and
`Gold n` named in any prompt, option or explanation is a displayed actor;
`positionSubjectIssue` returned null for all five position questions, including the
retargeted `exp26-u9-005-q9` whose prompt names Navy2 and whose `actorId` is
`home-skater-2`; every position `reference` and every resulting carried puck is accepted
by `isCoachRoutePoint`; no duplicate option text and no duplicate prompt within a
scenario; all five scenarios keep at least four question types; and a regex sweep for
`above|below|upper|lower|top|bottom|higher` over every prompt, option and explanation
returns nothing.

**What this validation does not establish:** hockey truth, tactical correctness, age
suitability in practice, visual clarity, learning value, or readiness for the approved
bank. Those still require your independent Luna review of the exact replacement hashes,
a rendered check of all five scenes, and a qualified human coach.

**Source reads** (three, all `access: "read"`, full scope in the JSON):

| URL | How |
|---|---|
| Hockey Canada, 7 Principles: Vision and Scanning | plain fetch returned **HTTP 403**; retried with an explicit browser User-Agent, HTTP 200, read in full |
| Hockey Canada, 7 Principles: Puck Control | plain fetch returned **HTTP 403**; retried with an explicit browser User-Agent, HTTP 200, read in full |
| USA Hockey, Skill Progressions 2019, PDF pp. 12-14 | downloaded with a browser User-Agent, HTTP 200, pages read directly |

Both Hockey Canada pages 403 on a default fetch. Anyone repeating these reads should
send a browser User-Agent before recording `unavailable`.

**Next packet:** `packet-07`. Given what the q7 to q10 slot did here, I would run the
three mechanical pre-checks in section 4.1 across every remaining packet before reviewing
them one at a time. It will tell you immediately how far this defect class spreads beyond
these five scenes.
