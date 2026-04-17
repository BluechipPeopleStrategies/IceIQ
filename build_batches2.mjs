import { readFileSync, writeFileSync } from "fs";
import QB from "./src/data/questions.json" assert { type: "json" };

const TOLERANCE = 15;
const byLevel = {};
for (const lvl of Object.keys(QB)) byLevel[lvl] = [];

for (const [lvl, qs] of Object.entries(QB)) {
  for (const q of qs) {
    if (!q || !q.opts || q.opts.length !== 4) continue;
    const correctLen = q.opts[q.ok].length;
    const needsWork = q.opts.some((o, i) => i !== q.ok && Math.abs(o.length - correctLen) > TOLERANCE);
    if (needsWork) {
      byLevel[lvl].push({ id: q.id, ok: q.ok, sit: q.sit, opts: q.opts, correctLen, lens: q.opts.map(o => o.length) });
    }
  }
}

function split(arr, n) {
  const size = Math.ceil(arr.length / n);
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const batches = [
  { label: "u7",     items: byLevel["U7 / Initiation"], n: 1 },
  { label: "u9",     items: byLevel["U9 / Novice"],     n: 3 },
  { label: "u11",    items: byLevel["U11 / Atom"],      n: 4 },
  { label: "u13",    items: byLevel["U13 / Peewee"],    n: 1 },
  { label: "u15_18", items: [...byLevel["U15 / Bantam"], ...byLevel["U18 / Midget"]], n: 1 },
];

let totalCount = 0;
for (const b of batches) {
  const chunks = split(b.items, b.n);
  for (let i = 0; i < chunks.length; i++) {
    const name = `batch2_${b.label}_${i+1}.json`;
    writeFileSync(`./${name}`, JSON.stringify(chunks[i], null, 2));
    console.log(`${name}: ${chunks[i].length} questions`);
    totalCount += chunks[i].length;
  }
}
console.log(`\nTotal: ${totalCount} questions across ${batches.reduce((s,b) => s+b.n, 0)} batch files`);
