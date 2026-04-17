import { readFileSync, writeFileSync, existsSync } from "fs";

const outputFiles = [
  "./output_u9_1.json", "./output_u9_2.json", "./output_u9_3.json",
  "./output_u11_1.json", "./output_u11_2.json", "./output_u11_3.json",
];
const candidates = JSON.parse(readFileSync("./candidates.json", "utf8"));

// Build lookup: id -> candidate input
const byId = {};
for (const lvl of Object.keys(candidates)) {
  for (const q of candidates[lvl]) byId[q.id] = q;
}

// Load rewrites
const rewrites = {};
let total = 0, missing = 0;
for (const f of outputFiles) {
  if (!existsSync(f)) { console.log(`MISSING: ${f}`); missing++; continue; }
  const arr = JSON.parse(readFileSync(f, "utf8"));
  for (const r of arr) {
    rewrites[r.id] = r.opts;
    total++;
  }
  console.log(`Loaded ${arr.length} from ${f}`);
}
console.log(`Total rewrites: ${total}, missing files: ${missing}`);

// Validate
let errs = 0;
for (const [id, newOpts] of Object.entries(rewrites)) {
  const input = byId[id];
  if (!input) { console.log(`ERR ${id}: not in candidates`); errs++; continue; }
  if (!Array.isArray(newOpts) || newOpts.length !== 4) { console.log(`ERR ${id}: not 4 opts`); errs++; continue; }
  const correct = input.opts[input.ok];
  const newCorrect = newOpts[input.ok];
  if (newCorrect !== correct) { console.log(`ERR ${id}: correct answer changed!`); errs++; continue; }
  // Length check
  const correctLen = correct.length;
  for (let i = 0; i < 4; i++) {
    if (i === input.ok) continue;
    const delta = Math.abs(newOpts[i].length - correctLen);
    if (delta > 25) console.log(`WARN ${id} opt#${i}: length diff ${delta} (correct=${correctLen}, new=${newOpts[i].length})`);
  }
  // Duplicate check
  const lc = newOpts.map(o => o.toLowerCase().trim());
  if (new Set(lc).size !== 4) console.log(`ERR ${id}: duplicate opts`);
}
console.log(`Validation errors: ${errs}`);

if (errs > 0 || missing > 0) { console.log("Aborting — fix errors first"); process.exit(1); }

// Apply to questionBank.js
let src = readFileSync("./src/questionBank.js", "utf8");
let applied = 0;
for (const [id, newOpts] of Object.entries(rewrites)) {
  const input = byId[id];
  const oldOptsStr = input.opts.map(o => JSON.stringify(o)).join(",");
  const newOptsStr = newOpts.map(o => JSON.stringify(o)).join(",");
  if (oldOptsStr === newOptsStr) continue; // no change
  if (!src.includes(oldOptsStr)) {
    console.log(`NOT FOUND IN SRC: ${id}`);
    continue;
  }
  src = src.replace(oldOptsStr, newOptsStr);
  applied++;
}
console.log(`Applied: ${applied}/${total}`);
writeFileSync("./src/questionBank.js", src);
