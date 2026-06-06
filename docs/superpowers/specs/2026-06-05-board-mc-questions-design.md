# Board-MC — multiple-choice questions on a validated rink board

**Date:** 2026-06-05
**Status:** Design approved, ready for implementation plan

## Problem

The image-MC pipeline (Gemini/ChatGPT/Codex describe a scene → an LLM hand-draws
an SVG → it becomes an `mc` bank question with `media` + `overlays`) has **no
hockey-geometry validation at all**. It shipped questions where the keyed answer
is "shoot" from the far blue line, the read arrow runs at an impossible angle, and
defenders sit in nonsense spots — plus rotated 3D "figurine" player art. 16 of
these reached the live bank before being pulled.

Meanwhile the **unified scenario engine** (`src/scenario/`) already solves exactly
this: it validates rink geometry (on-stage, spacing, defender minimums, lane
interception, difficulty floor, a scorer self-test on the read) and renders a
clean top-down board. The image path was a second, unguarded pipeline duplicating
the engine's job — badly.

## Goal

Multiple-choice questions **with a picture reference**, where the picture is a
validated, clean rink board that **cannot contradict the answer** — because the
picture, the validation, and the correct answer are all the same validated read.

## Non-goals

- Machine-verifying that the correct option's *text* matches the geometry (stays a
  coach-review item; the *scene* being validated covers ~90% of the failure mode).
- Emitting both an MC and an interactive version of one seed into the same quiz
  (the architecture allows it; v1 presents a board-MC seed as MC only).
- Keeping any freehand-SVG image generation.

## Design

A scenario gains one optional block. **A scenario that has an `mc` block IS a
board-MC question.** It keeps everything a scenario has — actors, a geometric
`correct` read, `feedback`/`tip`/`why` — and the `mc` block layers a written
multiple-choice question on top of that same validated read.

### Schema — `src/scenario/schema.js`

Add to the `Scenario` typedef:

```
mc?: {
  stem?: string,        // the MC question text; falls back to interaction.prompt
  opts: string[],       // exactly 4 options
  ok: 0 | 1 | 2 | 3,    // index of the correct option
}
```

- The scenario still carries its geometric `interaction` + `correct` (e.g.
  `selection` of the open winger, `point` at the open ice, `path`/pass). That read
  is the spine: it is validated, and it is what reveals on the board after answering.
- `mc.opts[mc.ok]` is the written form of that read; the other three are wrong reads.

### Validation — `src/scenario/validators.js` + `tools/scenario-author/validate.mjs`

- **The scene** is validated by every existing scenario rule. This is the fix: the
  geometric read must pass (a "shoot" path must end near a net, a "pass" needs a
  clean lane, defenders meet zone minimums, nobody is off-stage or overlapping,
  difficulty matches complexity, the scorer self-test grades the read correct).
- **New `mc`-shape rules** (only when `mc` present): exactly 4 options, each a
  non-empty string, no duplicate option text, `ok` an integer in 0–3.
- The text↔geometry coherence check is explicitly a coach-review item, not automated.

### Rendering — `src/scenario/ScenarioRenderer.jsx`

`ScenarioRenderer` gains a render mode. When rendering a scenario-with-`mc` in MC
mode:

1. Draw the validated board via `RinkStage` with **no interactive primitive layer
   and no answer shown** — just the players. (The picture reference.)
2. Render the stem (`mc.stem` or the scenario prompt) + the 4 options as buttons.
3. On tap → grade against `mc.ok`.
4. **On answer, reveal the geometric read on the board** — a static highlight of
   `correct` (the chosen selection actor(s) ring up / the point spot marks / the
   path lane draws), reusing each primitive's reveal visuals, alongside
   `feedback`/`why`.

The same seed can still render **interactively** (tap/drag) where wanted — e.g. the
`#scenarios` playground — via a `mode` prop. Mode default in the quiz: MC when
`mc` is present.

### Quiz integration — `src/App.jsx` (quiz engine) + `src/qbLoader.js`

- Scenario seeds already auto-merge into the bank. A seed with an `mc` block
  **presents as MC** in the quiz: the engine routes it to `ScenarioRenderer` in MC
  mode and counts it as an **MC-format** question.
- Answer handling mirrors existing MC (`ok`/wrong → score), so streaks, mastery,
  and progress treat it like any MC question.

### Gating — `src/utils/tierGate.js`

- Board-MC counts as an **MC format → available to the FREE tier** (a richer free
  experience: a picture to reason from, not just text).
- Interactive (tap/drag) scenarios remain the **paid** upsell — the picture becomes
  the hook to upgrade to "do it yourself on the ice."

### Authoring + pipeline — `scripts/brief-to-seed.mjs`, `docs/ai-pipeline/PROMPT-PACK.md`

- A board-MC is a geometry brief (PROMPT C) plus `mc: { opts, ok }`. `brief-to-seed.mjs`
  passes the `mc` block through; the validator runs; the seed lands in
  `src/scenario/seeds/` and auto-merges. **One authoring path, no second system.**
- **Retire** the freehand image pipeline: PROMPT E's "generate the image" step, the
  freehand path in `brief-to-image.mjs`, and the figurine SVG assets. Track C in
  PROMPT-PACK is rewritten to "board-MC = geometry brief + options."
- `image-gallery.mjs` stays (review); `board-svg.mjs` survives only as an optional
  static-export tool.

### Quality — the same gauntlet text got

The reason text questions are good and image questions weren't is the **adversarial
review loop**, which board-MC now inherits in full. Every board-MC runs all three
gates before it ships:

1. **Geometry gate (automatic) — the engine validator.** The scene must pass every
   scenario rule (read ends sanely, lanes clean, defender counts, on-stage, no
   overlaps, difficulty floor, scorer self-test). This is the gate the image
   pipeline never had — it is what rejects "shoot from the far blue line."
2. **Coach-panel / distractor gate (review) — PROMPT B + PROMPT B-SCENARIO.** The MC
   stem and 4 options go through the *same* reviewer that sharpened the text bank:
   make it harder to guess, every distractor a real mistake wrong for a stated
   reason, kill obvious-dummy options, confirm age-fit, confirm exactly one
   defensible answer, and confirm the keyed option actually describes the geometric
   read. The read itself goes through the tactical/pedagogy/adversarial coach lenses.
3. **Engine gate (automatic) — `validate-seed.mjs`.** Final structural + self-test pass.

Concretely the pipeline is: Gemini writes the board brief + `mc` options → ChatGPT
runs PROMPT B over the options (adversarial sharpening) and PROMPT B-SCENARIO over
the read → `brief-to-seed.mjs` + `validate-seed.mjs` enforce the geometry. Nothing
ships that hasn't cleared all three. **This is how "send all image questions through
the gauntlet" actually happens** — by making them scenarios, they become eligible
for the gauntlet that text already uses.

### Migration

The 4 live odd-man + 16 pulled image-MC questions have good **text**
(stem/options/answer/explain). Each is re-authored as a board-MC **scenario**:
place the actors into a validated scene that matches the keyed read, attach the
existing options. Geometry and art are fixed in one move. Then remove the old
`mc`-with-`media` bank entries and the figurine SVGs.

## Files touched

| File | Change |
|------|--------|
| `src/scenario/schema.js` | `mc` typedef + shape check in `validateScenario` |
| `src/scenario/validators.js` | `mc`-shape rules (4 opts, ok range, no dup) |
| `tools/scenario-author/validate.mjs` | trivial `mc` self-test |
| `src/scenario/ScenarioRenderer.jsx` | MC render mode + static read-reveal |
| `src/App.jsx` | quiz routes scenario-with-`mc` to MC render; scoring |
| `src/utils/tierGate.js` | board-MC = FREE MC format; interactive = paid |
| `scripts/brief-to-seed.mjs` | pass `mc` block through |
| `docs/ai-pipeline/PROMPT-PACK.md` | PROMPT C gains `mc`; retire Track C freehand |
| seeds + bank | rebuild the 20 image-MC as board-MC seeds; remove old entries + figurine SVGs |

## Testing

- `validate-seed.mjs` on a board-MC scenario → `OK` (scene rules + `mc` shape).
- A board-MC with a bad scene (e.g. "shoot" with the carrier far from the net) →
  **rejected** by the validator.
- Render a board-MC in `#scenarios` → board + 4 options, pick one, the read reveals.
- A FREE-tier player sees board-MC; an interactive-only scenario is gated.
- One migrated question (e.g. an odd-man read) plays correctly end-to-end.
