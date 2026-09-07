import { questionActorWarnings, positionSubjectIssue, questionContentHash } from './validation/tools/question-batch-core.mjs';
import { isCoachRoutePoint } from './validation/src/one-on-one/coachRouteSurfaceInput.js';
import fs from 'node:fs';

const p = JSON.parse(fs.readFileSync('./packets/packet-32.json', 'utf8'));
const s = p.scenarios.find(x => x.id === 'exp26-u15-010');

for (const q of s.questions) {
  const warnings = questionActorWarnings(s, q);
  const posIssue = positionSubjectIssue(s, q);
  if (warnings.length) console.log('WARN', q.id, warnings);
  if (posIssue) console.log('POS-ISSUE', q.id, posIssue);
}

// Check carried puck on ice for position questions using stated formula (approx, since makeScene not easily importable standalone here)
function carriedPuck(actor, point) {
  const facing = actor.facing;
  return {
    x: point.x + Math.cos(facing) - 0.7*Math.sin(facing),
    y: point.y + Math.sin(facing) + 0.7*Math.cos(facing),
  };
}
const you = s.setup.actors.find(a=>a.id==='home-skater-1');
for (const q of s.questions) {
  if (q.type === 'position') {
    const puck = carriedPuck(you, q.reference);
    console.log(q.id, 'reference', q.reference, 'carriedPuck', puck, 'onIce', isCoachRoutePoint(puck));
  }
}
console.log('done');
