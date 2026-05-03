// Adds 3 U7 skating-posture questions to extend the existing posture series
// (Q-posture-001 / -002 from add-u7-spatial-batch.mjs). Follows the same
// anchor-tagging convention so the curriculum Tracker counts them at 2x:
// primary concept is the anchor ('reading the play'), surface skill
// ('skating-posture') is secondary, plus 'eyes-up' to round out three.
//
// Spatial coords are stubs at the rink center. Author opens each in the
// hot-spots / multi-tap visual editor and drags markers/spots to the
// right location. Idempotent — re-running is a no-op once all 3 ids exist.
// Status 'wip' so they show up at the top of the WIP review queue.

import fs from 'node:fs';

const QUESTIONS_PATH = 'src/data/questions.json';
const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));
const PRIMARY_AGE = 'U7 / Initiation';

if (!Array.isArray(data[PRIMARY_AGE])) {
  console.error(`Primary age "${PRIMARY_AGE}" not found in bank.`);
  process.exit(1);
}

const BG_FACEOFF = '/assets/scenes/rink-faceoff-circle.png';
const BG_TOPDOWN = '/assets/scenes/rink-fullrink.png';

const COMMON = {
  pos: ['F', 'C', 'D'],
  d: 1,
  // Multi-age fan: U7 + U9 — skating-posture is 'D' (developing) at U9 per
  // DEPTH_MATRIX in rinkreads-author/src/curriculum.js, so it fits there.
  levels: [PRIMARY_AGE, 'U9 / Novice'],
  cat: 'Reading the play',
  cats: ['Reading the play', 'Skating posture', 'Eyes up'],
  concepts: ['reading-the-play', 'skating-posture', 'eyes-up'],
  archetype: 'reading the play',
  _status: 'wip',
};

// Scaffolds — minimal valid shape for each spatial type. Author repositions
// in the visual editors; preflight only checks shape, not coords.
function scaffoldMultiTap({ correctCount, distractorCount }) {
  const markers = [];
  for (let i = 0; i < correctCount; i++)    markers.push({ x: 0.30 + i * 0.12, y: 0.50, correct: true,  label: `correct ${i + 1}` });
  for (let i = 0; i < distractorCount; i++) markers.push({ x: 0.62 + i * 0.12, y: 0.50, correct: false, label: `distractor ${i + 1}` });
  return { markers };
}
function scaffoldHotSpotsBinary() {
  // Exactly 2 spots — 1 correct, 1 distractor — for the "pick the right one"
  // framing the user asked for.
  return {
    spots: [
      { x: 0.40, y: 0.50, correct: true,  label: 'ready stance', msg: '' },
      { x: 0.60, y: 0.50, correct: false, label: 'standing tall', msg: '' },
    ],
  };
}

const QUESTIONS = [
  {
    // Bumped from -003 to -006: -003 already existed as an mc question
    // ("coach says athletic stance!"). Sequence skipped to avoid collision.
    id: 'Q-posture-006-A1-U7',
    type: 'multi-tap',
    q: 'The puck is about to drop. Tap each player who is in a strong, ready stance.',
    why: 'Knees bent, head up, stick on the ice = first to the puck off the draw. Standing tall or looking at your skates = a half-second late.',
    tip: 'Knees bent = stronger skater = first to the puck.',
    bg: BG_FACEOFF,
    ...scaffoldMultiTap({ correctCount: 2, distractorCount: 2 }),
  },
  {
    id: 'Q-posture-004-A1-U7',
    type: 'multi-tap',
    q: 'Tap each teammate skating in an athletic stance — knees bent and head up.',
    why: 'Athletic stance = balance + power + vision. You can change direction faster, see the play, and absorb a check. Tall and stiff = none of those.',
    tip: 'Athletic stance = ready for anything.',
    bg: BG_TOPDOWN,
    ...scaffoldMultiTap({ correctCount: 2, distractorCount: 2 }),
  },
  {
    id: 'Q-posture-005-A1-U7',
    type: 'hot-spots',
    q: 'Faceoff in 1 second. Tap the player who is ready to win the puck.',
    why: 'Bent knees, low body, stick already on the ice = puck on your stick the moment it drops. The other player has to react and lose half a second.',
    tip: 'Low body, low stick, win the draw.',
    bg: BG_FACEOFF,
    ...scaffoldHotSpotsBinary(),
  },
];

const existingIds = new Set();
for (const arr of Object.values(data)) for (const q of arr) existingIds.add(q.id);

let added = 0;
let skipped = 0;
for (const spec of QUESTIONS) {
  if (existingIds.has(spec.id)) { skipped++; continue; }
  const { bg, ...rest } = spec;
  const full = {
    id: rest.id,
    type: rest.type,
    cat: COMMON.cat,
    cats: COMMON.cats,
    concepts: COMMON.concepts,
    archetype: COMMON.archetype,
    pos: COMMON.pos,
    d: COMMON.d,
    levels: COMMON.levels,
    _status: COMMON._status,
    q: rest.q,
    why: rest.why,
    tip: rest.tip,
    media: { type: 'image', url: bg, alt: '' },
    ...(rest.markers ? { markers: rest.markers } : {}),
    ...(rest.spots   ? { spots:   rest.spots   } : {}),
  };
  data[PRIMARY_AGE].push(full);
  added++;
}

fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(`Added: ${added}`);
console.log(`Skipped (already in bank): ${skipped}`);
console.log('\nNew question ids:');
for (const q of QUESTIONS) console.log(`  ${q.id.padEnd(28)}  ${q.type.padEnd(12)}  -> ${q.q.slice(0, 60)}${q.q.length > 60 ? '…' : ''}`);
console.log('\nNext: open the rinkreads-author Questions tab, click ⚠ Disk changed → Reload, then position the markers/spots in the visual editor for each.');
