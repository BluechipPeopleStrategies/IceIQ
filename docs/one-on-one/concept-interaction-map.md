# RinkReads concept-to-interaction map

**Status:** source inventory and coach-review planning map
**Date:** 2026-09-05
**Machine-readable companion:** `docs/one-on-one/concept-interaction-map.json`
**Ready-made examples:** `src/one-on-one/coach-question-examples.json`

## What this map does

The play sequence is the organizing unit. A sequence may pause for a player to reposition teammates, choose an action or target, predict the next authored movement, fix a mistake, order recalled cues, or explain a decision. Existing multiple-choice and true/false questions remain useful when one answer is genuinely forced by the visible state. They are not the default container for every concept.

This inventory covers all 12 substantive files in `docs/library/` (everything except `_TEMPLATE.md` and `INDEX.md`). It distinguishes three things that must not be collapsed:

1. A **source note** states a hockey principle and its evidence boundary.
2. An **authored board** gives that principle concrete positions, teams, net direction and a frozen decision moment.
3. An **authored movement sequence** exists only when a coach or approved play explicitly supplies positions over time. Text such as “the defender gets beat” or “the goalie is late” does not create a trajectory by itself.

The 12 JSON examples are static director drafts: eight positioning comparisons and four action prompts. Every actor has one key at `time: 0`, both snapshots use the same actor identities and puck owner, and opponents remain fixed between the learner and coach reference. The reference is a coach-authored comparison, not an automatically certified ideal position. Learners explain why; the current comparison must not emit a score, pass/fail result, or transfer claim.

The latest UI handoff calls for BlueChip navy `#0B1A33`, gold `#C9A24B`, bone `#F5EFE6`, Playfair Display headings and Inter body text. Hockey cues still require shapes, labels or patterns so color is never the only answer signal.

## Curriculum interpretation

The age bands and depths below come from `src/data/curriculum-ledger.json` version 3.1.0:

- **I — introduced:** controlled, closed conditions.
- **D — developing:** game-like repetitions with light pressure.
- **M — mastery emphasis:** more options at predictable tempo.
- **R — refinement:** random or opposed conditions at speed.

“Prerequisites” in this map are working authoring dependencies inferred from the ledger definitions and source notes. The ledger does not currently encode prerequisite edges, so these are not promoted claims or a hidden curriculum graph.

## Complete source inventory

| Source note | Concept, working prerequisites and ledger age fit | Best interaction and concrete scenario | Movement/source boundary | Wired now and next use |
|---|---|---|---|---|
| `scanning.md` | **scanning**; foundational input gate, with reading-the-play as the next use. U7 I, U9 I, U11 D, U13 M, U15/U18 R. | **Freeze → read → reposition → explain.** U7 2v1: after looking away from the puck, move `YOU` from the crowded middle lane to visible open ice. | The note defines looking and cue acquisition but supplies no coordinates or head-turn animation. The example positions are newly authored and static. | Raw note is searchable in Practice Library; six guided scanning lessons exist. Example: `coach-example-u7-scan-open-ice`. The U9 connected draft now asks the learner to notice a teammate, defender and space before choosing pass or carry. It does not measure a shoulder check.
| `off-puck-support-offense.md` | **off-puck-support-offense**; working dependencies: scanning, reading-the-play and passing-lane awareness. U9 I, U11 D, U13 M, U15/U18 R. | **Freeze → reposition or plan support route → explain.** U9 coach example: move `YOU` out of a blocked line. U9 and U11 connected read three: plan the actual off-puck attacker's path from the selected branch. | The note includes an approximate lane-clearance authoring reminder, not a universal graded distance. The connected-read route preview follows the learner's points while other actors and the puck stay frozen; it does not validate skating or predict a defender response. | Raw note, an animated play and six guided support lessons exist. Example: `coach-example-u9-support-window`. U9 and U11 read three support tap/numeric route points, preview and saved explanation. U9 uses generic visible players and a simpler pass/carry opening. Coach Lab player-route authoring is implemented and locally browser verified; publication pending; timed pass transfers remain unbuilt.
| `defensive-angling.md` | **angling-steering**; working dependencies: reading-the-play, defensive-side positioning and usable skating stance. U9 I, U11/U13 D, U15 M, U18 R. | **Freeze → reposition → counterfactual.** U9 1v1: place `YOU` inside the carrier so the middle path to the left net is covered and outside ice remains. | “The attacker threatens middle before the freeze” is a required authored cue. The prose alone does not say where the attacker skated from. | Raw note and animated angling play exist. Example: `coach-example-u9-angle-wide`. Next use: flip carrier side and verify the learner flips the angle rather than memorizing a rink coordinate.
| `dz-breakout-retrieval-under-pressure.md` | **breakout-and-regroup**; working dependencies: scanning, reading-the-play, puck control and safe net-side orientation. U11 I, U13 D, U15 M, U18 R. | **Watch authored commitment → pause → choose action/target → explain.** U11 2v2: with F1 committed below the left net, choose `carry` behind the net away from pressure. | The note describes commitment and escape but does not provide metres or timing. The ready example is a frozen post-commitment board. Animated playback must use explicit authored keys or the existing validated play. | Raw note and `DZ_BREAKOUT_ESCAPE_PRESSURE` are in the catalog. Example: `coach-example-u11-retrieval-away`. Planned siblings in the note remain planned, not completed coverage.
| `forecheck-pressure.md` | **forecheck-pressure**; working dependencies: angling-steering, scanning and time-and-space. U11 I, U13 D, U15 M, U18 R. | **Freeze → reposition → watch authored response → compare.** U15 3v3: angle `YOU` from inside so the middle is removed while the reverse stays visible. | The note requires an authored pressure angle; speed alone is not the answer. No automatic carrier response may be inferred from the static source. | Raw note and two animated forecheck plays exist. Example: `coach-example-u15-forecheck-angle`. A later sequence can branch to a reverse only after the carrier’s turn-back is explicitly authored.
| `gap-control.md` | **gap-control**; working dependencies: reading-the-play, defensive-side positioning and backward-transition readiness. U11 I, U13 D, U15 M, U18 R. | **Freeze → reposition → compare reasons.** U11 1v1: place `YOU` goal-side and inside while retaining the ability to adjust. | The sources support protecting centre ice and staying ready; they do not supply one universally correct metre gap. Position comparison therefore stays descriptive and ungraded. | Raw note, two animated gap plays and six guided lessons exist. Example: `coach-example-u11-gap-inside`. Future movement must be explicitly keyed to a carrier speed/direction cue and checked separately.
| `odd-man-reads.md` | **odd-man-reads**, with scanning, decision-making, puck-carrier-options and off-puck support. Formal ledger node begins U11 I, then U13 D, U15 M, U18 R. The note contains simpler U7/U9 language, but those uses remain positionless reading prerequisites rather than formal systems instruction. | **Pause → select receiver/space or reposition support → explain.** U7 prerequisite: after the other player moves toward the puck, move `YOU` into separate open ice. | The source requires visible defender commitment before a freeze. An opponent’s future intent must never be guessed. | Raw note, several animated 2v1 plays and six guided odd-man lessons exist. Example: `coach-example-u7-find-open-teammate`. Use forced questions only when one lane is objectively removed; otherwise use an open rubric.
| `backcheck-recovery.md` | **backcheck-recovery**; working dependencies: transition reads, scanning and defensive-side positioning. U11 I, U13 D, U15 M, U18 R. | **Freeze → reposition → explain assignment.** U13 3v2: D1 has the carrier; move `YOU` through the inside support lane instead of chasing the puck. | The source is spatial and objective but has no authored skate path. “Backchecking” identifies the role, not a generated animation. | Raw note and an animated play exist. Example: `coach-example-u13-backcheck-inside`. Next use: change which support is inside and require the recovery lane to change.
| `backcheck-recovery-defender-gets-beat.md` | **backcheck-recovery** refinement; same working dependencies, plus live responsibility recognition. Ledger U11 I through U18 R; this layered 3v3 example is U18. | **Pause after explicit beat → fix position → compare responsibility.** U18 3v3: D1 is behind the carrier and D2 has support, so move `YOU` into the carrier’s inside route. | The beat is stated and drawn as the frozen current condition. No path or collision is inferred from the short source note. | Raw note and an animated variant exist, although the existing play points to `docs/scenario-family-standards.md` rather than this focused note. Example: `coach-example-u18-backcheck-next-defender` closes that provenance seam for the new coach question only.
| `two-on-one-pass-lane-removed.md` | **odd-man-reads** plus decision-making, puck-carrier-options and shooting. Formal odd-man ladder begins U11; source language has a younger wedge. | **Pause → choose action → explain visible lanes.** U13 2v1: D1 is on the pass line while the shot route is clear, so the forced reference action is `shoot`. | This is a forced read only because this authored board separates the two lanes. The note does not make shooting correct in every 2v1. | Raw note, animated variant and guided use exist. The older play’s sourceRef still points to the family plan; this example cites the focused note: `coach-example-u13-2v1-pass-removed`.
| `two-on-one-goalie-late-after-pass.md` | **odd-man-reads**, shooting and time-and-space; working prerequisite: a completed lateral puck movement that is explicitly represented. Formal odd-man ladder begins U11. | **Pause after authored pass → choose action → explain goalie position.** U15 2v1: puck is already on `YOU`, goalie remains toward F1, reference action `shoot`. | The static example does not invent the pass or a goalie slide. It begins after the pass, and no goal is guaranteed. An animated sequence must carry the pass and goalie keys. | Raw note, animated variant and guided use exist. Older variant cites the family plan; focused example is `coach-example-u15-2v1-goalie-late`.
| `two-on-one-support-too-flat.md` | **odd-man-reads**, off-puck support, decision-making and time-and-space. Formal odd-man ladder begins U11; the open layered example is U18. | **Pause → choose action → free explanation → counterfactual.** U18 3v2: D1 partly covers the shot, F2 is wide/behind/marked, and F3 has nearby pressure. Carry is the coach reference, while a justified pass or shot remains discussable. | “Available is not automatically dangerous” is the source principle. It does not create one universal action. The open rubric records cues and acceptable actions without an automated grade. | Raw note, animated variant and guided use exist. Older variant cites the family plan; the new open example is `coach-example-u18-layered-support-read`.

## Interaction parity across the existing app

| Interaction | Sequence role | Suitable sources | Current boundary |
|---|---|---|---|
| Reposition controlled actors | Pause at a state, let the learner express spacing/assignment, compare with the coach reference, then explain. | Scanning, support, angling, gap, forecheck, backcheck, odd-man support. | Coach-question drafts support this now. Position differences are descriptive; no single coordinate is certified as correct.
| Draw route or pass | Record an explicitly chosen path from the current state, then preview it for discussion. | Breakout, forecheck reverse, backcheck lane, support reoffer. | U9/U11 read three supports up to 12 points after the actual Start, tap/numeric Add, Undo/Clear, polyline preview and saved ungraded reflection; only the chosen off-puck marker moves. Coach Lab player routes are implemented and locally browser verified; publication pending: 3D whole-rink/broadcast or SVG board/numeric points become timed director keys only on Apply. Other actors follow their existing keys. Cancel and one-step applied-route Undo are available. Timed pass transfers remain unbuilt.
| Select receiver or puck target | Express who/where receives the next puck action. | Odd-man, support, scanning, breakout. | Existing scenario/rink question types already score their own target geometry. Preserve those scorers; coach-question `action` does not replace receiver selection.
| Predict next movement | Pause only after a committed movement or constraint is visible, then ask what authored lane/space changes next. | Odd-man defender commitment, forecheck turn-back, backcheck responsibility change. | Existing predict-next animated content remains. Do not ask what an opponent “will” do from unknown intent.
| Spot and fix a mistake | Show the authored mistake state, identify the cue, then reposition or choose the repair. | Flat support, gap backing in, puck chasing, missed backcheck lane. | Existing mistake/verdict questions remain available; coach positioning adds an explainable correction, not a replacement scorer.
| Free explanation | Capture the learner’s reason and compare it with the coach’s cue list and explanation. | All 12 notes. | Coach questions require a reason and return no correctness score.
| Compare or counterfactual | Change one load-bearing cue and ask how the decision changes. | Defender takes shot vs pass, goalie square vs late, support marked vs free, first defender recovered vs beat. | The completed U11 sequence offers an original/changed opening freeze: only D1 moves from the shot lane into the pass line. Learners save a new action and reason alongside their first answer, without a grade or invented fourth consequence. More authored variants remain planned.
| Multiple choice / true-false | Check recognition when the frozen state has one defensible answer. | Pass lane removed, committed retrieval side, simple young scan. | Existing library and guided scorers remain authoritative. Use sparingly for forced reads, not open judgments.
| Recall / order | Reconstruct cue order after a sequence: scan, identify constraint, act, re-scan. | Scanning, breakout, odd-man and transition. | Existing sequence questions retain their scorer. Optional U9/U11 recall derives three exact freezes from the completed chosen branch. U9 fixes its opening; U11 reorders all three. Touch/keyboard moves, larger pictures, factual captions, optional reasons and assisted-order records check chronology only. Final support and changed-cue states stay separate. See `connected-read-recall.md`.

## Coach Lab player-route implementation

**Implemented and locally browser verified; publication pending.**
[Coach Lab player routes](coach-skating-routes.md) records the controls and helper
contract. A coach selects an unfrozen player and captures the current director
moment as Start, then adds up to 12 destination points and a finish time. The
whole-rink and broadcast 3D views, SVG rink board and numeric Add form share the
same canonical metre coordinates. Pending Undo/Clear, Cancel, preview/progress
inspection and reduced-motion manual inspection precede Apply.

Apply replaces the selected player's keys at and after Start, preserves an exact
sampled Start anchor and all earlier motion, and holds the endpoint through the
draft end. Other players retain their own keys; puck ownership is unchanged.
The default keeps the sampled facing direction. Optional turning blends facing
between keys toward each incoming segment bearing and does not track the puck.
One-step **Undo route** restores the prior draft until another edit; the existing
Save draft/Export controls retain applied movement. Animate play follows these
keys; live practice starts from the initial setup and uses its own movement.

Teaching uses come from [off-puck support](../library/off-puck-support-offense.md)
(open ice and usable passing lines),
[forecheck pressure](../library/forecheck-pressure.md) (pressure angle and visible
outlets), [backcheck recovery](../library/backcheck-recovery.md) (inside support
threat), [defender gets beat](../library/backcheck-recovery-defender-gets-beat.md)
(an explicitly shown responsibility change),
[defensive angling](../library/defensive-angling.md) (inside approach), and
[retrieval under pressure](../library/dz-breakout-retrieval-under-pressure.md)
(carry direction after visible commitment). These notes supply discussion cues,
not route coordinates or timing. The static ready-made questions stay static;
new source-specific movement still needs explicit authoring. This tool adds no
route grade, skating validation, inferred opponent response or pass transfer.
Timed pass authoring remains future work.

## U9 three-read sequence implementation

The age picker now includes **U9 · Find space**, authored in
`readSequenceU9.js`. Its opening offers Pass or Carry with neutral prompts about
the teammate, defender and space. Each action leads to two next choices, giving
four distinct outcomes: pass back, teammate carry, pass after carrying, or keep
carrying. Possession and the final support actor follow the chosen path. Only
YOU is tagged on the ice; generic actor names support the short prompts and
accessible descriptions. Optional user-triggered read aloud and brief reasons
reduce the reading burden without claiming to measure scanning.

Read three supports placement or the shared support-route planner, followed by
a short explanation. Completed U9 reflections save/export separately from U11;
unfinished choices and reasons survive age switches in memory while the view
stays open. U9 adds no AI review or changed-cue comparison. Its source notes are
`scanning.md`, `off-puck-support-offense.md`,
`two-on-one-pass-lane-removed.md` and `two-on-one-support-too-flat.md`, with simpler
spacing than the U11 draft. Exact four-path and persistence boundaries:
`u9-read-sequence.md`. This is a coach-review draft, not promoted curriculum or
validated skating.

## U11 three-read sequence implementation

The first sequence is implemented in `ReadSequence.jsx` and is the default shared Practice Hub view. Action plus explanation leads to an authored pass/carry/shoot branch, a branch-specific target decision, and an off-puck placement or support-route read with a free explanation. Completed reflections save per player. Optional AI is available only for completed direct placements and requires a configured server key, currently absent; the final-position AI panel is hidden for route reflections. Exact implementation sources and verification: `u11-read-sequence.md`. The concept progression below records the broader teaching intent.

The dedicated U11 route controls begin at the branch-specific off-puck player's
actual position, shown as Start with text coordinates. Learners add up to 12
points after Start by tapping or entering both coordinates and pressing **Add
point**; blank numeric entries are rejected. **Undo last point** and **Clear
route** edit the path. The numbered polyline preview follows each segment while
other players and the puck stay frozen. Pause/progress controls support
inspection; reduced motion uses manual **Inspect my route**. The completed v1
reflection saves and exports the route, final point and reason, and older v1
reflections without routes still reopen. Mode toggles preserve a temporary route
until a direct placement edits the position. This source-bound discussion of
space and passing lanes adds no validated skating, defender reaction or route
grading claim. Coach Lab's separate player-route authoring is locally implemented
as described above; timed pass transfers remain future work. Optional actual-branch recall is implemented after completion; it checks the order of the three authored freezes and records assistance separately from tactical judgment.

**Concept spine:** scanning → odd-man read → goalie/time-and-space check → off-puck support.
**Source notes:** `scanning.md`, `odd-man-reads.md`, `two-on-one-goalie-late-after-pass.md`, `off-puck-support-offense.md`.

1. **Read the defender.** Start from an explicitly authored 2v1 rush state. D1 commits enough to affect the carrier’s shot route while F2 remains separated. Ask the puck carrier to identify the defender cue and choose the next action/target. If the learner passes, the next state explicitly changes puck ownership to F2. If the learner shoots or carries, that choice enters a different authored state or an honest reset; the sequence must not pretend the pass happened.
2. **Receiver checks the goalie.** This beat exists only on the pass branch. Show the pass completed, F2 in possession and the goalie’s authored current alignment. Ask the receiver to choose or explain the next action. “Goalie late” must be visible from position/orientation or stated as the frozen condition; the sequence does not guarantee a goal.
3. **Off-puck player finds the next support position or route.** After read two, use the highlighted off-puck attacker from that exact branch, which may be F1 or F2. The learner places that player or plans a route and explains the lane or space they want to use. A loose-puck state must already be explicitly authored by the chosen branch; the learner's support route does not create a shot, save, rebound or new puck possession.

The sequence supports selection, positioning, bounded support-route planning and explanation inside one state machine. Future recall/order can follow the play: **read defender → check receiver/goalie picture → become the next off-puck option**. MC/TF may test a single forced cue inside a beat, but the branch state carries the teaching logic.

## Evidence and approval boundary

- These examples are `example-for-coach-review`; they are not promoted curriculum, approved tactical claims or automated grading rules.
- Source URLs are copied only where the note already supplies them. No external source was refreshed for this map.
- `gap-control.md` names USA Hockey *Skill Progressions for Youth Hockey* (2019), Hockey Canada U11/U13 Player Pathways and Sacilotto’s “7 Rules of Defensive Hockey.” `scanning.md` names the 2024 SHL/SDHL scanning study (`J. Sports Sci. 2024.2433899`). `off-puck-support-offense.md` names Hockey Canada LTPD and IIHF small-area research. Other short notes provide principle text without a direct external citation.
- The curriculum ledger’s lineage fields remain thin for several concepts, including forecheck pressure. This map exposes that limitation rather than upgrading a source note into an approved claim.
- Future automatic movement needs explicit coach-authored keys or a validated existing play. A static note or reference position never becomes physics authority.
