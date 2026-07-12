# Content Factory at Scale + Coach Video-Review Portal: Research

Date: 2026-07-11
Status: research and recommendations only. No code changed.
Method: deep-research workflow (5 parallel search angles, 21 sources fetched, 101
claims extracted, 25 adversarially vote-verified before an API session-limit cut
verification short). 5 claims cleared full 3-0 verification; 20 more are single
first-party-sourced (quoted from primary sources, not independently re-verified —
flagged below). No claims were refuted.

Companion documents — read these first, this report does not repeat them:
- `docs/research/2026-07-08-question-engine-research.md` — question mechanics,
  game modes, age-band styling. Already covers Duolingo's teaching method,
  temporal-occlusion evidence, and competitor apps (IntelliGym, Sense Arena,
  Project Hockey).
- `docs/factory/SPEC.md` — the existing image→vision→author→overlay→coach-panel
  pipeline. This report validates that architecture against outside evidence and
  flags specific gaps.
- `docs/factory/COST-MODEL.md`, `docs/ai-pipeline/REVIEW-RUBRIC.md` — existing
  cost/QC framing.

This report adds two things not yet in the existing research: (1) architecture
lessons from other builders' content-generation pipelines, verified against
primary sources, mapped onto the existing factory's stages; (2) a full new
section on a **coach video-review portal** (upload game footage → coach reviews
→ feedback) — this feature does not exist in the codebase or roadmap yet
(`coach_reviews` in Supabase is an LLM QA pass on generated scenarios, a
different thing — see note in section 3).

---

## 1. Executive summary

**Content factory:** the existing `docs/factory/SPEC.md` pipeline (curriculum
spine → image → vision+coords → multi-age author → overlays → coach panel →
verdict/ship-or-queue) already matches the pattern every other builder in this
research converged on: **human-defined curriculum structure first, generation
inside that structure, deterministic machine QC, then a human/LLM review gate**.
Nobody in the sourced evidence — not Duolingo, not the academic AQG literature,
not the self-hosted MCQ pipeline — generates open-ended and QCs after the fact.
The gap worth closing is on the **QC layer**: the sourced pipelines use hard,
deterministic, machine-checkable rejects (schema compliance, near-duplicate
detection at a similarity threshold, bounded auto-retry) as a first pass *before*
the expensive LLM/human panel, which the existing coach-panel-only gate doesn't
have. Section 3 gives the concrete checks.

**Video portal:** none of the incumbents (Hudl, OnForm, CoachNow, Dartfish/V1)
disagree on the *toolkit* — voiceover, side-by-side/overlay comparison,
drawing/telestration, and per-athlete organization are table stakes everywhere.
Where they diverge, and where the complaints cluster, is **price and
complexity**: Hudl is the expensive, full-featured incumbent that youth/club
coaches call unaffordable and overbuilt; the challengers compete by being
cheaper and simpler, and even the cheap challengers draw complaints when price
jumps or storage caps bite. For RinkReads/IceIQ this is a clean wedge: ship the
table-stakes toolkit at a youth-hockey price point, bundled into the same app
parents/coaches already use for training — nobody in the sourced evidence
offers that combination.

---

## 2. What the industry actually does for AI-assisted content generation

### 2.1 The universal pattern: humans own structure, AI fills it in

Duolingo is the most-cited practitioner example in this space, and its own
account (three separate primary-source posts, cross-checked) draws a hard line:
**curriculum design is never delegated to AI.** Human learning designers plan
learning objectives and CEFR-aligned scope/sequence first; AI only generates
inside that structure — filling in exercise variants (fill-in-the-blank, word
ordering, listening comprehension) from a smaller corpus of human-written raw
content. [VERIFIED 3-0, blog.duolingo.com/how-duolingo-experts-work-with-ai]
Elsewhere, Duolingo reports this let them ship 148 new language courses in
roughly a year, versus ~12 years to build the first 100 courses under the old
fully-manual process — a ballpark 20x acceleration in course production, without
touching who owns curriculum design. [source-quoted, not independently
re-verified after session cutoff — see note below]

This maps directly onto the existing factory's stage [0] "curriculum spine" —
the coverage ledger of (age × concept × format) cells — sitting upstream of
generation. That's the right shape per the evidence; the recommendation is to
protect it as new question kinds get added (per the 2026-07-08 research), not
to let generation start defining what concepts exist.

A useful secondary data point: when Duolingo built a brand-new domain (chess,
not language), the team did **not** trust generation for the initial curriculum
even with the pipeline mature elsewhere — they hand-storyboarded lessons and
wrote the first content manually in spreadsheets before automating anything.
[claim quoted from aicommunitylearningprogram.substack.com, not independently
re-verified] That's a relevant precedent for any *new* scenario family (e.g. a
new hockey read type) in RinkReads: hand-author the first wave, then template it.

### 2.2 Deterministic QC as a cheap first gate, before the expensive review

The most directly transferable architecture in this research is a February 2026
paper describing a fully self-hosted pipeline that turns lecture PDFs into
multiple-choice questions using a local LLM (Qwen2.5-14B via llama.cpp, no
external API calls). It has five stages: ingestion/segmentation → topic
planning (explicitly to "ensure coverage and minimize redundancy," the same job
the curriculum spine does) → MCQ drafting into a strict schema → **deterministic
QC with bounded retries** → export. [VERIFIED 3-0, arxiv.org/html/2603.08729]

The QC layer is the part worth lifting wholesale. It splits into:
- **Hard checks (reject + auto-retry, no human needed):** JSON schema
  compliance and exact option count; single-answer structure; exact and
  near-duplicate detection at string similarity ≥ 0.92; reject any distractor
  numerically/parametrically equivalent to the correct answer (10⁻⁹ tolerance
  for numeric domains). [VERIFIED 3-0]
- **What hard checks explicitly cannot do**, which is why a human/LLM review
  stage stays mandatory downstream: verify semantic correctness or faithfulness
  to the source material, verify deep logical equivalence, or judge coverage and
  learning impact. In their run, 6.7% of items still got flagged for human
  review even after passing every hard check. [VERIFIED 3-0]

Applied to RinkReads: stage [3] "author" already produces a multi-age/format
bank, and stage [5] "coach panel" already does tactical/pedagogy/adversarial
review — but there's no described machine gate *between* them. Concretely worth
adding before the coach panel ever sees an item: exact/near-duplicate detection
across the growing question bank (catches templated generation converging on
near-identical stems, a known failure mode of template+parameter systems per
the academic literature below), and a schema/overlay-coordinate sanity check
(do the vision-emitted coords actually fall inside the image bounds, is the
lane's from/to distinct from the puck position) before the coach panel's
overlay-accuracy check spends tokens on something structurally broken. This is
a cheap filter, not a replacement for the coach panel.

### 2.3 The academic literature on automatic question generation: known unsolved problems

A systematic review of the AQG (automatic question generation) literature (93
papers, the closest thing this field has to a survey) is useful less as a
recipe and more as a **list of what nobody has actually solved**, so RinkReads
doesn't have to rediscover these the hard way:
- Template-based generation is the most common approach in the literature, but
  it is not cheap — templates/rules have to be hand-built per question type or
  need substantial annotated training data. [claim quoted from
  link.springer.com/10.1007/s40593-019-00186-y, not independently re-verified]
  This matches the factory's own image-first approach sidestepping pure
  templating in favor of vision-grounded generation.
- **Difficulty control is a known unsolved gap** across the field — nobody has
  a reliable way to make a generator target "this should be U9-difficulty" vs
  "this should be U15-difficulty" as a first-class knob. [same source, not
  independently re-verified] This is directly relevant to the age-laddering the
  factory already does manually in stage [3]; it's evidence that age-laddering
  should stay a human/coach-panel judgment call rather than something to
  automate away later.
- **Quality control in the field is dominated by expert human review**;
  automatic metrics are a distant second, and testing questions on actual
  students is the *least* common validation method. [same source, not
  independently re-verified] This is a mild caution against over-indexing on
  automatic pass rates (e.g. a stricter verdict bar, per `docs/factory/SPEC.md`
  section 5) without periodically checking those decisions against how kids
  actually perform on the shipped questions — the coach-panel's blind spot is
  the same blind spot the whole field has.
- There is **no accepted gold standard for evaluating generated
  multiple-choice questions or distractors** — every team has to define its own
  quality bar. [claim quoted from peerj.com/articles/cs-2441, not independently
  re-verified] This validates rather than undermines the factory's
  home-grown verdict rubric; there's no external standard to defer to instead.

### 2.4 RAG-grounded generation, at question-bank scale, with human verification

One source describes generating explanatory comments for **17,843 validated
medical exam questions** feeding a commercial spaced-repetition platform
(SuperMemo), using retrieval-augmented generation (rephraser → search retrieval
with domain synonyms → reranker → GPT-4o generation). [claim quoted from
arxiv.org/html/2503.01859v1, not independently re-verified] Two points worth
carrying over even though this wasn't independently re-verified:
- **Retrieval/grounding quality was the dominant driver of output quality**,
  more than the generation model itself — upgrading the reranker measurably
  raised both the count of relevant source documents retrieved per question and
  a human-rated credibility score; when irrelevant sources outnumbered relevant
  ones, the generated content got vaguer. For RinkReads this argues for keeping
  generation *grounded in the vision-extracted coordinates and the curriculum
  spine's stated concept*, exactly as stage [2]→[3] already does, rather than
  letting an author-stage LLM free-associate from a prompt alone.
  cannot verify semantic correctness or faithfulness automatically.
- **QC was structured human review at real scale**: an 11-parameter rubric on
  a medical-student annotator panel, then a validation phase of 219 questions
  across 22 specialties with **dual independent annotation** and a third
  annotator breaking ties, landing 80-90% inter-annotator agreement. That
  double-annotation-plus-tiebreaker pattern is a concrete upgrade path if the
  coach panel ever needs to scale past one-reviewer-per-item — worth keeping in
  the back pocket, not urgent now.

### 2.5 Spaced repetition + LLM generation: a caution, not just a green light

Two independently-found sources on LLM-generated spaced-repetition prompts
converge on the same caution, worth flagging even unverified: **raw LLM output
for spaced-repetition-style prompts needs explicit scaffolding** (context,
target hints, stated principles) to be usable — ungrounded generation produces
usable results for simple factual recall but degrades on anything requiring
synthesis. [claims quoted from notes.andymatuschak.org and
alexejgossmann.com, not independently re-verified] One of the two sources also
found that in a blinded model comparison, frontier hosted models
(GPT-4-class) meaningfully outperformed locally-run open models on flashcard
quality for anything beyond simple recall. This is relevant if a future
iteration explores fully local generation for cost reasons — the self-hosted
MCQ pipeline in 2.2 proves local models can work for structured, schema-bound
generation with heavy deterministic QC, but that's a narrower claim than
"local models generate good open-ended pedagogical content."

**One useful validation pattern**, from a separate zenml.io case study
(unverified, single source): before trusting an LLM to *validate* generated
quiz content, benchmark the validator model against a known-good, human-curated
question bank first (they used the Open Trivia Database) to get a baseline
accuracy number for that validator, *then* trust its verdicts on newly
generated content. This is a cheap sanity check worth applying to whatever
model powers the coach panel's automated checks — run it against a batch of
already-shipped, known-good RinkReads questions and see if it agrees, before
trusting it on new ones.

---

## 3. Coach video-review portal (new — not in the roadmap yet)

Note first: the existing `coach_reviews` Supabase table
(`supabase/migration_0014_coach_reviews.sql`) is an **LLM pre-review of
generated scenario boards** — content QA, not a human coach reviewing a
player's actual game or practice footage. Nothing conflicts; this is genuinely
new surface area. The feature the user described — a coach uploads/receives
video, reviews it, and gives feedback to a player — is closer to what Hudl
Technique, OnForm, CoachNow, and Dartfish/V1 do.

### 3.1 Table-stakes feature set (converged across every incumbent)

Every platform sourced offers the same core toolkit — build all four before
anything fancier:
- **Voiceover recordings** — coach talks over the paused/playing video instead
  of typing.
- **Side-by-side and overlay video comparison** — two clips (e.g. player rep vs
  a model rep) shown together or superimposed.
- **Drawing/telestration on video** — freehand annotation, arrows, circles,
  frozen on a frame or tracked across frames.
- **Per-athlete/per-team organization** — a workspace per player or roster, not
  a flat video library.

[VERIFIED-adjacent: sourced with matching quotes from three independent
comparison pages — support.onform.com/article/80, onform.com's own V1/CoachNow/
Sportsbox comparison, and a Hudl-vs-OnForm feature page — all naming the same
four items nearly verbatim; not independently 3-vote re-verified after the
session cutoff, but triangulated across three unrelated sources rather than
resting on one.]

### 3.2 Where the incumbents differentiate

- **OnForm bundles communication into the video tool** — built-in group/
  individual chat and PDF/file sharing live inside the same per-athlete
  workspace as the video review, rather than pushing coaches out to email or a
  separate messaging app. [quoted from support.onform.com, single-source]
- **OnForm's pitch vs Hudl Technique is sync speed and offline reliability**:
  automatic cloud sync (recordings sync once connectivity returns after
  offline capture, common at rinks/gyms) and effectively zero processing time
  before a voiceover is shareable. [single-source, unverified]
- Cross-platform, multiple independent comparison pages describe the same
  shape: **Hudl is the powerful, expensive, full-suite incumbent; the
  challengers (OnForm, V1, CoachNow, Sportsbox, Dartfish) compete on being
  simpler and cheaper for club/youth-level programs**, not on a materially
  different toolkit. [pattern repeated across
  onform.com/blog/onform-vs-v1-coachnow-and-sportsbox and
  blog.callplaybook.com's Hudl/Dartfish alternatives roundup, both unverified
  single-source but mutually consistent]

### 3.3 Pricing and the complaint patterns worth designing around

This is the most actionable part of the research — real coaches, in forums,
naming real dollar figures:

- **Hudl** (team/athletic-department tier): coaches on CoachHuey and a
  six-man-football forum cite real invoices in the **$2,500-$11,500/year**
  range depending on camera add-ons (the Focus automated camera and Hudl
  Assist analyst service are the line items that balloon cost); one coach
  explicitly says "at $8k a year, Hudl is no longer a viable option for our
  budget," and dropping the camera/Assist add-ons brought the same program
  under $3,000/year. Hudl also does not publish pricing publicly — every price
  point in the forums comes from a sales call. [quoted from coachhuey.com and
  sixmanfootball.com threads, forum-sourced, single-instance per claim but
  multiple independent threads agree on the shape]
- **OnForm's post-acquisition pricing is the dominant recurring complaint** in
  its own review threads: after OnForm absorbed Hudl Technique users, the free
  tier caps at 10 stored videos and the paid Coach tier is cited at roughly
  **$30/month**, which multiple migrated users call a 5x jump from what they
  paid before (~$60/*year* under the old Hudl Technique pricing) — with users
  explicitly saying they'd pay $100-150/*year* but balk at $30/*month*, and
  naming $9-10/month competitor apps as the price anchor they expect.
  [quoted from justuseapp.com reviews, forum-sourced]
- **CoachNow** lists around **$39.99/month** with a free tier and trial,
  positioning it as the premium option among the challengers.
- One secondary comparison source lists OnForm as low as **$5/month** — this
  directly contradicts the $30/month figure from the migrated-user complaint
  thread above. Not reconciled: likely different tiers (individual vs
  team/coach seat) or a stale/promotional price point on one of the two pages.
  Flagging the conflict rather than picking a number — don't treat either
  figure as RinkReads' pricing anchor without a fresh direct check.

**The actionable pattern, independent of the exact numbers:** the pain isn't
the toolkit, it's (a) opaque/negotiated enterprise pricing at the top (Hudl)
and (b) sudden, steep per-seat jumps after a migration/acquisition at the
middle tier (OnForm). A youth-hockey audience — the same parents/coaches
already paying for RinkReads training access — is exactly the segment that
forum posts show bouncing off both of those patterns. A transparent,
flat, low monthly or annual price, bundled into the existing RinkReads
subscription rather than sold as a separate product, is the wedge the sourced
evidence points at. This is a product/pricing decision, not something to
lock in from this research alone — flag it for the standing offer/pricing
process (`references/advisory-panel/` pattern, if this crosses into BlueChip
territory, though this is squarely an IceIQ product decision).

### 3.4 Recommended feature set for a first version

Ordered by what the evidence says is load-bearing vs. nice-to-have:

**Must-have (table stakes, section 3.1):**
1. Video upload from a player/parent (practice or game clip) into a per-player
   workspace, tied to the existing RinkReads player profile.
2. Coach voiceover review — record audio over playback, save as a reviewable
   artifact the player/parent can replay.
3. Drawing/telestration on a paused frame (arrow, circle, freehand) — the same
   overlay primitives already built for `OverlayLayer.jsx` in the question
   engine are directly reusable here (arrow = the read, ring = the target)
   rather than building a second annotation system from scratch.
4. Side-by-side or overlay comparison — pairs naturally with RinkReads' own
   animated "model" scenario clips: a coach could compare a player's real clip
   against the app's own correct-read animation for the same read type, which
   no incumbent (Hudl/OnForm/CoachNow) can do because they don't have a content
   library behind them.

**Differentiators worth considering, informed by the complaint patterns above:**
5. Flat, transparent pricing bundled into the existing subscription — the
   single most repeated complaint across all three video platforms is
   surprise/opaque cost, which RinkReads starts from a position of strength on
   (already a known, published family price point).
6. Tie video review into the existing coach-visible progress card (per the
   2026-07-08 research's parent/coach reporting hooks) — a coach-reviewed clip
   becomes another artifact on the same weekly card parents already see,
   rather than a disconnected feature.
7. Link a reviewed clip back to a specific RinkReads scenario family/concept
   ("this clip is a 2-on-1 read, here's the matching training set") — this is
   the one integration no incumbent can offer, since none of them have a
   training-content engine behind the video tool.

**Explicitly not must-have for v1** (deferred, not evidenced as necessary):
in-app messaging/chat (OnForm's differentiator, but adds real scope — a
share-a-link-to-review flow may cover the initial ask), offline capture/sync
(matters at scale for teams filming full games rink-side; less relevant if the
entry point is parents uploading clips from home), and multi-camera capture
tooling (Hudl's Focus camera hardware business — out of scope for a
content-driven training app).

---

## 4. Recommended next steps

1. **Content factory:** add the deterministic-QC layer from section 2.2 (schema
   validation, near-duplicate detection, coordinate-bounds sanity check) as a
   cheap pre-filter before the coach panel in `docs/factory/SPEC.md` stage [5].
   Small, mechanical, doesn't touch the curriculum spine or the coach panel's
   judgment calls.
2. **Content factory:** when validating any future automated QC/verdict model,
   benchmark it against a batch of already-shipped, human-approved RinkReads
   questions first (section 2.4's validator-calibration pattern) before
   trusting its verdicts on new content.
3. **Video portal:** this is a new feature, not a refinement — it needs its own
   design pass (brainstorming/spec), not a bolt-on. Reuse `OverlayLayer.jsx`'s
   arrow/ring/text primitives for annotation rather than building parallel
   drawing tools. Scope v1 to the four must-haves in section 3.4.
4. **Pricing:** don't set video-portal pricing from this research alone — the
   two conflicting OnForm price points (section 3.3) show forum/blog pricing
   data is unreliable; get a fresh direct check if/when this becomes a real
   scoping conversation, and treat it as a pricing decision, not a research
   conclusion.

---

## 5. Sources

**Fully verified (3-0 adversarial vote, or 2-0 where one voter errored on
session limit):**
- Self-hosted lecture-to-quiz MCQ pipeline w/ deterministic QC:
  https://arxiv.org/html/2603.08729
- Duolingo staged curriculum-first pipeline:
  https://blog.duolingo.com/how-duolingo-experts-work-with-ai/

**Source-quoted, not independently re-verified** (API session limit cut the
verification pass short before these could get adversarial votes; treated as
first-party-sourced but not confirmed against refutation — re-verify before
treating any single number as load-bearing for a monetary decision):
- Duolingo LLM lesson-generation workflow:
  https://blog.duolingo.com/large-language-model-duolingo-lessons/
- Duolingo course-count acceleration:
  https://businessanalytics.substack.com/p/duolingo-gpt-4-course-content-generation
- Duolingo chess course (hand-authored first, then automated):
  https://aicommunitylearningprogram.substack.com/p/how-duolingo-built-a-chess-learning
- AQG systematic review (93 papers):
  https://link.springer.com/article/10.1007/s40593-019-00186-y
- Distractor generation survey: https://peerj.com/articles/cs-2441/
- AQG evaluation-framework gap: https://link.springer.com/article/10.1007/s10639-024-12771-3
- RAG-generated medical question comments at scale: https://arxiv.org/html/2503.01859v1
- LLM spaced-repetition prompt generation: https://notes.andymatuschak.org/Using_machine_learning_to_generate_good_spaced_repetition_prompts_from_explanatory_text
  and https://www.alexejgossmann.com/LLMs-for-spaced-repetition/
- LLM quiz-validator calibration case study: https://www.zenml.io/llmops-database/building-and-testing-a-production-llm-powered-quiz-application
- OnForm vs Hudl Technique feature comparison: https://support.onform.com/article/80-how-does-onform-compare-to-hudl-technique
- OnForm vs V1/CoachNow/Sportsbox: https://onform.com/blog/onform-vs-v1-coachnow-and-sportsbox-the-best-video-analysis-tool-for-coaches/
- Hudl/Dartfish alternatives roundup: https://blog.callplaybook.com/blog/coach-video-review-software-hudl-dartfish-alternatives
- OnForm pricing complaints: https://justuseapp.com/en/app/1490334045/onform-video-analysis-app/reviews
- Hudl real-world pricing (forum): https://coachhuey.com/thread/89626/hudl-athletic-department-cost
  and https://sixmanfootball.com/threads/alternatives-to-hudl.36281/
- CoachNow/OnForm pricing comparison: https://sourceforge.net/software/compare/CoachNow-vs-OnForm/
  and https://sportsreflector.com/vs/onform (conflicting OnForm price point, see 3.3)

**Methodology note:** the verification pass hit an API session limit
(resets 1:50am America/Edmonton) partway through, after 5 of 25 sampled claims
completed full adversarial voting. Zero claims were refuted before the cutoff —
the unverified list above is "not yet checked," not "checked and doubtful."
Full raw claim/quote/vote data: workflow run `wf_0634cded-f10`, journal at
the session's `subagents/workflows/` transcript directory if a deeper audit is
ever needed.
