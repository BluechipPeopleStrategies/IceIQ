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

## Decision-Training Principles (2026-07-29 — governs)

Adapted from Chris Oliver's Basketball Decision Training (constraints-led coaching,
Blocked→Random practice progression). Full grounding, rubric, and a worked-example
audit: `docs/superpowers/specs/2026-07-29-decision-training-curriculum-philosophy-design.md`.
**Where this section and any other section below differ on sequencing or completion
criteria, this section takes precedence.**

- **Constrain first, don't open first.** The base read must be a single, clearly-forced
  decision — not an ambiguous "many things could be right" situation.
- **Constraint-openness is its own axis, separate from difficulty.** A family's
  variants should progress from a tightly-forced read toward a genuinely more open one
  (multiple viable reads requiring live discrimination) — not just accumulate cue
  variety at the same openness level. A family can satisfy every Variant Rule below and
  still fail this: six well-formed cue changes that never open past the base read are
  "one decision tested six ways," not a Blocked→Random progression.
- **Every rep looks like the game.** No isolated concept labels — only live animated
  decisions. Already true of RinkReads' format; this is a regression check on new
  content, not a change.
- **Mistakes are data.** Wrong-answer feedback must explain the mechanism (why the
  chosen option fails, in hockey terms), never just mark it incorrect.

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

## Progression Rubric

Run against a family's teaching arc (audit existing families or check new ones):

1. **Constrain-first check** — is the arc's first entry a single, clearly-forced read?
2. **Blocked→Random ladder check** — does constraint-openness increase moving through
   the arc, or does it just add cue variety at one openness level?
3. **Live-rep check** — is every entry a live animated decision, not a static label?
4. **Mistake-mechanism check** — does feedback copy explain why an answer is wrong,
   not just that it is?
5. **Kernel-coverage check** — does this entry have a kernel-generated decision axis,
   or is it hand-authored-only? (Doesn't judge pedagogy; flags what the generation
   pipeline can currently reach.)

## Family Completion

A family is considered strong when it has:

- 1 base read (single forced decision)
- 2 cue-change variants (same openness level, different visible cue — per Variant Rules)
- 1 pressure/timing variant
- 1 common mistake variant
- 1 genuinely open variant — multiple viable reads requiring live discrimination,
  completing the constrain→open ladder. **Not** just a sixth cue variant: it must be
  more open than the base read, not merely different from it.

## Recommended Development Order

1. Build the base read (single forced decision).
2. Add the most common opposite cue (same openness level).
3. Add a pressure/timing variant.
4. Add a common mistake trap.
5. Add a genuinely open variant that completes the constrain→open ladder — requires
   live discrimination among multiple viable reads, not another same-openness cue swap.
6. Playtest across U7, U11, and U15 language modes.

## Factory Rule

Every new animated play should either:

1. belong to an existing family, or
2. intentionally create a new family with a teaching arc.

Do not create one-off plays unless they are prototypes for a new family.
