// Shared curriculum classifier — used by tools/curriculum-audit.mjs and
// tools/mine-legacy-bank.mjs. Single source for the cat/concept/archetype
// → curriculum-concept mappings so audit and miner agree.
//
// To add a new mapping: edit one of the three maps below, then re-run both
// audit and miner; numbers stay consistent.

export const ANCHOR_CONCEPTS = new Set(['reading-the-play', 'decision-making']);

export const SKATER_CONCEPTS = [
  'skating-posture', 'puck-control', 'passing-receiving', 'shooting',
  'stick-position', 'body-position',
  'eyes-up', 'reading-the-play', 'decision-making', 'spatial-awareness', 'time-and-space',
  'dz-coverage', 'gap-control', 'breakout', 'neutral-zone',
  'oz-entry', 'oz-cycle', 'forecheck', 'special-teams', 'body-checking',
  'battle-level', 'communication', 'recovery-resilience',
];
export const GOALIE_CONCEPTS = [
  'goalie-angle-depth', 'goalie-save-selection', 'goalie-recovery',
  'goalie-puck-handling', 'goalie-communication',
];
export const ALL_CONCEPTS = [...SKATER_CONCEPTS, ...GOALIE_CONCEPTS];

export const AGES = ['U7 / Initiation', 'U9 / Novice', 'U11 / Atom', 'U13 / Peewee', 'U15 / Bantam', 'U18 / Midget'];
export const AGE_SHORT = { 'U7 / Initiation': 'U7', 'U9 / Novice': 'U9', 'U11 / Atom': 'U11', 'U13 / Peewee': 'U13', 'U15 / Bantam': 'U15', 'U18 / Midget': 'U18' };

// Depth matrix per CURRICULUM_MAP.md.
//   - / I / D / M / R    (— = not introduced; targets are 0)
export const DEPTH_MATRIX = {
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
  'goalie-angle-depth':      ['I','D','M','R','R','R'],
  'goalie-save-selection':   ['-','I','D','M','R','R'],
  'goalie-recovery':         ['-','I','D','M','R','R'],
  'goalie-puck-handling':    ['-','-','I','D','M','R'],
  'goalie-communication':    ['-','I','D','M','R','R'],
};

// Direct concept-tag → curriculum-concept (case-insensitive exact match).
export const CONCEPT_TAG_MAP = {
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
  'stick position': 'stick-position', 'stick on puck': 'stick-position', 'stick on ice': 'stick-position',
  'body position': 'body-position',
  'athletic stance': 'skating-posture', 'crossover power': 'skating-posture',
  'puck protection': 'puck-control',
  'soft hands': 'passing-receiving',
  'shot selection': 'shooting',
  'stretch pass': 'oz-entry',
  'gap control': 'gap-control', 'gap': 'gap-control',
  'forecheck': 'forecheck',
  'breakout': 'breakout',
  'cycle': 'oz-cycle', 'offensive cycle': 'oz-cycle',
  'neutral zone': 'neutral-zone', 'transition': 'neutral-zone',
  'defensive coverage': 'dz-coverage', 'coverage': 'dz-coverage',
  'power play': 'special-teams', 'penalty kill': 'special-teams',
  'face-off': 'special-teams', 'faceoff': 'special-teams',
  'goalie positioning': 'goalie-angle-depth',
};

export const ARCHETYPE_MAP = {
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

// Fallback `cat` mapping. Covers all 55 distinct cat values found in the bank.
export const CAT_MAP = {
  'hockey sense':         'reading-the-play',
  'reading the play':     'reading-the-play',
  'rush reads':           'reading-the-play',
  'blue line reads':      'reading-the-play',
  'game iq':              'reading-the-play',
  'advanced tactics':     'reading-the-play',
  'decision-making':      'decision-making',
  'blue line decisions':  'decision-making',
  'puck support':         'decision-making',
  '2-on-1':               'decision-making',
  'vision':               'eyes-up',
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
  'spatial awareness':    'spatial-awareness',
  'zone awareness':       'spatial-awareness',
  'game awareness':       'spatial-awareness',
  'rink anatomy':         'spatial-awareness',
  'orientation':          'spatial-awareness',
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
  'goaltending':          'goalie-angle-depth',
};

const norm = (s) => (s || '').toString().trim().toLowerCase();

// Map a question to a single primary curriculum concept. Returns null if
// nothing matches.
export function classify(q) {
  const isGoalie = Array.isArray(q.pos) && q.pos.includes('G');

  // 1. concepts[] (most specific)
  const concepts = Array.isArray(q.concepts) ? q.concepts : [];
  for (const c of concepts) {
    const mapped = CONCEPT_TAG_MAP[norm(c)];
    if (mapped) {
      if (isGoalie && mapped === 'reading-the-play') return 'goalie-angle-depth';
      return mapped;
    }
  }

  // 2. archetype
  if (q.archetype) {
    const fromArchetype = ARCHETYPE_MAP[norm(q.archetype)] || CONCEPT_TAG_MAP[norm(q.archetype)];
    if (fromArchetype) return fromArchetype;
  }

  // 3. cat fallback
  if (q.cat) {
    const mapped = CAT_MAP[norm(q.cat)];
    if (mapped) {
      if (isGoalie && mapped === 'dz-coverage') return 'goalie-angle-depth';
      return mapped;
    }
  }

  return null;
}

// Anchor concepts get 2x the listed targets.
const DEPTH_TARGETS = { '-': 0, 'I': 3, 'D': 5, 'M': 7, 'R': 5 };

export function targetFor(concept, ageIdx) {
  const depth = DEPTH_MATRIX[concept]?.[ageIdx] ?? '-';
  const base = DEPTH_TARGETS[depth];
  return ANCHOR_CONCEPTS.has(concept) ? base * 2 : base;
}
