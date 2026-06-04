#!/usr/bin/env node
// Smoke tests: prompt builders embed the right fields. Run: node tools/gauntlet/prompts.test.mjs
import { buildCreatorPrompt, buildPanelCoachPrompt, buildHeadCoachPrompt, buildLessonExtractorPrompt, PANEL_LENSES } from "./prompts.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const node = { id: "u11.decision-making", ageId: "U11", conceptId: "decision-making", depth: "D" };
const concept = { name: "Decision Making", definition: "Selecting the best option.", readConnection: "Choose the highest-value action." };
const domain = { name: "Hockey Sense" };
const q = { id: "x", type: "mc", nodeId: node.id, sit: "On a 2-on-1 what is the best read?", opts: ["Shoot", "Pass", "Wait", "Skate back"], ok: 1, explain: "Read what the D gives you." };

// creator embeds lessons when provided
{ const { system, prompt } = buildCreatorPrompt({ node, concept, domain, idSeed: "gen_x", lessons: "Lessons learned:\n- Keep stems to one cue." });
  ok("creator system non-empty", typeof system === "string" && system.length > 50);
  ok("creator embeds lessons", (system + prompt).includes("Keep stems to one cue.")); }

// creator without lessons still works
{ const { prompt } = buildCreatorPrompt({ node, concept, domain, idSeed: "gen_y", lessons: "" });
  ok("creator works without lessons", prompt.includes("u11.decision-making")); }

// three panel lenses exist incl. a perfectionist
{ ok("three lenses", Array.isArray(PANEL_LENSES) && PANEL_LENSES.length === 3);
  ok("has perfectionist", PANEL_LENSES.some((l) => l.key === "perfectionist")); }

// panel coach prompt carries the lens and peer critiques in debate rounds
{ const lens = PANEL_LENSES.find((l) => l.key === "perfectionist");
  const { system, prompt } = buildPanelCoachPrompt({ question: q, node, concept, lens, others: [{ key: "tactical", critique: ["the pass lane is contested"] }] });
  ok("panel system describes the lens", system.toLowerCase().includes("perfectionist"));
  ok("panel prompt includes peer critique in debate", prompt.includes("the pass lane is contested")); }

// head coach + extractor build
{ ok("head coach builds", typeof buildHeadCoachPrompt({ question: q, node, concept }).system === "string");
  ok("extractor includes node + critique", buildLessonExtractorPrompt({ question: q, node, critique: ["ambiguous stem"] }).prompt.includes("ambiguous stem")); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
