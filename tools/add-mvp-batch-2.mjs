// Batch 2 of MVP-gap visual MC questions. Same conventions as add-mvp-batch.mjs:
//   - legacy schema (sit + opts + ok), no `q`
//   - status: 'wip' so they cluster behind the WIP filter for review
//   - stored once at q.levels[0]; engine fans out via levels[]
//   - image-backed — every one has q.media set so they classify as visual
//
// Targets the deficits flagged after batch 1:
//   - U7 visual still 34% under target → 4 new U7 MC
//   - U7/U9 anchors (reading-the-play, decision-making) need a second each
//   - U9 battle-level + forecheck still empty
//
// Idempotent — re-running skips ids already present.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = resolve(__dirname, '..', 'src/data/questions.json');
const bank = JSON.parse(readFileSync(path, 'utf-8'));

const ENDZONE_IMG      = { type: 'image', url: '/assets/scenes/rink-endzone.png',          aspect: '16:9' };
const FULLRINK_IMG     = { type: 'image', url: '/assets/scenes/rink-fullrink.png',         aspect: '16:9' };
const FULLRINK_DEF_IMG = { type: 'image', url: '/assets/scenes/rink-fullrink-defense.png', aspect: '16:9' };
const NZ_OZ_IMG        = { type: 'image', url: '/assets/scenes/rink-arena-nz-oz.png',      aspect: '16:9' };
const FACEOFF_IMG      = { type: 'image', url: '/assets/scenes/rink-faceoff-circle.png',   aspect: '16:9' };

const POS_FDG = ['F', 'D', 'G'];

const drafts = [
  {
    id: 'u7-puck-control-001',
    type: 'mc',
    cat: 'Skills',
    concept: 'puck-control',
    pos: POS_FDG,
    d: 1,
    sit: 'You are skating up the ice carrying the puck. Your eyes are looking straight down at the puck. What is the problem with that?',
    opts: [
      'Nothing — staring at the puck keeps it on your stick',
      'You will skate into someone or miss an open teammate',
      'You will skate too fast',
      'The puck will fall off your stick',
    ],
    ok: 1,
    why: 'When you stare at the puck, you cannot see your teammates, the other team, or the open ice. Hockey players feel the puck on their stick — eyes belong UP.',
    tip: 'Feel it, don\'t watch it.',
    media: FULLRINK_IMG,
    levels: ['U7 / Initiation', 'U9 / Novice'],
    _status: 'wip',
  },
  {
    id: 'u7-passing-001',
    type: 'mc',
    cat: 'Skills',
    concept: 'passing-receiving',
    pos: POS_FDG,
    d: 1,
    sit: 'You are about to make a pass to your teammate. Where should you pass the puck?',
    opts: [
      'Right at their skates so they have to stop',
      'In front of where they are skating, so they can skate onto it',
      'Behind them so they have to turn around',
      'High in the air so it is hard to handle',
    ],
    ok: 1,
    why: 'A good pass leads your teammate — pass to where they ARE GOING, not where they are right now. They skate onto it without slowing down.',
    tip: 'Lead them.',
    media: FULLRINK_IMG,
    levels: ['U7 / Initiation', 'U9 / Novice'],
    _status: 'wip',
  },
  {
    id: 'u7-oz-entry-001',
    type: 'mc',
    cat: 'Offense',
    concept: 'oz-entry',
    pos: POS_FDG,
    d: 1,
    sit: 'You have the puck and you are skating across the blue line into their zone. Two of their defenders are right in front of you. No teammates are with you yet.',
    opts: [
      'Skate straight into both defenders',
      'Dump the puck deep and chase it with your teammates',
      'Stop and wait at the blue line',
      'Pass to the goalie',
    ],
    ok: 1,
    why: 'When you are alone against two defenders, you will lose the puck. Dump it deep so your teammates can race to it. That gets your team in the zone TOGETHER.',
    tip: 'Dump and chase.',
    media: NZ_OZ_IMG,
    levels: ['U7 / Initiation', 'U9 / Novice'],
    _status: 'wip',
  },
  {
    id: 'u7-skating-posture-001',
    type: 'mc',
    cat: 'Skills',
    concept: 'skating-posture',
    pos: POS_FDG,
    d: 1,
    sit: 'Your coach says "athletic stance!" before a faceoff. What does that look like?',
    opts: [
      'Stand straight up with your stick over your head',
      'Knees bent, butt down, stick on the ice, ready to move',
      'Sit on the ice and wait',
      'Lean way forward over your skates',
    ],
    ok: 1,
    why: 'Athletic stance = knees bent, butt down, stick on the ice. From there you can move in any direction the second the puck drops. Standing tall makes you slow.',
    tip: 'Knees bent.',
    media: FACEOFF_IMG,
    levels: ['U7 / Initiation', 'U9 / Novice'],
    _status: 'wip',
  },
  {
    id: 'u7-reading-play-002',
    type: 'mc',
    cat: 'Hockey Sense',
    concept: 'reading-the-play',
    pos: POS_FDG,
    d: 1,
    sit: 'The other team has the puck and is skating toward your zone. Your defenseman is the only one back. What should YOU do?',
    opts: [
      'Keep skating the way you were going',
      'Race back to help your defense',
      'Stop and watch what happens',
      'Skate to the bench',
    ],
    ok: 1,
    why: 'When the other team has the puck and is coming at your net, EVERY player on your team becomes a defender. Race back so your D is not alone.',
    tip: 'Backcheck.',
    media: FULLRINK_DEF_IMG,
    levels: ['U7 / Initiation', 'U9 / Novice'],
    _status: 'wip',
  },
  {
    id: 'u7-decision-making-002',
    type: 'mc',
    cat: 'Hockey Sense',
    concept: 'decision-making',
    pos: POS_FDG,
    d: 1,
    sit: 'You have the puck right in front of the other team\'s net. The goalie is way out of position to one side. What do you do?',
    opts: [
      'Pass it back to your defenseman',
      'Shoot at the empty side of the net',
      'Skate around the net to celebrate',
      'Wait for the goalie to get back in position',
    ],
    ok: 1,
    why: 'When the goalie is out of position, the net is open. SHOOT. Do not pass up an open-net chance — those do not happen often.',
    tip: 'Shoot it.',
    media: ENDZONE_IMG,
    levels: ['U7 / Initiation', 'U9 / Novice'],
    _status: 'wip',
  },
  {
    id: 'u9-battle-level-001',
    type: 'mc',
    cat: 'Compete',
    concept: 'battle-level',
    pos: POS_FDG,
    d: 2,
    sit: 'You fall down chasing a loose puck in the corner. Their forward picks it up. What do you do?',
    opts: [
      'Stay on the ice and rest a second',
      'Get up as fast as you can and battle to get the puck back',
      'Skate to the bench for a line change',
      'Yell at your teammates to get it',
    ],
    ok: 1,
    why: 'Falling happens. What separates good players: how fast they get up. Pop up and battle — your team needs you, not your excuses.',
    tip: 'Get up, go.',
    media: ENDZONE_IMG,
    levels: ['U9 / Novice', 'U11 / Atom'],
    _status: 'wip',
  },
  {
    id: 'u9-forecheck-001',
    type: 'mc',
    cat: 'Offense',
    concept: 'forecheck',
    pos: POS_FDG,
    d: 2,
    sit: 'You are the first forward into the other team\'s zone. Their defenseman has the puck behind their net. What is your job?',
    opts: [
      'Stand at the blue line and wait',
      'Skate hard at the puck-carrier and force them to make a quick decision',
      'Skate to the front of their net',
      'Chase their other defenseman',
    ],
    ok: 1,
    why: 'F1 (the first forward in) hunts the puck-carrier. Skate at them with speed and angle them so they have less time and space to make a clean play.',
    tip: 'Hunt the puck.',
    media: ENDZONE_IMG,
    levels: ['U9 / Novice', 'U11 / Atom'],
    _status: 'wip',
  },
];

let inserted = 0, skipped = 0;
for (const q of drafts) {
  const home = q.levels[0];
  if (!bank[home]) bank[home] = [];

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
