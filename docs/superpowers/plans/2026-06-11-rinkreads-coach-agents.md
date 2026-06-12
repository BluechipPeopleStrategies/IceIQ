# RinkReads Coach Agents (gauntlet extension) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the existing RinkReads gauntlet coaches on `claude-fable-5`, give them a Head-Coach-gates-the-room solo-first escalation in the live generation gauntlet, and add a retroactive `gauntlet:audit` pass over the ~23 post-wipe seeds.

**Architecture:** Extend `tools/gauntlet`. A new focused module `tools/gauntlet/coach-gate.mjs` holds the solo-first escalation (text + visual) with injected panel/head-coach functions so it is unit-testable without touching `gauntlet-run.mjs`'s side-effecting `main()`. New Head-Coach prompt variants live in the existing `prompts.mjs` / `visual-prompts.mjs`. A new thin CLI `tools/gauntlet-audit.mjs` reuses the visual escalation to score existing seeds KEEP/REVISE/RETIRE and writes a report.

**Tech Stack:** Node ESM (`.mjs`), the `claude` CLI via `tools/lib/claude-agent.mjs`, the existing custom `ok()` test harness (plain `node tools/.../X.test.mjs`, mock mode = no claude calls), the `#review` queue store (`tools/review-store.mjs`).

---

## File Structure

| File | Responsibility | New/Modify |
|------|----------------|------------|
| `tools/gauntlet/prompts.mjs` | Add `buildHeadCoachSoloPrompt` (text, returns decision incl. CONVENE) | Modify |
| `tools/gauntlet/visual-prompts.mjs` | Add `buildVisualHeadCoachSoloPrompt` + `buildAuditHeadCoachPrompt` (KEEP/REVISE/RETIRE) | Modify |
| `tools/gauntlet/coach-gate.mjs` | Solo-first escalation orchestration (text `coachGate`, visual `visualCoachGate`, audit `auditScenario`); panel/head-coach fns injected | **New** |
| `tools/gauntlet/coach-gate.test.mjs` | Unit tests for the above via mock + injected stubs | **New** |
| `tools/gauntlet-run.mjs` | Add `--coach-model` (default `claude-fable-5`) + `--full-panel`; make solo-first the default coach path (text + visual) | Modify |
| `tools/gauntlet-audit.mjs` | Thin CLI: enumerate post-wipe seeds, run `auditScenario`, write report, route REVISE/RETIRE to queue | **New** |
| `tools/gauntlet-audit.test.mjs` | Smoke test of the seed-enumeration + report writer in mock mode | **New** |
| `package.json` | `gauntlet:audit` script | Modify |
| `docs/factory/coach-runs/` | Report output dir (created at runtime; add `.gitkeep`) | **New** |

---

## Phase 0 — Verify the Fable 5 CLI model id (spike)

### Task 1: Confirm which model string the `claude` CLI accepts for Fable 5

**Files:** none (investigation only).

- [ ] **Step 1: Try the full id**

Run (PowerShell):
```
echo '{"ping":1}' | claude --print --model claude-fable-5 --output-format json -p "Reply with the JSON {\"ok\":true} and nothing else."
```
Expected: a JSON envelope with a `result`. If it errors with an unknown-model message, continue to Step 2.

- [ ] **Step 2: Try the short alias if the full id failed**

Run:
```
echo '{"ping":1}' | claude --print --model fable --output-format json -p "Reply with the JSON {\"ok\":true} and nothing else."
```

- [ ] **Step 3: Record the working string**

Whichever of `claude-fable-5` / `fable` succeeded is the value used as `COACH_MODEL_DEFAULT` everywhere below. If BOTH fail, stop and report to Thomas (Fable 5 may not be enabled on this CLI/plan); do not silently fall back to sonnet. The rest of the plan assumes the working string is `claude-fable-5` — substitute the confirmed string if it differs.

- [ ] **Step 4: No commit** (investigation only).

---

## Phase 1 — Fable 5 wiring

### Task 2: Add `--coach-model` and thread it through the coach calls

**Files:**
- Modify: `tools/gauntlet-run.mjs` (args + the four coach call sites)

- [ ] **Step 1: Add the arg + default**

In `parseArgs` (the `a = {...}` literal near line 45) add `coachModel: "claude-fable-5"`, and in the flag loop add:
```js
    else if (t === "--coach-model") a.coachModel = argv[++i];
    else if (t === "--full-panel") a.fullPanel = true;
```
Also add `fullPanel: false` to the `a = {...}` defaults.

- [ ] **Step 2: Use `coachModel` in the existing coach/head-coach calls**

In `runPanel` change `model: opts.model` → `model: opts.coachModel`.
In `runHeadCoach` change `model: opts.model` → `model: opts.coachModel`.
In `runScenarioPanel` change `model: opts.model` → `model: opts.coachModel`.
In `runVisualHeadCoach` change `model: opts.model` → `model: opts.coachModel`.
(Leave creator, curriculum, lesson-extractor, and consolidation on `opts.model`.)

- [ ] **Step 3: Verify nothing else broke (mock run, no claude calls)**

Run:
```
node tools/gauntlet-run.mjs --node u11.decision-making --mock --dry-run
```
Expected: prints `ok (dry-run)  u11.decision-making` (or a `dropped` line under `--mock-fail`), exits 0. Mock mode never calls claude, so the model strings are not exercised here — this only confirms the arg plumbing didn't throw.

- [ ] **Step 4: Commit**
```
git add tools/gauntlet-run.mjs
git commit -m "feat(gauntlet): --coach-model (default claude-fable-5) for coach calls"
```

---

## Phase 2 — Solo-first Head Coach prompts

### Task 3: Add the text solo Head-Coach prompt

**Files:**
- Modify: `tools/gauntlet/prompts.mjs` (append after `buildHeadCoachPrompt`)
- Test: `tools/gauntlet/prompts.test.mjs` (append; create if missing)

- [ ] **Step 1: Write the failing test**

Append to `tools/gauntlet/prompts.test.mjs` (if the file does not exist, create it with the harness preamble shown in Task 6 Step 1):
```js
import { buildHeadCoachSoloPrompt } from "./prompts.mjs";
{
  const node = { id: "u11.decision-making", ageId: "u11" };
  const concept = { name: "Decision Making", definition: "choose the best option", readConnection: "read the ice" };
  const q = { id: "x", type: "mc", sit: "s", opts: ["a","b"], ok: 0, explain: "e" };
  const { system, prompt } = buildHeadCoachSoloPrompt({ question: q, node, concept });
  ok("solo prompt mentions CONVENE", /CONVENE/.test(system));
  ok("solo prompt asks for the three verbs", /APPROVE/.test(system) && /KICK_BACK/.test(system));
  ok("solo prompt includes the question json", prompt.includes("\"id\": \"x\""));
}
```

- [ ] **Step 2: Run it, verify failure**

Run: `node tools/gauntlet/prompts.test.mjs`
Expected: FAIL (`buildHeadCoachSoloPrompt` is not exported).

- [ ] **Step 3: Implement the prompt builder**

Append to `tools/gauntlet/prompts.mjs`:
```js
// Solo-first Head Coach: reviews BEFORE any panel is convened. She decides
// whether she can rule alone (APPROVE / KICK_BACK) or wants specialist eyes
// (CONVENE). This is the "Head Coach gates the room" entry point.
export function buildHeadCoachSoloPrompt({ question, node, concept }) {
  const system =
`You are the HEAD COACH for RinkReads, the final development authority, reviewing one
multiple-choice question ALONE, before deciding whether to convene your specialist panel.
You are an expert across all ages and all concepts. Use your judgment — do not fill out a rubric.
- If the question is clearly excellent and you would stake your name on it, verdict APPROVE.
- If it is clearly flawed beyond a quick fix, verdict KICK_BACK with the reasons.
- If it is a genuine judgment call where a tactical and a pedagogy coach would sharpen the
  decision, verdict CONVENE (do not guess — pull the room in).
Set confidence 0..1 for how sure you are.
Return ONLY: {"verdict":"APPROVE"|"CONVENE"|"KICK_BACK","confidence":0.0,"notes":["short reasons"]}`;
  const prompt =
`Node ${node.id} (age ${node.ageId}, concept "${concept.name}": ${concept.definition}).
The read: ${concept.readConnection || concept.definition}
Question:
${JSON.stringify(question, null, 2)}
Correct option index: ${question.ok}

Rule alone if you can; convene if it is a real judgment call.`;
  return { system, prompt };
}
```

- [ ] **Step 4: Run it, verify pass**

Run: `node tools/gauntlet/prompts.test.mjs`
Expected: PASS (3 new assertions).

- [ ] **Step 5: Commit**
```
git add tools/gauntlet/prompts.mjs tools/gauntlet/prompts.test.mjs
git commit -m "feat(gauntlet): buildHeadCoachSoloPrompt (solo-first Head Coach, text)"
```

### Task 4: Add the visual solo Head-Coach prompt and the audit verdict prompt

**Files:**
- Modify: `tools/gauntlet/visual-prompts.mjs` (append after `buildVisualHeadCoachPrompt`)
- Test: `tools/gauntlet/visual-prompts.test.mjs` (append; create with harness if missing)

- [ ] **Step 1: Write the failing test**

Append to `tools/gauntlet/visual-prompts.test.mjs`:
```js
import { buildVisualHeadCoachSoloPrompt, buildAuditHeadCoachPrompt } from "./visual-prompts.mjs";
{
  const node = { id: "u13.odd-man-reads", ageId: "u13" };
  const concept = { name: "Odd-Man Reads", definition: "attack the soft spot" };
  const scenario = { id: "s1", type: "scenario", actors: [] };
  const ascii = "RINK\n...";
  const solo = buildVisualHeadCoachSoloPrompt({ scenario, ascii, node, concept });
  ok("visual solo mentions CONVENE", /CONVENE/.test(solo.system));
  ok("visual solo includes ascii board", solo.prompt.includes("RINK"));

  const audit = buildAuditHeadCoachPrompt({ scenario, ascii, node, concept });
  ok("audit verbs are KEEP/REVISE/RETIRE", /KEEP/.test(audit.system) && /REVISE/.test(audit.system) && /RETIRE/.test(audit.system));
  ok("audit allows CONVENE", /CONVENE/.test(audit.system));
}
```

- [ ] **Step 2: Run it, verify failure**

Run: `node tools/gauntlet/visual-prompts.test.mjs`
Expected: FAIL (functions not exported).

- [ ] **Step 3: Implement both builders**

Append to `tools/gauntlet/visual-prompts.mjs`:
```js
// Solo-first Head Coach for DRAWN questions. Same gate-the-room idea as the text
// version, but she reasons from the scenario JSON + the ascii board.
export function buildVisualHeadCoachSoloPrompt({ scenario, ascii, node, concept }) {
  const system =
`You are the HEAD COACH for RinkReads reviewing one DRAWN (geometry) question ALONE, before
deciding whether to convene your hockey + visual panels. Judge with your own eyes, not a rubric.
- Clearly excellent (read is right AND the picture shows it, age-appropriate): APPROVE.
- Clearly flawed beyond a quick fix: KICK_BACK with reasons.
- A genuine judgment call where the read panel or the geometry panel would sharpen it: CONVENE.
Set confidence 0..1.
Return ONLY: {"verdict":"APPROVE"|"CONVENE"|"KICK_BACK","confidence":0.0,"notes":["short reasons"]}`;
  const prompt =
`Node ${node.id} (age ${node.ageId}, concept "${concept.name}": ${concept.definition}).
Board (how a player sees it):
${ascii}
Scenario JSON:
${JSON.stringify(scenario, null, 2)}

Rule alone if you can; convene if it is a real judgment call.`;
  return { system, prompt };
}

// AUDIT verdict for already-shipped seeds. Assessment verbs, not ship verbs.
export function buildAuditHeadCoachPrompt({ scenario, ascii, node, concept }) {
  const system =
`You are the HEAD COACH for RinkReads auditing a question that ALREADY SHIPPED. Decide its fate
with your professional judgment:
- KEEP: sound as-is, stands proudly beside its siblings.
- REVISE: fixable — say exactly what (wording, a distractor, a wrong/absent label, age-fit, a
  geometry/positioning problem).
- RETIRE: not salvageable for this band.
- CONVENE: a genuine judgment call you want the hockey + visual panels on before you rule.
Set confidence 0..1.
Return ONLY: {"verdict":"KEEP"|"REVISE"|"RETIRE"|"CONVENE","confidence":0.0,"notes":["short, specific"]}`;
  const prompt =
`Node ${node.id} (age ${node.ageId}, concept "${concept?.name || node.conceptId}": ${concept?.definition || ""}).
Board:
${ascii}
Scenario JSON:
${JSON.stringify(scenario, null, 2)}

Assess it. KEEP / REVISE / RETIRE, or CONVENE if it is a real judgment call.`;
  return { system, prompt };
}
```

- [ ] **Step 4: Run it, verify pass**

Run: `node tools/gauntlet/visual-prompts.test.mjs`
Expected: PASS (4 new assertions).

- [ ] **Step 5: Commit**
```
git add tools/gauntlet/visual-prompts.mjs tools/gauntlet/visual-prompts.test.mjs
git commit -m "feat(gauntlet): visual solo Head-Coach + audit (KEEP/REVISE/RETIRE) prompts"
```

---

## Phase 3 — The escalation module

### Task 5: Create `coach-gate.mjs` with the text escalation

**Files:**
- Create: `tools/gauntlet/coach-gate.mjs`
- Create: `tools/gauntlet/coach-gate.test.mjs`

The module uses dependency injection: callers pass `runPanel` and `runHeadCoach` (the existing functions in `gauntlet-run.mjs`) so this module never imports the side-effecting runner. The solo call goes through `runAgent` directly, with a mock branch matching the rest of the gauntlet (`opts.mock`, plus `opts.mockSolo` to drive the branch in tests).

- [ ] **Step 1: Write the failing test**

Create `tools/gauntlet/coach-gate.test.mjs`:
```js
#!/usr/bin/env node
// Run: node tools/gauntlet/coach-gate.test.mjs
import { coachGate } from "./coach-gate.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const node = { id: "u11.x", ageId: "u11", conceptId: "x" };
const concept = { name: "X", definition: "d", readConnection: "r" };
const q = { id: "q1", ok: 0 };

// stubs record whether they were called
const mkPanel = (okv) => { let called = false; const fn = async () => { called = true; return { ok: okv, critiques: okv ? [] : ["nope"] }; }; fn.was = () => called; return fn; };
const mkHead = (okv) => async () => ({ ok: okv, notes: okv ? [] : ["kick"] });

await (async () => {
  // APPROVE solo -> ok, panel NOT convened
  const panel = mkPanel(true);
  const r1 = await coachGate({ question: q, node, concept, opts: { mock: true, mockSolo: "APPROVE" }, runPanel: panel, runHeadCoach: mkHead(true) });
  ok("solo APPROVE -> ok", r1.ok === true);
  ok("solo APPROVE -> not convened", r1.convened === false);
  ok("solo APPROVE -> panel untouched", panel.was() === false);

  // KICK_BACK solo -> not ok, panel NOT convened
  const panel2 = mkPanel(true);
  const r2 = await coachGate({ question: q, node, concept, opts: { mock: true, mockSolo: "KICK_BACK" }, runPanel: panel2, runHeadCoach: mkHead(true) });
  ok("solo KICK_BACK -> not ok", r2.ok === false);
  ok("solo KICK_BACK -> panel untouched", panel2.was() === false);

  // CONVENE solo + panel passes + head approves -> ok, convened
  const panel3 = mkPanel(true);
  const r3 = await coachGate({ question: q, node, concept, opts: { mock: true, mockSolo: "CONVENE" }, runPanel: panel3, runHeadCoach: mkHead(true) });
  ok("CONVENE + pass -> ok", r3.ok === true);
  ok("CONVENE -> convened true", r3.convened === true);
  ok("CONVENE -> panel was run", panel3.was() === true);

  // CONVENE + panel fails -> not ok
  const r4 = await coachGate({ question: q, node, concept, opts: { mock: true, mockSolo: "CONVENE" }, runPanel: mkPanel(false), runHeadCoach: mkHead(true) });
  ok("CONVENE + panel fail -> not ok", r4.ok === false);
})();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it, verify failure**

Run: `node tools/gauntlet/coach-gate.test.mjs`
Expected: FAIL (`coach-gate.mjs` does not exist).

- [ ] **Step 3: Implement `coach-gate.mjs` (text half)**

Create `tools/gauntlet/coach-gate.mjs`:
```js
// Head-Coach-gates-the-room escalation, extracted as a pure, injectable unit so
// it is testable without gauntlet-run.mjs's side-effecting main(). The caller
// injects the existing panel + reconcile-head-coach functions.
import { runAgent } from "../lib/claude-agent.mjs";
import { buildHeadCoachSoloPrompt } from "./prompts.mjs";
import { buildVisualHeadCoachSoloPrompt, buildAuditHeadCoachPrompt } from "./visual-prompts.mjs";

// Solo Head Coach (text). Returns { verdict, confidence, notes }.
async function headCoachSolo({ question, node, concept, opts }) {
  if (opts.mock) {
    const v = opts.mockSolo || "APPROVE";
    return { verdict: v, confidence: 1, notes: v === "KICK_BACK" ? ["[mock] solo kick"] : [] };
  }
  try {
    const r = await runAgent({ ...buildHeadCoachSoloPrompt({ question, node, concept }), model: opts.coachModel });
    return { verdict: r.verdict, confidence: r.confidence ?? null, notes: r.notes || [] };
  } catch (e) { return { verdict: "CONVENE", confidence: 0, notes: [`solo error: ${e.message}`] }; }
}

// Text escalation: solo first; convene the injected panel only on CONVENE.
// Returns { ok, convened, confidence, notes }.
export async function coachGate({ question, node, concept, opts, runPanel, runHeadCoach }) {
  const solo = await headCoachSolo({ question, node, concept, opts });
  if (solo.verdict === "APPROVE") return { ok: true, convened: false, confidence: solo.confidence, notes: [] };
  if (solo.verdict === "KICK_BACK") return { ok: false, convened: false, confidence: solo.confidence, notes: solo.notes.length ? solo.notes : ["head coach kickback"] };
  // CONVENE
  const panel = await runPanel(question, node, concept, opts);
  if (!panel.ok) return { ok: false, convened: true, confidence: solo.confidence, notes: panel.critiques.length ? panel.critiques : ["panel not unanimous"] };
  const head = await runHeadCoach(question, node, concept, opts);
  if (!head.ok) return { ok: false, convened: true, confidence: solo.confidence, notes: head.notes.length ? head.notes : ["head coach kickback"] };
  return { ok: true, convened: true, confidence: solo.confidence, notes: [] };
}
```

- [ ] **Step 4: Run it, verify pass**

Run: `node tools/gauntlet/coach-gate.test.mjs`
Expected: PASS (all assertions, `0 failed`).

- [ ] **Step 5: Commit**
```
git add tools/gauntlet/coach-gate.mjs tools/gauntlet/coach-gate.test.mjs
git commit -m "feat(gauntlet): coach-gate.mjs — text Head-Coach-gates escalation"
```

### Task 6: Add the visual escalation + audit scorer to `coach-gate.mjs`

**Files:**
- Modify: `tools/gauntlet/coach-gate.mjs`
- Modify: `tools/gauntlet/coach-gate.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tools/gauntlet/coach-gate.test.mjs` (before the final `console.log` summary; move the summary to the end):
```js
import { visualCoachGate, auditScenario } from "./coach-gate.mjs";
await (async () => {
  const scenario = { id: "s1", type: "scenario", actors: [] };
  const ascii = "RINK";
  const mkP = (okv) => { let c = false; const fn = async () => { c = true; return { ok: okv, critiques: okv ? [] : ["x"] }; }; fn.was = () => c; return fn; };
  const mkH = (okv) => async () => ({ ok: okv, notes: [] });

  // visual APPROVE -> panels untouched
  const hp = mkP(true), vp = mkP(true);
  const rv = await visualCoachGate({ scenario, ascii, node, concept, opts: { mock: true, mockSolo: "APPROVE" }, runHockeyPanel: hp, runVisualPanel: vp, runVisualHeadCoach: mkH(true) });
  ok("visual APPROVE -> ok", rv.ok === true);
  ok("visual APPROVE -> hockey panel untouched", hp.was() === false);

  // audit returns the verdict verb straight through (mock)
  const a1 = await auditScenario({ scenario, ascii, node, concept, opts: { mock: true, mockAudit: "REVISE" }, runHockeyPanel: mkP(true), runVisualPanel: mkP(true), runVisualHeadCoach: mkH(true) });
  ok("audit REVISE passthrough", a1.verdict === "REVISE");
  // audit CONVENE in mock resolves to KEEP when panels pass
  const a2 = await auditScenario({ scenario, ascii, node, concept, opts: { mock: true, mockAudit: "CONVENE" }, runHockeyPanel: mkP(true), runVisualPanel: mkP(true), runVisualHeadCoach: mkH(true) });
  ok("audit CONVENE+pass -> KEEP", a2.verdict === "KEEP");
})();
```

- [ ] **Step 2: Run it, verify failure**

Run: `node tools/gauntlet/coach-gate.test.mjs`
Expected: FAIL (`visualCoachGate` / `auditScenario` not exported).

- [ ] **Step 3: Implement the visual + audit halves**

Append to `tools/gauntlet/coach-gate.mjs`:
```js
// Solo Head Coach (visual). Returns { verdict, confidence, notes }.
async function visualHeadCoachSolo({ scenario, ascii, node, concept, opts }) {
  if (opts.mock) {
    const v = opts.mockSolo || "APPROVE";
    return { verdict: v, confidence: 1, notes: v === "KICK_BACK" ? ["[mock] solo kick"] : [] };
  }
  try {
    const r = await runAgent({ ...buildVisualHeadCoachSoloPrompt({ scenario, ascii, node, concept }), model: opts.coachModel });
    return { verdict: r.verdict, confidence: r.confidence ?? null, notes: r.notes || [] };
  } catch (e) { return { verdict: "CONVENE", confidence: 0, notes: [`solo error: ${e.message}`] }; }
}

// Convene the drawn-question panels (hockey read, then geometry) + reconcile.
// Returns { ok, notes }.
async function conveneVisualPanels({ scenario, node, concept, opts, runHockeyPanel, runVisualPanel, runVisualHeadCoach }) {
  const hockey = await runHockeyPanel(scenario, node, concept, opts);
  if (!hockey.ok) return { ok: false, notes: hockey.critiques.length ? hockey.critiques : ["hockey panel not unanimous"] };
  const visual = await runVisualPanel(scenario, node, concept, opts);
  if (!visual.ok) return { ok: false, notes: visual.critiques.length ? visual.critiques : ["visual panel not unanimous"] };
  const head = await runVisualHeadCoach(scenario, node, concept, opts);
  if (!head.ok) return { ok: false, notes: head.notes.length ? head.notes : ["head coach kickback"] };
  return { ok: true, notes: [] };
}

// Visual generation escalation: solo first, convene only on CONVENE.
export async function visualCoachGate({ scenario, ascii, node, concept, opts, runHockeyPanel, runVisualPanel, runVisualHeadCoach }) {
  const solo = await visualHeadCoachSolo({ scenario, ascii, node, concept, opts });
  if (solo.verdict === "APPROVE") return { ok: true, convened: false, confidence: solo.confidence, notes: [] };
  if (solo.verdict === "KICK_BACK") return { ok: false, convened: false, confidence: solo.confidence, notes: solo.notes.length ? solo.notes : ["head coach kickback"] };
  const r = await conveneVisualPanels({ scenario, node, concept, opts, runHockeyPanel, runVisualPanel, runVisualHeadCoach });
  return { ok: r.ok, convened: true, confidence: solo.confidence, notes: r.notes };
}

// Retroactive audit of an existing scenario. Returns { verdict: KEEP|REVISE|RETIRE,
// confidence, notes, convened }. On CONVENE she pulls the panels in; if they hold
// the question it resolves to KEEP, otherwise REVISE (with the panel notes).
export async function auditScenario({ scenario, ascii, node, concept, opts, runHockeyPanel, runVisualPanel, runVisualHeadCoach }) {
  let verdict, confidence, notes;
  if (opts.mock) {
    verdict = opts.mockAudit || "KEEP"; confidence = 1; notes = [];
  } else {
    try {
      const r = await runAgent({ ...buildAuditHeadCoachPrompt({ scenario, ascii, node, concept }), model: opts.coachModel });
      verdict = r.verdict; confidence = r.confidence ?? null; notes = r.notes || [];
    } catch (e) { return { verdict: "REVISE", confidence: 0, notes: [`audit error: ${e.message}`], convened: false }; }
  }
  if (verdict !== "CONVENE") return { verdict, confidence, notes, convened: false };
  const r = await conveneVisualPanels({ scenario, node, concept, opts, runHockeyPanel, runVisualPanel, runVisualHeadCoach });
  return r.ok
    ? { verdict: "KEEP", confidence, notes, convened: true }
    : { verdict: "REVISE", confidence, notes: r.notes, convened: true };
}
```

- [ ] **Step 4: Run it, verify pass**

Run: `node tools/gauntlet/coach-gate.test.mjs`
Expected: PASS (`0 failed`).

- [ ] **Step 5: Commit**
```
git add tools/gauntlet/coach-gate.mjs tools/gauntlet/coach-gate.test.mjs
git commit -m "feat(gauntlet): visual escalation + audit scorer in coach-gate"
```

---

## Phase 4 — Wire solo-first into the live gauntlet

### Task 7: Make solo-first the default coach path in `gauntlet-run.mjs`

**Files:**
- Modify: `tools/gauntlet-run.mjs` (import coach-gate; swap the default coach path in `generateOne` and `generateVisualOne`)

- [ ] **Step 1: Import the escalation**

After the existing imports (near line 29) add:
```js
import { coachGate, visualCoachGate } from "./gauntlet/coach-gate.mjs";
```

- [ ] **Step 2: Swap the text coach path in `generateOne`**

Replace the `else` block of the coach gate (currently the `else { const panel = await runPanel(...) ... }` at lines ~213-218) with:
```js
    } else if (opts.fullPanel) {
      // legacy always-panel path (kept for A/B), behind --full-panel
      const panel = await runPanel(q, node, concept, opts);
      if (!panel.ok) { notes = panel.critiques.length ? panel.critiques : ["panel not unanimous"]; continue; }
      const head = await runHeadCoach(q, node, concept, opts);
      if (!head.ok) { notes = head.notes.length ? head.notes : ["head coach kickback"]; continue; }
    } else {
      // default: Head Coach gates the room (solo-first, convene only on a judgment call)
      const gate = await coachGate({ question: q, node, concept, opts, runPanel, runHeadCoach });
      if (!gate.ok) { notes = gate.notes; continue; }
    }
```
Then update the `gateHistory` / `proxyVerdict` object (lines ~221-227) so the panel/headCoach fields reflect the path; change `panel: opts.fast ? "fast-single" : "unanimous"` to:
```js
        panel: opts.fast ? "fast-single" : (opts.fullPanel ? "unanimous" : "head-coach-gated"),
        headCoach: opts.fast ? "skipped" : "approve",
```

- [ ] **Step 3: Swap the visual coach path in `generateVisualOne`**

Replace the `if (!opts.fast) { ... }` panel block (lines ~313-323) with:
```js
    if (!opts.fast) {
      if (opts.fullPanel || opts.lite) {
        const hockey = await runScenarioPanel(s, node, concept, opts, { lenses: PANEL_LENSES, makePrompt: buildVisualHockeyCoachPrompt });
        if (!hockey.ok) { notes = hockey.critiques.length ? hockey.critiques : ["hockey panel not unanimous"]; continue; }
        const visualLenses = opts.lite ? VISUAL_LENSES.filter((l) => l.key === "spatial") : VISUAL_LENSES;
        const visual = await runScenarioPanel(s, node, concept, opts, { lenses: visualLenses, makePrompt: buildVisualCoachPrompt });
        if (!visual.ok) { notes = visual.critiques.length ? visual.critiques : ["visual panel not unanimous"]; continue; }
        if (!opts.lite) {
          const head = await runVisualHeadCoach(s, node, concept, opts);
          if (!head.ok) { notes = head.notes.length ? head.notes : ["head coach kickback"]; continue; }
        }
      } else {
        // default: Head Coach gates the room (solo-first)
        const gate = await visualCoachGate({
          scenario: s, ascii: asciiRink(s), node, concept, opts,
          runHockeyPanel: (sc, n, c, o) => runScenarioPanel(sc, n, c, o, { lenses: PANEL_LENSES, makePrompt: buildVisualHockeyCoachPrompt }),
          runVisualPanel: (sc, n, c, o) => runScenarioPanel(sc, n, c, o, { lenses: VISUAL_LENSES, makePrompt: buildVisualCoachPrompt }),
          runVisualHeadCoach,
        });
        if (!gate.ok) { notes = gate.notes; continue; }
      }
    }
```

- [ ] **Step 4: Verify mock runs still pass (both tracks)**

Run:
```
node tools/gauntlet-run.mjs --node u11.decision-making --mock --dry-run
node tools/gauntlet-run.mjs --node u13.odd-man-reads --visual --mock --dry-run
node tools/gauntlet-run.mjs --node u11.decision-making --mock --mock-fail --dry-run
```
Expected: first two print `ok (dry-run) ...`; the third prints a `dropped ...` line. All exit 0. (In mock mode `coachGate` takes the `mockSolo || "APPROVE"` branch, so the default path resolves without panels.)

- [ ] **Step 5: Run the full existing gauntlet test suite to confirm no regressions**

Run:
```
node tools/gauntlet/pool.test.mjs
node tools/gauntlet/validate-mc.test.mjs
node tools/gauntlet/lessons.test.mjs
node tools/gauntlet/rubric.test.mjs
node tools/gauntlet/ascii-rink.test.mjs
node tools/gauntlet/select-targets.test.mjs
node tools/gauntlet/visual-scenario.test.mjs
node tools/gauntlet/prompts.test.mjs
node tools/gauntlet/visual-prompts.test.mjs
node tools/gauntlet/coach-gate.test.mjs
```
Expected: every file ends with `0 failed` (or all `PASS`). If any fail, fix before committing.

- [ ] **Step 6: Commit**
```
git add tools/gauntlet-run.mjs
git commit -m "feat(gauntlet): Head-Coach-gates is the default coach path (--full-panel = legacy)"
```

---

## Phase 5 — The retroactive audit CLI

### Task 8: Build `tools/gauntlet-audit.mjs`

**Files:**
- Create: `tools/gauntlet-audit.mjs`
- Create: `tools/gauntlet-audit.test.mjs`
- Create: `docs/factory/coach-runs/.gitkeep`
- Modify: `package.json` (add `gauntlet:audit`)

The CLI enumerates `src/scenario/seeds/*.json`, builds the node/concept/ascii packet, calls `auditScenario`, writes a grouped markdown report, and routes REVISE/RETIRE seeds to the review queue. The seed-loading + report-rendering are split into pure helpers so the test can exercise them in mock mode without claude.

- [ ] **Step 1: Write the failing test**

Create `tools/gauntlet-audit.test.mjs`:
```js
#!/usr/bin/env node
// Run: node tools/gauntlet-audit.test.mjs
import { loadSeeds, renderReport, verdictToRoute } from "./gauntlet-audit.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const seeds = loadSeeds();
ok("loadSeeds returns the post-wipe seeds (>= 20)", Array.isArray(seeds) && seeds.length >= 20);
ok("each seed has id + nodeId", seeds.every((s) => s.seed.id && s.seed.nodeId));

const rows = [
  { id: "a", level: "U9 / Novice", verdict: "KEEP", confidence: 0.9, notes: [], convened: false },
  { id: "b", level: "U13 / Peewee", verdict: "REVISE", confidence: 0.5, notes: ["fix the label"], convened: true },
];
const md = renderReport(rows, "2026-06-11");
ok("report groups by band", md.includes("U9 / Novice") && md.includes("U13 / Peewee"));
ok("report shows verdicts", md.includes("KEEP") && md.includes("REVISE"));

ok("KEEP does not route", verdictToRoute("KEEP") === false);
ok("REVISE routes", verdictToRoute("REVISE") === true);
ok("RETIRE routes", verdictToRoute("RETIRE") === true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it, verify failure**

Run: `node tools/gauntlet-audit.test.mjs`
Expected: FAIL (`gauntlet-audit.mjs` does not exist).

- [ ] **Step 3: Implement the CLI**

Create `tools/gauntlet-audit.mjs`:
```js
#!/usr/bin/env node
// Retroactive coach audit. Runs the Head-Coach-gates panel over the existing
// post-wipe seeds and assesses each KEEP / REVISE / RETIRE. Writes a grouped
// report to docs/factory/coach-runs/ and routes REVISE/RETIRE to the #review queue.
// It NEVER edits or deletes a seed — it only assesses and queues.
//
// Usage:
//   node tools/gauntlet-audit.mjs                 # all seeds, real coaches (Fable 5)
//   node tools/gauntlet-audit.mjs --mock          # no claude calls (smoke)
//   node tools/gauntlet-audit.mjs --limit 3 --dry-run
//   node tools/gauntlet-audit.mjs --band U13
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLedger, nodeById, conceptById } from "./lib/curriculum-ledger.mjs";
import { asciiRink } from "./gauntlet/ascii-rink.mjs";
import { auditScenario } from "./gauntlet/coach-gate.mjs";
import { runScenarioPanelStandalone } from "./gauntlet/coach-gate.mjs"; // see note below if unused
import { enqueue } from "./review-store.mjs";
import { PANEL_LENSES } from "./gauntlet/prompts.mjs";
import { VISUAL_LENSES, buildVisualHockeyCoachPrompt, buildVisualCoachPrompt, buildVisualHeadCoachPrompt } from "./gauntlet/visual-prompts.mjs";
import { runAgent } from "./lib/claude-agent.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const seedDir = resolve(root, "src/scenario/seeds");
const paths = { queue: resolve(root, "src/data/review-queue.json"), bank: resolve(root, "src/data/bank.json") };

export function loadSeeds() {
  const out = [];
  for (const f of readdirSync(seedDir)) {
    if (!f.endsWith(".json")) continue;
    try { out.push({ file: f, seed: JSON.parse(readFileSync(resolve(seedDir, f), "utf8")) }); } catch {}
  }
  return out;
}

export function verdictToRoute(v) { return v === "REVISE" || v === "RETIRE"; }

export function renderReport(rows, date) {
  const bands = {};
  for (const r of rows) (bands[r.level || "(unknown)"] ||= []).push(r);
  let md = `# Coach Audit — ${date}\n\nRetroactive Head-Coach panel over ${rows.length} post-wipe seed(s). Verbs: KEEP / REVISE / RETIRE.\n`;
  const tally = rows.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] || 0) + 1), m), {});
  md += `\n**Tally:** ` + Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(" · ") + `\n`;
  for (const band of Object.keys(bands).sort()) {
    md += `\n## ${band}\n\n| Seed | Verdict | Conf | Room | Notes |\n|------|---------|------|------|-------|\n`;
    for (const r of bands[band]) {
      md += `| ${r.id} | ${r.verdict} | ${r.confidence ?? "—"} | ${r.convened ? "convened" : "solo"} | ${(r.notes || []).join("; ").replace(/\|/g, "/")} |\n`;
    }
  }
  return md;
}

// Standalone scenario-panel runner (audit has no gauntlet-run in scope). Mirrors
// runScenarioPanel in gauntlet-run.mjs but lives here so the CLI is self-contained.
function makeScenarioPanel(lenses, makePrompt) {
  return async (scenario, node, concept, opts) => {
    const ascii = asciiRink(scenario);
    if (opts.mock) return { ok: true, critiques: [] };
    const reviews = await Promise.all(lenses.map(async (lens) => {
      try { const r = await runAgent({ ...makePrompt({ scenario, ascii, node, concept, lens, others: null }), model: opts.coachModel }); return { verdict: r.verdict, critique: r.critique || [] }; }
      catch (e) { return { verdict: "REVISE", critique: [`${lens.key} error: ${e.message}`] }; }
    }));
    return reviews.every((r) => r.verdict === "PASS") ? { ok: true, critiques: [] } : { ok: false, critiques: reviews.filter((r) => r.verdict !== "PASS").flatMap((r) => r.critique) };
  };
}
async function visualHeadCoachReconcile(scenario, node, concept, opts) {
  if (opts.mock) return { ok: true, notes: [] };
  try { const r = await runAgent({ ...buildVisualHeadCoachPrompt({ scenario, node, concept }), model: opts.coachModel }); return { ok: r.verdict === "APPROVE", notes: r.notes || [] }; }
  catch (e) { return { ok: false, notes: [`head coach error: ${e.message}`] }; }
}

function parseArgs(argv) {
  const a = { mock: false, dryRun: false, limit: Infinity, band: null, coachModel: "claude-fable-5" };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--mock") a.mock = true;
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--limit") a.limit = parseInt(argv[++i], 10);
    else if (t === "--band") a.band = argv[++i];
    else if (t === "--coach-model") a.coachModel = argv[++i];
  }
  return a;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const ledger = loadLedger();
  let seeds = loadSeeds();
  if (opts.band) seeds = seeds.filter((s) => (s.seed.level || "").includes(opts.band));
  if (Number.isFinite(opts.limit)) seeds = seeds.slice(0, opts.limit);
  if (!seeds.length) { console.log("No seeds matched."); return; }

  const runHockeyPanel = makeScenarioPanel(PANEL_LENSES, buildVisualHockeyCoachPrompt);
  const runVisualPanel = makeScenarioPanel(VISUAL_LENSES, buildVisualCoachPrompt);
  const rows = [];
  console.log(`Auditing ${seeds.length} seed(s) on ${opts.coachModel}${opts.mock ? " [mock]" : ""}…\n`);
  for (const { seed } of seeds) {
    const node = nodeById(ledger, seed.nodeId) || { id: seed.nodeId, ageId: (seed.nodeId || "").split(".")[0], conceptId: (seed.nodeId || "").split(".")[1] };
    const concept = (node && node.conceptId && conceptById(ledger, node.conceptId)) || { name: node.conceptId, definition: "" };
    const ascii = asciiRink(seed);
    const r = await auditScenario({ scenario: seed, ascii, node, concept, opts, runHockeyPanel, runVisualPanel, runVisualHeadCoach: visualHeadCoachReconcile });
    rows.push({ id: seed.id, level: seed.level || seed.levels?.[0], verdict: r.verdict, confidence: r.confidence, notes: r.notes, convened: r.convened });
    console.log(`${r.verdict.padEnd(7)} ${seed.id}${r.convened ? " (room)" : ""}`);
    if (!opts.dryRun && verdictToRoute(r.verdict)) {
      const item = { question: seed, audit: { verdict: r.verdict, confidence: r.confidence, notes: r.notes }, queuedAt: new Date().toISOString().slice(0, 10) };
      enqueue(paths, item);
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const outDir = resolve(root, "docs/factory/coach-runs");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, `audit-${date}.md`);
  if (!opts.dryRun) writeFileSync(outFile, renderReport(rows, date), "utf8");
  const routed = rows.filter((r) => verdictToRoute(r.verdict)).length;
  console.log(`\nDone. ${rows.length} assessed; ${routed} routed to #review.${opts.dryRun ? " (dry-run: no writes)" : ` Report: ${outFile}`}`);
}

// Only run main when invoked directly (so the test can import the helpers).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
```

Note: remove the `runScenarioPanelStandalone` import line — it is a leftover; the standalone panel is built locally via `makeScenarioPanel`. (Listed here so the engineer deletes it rather than puzzling over a missing export.)

- [ ] **Step 4: Run the test, verify pass**

Run: `node tools/gauntlet-audit.test.mjs`
Expected: PASS (`0 failed`). If `loadSeeds` count is < 20, check that `src/scenario/seeds/` still holds the post-wipe seeds.

- [ ] **Step 5: Mock smoke run of the whole CLI**

Run:
```
node tools/gauntlet-audit.mjs --mock --dry-run --limit 3
```
Expected: prints three `KEEP ...` lines (mock default verdict is KEEP) and `Done. 3 assessed; 0 routed ... (dry-run: no writes)`, exit 0. No file written, queue untouched.

- [ ] **Step 6: Add the npm script + gitkeep**

In `package.json` `scripts`, add:
```json
    "gauntlet:audit": "node tools/gauntlet-audit.mjs",
```
Create `docs/factory/coach-runs/.gitkeep` (empty file).

- [ ] **Step 7: Commit**
```
git add tools/gauntlet-audit.mjs tools/gauntlet-audit.test.mjs package.json docs/factory/coach-runs/.gitkeep
git commit -m "feat(gauntlet): gauntlet:audit — retroactive KEEP/REVISE/RETIRE pass over seeds"
```

---

## Phase 6 — Live verification on Fable 5

### Task 9: One real audit pass on a tiny slice, then the full ~23

**Files:** none (runtime verification; outputs are reports + queue entries).

- [ ] **Step 1: Two real seeds, dry-run (confirms Fable 5 actually answers)**

Run:
```
node tools/gauntlet-audit.mjs --limit 2 --dry-run
```
Expected: two verdict lines drawn from real `claude-fable-5` calls (not all-KEEP by construction). If you see `audit error: ...` notes, the model string from Phase 0 is wrong or Fable 5 is unavailable — stop and report.

- [ ] **Step 2: Full audit of all post-wipe seeds**

Run:
```
node tools/gauntlet-audit.mjs
```
Expected: ~23 verdict lines; a report at `docs/factory/coach-runs/audit-<today>.md`; REVISE/RETIRE seeds appear in `src/data/review-queue.json`.

- [ ] **Step 3: Sanity-check the report with Thomas**

Open the report. Confirm the bands and verdicts read sensibly and that at least one REVISE note is specific and actionable (not vague). This is the human gate before trusting the panel's judgment at volume.

- [ ] **Step 4: Commit the audit report (data artifact)**
```
git add docs/factory/coach-runs/
git commit -m "chore(gauntlet): first coach audit report over post-wipe seeds"
```
(Do NOT commit `src/data/review-queue.json` here unless Thomas wants the routed items tracked — confirm first.)

---

## Self-Review

**Spec coverage:**
- Fable 5 wiring → Task 1 (verify id), Task 2 (`--coach-model` default `claude-fable-5`). ✓
- Head-Coach-gates escalation (non-deterministic, solo-first) → Tasks 3,5 (text), 4,6 (visual), 7 (wired as default in `gauntlet-run.mjs`, legacy behind `--full-panel`). ✓
- Audit mode over ~23 post-wipe seeds, KEEP/REVISE/RETIRE, report to `docs/factory/coach-runs/`, REVISE/RETIRE → `#review`, never auto-edit → Task 8, verified Task 9. ✓
- Old bank.json + povQuestions excluded → audit only reads `src/scenario/seeds/`. ✓
- Reuse ascii-rink/pool/lessons, no schema changes → Tasks reuse `asciiRink`, `enqueue`; no DB/schema edits. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; the one leftover import is explicitly called out for deletion in Task 8 Step 3. ✓

**Type/name consistency:** `coachGate`/`visualCoachGate`/`auditScenario` signatures match between definition (Tasks 5,6) and call sites (Tasks 7,8). Verdict strings APPROVE/CONVENE/KICK_BACK (gate) and KEEP/REVISE/RETIRE (audit) are used consistently. `opts.coachModel`, `opts.mock`, `opts.mockSolo`, `opts.mockAudit` consistent across module + tests. ✓

**Note on `pool.mjs` (concurrency):** the audit loops seeds serially for simplicity and predictable token spend. If the full run is too slow, a follow-up can wrap the seed loop in `runPool` (already imported pattern in `gauntlet-run.mjs`) — out of scope here.
