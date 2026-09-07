// Converts type:"mc" questions whose opts are functionally True/False into
// type:"tf" so they render with the dedicated TF widget (big TRUE/FALSE
// buttons) instead of the generic MC list (which was showing labels like
// "True ✅" / "False ❌" as if they were MC choices).
//
// Engine rules (from src/App.jsx TFQuestion):
//   - TF doesn't use q.opts at all — TRUE / FALSE labels are hard-coded
//   - q.ok = true  → TRUE is correct
//   - q.ok = false → FALSE is correct
//   (The engine accepts truthy/falsy via `q.ok ? 1 : 0`, but preflight
//   enforces boolean, so we write booleans for cleanliness.)
//
// Idempotent — re-running on a TF-clean bank is a no-op.

import fs from 'node:fs';

const QUESTIONS_PATH = 'src/data/questions.json';
const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '');

let converted = 0;
const report = [];

for (const ageArr of Object.values(data)) {
  for (const q of ageArr) {
    if (q.type !== 'mc') continue;
    const opts = q.opts || [];
    if (opts.length !== 2) continue;
    const set = new Set(opts.map(norm));
    if (!(set.has('true') && set.has('false'))) continue;

    // Determine correct answer.
    const correctOptText = opts[q.ok];
    const correctIsTrue = norm(correctOptText) === 'true';
    const newOk = correctIsTrue;  // boolean — preflight enforces this

    // Optional: strip the "True or False: " prefix from sit/q so the stem
    // doesn't redundantly announce the question type. The dedicated TF
    // widget already does that.
    const stripPrefix = (s) =>
      (typeof s === 'string')
        ? s.replace(/^\s*True\s*or\s*False\s*:\s*/i, '').replace(/^\s*T\s*\/\s*F\s*:\s*/i, '')
        : s;

    const beforeSit = q.sit;
    const beforeQ = q.q;
    q.sit = stripPrefix(q.sit);
    q.q = stripPrefix(q.q);
    q.type = 'tf';
    q.ok = newOk;
    delete q.opts;

    converted++;
    report.push({
      id: q.id,
      correctIsTrue,
      strippedPrefix: beforeSit !== q.sit || beforeQ !== q.q,
    });
  }
}

fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(`Converted: ${converted}\n`);
const trueCount = report.filter((r) => r.correctIsTrue).length;
const falseCount = report.length - trueCount;
console.log(`  TRUE-correct:  ${trueCount}`);
console.log(`  FALSE-correct: ${falseCount}`);
console.log(`  Stripped "True or False:" prefix: ${report.filter((r) => r.strippedPrefix).length}`);
console.log('\nFirst 10:');
for (const r of report.slice(0, 10)) {
  console.log(`  ${r.id} → ok=${r.correctIsTrue} (${r.correctIsTrue ? 'TRUE' : 'FALSE'} correct)${r.strippedPrefix ? ' · prefix stripped' : ''}`);
}
