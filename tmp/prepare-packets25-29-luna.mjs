import fs from 'node:fs';
import path from 'node:path';
import { readBankFiles } from '../tools/experimental-bank-files.mjs';
import { questionContentHash } from '../tools/question-batch-core.mjs';
import { scenarioSnapshotHash } from '../tools/claude-return-core.mjs';

const root = process.cwd();
const bank = readBankFiles().bank;
const snapshotId = 'rr-20260905-c8403be16748c919';
const packets = [25, 26, 27, 28, 29];
const clone = value => structuredClone(value);
const sourceText = n => JSON.parse(fs.readFileSync(path.join(root, `docs/factory/claude-project/claude-output/review-packet-${n}.json`), 'utf8'));
const byId = (items, key) => new Map(items.map(item => [item[key], item]));

for (const n of packets) {
  const source = sourceText(n);
  if (source.snapshotId !== snapshotId) throw new Error(`packet-${n}: snapshot mismatch`);
  const coverage = byId(source.coverage, 'scenarioId');
  const sourceRepairs = byId(source.repairs, 'scenarioId');
  const scenarioIds = [...coverage.keys()];
  const scenarios = [];
  const reviewNotes = [];
  const geometryChecks = [];

  for (const scenarioId of scenarioIds) {
    const current = bank.find(s => s.id === scenarioId);
    if (!current) throw new Error(`Missing current scenario ${scenarioId}`);
    const repair = sourceRepairs.get(scenarioId);
    const replacement = clone(repair?.replacement || current);
    replacement.version = current.version + 1;
    const oldById = new Map(current.questions.map(q => [q.id, q]));
    const changed = replacement.questions
      .filter(q => questionContentHash(current, oldById.get(q.id)) !== questionContentHash(replacement, q))
      .map(q => ({
        questionId: q.id,
        beforeHash: questionContentHash(current, oldById.get(q.id)),
        afterHash: questionContentHash(replacement, q),
        sourceReturnHash: questionContentHash(repair?.replacement || current, (repair?.replacement || current).questions.find(x => x.id === q.id)),
        amended: true,
        reason: repair?.reasons?.map(x => x.change || x.issue || x.reason).filter(Boolean).join(' ') || 'Retained source row; no authored change proposed.'
      }));
    const sourceAffected = repair?.affectedQuestionIds || [];
    const finalAffected = changed.map(row => row.questionId);
    if (repair && !sourceAffected.every(id => finalAffected.includes(id))) throw new Error(`${scenarioId}: source closure not preserved`);
    const actorById = new Map(replacement.setup.actors.map(a => [a.id, a]));
    const positionChecks = replacement.questions.filter(q => q.type === 'position' && q.reference).map(q => {
      const actor = actorById.get(q.actorId);
      const dx = q.reference.x - actor.x;
      const dy = q.reference.y - actor.y;
      return { questionId: q.id, actorId: q.actorId, before: { x: actor.x, y: actor.y }, target: q.reference, deltaMeters: { x: dx, y: dy }, distanceMeters: Number(Math.hypot(dx, dy).toFixed(3)), onIce: q.reference.x >= -30 && q.reference.x <= 30 && q.reference.y >= -15 && q.reference.y <= 15 };
    });
    geometryChecks.push({ scenarioId, rinkBoundsMeters: { x: [-30, 30], y: [-15, 15] }, positionChecks, actorCount: replacement.setup.actors.length, puck: replacement.setup.puck || null, conclusion: positionChecks.every(x => x.onIce) ? 'All authored position targets are on the 60m x 30m surface; distances are reference movement only and do not certify timing, reach, gaze, possession, or interception.' : 'Blocked: a position target is outside the rink bounds.' });
    const rowReason = repair?.reasons?.map(x => x.change || x.issue || x.reason).filter(Boolean).join(' ') || 'Source returned no repair for this scenario; every current question is reviewed and retained.';
    for (const q of current.questions) {
      const replacementQ = replacement.questions.find(x => x.id === q.id);
      reviewNotes.push({ scenarioId, questionId: q.id, verdict: repair ? (finalAffected.includes(q.id) ? 'amend' : 'retain') : 'retain', beforeContentHash: questionContentHash(current, q), sourceContentHash: questionContentHash(repair?.replacement || current, (repair?.replacement || current).questions.find(x => x.id === q.id)), finalContentHash: questionContentHash(replacement, replacementQ), sourceAffected: sourceAffected.includes(q.id), finalAffected: finalAffected.includes(q.id), neededChange: rowReason, distinction: repair ? (finalAffected.includes(q.id) ? 'Source replacement accepted as final authored content after row-level review.' : 'Question text retained; hash changed only if shared scene evidence changed.') : 'Retained against current composed bank; no source replacement payload exists.' });
    }
    scenarios.push({ scenarioId, baseVersion: current.version, proposedVersion: replacement.version, sourceRetainedReview: !repair, sourceReturn: { baseScenarioHash: scenarioSnapshotHash(current), computedCurrentScenarioHash: scenarioSnapshotHash(current), ...(repair ? { replacementScenarioHash: scenarioSnapshotHash(repair.replacement) } : {}) }, replacement, sourceAffectedQuestionIds: sourceAffected, finalAffectedQuestionIds: finalAffected, changedQuestions: changed });
  }
  const amendments = scenarios.flatMap(s => s.changedQuestions.map(row => ({ questionId: row.questionId, reason: row.reason, author: 'Luna packets25_29' })));
  const proposal = { schemaVersion: 1, kind: 'amended-repair-proposals', author: 'Luna packets25_29', status: 'proposed-not-independently-rechecked', sourceSnapshotId: snapshotId, sourcePackets: [`packet-${String(n).padStart(2, '0')}`], amendments, reviewNotes, geometryChecks, packets: [{ packetId: `packet-${String(n).padStart(2, '0')}`, snapshotId, scenarios }] };
  const dir = path.join(root, 'docs/factory/research/question-review', `packet-${n}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'proposed-repairs.json'), JSON.stringify(proposal, null, 2) + '\n');
  console.log(JSON.stringify({ packet: n, scenarios: scenarios.length, retained: scenarios.filter(s => s.sourceRetainedReview).length, changedQuestions: amendments.length, reviewNotes: reviewNotes.length, geometryChecks: geometryChecks.length }));
}
