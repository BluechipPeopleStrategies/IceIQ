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
//      The relative order of distractors is preserved (the correct answer
//      moves into a new slot; the others shift around it predictably).
//
// Per-question rewrite is mechanical — only the position of the correct
// answer changes; the answer text itself is untouched. `_correctAnswerText`
// (a sidecar field set by the legacy miner) is preserved for traceability.
//
// Usage:
//   node tools/redistribute-mc-correct.mjs                # dry-run report
//   node tools/redistribute-mc-correct.mjs --apply        # rewrite the file
//   node tools/redistribute-mc-correct.mjs --target legacy  # default (questions.legacy.json)
//   node tools/redistribute-mc-correct.mjs --target candidates  # questions.legacy-candidates.json
//   node tools/redistribute-mc-correct.mjs --target live  # questions.json (the live bank)

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
const TARGET = flag('target', 'legacy');

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
    if (bestSlot !== q.ok) {
      // Move correct answer to bestSlot; keep distractors in their original
      // relative order, just shifted around the gap.
      const distractors = q.opts.filter((_, i) => i !== q.ok);
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
