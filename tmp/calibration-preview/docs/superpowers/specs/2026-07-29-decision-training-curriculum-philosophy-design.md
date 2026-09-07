# Decision-Training Curriculum Philosophy & Rubric

**Status:** DESIGN document. Not authorization to change any family, any content, or
any code. This is a lens for evaluating and designing teaching progression — applied
here as a worked example against real existing content, but nothing in this document
changes that content. Nothing here is committed to git.

**Dated:** 2026-07-29

## Purpose

RinkReads has two places where a "teaching progression" already exists or is planned:
a family's `teachingArc` (in `src/play/playFamilies.js`, e.g. `two_on_one`'s six-step
arc), and the not-yet-built Rink Rating / player-journey system (`docs/roadmap/TASKS.md`,
NEXT #7). Neither was designed against an explicit sequencing philosophy — `teachingArc`
arrays appear to have accumulated content-by-content rather than been designed as a
deliberate ladder. This document borrows a proven external methodology — Chris
Oliver's Basketball Decision Training (Basketball Immersion) — to give RinkReads a
named, checkable philosophy for both, without changing any existing content today.

## Source grounding

Chris Oliver's methodology (verified against public material, not assumed from name
recognition):

- **Constraints-led coaching**: deliberate limitations imposed to force decision-making,
  not open-ended play. ([Developing Effective Basketball Decision-Making Skills](https://basketballimmersion.com/developing-effective-decision-making-skills/))
- **Blocked → Random practice**: blocked (repetitive, low transfer) gives way to
  random/game-like practice, which produces the most transfer to real performance —
  a real, named progression, not just "easy to hard." ([same source](https://basketballimmersion.com/developing-effective-decision-making-skills/))
- **"Coach the game by playing the game"**: practice should look like the real activity
  throughout, not isolated drills followed by a scrimmage at the end.
- **Messy learning**: mistakes are treated as information, not failure — players are
  encouraged to test and self-correct rather than being immediately corrected.
  ([Basketball Decision Training: The What, Why and How](https://basketballimmersion.com/teachingmanual/))

## The four principles, translated to RinkReads

1. **Constrain first, don't open first.** A scenario's opening read should be
   deliberately narrow — one clearly-forced correct answer given the constraints —
   not an ambiguous "many things could be right" situation. RinkReads' kernel-based
   generation already does this by construction (a `commit` parameter forces a
   specific defender behavior, which forces a specific correct read); this principle
   makes it an explicit, checkable property of *any* new content, hand-authored or
   generated.

2. **Constraint-openness is its own axis, separate from difficulty.** A scenario can
   be *simple* (young age band, few actors) but *open* (multiple genuinely viable
   reads), or *complex* (busy geometry, older age band) but *tightly constrained*
   (still only one forced read). RinkReads' existing `declaredRead`/`derivedRead`
   machinery already measures how forced a read is — this principle says a family's
   progression should track *that* axis on purpose, not rely on age/skill difficulty
   to stand in for it.

3. **Every rep looks like the game.** No isolated "identify the concept" flashcard
   step — every teaching moment is a live, animated decision under time pressure.
   RinkReads' animated-play format already satisfies this by construction; this
   principle is a regression check for future content, not a change to the format.

4. **Mistakes are data.** Wrong-answer feedback must explain the *mechanism* (why the
   chosen option fails, in hockey terms), never just mark it incorrect. This is
   already partially true per `docs/roadmap/TASKS.md`'s 2026-07-10 entry ("coach
   feedback now appears after every answer with bounded language") — this principle
   makes it an explicit rubric check rather than an implicit norm.

## The rubric

A five-question checklist, applied to one family's `teachingArc` (or, later, to
Rink Rating's cross-family sequencing):

1. **Constrain-first check** — does the arc's first entry represent a single,
   clearly-forced read, not an open-ended one?
2. **Blocked→Random ladder check** — moving through the arc, does constraint-openness
   generally *increase* (progressively more live discrimination among viable options),
   independent of raw difficulty? Or does the arc just enumerate variety at a flat
   openness level?
3. **Live-rep check** — is every arc entry a real animated decision moment, not a
   static concept label?
4. **Mistake-mechanism check** — does the family's actual feedback copy explain *why*
   a wrong answer fails, not just that it's wrong?
5. **Kernel-coverage cross-check** (RinkReads-specific addition, tying this rubric to
   tonight's separate technical design) — does this arc entry have a kernel-generated
   decision axis backing it, or is it hand-authored-only? This doesn't judge the arc's
   pedagogy, but it flags where the *technical* generation pipeline can and can't yet
   reach a given teaching point — directly relevant to sequencing which content gets
   more generated variants versus staying hand-curated.

## Worked example: `two_on_one`'s real teachingArc

Applied honestly against the six real entries (`src/play/playFamilies.js`):

| # | Arc entry | Constrain-first? | Ladder position | Live rep? | Kernel-covered? |
|---|---|---|---|---|---|
| 1 | Defender steps up → pass to support | Yes — kernel-forced (`commit=stepsUp`) | Base forced read | Yes | Yes |
| 2 | Defender holds middle → attack open shot lane | Yes — kernel-forced (`commit=holdsMiddle`) | Parallel forced read, not more open than #1 | Yes | Yes |
| 3 | Backchecker closing → move puck before lane closes | N/A, hand-authored | Adds a *wrinkle* to the same core read | Yes | No |
| 4 | Goalie late → quick shot outcome | N/A, hand-authored | Adds a wrinkle | Yes | No |
| 5 | Support too flat → avoid forcing a low-value pass | N/A, hand-authored | Adds a wrinkle | Yes | No |
| 6 | Pass lane removed → puck carrier keeps attack | N/A, hand-authored | Adds a wrinkle | Yes | No |

**Honest finding, not a forced pass/fail:** this arc satisfies the constrain-first and
live-rep checks cleanly. It does **not** clearly satisfy the Blocked→Random ladder
check — entries 1–2 are two parallel forced reads (not one more open than the other),
and entries 3–6 read as *robustness variations* on the same core decision (same
fundamental 2-on-1 read, tested against four different complicating wrinkles) rather
than a progression toward increasingly open, live decision-making. That's a
meaningfully different design than what Decision Training describes — it's closer to
"one decision, tested six ways" than "blocked forced read graduating to random open
play." Neither is wrong on its own terms, but the rubric's job is exactly to surface
that this arc is doing the former, so a human can decide on purpose whether that's
the intent or whether a genuinely more-open closing entry (e.g. a scenario where two
options are both defensible and the player must discriminate live) would complete the
ladder Decision Training describes.

The mistake-mechanism check is **not verified in this pass** — it requires reading the
actual coach-feedback copy strings for this family's plays directly, which this
document did not do; flagged here rather than assumed either way.

The kernel-coverage finding (2 of 6 covered) exactly matches what
`docs/superpowers/specs/2026-07-29-scenario-family-templating-FINAL-viable-design.md`
already surfaced independently — this rubric and that technical design agree on the
same gap from two different angles, which is a good cross-check rather than a
coincidence to explain away.

## What this does not do

- Does not change `teachingArc`, any family, any content, or any code.
- Does not decide whether `two_on_one`'s arc should be changed — that's a judgment
  call for whoever owns family design, informed by this rubric, not decided by it.
- Does not yet apply to Rink Rating (unbuilt) — this document establishes the
  philosophy; applying it to Rink Rating's actual design is separate, future work.
- Does not commit anything to git.

## Next step, if useful

This rubric could be run against every existing family's `teachingArc` (not just
`two_on_one`) as a quick audit, and/or become an explicit design input when Rink
Rating's spec is eventually written. Both are follow-on tasks, not part of this
document.
