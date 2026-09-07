// Bulk-bind newly-saved images to their question groups by imageId. Walks
// either questions.json or questions.legacy-candidates.json, finds every
// question whose `imageId` matches one of the BINDINGS keys, and rewrites
// media.url to /assets/images/<filename>.
//
// Usage:
//   node tools/bulk-bind-images.mjs                 # binds in questions.legacy-candidates.json
//   node tools/bulk-bind-images.mjs --target live   # binds in questions.json instead

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const args = process.argv.slice(2);
const target = args.includes('--target') ? args[args.indexOf('--target') + 1] : 'candidates';
const targetFile = target === 'live'
  ? resolve(root, 'src/data/questions.json')
  : resolve(root, 'src/data/questions.legacy-candidates.json');

// imageId → filename mapping. Add new entries as more images get saved.
const BINDINGS = {
  'IMG-eyesup-001':  'img-eyesup-001.png',
  'IMG-pass-001':    'img-pass-001.png',
  'IMG-pp-002':      'img-pp-002.png',
  'IMG-stickoi-001': 'img-stickoi-001.png',
};

console.log(`Bulk-binding images in: ${targetFile}`);
console.log(`Bindings:`);
Object.entries(BINDINGS).forEach(([id, fn]) => console.log(`  ${id} → /assets/images/${fn}`));
console.log('');

const data = JSON.parse(readFileSync(targetFile, 'utf-8'));
let bound = 0;
let skippedNoMatch = 0;
const seen = new Set();
Object.values(data).forEach((arr) => {
  arr.forEach((q) => {
    if (seen.has(q.id)) return;
    seen.add(q.id);
    if (!q.imageId || !BINDINGS[q.imageId]) return;
    const newUrl = `/assets/images/${BINDINGS[q.imageId]}`;
    if (q.media?.url === newUrl) { skippedNoMatch++; return; }
    if (!q.media) q.media = { type: 'image' };
    q.media.url = newUrl;
    q.media.type = 'image';
    bound++;
  });
});

writeFileSync(targetFile, JSON.stringify(data, null, 2) + '\n');
console.log(`✓ bound ${bound} questions to real images`);
if (skippedNoMatch > 0) console.log(`  (${skippedNoMatch} questions already had the right URL — no-op)`);
console.log('');
console.log(`Re-run: node tools/curriculum-audit.mjs > AUDIT_CURRICULUM.md  (to refresh report)`);
