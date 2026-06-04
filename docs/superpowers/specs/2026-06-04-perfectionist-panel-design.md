# Perfectionist Coach Panel + Head Coach + Learning Loop — Design Spec

**Status:** approved 2026-06-04. Upgrades the gauntlet generator's quality layer.

## Context

The v1 gauntlet generator (`tools/gauntlet-run.mjs`, merged 2026-06-04) runs a *single*
coach (G7) as the answer-key authority, then queues the question. That's a thin bar for
content that ships to kids. This spec raises it: the single coach becomes a **3-coach panel
where one coach is a perfectionist who debates the other two** to a unanimous "this is
perfect," followed by a **stricter Head Coach** that judges fit with the whole product. And
because a higher bar means more rejections, the workflow **learns from every dropped
question** so the same failure modes get rarer over time. Goal: every question that reaches
the founder review queue has genuinely cleared an excellent-or-nothing bar, and the generator
measurably improves as it runs.

## Decisions (locked in brainstorming 2026-06-04)

- **Default for everything.** The full panel + Head Coach is the standard path for every
  generated question. The lean single-coach path survives only behind `--fast` (plus `--mock`)
  for drafting/testing.
- **On final failure: drop + learn.** A question that can't clear the bar after the rework cap
  is dropped (logged), and its failure is distilled into a durable lesson that improves future
  generation. It does NOT reach the founder queue (the queue stays "cleared the full bar only").
- **Learning = lessons fed into the creator prompt**, not self-rewriting code.

## Architecture

Replaces the single G7 coach step in the generator. New per-question flow:

```
creator → deterministic validate (validate-mc) → curriculum confirmer
   → COACH PANEL (3 agents, debating → unanimous "perfect")
   → HEAD COACH (stricter, whole-product fit)
   → review queue → (founder-proxy gate, later) → founder dashboard
```

The Head Coach is the gauntlet's top **agent** authority and gates entry to the review queue;
the human founder remains the final authority downstream. On any failure the item re-enters the
**rework loop** (back to the creator) up to a cap; after the cap it is dropped and a lesson is
extracted.

### 1. The coach panel (3 agents, one perfectionist)

| Coach | Lens |
|---|---|
| **A — Tactical / answer-key** | The hockey is correct and the declared `ok` is genuinely the best read; distractors are wrong. |
| **B — Pedagogy / learner** | Teaches the node's one read cleanly at the right cognitive load for the age band. |
| **C — Perfectionist (adversarial)** | Nitpicks everything: wording precision, distractor quality, ambiguity, any "tell," and whether the item is *truly excellent* vs merely acceptable. Drives the debate; instructed not to cave on real flaws. |

Each returns `{ verdict: "PASS"|"REVISE", critique: [..] }`. **PASS means "perfect," not "okay."**

### 2. Debate → unanimous consensus

- **Round 1 (blind):** all three review independently.
- If **unanimous PASS** → escalate to Head Coach.
- Else **debate round(s):** each coach is re-prompted with the question + the *other* coaches'
  critiques and re-judges (hold or change position). The perfectionist is told to hold the line
  on genuine flaws. Cap: `--debate-rounds` (default 2).
- If not unanimous PASS after the debate cap → **panel fail** (→ rework loop).

### 3. Head Coach (higher bar)

Receives only panel-blessed items. Judges the highest bar plus **whole-product fit**: brand &
voice, fit to the exact curriculum node, fit alongside sibling questions, accessibility, and
whether it is genuinely worthy of the downstream founder-proxy + founder review. Returns
`{ verdict: "APPROVE"|"KICK_BACK", notes: [..] }`. APPROVE → enqueue. KICK_BACK → counts as a
failure (→ rework loop).

### 4. Rework loop

A panel fail or Head-Coach kickback bundles the critiques/notes and sends them back to the
**creator**, which regenerates; the new question re-runs validate → panel → Head Coach. Capped at
`--rounds` (default 3). The existing v1 rework loop is extended to carry the panel/head-coach
notes, not just deterministic errors.

### 5. Drop + learn

After the rework cap with no APPROVE:
1. **Drop** the question; append a structured record to `src/data/review-log.jsonl`
   (`{action:"drop", nodeId, finalCritique, rounds}`).
2. **Lesson-extractor agent** distills the failure into 1–2 generalizable, node/age-agnostic
   rules (e.g. "for U7, never include more than one cue in the stem"; "distractors must be
   wrong for a *stated* reason, not just weaker").
3. Append to `tools/gauntlet/lessons.json` (deduped by normalized text; cap the list size, e.g.
   keep the most recent/most-frequent N).
4. **Future creator runs load `lessons.json`** and inject the lessons into the creator system
   prompt, so the generator stops repeating the same mistakes. (Optional later: a periodic
   consolidation pass that an agent uses to keep the lesson set tight — out of scope here.)

## Components / files

- **`tools/gauntlet/prompts.mjs`** (modify): add `buildPanelCoachPrompt({question,node,concept,lens,others})`
  (parameterized by the three lenses, incl. the perfectionist; `others` carries peer critiques in
  debate rounds), `buildHeadCoachPrompt({question,node,concept})`, and
  `buildLessonExtractorPrompt({question,node,critique})`. Extend `buildCreatorPrompt` to accept and
  embed `lessons`.
- **`tools/gauntlet/lessons.mjs`** (create, **unit-tested**): pure `loadLessons(path)`,
  `addLesson(path, text)` (dedupe + cap), `renderLessons(lessons)` → string for prompt injection.
- **`tools/gauntlet/lessons.json`** (create): `{ "lessons": [ { "text": "...", "count": N } ] }`,
  starts empty.
- **`tools/gauntlet-run.mjs`** (modify): replace the single-coach step with `runPanel()` (debate to
  consensus) + `runHeadCoach()`; thread the rework loop to carry panel/head notes; on final fail call
  the drop+learn path. Add flags: `--fast` (v1 single coach), `--debate-rounds` (default 2), keep
  `--rounds` (default 3), `--mock`, `--dry-run`. Load `lessons.json` and pass to the creator.

**Cost:** ≈ creator + curriculum + (3 coaches × up to 3 debate passes) + head coach ≈ 7–12+ `claude`
calls per question (free on Max, slower). `--fast`/`--mock` remain for throughput/testing.

## Testing / verification

- **Unit:** `tools/gauntlet/lessons.test.mjs` — load/add/dedupe/cap/render. The existing
  validate-mc / select-targets / review-store tests stay green.
- **Mock:** `--mock` exercises the full panel/head-coach/rework/drop-learn control flow with canned
  agent verdicts (incl. a forced-fail path that drops + writes a lesson) so the orchestration is
  testable without `claude` and without cost.
- **Live smoke:** one real `--node u9.passing` run → observe the panel debate + Head Coach in the
  console, a queued item that cleared the full bar; and a deliberately hard/edge node to watch a
  drop + a lesson get written.
- **No regressions:** `npm run test:ledger` VALID, `npm run build` green; generator still writes only
  to the review queue (never the live bank).

## Out of scope
- Geometry/solver-backed scenarios (still deferred).
- The dedicated founder-proxy gate (G9) — separate spec; the generator still writes a forward stub.
- Periodic agent-driven consolidation/pruning of the lessons set (manual/simple cap for now).
