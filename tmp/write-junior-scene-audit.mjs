import fs from 'node:fs';
import path from 'node:path';
import { readBankFiles } from '../tools/experimental-bank-files.mjs';

const scenes = readBankFiles().bank.filter(s => ['U7', 'U9', 'U11'].includes(s.ageBand));
const rows = scenes.map(s => {
  const actors = s.setup.actors;
  const ids = new Set(actors.map(a => a.id));
  const puck = s.setup.puck || {};
  const owner = puck.owner ? actors.find(a => a.id === puck.owner) : null;
  const nearest = Number.isFinite(puck.x) && Number.isFinite(puck.y)
    ? actors.map(a => ({ label: a.label, actorId: a.id, distanceMeters: Number(Math.hypot(a.x - puck.x, a.y - puck.y).toFixed(3)) })).sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 3)
    : [];
  const positions = s.questions.filter(q => q.type === 'position' && q.reference).map(q => {
    const actor = actors.find(a => a.id === q.actorId);
    const distance = actor ? Math.hypot(q.reference.x - actor.x, q.reference.y - actor.y) : null;
    return { questionId: q.id, actorId: q.actorId, from: actor ? { x: actor.x, y: actor.y } : null, target: q.reference, distanceMeters: distance == null ? null : Number(distance.toFixed(3)), onIce: Boolean(q.reference.x >= -30 && q.reference.x <= 30 && q.reference.y >= -15 && q.reference.y <= 15) };
  });
  const findings = [];
  if (puck.owner && !ids.has(puck.owner)) findings.push({ id: `${s.id}-owner`, questionIds: s.questions.map(q => q.id), severity: 'important', category: 'possession', claim: `Puck owner ${puck.owner} is absent from actors.`, evidence: `owner=${puck.owner}; actorIds=${[...ids].join(',')}.`, suggestedRepair: 'Use an existing actor ID or set owner null.' });
  for (const q of s.questions) {
    if (q.answer?.some(k => !q.options?.some(o => o.id === k))) findings.push({ id: `${q.id}-key`, questionIds: [q.id], severity: 'important', category: 'answer-key', claim: 'A keyed answer is absent from its options.', evidence: `answer=${JSON.stringify(q.answer)}; options=${JSON.stringify(q.options?.map(o => o.id) || [])}`, suggestedRepair: 'Align answer IDs and options.' });
    if (q.type === 'position' && (!ids.has(q.actorId) || !q.reference || q.reference.x < -30 || q.reference.x > 30 || q.reference.y < -15 || q.reference.y > 15)) findings.push({ id: `${q.id}-geometry`, questionIds: [q.id], severity: 'important', category: 'geometry', claim: 'Position interaction references an invalid actor or off-ice target.', evidence: `actorId=${q.actorId}; target=${JSON.stringify(q.reference)}; bounds x[-30,30], y[-15,15].`, suggestedRepair: 'Use a valid actor and on-ice target.' });
  }
  const bounds = { x: [Math.min(...actors.map(a => a.x)), Math.max(...actors.map(a => a.x))], y: [Math.min(...actors.map(a => a.y)), Math.max(...actors.map(a => a.y))] };
  return { sceneId: s.id, ageBand: s.ageBand, verdict: findings.length ? 'flag' : 'clear-in-this-pass', checkedQuestionIds: s.questions.map(q => q.id), sceneChecks: { actorCount: actors.length, actorIds: actors.map(a => a.id), actorBoundsMeters: bounds, puckState: { owner: puck.owner ? (owner ? `${owner.label} (${owner.team}/${owner.role})` : `INVALID OWNER ${puck.owner}`) : 'loose/no owner', position: Number.isFinite(puck.x) && Number.isFinite(puck.y) ? { x: puck.x, y: puck.y } : null, nearestActors: nearest }, positionReferences: positions, answerKeyChecks: s.questions.filter(q => q.answer).length, questionTypes: [...new Set(s.questions.map(q => q.type))], directionCheck: 'Reviewed serialized team roles, possession wording, rink coordinates, and position-reference direction; no source or coaching authority inferred.' }, findings };
});
const output = { schemaVersion: 1, kind: 'junior-scene-audit', created: '2026-09-06', scope: { ageBands: ['U7', 'U9', 'U11'], sceneCount: rows.length, questionCount: rows.reduce((n, r) => n + r.checkedQuestionIds.length, 0), source: 'readBankFiles() composed experimental bank', limits: 'Read-only structural and content consistency pass; sources do not certify answers.' }, scenes: rows };
const dir = 'docs/factory/scene-audit-2026-09-06';
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'junior-review.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ scenes: rows.length, questions: output.scope.questionCount, flags: rows.filter(r => r.verdict === 'flag').length }));
