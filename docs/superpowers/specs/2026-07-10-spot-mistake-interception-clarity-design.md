# Spot-Mistake Interception Clarity Design

## Problem

The flat-support 2-on-1 currently teaches that the support skater removes the
passing angle, but the frozen geometry makes the pass look usable. The defender
sits slightly beyond the segment between the two attackers, so the visual does
not support the coaching explanation.

## Decision

Exaggerate the interception in the frozen question frame and rewind reveal:

- Place the defender directly between the puck carrier and support skater.
- Place the stolen puck visibly on the defender's stick side.
- Draw the attempted pass as a bold red blocked route that terminates at the
  defender.
- Keep the support skater flat with the puck carrier so the original mistake
  remains the cause of the turnover.

The watch animation still establishes that the pass was attempted and picked
off. The question frame may show the completed interception because the learner
is identifying which skater made the first wrong read, not predicting whether
the pass succeeds.

## Data and Rendering

The flat-support play owns the exaggerated positions and blocked-pass motion.
The shared animated-play renderer continues to render the existing `blocked`
motion vocabulary. The question frame must explicitly opt into the blocked
route because ordinary question nodes hide outcome motions to avoid answer
leaks.

This opt-in must be narrowly named for a completed-event review, not a general
switch that reveals future outcomes on other question types.

## Accessibility

The interception cannot rely on red alone. The blocked route retains its
existing interruption mark and the puck is visibly attached to the defender,
so shape and position communicate the turnover without color.

## Testing

- The defender lies on or very near the attempted pass segment in the question
  frame.
- The puck lies visibly beside the defender after the interception.
- The question frame opts into the blocked route while ordinary question nodes
  continue hiding outcome motions.
- Existing actor-tap targets still align with the moved actors.
- Animated-play, engine, question-kind, and build checks remain green.

## Scope

This change applies only to the flat-support spot-mistake proof play and the
small renderer opt-in needed to review a completed event. It does not rebalance
other 2-on-1 plays or change the hockey conclusion.
