# Brain Gym teaching-copy review

September 5, 2026. Scoped copy pass for the overnight quality review.

## What changed

The hub and eleven drill introductions now describe the visible task and its
controls in short sentences. The previous automatic on-ice transfer claims,
unsubstantiated weekly training prescription, and scolding memory/failure language
were removed. Hockey connections are optional discussion prompts headed
**Talk hockey**. Hub cards say **Practice** and name the actual screen task.

Shootout's previously revised introduction was read as a reference and left
unchanged. Its hub practice label was shortened. All twelve games remain.

## Checked against the implementation

The JSX render/input code and existing core helpers supplied the task facts; this
pass adds no hockey rules or claims of training effectiveness.

| Game | Observable task reflected in the copy |
|---|---|
| Read the Pass | Watch a puck disappear, then predict its crossing on the gold bar. |
| Baylor's Pick | Follow three marked moving targets, select them, and lock in; selected targets support the soccer-ball double-tap bonus. |
| Shoot or Hold | Respond to the word SHOOT and wait on HOLD/FAKE, using tap or Space. |
| Eyes Up | Look at the center puck and recall where an off-center ringed marker flashed. |
| Snapshot | Recall the explicitly marked gold teammate's position; no claim that the learner independently inferred openness. |
| Find the Lane | Select the clear lane in a generated static scene before the timer expires. |
| Best Option | Choose shoot/pass/carry in a frozen scene, then inspect its route and reason. The copy identifies the game's single scored answer and invites discussion of alternatives. |
| Read the Numbers | Recall numbers on stationary skaters. Removed the stale hub description of a moving skater and dynamic visual acuity. |
| Late Read | Follow the current arrow/ring target, including a target switch when a defender moves. |
| Two Things at Once | Time the crossing and match the shape above the buttons. Removed the stale top-of-rink cue location and implication that both taps must occur at the same instant. |
| Shootout | Existing introduction already describes goalie openings and the scouting report without automatic transfer claims. |
| Run the Play | Repeat a displayed passing order; matching steps retain their points when a later tap ends the round. |

## Verification

- `npm run test:gym`: all assertions passed, exit 0.
- `node --test src/cognitive-gym/*.test.mjs scripts/test-gym-progress.mjs scripts/test-gym-phase1.mjs`: 27 runner tests passed, zero failures; embedded legacy assertions also passed.
- Source comparison confirmed all eleven drill diffs are limited to introduction/help text. All twelve registry IDs, names, and component bindings are unchanged.
- Babel parsed all twelve edited JSX files successfully. `git diff --check` passed.
- Scoring, timers, adaptation, storage, input handlers, rendering, and styles were not edited in this pass.

Integration verification: 158 practice tests and production build pass. The
updated hub plus Read the Numbers and Two Things at Once introductions/start/back
were checked at 390 px; no horizontal overflow. A fresh desktop hub screenshot is
recorded in `verification.md`. This does not claim a child reading study or
measured improvement in hockey performance.

## Files

`src/cognitive-gym/CognitiveGym.jsx`; `AnticipationDrill.jsx`,
`BestOptionDrill.jsx`, `EyesUpDrill.jsx`, `FindLaneDrill.jsx`,
`LateReadDrill.jsx`, `ReactionDrill.jsx`, `ReadNumbersDrill.jsx`,
`RunThePlayDrill.jsx`, `SnapshotDrill.jsx`, `TrackingDrill.jsx`, and
`TwoThingsDrill.jsx` in that same directory. No `ShootoutDrill.jsx` changes.
