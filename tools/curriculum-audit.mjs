// Curriculum audit: classify every question in questions.json against the
// CURRICULUM_MAP.md taxonomy, report coverage, gaps, surplus, and visual-mix
// adherence per age.
//
// Usage:
//   node tools/curriculum-audit.mjs                # full report to stdout
//   node tools/curriculum-audit.mjs --gaps         # gaps section only
//   node tools/curriculum-audit.mjs --json         # machine-readable JSON
//   node tools/curriculum-audit.mjs > AUDIT.md     # capture full report

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const QUESTIONS = resolve(root, 'src/data/questions.json');

const args = process.argv.slice(2);
const gapsOnly = args.includes('--gaps');
const asJson = args.includes('--json');

// ============================================================================
// CURRICULUM (mirrors CURRICULUM_MAP.md — keep in sync)
// ============================================================================
const ANCHOR_CONCEPTS = new Set(['reading-the-play', 'decision-making']);

const SKATER_CONCEPTS = [
  'skating-posture', 'puck-control', 'passing-receiving', 'shooting',
  'stick-position', 'body-position',
  'eyes-up', 'reading-the-play', 'decision-making', 'spatial-awareness', 'time-and-space',
  'dz-coverage', 'gap-control', 'breakout', 'neutral-zone',
  'oz-entry', 'oz-cycle', 'forecheck', 'special-teams', 'body-checking',
  'battle-level', 'communication', 'recovery-resilience',
];
const GOALIE_CONCEPTS = [
  'goalie-angle-depth', 'goalie-save-selection', 'goalie-recovery',
  'goalie-puck-handling', 'goalie-communication',
];
const ALL_CONCEPTS = [...SKATER_CONCEPTS, ...GOALIE_CONCEPTS];

const AGES = ['U7 / Initiation', 'U9 / Novice', 'U11 / Atom', 'U13 / Peewee', 'U15 / Bantam', 'U18 / Midget'];
const AGE_SHORT = { 'U7 / Initiation': 'U7', 'U9 / Novice': 'U9', 'U11 / Atom': 'U11', 'U13 / Peewee': 'U13', 'U15 / Bantam': 'U15', 'U18 / Midget': 'U18' };

// Depth matrix — mirrors CURRICULUM_MAP.md.
//   - / I / D / M / R    (— means not introduced; targets are 0)
const DEPTH_MATRIX = {
  // Skater
  'skating-posture':    ['I','D','M','R','R','R'],
  'puck-control':       ['I','D','M','R','R','R'],
  'passing-receiving':  ['I','D','M','R','R','R'],
  'shooting':           ['-','I','D','M','R','R'],
  'stick-position':     ['I','D','M','R','R','R'],
  'body-position':      ['-','I','D','M','R','R'],
  'eyes-up':            ['I','D','M','R','R','R'],
  'reading-the-play':   ['I','D','M','R','R','R'],
  'decision-making':    ['I','D','M','R','R','R'],
  'spatial-awareness':  ['-','I','D','M','R','R'],
  'time-and-space':     ['-','-','I','D','M','R'],
  'dz-coverage':        ['I','D','M','R','R','R'],
  'gap-control':        ['-','-','I','D','M','R'],
  'breakout':           ['I','D','M','R','R','R'],
  'neutral-zone':       ['-','-','I','D','M','R'],
  'oz-entry':           ['I','D','M','R','R','R'],
  'oz-cycle':           ['-','-','I','D','M','R'],
  'forecheck':          ['-','-','I','D','M','R'],
  'special-teams':      ['-','-','-','I','D','M'],
  'body-checking':      ['-','-','-','I','D','R'],
  'battle-level':       ['I','D','M','R','R','R'],
  'communication':      ['I','D','M','R','R','R'],
  'recovery-resilience':['I','D','M','R','R','R'],
  // Goalie
  'goalie-angle-depth':      ['I','D','M','R','R','R'],
  'goalie-save-selection':   ['-','I','D','M','R','R'],
  'goalie-recovery':         ['-','I','D','M','R','R'],
  'goalie-puck-handling':    ['-','-','I','D','M','R'],
  'goalie-communication':    ['-','I','D','M','R','R'],
};

// Target question count per depth tag (anchor concepts get 2x).
const DEPTH_TARGETS = { '-': 0, 'I': 3, 'D': 5, 'M': 7, 'R': 5 };

const targetFor = (concept, ageIdx) => {
  const depth = DEPTH_MATRIX[concept]?.[ageIdx] ?? '-';
  const base = DEPTH_TARGETS[depth];
  return ANCHOR_CONCEPTS.has(concept) ? base * 2 : base;
};

// ============================================================================
// CLASSIFIER — map a question to a single primary curriculum concept
// ============================================================================

// Direct concept-tag → curriculum-concept mapping (exact, case-insensitive).
// These come from the existing bank's `concepts[]` and Notion-side archetypes.
const CONCEPT_TAG_MAP = {
  // Hockey Sense / anchor concepts
  'eyes up': 'eyes-up', 'eyesup': 'eyes-up',
  'reading the play': 'reading-the-play',
  'pattern recognition': 'reading-the-play',
  'cross-ice read': 'reading-the-play',
  'read the defender': 'reading-the-play',
  'decision quality': 'decision-making',
  'decision-making': 'decision-making',
  'pass vs shoot': 'decision-making',
  'pass selection': 'decision-making',
  'lane support': 'decision-making',
  'triangle support': 'decision-making',
  'support': 'decision-making',
  // Skills
  'stick position': 'stick-position', 'stick on puck': 'stick-position', 'stick on ice': 'stick-position',
  'body position': 'body-position',
  'athletic stance': 'skating-posture', 'crossover power': 'skating-posture',
  'puck protection': 'puck-control',
  'soft hands': 'passing-receiving',
  'shot selection': 'shooting',
  // Tactics
  'stretch pass': 'oz-entry',
  'gap control': 'gap-control', 'gap': 'gap-control',
  'forecheck': 'forecheck',
  'breakout': 'breakout',
  'cycle': 'oz-cycle', 'offensive cycle': 'oz-cycle',
  'neutral zone': 'neutral-zone', 'transition': 'neutral-zone',
  'defensive coverage': 'dz-coverage', 'coverage': 'dz-coverage',
  'power play': 'special-teams', 'penalty kill': 'special-teams',
  'face-off': 'special-teams', 'faceoff': 'special-teams',
  // Goalie
  'goalie positioning': 'goalie-angle-depth',
};

// Archetype field gets its own lookup since it's often distinct from concepts.
const ARCHETYPE_MAP = {
  '2-on-1 rush': 'decision-making',
  '3-on-2': 'decision-making',
  'eyes up': 'eyes-up',
  'athletic stance': 'skating-posture',
  'stick on ice': 'stick-position',
  'puck protection': 'puck-control',
  'crossovers': 'skating-posture',
  'receiving a pass': 'passing-receiving',
  'breakaway': 'shooting',
};

// Fallback `cat` → curriculum-concept mapping. Covers all 55 distinct cat
// values found in the existing bank. Best-effort — questions tagged with
// a generic `cat` and no specific `concepts[]` get the closest curriculum
// concept; these are candidates for re-tagging during curriculum migration.
const CAT_MAP = {
  // Anchor-spread (defaulting to reading-the-play; many will be re-tagged)
  'hockey sense':         'reading-the-play',
  'reading the play':     'reading-the-play',
  'rush reads':           'reading-the-play',
  'blue line reads':      'reading-the-play',
  'game iq':              'reading-the-play',
  'advanced tactics':     'reading-the-play',
  // Decision making
  'decision-making':      'decision-making',
  'blue line decisions':  'decision-making',
  'puck support':         'decision-making',
  '2-on-1':               'decision-making',
  // Eyes / vision
  'vision':               'eyes-up',
  // Skills
  'skills':               'puck-control',
  'puck skills':          'puck-control',
  'puck management':      'puck-control',
  'puck protection':      'puck-control',
  'shooting':             'shooting',
  'scoring':              'shooting',
  'finishing':            'shooting',
  'passing':              'passing-receiving',
  'skating':              'skating-posture',
  'starts':               'skating-posture',
  // Spatial / awareness
  'spatial awareness':    'spatial-awareness',
  'zone awareness':       'spatial-awareness',
  'game awareness':       'spatial-awareness',
  'rink anatomy':         'spatial-awareness',
  'orientation':          'spatial-awareness',
  // Tactics / zones
  'coverage':             'dz-coverage',
  'defense':              'dz-coverage',
  'defensive zone':       'dz-coverage',
  'positioning':          'dz-coverage',
  'roles':                'dz-coverage',
  'player positions':     'dz-coverage',
  'systems play':         'dz-coverage',
  'net-front':            'dz-coverage',
  'gap control':          'gap-control',
  'breakouts':            'breakout',
  'transition':           'neutral-zone',
  'neutral zone play':    'neutral-zone',
  'forecheck':            'forecheck',
  'forechecking':         'forecheck',
  'offensive pressure':   'forecheck',
  'cycle play':           'oz-cycle',
  'offensive zone':       'oz-cycle',
  'special teams':        'special-teams',
  'power play':           'special-teams',
  'penalty kill':         'special-teams',
  'physical play':        'body-checking',
  // Compete / habits
  'compete':              'battle-level',
  'teamwork':             'communication',
  'leadership':           'communication',
  'sportsmanship':        'communication',
  'rules':                'communication',
  'listening':            'recovery-resilience',
  'safety':               'recovery-resilience',
  'practice':             'recovery-resilience',
  'coachability':         'recovery-resilience',
  'game management':      'time-and-space',
  // Goalie
  'goaltending':          'goalie-angle-depth',
};

const norm = (s) => (s || '').toString().trim().toLowerCase();

function classify(q) {
  // Goalie position pulls into goalie track.
  const isGoalie = Array.isArray(q.pos) && q.pos.includes('G');

  // 1. Try `concepts[]` array first (most specific).
  const concepts = Array.isArray(q.concepts) ? q.concepts : [];
  for (const c of concepts) {
    const mapped = CONCEPT_TAG_MAP[norm(c)];
    if (mapped) {
      // Goalie override: if pos=G and the mapped concept is a generic skater concept,
      // try to upgrade to a goalie concept where it makes sense.
      if (isGoalie && mapped === 'reading-the-play') return 'goalie-angle-depth';
      return mapped;
    }
  }

  // 2. Try `archetype` (Notion-side single tag).
  if (q.archetype) {
    const fromArchetype = ARCHETYPE_MAP[norm(q.archetype)] || CONCEPT_TAG_MAP[norm(q.archetype)];
    if (fromArchetype) return fromArchetype;
  }

  // 3. Try `cat`.
  if (q.cat) {
    const mapped = CAT_MAP[norm(q.cat)];
    if (mapped) {
      if (isGoalie && mapped === 'dz-coverage') return 'goalie-angle-depth';
      return mapped;
    }
  }

  // 4. No more fallbacks — TF and others surface as unmapped so they can be
  // re-tagged with a specific concept. Defaulting hides real classification gaps.
  return null;
}

// ============================================================================
// VISUAL-MIX TARGETS PER AGE (mirrors CURRICULUM_MAP.md type mix table)
// ============================================================================
const VISUAL_TARGETS = {
  'U7':  { text: 0.20, visual: 0.70, spatial: 0.10 },
  'U9':  { text: 0.25, visual: 0.60, spatial: 0.15 },
  'U11': { text: 0.30, visual: 0.40, spatial: 0.30 },
  'U13': { text: 0.30, visual: 0.30, spatial: 0.40 },
  'U15': { text: 0.30, visual: 0.20, spatial: 0.50 },
  'U18': { text: 0.30, visual: 0.20, spatial: 0.50 },
};

const TYPE_BUCKET = (type) => {
  if (['mc', 'tf', 'seq', 'mistake', 'next', 'multi'].includes(type)) return 'text';
  if (['pov-mc', 'scene-mc'].includes(type)) return 'visual';
  if (['hot-spots', 'rink-label', 'rink-drag', 'rink-match',
       'drag-target', 'drag-place', 'path-draw', 'lane-select',
       'multi-tap', 'sequence-rink', 'zone-click'].includes(type)) return 'spatial';
  return 'unknown';
};

// ============================================================================
// LOAD + CLASSIFY
// ============================================================================
const raw = JSON.parse(readFileSync(QUESTIONS, 'utf-8'));
const flat = [];
Object.entries(raw).forEach(([age, arr]) => {
  arr.forEach((q) => flat.push({ ...q, _age: age }));
});

const total = flat.length;

// Cell counter: counts[concept][ageShort] = count
const counts = {};
ALL_CONCEPTS.forEach((c) => { counts[c] = { U7: 0, U9: 0, U11: 0, U13: 0, U15: 0, U18: 0 }; });
// Unmapped tracked as a Map keyed by question id so multi-age questions only
// count once toward the unmapped total.
const unmappedById = new Map();
const visualByAge = { U7: { text: 0, visual: 0, spatial: 0, unknown: 0 }, U9: { text: 0, visual: 0, spatial: 0, unknown: 0 }, U11: { text: 0, visual: 0, spatial: 0, unknown: 0 }, U13: { text: 0, visual: 0, spatial: 0, unknown: 0 }, U15: { text: 0, visual: 0, spatial: 0, unknown: 0 }, U18: { text: 0, visual: 0, spatial: 0, unknown: 0 } };

flat.forEach((q) => {
  const concept = classify(q);
  // Use levels[] if present, otherwise the bucket age it lived in.
  const ages = Array.isArray(q.levels) && q.levels.length ? q.levels : [q._age];
  ages.forEach((a) => {
    const short = AGE_SHORT[a];
    if (!short) return;
    if (concept && counts[concept]) counts[concept][short]++;
    visualByAge[short][TYPE_BUCKET(q.type || 'mc')]++;
  });
  if (!concept && !unmappedById.has(q.id)) {
    unmappedById.set(q.id, { id: q.id, type: q.type || 'mc', cat: q.cat, concepts: q.concepts || [], archetype: q.archetype });
  }
});
const unmapped = [...unmappedById.values()];

// ============================================================================
// REPORTING
// ============================================================================
function fmt(n, w = 4) { return String(n).padStart(w); }

function ageHeader() {
  return AGES.map((a) => fmt(AGE_SHORT[a], 5)).join('');
}

function depthTagged(actual, target, depth) {
  if (depth === '-') return actual === 0 ? '   .' : ` !${fmt(actual, 2)}`;
  if (target === 0) return fmt(actual, 4);
  if (actual === 0) return `${fmt(0, 4)}`;
  if (actual < target) return `${fmt(actual, 4)}`;
  if (actual > target * 2) return `${fmt(actual, 4)}`;
  return fmt(actual, 4);
}

function coverageTable(label, conceptList) {
  const lines = [];
  lines.push('');
  lines.push(`### ${label}`);
  lines.push('');
  lines.push('Cells: actual / target. Anchor concepts marked ★.');
  lines.push('');
  lines.push('| Concept | ' + AGES.map((a) => AGE_SHORT[a]).join(' | ') + ' |');
  lines.push('|---' + '|---'.repeat(AGES.length) + '|');
  conceptList.forEach((concept) => {
    const row = AGES.map((age, idx) => {
      const target = targetFor(concept, idx);
      const actual = counts[concept][AGE_SHORT[age]];
      const depth = DEPTH_MATRIX[concept][idx];
      if (depth === '-') {
        return actual > 0 ? `~~${actual}~~` : '·';
      }
      if (actual === 0) return `**0**/${target}`;
      if (actual < target) return `${actual}/${target}`;
      if (actual > target * 2.5) return `${actual}/${target}⚠`;
      return `${actual}/${target}`;
    });
    const star = ANCHOR_CONCEPTS.has(concept) ? ' ★' : '';
    lines.push('| ' + concept + star + ' | ' + row.join(' | ') + ' |');
  });
  return lines.join('\n');
}

function visualMixSection() {
  const lines = [];
  lines.push('');
  lines.push('## Visual-mix coverage (current vs. target by age)');
  lines.push('');
  lines.push('Target % is from CURRICULUM_MAP.md. Younger ages should be visual-heavy; older more spatial.');
  lines.push('');
  lines.push('| Age | Text actual / target | Visual actual / target | Spatial actual / target |');
  lines.push('|---|---|---|---|');
  Object.entries(visualByAge).forEach(([age, b]) => {
    const total = b.text + b.visual + b.spatial + b.unknown;
    if (total === 0) return;
    const t = VISUAL_TARGETS[age];
    const pct = (n) => Math.round((n / total) * 100);
    const tag = (actualPct, targetPct, kind) => {
      const diff = actualPct - targetPct * 100;
      const flag = Math.abs(diff) > 15 ? (diff < 0 ? ' 📉' : ' 📈') : '';
      return `${actualPct}% / ${Math.round(targetPct * 100)}%${flag}`;
    };
    lines.push(`| ${age} | ${tag(pct(b.text), t.text, 'text')} | ${tag(pct(b.visual), t.visual, 'visual')} | ${tag(pct(b.spatial), t.spatial, 'spatial')} |`);
  });
  return lines.join('\n');
}

function gapList() {
  const gaps = [];
  ALL_CONCEPTS.forEach((concept) => {
    AGES.forEach((age, idx) => {
      const target = targetFor(concept, idx);
      const actual = counts[concept][AGE_SHORT[age]];
      const depth = DEPTH_MATRIX[concept][idx];
      if (depth !== '-' && actual < target) {
        gaps.push({ concept, age: AGE_SHORT[age], actual, target, deficit: target - actual, depth, anchor: ANCHOR_CONCEPTS.has(concept) });
      }
    });
  });
  gaps.sort((a, b) => (b.anchor - a.anchor) || (b.deficit - a.deficit));
  return gaps;
}

function surplusList() {
  const sur = [];
  ALL_CONCEPTS.forEach((concept) => {
    AGES.forEach((age, idx) => {
      const target = targetFor(concept, idx);
      const actual = counts[concept][AGE_SHORT[age]];
      const depth = DEPTH_MATRIX[concept][idx];
      if (depth === '-' && actual > 0) {
        sur.push({ concept, age: AGE_SHORT[age], actual, reason: 'concept marked not-introduced at this age' });
      } else if (actual > target * 2.5 && target > 0) {
        sur.push({ concept, age: AGE_SHORT[age], actual, target, reason: `>${Math.round(2.5 * 100)}% over target` });
      }
    });
  });
  return sur;
}

// ============================================================================
// OUTPUT
// ============================================================================
if (asJson) {
  console.log(JSON.stringify({
    total, counts, visualByAge,
    gaps: gapList(),
    surplus: surplusList(),
    unmapped: unmapped.length,
    unmappedSample: unmapped.slice(0, 20),
  }, null, 2));
} else {
  const out = [];
  out.push('# RinkReads Curriculum Audit');
  out.push('');
  out.push(`**Generated:** ${new Date().toISOString().split('T')[0]}`);
  out.push(`**Source:** \`src/data/questions.json\` — ${total} questions`);
  out.push(`**Curriculum:** [CURRICULUM_MAP.md](./CURRICULUM_MAP.md) v2`);
  out.push('');
  out.push('## Summary');
  out.push('');
  out.push(`- **Total questions:** ${total}`);
  out.push(`- **Classified:** ${total - unmapped.length} (${Math.round((total - unmapped.length) / total * 100)}%)`);
  out.push(`- **Unmapped (no concept match):** ${unmapped.length}`);
  out.push(`- **Anchor concept counts:** Reading-the-Play ${Object.values(counts['reading-the-play']).reduce((a,b) => a+b, 0)}, Decision-Making ${Object.values(counts['decision-making']).reduce((a,b) => a+b, 0)}`);

  if (!gapsOnly) {
    out.push('');
    out.push('## Coverage matrix');
    out.push('');
    out.push('Each cell shows `actual/target`. **0**/N highlights gaps. Cells marked · are not-introduced (no target). ⚠ flags surplus (>2.5× target). ~~strike~~ flags questions tagged at an age the concept isn\'t introduced.');
    out.push(coverageTable('Skater concepts', SKATER_CONCEPTS));
    out.push(coverageTable('Goalie concepts', GOALIE_CONCEPTS));
    out.push(visualMixSection());
  }

  out.push('');
  out.push('## Gaps (cells under target)');
  out.push('');
  const gaps = gapList();
  if (gaps.length === 0) out.push('None.');
  else {
    out.push(`${gaps.length} gap cells. Anchor-concept gaps listed first.`);
    out.push('');
    out.push('| Concept | Age | Have | Target | Deficit | Depth | Anchor |');
    out.push('|---|---|---|---|---|---|---|');
    gaps.slice(0, 60).forEach((g) => {
      out.push(`| ${g.concept} | ${g.age} | ${g.actual} | ${g.target} | ${g.deficit} | ${g.depth} | ${g.anchor ? '★' : ''} |`);
    });
    if (gaps.length > 60) out.push(`\n*… ${gaps.length - 60} more rows. Run with --json for the full list.*`);
  }

  out.push('');
  out.push('## Surplus / mistagged (cells over target or at not-introduced ages)');
  out.push('');
  const sur = surplusList();
  if (sur.length === 0) out.push('None.');
  else {
    out.push('| Concept | Age | Have | Target | Reason |');
    out.push('|---|---|---|---|---|');
    sur.forEach((s) => out.push(`| ${s.concept} | ${s.age} | ${s.actual} | ${s.target ?? '—'} | ${s.reason} |`));
  }

  out.push('');
  out.push('## Unmapped questions');
  out.push('');
  out.push(`${unmapped.length} questions couldn't be classified — their \`concepts\`/\`archetype\`/\`cat\` fields didn't match any curriculum concept in \`CONCEPT_TAG_MAP\`/\`CAT_MAP\`. Either add tag mappings, or these questions need re-tagging.`);
  if (unmapped.length > 0) {
    out.push('');
    out.push('First 30 sample IDs (with their existing tags so you can see why they didn\'t classify):');
    out.push('');
    out.push('```');
    unmapped.slice(0, 30).forEach((u) => {
      const tags = [u.cat && `cat=${u.cat}`, u.archetype && `archetype=${u.archetype}`, u.concepts.length && `concepts=[${u.concepts.join(',')}]`].filter(Boolean).join(' · ');
      out.push(`  ${u.id}  (type=${u.type})  ${tags || '(no tags)'}`);
    });
    out.push('```');
  }

  out.push('');
  out.push('## Next steps');
  out.push('');
  out.push('1. Review gap rows. Highest-priority cells: anchor-concept gaps (Reading-the-Play / Decision-Making) and high-deficit cells.');
  out.push('2. Surplus rows: candidate questions for re-tagging or moving to legacy archive.');
  out.push('3. Unmapped questions: add tag-mappings to `tools/curriculum-audit.mjs` if they have a curriculum concept; otherwise mark as legacy.');
  out.push('4. Visual-mix: ages with 📉 visual flags need more pov-mc / scene-mc questions; 📈 spatial flags mean over-investment in interactive types vs. age target.');
  out.push('5. After triage, run shell-generator (next script) to scaffold empty questions for each gap cell.');

  console.log(out.join('\n'));
}
