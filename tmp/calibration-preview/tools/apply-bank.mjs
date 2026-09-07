#!/usr/bin/env node
// Replace src/data/questions.json with a dashboard-exported questions.json.
// Usage:
//   node tools/apply-bank.mjs                     # auto-pick newest in ~/Downloads
//   node tools/apply-bank.mjs <path>              # explicit path
//   add --apply to actually write (default is dry-run with a diff summary)

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const BANK = path.resolve("src/data/questions.json");
const APPLY = process.argv.includes("--apply");
const argPath = process.argv.slice(2).find(a => !a.startsWith("--"));

function findNewestExport() {
  const downloads = path.join(os.homedir(), "Downloads");
  if (!fs.existsSync(downloads)) return null;
  const files = fs.readdirSync(downloads)
    .filter(f => /^questions.*\.json$/i.test(f))
    .map(f => {
      const p = path.join(downloads, f);
      return { p, mtime: fs.statSync(p).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.p || null;
}

const src = argPath ? path.resolve(argPath) : findNewestExport();
if (!src) {
  console.error("No source file given and no questions*.json found in ~/Downloads.");
  process.exit(1);
}
if (!fs.existsSync(src)) {
  console.error(`Source file not found: ${src}`);
  process.exit(1);
}

const incomingRaw = fs.readFileSync(src, "utf8");
let incoming;
try { incoming = JSON.parse(incomingRaw); }
catch (e) { console.error(`Source is not valid JSON: ${e.message}`); process.exit(1); }

const current = JSON.parse(fs.readFileSync(BANK, "utf8"));

// Build a per-id summary of adds / removes / edits.
function flatten(bank) {
  const map = new Map();
  for (const lvl of Object.keys(bank)) {
    for (const q of bank[lvl] || []) {
      if (q && q.id) map.set(q.id, { lvl, q });
    }
  }
  return map;
}
const a = flatten(current);
const b = flatten(incoming);

const added = [];
const removed = [];
const edited = [];
for (const [id, { q: bq, lvl: bLvl }] of b) {
  const av = a.get(id);
  if (!av) { added.push({ id, lvl: bLvl }); continue; }
  if (JSON.stringify(av.q) !== JSON.stringify(bq)) {
    edited.push({ id, lvl: bLvl, fromLvl: av.lvl });
  }
}
for (const [id, { lvl }] of a) {
  if (!b.has(id)) removed.push({ id, lvl });
}

console.log(`Source: ${src}`);
console.log(`  +${added.length} added · -${removed.length} removed · ~${edited.length} edited`);
if (added.length) console.log(`  added: ${added.slice(0, 10).map(x => x.id).join(", ")}${added.length > 10 ? `, … (${added.length - 10} more)` : ""}`);
if (removed.length) console.log(`  removed: ${removed.slice(0, 10).map(x => x.id).join(", ")}${removed.length > 10 ? `, … (${removed.length - 10} more)` : ""}`);
if (edited.length) console.log(`  edited: ${edited.slice(0, 10).map(x => x.id).join(", ")}${edited.length > 10 ? `, … (${edited.length - 10} more)` : ""}`);

if (added.length + removed.length + edited.length === 0) {
  console.log("No differences. Nothing to apply.");
  process.exit(0);
}

if (!APPLY) {
  console.log("\nDRY RUN — pass --apply to write src/data/questions.json.");
  process.exit(0);
}

fs.writeFileSync(BANK, JSON.stringify(incoming, null, 2) + "\n", "utf8");
console.log(`\nWrote ${BANK}.`);
console.log(`Next: npm run preflight && npm run build, then git commit + push.`);
