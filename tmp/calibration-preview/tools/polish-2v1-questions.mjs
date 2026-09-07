// Polishes the 44 IMG-2v1 questions ahead of the v2.6 image drop.
//
// - Repoints every IMG-2v1-001..004 question's media.url to
//   /assets/images/<imageId>.png so dropping the four PNGs into
//   public/assets/images/ wires them up automatically.
// - Replaces the per-question alt text with one canonical alt per
//   scene that doesn't lock in left/right details (the prompts pin
//   numbers but DALL-E rotates orientation).
// - Flips U7 wording from "the black player" to "the yellow player"
//   so the v2.6 BLACK=POV / YELLOW=opposing convention reads true.
// - Fixes a handful of quality-lint failures (option-length variance,
//   truncated tips, over-long tips, and two broken multi-select-as-mc
//   questions whose why and opts disagreed).
//
// Idempotent: re-running is a no-op once the bank is in the target
// shape.

import fs from 'node:fs';

const QUESTIONS_PATH = 'src/data/questions.json';
const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));

// One canonical alt per scene. No left/right calls — every prompt
// pins jersey numbers but the side the defender favors comes out
// however DALL-E renders it. Describe the READ instead.
const ALT_BY_IMAGE = {
  'IMG-2v1-001':
    "The yellow defender's stick is extended into the puck-side lane, taking away the shot. The cross-ice lane to the black teammate is open — the defender's weight has committed to the puck, leaving the pass as the correct read.",
  'IMG-2v1-002':
    "The yellow defender's stick is extended into the cross-ice passing lane, taking away the pass. The lane straight ahead to the goalie is open — the defender has committed to the pass, leaving the shot as the correct read.",
  'IMG-2v1-003':
    "The yellow defender is sitting deep near the hash marks, body squared, stick centered. There is wide-open ice on both sides — the defender hasn't committed yet, so the puck carrier has to attack the open ice and force a commit before reacting.",
  'IMG-2v1-004':
    "The yellow defender has stepped up aggressively toward the puck carrier, abandoning the textbook backward 2-on-1 gap. His commitment to the puck has vacated the middle of the ice behind him — the open space is the chip-or-pass-past read.",
};

let urlsFixed = 0;
let altsFixed = 0;
let wordingFixed = 0;
let qualityFixed = 0;

for (const ageArr of Object.values(data)) {
  for (const q of ageArr) {
    if (!q.imageId || !q.imageId.startsWith('IMG-2v1-')) continue;

    // 1. media.url → /assets/images/<imageId>.png
    if (q.media && q.media.url !== `/assets/images/${q.imageId}.png`) {
      q.media.url = `/assets/images/${q.imageId}.png`;
      urlsFixed++;
    }

    // 2. canonical alt per scene
    const targetAlt = ALT_BY_IMAGE[q.imageId];
    if (targetAlt && q.media.alt !== targetAlt) {
      q.media.alt = targetAlt;
      altsFixed++;
    }

    // 3. U7 wording: "the black player" / "the player in black" → yellow
    const isU7 = (q.levels || []).some((L) => L.includes('U7'));
    if (isU7) {
      const flip = (s) =>
        typeof s === 'string'
          ? s
              .replace(/the black player's/g, "the yellow player's")
              .replace(/The black player's/g, "The yellow player's")
              .replace(/the black player/g, 'the yellow player')
              .replace(/The black player/g, 'The yellow player')
              .replace(/the player in black/g, 'the player in yellow')
              .replace(/The player in black/g, 'The player in yellow')
          : s;
      const before = JSON.stringify({ why: q.why, tip: q.tip, sit: q.sit });
      q.why = flip(q.why);
      q.tip = flip(q.tip);
      q.sit = flip(q.sit);
      const after = JSON.stringify({ why: q.why, tip: q.tip, sit: q.sit });
      if (before !== after) wordingFixed++;
    }
  }
}

// 4. Targeted quality fixes by id.
function findById(id) {
  for (const arr of Object.values(data)) {
    for (const q of arr) if (q.id === id) return q;
  }
  return null;
}

// Q-2v1-001-A7-U11 — option-length variance > 50% (correct option much
// longer than distractors). Rebalance to similar lengths so the lint
// doesn't flag the correct answer as a length-giveaway.
{
  const q = findById('Q-2v1-001-A7-U11');
  if (q) {
    q.opts = [
      'The defender committed to your side, opening the cross-ice lane',
      'The goalie can’t move fast enough to follow the pass',
      'Your teammate is closer to the net than you are',
      'Passing is always better than shooting on a 2-on-1',
    ];
    q.ok = 0;
    qualityFixed++;
  }
}

// Q-2v1-001-A1-U11 — tip too long (16w). Tighten to ≤15.
{
  const q = findById('Q-2v1-001-A1-U11');
  if (q && q.tip && q.tip.split(/\s+/).filter(Boolean).length > 15) {
    q.tip = "Read the defender’s stick — it shows what he’s taking away.";
    qualityFixed++;
  }
}

// Q-2v1-001-A8-U13 — tip truncated mid-sentence ("vs.").
{
  const q = findById('Q-2v1-001-A8-U13');
  if (q && /vs\.\s*$/.test(q.tip || '')) {
    q.tip = '~10% on the shot vs. 50%+ on the cross-ice pass.';
    qualityFixed++;
  }
}

// Q-2v1-003-A8-U13 — tip is 28 words (way too long).
{
  const q = findById('Q-2v1-003-A8-U13');
  if (q && q.tip && q.tip.split(/\s+/).filter(Boolean).length > 18) {
    q.tip = 'Good reads know when an answer isn’t available yet.';
    qualityFixed++;
  }
}

// Q-2v1-002-A9-U13 — declared MULTI-SELECT but type:"mc" with single ok.
// Convert to single-best-answer ("which is FALSE?") so engine + intent
// agree.
{
  const q = findById('Q-2v1-002-A9-U13');
  if (q) {
    q.sit = 'Which statement about this image is FALSE?';
    q.opts = [
      "The defender's stick is in the pass lane",
      'The defender is leaning forward charging the puck carrier',
      'The goalie is square to the puck carrier',
      'The shooting lane to the net is clear',
    ];
    q.ok = 1;
    q.why =
      "The defender isn't charging — he's holding position with his stick in the cross-ice lane. The other three are all true: stick takes the pass, goalie is square to you, shooting lane is clear. Together those three conditions are what make shooting the right read.";
    q.tip = "The defender isn't charging — he's holding position.";
    qualityFixed++;
  }
}

// Q-2v1-003-A9-U13 — same fix.
{
  const q = findById('Q-2v1-003-A9-U13');
  if (q) {
    q.sit = 'Which statement about this image is FALSE?';
    q.opts = [
      "The defender's body is squared and centered — he hasn't committed",
      'The defender is leaning forward and charging the puck carrier',
      'Neither the cross-ice pass nor the shot has a clearly committed defender',
      'There is open ice on both sides of the defender',
    ];
    q.ok = 1;
    q.why =
      "The defender isn't charging — he's reactive, sitting deep with body centered. The other three are true: body squared, neither lane committed, open ice both sides. Together those mean you have to attack and force him to commit before reacting.";
    q.tip = "The defender isn't charging — he's sitting deep, reactive.";
    qualityFixed++;
  }
}

// Q-2v1-004-A14-U13 / 003-A14-U13 / 002-A14-U13 / 001-A14-U13 — tip
// is just "Outcomes lie." (2 words). Lint warns; bump to a fuller
// teaching beat.
const A14_TIP = 'Outcomes lie — judge the read, not the result.';
for (const id of [
  'Q-2v1-001-A14-U13',
  'Q-2v1-002-A14-U13',
  'Q-2v1-003-A14-U13',
  'Q-2v1-004-A14-U13',
]) {
  const q = findById(id);
  if (q && (q.tip || '').trim() === 'Outcomes lie.') {
    q.tip = A14_TIP;
    qualityFixed++;
  }
}

fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(`URLs repointed:    ${urlsFixed}`);
console.log(`Alt text rewrites: ${altsFixed}`);
console.log(`U7 wording flips:  ${wordingFixed}`);
console.log(`Quality fixes:     ${qualityFixed}`);
console.log('Done.');
