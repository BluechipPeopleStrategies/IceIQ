// Flag every question whose stem length falls outside its age-tiered target
// band. Sets _status: 'needs-work' so they cluster behind that filter chip
// in the author tool — manual review pass, no auto-rewriting.
//
// Targets (matches src/qualityLint.jsx in rinkreads-author):
//   U7:  8–18 words
//   U9:  10–22
//   U11: 12–30
//   U13: 12–35
//   U15+: 15–40
//
// "youngest age in levels[]" determines which band applies — design for the
// hardest reader who'll see this question.
//
// Usage:
//   node tools/flag-stem-length.mjs            # dry-run report
//   node tools/flag-stem-length.mjs --apply    # write _status: 'needs-work'

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = resolve(__dirname, '..', 'src/data/questions.json');
const APPLY = process.argv.includes('--apply');

const TARGETS = {
  'U7':  [5, 18],
  'U9':  [5, 22],
  'U11': [5, 30],
  'U13': [5, 35],
  'U15': [5, 40],
  'U18': [5, 40],
};
const ORDER = ['U7', 'U9', 'U11', 'U13', 'U15', 'U18'];

// Interactive types lean on the IMAGE for context, so their text stem is
// allowed to be much shorter. Skip the lower bound for these.
const INTERACTIVE_TYPES = new Set([
  'rink-label', 'rink-drag', 'rink-match',
  'hot-spots', 'zone-click', 'multi-tap',
  'sequence-rink', 'path-draw', 'lane-select',
  'drag-target', 'drag-place',
]);

const wordCount = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;

function targetFor(q, fallbackAge) {
  const levels = Array.isArray(q.levels) && q.levels.length ? q.levels : [fallbackAge];
  const shorts = levels.map((L) => (L || '').split(' ')[0]).filter((s) => TARGETS[s]);
  const youngest = shorts.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0];
  return TARGETS[youngest] || TARGETS.U18;
}

const bank = JSON.parse(readFileSync(path, 'utf-8'));

const flagged = { tooShort: [], tooLong: [] };
let total = 0, alreadyDone = 0, alreadyTagged = 0;

for (const [age, arr] of Object.entries(bank)) {
  if (!Array.isArray(arr)) continue;
  for (const q of arr) {
    const stem = (q.sit || q.q || '').trim();
    if (!stem) continue;
    total++;
    const w = wordCount(stem);
    const [min, max] = targetFor(q, age);
    const minEff = INTERACTIVE_TYPES.has(q.type) ? 4 : min;
    if (w >= minEff && w <= max) continue;
    // Don't blow away an existing 'done' tag — the author has already
    // signed off on it. They can override the lint.
    if (q._status === 'done') { alreadyDone++; continue; }
    if (q._status === 'needs-work') alreadyTagged++;
    const entry = { id: q.id, age: age.split(' ')[0], w, min: minEff, max, stem: stem.slice(0, 90) };
    if (w > max) flagged.tooLong.push(entry);
    else flagged.tooShort.push(entry);
    if (APPLY) q._status = 'needs-work';
  }
}

console.log(APPLY ? '✓ APPLIED — questions tagged with _status: \'needs-work\'' : '(dry-run — re-run with --apply to tag)');
console.log(`Scanned ${total} questions. ${flagged.tooLong.length + flagged.tooShort.length} out of range.`);
if (alreadyDone) console.log(`  (skipped ${alreadyDone} already marked done)`);
if (alreadyTagged) console.log(`  (${alreadyTagged} were already needs-work)`);
console.log();

console.log(`TOO LONG (${flagged.tooLong.length}):`);
flagged.tooLong.sort((a, b) => b.w - a.w).slice(0, 30).forEach((e) => {
  console.log(`  ${e.age.padEnd(4)} ${e.id.padEnd(40)} ${String(e.w).padStart(3)}w (>${e.max}) — "${e.stem}…"`);
});
if (flagged.tooLong.length > 30) console.log(`  …and ${flagged.tooLong.length - 30} more`);
console.log();

console.log(`TOO SHORT (${flagged.tooShort.length}):`);
flagged.tooShort.slice(0, 20).forEach((e) => {
  console.log(`  ${e.age.padEnd(4)} ${e.id.padEnd(40)} ${String(e.w).padStart(3)}w (<${e.min}) — "${e.stem}"`);
});

if (APPLY) {
  writeFileSync(path, JSON.stringify(bank, null, 2) + '\n');
  console.log(`\n✓ Wrote ${path}`);
}
