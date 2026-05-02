// One-shot: add 13 new questions to questions.json:
//   - 6 rink-label position questions (U7 + U11 + U13) using players-positions.png
//   - 1 U7 breakout MC with overlays on the rink-endzone bg
//   - 6 unreviewed (status: 'wip') visual MVP-gap questions for U7/U9
//
// Storage convention: each question lives in ONE age bucket (the first level
// in q.levels[]). The engine fans them out to other ages via levels[] at
// queue-build time. This matches the existing pattern in questions.json and
// keeps preflight's duplicate-id check happy.
//
// MC questions use the LEGACY schema (sit + opts + ok). Mixing 'q' in there
// trips preflight's "looks like new schema" heuristic and demands choices[].
// Rink-label uses NEW schema (q + correctId + options + spot).
//
// Idempotent — re-running skips ids already present.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = resolve(__dirname, '..', 'src/data/questions.json');
const bank = JSON.parse(readFileSync(path, 'utf-8'));

const POSITIONS_IMG    = { type: 'image', url: '/assets/images/players-positions.png',     aspect: '16:9' };
const ENDZONE_IMG      = { type: 'image', url: '/assets/scenes/rink-endzone.png',          aspect: '16:9' };
const FULLRINK_DEF_IMG = { type: 'image', url: '/assets/scenes/rink-fullrink-defense.png', aspect: '16:9' };
const NET_CLOSEUP_IMG  = { type: 'image', url: '/assets/scenes/rink-closeup-net.png',      aspect: '16:9' };

const POS_FDG = ['F', 'D', 'G'];

// 6 rink-label position questions. Stored once under U11 (first in levels[]).
const greenSpots = [
  { id: 'C',  x: 0.422, y: 0.476, correctId: 'center',           tip: 'Center plays the middle — wings on the boards, D behind, G in net.' },
  { id: 'LW', x: 0.319, y: 0.367, correctId: 'left_wing',        tip: 'Wings cover the boards on their side. Facing your goalie, LW is on your left.' },
  { id: 'RW', x: 0.486, y: 0.609, correctId: 'right_wing',       tip: 'Wings cover the boards on their side. Facing your goalie, RW is on your right.' },
  { id: 'LD', x: 0.18,  y: 0.443, correctId: 'left_defenseman',  tip: 'Defense play behind the forwards. Facing your goalie, LD is on your left.' },
  { id: 'RD', x: 0.364, y: 0.712, correctId: 'right_defenseman', tip: 'Defense play behind the forwards. Facing your goalie, RD is on your right.' },
  { id: 'G',  x: 0.233, y: 0.578, correctId: 'goalie',           tip: 'Goalies stay in or near the crease — only player allowed there.' },
];

const optionsBase = ['center', 'left_wing', 'right_wing', 'left_defenseman', 'right_defenseman', 'goalie'];
const reorderedOpts = (correct) => [correct, ...optionsBase.filter((o) => o !== correct)];

const rinkLabelQs = greenSpots.map((s) => ({
  id: `u11_rink_label_green_${s.id}`,
  type: 'rink-label',
  cat: 'Player Positions',
  concept: 'spatial-awareness',
  pos: POS_FDG,
  d: 1,
  q: 'Which position is the highlighted green-team player?',
  media: POSITIONS_IMG,
  spot: { x: s.x, y: s.y },
  correctId: s.correctId,
  options: reorderedOpts(s.correctId),
  tip: s.tip,
  levels: ['U11 / Atom', 'U7 / Initiation', 'U13 / Peewee'],
}));

// MC questions — legacy schema only (sit + opts + ok). The "what do you do?"
// prompt is folded into sit on the same line so the engine renders it cleanly.
const breakoutQ = {
  id: 'u7-breakout-001',
  type: 'mc',
  cat: 'Breakout',
  concept: 'breakout',
  pos: POS_FDG,
  d: 1,
  sit: 'Your D (#7) has the puck behind your net. She is looking at you. You are #14. What do you do?',
  opts: [
    'Stand still and wave your stick',
    'Skate to open ice so she can pass to you',
    'Skate behind the net to help her',
    'Skate to the bench for a line change',
  ],
  ok: 1,
  why: 'Your D needs a target. Skate to open ice where she can see you and pass without other players in the way. If everyone crowds the puck, there is nowhere to pass.',
  tip: 'Get open.',
  media: { type: 'image', url: '/assets/scenes/rink-endzone.png', aspect: '16:9', alt: 'Defensive-zone breakout — your D has puck behind the net, you (#14) in low slot, opposing forecheckers pressuring' },
  overlays: [
    { id: 'your-d', kind: 'sprite', team: 'black', x: 0.50, y: 0.88, scale: 1.0, poseIdx: 0 },
    { id: 'you',    kind: 'sprite', team: 'black', x: 0.45, y: 0.62, scale: 1.0, poseIdx: 0, isFocus: true },
    { id: 'fc1',    kind: 'sprite', team: 'white', x: 0.36, y: 0.78, scale: 1.0, poseIdx: 1 },
    { id: 'fc2',    kind: 'sprite', team: 'white', x: 0.62, y: 0.80, scale: 1.0, poseIdx: 1 },
    { id: 'puck',   kind: 'puck',   x: 0.50, y: 0.90, scale: 1.0 },
    { id: 'lbl',    kind: 'text',   text: 'YOU', x: 0.45, y: 0.55, size: 14, color: '#facc15' },
  ],
  levels: ['U7 / Initiation', 'U9 / Novice'],
  status: 'wip',
};

const mvpDrafts = [
  {
    id: 'u7-eyes-up-001',
    type: 'mc',
    cat: 'Hockey Sense',
    concept: 'eyes-up',
    pos: POS_FDG,
    d: 1,
    sit: 'You just got the puck at center ice. Two teammates are skating ahead. Where should your eyes be?',
    opts: [
      'Down at the puck so you do not lose it',
      'Up the ice, looking at your teammates and the other team',
      'On your skates so you do not fall',
      'On the scoreboard',
    ],
    ok: 1,
    why: 'You can feel the puck on your stick — you do not need to look at it. Eyes UP lets you see your teammates, the other team, and where the open ice is.',
    tip: 'Eyes up.',
    media: FULLRINK_DEF_IMG,
    levels: ['U7 / Initiation', 'U9 / Novice'],
    status: 'wip',
  },
  {
    id: 'u7-stick-position-001',
    type: 'mc',
    cat: 'Defense',
    concept: 'stick-position',
    pos: POS_FDG,
    d: 1,
    sit: 'You are playing defense. The other team is skating at you with the puck. Where should your stick be?',
    opts: [
      'Up in the air, ready to swing',
      'Flat on the ice in the passing lane',
      'Behind your back',
      'Resting on top of your skates',
    ],
    ok: 1,
    why: 'Your stick on the ice blocks passes AND takes away easy options for the puck-carrier. Stick in the air does nothing — sticks on the ice make plays.',
    tip: 'Stick on ice.',
    media: ENDZONE_IMG,
    levels: ['U7 / Initiation', 'U9 / Novice'],
    status: 'wip',
  },
  {
    id: 'u7-reading-play-001',
    type: 'mc',
    cat: 'Hockey Sense',
    concept: 'reading-the-play',
    pos: POS_FDG,
    d: 1,
    sit: 'Your teammate has the puck and just looked at you. You are standing still in open ice. What is most likely about to happen?',
    opts: [
      'They are going to pass you the puck',
      'They are going to skate the other way',
      'They are going to shoot at the goalie',
      'Nothing — keep waiting',
    ],
    ok: 0,
    why: 'When a teammate looks at you, they see you as a target. Be ready — a pass is coming. Get your stick on the ice and your eyes up.',
    tip: 'Be ready.',
    media: FULLRINK_DEF_IMG,
    levels: ['U7 / Initiation', 'U9 / Novice'],
    status: 'wip',
  },
  {
    id: 'u7-decision-making-001',
    type: 'mc',
    cat: 'Hockey Sense',
    concept: 'decision-making',
    pos: POS_FDG,
    d: 1,
    sit: 'You have the puck near the boards. Two opponents are coming at you. Your teammate is open in the middle, calling for it. What is your best move?',
    opts: [
      'Try to stickhandle through both opponents',
      'Pass to your open teammate',
      'Shoot at the net from the boards',
      'Stop skating and protect the puck forever',
    ],
    ok: 1,
    why: 'Two opponents on you means tight space. Your open teammate has time and a better shot. The pass beats two players at once.',
    tip: 'Pass it.',
    media: ENDZONE_IMG,
    levels: ['U7 / Initiation', 'U9 / Novice'],
    status: 'wip',
  },
  {
    id: 'u9-dz-coverage-001',
    type: 'mc',
    cat: 'Defense',
    concept: 'dz-coverage',
    pos: POS_FDG,
    d: 2,
    sit: 'You are defending in your zone. The puck is in the corner with their forward. Another forward is parked in front of your net. Who is your job to cover?',
    opts: [
      'The forward in the corner — go fight for the puck',
      'The forward in front of your net — keep them off the goalie',
      'Both at the same time',
      'The goalie',
    ],
    ok: 1,
    why: 'When the puck is in the corner, somebody else attacks it. Your job is the player in front of YOUR net — they are the dangerous one if a pass comes out.',
    tip: 'Cover the slot.',
    media: ENDZONE_IMG,
    levels: ['U9 / Novice', 'U11 / Atom'],
    status: 'wip',
  },
  {
    id: 'u9-goalie-angle-001',
    type: 'mc',
    cat: 'Goalie',
    concept: 'goalie-angle-depth',
    pos: POS_FDG,
    d: 2,
    sit: 'A shooter is coming down the wing toward your goalie. The goalie is hiding deep in the net. Where should the goalie be?',
    opts: [
      'Way back in the net, near the goal line',
      'Out a little, lined up with the puck',
      'Off to the side of the net',
      'Skating up to challenge at the blue line',
    ],
    ok: 1,
    why: 'A goalie deep in the net leaves a huge open area on either side. Coming out a few feet — staying square to the puck — covers more of the net from the shooter\'s view.',
    tip: 'Square up.',
    media: NET_CLOSEUP_IMG,
    levels: ['U9 / Novice', 'U11 / Atom'],
    status: 'wip',
  },
];

const allNew = [...rinkLabelQs, breakoutQ, ...mvpDrafts];

let inserted = 0, skipped = 0;
for (const q of allNew) {
  const home = q.levels[0];
  if (!bank[home]) bank[home] = [];

  // Skip if id already present anywhere in the bank.
  let alreadyPresent = false;
  for (const arr of Object.values(bank)) {
    if (Array.isArray(arr) && arr.some((x) => x.id === q.id)) { alreadyPresent = true; break; }
  }
  if (alreadyPresent) {
    console.warn('skip duplicate id:', q.id);
    skipped++;
    continue;
  }
  bank[home].push(q);
  inserted++;
}

writeFileSync(path, JSON.stringify(bank, null, 2) + '\n');
console.log(`Wrote ${path}`);
console.log(`Inserted ${inserted} questions, skipped ${skipped} duplicates.`);
