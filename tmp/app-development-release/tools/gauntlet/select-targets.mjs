// Picks which ledger nodes the generator should fill next: those whose current
// coverage (live + queued questions tagged to the node) is under target. Anchor
// concepts first (they carry the 2x target and are the brand core), then by the
// largest gap. Pure + unit-tested.
import { targetFor, isAnchor } from "../lib/curriculum-ledger.mjs";

// selectTargets(ledger, counts, { max, ages }) -> [{ node, have, want, gap, anchor }]
// `counts` is a map of nodeId -> number of questions already covering it.
// `ages` (optional) restricts to those age bands, e.g. ["U7","U9","U11"].
export function selectTargets(ledger, counts = {}, { max = Infinity, ages = null } = {}) {
  const ageSet = ages && ages.length ? new Set(ages) : null;
  const rows = ledger.nodes
    .filter((node) => !ageSet || ageSet.has(node.ageId))
    .map((node) => {
      const have = counts[node.id] || 0;
      const want = targetFor(ledger, node);
      return { node, have, want, gap: want - have, anchor: isAnchor(ledger, node.conceptId) };
    })
    .filter((r) => r.gap > 0);

  rows.sort((a, b) => {
    if (a.anchor !== b.anchor) return a.anchor ? -1 : 1;     // anchors first
    if (b.gap !== a.gap) return b.gap - a.gap;               // biggest gap first
    return a.node.id < b.node.id ? -1 : 1;                   // stable by id
  });

  return rows.slice(0, max);
}
