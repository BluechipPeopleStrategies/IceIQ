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

test('the review packages current 3D evidence and exact phone entries without promoting draft configurations', async () => {
  const assets = await createPracticeReviewAssets();
  const review = assets.find(asset => asset.fileName === 'review/index.html').source.toString();
  for (const file of ['curriculum-3d-desktop.png', 'sgs-3v3-desktop.png', 'sgs-u7-phone.png']) {
    assert.ok(assets.some(asset => asset.fileName === `review/images/${file}`), `${file} is explicitly packaged`);
    assert.ok(review.includes(`src="/review/images/${file}"`), `${file} is visible in the review`);
  }
  const links = [...review.matchAll(/href="([^"]+)"/g)].map(([, href]) => new URL(href.replaceAll('&amp;', '&'), 'https://review.example/review/'));
  assert.ok(links.some(url => url.pathname === '/' && url.searchParams.get('arena') === 'sgs' && !url.searchParams.has('sgs') && url.hash === '#practice-arena'));
  assert.ok(links.some(url => url.pathname === '/' && url.searchParams.get('arena') === 'sgs' && url.searchParams.get('sgs') === 'discover' && url.hash === '#practice-arena'));
  assert.match(review, /640 draft configurations of two teaching families/);
  assert.match(review, /not approved lessons/);
  assert.match(review, /image questions remain 2D/);
  assert.doesNotMatch(review, /265 tests|questions, positions, puck and movement cues stay as authored/);
});
