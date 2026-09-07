#!/usr/bin/env node
// Golden tests for the read-solver. Hand-labeled scenes; assert solve() picks the
// labeled read. This is the correctness backstop — if these fail, the solver (or a
// constant) is wrong, NOT the content. Run: node tools/solver-golden.mjs

import { solve } from "../src/playSolver.js";

const goalie = { id: "g", x: 184, y: 42.5, vx: 0, vy: 0 };
const net = { x: 185, y: 42.5 };
const base = { goalie, net, rinkW: 200, rinkH: 85 };

const TESTS = [
  {
    id: "GT1 open shot",
    expect: "SHOOT",
    scene: { ...base, carrier: { id: "c", x: 170, y: 42.5, vx: 0, vy: 0 }, teammates: [{ id: "t1", x: 172, y: 26 }], defenders: [{ id: "d1", x: 170, y: 34, vx: 0, vy: 0 }] },
    reads: [{ type: "SHOOT" }, { type: "PASS", toId: "t1" }, { type: "CONTAIN" }],
  },
  {
    id: "GT2 2-on-1 D committed → pass",
    expect: "PASS:t1",
    scene: { ...base, carrier: { id: "c", x: 158, y: 55, vx: 0, vy: 0 }, teammates: [{ id: "t1", x: 170, y: 24 }], defenders: [{ id: "d1", x: 166, y: 48, vx: -4, vy: 4 }] },
    reads: [{ type: "SHOOT" }, { type: "PASS", toId: "t1" }, { type: "DEKE", direction: "left" }, { type: "CONTAIN" }],
  },
  {
    id: "GT3 1-on-1 committed, ideal gap → deke",
    expect: "DEKE",
    scene: { ...base, carrier: { id: "c", x: 165, y: 42.5, vx: 0, vy: 0 }, teammates: [], defenders: [{ id: "d1", x: 170, y: 45, vx: -3, vy: -1 }] },
    reads: [{ type: "SHOOT" }, { type: "DEKE", direction: "left" }, { type: "CONTAIN" }, { type: "SKATE", toX: 178, toY: 35 }],
  },
  {
    id: "GT4 stationary D in lane → contain",
    expect: "CONTAIN",
    scene: { ...base, carrier: { id: "c", x: 160, y: 42.5, vx: 0, vy: 0 }, teammates: [], defenders: [{ id: "d1", x: 166, y: 42.5, vx: 0, vy: 0 }] },
    reads: [{ type: "SHOOT" }, { type: "DEKE", direction: "left" }, { type: "CONTAIN" }, { type: "SKATE", toX: 172, toY: 30 }],
  },
];

let pass = 0;
for (const t of TESTS) {
  const r = solve(t.scene, t.reads);
  const ok = r.answerKey.includes(t.expect);
  if (ok) pass++;
  const ranked = r.ranked.map(s => `${s.read.type}${s.read.toId ? ":" + s.read.toId : ""}=${s.score.toFixed(2)}`).join("  ");
  console.log(`${ok ? "PASS" : "FAIL"}  ${t.id}  → expected ${t.expect}, got [${r.answerKey.join(",")}]`);
  if (!ok) console.log(`        ranked: ${ranked}`);
}
console.log(`\n${pass}/${TESTS.length} golden tests passed`);
process.exit(pass === TESTS.length ? 0 : 1);
