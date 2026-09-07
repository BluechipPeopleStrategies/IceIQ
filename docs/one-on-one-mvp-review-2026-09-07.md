# One-on-One Coach Feature — MVP Testing Review (2026-09-07)

Scope reviewed: `src/one-on-one/` (CoachQuestionLab, GuidedCurriculum, PracticeHub, PracticeLibrary,
PracticeScene, ReadSequence + ReadSequenceBoard/Scene/Recall, RinkDiscovery, ScenarioWorkshop,
DefenderPerspective, MixedPositioningLesson, curriculumMotion/curriculumPosition, sgsMixedDraft, plus
core logic and `.test.mjs` files) and the (unrelated-to-routing) `src/App.jsx` diff.

## GO / NO-GO verdict

**Conditional GO for MVP testing, high confidence**, with one fix already applied and one confirmed
defect that should be fixed or the affected optional panels hidden before testers reach them.

- The main path every tester will hit — Practice Arena → Practice (Choose the play / Find your
  position) → Learn the game (Guided lessons / Lesson library / Explore the rink) → Coach Lab →
  Play — loads and works end-to-end with **zero console errors** across every screen I exercised,
  after one fix (below).
- The automated suite is **622/622 passing** (was 621/622 — one real crash, now fixed).
- One optional/bonus sub-feature ("Try play recall" and likely "One thing changes" inside
  `ReadSequence`) has a confirmed nested-interactive-element bug that should be fixed before kids
  tap on it, but it doesn't block the core 3-read flow.
- Everything in the feature is honestly self-labeled as a preview ("DEVELOPMENT PREVIEW",
  "COACH-REVIEW DRAFT", "awaiting hockey review", "New simulations await hockey review"), which is
  the right posture for an MVP test group and should stay visible.

## Important git-state note (not caused by my review, but material)

Partway through this session, an automated process in this repo committed **all** pending
workspace changes — the entire 33-file WIP diff this review covers, my one-line fix below, and a
large batch of unrelated historical `.playwright-mcp/*` snapshot artifacts from other sessions
going back to 2026-09-05 — as commit `d85b02c` ("Capture remaining active workspace changes") on
`main`. I did not run `git add`, `git commit`, or any git write command myself; this fired on its
own (most likely a Stop-hook/scheduled auto-commit already configured for this repo). Nothing was
pushed — `main` is still purely local-ahead of `origin/main` (48 ahead / 46 behind, a divergence
that predates this session). Flagging this because the task's premise ("large uncommitted diff...
none of it committed yet") is no longer true as of this commit, and you may want to review/reword
that commit or split it before it goes anywhere.

## Mechanical bug found and fixed

**File:** `src/one-on-one/RinkDiscovery.jsx`, line 95.

`RinkDiscovery` (the U7 "explore the rink" feature, reached via Learn the game → Explore the rink,
or the U7 age band) referenced a variable `questionId` that was never defined in that component's
scope — only `prompt.id` exists there (and is used correctly one line below for `DiscoveryBoard`).
This threw `ReferenceError: questionId is not defined` and crashed the entire screen on render for
every U7 (and U9) player. Caught by the existing test suite:

```
✖ the actual tour supports wrong answers, keyboard and ice answers, completion, replay and cleanup without a profile write
  ReferenceError: questionId is not defined
      at RinkDiscovery (...RinkDiscovery.jsx:95)
```

Fix (one line, mechanical, test-covered):

```diff
- <ScenarioRinkView ageBand="U7" questionId={questionId} startingView={prompt.startingView} ...
+ <ScenarioRinkView ageBand="U7" questionId={prompt.id} startingView={prompt.startingView} ...
```

Verified: `node --test src/one-on-one/rinkDiscoveryCore.test.mjs` → 8/8 pass (was 7/8). Full suite
`npm run test:practice` → 622/622 pass (was 621/622, 1 fail). Live-clicked the fixed flow in the
browser end to end (wrong answer → "Keep looking" → correct answer → "You found a faceoff
circle!" → star awarded) with zero console errors, confirming the crash is gone.

## Test suite results

`npm run test:practice` (all `src/one-on-one/*.test.mjs` + related suites):

```
ℹ tests 622
ℹ suites 2
ℹ pass 622
ℹ fail 0
```

Before the fix: `621 pass / 1 fail` (the RinkDiscovery crash above). No other failures anywhere in
the suite (coach-question, positioning-sequence, read-sequence, curriculum-motion/position,
defender-perspective, sgs-comprehension/mixed-draft, practice-judge, etc. all green).
`test:scenario-engine` was not run — `ScenarioWorkshop.jsx` doesn't import from `scenario-engine/`,
so it isn't exercised by this diff.

## Live walkthroughs performed (Playwright, real clicks, both `npm run dev` and a production
`npm run build && npm run preview`)

All of the following loaded and completed with **zero console errors** (only pre-existing benign
warnings: a THREE.Clock deprecation notice and a `splash.jpg` preload-unused warning, both
unrelated to this diff):

- **ReadSequence** ("Choose the play"), U11: full 3-read flow (pass → defender-perspective
  "Where should D1 go now?" reposition exercise → carry → move-YOU-with-coordinates read 3) through
  to the summary screen ("Your three reads", AI-coach ask, download, try-a-branch).
- **ReadSequenceRecall** ("Try play recall") and the "One thing changes" changed-cue comparison —
  loaded and functioned, see the confirmed defect below.
- **ScenarioWorkshop** ("Find your position"), U11 Position & explain, 1v1: answered read 1
  ("Stay here"), advanced to read 2 ("F1 has carried into a new space...").
- **RinkDiscovery** ("Explore the rink"), U7: wrong-answer and correct-answer paths, star award,
  full 4-question loop tested up through question 1.
- **GuidedCurriculum** ("Guided lessons"), U7 and U15: answered a standard MC question (coach
  persona feedback correct), and separately opened the one lesson wired to
  `curriculumPositionCore.js`'s special-cased position variant (U15 "Keep a different support
  angle" → "Move the player" toggle → "Keep the starting position" → "Check my position" →
  "Good area for this exercise" feedback).
- **PracticeLibrary** ("Lesson library"): answered a plain MC question and a spatial "Read the
  play" scenario question (`ScenarioRenderer`), including the new `ScenarioImage`
  availability-gating (`needsImage`/`onAvailabilityChange`) added in this diff.
- **CoachQuestionLab** ("Coach Lab" → "Questions & positioning"): moved YOU, submitted with an
  empty reason (confirms the diff's intentional change making the reason optional —
  `coachQuestionCore.js`'s `submitLearnerAttempt` no longer requires `hasText(attempt.reason)`),
  and reached the side-by-side "My position" vs "Coach reference" compare screen.
- **Play** (OneOnOne / PracticeScene, the physics-based 1-on-1 rink): loaded, real 3D canvas
  rendered correctly (this screen is explicitly labeled "DEVELOPMENT PREVIEW" in its own header —
  pre-existing, not part of this diff's scope, only sanity-checked since `PracticeScene.jsx` did
  change).

I also corrected a false alarm from my own testing along the way, worth recording so it isn't
re-investigated: the accessibility tree for every `ScenarioRinkView`/`ReadSequenceScene` 3D canvas
permanently reports the text "The 3D rink could not load. Use Retry 3D rink to open it again." (or
"This browser cannot display the 3D rink.") even when the canvas is visibly rendering correct,
dynamic content. I confirmed via direct DOM inspection (`document.querySelectorAll('canvas')`,
`.srv-fallback` element count = 0) that the canvas was live and correctly sized in every case, and
that this string is React-Three-Fiber's static `<Canvas fallback="...">` content, which browsers
expose to the accessibility tree as descriptive fallback text for an inherently-unreadable
`<canvas>` regardless of whether it actually rendered. **This is a real but minor accessibility
defect** (a screen-reader user is told the rink failed and prompted to "Retry" when it didn't), not
a rendering blocker — flagging it separately so nobody chases a phantom "3D never loads" bug.

## Confirmed defect NOT fixed (needs a design decision, out of my fix-scope)

**File:** `src/one-on-one/ReadSequenceRecall.jsx`, lines 176-178 (and likely the "One thing
changes" changed-cue comparison board in `ReadSequence.jsx`, same `renderBoard` pattern).

React logs a `validateDOMNesting` warning every time "Try play recall" (or the changed-cue
comparison) is opened:

```
Warning: validateDOMNesting(...): <button> cannot appear as a descendant of <button>.
    at button
    ...
    at ScenarioRinkView
    ...
    at button   <- the outer "Look closer" thumbnail button
    at li
    at ol
    at ReadSequenceRecall
```

`ReadSequenceRecall` renders each of the 3 recall "moment" thumbnails as a real, fully-interactive
`ScenarioRinkView` (camera-angle buttons, "Player eyes" dropdown, "Adjust view") **nested inside**
a `<button onClick={inspect}>` meant only to open a bigger inspection view:

```jsx
<button type="button" className="rs-recall-picture" ... onClick={event => inspect(card, event.currentTarget)}>
  <div aria-hidden="true" className="rs-recall-thumbnail">{renderBoard(card.state, card.description)}</div>
  <span>Look closer ↗</span>
</button>
```

I confirmed this visually — the "thumbnail" is not a static preview image, it's a full working
mini rink editor (camera buttons, dropdown, "Adjust view") crammed inside a bigger clickable card.
Practically: because the inner buttons don't call `stopPropagation()`, tapping any control inside a
thumbnail (e.g. "Overhead" camera) both fires that control's own handler **and** bubbles up to
trigger `inspect()`, immediately jumping the player into full-screen inspection instead of just
changing the camera angle they meant to touch. On a touchscreen, this is the kind of thing a kid
will hit by accident, and no existing test would catch it (`ReadSequenceRecall`'s own tests are all
core-logic, not rendered-DOM tests).

I did **not** fix this — per the task's scope, this needs a design call (should the thumbnail be a
real inert preview image, or should the nested buttons be excluded/disabled, or should the whole
card stop being a `<button>` and use a separate explicit "Open" affordance?), not a one-line patch.
Recommend either fixing this before testers reach "Try play recall," or temporarily hiding that
optional panel (and the changed-cue comparison, if it has the same pattern) for the first MVP round
since the required 3-read flow doesn't depend on it.

## Rough edge, not fixed (reported per instructions, not a code bug)

**Files:** `src/one-on-one/DefenderPerspective.jsx` (line 86) and `src/one-on-one/ReadSequence.jsx`
(read-3 "Position controls").

The coordinate inputs for placing a player use the labels "Rink length" and "Rink width" for what
are actually that one actor's X and Y position (an editorial choice to avoid saying "X/Y", not a
bug — same pattern in both files). To anyone reading it cold it reads like it's describing the
whole rink's dimensions rather than "how far along the rink" / "how far across the rink" that one
player is. Worth a copy pass, but I'm reporting rather than changing it since it may be a deliberate
accessibility-friendly label choice.

## Half-finished / dead-code check

Grepped all changed `.jsx` files in `src/one-on-one/` for TODO/FIXME/XXX/HACK/stray
`console.log`/commented-out blocks — found nothing beyond ordinary explanatory comments. Every new
file in the untracked list (`DefenderPerspective.jsx`, `MixedPositioningLesson.jsx`,
`curriculumMotion.jsx`/`curriculumMotionCore.js`, `curriculumPosition.jsx`/`curriculumPositionCore.js`,
`sgsMixedDraft.js`, `sgsComprehensionCore.js`, `coachQuestionSetup.js`,
`curriculumAudienceCopy.js`) is actually imported and reachable from `PracticeHub.jsx` →
`ReadSequence.jsx` / `ScenarioWorkshop.jsx` / `GuidedCurriculum.jsx` — nothing built-but-unwired.

Note on `src/App.jsx`: the task description assumed it changed "presumably to route to this
feature," but the actual diff has nothing to do with one-on-one routing — every hunk is about a new
`useQuestionVisualGate` hook (from `src/visuals/useQuestionVisualGate.js`) that gates the **main
Quiz and WeeklyQuiz** screens' answer/timer availability on their image or rink being ready before
the player can answer. That's shared infrastructure the one-on-one components (`ScenarioImage`,
`ScenarioRinkView` callers) also consume, not a change to how one-on-one gets routed to. Existing
one-on-one routing (`#practice-arena` → `PracticeHub.jsx` → `OneOnOne.jsx`/`PracticeHub` tabs) is
untouched by this diff.

## Items needing a hockey-authority (not code) judgment call

I did not adjudicate any of these — flagging so a domain reviewer looks at them before wider
release, separate from this code review:

- **`curriculumPositionCore.js`'s U15 "two angles" rubric** (`src/one-on-one/curriculumPositionCore.js`
  lines 10-24): a hand-authored polygon region, edge tolerance (0.6m), lane clearance (1.25m),
  receiving clearance (2m), carrier clearance (3m), and a 30° separation-angle rule for judging
  where a good support position is. The file's own comment calls this "authored for this frozen
  example, not universal hockey distances or an approved tactical grade" — that self-disclosure is
  good, but the actual numbers still need a coach's sign-off before they're treated as correct
  teaching, not just an internally-consistent exercise.
- **`DefenderPerspective.jsx`'s defender-repositioning exercise** (the "Where should D1 go now?"
  panel inside ReadSequence): asks a player to reposition a defender with no right/wrong answer
  enforced ("This position has not received a tactical grade") — that's an intentional design
  choice (ungraded reflection), but worth a coach confirming the prompts and coaching cues shown
  ("Look again: Where is F2 now? Where is F1? What space can D1 protect...") are sound.
- **All of the "best play" MC answer keys** across `curriculum-draft.json`, `coach-question-examples.json`,
  and the practice library content are labeled "coach-review draft" / "awaiting hockey review" in
  the UI itself — that label is accurate and should stay until a coach actually reviews them; I
  only verified the code correctly scores against whatever `ok`/`correct` value is authored, not
  that the authored answer is the right hockey answer.

## Punch list

**Blockers (before testers touch the affected screens):**
1. ~~RinkDiscovery crash for U7/U9 players~~ — fixed in this review (see above).
2. Nested-button bug in `ReadSequenceRecall.jsx` (play recall) and likely the changed-cue
   comparison — fix the interaction, or hide those two optional panels for the first MVP round.

**Rough edges (fine for MVP, note for later):**
3. "Rink length" / "Rink width" coordinate-input labels read as whole-rink dimensions rather than
   one player's position — copy pass.
4. `ScenarioRinkView`/`ReadSequenceScene`'s canvas fallback text permanently mislabels working 3D
   scenes as failed to screen readers — accessibility copy fix, not a render bug.
5. Git housekeeping: an automated process committed the entire pending WIP diff plus a large batch
   of unrelated historical Playwright snapshot files into one commit (`d85b02c`) during this
   session, unprompted by me — worth deciding whether to split/reword that commit before it's
   pushed anywhere.

**Nice-to-haves:** none identified beyond the above — the built surface area is larger and more
polished than the task description implied (defender-perspective reflection, changed-cue
comparison, play-recall, curriculum position/motion variants, coach-question compare-with-reference
all work).

## Files touched by this review
- Fixed: `c:\Users\mtsli\IceIQ\src\one-on-one\RinkDiscovery.jsx` (one line, see diff above).
- Everything else in `src/one-on-one/` and `src/App.jsx` is exactly the pre-existing diff under
  review; no other files were modified.
