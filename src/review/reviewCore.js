// Pure, Vite-free review logic. Imported by the React app AND by node scripts
// (scripts/test-review.mjs, scripts/pull-reviews.mjs), so it must not import
// anything that uses import.meta.glob or browser globals.

// A scenario has a reviewable board if it's a scenario with a stage and placed
// actors — either flat, or in every step of a multi-step play.
export function hasBoard(q) {
  if (!q || q.type !== "scenario" || !q.stage) return false;
  if (q.nodes && q.entry) {
    return Object.values(q.nodes).every(n => Array.isArray(n?.actors) && n.actors.length > 0);
  }
  if (Array.isArray(q.steps) && q.steps.length) {
    return q.steps.every(s => Array.isArray(s?.actors) && s.actors.length > 0);
  }
  return Array.isArray(q.actors) && q.actors.length > 0;
}

// Flatten a qb ({ [level]: question[] }) to board scenarios, deduped by id,
// ordered unreviewed-first then level then nodeId.
export function selectAndOrder(qb, reviewedIds = new Set()) {
  const seen = new Set();
  const all = [];
  for (const level of Object.keys(qb || {})) {
    for (const q of qb[level] || []) {
      if (!hasBoard(q) || seen.has(q.id)) continue;
      seen.add(q.id);
      all.push(q);
    }
  }
  all.sort((a, b) => {
    const ar = reviewedIds.has(a.id) ? 1 : 0, br = reviewedIds.has(b.id) ? 1 : 0;
    if (ar !== br) return ar - br;
    const al = a.levels?.[0] || a.level || "", bl = b.levels?.[0] || b.level || "";
    if (al !== bl) return al < bl ? -1 : 1;
    const an = a.nodeId || "", bn = b.nodeId || "";
    return an < bn ? -1 : an > bn ? 1 : 0;
  });
  return all;
}

// Deterministic stringify (sorted keys) so hashes don't depend on key order.
function stableStringify(v) {
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}

// Stable 8-hex hash of the board-defining fields, to tie a review to a board version.
export function boardHash(scenario) {
  const subset = Array.isArray(scenario?.steps) && scenario.steps.length
    ? { steps: scenario.steps, stage: scenario?.stage ?? null }
    : {
        actors: scenario?.actors ?? null,
        stage: scenario?.stage ?? null,
        interaction: scenario?.interaction ?? null,
        correct: scenario?.correct ?? null,
      };
  const str = stableStringify(subset);
  let h = 0x811c9dc5; // FNV-1a 32-bit
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8);
}

// Replace any queued entry for the same scenario (latest wins), else append.
export function mergeQueue(queue, entry) {
  const out = (queue || []).filter(e => e.scenario_id !== entry.scenario_id);
  out.push(entry);
  return out;
}

// Group reviews by verdict using the latest row per scenario; flag stale boards.
export function groupReviews(reviews, currentHashById = {}) {
  const latest = {};
  for (const r of reviews || []) {
    const prev = latest[r.scenario_id];
    if (!prev || (r.updated_at || "") > (prev.updated_at || "")) latest[r.scenario_id] = r;
  }
  const out = { keep: [], revise: [], retire: [] };
  for (const r of Object.values(latest)) {
    const cur = currentHashById[r.scenario_id];
    const stale = !!(r.board_hash && cur && r.board_hash !== cur);
    const item = { id: r.scenario_id, note: r.note || "", board_hash: r.board_hash || null, stale };
    if (out[r.verdict]) out[r.verdict].push(item);
  }
  return out;
}
