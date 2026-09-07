# Scenario-Family Templating — Practitioner Solutions Research

**Status: DESIGN/RESEARCH ONLY.** Nothing in this document is approved, scheduled, or
in progress. No code has been written or changed to produce it, and nothing here is
authorized until Thomas reviews it.

**Complements, does not replace,** the existing academic research and design work in
`docs/superpowers/specs/2026-07-29-scenario-family-templating-design.md` (Deliverable
A: Answer Set Programming, MAP-Elites/Quality-Diversity search, Spelunky/Lichess/
Ceptre/Yarn Spinner/Ink, DARPA SAIL-ON, Automatic Item Generation in edtech —
Deliverable B: the original NoveltySignature/KernelTaskModel proposal) and the design
that superseded parts of it, `docs/superpowers/specs/2026-07-29-scenario-family-templating-FINAL-viable-design.md`
(Semantic Sibling Review + Teaching-Arc Coverage Ledger, adopted after a four-way
adversarial review). That prior work is academic and design-panel research. Thomas
specifically asked for the complementary check: **real proof, from people who
actually shipped something, that "one validated template → a family of meaningfully
distinct, valid variants" is a solved problem in practice** — not just a well-studied
one in papers.

Three research streams ran in parallel: (1) Reddit's procedural-generation/roguelike/
gamedev communities, (2) Stack Overflow/GDSE/Hacker News plus real deployed edtech
tooling, (3) shipped open-source repos and practitioner blogs/docs. Dated 2026-07-29.

---

## What practitioners actually do

### Stream 1 — Reddit (r/proceduralgeneration, r/roguelikedev, r/gamedev, r/MachineLearning)

- **[7q5nge — "How do you generate systems that support..."](https://www.reddit.com/r/proceduralgeneration/comments/7q5nge/how_do_you_generate_systems_that_support/)**,
  u/skaarjslayer summarizing designer Mark Johnson (Ultima Ratio Regum): a **flat**
  generator (independent variables × independent options) gets perceptually exhausted
  fast, because a given variable set to a given value always produces the same
  recognizable result — players learn "oh, that variable does X" once and every future
  combo containing it stops feeling new, even though it's numerically unique. Fix:
  make variable **availability itself conditional/tree-structured**, not just variable
  values.
  **RinkReads translation:** this is very likely why 44/48 of the two-on-one combos
  die. The kernel almost certainly samples `commit`/`depth`/`shape`/`mirror`/`seed`
  independently and flatly, so many combos differ numerically but land in the same
  tactical branch a reviewer already learned to recognize. Fix: make secondary
  parameters conditionally available only after the branch-deciding parameter
  (`commit`) is rolled, not crossed with it.

- **Same thread, u/8BitDragon**: build a "species" generator that produces wildly
  different species first (wide, non-overlapping parameter ranges), then an
  "individual" generator that makes small tweaks *within* a chosen species.
  **Translation:** define 3–5 named "species" for the kernel up front (e.g.
  "delayed-pass read," "shoot-the-seam read," "low-to-high read") each with its own
  tight parameter band, instead of sampling all combos from one shared space and
  hoping a filter sorts them after the fact. Novelty is then true by construction
  between species.

- **Same thread, u/TimmyGilbert**: PCG's problem isn't diversity, it's contrast and
  emphasis — "we have main character, secondary character, and background character."
  Recommends running two generator tunings: a background generator (pleasing
  repetition) and a rarer "hero" generator (sparse, memorable standouts), rather than
  one generator trying to make every output equally remarkable.
  **Translation:** reframe "4 survive out of 48" from a 92% failure rate into a
  deliberate hero/background split — a small set of hero siblings (real distinct
  lessons, plausibly close to the 4 that already survive) and a larger set of
  background siblings explicitly labeled as practice reps of the *same* lesson, not
  run through the novelty gate pretending to be new ones.

- **Same thread, u/GET_TUDA_CHOPPA**, programmer of the shipped Steam game *Sure
  Footing*: built "expressivity analysis" — 2D histograms plotting generated levels on
  chosen axes — specifically to see whether an algorithm change produced a
  meaningfully different output *distribution*, not just a different-looking single
  level. Used it as a diagnostic in project-management meetings on a later client
  project to point at concrete generator gaps.
  **Translation:** before or alongside the pass/fail novelty filter, plot the 48
  candidates on two tactical axes (e.g. "primary decision forced" × "defensive
  pressure/gap tightness") to see where they cluster — turning "4 passed, 44 didn't,
  unclear why" into a visible diagnostic of which parameters never move either axis.

- **[Mark Johnson / Ultima Ratio Regum, Rock Paper Shotgun](https://www.rockpapershotgun.com/2016/09/02/how-to-procedurally-generate-culture/)**
  (the article the reddit thread above cites as the real answer): three named
  techniques against "possibility space exhaustion" — (1) **fractal, not flat**
  generation: a rare top-level choice unlocks whole subtrees most instances never
  roll; (2) **remove possibilities rather than add them**: pick one element first,
  then exclude options elsewhere that would clash with it; (3) **archetypes/templates**:
  hand-author orientations "that will always be interesting," sometimes select one
  wholesale, vary it only slightly.
  **Translation:** (a) make kernel parameters tree-shaped — decide defender lane
  commitment first, let that determine which puck-position/speed/gap ranges are even
  legal to roll next; (b) encode exclusion rules directly in generation ("if gap < X,
  angle > Y isn't legal because it collapses to another branch's read") so the
  novelty gate becomes a final sanity check, not the sole diversity mechanism; (c)
  keep a small hand-validated archetype library of known-distinct kernel siblings, and
  treat the rest of the sweep as small perturbations around each archetype.

- **[r/roguelikedev — "How can you encourage variety without scarcity?"](https://www.reddit.com/r/roguelikedev/comments/e591ga/how_can_you_encouraging_variety_without_scarcity/)**,
  u/kevingranade + u/Syracus_: a sharp practical line between a **forcing function**
  (an approach flatly fails under some circumstance — a real branch point) and mere
  **optimization** (the old approach still works, just less efficiently). "If all
  playstyles are equally efficient at all points in your game, they probably aren't
  that different in the first place."
  **Translation:** use this as the mechanical test for "meaningfully distinct" instead
  of a geometric-distance heuristic: does this parameter change flip which read is
  *objectively correct* (forcing function), or does the old read still work, just
  harder to execute (optimization)? Only forcing-function-level changes should count
  toward the distinct-sibling quota. This likely explains the 4/48 number directly:
  probably only 4 of 48 combos cross the forcing-function threshold; the other 44 make
  the same correct read marginally harder or easier.

- **[r/roguelikedev — dungeon generation via segments/Wang tiles](https://www.reddit.com/r/roguelikedev/comments/b4jsiv/dungeon_generation_using_segments_and_wang_tiles/)**,
  u/pat-- (dev of the shipped game *The Red Prison*): hand-author interesting "big
  tile" templates, randomly rotate/reflect, assemble, roughen, then run a cheap
  flood-fill connectivity check at the *end* — reject-and-restart-from-scratch if it
  fails, never patch. "Fairly brute force... but it's simple and works well."
  **Translation:** push a cheap structural pre-check into candidate *assembly* (e.g.
  "does this gap+position combo even change which passing lane is geometrically
  open" — a cheap check, not a full sim) and reject-and-resample immediately, before
  the expensive physics/tactics validator ever sees the candidate.

- **["10,000 Bowls of Oatmeal" — Kate Compton](https://galaxykate0.tumblr.com/post/139774965871/so-you-want-to-build-a-generator)**
  (named unprompted inside the reddit thread; the original could not be fetched
  directly — 403 — so this entry is corroborated via secondary write-ups rather than
  read first-hand, flagged honestly): 10,000 bowls of oatmeal, every oat in a
  mathematically unique position, still reads as "a bowl of oatmeal." Perceptual
  uniqueness is the bar, not combinatorial uniqueness.
  **Translation:** the precise named version of RinkReads' symptom. Argues for
  treating "physics-valid" and "meaningfully distinct" as two entirely separate gates,
  and for measuring the novelty gate's own yield rate (4/48) as a health metric on the
  kernel's parameter design, not just a filter to tune.

**Honest assessment:** mixed richness, concentrated in one genuinely rich thread
rather than broad coverage. r/proceduralgeneration's 7q5nge thread is a real gold vein
— five different commenters, five different real approaches, two describing
techniques they actually shipped. r/roguelikedev gave two narrower but useful threads.
**r/gamedev was thin** — searches surfaced mostly unrelated posts (asset packs, a
6-comment thread with no technique detail). **r/MachineLearning was thin and
wrong-register** — "quality diversity" is a real term there, but every hit was a
paper-announcement post with 0–1 comments, confirming QD lives in that sub as an
academic citation, not shop talk. Not padded to look thorough — reported as genuinely
thin. Access note: reddit.com and old.reddit.com were network-blocked for direct
fetch, worked around via arctic-shift.photon-reddit.com (a public Reddit-archive API),
verified against real reddit.com permalinks; rockpapershotgun.com was fetched via a
Wayback Machine snapshot, content/byline verified against what the reddit thread cited.

### Stream 2 — Stack Overflow / GDSE / Hacker News + deployed edtech tooling

- **[HN #42700483](https://news.ycombinator.com/item?id=42700483)** (Wave Function
  Collapse world-gen thread): jasonjmcghee names the "1000 bowls of oatmeal" problem
  by its common nickname. mistercow's fix: two passes — a coarse layer (biomes/regions)
  picks the big structural choice first, a second local-WFC pass runs *constrained* by
  whatever the coarse layer picked. mrtracy: "the label-selection step is where all
  the interesting generation happens" — the part that assigns semantic meaning to a
  region is the lever that controls whether two outputs differ, not the tile math
  underneath.
  **Translation:** split the kernel into a coarse layer (which tactical situation/read
  is being taught — the "biome" choice) and a fine layer (continuous parameters,
  constrained by the coarse choice — the local WFC pass). The novelty gate should
  primarily check whether the coarse/label choice differs between two candidates, not
  just whether parameter vectors are numerically far apart.

- **[HN #35735763](https://news.ycombinator.com/item?id=35735763)** ("Why Oatmeal is
  Cheap" discussion): martinpw — procedural output looks arbitrary unless it models
  the underlying *cause*, not just the surface. travisjungroth's concrete pattern:
  "rather than procedurally generating desks and objects on them, you generate a
  sales team [first]... then give each employee a background, then *from that*
  generate a desk" — generate the causal layer first, derive surface parameters from
  it, never randomize the surface independently. Asooka cites Dwarf Fortress as the
  working example (simulated history first, surface detail as a consequence).
  **Translation — the single most directly-applicable pattern found:** generate the
  *cause* of the two-on-one first (a named defensive breakdown — "weak-side D pinches
  and can't recover," "backcheck is a stride behind," "D shades to the puck-carrier
  and gives up the seam") and *derive* the numeric parameters from that cause, rather
  than sampling them independently. The fix isn't a smarter novelty filter on 48
  outputs; it's a causal-generation step upstream of parameter sampling, so a handful
  of genuinely different causes each deterministically imply a parameter cluster.

- **[HN #8782295](https://news.ycombinator.com/item?id=8782295) / [#8782532](https://news.ycombinator.com/item?id=8782532)**
  (Bob Nystrom's "Rooms and Mazes" dungeon generator): agentultra — express tactical
  rules as first-class generative *constraints* the solver satisfies while sampling,
  not free generation + after-the-fact rejection. munificent (the post's author) —
  feed downstream placement decisions back into upstream difficulty math. Commenters —
  inject deliberate noise into the difficulty axis on purpose; a perfectly smooth
  progression is itself a sign of "different numbers, same feel."
  **Translation:** move tactical constraints (e.g. "the second attacker's passing lane
  must stay open for N frames") *into* the generator as constraints the sampler
  satisfies, instead of generating freely and rejecting after; let an early
  structural choice (which read/cause) narrow the valid *range* of downstream
  parameters instead of one fixed range regardless of cause; inject deliberate noise
  into whatever pressure axis the family is meant to span rather than a smooth linear
  sweep across the 48 (a smooth sweep is itself a source of the "decorative, not
  meaningful" complaint).

- **[STACK — Moodle's open-source math-assessment engine](https://docs.stack-assessment.org/en/STACK_question_admin/Deploying_matched_variants/)**,
  real, used at real universities (practitioner write-up: [UCL blog](https://blogs.ucl.ac.uk/digital-education/2022/05/04/moodle-stack-quiz-question-type-deploying-variants-to-avoid-quiz-crashing/)):
  generate a large batch from one question template up front (UCL's own guidance:
  deploy 30+ where possible), run an automated test pass across the *whole batch*
  before anything goes live, exclude anything degenerate or mismatched-difficulty.
  Matched variants get an explicit shared "Random Group" field plus a copied seed
  list — STACK's own docs are honest that without that tagging there's "no way to
  formally record variant matching," calling the untagged version "fragile."
  **Translation — maps almost exactly onto RinkReads' 48-generated/4-survive
  symptom:** STACK's practitioner answer to "most of my batch didn't survive" is not
  "ship the 4 that passed," it's to treat low survival as a signal the *template*
  needs more/better generative axes, and to run the full validity+distinctness
  battery across the whole batch before any human ever sees it — a pre-flight gate,
  not a live filter. Treat 4/48 as a template-quality alarm, not an acceptable yield.

- **[Automatic Item Generation](https://en.wikipedia.org/wiki/Automatic_Item_Generation)
  / [PMC review](https://pmc.ncbi.nlm.nih.gov/articles/PMC10496230/)** (flagged
  honestly: closer to the field's standard practitioner vocabulary than to a forum
  thread): the AIG field's standard two-tier taxonomy — **radicals** (parameters that
  materially change what's being tested/its difficulty) vs. **incidentals** (surface
  substitutions meant to leave the task untouched). Items sharing radicals, differing
  only in incidentals, are "isomorphs"/"clones." The field's own honest caveat:
  incidentals aren't always as harmless as assumed — varying them can shift measured
  difficulty more than expected, so even the "safe" layer needs its own check.
  **Translation:** a ready-made taxonomy for the kernel's parameter list — radicals
  (which attacker has the puck, D commits high/low, backcheck timing relative to the
  pass window — change what's taught) vs. incidentals (exact speeds/coordinates/
  timing within tolerance — change the numbers, not the lesson). The novelty gate's
  job becomes: require at least one *radical* to differ between family members;
  incidental-only variation is legitimate physical variety within a member, not a new
  member. Per the field's own caveat: spot-check that incidentals really are free —
  a speed change might quietly make the "wrong" read the only playable one.

- **[Rune Skovbo Johansen — repeatable random numbers](https://blog.runevision.com/2015/01/primer-on-repeatable-random-numbers.html)**:
  demonstrated bug — feeding sequential/incrementing seeds (0,1,2,3…) into an RNG and
  looking at "the same slot" across sequences shows correlated, non-random values,
  even though each sequence looks fine alone. Fix: route every seed through a real
  hash function first.
  **Translation:** if the kernel enumerates combinations via nested loops over
  parameter ranges (a common, easy-to-write pattern), corresponding "slots" across
  different top-level choices can be quietly correlated — reading as similar even when
  a raw distance metric says they're far apart. Fix: derive each candidate's
  incidental values from a hash of its radical/cause identity, not from a shared loop
  position or counter.

**Honest assessment, reported straight rather than papered over:** Hacker News was
genuinely rich — three real threads with concrete, named-practitioner comments (fetched
via HN's Algolia API after direct news.ycombinator.com fetches hit 429). **Stack
Overflow and GDSE were thin to the point of empty**: WebFetch is flatly blocked for
both domains in this environment, roughly 15 differently-worded WebSearch queries
never once returned an actual SO/GDSE question or answer URL (every query redirected
to devlogs/articles/arXiv instead). Can't rule out good threads exist there; this tool
stack could not surface or read a single one despite real effort. The edtech "item
cloning" angle is real and directly on-point, but its practitioner-grade material
lives in STACK's own docs plus one university's deployment write-up — genuinely
hands-on and usable — rather than in an SO/GDSE/HN thread; the radicals/incidentals
vocabulary itself sits closer to the academic literature already covered elsewhere,
flagged rather than dressed up as a forum discussion it isn't.

### Stream 3 — Shipped open-source projects + practitioner docs/blogs

- **[Cataclysm-DDA MAPGEN.md](https://github.com/CleverRaven/Cataclysm-DDA/blob/master/doc/JSON/MAPGEN.md)**,
  real shipped open-source roguelike: a parameter rolls once from a weighted
  distribution and is reused everywhere within a chosen *scope* ("omt," "nest,"
  "overmap_special") — so a whole building's material/siding agrees instead of
  flickering tile by tile. Context-inappropriate content chunks are matched out by
  neighboring-tile flags, never generated then rejected.
  **Translation:** roll one coherent decision at scenario-scope (e.g. a "defensive
  pressure profile") and derive every downstream numeric knob from that single value
  via a lookup/palette, instead of randomizing each knob independently — turns "48
  independent combos, mostly incoherent" into "N coherent identities, each internally
  consistent by construction."

- **[Kate Compton, GDC talk write-up](https://www.gamedeveloper.com/design/practical-procedural-generation-for-everyone-)**:
  her fix for Spore's planet generator wasn't a better algorithm, it was **curation
  over pure randomization** — manually review outputs, whitelist seeds that produce
  genuinely distinct/appealing results, discard the rest, a human-in-the-loop pass run
  once. Her heuristic: would someone write fanfic about *this one*, differently from
  that one?
  **Translation:** use the fanfic heuristic as a manual spot-check on the 4 survivors
  and a sample of the 44 rejects — can a coach name in words what's tactically
  different, not just cite two different numbers? If no, fold that parameter into
  whichever axis produces a nameable different read instead of leaving it an
  independent generation axis.

- **[Tracery](https://github.com/galaxykate/tracery)**, real, widely-used (3000+
  generative bots): expands text from named grammar rules — a symbol is replaced by a
  pick from that symbol's rule array. Variation is structured as swaps between *named*
  alternatives in a rule tree, not independent numeric perturbation.
  **Translation:** model the kernel as a small grammar instead of a flat parameter
  vector — top-level named symbols like `#defender_read#` = {commits-early |
  holds-the-gap | cheats-to-pass-lane}, each expanding into a coherent bundle of
  numeric parameters. This is the concrete mechanism behind the fanfic heuristic: it
  forces every generation axis to be nameable by a coach, a stronger anti-oatmeal
  guarantee than post-hoc novelty scoring on raw numbers.

- **[WaveFunctionCollapse](https://github.com/mxgmn/WaveFunctionCollapse)**, real,
  shipped in *Bad North*, *Caves of Qud*, *Townscaper*: only patterns present in the
  input example are legal output; the constraint propagates outward from each choice;
  a contradiction is a hard failure/restart, never an invalid emitted result. Variety
  comes from choice *order* over a locally-constrained space, not independent
  per-cell randomization.
  **Translation:** sequence the kernel's parameter choices so each new choice is
  constrained by ones already locked in (gap-distance narrows the legal defender-speed
  range *before* it's drawn), so most of the 44 rejects become structurally
  unreachable rather than generated then discarded — generation and validity-gating
  collapse into one pass, cheaper than generate-48-then-filter-44.

- **[STACK's Random.md](https://github.com/maths/moodle-qtype_stack/blob/master/doc/en/CAS/Random.md)**:
  explicit authoring guidance — "probably much better not to use conditional
  statements when creating random objects" (don't let a downstream if/else silently
  produce a degenerate case). Instead constrain the *draw itself*:
  `rand_with_prohib(lower,upper,list)` excludes specific bad values,
  `rand_with_step` restricts to a legal arithmetic sequence, and correlated
  properties are drawn *together* as matched tuples (e.g. `[p, g] : rand([["Mercury",
  3.61], ["Earth", 9.81], ...])`) so related values can never be independently
  randomized into an inconsistent combination.
  **Translation — the closest structural analogue to RinkReads' exact problem:**
  define per-kernel-parameter prohibited ranges so illegal instances can't be sampled
  at all, and bundle correlated parameters (defender speed + gap distance + ice zone)
  into a single matched-tuple draw instead of independent sampling — illogical
  combinations become structurally unreachable instead of generated-then-rejected.

- **[SudokuClassicMinLex](https://github.com/dclamage/SudokuClassicMinLex)**: two
  puzzles can look numerically different (different grid, different digit labels) but
  be the *same puzzle* under a symmetry group (rotations, band/stack swaps, digit
  relabeling — 3,359,232 equivalent transforms). MinLex reduces any puzzle to one
  canonical representative; comparing canonical forms tells you definitively whether
  two puzzles are the same puzzle in a trenchcoat, used to avoid storing
  near-duplicates.
  **Translation — the cleanest pattern for RinkReads' exact stated symptom:** define a
  canonicalization function that strips out parameters decorative under the kernel's
  own tactical symmetry (mirror the ice, swap which winger is "high," rescale
  distances proportionally), reduce each of the 48 candidates to a canonical
  signature. Any two sharing a signature are provably reskins, discardable for free
  before spending novelty-scoring effort on them — an explainable dedup step instead
  of an emergent, hard-to-explain collapse.

- **[Controlled-bias Sudoku generator](https://github.com/denis-berthier/Controlled-bias_Sudoku_generator_and_collection)**:
  naive generators are statistically biased in ways nobody can quantify; this one
  doesn't pretend to remove the bias, it makes it *precisely known* and corrects for
  it downstream, rather than filtering blind.
  **Translation (minor):** instrument which parameter axes correlate with rejection —
  is it always the same 2 of 6 axes producing decorative-only variants, every run?
  Reporting that bias explicitly tells you which axes to merge/constrain, rather than
  continuing to sample them forever and rediscovering the same 44 rejects each time.

- **[Bob Nystrom, "Rooms and Mazes"](https://journal.stuffwithstuff.com/2014/12/21/rooms-and-mazes/)**
  (real working code, widely-cited): rooms placed by random-attempt-and-discard;
  leftover space filled by randomized maze carving; regions become graph
  vertices/edges; a *spanning tree* guarantees full connectivity with minimum
  carving. Only after that minimal-but-correct skeleton exists does the algorithm
  reopen a small, tunable fraction of culled connectors as extra loops, because a
  perfectly minimal maze "feels dead."
  **Translation:** guarantee the tactical throughline first with a minimum-structure
  pass, then layer bounded "personality" variation on top of the validated skeleton —
  don't ask one random draw to be both correct and interesting at once. After core
  tactical parameters are locked, allow a small number of explicitly bounded cosmetic
  knobs (camera angle, ice-zone labeling, cosmetic timing jitter) to vary freely since
  they can't break the lesson by construction, and don't run them through the same
  expensive novelty gate as the structural ones.

- **[Boris the Brave — Binding of Isaac dungeon generation](https://www.boristhebrave.com/2020/09/12/dungeon-generation-in-binding-of-isaac/)**
  (technical breakdown aided by the original devs, real shipped game): separates
  floorplan generation (which cells hold rooms, how they connect) from room-content
  selection (which of ~174 pre-authored rooms, drawn from a difficulty-scoped pool,
  fills a cell). Every room template is authored so doors sit at the exact same fixed
  position on every side — "there's no special considerations required when choosing
  rooms – they will always work." **No runtime validity check exists for the content
  layer at all**, because the guarantee was pushed to authoring time.
  **Translation — the strongest "eliminate the filter entirely" pattern found:** if
  siblings were authored the way Isaac authors rooms — a pool of pre-vetted,
  read/difficulty-scoped scenario chunks, each independently guaranteed tactically
  valid by construction at sub-kernel authoring time — the 48-then-filter step
  disappears, replaced by draw-from-a-vetted-pool. Real tradeoff: this needs upfront
  authoring/validation investment per chunk instead of one parametrized kernel — the
  cost Isaac's team paid for zero runtime checks.

- **[Darius Kazemi — Spelunky generator breakdown](https://www.tinysubversions.com/spelunkyGen/index.html)**
  (of Derek Yu's real, shipped generator): generates the *solution path first* (a
  left/right/down walk through the grid), and only after the path is committed does it
  assign each on-path room a template keyed to its role on the path. Off-path cells
  get throwaway decorative rooms. Solvability is never checked after generation — it's
  structurally guaranteed because a template is only ever placed where its guarantees
  already match what the committed path needs.
  **Translation:** commit to the teaching point first, then only draw parameters
  compatible with delivering it — never draw parameters independently and check
  afterward whether the lesson survived. Decide which defensive read is being taught
  first (the "path"), then only vary position/speed/timing within whatever range still
  forces that read.

- **[possibilityspace.org tutorial](https://www.possibilityspace.org/tutorial-generative-possibility-space/index.html)**
  (citing researcher/developer Michael Cook): distinguishes **generative space**
  (everything a generator's parameters can actually produce) from **possibility
  space** (everything imaginable in the domain, vastly larger). Pure random generation
  maximizes generative space but produces mostly junk; grammar/chunk-based generators
  (Spelunky named as an example) deliberately *shrink* generative space to the region
  that's reliably good — "bigger isn't always better."
  **Translation:** reframes the 48-vs-4 number directly — the kernel's generative
  space (48 combos) is far bigger than its "good" possibility space (4 survivors),
  meaning it's currently tuned toward the "maximize random variety" end of Cook's
  spectrum. Every other finding above is a concrete instance of the fix this framing
  recommends: deliberately narrow what the kernel can produce, so a much higher
  fraction of what it generates is already good, instead of tolerating a wide space
  and filtering hard downstream.

- **[examgen](https://github.com/RigiResearch/examgen)** — included as an **honest
  negative example**, not a solution: real, working open-source exam generator that
  scrambles question/answer order per seed, with **no mechanism at all** for detecting
  or preventing near-duplicate or invalid variants. Evidence that the
  decorative-variation trap is common even in shipped tools, and that a novelty gate
  downstream of pure reordering will always need to reject almost everything, because
  reordering never had a chance of producing a new read to begin with.

**Honest assessment:** rich, not thin. Multiple real, shipped (or extensively
documented-shipped), fetchable systems with concrete, directly transferable
mechanisms: Cataclysm-DDA's scoped weighted parameters, STACK's constrained-draw
question randomization (real universities), WFC's constraint propagation, Sudoku
MinLex canonicalization, Binding of Isaac's author-time-validated room pools,
Spelunky's path-first generation. A clear cross-domain meta-pattern emerged
unprompted: every system that actually solves this well does it by **narrowing what
can be generated in the first place** — scoped parameters, constrained sampling,
canonical dedup, pre-vetted pools, or commit-to-the-throughline-first ordering —
rather than generating broadly and filtering hard afterward, which is exactly the
generate-then-filter shape RinkReads' 48-to-4 kernel currently has. Weak spots
reported honestly: generic "quiz generator"/"flashcard generator" GitHub results were
mostly thin (examgen's zero-anti-duplicate-mechanism kept in as a named negative
example, not dressed up); galaxykate0.tumblr.com was 403-blocked, so Compton's own
long-form post was not read directly — the Game Developer/GDC write-up was used
instead and is flagged as secondhand paraphrase, not her own prose; a "generate then
discard on failed solvability check" mechanism for Spelunky specifically was not
found despite searching — the actual documented mechanism is structural guarantee via
path-first generation, reported as found rather than as expected.

---

## Does this confirm or change the existing design

Two things need reconciling: the practitioner research above, and the fact that the
design it's being checked against **has itself moved since the academic research was
done tonight.** Deliverable B's original proposal (NoveltySignature schema +
KernelTaskModel artifact, "Candidate 0") was superseded a few hours later, after a
four-candidate adversarial review, by **Semantic Sibling Review (SSR) + a
Teaching-Arc Coverage Ledger** in the FINAL-viable-design doc — Candidate 0 was found
not viable on Concreteness and Fit grounds (named fields with no derivation logic; a
reconciliation deferred under a false premise about `scenario-family-standards.md`
being empty). This section checks the practitioner research against **both**: what it
says about the original academic-grounded proposal, and — more importantly, since
this is the live decision — what it says about SSR.

**Where academic research and practitioner reality agree, plainly:**

- **Radicals vs. incidentals is not an academic-only abstraction — it's live,
  independently-reinvented, working vocabulary.** The formal AIG literature
  (Deliverable A) names it; Stream 2's STACK docs and Stream 1's Mark Johnson
  fractal-generation framework and Stream 3's Cataclysm-DDA scoped parameters all
  describe the identical split from three unrelated fields (psychometrics, a
  hobbyist roguelike designer, a survival-game engine) with no cross-citation between
  them. And per the FINAL-viable-design doc, `twoOnOneKernel.js`'s own source
  comments *already reinvented this split unprompted*, tagging `commit`/`shape` as
  answer-moving and `depth`/`mirror`/jitter as "non-load-bearing only" before any of
  this research ran. That's four independent lineages converging on one idea — strong
  confirmation the underlying concept is real and recognized, not paper-only.
- **STACK is close to a real-world working analog of SSR's shape, not just
  Candidate 0's.** SSR's core move — generate a batch, review the *whole batch*
  semantically against a fixed rubric before anything is promoted, and treat a low
  admit rate as a signal about template quality rather than an acceptable yield — is
  almost exactly STACK's real, university-deployed workflow (generate 30+, run the
  full validity+distinctness battery across the batch before students see any of it,
  treat exclusions as expected and the template as the thing to improve). This is a
  genuine, practitioner-grade confirmation of SSR's overall *shape* (batch-review
  gate, not per-candidate approval), independent of the specific mechanism (STACK
  uses deterministic rules; SSR uses an LLM verdict — see divergence below).
- **The MAP-Elites-style behavior-characterization idea, kept in SSR only as a
  veto-only geometric backstop (the existing `filterNovel`), is independently
  validated as a real diagnostic tool, not just a research construct.** Stream 1's
  *Sure Footing* developer built literally this — 2D histograms over chosen tactical
  axes — and used it in real project meetings to find generator gaps. That supports
  keeping the existing geometric novelty gate around as a cheap cross-check/backstop
  (which SSR already does) rather than discarding it once semantic review exists.

**Where practitioner reality complicates the picture — a real divergence, not just
a wording difference:**

- **Both Candidate 0 and the adopted SSR design leave the kernel completely
  untouched and add a smarter *downstream* judgment step instead.** SSR is explicit
  about this ("zero changes" to `twoOnOneKernel.js`; novelty judgment "moves from
  geometry to semantics," still applied *after* the 48 candidates are already fully
  generated). Practitioner reality's single most-repeated recommendation, showing up
  independently across **all three streams** — fractal/tree-structured generation
  (Stream 1), causal-generation-first / constrain-the-draw (Stream 2), and
  author-time-guaranteed pools / path-first commit (Stream 3) — is the opposite
  instinct: fix this **upstream**, in the generator itself, so most of the 44 rejects
  are never constructed at all, and reserve the expensive judgment step (whichever
  form it takes) as a final cheap sanity check on a mostly-already-good batch, not the
  mechanism doing the actual diversity work. Nothing in the practitioner research
  argues SSR is unsafe or wrong — its conservatism (never let a classification
  substitute for the per-instance physics/tactics/Claude-judgment pipeline) is its own
  strength, unrelated to this point — but by every real-shipped-system's account,
  SSR is solving the same problem WFC/Isaac/Spelunky/STACK solve, just one layer later
  than they'd typically reach for first.
- **This divergence isn't news to the design — it's the exact gap the
  FINAL-viable-design doc already names as open, unresolved, honest residual work.**
  Its closing "What Thomas needs to decide" section states plainly: `two_on_one`'s
  kernel has decision axes for only 2 of its own 6 named teaching-arc reads (the other
  4 exist only as separate hand-authored plays), and "closing that gap means adding
  new decision axes to the kernel... made visible and named rather than left
  implicit." That is precisely the upstream, causal, "generate the cause first"
  fix travisjungroth and Mark Johnson independently describe. The practitioner
  research doesn't reveal a new gap in the design — **it independently confirms, from
  a completely different set of sources, that the gap the design already flagged
  itself is the correct one to eventually close**, and that closing it (not a better
  downstream judge) is where real practitioners say the leverage actually is.
- **SSR's core mechanism itself — an LLM semantically judging a batch of candidates
  against a rubric — has no direct practitioner precedent in what was found.** The
  closest real analogs are Kate Compton's *manual* human curation (a person reviewing
  and whitelisting, not an automated judgment call) and STACK's *automated but
  non-semantic* rule/statistics-based testing. SSR sits between these: a
  semi-automated, LLM-based version of Compton's manual curation. That's not a
  criticism — nothing in the research suggests it's wrong — but it's worth naming
  honestly: this specific mechanism is more novel than the design's own framing might
  suggest, and STACK's real deployment track record backs the batch-gate *shape*, not
  the specific *semantic-LLM-judge* implementation choice.

**Net:** the practitioner research validates SSR's shape (batch review before
promotion, treat low yield as a template signal, keep a cheap geometric backstop) and
independently re-derives the radicals/incidentals split both designs already use. It
does not invalidate SSR — SSR's conservatism is a genuine, deliberate, and correctly
scored strength. But it converges, from an entirely different direction, on the same
conclusion the design's own honest-residual-risk section already reached: the deeper
fix real practitioners reach for first is upstream kernel work (causal/tree-structured
generation, decision axes for all 6 named reads), which is explicitly out of scope for
the currently-approved design and correctly left as named future work rather than
silently declared solved.

---

## The single most convincing piece of evidence

Not one dramatic thread, but a convergence: **the radicals/incidentals split — the
core idea behind both the original design and its successor — was independently
arrived at by three completely unrelated lineages with no contact with each other**:
formal psychometrics research building standardized tests (Automatic Item Generation,
decades of literature), a hobbyist roguelike designer writing a blog post about
procedural culture (Mark Johnson/Ultima Ratio Regum), and RinkReads' own
`twoOnOneKernel.js` source comments, which reinvented the same distinction from
scratch before any of this research ran. When a formal academic field, an
independent game-design practitioner, and an unguided engineer all land on the
identical idea without citing each other, that is about as strong a signal as exists
that the underlying problem has a real, recognized, working shape of solution — not
a novel research question RinkReads has to solve alone. Binding of Isaac's
author-time-guaranteed room pools (a real, shipped, millions-of-players game achieving
"family of valid variants from one template" with **zero runtime validity checks at
all**) is the single cleanest existence proof that the *ambitious* version of this —
fixing it upstream so filtering becomes nearly unnecessary — is not just theoretically
possible but has already shipped, at scale, in production.
