#!/usr/bin/env node
// Smoke tests: prompt builders embed the right fields. Run: node tools/gauntlet/prompts.test.mjs
import { buildCreatorPrompt, buildPanelCoachPrompt, buildHeadCoachPrompt, buildHeadCoachSoloPrompt, buildLessonExtractorPrompt, buildRubricConsolidationPrompt, PANEL_LENSES } from "./prompts.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const node = { id: "u11.decision-making", ageId: "U11", conceptId: "decision-making", depth: "D" };
const concept = { name: "Decision Making", definition: "Selecting the best option.", readConnection: "Choose the highest-value action." };
const domain = { name: "Hockey Sense" };
const q = { id: "x", type: "mc", nodeId: node.id, sit: "On a 2-on-1 what is the best read?", opts: ["Shoot", "Pass", "Wait", "Skate back"], ok: 1, explain: "Read what the D gives you." };

// creator embeds guidance (rubric + pending lessons) when provided
{ const { system, prompt } = buildCreatorPrompt({ node, concept, domain, idSeed: "gen_x", guidance: "Question-quality rubric:\n1. Keep stems to one cue." });
  ok("creator system non-empty", typeof system === "string" && system.length > 50);
  ok("creator embeds guidance", (system + prompt).includes("Keep stems to one cue.")); }

// creator without guidance still works
{ const { prompt } = buildCreatorPrompt({ node, concept, domain, idSeed: "gen_y", guidance: "" });
  ok("creator works without guidance", prompt.includes("u11.decision-making")); }

// rubric consolidation prompt carries the current rubric + new lessons
{ const { system, prompt } = buildRubricConsolidationPrompt({
    rubric: { version: 1, principles: [{ id: "option-parity", text: "Balance option lengths." }] },
    lessons: ["Never echo the stem wording in the correct answer.", { text: "Include the reflexive shoot option at U11." }] });
  ok("consolidation system mentions rubric", system.toLowerCase().includes("rubric"));
  ok("consolidation embeds current principle", prompt.includes("Balance option lengths."));
  ok("consolidation embeds new lessons (string + obj)", prompt.includes("Never echo the stem wording") && prompt.includes("reflexive shoot option")); }

// the read panel is tactical + pedagogy (perfectionist moved to the geometry panel)
{ ok("two read lenses", Array.isArray(PANEL_LENSES) && PANEL_LENSES.length === 2);
  ok("no perfectionist in read panel", !PANEL_LENSES.some((l) => l.key === "perfectionist"));
  ok("has tactical + pedagogy", PANEL_LENSES.some((l) => l.key === "tactical") && PANEL_LENSES.some((l) => l.key === "pedagogy")); }

// panel coach prompt carries the lens and peer critiques in debate rounds
{ const lens = PANEL_LENSES.find((l) => l.key === "pedagogy");
  const { system, prompt } = buildPanelCoachPrompt({ question: q, node, concept, lens, others: [{ key: "tactical", critique: ["the pass lane is contested"] }] });
  ok("panel system describes the lens", system.toLowerCase().includes("pedagogy"));
  ok("panel prompt includes peer critique in debate", prompt.includes("the pass lane is contested")); }

// head coach + extractor build
{ ok("head coach builds", typeof buildHeadCoachPrompt({ question: q, node, concept }).system === "string");
  ok("extractor includes node + critique", buildLessonExtractorPrompt({ question: q, node, critique: ["ambiguous stem"] }).prompt.includes("ambiguous stem")); }

// solo-first Head Coach (gates the room)
{ const { system, prompt } = buildHeadCoachSoloPrompt({ question: q, node, concept });
  ok("solo prompt mentions CONVENE", /CONVENE/.test(system));
  ok("solo prompt asks for the three verbs", /APPROVE/.test(system) && /KICK_BACK/.test(system));
  ok("solo prompt includes the question json", prompt.includes("\"id\": \"x\"")); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
