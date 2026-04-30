// One-shot migration: collapse `pov-mc` into `mc`. After this runs, MC questions
// with a media.url render as image-backed; MC questions without one are
// text-only. Removes the artificial distinction between the two types.
//
// Usage:
//   node tools/migrate-pov-mc-to-mc.mjs            # dry-run report
//   node tools/migrate-pov-mc-to-mc.mjs --apply    # rewrite both files
//
// Files touched:
//   src/data/questions.json
//   src/data/questions.legacy-candidates.json

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const TARGETS = [
  'src/data/questions.json',
  'src/data/questions.legacy-candidates.json',
];
const APPLY = process.argv.includes('--apply');

let totalConverted = 0;
const summary = [];

for (const rel of TARGETS) {
  const p = resolve(root, rel);
  let bank;
  try { bank = JSON.parse(readFileSync(p, 'utf-8')); }
  catch (e) { console.warn(`skip ${rel}: ${e.message}`); continue; }

  let converted = 0, kept = 0;
  for (const arr of Object.values(bank)) {
    if (!Array.isArray(arr)) continue;
    for (const q of arr) {
      if (q && q.type === 'pov-mc') {
        q.type = 'mc';
        converted++;
      } else {
        kept++;
      }
    }
  }
  totalConverted += converted;
  summary.push(`  ${rel}: converted ${converted}, kept ${kept}`);

  if (APPLY) writeFileSync(p, JSON.stringify(bank, null, 2) + '\n');
}

console.log(APPLY ? '✓ APPLIED' : '(dry-run)');
console.log(summary.join('\n'));
console.log(`Total converted: ${totalConverted}`);
if (!APPLY) console.log('Re-run with --apply to write.');
