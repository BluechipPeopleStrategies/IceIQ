// One-shot: set pos = ['F', 'D', 'G'] on every U7 / U9 / U11 question across
// the bank files. Universal pos at the lower ages because the curriculum is
// fundamentals (eyes up, anticipation, etc.) — applies to every position.
// Older ages keep their existing pos so position-specific tactical reads
// (D-zone gap control, forward forecheck angles, goalie crease management)
// stay routed correctly.
//
// Usage:
//   node tools/set-young-pos-fdg.mjs                 # dry-run report
//   node tools/set-young-pos-fdg.mjs --apply         # rewrite the files
//   node tools/set-young-pos-fdg.mjs --apply --target legacy

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const TARGET = args.indexOf('--target') >= 0 ? args[args.indexOf('--target') + 1] : 'all';

const FILES = TARGET === 'all'
  ? ['src/data/questions.json', 'src/data/questions.legacy-candidates.json', 'src/data/questions.legacy.json']
  : TARGET === 'live'
    ? ['src/data/questions.json']
    : TARGET === 'candidates'
      ? ['src/data/questions.legacy-candidates.json']
      : TARGET === 'legacy'
        ? ['src/data/questions.legacy.json']
        : [`src/data/questions.${TARGET}.json`];

const YOUNG_AGES = new Set(['U7 / Initiation', 'U9 / Novice', 'U11 / Atom']);
const TARGET_POS = ['F', 'D', 'G'];

let totalScanned = 0;
let totalChanged = 0;
const summary = [];

for (const rel of FILES) {
  const p = resolve(root, rel);
  let bank;
  try { bank = JSON.parse(readFileSync(p, 'utf-8')); }
  catch (e) { console.warn(`skip ${rel}: ${e.message}`); continue; }

  let scanned = 0, changed = 0;
  for (const [age, arr] of Object.entries(bank)) {
    if (!Array.isArray(arr)) continue;
    if (!YOUNG_AGES.has(age) && !age.match(/^U(7|9|11)/)) {
      // questions whose levels[] include young ages but live in older
      // top-level buckets — handle via the levels[] check below.
    }
    for (const q of arr) {
      const inYoungBucket = YOUNG_AGES.has(age);
      const levels = Array.isArray(q.levels) ? q.levels : [];
      const youngByLevels = levels.some((L) => YOUNG_AGES.has(L));
      const young = inYoungBucket || youngByLevels;
      if (!young) continue;
      scanned++;
      const cur = Array.isArray(q.pos) ? [...q.pos].sort().join(',') : '';
      const want = [...TARGET_POS].sort().join(',');
      if (cur !== want) {
        q.pos = [...TARGET_POS];
        changed++;
      }
    }
  }
  totalScanned += scanned;
  totalChanged += changed;
  summary.push(`  ${rel}: scanned ${scanned} young-age questions, changed ${changed}`);

  if (APPLY) writeFileSync(p, JSON.stringify(bank, null, 2) + '\n');
}

console.log(APPLY ? '✓ APPLIED' : '(dry-run — re-run with --apply to write)');
summary.forEach((s) => console.log(s));
console.log(`Total: scanned ${totalScanned}, changed ${totalChanged}`);
