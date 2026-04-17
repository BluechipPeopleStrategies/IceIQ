import { QB } from "./src/questionBank.js";

const out = { "U9 / Novice": [], "U11 / Atom": [] };
for (const lvl of Object.keys(out)) {
  const qs = QB[lvl];
  for (const q of qs) {
    if (!q || !q.opts || q.opts.length !== 4) continue;
    const lens = q.opts.map(o => o.length);
    const maxLen = Math.max(...lens);
    if (lens[q.ok] === maxLen) {
      const others = lens.filter((_, i) => i !== q.ok);
      const margin = maxLen - Math.max(...others);
      out[lvl].push({ id: q.id, ok: q.ok, margin, lens, sit: q.sit, opts: q.opts });
    }
  }
  out[lvl].sort((a, b) => b.margin - a.margin);
}

// JSON dump for processing
console.log(JSON.stringify(out, null, 2));
