# U11 connected 2-on-1: three-read draft

**Status:** Draft for coach review
**Implemented:** September 5, 2026
**Component:** `src/one-on-one/ReadSequence.jsx`

## Purpose

This is the first short U11 exercise organized around a connected sequence instead of isolated questions. The player makes a read, watches an authored consequence of the action they actually chose, reads the resulting state, then moves an off-puck teammate and explains the support. It is untimed and does not award points.

The September 4 owner direction to build a polished U11 three-read sequence first supersedes the older roadmap note that deferred consequence chains or kept U11 to a single read. Root owns the roadmap update. This file records the decision at the feature boundary so a later continuation does not restore that stale constraint.

## The three reads

1. **Identify the cue and choose an action.** D1 sits on part of F1's route to the net while remaining beyond the F1-to-F2 pass segment; the shot lane is shaded, the pass lane is still available, and F2 is slightly flat. The player chooses Shoot, Pass or Carry and explains which defender, lane, support or goalie cue shaped the decision. The rubric is open because the geometry does not cleanly remove all but one option.
2. **Re-scan timing and space.** The rink animates a distinct authored consequence for the selected action. Pass transfers the puck to F2; its next state includes returning the puck, carrying wider, or shooting through the newly open lane. Carry keeps the puck with F1 and never inserts a pass. Shoot leaves a visible loose puck and never declares a goal. The next prompt and tappable receiver, space or action targets come from that exact branch.
3. **Help without the puck.** After the selected second target changes the state, the player drags the highlighted off-puck attacker, taps the rink, uses arrow keys, or enters bounded rink coordinates. The player explains how the position affects a lane, space or option.

The completion view repeats all three submitted choices. Local evidence describes whether the last player moved wider or toward the middle and deeper toward the attacking end or back toward centre ice. These are observable spatial changes, not a tactical score. Replay reconstructs the first selected consequence and returns to the completed state without changing any answer. A bounded completion record saves under `rinkreads_read_sequence_v1:<player scope>` and can reopen after navigation; the downloadable reflection contains the three answers and no player identity or score.

An optional **Review my final positioning** section reuses the practice judge only after all three reads are complete and only after the player presses its button. It sends the actual read-two result as both the initial and reference snapshot, explicitly labels that repeated snapshot as a comparison baseline rather than an ideal answer, and sends the final moved snapshot plus the player's final explanation. The request uses `docs/library/off-puck-support-offense.md` with an open support-lane rubric and no expected action or fixed correct coordinate. No player identity is included. When the local judge has no configured key, the existing panel reports that it is unavailable and produces no replacement grade.

## Optional comparison: one thing changes

After completion, **Try one changed cue** opens a comparison of the original opening freeze with a separate freeze where only D1's position changes. D1 moves from `(16.1, 1.5)` to `(12.05, 0.1)` metres: the midpoint of the visible puck-to-F2 segment, clearly away from the shot line. D1 keeps the same facing, and F1, F2, the goalie and puck are identical in both boards. This applies the existing `two-on-one-pass-lane-removed.md` cue without adding a new coaching rule or simulating how D1 reached the new position.

The two boards appear together on larger screens and stack on phones. The original action and reason stay visible. The learner selects Shoot, Pass or Carry and explains why they would keep or change the original choice. Any of those actions with a bounded, non-empty explanation can be recorded for discussion; the program does not decide whether the reason is tactically sound. Local text describes the changed defender position only. It does not award points, assert a goal, submit an AI request, change the original three answers, or play a consequence from the original branch as if it belonged to the changed board.

**Save my comparison** adds an optional `changedCue` record (`id`, `action`, `reason`) to the existing v1 completed reflection. The original answer remains in `first`; the comparison ID binds the revised answer to this specific changed freeze. Both answers persist in the existing device/player scope and in **Download reflection**, without a player identity or score. Old v1 reflections without `changedCue` restore normally; malformed or unknown comparison records fail restore. Comparison drafts are not saved until the learner presses Save. First-choice replay returns to the completed three-read state and preserves the saved comparison. The separate final-position AI request still contains only read three.

## Sources and authored boundary

- `docs/library/odd-man-reads.md` supplies the requirement to show defender commitment and read shot/pass space rather than guess intent.
- `docs/library/two-on-one-pass-lane-removed.md` supplies the principle that a 2-on-1 does not automatically mean pass.
- `docs/library/two-on-one-support-too-flat.md` supplies the support-alignment nuance.
- `docs/library/off-puck-support-offense.md` supplies the relationship between open ice and a usable passing lane.

The exact positions, timing, puck transfers, loose-puck location and branch transitions are newly authored illustrations. The source notes do not provide these coordinates or guarantee any outcome. Shoot does not simulate or grade a goal. The exercise does not claim skill transfer, tactical certification or an AI judgment. A coach should review the board geometry, prompts, branch outcomes and open rubric before curriculum promotion.

## Controls and accessibility

The half-rink uses the canonical director coordinate system in metres and validates every authored state with the existing director draft validator. Navy circles are attackers; gold diamonds and the gold goalie are defenders. Labels and shapes accompany color.

Read-two targets work both as large rink markers and ordinary buttons. The read-three player supports pointer drag and tap, touch through pointer events, arrow keys in 0.5 m steps, Shift plus arrow in 0.1 m steps, and numeric inputs. Positions clamp inside the rounded right half-rink. Consequence playback can be paused and resumed; replay is deterministic. With reduced motion enabled, each authored consequence advances directly to its next freeze.

## Verification

`node --test src/one-on-one/readSequenceCore.test.mjs` covers:

- distinct pass, shoot and carry consequences and puck ownership;
- branch-specific second targets and continuity into the third read;
- bounded reasons and coordinates;
- movement of only the named off-puck player;
- descriptive evidence with no score;
- deterministic replay with no silent answer changes;
- comparison geometry: D1 occupies the actual pass segment and leaves the shot line while every other actor, facing and puck state remains unchanged;
- independent original/revised answers, original three-read state and AI-payload immutability;
- comparison save/restore, legacy v1 compatibility, invalid comparison rejection and replay persistence;
- exact source-note references and draft review status.

`ReadSequence` is now the default Practice Hub view. Fifteen core tests cover branches, canonical geometry, serialization/restore, final AI payload and the optional changed-cue comparison. Three new comparison tests were run failing against the absent feature before implementation, then passed with all twelve existing tests. Prior browser testing covered pass/carry branches, pointer/keyboard movement, missing inputs, replay, completed-reflection persistence and tablet layout. Browser verification of the new comparison is recorded by the integrating task in `verification.md`; the core tests alone do not establish visual or phone acceptance. Player ID scopes the local storage key; exported reflections and AI payloads omit it. Only completed reflections are restored; unfinished sessions are not autosaved. The local AI adapter is unconfigured, so no live judgment is claimed.
