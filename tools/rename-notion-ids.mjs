// Rename Notion-coded question IDs (Q-{arch}-{nnn}-{suffix}[-U{age}])
// into the legacy-style age-first convention (u{age}_{arch}_{nnn}{suffix}).
// Also strips the dead-weight _notionPageId field on the same questions.
//
// Convention #3 (chosen 2026-05-02 after Notion was parked):
//   Q-2v1-001-A2-U7   -> u7_2v1_001a2
//   Q-2v1-002-A1-U11  -> u11_2v1_002a1
//   Q-bkwy-003-A      -> u{primary}_bkwy_003a   (primary = the level it's keyed under)
//   Q-breakout-001-C  -> u{primary}_breakout_001c
//
// Usage:
//   node tools/rename-notion-ids.mjs            # dry run, prints map
//   node tools/rename-notion-ids.mjs --apply    # writes questions.json

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS = resolve(__dirname, '..', 'src/data/questions.json');
const APPLY = process.argv.includes('--apply');

const LEVEL_TO_AGE = {
  'U7 / Initiation': 7,
  'U9 / Novice':     9,
  'U11 / Atom':     11,
  'U13 / Peewee':   13,
  'U15 / Bantam':   15,
  'U18 / Midget':   18,
};

const bank = JSON.parse(readFileSync(QUESTIONS, 'utf8'));

const renames = [];   // { from, to, primaryLevel }
const collisions = new Set();
const allIds = new Set();
for (const lvl in bank) for (const q of bank[lvl]) allIds.add(q.id);

for (const lvl in bank) {
  for (const q of bank[lvl]) {
    if (!/^Q-/.test(q.id)) continue;
    const m = q.id.match(/^Q-([a-zA-Z0-9]+)-(\d+)-([A-Za-z0-9]+)(?:-U(\d+))?$/);
    if (!m) {
      console.warn('UNMATCHED Q- shape, skipping:', q.id);
      continue;
    }
    const [, arch, nnn, suffix, ageOpt] = m;
    const age = ageOpt ? Number(ageOpt) : LEVEL_TO_AGE[lvl];
    if (!age) {
      console.warn('Could not derive age for', q.id, '(level=', lvl, ')');
      continue;
    }
    const newId = `u${age}_${arch.toLowerCase()}_${nnn}${suffix.toLowerCase()}`;
    if (allIds.has(newId) && newId !== q.id) {
      collisions.add(`${q.id} -> ${newId}`);
    }
    renames.push({ from: q.id, to: newId, level: lvl });
  }
}

console.log(`Found ${renames.length} Q- ids to rename.`);
if (collisions.size) {
  console.error('COLLISIONS (target id already exists):');
  for (const c of collisions) console.error(' ', c);
  process.exit(1);
}

console.log('\nSample mappings:');
for (const r of renames.slice(0, 8)) console.log(`  ${r.from}  ->  ${r.to}`);
console.log(`  ... ${Math.max(0, renames.length - 8)} more`);

if (!APPLY) {
  console.log('\n(dry run — pass --apply to write)');
  process.exit(0);
}

// Backup
const backup = `${QUESTIONS}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
copyFileSync(QUESTIONS, backup);
console.log('\nBackup ->', backup);

const renameMap = new Map(renames.map((r) => [r.from, r.to]));
let renamed = 0, stripped = 0;
for (const lvl in bank) {
  for (const q of bank[lvl]) {
    if (renameMap.has(q.id)) {
      q.id = renameMap.get(q.id);
      renamed++;
    }
    if ('_notionPageId' in q) {
      delete q._notionPageId;
      stripped++;
    }
    // _variantOf may also have referenced renamed IDs; remap if so.
    if (q._variantOf && renameMap.has(q._variantOf)) {
      q._variantOf = renameMap.get(q._variantOf);
    }
  }
}

writeFileSync(QUESTIONS, JSON.stringify(bank, null, 2) + '\n');
console.log(`Renamed ${renamed} ids, stripped ${stripped} _notionPageId fields.`);
console.log('Wrote', QUESTIONS);
