import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3 } from 'three';
import { U9_READ_SEQUENCE } from './readSequenceU9.js';
import { U11_READ_SEQUENCE } from './readSequenceU11.js';
import { U13_READ_SEQUENCE } from './readSequenceU13.js';
import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import { createReadSceneFrame, getReadSceneBounds, getReadSceneCamera, clampReadSceneTargetCenter } from './readSequenceVisuals.js';

const definitions = [U9_READ_SEQUENCE, U11_READ_SEQUENCE, U13_READ_SEQUENCE];
const rink = NHL_200X85_PROFILE.bounds;
const goalX = NHL_200X85_PROFILE.landmarks.goalLineRight[0];
const fullHalf = { minX: 0, maxX: rink.maxX, minY: rink.minY, maxY: rink.maxY };

function authoredStates(definition) {
  return [definition.initialState, ...Object.values(definition.branches).flatMap(branch => [
    branch.state, ...branch.read2.targets.map(target => target.state),
  ])];
}

function boxCorners(bounds) {
  return [bounds.minX, bounds.maxX].flatMap(x => [bounds.minY, bounds.maxY].flatMap(y =>
    [0, 2.1].map(height => new Vector3(y, height, -x))));
}

function actualCamera(settings) {
  assert.ok(settings, 'A camera configuration must be returned');
  const camera = new OrthographicCamera(settings.left, settings.right, settings.top, settings.bottom, settings.near, settings.far);
  camera.position.fromArray(settings.position);
  camera.lookAt(new Vector3(...settings.target));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

function assertFits(bounds, settings) {
  const camera = actualCamera(settings);
  for (const corner of boxCorners(bounds)) {
    const projected = corner.clone().project(camera);
    assert.ok(Math.abs(projected.x) < 0.99 && Math.abs(projected.y) < 0.99,
      `Rink/player-height corner ${corner.toArray()} cropped at ${projected.toArray()}`);
    assert.ok(projected.z > -1 && projected.z < 1, 'Near/far planes must contain the entire player-height prism');
  }
}

function assertContains(bounds, point, margin = 0) {
  assert.ok(bounds, 'Canonical scene bounds must be returned');
  assert.ok(bounds.minX <= Math.max(0, point.x - margin) + 1e-9);
  assert.ok(bounds.maxX >= Math.min(rink.maxX, point.x + margin) - 1e-9);
  assert.ok(bounds.minY <= Math.max(rink.minY, point.y - margin) + 1e-9);
  assert.ok(bounds.maxY >= Math.min(rink.maxY, point.y + margin) - 1e-9);
}

test('missing clocks and velocities yield a finite stationary rig without changing canonical coordinates or puck', () => {
  const state = {
    actors: [{ id: 'F1', label: 'YOU', x: 18, y: -4, facing: Math.PI / 2, vx: 99, vy: 88, metadata: { source: 'fixture' } }],
    puck: { owner: 'F1', x: 17.3, y: -3 },
  };
  const before = structuredClone(state);
  const frame = createReadSceneFrame(state);
  assert.ok(frame, 'A safe rendering frame must be returned');
  assert.equal(frame.time, 0);
  assert.deepEqual(frame.actors[0], { ...before.actors[0], vx: 0, vy: 0 });
  assert.deepEqual(frame.puck, before.puck);
  frame.actors[0].x = 100;
  frame.actors[0].metadata.source = 'display-only';
  frame.puck.owner = null;
  assert.deepEqual(state, before, 'Rendering must not mutate actors, nested metadata or puck ownership');
});

test('only finite supplied clock and velocity components reach the rig', () => {
  const state = U13_READ_SEQUENCE.initialState;
  const before = JSON.stringify(state);
  const frame = createReadSceneFrame(state, { time: 1.25, velocityById: { F1: { vx: 2.5, vy: -1 }, F2: { vx: Infinity, vy: 0.4 }, D1: { vx: '2', vy: NaN } } });
  assert.ok(frame, 'A rendering frame must be returned');
  assert.equal(frame.time, 1.25);
  assert.deepEqual(frame.actors.map(actor => [actor.vx, actor.vy]), [[2.5, -1], [0, 0.4], [0, 0], [0, 0]]);
  for (const time of [undefined, null, NaN, Infinity, -Infinity, '1.5']) {
    assert.equal(createReadSceneFrame(state, { time }).time, 0);
  }
  for (const [index, actor] of frame.actors.entries()) {
    assert.deepEqual([actor.id, actor.x, actor.y, actor.facing],
      [state.actors[index].id, state.actors[index].x, state.actors[index].y, state.actors[index].facing]);
  }
  assert.deepEqual(frame.puck, state.puck);
  assert.equal(JSON.stringify(state), before);
});

test('bounds include target coordinates and future puck positions, not just the opening actors', () => {
  const freeze = (x, y, puckX = x, puckY = y) => ({ actors: [{ id: 'F1', x, y, facing: 0 }], puck: { owner: null, x: puckX, y: puckY } });
  const definition = {
    initialState: freeze(10, -3),
    branches: { carry: { state: freeze(14, 4), read2: { targets: [{ x: 8, y: -7, state: freeze(15, 4, 16, 5) }] } } },
  };
  const bounds = getReadSceneBounds(definition);
  assert.ok(bounds, 'Bounds must be derived from the full definition');
  assert.equal(bounds.minX, 6.5);
  assert.equal(bounds.minY, -8.5);
  assert.equal(bounds.maxY, 6.5);
  assertContains(bounds, { x: goalX + 1.2, y: 0 }, 1.5);
});

test('each age uses stable bounds covering all authored freezes, destinations, puck and net with margin', () => {
  for (const definition of definitions) {
    const before = JSON.stringify(definition);
    const bounds = getReadSceneBounds(definition);
    assert.ok(bounds, `${definition.ageBand} requires complete bounds`);
    for (const state of authoredStates(definition)) {
      const frame = createReadSceneFrame(state);
      assert.deepEqual(frame.puck, state.puck);
      for (const point of [...state.actors, state.puck]) assertContains(bounds, point, 1.5);
    }
    for (const branch of Object.values(definition.branches)) {
      for (const target of branch.read2.targets) assertContains(bounds, target, 1.5);
    }
    for (const y of [-1.2, 1.2]) assertContains(bounds, { x: goalX + 1.2, y }, 1.5);
    const reordered = structuredClone(definition);
    reordered.branches = Object.fromEntries(Object.entries(reordered.branches).reverse());
    Object.values(reordered.branches).forEach(branch => branch.read2.targets.reverse());
    assert.deepEqual(getReadSceneBounds(reordered), bounds);
    assert.ok(bounds.minX > 0 && bounds.maxX <= rink.maxX);
    assert.ok(bounds.minY >= rink.minY && bounds.maxY <= rink.maxY);
    assert.equal(JSON.stringify(definition), before);
  }
});

test('support and route additions only expand the authored frame, including extreme valid rink positions', () => {
  const supportPoint = { x: 0, y: rink.minY };
  const route = [{ x: 30.48, y: 0 }, { x: 21.9456, y: rink.maxY }];
  const untouched = JSON.stringify({ supportPoint, route });
  for (const definition of definitions) {
    const base = getReadSceneBounds(definition);
    assert.ok(base, 'Base bounds must exist before route expansion');
    assert.deepEqual(getReadSceneBounds(definition, { supportPoint: definition.initialState.actors[0], route: [] }), base);
    const expanded = getReadSceneBounds(definition, { supportPoint, route });
    assert.deepEqual(expanded, fullHalf);
    assert.ok(expanded.minX <= base.minX && expanded.maxX >= base.maxX);
    assert.ok(expanded.minY <= base.minY && expanded.maxY >= base.maxY);
  }
  assert.equal(JSON.stringify({ supportPoint, route }), untouched);
});

test('wide mode always covers the full positive half rink', () => {
  for (const definition of definitions) {
    assert.deepEqual(getReadSceneBounds(definition, { wide: true }), fullHalf);
  }
});

test('orthographic projection contains all rink corners and 2.1m player height on phones and desktops', () => {
  for (const definition of definitions) {
    for (const options of [{}, { wide: true }, { supportPoint: { x: 0, y: -12.954 }, route: [{ x: 30.48, y: 0 }] }]) {
      const bounds = getReadSceneBounds(definition, options);
      assert.ok(bounds, 'Camera inputs require authored bounds');
      for (const aspect of [0.38, 330 / 420, 390 / 440, 0.999, 1, 768 / 540, 1536 / 850, 3.2]) {
        const settings = getReadSceneCamera(bounds, aspect);
        assertFits(bounds, settings);
        assert.ok(Math.abs((settings.right - settings.left) / (settings.top - settings.bottom) - aspect) < 1e-10);
      }
    }
  }
});

test('portrait attacks up and landscape attacks right, with stable orientation and readable phone scale', () => {
  const bounds = getReadSceneBounds(U13_READ_SEQUENCE);
  assert.ok(bounds, 'Camera inputs require authored bounds');
  const phone = getReadSceneCamera(bounds, 0.6);
  const desktop = getReadSceneCamera(bounds, 1.9);
  assert.ok(phone && desktop, 'Both camera configurations must exist');
  assert.deepEqual(phone.position, getReadSceneCamera(bounds, 0.9).position);
  assert.deepEqual(desktop.position, getReadSceneCamera(bounds, 1).position);
  assert.deepEqual(phone.target, desktop.target);
  for (const [settings, portrait] of [[phone, true], [desktop, false]]) {
    const direction = new Vector3(...settings.position).sub(new Vector3(...settings.target)).normalize();
    const elevation = Math.asin(direction.y) * 180 / Math.PI;
    assert.ok(elevation > 45 && elevation < 75, 'Both views must remain high-oblique, not overhead or rink-level');
    const camera = actualCamera(settings);
    const origin = new Vector3(...settings.target);
    const start = origin.clone().project(camera);
    const ahead = origin.clone().add(new Vector3(0, 0, -1)).project(camera);
    if (portrait) {
      assert.ok(ahead.y > start.y && Math.abs(ahead.x - start.x) < 1e-10, 'Portrait +x attack must project straight up');
      const across = origin.clone().add(new Vector3(1, 0, 0)).project(camera);
      assert.ok(across.x > start.x, 'Portrait must not mirror canonical +y across the ice');
    } else {
      assert.ok(ahead.x > start.x, 'Landscape +x attack must retain the broadcast direction toward screen right');
    }
  }
  for (const definition of definitions) {
    const settings = getReadSceneCamera(getReadSceneBounds(definition), 330 / 420);
    const camera = actualCamera(settings);
    const origin = new Vector3(...settings.target);
    const start = origin.clone().project(camera);
    const bodyTop = origin.clone().add(new Vector3(0, 1.7, 0)).project(camera);
    const ahead = origin.clone().add(new Vector3(0, 0, -1)).project(camera);
    const across = origin.clone().add(new Vector3(1, 0, 0)).project(camera);
    assert.ok((bodyTop.y - start.y) * 420 / 2 > 17, `${definition.ageBand}: upright player height must not collapse in the phone view`);
    assert.ok((ahead.y - start.y) * 420 / 2 > 16.5, `${definition.ageBand}: down-ice separation must remain legible`);
    assert.ok((across.x - start.x) * 330 / 2 > 19.5, `${definition.ageBand}: across-ice separation must use the phone width`);
  }
});

test('unmeasured or invalid viewport aspect still produces a finite usable camera', () => {
  for (const aspect of [undefined, 0, -1, NaN, Infinity]) {
    const settings = getReadSceneCamera(fullHalf, aspect);
    assert.ok(settings, 'An unmeasured viewport must have a safe camera');
    assert.ok([...settings.position, ...settings.target, settings.left, settings.right, settings.top, settings.bottom, settings.near, settings.far].every(Number.isFinite));
    assertFits(fullHalf, settings);
  }
});

test('every target candidate keeps its complete 44px hit area inside narrow and wide canvases', () => {
  for (const width of [244, 246, 320, 330, 390, 700]) {
    const size = { width, height: width > 390 ? 500 : 420 };
    for (const definition of definitions) {
      const camera = actualCamera(getReadSceneCamera(getReadSceneBounds(definition), size.width / size.height));
      for (const branch of Object.values(definition.branches)) {
        for (const target of branch.read2.targets) {
          const projected = new Vector3(target.y, .1, -target.x).project(camera);
          const anchor = [(projected.x + 1) * width / 2, (1 - projected.y) * size.height / 2];
          for (const [dx, dy] of [[29, -29], [-29, -29], [29, 29], [-29, 29]]) {
            const candidate = [anchor[0] + dx, anchor[1] + dy];
            const before = [...candidate];
            const [x, y] = clampReadSceneTargetCenter(candidate, size);
            assert.ok(x - 22 >= 6 - 1e-9 && x + 22 <= width - 6 + 1e-9,
              `${definition.ageBand}/${target.id}: full target width must fit a ${width}px canvas`);
            assert.ok(y - 22 >= 6 - 1e-9 && y + 22 <= size.height - 6 + 1e-9,
              'Full target height and focus outline must stay inside the canvas');
            assert.deepEqual(candidate, before, 'Clamping must not change the projected target or candidate input');
          }
        }
      }
    }
  }
  assert.deepEqual(clampReadSceneTargetCenter([100, 150], { width: 244, height: 420 }), [100, 150]);
  assert.deepEqual(clampReadSceneTargetCenter([-20, 500], { width: 244, height: 420 }), [28, 392]);
});
