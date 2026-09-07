# Play Kernel Engine + Novelty Gate — Content-Factory Scalability Phase

Date: 2026-07-21
Status: approved direction from Thomas ("continue to overhaul the creation
engine — scalability is the biggest barrier to market"); autonomous build.
Builds on: `docs/specs/2026-06-16-scenario-variation-generator-design.md`
(parked variator: T1 shipped 2026-07-21 as `mirrorPlayY`; this spec builds its
novelty gate and its parametric-template model), `docs/factory/SPEC.md` §12
(content multiplier) and §15 (gauntlet), `docs/play-kernel-standards.md`.

## The bottleneck, precisely

The gauntlet's promise — correct-by-construction volume — exists only on the
scenario-seed side (`formations/` + `playSolver.js`). The live play engine
(what actually ships in Read the Play) is 100% hand-authored: ~200-350 lines
per play, prose and coordinates by hand, shape-only validation, and a manual
playtest gate capping batches at 3 plays. That cap exists because nothing
machine-checks that an authored play's geometry actually supports its keyed
answer. Scale requires (a) generating plays from parameters where the answer
is guaranteed by construction, and (b) a duplicate-killer so volume produces
variety, not repetition.

## What this phase builds

### 1. Play kernels (`src/play/kernels/`)

A kernel is a parametric constructor for one scenario family that emits
complete, validator-clean animated-play objects. First kernel: **two-on-one**
(the family with the most proven prose — both hand-authored branch plays are
its templates).

`makeTwoOnOnePlay(params)` with parameters:

- `commit`: `"stepsUp"` (defender attacks the carrier → cross-ice pass is
  correct) | `"holdsMiddle"` (defender protects the pass lane → attacking the
  shot lane is correct). Decides the correct option — geometry follows.
- `depth`: how deep the freeze happens (0 / -6 / -10 ft along the attack).
- `supportGap`: F2's lateral spacing (`tight` | `wide`).
- `mirror`: far-side reflection (reuses `mirrorPlayY`).
- `seed`: deterministic jitter (±2 ft) on non-load-bearing coordinates.

**Correct by construction, then proven:** the defender's position is derived
from the commit (stepsUp → D closes on the carrier, pass lane clear;
holdsMiddle → D sits in the F1→F2 lane, lane blocked) and the kernel asserts
the geometry numerically (point-to-segment distance of D from the pass lane
above/below a margin) before returning — a play that fails its own invariant
throws rather than emits. Prose comes from the two approved hand plays as
templates; the LLM-prose step (gauntlet G8) can later personalize copy for
survivors, never the answer.

### 2. Novelty gate (`src/play/noveltyGate.js`)

The parked design's clone-killer, now real. Pure module:

- `answerSignature(play)`: correct-option id + the coarse zone of the play's
  answer target (the receiving actor for a pass, the net for a shot).
- `layoutDistance(a, b)`: mean actor displacement at the decision freeze,
  normalized by the rink diagonal.
- `filterNovel(candidates, existing, opts)`: a candidate survives only if
  (1) its answer signature or answer position differs meaningfully from every
  kept play (answer-moved rule), or its layout distance from every same-
  signature play exceeds the threshold; and (2) the per-signature cap is not
  exhausted. Jitter-only siblings die here by design.

### 3. Expansion report (staging, not shipping)

`npm run report:kernel-expansion` → expands the kernel's parameter space,
runs every candidate through `validateAnimatedPlay` + factory standards +
the novelty gate against the live catalog, and writes
`docs/factory/kernel-expansion-report.md`: counts at each gate and the
surviving candidates with their parameters. **No generated play enters the
catalog in this phase** — the Bulk-Assisted Creation Rule (batch cap 3,
manual playtest) still governs promotion; the report is the tray Thomas
promotes from. Raising the cap is earned later, when kernel plays + the
geometry invariants have passed two clean batches (per the existing rule).

## Testing

`npm run test:play-kernels` (new): every parameter combination emits a play
that passes `validateAnimatedPlay` with zero errors and factory standards;
stepsUp geometry has the pass lane clear and holdsMiddle has it blocked
(numeric margins); determinism per seed; the novelty gate kills jitter-only
clones, keeps mirrors (answer moved), and enforces caps.

## Out of scope (this phase)

Registering kernel output in the live catalog (bulk rule governs);
LLM prose personalization (G8); kernels for other families (gap control is
next once this pattern proves); solver-vs-authored-answer reconciliation for
the existing hand plays.
