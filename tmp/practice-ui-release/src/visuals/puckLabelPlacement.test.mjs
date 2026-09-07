import test from 'node:test';
import assert from 'node:assert/strict';
import { placePuckLabel, puckLabelObstacles } from './puckLabelPlacement.js';
import { OrthographicCamera, Vector3 } from 'three';
import { U11_READ_SEQUENCE } from '../one-on-one/readSequenceU11.js';
import { getReadSceneCamera } from '../one-on-one/readSequenceVisuals.js';

const overlap = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

test('the puck leader starts at the locator edge instead of drawing across the puck', () => {
  const result = placePuckLabel({ anchor: { x: 150, y: 150 }, viewport: { width: 390, height: 300 }, anchorRadius: 10 });
  assert.ok(Math.abs(Math.hypot(result.leaderStartX, result.leaderStartY) - 10) < 1e-8);
  const endX = result.leaderStartX + Math.cos(result.leaderAngle) * result.leaderLength;
  const endY = result.leaderStartY + Math.sin(result.leaderAngle) * result.leaderLength;
  assert.ok(Math.abs(endX - result.offsetX) < 1e-8);
  assert.ok(Math.abs(endY - result.offsetY) < 1e-8);
});

test('puck tag clears adjacent D1 body/ring and player badges in the reported low-angle layout', () => {
  // Screen-space bounds taken approximately from the reviewed 655px-wide rink:
  // the old down-right tag overlaps the D1 feet; F2 occupies the upper-left.
  const input = { anchor: { x: 302, y: 266 }, viewport: { width: 655, height: 550 },
    labelSize: { width: 42, height: 21 }, obstacles: [
      { x: 311, y: 248, width: 50, height: 45 }, // D1 body and locator ring
      { x: 314, y: 204, width: 44, height: 29 }, // D1 badge
      { x: 264, y: 231, width: 39, height: 32 }, // F2 body
      { x: 260, y: 194, width: 42, height: 29 }, // F2 badge
      { x: 190, y: 294, width: 45, height: 60 }, // F1
    ] };
  assert.ok(overlap({ x: 317, y: 279, width: 42, height: 21 }, input.obstacles[0]) > 0, 'The fixture must reproduce the reported overlap.');
  const before = JSON.stringify(input);
  const result = placePuckLabel(input);
  for (const obstacle of input.obstacles) assert.equal(overlap(result, obstacle), 0);
  assert.equal(JSON.stringify(input), before);
  assert.ok(result.leaderLength > 0);
});

test('puck tags remain fully inside phone camera edges and leader still starts at the actual puck', () => {
  for (const anchor of [{ x: 1, y: 1 }, { x: 389, y: 1 }, { x: 1, y: 389 }, { x: 389, y: 389 }]) {
    const result = placePuckLabel({ anchor, viewport: { width: 390, height: 390 }, labelSize: { width: 43, height: 22 }, obstacles: [] });
    assert.ok(result.x >= 5 && result.y >= 5);
    assert.ok(result.x + result.width <= 385 && result.y + result.height <= 385);
    assert.equal(result.offsetX, result.x - anchor.x);
    assert.equal(result.offsetY, result.y - anchor.y);
    assert.ok(Number.isFinite(result.leaderAngle));
  }
});

test('a crowded rink selects a lower-overlap position without claiming every tag can be collision-free', () => {
  const input = { anchor: { x: 150, y: 150 }, viewport: { width: 300, height: 300 }, labelSize: { width: 42, height: 21 }, obstacles: [
    { x: 158, y: 85, width: 80, height: 160 },
    { x: 78, y: 80, width: 65, height: 64 },
    { x: 90, y: 169, width: 22, height: 15 },
  ] };
  const result = placePuckLabel(input);
  const area = input.obstacles.reduce((sum, obstacle) => sum + overlap(result, obstacle), 0);
  assert.ok(area < 42 * 21, 'Do not cover an entire badge when a partly open quadrant exists.');
  assert.ok(Number.isFinite(result.overlapArea));
});

test('actual post-pass actors and rink cameras keep the tag off nearby D1 without changing the freeze', () => {
  const state = structuredClone(U11_READ_SEQUENCE.branches.pass.state);
  Object.assign(state.actors.find(actor => actor.id === 'D1'), { x: 19.1, y: -1.2 });
  const before = JSON.stringify(state), viewport = { width: 655, height: 550 };
  for (const preset of ['rink-side', 'broadcast']) {
    const fit = getReadSceneCamera({ minX: 7.2, maxX: 32, minY: -14.5, maxY: 14.5 }, viewport.width / viewport.height, preset);
    const camera = new OrthographicCamera(fit.left, fit.right, fit.top, fit.bottom, fit.near, fit.far);
    camera.position.set(...fit.position); camera.lookAt(...fit.target); camera.updateMatrixWorld();
    const project = (x, y, height) => {
      const point = new Vector3(y, height, -x).project(camera);
      return { x: (point.x + 1) * viewport.width / 2, y: (1 - point.y) * viewport.height / 2 };
    };
    const obstacles = puckLabelObstacles(state.actors, project);
    const result = placePuckLabel({ anchor: project(state.puck.x, state.puck.y, .165), viewport, obstacles });
    const defenderBounds = puckLabelObstacles([state.actors.find(actor => actor.id === 'D1')], project);
    for (const rect of defenderBounds) assert.equal(overlap(result, rect), 0, `${preset}: D1 remains visible`);
  }
  assert.equal(JSON.stringify(state), before);
});
