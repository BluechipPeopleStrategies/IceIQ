// Adds 10 U7 spatial questions across 5 concepts (Reading the play, Skating
// posture, Puck control, Passing & receiving, Stick position).
//
// Every question is tagged with an ANCHOR concept ('reading the play' or
// 'decision-making') as its primary so the curriculum Tracker counts them
// at 2x weight. The surface skill is preserved as a secondary concept tag
// and as cats[] so question filtering / quality scoring still surface the
// correct skill bucket.
//
// All spatial coords are stubs (markers/spots/targets at 0.5, 0.5). Author
// opens each in the rink-label / hot-spots / etc. visual editor and drags
// the spots to the right location on the rink-bg.
//
// Idempotent — re-running is a no-op once the 10 ids are present. Status
// 'wip' so they show up in the author's review queue at the top.

import fs from 'node:fs';

const QUESTIONS_PATH = 'src/data/questions.json';
const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));
const PRIMARY_AGE = 'U7 / Initiation';

if (!Array.isArray(data[PRIMARY_AGE])) {
  console.error(`Primary age "${PRIMARY_AGE}" not found in bank.`);
  process.exit(1);
}

// Default rink-bg per question. Top-down feel right for U7 spatial reads.
// Author can swap via the rink-bg picker after authoring.
const BG_TOPDOWN = '/assets/scenes/rink-fullrink.png';
const BG_NZ_OZ   = '/assets/scenes/rink-arena-nz-oz.png';
const BG_DZ      = '/assets/scenes/rink-endzone.png';
const BG_FULL    = '/assets/scenes/rink-arena-fullrink.png';

const COMMON = {
  pos: ['F', 'C', 'D'],
  d: 1,
  levels: [PRIMARY_AGE],
  _status: 'wip',  // shows up in the WIP bucket on first review
};

// Anchor-aligned tagging. The classifier walks concepts[] first, so the
// anchor concept goes first; the surface skill is second so it's still
// metadata-visible. cat is 'Hockey Sense' / 'Decision-Making' (both map
// to anchor via CAT_MAP) so questions still classify correctly even if
// concepts[] gets stripped.
const tagsReading  = (skill) => ({ cat: 'Hockey Sense', cats: ['Hockey Sense', skill], concepts: ['reading the play', skill.toLowerCase()], archetype: 'reading the play' });
const tagsDecision = (skill) => ({ cat: 'Decision-Making', cats: ['Decision-Making', skill], concepts: ['decision-making', skill.toLowerCase()], archetype: 'decision-making' });

// Type-specific scaffolds — minimal valid shape for each spatial type.
// Author repositions in the visual editor (drag-and-drop). All coords are
// stubs at the rink center; preflight only checks shape, not coords.
function scaffoldMultiTap({ correctCount = 1, distractorCount = 2 } = {}) {
  const markers = [];
  for (let i = 0; i < correctCount; i++)    markers.push({ x: 0.4 + i * 0.05, y: 0.5, correct: true,  label: `correct ${i+1}` });
  for (let i = 0; i < distractorCount; i++) markers.push({ x: 0.6 + i * 0.05, y: 0.5, correct: false, label: `distractor ${i+1}` });
  return { markers };
}
function scaffoldHotSpots({ correctCount = 1, distractorCount = 2 } = {}) {
  const spots = [];
  for (let i = 0; i < correctCount; i++)    spots.push({ x: 0.5 - i * 0.08, y: 0.5, correct: true,  label: `correct ${i+1}`, msg: '' });
  for (let i = 0; i < distractorCount; i++) spots.push({ x: 0.5 + (i+1) * 0.08, y: 0.5, correct: false, label: `distractor ${i+1}`, msg: '' });
  return { spots };
}
function scaffoldDragTarget({ correctCount = 1, distractorCount = 2 } = {}) {
  const targets = [];
  for (let i = 0; i < correctCount; i++)    targets.push({ x: 0.7,  y: 0.5, correct: true,  label: `correct ${i+1}` });
  for (let i = 0; i < distractorCount; i++) targets.push({ x: 0.3 + i * 0.08, y: 0.5, correct: false, label: `distractor ${i+1}` });
  return { puckStart: { x: 0.2, y: 0.5 }, targets };
}
function scaffoldZoneClick({ pool, correct }) {
  return { zones: pool, correct };
}

const QUESTIONS = [
  // ---- Reading the play (anchor: reading-the-play) ----
  {
    id: 'Q-readplay-001-A1-U7', type: 'multi-tap',
    q: 'Tap each black teammate who is open for a pass.',
    why: 'Open teammates have no yellow checker close — they are the safe pass. U7 starts with spotting open ice.',
    tip: 'Open ice = open for the pass.',
    bg: BG_TOPDOWN,
    ...tagsReading('Skills'),
    ...scaffoldMultiTap({ correctCount: 1, distractorCount: 2 }),
  },
  {
    id: 'Q-readplay-002-A1-U7', type: 'zone-click',
    q: 'Your teammate has the puck. Tap the zone where you should skate to help.',
    why: 'Skate ahead of the puck so your teammate has a forward pass option. Behind or beside the puck = no help.',
    tip: 'Skate where the puck is going, not where it is.',
    bg: BG_NZ_OZ,
    ...tagsReading('Skills'),
    ...scaffoldZoneClick({ pool: ['dz-slot', 'nz-center', 'oz-high-slot'], correct: 'oz-high-slot' }),
  },

  // ---- Skating posture (anchor: reading-the-play, surface: skating-posture) ----
  {
    id: 'Q-posture-001-A1-U7', type: 'hot-spots',
    q: 'The play is about to start. Tap the player who is READY in a strong stance.',
    why: 'Knees bent, head up, stick on ice = ready to react. The other postures are slower to move from.',
    tip: 'Knees bent = stronger skater.',
    bg: BG_TOPDOWN,
    ...tagsReading('Skating'),
    ...scaffoldHotSpots({ correctCount: 1, distractorCount: 3 }),
  },
  {
    id: 'Q-posture-002-A1-U7', type: 'multi-tap',
    q: 'Tap each teammate skating with their head UP — they can see the play.',
    why: 'Head up means you see the puck, your teammates, and the open ice. Head down = you only see your own skates.',
    tip: 'Head up means you see the play.',
    bg: BG_TOPDOWN,
    ...tagsReading('Skating'),
    ...scaffoldMultiTap({ correctCount: 2, distractorCount: 2 }),
  },

  // ---- Puck control (anchor: decision-making / reading-the-play, surface: puck-control) ----
  {
    id: 'Q-puckctl-001-A1-U7', type: 'drag-target',
    q: 'Drag the puck to where you should keep it — close to your stick blade.',
    why: 'Puck close to your blade means you can stickhandle, pass, or shoot anytime. Out wide or way ahead = the other team gets it.',
    tip: 'Puck close = puck yours.',
    bg: BG_FULL,
    ...tagsDecision('Puck Skills'),
    ...scaffoldDragTarget({ correctCount: 1, distractorCount: 2 }),
  },
  {
    id: 'Q-puckctl-002-A1-U7', type: 'multi-tap',
    q: 'Tap each teammate whose puck is close enough to control.',
    why: 'A puck within a stick-length is controllable; a puck a stick-length away is already lost. Reading control before the next play matters.',
    tip: 'If you can\'t reach it fast, you can\'t keep it.',
    bg: BG_TOPDOWN,
    ...tagsReading('Puck Skills'),
    ...scaffoldMultiTap({ correctCount: 2, distractorCount: 2 }),
  },

  // ---- Passing & receiving (anchor: decision-making, surface: passing-receiving) ----
  {
    id: 'Q-pass-001-A1-U7', type: 'drag-target',
    q: 'Drag the puck to your open teammate.',
    why: 'Pass to the teammate without a yellow checker — they have time to handle it. Passing into pressure is a turnover waiting to happen.',
    tip: 'Pass to the teammate without a checker.',
    bg: BG_NZ_OZ,
    ...tagsDecision('Passing'),
    ...scaffoldDragTarget({ correctCount: 1, distractorCount: 2 }),
  },
  {
    id: 'Q-pass-002-A1-U7', type: 'hot-spots',
    q: 'Your teammate is skating up the ice. Tap where you should aim the pass.',
    why: 'Lead the pass — aim ahead of where they are now so the puck and the teammate meet at the same spot. At their feet = they have to stop. Behind = they have to turn.',
    tip: 'Pass to where they\'re going, not where they are.',
    bg: BG_NZ_OZ,
    ...tagsDecision('Passing'),
    ...scaffoldHotSpots({ correctCount: 1, distractorCount: 2 }),
  },

  // ---- Stick position (anchor: reading-the-play, surface: stick-position) ----
  {
    id: 'Q-stickoi-002-A1-U7', type: 'multi-tap',
    q: 'Tap each teammate whose stick is on the ice — they\'re ready for the play.',
    why: 'Stick on ice means you can intercept a pass, tip a shot, or block a lane RIGHT NOW. Stick lifted = a half-second of nothing.',
    tip: 'Stick on ice = ready for anything.',
    bg: BG_DZ,
    ...tagsReading('Skills'),
    ...scaffoldMultiTap({ correctCount: 2, distractorCount: 2 }),
  },
  {
    id: 'Q-stickoi-003-A1-U7', type: 'hot-spots',
    q: 'Where should your stick blade be when you\'re waiting for a pass? Tap the spot.',
    why: 'Blade flat on the ice in front of your body = your teammate has a clear target and the puck stays on your stick when it arrives.',
    tip: 'Flat blade, on the ice, in front of you.',
    bg: BG_FULL,
    ...tagsReading('Skills'),
    ...scaffoldHotSpots({ correctCount: 1, distractorCount: 2 }),
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
    cat: rest.cat,
    cats: rest.cats,
    concepts: rest.concepts,
    archetype: rest.archetype,
    ...COMMON,
    q: rest.q,
    why: rest.why,
    tip: rest.tip,
    media: { type: 'image', url: bg, alt: '' },
    // Spatial-type-specific fields
    ...(rest.markers   ? { markers:   rest.markers   } : {}),
    ...(rest.spots     ? { spots:     rest.spots     } : {}),
    ...(rest.targets   ? { targets:   rest.targets, puckStart: rest.puckStart } : {}),
    ...(rest.zones     ? { zones:     rest.zones, correct: rest.correct } : {}),
  };
  data[PRIMARY_AGE].push(full);
  added++;
}

fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(`Added: ${added}`);
console.log(`Skipped (already in bank): ${skipped}`);
console.log('\nNew question ids:');
for (const q of QUESTIONS) console.log(`  ${q.id.padEnd(28)}  ${q.type.padEnd(12)}  -> ${q.cat}`);
console.log('\nNext step: open each in the visual editor (rinkreads-author Questions tab) and drag the spots/markers/targets to the right location on the rink-bg. All are status=wip so they\'ll surface in the WIP filter chip.');
