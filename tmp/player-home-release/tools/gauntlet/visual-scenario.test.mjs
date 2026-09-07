#!/usr/bin/env node
// Run: node tools/gauntlet/visual-scenario.test.mjs
import { repairScenario, scenarioHash, mockScenario, forcedLevels } from "./visual-scenario.mjs";
import { lintScenario } from "../scenario-author/validate.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const node = { id: "u9.passing", ageId: "U9", conceptId: "passing" };

// forcedLevels derives levels from the node, dropping invalid creator strings
{ ok("empty -> node primary", JSON.stringify(forcedLevels(node, [])) === JSON.stringify(["U9 / Novice"]));
  ok("bad creator level dropped, primary forced", JSON.stringify(forcedLevels(node, ["U13 / Atom"])) === JSON.stringify(["U9 / Novice"]));
  ok("valid extra kept as secondary", JSON.stringify(forcedLevels(node, ["U11 / Atom"])) === JSON.stringify(["U9 / Novice", "U11 / Atom"]));
  ok("primary not duplicated if creator also lists it", JSON.stringify(forcedLevels(node, ["U9 / Novice", "U11 / Atom"])) === JSON.stringify(["U9 / Novice", "U11 / Atom"])); }

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

// lint guards. Clean mock passes; phantom answer ids rejected (engine validator);
// overlapping skaters rejected (the new guard); puck-on-carrier still allowed.
{ const base = mockScenario(node, "lint_base");
  ok("clean mock passes lint", lintScenario(base).ok === true);

  const phantom = JSON.parse(JSON.stringify(base));
  phantom.correct.ids = ["lw"];                 // no actor carries id "lw"
  ok("phantom answer id rejected", lintScenario(phantom).ok === false);

  const overlap = JSON.parse(JSON.stringify(base));
  const you = overlap.actors.find(a => a.id === "you");
  const mc = overlap.actors.find(a => a.id === "mate_cov");
  mc.x = you.x + 0.01; mc.y = you.y + 0.02;     // stack a teammate on the player
  const or = lintScenario(overlap);
  ok("overlapping skaters fail lint", or.ok === false && /overlap/i.test(or.errs[0]));

  const puckOnYou = JSON.parse(JSON.stringify(base));
  const pk = puckOnYou.actors.find(a => a.id === "puck");
  pk.x = you.x; pk.y = you.y;                    // puck on carrier is allowed
  ok("puck on carrier still passes lint", lintScenario(puckOnYou).ok === true); }

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
