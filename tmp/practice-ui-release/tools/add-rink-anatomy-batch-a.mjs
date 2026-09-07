// Adds 9 rink-label questions covering basic rink anatomy (lines, zones,
// dots, circles, crease). Primary age U7, fanned out to U9/U11/U13 via
// levels[] so the same question reaches every age tier.
//
// Each question lands with stub coords (x: 0.5, y: 0.5). The author
// opens the rink-label visual editor and drags each spot to the right
// pixel location on rink-anatomy-diagram.png — takes ~10 seconds per spot.
//
// Idempotent: re-running is a no-op once the 9 ids are present.

import fs from 'node:fs';

const QUESTIONS_PATH = 'src/data/questions.json';
const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));

// Shared option list across all 9 questions. Engine renders these as
// tap-able buttons; correctId picks the right one per question.
const OPTIONS = [
  'red_line',
  'blue_line',
  'goal_line',
  'faceoff_dot',
  'faceoff_circle',
  'crease',
  'neutral_zone',
  'defensive_zone',
  'offensive_zone',
];

const COMMON = {
  type: 'rink-label',
  cat: 'Game Awareness',
  cats: ['Game Awareness', 'Skills'],
  concept: 'spatial-awareness',
  pos: ['F', 'C', 'D', 'G'],
  d: 1,
  media: {
    type: 'image',
    url: '/assets/images/rink-anatomy-diagram.png',
    aspect: '16:9',
  },
  spot: { x: 0.5, y: 0.5 },  // stub — author repositions in visual editor
  options: OPTIONS,
  levels: ['U7 / Initiation', 'U9 / Novice', 'U11 / Atom', 'U13 / Peewee'],
};

const QUESTIONS = [
  {
    id: 'u7_rink_label_anatomy_red_line',
    q: 'Which feature of the rink is highlighted?',
    correctId: 'red_line',
    tip: 'The red line cuts the rink in half — center ice.',
  },
  {
    id: 'u7_rink_label_anatomy_blue_line',
    q: 'Which feature of the rink is highlighted?',
    correctId: 'blue_line',
    tip: 'Two blue lines split the rink into three zones.',
  },
  {
    id: 'u7_rink_label_anatomy_goal_line',
    q: 'Which feature of the rink is highlighted?',
    correctId: 'goal_line',
    tip: 'The goal line runs across the front of each net.',
  },
  {
    id: 'u7_rink_label_anatomy_faceoff_dot',
    q: 'Which feature of the rink is highlighted?',
    correctId: 'faceoff_dot',
    tip: 'Faceoff dots are where the puck drops to start play.',
  },
  {
    id: 'u7_rink_label_anatomy_faceoff_circle',
    q: 'Which feature of the rink is highlighted?',
    correctId: 'faceoff_circle',
    tip: 'The big red circle around a dot — only centers stand inside it for a faceoff.',
  },
  {
    id: 'u7_rink_label_anatomy_crease',
    q: 'Which feature of the rink is highlighted?',
    correctId: 'crease',
    tip: 'The blue half-circle in front of the net — the goalie\'s house.',
  },
  {
    id: 'u7_rink_label_anatomy_neutral_zone',
    q: 'Which zone of the rink is highlighted?',
    correctId: 'neutral_zone',
    tip: 'The middle zone — between the two blue lines.',
  },
  {
    id: 'u7_rink_label_anatomy_defensive_zone',
    q: 'Which zone of the rink is highlighted?',
    correctId: 'defensive_zone',
    tip: 'The zone with YOUR goalie — that\'s your defensive end.',
  },
  {
    id: 'u7_rink_label_anatomy_offensive_zone',
    q: 'Which zone of the rink is highlighted?',
    correctId: 'offensive_zone',
    tip: 'The zone with THEIR goalie — that\'s where you try to score.',
  },
];

// Find U7 array (primary bucket for these). Question with levels[] fans out.
const primaryAge = 'U7 / Initiation';
if (!Array.isArray(data[primaryAge])) {
  console.error(`Primary age "${primaryAge}" not found in bank.`);
  process.exit(1);
}

const existingIds = new Set();
for (const arr of Object.values(data)) {
  for (const q of arr) existingIds.add(q.id);
}

let added = 0;
let skipped = 0;
for (const q of QUESTIONS) {
  if (existingIds.has(q.id)) {
    skipped++;
    continue;
  }
  const full = {
    id: q.id,
    ...COMMON,
    q: q.q,
    correctId: q.correctId,
    tip: q.tip,
  };
  data[primaryAge].push(full);
  added++;
}

fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(`Added: ${added}`);
console.log(`Skipped (already in bank): ${skipped}`);
console.log('\nNew question ids:');
QUESTIONS.forEach((q) => console.log(`  ${q.id}  → correctId: ${q.correctId}`));
console.log('\nNext step: open each question in the rink-label visual editor and drag the spot to the right pixel location on rink-anatomy-diagram.png.');
