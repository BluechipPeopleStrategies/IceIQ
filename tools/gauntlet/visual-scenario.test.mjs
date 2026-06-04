#!/usr/bin/env node
// Run: node tools/gauntlet/visual-scenario.test.mjs
import { repairScenario, scenarioHash, mockScenario } from "./visual-scenario.mjs";
import { lintScenario } from "../scenario-author/validate.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const node = { id: "u9.passing", ageId: "U9", conceptId: "passing" };

// mockScenario is engine-valid and carries the node tags
{ const s = mockScenario(node, "gen_u9_passing_x1");
  ok("mock id set", s.id === "gen_u9_passing_x1");
  ok("mock type scenario", s.type === "scenario");
  ok("mock nodeId tag", s.nodeId === "u9.passing");
  ok("mock levels from age", JSON.stringify(s.levels) === JSON.stringify(["U9 / Novice"]));
  const v = lintScenario(s);
  ok("mock passes lintScenario", v.ok === true); }

// repairScenario forces id/type/nodeId/levels, keeps the rest
{ const raw = { id: "wrong", stage: { view: "right" }, actors: [{ id: "a", kind: "player", x: 0.5, y: 0.5 }], interaction: { kind: "selection", prompt: "x", from: ["a"], order: "any" }, correct: { kind: "selection", ids: ["a"] } };
  const r = repairScenario(raw, node, "gen_id_2");
  ok("repair forces id", r.id === "gen_id_2");
  ok("repair forces type", r.type === "scenario");
  ok("repair forces nodeId", r.nodeId === "u9.passing");
  ok("repair sets levels", JSON.stringify(r.levels) === JSON.stringify(["U9 / Novice"]));
  ok("repair keeps actors", r.actors.length === 1); }

// scenarioHash is stable and ignores id, sensitive to positions
{ const a = mockScenario(node, "id_a");
  const b = mockScenario(node, "id_b");
  ok("hash ignores id", scenarioHash(a) === scenarioHash(b));
  const moved = mockScenario(node, "id_c"); moved.actors[2].x = 0.1;
  ok("hash changes when a player moves", scenarioHash(moved) !== scenarioHash(a)); }

// --- visual creator prompt ---
import { buildVisualCreatorPrompt } from "./visual-prompts.mjs";
{ const concept = { name: "Passing", definition: "Lane selection and timing.", readConnection: "Find the open lane." };
  const domain = { name: "Puck Skills" };
  const { system, prompt } = buildVisualCreatorPrompt({ node: { id: "u9.passing", ageId: "U9", conceptId: "passing" }, concept, domain, idSeed: "gen_u9_passing_z" });
  ok("creator system non-empty", typeof system === "string" && system.length > 100);
  ok("creator embeds nodeId", prompt.includes("u9.passing"));
  ok("creator embeds the level", prompt.includes("U9 / Novice"));
  ok("creator embeds the concept read", prompt.includes("Find the open lane.")); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
