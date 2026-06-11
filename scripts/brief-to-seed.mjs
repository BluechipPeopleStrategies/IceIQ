// brief-to-seed.mjs — compile a Scenario Brief (authored by Gemini/ChatGPT,
// no coordinates) into a validated unified-engine seed. The point: keep Claude
// out of the loop for geometry questions. The brief carries every TEXT field +
// each actor's ZONE (by name); this script resolves zones to coords, spreads
// overlapping actors, auto-fills the difficulty floor + goalie, writes the seed,
// and runs the real validator. If it prints OK, no Claude tokens were spent.
//
// Usage:  node scripts/brief-to-seed.mjs <brief.json> [--out src/scenario/seeds]
//
// Brief shape (see docs/ai-pipeline/START-HERE.md "PROMPT C"):
// {
//   id, nodeId, level | levels:[...], difficulty, cat, themes:[...],
//   primitive: "point"|"path"|"selection"|"sequence",
//   verb,                       // path only: skate|carry|pass|shoot|screen|check|backcheck
//   view: "left"|"right"|"neutral",  zone: "off-zone"|"def-zone"|"neutral",
//   scanWindow?: { showMs, hideKinds:[...] },  timer?, preview?,
//   actors: [ { id, kind, at:"<zoneId>" | x,y, tag?, with?:"<carrierId>" } ],
//   correct: { at:"<zoneId>" | x,y }  |  { ids:[...] },   // match primitive
//   from?: [ids],               // selection/sequence candidates
//   prompt, feedback:{right,wrong}, tip, why
// }

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { ZONES } from "../src/scenario/zones.js";
import { lintScenario } from "../tools/scenario-author/validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Compile one parsed brief object into a validated seed. Returns
// { seed, lint }. Pure (no I/O) so the single-file and --dir paths share it.
function compileBrief(brief) {
// ── view x-range (mirrors validator on-stage rule) + clamp helpers
const VIEW_X = { right: [0.45, 0.99], left: [0.01, 0.55], neutral: [0.30, 0.70] };
const view = brief.view || "right";
const [XMIN, XMAX] = VIEW_X[view] || VIEW_X.right;
const clampX = (x) => Math.min(XMAX, Math.max(XMIN, x));
const clampY = (y) => Math.min(0.95, Math.max(0.05, y));

function coordOf(a) {
  if (typeof a.x === "number" && typeof a.y === "number") return { x: a.x, y: a.y };
  if (a.at) {
    const z = ZONES[a.at];
    if (!z) throw new Error(`actor "${a.id}": unknown zone "${a.at}" (see src/scenario/zones.js)`);
    return { x: z.x, y: z.y };
  }
  throw new Error(`actor "${a.id}": needs either {x,y} or {at:"<zoneId>"}`);
}

// ── 1. place actors (skip puck for now; it rides its carrier)
const actors = [];
let puckBrief = null;
for (const a of brief.actors) {
  if (a.kind === "puck") { puckBrief = a; continue; }
  const c = coordOf(a);
  actors.push({ id: a.id, kind: a.kind, x: clampX(c.x), y: clampY(c.y), ...(a.tag ? { tag: a.tag } : {}) });
}

// ── 2. auto-add goalie if the zone requires one and none supplied
const needsGoalie = brief.zone === "off-zone" || brief.zone === "def-zone";
if (needsGoalie && !actors.some((a) => a.kind === "goalie")) {
  const gx = view === "left" ? 0.082 : 0.918;
  actors.push({ id: "g", kind: "goalie", x: clampX(gx), y: 0.5 });
}

// ── 3. spread overlaps: validator fails any pair within 0.05 on BOTH axes.
//     Nudge the later actor along y (then x) until clear. Goalie nudges last.
function overlaps(p, q) { return Math.abs(p.x - q.x) < 0.06 && Math.abs(p.y - q.y) < 0.06; }
for (let i = 0; i < actors.length; i++) {
  for (let j = 0; j < i; j++) {
    let tries = 0;
    while (overlaps(actors[i], actors[j]) && tries < 24) {
      const dir = actors[i].y >= actors[j].y ? 1 : -1;
      const ny = clampY(actors[i].y + dir * 0.07);
      if (ny === actors[i].y) { // y maxed out → shove x
        const dx = actors[i].x >= actors[j].x ? 1 : -1;
        actors[i].x = clampX(actors[i].x + dx * 0.07);
      } else actors[i].y = ny;
      tries++;
    }
  }
}

// ── 4. puck rides its carrier (or its own coords)
let puck = null;
if (puckBrief) {
  if (puckBrief.with) {
    const carrier = actors.find((a) => a.id === puckBrief.with);
    if (!carrier) throw new Error(`puck "with":"${puckBrief.with}" — no such actor`);
    puck = { id: puckBrief.id || "puck", kind: "puck", x: +(carrier.x + 0.002).toFixed(3), y: +(carrier.y - 0.002).toFixed(3) };
  } else {
    const c = coordOf(puckBrief);
    puck = { id: puckBrief.id || "puck", kind: "puck", x: clampX(c.x), y: clampY(c.y) };
  }
}
const allActors = puck ? [...actors.slice(0, 1), puck, ...actors.slice(1)] : actors;

// ── 5. difficulty floor (mirror validator: skaters = non-puck actors)
const skaters = allActors.filter((a) => a.kind !== "puck").length;
let floor = 0;
if (skaters >= 9) floor = 3; else if (skaters >= 7) floor = 2;
if (brief.scanWindow) floor = Math.max(floor, 3);
if (brief.timer) floor = Math.max(floor, 2);
if (brief.preview && (brief.timer || brief.scanWindow)) floor = Math.max(floor, 3);
const difficulty = Math.max(brief.difficulty || 1, floor || 1);
if (difficulty !== (brief.difficulty || 1)) console.log(`  note: bumped difficulty ${brief.difficulty || 1} → ${difficulty} (complexity floor)`);

// ── 6. interaction + correct, keyed by primitive
const player = allActors.find((a) => a.kind === "player");
if (!player) throw new Error("brief has no actor with kind:\"player\" (the YOU)");
const prim = brief.primitive;
const target = (t) => (t.at ? { zoneId: t.at } : { x: t.x, y: t.y });

let interaction, correct;
if (prim === "point") {
  interaction = { kind: "point", prompt: brief.prompt };
  correct = { kind: "point", ...target(brief.correct) };
} else if (prim === "path") {
  interaction = { kind: "path", verb: brief.verb, from: player.id, prompt: brief.prompt };
  correct = { kind: "path", end: target(brief.correct), ...(brief.correct.waypoints ? { waypoints: brief.correct.waypoints } : {}) };
} else if (prim === "selection") {
  interaction = { kind: "selection", from: brief.from, order: brief.order || "any", prompt: brief.prompt };
  correct = { kind: "selection", ids: brief.correct.ids };
} else if (prim === "sequence") {
  interaction = { kind: "sequence", from: brief.from, prompt: brief.prompt };
  correct = { kind: "sequence", ids: brief.correct.ids };
} else if (prim === "place") {
  // brief.placements: [{ id, at:"<zoneId>" | x,y, tolerance? }]
  interaction = { kind: "place", items: brief.items, prompt: brief.prompt, ...(brief.showTargets ? { showTargets: true } : {}) };
  correct = { kind: "place", placements: (brief.placements || []).map((p) => ({ id: p.id, ...target(p), ...(p.tolerance != null ? { tolerance: p.tolerance } : {}) })) };
} else {
  throw new Error(`unknown primitive "${prim}"`);
}

// ── 7. assemble
const seed = {
  id: brief.id,
  type: "scenario",
  ...(brief.nodeId ? { nodeId: brief.nodeId } : {}),
  ...(brief.levels ? { levels: brief.levels } : { level: brief.level }),
  ...(brief.themes ? { themes: brief.themes } : {}),
  cat: brief.cat,
  difficulty,
  stage: { view, zone: brief.zone },
  ...(brief.scanWindow ? { scanWindow: brief.scanWindow } : {}),
  ...(brief.timer ? { timer: brief.timer } : {}),
  ...(brief.preview ? { preview: brief.preview } : {}),
  ...(brief.mc ? { mc: brief.mc } : {}),
  actors: allActors,
  interaction,
  correct,
  feedback: brief.feedback,
  ...(brief.tip ? { tip: brief.tip } : {}),
  ...(brief.why ? { why: brief.why } : {}),
};

  // ── 8. validate (the real linter)
  return { seed, lint: lintScenario(seed) };
}

const rel = (p) => p.replace(ROOT + "\\", "").replace(ROOT + "/", "");

// Compile one brief file → write seed (OK to outDir, FAIL to _needs-fixing/).
// Returns true on OK. Prints a compact per-brief report.
function runOne(briefPath, outDir, fixDir) {
  let brief;
  try {
    brief = JSON.parse(readFileSync(briefPath, "utf8"));
  } catch (e) {
    console.error(`FAIL ${basename(briefPath)} — invalid JSON: ${e.message}`);
    return false;
  }
  let result;
  try {
    result = compileBrief(brief);
  } catch (e) {
    console.error(`FAIL ${brief.id || basename(briefPath)} — ${e.message}`);
    return false;
  }
  const { seed, lint } = result;
  for (const w of lint.warns || []) console.log(`  warn: ${w}`);
  if (lint.ok) {
    const outPath = join(outDir, `${brief.id}.json`);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(outPath, JSON.stringify(seed, null, 2) + "\n", "utf8");
    console.log(`OK   ${brief.id}  → ${rel(outPath)}`);
    return true;
  }
  // FAIL: still write the seed to a _needs-fixing bucket so nothing is lost.
  if (!existsSync(fixDir)) mkdirSync(fixDir, { recursive: true });
  const fixPath = join(fixDir, `${brief.id}.json`);
  writeFileSync(fixPath, JSON.stringify(seed, null, 2) + "\n", "utf8");
  for (const e of lint.errs || []) console.error(`  err:  ${e}`);
  console.error(`FAIL ${brief.id} — seed parked at ${rel(fixPath)} (fix coords above).`);
  return false;
}

// ── CLI
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const fixDir = join(ROOT, "docs", "ai-pipeline", "_needs-fixing");
const dirIdx = args.indexOf("--dir");
// Batch mode stages OK seeds in a PENDING dir (human review gate sits before the
// bank); single-file mode writes straight to seeds/ for the manual path. An
// explicit --out overrides either default.
const defaultOut = dirIdx > -1
  ? join(ROOT, "docs", "ai-pipeline", "_pending-seeds")
  : join(ROOT, "src", "scenario", "seeds");
const outDir = outIdx > -1 ? args[outIdx + 1] : defaultOut;

if (dirIdx > -1) {
  // Batch mode: compile every *.json brief in a folder, print a pass/fail table.
  const inDir = args[dirIdx + 1];
  if (!inDir) { console.error("usage: --dir <folder> [--out <dir>]"); process.exit(2); }
  const files = readdirSync(inDir).filter((f) => f.endsWith(".json")).sort();
  if (!files.length) { console.error(`no .json briefs in ${inDir}`); process.exit(2); }
  let ok = 0;
  for (const f of files) {
    if (runOne(join(inDir, f), outDir, fixDir)) ok++;
  }
  console.log(`\n── ${ok}/${files.length} OK · ${files.length - ok} need fixing (parked in ${rel(fixDir)})`);
  process.exit(ok === files.length ? 0 : 1);
}

// Single-file mode (unchanged contract).
const briefPath = args[0];
if (!briefPath || briefPath.startsWith("--")) {
  console.error("usage: node scripts/brief-to-seed.mjs <brief.json> [--out <dir>]");
  console.error("       node scripts/brief-to-seed.mjs --dir <folder> [--out <dir>]");
  process.exit(2);
}
process.exit(runOne(briefPath, outDir, fixDir) ? 0 : 1);
