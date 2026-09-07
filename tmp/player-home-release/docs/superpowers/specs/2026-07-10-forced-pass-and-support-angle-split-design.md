# Forced-Pass and Support-Angle Split Design

## Problem

The current spot-mistake play identifies F2's flat support route as the first
wrong read after F1 forces a covered pass. That does not satisfy the One
Defensible Mistake Rule. The puck carrier owns the final decision and cannot
blindly pass through a defender because the support route is imperfect.

## Decision

Split the teaching into two questions with distinct responsibility.

### Forced-pass turnover

Keep the existing interception and counterattack choreography. F1 is the
correct spot-mistake answer because the defender is visibly in the lane before
the pass is released. Feedback teaches that the puck carrier must hold, shoot,
or attack available ice rather than force a covered pass.

F2's route may be imperfect, but it is not presented as absolving F1 or as the
single cause of the turnover.

### Support-angle read

Create a sibling actor-selection play that freezes before any pass is made and
asks: "Which skater should create a better passing angle?" F2 is correct because
the support skater is flat with the puck carrier.

The sibling play does not show a forced pass or turnover. Its consequence
demonstrates F2 moving slightly behind the puck line to create a lane the
defender cannot cover with the puck carrier at the same time.

## Reusable Authoring Rule

- Turnover responsibility belongs to the player who makes the final forced
  decision when the danger is already visible.
- Support-positioning questions ask who should improve availability or angle;
  they do not transfer decision responsibility away from the puck carrier.
- A spot-mistake play may flag an off-puck player as the turnover cause only
  when the puck carrier's action remains defensible from the visible frame.

Validation and catalog tests must protect these distinctions using explicit
question intent rather than inferring responsibility from generic copy.

## Testing

- The turnover play's correct actor and `mistakeActor` are F1.
- F1 feedback names the forced covered pass as the mistake.
- F2 feedback says the route could improve but does not make the pass
  defensible.
- The sibling support-angle play asks about availability, selects F2, and
  contains no turnover or blame language.
- Both plays remain valid at their authored age bands and appear in the catalog.
- The second manual spot-mistake gate is rerun against both questions before
  opening the factory gate.

## Scope

This change corrects the hockey judgment and adds one sibling play. It does not
rewrite unrelated support or forced-pass scenarios.
