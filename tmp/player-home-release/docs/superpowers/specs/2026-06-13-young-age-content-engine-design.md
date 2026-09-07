# RinkReads, Young-Age Stream-1 Content Engine + Source Library

**Date:** 2026-06-13
**Status:** Design (awaiting owner approval)
**Branch target:** new feature branch off the current `feat/board-mc-questions`

## 1. Why this exists (the problem, in the owner's words)

RinkReads is an off-ice "read the play" trainer for youth hockey. The concept is
solid and the *factory* (gauntlet, coach agents, telemetry, multi-step engine) is
heavily built. But the content is the product, and the content has been the
bottleneck:

> "The factory is fortified on the outside; the inside, the rooms people actually
> come for, is empty. The reads that matter need hockey judgment I do not have, and
> the AI pipeline cannot produce ready-to-ship judgment questions. I do not know
> where to source the expertise."

Stated plainly: the moat is the reads, the reads need judgment, and judgment has
been the wall.

## 2. The strategic insight (what unblocks it)

Two facts already in the repo cancel the bottleneck out:

1. **The two-stream model** (from `2026-06-11-judgment-questions-coaching-panel-design.md`):
   - **Stream 1, clean reads:** one geometrically-best answer, fully deterministic,
     no hockey expert required. The engine already renders and the validators
     already check these.
   - **Stream 2, judgment reads:** several defensible answers (dump vs carry, shoot
     vs pass). Needs the coaching-tradition panel plus a human coach to sign off.
2. **The chosen wedge is young:** U7 / U9 / U11 plus parents. The owner led with U11
   because the older, complex reads are not good enough yet.

The young wedge is *mostly Stream 1*. "Scan before you get the puck, find open ice,
support the carrier, do not all swarm the puck, stay net-side" are objective at
U7-U11. The judgment-heavy content (Stream 2) is exactly the older content already
deferred.

**Conclusion: we do not need the judgment we lack to ship the product we want to
ship first.** Furnish the objective young-age rooms now; defer judgment and a paid
coach until there are users and rating data.

## 3. Scope

**In scope (this spec):**
- A curated **source-of-truth library** that grounds reads in named authority.
- A **content engine** that turns the existing `_briefs-todo` skeletons into
  verified, cited Stream-1 reads for U7 / U9 / U11.
- A first **batch of shipped reads** large enough to power a daily loop at the
  wedge ages.

**Out of scope (separate, later specs):**
- Stream-2 judgment content and the coaching-tradition panel.
- Ages U13 and up.
- A paid coach / human expert pipeline.
- The app-shell launch features (Daily Read UI, onboarding, the "why" card surface,
  shareable scorecard). Those are partly designed in `MVP-launch-recommendations.md`
  and get their own spec once the rooms are furnished.
- Monetization mechanics.

## 4. Component A, the source-of-truth library

The owner's instinct ("create a PDF/article library first") is correct, with one
refinement: the library must be **machine-readable so the engine can ground on it
and cite it**, not just a folder of PDFs a human reads.

**Location:** `docs/library/` in the IceIQ repo (versioned, in-repo, follows the
routing-tree standard already used elsewhere).

**Structure:**
- `docs/library/INDEX.md` — routing index: concept id -> note file -> sources.
- `docs/library/<concept-id>.md` — one note per curriculum concept (the concept ids
  already exist in `curriculum-ledger.json`, e.g. `scanning`, `off-puck-support-offense`,
  `gap-control`). Each note holds:
  - the concept definition and `readConnection` (lifted from the ledger),
  - the **objective coaching rule** for the read ("the correct read is X because Y"),
  - **age calibration** for U7 / U9 / U11 (what it looks like at each band, keyed to
    the ledger depth: I = introduced, D = developing),
  - **citations** to the authority (Hockey Canada LTPD, USA ADM, the Swedish 2024
    scanning study, etc., several already named in the ledger lineage), with a
    pointer to the original in `docs/library/sources/`.
- `docs/library/sources/` — the raw pile (PDFs, saved articles, research),
  consolidated from Notion and disk, named so notes can reference them.

**Seeding the library:** the ledger lineage already names the traditions and some
specific studies. The first pass consolidates the owner's Notion + on-disk pile into
`sources/`, then writes one note per Stream-1 concept used in the v1 batch (not all
30 concepts up front, only the ones the first batch needs).

**Why it matters beyond grounding:** every shipped read carrying a citation to
Hockey Canada / ADM / a named study is the product's credibility *and* its sales
story. No cheap web competitor cites its authority.

## 5. Component B, the content engine

The rails exist. The engine is the disciplined path that walks a curriculum node to
a shipped, cited read, with a deterministic gate that refuses anything that needs
judgment.

**Flow, per read:**
1. **Select a node:** pick an `age.concept` node from `curriculum-ledger.json` that
   is in-wedge (U7/U9/U11) and Stream-1 (objective). See the concept set in section 6.
2. **Pull the skeleton:** take the matching `_briefs-todo/<...>.json` skeleton (already
   pre-filled with `nodeId`, `levels`, `cat`, `difficulty`, `primitive`, `view`,
   `zone`).
3. **Grounded fill:** author the empty fields (`actors` placed by zone id from
   `src/scenario/zones.js`, the single `correct` answer, `prompt`, `feedback.right`,
   `feedback.wrong`, `tip`, `why`), grounded in the library note for that concept and
   the ledger definition. Record a `sourceRef` (library note id + citation).
4. **Compile:** `node scripts/brief-to-seed.mjs <file>` converts zone placements to
   normalized coordinates and validates structure.
5. **Deterministic gate (the Stream-1 floor):**
   - geometry / coherence checks (defender interception, actor spacing, lane
     viability) via the existing `new-scenario` validator (`validate-seed.mjs`),
   - a **cardinality check:** the keyed answer must be the single objectively-best
     option. If more than one option is defensible (cardinality > 1), the read is
     **not** shipped as a single-answer question. It is routed to the deferred
     Stream-2 pile, not forced.
   - a **citation check:** no `sourceRef`, no ship.
6. **Light human spot-check:** the owner reviews a sample (see open decision 4), not
   every read. The deterministic gate plus citation carries the bulk of correctness
   for Stream-1.
7. **Ship:** the seed lands in `src/scenario/seeds/`, auto-globbed by `qbLoader.js`,
   live in the engine.

**Where AI helps vs where determinism rules:** AI assists step 3 (drafting the fill
from the grounded note). Determinism owns step 5 (the gate). Judgment is never
invented; if a read cannot be made objective, it is deferred, not guessed.

## 6. The Stream-1 concept set for the wedge

Objective, ship-now concepts at U7/U9/U11 (anchor domain first):

- **Hockey Sense (anchor):** `scanning` (the #1 cited trainable skill), `reading-the-play`,
  `decision-making`, `time-and-space` at the introduced/developing depth.
- **Offensive Play:** `off-puck-support-offense`, `odd-man-reads` (U11), `zone-entry`
  (U11, gap read).
- **Defensive Play:** `defensive-side-positioning`, `gap-control` (U11), `angling-steering`.
- **Puck Skills as decisions:** `passing` (lane/timing), `receiving` (pre-scan).

**Deferred to Stream 2 (judgment, not in v1):** `creativity-under-pressure`,
`attacking-1v1` (when to take vs make a play), `puck-carrier-options` (carry vs delay
vs pass under pressure), `cycle-and-possession`.

## 7. Verification floor

A read ships only if all hold:
- compiles via `brief-to-seed.mjs`,
- passes `validate-seed.mjs` geometry/coherence,
- cardinality 1 (single objectively-best answer),
- carries a `sourceRef` citation,
- passes the owner spot-check when sampled.

This is the "correctness floor" the judgment design already names, applied to make
Stream-1 shippable without a coach.

## 8. v1 target batch

A batch large enough for a two-week daily loop (3-5 reads/day) at the wedge ages
without repeats, weighted toward the most-ready band:

- **U11:** ~16 reads (most ready; lead band)
- **U9:** ~12 reads
- **U7:** ~8 reads (simplest, one-cue)
- **Total: ~36 verified, cited Stream-1 reads.**

Spread across the section 6 concepts, scanning over-weighted as the anchor and the
marketing hook.

## 9. Success criteria

- ~36 verified Stream-1 reads shipped across U7/U9/U11, each with a citation.
- 100% pass the deterministic gate; 0 judgment-ambiguous reads shipped as
  single-answer.
- Owner spot-check agreement with the keyed answer >= 90% on the sampled set.
- `docs/library/` covers every concept used in the batch, every note cited, sources
  consolidated from Notion + disk.
- Enough volume to run a daily loop for two weeks at the wedge ages without repeats.

## 10. Confirmed decisions (locked 2026-06-13)

1. **Age scope & volume:** U7 + U9 + U11, ~36 reads weighted to U11.
2. **Library format & location:** `docs/library/` curated markdown notes + cited
   `sources/`, routing INDEX.
3. **Content engine path:** the lean grounded-fill + deterministic-gate path above,
   reserving the full G0-G10 gauntlet for later/Stream-2.
4. **Spot-check authority for v1:** the owner reviews a 20% sample now; a coach takes
   over later.

## 11. What comes after this spec

Once the rooms are furnished:
1. App-shell launch spec (Daily Read loop, age/position onboarding, the "why" card,
   shareable scorecard) from `MVP-launch-recommendations.md`.
2. Stream-2 judgment panel spec (the deferred pile becomes the first input).
3. The skill-transfer rating loop (coach/parent ratings on the latent rating infra).
