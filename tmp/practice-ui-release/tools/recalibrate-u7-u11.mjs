// Curriculum recalibration for U7-U11:
//   1. Add "C" (Center) marker to pos arrays on every U7/U9/U11 question.
//      Final shape: ["F","C","D","G"]. F kept so the existing position
//      filter (Forward→F) keeps matching; C added so the data signals the
//      U7-U11 curriculum reality (kids rotate through Center, not winger
//      specialization).
//   2. Drop "U7 / Initiation" from u7-breakout-001's primary level + levels[]
//      so it only lives in U9. The question stays in the bank (it's
//      developmentally fine at U9), it just isn't sourced for U7 quizzes.
//
// Ground rule: do not modify any other field — sit, q, opts, ok, why, tip,
// cat, archetype, concepts, type, d, levels (other than dropping U7),
// _imageFilename, media stay exactly as they are.
//
// Idempotent. Safe to re-run.
//
// Usage:
//   node tools/recalibrate-u7-u11.mjs            # dry run
//   node tools/recalibrate-u7-u11.mjs --apply    # write

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS = resolve(__dirname, '..', 'src/data/questions.json');
const APPLY = process.argv.includes('--apply');

const TARGET_LEVELS = new Set(['U7 / Initiation', 'U9 / Novice', 'U11 / Atom']);
const U7 = 'U7 / Initiation';
const U9 = 'U9 / Novice';
const C_TAG = 'C';
const F_TAG = 'F';
const REMOVE_FROM_U7_IDS = new Set(['u7-breakout-001']);

const bank = JSON.parse(readFileSync(QUESTIONS, 'utf8'));

// Stage 1: counts before
let posBefore = 0, posAdded = 0, breakoutMoved = 0;
for (const lvl in bank) for (const q of bank[lvl]) {
  if (Array.isArray(q.pos) && q.pos.includes(C_TAG)) posBefore++;
}

// Stage 2: drop U7 from u7-breakout-001 — pull the row out of the U7 array,
// strip "U7 / Initiation" from its levels[], and re-key it under U9 if no
// U9 primary already exists. qbLoader fan-out works off whatever level a
// question is primary-keyed under, so without re-keying the question would
// disappear entirely.
const u7Arr = bank[U7] || [];
const survivors = [];
const movedQs = [];
for (const q of u7Arr) {
  if (REMOVE_FROM_U7_IDS.has(q.id)) {
    movedQs.push(q);
    continue;
  }
  survivors.push(q);
}
bank[U7] = survivors;
breakoutMoved = movedQs.length;

// Re-key each moved question under U9 (or update an existing U9 primary
// copy's levels[] to drop U7).
if (!Array.isArray(bank[U9])) bank[U9] = [];
for (const q of movedQs) {
  if (Array.isArray(q.levels)) {
    q.levels = q.levels.filter((L) => L !== U7);
    if (!q.levels.length) delete q.levels;
  }
  const existing = bank[U9].find((x) => x.id === q.id);
  if (existing) {
    if (Array.isArray(existing.levels)) {
      existing.levels = existing.levels.filter((L) => L !== U7);
      if (!existing.levels.length) delete existing.levels;
    }
  } else {
    bank[U9].push(q);
  }
}

const stillExists = Object.entries(bank).some(([lvl, arr]) =>
  arr.some((q) => REMOVE_FROM_U7_IDS.has(q.id))
);

// Stage 3: add C to pos[] on all U7/U9/U11 questions (primary-level keyed).
// Other-level rows that have these levels via levels[] aren't touched here
// — but qbLoader fan-out works off the primary copy, so the C tag still
// reaches every render path.
for (const lvl of TARGET_LEVELS) {
  for (const q of (bank[lvl] || [])) {
    if (!Array.isArray(q.pos)) q.pos = [F_TAG, 'D', 'G'];   // safety default
    if (!q.pos.includes(C_TAG)) {
      // Insert C right after F to keep the canonical order [F, C, D, G].
      const fIdx = q.pos.indexOf(F_TAG);
      if (fIdx >= 0) q.pos.splice(fIdx + 1, 0, C_TAG);
      else q.pos.unshift(C_TAG);
      posAdded++;
    }
  }
}

let posAfter = 0;
for (const lvl in bank) for (const q of bank[lvl]) {
  if (Array.isArray(q.pos) && q.pos.includes(C_TAG)) posAfter++;
}

console.log('--- Recalibration report ---');
console.log(`U7-U11 questions tagged with C: ${posBefore} -> ${posAfter} (+${posAdded})`);
console.log(`u7-breakout-001 removed from U7: ${breakoutMoved} row(s)`);
console.log(`  - Still in bank (other levels)? ${stillExists ? 'yes' : 'no'}`);
console.log(`Total bank size:`, Object.values(bank).reduce((n, a) => n + a.length, 0));
console.log();

if (!APPLY) {
  console.log('(dry run — pass --apply to write)');
  process.exit(0);
}

const backup = `${QUESTIONS}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
copyFileSync(QUESTIONS, backup);
console.log('Backup ->', backup);

writeFileSync(QUESTIONS, JSON.stringify(bank, null, 2) + '\n');
console.log('Wrote', QUESTIONS);
