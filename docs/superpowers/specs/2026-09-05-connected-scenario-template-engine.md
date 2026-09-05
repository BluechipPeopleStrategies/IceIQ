# Connected scenario template engine

**Date:** 2026-09-05. **Status:** bounded implementation proposal; no new tactical certification or promotion authority.
**Owner intent:** reusable scenes with simple choices, direct placement and reasons, eventually supporting hundreds of useful situations.
Thomas's latest example: “Like that drag option, and then do that in a 3-on-3 setting, and then we isolate one player and go, Where should this player be?”
Also support “Stay here / Move back / Move forward”, followed by “Why?”. These are input formats, not universal right answers.
**Latest extension:** start at 1v1 and build to 5v5; U7 also gets visual rink questions such as “Where is a faceoff circle?” and “Where is a blue line?”.

## Implementation checkpoint

The positioning core, 640-entry draft selector, shared 3D/tactical scene, one-player input, three connected reads, paused restore/export and four-question U7 tour are implemented as a review prototype. Fresh 1v1 opens configuration 009: all 27 offered button paths can be illustrated, without treating them as equally good hockey decisions. Other candidates retain explicit illustration guards.

The sections below describe the target contract. Still planned: input-method/choice-ID records, per-session pinned source hashes, a representative-card/search catalog, completed-attempt replay, wider age adaptation and validated tactical/physics/AI promotion. The current UI uses a situation selector; its continuation progress control replays the current event only. 4v4/5v5 currently add context to the same support family and are not independently certified team-system lessons. See the [measured benchmark](../../one-on-one/sgs-benchmark.md) and [visual/browser review](../../one-on-one/sgs-visual-review.md) for actual evidence.

## Authority and existing foundation

- [Owner decisions](../../factory/SCENARIO-ENGINE-DECISIONS.md) and the [canonical engine design](2026-07-29-scenario-engine-design.md) remain authoritative.
- Reuse `src/scenario-engine/generator/parameterSpace.js` for declared meaningful axes, finite enumeration and reproducible seeded selection.
- Reuse canonical rink profiles, hashes, source dependencies and existing supported physics validators; add adapters instead of another coordinate system.
- Existing `readSequenceCore.js` registers three authored U9/U11/U13 definitions. Its branch, saved-reflection, recall and U11 AI contracts remain unchanged.
- The new family is a separate preview catalog and positioning-session contract. Do not force arbitrary positioning into the old Shoot/Pass/Carry branch schema.
- `factoryPipeline.js` currently records deferred gates explicitly. A skipped gate is not a pass, and geometry checks alone do not certify a hockey answer.
- `compiledTeachingPlay.js` requires matching definition/trace identity, clean physics and declared/derived agreement. A discussion draft must not masquerade as that artifact.
- Existing factory events, cross-run `stateMachine.js`, Claude judgment, calibration, admission and dependency-based recall remain the only promotion path.

## Two exercise types, one presentation contract

`rink-feature-identification` and `position-and-reason` are explicit types with different feedback authority; neither can inherit the other's grading.
The U7 rink tour uses canonical rink feature IDs/geometry, a visible prompt, a gentle hint after a miss and untimed retry. Grade only the requested feature match.
Example tasks: tap a faceoff circle; tap a blue line. If several features fit the wording, every explicitly eligible instance is accepted.
Keep feature hit geometry, visible geometry and accessible labelled buttons aligned; a tap outside ice or ambiguous overlap is not a tactical judgment.
Blue lines are allowed in the explicit U7 rink-tour task. Ordinary U7/U9 half-ice positioning lessons still hide zone lines and introduce no offside questions.
Identification can use a quiet success animation and progress icons; no speed score, failure timer, inferred hockey mastery or need to type a reason.
Position-and-reason remains open coach discussion: source-grounded situations, direct placement or simple point choices, followed by why.

## First positioning catalog: 1v1 through 5v5

Default to **1v1**. Every scene displays `teamSize` skaters per team plus one goalie; only its declared `focusActorId` is selectable/movable.
The first positioning draft targets U11; other ages require checked ledger scope, cue load and copy. U7 rink identification is a separate capability.
Sources: [gap control](../../library/gap-control.md), [defensive angling](../../library/defensive-angling.md), [off-puck support](../../library/off-puck-support-offense.md), [scanning](../../library/scanning.md), and the age ledger.
These support inside positioning, usable space/lanes and reading again; they do not prove an exact chosen coordinate or measure a head turn.
The support note's legacy `0.035` normalized tolerance is not a metre, reach or pressure threshold. Every display/geometry tolerance declares its units and purpose.

| Format | Isolated player | Three connected reads |
| --- | --- | --- |
| 1v1 | D1 as YOU, defending against F1 | Position and reason; F1 carries; position and reason; F1 carries again; final position and reason. |
| 2v2 | Off-puck F2 as YOU | Position and reason; F1 carries with authored pressure; read again; second F1 carry; final support read. |
| 3v3 | Off-puck F2 as YOU; F1/F2/F3 and D1/D2/D3 visible | Position and reason; F1 carries/D1 pressures; read again; F1 passes to F3; support the actual new carrier. |
| 4v4 / 5v5 | Off-puck F2 as YOU | Same three-read support contract, with additional skaters contributing declared spacing/coverage context. |

During answers, every other actor and the puck are frozen. During continuation, only declared actors move and the learner's exact chosen position persists.
For 3v3+, the pass ends at F3's actual receiving puck offset; ownership changes only at the receive event. No F3/pass is invented for smaller rosters.
Do not say the pass arrived before it finishes. No pickup, save, goal, scoring result or possession recovery is invented.

## Small reusable contract

`ConnectedTemplate` contains versioned identity, exercise type, age scope, source dependencies, canonical profile, team size, actor roles, focus actor, parameter space, state builders, read graph, input capabilities, cue predicates and evidence limits.
`Candidate` contains template/version, parameter values, seed provenance, immutable opening state, graph and source dependencies; the factory/export path adds its existing content hash.
Candidate IDs bind semantic parameters/version; a different rollout seed selecting the same state retains its identity. A changed template needs a new version, and exported artifacts get new content hashes.
`ReadNode` binds its prompt, available inputs and observation text to the exact displayed state and controlled actor, rather than to a generic branch title.
`Transition` declares its from-node, actor paths, puck path/events, intended destination and supported validation requirements. It consumes the actual answered state.
`Answer` stores read ID/index, exact `beforeState`, controlled actor, original point, chosen point, reason and selected input/choice ID. The synchronous draft core can validate canonical serialized state; do not claim an uncomputed SHA hash.
`PositioningSession` stores candidate/template identity, phase, read index, immutable answers, current chosen point, playback progress and replay-return state.
Use a pure core such as `positioningSequenceCore.js`; the view only dispatches commands and renders returned state. No camera or renderer state enters answer data.
Resolve every command and restore against the exact registered candidate/version and canonical state binding (or verified export hash). Unknown IDs, stale source graphs and malformed data fail closed.

## Inputs and causal continuity

- Free placement: drag on the tactical board, select-and-tap in 3D, or labelled numeric controls. All use the same canonical point command.
- Position choices: “Stay here” equals the current point. Back/forward are role-relative: D1 defending the +X net has back=x+3, forward=x−3; home F2 has back=x−3, forward=x+3. Supply visible `choiceHints` and `directionExplanation`; camera rotation never changes these points.
- Choice points carry stable IDs and must be on ice and visibly distinguishable. Changing input format must preserve the selected point and reason.
- Require a short reason for each read; optional cue chips can help expression. No keyword grade, nearest-coordinate grade or automatic correct-position marker.
- A confirmed answer locks its source snapshot and point. Replay cannot replace it; a fresh attempt gets a separate identity.
- Build each continuation from the selected focus-player point. Never replay a canned state that restores the focus player to the template's starting position.
- Validate the actual continuation, including the chosen focus-player position. If it overlaps an actor, obstructs a required segment or needs an unsupported model, preserve the answer and stop with an explicit adjustment/review state.
- Mechanical invalidity is not tactical incorrectness. Never silently move the focus player elsewhere, force a possession event or mark unsupported motion physics-clean.
- A permitted illustrative transition stays labelled as authored playback; constant-time visual interpolation is not a validated skating simulation.
- Open discussion can accept different reasons/positions. Any future scored format needs a separately approved claim and evaluation contract.

## Meaningful generation and first preview catalog

The initial parameter contract targets **128 draft configurations per format, 640 across 1v1–5v5**, across defensive and off-puck-support teaching families. Distinct validated yield is measured separately.
Defensive axes cover carrier depth/width, D1 gap/inside position and successive carry advances/cut. Support axes cover carrier depth/width, F2 depth/width, D1 gap, D2 lane and F3 depth; replace nonexistent F3 with second-carry depth at 2v2.
Each axis must change a cue, available lane, support relationship or continuation; merely declaring `loadBearing:true` is insufficient evidence.
Use a documented relation/signature function plus geometric separation requirements. Exclude colour changes, renamed jerseys, camera views, mirrors and coordinate jitter from distinct-state counts.
Do not multiply ages, reads or input formats to inflate counts; a roster expansion counts as meaningfully new only when its added players change the read. Record raw combinations, rejected combinations and distinct accepted draft states separately.
Enumerate enough combinations to reach the target only after validation and deduplication; if yield is lower, report it honestly and refine the authored parameter space.
Preserve a fixed seed and boundary fixtures so the same cohort is reproducible across machines and reruns.

| Initial preview grouping | Candidate selection | What the coach can inspect |
| --- | --- | --- |
| Protect inside ice · 1v1 | Contrasting attacker approach and defender gap | Isolated D1, middle-ice context and both carry continuations |
| Space beside pressure · 2v2+ | Contrasting puck corridors and D1 approaches | All players, selected F2, actual lane and pressure changes |
| Support depth | Flat, deeper and advanced support relationships where supported | Stay/back/forward points and the same states in free-placement mode |
| Help the new carrier | Contrasting F3 receiving positions and D2/D3 coverage | Exact F1→F3 possession transfer and the changed support cue |

Start with a 1v1→5v5 format picker and 12 representative cards across those groups and a searchable “All draft candidates” list for the validated cohort.
Cards show age, candidate ID, source concept, key parameter differences and **Coach-review draft** status. Use static thumbnails; mount 3D only for the active candidate.
An opened candidate offers the shared 3D/tactical view, camera controls, three reads, replay, saved explanation and a next-candidate action.
Keep this catalog outside `bank.json`, automatic quiz admission and the legacy three-definition catalog until the established review/promotion path authorizes admission.

## Save, replay and evidence

Use separate identification and positioning-session namespaces keyed by player, candidate and template version; include format in candidate identity. Do not modify the exact legacy U11 storage key or saved bytes.
Serialize all original answers, chosen positions, current phase/progress and source identity. Restore validates allowed phases, index/answer count, point bounds, actor identity and possession chronology.
Switching candidates/ages or 3D/tactical view preserves the correct draft; Reset clears only that candidate's attempt. Download reflects actual stored answers.
Pause survives in-session navigation. Playback cleanup cancels its own clock; reduced motion supports manual progress. Recall, if added later, derives only actual visited freezes.
The new family never invokes the old U11 final-position AI payload or changed-cue comparison. Reasons remain ungraded discussion records.
Future promotion links the immutable candidate and validated trace to the existing factory run/dependency records; it does not introduce a parallel “approved” flag.

## Benchmark and acceptance

Run a reproducible **640-configuration engineering benchmark** with per-format yield and at least a 128+ candidate cohort, recording runtime/hardware, seeds, template/source hashes, elapsed time and gate outcomes.
Report separately: raw parameter sets, distinct valid draft states, question variants, physics-clean states, review-required items, Claude-approved items and promotion-ready items.
Zero approvals is a valid measured result for this first discussion-draft benchmark. It is not evidence of 100 approved lessons or hundreds-per-day production.
The canonical 200-state/200-promotion-ready throughput and audit bar remains unchanged.

Required tests before scaling the preview:
1. Each positioning candidate retains its exact 1–5 skaters per team plus goalie, unique IDs, one allowed puck owner and the same movable focus actor across all three reads.
2. Every meaningful axis has contrasting fixtures proving a changed relation; mirror/jitter/duplicate signatures cannot inflate the cohort.
3. Opening, carry, intermediate pass and receive states agree with the real selected point and puck owner; test every candidate and all offered placement choices.
4. Free-placement boundaries, “stay”, blocked continuations, exact actor overlaps, non-finite points, unknown actors and unsupported motion fail honestly without mutating locked answers.
5. Replay, pause/resume, view/candidate changes, save/restore/download and fresh attempts preserve scoped data; corrupt or cross-candidate restores are rejected.
6. Existing U9/U11/U13 golden, storage, route, recall and AI fixtures remain unchanged; no candidate is auto-added to the live bank or promoted artifact index.
7. Review representative/adversarial phone and desktop scenes for all 3–11 visible actors, readable labels, the single focus actor, goal context and scroll-safe input; inspect the entire cohort structurally.
8. Rink-tour tests cover every eligible feature, miss/retry, geometry boundaries, multiple matching circles/lines, keyboard equivalence and the explicit U7 blue-line exception without changing normal young-lesson line hiding.

## Implementation sequence

First implement the pure template/session core, explicit exercise types and the two bounded positioning families with failing-first causal/restore tests.
Then add the separate preview catalog and shared-view adapter, followed by the representative phone flows and reproducible cohort report.
Then verify the U7 untimed rink tour separately. Only later assess additional tactical families, ages, scored tactical formats or pipeline admission against the existing source, physics, judgment and promotion requirements.
