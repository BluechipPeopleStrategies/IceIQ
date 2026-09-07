#!/usr/bin/env node
// Run: node src/scenario-engine/frameAdapters.test.mjs
import {
  FrameAdapterError,
  playSpaceToRinkFrame, rinkFrameToPlaySpace,
  legacy600x300ToRinkFrame, rinkFrameToLegacy600x300,
  normalizedToRinkFrame, rinkFrameToNormalized,
  PLAY_SPACE_200X85_ADAPTER, LEGACY_600X300_ADAPTER, NORMALIZED_ADAPTER,
} from "./frameAdapters.js";
import { NHL_200X85_PROFILE } from "./rinkFrame.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

// Every adapter declares source/destination/mirroring/precision/tolerance.
for (const [name, meta] of [["200x85", PLAY_SPACE_200X85_ADAPTER], ["600x300", LEGACY_600X300_ADAPTER], ["normalized", NORMALIZED_ADAPTER]]) {
  ok(`${name} adapter declares source/destination/mirroring/precision/tolerance`,
    typeof meta.source === "string" && typeof meta.destination === "string"
    && typeof meta.mirroring === "string" && typeof meta.precision === "number"
    && typeof meta.roundTripToleranceM === "number");
}

// Golden fixtures: real breakout-fixture-shaped coordinates from
// src/play/plays/dzBreakoutEscapePressure.js (the plan's own required
// source for this fixture set).
const BREAKOUT_FIXTURE_POINTS = [
  ["D1 freeze (behindNetRight)", [192.5, 42.5]],
  ["W1 support", [155, 20]],
  ["F1 forechecker", [183, 64]],
  ["F2 forechecker", [162, 42]],
  ["G goalie", [187, 42]],
  ["D1 escaped outcome", [186, 26]],
];

// Adapter tolerance is stated in metres of RinkFrame error; this space is
// feet, so the comparable feet tolerance is roundTripToleranceM / 0.3048,
// not an arbitrary multiplier. (A prior version of this test used *10 with
// a comment claiming "0.01m ~= 0.033ft" -- the real conversion is /0.3048
// (~3.28x), not *10; caught by two independent adversarial reviews,
// 2026-07-30. Harmless in practice since actual round-trip error here is
// near machine-epsilon, but the stated math was simply wrong.)
const FEET_TOLERANCE = PLAY_SPACE_200X85_ADAPTER.roundTripToleranceM / 0.3048;
for (const [label, feet] of BREAKOUT_FIXTURE_POINTS) {
  const rinkFramePoint = playSpaceToRinkFrame(feet);
  const back = rinkFrameToPlaySpace(rinkFramePoint);
  const dx = Math.abs(back[0] - feet[0]);
  const dy = Math.abs(back[1] - feet[1]);
  ok(`${label}: 200x85 -> RinkFrame -> 200x85 round-trips within tolerance`,
    dx <= FEET_TOLERANCE && dy <= FEET_TOLERANCE);
}

// 600x300 and normalized round-trip on the same real points, composed
// through the legacy canvas.
for (const [label, feet] of BREAKOUT_FIXTURE_POINTS) {
  const rinkFramePoint = playSpaceToRinkFrame(feet);
  const px = rinkFrameToLegacy600x300(rinkFramePoint);
  const backFromPx = legacy600x300ToRinkFrame(px);
  const dxM = Math.abs(backFromPx[0] - rinkFramePoint[0]);
  const dyM = Math.abs(backFromPx[1] - rinkFramePoint[1]);
  ok(`${label}: RinkFrame -> 600x300 -> RinkFrame round-trips within tolerance`,
    dxM <= LEGACY_600X300_ADAPTER.roundTripToleranceM && dyM <= LEGACY_600X300_ADAPTER.roundTripToleranceM);

  const norm = rinkFrameToNormalized(rinkFramePoint);
  ok(`${label}: normalized coordinates stay within 0..1`, norm.every((n) => n >= 0 && n <= 1));
  const backFromNorm = normalizedToRinkFrame(norm);
  const dxN = Math.abs(backFromNorm[0] - rinkFramePoint[0]);
  const dyN = Math.abs(backFromNorm[1] - rinkFramePoint[1]);
  ok(`${label}: RinkFrame -> normalized -> RinkFrame round-trips within tolerance`,
    dxN <= NORMALIZED_ADAPTER.roundTripToleranceM && dyN <= NORMALIZED_ADAPTER.roundTripToleranceM);
}

// ---- The safety-critical invariant: reject, never clamp -------------------
// "Adapters may reject bad coordinates but may never clamp a physics
// failure into legal bounds." A point just past the boards must THROW when
// converted outward to every presentation frame -- never silently return an
// in-bounds-looking coordinate.
const justPastBoards = [NHL_200X85_PROFILE.bounds.maxX + 1, 0];
const wayOffIce = [NHL_200X85_PROFILE.bounds.maxX * 5, NHL_200X85_PROFILE.bounds.maxY * 5];

ok("rinkFrameToPlaySpace rejects a point just past the boards", throws(() => rinkFrameToPlaySpace(justPastBoards)) && rinkFrameToPlaySpace.toString /* sanity: fn exists */);
ok("rinkFrameToPlaySpace throws FrameAdapterError specifically", (() => { try { rinkFrameToPlaySpace(justPastBoards); return false; } catch (e) { return e instanceof FrameAdapterError; } })());
ok("rinkFrameToLegacy600x300 rejects a point just past the boards", throws(() => rinkFrameToLegacy600x300(justPastBoards)));
ok("rinkFrameToNormalized rejects a point way off the ice", throws(() => rinkFrameToNormalized(wayOffIce)));

// The inbound direction also rejects rather than silently accepting.
ok("playSpaceToRinkFrame rejects a feet-space point off the end of the rink", throws(() => playSpaceToRinkFrame([10000, 42.5])));
ok("legacy600x300ToRinkFrame rejects an out-of-canvas pixel point", throws(() => legacy600x300ToRinkFrame([100000, 100000])));
ok("normalizedToRinkFrame rejects a value outside 0..1", throws(() => normalizedToRinkFrame([1.5, 0.5])));

// Non-finite input is rejected outright, not coerced.
ok("playSpaceToRinkFrame rejects NaN", throws(() => playSpaceToRinkFrame([NaN, 42.5])));
ok("rinkFrameToPlaySpace rejects Infinity", throws(() => rinkFrameToPlaySpace([Infinity, 0])));

// Confirm no accidental clamping anywhere: run every out-of-bounds case and
// verify none of them returns a numeric in-bounds-looking result.
{
  let anyClampedInsteadOfThrown = false;
  for (const badPoint of [justPastBoards, wayOffIce]) {
    for (const fn of [rinkFrameToPlaySpace, rinkFrameToLegacy600x300, rinkFrameToNormalized]) {
      try {
        fn(badPoint); // if this returns instead of throwing, that's a clamp -- a real failure
        anyClampedInsteadOfThrown = true;
      } catch { /* expected */ }
    }
  }
  ok("no adapter ever clamps an out-of-bounds RinkFrame point into a returned value", !anyClampedInsteadOfThrown);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
