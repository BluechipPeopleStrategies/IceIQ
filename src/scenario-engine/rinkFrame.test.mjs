#!/usr/bin/env node
// Run: node src/scenario-engine/rinkFrame.test.mjs
import {
  NHL_200X85_PROFILE, rinkProfile, isWithinBounds,
  feetPointToRinkFrame, rinkFramePointToFeet, normalizeFacingRadians,
} from "./rinkFrame.js";
import { RINK, ANCHORS } from "../play/rinkAnchors.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

ok("profile lookup returns the NHL profile by id", rinkProfile("nhl-200x85-v1") === NHL_200X85_PROFILE);
ok("unknown profile id throws", (() => { try { rinkProfile("nope"); return false; } catch { return true; } })());

// centerIce [100, 42.5] is the origin in the existing feet space -> must
// convert to exactly [0, 0] in RinkFrame.
{
  const [x, y] = feetPointToRinkFrame(ANCHORS.centerIce);
  ok("centre-ice feet-anchor converts to RinkFrame origin", x === 0 && y === 0);
}

// behindNetRight sits near, but inside, the +x boards -- must land inside
// bounds and close to (but less than) maxX.
{
  const [x] = feetPointToRinkFrame(ANCHORS.behindNetRight);
  ok("behindNetRight converts to a point inside +x bounds", x > 0 && x < NHL_200X85_PROFILE.bounds.maxX);
}

// Real NHL rink is 200ft x 85ft -- confirm the metric conversion is right,
// not just self-consistent.
ok("lengthM matches 200ft in metres", Math.abs(NHL_200X85_PROFILE.lengthM - 60.96) < 1e-6);
ok("widthM matches 85ft in metres", Math.abs(NHL_200X85_PROFILE.widthM - 25.908) < 1e-6);
ok("bounds are symmetric around the centre-ice origin", NHL_200X85_PROFILE.bounds.minX === -NHL_200X85_PROFILE.bounds.maxX);

ok("every named landmark round-trips to a point inside bounds", Object.values(NHL_200X85_PROFILE.landmarks).every((p) => isWithinBounds(p)));
ok("landmark count matches rinkAnchors.js's own ANCHORS count", Object.keys(NHL_200X85_PROFILE.landmarks).length === Object.keys(ANCHORS).length);

// Round-trip: feet -> RinkFrame -> feet must return the original point
// (within floating-point rounding), for every real anchor in the catalog.
{
  let allRoundTrip = true;
  for (const [name, feet] of Object.entries(ANCHORS)) {
    const back = rinkFramePointToFeet(feetPointToRinkFrame(feet));
    const dx = Math.abs(back[0] - feet[0]);
    const dy = Math.abs(back[1] - feet[1]);
    if (dx > 0.001 || dy > 0.001) { allRoundTrip = false; console.log(`  mismatch on ${name}: ${feet} -> ${back}`); }
  }
  ok("every real anchor round-trips feet -> RinkFrame -> feet within 0.001ft", allRoundTrip);
}

// A point genuinely outside the rink (e.g. off the end of the ice) must
// fail isWithinBounds, not be silently accepted.
ok("a point far outside the rink is not within bounds", !isWithinBounds([1000, 1000]));
ok("a point just past the boards is not within bounds", !isWithinBounds([NHL_200X85_PROFILE.bounds.maxX + 0.01, 0]));
ok("the origin (centre ice) is within bounds", isWithinBounds([0, 0]));

// Facing-angle convention: zero along +x, increasing clockwise, wraps to 0..2pi.
ok("normalizeFacingRadians leaves 0 as 0", normalizeFacingRadians(0) === 0);
ok("normalizeFacingRadians wraps a negative angle into 0..2pi", normalizeFacingRadians(-Math.PI / 2) > 0);
ok("normalizeFacingRadians wraps 2pi back to 0", Math.abs(normalizeFacingRadians(Math.PI * 2)) < 1e-9);

ok("RINK constant is unchanged (200x85, midY 42.5)", RINK.length === 200 && RINK.width === 85 && RINK.midY === 42.5);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
