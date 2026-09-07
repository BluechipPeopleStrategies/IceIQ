import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPracticeContentAssets } from './practice-content-assets.mjs';

test('production practice links include the catalog dependencies and exact Claude package', async () => {
  const assets = await createPracticeContentAssets();
  const names = assets.map(asset=>asset.fileName);
  assert.deepEqual(names, [
    'docs/factory/calibration/index.html',
    'docs/factory/calibration/README.md',
    'docs/factory/calibration/skating-movement-2026-09-06.json',
    'docs/factory/curriculum-map/index.html',
    'docs/factory/curriculum-map/coverage.json',
    'docs/factory/curriculum-map/README.md',
    'docs/factory/RinkReads-Claude-Project-2026-09-05.zip',
  ]);
  const zip = await readFile(new URL('../docs/factory/RinkReads-Claude-Project-2026-09-05.zip',import.meta.url));
  assert.deepEqual(assets.find(a=>a.fileName.endsWith('.zip')).source, zip);
  const jsx = await readFile(new URL('../src/one-on-one/ExperimentalPractice.jsx',import.meta.url),'utf8');
  assert.ok(jsx.includes('href="/docs/factory/RinkReads-Claude-Project-2026-09-05.zip"'));
  assert.ok(jsx.includes('href="/docs/factory/curriculum-map/index.html"'));
  const config = await readFile(new URL('../vite.config.js',import.meta.url),'utf8');
  assert.match(config,/practiceContentAssetsPlugin\(\)/);
});
