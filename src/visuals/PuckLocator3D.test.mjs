import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Group } from 'three';
import {renderToStaticMarkup} from 'react-dom/server';
const cache = new URL('../../node_modules/.cache/puck-locator/', import.meta.url);
mkdirSync(cache, { recursive: true });
const output = new URL('puck.mjs', cache);
await build({ entryPoints: [fileURLToPath(new URL('./PuckLocator3D.jsx', import.meta.url))], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent' });
const { placePuckLocator, puckLocatorRadius, puckPresentationSize, SvgPuckLocator } = await import(output.href);

test('perspective puck uses physical dimensions and sits on ice without a backing', () => {
  assert.deepEqual(puckPresentationSize(true, 1), {radius:.0381,height:.0254});
  assert.deepEqual(puckPresentationSize(true, .001), {radius:.0381,height:.0254});
  const object = new Group();
  placePuckLocator(object,{x:4,y:2},.0127);
  assert.deepEqual(object.position.toArray(),[2,.0127,-4]);
});

test('puck marker follows exact coordinates for owned and in-flight pucks without snapping to actors', () => {
  const object = new Group();
  for (const puck of [{ x: 12.345, y: -2.71, owner: 'F2' }, { x: 14.7, y: 1.23, owner: null }]) {
    const before = JSON.stringify(puck);
    placePuckLocator(object, puck);
    assert.deepEqual(object.position.toArray(), [puck.y, .075, -puck.x]);
    assert.equal(object.visible, true);
    assert.equal(JSON.stringify(puck), before);
  }
  placePuckLocator(object, { owner: 'F1', x: NaN, y: 0 });
  assert.equal(object.visible, false, 'Missing puck coordinates must not invent a position.');
});

test('puck legibility has a bounded radius and SVG is high contrast and noninteractive', () => {
  assert.equal(puckLocatorRadius(.001), .2);
  assert.equal(puckLocatorRadius(1), .42);
  const svg = SvgPuckLocator({ x: 4.12, y: -6.9 });
  assert.equal(svg.props.transform, 'translate(4.12 -6.9)');
  assert.equal(svg.props.pointerEvents, 'none');
  assert.equal(svg.props['data-puck-locator'], 'true');
});

test('puck marker has no repeated callout by default; an explicit teaching label remains opt-in',()=>{
  const marker=renderToStaticMarkup(SvgPuckLocator({x:2,y:3}));
  assert.doesNotMatch(marker,/PUCK|<text|<rect/);
  assert.match(marker,/<circle/);
  assert.match(renderToStaticMarkup(SvgPuckLocator({showLabel:true})),/PUCK/);
});
