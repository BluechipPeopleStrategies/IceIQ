// The consolidated question-quality rubric: a small, stable set of principles
// that is ALWAYS injected into the creator prompt. Raw per-drop lessons still
// accumulate in lessons.json as a "pending" tail; `--consolidate` folds that tail
// into this rubric (keeping it tight) and clears the tail, so the creator prompt
// never grows unbounded. Pure + unit-tested.
import { readFileSync, writeFileSync } from "node:fs";

// How many principles the rubric is allowed to hold. The whole point is focus;
// past this we are re-creating the bloat the rubric exists to prevent.
export const MAX_PRINCIPLES = 12;
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function loadRubric(path) {
  try {
    const j = JSON.parse(readFileSync(path, "utf8"));
    return { version: Number(j.version) || 1, principles: Array.isArray(j.principles) ? j.principles : [] };
  } catch { return { version: 1, principles: [] }; }
}

// Render the rubric as a prompt-injectable block (empty string when there are
// none). Numbered so coaches and the creator can refer to a principle by number.
export function renderRubric(data) {
  const principles = data?.principles || [];
  if (!principles.length) return "";
  return "Question-quality rubric — every question MUST satisfy ALL of these:\n" +
    principles.map((p, i) => `${i + 1}. ${p.text}`).join("\n");
}

// Replace the rubric's principle set with a freshly-consolidated one. Normalizes
// each {id?,text} (deriving a slug id from the text when absent), drops blanks,
// dedupes by id, caps at MAX_PRINCIPLES, and bumps the version. Returns the new
// rubric object (does not write).
export function applyConsolidation(rubric, principles) {
  const seen = new Set();
  const next = [];
  for (const p of Array.isArray(principles) ? principles : []) {
    const text = String(p?.text || "").trim();
    if (text.length < 10) continue;
    const id = slug(p?.id) || slug(text.slice(0, 40));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    next.push({ id, text });
    if (next.length >= MAX_PRINCIPLES) break;
  }
  if (!next.length) return { version: rubric?.version || 1, principles: rubric?.principles || [] };
  return { version: (Number(rubric?.version) || 1) + 1, principles: next };
}

export function saveRubric(path, rubric) {
  writeFileSync(path, JSON.stringify(rubric, null, 2) + "\n");
}
