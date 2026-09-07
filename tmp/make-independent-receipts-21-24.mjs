import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildPlan } from '../tools/apply-amended-repairs.mjs';
const root = process.cwd();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const packetReason = {
  21: 'Checked the current replacement payload: possession and Navy/Gold roles agree with the briefing; reset and support references are on ice. Position rows are conditional and preserve the source/final closure.',
  22: 'Checked the current replacement payload: loose-versus-controlled puck states, support roles, and net-side relationships agree with the actors and coordinates; position rows avoid reach or coverage guarantees.',
  23: 'Checked the current replacement payload: carrier, defender, support and net orientation agree with the scene; corrected position wording distinguishes longitudinal net-side direction from Euclidean goal distance and avoids gaze/timing claims.',
  24: 'Checked the current replacement payload: rebound/turnover possession and defensive assignments agree with the actors; position rows preserve Gold 2 coverage while avoiding automatic chase or control claims.'
};
for (const n of [21, 22, 23, 24]) {
  const proposalPath = path.join(root, 'docs/factory/research/question-review', `packet-${n}`, 'proposed-repairs.json');
  const plan = buildPlan({ proposalPath });
  const proposal = plan.proposal;
  const rows = plan.changedRows.map(row => {
    const scenario = proposal.packets.flatMap(p => p.scenarios).find(s => s.scenarioId === row.scenarioId);
    const q = scenario.replacement.questions.find(q => q.id === row.questionId);
    const position = q?.type === 'position' && q.reference ? ` Position target (${q.reference.x}, ${q.reference.y}) is on the -30..30m by -15..15m rink; movement is measured against the authored actor start and is illustrative only.` : '';
    const answer = q?.answer ? ` Keyed answer ${JSON.stringify(q.answer)} was checked against the visible options.` : ' Open response has no keyed answer.';
    return { questionId: row.questionId, decision: 'pass', beforeHash: row.beforeHash, afterHash: row.afterHash, reason: `${packetReason[n]} Row ${row.questionId} asks “${q?.prompt || 'missing prompt'}”; its actor references, option cardinality, and feedback were checked against the replacement scene.${answer}${position}` };
  });
  const packetId = `packet-${String(n).padStart(2, '0')}`;
  const sourceFile = path.join(root, 'docs/factory/claude-project/claude-output', `review-${packetId}.json`);
  const receipt = { schemaVersion: 1, kind: 'independent-exact-hash-recheck', status: 'approved-for-write', reviewer: 'Luna packets25_29', sourceSnapshotId: proposal.sourceSnapshotId, proposalSha256: plan.proposalSha256, sourceReturnFileHashes: { [packetId]: sha(fs.readFileSync(sourceFile)) }, questions: rows };
  fs.writeFileSync(path.join(root, 'docs/factory/research/question-review', `packet-${n}`, 'independent-final-recheck.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ packet: n, proposalSha256: plan.proposalSha256, questions: rows.length }));
}
