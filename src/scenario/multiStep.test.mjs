#!/usr/bin/env node
// Run: node src/scenario/multiStep.test.mjs
import { normalizeSteps, stepToScenario, start, record, next, currentStep, isComplete, summary } from "./multiStep.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// A flat (single-step) scenario normalizes to one step
const flat = { id: "f", type: "scenario", nodeId: "u11.x", stage: { view: "right", zone: "off-zone" },
  actors: [{ id: "you", kind: "player", x: 0.7, y: 0.5 }], interaction: { kind: "point", prompt: "tap" },
  correct: { kind: "point", x: 0.7, y: 0.3, tolerance: 0.08 }, feedback: { right: "y", wrong: "n" } };
ok("flat -> 1 step", normalizeSteps(flat).length === 1);

// A multi-step scenario normalizes to its steps
const multi = { id: "m", type: "scenario", nodeId: "u13.x", stage: { view: "right", zone: "off-zone" },
  steps: [
    { actors: [{ id: "you", kind: "player", x: 0.7, y: 0.5 }], interaction: { kind: "selection", prompt: "p1", from: ["you"] }, correct: { kind: "selection", ids: ["you"] }, feedback: { right: "r1", wrong: "w1" }, outcome: "happened" },
    { actors: [{ id: "you", kind: "player", x: 0.7, y: 0.3 }], interaction: { kind: "point", prompt: "p2" }, correct: { kind: "point", x: 0.7, y: 0.3, tolerance: 0.08 }, feedback: { right: "r2", wrong: "w2" } },
  ] };
ok("multi -> 2 steps", normalizeSteps(multi).length === 2);

// stepToScenario merges top-level fields with a step and drops `steps`
const s0 = stepToScenario(multi, 0);
ok("stepToScenario carries id+stage+nodeId", s0.id === "m" && s0.stage.view === "right" && s0.nodeId === "u13.x");
ok("stepToScenario inlines the step's interaction", s0.interaction.prompt === "p1");
ok("stepToScenario has no steps key", !("steps" in s0));

// State machine: advance through both steps, recording results
let st = start(multi);
ok("starts at step 0", currentStep(st).interaction.prompt === "p1");
ok("not complete at start", isComplete(st) === false);
st = record(st, { ok: false, reason: "wrong" }); // wrong first read still advances
st = next(st);
ok("advances to step 1", currentStep(st).interaction.prompt === "p2");
ok("still not complete", isComplete(st) === false);
st = record(st, { ok: true, reason: "ok" });
st = next(st);
ok("complete after last step", isComplete(st) === true);
const sm = summary(st);
ok("summary counts steps", sm.total === 2 && sm.correct === 1);
ok("summary keeps per-step results", sm.perStep[0] === false && sm.perStep[1] === true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
