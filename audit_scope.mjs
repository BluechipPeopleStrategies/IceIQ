import QB from "./src/data/questions.json" assert { type: "json" };

const TOLERANCE = 15;
let total = 0, needsWork = 0, byLevel = {};
const candidates = [];

for (const [lvl, qs] of Object.entries(QB)) {
  let lvlTotal = 0, lvlNeeds = 0;
  for (const q of qs) {
    if (!q || !q.opts || q.opts.length !== 4) continue;
    lvlTotal++;
    const correctLen = q.opts[q.ok].length;
    const offOptions = q.opts
      .map((o, i) => ({ i, len: o.length }))
      .filter(x => x.i !== q.ok && Math.abs(x.len - correctLen) > TOLERANCE);
    if (offOptions.length > 0) {
      lvlNeeds++;
      candidates.push({ id: q.id, lvl, offCount: offOptions.length, correctLen, lens: q.opts.map(o => o.length) });
    }
  }
  byLevel[lvl] = { total: lvlTotal, needs: lvlNeeds };
  total += lvlTotal;
  needsWork += lvlNeeds;
}

console.log(`Tolerance: ±${TOLERANCE} chars from correct answer length\n`);
console.log("Level             | total | needs-rewrite | %");
console.log("------------------|-------|---------------|-----");
for (const [lvl, s] of Object.entries(byLevel)) {
  console.log(`${lvl.padEnd(17)} | ${String(s.total).padStart(5)} | ${String(s.needs).padStart(13)} | ${((s.needs/s.total)*100).toFixed(1)}%`);
}
console.log(`\nOVERALL: ${needsWork} of ${total} questions need at least one distractor rewritten (${((needsWork/total)*100).toFixed(1)}%)`);

// Direction: which distractors are too short vs too long
let tooShort = 0, tooLong = 0;
for (const c of candidates) {
  for (let i = 0; i < 4; i++) {
    if (i === QB[c.lvl].find(q => q.id === c.id).ok) continue;
    const delta = c.lens[i] - c.correctLen;
    if (delta < -TOLERANCE) tooShort++;
    else if (delta > TOLERANCE) tooLong++;
  }
}
console.log(`\nDistractors too short (>${TOLERANCE} chars shorter than correct): ${tooShort}`);
console.log(`Distractors too long  (>${TOLERANCE} chars longer than correct):  ${tooLong}`);
