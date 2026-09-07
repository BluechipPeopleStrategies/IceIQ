# One-on-one coach feature: hockey correctness review (2026-09-07)

**Reviewer:** RinkReads Hockey Authority (Claude Code session, `--agent hockey-authority` role, per
`docs/hockey-authority/INDEX.md`). **Qualification status at time of review:**
`docs/hockey-authority/qualification.json` = `"status": "unqualified"`,
`"mayIssueApprovalRecommendation": false`, `"mayResearchAndReportFindings": true`. Per the review
contract this report **researches and reports findings only** - it is not, and cannot be, an
overall hockey-correctness sign-off or a substitute for Thomas/a named human coach's approval.
Every PASS below means "no defect found in the scoped check," not human coach approval.

**Workstream-pause note:** `docs/hockey-authority/PAUSED-HANDOFF.md` pauses the *shared 3D
player / calibration / model-production / animation-migration* workstream specifically. This
review is a different, newly authorized task (a code-review handoff asking for hockey judgment on
existing one-on-one content and logic), so per the pause's own cross-work reminder I carried
forward its requirements (evidence separation, camera/viewpoint discipline, no invented landmark
geometry) without restarting or resuming the paused 3D/animation work itself. Where this review's
findings touch that paused workstream (final rendered-view confirmation through
`ScenarioRinkView`), I say so explicitly below and leave it as NOT REVIEWED rather than assuming a
result.

**Scope actually inspected** (per the calling session's brief): `src/one-on-one/curriculumPositionCore.js`
plus `curriculumPositionSource.json` plus `GuidedCurriculum.jsx` (U15 position rubric),
`DefenderPerspective.jsx` plus `defenderPerspectiveCore.js` plus `positioningSequenceCore.js` plus
`readSequenceU11.js`/`readSequenceGeometry.js` (defender-repositioning prompts),
`coach-question-examples.json` plus `coachQuestionCore.js` (MC answer keys), and a sampled/geometric
audit of `experimental-bank/{u11,u13,u15,u18}.json` (MC answer keys and position questions). I did
not re-run the full question-packet blind-calibration protocol in `docs/factory/CLAUDE-REVIEW-UPDATE.md`
for this task - that protocol governs the separate bank.json/packet review pipeline (packets
01-14, `claude-review-calibration/cases.json`, `claude-output/`), which this one-on-one feature is
not part of. I did apply the same evidence discipline it describes (derive plausible answers first,
calculate claimed relationships, distinguish scored "scene" facts from unscored coaching prose).

---

## Headline finding: this feature is currently mid-merge and partially unbuildable (BLOCKING, not a hockey judgment)

A file named `.git/MERGE_HEAD` exists in this checkout right now - an in-progress `git merge` of
`origin/main` (`BluechipPeopleStrategies/IceIQ`) was started and never finished. `git status --short`
shows 30 files as `UU` (unmerged, both modified), including files central to this exact review
scope:

```
UU src/one-on-one/ExperimentalPractice.jsx
UU src/one-on-one/GuidedCurriculum.jsx          <- hosts the U15 position-variant/rubric feature
UU src/one-on-one/PracticeHub.jsx
UU src/one-on-one/PracticeLibrary.jsx
UU src/one-on-one/Skater.jsx
UU src/one-on-one/experimental-bank/u9.json
UU src/one-on-one/experimental-bank/u11.json
UU src/one-on-one/experimental-bank/u13.json
UU src/one-on-one/experimental-bank/u15.json
UU src/one-on-one/experimental-bank/u18.json
UU src/one-on-one/experimental-expansion/(u9,u11,u13,u15,u18)-(additions,scenarios).json
UU src/one-on-one/experimentalPracticeAnalytics.js
UU docs/roadmap/TASKS.md, docs/factory/curriculum-map/*, docs/factory/claude-question-kit/*
```

**Verified effect, right now, on this checkout** (read-only commands only, nothing merged/edited):

- `node --test src/one-on-one/experimentalBankCatalog.test.mjs` fails immediately:
  `SyntaxError: Expected double-quoted property name in JSON at position 13739 (line 404 column 1)`
  - the parser is choking on a literal `<<<<<<< HEAD` line inside `u9.json`.
- `npm run test:practice` (the exact command the prior code-review report cited as "622/622
  passing") currently fails multiple suites: `curriculumPresentation.test.mjs`,
  `defenderPerspectivePresentation.test.mjs`, `experimentalBankCatalog.test.mjs`,
  `experimentalExpansionCatalog.test.mjs`, `experimentalPracticeAnalytics.test.mjs`,
  `questionReviewCore.test.mjs` (a different embedded-JSON syntax error, position 32866),
  `BoardInspection.test.mjs`, `PlayerLocator.test.mjs`.
- `curriculumPresentation.test.mjs` fails via an async esbuild error:
  `Build failed ... src/one-on-one/GuidedCurriculum.jsx:215:1: ERROR: Expected identifier but
  found "<"` - this is the literal `<<<<<<< HEAD` marker at `GuidedCurriculum.jsx:215`.
- `Skater.jsx:1` also has a raw `<<<<<<< HEAD` marker; any bundler pass over this file fails too.

This means the "622/622, zero console errors" result reported in
`docs/one-on-one-mvp-review-2026-09-07.md` reflects a different git state than what is on disk
right now (the merge must have landed in the working tree during or after that review; I did not
cause it and ran no git write command). I could not exercise the live rendered UI for this review
for the same reason that review's own walkthroughs would now fail on `GuidedCurriculum`,
`PracticeHub`, `PracticeLibrary`, and `ExperimentalPractice`.

**Substantively important, not just cosmetic:** the conflict inside `GuidedCurriculum.jsx` (lines
215-246 and 252-261) is between two structurally incompatible rewrites of the same screen:

- HEAD (local) side: the "lessons"/`CURRICULUM_AGES` structure with the `positionVariant` /
  `CurriculumPositionExercise` "Move the player" toggle, i.e. the exact U15 position-variant
  feature this review was asked to check, plus `copy.prompt`/`copy.explanation`/`SpacedMasteryProgress`.
- Incoming (`origin/main`) side: a different two-step "Choose the play -> Check the habit" flow with
  a coach-persona dropdown, `question.sit`/`question.ok`/`question.why`/`question.tip` fields (the
  flat schema visible in `curriculumPositionSource.json`), and no `positionVariant` branch at all.

Whoever resolves this merge is choosing, in effect, whether the U15 position-variant exercise
(scope item 1 of this review) survives at all, or whether it gets replaced by an older two-step MC
flow that has no position-placement rubric. That is a product/engineering decision, not a hockey
one; flagging it here only because it changes what "the U15 rubric feature" even is once the merge
completes, and because a careless auto-resolution (e.g. a scripted "keep ours"/"keep theirs" pass)
could silently delete the position-variant feature or silently reintroduce the older schema's
answer keys without a fresh review.

One of the conflicts is a content conflict, not just a version-number conflict, and it sits inside
a scored answer key (see finding 3 below).

**Recommendation:** finish or abort the merge deliberately (an engineering call, not mine to make
or execute; I ran no git mutation) before treating any of the findings below as final, since the
final content of `u9/u11/u13/u15/u18.json`, `GuidedCurriculum.jsx`, `PracticeLibrary.jsx`,
`PracticeHub.jsx`, and `ExperimentalPractice.jsx` is not yet settled. Nearly all of the conflicts
found are limited to `"version": N` bumps on otherwise-identical scenario objects (the actual
scene/question content on both sides of the conflict is usually the same object, just diverging
metadata), with the one content exception below.

Files I reviewed in depth for actual hockey content are NOT part of this merge and are stable and
clean: `curriculumPositionCore.js`, `curriculumPositionSource.json`, `DefenderPerspective.jsx`,
`defenderPerspectiveCore.js`, `positioningSequenceCore.js`, `readSequenceU11.js`,
`readSequenceGeometry.js`, `coach-question-examples.json`, `coachQuestionCore.js`. The
hockey-content findings on those files below stand independent of the merge.

---

## Domain table

| Domain | Verdict | Evidence |
|---|---|---|
| Roles and game state | PASS (sampled) | `readSequenceGeometry.js` confirms F1/F2 = home/Navy, D1/G = away/Gold consistently; every `experimental-bank` scenario sampled states team/attack/defend explicitly and I verified it against roster clustering. No case found where a label (D1/F2/G) was trusted without checking `team`. |
| Tactics | REVISE (one item) plus NOT REVIEWED (one item) | `curriculumPositionCore.js` U15 rubric and `coach-question-examples.json`'s 12 scenarios are geometrically self-consistent and tactically coherent (finding 4). `positioningSequenceCore.js`'s "defend the middle" gap-control direction logic (back/forward relative to own net) is correct by direct calculation for both the 1v1 defensive and 2v2+ offensive templates (finding 5). The U11-labeling of 2v2 through 5v5 team-structured positioning content is a genuine age/format question I can't clear myself (finding 1). |
| Skating and body mechanics | NOT REVIEWED | No rendered trace/animation was available to inspect (merge breaks the build; also outside this task's file list). `positioningSequenceCore.js`'s `assertClearIllustration` collision/pass-path guard is a drawn-body-overlap guard only, self-labeled "not a validated contact model," correctly scoped. |
| Stick and puck | NOT REVIEWED | No first-person/stick-reach rendering available to inspect this session. |
| Goaltending | NOT REVIEWED (structural note only) | Goalie actors in the sampled scenarios face the puck by construction; no goalie set/recovery mechanics exist in this text/2D content to review. |
| Age and learning | REVISE (finding 1) | 5v5 "Defend the middle"/off-puck-support templates are labeled `ageBand: 'U11'` and surfaced to the learner as "U11 - Position & explain"/"U11 - Mixed reads," including full-team lane-coverage concepts not typical of U11/ADM cross-ice teaching. |
| Viewpoint and questions | REVISE (findings 2 and 3) | Finding 2: `exp26-u15-001`'s briefing contains a scene-geometry claim that contradicts its own coordinates. Finding 3: one scored MC option in `exp26-u15-009-q5` currently has two irreconcilable candidate texts from the unresolved merge; the graded answer itself is unaffected, but the option-c text needs a human pick. Camera-relative "left/right net" phrasing is consistently paired with an explicit stated attack direction in every scenario sampled (good practice), but I could not confirm the rendered camera framing matches that text; NOT REVIEWED pending a render check once the merge and the paused 3D-render workstream are both checkable. |

---

## Findings

### Finding 1 - Age/format mismatch: 5v5 team positioning content shown under a "U11" label (REVISE, needs human coach/owner call)

- **File:** `src/one-on-one/positioningSequenceCore.js` (sha256
  `fe4bc696c18d909185f6c220f9546a4ac3408c8755c6d1dee1c62f0b76e2edd9`), lines 85-104 and 92
  (`ageBand: 'U11'` is hardcoded for every `teamSize` from 1 through 5, `focusActorId: defensive ?
  'D1' : 'F2'`), and its own test `src/one-on-one/positioningSequenceCore.test.mjs:36` asserting
  `item.ageBand === 'U11'` for all 640 templates regardless of team size.
- **Surfaced to the learner as:** `src/one-on-one/ScenarioWorkshop.jsx:263`, the mode picker reads
  "U11 - Mixed reads" / "U11 - Position & explain," and inside that same U11-labeled screen the
  learner can pick 1v1 through 5v5 (`ScenarioWorkshop.jsx:265`). `template.ageBand` is passed
  straight through to `ScenarioRinkView ageBand={template.ageBand}` (`ScenarioWorkshop.jsx:214`,
  `MixedPositioningLesson.jsx:197`), which per the project's own art-style rule
  (`docs/hockey-authority/PAUSED-HANDOFF.md`: young players use friendly rounded anime-like
  proportions, progressing toward older athletic features) controls player-model proportions,
  meaning a full 5v5 structured possession is rendered with U11-style young-player art and labeled
  U11 in the UI regardless of team size.
- **Concept content at 5v5:** `parameterSpace()` (`positioningSequenceCore.js:19-34`) adds
  `pressureGap`, `laneCover: ['in-line','behind-line']`, and multiple `D2` through `D5` positioned
  relative to passing lanes, i.e. structured team defensive-zone coverage concepts.
- **Evidence this is a mismatch, not just an unlabeled default:** `docs/hockey-authority/sources.md`
  cites Hockey Canada's U11 skills page as this project's own U11 reference. Hockey Canada's ADM
  model teaches U11 (Atom) primarily through cross-ice/small-area games (commonly up to 3v3), not
  full 5-on-5 team-systems play with named multi-defender lane-coverage responsibilities. I did not
  re-fetch the live hockeycanada.ca U11 page this session (no new network fetch was made beyond
  what is already recorded in `sources.md`), so treat "U11 does not normally mean full 5v5 systems"
  as reviewer inference from the project's own cited source's general framing, not a re-verified
  quote. A human coach should confirm the exact current U11/Atom format guidance before this is
  called a confirmed defect rather than a design question.
- **Consequence:** if this ships as-is, a 5v5 "hold the pressure gap while covering two lanes"
  exercise would be presented to (or age-labeled as) U11 players with U11 art, which is either fine
  if it is meant as a coach-facing/older-athlete teaching tool mislabeled U11, or a genuine
  age-inappropriate leap if U11 players are actually meant to attempt it.
- **Correction needed:** either (a) give `teamSize >= 3` (or `>= 2`) templates their own `ageBand`
  matching the actual team-defense complexity, or (b) if U11 is intentional because this is "read
  practice" rather than a real-game format claim, add an explicit age-adaptation note the way
  `experimental-bank` scenarios already do ("Age adaptation ... awaits coaching review"), and get a
  human coach to confirm the concept load is appropriate at U11 regardless of format. Currently
  there is no such disclosure on these templates at all; no `sourceRefs`/`evidenceBoundary` field
  mentions the age question, only "not physics-validated."
- **Recheck:** re-run `positioningSequenceCore.test.mjs` after any `ageBand` change (currently
  hard-asserts U11 for all 640 templates, so it will need updating deliberately, not left to drift).

### Finding 2 - False scene-geometry claim in briefing text next to a scored question (REVISE, low severity, not merge-related)

- **File:** `src/one-on-one/experimental-bank/u15.json` (sha256
  `a6c73940ec3b0ba3297f9bc0f446e34e666fdfc7c12f426c2e243860b8691c9c`), scenario `exp26-u15-001`
  ("Pinch only with the declared cover"), `briefing` field (line 10) and duplicated in `cues[1]`
  (line 104). This scenario object sits entirely outside the unresolved-merge conflict region (the
  first conflict in this file starts at line 247), so this is a stable, current defect, not an
  artifact of the mid-merge state.
- **Claim:** "F1 contests Gold 1's rim; F3 is currently closer to Gold's net than the puck, so the
  named cover is not established."
- **Actual coordinates** (`setup.actors`): puck at x=20, y=10 (owner null); F3 (`home-skater-5`) at
  x=18, y=1. Navy (home) attacks Gold's net; Gold (away) skaters cluster at x=16-25, i.e. the
  attacking end (Gold's net) is at the high-x end of this scene. By x alone, the puck (x=20) is
  closer to the high-x attacking end than F3 (x=18); the opposite of what the sentence claims.
- **What the scored answer actually says, and is correct:** `exp26-u15-001-q1`'s graded answer "c"
  reads "No; F3 is currently closer to Gold's net than YOU" (x=11,y=8 for YOU vs x=18,y=1 for F3;
  F3 genuinely is closer to Gold's net than YOU is), matching `cues[0]`: "F3 is deeper in the
  attacking zone than YOU, rather than occupying the high position." That comparison (F3 vs YOU) is
  geometrically correct and is the one that actually supports the lesson (F3 has not replaced YOU
  at the high/point position, so the "F3 covers your high position" cover condition is not met).
- **Diagnosis:** the briefing's second sentence appears to be a copy/paste substitution of "the
  puck" for "YOU." It states a comparison that is both false on the numbers and not the comparison
  the lesson/graded question actually needs.
- **Consequence:** a careful learner or coach reading the briefing text literally would be told a
  false, extraneous spatial fact about the scene (the puck's position relative to the net) that
  contradicts the surrounding evidence, exactly the class of "audit every clause, not just the
  graded prompt" issue the review contract calls out.
- **Correction:** change "F3 is currently closer to Gold's net than the puck" to "F3 is currently
  closer to Gold's net than YOU" in both the `briefing` string and `cues[1]`, matching the
  already-correct `cues[0]` and the q1 explanation, or remove the clause if it is not needed.
- **Recheck:** re-diff the two occurrences (`briefing`, `cues[1]`) against `cues[0]` and the q1
  explanation for a literal match of the comparison being made.

### Finding 3 - Merge conflict lands inside a scored MC option's text (REVISE, needs a human pick before ship)

- **File:** `src/one-on-one/experimental-bank/u15.json`, scenario `exp26-u15-009`, question
  `exp26-u15-009-q5`, option id "c", file lines 2044-2048, raw and unresolved right now:

```
<<<<<<< HEAD
            "text": "Shoot automatically because YOU are high"
=======
            "text": "Gold 3"
>>>>>>> cd200c667eba662c2e7d6f803b73d096b5533212
```

- **Question as written:** "Suppose F1's pass reaches YOU and YOU control it at your shown
  position. Which Gold skater would then be nearest the direct shooting line?" Sibling options are
  a = "Gold 1", b = "Gold 2". Graded `answer: ["b"]` (Gold 2) is unaffected by this conflict either
  way; both candidate texts for option c leave "b" as the only actor-named option that could
  plausibly be "nearest," so the correct answer itself is not at risk.
- **Content-quality problem independent of which side wins:** the HEAD-side text ("Shoot
  automatically because YOU are high") does not answer the question asked (it names an action, not
  a Gold skater) and breaks the parallel structure of the option set (a and b name skaters, c would
  name an action). It also duplicates a point already made in the question's own explanation
  ("Becoming the carrier creates a new pressure read; it does not predetermine a shot"), so as a
  distractor it is confusing rather than illustrative. The `origin/main`-side text ("Gold 3") is
  well-formed, matches the a/b pattern, and is a plausible distractor (a third defender who is not
  nearest the shooting line).
- **Recommendation:** when this merge is resolved, take the `origin/main` ("Gold 3") side for this
  specific option, on content-quality grounds, not just "theirs wins by default." The two sides are
  not equivalent content, and a scripted keep-ours/keep-theirs resolution could pick either one
  without anyone noticing the grammar mismatch.
- **Recheck:** after resolution, confirm the final `u15.json` parses, and confirm option c's text
  answers "which Gold skater," matching the sibling options' pattern.

### Finding 4 - U15 position rubric and coach-question-examples.json: no hockey defect found in this pass (PASS, scoped)

- **Files:** `curriculumPositionCore.js` (sha256 starting `d051557c`), `curriculumPositionSource.json`
  (sha256 starting `82c972d3`), `coach-question-examples.json` (sha256 starting `008ea791`, all 12
  scenarios read in full).
- **U15 rubric** (`curriculumPositionCore.js:20-24`): polygon region, edgeToleranceM = 0.6,
  laneClearanceM = 1.25, receivingClearanceM = 2, carrierClearanceM = 3, separateAngleDegrees = 30,
  computed against the frozen `curriculum-draft.json#practice-draft-u15-two-angles-mc` scene (F1
  carrier at 14,0, F2 pressured teammate at 20,-5, opponents D1/D2 at 17,-2.5 and 21,-4 pressuring
  F2's route). I recomputed the geometry independently: the required region 16,3 to 23,9 sits on
  the opposite side of the ice from the pressured F2 route, and the separate-angle check (30 degrees
  from F2 relative to the puck) plus the carrier-space and receiving-space clearances are
  internally consistent with "give F1 a genuinely separate, clear outlet." That matches standard
  off-puck-support-offense coaching (create width and depth, do not stack a covered lane), and the
  file's own comment already discloses these exact numbers are "authored for this frozen example,
  not universal hockey distances or an approved tactical grade," which is the correct and honest
  scope. I found no internal contradiction and no absurd or impossible distance. I did not
  independently certify 0.6m/1.25m/2m/3m/30-degree as universally correct minor-hockey spacing;
  that sign-off is explicitly still owed to a human coach, as the file itself says.
- **coach-question-examples.json:** I recomputed, for every one of the 12 scenarios (U7 through
  U18), whether the stated coachExplanation and rubric.mustNotice claims hold against the actual
  x,y coordinates: pass-lane blocking (exact collinearity in two U7/U9 cases; the U9 "crowded path"
  scene has the opponent sitting at perpendicular distance 0 from the original teammate-to-YOU
  line, confirming "the path is crowded" is literally true, not just asserted), goal-side/inside
  relationships in the U11/U13/U18 defensive examples (I computed distance-to-net for both the
  reference position and the relevant attacker/support player in each case and found the claimed
  goal-side relationship held every time), and the two exact-collinear 2-on-1 "shoot" examples
  (`coach-example-u13-2v1-pass-removed`: D1 sits at perpendicular distance 0 on the YOU-to-F2 pass
  line while the YOU-to-net shot line is clear by about 5.7m; `coach-example-u15-2v1-goalie-late`:
  shot lane clear of D1 by about 7.2m with the goalie displaced toward the other side). All 12 held
  up. `compareCoachAttempt()` in `coachQuestionCore.js` (lines 159-176) is explicitly designed to
  never grade the learner's attempt right or wrong; it returns positional deltas from the reference
  with the note "These are differences from an authored reference, not correctness grades," which
  is the correct posture for content still marked `status: "example-for-coach-review"` and is worth
  calling out as good practice, not just an absence of defects.
- **Scope limit:** this is a geometry/internal-consistency check against the authored coordinates,
  not a render check. I did not, and per my tooling cannot, confirm the actual 3D/2D
  `ScenarioRinkView` frame matches these coordinates pixel-for-pixel; that is the still-paused
  render-verification lane per `PAUSED-HANDOFF.md` item 4.

### Finding 5 - Defender-repositioning logic: direction math and DefenderPerspective wording check out (PASS, scoped)

- **positioningSequenceCore.js's "defend the middle" (1v1 gap-control) template:** I independently
  recomputed the "Back"/"Forward" direction math in `positionChoicePoint()` (lines 293-305) for both
  the defensive template (teamSize=1, focusActorId='D1', ownNetDirection=1) and the offensive
  template (teamSize>=2, focusActorId='F2', ownNetDirection=-1), against the actual initial-state
  geometry in `initialState()` (lines 45-81): D1's own net (`landmarks.goalieRight`, high +x) sits
  beyond D1, who sits beyond the carrier F1 (lower +x), so for D1, "Back" (toward own net) correctly
  increases x and "Forward" (away from own net) correctly decreases x. For the offensive focus
  actor, the home team's own net is at the low/negative end, so "Back" correctly decreases x and
  "Forward" (toward the attacking end) correctly increases x. Both `directionExplanation` strings
  (line 357) match this math. I did not find a sign error or a reversed convention here.
- **DefenderPerspective.jsx plus defenderPerspectiveCore.js** (the "Where should D1 go now?" panel
  inside ReadSequence): confirmed via `readSequenceGeometry.js` that D1/G are team away (Gold) and
  F1 ("YOU")/F2 are team home (Navy), matching the panel's own text ("D1 defends the right net with
  the gold goalie") and its `editableTeam="away"` restriction. This exercise is intentionally
  ungraded (`defenderPerspectiveCore.js` never calls a rubric/evaluator on D1's chosen point; the
  UI's own copy says "This position has not received a tactical grade"), so there is no answer key
  to audit here, only the coaching cue text, which reads "Look again: Where is F2 now? Where is F1?
  What space can D1 protect while still seeing the puck?" This is open and non-prescriptive, and
  does not assert a false or over-specific claim (it does not, for example, claim a single correct
  gap distance or assume a shoulder-check that was not shown), appropriate for a reflection panel
  with no physics/timing model behind it.
- **Not reviewed:** whether the rendered camera (view="half-right") actually shows "the right net"
  on the visually correct side is a render check I could not perform this session (see the headline
  finding; also the paused workstream's own item 4).

---

## What I did not review (explicitly, per contract: unknown is never a silent pass)

- Full geometric audit of all 75 experimental-bank scenarios (u11: 25, u13: 25, u15: 15, u18: 10).
  I geometrically verified `exp26-u15-001` through `exp26-u15-009`'s q1 "scene" claims in depth,
  spot-checked several q5 claims, and confirmed all "position"-type questions in every scenario
  move only the YOU/focus actor (never an opponent D-labeled actor), so "defender-repositioning" in
  this content set means YOU-as-defender scenarios (backcheck/PK/D-zone), not literally dragging an
  opponent's D. I did not exhaustively verify every closer/farther/nearer claim in every scenario's
  briefing and distractor text across all four files; that would require either a much larger token
  budget or a purpose-built landmark-aware checker (net position is not a fixed global constant
  across these files; it is inferred per-scenario from roster clustering and the stated attack
  direction). This is a scoped gap, not a clean bill of health for the remaining roughly 65
  scenarios.
- `experimental-expansion/*.json` (u9/u11/u13/u15/u18 additions and scenarios): named in the
  merge-conflict list, not in the original assigned scope, not opened this session.
- Any rendered frame from ScenarioRinkView/CurriculumBoard/QuestionBoard: the merge conflict in
  GuidedCurriculum.jsx/PracticeLibrary.jsx/PracticeHub.jsx/ExperimentalPractice.jsx means I could
  not load these screens live this session even if I were otherwise able to (tooling here is also
  read-only/no-browser per this role's standing constraints).
- Physics/timing feasibility of any authored transition (skating speed, reaction windows): none of
  the reviewed files claim physics validation (`proofMode: 'illustrative-not-physics-validated'` is
  explicit in positioningSequenceCore.js; experimental-bank scenarios say "no skating speed,
  interception timing ... has been validated"), so there is nothing to certify here and I did not
  invent acceptable numbers for it.

## Sources consulted

- `docs/hockey-authority/sources.md` (project's own evidence map): used to identify that Hockey
  Canada's U11 page is this project's own cited U11 reference for finding 1; I did not re-fetch it
  live this session (relying on the project's prior citation, flagged accordingly above as reviewer
  inference pending re-verification).
- In-repo sourceRefs/docs/library/*.md notes cited by each reviewed question (gap-control.md,
  defensive-angling.md, off-puck-support-offense.md, odd-man-reads.md,
  two-on-one-pass-lane-removed.md, backcheck-recovery.md, forecheck-pressure.md, etc.): I did not
  re-open these library files this session; I evaluated whether the authored scene geometry matches
  the stated principle in the question text, which is the review contract's "topic match is not
  evidence of the precise answer" bar, not a re-audit of the library files themselves.

## Handoffs

- **To engineering/Codex:** resolve the in-progress git merge (.git/MERGE_HEAD, merging
  origin/main) deliberately before treating GuidedCurriculum.jsx, PracticeHub.jsx,
  PracticeLibrary.jsx, ExperimentalPractice.jsx, Skater.jsx, experimentalPracticeAnalytics.js, or
  any experimental-bank/experimental-expansion JSON as final. Decide explicitly whether the U15
  positionVariant feature (HEAD side) or the two-step coach-persona flow (origin/main side) is the
  surviving GuidedCurriculum design; this is a product/architecture call, not a hockey one. Re-run
  `npm run test:practice` after resolution and get back to a real 622/622-equivalent number before
  any further hockey review of this feature is worth doing.
- **To Thomas / a named human coach:** finding 1 (U11 label on 5v5 structured content) and finding
  4's rubric numbers both need an actual coaching sign-off; I found no internal defect in either
  but neither is mine to certify as correct hockey per my qualification status.
- **To Moshey/Reel:** not applicable this session; no rendered artifact was available to hand off a
  visual-craft or clarity review against. Once the merge is resolved and GuidedCurriculum renders
  again, the U15 position-variant exercise (and its "Move the player" toggle) is the concrete
  surface worth a fresh Reel clarity pass, since its underlying rubric/geometry checked out in this
  review.

## Statuses (kept separate, per the review contract)

- AI hockey-authority review (this document): partial; findings above, no overall approval
  recommendation issued (unqualified for that per qualification.json).
- Deterministic/physics validation: not applicable; every file reviewed self-declares
  "illustrative, not physics-validated."
- Rendered-view review: not reviewed (build currently broken by the unresolved merge).
- Human coach approval: not obtained (all reviewed content remains self-labeled
  "example-for-coach-review" / "draft-for-coach-review" / "awaiting hockey review," and stays that
  way after this report).
- Curriculum admission / deployment: unchanged, still pending on the above.
