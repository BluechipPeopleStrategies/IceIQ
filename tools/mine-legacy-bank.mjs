// Mine the archived legacy question bank for high-quality candidates that
// already meet the new authoring standards. Outputs a triage queue you can
// load into the Scenario Author and review one by one.
//
// Usage:
//   node tools/mine-legacy-bank.mjs                      # default: top 100 anchor-concept candidates
//   node tools/mine-legacy-bank.mjs --limit 200          # raise the cap
//   node tools/mine-legacy-bank.mjs --min-score 70       # stricter quality bar
//   node tools/mine-legacy-bank.mjs --concepts all       # mine ALL concepts, not just anchors
//   node tools/mine-legacy-bank.mjs --types mc,pov-mc    # restrict to certain types
//
// Output: src/data/questions.legacy-candidates.json (same age-keyed shape as questions.json).
// Each question gets `_legacyScore` (0-100) and `_legacyScoreReasons[]` attached, which
// the Scenario Author renders in the list + editor.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, ANCHOR_CONCEPTS, AGES } from './lib/curriculum-classifier.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const LEGACY = resolve(root, 'src/data/questions.legacy.json');
const OUT = resolve(root, 'src/data/questions.legacy-candidates.json');

// CLI parsing
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const LIMIT = parseInt(flag('limit', '100'), 10);
const MIN_SCORE = parseInt(flag('min-score', '50'), 10);
const CONCEPTS_FLAG = flag('concepts', 'anchors');                // 'anchors' | 'all' | comma-list
const TYPES_FLAG = flag('types', 'mc,pov-mc,tf');                 // mc/pov-mc/tf default

// ============================================================================
// SCORING
// ============================================================================
// Each question accumulates points (positive) and demerits (negative). Final
// score is clamped to 0-100. Reasons[] documents what raised/lowered it so the
// Scenario Author can show context to the human triaging.

function scoreQuestion(q) {
  const reasons = [];
  let score = 0;
  const t = q.type || 'mc';
  const stem = q.sit || q.q || '';
  const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;

  // Hard fail — missing required fields. Score stays 0.
  if (!stem) {
    reasons.push('✗ missing stem');
    return { score: 0, reasons };
  }
  if ((t === 'mc' || t === 'pov-mc') && (!Array.isArray(q.opts) || q.opts.length < 2 || typeof q.ok !== 'number')) {
    reasons.push('✗ missing opts/ok');
    return { score: 0, reasons };
  }
  if (t === 'tf' && typeof q.ok !== 'boolean') {
    reasons.push('✗ tf missing boolean ok');
    return { score: 0, reasons };
  }

  // Stem quality
  const sw = wordCount(stem);
  if (sw >= 6 && sw <= 60) {
    score += 20;
    reasons.push(`✓ stem length ok (${sw}w)`);
  } else if (sw < 6) {
    reasons.push(`✗ stem too short (${sw}w)`);
  } else {
    score += 10;
    reasons.push(`⚠ stem long (${sw}w)`);
  }

  // Option-length consistency (mc/pov-mc only). ±25% rule from AUTHORING_STANDARDS §2.
  if (t === 'mc' || t === 'pov-mc') {
    const opts = q.opts || [];
    if (opts.length === 4) { score += 5; reasons.push('✓ 4 options'); }
    else if (opts.length === 3 || opts.length === 5) { score += 3; reasons.push(`⚠ ${opts.length} options (4 standard)`); }
    else if (opts.length === 2) { reasons.push('⚠ only 2 options'); }
    else if (opts.length > 5) { reasons.push(`⚠ ${opts.length} options (too many)`); }

    if (opts.length >= 2) {
      const lengths = opts.map((o) => (o || '').length);
      const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const maxDelta = Math.max(...lengths.map((L) => Math.abs(L - mean)));
      const variance = mean > 0 ? maxDelta / mean : 0;
      if (variance <= 0.25) {
        score += 20;
        reasons.push(`✓ option length variance ${(variance * 100).toFixed(0)}% (≤25%)`);
      } else if (variance <= 0.50) {
        score += 8;
        reasons.push(`⚠ option length variance ${(variance * 100).toFixed(0)}% (target ≤25%)`);
      } else {
        reasons.push(`✗ option length variance ${(variance * 100).toFixed(0)}% — possible giveaway`);
      }

      // Check correct option doesn't stand out specifically
      const okLen = lengths[q.ok] || 0;
      const otherLens = lengths.filter((_, i) => i !== q.ok);
      const otherMean = otherLens.length ? otherLens.reduce((a, b) => a + b, 0) / otherLens.length : 0;
      if (otherMean > 0) {
        const okSkew = Math.abs(okLen - otherMean) / otherMean;
        if (okSkew > 0.5) {
          reasons.push(`⚠ correct option ${okLen > otherMean ? 'longer' : 'shorter'} than distractors by ${(okSkew * 100).toFixed(0)}%`);
          score -= 8;
        }
      }
    }

    // Anti-patterns in option text
    const optsLower = opts.map((o) => (o || '').toLowerCase()).join(' ');
    if (/all of the above|none of the above/.test(optsLower)) {
      score -= 20;
      reasons.push('✗ contains "all/none of the above"');
    }
  }

  // Why / tip presence
  if (q.why && q.why.trim().length > 0) {
    const wWords = wordCount(q.why);
    if (wWords >= 5 && wWords <= 60) { score += 15; reasons.push(`✓ why present (${wWords}w)`); }
    else if (wWords > 60) { score += 5; reasons.push(`⚠ why long (${wWords}w)`); }
    else { reasons.push(`⚠ why short (${wWords}w)`); }
  } else {
    reasons.push('⚠ no why');
  }

  if (q.tip && q.tip.trim().length > 0) {
    const tipWords = wordCount(q.tip);
    if (tipWords >= 3 && tipWords <= 18) { score += 10; reasons.push(`✓ tip present (${tipWords}w)`); }
    else if (tipWords > 18) { score += 4; reasons.push(`⚠ tip too long (${tipWords}w, target ≤15)`); }
    else { reasons.push(`⚠ tip very short (${tipWords}w)`); }
  } else {
    reasons.push('⚠ no tip');
  }

  // Stem anti-patterns
  const stemLower = stem.toLowerCase();
  if (t !== 'tf' && /\b(always|never)\b/.test(stemLower)) {
    score -= 8;
    reasons.push('⚠ "always" / "never" in stem (not a TF question)');
  }
  if (/\bnot\b.*\bnot\b/.test(stemLower)) {
    score -= 10;
    reasons.push('✗ double negative in stem');
  }

  // Curriculum classification — has a meaningful curriculum concept?
  const concept = classify(q);
  if (concept) {
    score += 10;
    reasons.push(`✓ classifies as: ${concept}${ANCHOR_CONCEPTS.has(concept) ? ' ★' : ''}`);
  } else {
    reasons.push('⚠ no curriculum-concept match');
  }

  // Has age tagging
  if (Array.isArray(q.levels) && q.levels.length > 0) {
    score += 5;
    reasons.push(`✓ tagged for ${q.levels.length} age${q.levels.length > 1 ? 's' : ''}`);
  } else {
    reasons.push('⚠ no levels[] tag');
  }

  // POV-MC bonus: has image with alt
  if (t === 'pov-mc') {
    if (q.media?.url) score += 5;
    if (q.media?.alt) score += 5;
    if (q.media?.url && q.media?.alt) reasons.push('✓ image + alt');
    else if (q.media?.url) reasons.push('⚠ image but no alt');
    else reasons.push('⚠ pov-mc with no image');
  }

  return { score: Math.max(0, Math.min(100, score)), reasons, concept };
}

// ============================================================================
// MAIN
// ============================================================================
const legacy = JSON.parse(readFileSync(LEGACY, 'utf-8'));

const wantedTypes = new Set(TYPES_FLAG.split(',').map((s) => s.trim()).filter(Boolean));
let conceptFilter;
if (CONCEPTS_FLAG === 'anchors') conceptFilter = (c) => ANCHOR_CONCEPTS.has(c);
else if (CONCEPTS_FLAG === 'all') conceptFilter = () => true;
else {
  const wanted = new Set(CONCEPTS_FLAG.split(',').map((s) => s.trim()).filter(Boolean));
  conceptFilter = (c) => wanted.has(c);
}

console.log(`Mining legacy bank: ${LEGACY}`);
console.log(`Filters: types=${[...wantedTypes].join(',')}  concepts=${CONCEPTS_FLAG}  min-score=${MIN_SCORE}  limit=${LIMIT}`);

const candidates = [];
let totalScored = 0, totalSkipped = 0;
Object.entries(legacy).forEach(([age, arr]) => {
  arr.forEach((q) => {
    const t = q.type || 'mc';
    if (!wantedTypes.has(t)) { totalSkipped++; return; }
    const { score, reasons, concept } = scoreQuestion(q);
    totalScored++;
    if (score < MIN_SCORE) return;
    if (concept && !conceptFilter(concept)) return;
    if (!concept && CONCEPTS_FLAG !== 'all') return;
    candidates.push({ ...q, _legacyScore: score, _legacyScoreReasons: reasons, _primaryConcept: concept, _sourceAge: age });
  });
});

// Dedup by id (multi-age questions appear in multiple buckets in legacy file).
const byId = new Map();
candidates.forEach((c) => {
  const existing = byId.get(c.id);
  if (!existing || existing._legacyScore < c._legacyScore) byId.set(c.id, c);
});
const unique = [...byId.values()];

// Sort by score desc; cap at LIMIT.
unique.sort((a, b) => b._legacyScore - a._legacyScore);
const top = unique.slice(0, LIMIT);

// Re-bucket by levels[] (or _sourceAge) into the age-keyed output shape.
const out = { 'U7 / Initiation': [], 'U9 / Novice': [], 'U11 / Atom': [], 'U13 / Peewee': [], 'U15 / Bantam': [], 'U18 / Midget': [] };
top.forEach((q) => {
  const buckets = Array.isArray(q.levels) && q.levels.length ? q.levels : [q._sourceAge];
  buckets.forEach((b) => {
    if (out[b] && !out[b].some((x) => x.id === q.id)) out[b].push(q);
  });
  // Drop our internal classifier sidecar before writing.
  delete q._sourceAge;
  delete q._primaryConcept;
});

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

// Summary
console.log('');
console.log('=== Summary ===');
console.log(`Scored: ${totalScored} questions (skipped ${totalSkipped} of wrong type)`);
console.log(`Passed quality bar (score >= ${MIN_SCORE}) and concept filter: ${unique.length}`);
console.log(`Top ${top.length} candidates written to:`);
console.log(`  ${OUT}`);
console.log('');
console.log('Score distribution among the top:');
const buckets = { '90+': 0, '80-89': 0, '70-79': 0, '60-69': 0, '50-59': 0 };
top.forEach((c) => {
  if (c._legacyScore >= 90) buckets['90+']++;
  else if (c._legacyScore >= 80) buckets['80-89']++;
  else if (c._legacyScore >= 70) buckets['70-79']++;
  else if (c._legacyScore >= 60) buckets['60-69']++;
  else buckets['50-59']++;
});
Object.entries(buckets).forEach(([range, n]) => console.log(`  ${range}: ${n}`));
console.log('');
console.log('Per-age count in output:');
Object.entries(out).forEach(([age, arr]) => console.log(`  ${age}: ${arr.length}`));
console.log('');
console.log('Next: open the Scenario Author → Reload → load src/data/questions.legacy-candidates.json');
console.log('      Triage one by one. Save & Ship → drop into src/data/questions.json.');
