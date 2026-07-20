# Coach Auto-Revise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `npm run coach-revise` step that turns open coach REVISE/RETIRE verdicts into live edits — generating a constrained JSON edit, gating it on the hockey validators, applying it to the seed (or archiving on RETIRE), recording it in `feedback_log(source: coach)`, and resetting the board's verdict — with a per-run report and one git commit.

**Architecture:** Pure, node-testable transforms live in a new `tools/lib/auto-revise-core.mjs` (deep-merge apply, the apply/reject decision, the log-row builder, the report renderer). A new `tools/gauntlet/revise-prompt.mjs` builds the LLM prompt. A new `scripts/coach-revise.mjs` does all the I/O (Supabase service-role read/write, seed file read/write/move, `runAgent`, report write, git commit), reusing `loadSeeds`, the curriculum ledger, `asciiRink`, `runAgent`, and `runHockeyValidators`.

**Tech Stack:** Node ESM (`.mjs`), `@supabase/supabase-js` (already a dep), the `claude` CLI via `runAgent`. Tests are plain-node assertion scripts (`scripts/test-*.mjs`, `check(name, cond)` harness), not a framework.

**Spec:** `docs/superpowers/specs/2026-06-13-coach-auto-revise-design.md`

---

## File structure

- **Create** `tools/lib/auto-revise-core.mjs` — pure transforms: `applyEdit`, `decideApply`, `buildReviseLogRow`, `reviseReport`. No Supabase, no fs, no Vite. Mirrors `tools/lib/coach-core.mjs`.
- **Create** `scripts/test-auto-revise.mjs` — golden tests for the pure module + the prompt builder.
- **Create** `tools/gauntlet/revise-prompt.mjs` — `buildRevisePrompt(...)` → `{ system, prompt }` for `runAgent`.
- **Create** `scripts/coach-revise.mjs` — the runnable orchestrator (I/O only).
- **Modify** `package.json` — add `"coach-revise"` and `"test:auto-revise"` scripts.

`loadSeeds` is already exported from `tools/gauntlet-audit.mjs`. `runAgent` (`tools/lib/claude-agent.mjs`), `runHockeyValidators` (`src/scenario/validators.js`), `asciiRink` (`tools/gauntlet/ascii-rink.mjs`), and `loadLedger`/`nodeById`/`conceptById` (`tools/lib/curriculum-ledger.mjs`) are imported as-is.

---

### Task 1: Pure transforms — `auto-revise-core.mjs` (TDD)

**Files:**
- Create: `tools/lib/auto-revise-core.mjs`
- Test: `scripts/test-auto-revise.mjs`

- [ ] **Step 1: Write the failing tests**

Create `scripts/test-auto-revise.mjs` with exactly this content:

```js
// Golden tests for tools/lib/auto-revise-core.mjs (pure logic). Run: npm run test:auto-revise
import { applyEdit, decideApply, buildReviseLogRow, reviseReport } from "../tools/lib/auto-revise-core.mjs";

let failed = 0;
const check = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) failed++; };

// applyEdit: deep-merge, arrays replaced wholesale, no mutation
const base = { id: "x", tip: "old", read: { cue: "c", decoy: { x: 0.1, y: 0.2 } }, actors: [{ id: "a" }, { id: "b" }] };
const edited = applyEdit(base, { tip: "new", read: { decoy: { x: 0.9 } }, actors: [{ id: "z" }] });
check("applyEdit replaces scalar", edited.tip === "new");
check("applyEdit deep-merges nested object", edited.read.cue === "c" && edited.read.decoy.x === 0.9 && edited.read.decoy.y === 0.2);
check("applyEdit replaces array wholesale", edited.actors.length === 1 && edited.actors[0].id === "z");
check("applyEdit preserves untouched top-level", edited.id === "x");
check("applyEdit does not mutate input", base.tip === "old" && base.actors.length === 2 && base.read.decoy.x === 0.1);
check("applyEdit empty edit is no-op clone", JSON.stringify(applyEdit(base, {})) === JSON.stringify(base));
check("applyEdit null edit returns scenario", applyEdit(base, null) === base);

// decideApply: errs -> reject; warns only -> apply-marked; clean -> apply
check("decideApply reject on errors", decideApply({ errs: ["bad"], warns: [] }) === "reject");
check("decideApply apply-marked on warnings", decideApply({ errs: [], warns: ["meh"] }) === "apply-marked");
check("decideApply apply when clean", decideApply({ errs: [], warns: [] }) === "apply");
check("decideApply tolerates missing fields", decideApply({}) === "apply");

// buildReviseLogRow: one coach row, iteration = prior+1
const row = buildReviseLogRow({ scenario_id: "x", node: "u9.support", change: "moved YOU deep", coachNotes: "single option", priorMaxIteration: 2 });
check("logRow source coach", row.source === "coach");
check("logRow iteration prior+1", row.iteration === 3);
check("logRow carries change + feedback", row.change === "moved YOU deep" && row.feedback === "single option");
check("logRow node + scenario_id", row.scenario_id === "x" && row.node === "u9.support");
check("logRow iteration defaults to 1", buildReviseLogRow({ scenario_id: "x" }).iteration === 1);

// reviseReport: markdown with tally + per-board lines
const md = reviseReport([
  { id: "a", action: "applied", change: "fix", errs: [], warns: [] },
  { id: "b", action: "applied-marked", change: "fix2", errs: [], warns: ["w1"] },
  { id: "c", action: "flagged", error: "hard errors after retry", errs: ["e1"], warns: [] },
  { id: "d", action: "retired", change: "archived" },
], "2026-06-13");
check("report has heading", md.includes("# Coach Auto-Revise — 2026-06-13"));
check("report lists each board", md.includes("## a") && md.includes("## b") && md.includes("## c") && md.includes("## d"));
check("report marks warnings", md.includes("## b — applied-marked ⚠"));
check("report shows tally", md.includes("applied 1") && md.includes("retired 1"));

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Add the npm test script and run to verify it fails**

In `package.json`, add to `"scripts"` (next to `"test:browse"`):
```json
"test:auto-revise": "node scripts/test-auto-revise.mjs",
```
Run: `npm run test:auto-revise`
Expected: FAIL — `SyntaxError: ... does not provide an export named 'applyEdit'` (the module doesn't exist yet).

- [ ] **Step 3: Implement the pure module**

Create `tools/lib/auto-revise-core.mjs` with exactly this content:

```js
// Pure helpers for coach auto-revise. No Supabase, no fs, no Vite — node-testable.
// Mirrors tools/lib/coach-core.mjs.

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

// Deep-merge `edit` onto `scenario` and return a NEW object (never mutates input).
// Plain objects merge recursively; arrays and scalars replace wholesale (so to change
// one actor the caller must supply the full `actors` array). A null/non-object edit
// returns the scenario unchanged.
export function applyEdit(scenario, edit) {
  if (!isPlainObject(edit)) return scenario;
  const out = { ...scenario };
  for (const [k, v] of Object.entries(edit)) {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? applyEdit(out[k], v) : v;
  }
  return out;
}

// Gate decision from the hockey validators' output:
//   any hard error -> "reject"; warnings only -> "apply-marked"; clean -> "apply".
export function decideApply({ errs = [], warns = [] } = {}) {
  if ((errs || []).length) return "reject";
  if ((warns || []).length) return "apply-marked";
  return "apply";
}

// One coach feedback_log row for an applied/retired board. Coach-only analogue of
// coach-core.buildLogRows; iteration = (max prior for this scenario) + 1.
export function buildReviseLogRow({ scenario_id, node, change, coachNotes, priorMaxIteration }) {
  return {
    scenario_id,
    node: node || null,
    iteration: (priorMaxIteration || 0) + 1,
    source: "coach",
    feedback: coachNotes || null,
    change: change || null,
  };
}

// Markdown run report. `entries`: [{ id, action, change?, errs?, warns?, error? }].
export function reviseReport(entries, date) {
  const list = entries || [];
  const tally = list.reduce((m, e) => ((m[e.action] = (m[e.action] || 0) + 1), m), {});
  let md = `# Coach Auto-Revise — ${date}\n\n${list.length} board(s).\n\n`;
  md += `**Tally:** ` + Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(" · ") + `\n`;
  for (const e of list) {
    md += `\n## ${e.id} — ${e.action}${(e.warns && e.warns.length) ? " ⚠" : ""}\n`;
    if (e.change) md += `- change: ${e.change}\n`;
    if (e.errs && e.errs.length) md += `- errors: ${e.errs.join("; ")}\n`;
    if (e.warns && e.warns.length) md += `- warnings: ${e.warns.join("; ")}\n`;
    if (e.error) md += `- note: ${e.error}\n`;
  }
  return md;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:auto-revise`
Expected: every line `PASS`, final line `All passed`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add tools/lib/auto-revise-core.mjs scripts/test-auto-revise.mjs package.json
git commit -m "feat(coach-revise): pure transforms (applyEdit, decideApply, log row, report)"
```

---

### Task 2: Edit prompt — `revise-prompt.mjs`

**Files:**
- Create: `tools/gauntlet/revise-prompt.mjs`
- Test: `scripts/test-auto-revise.mjs` (append)

- [ ] **Step 1: Write the failing test**

Add `buildRevisePrompt` to the import line at the top of `scripts/test-auto-revise.mjs`:
```js
import { buildRevisePrompt } from "../tools/gauntlet/revise-prompt.mjs";
```
And append before the final `console.log`:
```js
// buildRevisePrompt: returns { system, prompt } strings carrying the scenario + notes + JSON contract
const bp = buildRevisePrompt({
  scenario: { id: "u9_x", nodeId: "u9.support", interaction: { kind: "place", prompt: "Where?" } },
  ascii: "[rink ascii]",
  node: { id: "u9.support" },
  concept: { name: "support", definition: "be an option" },
  notes: "There is only one real option here.",
  errs: ["needs a second candidate"],
  warns: [],
});
check("prompt returns system + prompt strings", typeof bp.system === "string" && typeof bp.prompt === "string");
check("prompt includes the scenario id", bp.prompt.includes("u9_x"));
check("prompt includes the coach notes", bp.prompt.includes("only one real option"));
check("prompt includes the validator errors", bp.prompt.includes("needs a second candidate"));
check("prompt states the JSON contract", bp.prompt.includes("\"edit\"") && bp.prompt.includes("\"change\""));
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:auto-revise`
Expected: FAIL — `does not provide an export named 'buildRevisePrompt'`.

- [ ] **Step 3: Implement the prompt builder**

Create `tools/gauntlet/revise-prompt.mjs` with exactly this content:

```js
// Builds the constrained-edit prompt for coach auto-revise. The model returns the
// SMALLEST edit that resolves the coach's notes, as strict JSON. Returns { system, prompt }
// for tools/lib/claude-agent.mjs:runAgent. See visual-prompts.mjs for the sibling pattern.

export function buildRevisePrompt({ scenario, ascii, node, concept, notes, errs = [], warns = [] }) {
  const system = [
    "You are a youth-hockey scenario editor for RinkReads.",
    "You revise ONE visual board scenario to resolve specific coach feedback.",
    "Make the smallest change that fixes the issue. Preserve the author's voice and every field you are not explicitly changing.",
    "You MUST return strict JSON and nothing else — no prose, no code fences.",
  ].join(" ");

  const checks = [];
  if (errs.length) checks.push("Hard errors (must be resolved):\n" + errs.map((e) => `- ${e}`).join("\n"));
  if (warns.length) checks.push("Warnings (resolve if it doesn't fight the coach feedback):\n" + warns.map((w) => `- ${w}`).join("\n"));

  const prompt = [
    `NODE: ${node?.id || "(unknown)"} — CONCEPT: ${concept?.name || ""}${concept?.definition ? ` (${concept.definition})` : ""}`,
    "",
    "COACH FEEDBACK TO ADDRESS:",
    notes && notes.trim() ? notes.trim() : "(no specific notes — if there is nothing concrete to fix, return an empty edit)",
    "",
    checks.length ? "MACHINE GEOMETRY CHECKS:\n" + checks.join("\n\n") + "\n" : "",
    "ASCII RINK (current):",
    ascii || "(none)",
    "",
    "CURRENT SCENARIO JSON:",
    JSON.stringify(scenario, null, 2),
    "",
    "Return strict JSON in exactly this shape:",
    '{ "change": "<one-line summary of what you changed>", "edit": { <only the top-level fields you changed> } }',
    "Rules for `edit`:",
    "- Include ONLY top-level keys you are changing; omit everything else.",
    "- When you change anything inside an array (e.g. `actors`), return the FULL array, not a fragment — arrays are replaced wholesale.",
    "- Keep coordinates in 0..1. Do not invent new interaction kinds.",
    "- If there is no concrete, safe fix, return \"edit\": {} and say so in \"change\".",
  ].filter(Boolean).join("\n");

  return { system, prompt };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:auto-revise`
Expected: all `PASS`, `All passed`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add tools/gauntlet/revise-prompt.mjs scripts/test-auto-revise.mjs
git commit -m "feat(coach-revise): constrained-edit prompt builder"
```

---

### Task 3: Orchestrator script — `coach-revise.mjs`

**Files:**
- Create: `scripts/coach-revise.mjs`
- Modify: `package.json`

This script is I/O orchestration; its testable logic lives in Task 1. Verification is a syntax check plus a `--mock --dry-run` smoke (no LLM, no writes) and the manual desk smoke.

- [ ] **Step 1: Implement the script**

Create `scripts/coach-revise.mjs` with exactly this content:

```js
#!/usr/bin/env node
// Coach auto-revise. Reads open coach_reviews (verdict revise|retire) and acts:
//   REVISE -> generate a constrained edit, validate, apply to the seed file (zero hard
//             errors; warnings allowed but marked), append feedback_log(source coach),
//             wipe the board's coach_reviews + scenario_reviews (verdict reset).
//   RETIRE -> archive the seed to seeds/_retired/, then record + reset the same way.
// Writes a per-run report and auto-commits seed changes in one commit (never pushes).
//
// Usage:
//   node scripts/coach-revise.mjs --dry-run --limit 3
//   node scripts/coach-revise.mjs --ids a,b
//   node scripts/coach-revise.mjs --mock --dry-run     # no claude, no writes (smoke)
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { loadSeeds } from "../tools/gauntlet-audit.mjs";
import { loadLedger, nodeById, conceptById } from "../tools/lib/curriculum-ledger.mjs";
import { asciiRink } from "../tools/gauntlet/ascii-rink.mjs";
import { runAgent } from "../tools/lib/claude-agent.mjs";
import { runHockeyValidators } from "../src/scenario/validators.js";
import { buildRevisePrompt } from "../tools/gauntlet/revise-prompt.mjs";
import { applyEdit, decideApply, buildReviseLogRow, reviseReport } from "../tools/lib/auto-revise-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const seedDir = resolve(ROOT, "src/scenario/seeds");
const retiredDir = resolve(seedDir, "_retired");

function loadEnv() {
  const env = {};
  try {
    for (const l of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m) env[m[1]] = m[2];
    }
  } catch { /* no .env */ }
  return env;
}

function parseArgs(argv) {
  const a = { dryRun: false, mock: false, ids: null, limit: Infinity, model: "sonnet" };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--dry-run") a.dryRun = true;
    else if (t === "--mock") a.mock = true;
    else if (t === "--ids") a.ids = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (t === "--limit") a.limit = parseInt(argv[++i], 10);
    else if (t === "--coach-model") a.model = argv[++i];
  }
  return a;
}

async function generateEdit({ seed, ascii, node, concept, notes, errs, warns, opts }) {
  if (opts.mock) return { change: "mock: tightened the coaching tip", edit: { tip: "Mock auto-revise tip." } };
  return await runAgent({ ...buildRevisePrompt({ scenario: seed, ascii, node, concept, notes, errs, warns }), model: opts.model });
}

async function priorMaxIteration(sb, id) {
  const { data } = await sb.from("feedback_log").select("iteration").eq("scenario_id", id);
  return (data || []).reduce((m, r) => Math.max(m, r.iteration || 0), 0);
}

// Append the permanent record then wipe the board's open verdicts (reset to blank).
async function recordAndReset(sb, { id, node, change, coachNotes, dryRun }) {
  if (dryRun) return;
  const row = buildReviseLogRow({ scenario_id: id, node, change, coachNotes, priorMaxIteration: await priorMaxIteration(sb, id) });
  const { error: insErr } = await sb.from("feedback_log").insert(row);
  if (insErr) throw new Error(`feedback_log insert: ${insErr.message}`);
  await sb.from("coach_reviews").delete().eq("scenario_id", id);
  await sb.from("scenario_reviews").delete().eq("scenario_id", id);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const env = { ...loadEnv(), ...process.env };
  const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: reviewsRaw, error } = await sb.from("coach_reviews").select("scenario_id,verdict,notes").in("verdict", ["revise", "retire"]);
  if (error) { console.error(`coach_reviews read: ${error.message}`); process.exit(1); }
  let reviews = reviewsRaw || [];
  if (opts.ids) reviews = reviews.filter((r) => opts.ids.includes(r.scenario_id));
  if (Number.isFinite(opts.limit)) reviews = reviews.slice(0, opts.limit);
  if (!reviews.length) { console.log("No open coach REVISE/RETIRE rows."); return; }

  const byId = new Map(loadSeeds().map(({ file, seed }) => [seed.id, { file, seed }]));
  const ledger = loadLedger();
  const entries = [];
  let changedFiles = false;
  const touchedIds = [];

  for (const rev of reviews) {
    const id = rev.scenario_id;
    const hit = byId.get(id);
    if (!hit) { entries.push({ id, action: "error", error: "seed not found on disk" }); continue; }
    const { file, seed } = hit;
    const seedPath = resolve(seedDir, file);
    const coachNotes = rev.notes || "";
    const node = nodeById(ledger, seed.nodeId) || { id: seed.nodeId };
    const concept = (node && node.conceptId && conceptById(ledger, node.conceptId)) || { name: node?.conceptId, definition: "" };

    if (rev.verdict === "retire") {
      try {
        if (!opts.dryRun) {
          if (!existsSync(retiredDir)) mkdirSync(retiredDir, { recursive: true });
          renameSync(seedPath, resolve(retiredDir, file));
          changedFiles = true;
        }
        await recordAndReset(sb, { id, node: seed.nodeId, change: "RETIRED — archived to seeds/_retired/ per coach.", coachNotes, dryRun: opts.dryRun });
        entries.push({ id, action: "retired", change: "archived to seeds/_retired/" });
        touchedIds.push(id);
      } catch (e) { entries.push({ id, action: "error", error: e.message }); }
      continue;
    }

    // REVISE: generate -> validate -> apply (retry once on hard errors)
    try {
      const ascii = asciiRink(seed);
      const v0 = runHockeyValidators(seed);
      let result, edited, decision = "reject", errs = [], warns = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        result = await generateEdit({ seed, ascii, node, concept, notes: coachNotes, errs: v0.errs || [], warns: v0.warns || [], opts });
        edited = applyEdit(seed, result.edit || {});
        if (JSON.stringify(edited) === JSON.stringify(seed)) { decision = "noop"; break; }
        const v = runHockeyValidators(edited);
        errs = v.errs || []; warns = v.warns || [];
        decision = decideApply({ errs, warns });
        if (decision !== "reject") break;
      }
      if (decision === "apply" || decision === "apply-marked") {
        if (!opts.dryRun) { writeFileSync(seedPath, JSON.stringify(edited, null, 2) + "\n", "utf8"); changedFiles = true; }
        await recordAndReset(sb, { id, node: seed.nodeId, change: result.change || "coach revision", coachNotes, dryRun: opts.dryRun });
        entries.push({ id, action: decision === "apply-marked" ? "applied-marked" : "applied", change: result.change, errs, warns });
        touchedIds.push(id);
      } else {
        entries.push({ id, action: "flagged", change: result?.change, errs, warns, error: decision === "noop" ? "no actionable edit — left flagged" : "hard errors after retry — left flagged" });
      }
    } catch (e) { entries.push({ id, action: "error", error: e.message }); }
  }

  const date = new Date().toISOString().slice(0, 10);
  const outDir = resolve(ROOT, "docs/factory/coach-revise");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, opts.dryRun ? `revise-${date}.dryrun.md` : `revise-${date}.md`);
  writeFileSync(outFile, reviseReport(entries, date), "utf8");

  if (!opts.dryRun && changedFiles) {
    try {
      execSync(`git add "${seedDir}"`, { cwd: ROOT, stdio: "ignore" });
      execSync(`git commit -m "chore(seeds): coach auto-revise ${date} (${touchedIds.join(", ")})"`, { cwd: ROOT, stdio: "ignore" });
    } catch (e) { console.error(`git commit skipped: ${e.message}`); }
  }

  const tally = entries.reduce((m, e) => ((m[e.action] = (m[e.action] || 0) + 1), m), {});
  console.log(`\nDone. ` + Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(" · ") + `. Report: ${outFile}${opts.dryRun ? " (dry-run)" : ""}`);
  process.exit(entries.some((e) => e.action === "error") ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add the npm script**

In `package.json` add to `"scripts"` (next to `"coach-review"`):
```json
"coach-revise": "node scripts/coach-revise.mjs",
```

- [ ] **Step 3: Syntax check**

Run: `node --check scripts/coach-revise.mjs`
Expected: no output, exit 0 (parses cleanly). Also re-run `npm run test:auto-revise` and confirm `All passed` (the pure module + prompt are unchanged).

- [ ] **Step 4: Mock dry-run smoke (no LLM, no writes)**

This still reads `coach_reviews` from Supabase (needs `.env`), but makes no claude calls and writes nothing except a `*.dryrun.md` report.
Run: `npm run coach-revise -- --mock --dry-run --limit 2`
Expected: prints a `Done. <tally>. Report: …dryrun.md (dry-run)` line; `git status` shows NO changed seed files and NO new commit; the `revise-<date>.dryrun.md` report lists the candidate boards. If there are no open REVISE/RETIRE rows, it prints `No open coach REVISE/RETIRE rows.` (seed some with `npm run coach-review -- --ids <id>` first).

- [ ] **Step 5: Commit**

```bash
git add scripts/coach-revise.mjs package.json
git commit -m "feat(coach-revise): orchestrator script + npm wiring"
```

---

### Task 4: Live smoke + guardrail verification (manual)

**Files:** none (verification only).

- [ ] **Step 1: Real dry-run on a couple boards**

Ensure a few boards have coach REVISE/RETIRE rows (`npm run coach-review -- --ids <ids>` if needed).
Run: `npm run coach-revise -- --dry-run --limit 2`
Expected: the report shows each board's proposed `change`, the validator `errs`/`warns`, and `applied`/`applied-marked`/`flagged`/`retired` actions. No seed files changed, no commit, no Supabase rows deleted (verify in Supabase that the `coach_reviews` rows still exist).

- [ ] **Step 2: Real run on one REVISE board**

Run: `npm run coach-revise -- --ids <one_revise_id>`
Expected:
- The seed file `src/scenario/seeds/<id>.json` is updated (a focused diff).
- A `feedback_log` row exists with `source = "coach"` for that id (one new iteration).
- The board's `coach_reviews` and `scenario_reviews` rows are gone.
- One git commit `chore(seeds): coach auto-revise <date> (<id>)` exists; nothing pushed.
- `docs/factory/coach-revise/revise-<date>.md` written.

- [ ] **Step 3: Verify the app surfaces it correctly**

Open `#browse`, find the revised board.
Expected: the SP1 "Previously incorporated" accordion shows a `Coach:` entry for the change; the KEEP/REVISE/RETIRE buttons are blank (verdict reset). For a retired board: after an app reload it no longer appears in Browse/Triage (the `seeds/*.json` glob excludes `_retired/`).

- [ ] **Step 4: No commit (verification task)**

Nothing to commit; this task only confirms behavior.

---

## Self-review notes

- **Spec coverage:** constrained-edit generation B (Task 2 prompt + Task 1 `applyEdit`) ✓; best-effort + mark via `decideApply` (Task 1) and the apply/flag branch + report ⚠ (Task 3) ✓; retry once on hard errors (Task 3 loop) ✓; auto-RETIRE archive to `_retired/` (Task 3) ✓; record `feedback_log(source coach)` (`buildReviseLogRow`, Task 1; insert, Task 3) ✓; verdict reset by deleting coach_reviews + scenario_reviews (`recordAndReset`, Task 3) ✓; retired excluded from Browse/Triage (relies on existing top-level glob — verified Task 4 Step 3) ✓; per-run report (`reviseReport` Task 1, write Task 3) ✓; one git auto-commit, never push (Task 3) ✓; `--dry-run` / `--ids` / `--limit` (Task 3) ✓; atomic ordering — durable write before destructive wipe; RETIRE moves file before reset (Task 3) ✓; idempotent — only acts on rows that still exist, wipes them on success (Task 3) ✓.
- **Placeholder scan:** every code step contains full code; no TBD/TODO.
- **Naming consistency:** `applyEdit`, `decideApply`, `buildReviseLogRow`, `reviseReport`, `buildRevisePrompt`, `generateEdit`, `recordAndReset`, `priorMaxIteration` used identically across tasks. The decision strings (`apply` / `apply-marked` / `reject` / `noop`) and the report action strings (`applied` / `applied-marked` / `flagged` / `retired` / `error`) are consistent between `decideApply`, the Task 3 branch, and the Task 1 report test.
- **Out of scope (per spec):** in-app retired-pool view; per-lens rationale; multi-iteration in one run; lessons fold; auto-push.
```
