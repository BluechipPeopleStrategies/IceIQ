# Perfectionist Panel + Head Coach + Learning Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the gauntlet generator's single coach with a debating 3-coach panel (one perfectionist) that must unanimously rate a question "perfect," then a stricter Head Coach, and drop+learn from failures so the generator improves over time.

**Architecture:** Extends the existing v1 generator (`tools/gauntlet-run.mjs` + `tools/gauntlet/prompts.mjs`). Adds a pure, unit-tested lessons store; new role prompts (panel coach parameterized by lens + peer critiques, head coach, lesson-extractor); and orchestration for debate-to-consensus → head coach → rework loop → drop+learn. All agent calls go through the existing `runAgent` (claude CLI); `--mock` makes the whole control flow testable without cost.

**Tech Stack:** Node ESM, plain JS. Tests = `.mjs` assert scripts + `process.exit(1)` (repo convention).

**Spec:** `docs/superpowers/specs/2026-06-04-perfectionist-panel-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `tools/gauntlet/lessons.mjs` | Pure load/add/dedupe/cap/render of learned lessons | Create |
| `tools/gauntlet/lessons.test.mjs` | Unit tests for the lessons store | Create |
| `tools/gauntlet/lessons.json` | Persisted lessons (starts empty) | Create |
| `tools/gauntlet/prompts.mjs` | Add panel-coach / head-coach / lesson-extractor builders; creator embeds lessons | Modify |
| `tools/gauntlet/prompts.test.mjs` | Smoke-test prompt builders embed the right fields | Create |
| `tools/gauntlet-run.mjs` | Panel debate + head coach + rework + drop-learn; new flags | Modify |

Task order: lessons store first (pure, isolated) → prompts (consumed by orchestrator) → orchestrator (wires it all) → verify.

---

## Task 1: Lessons store

**Files:** Create `tools/gauntlet/lessons.mjs`, `tools/gauntlet/lessons.test.mjs`

- [ ] **Step 1: Write the failing test** — create `tools/gauntlet/lessons.test.mjs`:

```js
#!/usr/bin/env node
// Unit tests for the gauntlet lessons store. Run: node tools/gauntlet/lessons.test.mjs
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadLessons, addLesson, renderLessons, MAX_LESSONS } from "./lessons.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const tmp = () => join(mkdtempSync(join(tmpdir(), "lessons-")), "lessons.json");

// missing file -> empty
{ const p = tmp(); ok("missing file loads empty", JSON.stringify(loadLessons(p)) === JSON.stringify({ lessons: [] })); }

// add appends with count 1
{ const p = tmp(); const r = addLesson(p, "Keep U7 stems to one cue."); 
  ok("add returns added", r.added === true);
  const l = loadLessons(p); ok("one lesson stored", l.lessons.length === 1 && l.lessons[0].count === 1); }

// duplicate (normalized) increments count, does not duplicate
{ const p = tmp(); addLesson(p, "Distractors must be wrong for a reason."); 
  const r = addLesson(p, "  distractors MUST be wrong for a reason!  ");
  const l = loadLessons(p);
  ok("dup not duplicated", l.lessons.length === 1);
  ok("dup increments count", l.lessons[0].count === 2);
  ok("dup returns added:false", r.added === false); }

// cap: never exceeds MAX_LESSONS; lowest-count dropped first
{ const p = tmp();
  for (let i = 0; i < MAX_LESSONS + 5; i++) addLesson(p, `lesson number ${i}`);
  const l = loadLessons(p);
  ok("respects MAX_LESSONS cap", l.lessons.length === MAX_LESSONS); }

// render: empty -> "", non-empty -> bulleted block containing the text
{ ok("render empty is blank", renderLessons({ lessons: [] }) === "");
  const block = renderLessons({ lessons: [{ text: "Avoid trick wording.", count: 3 }] });
  ok("render includes the lesson text", block.includes("Avoid trick wording.")); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node tools/gauntlet/lessons.test.mjs`
Expected: FAIL — `Cannot find module './lessons.mjs'`.

- [ ] **Step 3: Implement** — create `tools/gauntlet/lessons.mjs`:

```js
// Learned lessons the gauntlet accumulates from dropped questions, fed back into
// the creator prompt so the same failure modes get rarer. Pure + unit-tested.
import { readFileSync, writeFileSync } from "node:fs";

export const MAX_LESSONS = 40;
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

export function loadLessons(path) {
  try {
    const j = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(j.lessons) ? j : { lessons: [] };
  } catch { return { lessons: [] }; }
}

// Add a lesson (deduped by normalized text → increments count). Caps the list at
// MAX_LESSONS, dropping the lowest-count entries first. Returns { ok, added }.
export function addLesson(path, text) {
  const clean = String(text || "").trim();
  if (clean.length < 5) return { ok: false, added: false };
  const data = loadLessons(path);
  const key = norm(clean);
  const existing = data.lessons.find((l) => norm(l.text) === key);
  let added;
  if (existing) { existing.count += 1; added = false; }
  else { data.lessons.push({ text: clean, count: 1 }); added = true; }
  data.lessons.sort((a, b) => b.count - a.count);
  if (data.lessons.length > MAX_LESSONS) data.lessons = data.lessons.slice(0, MAX_LESSONS);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  return { ok: true, added };
}

// Render lessons as a prompt-injectable block (empty string when there are none).
export function renderLessons(data) {
  const lessons = data?.lessons || [];
  if (!lessons.length) return "";
  return "Lessons learned from past rejected questions — follow these:\n" +
    lessons.map((l) => `- ${l.text}`).join("\n");
}
```

- [ ] **Step 4: Run, verify pass** — `node tools/gauntlet/lessons.test.mjs` → `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/gauntlet/lessons.mjs tools/gauntlet/lessons.test.mjs
git commit -m "feat(gauntlet): lessons store (load/add/dedupe/cap/render) + tests"
```

---

## Task 2: Seed lessons.json + creator prompt absorbs lessons

**Files:** Create `tools/gauntlet/lessons.json`; Modify `tools/gauntlet/prompts.mjs`; Create `tools/gauntlet/prompts.test.mjs`

- [ ] **Step 1: Create the empty store** — `tools/gauntlet/lessons.json`:

```json
{
  "lessons": []
}
```

- [ ] **Step 2: Write the failing test** — create `tools/gauntlet/prompts.test.mjs`:

```js
#!/usr/bin/env node
// Smoke tests: prompt builders embed the right fields. Run: node tools/gauntlet/prompts.test.mjs
import { buildCreatorPrompt, buildPanelCoachPrompt, buildHeadCoachPrompt, buildLessonExtractorPrompt, PANEL_LENSES } from "./prompts.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const node = { id: "u11.decision-making", ageId: "U11", conceptId: "decision-making", depth: "D" };
const concept = { name: "Decision Making", definition: "Selecting the best option.", readConnection: "Choose the highest-value action." };
const domain = { name: "Hockey Sense" };
const q = { id: "x", type: "mc", nodeId: node.id, sit: "On a 2-on-1 what is the best read?", opts: ["Shoot", "Pass", "Wait", "Skate back"], ok: 1, explain: "Read what the D gives you." };

// creator embeds lessons when provided
{ const { system, prompt } = buildCreatorPrompt({ node, concept, domain, idSeed: "gen_x", lessons: "Lessons learned:\n- Keep stems to one cue." });
  ok("creator system non-empty", typeof system === "string" && system.length > 50);
  ok("creator embeds lessons", (system + prompt).includes("Keep stems to one cue.")); }

// creator without lessons still works
{ const { prompt } = buildCreatorPrompt({ node, concept, domain, idSeed: "gen_y", lessons: "" });
  ok("creator works without lessons", prompt.includes("u11.decision-making")); }

// three panel lenses exist incl. a perfectionist
{ ok("three lenses", Array.isArray(PANEL_LENSES) && PANEL_LENSES.length === 3);
  ok("has perfectionist", PANEL_LENSES.some((l) => l.key === "perfectionist")); }

// panel coach prompt carries the lens and peer critiques in debate rounds
{ const lens = PANEL_LENSES.find((l) => l.key === "perfectionist");
  const { system, prompt } = buildPanelCoachPrompt({ question: q, node, concept, lens, others: [{ key: "tactical", critique: ["the pass lane is contested"] }] });
  ok("panel system describes the lens", system.toLowerCase().includes("perfectionist"));
  ok("panel prompt includes peer critique in debate", prompt.includes("the pass lane is contested")); }

// head coach + extractor build
{ ok("head coach builds", typeof buildHeadCoachPrompt({ question: q, node, concept }).system === "string");
  ok("extractor includes node + critique", buildLessonExtractorPrompt({ question: q, node, critique: ["ambiguous stem"] }).prompt.includes("ambiguous stem")); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Run it, verify it fails**

Run: `node tools/gauntlet/prompts.test.mjs`
Expected: FAIL — `buildPanelCoachPrompt is not exported` (or import error).

- [ ] **Step 4: Extend the creator builder to embed lessons** — in `tools/gauntlet/prompts.mjs`, change `buildCreatorPrompt` to accept `lessons` and inject it. Replace the existing `export function buildCreatorPrompt({ node, concept, domain, idSeed }) {` signature and its `system` assignment:

```js
export function buildCreatorPrompt({ node, concept, domain, idSeed, lessons = "" }) {
  const ageDisplay = AGE_LEVEL[node.ageId];
  const system =
`You are an expert youth-hockey question writer for RinkReads, an app that develops on-ice decision-making.
${BRAND}

You write ONE text multiple-choice question for a specific curriculum target.
${MC_SCHEMA}${lessons ? "\n\n" + lessons : ""}`;
```

(Leave the rest of `buildCreatorPrompt` — the `prompt` body and `return` — unchanged.)

- [ ] **Step 5: Add the three new builders + lenses** — append to `tools/gauntlet/prompts.mjs`:

```js
// The three panel lenses. One is a perfectionist who drives the debate.
export const PANEL_LENSES = [
  { key: "tactical", title: "Tactical / answer-key coach",
    focus: "Is the hockey correct and is the declared correct option genuinely the single best read? Are the distractors actually wrong (not also-correct)?" },
  { key: "pedagogy", title: "Pedagogy / learner coach",
    focus: "Does it teach this node's ONE read cleanly, at the right cognitive load for the age band, in language a kid that age understands?" },
  { key: "perfectionist", title: "Perfectionist adversarial coach",
    focus: "Nitpick everything: wording precision, distractor quality, any ambiguity or 'tell', edge cases. Decide whether this is TRULY EXCELLENT, not merely acceptable. Do not cave on real flaws." },
];

// A panel coach review. `others`, when present (debate rounds), carries peers' critiques.
export function buildPanelCoachPrompt({ question, node, concept, lens, others }) {
  const system =
`You are the ${lens.title} on a RinkReads youth-hockey question panel reviewing one multiple-choice question.
Your lens: ${lens.focus}
The bar is PERFECT, not "good enough" — only PASS a question you would stake your name on shipping to kids.
Return ONLY: {"verdict":"PASS"|"REVISE","critique":["specific, actionable points if REVISE (else empty)"]}`;
  const peer = Array.isArray(others) && others.length
    ? `\n\nThis is a debate round. The other coaches said:\n` +
      others.map((o) => `- [${o.key}] ${(o.critique || []).join("; ") || "PASS"}`).join("\n") +
      `\nHold your position if their points don't resolve a real flaw; concede if they do.`
    : "";
  const prompt =
`Age ${node.ageId}. Concept "${concept.name}" — the read: ${concept.readConnection}
Question:
${JSON.stringify(question, null, 2)}
Correct option index: ${question.ok}${peer}

Judge against your lens at the PERFECT bar. PASS or REVISE.`;
  return { system, prompt };
}

// The Head Coach — stricter than the panel, judges whole-product fit.
export function buildHeadCoachPrompt({ question, node, concept }) {
  const system =
`You are the HEAD COACH for RinkReads, the final development authority. A panel of three coaches has already unanimously approved this question as perfect. Your bar is even higher.
Judge whole-product fit: brand & voice (Game Sense, warm, colorblind-safe), exact fit to the curriculum node, that it stands proudly next to sibling questions, and that it is genuinely worthy of reaching the founder's own review. Anything less than excellent on ALL of these is a kick-back.
Return ONLY: {"verdict":"APPROVE"|"KICK_BACK","notes":["specific reasons if KICK_BACK"]}`;
  const prompt =
`Node ${node.id} (age ${node.ageId}, concept "${concept.name}": ${concept.definition}).
Question:
${JSON.stringify(question, null, 2)}

Approve only if this is excellent on every dimension. Otherwise KICK_BACK with reasons.`;
  return { system, prompt };
}

// Distills a dropped question's failure into 1-2 reusable, node-agnostic rules.
export function buildLessonExtractorPrompt({ question, node, critique }) {
  const system =
`You improve a youth-hockey question generator. A question was DROPPED after failing review. Turn the failure into 1-2 GENERAL, reusable rules a question writer should follow next time (not specific to this exact question). Keep each rule short and imperative.
Return ONLY: {"lessons":["rule 1","rule 2"]}`;
  const prompt =
`Age ${node.ageId}, concept "${node.conceptId}".
Question that failed:
${JSON.stringify(question, null, 2)}
Why it failed: ${(critique || []).join("; ")}

Give 1-2 general rules to prevent this class of failure.`;
  return { system, prompt };
}
```

- [ ] **Step 6: Run the prompts test, verify pass**

Run: `node tools/gauntlet/prompts.test.mjs`
Expected: PASS, `0 failed`.

- [ ] **Step 7: Commit**

```bash
git add tools/gauntlet/lessons.json tools/gauntlet/prompts.mjs tools/gauntlet/prompts.test.mjs
git commit -m "feat(gauntlet): panel/head-coach/lesson-extractor prompts; creator absorbs lessons"
```

---

## Task 3: Orchestrate panel debate + head coach + drop-learn

**Files:** Modify `tools/gauntlet-run.mjs`

This rewires `generateOne` and adds helpers. The full new versions are below.

- [ ] **Step 1: Update imports** — replace the prompts/lessons import lines near the top of `tools/gauntlet-run.mjs`:

```js
import { buildCreatorPrompt, buildPanelCoachPrompt, buildHeadCoachPrompt, buildLessonExtractorPrompt, PANEL_LENSES, AGE_LEVEL } from "./gauntlet/prompts.mjs";
import { loadLessons, addLesson, renderLessons } from "./gauntlet/lessons.mjs";
import { appendFileSync } from "node:fs";
```

Add `lessons: resolve(root, "tools/gauntlet/lessons.json")` to the `paths` object.

- [ ] **Step 2: Add flags** — in `parseArgs`, add to the defaults object: `fast: false, debateRounds: 2,` and in the loop:

```js
    else if (t === "--fast") a.fast = true;
    else if (t === "--debate-rounds") a.debateRounds = parseInt(argv[++i], 10);
    else if (t === "--mock-fail") a.mockFail = true;
```

- [ ] **Step 3: Add the panel, head-coach, and drop-learn helpers** — add these functions to `tools/gauntlet-run.mjs` (above `generateOne`):

```js
// Run the 3-coach panel, debating to unanimous PASS. Returns { ok, critiques }.
async function runPanel(q, node, concept, opts) {
  let reviews = null;
  for (let round = 1; round <= opts.debateRounds; round++) {
    const others = round === 1 ? null : reviews;
    reviews = [];
    for (const lens of PANEL_LENSES) {
      if (opts.mock) {
        // Perfectionist fails forever under --mock-fail to exercise drop+learn.
        const verdict = (opts.mockFail && lens.key === "perfectionist") ? "REVISE" : "PASS";
        reviews.push({ key: lens.key, verdict, critique: verdict === "REVISE" ? ["[mock] not perfect"] : [] });
      } else {
        const peers = others ? others.filter((o) => o.key !== lens.key) : null;
        let r;
        try { r = await runAgent({ ...buildPanelCoachPrompt({ question: q, node, concept, lens, others: peers }), model: opts.model }); }
        catch (e) { r = { verdict: "REVISE", critique: [`${lens.key} error: ${e.message}`] }; }
        reviews.push({ key: lens.key, verdict: r.verdict, critique: r.critique || [] });
      }
    }
    if (reviews.every((r) => r.verdict === "PASS")) return { ok: true, critiques: [] };
  }
  return { ok: false, critiques: reviews.filter((r) => r.verdict !== "PASS").flatMap((r) => r.critique) };
}

// The Head Coach gate. Returns { ok, notes }.
async function runHeadCoach(q, node, concept, opts) {
  if (opts.mock) return opts.mockFail ? { ok: false, notes: ["[mock] head coach kickback"] } : { ok: true, notes: [] };
  let r;
  try { r = await runAgent({ ...buildHeadCoachPrompt({ question: q, node, concept }), model: opts.model }); }
  catch (e) { return { ok: false, notes: [`head coach error: ${e.message}`] }; }
  return { ok: r.verdict === "APPROVE", notes: r.notes || [] };
}

// Drop a failed question: log it and distill a lesson for next time.
async function dropAndLearn(q, node, concept, critique, opts) {
  try { appendFileSync(paths.log, JSON.stringify({ ts: new Date().toISOString(), by: "gauntlet", action: "drop", nodeId: node.id, critique }) + "\n"); } catch {}
  let lessons = [];
  if (opts.mock) lessons = [`For ${node.ageId} ${node.conceptId}, avoid the issue: ${(critique[0] || "unclear").slice(0, 60)}`];
  else {
    try { const r = await runAgent({ ...buildLessonExtractorPrompt({ question: q, node, critique }), model: opts.model }); lessons = Array.isArray(r.lessons) ? r.lessons : []; }
    catch {}
  }
  for (const l of lessons) addLesson(paths.lessons, l);
  return lessons;
}
```

- [ ] **Step 4: Rewrite `generateOne`** — replace the entire existing `generateOne` function with:

```js
async function generateOne(ledger, node, opts, seen) {
  const concept = conceptById(ledger, node.conceptId);
  const domain = domainById(ledger, concept.domainId);
  const idSeed = `gen_${node.id.replace(/\./g, "_")}_${rand()}`;
  const lessons = renderLessons(loadLessons(paths.lessons));
  let notes = [];

  for (let round = 1; round <= opts.rounds; round++) {
    // G0 create (with accumulated lessons + this run's rework notes)
    let q;
    try {
      if (opts.mock) q = mockCreate(node, concept, domain, idSeed);
      else {
        const { system, prompt } = buildCreatorPrompt({ node, concept, domain, idSeed, lessons });
        const extra = notes.length ? `\n\nThe previous attempt was sent back. Fix these: ${notes.join("; ")}` : "";
        q = await runAgent({ system, prompt: prompt + extra, model: opts.model });
      }
    } catch (e) { notes = [`creator error: ${e.message}`]; continue; }
    q = shuffleOpts(repair(q, node, domain, idSeed));

    // G1-G3 deterministic
    const v = validateMC(q, { seen });
    if (!v.ok) { notes = v.errs; continue; }

    // G4 curriculum confirmer
    let cur = { verdict: "PASS", notes: [] };
    if (!opts.mock) {
      try { cur = await runAgent({ ...buildCurriculumPrompt({ question: q, node, concept }), model: opts.model }); }
      catch (e) { cur = { verdict: "REVISE", notes: [`curriculum error: ${e.message}`] }; }
    }
    if (cur.verdict !== "PASS") { notes = cur.notes || ["curriculum revise"]; continue; }

    // Coach gate: --fast = single tactical coach (v1); default = panel + head coach.
    let coachConfidence = undefined;
    if (opts.fast) {
      let coach = { verdict: "PASS", confidence: 1, notes: [] };
      if (!opts.mock) {
        try { coach = await runAgent({ ...buildPanelCoachPrompt({ question: q, node, concept, lens: PANEL_LENSES[0], others: null }), model: opts.model }); }
        catch (e) { coach = { verdict: "REVISE", critique: [`coach error: ${e.message}`] }; }
      }
      if (coach.verdict !== "PASS") { notes = coach.critique || coach.notes || ["coach revise"]; continue; }
    } else {
      const panel = await runPanel(q, node, concept, opts);
      if (!panel.ok) { notes = panel.critiques.length ? panel.critiques : ["panel not unanimous"]; continue; }
      const head = await runHeadCoach(q, node, concept, opts);
      if (!head.ok) { notes = head.notes.length ? head.notes : ["head coach kickback"]; continue; }
    }

    // Passed everything → queue item
    const item = {
      question: q,
      gateHistory: { creator: "pass", curriculum: "pass", panel: opts.fast ? "fast-single" : "unanimous", headCoach: opts.fast ? "skipped" : "approve", round },
      proxyVerdict: {
        decision: "forward", scores: typeof coachConfidence === "number" ? { coachConfidence } : {},
        rationale: "Cleared the gauntlet (creator + curriculum + " + (opts.fast ? "single coach" : "perfectionist panel + Head Coach") + "). Founder-proxy gate (G9) not built yet — review directly.",
      },
      queuedAt: new Date().toISOString().slice(0, 10),
    };
    return { ok: true, item, hash: structuralHash(q) };
  }

  // Rework cap reached → drop + learn (only meaningful for the full pipeline)
  const learned = await dropAndLearn({ id: idSeed, nodeId: node.id }, node, concept, notes, opts);
  return { ok: false, dropped: true, reason: `failed after ${opts.rounds} rounds: ${notes.join("; ")}`, learned };
}
```

- [ ] **Step 5: Surface drops in the run summary** — in `main`, replace the skip line and final summary:

Find:
```js
      if (!r.ok) { console.log(`skip (${r.reason})`); skipped++; continue; }
```
Replace with:
```js
      if (!r.ok) { console.log(`dropped (${r.reason})${r.learned?.length ? ` — learned: ${r.learned.join(" | ")}` : ""}`); skipped++; continue; }
```

- [ ] **Step 6: Mock run — happy path**

Run: `node tools/gauntlet-run.mjs --node u11.decision-making --mock`
Expected: `queued gen_u11_decision-making_…`; `gateHistory.panel === "unanimous"` (inspect `src/data/review-queue.json`).

- [ ] **Step 7: Mock run — forced failure exercises drop+learn**

Run: `node tools/gauntlet-run.mjs --node u15.scanning --mock --mock-fail`
Expected: console shows `dropped (... ) — learned: …`; `tools/gauntlet/lessons.json` now has ≥1 lesson; a `"action":"drop"` line appended to `src/data/review-log.jsonl`.

- [ ] **Step 8: Restore test-mutated data + commit**

```bash
git checkout -- src/data/review-queue.json src/data/review-log.jsonl tools/gauntlet/lessons.json
git add tools/gauntlet-run.mjs
git commit -m "feat(gauntlet): perfectionist panel debate + head coach + drop-learn loop"
```

---

## Task 4: Verify end-to-end + no regressions

**Files:** none (verification only)

- [ ] **Step 1: All unit tests green**

Run each; expect `0 failed`:
```bash
node tools/gauntlet/lessons.test.mjs
node tools/gauntlet/prompts.test.mjs
node tools/gauntlet/validate-mc.test.mjs
node tools/gauntlet/select-targets.test.mjs
node tools/review-store.test.mjs
```

- [ ] **Step 2: Ledger + build unaffected**

Run: `npm run test:ledger` → `VALID`; `npm run build` → succeeds.

- [ ] **Step 3: Live smoke — full pipeline (1 real question)**

Run: `node tools/gauntlet-run.mjs --node u9.passing --count 1`
Expected: console shows the run completing; a real question lands in `src/data/review-queue.json` with `gateHistory.panel === "unanimous"` and `headCoach === "approve"`. (Costs ~nothing on Max; slower than v1 due to the extra agents.)

- [ ] **Step 4: Restore the curated sample queue**

```bash
git checkout -- src/data/review-queue.json src/data/review-log.jsonl tools/gauntlet/lessons.json
```

- [ ] **Step 5: Final commit (if Step 3 required any fix)** — otherwise nothing to commit.

---

## Self-Review

- **Spec coverage:** default full pipeline (Task 3 `generateOne`, `--fast` opt-out) ✓; 3-coach panel w/ perfectionist (`PANEL_LENSES`, `runPanel`) ✓; debate rounds (`runPanel` loop + peer critiques, `--debate-rounds`) ✓; unanimous-perfect bar (`reviews.every PASS`) ✓; stricter Head Coach (`runHeadCoach`) ✓; rework loop carrying notes (`generateOne` round loop) ✓; drop+learn (`dropAndLearn`, lessons store, creator injection) ✓; mock incl. forced-fail (`--mock-fail`) ✓; testing (lessons + prompts unit tests, mock + live verify) ✓.
- **Placeholder scan:** none — every step shows full code/commands.
- **Type/name consistency:** `loadLessons/addLesson/renderLessons/MAX_LESSONS`, `PANEL_LENSES`, `buildPanelCoachPrompt/buildHeadCoachPrompt/buildLessonExtractorPrompt`, `runPanel/runHeadCoach/dropAndLearn`, `paths.lessons`, flags `--fast/--debate-rounds/--mock-fail` — used identically across tasks. `coachConfidence` is declared then only set in the unused branch (kept for shape parity; harmless).
- **Note:** `buildCurriculumPrompt`, `repair`, `shuffleOpts`, `mockCreate`, `rand`, `structuralHash` already exist in `gauntlet-run.mjs` from v1 and are reused unchanged.
