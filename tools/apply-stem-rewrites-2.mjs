// Batch 2: tighten the remaining 43 stems flagged by tools/flag-stem-length.mjs
// after the first 20 rewrites in apply-stem-rewrites.mjs landed.
//
// Same contract: rewrite q.sit only, preserve meaning + correct option.
// Idempotent — only rewrites if current sit doesn't already match the new text.
//
// Usage:
//   node tools/apply-stem-rewrites-2.mjs            # dry-run
//   node tools/apply-stem-rewrites-2.mjs --apply    # write

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = resolve(__dirname, '..', 'src/data/questions.json');
const APPLY = process.argv.includes('--apply');

const REWRITES = [
  { id: 'u9q31',
    sit: "Your D partner went behind the net for the puck. A forward is crashing the net uncovered. What do you do?" },
  { id: 'u11q78',
    sit: "You're the D at the point. The opposing center is breaking toward your blue line for a counter. Your team still has the puck. What do you do?" },
  { id: 'u7-oz-entry-001',
    sit: "Crossing the blue line with the puck. Two defenders right in front. No teammates with you yet." },
  { id: 'u7q16',
    sit: "Your teammate has the puck in the o-zone corner. You're at center ice. Where should you skate?" },
  { id: 'u9g5',
    sit: "An opponent is screening you in front, blocking your view of a point shot. The shot is coming. What do you do?" },
  { id: 'u11q53',
    sit: "You have the puck in the corner. Two defenders collapse. Your only open teammate is at the blue line, but the long pass is blocked. What do you do?" },
  { id: 'u11q85',
    sit: "Goalie makes a save and controls the puck. Three forecheckers are in your zone. Your wingers are pinned. What's the right breakout?" },
  { id: 'u9q30',
    sit: "You have the puck in your zone, pressured. Your teammate is breaking into the neutral zone — 40 feet away but wide open. What's the read?" },
  { id: 'u9q83',
    sit: "Your PP is entering the o-zone. Two penalty killers are set at their blue line. How should your team attack?" },
  { id: 'u9q90',
    sit: "You just won a neutral-zone faceoff. The puck goes back to your D. You're the center. What now?" },
  { id: 'u7q36',
    sit: "Your team is on a rush with more players than the other team. Where should you be on the ice?" },
  { id: 'u9q2',
    sit: "You just turned the puck over in the o-zone. The other team is skating away. You're the nearest forward. First move?" },
  { id: 'u9-dz-coverage-001',
    sit: "Defending. Their forward has the puck in the corner. Another forward is parked in front of your net. Who do you cover?" },
  { id: 'u7q73',
    sit: "An attacker is skating around you to the net. What do you keep between them and the net?" },
  { id: 'u7q32',
    sit: "Your teammate is in a battle for the puck, getting pushed around. You're nearby without the puck. How can you help?" },
  { id: 'u9q13',
    sit: "Goalie makes a save and has the puck. Forecheckers are coming. Your winger breaks back. What should the goalie do?" },
  { id: 'u9q35',
    sit: "Turnover in the NZ. The other team has a 2-on-2 toward your net. You're one of the two D. Your priority?" },
  { id: 'u9q96',
    sit: "Your PK clears the puck deep into their zone. You're first over their blue line. What do you do?" },
  { id: 'u7g7',
    sit: "A player attacks from a bad angle — almost behind the net. What do you do?" },
  { id: 'u7-decision-making-001',
    sit: "Puck on the boards. Two opponents are closing. Your teammate is open in the middle, calling for it." },
  { id: 'u7q37',
    sit: "You're wide open in the o-zone. Your teammate has the puck but hasn't seen you. What do you do?" },
  { id: 'u7q61',
    sit: "You accidentally passed it to the other team and they scored. Your teammates are looking at you. What now?" },
  { id: 'u7q35',
    sit: "An opponent is about to shoot. You're between them and the net. What could you try?" },
  { id: 'u7q44',
    sit: "A teammate shoots from far. You're right in front of the goalie. What could you try?" },
  { id: 'u9g14',
    sit: "You're down and out of position. The shooter has an open net. You can't get up in time. What do you do?" },
  { id: 'u7-decision-making-002',
    sit: "Puck in front of their net. The goalie is way out of position. What do you do?" },
  { id: 'u9q18',
    sit: "You just won the puck in your zone. Their forecheckers are still deep. What do you do?" },
  { id: 'u7q21',
    sit: "Puck in your corner. You're the D in front of the net. What do you do?" },
  { id: 'u7q66',
    sit: "You have the puck in the o-zone. Should you shoot or pass? What's most important to think about?" },
  { id: 'u7q23',
    sit: "Your teammate has the puck in the o-zone. Three opponents are crowded around them. What should you do?" },
  { id: 'u7q48',
    sit: "Your team has a 2-on-1. Your teammate has the puck, you don't. What should you do?" },
  { id: 'u7q14',
    sit: "Your team shot, goalie caught it. The other team is starting a breakout. What do you do?" },
  { id: 'u7q28',
    sit: "Defending your zone. Puck is in the corner far from you. Should you just watch the puck?" },
  { id: 'u7-reading-play-001',
    sit: "Your teammate has the puck and looked at you. You're standing in open ice. What's about to happen?" },
  { id: 'u7-puck-control-001',
    sit: "You're skating up the ice with the puck, eyes looking straight down. What's the problem with that?" },
  { id: 'u7q27',
    sit: "You shoot. The goalie doesn't catch it — the puck bounces off them. What do you do?" },
  { id: 'u7-reading-play-002',
    sit: "They're rushing into your zone. Your D is the only one back. What should YOU do?" },
  { id: 'u9-goalie-angle-001',
    sit: "A shooter comes down the wing. The goalie is hiding deep in the net. Where should the goalie be?" },
  { id: 'u7q33',
    sit: "You're shooting. The goalie is standing in the middle. Where's the best place to aim?" },
  { id: 'u7g6',
    sit: "An opponent is screening you right in front of the net, blocking your view. What do you do?" },
  { id: 'u7q38',
    sit: "Your teammate is shooting from the blue line. You're the nearest forward. What should you do?" },
  { id: 'u7-breakout-001',
    sit: "Your D #7 has the puck behind the net, looking at you. You're #14. What do you do?" },
  { id: 'u7-stick-position-001',
    sit: "You're playing D. They're skating at you with the puck. Where should your stick be?" },
];

const wordCount = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;

const TARGETS = { U7: 18, U9: 22, U11: 30, U13: 35, U15: 40, U18: 40 };
const ORDER = ['U7','U9','U11','U13','U15','U18'];

const bank = JSON.parse(readFileSync(path, 'utf-8'));
const idIndex = new Map();
const ageOf = new Map();
for (const [age, arr] of Object.entries(bank)) if (Array.isArray(arr)) {
  for (const q of arr) if (q.id) {
    idIndex.set(q.id, q);
    ageOf.set(q.id, age.split(' ')[0]);
  }
}

function targetFor(q, fallbackAge) {
  const levels = Array.isArray(q.levels) && q.levels.length ? q.levels : [fallbackAge];
  const shorts = levels.map(L => (L||'').split(' ')[0]).filter(s => TARGETS[s]);
  const youngest = shorts.sort((a,b)=>ORDER.indexOf(a)-ORDER.indexOf(b))[0];
  return TARGETS[youngest] || TARGETS.U18;
}

let applied = 0, skipped = 0, missed = 0, overTarget = [];
const report = [];
for (const r of REWRITES) {
  const q = idIndex.get(r.id);
  if (!q) { console.warn('not found:', r.id); missed++; continue; }
  const oldW = wordCount(q.sit);
  const newW = wordCount(r.sit);
  const max = targetFor(q, ageOf.get(r.id));
  if (newW > max) overTarget.push({ id: r.id, newW, max });
  if (q.sit === r.sit) { skipped++; continue; }
  report.push({ id: r.id, oldW, newW, max });
  if (APPLY) q.sit = r.sit;
  applied++;
}

console.log(APPLY ? '✓ APPLIED' : '(dry-run — re-run with --apply to write)');
console.log(`Applied ${applied}, skipped ${skipped} (already matching), missed ${missed}.`);
if (overTarget.length) {
  console.log(`\n⚠ ${overTarget.length} rewrites still over band:`);
  overTarget.forEach(e => console.log(`  ${e.id} ${e.newW}w (>${e.max})`));
}
console.log('\nWord-count changes:');
for (const r of report) {
  console.log(`  ${r.id.padEnd(28)} ${String(r.oldW).padStart(3)}w → ${String(r.newW).padStart(3)}w  (target ≤${r.max})`);
}

if (APPLY) {
  writeFileSync(path, JSON.stringify(bank, null, 2) + '\n');
  console.log(`\n✓ Wrote ${path}`);
}
