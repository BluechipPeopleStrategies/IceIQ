#!/usr/bin/env node
// Run: node src/scenario/schema-multistep.test.mjs
import { validateScenario } from "./schema.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const baseStep = (extra = {}) => ({
  actors: [{ id: "you", kind: "player", x: 0.7, y: 0.5 }, { id: "t", kind: "teammate", x: 0.6, y: 0.3 }],
  interaction: { kind: "selection", prompt: "tap the open one", from: ["you", "t"] },
  correct: { kind: "selection", ids: ["t"] }, feedback: { right: "yes", wrong: "no" }, ...extra,
});
const multi = (steps) => ({ id: "m", type: "scenario", stage: { view: "right", zone: "off-zone" }, steps });

ok("valid 2-step passes", validateScenario(multi([baseStep({ outcome: "x" }), baseStep()])).ok === true);

// a bad step fails, with the step index in the error
const bad = validateScenario(multi([baseStep(), { ...baseStep(), interaction: { kind: "nope" } }]));
ok("bad step fails", bad.ok === false);
ok("error names the step", bad.errs.some(e => /step\s*\[?1/i.test(e)));

// flat + steps together is rejected
const both = { id: "b", type: "scenario", stage: { view: "right", zone: "off-zone" },
  interaction: { kind: "point", prompt: "p" }, correct: { kind: "point", x: 0.5, y: 0.5, tolerance: 0.08 },
  feedback: { right: "y", wrong: "n" }, actors: [{ id: "you", kind: "player", x: 0.5, y: 0.5 }],
  steps: [baseStep()] };
ok("flat + steps rejected", validateScenario(both).ok === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
