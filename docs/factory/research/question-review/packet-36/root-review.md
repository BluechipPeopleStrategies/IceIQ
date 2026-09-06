# Packet 36: root adjudication evidence

Codex read the source replacement and retained questions against the composed bank. These records expose the actual final text and positioning measurements for independent review. Measurements are not proof of timing, gaze, stick reach, collision safety or lane availability. Original source files are unchanged.

## exp26b-u15-011

Navy attacks the right net. The Navy goalie has released an outlet, but the puck is still loose near YOU. Gold 1 is nearby on the same side. D2 is across the net and C is nearer the middle. The freeze does not establish the puck’s travel direction or a clean reception.

Actors: YOU (home) at (-23, -7); D2 (home) at (-24, 5); C (home) at (-16, 1); A1 (away) at (-20, -6); A2 (away) at (-15, 4); A3 (away) at (-8, 0); G (home) at (-28, 0). Puck: {"owner":null,"x":-21,"y":-7}.

- exp26b-u15-011-q1 (choice): Who controls the outlet puck at the freeze? Key: ["c"]. Final feedback: The puck is shown loose in transit, so no player has possession at the freeze.
- exp26b-u15-011-q2 (multi): Which two receiver checks belong before the touch? Key: ["a","b"]. Final feedback: Pressure and support shape the first touch; the goalie release does not decide its result.
- exp26b-u15-011-q3 (sequence): Arrange a loose-outlet routine. Key: ["a","b","c"]. Final feedback: Finding the puck and checking pressure can overlap with approaching using a support option; both can happen while skating. The touch still comes last because it must match whichever lane is actually open once YOU get there.
- exp26b-u15-011-q4 (position): Move YOU to compare an approach to the loose puck. Key: {"x":-22,"y":-6}. Final feedback: The example is closer to the puck, but also closer to Gold 1. Check the next touch and the routes toward D2 or C; arriving near the puck does not establish control.
  Geometry: {"actor":"h1","start":[-23,-7],"target":[-22,-6],"movementMetres":1.4142135623730951,"distanceToMiddleBefore":7,"distanceToMiddleAfter":6,"others":[{"label":"D2","before":12.041594578792294,"after":11.180339887498947},{"label":"C","before":10.63014581273465,"after":9.219544457292887},{"label":"A1","before":3.1622776601683795,"after":2},{"label":"A2","before":13.601470508735444,"after":12.206555615733702},{"label":"A3","before":16.55294535724685,"after":15.231546211727817},{"label":"G","before":8.602325267042627,"after":8.485281374238571}],"puckMovesWithActor":false}.
- exp26b-u15-011-q5 (choice): Gold 1 reaches the planned touch lane first. What should be reconsidered? Key: ["a"]. Final feedback: If Gold 1 reaches the lane first, reassess whether YOU can recover the loose puck. Protection or a pass requires a playable touch; neither is already established.
- exp26b-u15-011-q6 (explain): What could YOU communicate before the goalie releases another outlet? Key: "optional explanation". Final feedback: Name the pressure side and the support YOU can see. A short call can help the release choose a reachable lane, then update after the puck is touched.

## exp26b-u15-012

Navy attacks the right net. YOU control the puck and F2 is the second attacker. Gold 1 occupies the direct line between YOU and F2. The goalie is near the net; no save or finish is established.

Actors: YOU (home) at (22, 1); F2 (home) at (25, -6); A1 (away) at (23, -1.33); G (away) at (28, 0). Puck: {"owner":"h1"}.

- exp26b-u15-012-q1 (choice): What has Gold 1 changed? Key: ["a"]. Final feedback: Gold 1 is stated to have moved into the direct passing connection.
- exp26b-u15-012-q2 (multi): Which two cues should shape the next touch? Key: ["a","b"]. Final feedback: The defender, goalie and support route determine whether a shot, pass or protection is useful.
- exp26b-u15-012-q3 (sequence): Arrange a changed two-on-one read. Key: ["a","b","c"]. Final feedback: Locating Gold 1 and F2 can overlap with comparing the carrier and second option; both are part of the same scan. Re-checking the goalie and lane still comes last because the read must reflect whichever option is open right before the touch.
- exp26b-u15-012-q4 (position): Move YOU to compare a different angle toward F2 and the net. Key: {"x":23,"y":2.5}. Final feedback: The example changes the carrier’s passing and shooting angles. Recheck Gold 1, F2 and the goalie before choosing; the new point does not establish an open lane.
  Geometry: {"actor":"h1","start":[22,1],"target":[23,2.5],"movementMetres":1.8027756377319948,"distanceToMiddleBefore":1,"distanceToMiddleAfter":2.5,"others":[{"label":"F2","before":7.615773105863909,"after":8.73212459828649},{"label":"A1","before":2.535527558517162,"after":3.83},{"label":"G","before":6.0827625302982185,"after":5.5901699437494745}],"puckMovesWithActor":true}.
- exp26b-u15-012-q5 (choice): Gold 1 turns toward YOU and F2 gains separation. What could improve? Key: ["a"]. Final feedback: F2 separation changes the branch, while the goalie and defender still determine whether the pass or shot is usable.
- exp26b-u15-012-q6 (explain): How can feedback respect both a possible shot and a possible pass? Key: "optional explanation". Final feedback: Tie the choice to Gold 1, F2 and the goalie. If the defender closes the carrier but F2 is reachable, pass; if F2 is covered and the carrier lane remains open, consider the shot.

## exp26b-u15-013

Navy attacks the Gold net. F1 and Gold 1 contest a puck near the boards; YOU are the second Navy player and C is an inside outlet. Gold 2 can close C after the next touch.

Actors: YOU (home) at (19, 7.5); F1 (home) at (24, 10.5); C (home) at (17, 3); A1 (away) at (24.3, 9.6); A2 (away) at (16.3, 3.6); A3 (away) at (21, -3). Puck: {"owner":null,"x":24,"y":10.5}.

- exp26b-u15-013-q1 (choice): Which Navy player has the first wall-contest role? Key: ["a"]. Final feedback: F1 is the named first contest player; YOU are the second support.
- exp26b-u15-013-q2 (multi): Which two cues make second support useful? Key: ["a","b"]. Final feedback: Read the next loose touch and whether C can be reached without crowding F1. Gold 2 is already close to C, so that outlet is not guaranteed.
- exp26b-u15-013-q3 (sequence): Arrange a second-support read. Key: ["a","b","c"]. Final feedback: Staying outside F1's space and tracking the loose touch and C happen together, not one after the other. The final step, choosing recovery or support, only becomes clear once the touch actually resolves.
- exp26b-u15-013-q4 (position): Move YOU nearer the middle to compare support outside F1’s contest. Key: {"x":19,"y":4}. Final feedback: The example is farther from the wall contest and closer to C. Compare that inside support with the chance to recover the next loose touch; Gold 2 is near C and the route is not guaranteed.
  Geometry: {"actor":"h1","start":[19,7.5],"target":[19,4],"movementMetres":3.5,"distanceToMiddleBefore":7.5,"distanceToMiddleAfter":4,"others":[{"label":"F1","before":5.8309518948453,"after":8.200609733428362},{"label":"C","before":4.924428900898052,"after":2.23606797749979},{"label":"A1","before":5.7008771254956905,"after":7.710382610480495},{"label":"A2","before":4.743416490252569,"after":2.7294688127912354},{"label":"A3","before":10.688779163215976,"after":7.280109889280519}],"puckMovesWithActor":false}.
- exp26b-u15-013-q5 (choice): Gold 2 closes C as the puck rolls free. What should be checked? Key: ["a"]. Final feedback: C is no longer the same outlet, so update the support and recovery choices.
- exp26b-u15-013-q6 (explain): What is a useful second-player job when F1 does not win the puck cleanly? Key: "optional explanation". Final feedback: Track the loose touch and the inside threat while leaving F1 room. After a playable touch, compare C with another reachable outlet. No one controls the puck yet.

## exp26b-u15-014

Navy attacks the Gold net. F3 is changing and unavailable for this rep; YOU carry in the neutral zone, D2 is behind, and F1 and F2 are ahead. The goal is to read possession options as support changes.

Actors: YOU (home) at (-1, -2); D2 (home) at (-10, 5); F1 (home) at (9, 6); F2 (home) at (12, -5); A1 (away) at (2, 2); A2 (away) at (6, -1); A3 (away) at (-4, -8). Puck: {"owner":"h1"}.

- exp26b-u15-014-q1 (choice): Which teammate is unavailable during this rep? Key: ["b"]. Final feedback: The cues state that F3 is changing and unavailable.
- exp26b-u15-014-q2 (multi): Which two checks matter with one support option missing? Key: ["a","b"]. Final feedback: A reset and a forward route preserve choices while the line change reduces one support option.
- exp26b-u15-014-q3 (sequence): Arrange a possession read during the change. Key: ["a","b","c"]. Final feedback: Keep scanning pressure and support while protecting or moving the puck. Recheck throughout the change, including when the replacement arrives; this is one suggested order, not a reason to stop scanning.
- exp26b-u15-014-q4 (position): Move YOU to compare a reset toward D2 with a forward route toward F1. Key: {"x":-3,"y":0}. Final feedback: The example is closer to D2 and farther from F1. Compare pressure and both routes before using either; shorter distance does not guarantee an open pass.
  Geometry: {"actor":"h1","start":[-1,-2],"target":[-3,0],"movementMetres":2.8284271247461903,"distanceToMiddleBefore":2,"distanceToMiddleAfter":0,"others":[{"label":"D2","before":11.40175425099138,"after":8.602325267042627},{"label":"F1","before":12.806248474865697,"after":13.416407864998739},{"label":"F2","before":13.341664064126334,"after":15.811388300841898},{"label":"A1","before":5,"after":5.385164807134505},{"label":"A2","before":7.0710678118654755,"after":9.055385138137417},{"label":"A3","before":6.708203932499369,"after":8.06225774829855}],"puckMovesWithActor":true}.
- exp26b-u15-014-q5 (choice): A new F3 appears in a clear middle lane. What can YOU reconsider? Key: ["a"]. Final feedback: The new player changes the support picture, but the carrier still checks access and pressure.
- exp26b-u15-014-q6 (explain): Why does a line change call for a possession read rather than one fixed action? Key: "optional explanation". Final feedback: The available outlet set changes while the puck and pressure remain live. Name D2, the forward route and the arriving F3, then choose the connection that stays reachable.

## exp26b-u15-015

Navy attacks Gold’s net. YOU control near the puck-side half wall; Gold 1 shades F2 in the slot, F1 is behind the goal line, and D1 holds the high point with Gold 3 nearby. The rep asks YOU to compare a connected reset with the crowded inside option.

Actors: YOU (home) at (20, 9); F1 (home) at (28, -5); F2 (home) at (19, 3); A1 (away) at (20, 4); A2 (away) at (24, 1); A3 (away) at (12, 6); D1 (home) at (10, 7). Puck: {"owner":"h1"}.

- exp26b-u15-015-q1 (choice): Which Navy teammate is positioned behind Gold’s goal line? Key: ["a"]. Final feedback: F1 is behind Gold’s goal line as a possible low outlet. Check the defenders before assuming a pass can reach F1.
- exp26b-u15-015-q2 (multi): Which two details support a reset? Key: ["a","b"]. Final feedback: The defender and low outlet determine whether the reset can preserve possession.
- exp26b-u15-015-q3 (sequence): Arrange a connected reset. Key: ["a","b","c"]. Final feedback: Scan F2, F1 and D1 while protecting the puck, then use a reachable option and scan again. Scanning and protection can overlap; a named outlet is not necessarily open.
- exp26b-u15-015-q4 (position): Move YOU nearer the middle to compare the routes toward F1, F2 and D1. Key: {"x":18,"y":7.5}. Final feedback: The example changes the carrier angle and brings YOU closer to all three teammates, but also closer to Gold 1 and Gold 3. Recheck the defenders before using any route.
  Geometry: {"actor":"h1","start":[20,9],"target":[18,7.5],"movementMetres":2.5,"distanceToMiddleBefore":9,"distanceToMiddleAfter":7.5,"others":[{"label":"F1","before":16.1245154965971,"after":16.00781059358212},{"label":"F2","before":6.0827625302982185,"after":4.609772228646444},{"label":"A1","before":5,"after":4.031128874149275},{"label":"A2","before":8.94427190999916,"after":8.845903006477066},{"label":"A3","before":8.54400374531753,"after":6.18465843842649},{"label":"D1","before":10.19803902718557,"after":8.0156097709407}],"puckMovesWithActor":true}.
- exp26b-u15-015-q5 (choice): Gold 1 leaves F2 to pressure YOU on the wall. What should be weighed? Key: ["a"]. Final feedback: The defender move may open F2, but carrier angle and F1 support still determine the connected choice.
- exp26b-u15-015-q6 (explain): Name two support areas in this reset and explain their different value. Key: "optional explanation". Final feedback: F1 offers a low outlet, while F2 offers an inside option if Gold 1 leaves it reachable. D1 is a high reset to check too, with Gold 3 nearby. Naming an outlet does not guarantee it is open.


## Independent adjudication

Luna independently checked the final proposal. An initial allegation that the F1 distance stayed constant was rejected after direct coordinate measurement: 16.1245154966m before, 16.0078105936m after. The reviewer remeasured from the serialized file and approved the exact proposal bytes. Human coach approval remains outstanding.
