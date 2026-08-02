# Surface-fit validator and the surface model — design

**Date:** 2026-08-02
**Status:** design, awaiting Thomas's review
**Origin:** external feedback (`docs/research/2026-08-02-external-feedback-distillation.md`)
suggested validating scenarios against the governing body's rulebook. Scoping
that against the codebase found a real gap, and Thomas's correction about
unsanctioned hockey reshaped it into something better.

## Problem

Every validator we own — `validateAnimatedPlay`, `validateFactoryStandards`,
`validateAnchorFidelity`, `artLint`, `noveltyGate`, the tactical-claim schema,
the physics hard-failure detectors, gate-8 blind second-pass — answers some form
of "is this scenario physically possible, visually clean, novel, or sourced."

**None of them answers "is this the game this kid actually plays."**

Hockey Canada has mandated cross-ice for U7 and half-ice (max 100x85, 4-on-4)
for U9 since 2017-18. Our catalog serves 13 plays to U7/U9, 9 of them on the
full `rink-200x85` sheet. Two of those — `play_off_puck_support_window_u11_v1`
and its mirror — are served to **U7**.

But "U9 must be half-ice" is false as a universal rule. Unsanctioned hockey
exists at every age: spring, summer, 3-on-3, and independent leagues run
full-ice U9 across Alberta. The surface a player plays on is a property of their
**program**, not of their age band. We currently model neither: `teams` has
`name / level / season / code` and `profiles` has `level / position / season`,
where `level` is an age band. Nothing records what game anyone actually plays.

So the useful question is not legality. It is **fit**.

## Design

### 1. Surface as the master input

One field cascades through everything else. Under Hockey Canada, half-ice U9
has no offside and no icing — so even positional legality is surface-conditional.
Anchoring on surface rather than on rules keeps a single source of truth.

**Plays declare a surface**, author-set, never inferred:

| value | meaning |
| --- | --- |
| `cross-ice` | U7-shaped, across the width |
| `half-ice` | U9-shaped, max 100x85 |
| `full-ice` | needs the 200x85 sheet: blue lines, long rush, 200-foot backcheck |
| `zone-local` | happens inside one zone and reads identically on any sheet |

`zone-local` is the important one. A 2-on-1 in the offensive zone is a 2-on-1
anywhere, which is why the 4 zone-scoped plays already serving U7/U9 are fine as
authored.

**Players and teams declare the surface they play on** (migration 0023,
nullable). Storing surface rather than sanctioning body sidesteps modelling
Hockey Canada vs independent vs spring league — surface is what content actually
matches against, and it stays true when a kid plays two programs in a season.

Null means unknown, which means no filtering. Nothing breaks before backfill.

### 2. `validateSurfaceFit`

A new module in the existing validator chain, returning findings through the
existing `buildFinding` API so severity, `answerImpact`, and provenance stamping
work unchanged.

**Hard failure — exactly one rule.** A play whose surface is `full-ice` (or
whose `space` is full-rink) must not list `U7` in `ageBands`. Cross-ice is close
enough to universal at U7, sanctioned or not, that full-ice content there is
always a mistake.

Everything U9 and up is filter-only. There is no surface a U9+ play cannot
legitimately be authored for, so gating it would encode a rule that isn't true.

**Consistency check (warning).** The declared surface must be coherent with the
geometry: a play tagged `cross-ice` whose actors span 150 feet is an authoring
bug regardless of anyone's program. This is the check that keeps the field
honest as content scales, and it is the only part that guards generated content.

### 3. Serving becomes a filter

`playsForAge(ageBand)` gains a surface argument. Known surface filters to
matching plus `zone-local`; unknown surface passes everything, as today.

This is where the actual product value lands: the kid in sanctioned half-ice U9
stops being shown 200-foot backchecks, and the kid in a full-ice independent
league keeps them.

## Explicitly out of scope

- **Offside / positional legality.** Real and computable on full-ice from the
  rink frame and freeze positions, but surface-conditional and not needed to
  land the surface model. v2.
- **"Nuance and difficulty" validation** (as proposed in the external feedback).
  Not derivable from geometry. Claiming it would repeat the mistake we just
  fixed in the simulator — certifying something nobody can actually check.
- **Sanctioning-body modelling.** Surface is the useful abstraction; league
  identity is not.

## Immediate findings this produces

- **2 hard failures on day one:** `play_off_puck_support_window_u11_v1` and
  `play_off_puck_support_window_u11_v1_mirror` are `full-ice` and list U7. Fix
  is Thomas's call per play: drop U7 from the bands, or re-scope the play as
  `zone-local` if the read genuinely is zone-local.
- **9 plays tagged `full-ice`** serving U9 become filterable rather than
  indiscriminate. Not defects.
- **4 plays confirmed `zone-local`** and correct as authored.

## Testing

TDD throughout, per the house pattern (`node <module>.test.mjs`, `ok()` harness,
wired into `test:scenario-engine`).

- U7 + `full-ice` hard-fails; U7 + `zone-local` passes.
- U9 + `full-ice` produces no hard failure (the unsanctioned case must stay legal).
- Geometry/label mismatch warns.
- Unknown player surface filters nothing.
- Known surface returns matching plus `zone-local`, excludes the rest.
- The two known live failures are asserted by id, so a silent re-band is caught.

## Sequencing note

Migration 0023 stacks behind 0022 (the RLS hardening), which is written but not
yet applied. The play-side work — surface tags, the validator, the two findings —
needs no migration and can land first.
