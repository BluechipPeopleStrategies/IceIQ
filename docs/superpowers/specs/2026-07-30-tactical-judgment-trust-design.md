# Tactical-judgment trust — design + research

**Design/research document. Dated 2026-07-30. No code changes made in
producing this doc, nothing authorized by it.** This extends, and does not
replace, the existing tiered-auto-approve posture (Decision 3 in
`docs/factory/SCENARIO-ENGINE-DECISIONS.md`) and the ten-gate / calibration-bar
architecture already specified in
`docs/superpowers/specs/2026-07-29-scenario-engine-design.md` — specifically
gate 8 (Claude judgment) and the graduation bar in its "Conservative
promotion" section. Where this document is silent, that design and those
decisions still govern. Nothing here changes a gate, a threshold, or a line of
code; it proposes candidate additions and reports the research behind them for
Thomas to prioritize.

---

## The actual problem

Two of the four truth domains in the existing design already have a real
answer to "how do we trust this without Thomas reading every line."

Physics (Level 1 kinematics) is a deterministic prover. It hard-fails
teleportation, impossible acceleration, unreachable passes, illegal bounds,
bad possession ordering, and a claimed-open lane that's actually intercepted
first — and per the existing design, "hard physics failures cannot be
overruled by Claude or by confidence scoring." Nobody needs to build more
trust in this layer over time; it's already load-bearing on day one and stays
that way.

Novelty/redundancy (gate 5, Semantic Sibling Review, built the night before
this document) also has a real answer: a Claude batch call with a constrained
verdict schema, mandatory quote-grounding against source claim text, and a
deterministic force-downgrade of any ungrounded verdict to
`ambiguous_needs_human`. Its own design rule is explicit: an SSR verdict is
"never a positive correctness signal" — it only says whether a candidate is a
distinct teaching point, never whether it's a correct one.

What's left unsolved is gate 8 itself: hockey accuracy, ambiguity, pedagogy,
and adversarial failure modes — the judgment call about which physically
possible read is tactically best and worth teaching. This is the one place in
the pipeline where "make it correct" and "make it trustworthy at volume" are
still the same open problem. The existing calibration bar (50 decisions
overall, 20 per template class, a 20%+10 held-out set with zero wrong-answer
false approvals, then a 10%/3-item audit sample per batch forever after) is
the mechanism aimed at it, and it's a genuinely good one — first-principles
conservative, evidence-gated, never a confidence-score shortcut. The research
below is not a critique of that mechanism. It's an attempt to find real,
operating precedent for the exact shape of trust-graduation problem it's
solving, and to see whether other people who've already solved variants of it
found sharper edges Thomas's design hasn't drawn yet.

Thomas's own framing of the goal, restated precisely: reduce how much he
personally has to catch, over time, as volume scales — "make things better
before I even see it" — for tactical/content correctness, the same way it
already works for mechanical bugs. Not eliminate his review. Reduce its
*rate* relative to volume, without the zero-false-approval floor ever moving.

---

## Where hockey tactics sits on the provable-vs-judgment spectrum

Chess and poker are the two clearest cross-domain comparisons, and both turn
out to be sharper cautionary tales than encouragements. Both are closed,
fully-specified systems: Stockfish can prove a forcing mate-in-N line because
chess is complete-information and finite; a GTO solver can prove a strategy's
distance from Nash equilibrium (Nash Distance, ~0.1–0.5% of pot is treated as
solved) because poker abstractions are a well-defined game with a formal
equilibrium. Hockey has no equivalent oracle. It's open, embodied, adversarial,
and played under imperfect information — there is no closed-form optimum for
"best defensive read," and no amount of physics-engine improvement changes
that, because the thing that's missing isn't computational power, it's a
formal specification of what "best" means.

But — and this is the useful part — neither chess nor poker automated
*pedagogy* even inside their fully-provable cores, and that maps almost
exactly onto where RinkReads' own line already sits:

- **Chess:** Correctness (is this move legal, is this mate-in-N) has been
  provable since Stockfish. But "is this move *instructive*" required
  Chess.com to build a whole separate heuristic layer on top of raw engine
  eval — win-probability swing, sacrifice detection, search-depth-to-see-it —
  and even with those features, published research could only predict human
  perception of "brilliant" at ~70% accuracy. Correctness and teaching-value
  are different code paths, full stop, even in the most provable game that
  exists.
- **Poker:** Correctness (distance from equilibrium) is a continuous, provable
  number. But GTO Wizard's own documentation says flat out that deciding which
  spot is worth *studying*, and interpreting a near-equilibrium mixed
  strategy, is "entirely human/coach judgment... the solver has no opinion on
  pedagogical value."

So: is there more of hockey that could be pushed down into the provable
physics floor, narrowing what gate 8 has to adjudicate? Concretely, yes, in a
bounded way — and RinkReads' physics layer already does most of what's
crossable:

- **Already provable, already gated:** whether a lane is geometrically open at
  freeze, whether a pass is reachable, whether a skating path is physically
  legal, chronological ordering of who gets there first. This is the chess-
  legality-equivalent layer and it's already a hard gate.
- **Could be pushed further toward provable, not yet fully exploited:** the
  *margin* by which the best read beats the alternatives. Physics can't say
  "read A is the best teaching choice," but it can say "read A closes off
  option B by 0.3 seconds and option C by 1.8 seconds" — a continuous,
  computable number analogous to Nash Distance or Chess.com's win-probability
  delta, without claiming to resolve the pedagogy question itself. This is
  the single most promising provable-adjacent extension the research surfaced
  (see Proposed Additions, priority 2).
- **Structurally irreducible, same as chess/poker:** which physically-legal
  read is genuinely the *best teaching example* for a given age/skill band,
  whether a scenario is ambiguous in a way that will confuse rather than
  instruct, and whether the framing itself teaches the right habit. No
  physics engine resolves this in chess or poker either, and hockey has
  strictly less formal structure than both of those games. This stays gate
  8's job permanently, not a phase to graduate out of.

The implication: the calibration-bar mechanism is the right lever, not a
stopgap waiting to be replaced by more physics. The research below is about
sharpening *that* mechanism, not about shrinking gate 8's remit.

---

## What other domains do that RinkReads doesn't yet

Five domains were researched. Ranked by how directly portable the mechanism
is to gate 8's actual bottleneck, not in research-presentation order.

### 1. Mammography double-reading — the single most portable mechanism found

AI-supported mammography double-reading auto-accepts the AI's read **only
when it agrees with an independent first human reader**; a second human
reader is invoked **only on disagreement**. This cut second-reader workload up
to 87% while matching or beating full double-reading accuracy — because
*agreement between two independent judges* is the routing signal, not either
judge's confidence score alone.

This is the most directly applicable finding in the whole research set
because it's the only mechanism that reduces review load **during the
manual/pre-graduation phase too**, not only after a template class earns
auto-promotion. Agreement is available from decision one; the 50/20
calibration corpus doesn't have to exist first. Applied to gate 8: a second,
independent, blind pass (no visibility into the first pass's verdict) has to
agree with the first before a candidate is even eligible for the existing
calibration-tier evaluation. Disagreement routes straight to Thomas, same as
today. This composes cleanly with the existing "never from confidence scores
alone" rule, because agreement here is binary, not a score — but see the
caveat under finding 3 below before treating agreement as free.

### 2. Standardized-testing psychometrics — item difficulty/discrimination as a cheap pre-check, and embedded (unlabeled) field-testing

Two mechanisms here matter more than the rest of the domain's findings:

**Discrimination index as an automatic disqualifier.** Testing orgs compute a
point-biserial correlation between "did the test-taker answer this correctly"
and independent measured ability. A negative or near-zero value — weaker
performers doing as well as or better than stronger ones — is an automatic
red flag *regardless of what content review says*, because it means the item
is measuring the wrong thing. This is directly computable from data RinkReads
already has (once any usage exists): correlate "did the user pick the
derivedRead-correct answer" against the user's independent skill/mastery
signal. A negative-or-flat correlation force-flags the candidate back to
manual review **before gate 8 even runs** — a cheap, Ollama-computable,
mechanical pre-check that narrows gate 8's job the same way the discrimination
index narrows a testing committee's.

**Embedded, unlabeled field-testing.** New SAT/ACT items are seeded into real
scored exams, indistinguishable from scored items, specifically because a
separate flagged "experimental section" made students disengage and produced
unreliable data. RinkReads' calibration corpus today is built from an
explicit "please review/calibrate this" session — which risks Thomas
reviewing differently than he would in ordinary use. The fix that targets his
stated goal most directly: during ordinary app use or content QA, route a
small quota of not-yet-graduated candidates in *unlabeled*, mixed alongside
already-trusted content, and count the resulting accept/reject/friction
signal into the calibration corpus. This is the clearest available mechanism
for the literal goal Thomas stated — catching things without a special review
task — rather than a proxy for it.

### 3. LLM-judge calibration literature — the load-bearing caution on both of the above

This domain doesn't add a new lever so much as it puts a hard ceiling on how
much weight the first two can carry. Two findings matter most:

**Self-consistency margin is necessary, never sufficient.** Auditing 265k
samples, agreement-with-self correlated only weakly with actual correctness
(Spearman 0.20–0.59) — and the correlation was *weakest* for frontier models
exactly where consistency was highest (GPT-4.1: 89% self-agreement on GPQA,
only rho=0.20 correlation with being right; 48% of its high-confidence answers
were still wrong). A unanimous multi-pass vote inside gate 8 can be used as an
eligibility filter (route split votes to Thomas), but it must never become
promotion evidence on its own — it has to be named explicitly in the "never
from confidence scores alone" rule, not left implicit.

**Correlated errors mean multiple Claude passes are not free independence.**
A 9-judge panel spanning 7 model families still delivered only ~2.2
*effective* independent votes (Kish effective sample size) because errors
share root causes — training data, objectives — not just architecture. Adding
chain-of-thought reasoning made judges *more* correlated, not less. This
directly qualifies finding 1 above: two Claude passes inside the same session
are weaker independence than mammography's two-*human* readers, and should
raise the bar for what counts as disagreement, not be treated as
architecturally equivalent. It also means: if a second, more independent
check is ever wanted, the one option compatible with Decision 1 (free-only,
no paid API) is a narrow, bounded Ollama sub-check — e.g., claim-quote
grounding only, never full hockey judgment — consistent with the existing
"Ollama never adjudicates correctness" rule, not more same-model Claude calls
dressed up as diversity.

### 4. Sports-coaching credentialing (Hockey Canada NCCP, NSCA/NCCA) — periodic re-validation is the clearest gap

Every credentialing body researched treats "certified" as **temporary**, not
permanent. Hockey Canada requires coach candidates to pass a fixed
planted-error battery (identify the embedded error in a known practice-plan
video, graded against a documented answer) before their own judgment is
trusted at all. NSCA's Job Task Analysis — the process that defines what a
certification exam even covers — is re-run on a fixed multi-year cycle with
an annual check that it still matches current practice. None of the domains
researched treat graduation as a one-time, permanent unlock.

This is the clearest gap in RinkReads' current design: the calibration bar
graduates a template class once, and after that, the only safety nets are
reactive (a wrong-answer defect disables the class) or a flat ongoing 10%/3-
item audit sample. Nothing mandates periodically reopening whether the
rubric, judge stack, or standard *itself* is still current — which matters
specifically because Claude model versions and prompt behavior can drift
silently underneath an unchanged version label.

### 5. FDA medical-AI regulation (Part 60 flight-sim / clinical AI) — the sharpest framing for "raise the threshold later, from evidence"

Two pieces are worth pulling out. First, FAA Level D simulator qualification
formally separates "objective tests" (deterministic numeric comparison to
real flight-test data) from "subjective tests" (test-pilot judgment of
realism) — structurally identical to RinkReads' physics/gate-8 split, and
external corroboration that the split is correctly drawn, not a project-
specific choice. Second, FDA's Predetermined Change Control Plan lets an
adaptive medical AI retrain and change post-approval *without* a new
regulatory submission — but only within a plan **written and pre-approved
before any of the triggering evidence exists**, specifying exactly what
changes, how it's verified, what's monitored, what triggers rollback.

Applied to RinkReads: the design doc's line "the auto-approve rate can be
raised later, from evidence" is currently a stated intent, not a written
mechanism. A PCCP-equivalent would make it a document authored *now* —
exactly what evidence, what sample sizes, what held-out performance would
justify raising the 10%/3-item audit rate — decided before a busy scaling
period creates pressure to decide it in the moment.

---

## Proposed concrete additions

Ordered by priority. Each states what it changes in the existing pipeline,
what new machinery it needs, and specifically how it reduces Thomas's review
rate (not just "improves quality" in the abstract).

### Priority 1 — Blind second-pass agreement gate (mammography model)

**What it changes:** Before a candidate reaches the promotion-policy gate (9),
gate 8 runs twice: an independent second Claude pass, same rubric, with no
visibility into the first pass's verdict or reasoning. Only mutual agreement
makes a candidate eligible for the calibration-tier evaluation that already
exists; disagreement routes to Thomas's queue with both verdicts shown, same
as any other "reason stated" queue item today.

**New machinery:** A second gate-8 invocation with an explicit no-cross-
contamination requirement (the second pass must not see the first pass's
output in its context), plus a minority-veto combination rule per the
agreeableness-bias research (either pass flagging a problem forces queue —
never majority-vote, never averaged).

**How it reduces review rate:** Unlike the calibration bar, this helps
*before* a template class graduates, not only after — it's live from decision
one. It doesn't reduce zero-false-approval risk by itself (per finding 3
above, agreement is not a correctness proxy), but it reduces the volume of
candidates that reach Thomas's queue for reasons gate 8 could catch on its
own, freeing his review time for genuinely hard cases. Doubling Claude calls
on gate 8 has a real cost (session time, not money, per Decision 1) — worth
flagging, not blocking.

### Priority 2 — Decision-margin score as a routing input, not a verdict

**What it changes:** Gate 8 (or a pre-gate-8 physics-adjacent step) computes
and logs a continuous margin: how decisively the best physically-legal read
beats the runner-up (time-to-close alternative lanes, count of viable
alternatives, tightness of the decision window). Candidates below a margin
threshold are automatically routed to mandatory human review *regardless of
template calibration tier* — mirroring how chess puzzle generation and poker
solvers both treat near-tied/ambiguous positions as needing extra scrutiny
rather than trusting a single verdict.

**New machinery:** A margin-computation function sitting in the physics/
tactics layer (deterministic, not Claude), plus a new routing rule ahead of
gate 9.

**How it reduces review rate:** This is the concrete version of "push more
into the provable floor" from the provable-vs-judgment analysis above. It
doesn't resolve pedagogy, but it gives both gate 8 and Thomas's held-out
review a cheap, objective number to anchor on — the same way Chess.com's win-
probability-delta narrows what a human has to eyeball for "brilliant" without
claiming to answer the harder question itself. Over time, most candidates
will have wide margins and won't need it; the routing cost concentrates on the
genuinely ambiguous minority, which is exactly the reviewer-time Thomas
actually wants to spend his attention on.

### Priority 3 — Discrimination-style statistical pre-check (testing psychometrics)

**What it changes:** Once any real usage data exists for a template
(pre-graduation, from Thomas or beta play), compute a per-candidate
correlation between "did the user pick the correct answer" and the user's
independent skill/mastery signal. A negative or near-zero correlation
force-flags the candidate back to manual review *before* gate 8 runs again on
it — automatic, the same way a negative point-biserial is an automatic flag
in testing regardless of what content review says.

**New machinery:** An Ollama-computable statistic (no Claude call needed)
slotting between gate 5 and gate 8; requires a skill/mastery signal to
correlate against, which may not exist yet depending on current app
telemetry — worth confirming before scoping this further.

**How it reduces review rate:** It's a cheap mechanical filter that catches a
failure mode gate 8's holistic judgment might not reliably self-detect (an
item that's actually testing something other than the intended tactical
read), without spending a Claude call to find it. Reduces false-negative risk
on the class of defect hardest for a single holistic prompt to notice about
itself.

### Priority 4 — Embedded, unlabeled field-testing quota

**What it changes:** During ordinary app use or content QA — not a flagged
calibration session — a small quota of un-graduated candidates get shown
mixed in, unlabeled, alongside already-trusted content. The resulting
accept/reject/friction signal counts into the calibration corpus.

**New machinery:** A serving-layer change to interleave un-graduated
candidates into ordinary sessions at a low rate, plus provenance tracking so
that signal is distinguishable from a flagged review session in the
calibration-corpus record without being visible to Thomas in the moment.

**How it reduces review rate:** This is the mechanism most directly aimed at
Thomas's literal stated goal — catching things without it costing him a
special review task. It's also the riskiest to build well (it changes what
Thomas experiences in ordinary use, and a mislabeled provenance record would
quietly corrupt the calibration corpus), so it's sequenced after the lower-
risk additions above, not first.

### Priority 5 — Scheduled recalibration and drift re-check (credentialing + FDA PCCP)

**What it changes:** Two additions, both administrative rather than pipeline-
structural: (a) a written, dated document — authored now, before evidence
exists — stating exactly what metrics and sample sizes would justify raising
the 10%/3-item audit rate, so a threshold change during a busy period is a
pre-committed decision, not an in-the-moment call; (b) a fixed-cadence
(e.g., every 6–12 months, or every N decisions) re-check of every already-
graduated template class's live false-rejection/queue/warning rates against
its original held-out benchmark, closing the gap where "graduated" currently
has no expiration.

**New machinery:** None pipeline-structural — a scheduling/reporting job
against data the design already records (judgment records, promotion
records), plus one written policy document.

**How it reduces review rate:** This doesn't reduce review rate directly; it
protects the other additions from silently decaying, which is what would
force review rate back *up* later if undetected drift caused a defect. Lowest
build cost of everything proposed here — worth doing regardless of which
other priorities get picked up.

### Explicitly not proposed

Two things from the research were deliberately left out because the evidence
argues against them, not just for lower priority:

- **Treating self-consistency/majority-vote margin as a confidence score for
  auto-promotion decisions.** The LLM-judge literature (Priority list, domain
  4 above) is specific evidence this fails; it should be named explicitly in
  the design's existing "never from confidence scores alone" rule so a future
  session doesn't reach for it as a shortcut.
- **Adding more same-model Claude passes as a stand-in for genuine judge
  diversity** (a Panel-of-LLM-Evaluators-style ensemble). The correlated-
  errors research found this adds little real independence and could create
  false confidence that the judgment is more cross-checked than it actually
  is. If genuine diversity is ever wanted, the one option compatible with
  Decision 1 is a narrow Ollama sub-check on a bounded task (claim-quote
  grounding), not more Claude calls.

---

## What this does not solve

The research is consistent, across all five domains, on one point: nothing
found makes "which physically possible read is tactically best" or "is this
the best teaching example" provable. Chess and poker — the two most formally
tractable domains that exist — never automated their own pedagogy layer
either, even after fully solving correctness. Every credentialing body
researched still routes to independent human/expert judgment for exactly this
kind of question, no matter how sophisticated the statistical pre-checks
around it get.

Concretely, that means:

- Gate 8's core judgment call is not a phase RinkReads graduates out of. It's
  permanent load-bearing infrastructure, the same way a testing organization
  never stops needing content-review committees no matter how good its item
  statistics get.
- Every addition proposed above narrows *what gate 8 has to adjudicate* or
  *how often a candidate reaches Thomas* — none of them let gate 8 (or
  anything upstream of it) resolve the pedagogy question by itself.
- The zero-false-approval floor cannot be relaxed by any of this. If anything,
  the research argues for tightening the definition of what counts as
  "confidence" that's allowed near that floor (naming self-consistency
  margins as excluded, per Priority list item above), not loosening it.
- "Reduce how much Thomas reviews" is achievable and has real precedent
  (mammography's 87% reduction in second-reads is a genuine existence proof).
  "Eliminate his review" does not have precedent in any domain researched,
  including ones with far more formal structure than hockey has.

---

## What Thomas needs to decide

This is a research-backed proposal on top of already-approved architecture,
not a new architecture. Nothing here is built or scheduled. Open decisions:

1. **Which of the five proposed additions to build, and in what order.** The
   priority ranking above is a recommendation (portability + review-rate
   impact + build cost), not a decision — Priority 1 (blind second pass) and
   Priority 5 (scheduled recalibration) are the two with the best
   effort-to-value ratio if only two get picked up now.
2. **Whether Priority 4 (embedded unlabeled field-testing) is wanted at all**,
   given it changes what Thomas experiences in ordinary app use, not just
   pipeline internals — this one specifically warrants a explicit yes/no
   rather than default-approve.
3. **Whether a skill/mastery signal exists yet to support Priority 3**
   (discrimination-style pre-check) — if not, that one is blocked on
   telemetry work that isn't scoped here.
4. **Cadence for Priority 5's recalibration re-check** — the 6–12 month
   suggestion is a starting guess, not derived from RinkReads' own data.
5. **Whether the "never from confidence scores alone" rule should be amended
   in the canonical design doc** to explicitly name self-consistency/
   agreement margins, closing the gap this research found before any second-
   pass mechanism gets built on top of it.

None of this is scoped as an implementation plan. If any addition gets a
go-ahead, it gets its own design pass before code, per the existing pattern.
