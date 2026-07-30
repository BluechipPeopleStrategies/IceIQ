# RinkReads Scenario-Family Templating — Design/Research Document

**Status:** DESIGN/RESEARCH ONLY. This document does not authorize
implementation, does not modify `docs/factory/SCENARIO-ENGINE-DECISIONS.md`,
does not modify `docs/superpowers/plans/2026-07-29-scenario-engine-foundation-plan.md`,
and does not modify `docs/superpowers/specs/2026-07-29-scenario-engine-design.md`.
It is a research digest plus a set of concrete recommendations for Thomas to
accept, amend, or reject. No code was written or changed to produce it.
**Author:** Claude (research subagent)
**Date:** 2026-07-29
**Relates to branch:** `feature/shareable-beta` (no changes made on it)

## Authority and reading order

This document sits downstream of, and defers to, the existing hierarchy:

1. `docs/factory/SCENARIO-ENGINE-DECISIONS.md` — owner-decision record. Still
   wins on any conflict.
2. `docs/superpowers/specs/2026-07-29-scenario-engine-design.md` — canonical
   architecture and boundary specification. Still wins on any conflict.
3. `docs/superpowers/plans/2026-07-29-scenario-engine-foundation-plan.md` —
   owns implementation sequence today. This document proposes changes to that
   sequencing (see Deliverable B(d) and the recommendation section) but does
   not itself make them.
4. **This document** — external research plus a proposed design for the one
   piece the plan explicitly left open: **Judgment Call #3, the
   novelty-signature schema**, and the broader question of how one proven
   scenario becomes a validated family. Nothing here is authorized until
   Thomas approves it, at which point the relevant parts should be folded
   into the plan/decisions docs by a separate, explicit edit.

## Why this document exists

The scenario-engine plan proves the pipeline end-to-end on exactly **one**
breakout scenario (Phase 6's exit gate, "the plan's central gate"). Templating
— turning that one proven scenario into a family of siblings — has been the
least-specified layer across every prior iteration of this system (see the
prior-attempt history in `docs/factory/rinkreads-capability-inventory-2026-07-29.md`,
the research digest this document is built from), consistently surrounded by
ever-more-rigorous validation machinery everywhere else. This document does two things: (A) surveys how other fields that solve
the same problem — generate a family of validated, meaningfully distinct
instances from one template — actually do it, and (B) turns that research
into a concrete design for RinkReads, without deciding anything Thomas hasn't
signed off on.

---

## Deliverable A — External Research

Five research streams were run in parallel. Each is summarized below by
technique, core idea, and the concrete translation to RinkReads' code
(`src/play/kernels/twoOnOneKernel.js`, `src/play/noveltyGate.js`) and to the
four-artifact bundle (ScenarioDefinition → SimulationTrace →
DecisionEvaluation → CompiledTeachingPlay).

### Area 1 — Procedural content generation: constraint/grammar-based family generation

- **Answer Set Programming (ASP) for PCG — "Design Space" approach** (Smith &
  Mateas, IEEE TCIAIG 2011, https://adamsmith.as/papers/tciaig-asp4pcg.pdf).
  Instead of generate-then-filter, the design space itself is encoded as
  logic: choice rules state what *might* be true, integrity constraints state
  what must *never* be true, and a solver (Clingo) only ever enumerates
  artifacts that already satisfy every constraint. Invalid artifacts are
  never constructed, not discarded afterward. **Translation:** the two-on-one
  kernel is currently a textbook generate-and-test procedure — Cartesian
  product of `commit×depth×shape×mirror×seed` (48 combos), *then*
  `pointSegDist` invariant checks, *then* `noveltyGate.js` distance rejection.
  The design-space model recommends collapsing this into one declarative
  constraint layer that runs *before* a candidate is built — which also gives
  Judgment Call #3 a natural home: define the novelty signature as the same
  choice-rule/integrity-constraint dimension set, so distinctness is
  guaranteed by construction rather than policed after the fact.

- **Quality-Diversity search / MAP-Elites — explicit behavior-characterization
  (BC) axes** (Gravina, Khalifa, Liapis, Togelius, Yannakakis, arXiv:1907.04053;
  Liapis explainer at https://antoniosliapis.com/articles/pcgqd.php).
  QD algorithms replace one global fitness score with a small, designer-chosen
  set of BC axes, discretize them into a grid, and keep at most one elite per
  cell — diversity guaranteed by construction, not measured pairwise
  afterward. **Translation:** `noveltyGate.js`'s `answerSignature()` (correct
  option + one of 3 vertical bands) is already, unknowingly, a primitive
  one-axis BC grid — but it only encodes "where the puck ended up," not the
  axes the spec actually asks for (tactical claim, decision/cue topology,
  answer, geometry/time distance). This is the closest published precedent to
  Judgment Call #3 and is the basis for Deliverable B(b) below.

- **Spelunky level generation — load-bearing solution path vs. non-load-bearing
  decoration** (Kazemi, https://www.tinysubversions.com/spelunkyGen/; Yu, GDC
  2021). Spelunky separates level generation into two clean passes: a
  directed random walk that guarantees solvability by construction (structural
  room types with guaranteed exits), then a *separate* decorative pass that
  scatters variety purely for feel, never touching solvability.
  **Translation:** this directly names the split already visible in
  `twoOnOneKernel.js`'s own source comments — `commit` and `shape` are
  load-bearing (the kernel's header comment names `commit` as the parameter
  that decides the correct answer outright, and separately says `shape`
  "MOVES the answer target ~30ft" — both work like a path-room type moving
  the guaranteed exit); `depth`, `mirror`, and jitter `j()` are decorative
  (commented "non-load-bearing only"). The kernel currently runs all five
  axes through one Cartesian product and one downstream filter. Spelunky's
  precedent argues for two explicit passes instead: a **structural**
  generator over the load-bearing axes only (`commit`, `shape`), sized to
  however many genuinely distinct answer-states exist, followed by a
  **decorative** pass — a natural fit for the kernel's existing
  `src/play/playVariants.js` (already imported for `mirrorPlayY`) — that
  varies presentation on top of an already-locked structural choice — and
  decorative axes should stop feeding `noveltyGate.js`'s distance calculation
  entirely, since Spelunky's dressing was never meant to produce a new
  sibling.

- **Lichess puzzle generation — mined, engine-verified, tagged after the fact**
  (https://database.lichess.org/#puzzles; https://github.com/ornicar/lichess-puzzler;
  https://notes.billmill.org/chess/how_lichess_puzzles_are_generated.html).
  Puzzles are mined from real games, kept only if Stockfish confirms the
  correct continuation is an "only move" by a numeric **eval-gap threshold**
  against the next-best alternative; theme tags (fork, pin, sacrifice) are
  assigned *after* generation by pattern detectors reading the verified line.
  Uniqueness/correctness and categorization are two separate passes over the
  same validated trace. **Translation:** two applications. (1) Borrow the
  gap-threshold pattern for `DecisionEvaluation.ambiguity`: compute a numeric
  margin off `SimulationTrace` (e.g. minimum lane-clearance or
  time-to-decision distance between the correct answer and the next-best
  physically-available candidate) rather than a binary ambiguity flag. (2)
  Question-kind variants and the novelty signature's "decision/cue topology"
  axis should be *derived* by a tagger reading the finished
  `DecisionEvaluation`/`CompiledTeachingPlay`, never baked into
  `ScenarioDefinition` generation parameters up front — this decouples
  topology-tagging from `twoOnOneKernel.js` and reuses cleanly across future
  kernels (three-on-two, breakout, etc.).

### Area 2 — Sports/military/serious-games automated scenario generation (ASG)

(Commercial sports tactical-whiteboard tools — TacticalPad, Coach Tactic
Board, Tactics Manager, Sports Tactics Board — were checked and are all
single-scenario authoring/animation tools with saved libraries; none has a
generative "one scenario → validated family" concept. RinkReads is filling an
actual gap here, not skipping a known solution.)

- **Combinatorial-optimization-with-novelty-search + Levenshtein edit-distance
  diversity metric + separate causal-coherence repair pass** (Zook, Lee-Urban,
  Riedl, Holden, Sottilare & Brawner, FDG 2012,
  https://faculty.cc.gatech.edu/~surban6/publs/2012_FDG.pdf). A genetic
  algorithm evolves scenarios (sequences of events from an authored template
  library) against a weighted-sum fitness function; diversity is measured
  *separately* as edit distance between scenarios in the population (an
  explicitly-named coarse baseline); a post-processing planner repairs
  causally-incoherent crossover results *after* the GA rather than rejecting
  them outright. **Translation:** directly answers Judgment Call #3 — extend
  `noveltyGate.js`'s continuous-only signature with a discrete symbolic layer
  (count changed fields across `declaredRead`, decision-freeze topology, cue
  sequence, question-kind variant), using geometric distance only as a
  tiebreaker within a matching symbolic bucket. Also worth naming explicitly:
  the causal-coherence-*repair* pattern is a **considered-and-rejected**
  alternative here — `twoOnOneKernel.js`'s assert-and-throw `pointSegDist`
  invariants (construct-correct, hard-reject) are stricter and more auditable
  than generate-then-patch, and that stricter choice is consistent with the
  architecture's "physics can veto, no silent resolution" rule and should stay.

- **Hybrid ML ASG: expert-assigned per-parameter complexity weights, two-stage
  novelty-then-fitness, explicit novelty/correctness separation** (Sottilare,
  DHSS 2018,
  https://www.gifttutoring.org/attachments/download/3096/2018_Sottilare_DHSS_A%20Hybrid%20Machine%20Learning%20Approach%20to%20ASG_V6.pdf).
  A domain expert assigns each parameter axis a known complexity contribution
  up front; generation runs in two stages — a small hand-picked seed set is
  diversified via novelty search first, *then* a separate fitness-driven loop
  refines it. States plainly: "not all scenarios created would be relevant,
  doctrinally correct, or even possible" — novelty and correctness are two
  independent, sequential filters, never one combined score. **Translation:**
  formalizes the exact pattern already implicit in the kernel's own comments.
  Recommend assigning each axis (commit, depth, shape, mirror, seed) an
  explicit numeric complexity/answer-move weight up front, and running novelty
  search on a small hand-picked seed pool *before* the expensive
  SimulationTrace→DecisionEvaluation loop runs on it — turning
  `noveltyGate.js` from a purely defensive post-hoc filter into a deliberate
  first stage.

- **DARPA SAIL-ON's 8-level Open World Novelty Hierarchy + "nuisance novelty"**
  (Chadwick et al., ICCRTS 2021, https://arxiv.org/abs/2302.12314). Classifies
  any scenario change by which entity-relationship it touches (Objects →
  Agents → Actions → Relations → Interactions → Rules/Goals/Events), and names
  "nuisance novelty" as its own category: a technically-different parameter
  change unlikely to matter to the agent, which should get an explicit
  well-defined-metric carve-out rather than being pooled with consequential
  changes. Continuous parameters get per-difficulty-tier statistical
  distributions rather than one flat range. **Translation:** gives a ready
  classification for the kernel's axes — `depth` = Relations (static,
  matches its own "non-load-bearing" comment), jitter `j()` = textbook
  nuisance novelty, `shape` = Interactions (changes the geometric relationship
  between actors, hence changes `derivedRead`), and `commit` = Interactions
  level or higher — the kernel's own header comment names `commit` as the
  parameter that decides the correct answer outright (line 3: "the CORRECT
  ANSWER is decided by the `commit` parameter"), which is at least as
  consequential as `shape` moving the answer target, so `commit` cannot be
  classified any lower than `shape` on this hierarchy (an earlier pass at this
  translation mis-tagged it Agents-level, two rungs below Interactions — that
  was wrong and is corrected here). Recommend a hard rule that "meaningfully
  novel" requires a change at Interactions level or higher — applied against
  this corrected classification, that rule correctly keeps both `commit` and
  `shape` on the meaningfully-novel side and only `depth`/`mirror`/jitter on
  the nuisance/incidental side — and replacing the flat jitter function with
  per-age/skill-profile statistical distributions (tighter sigma for
  younger/lower-skill profiles) tied to the ScenarioDefinition's single
  required profile.

- **Nominal-scenario + layered problems/distractors architecture, difficulty
  scaled by trainer-curated (not automatically validated) sets** (US Patent
  5,311,422, https://patents.google.com/patent/US5311422A/en). A foundational
  CAI patent has **no automated check** that combined inserted problems remain
  mutually coherent — validity is guaranteed only because a human
  pre-authored which combinations are safe. **Translation:** useful mainly as
  a contrast that validates a choice RinkReads has already made: even this
  decades-old architecture punted on exactly what `twoOnOneKernel.js`'s
  assert-and-throw invariants solve automatically. Worth a rationale line in
  any future design doc, and a reminder not to regress toward hand-curated
  "safe combos" when a second family (three-on-two, etc.) is built — new
  kernels should keep the invariant-assertion pattern.

### Area 3 — Interactive-fiction / branching-narrative tooling

- **Ceptre — linear-logic rule schemas + structured proof-trace** (Martens,
  CMU 2015, https://www.cs.cmu.edu/~cmartens/ceptre.pdf and PhD thesis
  https://www.cs.cmu.edu/~cmartens/thesis/thesis.pdf). Mechanics are typed,
  variable-parameterized linear-logic rules (`A -o B`); execution is proof
  search; the resulting proof distinguishes *concurrent* rule applications
  (independent) from *disjunctive* branching (real alternatives competing for
  the same resource). The paper explicitly disclaims exhaustive-coverage
  proof once rules are genuinely parameterized — undecidable, out of scope.
  **Translation:** (1) parameter-axis discipline — a bound variable only
  belongs in the model if it changes which consequence fires; `commit` and
  `shape` are real Ceptre-style variables (per the kernel's own header
  comment, `commit` decides the correct answer outright, ahead of `shape`),
  `depth`/`j()` are not and should be tied to an actual invariant branch or
  dropped as axes. (2) Ceptre's causal trace (what a rule consumed/produced,
  what competed) is a good template for enriching `SimulationTrace`'s
  structured findings, so a `declaredRead != derivedRead` mismatch already
  carries its causal "why." (3) The undecidability disclaimer is a guardrail
  for Judgment Call #3 itself: don't design the novelty signature to formally
  prove exhaustive distinctness — treat it as a documented heuristic over the
  kernel's own invariant predicates, as Deliverable B(b) does below. (4) The
  same axis-discipline test applies directly to `src/play/questionKinds.js`
  — the module whose own header calls it the "Single source of truth for
  question kinds" — before any kernel-driven question-kind variant is added
  to it: a candidate kind belongs there only if it changes which
  `DecisionEvaluation` outcome fires, not merely how the prompt is phrased.

- **Yarn Spinner 3 node groups + `when:` saliency clauses, compiler-enforced
  all-or-none preconditions** (https://docs.yarnspinner.dev/write-yarn-scripts/yarn-spinner-editor/errors;
  https://docs.yarnspinner.dev/next/3-new-in-v3/language-features/node-groups).
  Multiple nodes share a name, each guarded by a `when:` condition; the
  compiler hard-errors (YS0031) if some nodes in a group have conditions and
  others don't — variant-selection logic must be total and non-ambiguous *at
  compile time*. **Translation:** (1) adopt the all-or-none rule verbatim as
  a schema-validation gate — if any sibling in a family declares a scoping
  precondition (age band, cue availability), every sibling must, and the
  build should hard-fail rather than let one variant silently default to
  "always applies." (2) Yarn Spinner's "most specific wins" saliency strategy
  is a ready tiebreak for `DecisionEvaluation` ambiguity — before falling back
  to `review-required`, rank candidates by how many currently-true invariants
  their validity depends on, while still hard-failing true ties or
  `declaredRead` mismatches exactly as today. (3) Concretely, both rules
  apply to `src/play/questionKinds.js`'s existing variant list: each entry
  there is a Yarn-Spinner-style node-group member, and the all-or-none
  precondition rule and the "most specific wins" tiebreak should be enforced
  directly against that file's variants rather than a new parallel
  structure.

- **Ink's weave/gathers (structural reachability) vs. sequence/cycle/once/shuffle
  alternatives (presentation-only)** (https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md).
  Divergent branches are guaranteed to reconverge at the next gather by
  syntax alone; separately, four alternative types vary *displayed text*
  without ever touching story state. **Translation:** a strong argument for a
  build-time lint, not just a filing convention: question-kind/prose variant
  generation must be a pure function of the already-computed
  `CompiledTeachingPlay`/`DecisionEvaluation.derivedRead`, and must never read
  `ScenarioDefinition.declaredRead` or kernel params directly. Concretely,
  this is a lint over `src/play/questionKinds.js` (the module's own header
  names it "Single source of truth for question kinds") and its callers, and
  over `src/play/playVariants.js` (already imported by the kernel for
  `mirrorPlayY`, i.e. already exactly this kind of presentation-only,
  state-preserving variant) — the check should fail the build if either
  module's variant generator takes any input upstream of the compiled play,
  turning "variants can never diverge from the resolved answer" from a
  hoped-for invariant into a statically-verifiable one.

- **Twine's bolted-on-after-the-fact reachability tooling**
  (https://github.com/ehenestroza/twine-graph;
  https://twinery.org/forum/discussion/5419/advanced-passage-connectivity-testing).
  Twine ships with no built-in reachability checker; the ecosystem's answer
  (`twine-graph`, community DFS + state-hashing scripts) lives outside the
  authoring tool, bolted on after publishing. **Translation:** a cautionary
  parallel, not a technique to copy — it is the same shape as
  `noveltyGate.js` being a post-hoc dedup filter applied after
  `twoOnOneKernel.js`'s Cartesian expansion. The state-hash-DFS idea (hash the
  *tactically relevant state* and dedupe on that hash before doing expensive
  work) suggests computing the novelty signature from the kernel's own
  already-asserted invariant predicates at generation time, before
  simulation — folding "correct-by-construction" and "meaningfully distinct"
  into one signature instead of two unrelated mechanisms that happen to run
  back to back.

### Area 4 — Novelty gates / content-space coverage / diversity metrics

- **Novelty Search + Constrained/Feasible-Infeasible Novelty Search** (Lehman
  & Stanley; Liapis et al.). Novelty search scores against a **persistent
  archive** of previously-accepted behaviors, not a batch-local comparison
  set, and grows it over time; when a feasibility boundary splits the search
  space, feasible/infeasible populations must be tracked separately or
  novelty scoring near the boundary gets distorted. **Translation:**
  `noveltyGate.js` currently does the batch-local, no-archive, no-boundary
  version — `filterNovel()` compares only against "every existing+kept play"
  *in the current run*, with signature buckets capped at 3. Recommend (1)
  making the comparison set a persistent archive keyed off the staged/promoted
  artifact store, and (2) pulling a "margin-to-veto" field out of
  `SimulationTrace`/`DecisionEvaluation` (distance from the physics solver's
  actual pass/fail threshold, e.g. how close `pointSegDist` sits to the
  lane-blocked assertion) and adding it as a signature dimension — near-boundary,
  barely-provable states are often the most teachable ("defender juuust can't
  close the lane") and pure shared-actor Euclidean distance will
  systematically under-credit them.

- **MAP-Elites illumination, applied to game content** (Mouret & Clune;
  Gravina et al.). Diversity is illuminating a behavior space, not filtering
  a fixed batch: pick a small number of domain-meaningful dimensions,
  discretize into a grid, let generation's job be filling every cell.
  Descriptor choice *is* the definition of "meaningfully different" for that
  content type (Mario: 8 binary mechanic flags; dungeons: symmetry/linearity/
  room-count; Hearthstone: mana-curve mean+variance). **Translation:** this is
  the direct basis for the concrete schema proposed in Deliverable B(b) below
  — a small named archive grid per family, "novel" redefined as "lands in an
  empty or underfilled cell" rather than a Euclidean threshold, which also
  gives Phase 10's benchmark a free coverage metric (fraction of cells filled).

- **Expressive Range Analysis (ERA)** (Smith & Whitehead 2010, plus
  metric-selection follow-ups). Generate broadly across the full parameter
  space, measure the actual behavior metrics of interest for every sample,
  and plot them — exposing empirically which parameters move the metrics and
  which just cluster everything together, rather than trusting a
  programmer's assumption. **Translation:** `twoOnOneKernel.js` currently
  asserts which axes matter by code comment alone. Recommend a one-time
  diagnostic (reusing `noveltyGate.js`'s existing `answerTarget()`/
  `answerSignature()`/`layoutDistance()` primitives) that expands all 48
  combos and plots each on the actual answer/layout metrics *before* Phase 5
  or Phase 10 lock the parameter grid — this either confirms the kernel's own
  comments with real numbers, or reveals `depth`/`mirror` move some other axis
  (e.g. cue timing) the current answer-only signature is blind to.

- **Kate Compton, "10,000 Bowls of Oatmeal"** (perceptual vs. mathematical
  uniqueness). A generator can produce arbitrarily many numerically-distinct
  outputs that are perceptually identical; variation axes should be chosen
  because a person actually perceives and cares about them, not because they
  were easy to parameterize. **Translation:** root-cause diagnosis for the
  digest's own finding — the 48-combo product is a bowls-of-oatmeal generator
  where `depth`/`mirror`/jitter are mathematically unique but perceptually
  oatmeal (confirmed by only `commit` and `shape` ever being commented as
  answer-moving), and `noveltyGate.js` is the symptom-level patch, not the
  cure. Recommend
  `ScenarioDefinition.generationParams` only expose parameters pre-validated
  (via the ERA pass above) as moving something a coach/learner actually
  perceives.

### Area 5 — Template-based item generation in standardized testing/edtech

- **AIG item models with tagged "radicals" vs. "incidentals"** (Gierl & Lai;
  https://en.wikipedia.org/wiki/Automatic_item_generation;
  https://ncme.org/wp-content/uploads/2025/10/Module-34-Automated-Item-Generation-Gierl-Lai.pdf).
  Every manipulable element of an item template is explicitly tagged
  **radical** (tied to the cognitive/construct model — changing it changes
  what's tested and/or difficulty) or **incidental** (surface variation,
  construct/difficulty unchanged). Under "strong theory" AIG, every radical
  must trace back to a cognitive model of how the item is solved.
  **Translation:** `twoOnOneKernel.js` already independently reinvented this
  exact distinction in source comments, but as an assertion buried in a
  comment, not structured, reviewable metadata. This is the direct basis for
  Deliverable B(a)'s `parameterRole` recommendation below.

- **Empirical equivalence testing of clones** (ETS on-the-fly GRE item-model
  program; Rasch infit/outfit validation in clinical AIG;
  https://ejournals.bc.edu/index.php/jtla/article/view/1663;
  https://pmc.ncbi.nlm.nih.gov/articles/PMC10700404/). ETS built 48
  systematic GRE variants differing only in expert-believed difficulty-driving
  factors; correlation between expert-predicted and empirically-observed
  difficulty ran as low as ~0.10 in some conditions — expert intuition about
  which parameters matter is not reliable without a real check.
  **Translation:** a direct warning: the radical/incidental split is currently
  asserted once, never empirically checked, and the measured "48 candidates →
  4 survivors" data point is suspiciously close to ETS's own "48 systematic
  variants" benchmark for exactly this failure mode. Recommend a
  family-equivalence check (distinct from per-scenario Claude review) that
  runs after physics/tactics resolve a batch of siblings, computing cheap
  proxy-difficulty signals straight off `SimulationTrace`/`DecisionEvaluation`
  (decision-freeze window duration, defender-to-lane margin at decision time,
  candidate-set size) and statistically confirming radical-tagged axes
  actually move these proxies while incidental-tagged axes don't.

- **Assessment Engineering — task models as formal, versioned, reusable
  generation specifications** (Luecht;
  http://jattjournal.com/index.php/atp/article/view/45254). An item family is
  a formal "task model" artifact — linking a construct/proficiency point to a
  structural template and generation algorithm — designed and reviewed once,
  independent of any single item, then used to mass-produce items with
  engineered-in properties. **Translation:** this is the direct basis for
  Deliverable B(c)'s recommendation that a family be a first-class,
  versioned artifact rather than implicit generator code.

- **Post-promotion drift monitoring / DIF** (ETS isomorphs program; IRT
  item-cloning variance research;
  https://onlinelibrary.wiley.com/doi/10.1002/j.2333-8504.2005.tb01983.x;
  https://link.springer.com/article/10.1007/s11336-016-9513-1). Generative
  testing programs review the item *model* once but continuously monitor
  deployed clones, because cloning empirically introduces variance even from
  a sound model, and parameters can "drift" post-deployment in ways a
  one-time review can't catch. **Translation:** validates that Claude
  reviewing the kernel/claim rather than every scenario is the right call,
  but exposes a real gap — nothing currently watches a promoted family after
  it's live. A lightweight post-promotion monitor (real usage signals vs.
  radical/incidental predictions) is out of scope for this document's
  immediate recommendations but is flagged here as a Phase-10-or-later
  follow-on worth a future design note.

---

## Deliverable B — Scenario-Family Templating Design

### (a) What varies vs. what's fixed when the breakout scenario generalizes into a family

**Fixed (must hold for every sibling, non-negotiable):**

- The **tactical claim** the family targets, and its version. Every sibling
  in a family shares exactly one approved tactical-claim version; a claim
  revision does not silently apply to existing siblings, it forces explicit
  re-review of the family (see (c)).
- The **kernel invariants** (e.g. `pointSegDist` lane-blocked/clear proofs).
  These are asserted, not sampled — a candidate that fails an invariant is
  never constructed as a ScenarioDefinition, per the existing
  assert-and-throw pattern. This document explicitly recommends keeping
  RinkReads' current stricter choice (construct-correct, hard-reject) over
  the generate-then-patch alternative surveyed in Area 2 — see the Zook et
  al. entry above.
- The **single age/skill profile** per ScenarioDefinition (already a hard
  architecture rule; a family generalizes by producing multiple
  single-profile sibling definitions, never one multi-age definition).
- **Physics-as-truth authority**: physics can still veto any family member;
  no family-level approval overrides a hard physics failure on an individual
  sibling.

**Varies, and split into two roles (adopting Area 5's radical/incidental
terminology and Area 1's Spelunky load-bearing/decorative split, which name
the same underlying distinction from two different fields). This is a
breakdown of all five kernel axes (`commit`, `depth`, `shape`, `mirror`,
`seed`) — none is left unclassified:**

- **Radical / structural axes** — parameters that change the tactically
  correct answer, the decision/cue topology, or the geometry/timing a coach
  would actually notice. In the current kernel, `commit` is the clearest
  example and should be treated as the primary radical axis: the kernel's
  own top-of-file comment states plainly that these are "objects where the
  CORRECT ANSWER is decided by the `commit` parameter" (line 3) — `commit`
  doesn't merely move the answer, per the source it *is* the parameter that
  decides which answer is correct, which puts it ahead of `shape`, not
  behind it, on the radical/load-bearing axis. `shape` is the second
  confirmed example (kernel comments separately say it "MOVES the answer
  target ~30 ft"). Every radical axis must carry a one-line pointer to the
  tactical-claim clause or kernel invariant it is expected to move — this is
  the concrete, structured version of the comment-only tagging that exists
  today, and it applies to `commit` and `shape` alike.
- **Incidental / decorative axes** — parameters that vary presentation
  without changing the answer, topology, or teaching content. `depth`,
  `mirror`, and the jitter function `j()` (driven by `seed`) are the current
  candidates, per the kernel's own "non-load-bearing only" comments — **but
  this document recommends not trusting that comment as-is**. Per the ERA
  finding (Area 4) and the ETS 48-variant warning (Area 5), run a one-time
  empirical check before locking this classification: expand the full
  parameter space, measure real answer/layout/topology metrics per
  candidate, and confirm depth/mirror/jitter genuinely don't move anything a
  coach would notice. If `depth` turns out to shift decision *timing* even
  without shifting the answer, it should be promoted to a radical axis on a
  new "time-to-decision" dimension rather than staying decorative by
  assumption.

**Concrete recommendation:** add a `parameterRole: 'radical' | 'incidental'`
field per kernel axis, surfaced through `ScenarioDefinition.generationParams`,
required for every axis on every current and future kernel — for the
existing two-on-one kernel that means `commit` and `shape` tagged `radical`
and `depth`, `mirror`, `seed` tagged `incidental` pending the empirical check
above. Radical axes require the claim/invariant pointer described above.
This is metadata-only — no behavior change — and is a prerequisite for the
novelty-signature schema in (b), which reads directly off `parameterRole`.

### (b) A concrete novelty-signature schema (resolves Judgment Call #3)

The plan's own language ("each template registers a versioned novelty
signature covering tactical claim, decision/cue topology, answer, and minimum
geometry/time distance") maps directly onto a small MAP-Elites-style
behavior-characterization vector (Area 4), refined with Area 2's discrete
edit-distance layer and Area 1's Lichess-style numeric gap threshold.
Concrete proposal:

```
NoveltySignature = {
  schemaVersion: string,          // versioned, per plan's "each template
                                   // registers a versioned novelty signature"
  familyId: string,
  claimId: string,
  claimVersion: string,

  // --- discrete symbolic dimensions (bucket keys; MAP-Elites cell coords) ---
  answerId: string,                // which option/candidate is correct
  decisionTopologyClass: string,   // derived post-hoc from DecisionEvaluation:
                                    // number+kind of physically-available
                                    // candidates at freeze (e.g. "single-viable",
                                    // "two-viable-adjacent", "ambiguous")
  cueTopologyClass: string,        // derived post-hoc: which cue(s) fired,
                                    // in what order, relative to the freeze
  geometryBand: string,            // coarse spatial bucket (extends the
                                    // existing 3-band answerSignature() idea;
                                    // recommend 5 bands, tuned empirically
                                    // per the ERA pass in (a))
  timeBand: string,                // coarse decision-timing bucket, new
                                    // dimension the plan explicitly calls for
                                    // and noveltyGate.js currently lacks

  // --- continuous tiebreak / boundary-awareness fields ---
  answerDistance: number,          // existing layoutDistance()/answerDistance()
                                    // style metric, normalized 0-1
  layoutDistance: number,
  marginToVeto: number,            // NEW: distance from the physics solver's
                                    // own pass/fail threshold (e.g. how close
                                    // pointSegDist sits to the lane-blocked
                                    // assertion) -- from the Lichess eval-gap
                                    // finding; near-boundary states are often
                                    // the most teachable and must not be
                                    // penalized by raw Euclidean distance alone

  radicalFieldsChanged: string[],  // Zook-style edit-distance list: which
                                    // radical-tagged parameters differ from
                                    // the nearest existing sibling
}
```

**Threshold logic ("meaningfully distinct" vs. "trivial reskin" vs. "too
different to share the claim"):**

1. **Same cell, same claim → trivial reskin.** If `(answerId,
   decisionTopologyClass, cueTopologyClass, geometryBand, timeBand)` all match
   an existing archived sibling under the same `claimId`+`claimVersion`,
   reject as non-novel regardless of `radicalFieldsChanged` — this replaces
   `noveltyGate.js`'s current per-signature cap-of-3 rule with a MAP-Elites
   "one elite per cell" rule (Area 1/4), except cells are now keyed on the
   richer 5-dimension vector instead of just `answerId` + one vertical band.
2. **Different cell, same claim → meaningfully distinct sibling.** Admit into
   the family's archive. This is the target state for Phase 10's coverage
   metric (fraction of cells filled), replacing the raw "N candidates
   generated" count the plan currently has no denominator for.
3. **Near-boundary exception.** Even inside the same cell, if
   `marginToVeto` is below a tuned near-zero threshold *and* differs
   meaningfully from the archived sibling's own `marginToVeto` (i.e. this
   candidate is provably closer to the physics failure boundary), admit it as
   a distinct "boundary" variant — per the Constrained Novelty Search finding
   (Area 4), these cluster in raw geometry but are tactically distinct and
   pedagogically valuable ("defender juuust can't close the lane").
4. **Different `claimId` or `claimVersion` → too different to share the
   family, full stop.** This is not a novelty question at all — it is a
   different family by definition, per (a)'s fixed invariant that every
   sibling in a family shares exactly one claim version. A `claimVersion`
   bump on an existing family requires the dependency-recall/re-review path
   already specified in Phase 6, not a new novelty computation.

**Where each field comes from:** `answerId`, `answerDistance`, `layoutDistance`
already exist in `noveltyGate.js` today and need no new computation.
`decisionTopologyClass`, `cueTopologyClass`, `timeBand`, and
`radicalFieldsChanged` are derived *after* the `SimulationTrace`/
`DecisionEvaluation` are produced (Lichess-style post-hoc tagging, Area 1),
never supplied as generation-time parameters — this keeps the signature
honest to what the physics engine actually produced rather than what the
kernel merely intended. `marginToVeto` is a new field this document
recommends `SimulationTrace` or `DecisionEvaluation` expose (a numeric
distance already implicit in the existing `pointSegDist` assertions; it just
needs to be recorded instead of thrown away once the assertion passes).

### (c) Is a "family" a new persisted artifact type, or a pure generation-time sweep?

**Recommendation: a family is a new, small, versioned, persisted artifact —
a "KernelTaskModel" — separate from any individual ScenarioDefinition, but it
is emphatically *not* a fifth item in the four-artifact bundle.** It sits
upstream of ScenarioDefinition generation, the way a tactical claim sits
upstream of a kernel invariant — and it sits *alongside*, not in place of,
the family infrastructure that already exists (`docs/scenario-family-standards.md`'s
content rules and `src/play/playFamilies.js`'s `SCENARIO_FAMILIES` registry);
see the reconciliation note below for exactly how they're expected to relate.

Reasoning, drawn directly from the research above:

- **Luecht's Assessment Engineering (Area 5)** is the direct precedent: an
  item family is a formal task model — reviewed once, independent of any
  single item — not implicit in generator code. Right now RinkReads has the
  right pieces (kernel = generation algorithm, tactical claim = construct
  reference) but the "task model" itself is implicit in
  `twoOnOneKernel.js`'s source comments, not a first-class artifact anyone
  reviews as a unit.
- **A pure generation-time-only sweep (no persisted object) was considered
  and rejected.** Without a persisted family record, there is nowhere to
  store the `parameterRole` tags from (a), nowhere to version the novelty
  signature schema itself (the plan explicitly requires "each template
  registers a versioned novelty signature" — that requires a place for the
  registration to live), and no way to force re-review when a claim version
  bumps (per (a)'s fixed-invariant rule) — every sibling would need to be
  individually reconciled instead of the family being reopened once.
- **This recommendation must reconcile with, not silently duplicate, the
  family infrastructure that already exists.** Two artifacts already carry
  the word "family" and predate this document: `docs/scenario-family-standards.md`,
  listed in the canonical spec (`docs/superpowers/specs/2026-07-29-scenario-engine-design.md`,
  lines 66 and 84) as an "Active specialized standard" governing family-level
  content rules (variant rules, teaching arc, target-variant-count); and
  `src/play/playFamilies.js`'s `SCENARIO_FAMILIES` registry, named in that
  same canonical spec (lines 782-784) as part of "the current uncommitted
  breakout prototype" whose exact state must be hashed and reconciled before
  anything is built on top of it. `KernelTaskModel` as proposed here is
  narrower than either and does not replace them:
  - `docs/scenario-family-standards.md` keeps owning the content-facing rules
    (variant rules, teaching arc, target-variant-count) that apply once a
    family's siblings are being authored and reviewed as teaching content.
    `KernelTaskModel` does not restate those rules; it supplies the upstream,
    generation-time facts — which axes are radical, the versioned
    novelty-signature schema — that those content rules can reference
    instead of re-deriving.
  - `SCENARIO_FAMILIES` in `playFamilies.js` is the runtime/product-facing
    registry of which families actually exist and are wired into the app.
    `KernelTaskModel` is not a replacement for it: a `KernelTaskModel` record
    and a `SCENARIO_FAMILIES` entry are expected to co-exist per family, the
    same way a tactical claim and a kernel invariant co-exist today —
    `KernelTaskModel` is the generation-time contract a family is produced
    under, `SCENARIO_FAMILIES` is the runtime fact that the family is live.
  - This document does not resolve the exact link between the two (e.g. a
    shared `familyId`), because that requires reconciling against
    `playFamilies.js`'s actual current, uncommitted state first — per the
    canonical spec's own instruction to hash and reconcile that prototype
    before adopting it. That reconciliation is called out here as an open
    dependency for whoever implements this in Phase 5, not something this
    design/research document can resolve unilaterally.
- **The family artifact must not become a fifth bundle artifact or a second
  authority.** It does not derive a read, does not resolve ambiguity, and
  does not override physics or Claude judgment — it only declares, for a
  kernel+claim pair: which axes exist, each axis's `parameterRole` and (for
  radicals) which claim clause/invariant it moves, the combinatorial
  expansion rule, and the versioned novelty-signature schema from (b) that
  applies to this family. Concretely: `KernelTaskModel` records live
  alongside tactical claims (e.g. `docs/factory/tactics/families/<kernel-id>/<claim-id>.json`,
  following the same factory-only, outside-`src/` placement decision 3
  already established for claims), versioned the same way claims are, and a
  claim-version bump requires an explicit task-model re-review rather than
  silently orphaning old kernel assumptions — closing the gap this
  document's own synthesis of the prior-attempt history identifies (the five
  prior generation-engine design docs named in the "Case for raising the
  bar" section below were each superseded wholesale, never iterated on) by
  giving future iteration something concrete to iterate *on*.
- Every individual `ScenarioDefinition` a family produces still goes through
  the full existing pipeline (SimulationTrace → DecisionEvaluation →
  CompiledTeachingPlay → gates → Claude judgment → promotion) exactly as
  today; the family artifact changes *what's reviewed once* (the task model)
  vs. *what's reviewed per instance* (hockey/teaching quality on that one
  scenario), it does not change or shortcut the per-instance pipeline itself.

### (d) How this interacts with the plan's existing phases

**Recommendation: expand Phase 5's existing scope, do not add a new phase
number and do not redesign Phase 6.**

Reasoning:

- Phase 5 is already where the plan puts "extended [`noveltyGate.js`] to
  operate on the richer state" and already names the novelty-signature schema
  as a Phase 5 design decision (Judgment Call #3 says exactly this: "This
  plan treats the exact novelty-signature schema as a design decision to make
  concretely during Phase 5"). This document's Deliverable B(b) is that
  concrete schema — it belongs in Phase 5's task list as a specific,
  citable design to implement, not a new phase, because the plan already
  reserved the slot.
- The `KernelTaskModel` artifact from (c) is generation-time infrastructure
  (it governs what a kernel is allowed to produce and how novelty is judged),
  which is exactly Phase 5's territory ("adapts the actual breakout prototype
  into a real ScenarioDefinition, runs it... through physics→tactics→compiled-play,
  gates 1-7 only"). It does not touch judgment, promotion, or the state
  machine, which is Phase 6's territory — so it should not become a Phase 6
  redesign.
- **Phase 6's exit gate should not be expanded to require multiple siblings.**
  Phase 6 proves the pipeline end-to-end on **one** breakout scenario; this
  document's recommendations (the `parameterRole` tags, the novelty
  signature, the `KernelTaskModel` record) are all things Phase 5 produces
  and Phase 6 can consume unchanged — Phase 6's existing single-fixture scope
  is compatible with, not blocked by, this design. Whether Phase 6's gate
  should be *raised* to also require proof of family generation before Phase
  7 starts is a separate sequencing question, addressed below — it is not
  something this document decides unilaterally by editing Phase 6's task
  list.
- Phase 10 needs no structural change either: it already asks for "raw
  parameter combinations, validator-clean candidates, meaningfully distinct
  scenario states (using the versioned novelty signature)... question
  variants..." reported separately. Deliverable B(b)'s schema is precisely
  what makes "meaningfully distinct" measurable at that point instead of
  hand-waved; Phase 10's existing task list already anticipates and cites
  "the versioned novelty signature — see Judgment Call below," so this
  document is filling in a citation the plan already expected to need, not
  restructuring the phase.

**Concrete edit, if Thomas approves this document:** add explicit sub-tasks
to Phase 5's existing task list (not a new phase) covering: the
`parameterRole` tagging in (a) (including `commit`, the axis the kernel's own
header comment names as deciding the correct answer), the `NoveltySignature`
schema and threshold logic in (b), and the `KernelTaskModel` artifact in (c)
— including the reconciliation against `docs/scenario-family-standards.md`
and `src/play/playFamilies.js`'s `SCENARIO_FAMILIES` registry that (c) flags
as an open dependency, not yet resolved by this document — cross-referencing
this document by filename. No change to Phase 6's task list or exit gate is
proposed here.

---

## RECOMMENDATION REQUIRING THOMAS'S APPROVAL

**Question:** should proving ONE scenario (the plan's current Phase 6 gate)
remain the bar before Phase 7 (coach-authoring design, design-only per its
own heading) starts, or should the bar be raised to "one proven scenario
**plus** proof the template mechanically generates N valid,
meaningfully-distinct siblings" before Phase 7 starts?

**This document takes no side and changes nothing on its own.** It lays out
the tradeoff below and asks Thomas to pick.

**Case for keeping the bar exactly where the plan has it (one scenario, then
Phase 7):**

- This is the project's standing conservative posture, stated explicitly in
  `docs/factory/SCENARIO-ENGINE-DECISIONS.md`: *"The confidence threshold must
  be conservative... Start strict: when in doubt, queue it. A wrong 'correct
  answer' reaching a child is the worst defect this system can produce, and it
  is worse than a queue that is slightly too long."* Phase 6's gate is already
  named "the plan's central gate," with an explicit rule that "no phase after
  proceeds without this gate holding" — that rule is about proving the
  pipeline is safe and correct end-to-end, not about proving it scales, and
  conflating the two raises the bar on the wrong axis.
- Phase 7 is a **design-only** phase ("design only, no code" per its own
  heading) — coach-authoring code doesn't get built until Phase 8. Nothing in
  Phase 7 actually depends on family throughput being proven; it depends on
  the one-scenario pipeline being trustworthy, which Phase 6 already targets
  directly.
- Templating design (this document) can run, and be approved, in parallel
  with or ahead of Phase 7's design work without being a hard gate in front
  of it — Deliverable B(d) already recommends folding the concrete schema
  into Phase 5, which comes *before* Phase 6 in sequence anyway.

**Case for raising the bar (require proof of N-sibling generation before
Phase 7):**

- The prior-attempt history is a real pattern, not a one-off: every earlier
  generation-engine iteration
  (`2026-06-04-gauntlet-v2-design`, `2026-06-11-scenario-question-factory-design`,
  `2026-06-13-coach-auto-revise-design`, `2026-06-16-scenario-variation-generator-design`,
  `2026-07-08-animated-scenario-factory-bridge-mind-lessons`) was superseded
  wholesale rather than iterated on, and the one measured data point this
  system has produced (48 kernel candidates → 4 novel survivors) shows
  templating built as blind Cartesian expansion rescued after the fact by a
  coarse filter. Deferring the templating question again past Phase 6 — the
  same slot where it was deferred every previous time — risks repeating the
  exact failure this document was commissioned to prevent, even though the
  concrete schema in Deliverable B(b) is designed specifically to close that
  gap this time.
- Proving one scenario end-to-end says nothing about whether the
  `KernelTaskModel`/novelty-signature machinery in this document actually
  produces valid, distinct siblings at any volume — that is only checked at
  Phase 10, which sits behind Phase 8 (the protected coach MVP *build*, per
  its own heading — Phase 7 immediately before it is design-only, no code)
  and Phase 9 (runner proof) in the current sequence. If templating turns out
  to be broken, it is discovered only after coach-facing product work has
  already been built on top of it.

**This document's recommendation: keep the bar where the plan has it —
prove one scenario at Phase 6, do not add a sibling-throughput requirement in
front of Phase 7 — but close the gap the "case for raising the bar" correctly
identifies by making Deliverable B's design (the schema, the task-model
artifact, the `parameterRole` tagging) an explicit, named Phase 5 deliverable
rather than something deferred to "whoever implements Phase 5" with no
concrete shape, which is what the plan currently does.** The conservative
"when in doubt, queue it" posture is about correctness-per-item reaching
Thomas or a child, which one-scenario Phase 6 already protects fully — a wrong
answer on sibling #47 is caught by the exact same per-item gates as a wrong
answer on the one proven scenario, since (per (c)) every sibling still goes
through the full unmodified pipeline. What was actually undisciplined in
prior attempts was the *design* of templating, not the *validation* of its
output — and this document's job was to fix the design, which it does inside
Phase 5's existing scope, without needing to also gate Phase 7 on proving
throughput Phase 10 already exists to measure.

**This is a recommendation only. Thomas must explicitly approve (a) this
document's designs in Deliverable B, and separately (b) whether Phase 6's
exit gate or Phase 7's entry condition changes at all, before either takes
effect. No edit has been made to `docs/superpowers/plans/2026-07-29-scenario-engine-foundation-plan.md`
or `docs/factory/SCENARIO-ENGINE-DECISIONS.md` to reflect this document.**
