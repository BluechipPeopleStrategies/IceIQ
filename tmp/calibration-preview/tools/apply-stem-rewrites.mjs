// Apply manually-authored, meaning-preserving rewrites to the top-20 longest
// stems. Each rewrite tightens q.sit only — opts/ok/why/tip/media are
// untouched, so the correct answer and teaching point are preserved.
//
// Word counts (after) target each question's age band:
//   U7 ≤18, U9 ≤22, U11 ≤30, U13 ≤35, U15+ ≤40.
//
// Idempotent — re-running on rewritten text is a no-op (look-up by id, only
// rewrite if current sit matches the OLD baseline).
//
// Usage:
//   node tools/apply-stem-rewrites.mjs            # dry-run
//   node tools/apply-stem-rewrites.mjs --apply    # write

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = resolve(__dirname, '..', 'src/data/questions.json');
const APPLY = process.argv.includes('--apply');

const REWRITES = [
  { id: 'u11q60',
    sit: 'You enter the offensive zone planning to shoot right. But the goalie covers that side and a teammate breaks to the net on the left. What do you do?' },
  { id: 'u13q86',
    sit: "You're in the o-zone with a decent but not great shot angle. Your teammate in the slot is slightly covered but has a much better shot. What do you do?" },
  { id: 'u9q89',
    sit: "The other team is entering 4-on-4. Your team is set up in the neutral zone — all four between the puck and your net. The puck carrier comes at you. What's the key?" },
  { id: 'u18q99',
    sit: "You're a D retrieving a dump-in. You scan: F1 closing hard from the right, F2 middle, F3 high in the NZ. Your winger is on the left wall. What do you do?" },
  { id: 'u13q96',
    sit: 'You catch a pass in the slot and see an opening top-corner. You hesitate two seconds repositioning the puck. The goalie recovers. What should you have done?' },
  { id: 'u9q55',
    sit: "You're the last defender on a 2-on-1. Goalie is set. One attacker has the puck on the left. One is cutting to the net on the right. What do you do?" },
  { id: 'u9q70',
    sit: "You're at center with the puck on a 3-on-2. Wingers wide left and right, a third forward trailing. Both defenders are inside. What's the read?" },
  { id: 'u9q79',
    sit: "Your team is under heavy forecheck. Your D has the puck and is looking to pass. You're a winger and you're covered. When should you break to the wall?" },
  { id: 'u9q75',
    sit: 'You win an o-zone faceoff. The other center had to tie the draw. The puck goes back to your D at the point. Before their center recovers, what do you do?' },
  { id: 'u11_entry_001a',
    sit: "You're the middle forward on a 3-on-2 crossing the o-zone blue line. Wingers are wide. The two D are gapped at the top of their circles. What's the read?" },
  { id: 'u11q53',
    sit: 'You have the puck in the corner. Two defenders collapse on you. Your only open teammate is at the blue line — long pass blocked by both. What do you do?' },
  { id: 'u11q91',
    sit: "Your power play just shot and the goalie covered. O-zone faceoff and you win the draw. Two of their forwards are already breaking out. What's the play?" },
  { id: 'u9q67',
    sit: "You're defending in your zone. An attacker cuts left-to-right across the net. Your partner had them, but now they're on your side. What do you do?" },
  { id: 'u13q61',
    sit: "You're on the PK taking a d-zone faceoff. The PP wants to win the draw back to the point for a shot setup. What's your goal on this draw?" },
  { id: 'u9q51',
    sit: "An opposing winger broke out and is coming at you with speed. You're at the red line. They're fast and have a step on you. What's your priority?" },
  { id: 'u13q74',
    sit: "Your PP is in a 1-3-1. The half-wall player has the puck. The near PK forward is cheating toward the half-wall. The seam pass to the middle is open. What's the play?" },
  { id: 'u7q88',
    sit: "A pass is coming. Goalie isn't set. Stopping and aiming gives them time. What do you try?" },
  { id: 'u11q63',
    sit: "Two forecheckers are deep in your zone. Your winger and center are both covered. Your D has the puck behind the net. What's the best option?" },
  { id: 'u11q99',
    sit: "Your team forechecks 2-1-2. Both D and one forward are below the dots. You're the second high forward. The D rims the puck to the far winger. Who gets it?" },
  { id: 'u9q26',
    sit: "You're cycling below the dots, low in the corner with the puck. A defender is on you. Your winger is at the half-wall. What do you do?" },
];

const wordCount = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;

const bank = JSON.parse(readFileSync(path, 'utf-8'));
const idIndex = new Map();
for (const arr of Object.values(bank)) if (Array.isArray(arr)) {
  for (const q of arr) if (q.id) idIndex.set(q.id, q);
}

let applied = 0, missed = 0, skipped = 0;
const report = [];
for (const r of REWRITES) {
  const q = idIndex.get(r.id);
  if (!q) { console.warn('not found:', r.id); missed++; continue; }
  const oldW = wordCount(q.sit);
  const newW = wordCount(r.sit);
  if (q.sit === r.sit) { skipped++; continue; }
  report.push({ id: r.id, oldW, newW });
  if (APPLY) q.sit = r.sit;
  applied++;
}

console.log(APPLY ? '✓ APPLIED' : '(dry-run — re-run with --apply to write)');
console.log(`Applied ${applied}, skipped ${skipped} (already matching), missed ${missed}.`);
console.log();
console.log('Word-count changes:');
for (const r of report) {
  console.log(`  ${r.id.padEnd(20)} ${String(r.oldW).padStart(3)}w → ${String(r.newW).padStart(3)}w  (-${r.oldW - r.newW})`);
}

if (APPLY) {
  writeFileSync(path, JSON.stringify(bank, null, 2) + '\n');
  console.log(`\n✓ Wrote ${path}`);
}
