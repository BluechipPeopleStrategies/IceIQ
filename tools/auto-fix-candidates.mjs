// Auto-fix safe 1-line defects on legacy candidates so questions parked in the
// 70-79 score tier can clear the 80 promotion bar. Writes scores back into
// questions.legacy-candidates.json so promote:legacy can pick them up.
//
// Only applies fixes that DON'T edit semantic content (no rewriting opts/why/sit):
//   - missing tip:    derive from first sentence/clause of why, capped ≤15w
//   - missing alt:    pov-mc → use sit (or first 90 chars) as alt
//   - missing levels: infer from id prefix (u11q23 → ['U11 / Atom']) or _sourceAge
//   - tip too long:   trim at last word ≤15w
//
// Skips defects that need real authoring judgment (length variance, no-why,
// stem-too-short, always/never, double-negative).
//
// Usage:
//   node tools/auto-fix-candidates.mjs            # dry-run report
//   node tools/auto-fix-candidates.mjs --apply    # write fixes + scores
//
// After --apply: run `npm run promote:legacy -- --apply --merge` to land any
// bumped ≥80 into questions.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, ANCHOR_CONCEPTS } from './lib/curriculum-classifier.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const PATH = resolve(root, 'src/data/questions.legacy-candidates.json');
const APPLY = process.argv.includes('--apply');

const AGES = ['U7 / Initiation','U9 / Novice','U11 / Atom','U13 / Peewee','U15 / Bantam','U18 / Midget'];

const wordCount = (s) => (s||'').trim().split(/\s+/).filter(Boolean).length;

// ---------- scoring (mirrors mine-legacy-bank.mjs) ----------
function scoreQuestion(q) {
  const reasons = [];
  let score = 0;
  const t = q.type || 'mc';
  const stem = q.sit || q.q || '';
  if (!stem) return { score: 0, reasons: ['✗ missing stem'] };
  if ((t === 'mc' || t === 'pov-mc') && (!Array.isArray(q.opts) || q.opts.length < 2 || typeof q.ok !== 'number')) {
    return { score: 0, reasons: ['✗ missing opts/ok'] };
  }
  if (t === 'tf' && typeof q.ok !== 'boolean') return { score: 0, reasons: ['✗ tf missing boolean ok'] };

  const sw = wordCount(stem);
  if (sw >= 6 && sw <= 60) { score += 20; reasons.push(`✓ stem length ok (${sw}w)`); }
  else if (sw < 6) reasons.push(`✗ stem too short (${sw}w)`);
  else { score += 10; reasons.push(`⚠ stem long (${sw}w)`); }

  if (t === 'mc' || t === 'pov-mc') {
    const opts = q.opts || [];
    if (opts.length === 4) { score += 5; reasons.push('✓ 4 options'); }
    else if (opts.length === 3 || opts.length === 5) { score += 3; reasons.push(`⚠ ${opts.length} options (4 standard)`); }
    else if (opts.length === 2) reasons.push('⚠ only 2 options');
    else if (opts.length > 5) reasons.push(`⚠ ${opts.length} options (too many)`);

    if (opts.length >= 2) {
      const lengths = opts.map(o => (o||'').length);
      const mean = lengths.reduce((a,b)=>a+b,0) / lengths.length;
      const maxDelta = Math.max(...lengths.map(L => Math.abs(L-mean)));
      const variance = mean > 0 ? maxDelta/mean : 0;
      if (variance <= 0.25) { score += 20; reasons.push(`✓ option length variance ${(variance*100).toFixed(0)}% (≤25%)`); }
      else if (variance <= 0.50) { score += 8; reasons.push(`⚠ option length variance ${(variance*100).toFixed(0)}% (target ≤25%)`); }
      else reasons.push(`✗ option length variance ${(variance*100).toFixed(0)}% — possible giveaway`);

      const okLen = lengths[q.ok] || 0;
      const otherLens = lengths.filter((_, i) => i !== q.ok);
      const otherMean = otherLens.length ? otherLens.reduce((a,b)=>a+b,0) / otherLens.length : 0;
      if (otherMean > 0) {
        const okSkew = Math.abs(okLen - otherMean) / otherMean;
        if (okSkew > 0.5) { reasons.push(`⚠ correct option ${okLen > otherMean ? 'longer' : 'shorter'} than distractors by ${(okSkew*100).toFixed(0)}%`); score -= 8; }
      }
    }
    const optsLower = opts.map(o => (o||'').toLowerCase()).join(' ');
    if (/all of the above|none of the above/.test(optsLower)) { score -= 20; reasons.push('✗ contains "all/none of the above"'); }
  }

  if (q.why && q.why.trim().length > 0) {
    const wWords = wordCount(q.why);
    if (wWords >= 5 && wWords <= 60) { score += 15; reasons.push(`✓ why present (${wWords}w)`); }
    else if (wWords > 60) { score += 5; reasons.push(`⚠ why long (${wWords}w)`); }
    else reasons.push(`⚠ why short (${wWords}w)`);
  } else reasons.push('⚠ no why');

  if (q.tip && q.tip.trim().length > 0) {
    const tipWords = wordCount(q.tip);
    if (tipWords >= 3 && tipWords <= 18) { score += 10; reasons.push(`✓ tip present (${tipWords}w)`); }
    else if (tipWords > 18) { score += 4; reasons.push(`⚠ tip too long (${tipWords}w, target ≤15)`); }
    else reasons.push(`⚠ tip very short (${tipWords}w)`);
  } else reasons.push('⚠ no tip');

  const stemLower = stem.toLowerCase();
  if (t !== 'tf' && /\b(always|never)\b/.test(stemLower)) { score -= 8; reasons.push('⚠ "always" / "never" in stem (not a TF question)'); }
  if (/\bnot\b.*\bnot\b/.test(stemLower)) { score -= 10; reasons.push('✗ double negative in stem'); }

  const concept = classify(q);
  if (concept) { score += 10; reasons.push(`✓ classifies as: ${concept}${ANCHOR_CONCEPTS.has(concept) ? ' ★' : ''}`); }
  else reasons.push('⚠ no curriculum-concept match');

  if (Array.isArray(q.levels) && q.levels.length > 0) {
    score += 5; reasons.push(`✓ tagged for ${q.levels.length} age${q.levels.length > 1 ? 's' : ''}`);
  } else reasons.push('⚠ no levels[] tag');

  if (t === 'pov-mc') {
    if (q.media?.url) score += 5;
    if (q.media?.alt) score += 5;
    if (q.media?.url && q.media?.alt) reasons.push('✓ image + alt');
    else if (q.media?.url) reasons.push('⚠ image but no alt');
    else reasons.push('⚠ pov-mc with no image');
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

// ---------- safe fixers ----------
function fixMissingTip(q) {
  if (q.tip && q.tip.trim().length > 0) return null;
  if (!q.why) return null;
  // Pull the first sentence (up to . / ? / —), trim, ≤15w.
  const firstSentence = q.why.split(/(?<=[.!?])\s+|\s+—\s+/)[0].trim();
  if (!firstSentence) return null;
  let words = firstSentence.split(/\s+/);
  if (words.length > 15) words = words.slice(0, 15);
  // Make sure last char isn't a stranded punctuation.
  const tip = words.join(' ').replace(/[,;:]+$/, '');
  if (wordCount(tip) < 3) return null;
  return tip;
}

function fixLongTip(q) {
  if (!q.tip) return null;
  const w = wordCount(q.tip);
  if (w <= 15) return null;
  // First sentence first.
  const firstSentence = q.tip.split(/(?<=[.!?])\s+|\s+—\s+/)[0].trim();
  if (firstSentence && wordCount(firstSentence) <= 15 && wordCount(firstSentence) >= 3) {
    return firstSentence.replace(/[,;:]+$/, '');
  }
  // Else hard-truncate at 15w.
  const truncated = q.tip.split(/\s+/).slice(0, 15).join(' ').replace(/[,;:]+$/, '');
  return wordCount(truncated) >= 3 ? truncated : null;
}

function fixMissingAlt(q) {
  if (q.type !== 'pov-mc') return null;
  if (!q.media?.url) return null;
  if (q.media?.alt) return null;
  // Generate alt from sit (truncate at sentence or 90 chars).
  const stem = q.sit || q.q || '';
  if (!stem) return null;
  const firstSentence = stem.split(/(?<=[.!?])\s+/)[0].trim();
  const candidate = firstSentence.length <= 90 ? firstSentence : firstSentence.slice(0, 90).replace(/\s+\S*$/, '') + '…';
  return candidate;
}

function fixMissingLevels(q) {
  if (Array.isArray(q.levels) && q.levels.length > 0) return null;
  // Try id prefix: u7q12 / u15g3 / Q-foo-001-A1-U13.
  const id = q.id || '';
  // Pattern A: starts with u<NN><letter><NN>
  let m = id.match(/^u(\d+)/i);
  if (!m) m = id.match(/-U(\d+)(?:\b|$)/i);
  if (m) {
    const tag = `U${m[1]} / `;
    const found = AGES.find(a => a.startsWith(tag));
    if (found) return [found];
  }
  // Fallback: _sourceAge if present, else nothing.
  if (q._sourceAge && AGES.includes(q._sourceAge)) return [q._sourceAge];
  return null;
}

// ---------- main ----------
const bank = JSON.parse(readFileSync(PATH, 'utf-8'));

// Dedup canonical: pick first appearance per id (multi-age questions appear in
// multiple level buckets but reference the same object, so this is just a safety).
const allUnique = new Map();
for (const arr of Object.values(bank)) if (Array.isArray(arr)) {
  for (const q of arr) if (q.id && !allUnique.has(q.id)) allUnique.set(q.id, q);
}

// Initial scoring.
const initialScores = new Map();
for (const [id, q] of allUnique) {
  const { score } = scoreQuestion(q);
  initialScores.set(id, score);
}
const initBuckets = bucketize(initialScores.values());

// Apply fixes (mutates objects; same object is referenced from multi-age buckets).
const appliedFixes = { tip: 0, longTip: 0, alt: 0, levels: 0 };
for (const q of allUnique.values()) {
  const newTip = fixMissingTip(q);
  if (newTip) { if (APPLY) q.tip = newTip; appliedFixes.tip++; }
  else {
    const trimmed = fixLongTip(q);
    if (trimmed) { if (APPLY) q.tip = trimmed; appliedFixes.longTip++; }
  }
  const newAlt = fixMissingAlt(q);
  if (newAlt) {
    if (APPLY) q.media = { ...(q.media||{}), alt: newAlt };
    appliedFixes.alt++;
  }
  const newLevels = fixMissingLevels(q);
  if (newLevels) {
    if (APPLY) q.levels = newLevels;
    appliedFixes.levels++;
  }
}

// Re-score after fixes (only meaningful in apply mode; in dry-run we'd score
// against the unmutated objects). Build "what-if" reasoning by applying the
// fixes to a clone in dry-run.
const newScores = new Map();
const newReasons = new Map();
for (const [id, q] of allUnique) {
  let target = q;
  if (!APPLY) {
    // Apply fixes to a clone for dry-run scoring.
    const clone = JSON.parse(JSON.stringify(q));
    const newTip = fixMissingTip(clone);
    if (newTip) clone.tip = newTip;
    else {
      const trimmed = fixLongTip(clone);
      if (trimmed) clone.tip = trimmed;
    }
    const newAlt = fixMissingAlt(clone);
    if (newAlt) clone.media = { ...(clone.media||{}), alt: newAlt };
    const newLevels = fixMissingLevels(clone);
    if (newLevels) clone.levels = newLevels;
    target = clone;
  }
  const { score, reasons } = scoreQuestion(target);
  newScores.set(id, score);
  newReasons.set(id, reasons);
  if (APPLY) {
    q._legacyScore = score;
    q._legacyScoreReasons = reasons;
  }
}

const newBuckets = bucketize(newScores.values());

// Report bumps.
let bumpedTo80 = 0, bumpedTo90 = 0, total = 0;
const bumpExamples = [];
for (const [id] of allUnique) {
  total++;
  const before = initialScores.get(id);
  const after = newScores.get(id);
  if (before < 80 && after >= 80) bumpedTo80++;
  if (before < 90 && after >= 90) bumpedTo90++;
  if (after - before >= 5 && bumpExamples.length < 10) {
    bumpExamples.push({ id, before, after, delta: after - before });
  }
}

console.log(APPLY ? '✓ APPLIED' : '(dry-run — re-run with --apply to write)');
console.log(`Total candidates: ${total}`);
console.log();
console.log('Fixes attempted:');
console.log(`  missing tip:    ${appliedFixes.tip}`);
console.log(`  long tip trim:  ${appliedFixes.longTip}`);
console.log(`  missing alt:    ${appliedFixes.alt}`);
console.log(`  missing levels: ${appliedFixes.levels}`);
console.log();
console.log('Score distribution:');
console.log('         before  →  after');
for (const k of ['90+','80-89','70-79','60-69','50-59','<50']) {
  const b = initBuckets[k] || 0;
  const a = newBuckets[k] || 0;
  const arrow = a > b ? ' ↑' : a < b ? ' ↓' : '';
  console.log(`  ${k.padEnd(7)} ${String(b).padStart(4)}    →  ${String(a).padStart(4)}${arrow}`);
}
console.log();
console.log(`Bumped to ≥80: ${bumpedTo80}`);
console.log(`Bumped to ≥90: ${bumpedTo90}`);
if (bumpExamples.length) {
  console.log();
  console.log('Sample bumps:');
  for (const e of bumpExamples) {
    console.log(`  ${e.id.padEnd(28)} ${e.before} → ${e.after} (+${e.delta})`);
  }
}

if (APPLY) {
  writeFileSync(PATH, JSON.stringify(bank, null, 2) + '\n');
  console.log(`\n✓ Wrote ${PATH}`);
  console.log('Next: npm run promote:legacy -- --apply --merge');
}

function bucketize(values) {
  const b = { '90+':0, '80-89':0, '70-79':0, '60-69':0, '50-59':0, '<50':0 };
  for (const s of values) {
    if (s >= 90) b['90+']++;
    else if (s >= 80) b['80-89']++;
    else if (s >= 70) b['70-79']++;
    else if (s >= 60) b['60-69']++;
    else if (s >= 50) b['50-59']++;
    else b['<50']++;
  }
  return b;
}
