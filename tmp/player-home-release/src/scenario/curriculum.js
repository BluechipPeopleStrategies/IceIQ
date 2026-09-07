// curriculum.js — single source of truth tying a nodeId to its age, curriculum
// depth, age-appropriate difficulty, and level string. Used by the formation
// tooling so every generated question is automatically aligned to the
// curriculum: the nodeId fully determines age + difficulty (no hand-set drift).
//
// Node-only (reads the ledger from disk); imported by scripts, never bundled
// into the app.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ledger = JSON.parse(readFileSync(join(__dirname, "..", "data", "curriculum-ledger.json"), "utf8"));
const byId = Object.fromEntries(ledger.nodes.map((n) => [n.id, n]));

// Curriculum depth → age-appropriate difficulty.
//   I introduced=1 · D developing=2 · M mastery=2 · R refinement=3
export const DEPTH2DIFF = { I: 1, D: 2, M: 2, R: 3 };

export const AGE_LEVEL = {
  U7: "U7 / Initiation", U9: "U9 / Novice", U11: "U11 / Atom",
  U13: "U13 / Peewee", U15: "U15 / Bantam", U18: "U18 / Midget",
};

// nodeId → { id, ageId, conceptId, depth, difficulty, level } or null.
export function nodeInfo(nodeId) {
  const n = byId[nodeId];
  if (!n) return null;
  return { ...n, difficulty: DEPTH2DIFF[n.depth] || 1, level: AGE_LEVEL[n.ageId] || null };
}

// Pick the formation's nodeId that belongs to a given age band, e.g.
// nodeForAge(["u13.gap-control","u11.gap-control"], "U11") → "u11.gap-control".
export function nodeForAge(nodeIds, age) {
  const p = age.toLowerCase() + ".";
  return (nodeIds || []).find((id) => id.toLowerCase().startsWith(p)) || null;
}
