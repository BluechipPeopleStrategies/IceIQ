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
