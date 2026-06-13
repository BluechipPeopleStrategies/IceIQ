// Pure, Vite-free browse filtering. Imported by the React app AND node test
// scripts, so it must not touch import.meta.glob or browser globals.

// The scenario's age tier = its first level string (e.g. "U11"), or "".
export function ageTierOf(scenario) {
  return scenario?.levels?.[0] || scenario?.level || "";
}

// Sorted unique list of tiers present in a scenario list.
export function ageTiers(scenarios) {
  return [...new Set((scenarios || []).map(ageTierOf).filter(Boolean))].sort();
}

// One scenario's flag state, given its coach row and my-verdict row (either null):
//   coach      — coach reviewed it and did NOT keep (action needed)
//   mine       — I marked it revise or retire
//   unreviewed — no coach row and no verdict from me
//   clean      — reviewed and not flagged by either
export function flagOf(scenario, coach, myVerdict) {
  if (coach && coach.verdict && coach.verdict !== "keep") return "coach";
  const mv = myVerdict?.verdict;
  if (mv === "revise" || mv === "retire") return "mine";
  if (!coach && !mv) return "unreviewed";
  return "clean";
}

// Headline for a feedback_log row in the "Previously incorporated" accordion:
// the change made, else the feedback, else a placeholder. Trimmed.
export function iterationHeadline(log) {
  const t = (log?.change || log?.feedback || "").trim();
  return t || "(no detail)";
}

// Collapse feedback_log rows into one entry per change event (iteration), newest first.
// A single resolve writes one row PER SOURCE (owner + coach) that share an iteration
// and an identical `change` summary — so without grouping the accordion shows the same
// change twice. Each group keeps the change + per-source feedback for the expanded view.
// Rows with a null iteration never merge (each is its own group).
export function groupIterations(logs) {
  const order = [];
  const byKey = new Map();
  let auto = 0;
  for (const r of logs || []) {
    const key = r?.iteration == null ? `null_${auto++}` : `iter_${r.iteration}`;
    let g = byKey.get(key);
    if (!g) {
      g = { iteration: r?.iteration ?? null, change: "", node: null, created_at: r?.created_at || null, sources: [] };
      byKey.set(key, g);
      order.push(g);
    }
    if (!g.change && r?.change) g.change = r.change;
    if (!g.node && r?.node) g.node = r.node;
    if (!g.created_at && r?.created_at) g.created_at = r.created_at;
    const feedback = (r?.feedback || "").trim();
    const source = r?.source || null;
    if (feedback && !g.sources.some((s) => s.source === source && s.feedback === feedback)) {
      g.sources.push({ source, feedback });
    }
  }
  return order.sort((a, b) => {
    if (a.iteration != null && b.iteration != null && a.iteration !== b.iteration) return b.iteration - a.iteration;
    return (b.created_at || "").localeCompare(a.created_at || "");
  });
}

// Filter a scenario list by flag scope + age tier.
//   flagScope: "all" | "coach" | "mine" | "unreviewed"
//   ageTier:   "all" | "<tier>"
export function applyFilters(scenarios, { flagScope, ageTier }, coachById = {}, myVerdictById = {}) {
  return (scenarios || []).filter((s) => {
    if (ageTier && ageTier !== "all" && ageTierOf(s) !== ageTier) return false;
    if (!flagScope || flagScope === "all") return true;
    return flagOf(s, coachById[s.id] || null, myVerdictById[s.id] || null) === flagScope;
  });
}
