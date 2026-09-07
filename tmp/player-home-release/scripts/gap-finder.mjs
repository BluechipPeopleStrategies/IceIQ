// gap-finder.mjs — find under-covered curriculum nodes and emit pre-filled
// brief skeletons for the scenario-question factory.
//
// Usage: node scripts/gap-finder.mjs [--target N]   (default target = 2)
//
// Coverage = count of questions referencing each nodeId across bank.json
// (all age arrays) and src/scenario/seeds/*.json. Nodes with coverage < target
// get a brief skeleton in docs/ai-pipeline/_briefs-todo/ (valid input shape
// for scripts/brief-to-seed.mjs). Existing skeleton files are never overwritten.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- args ---
let target = 2;
const ti = process.argv.indexOf("--target");
if (ti !== -1) {
  target = Number(process.argv[ti + 1]);
  if (!Number.isFinite(target) || target < 1) {
    console.error("Invalid --target value");
    process.exit(1);
  }
}

// --- load data ---
const ledger = JSON.parse(readFileSync(join(ROOT, "src/data/curriculum-ledger.json"), "utf8"));
const bank = JSON.parse(readFileSync(join(ROOT, "src/data/bank.json"), "utf8"));

// ageId ("U13") -> full bank key ("U13 / Peewee")
const ageToLevel = {};
for (const key of Object.keys(bank)) {
  const ageId = key.split("/")[0].trim();
  ageToLevel[ageId] = key;
}

// conceptId -> { name, domainName }
const domainById = new Map(ledger.domains.map((d) => [d.id, d]));
const conceptById = new Map(ledger.concepts.map((c) => [c.id, c]));

// --- count coverage ---
const coverage = new Map(); // nodeId -> count
const bump = (nodeId) => {
  if (!nodeId) return;
  coverage.set(nodeId, (coverage.get(nodeId) || 0) + 1);
};

for (const arr of Object.values(bank)) {
  for (const q of arr) bump(q.nodeId);
}

const seedsDir = join(ROOT, "src/scenario/seeds");
if (existsSync(seedsDir)) {
  for (const f of readdirSync(seedsDir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const seed = JSON.parse(readFileSync(join(seedsDir, f), "utf8"));
      bump(seed.nodeId);
    } catch {
      console.warn(`warn: could not parse seed ${f}`);
    }
  }
}

// --- rank nodes, find gaps ---
const DEPTH_DIFF = { I: 1, D: 2, M: 2, R: 3 };
const DEPTH_ORDER = { I: 0, D: 1, M: 2, R: 3 };

const ranked = ledger.nodes
  .map((n) => ({ ...n, coverage: coverage.get(n.id) || 0 }))
  .sort(
    (a, b) =>
      a.coverage - b.coverage ||
      (DEPTH_ORDER[a.depth] ?? 9) - (DEPTH_ORDER[b.depth] ?? 9) ||
      a.id.localeCompare(b.id)
  );

const gaps = ranked.filter((n) => n.coverage < target);

// --- write skeletons ---
const outDir = join(ROOT, "docs/ai-pipeline/_briefs-todo");
mkdirSync(outDir, { recursive: true });

let written = 0;
let skipped = 0;
const rows = [];

for (const node of gaps) {
  const concept = conceptById.get(node.conceptId);
  const domain = concept ? domainById.get(concept.domainId) : null;
  const cat = domain?.name || concept?.name || node.conceptId;
  const level = ageToLevel[node.ageId];
  const briefId = `${node.ageId.toLowerCase()}_${node.conceptId}_point_v1`;
  const fileName = `${briefId}.json`;
  const filePath = join(outDir, fileName);

  rows.push({ node, fileName });

  if (existsSync(filePath)) {
    skipped++;
    continue;
  }

  const skeleton = {
    _skeleton: true,
    _instructions:
      "Pre-filled gap skeleton — fill actors, correct, prompt, feedback (right/wrong), tip, and why. " +
      "Place actors with at:\"<zoneId>\" using zone names from src/scenario/zones.js. " +
      "Then compile with: node scripts/brief-to-seed.mjs <this file>. " +
      "Adjust primitive/view/zone if the scenario calls for it; remove _skeleton/_instructions when done.",
    id: briefId,
    nodeId: node.id,
    levels: level ? [level] : [],
    cat,
    themes: [node.conceptId],
    difficulty: DEPTH_DIFF[node.depth] ?? 2,
    primitive: "point",
    view: "neutral",
    zone: "neutral",
    actors: [],
    correct: {},
    prompt: "",
    feedback: { right: "", wrong: "" },
    tip: "",
    why: "",
  };

  writeFileSync(filePath, JSON.stringify(skeleton, null, 2) + "\n", "utf8");
  written++;
}

// --- manifest ---
const lines = [
  "# Gap Finder — briefs todo",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `Total ledger nodes: ${ledger.nodes.length} · Target coverage: ${target} · Gaps: ${gaps.length} · Skeletons written: ${written} · Skipped (already exist): ${skipped}`,
  "",
  "| nodeId | ageId | conceptId | depth | coverage | skeleton |",
  "|---|---|---|---|---|---|",
  ...rows.map(
    ({ node, fileName }) =>
      `| ${node.id} | ${node.ageId} | ${node.conceptId} | ${node.depth} | ${node.coverage} | ${fileName} |`
  ),
  "",
];
writeFileSync(join(outDir, "_manifest.md"), lines.join("\n"), "utf8");

// --- summary ---
console.log(`gap-finder: ${ledger.nodes.length} ledger nodes, target ${target}`);
console.log(`  gaps found:        ${gaps.length}`);
console.log(`  skeletons written: ${written}`);
console.log(`  skipped existing:  ${skipped}`);
console.log(`  output dir:        ${outDir}`);
