// Pure helpers for coach auto-revise. No Supabase, no fs, no Vite — node-testable.
// Mirrors tools/lib/coach-core.mjs.

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

// Deep-merge `edit` onto `scenario` and return a NEW object (never mutates input).
// Plain objects merge recursively; arrays and scalars replace wholesale (so to change
// one actor the caller must supply the full `actors` array). A null/non-object edit
// returns the scenario unchanged.
export function applyEdit(scenario, edit) {
  if (!isPlainObject(edit)) return scenario;
  const out = { ...scenario };
  for (const [k, v] of Object.entries(edit)) {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? applyEdit(out[k], v) : v;
  }
  return out;
}

// Gate decision from the hockey validators' output:
//   any hard error -> "reject"; warnings only -> "apply-marked"; clean -> "apply".
export function decideApply({ errs = [], warns = [] } = {}) {
  if ((errs || []).length) return "reject";
  if ((warns || []).length) return "apply-marked";
  return "apply";
}

// One coach feedback_log row for an applied/retired board. Coach-only analogue of
// coach-core.buildLogRows; iteration = (max prior for this scenario) + 1.
export function buildReviseLogRow({ scenario_id, node, change, coachNotes, priorMaxIteration }) {
  return {
    scenario_id,
    node: node || null,
    iteration: (priorMaxIteration || 0) + 1,
    source: "coach",
    feedback: coachNotes || null,
    change: change || null,
  };
}

// Markdown run report. `entries`: [{ id, action, change?, errs?, warns?, error? }].
export function reviseReport(entries, date) {
  const list = entries || [];
  const tally = list.reduce((m, e) => ((m[e.action] = (m[e.action] || 0) + 1), m), {});
  let md = `# Coach Auto-Revise — ${date}\n\n${list.length} board(s).\n\n`;
  md += `**Tally:** ` + Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(" · ") + `\n`;
  for (const e of list) {
    md += `\n## ${e.id} — ${e.action}${(e.warns && e.warns.length) ? " ⚠" : ""}\n`;
    if (e.change) md += `- change: ${e.change}\n`;
    if (e.errs && e.errs.length) md += `- errors: ${e.errs.join("; ")}\n`;
    if (e.warns && e.warns.length) md += `- warnings: ${e.warns.join("; ")}\n`;
    if (e.error) md += `- note: ${e.error}\n`;
  }
  return md;
}
