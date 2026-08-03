# RinkReads Scenario Engine — Ambitious Vision (2026-07-29)

**Status:** Ideation only. Nothing here is decided, committed, or in scope for tonight's
build. Tonight's committed plan is the foundation work in
`docs/factory/SCENARIO-ENGINE-DECISIONS.md` and
`docs/superpowers/specs/2026-07-29-scenario-engine-design.md`: prove one scenario
(the defensive-zone breakout) end to end through physics, tactical judgment, and
conservative promotion. This document does not expand that plan. It is research +
vision for Thomas to react to, cut, reorder, or shelve.

**Constraints every idea below respects, without exception:**

1. **Free-only (Decision 1).** No paid API. Every mechanism below runs on either
   deterministic code, the Claude Code session's own judgment, or local Ollama for
   mechanical work. Where a research example uses an LLM or a service Thomas doesn't
   have, the RinkReads mapping below substitutes a free/local equivalent and says so.
2. **Conservative safety posture (Decision 3).** Nothing here weakens "a wrong correct
   answer reaching a child is the worst defect this system can produce." Every
   capability that touches the review queue makes it *smarter about what to show
   Thomas*, never a way to show him less or promote with less evidence than the
   existing calibration bar (50+ decisions, 20+ per template, held-out set, zero
   wrong-answer false approvals) already requires.
3. **Grounded in the actual codebase.** Every capability names the existing or
   planned RinkReads system it would extend: the four-artifact bundle
   (`ScenarioDefinition -> SimulationTrace -> DecisionEvaluation -> CompiledTeachingPlay`),
   the tactical-claims knowledge base, the promotion-policy calibration corpus, the
   coach-authoring MVP, Daily Faceoff, the parent/coach progress card, and Brain Gym's
   Rink Rating / per-concept telemetry.

---

## External Research

Organized by mechanism. Each entry: the core idea, the source, and a concrete
RinkReads mapping (which existing/planned system it plugs into).

### Adaptive difficulty and mastery estimation

**Duolingo's Half-Life Regression (HLR).** A trainable memory model that estimates
the "half-life" of a specific item in a specific learner's memory as a continuous
latent variable, fit from ~13 million real learning traces (correctness, response
time as a confidence proxy, time-since-last-seen). It replaced a fixed forgetting
curve with a personalized one, weighted per-item from actual recall history, and
measurably improved engagement in production.
[Source: research.duolingo.com/papers/settles.acl16.pdf](https://research.duolingo.com/papers/settles.acl16.pdf),
[duolingo/halflife-regression](https://github.com/duolingo/halflife-regression)

*RinkReads mapping:* RinkReads already has kind-aware per-concept telemetry
(TASKS.md NEXT #6 calls it out as the reason the parent/coach card is "just
rendering, the data exists"). HLR is the missing piece between "we have accuracy
data" and "we know when this specific player will forget this specific concept."
It is pure statistics, not an LLM call, so it is free-only by construction and could
run as deterministic code inside the existing telemetry pipeline.

**Duolingo's Birdbrain.** An IRT-inspired model that jointly updates two numbers
after every single exercise: the exercise's estimated difficulty and the learner's
estimated ability on that skill. Difficulty and ability are estimated simultaneously
from the same interaction stream, not from separate calibration passes.
[Source: tomdaccord.com/blog/ai-and-duolingo](https://www.tomdaccord.com/blog/ai-and-duolingo),
[buildmvpfast.com](https://www.buildmvpfast.com/blog/ai-learning-personalization-duolingo-ai-driven-lessons-2026)

*RinkReads mapping:* directly extends Brain Gym Phase 2's planned Rink Rating and
"Today's Practice" auto-pick (weakest domain, strongest domain, rotating third).
Instead of a single accuracy percentage per domain, a Birdbrain-style joint estimate
would let the *same telemetry event* simultaneously recalibrate "how hard was this
scenario, really" (useful for the factory's novelty/difficulty tagging) and "how good
is this player at this domain now" (useful for next-scenario selection) — one
mechanism serving both the content side and the player side.

**Chess.com's Glicko-2 puzzle rating.** Unlike Elo, Glicko-2 tracks a rating
*and* a rating deviation (RD) — the system's own confidence in that rating — plus a
volatility term. A new or erratic player's RD is wide (rating swings fast on new
evidence); an established player's RD is narrow (rating moves slowly). Chess.com
re-rated 17 billion puzzle attempts specifically to remove inflation and make the
number mean something again.
[Source: chess.com/news/view/announcing-new-puzzles-rating-system](https://www.chess.com/news/view/announcing-new-puzzles-rating-system)

*RinkReads mapping:* the RD concept is the missing confidence dimension on Rink
Rating's planned 6-domain score. A domain score with few observations should say so
(wide band) rather than presenting a confident-looking number Thomas or a parent
might over-read.

**Lichess's per-theme puzzle radar.** Lichess decomposes a player's puzzle rating by
tactical *theme* (fork, pin, skewer, etc.) over a rolling 90-day window and renders
it as a radar chart, so a player can see exactly which pattern types are weak, not
just an aggregate score. Tags themselves are partly algorithmic (engine analysis) and
partly refined by player votes over time.
[Source: deepwiki.com/ornicar/lichess-puzzler](https://deepwiki.com/ornicar/lichess-puzzler/3-puzzle-tagging-system),
[lichess.org/forum/...thematic-weaknesses](https://lichess.org/forum/lichess-feedback/puzzle-improvement-areas-ie-thematic-weaknesses-concepts-discerning-power)

*RinkReads mapping:* this is nearly identical, in shape, to the already-planned "Rink
Map radar" in Brain Gym Phase 2 (6 hockey-named domains). The concrete addition this
research suggests: decompose *within* a domain by tactical-claim family (e.g., inside
"reads gaps," separately track 2-on-1 vs. defensive-zone-breakout vs. forecheck
reads), the same way lichess splits "tactics" into forks vs. pins. That finer grain
is exactly what would let Daily Faceoff or Today's Practice pick a *specific*
scenario family rather than a whole domain.

**IXL's SmartScore and adaptive Diagnostic.** IXL adapts at two levels
simultaneously — which item to show next *within* a skill, and which skill to move
to next overall — starting near the learner's known level and narrowing in a few
questions. SmartScore itself factors in recent-answer weighting and consistency, not
just raw percent-correct, and both diagnostic level and skill recommendations update
continuously as new data arrives.
[Source: blog.ixl.com/.../ixl-assessment-suite](https://blog.ixl.com/2022/08/11/the-ixl-assessment-suite-a-seamless-solution-for-learning-growth/),
[ixl.com/diagnostic](https://www.ixl.com/diagnostic)

*RinkReads mapping:* directly matches the planned Rookie Combine placement flow in
Brain Gym Phase 2 (a short adaptive placement pass rather than a fixed pretest), and
validates recency-weighting (not flat lifetime accuracy) as the right shape for the
per-concept telemetry that feeds it.

### Spaced retrieval and forgetting-aware content selection

**FSRS (Free Spaced Repetition Scheduler).** An open-source, community-built
memory model (used by Anki as an SM-2 replacement) that models three variables per
item per learner — difficulty, stability, and retrievability — fit from the
learner's own review-log history. It runs entirely locally, needs no network call,
and is explicitly free-only ("no risk under others' control" is stated as a design
goal by its own maintainers).
[Source: github.com/open-spaced-repetition/fsrs4anki wiki, "The Algorithm"](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm)

*RinkReads mapping:* this is the single closest external analog to the free-only
constraint in Decision 1 — it is proof that a real, production-grade, personalized
memory model can be built with zero paid inference, as pure math over event logs.
Concretely: Daily Faceoff's planned "5 curated reads/day" (NEXT #5) could select
which concept-family to resurface using an FSRS-style stability/retrievability
estimate per player per concept, instead of (or alongside) pure difficulty-matching —
answering "what is this player about to forget" as well as "what is this player weak
at."

### Generative content flywheels and dynamic pacing

**Left 4 Dead's AI Director.** Rather than fixed spawn points, the Director reads
real-time player-state signals (team health, ammo, recent stress) and dynamically
adjusts enemy density and pacing against a target tension curve, cycling
build-up/peak/relax phases so players get recovery time after a hard stretch rather
than a flat difficulty ramp.
[Source: left4dead.fandom.com/wiki/The_Director](https://left4dead.fandom.com/wiki/The_Director)

*RinkReads mapping:* Brain Gym Phase 2's "Today's Practice" already plans a
"hard stop with rest framing" after ~5-8 minutes. A Director-style pacing signal
(recent accuracy trend, streak state, session length) could modulate *within* a
session which family/difficulty gets served next, the same way the Director cycles
tension. This must respect the already-decided rule that Daily Faceoff alone owns
the calendar streak — this is a session-level pacing idea, not a second streak.

**Super Mario Maker's Course World promotion.** Player-authored levels are not all
equal citizens: Nintendo's system tracks clear rate and attempt patterns per course
and uses that evidence to algorithmically surface courses "destined to become
popular" into curated discovery categories, on top of a community star/like signal —
turning raw user-generated volume into a curated, evidence-ranked catalog rather than
an undifferentiated dump.
[Source: supermariomaker2.fandom.com/wiki/Course_World](https://supermariomaker2.fandom.com/wiki/Course_World)

*RinkReads mapping:* this is the closest external analog to what a coach-authored-play
flywheel would need (see Stretch Capability 5 below) — real usage evidence (not just
initial authoring quality) decides whether a piece of user-generated content graduates
into wider circulation.

### Self-improving knowledge bases from graded human feedback

**Content-moderation review-queue calibration.** Production moderation systems
triage by confidence into three lanes — auto-remove (high confidence), human review
(uncertain), auto-allow (low confidence) — and use active learning to prioritize
*which* uncertain cases go in front of a human first: examples near the decision
boundary carry 3-5x more model-improvement value per labeled item than randomly
sampled ones. Thresholds are then auto-calibrated from the accumulating reviewer
decisions rather than fixed once by hand.
[Source: arxiv.org/pdf/2103.16816 (QUEST: Queue Simulation for Content Moderation at
Scale)](https://arxiv.org/pdf/2103.16816),
[arxiv.org/pdf/2204.01334 (Efficient Uncertainty-based Moderation)](https://arxiv.org/pdf/2204.01334)

*RinkReads mapping:* this maps almost one-to-one onto the promotion-policy
calibration mechanism the design doc already commits to (the 50+/20+/held-out-20%
corpus, the "raise the auto-approve rate later, from evidence" language in Decision
3). The concrete addition this research suggests: *order* Thomas's review queue by
uncertainty (borderline-gate distance, novel claim combinations) rather than
chronologically, so each item Thomas actually looks at buys the maximum amount of
calibration evidence per minute of his time — literally "make the queue high-yield,"
which Decision 3 already asks for in words but doesn't yet specify a mechanism for.

**RLHF reward-model calibration decay.** A cautionary, technical finding: reward
models used to guide LLM training reliably become *miscalibrated over time* as
prompts, policies, and the underlying distribution drift — calibration is described
in the literature as "not a one-time cleanup," requiring ongoing tracking of
score-distribution drift and disagreement rates, not a single fit-and-forget pass.
[Source: arxiv.org/pdf/2410.09724 (Taming Overconfidence in LLMs: Reward Calibration in
RLHF)](https://arxiv.org/pdf/2410.09724),
[Reward Calibration for Continual RLHF](https://link.springer.com/chapter/10.1007/978-981-95-4094-5_14)

*RinkReads mapping:* this is independent confirmation (not a new idea, a stress test)
of a rule the design doc already states — "changing the model, rubric, context
manifest, physics version, renderer timing, or tactical schema invalidates the
affected calibration until it passes the versioned holdout again." The literature
says this is not optional caution, it is the default failure mode of any confidence-
based promotion system left unattended. Worth flagging as validated risk, not a new
build item.

**Wikipedia's pending-changes / flagged-revisions system.** Rather than one binary
trust level, Wikipedia grants a graduated "reviewer" permission to editors with a
sufficiently good track record (similar tier to rollback rights), who can then clear
other users' pending edits into accepted revisions — trust is earned per-editor from
history, not fixed per-edit.
[Source: en.wikipedia.org/wiki/Wikipedia:Pending_changes](https://en.wikipedia.org/wiki/Wikipedia:Pending_changes),
[Wikipedia:Reviewing pending changes](https://en.wikipedia.org/wiki/Wikipedia:Reviewing_pending_changes)

*RinkReads mapping:* extends Decision 3's tiered-auto-approve idea (currently scoped
to *templates*) to a second axis — the *coach* as an author. See Stretch Capability 6.

### Elite sports-specific perceptual-cognitive training

**Perceptual-cognitive training (PCT) research and commercial tools.** A published
systematic review and meta-analysis found PCT (pattern-recognition, anticipation, and
decision-making training) measurably improves anticipation and decision-making in
elite team-sport athletes, though transfer from lab/app performance to real-game
performance is consistently weaker than the training-context gains — an honest
caveat, not a reason not to build. Commercial tools already exist in this exact space
(IntelliGym, EyeGym, gameSense) across hockey, soccer, baseball, and football. A
separate VR study specifically targeted the "eyes-puck gap" in ice hockey.
[Source: mdpi.com/2076-328X/14/10/919 (Systematic Review and Meta-Analysis)](https://www.mdpi.com/2076-328X/14/10/919),
[PMC11993527 (VR ice hockey perceptual training)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11993527/)

*RinkReads mapping:* this validates RinkReads' entire "read the play" premise against
real sports science, and sharpens the honest pitch: existing perceptual-cognitive
trainers are largely generic reaction/tracking tests retrofitted with a sport skin.
None of the public tools found in this research are described as *physics-validated,
tactically-provable, age-banded scenario generators* — that combination (the
`ScenarioDefinition -> SimulationTrace -> DecisionEvaluation` chain already being
built) is the differentiator, not a me-too feature.

**USA Hockey's American Development Model (ADM) small-area games.** ADM's own
published practice-mix guidance allocates roughly 70% skill / 20% "hockey sense"
(via small-area games) / 10% team tactics for the youngest bands, explicitly because
small-sided, game-speed situations are described as the best rehearsal tool for
reading play at game speed — better than whiteboard diagrams for actually training
recognition.
[Source: kevinneeld.com/understanding-usa-hockeys-american-development-model-adm](https://www.kevinneeld.com/understanding-usa-hockeys-american-development-model-adm/)

*RinkReads mapping:* independent validation that RinkReads' age/skill-profiled,
physics-grounded scenario approach (not static diagrams) is aligned with the sport's
own governing development model, and a concrete ratio (70/20/10) that could inform
family-mix targets for young-age content in the factory's family-coverage planning.

---

## Ambitious Vision — Stretch Capabilities

Each capability names what it is, what existing/planned system it extends, and is
explicit about what already exists to support it versus what would need to be built.
None of these are commitments; all are gated on Thomas's review and prioritization.

### 1. Adaptive Per-Player Scenario-Family Selection ("Rink IRT")

A joint difficulty/ability estimate (Birdbrain-style) computed from the existing
kind-aware per-concept telemetry, so every answered scenario simultaneously updates
"how hard was this, really" and "how good is this player at this family now."
**Extends:** the per-concept telemetry TASKS.md already calls "kind-aware" and ready
to render; Daily Faceoff's "5 curated reads/day" selection; Brain Gym Phase 2's
"Today's Practice" weakest/strongest/rotating-third picker.
**Exists today:** the telemetry stream itself, the family/kind taxonomy in the
scenario bundle.
**Would need building:** the joint estimator (pure statistics, deterministic code,
no LLM), a per-player-per-family state store, and wiring it into the two selection
points above.
**Constraint fit:** entirely deterministic math; zero LLM or Ollama calls needed at
runtime; Ollama could optionally assist only in offline analysis of aggregate
telemetry for tuning, never in serving.

### 2. Rink Map Radar with Confidence Bands ("Domain Glicko")

Extend the already-planned Rink Rating / Rink Map radar with a Glicko-2-style rating
+ rating deviation (RD) per domain, and a lichess-style finer decomposition *within*
each domain by tactical-claim family, not just a flat percentage.
**Extends:** Brain Gym Phase 2's Rink Rating headline score and Rink Map radar
(already speced, not yet built).
**Exists today:** the six-domain structure and the Phase 2 design section itself.
**Would need building:** the RD/confidence calculation, the within-domain family
breakdown, and the radar rendering treatment for "this number is still uncertain."
**Constraint fit:** deterministic statistics only.

### 3. Spaced-Retrieval Concept Resurfacing ("Rink Forgetting Curve")

An FSRS-style local, deterministic memory model (stability/retrievability per player
per concept) that decides not just *which concept is weak* but *which concept is
about to be forgotten*, to select what Daily Faceoff resurfaces.
**Extends:** Daily Faceoff (NEXT #5), the per-concept telemetry.
**Exists today:** the telemetry event stream FSRS-style models are fit from.
**Would need building:** the stability/retrievability model itself (open-source
algorithm, pure math, no license or API needed) and its integration into Daily
Faceoff's daily selection.
**Constraint fit:** FSRS is the literal existence proof that this is a free,
local, no-API mechanism — that is the entire reason it was chosen as a research
example.

### 4. Calibrated Promotion Ledger (uncertainty-ordered review queue)

Make the already-committed promotion-policy calibration corpus (Decision 3: 50+
decisions overall, 20+ per template class, held-out 20%, zero wrong-answer false
approvals) actually self-improving by ordering Thomas's review queue by *uncertainty*
(borderline-gate distance, least-covered claim/parameter combinations) instead of
arrival order, the way content-moderation active-learning queues do — so each item he
looks at buys the most calibration evidence per minute, and the auto-approve
threshold for a template class tightens or loosens from that evidence exactly as
Decision 3 already specifies in prose.
**Extends:** the promotion-policy artifact (`config/scenario-promotion-policy.json`),
the judgment-record/run-envelope schema, the review queue itself.
**Exists today:** the entire calibration bar and corpus requirement is already
decided and specified; the judgment-record schema already captures the fields
(rubric hash, calibration-corpus version) an uncertainty-sampling ordering would
consume.
**Would need building:** the uncertainty score itself (deterministic, derived from
gate margins already computed during validation, not a new judgment call) and the
queue-ordering logic.
**Constraint fit:** this makes the existing conservative posture *more* evidence-
grounded, not less; it changes queue *order*, never queue *content* or the promotion
bar itself. RLHF calibration-decay research (above) is a direct caution to build in:
any rubric/kernel/physics change must invalidate and re-earn calibration, which
Decision 3 and the design doc already require.

### 5. Coach-Authored-Play-to-Template Flywheel ("Course World for Hockey")

A proven coach-authored play (clears every physics and tactical gate, then earns real
usage evidence — used by multiple players, appropriately calibrated difficulty, not
trivially easy or hard) graduates from "one coach's private play" into a new reusable
family template the generation engine and *other* coaches can draw from — the same
evidence-based promotion Mario Maker's Course World uses for user-generated levels.
**Extends:** Decision 2's coach-authoring MVP directly. Because a coach's authored
play already compiles down to the same `CompiledTeachingPlay` format as a generated
one (per Decision 2's explicit design), this is not a new content pipeline — it is
the existing kernel-graduation standard (three-play/all-band manual standard, per
Framework-Fit Decision 9) applied to a coach-originated template instead of a
Claude-authored one.
**Exists today:** the shared bundle format that makes coach and generated plays
interchangeable; the existing manual kernel-graduation bar.
**Would need building:** a "coach template" variant of the tactical-claim/kernel
registration path, and a usage-evidence tracker (times played, calibrated difficulty)
to decide when a coach play has *earned* graduation versus merely passed gates once.
**Constraint fit:** never bypasses the safety gates; adds an additional bar (real
usage evidence) on top of them, and every promotion is still Thomas's call per
Decision 3's manual-graduation requirement for new template classes.

### 6. Trusted-Coach Authorship Tiers ("Autopatrolled Coaches")

Extend Decision 3's tiered auto-approve concept (currently scoped to *content
templates*) to a second axis: a coach whose past authored plays consistently clear
every gate without correction earns a lighter review tier on *future* submissions,
the way Wikipedia grants "reviewer" rights to editors with an established clean
track record — never bypassing hard physics/tactical gates, only reducing how often
a clean-history coach's drafts need Thomas's manual pass before team distribution.
**Extends:** Decision 2's coach-authoring MVP, Decision 3's tiered review posture,
the coach-authorization/RLS work already scoped in Framework-Fit Decision 5.
**Exists today:** per-coach ownership and authorization already scoped as a build
item; nothing about per-coach trust history yet.
**Would need building:** a per-coach track-record store and the trust-tier logic.
**Constraint fit:** hard gates (physics, tactical-claim proof) are never
tier-dependent; only the human-review lane's depth/priority is. A coach's first
submissions, and any submission that trips a hard gate regardless of tier, always
reach full review.

### 7. Bench Director — Within-Session Pacing Signal

A lightweight, L4D-Director-style pacing signal (recent accuracy, session length,
streak state) that modulates which family/difficulty gets served *within* a single
Today's Practice session, not just which day's content is picked — giving the
already-planned "hard stop with rest framing" an adaptive trigger instead of a fixed
timer.
**Extends:** Brain Gym Phase 2's Today's Practice.
**Exists today:** the session-wrapper concept and the rest-framing UX decision
itself.
**Would need building:** the pacing-signal calculation and its wiring into session
flow.
**Constraint fit:** must explicitly not create a second streak mechanic; Daily
Faceoff owns the calendar streak per the standing decision, and this stays scoped to
within-session content ordering only. Flagged here as the idea most likely to need a
short design conversation before touching anything, precisely because it sits near
an already-settled ownership boundary.

### 8. Progress Card as the Compounding-System's Report Surface

The already-planned parent/coach weekly progress card (NEXT #6) becomes the
human-facing window into everything above: domain ratings with confidence bands (2),
concepts "coming up for review" (3), and coach-specific notes if the coach-authoring
flywheel (5/6) is live — giving parents and coaches the same kind of legible,
trend-over-time signal chess.com and Duolingo give their own users, using data these
capabilities already produce rather than a new backend.
**Extends:** NEXT #6 directly; explicitly described in TASKS.md as "rendering +
delivery" because the telemetry already exists.
**Exists today:** the telemetry and the card's own spec.
**Would need building:** the richer visual/trend treatment, once (2) and (3) exist to
feed it.
**Constraint fit:** purely a rendering/aggregation layer over data the other
capabilities already produce; no new judgment calls, no new gates.

---

## Highest-Leverage Starting Point

Given tonight's foundation plan is already committed to proving one scenario end to
end before anything scales, two capabilities stand out as the ones that ride
directly on top of what is *already being built tonight*, rather than requiring new
product surfaces:

**Capability 4 (Calibrated Promotion Ledger)** is close to free to add once the
promotion-policy artifact and judgment-record schema exist, because the calibration
corpus, held-out set, and "raise the auto-approve rate later, from evidence"
language are already committed decisions — this capability just names the concrete
mechanism (uncertainty-ordered queue) that would make that language true in practice
instead of true only on paper. It has no product-surface cost and directly serves
the standing safety priority: it makes the review queue better at protecting kids,
not looser.

**Capability 5 (Coach-Authored-Play-to-Template Flywheel)** is the most exciting one
in this document, because it changes what the whole system fundamentally is. Right
now the plan is "Claude generates content, coaches also get to author their own
plays" — two separate outputs. Because Decision 2 already makes a coach-authored
play compile down to the exact same `CompiledTeachingPlay` format as a
Claude-generated one, the graduation path from "one coach's private play" to "a
template every coach's players can draw from" is not a new pipeline, it is the
existing kernel-graduation bar pointed at a different source of proposals. That is
the mechanism by which the content library could keep growing forever from real
usage, without a single additional generation run, the same way Mario Maker's Course
World turned millions of individual creators into the actual content supply. It is
the closest thing in this document to "almost unbelievable," and it costs nothing to
build beyond what Decision 2 already commits to shipping.

Both ride on the same foundation tonight is already proving: the shared
`ScenarioDefinition -> SimulationTrace -> DecisionEvaluation -> CompiledTeachingPlay`
bundle, the tactical-claims knowledge base, and the conservative promotion policy. If
the foundation slice works end to end, both of these become "point an existing
mechanism at a new input," not "build a new system."
