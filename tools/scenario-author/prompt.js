// System prompt + few-shot examples for the scenario-author CLI.
// The system prompt establishes hard rules; few-shot scenarios show the
// model what valid output looks like for the two v1 primitives (path,
// selection). Keep this terse — every token here costs us latency.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

export const ZONE_IDS = [
  "dz-corner-strong", "dz-corner-weak", "dz-net-front", "dz-slot",
  "dz-half-wall-strong", "dz-half-wall-weak", "dz-point-strong", "dz-point-weak",
  "neutral-strong", "neutral-weak", "neutral-center",
  "oz-corner-strong", "oz-corner-weak", "oz-net-front", "oz-slot", "oz-high-slot",
  "oz-half-wall-strong", "oz-half-wall-weak", "oz-point-strong", "oz-point-weak",
  "oz-bumper",
];

function loadSeed(name) {
  const p = path.join(ROOT, "src", "scenario", "seeds", name);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function buildSystemPrompt() {
  const fewShot = [
    loadSeed("u13q_rink07_v2.json"),
    loadSeed("u15_intelligym_demo.json"),
  ];

  return `You are an Ice-IQ scenario author. You write hockey-IQ training questions in a strict JSON schema. The schema expresses a frozen-frame rink scene + an interaction primitive (path or selection in v1) + the correct answer + feedback.

# Coordinate system

Coordinates are normalized 0..1.
  x = left to right; y = top to bottom.
  defending zone:  x ≤ 0.39
  neutral zone:    0.39 ≤ x ≤ 0.61
  offensive zone:  x ≥ 0.61

# Hard rules

1. Prefer ZONE IDs over raw coordinates for \`correct.end\`. The available zone IDs are:
   ${ZONE_IDS.join(", ")}
2. NEVER place a defender on the straight line between the from-actor and the correct target. The validator rejects scenarios where a defender within ~0.035 of the correct line.
3. Do place defenders blocking the WRONG options — that's how the scenario teaches the read.
4. The scene must include a goalie if the action is in the offensive or defensive zone.
5. Tag every skater with a position (\`tag\` field): YOU, C, RD, LD, LW, RW. Defenders have no tag.
6. The wrong-answer feedback should teach the read, not just say "not that."
7. Difficulty 1-3. 1 = beginner, 3 = U15+ tactical concept.
8. Choose stage.view to fit the action: "right" or "left" for zone scenes, "neutral" for breakouts/regroups, "full" only when needed.
9. Output ONLY valid JSON matching the schema. No prose, no markdown fences, no commentary.

# Reference scenarios (study the shape, do not copy verbatim)

${JSON.stringify(fewShot[0], null, 2)}

${JSON.stringify(fewShot[1], null, 2)}
`;
}

// JSON Schema served to claude --json-schema for structured-output
// validation. Mirrors src/scenario/schema.js in shape but flattened
// with required fields per Aidan Cooper's constrained-decoding research:
// optional fields tank LLM quality, so we mark almost everything as
// required and let the author leave them empty / default at runtime.
export function buildJsonSchema() {
  const actor = {
    type: "object",
    additionalProperties: false,
    required: ["id", "kind", "x", "y", "tag"],
    properties: {
      id:   { type: "string", description: "unique within scenario" },
      kind: { type: "string", enum: ["player", "teammate", "defender", "goalie", "puck"] },
      x:    { type: "number", minimum: 0, maximum: 1 },
      y:    { type: "number", minimum: 0, maximum: 1 },
      tag:  { type: "string", description: "short label rendered ON the marker; empty string for defender/puck/goalie" },
    },
  };
  const target = {
    type: "object",
    additionalProperties: false,
    required: ["zoneId"],
    properties: {
      zoneId: { type: "string", enum: ZONE_IDS },
    },
  };
  const pathInteraction = {
    type: "object",
    additionalProperties: false,
    required: ["kind", "verb", "from", "prompt"],
    properties: {
      kind: { type: "string", enum: ["path"] },
      verb: { type: "string", enum: ["skate", "carry", "pass", "shoot", "screen", "check", "backcheck"] },
      from: { type: "string", description: "actor id the path starts from (typically 'you')" },
      prompt: { type: "string" },
    },
  };
  const pathAnswer = {
    type: "object",
    additionalProperties: false,
    required: ["kind", "end"],
    properties: {
      kind: { type: "string", enum: ["path"] },
      end: target,
    },
  };
  return {
    type: "object",
    additionalProperties: false,
    required: ["id", "type", "themes", "cat", "difficulty", "stage", "actors", "interaction", "correct", "feedback", "tip", "why"],
    properties: {
      id:    { type: "string" },
      type:  { type: "string", enum: ["scenario"] },
      themes: { type: "array", items: { type: "string" } },
      cat:   { type: "string" },
      difficulty: { type: "integer", minimum: 1, maximum: 3 },
      stage: {
        type: "object",
        additionalProperties: false,
        required: ["view", "zone"],
        properties: {
          view: { type: "string", enum: ["full", "left", "right", "neutral"] },
          zone: { type: "string", enum: ["def-zone", "neutral", "off-zone"] },
        },
      },
      actors: { type: "array", items: actor, minItems: 2 },
      interaction: pathInteraction,
      correct:     pathAnswer,
      feedback: {
        type: "object",
        additionalProperties: false,
        required: ["right", "wrong"],
        properties: {
          right: { type: "string" },
          wrong: { type: "string" },
        },
      },
      tip: { type: "string" },
      why: { type: "string" },
    },
  };
}
