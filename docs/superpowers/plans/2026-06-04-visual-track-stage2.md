# Visual Question Track — Stage 2 (the panels) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a generated visual (scenario) question clear a 3-coach **hockey** panel (the read) and then a 4-coach **visual geometry** panel (Perfectionist · Antagonistic · Spatial-realism/proxemics · Kid-clarity) — both debating to unanimous "perfect" — then a Head Coach, before it reaches the review queue; failures drop and distill **geometry lessons** fed back into the visual creator.

**Architecture:** Extends the Stage-1 `--visual` track in `tools/gauntlet-run.mjs`. Adds an ASCII rink renderer so text agents can "see" coords, a set of visual-panel prompts, and a generic debate runner reused by both scenario panels. Geometry lessons live in their own `visual-lessons.json` (reusing the existing `lessons.mjs` store with a different path). The text track is untouched.

**Tech Stack:** Node ESM, plain JS. Tests = `.mjs` assert scripts + `process.exit(1)` (repo convention).

**Spec:** `docs/superpowers/specs/2026-06-04-visual-question-track-design.md` (Stage 2; the Spatial-realism/proxemics coach is the mandatory member, built out in that spec).

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `tools/gauntlet/ascii-rink.mjs` | Pure: `asciiRink(scenario)` → text grid of actor positions | Create |
| `tools/gauntlet/ascii-rink.test.mjs` | Unit tests | Create |
| `tools/gauntlet/visual-prompts.mjs` | Add `VISUAL_LENSES`, `buildVisualHockeyCoachPrompt`, `buildVisualCoachPrompt`, `buildVisualHeadCoachPrompt`, `buildVisualLessonExtractorPrompt` | Modify |
| `tools/gauntlet/visual-prompts.test.mjs` | Unit tests for the new builders | Create |
| `tools/gauntlet/visual-lessons.json` | Geometry lessons store (starts empty) | Create |
| `tools/gauntlet-run.mjs` | Generic `runScenarioPanel` + `runVisualHeadCoach` + `dropAndLearnVisual`; rewire `generateVisualOne` to run both panels + head coach + drop-learn; load visual lessons into the creator; `paths.visualLessons` | Modify |

Reuse unchanged: `runAgent`, `loadLessons`/`addLesson`/`renderLessons` (already imported in `gauntlet-run.mjs`), `PANEL_LENSES` (the 3 hockey lenses, from `prompts.mjs`), `repairScenario`/`scenarioHash`/`mockScenario`/`lintScenario`/`buildVisualCreatorPrompt` (Stage 1).

---

## Task 1: ASCII rink renderer

**Files:** Create `tools/gauntlet/ascii-rink.mjs`, `tools/gauntlet/ascii-rink.test.mjs`

- [ ] **Step 1: Write the failing test** — create `tools/gauntlet/ascii-rink.test.mjs`:

```js
#!/usr/bin/env node
// Run: node tools/gauntlet/ascii-rink.test.mjs
import { asciiRink } from "./ascii-rink.mjs";
import { mockScenario } from "./visual-scenario.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const s = mockScenario({ id: "u9.passing", ageId: "U9", conceptId: "passing" }, "id1");
const art = asciiRink(s);

ok("returns a string", typeof art === "string" && art.length > 0);
ok("shows the player token Y", art.includes("Y"));
ok("shows a teammate token T", art.includes("T"));
ok("shows a defender token D", art.includes("D"));
ok("shows the goalie token G", art.includes("G"));
ok("has a legend", art.toLowerCase().includes("you") && art.toLowerCase().includes("net"));
// goalie at x=0.92 sits in the right half of the grid
{ const lines = art.split("\n").filter((l) => l.startsWith("|"));
  const gLine = lines.find((l) => l.includes("G"));
  ok("goalie drawn on the right half", gLine && gLine.indexOf("G") > Math.floor(gLine.length / 2)); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it, verify it fails** — `node tools/gauntlet/ascii-rink.test.mjs` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `tools/gauntlet/ascii-rink.mjs`:

```js
// Render a scenario's normalized actor coords (0..1) to a compact ASCII rink so
// text-only review agents can "see" the geometry. Left = own end, right = net.
// Pure + unit-tested.
const TOKEN = { player: "Y", teammate: "T", defender: "D", goalie: "G", puck: "o" };

export function asciiRink(scenario, { cols = 24, rows = 11 } = {}) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(" "));
  // Draw the puck first so a player sharing its cell is drawn on top (visible).
  const actors = [...(scenario.actors || [])].sort((a, b) => (a.kind === "puck" ? -1 : 0) - (b.kind === "puck" ? -1 : 0));
  for (const a of actors) {
    const cx = Math.min(cols - 1, Math.max(0, Math.round((a.x ?? 0) * (cols - 1))));
    const cy = Math.min(rows - 1, Math.max(0, Math.round((a.y ?? 0) * (rows - 1))));
    grid[cy][cx] = TOKEN[a.kind] || "?";
  }
  const bar = "+" + "-".repeat(cols) + "+";
  const body = grid.map((r) => "|" + r.join("") + "|").join("\n");
  return `${bar}\n${body}\n${bar}\nleft = own end, right = net · Y=you T=teammate D=defender G=goalie o=puck`;
}
```

- [ ] **Step 4: Run, verify pass** — `node tools/gauntlet/ascii-rink.test.mjs` → `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/gauntlet/ascii-rink.mjs tools/gauntlet/ascii-rink.test.mjs
git commit -m "feat(gauntlet): ascii-rink renderer for visual coach prompts + tests"
```

---

## Task 2: Visual panel prompts

**Files:** Modify `tools/gauntlet/visual-prompts.mjs`; Create `tools/gauntlet/visual-prompts.test.mjs`

- [ ] **Step 1: Write the failing test** — create `tools/gauntlet/visual-prompts.test.mjs`:

```js
#!/usr/bin/env node
// Run: node tools/gauntlet/visual-prompts.test.mjs
import { VISUAL_LENSES, buildVisualHockeyCoachPrompt, buildVisualCoachPrompt, buildVisualHeadCoachPrompt, buildVisualLessonExtractorPrompt } from "./visual-prompts.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const node = { id: "u11.decision-making", ageId: "U11", conceptId: "decision-making" };
const concept = { name: "Decision Making", definition: "Pick the best option.", readConnection: "Choose the highest-value play." };
const scenario = { id: "s", type: "scenario", interaction: { kind: "selection", prompt: "Tap the open teammate." }, actors: [{ id: "you", kind: "player", x: 0.46, y: 0.55 }], correct: { kind: "selection", ids: ["mate"] } };
const ascii = "+---+\n|Y  |\n+---+";

// four lenses incl. perfectionist, antagonistic, spatial (mandatory), kidclarity
ok("four visual lenses", Array.isArray(VISUAL_LENSES) && VISUAL_LENSES.length === 4);
ok("has perfectionist", VISUAL_LENSES.some((l) => l.key === "perfectionist"));
ok("has antagonistic", VISUAL_LENSES.some((l) => l.key === "antagonistic"));
ok("has spatial proxemics", VISUAL_LENSES.some((l) => l.key === "spatial"));
ok("has kid-clarity", VISUAL_LENSES.some((l) => l.key === "kidclarity"));
ok("spatial lens mentions proxemics/positioning", VISUAL_LENSES.find((l) => l.key === "spatial").focus.toLowerCase().includes("position"));

// visual coach prompt embeds the ascii + coords + lens, and peers in debate
{ const lens = VISUAL_LENSES.find((l) => l.key === "spatial");
  const { system, prompt } = buildVisualCoachPrompt({ scenario, ascii, node, concept, lens, others: [{ key: "perfectionist", critique: ["too crowded"] }] });
  ok("visual coach system names the lens", system.toLowerCase().includes("spatial") || system.toLowerCase().includes("proxemics"));
  ok("visual coach prompt has the ascii", prompt.includes("|Y  |"));
  ok("visual coach prompt has coords", prompt.includes("0.46"));
  ok("visual coach prompt has peer critique", prompt.includes("too crowded")); }

// hockey-on-scenario coach prompt judges the read
{ const lens = { key: "tactical", title: "Tactical", focus: "is the read right" };
  const { system, prompt } = buildVisualHockeyCoachPrompt({ scenario, ascii, node, concept, lens, others: null });
  ok("hockey coach prompt has the scenario prompt", prompt.includes("Tap the open teammate."));
  ok("hockey coach prompt has the read connection", prompt.includes("Choose the highest-value play.")); }

// head coach + extractor
ok("visual head coach builds", typeof buildVisualHeadCoachPrompt({ scenario, node, concept }).system === "string");
ok("extractor embeds critique", buildVisualLessonExtractorPrompt({ scenario, node, critique: ["defender off to the side"] }).prompt.includes("defender off to the side"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it, verify it fails** — `node tools/gauntlet/visual-prompts.test.mjs` → FAIL (exports missing).

- [ ] **Step 3: Implement** — APPEND to `tools/gauntlet/visual-prompts.mjs` (keep the existing `buildVisualCreatorPrompt`):

```js
// The 4 visual-geometry lenses. The spatial/proxemics coach is mandatory — it is
// the one that understands geometry AND the game (see the spec). Each judges ONLY
// the picture, never the hockey read (the hockey panel already did that).
export const VISUAL_LENSES = [
  { key: "perfectionist", title: "Perfectionist (visual)",
    focus: "Every position exact and the read drawn cleanly. Spacing, alignment, symmetry. Truly excellent or nothing." },
  { key: "antagonistic", title: "Antagonistic (visual)",
    focus: "Actively try to break the picture: a misleading angle, an ambiguous frame, a player who would not be there, two plausible reads, a token that overlaps or crowds another." },
  { key: "spatial", title: "Spatial-realism / proxemics coach",
    focus: "Proxemics — the spacing and angles BETWEEN players, judged with geometry AND a coach's eye. Are attackers ahead of or even with the puck (never behind it)? On a 2-on-1 is the lone defender BETWEEN the puck and the net (net-side), not off to the side? Is the goalie centered on the puck line in/near the crease? Are support teammates a real passing lane away, not stacked or impossibly spread? And would a real coach actually put each player in that spot to play this read? Give specific positional fixes with target coordinates." },
  { key: "kidclarity", title: "Kid-clarity coach",
    focus: "Would a child of this age instantly understand the situation and SEE the read from the picture alone? Legible, uncrowded, unambiguous." },
];

function peerBlock(others) {
  return Array.isArray(others) && others.length
    ? `\n\nDebate round — the other coaches said:\n` +
      others.map((o) => `- [${o.key}] ${(o.critique || []).join("; ") || "PASS"}`).join("\n") +
      `\nHold your position on a real flaw; concede if their point resolves it.`
    : "";
}
function actorLines(scenario) {
  return (scenario.actors || [])
    .map((a) => `  ${a.kind.padEnd(9)} (${(a.x ?? 0).toFixed(2)}, ${(a.y ?? 0).toFixed(2)})${a.label ? " " + a.label : ""}`)
    .join("\n");
}

// A visual-geometry coach reviewing ONLY the picture.
export function buildVisualCoachPrompt({ scenario, ascii, node, concept, lens, others }) {
  const system =
`You are the ${lens.title} on a RinkReads panel reviewing the GEOMETRY of a drawn hockey question. The hockey read has already been approved by a separate panel — do NOT re-judge whether the answer is right. Judge ONLY the picture.
Your lens: ${lens.focus}
Coordinates are normalized 0..1 (x: left own-end → right net; y: top → bottom). The bar is PERFECT.
Return ONLY: {"verdict":"PASS"|"REVISE","critique":["specific positional points if REVISE (else empty)"]}`;
  const prompt =
`Age ${node.ageId}. Concept "${concept.name}". The scene must depict: ${concept.readConnection}
Question shown to the player: ${scenario.interaction?.prompt}
Actors (kind, x, y):
${actorLines(scenario)}
ASCII view:
${ascii}${peerBlock(others)}

Judge the picture against your lens at the PERFECT bar. PASS or REVISE.`;
  return { system, prompt };
}

// A hockey coach judging the READ from the geometry (3 hockey lenses reused).
export function buildVisualHockeyCoachPrompt({ scenario, ascii, node, concept, lens, others }) {
  const system =
`You are the ${lens.title} on a RinkReads hockey panel reviewing a DRAWN scenario question. Judge whether the hockey READ is correct given where the players are.
Your lens: ${lens.focus}
The bar is PERFECT — only PASS a question you would stake your name on.
Return ONLY: {"verdict":"PASS"|"REVISE","critique":["specific points if REVISE (else empty)"]}`;
  const prompt =
`Age ${node.ageId}. Concept "${concept.name}" — the read: ${concept.readConnection}
Question: ${scenario.interaction?.prompt}
Correct answer: ${JSON.stringify(scenario.correct)}
Actors (kind, x, y):
${actorLines(scenario)}
ASCII view:
${ascii}${peerBlock(others)}

Is the declared correct read the best play given these positions? PASS or REVISE.`;
  return { system, prompt };
}

// The Head Coach for a drawn question — stricter, whole-product fit.
export function buildVisualHeadCoachPrompt({ scenario, node, concept }) {
  const system =
`You are the HEAD COACH for RinkReads. A hockey panel approved the read and a visual panel approved the geometry of this DRAWN question. Your bar is higher still: brand & voice, exact fit to the curriculum node, that the picture stands proudly beside sibling questions, and that it is worthy of reaching the founder's own review.
Return ONLY: {"verdict":"APPROVE"|"KICK_BACK","notes":["reasons if KICK_BACK"]}`;
  const prompt =
`Node ${node.id} (age ${node.ageId}, concept "${concept.name}": ${concept.definition}).
Scenario:
${JSON.stringify(scenario, null, 2)}

Approve only if excellent on every dimension. Otherwise KICK_BACK with reasons.`;
  return { system, prompt };
}

// Distills a dropped scenario's geometry failure into 1-2 reusable rules.
export function buildVisualLessonExtractorPrompt({ scenario, node, critique }) {
  const system =
`A drawn hockey question was DROPPED after failing geometry review. Turn the failure into 1-2 GENERAL, reusable rules about player POSITIONING/proxemics a scenario author should follow next time (not specific to this exact scene). Keep each rule short and imperative.
Return ONLY: {"lessons":["rule 1","rule 2"]}`;
  const prompt =
`Age ${node.ageId}, concept "${node.conceptId}".
Scenario that failed:
${JSON.stringify(scenario, null, 2)}
Why it failed (geometry): ${(critique || []).join("; ")}

Give 1-2 general positioning rules to prevent this class of failure.`;
  return { system, prompt };
}
```

Also extend the existing `buildVisualCreatorPrompt` so it embeds geometry lessons: it already accepts a `lessons = ""` param and appends it to `system` — no change needed (Task 3 passes the rendered lessons in).

- [ ] **Step 4: Run, verify pass** — `node tools/gauntlet/visual-prompts.test.mjs` → `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/gauntlet/visual-prompts.mjs tools/gauntlet/visual-prompts.test.mjs
git commit -m "feat(gauntlet): visual panel prompts (hockey/geometry/head/extractor) + 4 lenses"
```

---

## Task 3: Geometry lessons store

**Files:** Create `tools/gauntlet/visual-lessons.json`

- [ ] **Step 1: Create the empty store** — `tools/gauntlet/visual-lessons.json`:

```json
{
  "lessons": []
}
```

- [ ] **Step 2: Verify it loads** — Run:
```bash
node -e "import('./tools/gauntlet/lessons.mjs').then(m=>{const l=m.loadLessons('tools/gauntlet/visual-lessons.json');console.log('lessons:',l.lessons.length)})"
```
Expected: `lessons: 0`.

- [ ] **Step 3: Commit**

```bash
git add tools/gauntlet/visual-lessons.json
git commit -m "feat(gauntlet): empty geometry-lessons store for the visual track"
```

---

## Task 4: Wire the panels into `generateVisualOne`

**Files:** Modify `tools/gauntlet-run.mjs`

- [ ] **Step 1: Imports + paths.** Add to the imports:

```js
import { asciiRink } from "./gauntlet/ascii-rink.mjs";
import { VISUAL_LENSES, buildVisualHockeyCoachPrompt, buildVisualCoachPrompt, buildVisualHeadCoachPrompt, buildVisualLessonExtractorPrompt } from "./gauntlet/visual-prompts.mjs";
```

Add `PANEL_LENSES` to the existing import from `./gauntlet/prompts.mjs` if not already imported there (it is imported in the text-track work; confirm `PANEL_LENSES` is in that import list and add it if missing).

In the `paths` object add:
```js
  visualLessons: resolve(root, "tools/gauntlet/visual-lessons.json"),
```

- [ ] **Step 2: Add the scenario-panel helpers ABOVE `generateVisualOne`:**

```js
// Generic debate-to-unanimous panel for scenarios. `lenses` + `makePrompt`
// select the hockey panel (the read) or the visual panel (the geometry).
async function runScenarioPanel(scenario, node, concept, opts, { lenses, makePrompt }) {
  const ascii = asciiRink(scenario);
  let reviews = null;
  for (let round = 1; round <= opts.debateRounds; round++) {
    const others = round === 1 ? null : reviews;
    reviews = [];
    for (const lens of lenses) {
      if (opts.mock) {
        const verdict = (opts.mockFail && lens.key === "perfectionist") ? "REVISE" : "PASS";
        reviews.push({ key: lens.key, verdict, critique: verdict === "REVISE" ? ["[mock] not perfect"] : [] });
      } else {
        const peers = others ? others.filter((o) => o.key !== lens.key) : null;
        let r;
        try { r = await runAgent({ ...makePrompt({ scenario, ascii, node, concept, lens, others: peers }), model: opts.model }); }
        catch (e) { r = { verdict: "REVISE", critique: [`${lens.key} error: ${e.message}`] }; }
        reviews.push({ key: lens.key, verdict: r.verdict, critique: r.critique || [] });
      }
    }
    if (reviews.every((r) => r.verdict === "PASS")) return { ok: true, critiques: [] };
  }
  return { ok: false, critiques: (reviews || []).filter((r) => r.verdict !== "PASS").flatMap((r) => r.critique) };
}

async function runVisualHeadCoach(scenario, node, concept, opts) {
  if (opts.mock) return opts.mockFail ? { ok: false, notes: ["[mock] head coach kickback"] } : { ok: true, notes: [] };
  let r;
  try { r = await runAgent({ ...buildVisualHeadCoachPrompt({ scenario, node, concept }), model: opts.model }); }
  catch (e) { return { ok: false, notes: [`head coach error: ${e.message}`] }; }
  return { ok: r.verdict === "APPROVE", notes: r.notes || [] };
}

async function dropAndLearnVisual(scenario, node, concept, critique, opts) {
  try { appendFileSync(paths.log, JSON.stringify({ ts: new Date().toISOString(), by: "gauntlet-visual", action: "drop", nodeId: node.id, rounds: opts.rounds, finalCritique: critique }) + "\n"); } catch {}
  let lessons = [];
  if (opts.mock) lessons = [`For ${node.ageId} ${node.conceptId}, fix the positioning issue: ${(critique[0] || "unclear").slice(0, 60)}`];
  else {
    try { const r = await runAgent({ ...buildVisualLessonExtractorPrompt({ scenario, node, critique }), model: opts.model }); lessons = Array.isArray(r.lessons) ? r.lessons : []; }
    catch {}
  }
  for (const l of lessons) addLesson(paths.visualLessons, l);
  return lessons;
}
```

- [ ] **Step 3: Replace `generateVisualOne`'s post-validation logic.** In `generateVisualOne`, the `for` loop currently does: create → repair → lint → dedupe → assemble a Stage-1 item. Replace the body so it loads geometry lessons into the creator and runs the panels. Replace the WHOLE function with:

```js
async function generateVisualOne(ledger, node, opts, seen) {
  const concept = conceptById(ledger, node.conceptId);
  const domain = domainById(ledger, concept.domainId);
  const idSeed = `gvis_${node.id.replace(/\./g, "_")}_${rand()}`;
  const lessons = renderLessons(loadLessons(paths.visualLessons));
  let notes = [];

  for (let round = 1; round <= opts.rounds; round++) {
    let s;
    try {
      if (opts.mock) s = mockScenario(node, idSeed);
      else {
        const { system, prompt } = buildVisualCreatorPrompt({ node, concept, domain, idSeed, lessons });
        const extra = notes.length ? `\n\nThe previous attempt was sent back. Fix: ${notes.join("; ")}` : "";
        s = await runAgent({ system, prompt: prompt + extra, model: opts.model });
      }
    } catch (e) { notes = [`creator error: ${e.message}`]; continue; }
    s = repairScenario(s, node, idSeed);

    const v = lintScenario(s);
    if (!v.ok) { notes = v.errs; continue; }

    const h = scenarioHash(s);
    if (seen.has(h)) { notes = ["duplicate scenario"]; continue; }

    // --fast keeps the Stage-1 behaviour (validate-only, no panels).
    if (!opts.fast) {
      const hockey = await runScenarioPanel(s, node, concept, opts, { lenses: PANEL_LENSES, makePrompt: buildVisualHockeyCoachPrompt });
      if (!hockey.ok) { notes = hockey.critiques.length ? hockey.critiques : ["hockey panel not unanimous"]; continue; }
      const visual = await runScenarioPanel(s, node, concept, opts, { lenses: VISUAL_LENSES, makePrompt: buildVisualCoachPrompt });
      if (!visual.ok) { notes = visual.critiques.length ? visual.critiques : ["visual panel not unanimous"]; continue; }
      const head = await runVisualHeadCoach(s, node, concept, opts);
      if (!head.ok) { notes = head.notes.length ? head.notes : ["head coach kickback"]; continue; }
    }

    const item = {
      question: s,
      gateHistory: { creator: "pass", validate: "pass", hockeyPanel: opts.fast ? "skipped" : "unanimous", visualPanel: opts.fast ? "skipped" : "unanimous", headCoach: opts.fast ? "skipped" : "approve", round },
      proxyVerdict: { decision: "forward", scores: {}, rationale: "Drawn question cleared the gauntlet (validate + " + (opts.fast ? "fast/no-panels" : "hockey panel + 4-coach visual panel + Head Coach") + "). Founder-proxy gate (G9) not built yet — review directly." },
      queuedAt: new Date().toISOString().slice(0, 10),
    };
    return { ok: true, item, hash: h };
  }

  const learned = await dropAndLearnVisual({ id: idSeed, nodeId: node.id, actors: [] }, node, concept, notes, opts);
  return { ok: false, dropped: true, reason: `failed after ${opts.rounds} rounds: ${notes.join("; ")}`, learned };
}
```

- [ ] **Step 4: Mock — happy path.**

Run: `node tools/gauntlet-run.mjs --node u11.decision-making --visual --mock`
Expected: `queued gvis_…`. Then:
`node -e "const q=require('./src/data/review-queue.json'); const v=q.items.find(i=>i.question.type==='scenario'); console.log(v.gateHistory.hockeyPanel, v.gateHistory.visualPanel, v.gateHistory.headCoach)"` → `unanimous unanimous approve`.

- [ ] **Step 5: Mock — forced failure drops + learns a geometry lesson.**

Run: `node tools/gauntlet-run.mjs --node u15.scanning --visual --mock --mock-fail`
Expected: console shows `dropped (…) — learned: …`. Then:
`node -e "console.log(require('./tools/gauntlet/visual-lessons.json').lessons.length)"` → `>= 1`.

- [ ] **Step 6: Restore mutated data + commit.**

```bash
git checkout -- src/data/review-queue.json src/data/review-log.jsonl tools/gauntlet/visual-lessons.json
git add tools/gauntlet-run.mjs
git commit -m "feat(gauntlet): visual track Stage 2 — hockey panel + 4-coach visual panel + head coach + geometry drop-learn"
```

---

## Task 5: Verify end-to-end + no regressions

**Files:** none

- [ ] **Step 1: Unit tests green** — run each, expect `0 failed`:
```bash
node tools/gauntlet/ascii-rink.test.mjs
node tools/gauntlet/visual-prompts.test.mjs
node tools/gauntlet/visual-scenario.test.mjs
node tools/gauntlet/lessons.test.mjs
node tools/gauntlet/validate-mc.test.mjs
node tools/gauntlet/select-targets.test.mjs
node tools/gauntlet/prompts.test.mjs
node tools/review-store.test.mjs
```

- [ ] **Step 2: Ledger + build** — `npm run test:ledger` → `VALID`; `npm run build` → succeeds.

- [ ] **Step 3: Live smoke (1 real visual question through both panels).** `node tools/gauntlet-run.mjs --node u11.decision-making --visual` (uses the claude CLI; this is ~10–18 agent calls, slow). Expected: a drawn question either clears both panels + head coach and is queued (`gateHistory.visualPanel === "unanimous"`), OR is dropped with a geometry lesson written to `tools/gauntlet/visual-lessons.json` — both are correct behaviour (the bar is strict). Note which happened.

- [ ] **Step 4: Restore.** `git checkout -- src/data/review-queue.json src/data/review-log.jsonl tools/gauntlet/visual-lessons.json`

---

## Self-Review

- **Spec coverage:** hockey panel on the read (Task 4 `runScenarioPanel` + `PANEL_LENSES` + `buildVisualHockeyCoachPrompt`) ✓; 4-coach visual panel incl. the built-out spatial/proxemics coach (Task 2 `VISUAL_LENSES`, Task 4) ✓; sequential order hockey→visual→head (Task 4) ✓; debate to unanimous (`runScenarioPanel`) ✓; Head Coach (Task 4 `runVisualHeadCoach`) ✓; rework loop carrying critiques (Task 4) ✓; drop+learn into a **separate** geometry-lessons store fed back into the visual creator (Tasks 2–4) ✓; agents reason from coords + ASCII (Task 1 + the prompts) ✓; `--fast` keeps Stage-1 validate-only behaviour ✓.
- **Placeholder scan:** none — full code + commands throughout; the mock scenario (Stage 1) is engine-verified.
- **Type/name consistency:** `asciiRink`, `VISUAL_LENSES`, `buildVisualHockeyCoachPrompt`, `buildVisualCoachPrompt`, `buildVisualHeadCoachPrompt`, `buildVisualLessonExtractorPrompt`, `runScenarioPanel`, `runVisualHeadCoach`, `dropAndLearnVisual`, `paths.visualLessons`, lens keys `perfectionist/antagonistic/spatial/kidclarity`, `PANEL_LENSES` (the 3 hockey lenses) — used identically across tasks. `loadLessons/addLesson/renderLessons`, `appendFileSync`, `runAgent` already imported from the text-track work. `--mock-fail` fails the `perfectionist` lens in both `runPanel` (text) and `runScenarioPanel` (visual), consistent.
- **Curriculum note:** the text track's separate G4 curriculum confirmer is intentionally folded into the visual panels here (the hockey-pedagogy lens + kid-clarity lens cover one-concept/age-load), avoiding an MC-shaped curriculum prompt on a scenario.
