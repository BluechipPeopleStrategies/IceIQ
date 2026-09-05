import test from "node:test";
import assert from "node:assert/strict";
import {
  pixelToWorldPoint,
  worldPointToEyesUpTap,
  isRinkPointOnIce,
  resizeEyesUpTrial,
} from "./eyesUpScene3DCore.js";

test("Eyes Up pixel/world projection round trips on the canonical rink", () => {
  for (const pixel of [{ x: 30, y: 150 }, { x: 120, y: 93 }, { x: 300, y: 150 }, { x: 560, y: 100 }]) {
    const world = pixelToWorldPoint(pixel, 600, 300);
    const roundTrip = worldPointToEyesUpTap(world, 600, 300);
    assert.ok(roundTrip);
    assert.ok(Math.abs(roundTrip.x - pixel.x) < 1e-9);
    assert.ok(Math.abs(roundTrip.y - pixel.y) < 1e-9);
  }
});

test("rounded-board hit testing rejects the rectangular plane's corner overshoot", () => {
  assert.equal(isRinkPointOnIce({ x: 0, y: 0 }), true);
  assert.equal(isRinkPointOnIce({ x: 30.48, y: 12.954 }), false);
  assert.equal(isRinkPointOnIce({ x: 29, y: 0 }), true);
});

test("resize preserves a frozen look's normalized positions and state", () => {
  const trial = {
    W: 600, H: 300, stage: "look", armed: true, resolved: false, showFlash: true,
    flash: { x: 510, y: 60, hitR: 30 }, tap: null, result: null,
  };
  const resized = resizeEyesUpTrial(trial, 900, 450);
  assert.equal(resized.stage, "look");
  assert.equal(resized.armed, true);
  assert.equal(resized.resolved, false);
  assert.equal(resized.showFlash, true);
  assert.deepEqual(resized.flash, { x: 765, y: 90, hitR: 45 });
});
