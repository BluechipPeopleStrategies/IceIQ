# RinkReads Content Factory — Build-Out Spec

**Status:** design, ready for review · **Date:** 2026-06-03
**Goal:** a mostly-automated pipeline that turns hockey images into large volumes of coach-graded, age-laddered, multi-format questions with **annotation overlays** that make every read unmistakable — across U7–U18.

---

## 1. Where we are (proven this session)

- **Image-first pipeline works.** Image in → vision reads it → author question bank → coach panel → ship/queue. Wired into the app (`factoryQuestions.json` merged by `qbLoader.js`).
- **The vision-error gap is closed.** Vision now opens the *real* image file (not a thumbnail). It auto-queued the same-jersey tile-14 on its own and corrected mis-read geometry.
- **Known weakness:** the verdict bar is too lenient (wanted to pass 14/15; only 9 survive an honest human look). Fixing the bar is part of this spec.
- **Visual direction chosen: annotation overlays.** Photoreal AI images are mushy/misleading; overlays make the read obvious on top of any art, reliably, as data.

## 2. The overlay system (grounded in `src/OverlayLayer.jsx`)

The engine already renders `q.overlays[]` (normalized 0–1 coords) over an image:

| kind | renders | fields |
|---|---|---|
| `puck` | gradient puck | `x,y,scale,rotation` |
| `text` | bold label (Anton/Impact) | `x,y,text,color,size,scale` |
| sprite | player from sheet + optional **focus ring** | `team(yellow/black),isGoalie,poseIdx,x,y,scale,flip,isFocus` |

Sprite sheets expected at `/assets/sprites/{player-yellow.png, player-black.png, goalie.png}` (players 4×2, goalie 4×4) — **your existing sheets already match this grid.**

**Extensions needed (small, in `OverlayLayer.jsx`):**
- `kind: "arrow"` — a lane/read arrow from `{x1,y1}` to `{x2,y2}` (SVG path + arrowhead, color, dashed). This is *the read*.
- `kind: "ring"` — a standalone highlight ring at `{x,y}` with `r` (open space / open net / open player not tied to a sprite). Today the focus ring only attaches to a sprite.
- `kind: "dim"` (optional) — shade a region to push covered options back.

**Overlay vocabulary for a read** (the house style):
- **Arrow** (gold) = the correct play / lane.
- **Ring** (green, dashed) = the open target (player, net corner, space).
- **Puck glow** = where the puck is.
- **Text** = a one-word cue ("OPEN", "SHOOT") used sparingly.
- Accessibility: never rely on color alone (red/green colorblind rule) — pair with shape + the arrow/label.

## 3. Architecture — the automated pipeline

```
[0] CURRICULUM SPINE          coverage ledger: (age × concept × format) cells to fill
        │                      drives what to make; tracks done/queued/next
        ▼
[1] IMAGE                      from inbox (ChatGPT, zero-API) OR API later. File on disk.
        ▼
[2] VISION + COORDINATES       open the real image; report ground truth AND normalized
        │                      coords for: puck, key players, open target, lane(from→to),
        │                      teamsDistinguishable, single-defensible-read, usable
        ▼
[3] AUTHOR (multi-age/format)  from ground truth: a bank spanning U7→U18 and MC / TF /
        │                      tap / what-next / spot-mistake / emoji. Role+color refs only.
        ▼
[4] OVERLAYS                   per question, attach overlays from the coords (arrow=read,
        │                      ring=open target, puck glow). Auto-placed, not hand-drawn.
        ▼
[5] COACH PANEL (stricter)     tactical / pedagogy / adversarial(views image) +
        │                      OVERLAY-ACCURACY check (does the arrow point at the answer?)
        ▼
[6] VERDICT → SHIP / QUEUE     stricter bar (see §5). Ship → factoryQuestions.json.
                               Queue → review list. Never force a marginal pass.
```

Durable form: a **Node CLI in `tools/`** (alongside `factory-to-bank.mjs`) that orchestrates the Claude agent stages and writes files. The chat workflows we built are the prototypes of stages [2]–[6].

## 4. Vision emits coordinates (the linchpin)

Stage [2] already reads the image. It must also output, in normalized 0–1:
- `puck: {x,y}`
- `actors: [{role, color, x, y}]` (so tap-targets and rings can be placed)
- `openTarget: {x,y}` (the ring)
- `lane: {x1,y1,x2,y2}` (the arrow for the correct read)
- plus the existing `teamsDistinguishable`, `singleBestRead`, `usable`.

These coordinates flow into stage [4] to build overlays with zero hand-placement. If vision can't locate them confidently → queue.

## 5. Coach gates — fixing the leniency

The re-vision over-passed (14/15). New, stricter verdict rules:
1. **Hard rejects (auto-queue):** teams not distinguishable; no single defensible read; incoherent scene (e.g., carrier attacking own net); possession ambiguous; key elements not locatable for overlays.
2. **Overlay-accuracy gate:** a coach confirms the arrow/ring point at the keyed answer. A wrong-pointing overlay is worse than none.
3. **Majority must genuinely PASS** — "REVISE-then-salvage" is allowed only for copy fixes, never to rescue a fundamentally weak scene.
4. **Human spot-check sampling:** every batch surfaces N random shipped items for a human glance; if the sample fails, the batch is held. (We learned the agents alone are too generous.)

## 6. Automation & scale

- **Inbox model (zero-API):** drop generated images in a folder; the factory processes them on a schedule. API generation is a drop-in upgrade later (factory reads files either way).
- **Curriculum ledger** tracks coverage so scheduled runs fill gaps (all ages, all concepts) instead of repeating.
- **Scheduling:** Windows `Register-ScheduledTask` may be sandbox-blocked — fallback to a manual `npm run factory` or the `/schedule` remote agent. Flag at setup.
- **Volume target:** start ~30–50 images (≈300–500 questions) for launch; scale toward 150+ images (1,500+ questions) across the age ladder. One image → ~5–12 questions, so volume is cheap.
- **"Lots of options":** every usable image yields a *family* of questions — multiple formats × multiple age rungs × the same validated read — which is how one scene serves U7 through U18.

## 7. App integration

- Questions ship in the bank schema (`type:"mc"|"tf"`, `media.url`, `levels[]`) **plus `overlays[]`**, merged by `qbLoader.js` (already wired; cache-key bump per batch).
- `OverlayLayer.jsx` gains `arrow` + `ring` kinds.
- Sprite sheets (transparent versions) placed at `/assets/sprites/` enable the *sprite-composite* path later with zero new engine work.
- The `#q=<id>` preview and the generated `factory-index.html` already let us review any batch with images + overlays.

## 8. Hard lessons baked in

1. Vision reads the **real full-res image**, and a coach **views the image** (not just text).
2. Questions reference **role + color, never jersey numbers** (numbers drift between images).
3. **Queue, don't force** — a marginal scene is queued, never shipped with a salvaged read.
4. **Overlays compensate for mushy art** — legibility comes from annotation data, not from winning the generation lottery.
5. **Teams must be visually distinct** — an auto-reject if not.

## 9. Build phases

- **Phase 1 — Overlay foundation (small, do first):** add `arrow` + `ring` to `OverlayLayer.jsx`; have vision emit coordinates; hand-attach overlays to one real tile and verify it renders in the app (`#q=` preview). Proves the read-cue end to end.
- **Phase 2 — Automated overlay generation:** stage [4] builds overlays from vision coords for every question; coach overlay-accuracy gate.
- **Phase 3 — Scale + ledger:** curriculum ledger; batch CLI in `tools/`; stricter verdict + human sampling; run 30–50 images.
- **Phase 4 — Scheduling + review queue:** scheduled inbox processing; a simple review-queue surface to clear held items.

## 10. Open questions

- Transparent yellow-player sheet (current one has a baked gradient background) — needed for the sprite path; not needed for annotation overlays.
- Exact arrow/ring visual style (weight, color, animation?) — settle in Phase 1.
- Spot-check sampling rate and who clears the queue (you, or a hired coach).

---

# Part B — The Play Engine (whiteboard model) · PRIMARY DIRECTION

The photoreal image-first pipeline (Part A) works, but the **data-driven whiteboard model is now the primary path.** Scenarios are authored as *coordinates*, not pixels, and rendered on a clean rink by the overlay engine. This removes the generation lottery entirely and unlocks motion, branching, and the content multiplier below. Photoreal images become an optional input mode, not the core.

## 11. Play data model

A scenario is a **play**: positions + motion + a decision tree.

```
play = {
  concept: "2-on-1 pass read", levels: ["U11"],
  rink: "right",                      // which end / view
  actors: [{ id:"7", team:"black", x, y, moveTo?:{x,y} }, ...],
  puck: { onActor:"7" },
  nodes: {
    A: { onPuck:"7", trigger:"D steps up",  // the motion that opens the read
         ask: { actor:"7", read:"pass cross-ice to 23",
                options:[{t,correct?,next:"B"|outcome}] } },
    B: { onPuck:"23", ... },
  },
  start:"A",
}
```

- **Motion** (`moveTo`, `trigger`): a player steps up / angles / drives; the read is the *consequence* of that motion (proven by `whiteboard-animated.html`).
- **Decision tree** (`nodes`, `next`): each read spawns the next node (proven by `whiteboard-tree.html`). Wrong choices branch to a taught outcome.
- **Per-actor reads:** any node can `ask` a different `actor` (the carrier, the D, the goalie, off-puck support) about the *same* frame.

## 12. The content multiplier

One authored play fans out across five axes:

`nodes (~4) × askable actors (~3) × formats (~6) × age rungs (~4) × variations (×2) ≈ ~575 candidates/play`

Ship only the distinct, quality ones (~15%) → **~85 questions per play**; ~30 plays ≈ **2,500 questions**. This is only possible because the play is **data** (re-ask, re-frame, re-level, mirror, animate for free). **The skill is in the pruning** — a "meaningfully different?" diversity filter + the coach gate keep only distinct, teachable items; the rest are dropped (and the drop is logged, never silently).

## 13. Age interactivity ladder

Same play, rendered through an **interaction profile** keyed by age band. The data is invariant; presentation scales.

| Age | Vibe | Input | Pace | Feedback / reward |
|---|---|---|---|---|
| U7 | Playground (mascot, big targets, voice+emoji, ~no reading) | one tap / drag puck to friend | untimed, infinite retries | confetti + sound |
| U9 | Mini-games (friendly, picture choices) | tap the player | untimed, hints | stars / stickers |
| U11 | The Trainer (real hockey, tree begins) | MC · tap · draw the pass | optional gentle timer | points, streaks |
| U13 | Read & React (tactical language) | sequence · what-next · scan-then-hide | decision timer | coaching note |
| U15 | Pro Reps (subtle cues, systems) | spot-subtle-mistake, timed taps | fast timer | decision analytics |
| U18 | Film Room (lesser-of-two-evils) | fast reaction, full tree | hard timer | performance metrics |

**Representation abstracts with age** (same coordinates, different glyph): U7/U9 render players as **illustrated figures** (the sprite sheets) — concrete and friendly; U11/U13 use **clean numbered tokens**; U15/U18 use **pure X's-and-O's symbols** — the chalk-talk abstraction advanced players actually read. Only the token renderer swaps.

Implementation: an `INTERACTION_PROFILES[ageBand]` config sets chrome/theme, **token representation (figure → numbered token → X/O symbol)**, allowed input modalities, timer behaviour, reading level, and reward style. The renderer reads the profile; the generator picks formats appropriate to the band.

## 14. Revised build phases (play engine)

1. **Rink renderer component** — `RinkPlay`, driven by a `play` object: draws the rink + tokens, animates `moveTo`/motion, renders overlays, handles tap/draw input. (Precedent: `OverlayLayer.jsx` is its own file.)
2. **Interaction profiles** — `INTERACTION_PROFILES` by age band (chrome, input, pace, reward); the renderer applies one.
3. **Decision-tree playback** — node → answer → branch/outcome, with the wrong-choice taught.
4. **Play-authoring generator** — designer agent authors plays (positions + motion + tree) from real situations, age-laddered; coach panel verifies the read follows from the motion; diversity filter prunes the question family.
5. **Ship + scale** — render each shipped question, merge into the bank, batch, then schedule.

## 15. THE GAUNTLET (a question must clear every gate, in order)

Ordering principle: **deterministic + decisive gates first** (they're free and they decide correctness), then the expensive LLM/agent gates, cheap-before-costly. A question dies at the cheapest gate it fails — nothing wasted. Implemented in `src/playSolver.js` + the generator workflow.

| # | Gate | Type | Pass condition | On fail |
|---|------|------|----------------|---------|
| G0 | **Create (3-agent consensus)** | agents | **Three** creator agents independently draw the rink diagram (positions + motion + decision tree) for the curriculum-ledger node (age, unit, concept) + age band. **All three must agree** the concept is sound and the diagram represents it before it advances. Carries the curriculum tag. | regen / drop concept |
| G1 | **Solver** (answer key) | deterministic | `solve()` computes a clear best read from geometry. **This IS is_correct, correct by construction** (the LLM never decides it). | discard/regen if no clear read |
| G2 | **Validation gate** | deterministic | `validateItem()`: exactly one top read (or a declared tie), distractors strictly lower by margin, in bounds, no overlapping players, structural-hash dedupe. | discard/regen |
| G3 | **Generator fit** | deterministic | the format is on the approved list for that age band. | reformat/drop |
| G4 | **Curriculum confirmers** (2 agents) | pedagogy gate | *both* approve: learning-design lens (one concept, follows from the play, age cognitive load) **and** assessment-integrity lens (answer-position randomized, option lengths balanced, answer-frequency balanced, sizes age-appropriate). | revise once or queue |
| G5 | **Render** | deterministic | renders the play on the rink (figures/tokens/symbols per age, half/full/vertical, motion, overlays). | flag |
| G6 | **Graphic designer** (1 agent) | visual gate | reviews the render and improves it BEFORE the coaches: composition, legibility, token and overlay spacing, age-appropriate visual style, brand (navy/gold), contrast and colorblind-safety. Returns fixes, re-render, then it must pass. | revise render |
| G7 | **Coach panel** (3 agents) | hockey gate | tactical / hockey-pedagogy / adversarial all confirm the hockey AND that the improved render shows the read. | revise or queue |
| G8 | **Rationale** | LLM (prose only) | writes the explanation from the solver `breakdown`. **Never overrides the answer.** | (none) |
| G9 | **Ship / queue** | confidence policy | composite confidence above threshold AND curriculum tag present AND every gate green: **auto-post live**. Otherwise to the human-review queue. Batch spot-check sampling. | queue |

**Meta-backstop — golden tests (CI, not per-item):** the solver's hand-labeled scenarios (`tools/solver-golden.mjs`) run in CI; if they regress, the gauntlet is paused because the answer-key engine itself is wrong. Currently **4/4 passing**.

Why this order works: the solver (G1) decides correctness for free, so a question that can't be solved never costs an agent. The deterministic gates (G1–G3) are instant and kill most failures. The pedagogy confirmers (G4) are cheaper than the coaches and gate access to them. The LLM only ever writes prose (G8) — it can't introduce a wrong answer. This is what makes auto-generating thousands of items trustworthy.

**Rework loop (not a dead end).** A gate failure is not a discard. The item is sent back with that gate's specific notes, reworked (the creators or a fixer apply the fixes), and re-enters the gate. If the coach panel (G7) shuts it down, it goes back for further work and then back up to the coaches, not out. This loops up to a cap (default 3 rounds per gate); only after the cap does it land in the human-review queue. It mirrors real coaching: you revise and resubmit, you are not thrown out on the first miss.

## 16. Build decisions (locked 2026-06-03) + curriculum sources

- **Build order:** the machine-readable curriculum ledger first (units x concepts x ages), then the generator reads from it and tags every question to it. That is what makes "connected to the curriculum" true by construction.
- **Curriculum sources (global, not just North American).** Synthesize MULTIPLE development models. USA Hockey ADM and Hockey Canada, AND Soviet/Russian (Tarasov: small-area games, skill density, creativity), Swedish, Finnish, and Czech traditions, plus unsanctioned, pond, and small-area-game hockey. Glean the best ideas from wherever they exist; tag each concept with its source lineage so the curriculum is defensible and globally informed.
- **Go-live policy:** approve-a-batch first (passing items collect in a "ready" tray; one-tap approve a batch), then flip to true auto-post once the queue is consistently clean and the live answer-disagreement rate is near zero.
- **Front-of-gauntlet consensus:** G0 is three creator agents drawing the diagram independently; all three must agree before the concept advances.

