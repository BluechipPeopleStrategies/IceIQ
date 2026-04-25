// System prompt + few-shot examples for the scenario-author CLI.
// The system prompt establishes hard rules; few-shot scenarios show the
// model what valid output looks like for the two v1 primitives (path,
// selection). Keep this terse — every token here costs us latency.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { THEME_VOCAB } from "../../src/scenario/validators.js";

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
    loadSeed("u11_open_pass_v1.json"),
    loadSeed("u11_faceoff_point_v1.json"),
    loadSeed("u13_breakout_sequence_v1.json"),
  ];

  return `You are an RinkReads scenario author. You write hockey-IQ training questions in a strict JSON schema. The schema expresses a frozen-frame rink scene + one of four interaction primitives + the correct answer + feedback.

# Choosing a primitive

PATH — user DRAWS from a start actor to a target zone. Pass lanes, skate routes, shots. Use a SPADL verb (skate / carry / pass / shoot / screen / check / backcheck).

SELECTION — user TAPS one or more from a fixed set of candidates. "Tap the open teammate", "select all defenders covering the slot." Best for read-the-play questions.

POINT — user TAPS once anywhere on the rink. "Where should you stand?", "click the danger area." When there's no fixed candidate set, just a target spot.

SEQUENCE — user TAPS actors IN ORDER. "Build the breakout: tap the players in the order the puck should move." Same shape as selection but order matters and the UI numbers the taps.

When ambiguous, prefer SELECTION (cleanest UX). Only pick SEQUENCE if the question is explicitly about order. Only pick POINT if the answer is a position with no obvious candidate actor.

# Coordinate system

Coordinates are normalized 0..1.
  x = left to right; y = top to bottom.
  defending zone:  x ≤ 0.39
  neutral zone:    0.39 ≤ x ≤ 0.61
  offensive zone:  x ≥ 0.61

# Hard rules — the validator rejects any scenario that breaks these

1. PATH only: prefer ZONE IDs over raw coordinates for \`correct.end\`. Available zone IDs:
   ${ZONE_IDS.join(", ")}
2. PATH only: NEVER place a defender on the straight line between the from-actor and the correct target. The validator rejects scenarios where a defender lies within ~0.035 of the correct line.
3. SELECTION shape:
   {
     "interaction": { "kind": "selection", "prompt": "...", "from": ["actorId1", "actorId2", "actorId3"], "order": "any" },
     "correct":     { "kind": "selection", "ids": ["actorId2"] }
   }
   - \`from\` must list at least 2 candidate actor ids.
   - \`correct.ids\` must be a non-empty subset of \`from\` and must NOT equal \`from\`.
   - \`order\` is "any" by default. (For ordered taps use kind="sequence".)

3b. POINT shape:
   {
     "interaction": { "kind": "point", "prompt": "..." },
     "correct":     { "kind": "point", "zoneId": "<zone-id>" }
   }
   - \`correct\` may use either \`zoneId\` or numeric \`{x, y}\`. Prefer zoneId.

3c. SEQUENCE shape:
   {
     "interaction": { "kind": "sequence", "prompt": "...", "from": ["a", "b", "c", "d"] },
     "correct":     { "kind": "sequence", "ids": ["a", "c"] }
   }
   - \`from\` must list at least 2 candidate actor ids.
   - \`correct.ids\` must have ≥ 2 ids in the EXPECTED ORDER (otherwise it's just a selection).
   - The user taps actors in order; each tap stamps a number.
4. The from-actor (path) or every selectable actor must exist in \`actors\`. The lone player (kind="player", tag="YOU") is the user's POV — exactly one per scenario.
4. Goalie required in any offensive-zone or defensive-zone scene.
5. Tag every skater with a position (\`tag\` field): YOU, C, RD, LD, LW, RW. Defenders + goalie + puck use empty string for tag.
6. Position tags must align with location: RD/RW belong on the bottom side of the rink (y > 0.5); LD/LW belong on the top side (y < 0.5).
7. No two skater actors can be within 0.025 of each other (visually overlap). The puck may sit on top of its carrier.
8. All actors must be visible given the chosen \`stage.view\`. With view="right", every actor must have x ≥ 0.45. With view="left", x ≤ 0.55. With view="neutral", 0.30 ≤ x ≤ 0.70.
9. Path length: the from-actor and correct target must be more than the target's tolerance apart. Don't author a scenario where the right answer is "stay where you are."
10. **Decision-making required.** For pass scenarios, place AT LEAST ONE other teammate the player might pass to but can't — meaning a defender on that lane. Otherwise it's not a read.
11. Defender count by zone:
    - def-zone: at least 2 defenders
    - off-zone with theme "power-play": at least 3 defenders (PK skaters)
    - off-zone otherwise: at least 1 defender
    - neutral: at least 1 defender
12. Difficulty must reflect complexity. The validator computes a floor:
    - 7+ skaters → difficulty ≥ 2
    - 9+ skaters OR has timer OR has scanWindow → difficulty ≥ 3
    - power-play / penalty-kill themes → difficulty ≥ 2
    Pick a difficulty that reasonably matches the scene.
13. Prompt must be at least 25 characters and frame the situation clearly.
14. \`tip\` must add something the right-answer feedback doesn't already say. Don't make them identical.
15. Output ONLY valid JSON. No prose, no markdown fences, no commentary.

# Theme controlled vocabulary — pick from this set

${[...THEME_VOCAB].join(", ")}

Use only these. Mixing in your own terms makes the catalog unfilterable.

# Soft guidance (won't reject but will warn)

- Goalie should sit in or near the crease (x ≈ 0.918 right, x ≈ 0.082 left, y near 0.5).
- For verb="pass", the correct.end zone should sit near a teammate — you're passing TO someone.
- For verb="shoot", the correct.end should be near a net.

# Reference scenarios (study the shape, do not copy verbatim)

PATH — power play, find the open bumper:
${JSON.stringify(fewShot[0], null, 2)}

SELECTION — tap the open teammate:
${JSON.stringify(fewShot[1], null, 2)}

POINT — faceoff positioning (tap the right spot, no candidate actors):
${JSON.stringify(fewShot[2], null, 2)}

SEQUENCE — breakout order (tap actors in passing order):
${JSON.stringify(fewShot[3], null, 2)}
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
