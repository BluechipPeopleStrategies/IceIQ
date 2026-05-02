// Wires up Batch A scenes: IMG-eyesup-001 (regenerated), IMG-eyesup-002,
// IMG-pp-001, IMG-stance-001.
//
// - Repoints Q-eyesup-001 / Q-eyesup-002 / Q-pp-001 to the new IMG-*.png URLs.
// - Assigns IMG-eyesup-001 to u7-eyes-up-001 + u7-puck-control-001 (they
//   were using rink-only backdrops; same eyes-up scene fits all three).
// - Adds imageId IMG-stance-001 to u7-skating-posture-001 + repoints URL.
// - Refreshes alt text on all touched questions to match the new scene.
//
// Idempotent — re-running is a no-op once everything is wired.

import fs from 'node:fs';

const QUESTIONS_PATH = 'src/data/questions.json';
const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));

const ALT = {
  'IMG-eyesup-001':
    "Black puck-carrier skating through the neutral zone with his head UP, eyes scanning the ice ahead at his two black teammates. The carrier is looking at the play developing, not down at the puck on his stick.",
  'IMG-eyesup-002':
    "Black skater mid-stride carrying the puck, head turned over his shoulder doing a shoulder check on a yellow defender chasing 12-15 feet behind. Active scanning — head on a swivel.",
  'IMG-pp-001':
    "Black puck-protector pinned against the offensive-zone wall, back to a yellow defender, knees bent low, puck shielded on the wall side of his body. Body, not stick, does the work.",
  'IMG-stance-001':
    "Black center down in textbook athletic stance at a center-ice faceoff dot — knees bent, hips low, stick flat on the ice, chest up, head up, eyes on the dot. Yellow center mirrors the stance across the dot.",
};

// Question -> { imageId, url, alt } target state.
const PATCHES = {
  // Existing Q-eyesup-001 — was lowercase img-eyesup-001.png; relink to
  // the regenerated v2.6 PNG.
  'Q-eyesup-001-A1-U7': { imageId: 'IMG-eyesup-001', url: '/assets/images/IMG-eyesup-001.png', alt: ALT['IMG-eyesup-001'] },
  // u7-* questions previously rendered on rink-fullrink-defense / rink-fullrink
  // backdrops with no imageId; both teach eyes-up while carrying — share the
  // same scene.
  'u7-eyes-up-001':       { imageId: 'IMG-eyesup-001', url: '/assets/images/IMG-eyesup-001.png', alt: ALT['IMG-eyesup-001'] },
  'u7-puck-control-001':  { imageId: 'IMG-eyesup-001', url: '/assets/images/IMG-eyesup-001.png', alt: ALT['IMG-eyesup-001'] },
  // Eyesup-002 — was placeholder, now the shoulder-check scene.
  'Q-eyesup-002-A1-U9':   { imageId: 'IMG-eyesup-002', url: '/assets/images/IMG-eyesup-002.png', alt: ALT['IMG-eyesup-002'] },
  // Puck protection — was placeholder.
  'Q-pp-001-A1-U9':       { imageId: 'IMG-pp-001',     url: '/assets/images/IMG-pp-001.png',     alt: ALT['IMG-pp-001'] },
  // Athletic stance — new imageId binding (was rink-faceoff-circle.png backdrop only).
  'u7-skating-posture-001': { imageId: 'IMG-stance-001', url: '/assets/images/IMG-stance-001.png', alt: ALT['IMG-stance-001'] },
};

let urlsFixed = 0;
let altsFixed = 0;
let imageIdsFixed = 0;

for (const ageArr of Object.values(data)) {
  for (const q of ageArr) {
    const patch = PATCHES[q.id];
    if (!patch) continue;

    if (q.imageId !== patch.imageId) {
      q.imageId = patch.imageId;
      imageIdsFixed++;
    }

    if (!q.media || typeof q.media !== 'object') q.media = { type: 'image' };
    if (q.media.url !== patch.url) {
      q.media.url = patch.url;
      urlsFixed++;
    }
    if (q.media.type !== 'image') q.media.type = 'image';
    if (q.media.alt !== patch.alt) {
      q.media.alt = patch.alt;
      altsFixed++;
    }
  }
}

fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(`URLs repointed:    ${urlsFixed}`);
console.log(`Alt rewrites:      ${altsFixed}`);
console.log(`imageIds assigned: ${imageIdsFixed}`);
console.log('Done.');
