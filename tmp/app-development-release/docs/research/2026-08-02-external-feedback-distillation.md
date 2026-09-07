# External feedback on scaling animated plays — what's new, what we already have

Three comments from Thomas's post about scaling animated hockey plays, checked
against the actual codebase on 2026-08-02. Two describe architecture we already
run. One identifies a real gap, and one challenges the chain-sequence design
that is currently awaiting approval.

---

## Vedant Heda — "one template, feed it data"

> "dont hand-animate or AI-generate each play, build ONE animation template and
> feed it DATA... define each play as coordinates + movement... now 'hundreds of
> plays' is hundreds of data rows, not hundreds of animations... the real work
> becomes authoring the play data, not animating."

**Already built, almost line for line.** `AnimatedPlay.jsx` is the single
renderer; every play in `src/play/plays/` is pure data — `actors`, `nodes`,
`pos`, `puck`, `motions`, and a `freeze` field that is precisely the "decision
frame" he describes. Mirrored variants (`mirrorPlayY`) already generate new
plays from existing rows with no new animation. Remotion, which he names, is
already in the stack.

**What it does confirm, and this is worth sitting with:** his closing point is
that the bottleneck becomes *authoring the play data*. We reached the same
conclusion and built a coach-authoring tool for exactly that bottleneck — then
parked it on 2026-08-01 because the surface was an engineering harness rather
than a coach tool. The diagnosis was right; the execution wasn't. Worth
revisiting when the parked item resurfaces, with his framing as support for the
*bottleneck*, not for that particular UI.

No action. This is validation, not new information.

---

## Chetan Mishra — "decouple the engine, validate against the rulebook"

> "decouple the logic engine from the animation layer by using rigid, pre-rigged
> tactical templates driven by structured JSON states rather than pure video
> generation, and run an automated validation agent against the governing body's
> rulebook to check nuance and difficulty before anything renders."

**First half: already built, and more rigorously than proposed.** The
decoupling is `ScenarioDefinition` → `simulate()` → `CompiledTeachingPlay` →
presentation adapters. Structured JSON states driving a rigid renderer is
exactly the Phase 1-3 architecture.

**Second half: a genuine gap.** Our validator set is
`validateAnimatedPlay`, `validateFactoryStandards`, `validateAnchorFidelity`,
`artLint`, `noveltyGate`, the tactical-claim schema, the physics hard-failure
detectors, and gate-8 blind second-pass judgment. Every one of those checks
whether a scenario is *physically possible*, *visually clean*, *novel*, or
*tactically sourced*.

**Nothing checks whether it is legal.** There is no offside, icing, positional-
legality, or Hockey Canada / USA Hockey ADM age-appropriateness validator
anywhere in `src/`. A scenario can be physically flawless, pass every gate we
own, and still depict a formation that is illegal or a system inappropriate for
the age band it is served to.

That matters more than it sounds. We already treat Ken Martel / USA Hockey ADM
as a Tier-1 source in the triage report, so the rulebook is already in our
evidence base — it just isn't wired to anything executable. **This is the most
actionable idea of the three.**

---

## Nora Saulīte — "nail single-decision accuracy first"

> "sounds like you might need a lightweight rubric reviewed by an actual
> coach/ref for each age-tier, then use that as ground truth to check generated
> scenarios against. I'd nail single-decision accuracy first before compounding
> into chained sequences."

**Partially built, and the unbuilt part is the part that matters.**

We have a Progression Rubric (`docs/scenario-family-standards.md`:
constrain-first, ladder, live-rep, mistake-mechanism, kernel-coverage), an
executable `gate8Rubric.js`, and coach-review plumbing (`coach_reviews`,
`npm run coach-review`).

What we do **not** have is her actual proposal: a rubric that is **per
age-tier** and **signed off by a real coach as ground truth**. Ours is
per-*family*, derived by us from source material, and self-administered. Claude
judges against a rubric Claude helped write. Gate 8's blind two-pass design
mitigates that but does not remove it — two independent passes of the same
model against the same self-authored rubric share its blind spots.

**Her sequencing warning lands.** The 2026-07-29 family audit found real
single-decision gaps that are still open: ladder-check failures across
families, 0-of-6 kernel coverage, and teachingArc/content mismatches. Chaining
multiplies whatever error rate the first decision has.

**Where I'd push back:** the chain slice currently designed is four hand-
retrofitted plays, U13+, no engine change, no generation. That is not the
"compounding" she is warning about — that would be factory-*generated* chains,
which is exactly the LATER item we deliberately did not propose. A hand-
authored second read on a proven play is closer to content editing than to
compounding an error rate.

But her rubric point stands on its own merits regardless of sequencing, and it
is the stronger half of her comment.

---

## What to actually do

1. **Rules/ADM legality validator** (from Chetan) — the clearest unbuilt thing.
   Slots into the existing validator chain before render. Needs a scoping pass:
   which rules are checkable from a `ScenarioDefinition` at all (offside and
   positional legality are; "nuance and difficulty" is not, and should not be
   promised).
2. **Age-tiered, coach-signed rubric** (from Nora) — turns our self-administered
   rubric into external ground truth. Cheap to draft, and the coach-review
   plumbing to collect sign-off already exists. The binding constraint is a real
   coach's time, not code.
3. **Chain sequences** — decision pending. Not blocked by either of the above on
   the merits, but Nora's ordering argument is legitimate and is Thomas's call.

Nothing here changes NEXT #1.
