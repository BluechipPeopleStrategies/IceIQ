// Pure override logic. An override is a JSON patch deep-merged over the base
// question, so a dashboard edit goes live without touching the source file (the
// bake script folds patches back into the seeds/bank later). Used by the
// dashboard, node scripts, and (later) the player app — keep it React-free.

// Deep-merge: nested objects merge recursively; arrays and scalars replace whole.
export function applyOverride(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const out = Array.isArray(base) ? base.slice() : { ...(base || {}) };
  for (const k of Object.keys(patch)) {
    const pv = patch[k], bv = out[k];
    out[k] = (pv && typeof pv === "object" && !Array.isArray(pv) && bv && typeof bv === "object" && !Array.isArray(bv))
      ? applyOverride(bv, pv) : pv;
  }
  return out;
}

// Apply a { [id]: patch } map across a question list (untouched questions returned as-is).
export function applyOverrides(questions, overridesById) {
  if (!overridesById || !Object.keys(overridesById).length) return questions || [];
  return (questions || []).map(q => (overridesById[q.id] ? applyOverride(q, overridesById[q.id]) : q));
}

// Map the dashboard's display-field edits to the right schema keys, depending on
// the question's shape (bank: sit/opts/ok; board/text MC: mc.stem/mc.opts/mc.ok;
// other scenarios: interaction.prompt). edits = { stem, opts?, ok?, right, wrong, tip }.
export function buildPatch(question, edits) {
  const patch = {};
  const hasMc = !!question?.mc;
  const hasInteraction = !!question?.interaction;
  const isBank = !hasInteraction && !hasMc;

  // stem
  if (edits.stem != null) {
    if (hasMc) patch.mc = { ...(patch.mc || {}), stem: edits.stem };
    else if (hasInteraction) patch.interaction = { prompt: edits.stem };
    else patch.sit = edits.stem;
  }
  // options + correct index (only where the question has options)
  if (Array.isArray(edits.opts)) {
    if (hasMc) patch.mc = { ...(patch.mc || {}), opts: edits.opts, ...(edits.ok != null ? { ok: edits.ok } : {}) };
    else if (isBank) { patch.opts = edits.opts; if (edits.ok != null) patch.ok = edits.ok; }
  } else if (edits.ok != null) {
    if (hasMc) patch.mc = { ...(patch.mc || {}), ok: edits.ok };
    else if (isBank) patch.ok = edits.ok;
  }
  // feedback / tip
  if (edits.right != null || edits.wrong != null) {
    if (question?.feedback || hasInteraction) patch.feedback = { ...(edits.right != null ? { right: edits.right } : {}), ...(edits.wrong != null ? { wrong: edits.wrong } : {}) };
    else if (edits.right != null) patch.why = edits.right; // bank fallback
  }
  if (edits.tip != null) patch.tip = edits.tip;
  return patch;
}
