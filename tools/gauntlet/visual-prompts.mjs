// Prompt for the gauntlet's visual creator. Reuses the proven scenario-author
// system prompt (it already teaches the full Scenario schema + rules so output
// is engine-shaped), and adds the curriculum-node + brand context.
import { buildSystemPrompt } from "../scenario-author/prompt.js";
import { AGE_LEVEL } from "./prompts.mjs";

export function buildVisualCreatorPrompt({ node, concept, domain, idSeed, lessons = "" }) {
  const ageDisplay = AGE_LEVEL[node.ageId];
  const system = buildSystemPrompt() +
`

RinkReads brand: warm, kid-friendly, builds "Game Sense". Refer to players by jersey
("black"/"white") or "teammate"/"defender" — never red/green. The scene must depict ONE
read for the target concept, with players positioned where they would really be for that
play.${lessons ? "\n\n" + lessons : ""}`;
  const prompt =
`Author one rink SCENARIO question for this curriculum target.

Age band: ${node.ageId} (${ageDisplay})
Concept: ${concept.name} — ${concept.definition}
The read this trains: ${concept.readConnection}
Domain: ${domain.name}

Use this exact id: ${idSeed}
After authoring the scenario per the schema above, ALSO include these two fields on the
object: "nodeId": "${node.id}", and "levels": ["${ageDisplay}"].

Output ONLY the scenario JSON object.`;
  return { system, prompt };
}

// The 4 visual-geometry lenses. The spatial/proxemics coach is mandatory — it is
// the one that understands geometry AND the game (see the spec). Each judges ONLY
// the picture, never the hockey read (the hockey panel already did that).
export const VISUAL_LENSES = [
  { key: "perfectionist", title: "Perfectionist (visual)",
    focus: "Every position exact and the read drawn cleanly. Spacing, alignment, symmetry. Truly excellent or nothing." },
  { key: "antagonistic", title: "Antagonistic (visual)",
    focus: "Actively try to break the picture: a misleading angle, an ambiguous frame, a player who would not be there, two plausible reads, a token that overlaps or crowds another." },
  { key: "spatial", title: "Spatial-realism / proxemics coach",
    focus: "Proxemics — the spacing and angles BETWEEN players, judged with geometry AND a coach's eye. Are attackers ahead of or even with the puck (never behind it)? On a 2-on-1 is the lone defender BETWEEN the puck and the net (net-side), not off to the side? Is the goalie centered on the puck line in/near the crease? Are support teammates a real passing lane away, not stacked or impossibly spread? And would a real coach actually put each player in that spot to play this read? Give specific positional fixes with target coordinates." },
  { key: "kidclarity", title: "Kid-clarity coach",
    focus: "Would a child of this age instantly understand the situation and SEE the read from the picture alone? Legible, uncrowded, unambiguous." },
];

function peerBlock(others) {
  return Array.isArray(others) && others.length
    ? `\n\nDebate round — the other coaches said:\n` +
      others.map((o) => `- [${o.key}] ${(o.critique || []).join("; ") || "PASS"}`).join("\n") +
      `\nHold your position on a real flaw; concede if their point resolves it.`
    : "";
}
function actorLines(scenario) {
  return (scenario.actors || [])
    .map((a) => `  ${a.kind.padEnd(9)} (${(a.x ?? 0).toFixed(2)}, ${(a.y ?? 0).toFixed(2)})${a.label ? " " + a.label : ""}`)
    .join("\n");
}

// A visual-geometry coach reviewing ONLY the picture.
export function buildVisualCoachPrompt({ scenario, ascii, node, concept, lens, others }) {
  const system =
`You are the ${lens.title} on a RinkReads panel reviewing the GEOMETRY of a drawn hockey question. The hockey read has already been approved by a separate panel — do NOT re-judge whether the answer is right. Judge ONLY the picture.
Your lens: ${lens.focus}
Coordinates are normalized 0..1 (x: left own-end -> right net; y: top -> bottom). The bar is PERFECT.
Return ONLY: {"verdict":"PASS"|"REVISE","critique":["specific positional points if REVISE (else empty)"]}`;
  const prompt =
`Age ${node.ageId}. Concept "${concept.name}". The scene must depict: ${concept.readConnection}
Question shown to the player: ${scenario.interaction?.prompt}
Actors (kind, x, y):
${actorLines(scenario)}
ASCII view:
${ascii}${peerBlock(others)}

Judge the picture against your lens at the PERFECT bar. PASS or REVISE.`;
  return { system, prompt };
}

// A hockey coach judging the READ from the geometry (3 hockey lenses reused).
export function buildVisualHockeyCoachPrompt({ scenario, ascii, node, concept, lens, others }) {
  const system =
`You are the ${lens.title} on a RinkReads hockey panel reviewing a DRAWN scenario question. Judge whether the hockey READ is correct given where the players are.
Your lens: ${lens.focus}
The bar is PERFECT — only PASS a question you would stake your name on.
Return ONLY: {"verdict":"PASS"|"REVISE","critique":["specific points if REVISE (else empty)"]}`;
  const prompt =
`Age ${node.ageId}. Concept "${concept.name}" — the read: ${concept.readConnection}
Question: ${scenario.interaction?.prompt}
Correct answer: ${JSON.stringify(scenario.correct)}
Actors (kind, x, y):
${actorLines(scenario)}
ASCII view:
${ascii}${peerBlock(others)}

Is the declared correct read the best play given these positions? PASS or REVISE.`;
  return { system, prompt };
}

// The Head Coach for a drawn question — stricter, whole-product fit.
export function buildVisualHeadCoachPrompt({ scenario, node, concept }) {
  const system =
`You are the HEAD COACH for RinkReads. A hockey panel approved the read and a visual panel approved the geometry of this DRAWN question. Your bar is higher still: brand & voice, exact fit to the curriculum node, that the picture stands proudly beside sibling questions, and that it is worthy of reaching the founder's own review.
Return ONLY: {"verdict":"APPROVE"|"KICK_BACK","notes":["reasons if KICK_BACK"]}`;
  const prompt =
`Node ${node.id} (age ${node.ageId}, concept "${concept.name}": ${concept.definition}).
Scenario:
${JSON.stringify(scenario, null, 2)}

Approve only if excellent on every dimension. Otherwise KICK_BACK with reasons.`;
  return { system, prompt };
}

// Distills a dropped scenario's geometry failure into 1-2 reusable rules.
export function buildVisualLessonExtractorPrompt({ scenario, node, critique }) {
  const system =
`A drawn hockey question was DROPPED after failing geometry review. Turn the failure into 1-2 GENERAL, reusable rules about player POSITIONING/proxemics a scenario author should follow next time (not specific to this exact scene). Keep each rule short and imperative.
Return ONLY: {"lessons":["rule 1","rule 2"]}`;
  const prompt =
`Age ${node.ageId}, concept "${node.conceptId}".
Scenario that failed:
${JSON.stringify(scenario, null, 2)}
Why it failed (geometry): ${(critique || []).join("; ")}

Give 1-2 general positioning rules to prevent this class of failure.`;
  return { system, prompt };
}
