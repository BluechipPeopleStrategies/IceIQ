# Report back to Codex — packet-08

**Snapshot:** `rr-20260905-c8403be16748c919`
**Packet:** `packet-08`
**Reviewed by:** Claude (Claude Code, local repository access), 2026-09-05
**Return file:** `claude-output/review-packet-08.json`
**Status of this work:** one full self-review per question. This is **not** an independent
second review, **not** a rendered-scene check, and **not** human coach approval. Nothing
here enters the approved bank, awards mastery, or is published.

---

## 1. Counts

| | |
|---|---|
| Scenarios assigned | 5 (`exp26-u9-013`, `exp26-u9-014`, `exp26-u9-015`, `exp26b-u9-001`, `exp26b-u9-002`) |
| Questions assigned | 42 |
| Questions reviewed | 42 |
| Completion | `complete` |
| Retain | 26 |
| Repair | 16 |
| Blocked | 0 |
| Unreviewed | 0 |
| Scenario replacements proposed | 5 (every scene in the packet) |
| Question hashes affected by those replacements | 30 |

Per scenario:

| Scenario | v | Questions | Retain | Repair | Replacement version | Affected hashes |
|---|---|---|---|---|---|---|
| `exp26-u9-013` | 1 | 10 | 5 | 5 | 2 | 5 (question-only) |
| `exp26-u9-014` | 2 | 10 | 8 | 2 | 3 | 10 (setup + metadata) |
| `exp26-u9-015` | 1 | 10 | 7 | 3 | 2 | 3 (question-only) |
| `exp26b-u9-001` | 1 | 6 | 3 | 3 | 2 | 6 (setup + metadata) |
| `exp26b-u9-002` | 1 | 6 | 3 | 3 | 2 | 6 (metadata only) |

Failed sub-checks across the 42 rows: `feedback` 12, `answer` 10, `geometry` 5,
`age` 1, `grammar` 1. `roster` and `sources` passed everywhere — see 4.2 for why
roster passed despite the label/prose difference that looks like a mismatch.

Structural validation actually run:

```
node validation/validate-return.mjs claude-output/review-packet-08.json
{ "errors": [], "warnings": [],
  "counts": { "assigned": 42, "reviewed": 42, "remaining": 0, "repairedScenarios": 5 } }
```

I also ran `validateExperimentalBank`, `positionSubjectIssue` and
`questionActorWarnings` against each of the five replacement scenarios directly:
zero errors and zero warnings on all five, all carried pucks on the ice, and every
replacement retains at least four question types (013 has four; the other four have five).

---

## 2. Repair-receipt coverage check

Searched `docs/factory/research/question-review/repairs/` and `.../followup/` for each
scene:

| Scene | Real repair receipt? | Result |
|---|---|---|
| `exp26-u9-013` | Yes — `youth-repairs.json`, then `youth-branch-clarity.json` | 5 of 10 questions still needed repair, but **not** the three the receipts touched (q7, q8, q9 receipts held up; the current q9 defect is a *new* collision the second receipt created) |
| `exp26-u9-014` | Yes — `youth-repairs.json` (q6 only) | The receipt is fine; the scene underneath it is not — see 3.2 |
| `exp26-u9-015` | **No** — only `expansion/youth-first.json`'s zero-finding pass | 3 of 10 defective, both in the q7-q10 block |
| `exp26b-u9-001` | **No** — only `expansion/youth-first.json`, plus a blueprint entry in `followup/expansion-blueprint.json` (not a repair) | 3 of 6 defective, plus a scene-level landmark error |
| `exp26b-u9-002` | **No** — same | 3 of 6 defective, plus a scene-level orientation error in the briefing and cues |

The prior holds again, though less extremely than in packets 06 and 07: the three
"passed the expansion review, no repair receipt" scenes produced 9 of the 16 question
repairs and **both** of the scene-level (setup or briefing) defects.
`expansion/youth-first.json` records `status: "pass"`, `highRisk: false`,
`findingIds: []` for every one of those 22 questions.

The two scenes that *did* have receipts were not clean either, but their defects were
different in kind: `exp26-u9-013`'s were writing-quality (joke distractors), and
`exp26-u9-014`'s was a geometry-versus-premise mismatch that no earlier reviewer measured.

---

## 3. Five highest-impact before/after examples

### 3.1 `exp26-u9-015-q8` — a scored, scene-basis option that is false on the board

**Before** (`basis: scene`, keyed `a`,`b`):

> Which two players shape the new support read?
> a. Navy2 with the puck · b. **Navy3 below** · c. Gold1 as a navy teammate
> *"Navy2 is the carrier and Navy3 is the visible lower teammate."*

**After:**

> Which two navy players shape the new support read?
> a. Navy2, who has the puck · b. **Navy3, waiting near the side boards** · c. Gold1, the gold player on the old return line
> *"Navy2 has the puck and Navy3 waits near the side boards, so those are YOUR two navy reference points. Gold1 changes the picture too, but as an opponent Gold1 is not a support option."*

**Why.** Navy3 is at `(24,10)` — the **largest** y of any actor in the scene.
`ExperimentalPractice.jsx` line 37 draws actors at `translate(a.x, -a.y)` in an SVG whose
y grows downward, so Navy3 renders at the **top** of the overhead board. "Below" is
therefore wrong on the 2D board, and it is not merely wrong-in-one-view: `getReadSceneCamera`
puts +y at the **bottom** in landscape, **screen-right** in portrait and **screen-left**
behind-net. The scene's own briefing and cues already describe Navy3 correctly as
"closer to the boards" — Navy3 is 2.59 m from the rounded boards — so the question
contradicted its own scene. Option c was a second, separate problem: it mislabels Gold1 as
a navy teammate, so a learner who correctly notices that Gold1 shapes the read is steered
into a wrong-looking option for the wrong reason (calibration lesson 6).

### 3.2 `exp26-u9-014` setup — the picture does not contain the problem it teaches

**Before:** `home-skater-1` (YOU) at `(19,3)`, facing `0.3`. Briefing: "YOU are a navy
attacker asked to back away." Two position questions ask the learner to create separation.

**After:** `home-skater-1` at `(21,2)`, facing `-0.4`. The briefing now states the actual
rule and the actual starting distance; a new cue records it; the limits attribute the figure.

**Why.** Hockey Canada's U9 page (read 2026-09-05) says: *"Goaltender freezes the puck -
the official blows the whistle to indicate the attacking team backs off three metres and the
defending team gets possession."* Gold1 faces pi with the puck, so `makeScene` renders the
restart puck at `(22,0.3)`. YOU at `(19,3)` were already **4.04 m** from it and **4.47 m**
from Gold1 — that is, already outside the three-metre cushion before the learner does
anything. Both position questions were asking a child to solve a spacing problem the drawing
had already solved. The new start is **1.97 m** from the puck and **2.24 m** from Gold1, and
q4's reference moves from `(16,4)` to `(18,3)` — a 3.16 m retreat ending 4.83 m from the puck.

Note the direction of this finding: I went in expecting q6's unsourced-looking "three metres"
to be the defect. **It is source-verified and retained.** The defect was that the geometry
disagreed with it.

### 3.3 `exp26b-u9-001` setup — a "corner" scene whose carrier is beside the net

**Before:** YOU `(22,-8)`, Navy2 `(25,-3)`, Gold1 `(24,-5)`. Title "Move off the corner
line", family `corner-support`, briefing "Navy2 controls the puck in the attacking corner."

**After:** YOU `(19.5,-10.5)` facing `0.4`, Navy2 `(25.6,-7.8)` facing `2.5`,
Gold1 `(21.9,-9.1)` facing `0.5`. Title, family, objective, tags, sources and all six
question IDs preserved.

**Why.** Navy2 at `(25,-3)` is **4.80 m** from the corner anchor `(25.6,-7.77)` and only
**3.10 m** from the net-front anchor `(25.76,0)` — beside the net, not in the corner. This
is the owner's flagship failure class, the same shape as the rim scene described as a rim
retrieval with the puck in open ice. I repaired the *picture* rather than renaming the scene,
following that precedent. Navy2 now sits **0.03 m** from the corner anchor and 1.53 m inside
the goal line. Verified against the **rendered** carried puck at `(24.380,-7.762)`, not actor
centres: Gold1 is **0.047 m** off the segment from YOU to that puck with the closest point at
t = 0.50, so "almost exactly on the straight line" is exact, and no blocked-pass claim is
needed. Board clearances: YOU 2.45 m, Navy2 3.56 m, Gold1 3.85 m.

A second, coupled problem forced the named-landmark change: YOU began **1.84 m** from the
`(20.7,-6.7)` faceoff dot, that is, already well **inside** a circle of radius 4.572, so
"Place YOU near the circle" (q3) asked for a move to where the learner already stood, and
"Gold1 follows you toward the circle" (q5) described travel from a place they had not left.
That circle covers almost the whole low support region at this end and cannot be moved, so
the named search area becomes **the open ice in front of the gold net**, which is drawn and
camera-independent. q3's reference becomes `(22,-3)`: 4.81 m from the net front, with Gold1
**2.82 m** off the new 5.32 m lane against 0.047 m off the old one.

### 3.4 `exp26-u9-013-q9` — one sibling answers another

**Before** (`basis: coaching`, keyed `a`):

> This picture does not show the waiting area. How should YOU find the exit route for your real game?
> a. **Use the route the coach explained; ask if unclear** · b. Head for whichever boards look closest · c. Follow Gold1's puck route

**After** (`basis: scene`, keyed `a`):

> The picture does not show the bench or the waiting area. What does it show right now?
> a. **Where Navy2 and Gold1 stand at this instant** · b. The exact route to the waiting area · c. How much time is left in this shift
> *"The illustration gives player positions at this instant and nothing else. It has no bench, no route and no clock, so ask your coach for the real change route."*

**Why.** q8's keyed answer already includes "Leave using the route the coach explained", so
q8 answers q9 — the leak the answer contract forbids. Option c also referenced "Gold1's puck
route", but Gold1 does not own the puck in this freeze and has no route. The original teaching
point (do not invent an exit from a picture) survives verbatim in the replacement's feedback,
and the scene gains a third scene-basis item. Both q7 and q8, which *were* products of the
`youth-repairs.json` / `youth-branch-clarity.json` receipts, are retained unchanged — the
collision is something the second receipt introduced, not something it failed to fix.

### 3.5 `exp26b-u9-002-q5` — the prompt gives away its own key

**Before:**

> Gold1 closes Navy2. Should YOU **always** move far away?
> a. **No; choose a clear nearby outlet if it helps** · b. Yes; the farthest spot is **always** best · c. No; stop supporting

**After:**

> Gold1 closes on Navy2. What is the most useful thing YOU can do?
> a. **Offer a clear short outlet Navy2 can reach** · b. Skate as far from Navy2 as YOU can · c. Hold your spot and let Navy2 solve it alone

**Why.** The absolute in the prompt is echoed in option b, so the key is legible before any
hockey is considered, and option c ("stop supporting") is an action no player takes, leaving
the item effectively single-option. All three replacements are behaviours U9 players really
show. The teaching is directly supported by USA Hockey's 8-and-Under team concepts (read
2026-09-05): *"Players should learn to make themselves available for a pass whether they are
close to the puck or further away. This is the beginning of near- and far-support concepts."*
The key stays "a clear short outlet" rather than "the closest spot", so stretching wide
remains defensible.

---

## 4. Scene/answer conflicts, rule and system uncertainty, checks not performed

### 4.1 The +y cross-view orientation defect — confirmed again, in 3 of 5 scenes

I re-derived this from source rather than assuming it.

- `src/one-on-one/ExperimentalPractice.jsx` line 37 renders every actor at
  `transform="translate(a.x, -a.y)"`, and the puck at `cy={-scene.puck.y}`, inside an SVG
  `viewBox="-33 -16 66 32"` whose y grows downward. **+y draws at the top of the 2D board.**
- `src/one-on-one/readSequenceVisuals.js` `getReadSceneCamera` maps canonical `[x,y]` to
  world `[y, height, -x]`, so **world x is rink y**. Screen-up is
  `cross(backward, rightAxis)`:
  - landscape broadcast, `backward = [1,1.6,.3]` gives up `[-1.6, 1.09, -0.48]`, world-x
    component **negative**, so **+y is at the bottom**;
  - landscape overhead, `backward = [.001,1,0]` gives up `[-1, .001, 0]`, **+y at the bottom**;
  - rink-side, `backward = [1,.62,.16]` gives up `[-0.62, 1.03, -0.10]`, **+y at the bottom**;
  - portrait, `backward = [0,1.6,1]` gives `rightAxis = [1,0,0]`, **+y to screen-right**;
  - behind-net, `backward = [0,1.45,-1]` gives `rightAxis = [-1,0,0]`, **+y to screen-left**.
- `src/scenario-engine/rinkFrame.js` documents the canonical convention as
  "**+y: toward the bottom** of the canonical top-down view". So the 3D presets follow the
  documented frame and **the 2D board is the outlier.**

That last point is new relative to earlier packets and matters for whoever fixes this: the
cheapest correct fix is probably in `ExperimentalBoard`, not in the camera code, since the
board contradicts the documented frame in `rinkFrame.js` and the camera does not.

Occurrences in packet-08 — **3 of 5 scenes, 5 questions carrying the language directly,
12 questions affected through a shared briefing or cue:**

| Location | Text | Severity |
|---|---|---|
| `exp26-u9-015-q8` option b + explanation | "Navy3 below", "the visible lower teammate" | **Scored `basis: scene` option, and false on the 2D board as well** |
| `exp26-u9-015-q9` prompt + explanation | "below the circle", "toward a lower angle" | Camera-dependent **and** geometrically untrue of either drawn circle |
| `exp26b-u9-001` briefing (reaches all 6 questions) | "YOU are below the carrier" | Camera-dependent |
| `exp26b-u9-001-q2` option b | "YOU are below Navy2" | **Scored `basis: scene` option** |
| `exp26b-u9-002` briefing + 2 cues (reaches all 6) | "very close on the upper side", "a lower-side option", "close above the carrier", "a lower angle" | Camera-dependent |
| `exp26b-u9-002-q3` prompt | "Place YOU in upper-side space" | Camera-dependent instruction on a placement task |
| `exp26b-u9-002-q6` explanation | "Navy3's lower angle" | Camera-dependent |

All are rewritten camera-independently, by naming actors, drawn landmarks (nets, creases,
side boards, faceoff circles), sides of the ice, or measured distances. A full regex sweep of
all five replacements returns clean (the one apparent hit is "North American" in
`exp26-u9-014-q6`). `exp26-u9-013` and `exp26-u9-014` were clean of this defect to begin with.

### 4.2 A finding I looked for and did **not** confirm

`exp26-u9-013`, `-014` and `-015` label their actors `H2`, `H3`, `A1`, `A9` while every
question calls them `Navy2`, `Navy3`, `Gold1`. That reads exactly like the historical
"answer prose, actorId and rendered roster disagree" failure, and I nearly filed it.
It is **not** a defect. `src/visuals/actorLabel.js` `compactActorLabel` maps `/^[HA]\d+$/`
to the bare number and `actorDisplayName` renders that as `Navy 2` / `Gold 1`, identically to
the literal `Navy2` labels used in the `exp26b-*` scenes. Both conventions display the same
text. `roster` therefore passes on all 42 rows. Flagging it would have been a fabricated
finding of the exact kind calibration lesson 5 warns about.

One cosmetic consequence worth a separate note, not repaired here: the goalie `A9` in
`exp26-u9-014` shows as `G` on the board but as `A9` in the "Player locations and facing"
list, because `compactActorLabel` returns `'G'` for goalies and `actorDisplayName` then falls
through to `actor.label`. No packet-08 question names the goalie by label, so nothing is wrong
in this content; it is an app inconsistency for the backlog.

### 4.3 Rule and system claims — all verified, none invented

Every rule claim in this packet traces to a source I actually fetched and read today.

- **The U9 change routine** (`exp26-u9-013`, whole scene): verified verbatim —
  *"Timed buzzer or whistle for line changes: Game does not stop; players change on the fly at
  buzzer/whistle"* and *"On the buzzer/whistle, players must relinquish control of the puck
  immediately and vacate the ice."* q1, q3, q4, q7 and q8 keys all hold.
- **The three-metre goalie-freeze cushion** (`exp26-u9-014-q6`): verified verbatim. This was
  the packet's highest-risk claim and it survives. I have promoted it from a single question's
  feedback into the briefing and attributed it in the limits, so the scene and its feedback
  now agree.
- **`exp26-u9-014-q5` option c** ("An automatic faceoff after every hold") is marked wrong,
  and correctly so *for this model* — but it is accurate hockey under standard full-ice
  playing rules. The explanation already frames this as not importing another game's restart.
  I have recorded it as an intentional, scoped divergence rather than an error, and both the
  briefing and the limits now make the scoping explicit.
- **Jurisdiction limit, unchanged and still open:** all of this is Hockey Canada *national*
  guidance. Whether any particular Member or local association runs this model this season is
  unverified, and every affected scene's `limits` already says so. No transition date is used.
- **No contact, safety or physical-battle claim appears anywhere** in the packet or in any
  replacement. `exp26b-u9-001` is a corner scene, where a contact claim would be easy to slip
  in; there is none, and I did not add one.

### 4.4 Checks explicitly **not** performed

- **No rendered-scene or app verification.** I read `ExperimentalPractice.jsx`,
  `readSequenceVisuals.js`, `rinkFrame.js`, `rinkAnchors.js`, `actorLabel.js`,
  `coachRouteSurfaceInput.js` and `experimentalBankCore.js` as *source*, and derived the
  geometry and the camera mapping arithmetically. I did not open the application, did not
  render any scene, and did not take a screenshot. Camera framing, label legibility, whether
  the `Example` marker is readable at the new reference points, and whether the repaired
  `exp26b-u9-001` corner cluster is legible at the default zoom all remain **unverified**.
  The `exp26b-u9-001` repair in particular puts three actors inside a 6.7 m span in a rounded
  corner; that is the one replacement I would most want a rendered look at.
- **No independent second review.** Everything here is my own single pass plus a self-check
  of the exact final content. `replacementReview.status` is `self-checked` on all five, which
  is a claim about my own re-read and nothing more.
- **No human coach approval, no app testing, no publication, no bank admission.**
- **No git operations.** No `git add`, `commit`, `push` or any other write.
  `bank-snapshot.json`, the app source and the scenario engine are untouched; the only files
  written are the two in `claude-output/`.
- **Jack Han's *Hockey Tactics 2026* was not fetched and is not relied on.** Recorded as
  `unavailable` in `sourceChecks` so the omission is explicit. No page, diagram, template or
  wording from it informs any judgement here.

### 4.5 Judgement calls Codex may reasonably reverse

Three, flagged rather than buried:

1. **`exp26b-u9-001`: I moved the picture, not the words.** The alternative was to keep all
   coordinates and rename the scene — change the title, family (`corner-support`), objective
   and tags to describe a net-side support read, which is what `(25,-3)` actually is. That
   would have been a zero-geometry-risk repair. I chose the setup move because it preserves
   the curriculum identity and follows the rim precedent, but it introduces new geometry that
   deserves an independent check. The measurements are all in the repair's `evidence`.
2. **`exp26-u9-014-q9` changes question type**, position to choice, to break the duplication
   with q4. The scene keeps five question types. A reviewer who prefers to keep two position
   questions would need a genuinely different placement job; I could not find one in this
   scene that was not either a restatement of q4 or an unsupported tactical prescription.
3. **`exp26-u9-015-q4`** (option a, "Finish the first reception" becomes "Finish YOUR first
   pass") is the smallest change in the packet and the one I am least sure of. If the original
   meant Navy2's reception rather than YOUR action, the original is defensible and this should
   be declined.

And one thing I deliberately **did not** repair: `exp26b-u9-002-q3`'s reference `(-6,7)` sits
7.07 m from Navy2 and 7.27 m from the rendered puck, which is at the long end of a U9 passing
range and sits in mild tension with q4, q5 and q6, all of which teach *reachable* rather than
*maximum* separation. No source I read establishes a maximum youth passing distance, and
calibration lesson 4 warns against inventing distance rules in either direction, so I fixed
only the camera-dependent wording and left the reference alone. It is recorded in that row's
`alternative` field for your call.

---

## 5. Curriculum bindings and ranked gaps

Bindings below are proposed against `curriculum-ledger.json` v3.1.0, U9 age row (21 nodes).
The `domainSignals` in `curriculum-coverage.json` are keyword matches and I have not treated
them as bindings — for example `exp26-u9-015` picks up `transition-compete` purely from the
token "faceoff", and `exp26-u9-013` picks up `puck-skills` purely from "puck".

### 5.1 Proposed bindings

| Scenario | Primary concept | Secondary | U9 depth | Note |
|---|---|---|---|---|
| `exp26-u9-013` | **none available** | — | — | Game-routine / rule literacy. No ledger concept covers it — see gap 1 |
| `exp26-u9-014` | `u9.reading-the-play` (I) | **none available** for the restart rule itself | I | Only q10 ("why a whistle resets your read") binds cleanly; the rest is rule literacy |
| `exp26-u9-015` | `u9.off-puck-support-offense` (I) | `u9.scanning` (I), `u9.decision-making` (I), `u9.passing` (D) | I / D | Clean fit |
| `exp26b-u9-001` | `u9.off-puck-support-offense` (I) | `u9.scanning` (I), `u9.passing` (D) | I / D | Clean fit |
| `exp26b-u9-002` | `u9.off-puck-support-offense` (I) | `u9.time-and-space` (I), `u9.puck-carrier-options` (I) | I | Clean fit |

Separating the three things the assignment asks be kept apart:

- **Question format** — packet-08 runs choice 15, multi 7, explain 8, position 6, sequence 6
  (42). After repair: choice 17, multi 7, explain 8, position 4, sequence 6. Format variety is
  not the problem in this packet.
- **Teaching concept** — three of five scenes teach the *same* concept, off-puck support
  offence at depth `I`. That is concentration, not a gap.
- **Tactical situation** — the three off-puck scenes are genuinely different situations
  (post-pass give-and-go window; corner carrier with a defender on the direct line; carrier
  crowded near centre ice), so they are not reskins of each other. The duplication in this
  packet is *within* scenes, not across them.

### 5.2 Ranked gaps, grounded in counts

1. **The ledger has no concept for game routines and rule literacy.** Two of five packet-08
   scenes (`-013`, `-014`) teach exactly this, they are a named `topic: "Game routines"` in the
   bank, and the U9 age row shows 12 topics across 30 scenarios — yet none of the ledger's six
   domains (`skating-movement`, `puck-skills`, `hockey-sense`, `offensive-play`,
   `defensive-play`, `transition-compete`) can hold them. This is a **ledger** gap, not a
   content gap: good content already exists with nothing to bind to, so it cannot be counted,
   sequenced or gap-analysed. Highest-value fix, and cheap.
2. **Off-puck support offence is concentrated; the U9 defensive concepts are absent here.**
   `u9.angling-steering`, `u9.defensive-side-positioning` and `u9.stick-and-body-detail` are
   all `I` at U9 and none appears in this packet, while `u9.off-puck-support-offense` carries
   three of five scenes. I can only speak to this packet plus the U9 aggregate
   (30 scenarios / 240 questions / 29 families), so treat this as a signal to check across the
   whole U9 set rather than as a bank-wide count.
3. **Scene-basis share is low, and it is the only objectively checkable read.** U9 overall is
   59 scene / 181 coaching (24.6% scene). Packet-08 is 12 of 42 (28.6%); my repairs raise it to
   14 of 42 (33.3%) by converting `-013-q9` and `-014-q9` to scene basis. Coaching-basis items
   are discussion aids by design and cannot be graded, so a bank at 25% scene basis has
   relatively little that a learner can be told they read correctly. Worth a deliberate target
   rather than an accident of authoring.
4. **The appended q7-q10 blocks are the weakest content in the packet, structurally.**
   All three q7-q10 blocks came from the expansion pass. Of the 12 questions in them,
   4 needed repair, and both intra-scene duplications in this packet (`-014` q4/q9 and
   `-015` q3/q9) are an appended question repeating an original one in the same format for the
   same actor. That is a **delivery-format** problem — extending a six-question scene to ten
   without checking the original six — not a tactical gap. A cheap standing check would be:
   no appended position question may target the same actor as an existing one unless its
   reference is more than some stated distance away *and* its prompt names a different job.

---

## 6. Files and continuation

| File | Contents |
|---|---|
| `docs/factory/claude-project/claude-output/review-packet-08.json` | 42 coverage rows, 5 scenario replacements, 6 source checks, empty `remainingQuestionIds` |
| `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-08.md` | this report |

Source reads recorded (all fetched today with an explicit browser user agent):

| URL | Access | Used for |
|---|---|---|
| Hockey Canada, U9 set-up / game play / rules | `read` | The change routine, restart possession, the three-metre cushion |
| Hockey Canada, U9 FAQ | `read` | Programme context; nets "just inside the centre-ice circle", which is why the full-rink drawing is only an orientation map |
| Hockey Canada, Vision & Scanning | `read` | Teammates-and-pressure as the information to gather, taught at all ages |
| Hockey Canada, Puck Control | `read` | Handling creating time and space and opening further options |
| USA Hockey, Skill Progressions 2019 (PDF pp. 12-14, 23-25) | `read` | 8-and-Under puck support, getting open, near- and far-support, finding passing lanes; no team systems at this level |
| Jack Han, *Hockey Tactics 2026* | `unavailable` | Not fetched, not relied on, recorded so the omission is explicit |

**Nothing in this packet is blocked.** Every open item above is a judgement flagged for your
decision or a limitation of my access, not an unresolved question about the content.

**Next packet to continue:** `packet-09`.

Before integrating: re-check current hashes against the live scenes, run an independent review
of the five replacement scenarios' exact final content (all five change either questions or
setup, and three change `basis` or question `type` on at least one item), and render
`exp26b-u9-001` v2 in particular — it is the only replacement with a substantially new actor
layout.
