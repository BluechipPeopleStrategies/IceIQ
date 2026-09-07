import assert from 'node:assert/strict';
import {questionContentHash} from './question-batch-core.mjs';
import {validateExperimentalBank} from '../src/one-on-one/experimentalBankCore.js';

// Pure preparation: every identity and the entire resulting bank pass before callers write.
// A recorded AI review is an input, not a claim of human coaching certification.
export function prepareReviewedRepairs(bank, changes, adjudications) {
  assert(changes.length > 0, 'No repairs selected');
  assert.equal(new Set(changes.map(c=>c.questionId)).size, changes.length, 'Duplicate repair');
  const next = structuredClone(bank);
  const versions = new Map();
  for (const c of changes) {
    const s = bank.find(s=>s.id===c.scenarioId);
    assert(s, `Unknown scenario ${c.scenarioId}`);
    const q = s.questions.find(q=>q.id===c.questionId);
    assert(q, `Unknown question ${c.questionId}`);
    assert.equal(s.version,c.fromVersion,'Stale scenario version');
    assert.equal(c.toVersion,c.fromVersion+1,'Repair must increment version once');
    assert.equal(questionContentHash(s,q),c.beforeHash,'Stale source hash');
    assert.deepEqual(q,c.before,'Before payload differs');
    assert.equal(c.after.id,q.id,'Question ID changed');
    assert.equal(c.after.type,q.type,'Question type changed');
    assert.equal(questionContentHash(s,c.after),c.afterHash,'After payload hash differs');
    const reviews = adjudications.filter(r=>r.questionId===q.id && r.afterHash===c.afterHash);
    assert(reviews.some(r=>r.role==='independent' && r.verdict==='approve'),`Independent clearance missing: ${q.id}`);
    assert(reviews.some(r=>r.role==='root' && r.verdict==='approve'),`Root clearance missing: ${q.id}`);
    assert(!reviews.some(r=>r.verdict!=='approve'),`Unresolved review: ${q.id}`);
    const independent=reviews.find(r=>r.role==='independent');
    const root=reviews.find(r=>r.role==='root');
    assert(typeof independent.reviewerId==='string' && independent.reviewerId.trim(), 'Independent reviewer identity missing');
    assert(typeof root.reviewerId==='string' && root.reviewerId.trim(), 'Root reviewer identity missing');
    assert.notEqual(independent.reviewerId,root.reviewerId,'Reviewers must be distinct');
    if(versions.has(s.id)) assert.equal(versions.get(s.id),c.toVersion,'Conflicting version');
    versions.set(s.id,c.toVersion);
    const target = next.find(n=>n.id===s.id);
    target.questions=target.questions.map(old=>old.id===q.id?structuredClone(c.after):old);
    target.version=c.toVersion;
  }
  assert.deepEqual(validateExperimentalBank(next),[],'Resulting bank invalid');
  return next;
}
