# Question Types, Coach Sign-off & Accuracy-by-Concept

**Date:** 2026-06-11
**Status:** Design (extends the formation-library plan, warm-humming-sparrow.md)

## What this solves (restated from the user)

1. **Accurate diagrams on first creation, chosen by concept.** Pick the concept I
   want to teach → get a board that is hockey-correct immediately, not after
   rounds of fixing.
2. **Coach sign-off.** A coach looks at a generated scenario and can say "yes,
   that makes sense logically, and there are only X (or Y) correct answers" — and
   that claim is *backed by computation*, not opinion.
3. **Many question types off one scenario.** The same board should spawn several
   question modalities: pick-a-spot, matching, selection, ordering, placement —
   not just board multiple-choice.

The formation library (Slice 1, shipped) already delivers #1's mechanism
(geometry correct by construction). This doc designs #2 and #3 on top of it.

## Foundation already in place

- **5 interaction primitives** exist with scorers + UI (`src/scenario/primitives/`):
  `point` (tap a spot), `selection` (pick option(s)), `sequence` (order),
  `place` (drag actors to spots), `path` (draw a move). **`match` is the one new
  modality to add.**
- **Formations** (`src/scenario/formations/`) place actors by construction.
- **Validators** (`src/scenario/validators.js`) machine-check coherence.
- **Contact sheet + batch-approve** = the review/promote loop.
- **value.js** (Slice 2, queued) = the xT/pitch-control "proxemics engine."

## Pillar A — Accuracy by concept (index formations by concept)

Make the formation the unit of "a concept done right." A `concept → formation(s)`
map means choosing a concept yields a correct board. Each priority concept gets
≥1 verified formation; `formation-menu.mjs` already lists by `nodeIds`. Work =
authoring more formations (gap-control, breakout, forecheck, backdoor, coverage),
each verified once. This is the existing Slice 2+ formation expansion.

## Pillar B — Coach sign-off + provable answer cardinality (the trust layer)

This is the heart of the request. Today "is the read correct?" is structural
(a defender is on the lane). To let a coach sign off on "only X correct answers,"
we must **enumerate and score every candidate answer and prove the count**.

**Mechanism (built on value.js):**
1. For a scenario, generate the full candidate set for its modality — every
   teammate for `selection`, a grid of ice points for `point`, every actor-pair
   for `match`, etc.
2. Score each candidate with the value/control model (expected-threat gain +
   pitch-control + pass-success). Correct = candidates above a value threshold
   AND materially above the next-best (a margin).
3. **Cardinality assertion:** the instance declares the intended count
   (`expectCorrect: 1`). The compiler computes the actual count; if the geometry
   admits more (two equally-open lanes) or fewer (no clear best), it FAILS with
   "expected 1 correct, found 2: openWing, backdoor." This is what guarantees
   "only X or Y correct answers" *before* a human ever looks.
4. **Coach sign-off surface:** extend the contact sheet into a review view that
   shows, per card: the board, a faint value heatmap (where the danger is),
   **"N correct answer(s): [list]"**, the validator/cardinality report, and an
   explicit **Sign-off / Send-back** control that records coach id + timestamp.
   Promotion to the bank requires a recorded sign-off, not just a checkbox.

A coach's judgment is now *confirming* a computed claim ("the model says 1 answer,
here it is — agree?"), which is far faster and more trustworthy than eyeballing
raw geometry. Disagreements become value-model calibration data (the self-improving
loop).

## Pillar C — One scenario → many question types

A formation describes a *situation*; a *modality* is a lens on it. Declare the
modalities a formation supports; the compiler emits a question per modality from
one instance.

| Modality | What it tests | Status | Proxemics framing |
|---|---|---|---|
| `point` (pick a spot) | where to be / pass / steer | exists | tap the highest-value ice |
| `selection` | which option is open | exists | pick the controlled lane |
| `sequence` | order of actions | exists | scan order / play sequence |
| `place` | put players where they belong | exists | reconstruct correct spacing |
| `path` | draw the move | exists | the highest-value action vector |
| **`match`** | pair items (cover assignments, player→zone, situation→response) | **NEW** | who covers whom / who fills which space |

**`match` (new primitive):** pairs of `{left, right}` items with a correct
mapping (e.g. each attacker → the defender who should pick them up; each player →
the zone they should occupy). Needs: schema entry, `match-scorer.js`,
`match.jsx`, a validator (every left item mapped, mapping is 1:1 or declared
many:1), and contact-sheet rendering. It is the most natural proxemics question —
it directly tests spatial responsibility.

**Multi-emit:** `formation-to-seed.mjs` gains an optional `modalities: [...]` on
the instance; for each, it builds the matching interaction/correct from the
formation's role data and emits a separate seed (`<id>__point`, `<id>__match`).
One authored situation → a family of questions, multiplying output per unit of
author effort — directly serving mass production.

## How proxemics underpins all three

The value/control surface (`value.js`) is the single engine that (a) the
formation uses to *place* actors so the right answer is highest-value
(construction), (b) the cardinality check uses to *count* correct answers
(sign-off), and (c) `match`/`point` use to *score* spatial candidates (modalities).
"Proxemics within the dataset" = every scenario carries a computed value/control
field; that field is what makes accuracy, bounded answers, and new question types
all provable rather than asserted.

## Roadmap fit

- **Slice 2 (queued):** `value.js` — xT value surface + pitch-control + pass-success.
- **Slice 3:** cardinality assertion (`expectCorrect`) in the compiler + coach
  sign-off surface (extend contact-sheet, record sign-off, gate promotion).
- **Slice 4:** `match` primitive (scorer + UI + validator + render) and
  multi-modality emission from one instance.
- **Ongoing:** concept → formation expansion (Pillar A).

## Open decisions for the user

1. **`match` semantics — which pairing matters most?** (a) attacker → covering
   defender, (b) player → zone/role they should fill, (c) situation → correct
   response. Pick the first one to build.
2. **Sign-off weight:** lightweight (coach name + timestamp on the card) vs a
   tracked sign-off ledger (audit trail, multiple reviewers, re-review on edits).
3. **Cardinality default:** assert `expectCorrect: 1` by default (strict single
   best answer) or allow authored multi-answer (e.g. "tap any 2 open teammates")?
