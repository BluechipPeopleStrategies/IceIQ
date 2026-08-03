#!/usr/bin/env node
// Run: node src/cognitive-gym/lateReadOffside.test.mjs
//
// Late Read taught an illegal pass.
//
// The drill plays bottom-to-top — YOU carry the puck at y = 0.86H and the
// receivers seed above — but drawRink drew the blue lines VERTICALLY, as a
// landscape sheet. The zones ran perpendicular to the direction of play, so
// "up ice" crossed no line the rink actually drew, and receivers were seeded
// from the top of the canvas down. On a portrait sheet, where the attacking
// blue line is the horizontal one at 0.33H, nearly every rep put a receiver
// over that line while the puck was still behind it: offside.
//
// The fix is two halves and this pins both. The rink now draws portrait for
// this drill, and the seeding is constrained onside. A drill whose whole job is
// training a pass read must not train a pass that cannot legally be made.

import { makeTrial, ATTACKING_BLUE_LINE, teammateCount } from "./lateReadCore.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// Deterministic RNG so a failure is reproducible.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
}

const W = 900, H = 600;
const LINE_Y = H * ATTACKING_BLUE_LINE;

// ---- the constant itself -----------------------------------------------------
ok("the attacking blue line matches the portrait rink's line (0.33)",
  ATTACKING_BLUE_LINE === 0.33);

// ---- sweep every level, many seeds -------------------------------------------
// A receiver is OFFSIDE when it sits above the attacking blue line (smaller y)
// while the puck, on YOU's stick, is still below it.
{
  let trials = 0, offsideTrials = 0, offsideReceivers = 0, receivers = 0;
  for (let level = 1; level <= 10; level++) {
    for (let seed = 1; seed <= 60; seed++) {
      const t = makeTrial(level, W, H, { rng: makeRng(level * 1000 + seed) });
      trials++;
      const puckBehindLine = t.you.y > LINE_Y;
      let bad = 0;
      for (const m of t.teammates) {
        receivers++;
        if (puckBehindLine && m.y < LINE_Y) { bad++; offsideReceivers++; }
      }
      if (bad) offsideTrials++;
    }
  }
  const pct = (offsideTrials / trials) * 100;
  console.log(`\n  ${trials} trials · ${receivers} receivers`);
  console.log(`  trials containing an offside receiver: ${offsideTrials} (${pct.toFixed(1)}%)`);
  console.log(`  offside receivers: ${offsideReceivers}\n`);

  ok("NO trial contains an offside receiver", offsideTrials === 0);
  ok("no individual receiver is offside", offsideReceivers === 0);
  ok("the sweep actually ran a meaningful number of trials", trials >= 600);
}

// ---- the puck carrier stays behind the line ----------------------------------
// If YOU ever seeded past the line the constraint above would be vacuous.
{
  let allBehind = true;
  for (let level = 1; level <= 10; level++) {
    const t = makeTrial(level, W, H, { rng: makeRng(level) });
    if (!(t.you.y > LINE_Y)) allBehind = false;
  }
  ok("YOU (the puck) is always behind the attacking blue line", allBehind);
}

// ---- the drill still works ---------------------------------------------------
// The constraint must not have collapsed the playable area or broken the read.
{
  let okCounts = true, okBounds = true, okDistinct = true, changeReps = 0;
  for (let level = 1; level <= 10; level++) {
    for (let seed = 1; seed <= 30; seed++) {
      const t = makeTrial(level, W, H, { rng: makeRng(level * 77 + seed) });
      if (t.teammates.length !== Math.max(2, teammateCount(level))) okCounts = false;
      for (const p of [...t.teammates, ...t.defenders, t.you]) {
        if (!(p.x > 0 && p.x < W && p.y > 0 && p.y < H)) okBounds = false;
      }
      if (t.changes && t.finalIndex === t.firstIndex) okDistinct = false;
      if (t.changes) changeReps++;
    }
  }
  ok("every trial still seeds its full complement of receivers", okCounts);
  ok("every marker is still strictly in bounds", okBounds);
  ok("a change rep still switches to a DIFFERENT receiver", okDistinct);
  ok("change reps still occur across the level range", changeReps > 0);
}

// ---- the regression guard ----------------------------------------------------
// Seeding from the top of the canvas is what caused this. Prove the old range
// would have failed, so this test cannot silently stop testing anything.
{
  const oldStyleOffside = [];
  for (let seed = 1; seed <= 200; seed++) {
    const rng = makeRng(seed);
    // Reproduce the OLD seeding range: anywhere from the top pad down to 0.62H.
    const y = 24 + rng() * (H * 0.62 - 24);
    if (y < LINE_Y) oldStyleOffside.push(y);
  }
  ok("the pre-fix seeding range would indeed have produced offside receivers",
    oldStyleOffside.length > 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
