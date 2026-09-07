import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const input = new URL('./PlayerLocator.jsx', import.meta.url);
const cache = new URL('../../node_modules/.cache/player-locator/', import.meta.url);
mkdirSync(cache, { recursive: true });
let locator = {};
if (existsSync(input)) {
  const output = new URL('locator.mjs', cache);
  await build({ entryPoints: [fileURLToPath(input)], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', logLevel: 'silent' });
  locator = await import(output.href);
}
test('learner identity survives readonly, another actor selected and a changed puck owner', () => {
  assert.equal(typeof locator.isLearnerActor, 'function', 'A stable learner identity contract must exist.');
  const actor = { id: 'F1', label: 'YOU', selected: false, hasPuck: false };
  assert.equal(locator.isLearnerActor(actor), true);
  assert.equal(locator.isLearnerActor({ id: 'F2', label: 'F2', selected: true, hasPuck: true }), false);
  assert.equal(locator.isLearnerActor({ id: 'defender' }, 'defender'), true);
  assert.equal(locator.isLearnerActor(actor, 'defender'), false, 'Explicit controlled role overrides a generic label.');
  assert.equal(locator.isLearnerActor(null), false);
});

test('an explicit named focus can be D4 without changing identity, possession or selection', () => {
  assert.equal(typeof locator.isFocusedActor, 'function');
  const actors = [{ id: 'F1', label: 'YOU' }, { id: 'D4', label: 'D4' }, { id: 'F2', label: 'F2', selected: true, hasPuck: true }];
  assert.deepEqual(actors.filter(actor => locator.isFocusedActor(actor, 'D4')).map(actor => actor.id), ['D4']);
  assert.deepEqual(actors.filter(actor => locator.isFocusedActor(actor)).map(actor => actor.id), ['F1']);
  assert.deepEqual(actors.filter(actor => locator.isFocusedActor(actor, 'unknown')), []);
  assert.deepEqual(actors.filter(actor => locator.isFocusedActor(actor, null)), []);
  assert.equal(actors[1].label, 'D4');
});
test('persistent locator surrounds the actor body and faces the camera while SVG stays noninteractive', () => {
  assert.equal(typeof locator.PlayerLocator, 'function');
  const marker = locator.PlayerLocator();
  assert.equal(marker.props.name, 'learner-locator');
  assert.deepEqual(marker.props.children.props.position, [0, .85, 0], 'The focus outline follows the body center, not an offset point on the ice');
  const rings = marker.props.children.props.children;
  assert.equal(rings.length, 3);
  assert.equal(new Set(rings.map(ring => ring.props.children[1].props.color)).size, 3);
  assert.ok(rings.every(ring => ring.props.children[1].props.depthTest === false));
  const svg = locator.SvgPlayerLocator({ radius: 1.5 });
  assert.equal(svg.props['data-player-locator'], 'YOU');
  assert.equal(svg.props.pointerEvents, 'none');
  assert.equal(svg.props.children.length, 3);
});
