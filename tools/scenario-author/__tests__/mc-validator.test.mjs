// Node assertion test for the mc-block validator rules. Run: node <thisfile>
import assert from "node:assert";
import { lintScenario } from "../validate.mjs";

const base = () => ({
  id: "t_mc", type: "scenario", level: "U13 / Peewee", difficulty: 2,
  cat: "Hockey Sense", stage: { view: "right", zone: "off-zone" },
  actors: [
    { id: "you", kind: "player", x: 0.60, y: 0.30, tag: "YOU" },
    { id: "g", kind: "goalie", x: 0.918, y: 0.5 },
    { id: "x1", kind: "defender", x: 0.82, y: 0.55 },
    { id: "puck", kind: "puck", x: 0.602, y: 0.30 },
  ],
  interaction: { kind: "point", prompt: "Tap the open ice you should fill for a scoring chance." },
  correct: { kind: "point", zoneId: "oz-high-slot" },
  feedback: { right: "Yes.", wrong: "No." },
});

let s = base();
s.mc = { stem: "What is the best play?", opts: ["Fill the high slot", "Drive the net", "Curl back", "Dump it in"], ok: 0 };
assert.equal(lintScenario(s).ok, true, "valid mc should pass: " + JSON.stringify(lintScenario(s).errs));

s = base(); s.mc = { opts: ["a", "b", "c"], ok: 0 };
assert.equal(lintScenario(s).ok, false, "3 opts must fail");

s = base(); s.mc = { opts: ["a", "b", "c", "d"], ok: 4 };
assert.equal(lintScenario(s).ok, false, "ok=4 must fail");

s = base(); s.mc = { opts: ["a", "a", "c", "d"], ok: 0 };
assert.equal(lintScenario(s).ok, false, "duplicate opts must fail");

s = base(); s.mc = { opts: ["a", "", "c", "d"], ok: 0 };
assert.equal(lintScenario(s).ok, false, "empty option must fail");

console.log("OK mc-validator");
