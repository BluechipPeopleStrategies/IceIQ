// test-rules.mjs — golden regression tests that LOCK the hockey-logic rules.
// Each lesson encoded in validators.js gets a known-BAD fixture that must fail
// with that rule, plus a known-GOOD seed that must pass. If a rule ever silently
// breaks (or a "fix" loosens it), this goes red. Run: npm run test:rules
//
// Add a case here every time you encode a new lesson (see src/scenario/LESSONS.md).

import { lintScenario } from "../tools/scenario-author/validate.mjs";
import { rankByZone, correctSet } from "../src/scenario/value.js";

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

  // ── 15 new lessons (2026-06-11 batch) — see src/scenario/LESSONS.md
  {
    name: "exactlyOnePuck: a second puck → err",
    seed: (() => { const s = clone(); s.actors.push({ id: "puck2", kind: "puck", x: 0.5, y: 0.5 }); return s; })(),
    expectErr: "exactly 1 puck",
  },
  {
    name: "numbersThemeMatchesActors: 2-on-1 tag on a 3-vs-1 board → err",
    seed: (() => { const s = clone(); s.themes = ["2-on-1", "decision-making"]; return s; })(),
    expectErr: "match the label",
  },
  {
    name: "oddManRushIsActuallyOdd: odd-man tag but 3-vs-3 → err",
    seed: (() => { const s = clone(); s.actors.push({ id: "d2", kind: "defender", x: 0.66, y: 0.30 }, { id: "d3", kind: "defender", x: 0.60, y: 0.36 }); return s; })(),
    expectErr: "no odd man",
  },
  {
    name: "shootTargetsAttackingNet: shot at own net → err",
    seed: (() => { const s = clone(); s.interaction = { kind: "path", verb: "shoot", from: "carrier", prompt: "Rip a shot on net before the defender closes the lane down." }; s.correct = { kind: "path", end: { x: 0.10, y: 0.5, tolerance: 0.06 } }; return s; })(),
    expectErr: "wrong way",
  },
  {
    name: "backcheckHeadsToOwnNet: backcheck toward the attacking net → err",
    seed: (() => { const s = clone(); s.interaction = { kind: "path", verb: "backcheck", from: "carrier", prompt: "Backcheck hard through the middle and take away the trailer." }; s.correct = { kind: "path", end: { x: 0.90, y: 0.5, tolerance: 0.06 } }; return s; })(),
    expectErr: "backchecking means",
  },
  {
    name: "noDefenderInsideCrease: a defender in the blue paint → warn",
    seed: (() => { const s = clone(); s.actors.push({ id: "d2", kind: "defender", x: 0.91, y: 0.56 }); return s; })(),
    expectWarn: "blue paint",
  },
  {
    name: "goalieOnPuckToNetAngle: goalie off the shooting line → warn",
    seed: (() => { const s = clone(); s.actors.find(a => a.id === "g").y = 0.30; return s; })(),
    expectWarn: "puck-to-net angle",
  },
  {
    name: "netFrontThemeNeedsNetFrontPresence: net-front tag, nobody at the net → warn",
    seed: (() => { const s = clone(); s.themes = ["net-front", "decision-making"]; return s; })(),
    expectWarn: "net-front",
  },
  {
    name: "selectionAllLanesBlocked: every receiver covered → err",
    seed: (() => { const s = clone(); s.actors.push({ id: "d2", kind: "defender", x: 0.79, y: 0.62 }); return s; })(),
    expectErr: "unsolvable",
  },
  {
    name: "selectionSingleClearLane: two open wrong receivers → warn",
    seed: (() => { const s = clone(); s.actors = s.actors.filter(a => a.id !== "closedWing"); s.actors.push({ id: "t3", kind: "teammate", x: 0.84, y: 0.62 }, { id: "t4", kind: "teammate", x: 0.66, y: 0.30 }); s.interaction.from = ["openWing", "t3", "t4"]; return s; })(),
    expectWarn: "ambiguous",
  },
  {
    name: "noPositionTagsOnYoungBoards: RW/LW tags on a U9 board → err",
    seed: (() => { const s = clone(); s.levels = ["U9 / Novice"]; return s; })(),
    expectErr: "generic players",
  },
  {
    name: "skaterCountWithinAgeCap: U7 board with 6 skaters → err",
    seed: (() => { const s = clone(); s.levels = ["U7 / Initiation"]; s.actors.push({ id: "d2", kind: "defender", x: 0.66, y: 0.30 }, { id: "d3", kind: "defender", x: 0.60, y: 0.36 }); return s; })(),
    expectErr: "cap is",
  },
  {
    name: "advancedThemesGatedByAge: power-play on a U9 board → err",
    seed: (() => { const s = clone(); s.levels = ["U9 / Novice"]; s.themes = ["power-play", "decision-making"]; return s; })(),
    expectErr: "U11+",
  },
  {
    name: "noPressureMechanicsOnYoungBoards: timer on a U9 board → err",
    seed: (() => { const s = clone(); s.levels = ["U9 / Novice"]; s.timer = { duration: 8000 }; return s; })(),
    expectErr: "pressure mechanics",
  },
  {
    name: "difficultyCeilingByAge: difficulty 3 on a U7 board → err",
    seed: (() => { const s = clone(); s.levels = ["U7 / Initiation"]; s.difficulty = 3; return s; })(),
    expectErr: "ceiling for this age",
  },
];

let failed = 0;
for (const c of cases) {
  const r = lintScenario(c.seed);
  let pass;
  if (c.expectOk) pass = r.ok === true;
  else if (c.expectWarn) pass = (r.warns || []).some(w => w.includes(c.expectWarn));
  else pass = !r.ok && r.errs.some(e => e.includes(c.expectErr));
  console.log(`${pass ? "PASS" : "FAIL"}  ${c.name}`);
  if (!pass) {
    failed++;
    console.log(`        ok=${r.ok}  errs=${JSON.stringify(r.errs)}`);
  }
}
// ── value-model golden checks (Slice 3 gate)
const ranked = rankByZone(clone());
const cs = correctSet(ranked);
const valueCases = [
  { name: "value: open answer ranks highest", pass: ranked[0]?.id === "openWing" },
  { name: "value: exactly 1 correct answer proven", pass: cs.length === 1 && cs[0] === "openWing" },
  { name: "value: a sabotaged answer is NOT top-ranked", pass: ranked[0]?.id !== "closedWing" },
];
for (const c of valueCases) {
  console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  if (!c.pass) failed++;
}

const total = cases.length + valueCases.length;
console.log(`\n${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);
