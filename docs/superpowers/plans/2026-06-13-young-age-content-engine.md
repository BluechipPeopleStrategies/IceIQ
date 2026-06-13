# Young-Age Stream-1 Content Engine + Source Library, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Furnish the objective young-age reads (U7/U9/U11) by adding a citation gate to the existing brief-to-seed pipeline, standing up a cited source-of-truth library, and producing ~36 verified Stream-1 reads.

**Architecture:** Reuse the existing pipeline (fill a brief skeleton, compile with `scripts/brief-to-seed.mjs` which resolves zones to coords and runs `lintScenario`, ship to `src/scenario/seeds/` where `qbLoader.js` auto-merges it). Add one optional `sourceRef` field carried through compilation, a batch verifier that enforces citation + lint over the v1 set, a `docs/library/` corpus that grounds and cites each read, and a repeatable authoring loop proven on one worked exemplar before fanning out to the full batch.

**Tech Stack:** Node 18+ ES modules (`.mjs`), `node:test` + `node:assert/strict` for tests (matches the repo's existing `node`-script test convention), plain JSON seeds, Markdown library notes. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-13-young-age-content-engine-design.md`

---

## Pre-flight (read once before Task 1)

- All commands run from the repo root `C:\Users\mtsli\IceIQ`.
- Branch this work off the current `feat/board-mc-questions`:
  - [ ] Run: `git checkout -b feat/young-age-content-engine`
- Key existing files you will touch or lean on:
  - `scripts/brief-to-seed.mjs` — compiles a brief to a validated seed (the `compileBrief` assembly is the "step 7" object at lines ~138-157).
  - `tools/scenario-author/validate.mjs` — exports `lintScenario` (schema + overlap + scorer self-test).
  - `.claude/skills/new-scenario/validate-seed.mjs` — CLI wrapper around `lintScenario`.
  - `src/scenario/schema.js` — `validateScenario`; permissive (ignores unknown top-level fields, so adding `sourceRef` will NOT break the existing 27 seeds).
  - `src/scenario/zones.js` — `ZONES` registry (zone ids -> coords). OZ zones have x>=0.70, neutral x=0.50, DZ x<=0.30. For `view:"right"` keep every actor x>=0.45.
  - `src/data/curriculum-ledger.json` — the locked concept/node spine with sourced `lineage` (the citations the library notes draw from).
  - `docs/ai-pipeline/_briefs-todo/` — the pre-filled brief skeletons by age x concept.
- **Validator gotchas (verified against the real compiler 2026-06-13):**
  - **No offside on entry:** keep the puck carrier clearly INSIDE the zone (x>=0.78 for a right-view off-zone), not on the blue line, when teammates are deeper. Otherwise lint errors `offsides-on-entry`.
  - **A defender must be goal-side of the puck** in an attacking scene (between the puck and the net). An attack with no one to beat is rejected.
  - **U7/U9 use generic players:** only the `YOU` actor may carry a `tag`. Remove position tags ("C", "RW", "LD") from teammates/defenders at U7 and U9. (U11+ may label.)

---

## File structure (what gets created or changed)

**Created:**
- `scripts/verify-batch.mjs` — gate: lint + citation check over a set of seeds.
- `scripts/test-sourceref.mjs` — integration test for the `sourceRef` passthrough.
- `scripts/test-verify-batch.mjs` — test for the batch gate.
- `docs/library/INDEX.md` — routing index: concept id -> note -> sources.
- `docs/library/_TEMPLATE.md` — the note shape every concept note follows.
- `docs/library/sources/README.md` — how the raw Notion/disk pile is consolidated here.
- `docs/library/scanning.md`, `docs/library/off-puck-support-offense.md` — first two real notes (more added in Task 5).
- `src/scenario/seeds/u9_off-puck-support-offense_select_v1.json` — the worked exemplar (Task 4), then ~35 more in Task 5.

**Modified:**
- `scripts/brief-to-seed.mjs` — add one `sourceRef` passthrough line in the seed assembly.
- `src/scenario/schema.js` — document `sourceRef` in the `Scenario` typedef (JSDoc only).
- `package.json` — add `verify-batch`, `test:sourceref`, `test:verify-batch` scripts.

---

## Task 1: Carry `sourceRef` through the compile step

**Files:**
- Modify: `scripts/brief-to-seed.mjs` (seed assembly object, ~lines 138-157)
- Modify: `src/scenario/schema.js` (Scenario JSDoc, ~line 181)
- Create: `scripts/test-sourceref.mjs`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Write the failing test**

Create `scripts/test-sourceref.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("brief-to-seed carries sourceRef into the compiled seed", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr-sref-"));
  const brief = {
    id: "test_sref_v1",
    nodeId: "u9.off-puck-support-offense",
    levels: ["U9 / Novice"],
    cat: "Offensive Play",
    themes: ["puck-support"],
    difficulty: 1,
    primitive: "selection",
    view: "right",
    zone: "off-zone",
    sourceRef: { note: "off-puck-support-offense", cite: "Hockey Canada LTPD" },
    actors: [
      { id: "you", kind: "player", x: 0.80, y: 0.50, tag: "YOU" },
      { id: "puck", kind: "puck", with: "you" },
      { id: "t1", kind: "teammate", x: 0.90, y: 0.30 },
      { id: "t2", kind: "teammate", x: 0.90, y: 0.74 },
      { id: "x1", kind: "defender", x: 0.86, y: 0.64 }
    ],
    from: ["t1", "t2"],
    correct: { ids: ["t1"] },
    prompt: "You have the puck in the offensive zone. Tap the open teammate who is in a good spot to support you.",
    feedback: {
      right: "The teammate up the open side has clear ice and a clean passing lane. That is real support.",
      wrong: "That teammate is covered. A defender sits in the lane, so closest is not the same as open."
    },
    tip: "Support means open ice and a clean lane, not just the nearest jersey.",
    why: "Good off-puck support gives the carrier a passing option the defense cannot take away."
  };
  const briefPath = join(dir, "brief.json");
  writeFileSync(briefPath, JSON.stringify(brief));
  execFileSync("node", ["scripts/brief-to-seed.mjs", briefPath, "--out", dir], { stdio: "pipe" });
  const seed = JSON.parse(readFileSync(join(dir, "test_sref_v1.json"), "utf8"));
  assert.deepEqual(seed.sourceRef, { note: "off-puck-support-offense", cite: "Hockey Canada LTPD" });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `node --test scripts/test-sourceref.mjs`
Expected: FAIL. The compiled seed has no `sourceRef`, so `assert.deepEqual` reports `undefined` !== the object. (If brief-to-seed instead parks the seed in `_needs-fixing`, the read of `<dir>/test_sref_v1.json` throws ENOENT — also a fail; fix coords before proceeding, but with these coords it should compile OK.)

- [ ] **Step 3: Add the passthrough**

In `scripts/brief-to-seed.mjs`, in the `const seed = { ... }` assembly (the block that starts `id: brief.id,`), add the `sourceRef` line right after the `...(brief.mc ? { mc: brief.mc } : {}),` line:

```js
  ...(brief.mc ? { mc: brief.mc } : {}),
  ...(brief.sourceRef ? { sourceRef: brief.sourceRef } : {}),
  actors: allActors,
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `node --test scripts/test-sourceref.mjs`
Expected: PASS (`1 passing`).

- [ ] **Step 5: Document the field (JSDoc only)**

In `src/scenario/schema.js`, in the `@typedef {Object} Scenario` block, add one line after the `@property ... [mc]` line:

```js
 * @property {{note:string, cite:string, url?:string}} [sourceRef]  // citation: which library note + authority backs this read
```

- [ ] **Step 6: Wire the npm script**

In `package.json` `scripts`, add:

```json
    "test:sourceref": "node --test scripts/test-sourceref.mjs",
```

- [ ] **Step 7: Commit**

```bash
git add scripts/brief-to-seed.mjs scripts/test-sourceref.mjs src/scenario/schema.js package.json
git commit -m "feat(engine): carry sourceRef citation through brief compile"
```

---

## Task 2: Batch gate (lint + citation) over the v1 set

**Files:**
- Create: `scripts/verify-batch.mjs`
- Create: `scripts/test-verify-batch.mjs`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Write the failing test**

Create `scripts/test-verify-batch.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A structurally valid selection seed (mirrors a shipped seed shape).
function baseSeed(id) {
  return {
    id, type: "scenario", level: "U9 / Novice", levels: ["U9 / Novice"],
    themes: ["puck-support"], cat: "Offensive Play", difficulty: 1,
    stage: { view: "right", zone: "off-zone" },
    actors: [
      { id: "you", kind: "player", x: 0.80, y: 0.50, tag: "YOU" },
      { id: "puck", kind: "puck", x: 0.802, y: 0.498 },
      { id: "t1", kind: "teammate", x: 0.90, y: 0.30 },
      { id: "t2", kind: "teammate", x: 0.90, y: 0.74 },
      { id: "x1", kind: "defender", x: 0.86, y: 0.64 },
      { id: "g", kind: "goalie", x: 0.918, y: 0.50 }
    ],
    interaction: { kind: "selection", from: ["t1", "t2"], order: "any", prompt: "You have the puck in the offensive zone. Tap the open teammate who can support you." },
    correct: { kind: "selection", ids: ["t1"] },
    feedback: { right: "The open-side teammate has a clean lane.", wrong: "That teammate is covered by a defender in the lane." },
    tip: "Support is open ice and a clean lane.",
    why: "Support gives the carrier an option the defense cannot take away."
  };
}

function run(dir) {
  try {
    const out = execFileSync("node", ["scripts/verify-batch.mjs", "--dir", dir], { stdio: "pipe" });
    return { code: 0, out: out.toString() };
  } catch (e) {
    return { code: e.status, out: (e.stdout || "").toString() + (e.stderr || "").toString() };
  }
}

test("verify-batch passes a lint-clean seed that carries a sourceRef", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr-vb-ok-"));
  const seed = baseSeed("vb_ok_v1");
  seed.sourceRef = { note: "off-puck-support-offense", cite: "Hockey Canada LTPD" };
  writeFileSync(join(dir, "vb_ok_v1.json"), JSON.stringify(seed));
  const r = run(dir);
  assert.equal(r.code, 0, r.out);
});

test("verify-batch fails a lint-clean seed that is MISSING a sourceRef", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr-vb-bad-"));
  const seed = baseSeed("vb_bad_v1"); // no sourceRef
  writeFileSync(join(dir, "vb_bad_v1.json"), JSON.stringify(seed));
  const r = run(dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /missing sourceRef/);
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `node --test scripts/test-verify-batch.mjs`
Expected: FAIL with module-not-found / cannot find `scripts/verify-batch.mjs` (it does not exist yet).

- [ ] **Step 3: Write the verifier**

Create `scripts/verify-batch.mjs`:

```js
// verify-batch.mjs — the v1 ship gate. For each seed, runs the real
// lintScenario AND requires a citation (sourceRef.note + sourceRef.cite).
// Usage: node scripts/verify-batch.mjs --dir <folder>
//        node scripts/verify-batch.mjs <seed.json> [<seed.json> ...]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { lintScenario } from "../tools/scenario-author/validate.mjs";

const args = process.argv.slice(2);
const dirIdx = args.indexOf("--dir");
let files = [];
if (dirIdx > -1) {
  const dir = args[dirIdx + 1];
  files = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => join(dir, f)).sort();
} else {
  files = args.filter((a) => a.endsWith(".json"));
}
if (!files.length) { console.error("usage: verify-batch.mjs --dir <folder> | <seed.json> ..."); process.exit(2); }

function citationOf(seed) {
  const r = seed.sourceRef;
  if (!r || typeof r.note !== "string" || !r.note.trim() || typeof r.cite !== "string" || !r.cite.trim()) {
    return "missing sourceRef (need {note, cite})";
  }
  return null;
}

let pass = 0;
for (const f of files) {
  let seed;
  try { seed = JSON.parse(readFileSync(f, "utf8")); }
  catch (e) { console.error(`FAIL ${f} — bad JSON: ${e.message}`); continue; }
  const lint = lintScenario(seed);
  const cite = citationOf(seed);
  if (lint.ok && !cite) { console.log(`OK   ${seed.id}`); pass++; continue; }
  for (const e of (lint.errs || [])) console.error(`  err:  ${e}`);
  if (cite) console.error(`  err:  ${cite}`);
  console.error(`FAIL ${seed.id || f}`);
}
console.log(`\n── ${pass}/${files.length} OK`);
process.exit(pass === files.length ? 0 : 1);
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `node --test scripts/test-verify-batch.mjs`
Expected: PASS (`2 passing`).

- [ ] **Step 5: Wire the npm scripts**

In `package.json` `scripts`, add:

```json
    "verify-batch": "node scripts/verify-batch.mjs",
    "test:verify-batch": "node --test scripts/test-verify-batch.mjs",
```

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-batch.mjs scripts/test-verify-batch.mjs package.json
git commit -m "feat(engine): batch ship gate enforcing lint + citation"
```

---

## Task 3: Stand up the source library

No automated test here; the deliverable is curated Markdown. The "gate" is Task 5's reads citing these notes by `sourceRef.note`.

**Files:**
- Create: `docs/library/INDEX.md`, `docs/library/_TEMPLATE.md`, `docs/library/sources/README.md`, `docs/library/scanning.md`, `docs/library/off-puck-support-offense.md`

- [ ] **Step 1: Write the note template**

Create `docs/library/_TEMPLATE.md`:

```markdown
# <concept-name> (`<concept-id>`)

**Domain:** <domain>  ·  **Anchor:** <yes/no>  ·  **Ledger node ids:** u7.<id>, u9.<id>, u11.<id>

## Definition
<one or two sentences, lifted from curriculum-ledger.json concept.definition>

## The read (objective rule)
<the single best read stated as an objective rule a non-expert can verify, e.g.
"the correct support option is the teammate with both open ice and a passing lane
not crossed by a defender">

## Age calibration (wedge)
- **U7 (I):** <what the read looks like at first exposure, one cue>
- **U9 (D):** <developing, light pressure>
- **U11 (D):** <developing, more options, predictable tempo>

## Authoring notes for seeds
<scene ingredients that make this read real: who must be on the board, where the
tempting-but-wrong option sits, which zone/view fits>

## Citations
- <Authority name> — <what it contributes> (<source file in sources/ or URL>)
```

- [ ] **Step 2: Write the `scanning` note**

Create `docs/library/scanning.md`. Pull the definition and lineage from `curriculum-ledger.json` (`scanning` is an anchor in `hockey-sense`, lineage: swedish, iihf, hockey-canada). Use the Swedish 2024 SHL/SDHL scanning study (scanning before receiving raised success 70.1% -> 78.8%, n=2,545) already cited in the ledger meta:

```markdown
# Scanning (`scanning`)

**Domain:** Hockey Sense  ·  **Anchor:** yes  ·  **Ledger node ids:** u7.scanning, u9.scanning, u11.scanning

## Definition
Head on a swivel: shoulder checks and visual exploration before and after receiving the puck. Scanning is how information enters the decision. No scan, no read.

## The read (objective rule)
The correct answer is the action that requires having looked away from the puck first: identify the open teammate / the open ice / the unseen pressure that is only knowable by checking your shoulder. The wrong option is the one a player who never looked up would pick (forcing it to the nearest jersey, skating into pressure they did not see).

## Age calibration (wedge)
- **U7 (I):** one cue. "Look before you get the puck." Show pressure coming; correct read is to look / move to space, not stickhandle into the checker.
- **U9 (D):** scan to find one open teammate before passing. Light pressure.
- **U11 (D):** scan to choose between two options; the better option is only visible after a shoulder check (weak-side open).

## Authoring notes for seeds
Pairs naturally with `selection` (tap the teammate you could only find by scanning) and `point` (tap the open ice / the unseen pressure). Put the tempting option in the obvious near lane and the correct option weak-side or behind the player, so the read rewards having looked.

## Citations
- Swedish development model — scanning as a trainable perceptual skill. PRIMARY: 2024 SHL/SDHL study with the Swedish Ice Hockey Federation, scanning before receiving raised pass success 70.1% -> 78.8% (n=2,545). (J. Sports Sci. 2024.2433899)
- IIHF small-area-games research — scanning load under game-like reps.
- Hockey Canada LTPD — scanning introduced young, refined with age.
```

- [ ] **Step 3: Write the `off-puck-support-offense` note**

Create `docs/library/off-puck-support-offense.md` (lineage from the ledger: iihf, hockey-canada, pond-small-area):

```markdown
# Off-Puck Support, Offense (`off-puck-support-offense`)

**Domain:** Offensive Play  ·  **Anchor:** no  ·  **Ledger node ids:** u9.off-puck-support-offense, u11.off-puck-support-offense (no u7 node)

## Definition
Getting open for the carrier: support angles and distance, give-and-go timing, and driving to be the best option. Reading where to go without the puck so the carrier has a real option.

## The read (objective rule)
The correct support teammate is the one with BOTH (a) open ice and (b) a passing lane from the carrier that no defender crosses within ~0.035 of the lane. "Closest teammate" is the classic wrong answer when a defender sits in that near lane.

## Age calibration (wedge)
- **U9 (I):** one supporter open, one covered. Tap the open one.
- **U11 (D):** two plausible supporters; the better one has the cleaner lane and more space to attack from.

## Authoring notes for seeds
`selection` primitive fits best (tap the supporter). Place one teammate near-but-covered (a defender ~0.01-0.03 off that lane) and one wider with a clean lane. Off-zone, view right, so a goalie auto-fills. Keep it difficulty 1 at U9.

## Citations
- Hockey Canada LTPD — support layers and off-puck movement in the development model.
- IIHF small-area-games research — support and decision load in 2v2/3v3.
- Pond / small-area — positionless read-and-react support.
```

- [ ] **Step 4: Write the sources README**

Create `docs/library/sources/README.md`:

```markdown
# Source corpus

Raw authority lives here (PDFs, saved articles, research) consolidated from Notion
and scattered disk folders. Each `docs/library/<concept>.md` note cites items here
by filename or URL.

## To add a source
1. Drop the PDF / saved article into this folder with a descriptive kebab-case name
   (e.g. `swedish-scanning-study-2024.pdf`, `hockey-canada-ltpd-skills-matrix.pdf`).
2. Reference it in the relevant concept note's **Citations** section.

## Consolidation checklist (one-time)
- [ ] Export the Notion hockey-research pile to this folder.
- [ ] Sweep disk (Downloads, OneDrive) for hockey curriculum PDFs and move copies here.
- [ ] For each concept used in the v1 batch, confirm its note cites at least one item here or a stable URL.
```

- [ ] **Step 5: Write the index**

Create `docs/library/INDEX.md`:

```markdown
# Source library index

Concept notes that ground and cite RinkReads reads. Each shipped read's
`sourceRef.note` points at one of these by concept id.

| Concept id | Note | Used by ages |
|------------|------|--------------|
| scanning | [scanning.md](scanning.md) | U7, U9, U11 |
| off-puck-support-offense | [off-puck-support-offense.md](off-puck-support-offense.md) | U9, U11 |

> Add a row per concept as Task 5 introduces it. Raw sources live in [sources/](sources/).
```

- [ ] **Step 6: Commit**

```bash
git add docs/library
git commit -m "docs(library): source-of-truth scaffold + scanning + support notes"
```

---

## Task 4: Author the worked exemplar read (prove the loop)

This task ships ONE real read end-to-end so the loop is proven before fanning out. It uses the brief from Task 1's test, now as a real seed citing the library note.

**Files:**
- Create: `docs/ai-pipeline/_briefs-todo/u9_off-puck-support-offense_select_v1.json` (filled)
- Create (compiler output): `src/scenario/seeds/u9_off-puck-support-offense_select_v1.json`

- [ ] **Step 1: Write the filled brief**

Create `docs/ai-pipeline/_briefs-todo/u9_off-puck-support-offense_select_v1.json`:

```json
{
  "id": "u9_off-puck-support-offense_select_v1",
  "nodeId": "u9.off-puck-support-offense",
  "levels": ["U9 / Novice"],
  "cat": "Offensive Play",
  "themes": ["puck-support", "decision-making"],
  "difficulty": 1,
  "primitive": "selection",
  "view": "right",
  "zone": "off-zone",
  "sourceRef": { "note": "off-puck-support-offense", "cite": "Hockey Canada LTPD; IIHF SAG" },
  "actors": [
    { "id": "you", "kind": "player",   "x": 0.80, "y": 0.50, "tag": "YOU" },
    { "id": "puck", "kind": "puck",    "with": "you" },
    { "id": "t1",  "kind": "teammate", "x": 0.90, "y": 0.30 },
    { "id": "t2",  "kind": "teammate", "x": 0.90, "y": 0.74 },
    { "id": "x1",  "kind": "defender", "x": 0.86, "y": 0.64 }
  ],
  "from": ["t1", "t2"],
  "correct": { "ids": ["t1"] },
  "prompt": "You have the puck in the offensive zone. Tap the teammate who is open and in a good spot to support you.",
  "feedback": {
    "right": "The teammate up the open side has clear ice and a clean passing lane. That is real support.",
    "wrong": "That teammate is covered. A defender is right on top of that lane, so closest is not the same as open."
  },
  "tip": "Support means open ice and a clean lane, not just the nearest jersey.",
  "why": "Good off-puck support gives the carrier a passing option the defense cannot take away."
}
```

- [ ] **Step 2: Compile it (this also validates)**

Run: `node scripts/brief-to-seed.mjs docs/ai-pipeline/_briefs-todo/u9_off-puck-support-offense_select_v1.json`
Expected: `OK   u9_off-puck-support-offense_select_v1  → src/scenario/seeds/u9_off-puck-support-offense_select_v1.json`
If instead it prints `FAIL` and parks the seed in `docs/ai-pipeline/_needs-fixing/`, read the `err:` lines, adjust actor coords in the brief (keep every pair of skaters >=0.10 apart on one axis; keep all x>=0.45 for the right view), and re-run until OK.

- [ ] **Step 3: Confirm the ship gate passes**

Run: `node scripts/verify-batch.mjs src/scenario/seeds/u9_off-puck-support-offense_select_v1.json`
Expected: `OK   u9_off-puck-support-offense_select_v1` then `── 1/1 OK` (exit 0). This confirms both lint and the citation requirement pass on a real shipped seed.

- [ ] **Step 4: Sanity-check it renders in the app (optional but recommended)**

Run: `npm run dev`, open the app, and confirm the new U9 read appears and the correct tap (the wide RW) grades right. Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add docs/ai-pipeline/_briefs-todo/u9_off-puck-support-offense_select_v1.json src/scenario/seeds/u9_off-puck-support-offense_select_v1.json
git commit -m "content(u9): off-puck support exemplar read (proves the loop)"
```

---

## Task 5: Produce the v1 batch (~36 reads)

The loop from Task 4 is now proven. This task repeats it across the target table, each read grounded in a library note and carrying a `sourceRef`. Author in small commits (a few reads at a time), not one giant commit.

**Target table (~36, weighted to U11; Stream-1 objective concepts only):**

| Age | Concepts (count) | Subtotal |
|-----|------------------|----------|
| U11 | scanning(2), reading-the-play(2), decision-making(2), time-and-space(1), off-puck-support-offense(2), odd-man-reads(2), gap-control(1), defensive-side-positioning(1), zone-entry(1), passing(1), receiving(1) | 16 |
| U9  | scanning(2), off-puck-support-offense(2), reading-the-play(1), decision-making(1), time-and-space(1), defensive-side-positioning(1), angling-steering(1), passing(1), receiving(1), puck-protection(1) | 12 |
| U7  | scanning(2), reading-the-play(1), decision-making(1), time-and-space(1), passing(1), receiving(1), puck-control(1) | 8 |

Excluded from v1 (judgment / Stream-2, per spec): `attacking-1v1`, `creativity-under-pressure`, `puck-carrier-options`, `cycle-and-possession`. If a read for an included concept cannot be made objective (more than one defensible answer), do NOT force it. Move that brief to `docs/ai-pipeline/_briefs-todo/_stream2/` and log it; it becomes input to the future judgment-panel spec.

**Per-read loop (repeat for each row in the table):**

- [ ] **Step A: Ensure a library note exists for the concept.** If `docs/library/<concept-id>.md` is missing, create it from `docs/library/_TEMPLATE.md`, filling Definition + lineage from `src/data/curriculum-ledger.json` (the concept's `definition`, `readConnection`, and `lineage`), and add a row to `docs/library/INDEX.md`.

- [ ] **Step B: Write the brief.** Copy the matching skeleton from `docs/ai-pipeline/_briefs-todo/<age>_<concept>_point_v1.json` (or start from Task 4's brief for `selection`). Choose the primitive that fits the read (`selection` = tap the teammate; `point` = tap open ice / unseen pressure; `path` = draw the pass/route). Place actors so there is exactly one `player`, a correct option, and at least one tempting-but-wrong option per the note's "Authoring notes". Set `sourceRef` to `{ note: "<concept-id>", cite: "<authority from the note>" }`. Give the id the form `<age>_<concept>_<primitive>_vN`.

- [ ] **Step C: Compile + validate.** Run `node scripts/brief-to-seed.mjs <brief-path>`. Fix `err:` lines until it prints `OK` and writes to `src/scenario/seeds/`. (Geometry cheat from the new-scenario skill: a lane A->B "hits" a defender within 0.035 of segment AB; keep the correct lane clear, block the decoy lane.)

- [ ] **Step D: Commit in small batches** (e.g. after every 3-5 reads):

```bash
git add docs/ai-pipeline/_briefs-todo docs/library src/scenario/seeds
git commit -m "content(<age>): <concept> reads (N of 36)"
```

- [ ] **Step E: Gate the whole batch.** Once the set is authored:

Run: `node scripts/verify-batch.mjs --dir src/scenario/seeds`
Expected: every v1 read prints `OK`; final line shows `N/N OK` (exit 0). Fix any `FAIL` before proceeding. (Pre-existing seeds without `sourceRef` will report `missing sourceRef`; if that is noisy, run verify-batch against an explicit list of just the v1 ids instead of `--dir`.)

- [ ] **Step F: Owner spot-check (20% sample).** List the v1 ids, take a 20% sample (~7 reads spanning all three ages), and the owner confirms each keyed answer is the genuinely-best read. Log agreement. Target >=90% agreement; revise or retire any the owner rejects, then re-run Step E.

- [ ] **Step G: Final commit**

```bash
git add -A
git commit -m "content: v1 young-age Stream-1 batch verified + spot-checked"
```

---

## Definition of done (maps to spec section 9)

- [ ] ~36 verified Stream-1 reads shipped across U7/U9/U11, each carrying a `sourceRef`.
- [ ] `node scripts/verify-batch.mjs` over the v1 ids exits 0 (lint + citation pass for every read).
- [ ] Owner spot-check agreement on the 20% sample is >=90%; rejects revised or retired.
- [ ] `docs/library/` covers every concept used in the batch; each note cited; `sources/` consolidation checklist done.
- [ ] No judgment-ambiguous read shipped as single-answer (ambiguous briefs parked under `_stream2/`).
- [ ] `node --test scripts/test-sourceref.mjs` and `node --test scripts/test-verify-batch.mjs` both pass.

## Out of scope (later specs, per spec section 11)

App-shell launch loop (Daily Read UI, onboarding, "why" card surface, share),
Stream-2 judgment panel, U13+, paid-coach pipeline, the skill-transfer rating loop.
