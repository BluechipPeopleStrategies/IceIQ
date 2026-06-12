#!/usr/bin/env node
// Run: node tools/gauntlet/visual-prompts.test.mjs
import { VISUAL_LENSES, buildVisualHockeyCoachPrompt, buildVisualCoachPrompt, buildVisualHeadCoachPrompt, buildVisualHeadCoachSoloPrompt, buildAuditHeadCoachPrompt, buildVisualLessonExtractorPrompt } from "./visual-prompts.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const node = { id: "u11.decision-making", ageId: "U11", conceptId: "decision-making" };
const concept = { name: "Decision Making", definition: "Pick the best option.", readConnection: "Choose the highest-value play." };
const scenario = { id: "s", type: "scenario", interaction: { kind: "selection", prompt: "Tap the open teammate." }, actors: [{ id: "you", kind: "player", x: 0.46, y: 0.55 }], correct: { kind: "selection", ids: ["mate"] } };
const ascii = "+---+\n|Y  |\n+---+";

ok("four visual lenses", Array.isArray(VISUAL_LENSES) && VISUAL_LENSES.length === 4);
ok("has perfectionist", VISUAL_LENSES.some((l) => l.key === "perfectionist"));
ok("has antagonistic", VISUAL_LENSES.some((l) => l.key === "antagonistic"));
ok("has spatial proxemics", VISUAL_LENSES.some((l) => l.key === "spatial"));
ok("has kid-clarity", VISUAL_LENSES.some((l) => l.key === "kidclarity"));
ok("spatial lens mentions positioning", VISUAL_LENSES.find((l) => l.key === "spatial").focus.toLowerCase().includes("position"));

{ const lens = VISUAL_LENSES.find((l) => l.key === "spatial");
  const { system, prompt } = buildVisualCoachPrompt({ scenario, ascii, node, concept, lens, others: [{ key: "perfectionist", critique: ["too crowded"] }] });
  ok("visual coach system names the lens", system.toLowerCase().includes("spatial") || system.toLowerCase().includes("proxemics"));
  ok("visual coach prompt has the ascii", prompt.includes("|Y  |"));
  ok("visual coach prompt has coords", prompt.includes("0.46"));
  ok("visual coach prompt has peer critique", prompt.includes("too crowded")); }

{ const lens = { key: "tactical", title: "Tactical", focus: "is the read right" };
  const { system, prompt } = buildVisualHockeyCoachPrompt({ scenario, ascii, node, concept, lens, others: null });
  ok("hockey coach prompt has the scenario prompt", prompt.includes("Tap the open teammate."));
  ok("hockey coach prompt has the read connection", prompt.includes("Choose the highest-value play.")); }

ok("visual head coach builds", typeof buildVisualHeadCoachPrompt({ scenario, node, concept }).system === "string");
ok("extractor embeds critique", buildVisualLessonExtractorPrompt({ scenario, node, critique: ["defender off to the side"] }).prompt.includes("defender off to the side"));

// solo-first + audit Head Coach (drawn questions)
{ const n2 = { id: "u13.odd-man-reads", ageId: "u13" };
  const c2 = { name: "Odd-Man Reads", definition: "attack the soft spot" };
  const sc2 = { id: "s1", type: "scenario", actors: [] };
  const ascii = "RINK\n...";
  const solo = buildVisualHeadCoachSoloPrompt({ scenario: sc2, ascii, node: n2, concept: c2 });
  ok("visual solo mentions CONVENE", /CONVENE/.test(solo.system));
  ok("visual solo includes ascii board", solo.prompt.includes("RINK"));

  const audit = buildAuditHeadCoachPrompt({ scenario: sc2, ascii, node: n2, concept: c2 });
  ok("audit verbs are KEEP/REVISE/RETIRE", /KEEP/.test(audit.system) && /REVISE/.test(audit.system) && /RETIRE/.test(audit.system));
  ok("audit allows CONVENE", /CONVENE/.test(audit.system)); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
