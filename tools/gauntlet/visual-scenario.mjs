// Pure helpers for the gauntlet's visual (scenario) track: normalize a generated
// scenario onto a node, hash it for dedupe, and a known-valid mock for --mock.
import { createHash } from "node:crypto";
import { AGE_LEVEL } from "./prompts.mjs";

const VALID_LEVELS = new Set(Object.values(AGE_LEVEL));

// Derive a question's levels from the NODE, never trusting the creator's level
// string (creators sometimes hallucinate invalid ones like "U13 / Atom"). The
// primary is always the node's age; valid creator-added secondary ages are kept,
// invalid ones dropped.
export function forcedLevels(node, rawLevels) {
  const primary = AGE_LEVEL[node.ageId];
  const extra = (Array.isArray(rawLevels) ? rawLevels : []).filter((l) => VALID_LEVELS.has(l) && l !== primary);
  return [primary, ...extra];
}

// Force the node tags + engine type onto a generated scenario, keep the rest.
export function repairScenario(s, node, idSeed) {
  s = s && typeof s === "object" ? s : {};
  s.id = idSeed;
  s.type = "scenario";
  s.nodeId = node.id;
  s.levels = forcedLevels(node, s.levels);
  if (typeof s.difficulty !== "number") s.difficulty = 1;
  return s;
}

// Structural signature for dedupe: actor kinds + rounded positions + the prompt
// + the correct answer. Ignores id and cosmetic label/feedback text.
export function scenarioHash(s) {
  const actors = (s.actors || [])
    .map((a) => `${a.kind}:${Math.round((a.x || 0) * 20)},${Math.round((a.y || 0) * 20)}`)
    .sort()
    .join("|");
  const correct = JSON.stringify(s.correct || {});
  const prompt = String(s.interaction?.prompt || "").toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha1").update(actors + "##" + prompt + "##" + correct).digest("hex").slice(0, 16);
}

// A known engine-valid scenario (verified against lintScenario) for --mock runs.
export function mockScenario(node, idSeed) {
  return {
    id: idSeed, type: "scenario", nodeId: node.id, levels: [AGE_LEVEL[node.ageId]], difficulty: 1,
    stage: { view: "right" },
    actors: [
      { id: "you", kind: "player", x: 0.46, y: 0.55, label: "YOU" },
      { id: "puck", kind: "puck", x: 0.47, y: 0.55 },
      { id: "mate_open", kind: "teammate", x: 0.66, y: 0.38 },
      { id: "mate_cov", kind: "teammate", x: 0.60, y: 0.74 },
      { id: "def", kind: "defender", x: 0.58, y: 0.6 },
      { id: "goalie", kind: "goalie", x: 0.92, y: 0.5 },
    ],
    interaction: { kind: "selection", prompt: "You have the puck on the rush. Tap the teammate who is open for a pass.", from: ["mate_open", "mate_cov"], order: "any" },
    correct: { kind: "selection", ids: ["mate_open"] },
    feedback: { right: "Yes, the open lane up high is the best pass.", wrong: "That teammate is covered; look for the open lane." },
  };
}
