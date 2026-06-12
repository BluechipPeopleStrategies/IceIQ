// test-rules.mjs — golden regression tests that LOCK the hockey-logic rules.
// Each lesson encoded in validators.js gets a known-BAD fixture that must fail
// with that rule, plus a known-GOOD seed that must pass. If a rule ever silently
// breaks (or a "fix" loosens it), this goes red. Run: npm run test:rules
//
// Add a case here every time you encode a new lesson (see src/scenario/LESSONS.md).

import { lintScenario } from "../tools/scenario-author/validate.mjs";

// A known-good compiled scenario (off-zone odd-man selection). Clone per test.
const GOOD = {
  id: "good_oddman", type: "scenario", nodeId: "u13.odd-man-reads",
  levels: ["U13 / Peewee"], themes: ["odd-man-rush", "decision-making", "offensive-zone"],
  cat: "Offensive Play", difficulty: 2, stage: { view: "right", zone: "off-zone" },
  actors: [
    { id: "carrier", kind: "player", x: 0.74, y: 0.5, tag: "YOU" },
    { id: "puck", kind: "puck", x: 0.742, y: 0.498 },
    { id: "openWing", kind: "teammate", x: 0.84, y: 0.738, tag: "RW" },
    { id: "closedWing", kind: "teammate", x: 0.83, y: 0.284, tag: "LW" },
    { id: "d1", kind: "defender", x: 0.778, y: 0.409 },
    { id: "g", kind: "goalie", x: 0.918, y: 0.5 },
  ],
  interaction: { kind: "selection", from: ["openWing", "closedWing"], order: "any", prompt: "You have the puck in the offensive zone on an odd-man. Tap the teammate with the open lane." },
  correct: { kind: "selection", ids: ["openWing"] },
  feedback: { right: "The open-side teammate has a clear lane to the net.", wrong: "That lane is covered — hit the other side." },
};
const clone = () => JSON.parse(JSON.stringify(GOOD));

const cases = [
  {
    name: "GOOD seed passes",
    seed: clone(),
    expectOk: true,
  },
  {
    name: "offsidesOnEntry: puck at blue line + teammates deeper → err",
    seed: (() => { const s = clone(); s.actors.find(a => a.id === "carrier").x = 0.66; s.actors.find(a => a.id === "puck").x = 0.662; return s; })(),
    expectErr: "offsides-on-entry",
  },
  {
    name: "defenderGoalSide: lone defender behind the puck → err",
    seed: (() => { const s = clone(); s.actors.find(a => a.id === "d1").x = 0.70; return s; })(),
    expectErr: "goal-side",
  },
  {
    name: "actorsDoNotOverlap: two skaters on the same spot → err",
    seed: (() => { const s = clone(); const cw = s.actors.find(a => a.id === "closedWing"); const ow = s.actors.find(a => a.id === "openWing"); cw.x = ow.x; cw.y = ow.y; return s; })(),
    expectErr: "overlap",
  },
  {
    name: "promptLengthSane: too-short prompt → err",
    seed: (() => { const s = clone(); s.interaction.prompt = "Tap one."; return s; })(),
    expectErr: "too short",
  },
];

let failed = 0;
for (const c of cases) {
  const r = lintScenario(c.seed);
  let pass;
  if (c.expectOk) pass = r.ok === true;
  else pass = !r.ok && r.errs.some(e => e.includes(c.expectErr));
  console.log(`${pass ? "PASS" : "FAIL"}  ${c.name}`);
  if (!pass) {
    failed++;
    console.log(`        ok=${r.ok}  errs=${JSON.stringify(r.errs)}`);
  }
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
