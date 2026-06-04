# Visual Question Track — Stage 1 (generation + render) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the gauntlet generate a *drawn* (scenario) question for a ledger node, validate it with the scenario engine, queue it, and render it in `#review` — so a real rink question is visible end-to-end. (The hockey + 4-coach visual panels are Stage 2.)

**Architecture:** A `--visual` track in `tools/gauntlet-run.mjs`. A visual creator authors a Scenario (reusing the proven `scenario-author` prompt) tagged to a node; `lintScenario` (engine `validateScenario` + per-primitive scorer self-test) is the deterministic gate; passing scenarios are enqueued. `QuestionPlayerView` in the app learns to render `type:"scenario"` via the existing `ScenarioRenderer`. No new panels yet.

**Tech Stack:** Node ESM, React+Vite. Tests = `.mjs` assert scripts + `process.exit(1)` (repo convention).

**Spec:** `docs/superpowers/specs/2026-06-04-visual-question-track-design.md` (Stage 1).

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `tools/gauntlet/visual-scenario.mjs` | Pure: `repairScenario`, `scenarioHash`, `mockScenario` | Create |
| `tools/gauntlet/visual-scenario.test.mjs` | Unit tests (incl. mock passes `lintScenario`) | Create |
| `tools/gauntlet/visual-prompts.mjs` | `buildVisualCreatorPrompt` (reuses scenario-author system prompt) | Create |
| `tools/gauntlet-run.mjs` | `--visual` flag + `generateVisualOne()`; route in `main` | Modify |
| `src/App.jsx` | `QuestionPlayerView` renders `type:"scenario"` | Modify |

Reuse (no change): `tools/scenario-author/validate.mjs` (`lintScenario`), `tools/scenario-author/prompt.js` (`buildSystemPrompt`), `src/scenario/index.js` (`ScenarioRenderer`, imported at `App.jsx:39`), `AGE_LEVEL` (export from `tools/gauntlet/prompts.mjs`), ledger reader + review-store (`enqueue`).

---

## Task 1: Visual scenario helpers (repair, hash, mock)

**Files:** Create `tools/gauntlet/visual-scenario.mjs`, `tools/gauntlet/visual-scenario.test.mjs`

The mock scenario below was validated against `lintScenario` and passes clean (ok:true, no errs/warns) — do not alter its coordinates/fields.

- [ ] **Step 1: Write the failing test** — create `tools/gauntlet/visual-scenario.test.mjs`:

```js
#!/usr/bin/env node
// Run: node tools/gauntlet/visual-scenario.test.mjs
import { repairScenario, scenarioHash, mockScenario } from "./visual-scenario.mjs";
import { lintScenario } from "../scenario-author/validate.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const node = { id: "u9.passing", ageId: "U9", conceptId: "passing" };

// mockScenario is engine-valid and carries the node tags
{ const s = mockScenario(node, "gen_u9_passing_x1");
  ok("mock id set", s.id === "gen_u9_passing_x1");
  ok("mock type scenario", s.type === "scenario");
  ok("mock nodeId tag", s.nodeId === "u9.passing");
  ok("mock levels from age", JSON.stringify(s.levels) === JSON.stringify(["U9 / Novice"]));
  const v = lintScenario(s);
  ok("mock passes lintScenario", v.ok === true); }

// repairScenario forces id/type/nodeId/levels, keeps the rest
{ const raw = { id: "wrong", stage: { view: "right" }, actors: [{ id: "a", kind: "player", x: 0.5, y: 0.5 }], interaction: { kind: "selection", prompt: "x", from: ["a"], order: "any" }, correct: { kind: "selection", ids: ["a"] } };
  const r = repairScenario(raw, node, "gen_id_2");
  ok("repair forces id", r.id === "gen_id_2");
  ok("repair forces type", r.type === "scenario");
  ok("repair forces nodeId", r.nodeId === "u9.passing");
  ok("repair sets levels", JSON.stringify(r.levels) === JSON.stringify(["U9 / Novice"]));
  ok("repair keeps actors", r.actors.length === 1); }

// scenarioHash is stable and ignores id, sensitive to positions
{ const a = mockScenario(node, "id_a");
  const b = mockScenario(node, "id_b");
  ok("hash ignores id", scenarioHash(a) === scenarioHash(b));
  const moved = mockScenario(node, "id_c"); moved.actors[2].x = 0.1;
  ok("hash changes when a player moves", scenarioHash(moved) !== scenarioHash(a)); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it, verify it fails** — `node tools/gauntlet/visual-scenario.test.mjs` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `tools/gauntlet/visual-scenario.mjs`:

```js
// Pure helpers for the gauntlet's visual (scenario) track: normalize a generated
// scenario onto a node, hash it for dedupe, and a known-valid mock for --mock.
import { createHash } from "node:crypto";
import { AGE_LEVEL } from "./prompts.mjs";

// Force the node tags + engine type onto a generated scenario, keep the rest.
export function repairScenario(s, node, idSeed) {
  s = s && typeof s === "object" ? s : {};
  s.id = idSeed;
  s.type = "scenario";
  s.nodeId = node.id;
  s.levels = Array.isArray(s.levels) && s.levels.length ? s.levels : [AGE_LEVEL[node.ageId]];
  if (typeof s.difficulty !== "number") s.difficulty = 1;
  return s;
}

// Structural signature for dedupe: actor kinds + rounded positions + the prompt
// + the correct answer. Ignores id and cosmetic label/feedback text.
export function scenarioHash(s) {
  const actors = (s.actors || [])
    .map((a) => `${a.kind}:${Math.round((a.x || 0) * 20)},${Math.round((a.y || 0) * 20)}`)
    .sort()
    .join("|");
  const correct = JSON.stringify(s.correct || {});
  const prompt = String(s.interaction?.prompt || "").toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha1").update(actors + "##" + prompt + "##" + correct).digest("hex").slice(0, 16);
}

// A known engine-valid scenario (verified against lintScenario) for --mock runs.
export function mockScenario(node, idSeed) {
  return {
    id: idSeed, type: "scenario", nodeId: node.id, levels: [AGE_LEVEL[node.ageId]], difficulty: 1,
    stage: { view: "right" },
    actors: [
      { id: "you", kind: "player", x: 0.46, y: 0.55, label: "YOU" },
      { id: "puck", kind: "puck", x: 0.47, y: 0.55 },
      { id: "mate_open", kind: "teammate", x: 0.66, y: 0.38 },
      { id: "mate_cov", kind: "teammate", x: 0.60, y: 0.74 },
      { id: "def", kind: "defender", x: 0.58, y: 0.6 },
      { id: "goalie", kind: "goalie", x: 0.92, y: 0.5 },
    ],
    interaction: { kind: "selection", prompt: "You have the puck on the rush. Tap the teammate who is open for a pass.", from: ["mate_open", "mate_cov"], order: "any" },
    correct: { kind: "selection", ids: ["mate_open"] },
    feedback: { right: "Yes, the open lane up high is the best pass.", wrong: "That teammate is covered; look for the open lane." },
  };
}
```

- [ ] **Step 4: Run, verify pass** — `node tools/gauntlet/visual-scenario.test.mjs` → `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/gauntlet/visual-scenario.mjs tools/gauntlet/visual-scenario.test.mjs
git commit -m "feat(gauntlet): visual-scenario helpers (repair/hash/mock) + tests"
```

---

## Task 2: Visual creator prompt

**Files:** Create `tools/gauntlet/visual-prompts.mjs`; add a smoke test in `tools/gauntlet/visual-scenario.test.mjs` (append).

- [ ] **Step 1: Append a failing test** — add to the END of `tools/gauntlet/visual-scenario.test.mjs`, BEFORE the final `console.log`/`process.exit` lines (move those two lines to stay last):

```js
// --- visual creator prompt ---
import { buildVisualCreatorPrompt } from "./visual-prompts.mjs";
{ const concept = { name: "Passing", definition: "Lane selection and timing.", readConnection: "Find the open lane." };
  const domain = { name: "Puck Skills" };
  const { system, prompt } = buildVisualCreatorPrompt({ node: { id: "u9.passing", ageId: "U9", conceptId: "passing" }, concept, domain, idSeed: "gen_u9_passing_z" });
  ok("creator system non-empty", typeof system === "string" && system.length > 100);
  ok("creator embeds nodeId", prompt.includes("u9.passing"));
  ok("creator embeds the level", prompt.includes("U9 / Novice"));
  ok("creator embeds the concept read", prompt.includes("Find the open lane.")); }
```

(If keeping imports at top is cleaner, move `import { buildVisualCreatorPrompt } ...` up with the other imports — either works in ESM.)

- [ ] **Step 2: Run it, verify it fails** — `node tools/gauntlet/visual-scenario.test.mjs` → FAIL (visual-prompts not found).

- [ ] **Step 3: Implement** — create `tools/gauntlet/visual-prompts.mjs`:

```js
// Prompt for the gauntlet's visual creator. Reuses the proven scenario-author
// system prompt (it already teaches the full Scenario schema + rules so output
// is engine-shaped), and adds the curriculum-node + brand context.
import { buildSystemPrompt } from "../scenario-author/prompt.js";
import { AGE_LEVEL } from "./prompts.mjs";

export function buildVisualCreatorPrompt({ node, concept, domain, idSeed, lessons = "" }) {
  const ageDisplay = AGE_LEVEL[node.ageId];
  const system = buildSystemPrompt() +
`

RinkReads brand: warm, kid-friendly, builds "Game Sense". Refer to players by jersey
("black"/"white") or "teammate"/"defender" — never red/green. The scene must depict ONE
read for the target concept, with players positioned where they would really be for that
play.${lessons ? "\n\n" + lessons : ""}`;
  const prompt =
`Author one rink SCENARIO question for this curriculum target.

Age band: ${node.ageId} (${ageDisplay})
Concept: ${concept.name} — ${concept.definition}
The read this trains: ${concept.readConnection}
Domain: ${domain.name}

Use this exact id: ${idSeed}
After authoring the scenario per the schema above, ALSO include these two fields on the
object: "nodeId": "${node.id}", and "levels": ["${ageDisplay}"].

Output ONLY the scenario JSON object.`;
  return { system, prompt };
}
```

- [ ] **Step 4: Run, verify pass** — `node tools/gauntlet/visual-scenario.test.mjs` → `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/gauntlet/visual-prompts.mjs tools/gauntlet/visual-scenario.test.mjs
git commit -m "feat(gauntlet): visual creator prompt (reuses scenario-author schema)"
```

---

## Task 3: `--visual` track in the orchestrator

**Files:** Modify `tools/gauntlet-run.mjs`

- [ ] **Step 1: Imports + flag.** Add near the other gauntlet imports:

```js
import { lintScenario } from "./scenario-author/validate.mjs";
import { buildVisualCreatorPrompt } from "./gauntlet/visual-prompts.mjs";
import { repairScenario, scenarioHash, mockScenario } from "./gauntlet/visual-scenario.mjs";
```

In `parseArgs`, add `visual: false,` to the defaults object and this branch in the loop:

```js
    else if (t === "--visual") a.visual = true;
```

- [ ] **Step 2: Add `generateVisualOne` ABOVE `main`:**

```js
// Stage 1 visual track: author a scenario, engine-validate, enqueue. (Coaches +
// the 4-coach visual panel land in Stage 2; here we just produce + queue a drawn
// question so it can be seen in #review.)
async function generateVisualOne(ledger, node, opts, seen) {
  const concept = conceptById(ledger, node.conceptId);
  const domain = domainById(ledger, concept.domainId);
  const idSeed = `gvis_${node.id.replace(/\./g, "_")}_${rand()}`;
  let notes = [];

  for (let round = 1; round <= opts.rounds; round++) {
    let s;
    try {
      if (opts.mock) s = mockScenario(node, idSeed);
      else {
        const { system, prompt } = buildVisualCreatorPrompt({ node, concept, domain, idSeed });
        const extra = notes.length ? `\n\nThe previous attempt failed validation. Fix: ${notes.join("; ")}` : "";
        s = await runAgent({ system, prompt: prompt + extra, model: opts.model });
      }
    } catch (e) { notes = [`creator error: ${e.message}`]; continue; }
    s = repairScenario(s, node, idSeed);

    const v = lintScenario(s);
    if (!v.ok) { notes = v.errs; continue; }

    const h = scenarioHash(s);
    if (seen.has(h)) { notes = ["duplicate scenario"]; continue; }

    const item = {
      question: s,
      gateHistory: { creator: "pass", validate: "pass", stage: "1-validate-only" },
      proxyVerdict: { decision: "forward", scores: {}, rationale: "Stage-1 visual question (engine-valid). Coach + visual panels are Stage 2. Review directly." },
      queuedAt: new Date().toISOString().slice(0, 10),
    };
    return { ok: true, item, hash: h };
  }
  return { ok: false, reason: `failed after ${opts.rounds} rounds: ${notes.join("; ")}` };
}
```

- [ ] **Step 3: Route in `main`.** Find the per-node generation loop in `main` (the line `const r = await generateOne(ledger, node, opts, seen);`) and replace it with:

```js
      const r = opts.visual
        ? await generateVisualOne(ledger, node, opts, seen)
        : await generateOne(ledger, node, opts, seen);
```

- [ ] **Step 4: Mock run.**

Run: `node tools/gauntlet-run.mjs --node u9.passing --visual --mock`
Expected: `queued gvis_u9_passing_…`. Then:
`node -e "const q=require('./src/data/review-queue.json'); const v=q.items.find(i=>i.question.type==='scenario'); console.log(v? 'scenario queued: '+v.question.id+' actors='+v.question.actors.length : 'NONE')"` → prints a scenario with `actors=6`.

- [ ] **Step 5: Restore the mutated queue + commit.**

```bash
git checkout -- src/data/review-queue.json
git add tools/gauntlet-run.mjs
git commit -m "feat(gauntlet): --visual track (Stage 1) — author scenario, engine-validate, queue"
```

---

## Task 4: Render scenarios in the review/preview surface

**Files:** Modify `src/App.jsx` (`QuestionPlayerView`)

- [ ] **Step 1: Read the current component.** Find `function QuestionPlayerView({ question, onAnswer }) {`. It currently routes rink types → `RinkReadsRinkQuestion`, `multi` → `MultiMCQuestion`, else → `QuestionPreviewFallback`. `ScenarioRenderer` is already imported at `src/App.jsx:39`.

- [ ] **Step 2: Add the scenario branch.** Inside `QuestionPlayerView`, immediately AFTER the `isRinkQ` block returns and BEFORE the `multi` check, add:

```jsx
  if (question?.type === "scenario") {
    return <ScenarioRenderer scenario={question} onAnswer={(p) => onAnswer && onAnswer(!!(p && p.ok))} />;
  }
```

So the function reads: rink check → **scenario check (new)** → multi check → fallback.

- [ ] **Step 3: Build.**

Run: `npm run build`
Expected: succeeds (no "ScenarioRenderer is not defined" — it is already imported).

- [ ] **Step 4: See it for real (dev smoke).**

Run (PowerShell, two steps):
```
node tools/gauntlet-run.mjs --node u9.passing --visual --mock     # queue a scenario
npm run dev
```
Open `http://localhost:<port>/#review`. Expected: the queued scenario renders as an actual **top-down rink with player tokens** (YOU/teammates/defender/goalie), not as text. Tap the open teammate → it grades. Then stop dev and restore the queue: `git checkout -- src/data/review-queue.json`.

- [ ] **Step 5: Commit.**

```bash
git add src/App.jsx
git commit -m "feat(review): render scenario questions on the rink in #review/#q preview"
```

---

## Task 5: Verify end-to-end + no regressions

**Files:** none

- [ ] **Step 1: Unit tests green** — run each, expect `0 failed`:
```bash
node tools/gauntlet/visual-scenario.test.mjs
node tools/gauntlet/lessons.test.mjs
node tools/gauntlet/validate-mc.test.mjs
node tools/gauntlet/select-targets.test.mjs
node tools/review-store.test.mjs
node tools/gauntlet/prompts.test.mjs
```

- [ ] **Step 2: Ledger + build** — `npm run test:ledger` → `VALID`; `npm run build` → succeeds.

- [ ] **Step 3: Live smoke (1 real scenario).** `node tools/gauntlet-run.mjs --node u9.passing --visual` (uses the claude CLI). Expected: a real authored scenario passes `lintScenario` and is queued (`gateHistory.stage === "1-validate-only"`). Inspect `src/data/review-queue.json` — the scenario's actor coords should be plausible (puck carrier, teammate(s), a defender, goalie on the right). If the creator's output fails lint repeatedly, that's the rework loop working; note it.

- [ ] **Step 4: Restore queue.** `git checkout -- src/data/review-queue.json`

---

## Self-Review

- **Spec coverage (Stage 1):** visual creator reusing scenario-author (Task 2) ✓; engine-validate as the deterministic gate via `lintScenario` (Task 3) ✓; `--visual` track + queue (Task 3) ✓; `#review` renders scenarios (Task 4) ✓; mock + live verification (Tasks 3–5) ✓. The hockey panel, 4-coach visual panel, drop+learn, and visual-lessons are **Stage 2** (out of this plan, per the spec's build order).
- **Placeholder scan:** none — every step has full code/commands; the mock scenario is pre-verified against `lintScenario`.
- **Type/name consistency:** `repairScenario`, `scenarioHash`, `mockScenario`, `buildVisualCreatorPrompt`, `generateVisualOne`, `--visual`, `AGE_LEVEL` used identically across tasks. `lintScenario` and `ScenarioRenderer` are existing exports. `gateHistory.stage === "1-validate-only"` consistent between Task 3 and Task 5.
- **Reused unchanged:** `rand`, `conceptById`, `domainById`, `runAgent`, `enqueue`, `loadLedger`, the `main` loop scaffolding — all already in `gauntlet-run.mjs`.
