#!/usr/bin/env node
// Run: node src/cognitive-gym/runThePlayZone.test.mjs
//
// Decision 1, docs/manual-playtest/2026-08-03-decisions-round3.md.
//
// Run the Play used to scatter its skaters across a full 200-foot sheet: the
// screenshot showed one skater deep in the left end, one at centre, one at the
// right blue line and two in the right end, with a pass from 16 to 19 spanning
// the whole rink. Skaters sat on both sides of both blue lines with no puck
// established, so every sequence was offside on paper, and every marker was
// tiny. Thomas: "it would actually be offside, and we don't really want to
// shoot something 200 feet."
//
// The fix confines the play to ONE end zone and renders that zone filling the
// canvas. Two things have to hold for that to be true, and both are checked
// here against the real code rather than the intent:
//
//   1. The rink drawn in this mode has no blue line and no centre line — there
//      is no line to cross, and decision 2 of the same session bans showing a
//      blue line to U7/U9 at all.
//   2. No skater lands in the crease or under the Action Rail.
//
// drawRink talks to a canvas 2d context, so it is driven here with a recording
// stub. No canvas dependency, no browser.

import { drawRink, endZoneNet, targetMaxY, GYM_RAIL_BAND } from "./gymEngine.js";
import { makeSkaters, makeSequence } from "./runThePlayCore.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// A 2d context that records every drawing call instead of rasterising it.
function recordingCtx() {
  const calls = [];
  const rec = (name) => (...args) => { calls.push({ name, args }); };
  return {
    calls,
    beginPath: rec("beginPath"), closePath: rec("closePath"),
    moveTo: rec("moveTo"), lineTo: rec("lineTo"), arcTo: rec("arcTo"),
    quadraticCurveTo: rec('quadraticCurveTo'),
    createLinearGradient: () => ({ addColorStop: rec('linearColorStop') }),
    createRadialGradient: () => ({ addColorStop: rec('radialColorStop') }),
    arc: rec("arc"), rect: rec("rect"), fillRect: rec("fillRect"),
    fill: rec("fill"), stroke: rec("stroke"), clip: rec("clip"),
    save: rec("save"), restore: rec("restore"),
    fillStyle: "", strokeStyle: "", lineWidth: 0, globalAlpha: 1,
    font: "", textAlign: "", textBaseline: "",
  };
}

const W = 600, H = 372;

// ---- 1. the zone view draws no line the play could be offside across --------

{
  const ctx = recordingCtx();
  drawRink(ctx, W, H, { orientation: "portrait", zone: "end" });

  // A blue line spans the full width of the sheet. In the old full-sheet
  // portrait view they were fillRect(0, H*0.33, W, 5) and fillRect(0, H*0.67, W, 5).
  const fullWidthBars = ctx.calls.filter(
    (c) => c.name === "fillRect" && c.args[0] === 0 && c.args[2] === W && c.args[3] < H * .05
  );
  ok("the end-zone view draws no full-width blue or centre line", fullWidthBars.length === 0);

  // And the full-sheet view still does — otherwise this test would pass for
  // the wrong reason (e.g. if drawRink silently stopped drawing lines at all).
  const full = recordingCtx();
  drawRink(full, W, H, { orientation: "portrait", zone: "full" });
  const fullSheetBars = full.calls.filter(
    (c) => c.name === "fillRect" && c.args[0] === 0 && c.args[2] === W && c.args[3] < H * .05
  );
  ok("the full-sheet view still draws its three lines — the check above means something",
    fullSheetBars.length === 3);
}

{
  // Only ONE net, at one end. Two creases would mean the sheet is still whole.
  const ctx = recordingCtx();
  drawRink(ctx, W, H, { orientation: "portrait", zone: "end" });
  const net = endZoneNet(W, H, "portrait");
  const creaseArcs = ctx.calls.filter(
    (c) => c.name === "arc" && Math.abs(c.args[2] - net.r) < 0.001
  );
  ok("exactly one crease is drawn, at the end-zone net", creaseArcs.length === 1);
  ok("the crease is at the near end, not the middle of the sheet",
    Math.abs(creaseArcs[0].args[1] - net.y) < 0.001 && net.y < H * 0.3);
}

// ---- 2. skaters stay inside that zone --------------------------------------

// Deterministic rng so a failure is reproducible.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

{
  const net = endZoneNet(W, H, "portrait");
  const yMax = targetMaxY(H);
  let inCrease = 0, underRail = 0, offSheet = 0, total = 0;
  let minCount = Infinity;

  // Every level's skater count, many seeds each — placement is random, so one
  // sample proves nothing.
  for (let seed = 1; seed <= 300; seed += 1) {
    for (const count of [4, 5, 6, 7]) {
      const skaters = makeSkaters(count, W, H, { rng: seeded(seed * 31 + count) });
      minCount = Math.min(minCount, skaters.length);
      for (const s of skaters) {
        total += 1;
        if (Math.hypot(s.x - net.x, s.y - net.y) < net.r) inCrease += 1;
        if (s.y > yMax) underRail += 1;
        if (s.x - s.r < 0 || s.x + s.r > W || s.y - s.r < 0 || s.y + s.r > H) offSheet += 1;
      }
    }
  }

  ok(`no skater stands in the crease (0 of ${total})`, inCrease === 0);
  ok(`no skater sits under the Action Rail's bottom ${Math.round(GYM_RAIL_BAND * 100)}% (0 of ${total})`, underRail === 0);
  ok(`no skater hangs off the sheet (0 of ${total})`, offSheet === 0);
  ok("every requested skater still gets placed — the keep-outs did not starve the sampler",
    minCount >= 4);
}

{
  // The point of the whole change: the longest possible pass is now a pass
  // WITHIN a zone, not the length of the ice. The canvas is one end zone
  // (~30 m wide by ~21 m deep), so the worst case is its diagonal — about 37 m
  // / 120 ft, versus the 60 m / 200 ft the old full-sheet layout allowed.
  let longestFrac = 0;
  for (let seed = 1; seed <= 300; seed += 1) {
    const skaters = makeSkaters(7, W, H, { rng: seeded(seed) });
    const seq = makeSequence(skaters.length, 8, seeded(seed + 7777));
    for (let i = 1; i < seq.length; i += 1) {
      const a = skaters[seq[i - 1]], b = skaters[seq[i]];
      longestFrac = Math.max(longestFrac, Math.hypot(a.x - b.x, a.y - b.y) / Math.hypot(W, H));
    }
  }
  // The canvas diagonal IS the zone diagonal now, so this is a sanity bound,
  // not a distance cap — the cap is the zone itself.
  ok(`the longest pass fits inside the zone (${(longestFrac * 100).toFixed(0)}% of the zone diagonal)`,
    longestFrac <= 1);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
