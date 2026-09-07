// RinkFrame — the canonical physical coordinate frame, per
// docs/superpowers/specs/2026-07-29-scenario-engine-design.md's
// "Physical coordinate frame" section:
//   - units: metres and seconds
//   - origin: centre ice
//   - +x: toward the canonical right end
//   - +y: toward the bottom of the canonical top-down view
//   - facing angle: zero along +x, increasing clockwise
//   - attacking direction: stored explicitly as "+x" or "-x"
//   - rink profile: boards, lines, goals, crease, playable bounds
//
// The metric rink profile is DERIVED from src/play/rinkAnchors.js's real,
// already-battle-tested feet-space anchors rather than hand-transcribed —
// single source of truth, no risk of the two drifting apart. That existing
// space already puts y=0 at the top of the drawn SVG (y increases downward),
// which is already the "+y toward the bottom" convention this frame wants,
// so the conversion is a pure re-centre + unit change, no axis flip.

import { RINK, ANCHORS } from "../play/rinkAnchors.js";

export const RINK_FRAME_VERSION = "rink-frame-v1";

export const FEET_TO_METRES = 0.3048;

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

// [xFt, yFt] in the existing 200x85 space (origin top-left) -> [xM, yM] in
// RinkFrame (origin centre ice, metres). Pure re-centre + scale, no flip.
export function feetPointToRinkFrame([xFt, yFt]) {
  return [
    round6((xFt - RINK.length / 2) * FEET_TO_METRES),
    round6((yFt - RINK.midY) * FEET_TO_METRES),
  ];
}

export function rinkFramePointToFeet([xM, yM]) {
  return [
    round6(xM / FEET_TO_METRES + RINK.length / 2),
    round6(yM / FEET_TO_METRES + RINK.midY),
  ];
}

// The one rink profile this foundation ships: NHL-scale 200x85ft, the same
// geometry every existing catalog play already assumes. Versioned so a
// youth-scale or IIHF-scale profile can be added later without touching
// this one (framework-fit decision: profiles are versioned per spec).
// attackingDirection is deliberately NOT a field here. The rink geometry
// itself is symmetric -- the same physical ice can be attacked either way
// (see mirrorX() in rinkAnchors.js, already used to author far-side
// variants). "Attacking direction stored explicitly as +x or -x" (spec,
// Physical coordinate frame) is a property of a given ScenarioDefinition
// instance, not of the rink profile it references -- it lives on
// ScenarioDefinition.rinkFrame.attackingDirection instead (see
// scenarioDefinition.js). A first version of this file put it here as a
// static, unvarying constant; caught by adversarial review (2026-07-30) as
// dead and spec-inconsistent, since two independent reviewers both traced
// that nothing ever read or varied it.
export const NHL_200X85_PROFILE = Object.freeze({
  id: "nhl-200x85-v1",
  version: RINK_FRAME_VERSION,
  units: "metres",
  lengthM: round6(RINK.length * FEET_TO_METRES),
  widthM: round6(RINK.width * FEET_TO_METRES),
  bounds: Object.freeze({
    minX: round6(-(RINK.length / 2) * FEET_TO_METRES),
    maxX: round6((RINK.length / 2) * FEET_TO_METRES),
    minY: round6(-RINK.midY * FEET_TO_METRES),
    maxY: round6((RINK.width - RINK.midY) * FEET_TO_METRES),
  }),
  // Named landmarks (goal lines, blue lines, circles, corners, walls, net,
  // slot...) carried over verbatim from ANCHORS and converted to metres, so
  // "the slot" is still the same real point in both spaces.
  landmarks: Object.freeze(
    Object.fromEntries(
      Object.entries(ANCHORS).map(([name, point]) => [name, feetPointToRinkFrame(point)])
    )
  ),
});

const PROFILES = { [NHL_200X85_PROFILE.id]: NHL_200X85_PROFILE };

export function rinkProfile(id = NHL_200X85_PROFILE.id) {
  const profile = PROFILES[id];
  if (!profile) throw new Error(`unknown rink profile: ${id}`);
  return profile;
}

export function isWithinBounds([x, y], profile = NHL_200X85_PROFILE) {
  return x >= profile.bounds.minX && x <= profile.bounds.maxX
    && y >= profile.bounds.minY && y <= profile.bounds.maxY;
}

// Facing-angle convention helper (zero along +x, increasing clockwise, i.e.
// toward +y first since +y is "down"). Pure math, no state -- actor schemas
// (Phase 2+) store the angle itself; this just documents/normalizes it.
export function normalizeFacingRadians(theta) {
  const twoPi = Math.PI * 2;
  const wrapped = theta % twoPi;
  return wrapped < 0 ? wrapped + twoPi : wrapped;
}
