# Curriculum Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the machine-readable curriculum ledger infrastructure (schema, loader/validator, golden test), wipe the entire old question bank, and make the app render an empty bank gracefully — so the gauntlet generator has a ledger to tag against and a blank slate to fill.

**Architecture:** A JSON data file (`src/data/curriculum-ledger.json`) is the single source of truth. A pure-function Node loader (`tools/lib/curriculum-ledger.mjs`) reads + validates it and exposes access helpers, replacing the retired `curriculum-classifier.mjs`. A golden test (`tools/curriculum-ledger-golden.mjs`, run via `npm run test:ledger`) fails CI if the ledger is structurally wrong. The old bank (legacy + base + seeds + factory) is deleted; `qbLoader.js` is reworked to read a new empty `src/data/bank.json` (the gauntlet's future output) and produce an empty-by-age bank; the app shows a "new content coming" screen when the bank is empty.

**Tech Stack:** Node 18+ ESM (`"type": "module"`), plain JS/JSX, React + Vite. No test framework — tests are `.mjs` scripts that assert and `process.exit(1)` on failure (mirrors `tools/solver-golden.mjs`).

**Spec:** `docs/superpowers/specs/2026-06-04-curriculum-ledger-design.md`

**Design refinement vs spec §5:** loader helpers are written as **pure functions that take the ledger object as their first argument** (e.g. `getNode(ledger, ageId, conceptId)`), and `loadLedger()` is the Node convenience that reads the file. This avoids any filesystem access at import time (so the file need not exist while unit-testing the validator) and lets the browser later import the JSON directly and pass it in. Same capabilities as the spec, cleaner boundary.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `tools/lib/curriculum-ledger.mjs` | Loader, pure access helpers, `validateLedger` | Create |
| `tools/lib/curriculum-ledger.test.mjs` | Unit tests for helpers + validator (inline fixtures) | Create |
| `src/data/curriculum-ledger.json` | The ledger data (skeleton: meta + sourceModels filled, taxonomy empty) | Create |
| `tools/curriculum-ledger-golden.mjs` | Golden test: load the real ledger, assert it validates | Create |
| `src/data/bank.json` | The gauntlet's future output bank (starts empty `{}`) | Create |
| `src/qbLoader.js` | Compose live bank — reworked to read `bank.json`, empty-safe, cache bump | Modify |
| `src/App.jsx` | Add `EmptyBankScreen` + empty-bank branch at the no-question guard | Modify |
| `tools/curriculum-audit.mjs` | Rewrite to read the ledger + count `nodeId`-tagged questions | Modify |
| `package.json` | Add `test:ledger` script; retire dead `mine:legacy` / `promote:legacy` | Modify |
| `CURRICULUM_MAP.md` | Mark superseded, point to the ledger | Modify |
| `tools/lib/curriculum-classifier.mjs` | Retired (legacy-only back-mapping) | Delete |
| `src/data/questions.json`, `questions.legacy.json`, `questions.legacy-candidates.json` | Old bank | Delete |
| `src/scenario/seeds/*` | Old seeds | Delete |
| `src/data/factoryQuestions.json` | Old factory output | Delete |
| `tools/mine-legacy-bank.mjs`, `tools/promote-legacy-candidates.mjs`, `tools/auto-fix-candidates.mjs` | Legacy-bank tools (dead after wipe) | Delete |

**Task order rationale:** build + test the ledger infra first (Tasks 1–3) so it exists and is green before anything depends on it. Then the wipe (Task 4) and empty-bank UX (Task 5), which are coupled. Then the audit rewrite (Task 6) which reads the ledger. Then cleanup/retirement (Task 7).

---

## Task 1: Loader, helpers, and validator

**Files:**
- Create: `tools/lib/curriculum-ledger.mjs`
- Test: `tools/lib/curriculum-ledger.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tools/lib/curriculum-ledger.test.mjs`:

```js
#!/usr/bin/env node
// Unit tests for the curriculum-ledger loader/validator. Inline fixtures only —
// does NOT read src/data/curriculum-ledger.json (that's the golden test's job).
// Run: node tools/lib/curriculum-ledger.test.mjs
import {
  validateLedger, getNode, nodeById, conceptsForAge, nodesForAge,
  conceptById, domainById, targetFor, isAnchor, DEPTH_TARGETS,
} from "./curriculum-ledger.mjs";

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  → got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  ok ? pass++ : fail++;
};
const truthy = (name, got) => eq(name, !!got, true);

// A minimal valid ledger fixture.
const good = {
  meta: {
    version: "test", locked: null,
    ageBands: ["U7", "U11"],
    depthLegend: { "-": "x", I: "x", D: "x", M: "x", R: "x" },
    anchorMultiplier: 2,
  },
  sourceModels: [{ id: "usa-adm", name: "ADM", tradition: "American", contributes: "x" }],
  domains: [{ id: "hockey-sense", name: "Hockey Sense", definition: "x", positions: ["skater"] }],
  concepts: [
    { id: "reading-the-play", name: "Reading the Play", domainId: "hockey-sense", definition: "x",
      readConnection: "x", anchor: true, positions: ["skater"],
      lineage: [{ sourceModel: "usa-adm", note: "x" }] },
  ],
  nodes: [
    { id: "u11.reading-the-play", ageId: "U11", conceptId: "reading-the-play",
      depth: "D", targetCount: 10, difficultyMix: { 1: 0.3, 2: 0.5, 3: 0.2 }, approvedTypes: ["pov-mc"] },
  ],
};

// validateLedger accepts a good ledger
eq("valid ledger ok", validateLedger(good).ok, true);
eq("valid ledger no errs", validateLedger(good).errs, []);

// An empty-taxonomy ledger is still valid (vacuously) — this is the skeleton case.
const empty = { ...good, domains: [], concepts: [], nodes: [] };
eq("empty taxonomy ok", validateLedger(empty).ok, true);

// concept with no lineage fails
const noLineage = { ...good, concepts: [{ ...good.concepts[0], lineage: [] }] };
eq("no-lineage fails", validateLedger(noLineage).ok, false);

// node with bad ageId fails
const badAge = { ...good, nodes: [{ ...good.nodes[0], ageId: "U99" }] };
eq("bad ageId fails", validateLedger(badAge).ok, false);

// node id not matching {ageLower}.{conceptId} fails
const badId = { ...good, nodes: [{ ...good.nodes[0], id: "wrong.id" }] };
eq("bad node id fails", validateLedger(badId).ok, false);

// concept.domainId pointing nowhere fails
const badDomain = { ...good, concepts: [{ ...good.concepts[0], domainId: "nope" }] };
eq("dangling domainId fails", validateLedger(badDomain).ok, false);

// lineage sourceModel pointing nowhere fails
const badSource = { ...good, concepts: [{ ...good.concepts[0], lineage: [{ sourceModel: "nope", note: "x" }] }] };
eq("dangling sourceModel fails", validateLedger(badSource).ok, false);

// targetCount mismatch (stored != computed) fails
const badCount = { ...good, nodes: [{ ...good.nodes[0], targetCount: 999 }] };
eq("targetCount mismatch fails", validateLedger(badCount).ok, false);

// helpers
eq("getNode", getNode(good, "U11", "reading-the-play").id, "u11.reading-the-play");
eq("getNode miss", getNode(good, "U7", "reading-the-play"), null);
eq("nodeById", nodeById(good, "u11.reading-the-play").conceptId, "reading-the-play");
eq("conceptsForAge", conceptsForAge(good, "U11").map(c => c.id), ["reading-the-play"]);
eq("nodesForAge", nodesForAge(good, "U11").map(n => n.id), ["u11.reading-the-play"]);
eq("conceptById", conceptById(good, "reading-the-play").name, "Reading the Play");
eq("domainById", domainById(good, "hockey-sense").name, "Hockey Sense");
eq("isAnchor true", isAnchor(good, "reading-the-play"), true);
eq("DEPTH_TARGETS D", DEPTH_TARGETS.D, 5);
// anchor (D base 5) x multiplier 2 = 10
eq("targetFor anchor", targetFor(good, good.nodes[0]), 10);
// non-anchor target = base, no multiplier
const plain = { ...good,
  concepts: [{ ...good.concepts[0], id: "breakout", anchor: false }],
  nodes: [{ ...good.nodes[0], id: "u11.breakout", conceptId: "breakout", targetCount: 5 }] };
eq("targetFor non-anchor", targetFor(plain, plain.nodes[0]), 5);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/lib/curriculum-ledger.test.mjs`
Expected: FAIL — `Cannot find module './curriculum-ledger.mjs'` (or import error), because the module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `tools/lib/curriculum-ledger.mjs`:

```js
// Curriculum ledger loader, access helpers, and validator. Single source of
// truth for what RinkReads teaches; the artifact the gauntlet tags questions
// to. Replaces the retired tools/lib/curriculum-classifier.mjs.
//
// Helpers are pure: they take the ledger object as the first argument so the
// validator is unit-testable with fixtures and the browser can pass an
// imported JSON. loadLedger() is the Node convenience that reads the file.
//
// Run the unit tests:  node tools/lib/curriculum-ledger.test.mjs
// Run the golden test:  npm run test:ledger
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const LEDGER_PATH = resolve(__dirname, "../../src/data/curriculum-ledger.json");

// depth → base target count. Anchor concepts multiply by meta.anchorMultiplier.
export const DEPTH_TARGETS = { "-": 0, I: 3, D: 5, M: 7, R: 5 };

export function loadLedger(path = LEDGER_PATH) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function conceptById(ledger, conceptId) {
  return ledger.concepts.find(c => c.id === conceptId) || null;
}
export function domainById(ledger, domainId) {
  return ledger.domains.find(d => d.id === domainId) || null;
}
export function isAnchor(ledger, conceptId) {
  return !!conceptById(ledger, conceptId)?.anchor;
}
export function nodeById(ledger, nodeId) {
  return ledger.nodes.find(n => n.id === nodeId) || null;
}
export function getNode(ledger, ageId, conceptId) {
  return ledger.nodes.find(n => n.ageId === ageId && n.conceptId === conceptId) || null;
}
export function nodesForAge(ledger, ageId) {
  return ledger.nodes.filter(n => n.ageId === ageId);
}
export function conceptsForAge(ledger, ageId) {
  const ids = new Set(nodesForAge(ledger, ageId).filter(n => n.depth !== "-").map(n => n.conceptId));
  return ledger.concepts.filter(c => ids.has(c.id));
}
export function targetFor(ledger, node) {
  const base = DEPTH_TARGETS[node.depth] ?? 0;
  const mult = isAnchor(ledger, node.conceptId) ? (ledger.meta.anchorMultiplier ?? 1) : 1;
  return base * mult;
}

// Expected node id from its age + concept: "{ageLower}.{conceptId}".
export function expectedNodeId(node) {
  return `${String(node.ageId).toLowerCase()}.${node.conceptId}`;
}

export function validateLedger(ledger) {
  const errs = [];
  const warns = [];
  const ageBands = new Set(ledger?.meta?.ageBands || []);
  const depthKeys = new Set(Object.keys(ledger?.meta?.depthLegend || {}));
  const domainIds = new Set((ledger?.domains || []).map(d => d.id));
  const sourceIds = new Set((ledger?.sourceModels || []).map(s => s.id));
  const conceptIds = new Set((ledger?.concepts || []).map(c => c.id));
  const knownTypes = new Set([
    "mc", "tf", "pov-mc", "scene-mc", "selection", "point", "path", "sequence",
    "hot-spots", "drag-target", "drag-place", "rink-label", "lane-select",
  ]);

  // concepts
  for (const c of ledger?.concepts || []) {
    if (!domainIds.has(c.domainId)) errs.push(`concept ${c.id}: domainId '${c.domainId}' not a domain`);
    if (!Array.isArray(c.lineage) || c.lineage.length === 0) {
      errs.push(`concept ${c.id}: needs >=1 lineage entry`);
    } else {
      for (const l of c.lineage) {
        if (!sourceIds.has(l.sourceModel)) errs.push(`concept ${c.id}: lineage sourceModel '${l.sourceModel}' unknown`);
      }
    }
  }

  // nodes
  const seen = new Set();
  for (const n of ledger?.nodes || []) {
    if (!ageBands.has(n.ageId)) errs.push(`node ${n.id}: ageId '${n.ageId}' not in meta.ageBands`);
    if (!conceptIds.has(n.conceptId)) errs.push(`node ${n.id}: conceptId '${n.conceptId}' unknown`);
    if (!depthKeys.has(n.depth)) errs.push(`node ${n.id}: depth '${n.depth}' not a legend key`);
    const want = expectedNodeId(n);
    if (n.id !== want) errs.push(`node ${n.id}: id should be '${want}'`);
    if (seen.has(n.id)) errs.push(`node ${n.id}: duplicate id`);
    seen.add(n.id);
    if (typeof n.targetCount === "number") {
      const computed = targetFor(ledger, n);
      if (n.targetCount !== computed) errs.push(`node ${n.id}: targetCount ${n.targetCount} != computed ${computed}`);
    }
    for (const t of n.approvedTypes || []) {
      if (!knownTypes.has(t)) warns.push(`node ${n.id}: approvedType '${t}' not in known set`);
    }
  }

  return { ok: errs.length === 0, errs, warns };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/lib/curriculum-ledger.test.mjs`
Expected: PASS — final line `24 passed, 0 failed` (count may differ slightly; key is `0 failed`), exit 0.

- [ ] **Step 5: Commit**

```bash
git add tools/lib/curriculum-ledger.mjs tools/lib/curriculum-ledger.test.mjs
git commit -m "feat(curriculum): ledger loader, helpers, validator + unit tests"
```

---

## Task 2: The ledger skeleton data file

**Files:**
- Create: `src/data/curriculum-ledger.json`

This is the real ledger with `meta` and `sourceModels` filled (these are known from the design) and the taxonomy (`domains`/`concepts`/`nodes`) left **empty** — the global-research pass populates them later. An empty taxonomy is valid by construction (validator rules are vacuous over empty arrays), so infra ships green now.

- [ ] **Step 1: Write the failing test**

This task's test is the golden test built in Task 3; here, verify by hand-running the loader. First create the file `src/data/curriculum-ledger.json`:

```json
{
  "meta": {
    "version": "3.0.0-skeleton",
    "locked": null,
    "ageBands": ["U7", "U9", "U11", "U13", "U15", "U18"],
    "depthLegend": {
      "-": "not introduced (targets are 0)",
      "I": "introduced",
      "D": "developing",
      "M": "mastery emphasis",
      "R": "refinement"
    },
    "anchorMultiplier": 2
  },
  "sourceModels": [
    { "id": "hockey-canada",   "name": "Hockey Canada LTAD",       "tradition": "Canadian",       "contributes": "" },
    { "id": "usa-adm",         "name": "USA Hockey ADM",           "tradition": "American",       "contributes": "" },
    { "id": "tarasov-soviet",  "name": "Tarasov / Soviet school",  "tradition": "Soviet/Russian", "contributes": "" },
    { "id": "swedish",         "name": "Swedish development model", "tradition": "Swedish",        "contributes": "" },
    { "id": "finnish",         "name": "Finnish development model", "tradition": "Finnish",        "contributes": "" },
    { "id": "czech",           "name": "Czech development model",   "tradition": "Czech",          "contributes": "" },
    { "id": "pond-small-area", "name": "Pond / unsanctioned / SAG", "tradition": "informal",       "contributes": "" },
    { "id": "iihf",            "name": "IIHF Coach Development",    "tradition": "international",   "contributes": "" }
  ],
  "domains": [],
  "concepts": [],
  "nodes": []
}
```

- [ ] **Step 2: Run to verify it loads + validates**

Run:
```bash
node -e "import('./tools/lib/curriculum-ledger.mjs').then(m => { const l = m.loadLedger(); const r = m.validateLedger(l); console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1); })"
```
Expected: `{"ok":true,"errs":[],"warns":[]}`, exit 0.

- [ ] **Step 3: (no implementation — data file only)**

The file IS the deliverable; Step 2 is its verification.

- [ ] **Step 4: Re-run the unit tests (unaffected)**

Run: `node tools/lib/curriculum-ledger.test.mjs`
Expected: PASS, `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add src/data/curriculum-ledger.json
git commit -m "feat(curriculum): ledger skeleton — meta + sourceModels, empty taxonomy"
```

---

## Task 3: Golden test + npm script

**Files:**
- Create: `tools/curriculum-ledger-golden.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create `tools/curriculum-ledger-golden.mjs`:

```js
#!/usr/bin/env node
// Golden test for the curriculum ledger. Loads the REAL src/data/curriculum-ledger.json
// and asserts it validates. CI backstop: if this fails, the curriculum spine is wrong
// and the gauntlet must not generate against it. Run: npm run test:ledger
import { loadLedger, validateLedger } from "./lib/curriculum-ledger.mjs";

const ledger = loadLedger();
const { ok, errs, warns } = validateLedger(ledger);

for (const w of warns) console.log(`WARN  ${w}`);
for (const e of errs) console.log(`FAIL  ${e}`);
console.log(`\nledger v${ledger.meta.version}: ${ledger.concepts.length} concepts, ${ledger.nodes.length} nodes — ${ok ? "VALID" : "INVALID"}`);
process.exit(ok ? 0 : 1);
```

- [ ] **Step 2: Run to verify it passes on the skeleton**

Run: `node tools/curriculum-ledger-golden.mjs`
Expected: `ledger v3.0.0-skeleton: 0 concepts, 0 nodes — VALID`, exit 0.

- [ ] **Step 3: Wire the npm script**

In `package.json`, add to `scripts` (next to `audit:curriculum`):

```json
    "test:ledger": "node tools/curriculum-ledger-golden.mjs",
```

- [ ] **Step 4: Run via npm**

Run: `npm run test:ledger`
Expected: same VALID output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add tools/curriculum-ledger-golden.mjs package.json
git commit -m "test(curriculum): ledger golden test + test:ledger npm script"
```

---

## Task 4: Wipe the old bank + rework qbLoader

**Files:**
- Create: `src/data/bank.json`
- Modify: `src/qbLoader.js`
- Delete: `src/data/questions.json`, `src/data/questions.legacy.json`, `src/data/questions.legacy-candidates.json`, `src/data/factoryQuestions.json`, all of `src/scenario/seeds/*`

`qbLoader.js` currently statically imports `factoryQuestions.json` and dynamically imports `questions.json`; deleting those without editing the loader breaks the Vite build. The reworked loader reads the new (empty) `bank.json`, normalizes to the 6 age levels, and merges any auto-globbed seeds (there will be none after the wipe, but the glob stays so the gauntlet can drop seeds later).

- [ ] **Step 1: Create the empty output bank**

Create `src/data/bank.json`:

```json
{}
```

- [ ] **Step 2: Rework qbLoader to be empty-safe**

Replace the entire contents of `src/qbLoader.js` with:

```js
import BANK from "./data/bank.json";
import { LEVELS } from "./shared.jsx";

let cached = null;

// The gauntlet drops ledger-tagged scenario seeds here; Vite eagerly bundles
// them at build time. Empty after the 2026-06-04 wipe — populated as the
// gauntlet ships content.
const SCENARIO_SEED_MODULES = import.meta.glob("./scenario/seeds/*.json", { eager: true });

function emptyByLevel() {
  const qb = {};
  for (const lvl of LEVELS) qb[lvl] = [];
  return qb;
}

function collectScenarios() {
  const out = [];
  for (const mod of Object.values(SCENARIO_SEED_MODULES)) {
    const s = mod && mod.default ? mod.default : mod;
    if (s && s.type === "scenario") out.push(s);
  }
  return out;
}

// Compose the live bank from src/data/bank.json (gauntlet output, keyed by age
// level → question[]) plus any scenario seeds. Always returns an object keyed
// by all 6 levels, even when empty. Bank version bumped to v27 (2026-06-04
// blank-slate wipe) so any pre-wipe composed bank in sessionStorage is dropped.
export function loadQB() {
  if (cached) return Promise.resolve(cached);

  const CACHE_KEY = "rinkreads_qb_cache_v27";
  try {
    // Drop every prior cache version (pre-wipe banks must not be served).
    for (let v = 3; v <= 26; v++) sessionStorage.removeItem(`rinkreads_qb_cache_v${v}`);
    sessionStorage.removeItem("rinkreads_qb_cache");
    const stored = sessionStorage.getItem(CACHE_KEY);
    if (stored) { cached = JSON.parse(stored); return Promise.resolve(cached); }
  } catch (e) {}

  const qb = emptyByLevel();

  // bank.json: { "U7 / Initiation": [ ...questions ], ... }. Tolerate missing
  // levels and questions without an explicit type (default "mc").
  for (const lvl of LEVELS) {
    const rows = Array.isArray(BANK?.[lvl]) ? BANK[lvl] : [];
    qb[lvl] = rows.map(q => (q.type ? q : { ...q, type: "mc" }));
  }

  // Merge unified-engine scenarios by declared level/levels[].
  for (const s of collectScenarios()) {
    const targets = Array.isArray(s.levels) && s.levels.length ? s.levels : (s.level ? [s.level] : []);
    const enriched = { ...s, d: typeof s.d === "number" ? s.d : (typeof s.difficulty === "number" ? s.difficulty : 2) };
    for (const lvl of targets) {
      if (!qb[lvl]) continue;
      if (qb[lvl].some(x => x.id === s.id)) continue;
      qb[lvl].push(enriched);
    }
  }

  cached = qb;
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached)); } catch (e) {}
  return Promise.resolve(cached);
}

export function preloadQB() { loadQB(); }
```

- [ ] **Step 3: Delete the old bank files**

Run (PowerShell):
```powershell
Remove-Item src/data/questions.json, src/data/questions.legacy.json, src/data/questions.legacy-candidates.json, src/data/factoryQuestions.json
Remove-Item src/scenario/seeds/* -Recurse -Force
```

- [ ] **Step 4: Verify the build composes an empty bank**

Run: `npm run build`
Expected: build succeeds (no "Cannot resolve import ./data/questions.json" / "./data/factoryQuestions.json" errors). The bundle builds clean.

- [ ] **Step 5: Commit**

```bash
git add -A src/data src/scenario/seeds src/qbLoader.js
git commit -m "feat(curriculum): blank-slate wipe — delete old bank, qbLoader reads empty bank.json"
```

---

## Task 5: Empty-bank "new content coming" UX

**Files:**
- Modify: `src/App.jsx` (add `EmptyBankScreen`; new branch at the no-question guard, ~line 1922)

After the wipe, `buildQueue` returns an empty queue, so the quiz screen's `if (!q)` guard is reached with `queue.length === 0` and no `ids` filter — today that falls through to a permanent "Loading…". Add a branch that shows a friendly empty state instead.

- [ ] **Step 1: Read the current guard**

Run: `sed -n '1894,1924p' src/App.jsx` (or open [App.jsx:1894-1924](../../src/App.jsx#L1894-L1924)). Confirm the structure matches Step 3's anchor.

- [ ] **Step 2: Add the `EmptyBankScreen` component**

In `src/App.jsx`, immediately above the line `function buildQueue(qb, level, position, isReturning, tier) {` (currently line 631), insert:

```jsx
// Shown when the composed bank has zero questions for the player's age/position.
// Expected during the 2026-06-04 blank-slate window: the old bank is wiped and
// the gauntlet has not shipped ledger-tagged content yet. Friendly, not an error.
function EmptyBankScreen() {
  return (
    <Screen>
      <div style={{ maxWidth: 460, margin: "4rem auto", padding: "1.25rem 1.5rem", textAlign: "center", color: C.white, fontFamily: FONT.body }}>
        <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden="true">🏒</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, fontFamily: FONT.head }}>
          New content is on the way
        </div>
        <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.6 }}>
          We're rebuilding the RinkReads question bank from the ground up. Fresh,
          coach-reviewed scenarios are being added now — check back soon.
        </p>
      </div>
    </Screen>
  );
}
```

(If `FONT.head` is not a valid key in this file, use `FONT.body` for the heading too — verify against the `FONT` definition near the top of `App.jsx` before committing.)

- [ ] **Step 3: Add the empty-bank branch in the no-question guard**

In `src/App.jsx`, find this block (currently ending ~line 1923):

```jsx
      );
    }
    return <Screen><div style={{color:C.dimmer,textAlign:"center",paddingTop:"4rem"}}>Loading…</div></Screen>;
  }
```

Replace it with:

```jsx
      );
    }
    // Queue built but empty, and no specific ids were requested → the bank has
    // no questions for this player (blank-slate window). Show the empty state
    // rather than spinning on "Loading…" forever.
    if (queueReadyButEmpty) {
      return <EmptyBankScreen />;
    }
    return <Screen><div style={{color:C.dimmer,textAlign:"center",paddingTop:"4rem"}}>Loading…</div></Screen>;
  }
```

- [ ] **Step 4: Verify in the dev app**

Run: `npm run dev`, open the app, start a quiz as any profile.
Expected: the "New content is on the way" screen renders (no infinite "Loading…", no crash). Stop the dev server when confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat(curriculum): EmptyBankScreen for the blank-slate window"
```

---

## Task 6: Rewrite the curriculum audit against the ledger

**Files:**
- Modify: `tools/curriculum-audit.mjs`

The audit currently inlines a copy of the taxonomy and reads `questions.json` (now deleted). Rewrite it to read the ledger via the loader and count how many live questions carry each `nodeId`, reporting coverage vs. `targetFor(node)`. New questions tag themselves with `nodeId`; with an empty bank the audit correctly reports 0/target everywhere.

- [ ] **Step 1: Write the failing check**

Run the current audit to confirm it now breaks on the deleted file:
Run: `npm run audit:curriculum`
Expected: FAIL — cannot read `src/data/questions.json` (ENOENT). This is the regression we are fixing.

- [ ] **Step 2: Rewrite the audit**

Replace the entire contents of `tools/curriculum-audit.mjs` with:

```js
#!/usr/bin/env node
// Curriculum audit: for every ledger node, count live questions tagged with its
// nodeId and report coverage vs. target. Reads the ledger (source of truth) and
// the composed bank (src/data/bank.json + scenario seeds).
//
// Usage:
//   node tools/curriculum-audit.mjs            # full report
//   node tools/curriculum-audit.mjs --gaps     # only nodes under target
//   node tools/curriculum-audit.mjs --json     # machine-readable
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLedger, targetFor, conceptById } from "./lib/curriculum-ledger.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const args = process.argv.slice(2);
const gapsOnly = args.includes("--gaps");
const asJson = args.includes("--json");

const ledger = loadLedger();

// Collect every live question from bank.json + scenario seeds.
function loadLiveQuestions() {
  const out = [];
  try {
    const bank = JSON.parse(readFileSync(resolve(root, "src/data/bank.json"), "utf8"));
    for (const lvl of Object.keys(bank)) for (const q of bank[lvl] || []) out.push(q);
  } catch {}
  const seedDir = resolve(root, "src/scenario/seeds");
  try {
    for (const f of readdirSync(seedDir)) {
      if (!f.endsWith(".json")) continue;
      try { out.push(JSON.parse(readFileSync(resolve(seedDir, f), "utf8"))); } catch {}
    }
  } catch {}
  return out;
}

const questions = loadLiveQuestions();

// Count questions per nodeId.
const counts = {};
for (const q of questions) {
  if (q && typeof q.nodeId === "string") counts[q.nodeId] = (counts[q.nodeId] || 0) + 1;
}

const rows = ledger.nodes.map(n => {
  const have = counts[n.id] || 0;
  const want = targetFor(ledger, n);
  return { id: n.id, ageId: n.ageId, conceptId: n.conceptId,
           concept: conceptById(ledger, n.conceptId)?.name || n.conceptId,
           depth: n.depth, have, want, gap: Math.max(0, want - have) };
});

if (asJson) {
  console.log(JSON.stringify({ totalNodes: rows.length, totalQuestions: questions.length, rows }, null, 2));
  process.exit(0);
}

const shown = gapsOnly ? rows.filter(r => r.gap > 0) : rows;
console.log(`Curriculum coverage — ${questions.length} live questions across ${ledger.nodes.length} nodes\n`);
for (const r of shown) {
  console.log(`${r.have >= r.want ? "OK " : "GAP"}  ${r.id.padEnd(28)} ${r.depth}  ${r.have}/${r.want}`);
}
const gaps = rows.filter(r => r.gap > 0).length;
console.log(`\n${rows.length - gaps}/${rows.length} nodes at target; ${gaps} under target.`);
```

- [ ] **Step 3: Run the rewritten audit**

Run: `npm run audit:curriculum`
Expected: with the skeleton ledger (0 nodes) it prints `Curriculum coverage — 0 live questions across 0 nodes` then `0/0 nodes at target; 0 under target.`, exit 0. (Once the taxonomy is populated it reports real gaps.)

- [ ] **Step 4: Run the JSON form**

Run: `node tools/curriculum-audit.mjs --json`
Expected: `{ "totalNodes": 0, "totalQuestions": 0, "rows": [] }`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add tools/curriculum-audit.mjs
git commit -m "feat(curriculum): rewrite audit against the ledger + nodeId tags"
```

---

## Task 7: Retire dead docs and tools

**Files:**
- Modify: `CURRICULUM_MAP.md` (mark superseded)
- Modify: `package.json` (drop dead legacy scripts)
- Delete: `tools/lib/curriculum-classifier.mjs`, `tools/mine-legacy-bank.mjs`, `tools/promote-legacy-candidates.mjs`, `tools/auto-fix-candidates.mjs`

These three tools operate on the legacy bank (now deleted) and `auto-fix-candidates.mjs` + `mine-legacy-bank.mjs` import the retired classifier. Confirm no other importers remain before deleting.

- [ ] **Step 1: Confirm no remaining importers of the classifier**

Run: `grep -rln "curriculum-classifier" tools/ src/`
Expected: only `tools/mine-legacy-bank.mjs` and `tools/auto-fix-candidates.mjs` (both being deleted). If anything else appears, update it to use `curriculum-ledger.mjs` before proceeding.

- [ ] **Step 2: Mark `CURRICULUM_MAP.md` superseded**

At the very top of `CURRICULUM_MAP.md`, insert above the existing `# RinkReads Curriculum Map — v2` line:

```markdown
> **SUPERSEDED (2026-06-04).** The source of truth for curriculum is now the
> machine-readable ledger at `src/data/curriculum-ledger.json` (loader:
> `tools/lib/curriculum-ledger.mjs`, design:
> `docs/superpowers/specs/2026-06-04-curriculum-ledger-design.md`). The taxonomy
> below is being rebuilt from scratch from global development models and is kept
> only for historical reference. Do not treat it as current.

```

- [ ] **Step 3: Delete the dead tools**

Run (PowerShell):
```powershell
Remove-Item tools/lib/curriculum-classifier.mjs, tools/mine-legacy-bank.mjs, tools/promote-legacy-candidates.mjs, tools/auto-fix-candidates.mjs
```

- [ ] **Step 4: Drop the dead npm scripts**

In `package.json`, remove these two lines from `scripts`:

```json
    "mine:legacy": "node tools/mine-legacy-bank.mjs",
    "promote:legacy": "node tools/promote-legacy-candidates.mjs",
```

Then verify nothing else references the deleted tools and the ledger test still passes:
Run: `grep -rln "mine-legacy-bank\|promote-legacy-candidates\|auto-fix-candidates\|curriculum-classifier" . --exclude-dir=node_modules --exclude-dir=.git`
Expected: no matches (or only this plan/spec docs).
Run: `npm run test:ledger`
Expected: `VALID`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(curriculum): retire legacy classifier/miner tools; mark CURRICULUM_MAP superseded"
```

---

## Self-Review

**Spec coverage (§9 deliverables):**
- `curriculum-ledger.json` → Task 2. ✓
- `curriculum-ledger.mjs` loader/helpers/validate → Task 1. ✓
- Golden test wired into CI → Task 3 (`test:ledger`); CI note below.
- Wipe + qbLoader empty-safe + cache bump → Task 4 (`v26` → `v27`). ✓
- Empty-bank UX → Task 5. ✓
- `curriculum-audit.mjs` reads ledger → Task 6. ✓
- `CURRICULUM_MAP.md` superseded + classifier retired → Task 7. ✓

**CI note:** the repo's only GitHub workflow is `reset-demo-accounts.yml`; there is no test-runner workflow today. "Wired into CI" is satisfied at the command level (`npm run test:ledger`, exit-code based). Adding a workflow that runs `test:ledger` + `solver-golden` is a reasonable follow-up but is not required by this plan and is left out to avoid scope creep.

**Out-of-scope confirmed not built here:** the global-source research that fills the taxonomy (spec §7), and the gauntlet generator (separate spec). The ledger ships as a valid empty skeleton; both follow-ups consume it.

**Placeholder scan:** no TBD/TODO steps; every code step shows complete code; every command states expected output.

**Type/name consistency:** `loadLedger`, `validateLedger`, `getNode`, `nodeById`, `conceptsForAge`, `nodesForAge`, `conceptById`, `domainById`, `targetFor`, `isAnchor`, `expectedNodeId`, `DEPTH_TARGETS`, `LEDGER_PATH` — used identically in Tasks 1, 3, 6. Cache key `rinkreads_qb_cache_v27` and `LEVELS` import (from `shared.jsx`, confirmed exported) consistent in Task 4. `EmptyBankScreen` / `queueReadyButEmpty` consistent in Task 5.

**Known assumption to verify at execution:** Task 5 uses `C.white/C.dim/C.dimmer`, `FONT.body`, and `<Screen>` — all observed in the existing guard block at `App.jsx:1904-1923`, so they are in scope there. `FONT.head` is the one unconfirmed key; Step 2 flags the fallback.
