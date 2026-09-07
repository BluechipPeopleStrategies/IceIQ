// Per-question reflection journal — "what tripped you up?" — stored in
// localStorage. Designed to be lightweight (one tap, four canned reasons,
// always dismissable) so it never feels like homework.

import { lsGetJSON, lsSetJSON, lsGetStr, lsSetStr } from "./storage.js";

const LS_REFLECTIONS = "rinkreads_reflections_v1";       // { [qid]: { reason, ts, qcat } }
const LS_DISABLED    = "rinkreads_reflections_off_v1";   // "1" or absent

export const REASONS = [
  { id: "rule",       label: "Forgot the rule"     },
  { id: "misread",    label: "Misread the play"    },
  { id: "guessed",    label: "Just guessed"        },
  { id: "pressure",   label: "Felt rushed"         },
];

export function getReflections() {
  return lsGetJSON(LS_REFLECTIONS, {});
}

export function getReflectionFor(qid) {
  if (!qid) return null;
  const all = getReflections();
  return all[qid] || null;
}

export function saveReflection(qid, reason, qcat) {
  if (!qid || !reason) return;
  const all = getReflections();
  all[qid] = { reason, ts: Date.now(), qcat: qcat || null };
  lsSetJSON(LS_REFLECTIONS, all);
}

export function clearReflection(qid) {
  if (!qid) return;
  const all = getReflections();
  delete all[qid];
  lsSetJSON(LS_REFLECTIONS, all);
}

export function isReflectionsDisabled() {
  return lsGetStr(LS_DISABLED) === "1";
}

export function setReflectionsDisabled(off) {
  if (off) lsSetStr(LS_DISABLED, "1");
  else lsSetStr(LS_DISABLED, "");
}

// Aggregate counts by reason across the saved log. Used by the Report
// screen's "What's tripping you up" summary.
export function reflectionCounts() {
  const all = getReflections();
  const out = Object.fromEntries(REASONS.map(r => [r.id, 0]));
  for (const id of Object.keys(all)) {
    const r = all[id]?.reason;
    if (r && out[r] !== undefined) out[r] += 1;
  }
  out.__total = Object.values(out).reduce((a, b) => a + b, 0);
  return out;
}
