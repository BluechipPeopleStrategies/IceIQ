import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = new URL('../../', import.meta.url);
const cache = new URL('node_modules/.cache/rinkreads-image/', root);
mkdirSync(cache, { recursive: true });
const output = new URL('component.mjs', cache);
await build({ entryPoints: [fileURLToPath(new URL('src/visuals/ScenarioImage.jsx', root))], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'capture-source-scene', setup(api) {
  api.onResolve({ filter: /ScenarioRinkView\.jsx$/ }, () => ({ path: 'scene', namespace: 'source-scene-test' }));
  api.onLoad({ filter: /.*/, namespace: 'source-scene-test' }, () => ({ contents: 'export default function Scene(props){ globalThis.__sourceImageScene?.push(props); return null; }' }));
} }] });
const { default: ScenarioImage } = await import(output.href);
const render = props => renderToStaticMarkup(createElement(ScenarioImage, props));

test('all 133 authored image questions render the shared3D scene, including the three without media.type', () => {
  const bank = JSON.parse(readFileSync(new URL('src/data/bank.json', root), 'utf8'));
  const questions = new Map();
  function visit(value) {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      if (value.id && value.media?.url) questions.set(value.id, value);
      Object.values(value).forEach(visit);
    }
  }
  visit(bank);
  assert.equal(questions.size, 133);
  assert.equal([...questions.values()].filter(q => !q.media.type).length, 3);
  for (const q of questions.values()) {
    const before = JSON.stringify(q);
    const available = [];
    const availability = value => available.push(value);
    globalThis.__sourceImageScene = [];
    const html = render({ media: q.media, overlays: q.overlays, frameRatio: null, onAvailabilityChange: availability });
    const scenes = globalThis.__sourceImageScene; delete globalThis.__sourceImageScene;
    assert.equal(scenes.length, 1, q.id);
    assert.equal((html.match(/<img /g) || []).length, 0, q.id);
    assert.match(html, /data-source-scene=/);
    assert.doesNotMatch(html, /Enlarge picture|<dialog/);
    assert.equal(typeof scenes[0].onAvailabilityChange, 'function');
    scenes[0].onAvailabilityChange(true);
    assert.deepEqual(available, [true], 'actual renderer readiness reaches the caller');
    assert.equal(scenes[0].playing, false);
    assert.equal(scenes[0].onMove, undefined, 'presentation cannot change any answer or actor');
    assert.equal(JSON.stringify(q), before);
  }
});

test('inspection preserves authored frame and fit while omitting absent or non-image media', () => {
  assert.equal(render({}), '');
  assert.equal(render({ media: { type: 'video', url: '/example.mp4' } }), '');
  const media = { url: '/example.svg', ratio: '3 / 2' };
  assert.match(render({ media }), /aspect-ratio:3 \/ 2/);
  assert.match(render({ media }), /object-fit:contain/);
  assert.match(render({ media: { ...media, aspect: 'cover' } }), /object-fit:cover/);
  assert.doesNotMatch(render({ media, frameRatio: null }), /aspect-ratio:3 \/ 2/);
});
