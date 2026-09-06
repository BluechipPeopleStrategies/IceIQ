# Report back to Codex — packet-03

**Snapshot:** `rr-20260905-c8403be16748c919`
**Packet:** `packet-03`
**Prepared by:** Claude Code (Opus 5), September 5, 2026.
**Status of this return:** `draft-not-reviewed`. JSON structural validation was run and passed.
No independent AI review, no rendered-scene check, no application testing and no human coach
approval is claimed by anything in this file.

Calibration feedback (`calibration-adjudication.md`, lessons 1-10) was applied as active working
rules throughout. Where a lesson changed what I did, it is named inline.

---

## 1. Counts

| Item | Count |
|---|---|
| Scenarios assigned | 5 |
| Questions assigned | 46 |
| Questions reviewed | 46 |
| Retained | 33 |
| Repair proposed | 13 |
| Blocked | 0 |
| Unreviewed | 0 |
| Scenarios with a proposed replacement | 3 (`exp26-u7-007`, `exp26-u7-009`, `exp26-u7-010`) |
| Scenarios retained whole | 2 (`exp26-u7-008`, `exp26b-u7-001`) |
| `completion` | `complete` |

Per scenario:

| Scenario | Age | Questions | Retain | Repair | Replacement |
|---|---|---|---|---|---|
| `exp26-u7-007` My turn to defend the goal | U7 | 10 | 5 | 5 | v1 -> v2 |
| `exp26-u7-008` A teammate behind your shoulder | U7 | 10 | 10 | 0 | none |
| `exp26-u7-009` My partner has it now | U7 | 10 | 6 | 4 | v1 -> v2 |
| `exp26-u7-010` A mistake and another try | U7 | 10 | 6 | 4 | v1 -> v2 |
| `exp26b-u7-001` Find the loose puck and a friend | U7 | 6 | 6 | 0 | none |

**Every proposed change is question-level.** No scenario `briefing`, `setup`, `cues`, `tags`,
`sources`, `limits`, `objective`, `family`, `topic`, `title` or `focusActorId` is touched, verified
by a byte-comparison of every non-question field. `version` increments exactly once per replaced
scenario. Every question ID is preserved. Because `questionContentHash` excludes `version` and
hashes the scene minus questions, `affectedQuestionIds` is therefore exactly the set of questions
whose text changed, and unchanged siblings keep their existing hashes:

- `exp26-u7-007`: q5, q7, q8, q9, q10 (5 of 10 hashes change)
- `exp26-u7-009`: q7, q8, q9, q10 (4 of 10)
- `exp26-u7-010`: q7, q8, q9, q10 (4 of 10)

Total: 13 question hashes change, 0 scenario setups change.

---

## 2. The five highest-impact before/after examples

### 2.1 `exp26-u7-009-q8` — a false landmark, scored as an objective scene fact

The single worst item in the packet, because `basis: scene` makes the engine grade it as a correct
read of the picture.

- **Before:** "What two players matter near the meeting line?" Explanation: "Navy2 is the teammate
  **beyond the line** and Gold1 is nearby pressure."
- **Geometry:** the right blue line is at `x = 7.62`. Navy2 is at `x = 5`. Navy2 is **2.62 m short of
  the line**, on the same side of it as YOU at `x = -3`. The claim is false. "The meeting line" is
  also never defined anywhere in the briefing, cues or setup.
- **After:** "Which two things should YOU watch now that Navy2 has the puck?" — options *Where
  Navy2 is on the ice* / *Where Gold1 is coming from* / *Where the puck was before the pass*, keyed
  `[a,b]`, moved to `basis: coaching`. The keyed pair is exactly the two information sources Hockey
  Canada's Vision & Scanning principle names. The third option is an outdated cue, which is the
  distractor type calibration lesson 6 asked for.
- **Why it matters:** this is the same failure class already on the historical record — "a skater
  described as on a blue line when the coordinates placed them inside the zone." It recurred here
  and no earlier review caught it; all 46 questions in this packet carry `historicalStatus:
  no-open-ai-finding`.

### 2.2 `exp26-u7-007-q7` to `q10` — an entire four-question block written for a different scene

- **Before:** q7 "If Gold1 enters **your support lane**, what should you do?"; q8 keys
  "**Navy2's puck**"; q9 "Place YOU **below the carrier** with space between you" -> `(-5,-2)`;
  q10 "Why should teammates avoid sharing one small space?"
- **Scene:** Gold1 (`away-skater-1`) owns the puck. Navy2 carries nothing and is 10.276 m from it.
  YOU are taking a goal-defending turn at `(-25.5, 0)`, 1.63 m in front of the navy goal line at
  `x = -27.13`.
- **Geometry on q9:** the reference moves YOU **20.597 m** off the goal you were assigned, out past
  the blue line at `x = -7.62`. It sits 13.038 m from the only carrier (Gold1), and its `y = -2` is
  *above* Gold1's `y = -3`, so "below the carrier" is false in either reading. The explanation says
  the move "gives Navy2 separation" — Navy2 is 15.811 m away from it. Every spatial claim attached
  to that reference is false.
- **After:** all four rewritten to this scene — where to look on the turn, which cues say where the
  play is, one example spot in front of the navy net (`(-25, -0.85)`, 0.986 m move, 2.13 m in front
  of the goal line, 0.01 m off the straight line from the carried puck at `(-19.203, -3.205)` to
  the net front), and why the rotation is shared.

### 2.3 `exp26-u7-010-q8` — a keyed scene fact that contradicts the setup

- **Before:** `basis: scene`, keyed `[a,b]` = "The puck is loose" + "Gold1 is above it."
- **Scene:** `setup.puck.owner = "away-skater-1"`. The briefing says Gold1 gained the puck. This
  scenario's own q1 keys Gold1 as the owner. **Nothing is loose.** The second keyed option is also
  not a usable cue: the puck is carried, so the renderer places it from Gold1's own position and
  facing at `(3.797, -2.205)`, 0.206 m below Gold1 in `y` — and moving Gold1 moves it.
- **After:** "Which two things are true in this picture?" — *Gold1 is the puck owner* /
  *The pass to Navy2 did not finish* / *YOU are the navy player closest to the puck*, keyed `[a,b]`,
  `basis: scene` retained because every claim is now checkable. The distractor is verifiably false
  and rewards actually reading the scene: Navy2 is 7.426 m from the carried puck, YOU are 9.965 m.
- This repeats and repairs the historical **possession-invented** class recorded for
  `exp26-u7-001-q7` / `-q8`.

### 2.4 `exp26-u7-009-q9` — the prompt and its own reference contradict each other

- **Before:** "Place YOU **closer to Navy2** while keeping Gold1 below you." -> reference `(-4,-4)`.
- **Measured:** distance to Navy2 goes from **8.000 m to 10.817 m** — 2.817 m *farther*. The second
  clause is empty: Gold1 at `y = -5` was already below YOU at `y = 2` before any move.
- **After:** "Place YOU in open space where Navy2 could pass to YOU, away from Gold1." -> `(0, 5)`.
  On the ice, 4.243 m move, distance to Navy2 falls to 5.831 m, the point is on the opposite side of
  centre from Gold1 (`y = +5` vs `y = -5`), and Gold1 sits 8.043 m from the nearest point of the
  puck-to-reference lane. Framed as one example receiving offer, following the calibration decision
  on `U11-002 q9` — not a mandatory route or distance (lesson 4).

### 2.5 `exp26-u7-010-q7` — team-play system language at U7, and a defensible alternative marked wrong

- **Before:** "If Gold1 controls **the loose puck**, what should **navy players** do first?" Keyed
  answer: "Read Gold1 and **protect the navy end**." Distractor c: "Check who owns it now."
- **Four defects:** (i) the loose-puck premise contradicts the scene; (ii) the YOU focus is dropped
  for "navy players"; (iii) "protect the navy end" is team-play system language — USA Hockey's
  *Skill Progressions for Youth Hockey* (PDF p.14) states plainly that **no time should be spent
  teaching systems related to team play at 8-and-Under**, and the locked curriculum ledger v3.1.0 has
  **no defensive-play node at U7** (`defensive-side-positioning` starts at U9, `coverage-reads` at
  U11); (iv) distractor c restates the keyed explanation's own reasoning ("read the new carrier")
  while being marked wrong, which the answer contract forbids.
- **After:** "Gold1 has the puck now. What is a good first thing for YOU to do?" — *Notice who has
  the puck and where Navy2 is* / *Wait for the coach to tell YOU what happened* / *Skate to where
  the pass was going*. Both distractors are credible (passivity, and an outdated plan).

---

## 3. Scene/answer conflicts, rule and system uncertainty, and checks not performed

### Scene/answer conflicts found (all repaired)

| ID | Conflict |
|---|---|
| `exp26-u7-007-q7` | Assumes YOU support a navy carrier; Gold1 owns the puck and YOU are the goal-defender. |
| `exp26-u7-007-q8` | Keys "Navy2's puck"; Navy2 does not own the puck. |
| `exp26-u7-007-q9` | Reference is 20.597 m off the assigned goal; "below the carrier" and "gives Navy2 separation" are both false. |
| `exp26-u7-007-q10` | Presumes crowding; YOU and Navy2 are 9.579 m apart. |
| `exp26-u7-009-q7` | Option "Leave the puck behind" presumes YOU hold a puck Navy2 owns. |
| `exp26-u7-009-q8` | "Navy2 is beyond the line" is false by 2.62 m, asserted on `basis: scene`. |
| `exp26-u7-009-q9` | Prompt says closer; reference is 2.817 m farther. |
| `exp26-u7-009-q10` | Presupposes a blue-line guide the scene never establishes. |
| `exp26-u7-010-q7` | "Loose puck" premise contradicts `puck.owner`. |
| `exp26-u7-010-q8` | Keys "The puck is loose" on `basis: scene`, contradicting the setup and its own q1. |
| `exp26-u7-010-q9` | "Beside the puck" is 4.391 m away; "Navy2 below you" is false (Navy2 `y=5`, ref `y=0`); explanation calls an owned puck loose. |
| `exp26-u7-010-q10` | Explanation says "read the new loose puck"; prompt is sound and was kept byte-for-byte. |

### The lowest-confidence proposal — please adjudicate on its own

`exp26-u7-007-q5` is the only item I flag where the counter-argument is genuinely strong. The prompt
supplies a changed condition ("Imagine Navy2 gains control") but the question is `basis: scene`,
which `reviewResponse()` grades objectively as "You read the scene." The answer contract assigns
changed conditions to coaching basis, and 24 of the 26 `Imagine` prompts in this snapshot already
use coaching. **But** the hypothetical is explicitly stated in the prompt and has exactly one logical
answer, so treating it as an explicitly stated fact is defensible. Only `basis` changes; the prompt,
options, key and explanation are byte-identical. **Decline this one alone without affecting the
other twelve repairs if you disagree.**

Applying calibration lesson 2 outward: `exp26-u7-002-q5` is the **only other** scene-basis `Imagine`
prompt in the whole 1,600-question snapshot. It sits in packet-02, outside my scope, and I did not
touch it. Whatever you decide for `exp26-u7-007-q5` should be applied to it too.

### Superseded historical findings, verified closed (calibration lesson 1)

Two P1 findings in `expansion/youth-first.json` touch this packet. Both are **already superseded**
by `youth-repairs.json`, and I verified every `afterContentHash` in that receipt matches the current
snapshot hash before treating them as closed:

1. `youth-u7-008-missing-navy3` — resolved, but **not** by the recommended fix. The recommendation
   was to add a Navy3 actor to the setup; what was actually applied was a rewrite of q7-q10 to use
   the visible Navy2. I re-reviewed all four independently and retained all four.
2. `youth-u7-001-board-geometry` and `youth-u7-001-loose-protection` — resolved.
   `exp26b-u7-001`'s briefing now correctly says the puck is in **open ice** with Gold1 approaching
   from the board side, which matches the coordinates (puck `y = -3` in the middle band, Gold1 at
   `y = -8`, side boards at `y = +/-12.954`). q5 now uses an explicit ownership hypothetical. Retained.

**A pattern worth your attention:** the `youth-repairs.json` receipt repaired the q7-q10 extension
blocks of `exp26-u7-002`, `-004`, `-005`, `-008`, `exp26-u9-010`, `-011`, `-013`, `-014`. It did
**not** touch `exp26-u7-007`, `-009` or `-010`. Those three are the un-repaired remainder of the
same defect family, and all three turned out to be broken in the same way. Calibration lesson 2 says
check every linked sibling for the same class of issue once you find one; extended to scenario
siblings, that is exactly what surfaced these. **I recommend sweeping every other scenario with a
q7-q10 extension block that the receipt did not cover**, in whichever packets they fall.

### Rule, system and jurisdiction uncertainty

- **No contact, safety or playing-rule claim is made anywhere in the replacements** (calibration
  lesson: never invent contact/safety/rule claims without a verified source). No goalie contact, no
  crease-entry rule, no checking, no goaltending technique. `exp26-u7-007-q9`'s explanation
  explicitly says "This is an activity suggestion, not goaltending technique."
- **Crease vocabulary, `exp26-u7-007-q2` (retained, with a format note).** Hockey Canada's U7 FAQ
  says a crease need not be drawn for U7 games and that nets sit just inside the faceoff circle. The
  question survives because the briefing scopes it as the coach *naming* an area on a full-rink
  orientation map, and the explanation already says "This identifies an area, not a crease-entry
  rule." Recorded as a format note in the source check rather than a defect.
- **Canadian vs US.** USA Hockey 8-and-Under is used only for developmental principles (no team
  systems at this age, puck pursuit, puck support, no full-time goaltenders). It sets no Canadian
  playing rule, and the source check records that limit.
- **No use of *Hockey Tactics 2026* or any paid material.** No paywalled page was accessed, no
  diagram or template reproduced, no book content reconstructed. All geometry, wording and
  explanations here are original.

### Checks I did not perform

- **No rendered-scene or application verification of any kind.** I read JSON and repository source
  and computed geometry offline. I did not open the app, take a screenshot, or view a rendered
  scene. Camera framing, on-screen legibility, stick appearance and which cues a child can actually
  see remain **unverified** for all 46 questions.
- One replacement depends on a legibility assumption I want named: `exp26-u7-010-q8`'s distractor
  "YOU are the navy player closest to the puck" is false by 7.426 m vs 9.965 m, a ~25% difference.
  Whether that is distinguishable on the rendered SVG board is not something I can check. It is
  mitigated by `ExperimentalPractice.jsx` also rendering a "Player locations and facing" list with
  exact metres, but please confirm it against an actual render.
- No independent second AI review. My self-check is recorded as `replacementReview.status:
  "self-checked"` for all three replacements and is explicitly not an independent review.
- No human coach approval, no app testing, no publication, and nothing here enters the approved bank.

### One verified non-issue, recorded so it is not re-raised

The `exp26-*` scenes label their actors `H2` / `A1` while every question says `Navy2` / `Gold1`.
I checked this against the renderer rather than assuming: `src/visuals/actorLabel.js`
`compactActorLabel()` maps `/^[HA]\d+$/` to the bare digit and `actorDisplayName()` renders it as
`Navy 2` / `Gold 1` — identical to what `exp26b-u7-001`'s literal `Navy2` / `Gold1` labels produce.
The validator's own `questionActorWarnings()` normalizes whitespace and matches. **This is not a
defect and produced zero warnings.** (Recorded per the lesson on false review flags.)

---

## 4. Curriculum bindings and ranked gaps

Bindings are against `curriculum-ledger.json` v3.1.0 (locked 2026-06-04). Only 12 concepts are
introduced at U7, all at depth `I`. Format, teaching concept and tactical situation are kept
separate below.

### Proposed bindings — the five packet-03 scenarios

| Scenario | Teaching concept (ledger node, U7 depth) | Tactical situation | Formats present |
|---|---|---|---|
| `exp26-u7-007` | `u7.reading-the-play` (I), `u7.scanning` (I) | Goal-defending turn; opponent holds the puck at your end | choice, sequence, multi, explain, position |
| `exp26-u7-008` | `u7.scanning` (I), `u7.decision-making` (I) | Carrier with a teammate behind the facing direction and pressure ahead | choice, multi, sequence, position, explain |
| `exp26-u7-009` | `u7.passing` (I), `u7.time-and-space` (I) | Immediately after a completed partner pass; role change off the puck | choice, sequence, position, explain, multi |
| `exp26-u7-010` | `u7.battles-and-compete` (I), `u7.reading-the-play` (I) | Change of possession after a teammate's miss; resilience and conduct | choice, multi, sequence, position, explain |
| `exp26b-u7-001` | `u7.puck-control` (I), `u7.scanning` (I), `u7.decision-making` (I) | Loose-puck approach with pressure from the board side | choice, multi, position, sequence, explain |

Note on the supplied keyword map: `curriculum-coverage.json` gives `exp26-u7-007` a
**`defensive-play`** domain signal from the token "defend". The ledger has **no defensive-play
node at U7 at all**. The coverage file already says its signals are planning aids, not approved
bindings — this is a concrete instance of why. The real binding is `hockey-sense`.

### A framework conflict I am surfacing rather than reconciling

The RinkReads ledger introduces **`off-puck-support-offense` at U9** (`-` at U7). USA Hockey's
8-and-Under curriculum (PDF p.14) explicitly names **Puck Support — "make themselves available for a
pass... the beginning of the idea of getting open"** as a topic for this exact age band.

This is a genuine contradiction between an adopted primary source and the locked internal ledger,
and it affects **already-retained, pre-existing content**, not anything I wrote: `exp26-u7-009-q5`,
`exp26b-u7-001-q6`, and the whole `exp26-u7-008` pass-back block all teach "get open for a pass" at
U7 today. I have bound those to `u7.time-and-space` and `u7.decision-making` (both `I` at U7) and
noted `off-puck-support-offense` as a secondary binding, rather than unilaterally rewriting six
scenarios or quietly re-dating the ledger. **This is Thomas's call, not mine.**

The line I *was* confident enough to act on, and did: USA Hockey draws a clear distinction between
**"getting open for a pass"** (explicitly a U7/8U topic) and **"systems related to team play"**
(explicitly *not* a U7/8U topic). My repairs remove the latter — "support lane", "protect the
navy end" — and keep the former.

### Ranked gaps, from actual counts

These are evidence-grounded planning signals for the new-content stage, not a claim that any gap is
approved for authoring.

1. **`u7.receiving` (I) has no scenario in this packet that shows the moment before a puck
   arrives.** `exp26-u7-009` begins deliberately *after* reception and says so. Receiving is a U7
   `I` concept in the ledger and appears in both the Hockey Canada U7 matrix and USA Hockey 8U
   individual skills. This is a genuine **tactical-situation** gap, not a format gap.
2. **`u7.creativity-under-pressure` (I) is unrepresented across all five scenarios.** No scenario
   asks a U7 for a second option when the first is taken away. The static schema can support this
   with an explicit hypothetical, as `exp26-u7-008-q7` already demonstrates.
3. **`u7.shooting` (I) and `u7.edges-balance` / `u7.agility-mobility` (I) are unrepresented.**
   Shooting is plausibly authorable in this renderer; the two skating concepts are probably **not**
   — a static frame with no motion cannot teach edges or agility. That is a **renderer capability**
   limit, and per the project instruction it belongs in a separate request to you rather than a
   content repair.
4. **Format, separately from concept:** across the five scenarios the mix is healthy (every
   scenario carries 5 of the 5 formats, and each 10-question authoring scene carries 2 optional
   reflections with the 6-question scene carrying 1). I see **no format gap here** — the ratio
   matches the documented 200-in-1,500 delivery model with extra reflections retained for
   authoring. I did not delete or move any reflection.
5. **A `defensive-play` gap at U7 is a false signal, and I recommend not filling it.** The keyword
   map suggests one; the ledger deliberately introduces no defensive-play concept until U9, and both
   primary sources agree that team defensive concepts are a later-age topic. Filling it would
   reintroduce exactly the defect I repaired in `exp26-u7-010-q7`.

---

## 5. Files, validation run, and what is next

### Files returned

| File | Contents |
|---|---|
| `docs/factory/claude-project/claude-output/review-packet-03.json` | 46 coverage rows, 3 scenario replacements, 5 source checks, empty `remainingQuestionIds` |
| `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-03.md` | this report |

Nothing else was written or modified. `bank-snapshot.json`, the packets, the application source and
the live scenario engine are untouched. No git operation of any kind was run.

### Structural validation actually run

    node validation/validate-return.mjs claude-output/review-packet-03.json
    {
      "errors": [],
      "warnings": [],
      "counts": { "assigned": 46, "reviewed": 46, "remaining": 0, "repairedScenarios": 3 },
      "limits": [ "Structure and stale-content checks only. Independent hockey review and
                   rendered-scene verification remain required. No files were imported or changed." ]
    }
    exit 0

Run from `docs/factory/claude-project/` on 2026-09-05. Zero errors, zero warnings.
As the validator's own `limits` line says, this proves structure and baseline freshness only.
It does not establish hockey truth.

### Additional checks I ran beyond the validator

- Re-verified every `baseScenarioHash` and all 46 `baseContentHash` values in the packet manifest
  against `bank-snapshot.json` independently — all 46 match.
- Confirmed each of the five packet scenarios is byte-identical between `packet-03.json` and
  `bank-snapshot.json`.
- Ran `validateExperimentalBank()` directly on each of the three replacements: `[]` for all three.
- Byte-compared every non-question field of each replacement against its original: identical.
- Verified `makeScene()` carried-puck position is on the ice for each replacement, and for each
  position question's moved scene.
- Checked every new prompt for duplication against all 1,600 prompts in the snapshot: no collisions.
- Verified in-scenario prompt uniqueness and at least four question types for each replacement.

### Source reads

Five sources fetched and read on 2026-09-05, all with an explicit browser User-Agent, all HTTP 200:

| URL | Access |
|---|---|
| hockeycanada.ca U7 FAQ | read |
| hockeycanada.ca U7 skills matrix | read |
| hockeycanada.ca 7 Principles: Vision & Scanning | read |
| hockeycanada.ca 7 Principles: Puck Control | read |
| USA Hockey Skill Progressions manual (PDF, pages 12-14 extracted) | read |

Zero `unavailable`. Confirming packet-02's correction: the earlier 403 report against
hockeycanada.ca was a bot-detection artefact of a bare request, not the pages being inaccessible.
What each source does and does not support is recorded per-source in `sourceChecks`.

### Next packet

**`packet-04`.** Continue from the original project snapshot; packet-03's five scenarios are now
reviewed and should not be reopened except to adjudicate the three replacements above. The other
192 scenarios remain unchanged.

Two things to carry forward:

1. **Sweep the remaining q7-q10 extension blocks** that `youth-repairs.json` did not cover. Three of
   three unswept scenarios in this packet were defective, and the failures were not subtle.
2. **Re-check every `basis: scene` question whose prompt supplies a hypothetical or a changed
   condition.** In this snapshot that is a set of two, and one of them is in packet-02.

### Standing limits on this return

These 13 proposals are candidates. They have had one review by me plus a recorded self-check of the
exact final content. They have not had an independent second review, a rendered-scene check, or a
qualified human coach's approval — three separate events that this return converts into none of the
others. Preserve the original packet hashes and the earlier flags alongside whatever you accept.
