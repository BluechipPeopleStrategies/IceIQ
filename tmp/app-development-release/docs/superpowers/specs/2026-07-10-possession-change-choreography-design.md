# Possession-Change Choreography Design

## Problem

Turnovers in animated plays often end as static consequence frames. A blocked
route can show where a play failed, but it does not show the defensive read:
the defender moves into the lane, intercepts the puck, establishes possession,
and transitions the other way. The missing sequence weakens cause-and-effect
learning.

This is a catalog pattern, not a one-play exception. Improvements discovered in
playtesting should become reusable authoring rules and should be applied to
clear matches elsewhere without broad, token-heavy review.

## Decision

Represent explicit possession changes as short staged node chains using the
existing animated-play engine:

1. `read`: the defender begins moving into the threatened lane.
2. `intercept`: the attempted puck route terminates at the defender.
3. `counter`: the defender and puck move a short distance in the opposite
   direction.
4. `freeze`: the next question or teaching summary appears on a stable frame.

The flat-support spot-mistake play uses the sequence twice:

- Normal speed in the opening watch chain.
- Slower speed after the learner answers, ending on the emphasized `Flat`
  teaching frame and explicit correctness feedback.

The answer frame remains frozen. Learners never have to tap a moving target.

## Reusable Authoring Contract

A possession-change chain has explicit metadata so validation and reporting do
not infer intent from prose:

```js
possessionChange: {
  kind: "interception",
  fromTeam: "home",
  toActor: "D1",
  counterTo: [136, 43],
}
```

The chain must visibly satisfy the metadata:

- The interception route ends at `toActor`.
- The puck reaches `toActor` before the counter node.
- The counter node moves `toActor` and the puck together toward `counterTo`.
- The final teaching or question frame is stable.

This metadata is deliberately small. It supports targeted catalog scans and
validation without adding a new timeline engine.

## Catalog Pass

Use targeted searches for existing authored signals: `blocked`, `picked off`,
`turnover`, `intercept`, `steal`, and explicit opponent-possession language.

Apply staged possession choreography only when the existing hockey content
clearly states that the opponent gains the puck. Do not convert generic failed
plays where the lane merely closes, time expires, or the scoring chance fades.

The first pass covers:

- `spotMistakeFlatSupport`: full opening and slow replay sequence.
- Other catalog plays whose terminal node explicitly shows a defender breaking
  up or taking the pass, after confirming their existing node geometry.

Ambiguous matches remain unchanged and are reported by a compact audit test or
report rather than guessed at.

## Components and Data Flow

### Play data

Plays own hockey-specific positions, stage timing, puck placement, teaching
copy, and the `possessionChange` metadata.

### Existing renderer

The renderer continues to animate node `enter` to `pos`, render motion routes,
and follow `autoNext` chains. A small puck-entry field may be added if required
to show the puck traveling between stage positions; it must be generic and
covered by renderer tests.

### Validation and audit

Validation checks the explicit metadata against the referenced actor, route,
and counter position. A targeted catalog audit identifies explicit turnover
language without metadata so future authors cannot accidentally ship another
static possession change.

## Timing

- Opening sequence: compact game-speed beats, approximately 500 to 900 ms per
  stage.
- Post-answer replay: approximately 1.4 to 1.8 times slower.
- Reduced-motion users receive the same ordered stable frames without animated
  transitions.

## Accessibility

- Possession change is communicated by actor movement, puck movement, route
  interruption, and text, never color alone.
- The answer interaction starts only after the opening chain reaches a frozen
  frame.
- Correctness feedback remains a live status message after the answer.

## Testing

- Opening chain order is read, intercept, counter, question.
- Replay chain order is read, intercept, counter, teaching summary.
- D1 moves into the route before gaining the puck.
- Puck and D1 finish the counter stage together.
- Replay timings are slower than opening timings.
- Question actor targets are stationary and aligned.
- Catalog audit flags clear opponent-possession outcomes that lack choreography.
- All existing play, telemetry, engine, and build checks remain green.

## Scope

This design uses staged nodes rather than creating a general animation timeline.
It proactively updates only clear possession-change matches. It does not infer
new hockey outcomes, rewrite ambiguous consequences, or animate every terminal
node.
