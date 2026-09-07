// Loader/renderer for the source-triage rubric — mirrors tools/gauntlet/rubric.mjs's
// loadRubric/renderRubric shape exactly, but for the source-credibility rubric
// (a separate concern from the scenario-content quality rubric). Pure + unit-tested.
import { readFileSync } from "node:fs";

export function loadSourceTriageRubric(path) {
  try {
    const j = JSON.parse(readFileSync(path, "utf8"));
    return { version: Number(j.version) || 1, principles: Array.isArray(j.principles) ? j.principles : [] };
  } catch {
    return { version: 1, principles: [] };
  }
}

// Render the rubric as a prompt-injectable block (empty string when there are
// none). Numbered so the judge can refer to a principle by number in notes.
export function renderSourceTriageRubric(data) {
  const principles = data?.principles || [];
  if (!principles.length) return "";
  return "Source-triage rubric — apply ALL of these:\n" +
    principles.map((p, i) => `${i + 1}. ${p.text}`).join("\n");
}
