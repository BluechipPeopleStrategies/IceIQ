# Direct-Manipulation Question Contract

## Problem

The animated-play renderer can silently replace an unsupported interaction kind
with `read-mc`. The original prompt is preserved, so a direction such as "Tap
that skater" can appear above multiple-choice buttons even though the rink
tokens are not tappable. The current 2-on-1 spot-mistake play exposes this when
it is previewed with the U7 interaction profile.

Directions in RinkReads must describe the action the player can actually take.
Direct-manipulation wording must never fall back to an unrelated answer mode.

## Decision

Preserve the authored direct interaction. A `spot-mistake` question is answered
by selecting an eligible actor on the rink, including on age profiles where the
scenario is available in the playground. It does not render duplicate answer
buttons.

Each eligible actor receives an invisible touch target larger than the visible
token. The target must be large enough for young players and touchscreens while
remaining spatially distinct from nearby actors. A visible focus or selection
ring confirms the tap. Single-answer questions submit immediately after the
tap.

## Interaction Contract

- `tap`, `select`, or equivalent actor-selection wording requires an on-rink
  actor-selection interaction.
- `drag`, `move`, `skate`, `pass`, `shoot`, or equivalent movement wording
  requires the corresponding direct-manipulation interaction.
- Button-based multiple choice uses question wording such as "Which skater..."
  and must not instruct the player to manipulate the rink.
- The renderer must not silently preserve direct-manipulation wording when it
  changes the answer mode.
- Mouse, touch, and keyboard input must reach the same answer path.

## Components

### Age interaction profiles

Profiles that can display the spot-mistake play must support the
`spot-mistake` interaction kind. Previewing a play under an incompatible age
profile must not convert its interaction into misleading multiple choice.

### Animated-play rink interaction

The rink layer maps each answer option with an `actorId` to the corresponding
rendered actor. It places an invisible, generous hit target over that actor and
routes activation through the existing answer and telemetry path. The selected
actor receives visible feedback before or as the answer reveal begins.

### Semantic validation

A reusable validation rule compares prompt action language with the resolved
answer mode. A direct-manipulation verb paired with buttons is an error, not a
warning. This protects future scenarios and age-profile changes from recreating
the mismatch.

## Data Flow

1. Resolve the authored question kind for the selected age profile.
2. Validate that the resolved answer mode matches the prompt's requested action.
3. Render eligible actor targets from `ask.opts[].actorId` on the rink.
4. On pointer, touch, or keyboard activation, select the matching option.
5. Pass that option through the existing scoring, reveal, node transition, and
   telemetry flow.

## Accessibility and Error Handling

- Actor targets expose an accessible name derived from the option text or actor
  label and behave as buttons for keyboard users.
- The enlarged hit area is invisible while the token and selection ring remain
  visually clear.
- If an actor-selection option references a missing actor, validation fails with
  the play and node identifiers. The renderer must not replace it with buttons
  while retaining a tap prompt.
- Touch handling must prevent duplicate activation from synthesized click
  events.

## Testing

- A regression test proves the flat-support spot-mistake resolves to on-rink
  actor selection rather than `read-mc` under the playground configuration.
- Interaction tests prove each eligible actor has an enlarged target and that
  activating the target submits its corresponding option.
- A semantic-contract test rejects a prompt containing a direct tap instruction
  when the resolved answer mode is buttons.
- Existing animated-play, question-kind, telemetry, and build tests must remain
  green.

## Scope

This change fixes the animated-play path and adds the reusable semantic guard.
It does not redesign unrelated scenario primitives, add free-form player
movement, or rewrite hockey content whose wording already matches its answer
mode.
