import test from "node:test";
import assert from "node:assert/strict";
import {
  shotClockMs, coveredAtStartCount, closesDuringShotCount, holeOpenMs,
  EASY_CLOCK_MS, HARD_CLOCK_MS, EASY_HOLE_MS, HARD_HOLE_MS,
} from "../src/cognitive-gym/shootoutCore.js";

// Deterministic PRNG for later tasks.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("shot clock shrinks with level", () => {
  assert.equal(shotClockMs(1), EASY_CLOCK_MS);
  assert.equal(shotClockMs(20), HARD_CLOCK_MS);
  assert.ok(shotClockMs(1) > shotClockMs(10));
  assert.ok(shotClockMs(10) > shotClockMs(20));
});

test("goalie covers more cells at higher levels", () => {
  assert.equal(coveredAtStartCount(1), 1);
  assert.equal(coveredAtStartCount(20), 4);
  assert.ok(coveredAtStartCount(10) >= coveredAtStartCount(1));
});

test("more cells close mid-shot at higher levels", () => {
  assert.equal(closesDuringShotCount(1), 0);
  assert.equal(closesDuringShotCount(20), 2);
});

test("hole-open window shrinks, and faster at the top (pow curve)", () => {
  assert.equal(holeOpenMs(1), EASY_HOLE_MS);
  assert.equal(holeOpenMs(20), HARD_HOLE_MS);
  const dropLow = holeOpenMs(1) - holeOpenMs(10);
  const dropHigh = holeOpenMs(10) - holeOpenMs(20);
  assert.ok(dropHigh > dropLow, "window should drop faster at high levels");
});

import {
  CELL_IDS, CELL_LAYOUT, cellRects, cellAtPoint,
} from "../src/cognitive-gym/shootoutCore.js";

test("net has six named cells", () => {
  assert.equal(CELL_IDS.length, 6);
  assert.ok(CELL_IDS.includes("fiveHole"));
  assert.ok(CELL_IDS.includes("gloveHi"));
});

test("cellRects tiles the net with six non-overlapping rects", () => {
  const net = { x: 0, y: 0, w: 300, h: 200 };
  const rects = cellRects(net);
  assert.equal(rects.length, 6);
  // top-left cell starts at the net origin
  const tl = rects.find((r) => r.id === "gloveHi");
  assert.equal(tl.x, 0);
  assert.equal(tl.y, 0);
  assert.equal(tl.w, 100);
  assert.equal(tl.h, 100);
  // bottom-right cell ends at the net's far corner
  const br = rects.find((r) => r.id === "blkrLo");
  assert.equal(br.x, 200);
  assert.equal(br.y, 100);
});

test("cellAtPoint maps a point to its cell, or null when outside", () => {
  const net = { x: 0, y: 0, w: 300, h: 200 };
  const rects = cellRects(net);
  assert.equal(cellAtPoint(rects, 50, 50), "gloveHi");
  assert.equal(cellAtPoint(rects, 150, 150), "fiveHole");
  assert.equal(cellAtPoint(rects, 999, 999), null);
});

test("cellAtPoint: tap exactly on vertical seam maps to left cell (no dead zone)", () => {
  const net = { x: 0, y: 0, w: 300, h: 200 };
  const rects = cellRects(net);
  // seam between gloveHi (col 0, x 0-100) and midHi (col 1, x 100-200) is x=100
  assert.equal(cellAtPoint(rects, 100, 50), "gloveHi");
});

import { makeShot, pickN } from "../src/cognitive-gym/shootoutCore.js";

test("pickN returns n distinct items deterministically", () => {
  const rng = mulberry32(7);
  const got = pickN(["a", "b", "c", "d"], 2, rng);
  assert.equal(got.length, 2);
  assert.equal(new Set(got).size, got.length);
});

test("makeShot: coverage and open counts match the level params", () => {
  const shot = makeShot(1, { rng: mulberry32(1) });
  assert.equal(shot.coveredAtStart.length, 1); // coveredAtStartCount(1)
  assert.equal(shot.openAtStart.length, 5);
  assert.equal(shot.closeSchedule.length, 0); // closesDuringShotCount(1) === 0
});

test("makeShot: at the top level at least one cell stays open all shot", () => {
  const shot = makeShot(20, { rng: mulberry32(3) });
  const closingIds = new Set(shot.closeSchedule.map((c) => c.cellId));
  const alwaysOpen = shot.openAtStart.filter((id) => !closingIds.has(id));
  assert.ok(alwaysOpen.length >= 1, "a scorable cell must always remain");
});

test("makeShot is deterministic for a given seed", () => {
  const a = makeShot(15, { rng: mulberry32(42) });
  const b = makeShot(15, { rng: mulberry32(42) });
  assert.deepEqual(a, b);
});

import { isCellOpenAt, scoreShot } from "../src/cognitive-gym/shootoutCore.js";

// A hand-built shot so the assertions do not depend on the generator's RNG.
const SHOT = {
  level: 10,
  coveredAtStart: ["midHi"],
  openAtStart: ["gloveHi", "blkrHi", "gloveLo", "fiveHole", "blkrLo"],
  closeSchedule: [{ cellId: "blkrLo", atMs: 600 }],
  shotClockMs: 1500,
};

test("isCellOpenAt: covered cell is never open", () => {
  assert.equal(isCellOpenAt(SHOT, "midHi", 0), false);
});
test("isCellOpenAt: a closing cell is open before atMs, closed after", () => {
  assert.equal(isCellOpenAt(SHOT, "blkrLo", 500), true);
  assert.equal(isCellOpenAt(SHOT, "blkrLo", 600), false);
});
test("isCellOpenAt: a plain open cell stays open", () => {
  assert.equal(isCellOpenAt(SHOT, "gloveHi", 1400), true);
});

test("scoreShot: open cell in time is a goal worth points", () => {
  const r = scoreShot("gloveHi", 200, SHOT);
  assert.equal(r.success, true);
  assert.ok(r.points > 0);
});
test("scoreShot: covered cell is a save worth zero", () => {
  assert.deepEqual(scoreShot("midHi", 200, SHOT), { success: false, points: 0, normElapsed: 200 / 1500 });
});
test("scoreShot: tapping a hole after it closed is a save", () => {
  assert.equal(scoreShot("blkrLo", 700, SHOT).success, false);
});
test("scoreShot: a tap after the clock expired is a save", () => {
  assert.equal(scoreShot("gloveHi", 1600, SHOT).success, false);
});
test("scoreShot: null (no tap) is a save", () => {
  assert.equal(scoreShot(null, 1600, SHOT).success, false);
});
test("scoreShot: a faster goal scores more than a slower one", () => {
  assert.ok(scoreShot("gloveHi", 100, SHOT).points > scoreShot("gloveHi", 1400, SHOT).points);
});

import {
  weightedPickN, makeGoalieProfile, GOALIE_PROFILES, nearestCellWithin,
} from "../src/cognitive-gym/shootoutCore.js";

test("weightedPickN: null weights matches pickN exactly (uniform default)", () => {
  const items = ["a", "b", "c", "d"];
  assert.deepEqual(weightedPickN(items, 2, null, mulberry32(9)), pickN(items, 2, mulberry32(9)));
});

test("weightedPickN: returns n distinct items", () => {
  const got = weightedPickN(["a", "b", "c", "d"], 3, { a: 5 }, mulberry32(11));
  assert.equal(got.length, 3);
  assert.equal(new Set(got).size, 3);
});

test("weightedPickN: heavy cells get picked far more often", () => {
  const rng = mulberry32(21);
  const weights = { a: 9, b: 1, c: 1, d: 1 };
  let aCount = 0;
  for (let i = 0; i < 500; i += 1) {
    if (weightedPickN(["a", "b", "c", "d"], 1, weights, rng)[0] === "a") aCount += 1;
  }
  // expectation is 9/12 = 75%; require well above the uniform 25%
  assert.ok(aCount > 300, `heavy item picked ${aCount}/500, expected > 300`);
});

test("makeGoalieProfile is deterministic per seed and honest (weights exist)", () => {
  const a = makeGoalieProfile(mulberry32(5));
  const b = makeGoalieProfile(mulberry32(5));
  assert.equal(a.id, b.id);
  assert.ok(GOALIE_PROFILES.includes(a));
  for (const p of GOALIE_PROFILES) {
    assert.ok(p.report.length > 0);
    const heavy = Object.values(p.weights).filter((w) => w > 1);
    assert.ok(heavy.length >= 2, `${p.id} must genuinely bias coverage`);
  }
});

test("makeShot honors goalie weights (biased coverage over many shots)", () => {
  const rng = mulberry32(31);
  const weights = { gloveHi: 3, gloveLo: 3, midHi: 1, fiveHole: 1, blkrHi: 1, blkrLo: 1 };
  let gloveCovered = 0;
  const N = 400;
  for (let i = 0; i < N; i += 1) {
    const shot = makeShot(5, { rng, weights }); // level 5 covers ~2 cells
    if (shot.coveredAtStart.includes("gloveHi") || shot.coveredAtStart.includes("gloveLo")) {
      gloveCovered += 1;
    }
  }
  const uniformRng = mulberry32(31);
  let gloveUniform = 0;
  for (let i = 0; i < N; i += 1) {
    const shot = makeShot(5, { rng: uniformRng });
    if (shot.coveredAtStart.includes("gloveHi") || shot.coveredAtStart.includes("gloveLo")) {
      gloveUniform += 1;
    }
  }
  assert.ok(gloveCovered > gloveUniform, `weighted ${gloveCovered} should exceed uniform ${gloveUniform}`);
});

test("nearestCellWithin: inside a cell returns that cell", () => {
  const rects = cellRects({ x: 0, y: 0, w: 300, h: 200 });
  assert.equal(nearestCellWithin(rects, 50, 50), "gloveHi");
});

test("nearestCellWithin: a near-miss outside the net snaps to the nearest cell", () => {
  const rects = cellRects({ x: 100, y: 100, w: 300, h: 200 });
  // 20px left of the net edge, level with gloveHi — inside the 0.6-cell slack
  assert.equal(nearestCellWithin(rects, 80, 150), "gloveHi");
});

test("nearestCellWithin: a far miss returns null", () => {
  const rects = cellRects({ x: 100, y: 100, w: 300, h: 200 });
  assert.equal(nearestCellWithin(rects, 0, 0), null);
});
