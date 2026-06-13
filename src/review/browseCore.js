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
