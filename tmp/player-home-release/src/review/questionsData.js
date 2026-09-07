import { loadQB } from "../qbLoader.js";
import { hasBoard } from "./reviewCore.js";

// EVERY question — the text bank AND the scenario boards — flattened, deduped by
// id, board questions first then by level/id. Each keeps its raw shape; the
// dashboard derives display fields (see questionView) and whether it has a board.
export async function loadAllQuestions() {
  const qb = await loadQB();
  const seen = new Set();
  const all = [];
  for (const lvl of Object.keys(qb || {})) {
    for (const q of qb[lvl] || []) {
      if (!q?.id || seen.has(q.id)) continue;
      seen.add(q.id);
      all.push(q);
    }
  }
  all.sort((a, b) => {
    const ab = hasBoard(a) ? 0 : 1, bb = hasBoard(b) ? 0 : 1;
    if (ab !== bb) return ab - bb;
    const al = a.levels?.[0] || a.level || "", bl = b.levels?.[0] || b.level || "";
    if (al !== bl) return al < bl ? -1 : 1;
    return (a.id || "") < (b.id || "") ? -1 : 1;
  });
  return all;
}

// Normalize a question (bank OR scenario) to common display fields, so one
// renderer handles both schemas (bank uses sit/opts/ok; scenarios use
// interaction.prompt / mc.stem / mc.opts / mc.ok).
export function questionView(q) {
  const stem = q?.interaction?.prompt || q?.mc?.stem || q?.sit || q?.q || "";
  const opts = q?.mc?.opts || q?.opts || [];
  const ok = q?.mc?.ok != null ? q.mc.ok : (q?.ok != null ? q.ok : null);
  const right = q?.feedback?.right || q?.why || "";
  const tip = q?.tip || "";
  return { stem, opts, ok, right, tip, board: hasBoard(q) };
}
