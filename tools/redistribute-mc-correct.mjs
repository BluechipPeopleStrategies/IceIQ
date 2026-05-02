// Redistribute correct-answer positions across MC questions so each position
// (A, B, C, D, ...) gets ~1/N of the correct answers, where N is the number
// of options. Removes positional bias ("the answer's always C") and stops
// answer-position tells from accumulating in the bank.
//
// How it works (per opts.length group):
//   1. Bucket all MC questions by N (most are 4-option, some are 2/3/5).
//   2. Within each bucket, count current distribution of `ok` indexes.
//   3. Build a target distribution of round(count/N) per position.
//   4. Greedy reassignment: for each question, permute its opts array so
//      the correct answer lands at the position currently most under-target.
//   5. (Optional, --shuffle-distractors) Full-shuffle distractors with a
//      seeded Fisher-Yates per question so authors who always write
//      "obvious-wrong → plausible → silly" don't accidentally teach kids
//      that ordering pattern. Seed = hash(question.id) so the result is
//      DETERMINISTIC — re-running on the same input produces the same
//      output, no diff churn.
//
// Per-question rewrite is mechanical — only the position of the correct
// answer changes; the answer text itself is untouched. `_correctAnswerText`
// (a sidecar field set by the legacy miner) is preserved for traceability.
//
// Usage:
//   node tools/redistribute-mc-correct.mjs                          # dry-run report
//   node tools/redistribute-mc-correct.mjs --apply                  # rewrite the file
//   node tools/redistribute-mc-correct.mjs --apply --shuffle-distractors  # also scramble distractor order
//   node tools/redistribute-mc-correct.mjs --target legacy          # default (questions.legacy.json)
//   node tools/redistribute-mc-correct.mjs --target candidates      # questions.legacy-candidates.json
//   node tools/redistribute-mc-correct.mjs --target live            # questions.json (the live bank)

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const APPLY = args.includes('--apply');
const SHUFFLE = args.includes('--shuffle-distractors');
const TARGET = flag('target', 'legacy');

// FNV-1a 32-bit hash + mulberry32 PRNG. Seeding by question id makes the
// distractor shuffle deterministic — same input → same output, so the
// rewrite is reproducible and re-runs are no-ops.
const hashStr = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const mulberry32 = (seed) => () => {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const seededShuffle = (arr, seedKey) => {
  const rng = mulberry32(hashStr(seedKey));
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const TARGETS = {
  legacy: 'src/data/questions.legacy.json',
  candidates: 'src/data/questions.legacy-candidates.json',
  live: 'src/data/questions.json',
};
const path = resolve(root, TARGETS[TARGET] || TARGETS.legacy);

const bank = JSON.parse(readFileSync(path, 'utf-8'));

// Collect every MC question with usable opts/ok.
const questions = [];
for (const [age, arr] of Object.entries(bank)) {
  if (!Array.isArray(arr)) continue;
  arr.forEach((q, idx) => {
    const t = q.type || 'mc';
    if (t !== 'mc') return;
    if (!Array.isArray(q.opts) || q.opts.length < 2) return;
    if (typeof q.ok !== 'number' || q.ok < 0 || q.ok >= q.opts.length) return;
    questions.push({ age, idx, q });
  });
}

const groupBy = (xs, keyFn) => xs.reduce((acc, x) => { (acc[keyFn(x)] ||= []).push(x); return acc; }, {});
const byLen = groupBy(questions, (e) => e.q.opts.length);

const fmtPct = (n, total) => total ? `${((n / total) * 100).toFixed(1)}%` : '0%';

const beforeReport = [];
const afterReport = [];

for (const [n, entries] of Object.entries(byLen).sort((a, b) => +b[0] - +a[0])) {
  const N = parseInt(n, 10);
  const total = entries.length;

  // Before
  const before = Array(N).fill(0);
  entries.forEach((e) => before[e.q.ok]++);
  const targetPer = Math.round(total / N);
  beforeReport.push({ N, total, before, targetPer });

  // Greedy reassignment.
  // Sort questions in stable, deterministic order so the reshuffle is
  // reproducible run-to-run (re-running shouldn't churn).
  entries.sort((a, b) => (a.q.id || '').localeCompare(b.q.id || ''));

  const remaining = Array(N).fill(targetPer);
  // Distribute the leftover (total mod N) by giving extras to the lowest-
  // index slots so totals match `total` exactly.
  let leftover = total - targetPer * N;
  for (let i = 0; i < N && leftover > 0; i++) { remaining[i]++; leftover--; }
  for (let i = 0; i < N && leftover < 0; i++) { remaining[i]--; leftover++; }

  for (const e of entries) {
    const q = e.q;
    const correctText = q.opts[q.ok];
    // Pick the slot with the most remaining capacity. Ties broken by
    // current `ok` (prefer keeping the same slot when possible to minimize
    // diff churn).
    let bestSlot = 0;
    let bestRemaining = -Infinity;
    for (let s = 0; s < N; s++) {
      if (remaining[s] > bestRemaining || (remaining[s] === bestRemaining && s === q.ok)) {
        bestRemaining = remaining[s];
        bestSlot = s;
      }
    }
    let distractors = q.opts.filter((_, i) => i !== q.ok);
    if (SHUFFLE) {
      // Seeded shuffle keyed on the question id so the result is stable
      // across runs. Canonicalize input order (lex sort) BEFORE shuffling so
      // re-runs produce identical output regardless of where the correct
      // answer last lived — without that, a slot move would change the
      // distractor list and the next run would re-permute.
      distractors = seededShuffle(distractors.slice().sort(), q.id || `q-${e.age}-${e.idx}`);
    }
    const slotChanged = bestSlot !== q.ok;
    const distractorsChanged = SHUFFLE; // we always rewrote, even if order matches by chance
    if (slotChanged || distractorsChanged) {
      const newOpts = [];
      let di = 0;
      for (let i = 0; i < N; i++) {
        if (i === bestSlot) newOpts.push(correctText);
        else newOpts.push(distractors[di++]);
      }
      q.opts = newOpts;
      q.ok = bestSlot;
    }
    remaining[bestSlot]--;
  }

  // After
  const after = Array(N).fill(0);
  entries.forEach((e) => after[e.q.ok]++);
  afterReport.push({ N, total, after });
}

console.log(APPLY ? '✓ APPLIED' : '(dry-run — re-run with --apply to write)');
console.log(`Target file: ${path}`);
console.log('');

for (let i = 0; i < beforeReport.length; i++) {
  const b = beforeReport[i];
  const a = afterReport[i];
  const letters = Array.from({ length: b.N }, (_, j) => String.fromCharCode(65 + j));
  console.log(`${b.N}-option questions: ${b.total} total · target ${b.targetPer}/slot`);
  letters.forEach((L, j) => {
    const arrow = b.before[j] === a.after[j] ? '=' : (b.before[j] > a.after[j] ? '↓' : '↑');
    console.log(`  ${L}: ${String(b.before[j]).padStart(4)} (${fmtPct(b.before[j], b.total).padStart(6)}) ${arrow} ${String(a.after[j]).padStart(4)} (${fmtPct(a.after[j], b.total).padStart(6)})`);
  });
}

if (APPLY) {
  writeFileSync(path, JSON.stringify(bank, null, 2) + '\n');
  console.log(`\n✓ Wrote ${path}`);
}
