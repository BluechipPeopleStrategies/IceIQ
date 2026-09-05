import test from 'node:test';
import assert from 'node:assert/strict';
import * as placement from './rinkActionPlacement.js';

const overlap = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

test('a carry cue at the left camera edge switches sides instead of clamping across the skater', () => {
  const actor = { x: -10, y: 31, width: 66, height: 93 };
  const result = placement.placeRinkActionCue({ anchor: { x: 20, y: 78 }, viewport: { width: 390, height: 300 },
    labelSize: { width: 60, height: 44 }, offset: [-46, 0], obstacles: [actor] });
  assert.equal(overlap(result, actor), 0, 'The complete tap target must clear the visible skater.');
  assert.ok(result.x >= 6 && result.x + result.width <= 384);
  assert.ok(result.x >= actor.x + actor.width, 'A free right side is preferred over the cropped left side.');
});

test('a cue moves above or below a blocked side and its connector stops at the tap target edge', () => {
  const obstacles = [{ x: 125, y: 65, width: 45, height: 100 }, { x: 180, y: 75, width: 90, height: 90 }];
  const result = placement.placeRinkActionCue({ anchor: { x: 150, y: 110 }, viewport: { width: 310, height: 260 },
    labelSize: { width: 64, height: 44 }, offset: [42, 0], obstacles });
  for (const obstacle of obstacles) assert.equal(overlap(result, obstacle), 0);
  assert.ok(result.leaderLength < Math.hypot(result.offsetX, result.offsetY));
  const endX = 150 + Math.cos(result.leaderAngle) * result.leaderLength;
  const endY = 110 + Math.sin(result.leaderAngle) * result.leaderLength;
  assert.ok(endX >= result.x - .001 && endX <= result.x + result.width + .001);
  assert.ok(endY >= result.y - .001 && endY <= result.y + result.height + .001);
});

test('clear cue placements retain their preferred side without modifying source geometry', () => {
  const input = { anchor: { x: 150, y: 150 }, viewport: { width: 390, height: 300 },
    labelSize: { width: 60, height: 44 }, offset: [-46, 0], obstacles: [] };
  const before = JSON.stringify(input);
  const result = placement.placeRinkActionCue(input);
  assert.equal(result.offsetX, -46);
  assert.equal(result.offsetY, 0);
  assert.equal(JSON.stringify(input), before);
});
