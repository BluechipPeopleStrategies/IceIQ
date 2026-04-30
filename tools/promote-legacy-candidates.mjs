// Promote high-quality scored candidates from questions.legacy-candidates.json
// into the live questions.json bank. Strips internal scoring sidecars, normalizes
// image URLs (GitHub raw -> /assets/images/<file> when the local file exists),
// and re-buckets each question into every level in its levels[] array.
//
// Usage:
//   node tools/promote-legacy-candidates.mjs                 # promote >= 80, dry-run report
//   node tools/promote-legacy-candidates.mjs --apply         # write to questions.json
//   node tools/promote-legacy-candidates.mjs --min-score 85  # stricter cut
//   node tools/promote-legacy-candidates.mjs --apply --merge # merge with existing live bank instead of overwriting
//
// Default behavior is OVERWRITE — questions.json is currently empty and we want
// the migration to be the source of truth. Use --merge if questions.json has
// hand-authored entries to preserve.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const CANDIDATES = resolve(root, 'src/data/questions.legacy-candidates.json');
const LIVE = resolve(root, 'src/data/questions.json');
const IMG_DIR = resolve(root, 'public/assets/images');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1]?.startsWith('--') ? true : args[i + 1] ?? true) : fallback;
};
const has = (name) => args.includes(`--${name}`);
const APPLY = has('apply');
const MERGE = has('merge');
const MIN_SCORE = parseInt(flag('min-score', '80'), 10);

const AGES = ['U7 / Initiation', 'U9 / Novice', 'U11 / Atom', 'U13 / Peewee', 'U15 / Bantam', 'U18 / Midget'];

// Internal sidecar fields the miner attaches; strip before promotion.
// `_notionPageId` is preserved — it's used by the in-app overrides export to
// round-trip edits back to Notion (see src/widgets.jsx OverridesExportCard).
const STRIP_FIELDS = new Set([
  '_legacyScore', '_legacyScoreReasons', '_correctAnswerLetter', '_correctAnswerText',
  '_sourceAge', '_primaryConcept', '_hasOverride', '_imageFilename',
]);

function cleanQuestion(q) {
  const out = {};
  for (const [k, v] of Object.entries(q)) {
    if (STRIP_FIELDS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

// Rewrite GitHub raw URLs to /assets/images/<file> when the file exists locally.
// Notion-attached presigned S3 URLs were stripped at sync time, but legacy rows
// can still carry GitHub raw URLs from earlier rounds; serving from /assets/...
// is faster, doesn't depend on GitHub uptime, and matches the seed-pov writer.
function normalizeMediaUrl(q, onDisk) {
  if (q.type !== 'pov-mc' || !q.media || !q.media.url) return q;
  const url = q.media.url;
  if (!url.includes('raw.githubusercontent.com')) return q;
  // Extract filename, check disk presence, rewrite if found.
  const m = url.match(/\/public\/assets\/images\/([^?#]+)$/);
  if (!m) return q;
  const fname = decodeURIComponent(m[1]);
  if (!onDisk.has(fname)) return q;
  return { ...q, media: { ...q.media, url: `/assets/images/${fname}` } };
}

// ============================================================================
// MAIN
// ============================================================================
const candidates = JSON.parse(readFileSync(CANDIDATES, 'utf-8'));
const onDisk = new Set(readdirSync(IMG_DIR));

// Dedup by id across age buckets (multi-age questions appear in each level).
const byId = new Map();
for (const arr of Object.values(candidates)) {
  for (const q of arr) {
    if ((q._legacyScore ?? 0) < MIN_SCORE) continue;
    if (!byId.has(q.id)) byId.set(q.id, q);
  }
}

const promoted = [...byId.values()]
  .map(cleanQuestion)
  .map((q) => normalizeMediaUrl(q, onDisk));

// Sort by id within each level for stable diffs.
const stableSort = (arr) => arr.slice().sort((a, b) => (a.id || '').localeCompare(b.id || ''));

// Each question lives in ONE level in questions.json — its "primary" level.
// At load time, src/qbLoader.js fans the question out into every level in its
// levels[] array, so we must NOT duplicate rows here (qbLoader's id-uniqueness
// check would skip them, and preflight would error on duplicate ids).
//
// Pick the primary level in this priority:
//   1. Id suffix (`u15q22` -> U15) when present and inside levels[]
//   2. First level in levels[] in AGES order (lowest age the question targets)
//   3. AGES[0] fallback
const out = Object.fromEntries(AGES.map((a) => [a, []]));

function primaryLevel(q) {
  const inLevels = (Array.isArray(q.levels) ? q.levels : []).filter((L) => AGES.includes(L));
  // 1. id-suffix preference
  const m = (q.id || '').match(/^u(\d+)|-U(\d+)$/i);
  if (m) {
    const num = m[1] || m[2];
    const tag = `U${num} / `;
    const fromId = AGES.find((a) => a.startsWith(tag));
    if (fromId && (!inLevels.length || inLevels.includes(fromId))) return fromId;
  }
  // 2. lowest age in levels[]
  if (inLevels.length) {
    return AGES.find((a) => inLevels.includes(a)) || inLevels[0];
  }
  return null;
}

let unbucketed = 0;
for (const q of promoted) {
  const lvl = primaryLevel(q);
  if (!lvl || !out[lvl]) { unbucketed++; continue; }
  if (!out[lvl].some((x) => x.id === q.id)) out[lvl].push(q);
}

// Optionally merge with existing live bank — preserves any hand-authored entries
// already in questions.json that aren't being re-promoted (won't overwrite ids
// already in out[]).
let merged = out;
if (MERGE && existsSync(LIVE)) {
  const live = JSON.parse(readFileSync(LIVE, 'utf-8'));
  merged = JSON.parse(JSON.stringify(out));
  for (const lvl of AGES) {
    const existingIds = new Set((merged[lvl] || []).map((q) => q.id));
    for (const q of live[lvl] || []) {
      if (!existingIds.has(q.id)) merged[lvl].push(q);
    }
  }
}

// Stable-sort each level for clean diffs.
for (const lvl of AGES) merged[lvl] = stableSort(merged[lvl] || []);

// ----------------------------------------------------------------------------
// REPORT
// ----------------------------------------------------------------------------
console.log(`Promotion source: ${CANDIDATES}`);
console.log(`Min score: ${MIN_SCORE}`);
console.log(`Mode: ${APPLY ? (MERGE ? 'APPLY + MERGE' : 'APPLY (overwrite)') : 'DRY-RUN'}`);
console.log('');

console.log('Per-age primary-level placement (qbLoader fans out levels[] at runtime):');
let total = 0;
for (const lvl of AGES) {
  const n = merged[lvl].length;
  total += n;
  console.log(`  ${lvl.padEnd(20)} ${n}`);
}
console.log(`  ${'TOTAL rows in bank'.padEnd(20)} ${total}`);
console.log(`  unique question ids:  ${promoted.length}`);
if (unbucketed) console.log(`  unbucketed (dropped): ${unbucketed}`);

// Effective coverage per age after qbLoader fan-out — what each age tier actually sees.
const effective = Object.fromEntries(AGES.map((a) => [a, 0]));
for (const q of promoted) {
  const inLevels = (Array.isArray(q.levels) ? q.levels : []).filter((L) => AGES.includes(L));
  const targets = inLevels.length ? inLevels : [primaryLevel(q)].filter(Boolean);
  for (const t of targets) effective[t]++;
}
console.log('');
console.log('Per-age coverage at runtime (after multi-age fan-out):');
for (const lvl of AGES) console.log(`  ${lvl.padEnd(20)} ${effective[lvl]}`);
console.log('');

// Image-coverage breakdown so the user knows how many pov-mc still need an image.
const placeholder = promoted.filter((q) => q.type === 'pov-mc' && (!q.media?.url || q.media.url === '/pov-placeholder.svg'));
const realImage = promoted.filter((q) => q.type === 'pov-mc' && q.media?.url && q.media.url !== '/pov-placeholder.svg');
console.log(`pov-mc with real image: ${realImage.length}`);
console.log(`pov-mc waiting on image: ${placeholder.length}`);
const byImageId = {};
for (const q of placeholder) {
  const k = q.imageId || '(no imageId)';
  byImageId[k] = (byImageId[k] || 0) + 1;
}
const sortedImg = Object.entries(byImageId).sort((a, b) => b[1] - a[1]);
if (sortedImg.length) {
  console.log('');
  console.log('Top placeholder imageIds (drop a real image at /assets/images/<imageId>.png to unlock):');
  for (const [id, n] of sortedImg.slice(0, 10)) console.log(`  ${id.padEnd(20)} ${n}`);
}
console.log('');

// By type
const byType = {};
for (const q of promoted) byType[q.type || 'mc'] = (byType[q.type || 'mc'] || 0) + 1;
console.log('By type:', byType);
console.log('');

if (!APPLY) {
  console.log('(dry-run) Re-run with --apply to write to src/data/questions.json');
} else {
  writeFileSync(LIVE, JSON.stringify(merged, null, 2) + '\n');
  console.log(`✓ Wrote ${LIVE}`);
  console.log('  Next: npm run preflight');
}
