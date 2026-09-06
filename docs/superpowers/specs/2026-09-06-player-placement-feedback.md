# Player placement feedback: graded areas and explained tradeoffs

Status: design, authorized September 6. Not implemented or coach calibrated. Applies to every move-player question; the current experimental bank contains 295 position questions and the separate calibration pack adds four drafts.

## Player experience

After moving a player and selecting **Check my position**, show one clear result:

| Result | Meaning | Example copy |
| --- | --- | --- |
| Strong choice | Meets the important conditions for this question | Good spot. You can see F2 and have room to approach the puck. |
| Workable choice | Meets the main aim, with a tradeoff | This keeps F2 available, but leaves less room from D1. |
| Needs adjusting | Misses an important visible condition | D1 is between you and F2. Try changing your approach angle. |
| Needs a coach's judgment | Required evidence or a calibrated rubric is absent | Compare the lane and pressure with the example. This question does not have a calibrated placement score yet. |

Show at most three short reasons, each with a text/icon state: **Works**, **Tradeoff**, **Adjust**. Offer **Try another spot** and **Show useful areas**. Preserve the learner's last placement and let them compare their first and latest response. No score updates while dragging: let the player make the read before revealing the area.

Use soft shaded rink regions after submission, rendered on the actual 3D ice and mirrored in the accessible overhead view. A strong area can be disconnected or curved; it need not be a circle. Include a labelled legend and patterns/edges so colour is not the only signal. Keep the player, puck and passing lanes visible. Do not replace the whole rink with a heatmap. View changes must not alter the result.

Default player-facing feedback uses these three bands, not a precise percentage. Internally retain per-condition values and confidence/status so a future numeric display is possible after calibration. A '90%' number would otherwise imply precision we have not established.

## What determines the result

Each question needs an authored, versioned rubric linked to its teaching objective. Do not grade proximity to the existing reference coordinate. That point is one example, not the answer region. Do not infer a rubric from prompt keywords at runtime.

Supported criteria describe visible geometry:

- Space from specified opponents, teammates, boards and the puck.
- A segment to a named receiver or puck carrier, with specified blocking actors and a calibrated clearance envelope.
- Inside/outside relationship to the puck and defended net, in team-relative coordinates.
- Useful support width/depth and a receiving angle within an authored range.
- Occupation of a named zone or authored polygon, including multiple acceptable regions.
- Facing only when that question permits changing or explicitly assesses facing. A move must not silently count as a pivot.

Different families require different rubrics: puck retrieval, passing support, offensive spacing, defensive inside position, gap/angling, net-front positioning, coverage/handoffs and rink vocabulary. A blocker does not always make a position wrong: a defensive screen or intentional puck protection may be the aim. Specify which relationships matter for that question.

Grade geometric observations only. A static frame cannot establish speed, time to intercept, skating execution or whether a pass will succeed. Dynamic prediction requires a separately verified model and a rubric that names that evidence.

## Screenshot example: approach the loose puck while retaining F2

Draft conditions to calibrate for this question:

1. A useful approach area around the loose puck, on the intended side with space from the boards. This is a bounded region, not exactly (-18, -6.5).
2. A view/lane toward F2 with D1's visible position considered. Distinguish line clearance from guaranteed pass success.
3. Room from D1, with a tradeoff when moving toward F2 reduces room to recover the puck.

An approach on either side may be defensible if it satisfies the question's stated aim. Do not reject an alternative simply because it differs from the author's example. First review both mirrored and boundary placements with a coach. This is an illustrative rubric, not an approved answer map.

## Evaluation contract

Rubric includes question ID, scenario version, content hash, rubric version/hash, applicable age, task/controlled actor, named evidence actors, criteria, important-condition flags, acceptable regions, thresholds, feedback templates, source/reviewer evidence and approval status.

Evaluate every criterion separately, then combine using calibrated thresholds. Important failed conditions cap the result: do not allow a weighted average to hide a blocked required lane. Unknown or missing evidence yields 'needs judgment', never a failing player grade. Illegal geometry is rejected at the input boundary. Tolerances cover numerical jitter and touch input; they must be authored in rink units and must not depend on camera zoom or screen pixels.

No universal metre thresholds across U7–U18. Coaches calibrate small-area versus full-ice context and age expectations. Multiple conditions can be alternatives rather than all mandatory. Keep explanations stable around boundaries and avoid rapidly switching categories for tiny movements.

## Persistence and improvement

Add a placement-review event with the current question/content/rubric hashes, attempt number, result band, normalized criterion results and the selected rink coordinate. Coordinates describe the fictional rink, not a child's location. No written reflection, identity or inferred ability in analytics. Keep browser-local storage for this release; Supabase remains deferred.

Historic placements remain readable but are not rescored under a changed rubric without an explicit new evaluation record. Curriculum reports separate position-band counts from factual scene-match counts. Repeated attempts are practice signals, not independent mastery evidence. Changing rubric or scene invalidates old current-version aggregation. Optional reflection stays optional.

## Rollout and acceptance

1. Build a pure evaluator and shared feedback component with ungraded fallback across every placement surface.
2. Calibrate one example in each family, starting with the pictured retrieval, passing support and defensive inside position. Include clear strong/workable/adjust placements, plausible alternatives, near boundaries, mirrored attack directions and changes in camera.
3. Render reviewed regions in the shared 3D scene and accessible board; verify mouse, touch, numeric placement, keyboard access, reload and reduced motion.
4. Expand rubric coverage to all 295 experimental placement questions, with a visible coverage report. Separate draft calibration IDs. Never silently grade uncovered questions.
5. Test deterministic results, monotonic changes where expected, important-condition caps, unknown evidence, content/rubric staleness, independent agent review and coach approval. No generic distance-based bulk rollout.

Completion means every moving-player question either has a verified rubric and explained range or explicitly shows the ungraded fallback. Human coach calibration, not a schema pass, is the gate for calling a region a strong hockey choice.
