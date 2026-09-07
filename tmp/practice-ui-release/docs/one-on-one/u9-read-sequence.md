# U9 connected support: three-read draft

**Status:** Draft for coach review · September 5, 2026
**Scenario:** `u9-connected-support-three-reads-v1`
**Content:** `src/one-on-one/readSequenceU9.js`
**Shared controls:** `ReadSequence.jsx`, `RoutePlanner.jsx`

## A simpler read

U9 offers **Pass** or **Carry**, then two next choices within the selected
branch, then a support position or route with a short explanation. The initial
board shows a teammate across the ice, a defender in the middle route and
outside space. The opening prompt asks what the child wants to try; the visible
cue prompts ask where the teammate, defender and space are without naming a
correct answer. There is no timer or tactical score.

Only **YOU** is tagged on the rink. Other visual labels are blank; separate
actor names provide “Your teammate,” “The defender” and “The goalie” in prompts
and accessible descriptions. Navy circles attack and gold shapes defend.
**Read aloud** and **Stop reading** use the existing device speech feature when
available. Speech starts only when requested. A few words are enough for each
reason; a child can tell a coach the reason and have the coach type it.

## Four authored paths

The initial pass transfers possession to the teammate. The initial carry keeps
possession with YOU. Read two then produces these distinct states; origin
coordinates below are in metres and identify the support player before read three.

| First choice | Next choice / target ID | Puck after read two | Support player and route origin |
|---|---|---|---|
| Pass | Pass back to you / `return-pass` | YOU | Your teammate at `(18.5, -4)` |
| Pass | Skate into this space / `carry-space` | Your teammate | YOU at `(16, 4)` |
| Carry | Pass to your teammate / `pass-teammate` | Your teammate | YOU at `(17.5, 6)` |
| Carry | Keep skating into this space / `keep-puck` | YOU | Your teammate at `(18, -4)` |

The third read uses that exact support player and starting state. **Move player**
supports drag, tap, arrow keys and coordinates. **Plan route** supports up to 12
points after Start, tap or numeric Add, Undo/Clear, and a numbered polyline.
The start's name and coordinates are available as text before adding a point.
The route preview follows the chosen segments while the puck and all other
players stay frozen. Progress controls allow inspection; reduced motion uses
manual inspection. The learner explains the space or pass they want to support.

## Age and save boundaries

The age picker offers U9 and U11; U11 remains the default. Switching ages keeps
unfinished choices, explanations and route drafts in memory while this read
view stays open. The picker sits outside the keyed lesson so switching does not
replace the focused age button. Refreshing or leaving this view does not save
unfinished work.

Completed reflections save separately by player and scenario. U11 retains its
existing storage key; U9 adds its scenario ID. Restoring requires the expected
scenario, valid branch and matching support actor, so one age's reflection
cannot be reopened as the other. Export contains the selected actions, target,
final point, optional route and reasons, without player identity or score.
Replay preserves those answers. U9 has no changed-cue comparison or AI review.

## Sources and limits

- `scanning.md`: notice the teammate, pressure and space before choosing.
- `off-puck-support-offense.md`: discuss open space and a usable passing path.
- `two-on-one-pass-lane-removed.md`: use visible lanes and space rather than
  requiring a pass because two attackers are present.
- `two-on-one-support-too-flat.md`: a teammate's presence alone does not decide
  the action; this draft omits the more complex flat-support comparison.

The exact positions, defender movements and successful passes are authored
illustrations. They are not a universal prediction, validated skating or a
measured shoulder check. The support preview adds no defender reaction, route
grade or promise of on-ice improvement. Coach review and broader age coverage
remain separate work. Current integration tests and browser evidence are
recorded in `verification.md`; phone-width checks are not physical-device proof.
