import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const cache = new URL('../../node_modules/.cache/rinkreads-art/', import.meta.url);
await mkdir(cache, { recursive: true });
const output = new URL('HockeyPlayerArt.mjs', cache);
await build({ entryPoints: [new URL('./HockeyPlayerArt.jsx', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')], outfile: output.pathname.replace(/^\/(\w:)/, '$1'), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', logLevel: 'silent' });
const { HockeyPlayerArt } = await import(output.href);
const render = props => renderToStaticMarkup(createElement('svg', null, createElement(HockeyPlayerArt, props)));

test('unknown heading stays neutral and decorative without introducing labels or controls', () => {
  for (const facing of [undefined, null, NaN, Infinity]) {
    const result = render({ radius: 8, facing });
    assert.match(result, /data-pose="neutral"/);
    assert.match(result, /pointer-events="none"/);
    assert.match(result, /aria-hidden="true"/);
    assert.doesNotMatch(result, /rotate\(|<text|tabindex|role="button"/);
  }
});

test('authored headings and team/goalie role remain explicit at the caller supplied scale', () => {
  const result = render({ radius: 7, team: 'away', goalie: true, facing: -90 });
  assert.match(result, /data-team="away"/);
  assert.match(result, /data-hockey-art="goalie"/);
  assert.match(result, /data-pose="authored-heading"/);
  assert.match(result, /scale\(0.7\)/);
  assert.match(result, /rotate\(0\)/);
});

test('many players share the four overhead assets without duplicate SVG IDs', () => {
  const result = renderToStaticMarkup(createElement('svg', null, ...Array.from({ length: 20 }, (_, index) => createElement(HockeyPlayerArt, { key: index, team: index % 2 ? 'away' : 'home', goalie: index % 5 === 0 }))));
  const ids = [...result.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 0, 'Raster equipment needs no per-player gradient definitions');
  assert.equal(new Set(ids).size, ids.length);
  const references = [...result.matchAll(/url\(#([^)]*)\)/g)].map(match => match[1]);
  assert.equal((result.match(/<image /g) || []).length, 20);
  assert.match(result, /skater-navy\.png/);
  assert.match(result, /goalie-gold\.png/);
  assert.ok(references.every(id => ids.includes(id)));
});

test('invalid radius cannot place NaN or infinite coordinates in an otherwise valid board', () => {
  for (const radius of [NaN, Infinity, -5, 0]) {
    const result = render({ radius });
    assert.match(result, /scale\(1\)/);
    assert.doesNotMatch(result, /NaN|Infinity/);
  }
});
