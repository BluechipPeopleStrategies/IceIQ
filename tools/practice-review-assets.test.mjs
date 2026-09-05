import test from 'node:test';
import assert from 'node:assert/strict';
import { createPracticeReviewAssets } from './practice-review-assets.mjs';

test('phone review includes all local image/link destinations and no workstation documentation', async () => {
  const assets = await createPracticeReviewAssets();
  const names = new Set(assets.map(asset => '/' + asset.fileName));
  assert(names.has('/review/index.html'));
  assert(names.has('/review/characters/index.html'));
  const allowedShared = new Set(['/favicon.svg', '/fonts/Inter.ttf', '/fonts/PlayfairDisplay.ttf']);
  for (const asset of assets.filter(a => a.fileName.endsWith('.html'))) {
    const html = asset.source.toString();
    assert(!/127\.0\.0\.1|localhost|C:[/\\]|\.md["']|pack-manifest\.json/.test(html), asset.fileName);
    for (const [, value] of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      const url = new URL(value, 'https://review.example/' + asset.fileName);
      if (url.pathname === '/' || (url.pathname === '/' + asset.fileName && url.hash)) continue;
      const path = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
      assert(names.has(path) || allowedShared.has(path), asset.fileName + ' has missing ' + path);
    }
  }
  assert.equal(assets.filter(a => a.fileName.startsWith('review/characters/references/')).length, 6);
  assert(!assets.some(a => /manifest|prompt|checkpoint|generation|\.py$|\.md$/.test(a.fileName)));
});

test('public character controls reference only packaged images', async () => {
  const assets = await createPracticeReviewAssets();
  const studio = assets.find(a => a.fileName === 'review/characters/index.html').source.toString();
  for (const [, file] of studio.matchAll(/['"](references\/[^'"]+\.png)['"]/g)) {
    assert(assets.some(a => a.fileName === 'review/characters/' + file), file);
  }
  for (const image of assets.filter(a => a.fileName.endsWith('.png'))) {
    assert.equal(image.source.subarray(1, 4).toString(), 'PNG');
  }
});
