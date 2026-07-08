# Scenario Family Standards

Scenario families turn isolated animated plays into a training progression.

A family is a group of related reads that teach one hockey decision pattern across multiple cues and variations.

## Why Families Matter

A single question can teach one read.

A family teaches recognition.

The goal is not just:

- "Can the player answer this one question?"

The goal is:

- "Can the player recognize this read when the cue changes?"

## Required Family Fields

Each family should define:

- family id
- title
- description
- target variant count
- match terms
- teaching arc
- implemented plays
- missing variants

## Variant Rules

A variant should change one meaningful hockey cue.

Good variant changes:

- defender steps up vs holds middle
- backchecker is closing vs not closing
- goalie is square vs late to slide
- support teammate is high vs flat
- puck carrier has space vs pressure
- teammate takes puck vs does not take puck

Weak variant changes:

- moving tokens slightly without changing the read
- changing labels only
- asking the same question with different wording
- adding a second question without a new visible cue

## Family Completion

A family is considered strong when it has:

- 1 base read
- 2 cue-change variants
- 1 pressure/timing variant
- 1 common mistake variant
- 1 mixed/advanced variant

## Recommended Development Order

1. Build the base read.
2. Add the most common opposite cue.
3. Add a pressure/timing variant.
4. Add a common mistake trap.
5. Add a mixed variant.
6. Playtest across U7, U11, and U15 language modes.

## Factory Rule

Every new animated play should either:

1. belong to an existing family, or
2. intentionally create a new family with a teaching arc.

Do not create one-off plays unless they are prototypes for a new family.
