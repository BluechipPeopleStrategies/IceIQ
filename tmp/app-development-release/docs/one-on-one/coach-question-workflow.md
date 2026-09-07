# Coach questions: author, try, compare

September 4, 2026. Development workflow responding to the owner's direction for simple coach-authored questions, movable reference positions, independent learner attempts, and a discussion of the differences.

## What the workflow does

`src/one-on-one/CoachQuestionLab.jsx` exports a component accepting `{ initialDraft, onOpenDirector, playerId }`.

- Without `initialDraft`, the component opens a ready-made U11 example in learner mode. Age pills and scenario cards browse `coach-question-examples.json`. Examples are explicitly editable references awaiting coach review.
- With `initialDraft`, it creates a new coach question from the draft's opening moment. It never mutates the original draft or copies a source's correct answer.
- Coaches write a short positioning or Shoot/Pass/Carry question, choose the controlled team, and edit two separate snapshots. Starting positions set the situation; the reference represents the coach's intended answer.
- Coaches can select a player and tap the ice, drag, use a focused actor's arrow keys, or use labelled x/y controls. Arrow keys move 0.5 m; Shift reduces the adjustment to 0.1 m. Roster and form controls supply 44 px touch targets as an alternative to small rink symbols.
- The reference edits only the controlled team. Other-team movements on the starting board also update the reference's shared context, so learners are not compared against a secretly different opponent setup. Changing the controlled team resets the reference to the starting snapshot.
- A coach must explicitly save the prompt, reference and non-empty explanation. Action questions require a preferred action or a rubric with acceptable alternatives. Holding the original positions is allowed when the coach explains it; the UI makes an unchanged reference visible.
- The learner receives a separate copy of the starting layout. They move only the controlled team, add a short reason (typed or from an editable wording starter), and choose an action for action questions. Reference positions and explanation are withheld until Compare.
- Compare displays the learner and reference side by side, the two explanations and choices, an optional reference-ring overlay, and an optional table of per-player position differences. Distances are measurements only: no match threshold, correctness percentage, pass mark, goal/save grade or tactical certification is inferred.

The full rink editor callback receives a copy of the currently selected static coach snapshot. Root owns the integration that opens Coach Lab and supplies an updated starting draft on return.

## Authoring and provenance contract

The portable record has `version: rinkreads-coach-question-v1`, ID, title, age band, prompt, `type: position|action`, controlled team, `initialDraft`, `referenceDraft`, coach explanation, optional preferred action (`shoot|pass|carry|null`), source reference, and `status: example-for-coach-review|coach-authored`.

Both draft snapshots use the existing director format: canonical centred metres, finite rounded-rink-bounded positions, stable matching actor IDs/teams/roles, one time-zero position key, unfrozen actors, duration 8, and `development-not-validated` status. Their puck owner is the same. A snapshot captures a point in time; it does not invent a path or claim to preserve a source timeline as an animation.

New authoring records also carry `answerStatus: draft|authored-reference`, a revision, and `certification: not-certified`. Any coach edit invalidates the saved-reference flag and clears the in-progress learner attempt. An attempt records the question ID and reference revision so comparison cannot silently use a later answer key. No source grading or approval fields are inherited.

Optional rubric:

```json
{
  "mode": "forced or open",
  "mustNotice": ["Observable cues the learner should consider"],
  "acceptableActions": ["shoot", "carry"],
  "avoid": ["Reasoning patterns to revisit"],
  "followUpCue": "What the learner should read next"
}
```

For positioning questions, `acceptableActions` may be empty; positioning considerations belong in the cue fields. An open rubric allows multiple defensible choices. A preferred action is a coach reference, not the sole automatic definition of sound judgment. The comparison shows these observation criteria and the next cue without converting them into a geometric score.

Coaches can add, edit or remove these criteria in the optional Observation criteria panel. Wording/type presets clear previous criteria instead of silently retaining an unrelated rubric. Saving trims blank cue lines but never invents an action choice.

## Optional AI opinion

Only the explicit **Ask AI coach** button sends a submitted question/attempt to `judgeClient.js` and the local `/__practice/judge` endpoint. The payload contains the allowed prompt/age/source note, two snapshots, coach explanation, preferred action, optional rubric and learner draft/reason/action. Extra saved-record metadata is omitted.

The panel renders the server's returned reasoning and cue, including plausible-alternative or needs-coach-review outcomes. It does not create a local fake judgment. If the backend is unconfigured or unavailable, the returned explanation is shown and no AI result is claimed. API keys and backend configuration are owned by the separate server integration. This component neither stores nor asks for keys.

## Local storage

- Saved question records: `rinkreads_coach_questions_v1:<playerId>` (most recent 40).
- Submitted learner attempts: `rinkreads_coach_attempts_v1:<playerId>` (most recent 40), stored separately from source/reference questions.
- Import accepts one JSON question up to 1 MB and validates before replacing the current question. Export preserves both snapshots and source/reference status.
- Malformed saved question entries are skipped. Unknown teams/actions, nonfinite/out-of-bounds poses, changed identities, non-static snapshots, hidden half-view actors and inconsistent opponent context are rejected.
- This is device-local preview storage, with no server account persistence, marks in the Game Sense Score, or inferred training-transfer claim.

## Root integration — September 5

U9 shows facing arrows with Turn left/Turn right buttons in 45-degree steps; U11+ also exposes degrees. U7 keeps the simpler treatment. Comparison reports shortest-angle difference descriptively. All example goalies are in front of the goal line. Home remains navy/circle and Away gold/diamond in 2D and 3D. Active player identity reaches all storage and source-scenario paths.

Root verified pointer/keyboard movement, U9 turns, explanation, save/reopen/compare, missing-input messages, 390 px layout and the real unavailable-AI response. Core tests cover example ages/goalies, immutable attempts and ungraded position/angle comparison. No live configured AI or physical iPad test is claimed. See `verification.md` for the final integrated evidence; the implementer's earlier boundary below is retained historically.

## Verification boundary at initial implementation

Nine tests in `coachQuestionCore.test.mjs` pass: snapshot/attempt immutability, distance-only comparison, explicit-save requirements, position/action/identity validation, controlled-team restrictions, absence of inherited source grades, saved JSON recovery, open rubric alternatives, two valid ready-made examples per age, and cue-line normalization. JSX/CSS bundling and React server rendering of default example and coach authoring views also passed. Browser drag/touch/focus/save/reopen/compare verification belongs to the integrating root task. An actual configured AI judgment was not available to this implementer; only the real client integration is connected.

This workflow is one question and its comparison. The separate U11 `ReadSequence` now provides three connected reads; it does not silently chain these static examples.
