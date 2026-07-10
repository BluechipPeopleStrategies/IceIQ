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
read. The full coach spotlight uses bounded variable reinforcement; correctness
and hockey teaching feedback never become intermittent.

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

## Reinforcement Schedule

Every answer shows explicit `Correct` or `Not quite` status and the selected
option's teaching explanation.

The personality-rich coach spotlight follows this schedule:

- Incorrect answers always show the coach because corrective teaching is never
  withheld.
- The first correct answer in a session shows the coach.
- Later correct answers show the coach after a variable gap of two to four
  additional correct answers, averaging approximately every third correct
  answer.
- A learner never goes more than four correct answers without a coach moment.
- Milestones such as a personal best or scenario-family completion may force a
  coach moment.
- The schedule is generated once per session and persisted in session storage;
  re-rendering or replaying does not reroll it.

The scheduler is bounded and learning-first. It does not use infinite rewards,
loss framing, purchasable rerolls, streak loss, or escalating audiovisual
effects.

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

### `coachReinforcement.js`

Owns a pure bounded scheduler and the session-storage adapter. State records
correct answers since the last spotlight, the next target gap, whether the
first correct spotlight has occurred, and handled answer event IDs so repeated
renders cannot advance the schedule twice.

The next gap is deterministically selected from `2`, `3`, or `4` using a
session seed plus spotlight count. Tests inject the seed directly; production
creates it once per session.

### Main quiz

`App.jsx` imports the extracted data and helpers. Existing coach-card behavior
and wording must remain unchanged.

### Animated play

`AnimatedPlay` resolves the coach when the current question is answered and
asks the reinforcement scheduler whether to show the spotlight. It passes the
coach to the terminal feedback card only when scheduled or forced. A small
presentational component may own the portrait/name/reaction layout. Missing or
failed portraits fall back to initials without blocking feedback.

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
- First correct and every incorrect answer show a coach spotlight.
- Later correct spotlights occur only after gaps of two to four correct answers.
- No correct-answer gap exceeds four.
- Reprocessing the same answer event does not advance or reroll the schedule.
- Session reload restores the existing schedule.
- Animated feedback includes portrait, name, role, explicit status, reaction,
  and teaching explanation.
- Pre-answer frames contain no coach feedback.
- Existing question, play, telemetry, and build checks remain green.

## Scope

This change reuses the existing coach-personality model. It does not add new
coaches, rewrite their voices, introduce user coach selection, or call an AI
model at runtime.
