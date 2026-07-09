# RinkReads Animated Kernel Standards

These standards apply to animated RinkReads play kernels.

## Label Rules

Use one label per actor. Never show the same label both inside and outside the token.

- U7 and U9: outside labels only.
- U11 and U13: interior token labels only, including a single clear YOU marker.
- U15 and U18: minimal diagram labels; no duplicate labels.

## Motion Rules

Skate routes are transient. They may support the movement animation, but they should not remain visible at the decision freeze point unless they are essential to the read. The freeze moment should emphasize the decision cue, not every path that created the scene.

Every line must teach a specific idea.

- Skate route: thin navy line, no arrowhead.
- Pass: dashed line with arrowhead.
- Shot: bolder line with arrowhead.
- Covered or blocked lane: gray dotted or segmented line, no arrowhead.

Do not use motion graphics as decoration.

## Answer-Reveal Rules

Do not reveal the correct answer before the learner chooses.

Gray dotted lanes mean an option is covered or unavailable. They do not mean correct answer.

Pass and shot arrows should appear when they teach the current or revealed outcome, not as accidental hints.

## Freeze-Point Rules

At the question moment:

- the decision actor must be clear,
- the puck must be visible but not dominant,
- the defender commitment must be visible,
- the open support option must be readable,
- the scene must not rely on color alone.

## Terminal-State Rules

Terminal states should confirm the outcome cleanly. Avoid oversized arrows, floating rink text, or new clutter.

## Accessibility Rules

Meaning must be carried by shape, label, pattern, spacing, and motion. Color can support meaning but must never be the only cue.


## Freeze Marker Rule

Freeze markers should not show unexplained numbers inside the rink. Use the ring or visual emphasis to show the decision point. If sequencing is needed later, explain it outside the rink, not as a loose number on the play surface.


## Animation Runway Rule

Some reads need more rink distance before the freeze point. Do not simply slow every animation. Instead, give the scene enough entry runway so pressure, recovery, gap, or support movement develops before the decision.

The freeze point should preserve the integrity of the read:
- the key cue is visible,
- spacing remains realistic,
- the correct answer is still objective,
- the learner is not forced to decode decorative movement lines.

## Film-Room Symbol Rule

For U15/U18 diagram views, X/O symbols must support team/read clarity.

- X should represent the defending, checking, or pressure responsibility when that is the learner's role.
- O should represent the attacking or puck-possession side.
- The decision actor can still be labeled YOU, but the symbol must not imply the wrong team responsibility.

## Question Reveal Rule

Do not let the freeze state reveal the correct answer.

For spatial decision scenarios:
- the freeze frame should show the problem, not the solution;
- answer options can describe possible movement destinations or reads;
- each selected answer should trigger its own consequence animation;
- route/consequence animations should appear after the learner chooses.

This is especially important for recovery, support, pressure, and route-selection scenarios.


## Route-Choice Neutrality Rule

Route-choice scenarios must use neutral titles and neutral starting questions.

Avoid titles like "Pick up the middle" when the correct answer is the middle lane. Use neutral labels such as "Choose your lane," "Recover into the rush," or "Read the pressure."

At the freeze point, do not place a marker on the correct destination. The learner should see the situation, choose a route, and then see the route/consequence after selecting an answer.


## Young Player Interaction Rule

For U7/U9 route-choice scenarios, prefer tap-to-pick spots or large path cards over text-heavy answer choices.

Use tap zones when the question is spatial:
- where should you go,
- which lane should you take,
- where should you support,
- where should you pressure.

Keep text buttons as a backup, but the primary interaction should feel like choosing a path on the rink.


## Young Label Translation Rule

U7/U9 should not use tactical shorthand like A1, A2, D1, F1, or F2 when a role label is clearer.

Use child-readable labels:
- puck carrier = Puck
- open opponent/support option = Open
- teammate help/checker = Help or Helper
- opponent defender/checker = Checker
- goalie = Goalie

Older age bands can keep film-room shorthand when appropriate.


## Light Question Screen Rule

Young-player screens should reduce cognitive load before the answer.

For U7/U9:
- Use one short question.
- Use player-facing labels like YOU, Puck, Helper, Open, and Goalie.
- Do not label every checker if the rink becomes crowded.
- Answer choices should match what appears on screen.
- Coaching explanation should come after the player chooses.
- The rink should show the problem, not reveal the solution.

For older groups:
- More tactical language is acceptable, but answer text and rink labels must still match.


## Internal ID Safety Rule

Do not globally replace internal actor IDs such as F1, F2, D1, A1, A2, or BC1 inside play data.

Those IDs are used by coordinates, motion paths, puck ownership, and decision logic.

Young-player wording should be handled through:
- youngT
- youngQ
- player-facing display helpers
- renderer-level translation

Internal IDs must remain stable.


## Answer Reveal Rule

After a player chooses an answer, the teaching moment should be short and visual.

Reveal cards should:
- Name the selected action in player-facing language.
- Show a short Why / Coaching point.
- Avoid F1, F2, D1, A1, A2, and BC1 language for U7 through U13.
- Explain wrong answers without overwhelming the screen.
- Use the rink animation as the main teacher and the text as support.

Correct answers should include `why` or `youngWhy`.
Wrong answers should include `no`, `why`, `youngWhy`, or `outcome`.


## Secondary Question Cue Rule

A second question must show a new visual cue before asking for a new decision.

Bad pattern:
- Player passes to a teammate.
- App immediately asks the teammate what to do.
- Nothing visibly changes.

Good pattern:
- Player passes to a teammate.
- Defender remains committed or removed from the lane.
- Goalie is shown late, sliding, or not square.
- A simple cue such as "Shot lane open" or "Open net" appears.
- Then the app asks the second question.

The second question should never feel like a disconnected quiz. It should feel like the next visible read.


## Second Question Must Show New Read Rule

A follow-up question should only exist when a new visible cue changes the decision.

Do not ask a second quiz question just because possession changed.

Bad pattern:
- Player passes to teammate.
- Teammate now has puck.
- App asks another question.
- No visible defender, goalie, lane, timing, or pressure cue changes.

Good pattern:
- First question asks for the main read.
- Correct answer reveals the consequence.
- If there is no new cue, the next node is terminal.
- If there is a second question, the node must include:
  - `reRead: true`
  - a visible `cue` or `showCueOnQuestion`
  - a clear change in pressure, lane, goalie position, support, or timing

A second question should feel like the next visible hockey read, not a disconnected quiz.


## Cue Label Size Rule

Cue labels should support the read without covering the play.

For U7 through U13:
- Use short labels like "Open", "Lane", "Middle", "Wall", or "Help".
- Avoid long cue labels like "Quick shot lane" on the rink.
- The cue marker should not cover the puck carrier, support player, goalie, or defender.
- The cue should point attention to the read, not become the main visual.

For U15/U18:
- Slightly more tactical cue language is acceptable, but it should still stay compact.


## Prototype Telemetry Rule

Prototype telemetry must capture the actual player-facing experience, not only the raw play data.

Telemetry snapshots should include:
- play id
- node id
- age band
- displayed question text
- displayed answer option text
- displayed reveal / coaching text
- displayed cue label
- correct option id
- terminal state
- question signature

The question signature must change when player-facing question, answer, reveal, or cue text changes.

For U7 through U13, telemetry snapshots should not contain F1, F2, D1, A1, A2, or BC1 shorthand unless that shorthand is intentionally displayed and taught on the screen.

Run:
- `npm run test:prototype-telemetry`
- `npm run report:prototype-telemetry`


## Scenario Family Rule

Animated plays should belong to a scenario family.

A scenario family defines:
- the decision pattern being trained
- the meaningful cue changes
- the progression from base read to advanced variant
- the common mistake patterns
- the planned target number of variants

New plays should not be random one-offs. They should either strengthen an existing family or intentionally start a new family.

Run:
- `npm run test:scenario-families`
- `npm run report:scenario-families`


## Next Variant Queue Rule

The factory should recommend the next scenario variant before generating more plays.

The next variant should:
- belong to a scenario family
- change one meaningful hockey cue
- identify the correct read
- identify the common mistake
- define whether it is a single question, route choice, or re-read
- avoid disconnected follow-up questions

Run:
- `npm run report:next-variants`


## Bulk-Assisted Creation Rule

Bulk-assisted scenario creation must be controlled.

Current batch size limit: **3 plays**.

Before generating a batch, create or reference a batch plan using:

- `docs/factory/bulk-batch-template.md`

Before committing a batch, run:

- `npm run check:bulk`

A batch should not be committed unless:
- play catalog tests pass
- factory standards pass
- prototype telemetry passes
- scenario family tests pass
- reports regenerate
- production build passes
- manual playtest review is completed for U7/U9, U11/U13, and U15/U18

Do not increase batch size until two consecutive 3-play batches pass cleanly.

## Watch Chain Rule

A watch node (`autoNext`) plays a segment with no question, then advances.

- Watch chains are 1-3 nodes and must end at a question or a terminal node.
- A watch node must not carry `ask`.
- U11 always watches a chain through once. U13 and older get a
  "Skip to the question" affordance on replays only.
- Watch chains exist to set up verdict and spot-mistake reads. They are not
  decoration; every watch node must show something the question needs.

## Verdict Voice Rule

Verdict questions judge the read, never the player.

- Copy says "the read", "the play", "the shot" - never "you were wrong".
- The watched skater is a neutral third player (F1), not YOU.
- U11 verdicts use two options. U13 may add a third option flagged
  `u13Only: true` (for example "Right idea, wrong timing").
- Every verdict includes a justify step whose options each carry an
  `evidence` field naming a visible actor. No abstract justifications.

## Prediction Reveal Rule

Predict-next questions treat a wrong prediction as information, never a fault.

- The freeze (occlusion point) must show the problem, not the solution, and
  the correct continuation must be objective from visible cues.
- All options route to the same `truthNext` node; the truth plays regardless
  of the prediction.
- The reveal frame is "You predicted X. Watch what actually happens." No red
  flash, no "wrong" framing. The option's `why`/`no` copy explains the cue
  that signaled the true outcome.
- Predict-next is available at U13 first. U11 rollout waits for a telemetry
  review of U13 sessions.
