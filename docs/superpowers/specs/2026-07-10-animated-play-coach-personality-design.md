# Animated-Play Coach Personality Design

## Problem

Animated-play feedback currently uses generic correctness copy. The main quiz
already has four coach personalities with portraits, age-banded reaction pools,
category tilts, and deterministic question assignment. Animated questions
should use that same model so feedback feels consistent across RinkReads.

The current model lives inside `App.jsx`, which prevents modular animated-play
components from importing it cleanly.

## Decision

Extract the existing coach-personality data and pure selection helpers into a
shared module. The main quiz and animated-play renderer both import that module.
No coach wording, portraits, roster membership, or assignment rules are
duplicated.

Coach personality appears only after the learner answers. Before the answer,
the rink and question remain neutral so the coach cannot hint at the correct
read.

## Feedback Card

For answered animated questions, show:

- Coach portrait.
- Coach name and role.
- A deterministic, age-appropriate correct or incorrect reaction from that
  coach's existing flavor pool.
- The selected option's `why` or `no` teaching explanation.
- The existing explicit `Correct` or `Not quite` status.

The coach reaction is flavor, not instruction. Hockey teaching content remains
owned by the question option and consequence node.

## Assignment

Use the existing deterministic `getCoachForQuestion` rules. Animated plays
provide a question-like assignment object:

```js
{
  id: `${play.id}:${node.id}`,
  cat: play.coachCategory || null,
}
```

When no category tilt exists, the stable ID rotates across the full roster.
The same play node therefore keeps the same coach across renders while the
catalog still distributes appearances among personalities.

Age-band mapping reuses `getAgeTier`. Animated U7/U9 use `young`, U11/U13 use
`mid`, and U15/U18 use `older`.

## Components

### `coachPersonas.js`

Owns `COACH_PERSONAS`, `getAgeTier`, roster resolution,
`getCoachForQuestion`, and deterministic reaction selection. The extracted
exports are pure and have no React or DOM dependency.

### Main quiz

`App.jsx` imports the extracted data and helpers. Existing coach-card behavior
and wording must remain unchanged.

### Animated play

`AnimatedPlay` resolves the coach when the current question is answered and
passes it to the terminal feedback card. A small presentational component may
own the portrait/name/reaction layout. Missing or failed portraits fall back to
initials without blocking feedback.

## Accessibility

- Correctness remains explicit text and a live status message.
- Portraits use the coach name as alternative text.
- Reaction wording never replaces the teaching explanation.
- Color is supplementary; `Correct` and `Not quite` remain visible.

## Catalog Impact

The coach feedback wrapper applies to every animated question kind that reaches
a terminal consequence and retains a selected option. It is not limited to the
flat-support play.

A targeted test scans the animated catalog to confirm stable coach assignment
for every answerable node and valid age mapping without rendering every play in
a browser.

## Testing

- Extraction preserves all four coach IDs, images, roles, and age pools.
- Main quiz imports the shared module and has no duplicate persona constant.
- Stable play/node IDs always select the same coach and reaction.
- Different play/node IDs distribute across more than one coach.
- Correct answers use `flavorCorrect`; incorrect answers use
  `flavorIncorrect`.
- Animated feedback includes portrait, name, role, explicit status, reaction,
  and teaching explanation.
- Pre-answer frames contain no coach feedback.
- Existing question, play, telemetry, and build checks remain green.

## Scope

This change reuses the existing coach-personality model. It does not add new
coaches, rewrite their voices, introduce user coach selection, or call an AI
model at runtime.
