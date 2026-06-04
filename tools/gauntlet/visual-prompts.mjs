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
