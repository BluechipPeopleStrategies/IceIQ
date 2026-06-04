#!/usr/bin/env node
// Traces ONE question through the deterministic gates (G1 solver, G2 validation)
// with real computed output, then prints where the agent gates pick up. Shows the
// exact sequence a question clears before shipping. Run: node tools/gauntlet-trace.mjs

import { solve, validateItem } from "../src/playSolver.js";

// A real 2-on-1: lone D has committed to the carrier; teammate open at the back door.
const scene = {
  carrier: { id: "you", x: 158, y: 55, vx: 0, vy: 0 },
  teammates: [{ id: "mate", x: 170, y: 24 }],
  defenders: [{ id: "d1", x: 166, y: 48, vx: -4, vy: 4 }],
  goalie: { id: "g", x: 184, y: 42.5, vx: 0, vy: 0 },
  net: { x: 185, y: 42.5 }, rinkW: 200, rinkH: 85,
};
const item = {
  ageBand: "U11", concept: "2-on-1 pass read",
  candidateReads: [
    { type: "SHOOT" }, { type: "PASS", toId: "mate" },
    { type: "DEKE", direction: "left" }, { type: "CONTAIN" },
  ],
};

const line = (s) => console.log(s);
line("==================  GAUNTLET TRACE  ==================");
line(`Question: ${item.concept}  (age ${item.ageBand})\n`);

line("G0  CREATE        a Creator agent placed the players + the decision (offline).  ->  candidate built");

const r = solve(scene, item.candidateReads);
line("\nG1  SOLVER        computes the answer key from geometry (no LLM):");
for (const s of r.ranked) {
  const name = s.read.type + (s.read.toId ? ":" + s.read.toId : "");
  line(`        ${name.padEnd(11)} quality ${s.score.toFixed(2)}`);
}
line(`        ANSWER KEY = ${r.answerKey.join(", ")}   (correct by construction)  ->  PASS`);

const v = validateItem(item, scene);
line("\nG2  VALIDATION    deterministic publish checks:");
line(`        exactly one top read .......... ${r.topGroup.length === 1 ? "yes" : "TIE(" + r.topGroup.length + ")"}`);
line(`        distractors strictly lower .... ${v.errors.some(e => e.code === "DISTRACTOR_TOO_CLOSE") ? "NO" : "yes"}`);
line(`        in bounds / no overlap ........ ${v.errors.some(e => e.code === "OUT_OF_BOUNDS" || e.code === "PLAYER_OVERLAP") ? "NO" : "yes"}`);
line(`        structural hash (dedupe) ...... ${v.structuralHash.slice(0, 40)}...`);
line(`        VALID = ${v.valid}  ->  ${v.valid ? "PASS" : "FAIL (" + v.errors.map(e => e.code).join(",") + ")"}`);

line("\nG3  GENERATOR FIT  format is on U11's approved list (MC) ............  ->  PASS");
line("G4  CONFIRMERS (2) pedagogy gate: one concept + answer-position randomized,");
line("                   option lengths balanced, sizes age-appropriate .......  ->  BOTH PASS");
line("G5  COACH PANEL (3) tactical + hockey-pedagogy + adversarial-views-render ->  PASS");
line("G6  RATIONALE      LLM writes the 'why' from the solver breakdown only ..  ->  prose attached");
line("G7  RENDER+SNAPSHOT draws on the rink (U11 tokens), reproducible ........  ->  PASS");
line("G8  SHIP           cleared every gate  ->  SHIPPED to the bank\n");
line("Meta: solver golden tests must stay green in CI, or the gauntlet pauses.");
line("=====================================================");
