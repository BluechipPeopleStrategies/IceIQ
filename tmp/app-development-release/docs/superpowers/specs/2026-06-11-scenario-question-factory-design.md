# Scenario Question Factory — Design

**Date:** 2026-06-11
**Status:** Approved (brainstorming)
**Approach:** B — ledger-driven batch loop on the zero-token brief backbone

## Decisions locked

1. **Visual format:** data-driven board only. The static-image / hand-drawn-SVG
   path (image-MC) is retired (frozen, not deleted). Questions are *data* —
   actor positions + a read — rendered live by `ScenarioRenderer` / `board-svg.mjs`.
2. **Goal order:** authoring ergonomics → batch generation → review throughput,
   built as one connected loop.
3. **Generation engine:** external LLM (Gemini/ChatGPT) authors coordinate-free
   *briefs* using zone names; local scripts compile + validate + render.
   **Zero metered Claude tokens anywhere in the loop.**

## Architecture — one loop, four stages

```
curriculum-ledger.json ──▶ [1] gap-finder ──▶ brief skeletons (.json stubs)
                                                      │
                          you paste into Gemini ◀─────┘  (free, external)
                                  │  filled briefs
                                  ▼
        [2] brief-to-seed (exists) ──▶ validated seed + warns
                                  │
                                  ▼
        [3] contact-sheet ──▶ board-svg renders ALL pending seeds, one HTML page
                                  │  eyeball ~20 boards at once
                                  ▼
        [4] batch-approve ──▶ moves OK'd seeds into src/scenario/seeds/ (auto-merged by qbLoader)
```

## Components

### Stage 1 — gap-finder (NEW, ~80 lines)
- **Input:** `src/data/curriculum-ledger.json` (157 nodes: `{id, ageId, conceptId, depth}`),
  current bank coverage (questions per `nodeId`).
- **Output:** ranked worklist of under-covered nodes + a **pre-filled brief skeleton**
  per gap in `docs/ai-pipeline/_briefs-todo/*.json`, with `id`, `nodeId`, `levels`,
  `cat`, `themes`, target `depth`, suggested `primitive` filled; creative fields
  (`actors`, `correct`, `prompt`, `feedback`, `tip`, `why`) left blank.
- **Why:** kills the blank-page problem; guarantees every brief is ledger-anchored.

### Stage 1b — Gemini prompt-pack (NEW doc)
- Single paste-in system prompt + the zone-name vocabulary from
  `src/scenario/zones.js` + 2–3 worked brief examples.
- Reuses the brief schema already documented atop `scripts/brief-to-seed.mjs`
  and `docs/ai-pipeline/START-HERE.md` PROMPT C.
- Gemini fills creative fields using zone names only — never raw coordinates.

### Stage 2 — brief-to-seed (EXISTS, two small additions)
- Today: compiles one brief → validated seed.
- Add (a): `--dir <folder>` mode — compile every brief in a folder, print a
  pass/fail table.
- Add (b): on FAIL, still write the seed to a `_needs-fixing/` bucket so nothing
  is lost.
- Untouched: zone→coord resolution, overlap-spreading, auto-goalie, difficulty
  floor, real validator (`lintScenario`).

### Stage 3 — contact-sheet review (NEW, ~120 lines)
- Renders every compiled-but-unapproved seed through the existing deterministic
  `scripts/board-svg.mjs` into one scrollable HTML page: board thumbnail + stem +
  revealed read + validator warnings per card.
- Approve/reject by click → writes a decision file. No server, no tokens.

### Stage 4 — batch-approve (NEW, ~50 lines)
- Reads contact-sheet decisions; moves approved seeds into `src/scenario/seeds/`
  (where `src/qbLoader.js` already auto-merges them into the bank).
- Replaces the single-human serial `review-queue.json` funnel for the board path.

## What we retire
- image-MC artisanal path (hand-drawn SVG + `image-briefs.json` → `image-bound.json`):
  **frozen, not deleted.** The 4 shipped image-MC questions keep rendering.
- `public/scene-builder.html`: kept as the manual touch-up tool for scenes the
  zone-resolver can't express.

## Testing
- Golden test: fixed brief → expected seed JSON (catches resolver regressions);
  pattern exists in `tools/curriculum-ledger-golden.mjs`.
- Correctness gate: `lintScenario` at stage 2. Human gate: contact-sheet at stage 3.

## Build order
1. brief-to-seed `--dir` + prompt-pack doc (authoring)
2. gap-finder (batch)
3. contact-sheet + batch-approve (throughput)

## Reuse summary
- **New:** gap-finder, contact-sheet, batch-approve scripts + prompt-pack doc;
  `--dir` flag on brief-to-seed.
- **Reused as-is:** brief-to-seed core, `zones.js`, `board-svg.mjs`, `lintScenario`,
  `qbLoader` merge.
