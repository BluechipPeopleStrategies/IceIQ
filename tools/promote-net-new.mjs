// Append-only variant of promote-legacy-candidates: takes scored candidates
// (≥ MIN_SCORE) and adds ONLY those IDs that don't already exist in
// questions.json. Live entries are never touched — protects hand-authored
// stem rewrites, _status tags, and any other in-place edits made after the
// last promote.
//
// Usage:
//   node tools/promote-net-new.mjs              # dry-run
//   node tools/promote-net-new.mjs --apply      # write to questions.json

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const CANDIDATES = resolve(root, 'src/data/questions.legacy-candidates.json');
const LIVE = resolve(root, 'src/data/questions.json');
const IMG_DIR = resolve(root, 'public/assets/images');

const APPLY = process.argv.includes('--apply');
const MIN_SCORE = parseInt(process.argv.find((a, i, arr) => arr[i-1] === '--min-score') || '80', 10);

const AGES = ['U7 / Initiation','U9 / Novice','U11 / Atom','U13 / Peewee','U15 / Bantam','U18 / Midget'];
const STRIP = new Set(['_legacyScore','_legacyScoreReasons','_correctAnswerLetter','_correctAnswerText','_sourceAge','_primaryConcept','_hasOverride','_imageFilename']);

function clean(q) {
  const out = {};
  for (const [k, v] of Object.entries(q)) if (!STRIP.has(k)) out[k] = v;
  return out;
}

function primaryLevel(q) {
  const inLevels = (Array.isArray(q.levels) ? q.levels : []).filter((L) => AGES.includes(L));
  const m = (q.id || '').match(/^u(\d+)|-U(\d+)$/i);
  if (m) {
    const num = m[1] || m[2];
    const tag = `U${num} / `;
    const fromId = AGES.find((a) => a.startsWith(tag));
    if (fromId && (!inLevels.length || inLevels.includes(fromId))) return fromId;
  }
  if (inLevels.length) return AGES.find((a) => inLevels.includes(a)) || inLevels[0];
  return null;
}

function normalizeMediaUrl(q, onDisk) {
  if (q.type !== 'pov-mc' || !q.media?.url) return q;
  const url = q.media.url;
  if (!url.includes('raw.githubusercontent.com')) return q;
  const m = url.match(/\/public\/assets\/images\/([^?#]+)$/);
  if (!m) return q;
  const fname = decodeURIComponent(m[1]);
  if (!onDisk.has(fname)) return q;
  return { ...q, media: { ...q.media, url: `/assets/images/${fname}` } };
}

const candidates = JSON.parse(readFileSync(CANDIDATES, 'utf-8'));
const live = JSON.parse(readFileSync(LIVE, 'utf-8'));
const onDisk = new Set(readdirSync(IMG_DIR));

// Build set of IDs already live
const liveIds = new Set();
for (const arr of Object.values(live)) if (Array.isArray(arr)) for (const q of arr) if (q.id) liveIds.add(q.id);

// Find net-new candidates ≥ MIN_SCORE, dedup by id
const netNew = new Map();
for (const arr of Object.values(candidates)) if (Array.isArray(arr)) {
  for (const q of arr) {
    if (!q.id || liveIds.has(q.id)) continue;
    if ((q._legacyScore ?? 0) < MIN_SCORE) continue;
    if (!netNew.has(q.id)) netNew.set(q.id, q);
  }
}

console.log(`Min score: ${MIN_SCORE}`);
console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
console.log(`Live ids: ${liveIds.size}`);
console.log(`Net-new candidates ≥ ${MIN_SCORE}: ${netNew.size}`);
console.log();

if (netNew.size === 0) {
  console.log('Nothing to promote.');
  process.exit(0);
}

// Place each into its primary level
const out = JSON.parse(JSON.stringify(live));
for (const lvl of AGES) if (!out[lvl]) out[lvl] = [];
let placed = 0, unbucketed = 0;
const placement = [];
for (const q of netNew.values()) {
  const cleaned = normalizeMediaUrl(clean(q), onDisk);
  const lvl = primaryLevel(cleaned);
  if (!lvl || !out[lvl]) { unbucketed++; continue; }
  out[lvl].push(cleaned);
  placement.push({ id: cleaned.id, level: lvl, type: cleaned.type || 'mc', score: q._legacyScore });
  placed++;
}

console.log(`Placed: ${placed}, unbucketed (dropped): ${unbucketed}`);
console.log();
console.log('Net-new questions being added:');
for (const p of placement) console.log(`  ${p.id.padEnd(28)} → ${p.level.padEnd(20)} (type=${p.type}, score=${p.score})`);

if (APPLY) {
  // Stable-sort each level by id for clean diffs.
  for (const lvl of AGES) out[lvl].sort((a, b) => (a.id||'').localeCompare(b.id||''));
  writeFileSync(LIVE, JSON.stringify(out, null, 2) + '\n');
  console.log(`\n✓ Wrote ${LIVE}`);
  console.log('Next: npm run preflight');
} else {
  console.log('\n(dry-run) Re-run with --apply to write.');
}
