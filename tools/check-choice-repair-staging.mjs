import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readBankFiles } from './experimental-bank-files.mjs';
import { questionContentHash } from './question-batch-core.mjs';
import { validateExperimentalBank } from '../src/one-on-one/experimentalBankCore.js';

const root = process.cwd();
const adjudicationPath = path.join(root, 'docs/factory/coaching-panel/choice-quality-remaining-04/root-adjudication.json');
const candidateRoot = path.join(root, 'docs/factory/coaching-panel/choice-repairs-60');

const clone = value => structuredClone(value);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const jsonRead = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sceneKey = (scenarioId, questionId) => `${scenarioId}::${questionId}`;

export function validateFrozenBytes(rawBytes, freeze) {
  if (!freeze || typeof freeze.candidateSha256 !== 'string') return { ok: false, error: 'missing FREEZE.json candidateSha256' };
  const actual = sha(rawBytes);
  return actual === freeze.candidateSha256 ? { ok: true, actual } : { ok: false, actual, error: 'FREEZE.json candidateSha256 mismatch' };
}

export function selectLatestRevisions(files) {
  const entries = files.map(file => {
    const match = path.basename(path.dirname(file)).match(/^packet-(\d+)-r(\d+)$/i);
    return match ? { file, packet: match[1], revision: Number(match[2]) } : null;
  }).filter(Boolean);
  const latest = new Map();
  for (const entry of entries) latest.set(entry.packet, Math.max(latest.get(entry.packet) ?? 0, entry.revision));
  return entries.map(entry => ({ ...entry, historical: entry.revision < latest.get(entry.packet) }));
}

function candidateFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = folder => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/^candidates\.json$/i.test(entry.name)) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

function extractCandidates(document) {
  if (Array.isArray(document)) return document;
  if (Array.isArray(document.changes)) return document.changes;
  if (Array.isArray(document.candidates)) return document.candidates;
  throw new Error('Candidate file must be an array, or contain changes/candidates array');
}

function sceneSnapshots(change) {
  return {
    before: change.beforeScene ?? change.sceneBefore ?? change.beforeScenario,
    after: change.afterScene ?? change.sceneAfter ?? change.afterScenario,
  };
}

function sameExcept(a, b, excluded) {
  const left = clone(a), right = clone(b);
  for (const key of excluded) { delete left[key]; delete right[key]; }
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateStagedChange({ change, expected, currentScene }) {
  const errors = [];
  const { before, after } = sceneSnapshots(change);
  if (!before || !after) errors.push('missing beforeScene/afterScene snapshots');
  for (const field of ['scenarioId', 'questionId', 'fromVersion', 'toVersion', 'beforeHash', 'afterHash']) {
    if (!(field in change)) errors.push(`missing ${field}`);
  }
  if (change.scenarioId !== expected.scenarioId || change.questionId !== expected.questionId) errors.push('candidate identity is outside the authorized row');
  if (change.fromVersion !== expected.scenarioVersion || change.beforeHash !== expected.contentHash) errors.push('candidate before version/hash differs from root authorization');
  if (change.toVersion !== change.fromVersion + 1) errors.push('toVersion must increment exactly once');
  if (before && after) {
    if (before.id !== expected.scenarioId || after.id !== expected.scenarioId) errors.push('scene snapshot ID mismatch');
    if (before.version !== change.fromVersion || after.version !== change.toVersion) errors.push('scene snapshot version mismatch');
    if (!sameExcept(before, after, ['version', 'questions'])) errors.push('scene metadata changed outside version/questions');
    const beforeQuestion = before.questions?.find(q => q.id === expected.questionId);
    const afterQuestion = after.questions?.find(q => q.id === expected.questionId);
    if (!beforeQuestion || !afterQuestion) errors.push('target question missing from scene snapshots');
    if (beforeQuestion && questionContentHash(before, beforeQuestion) !== change.beforeHash) errors.push('before snapshot question hash mismatch');
    if (afterQuestion && questionContentHash(after, afterQuestion) !== change.afterHash) errors.push('after snapshot question hash mismatch');
    if (afterQuestion && (afterQuestion.id !== beforeQuestion?.id || afterQuestion.type !== beforeQuestion?.type)) errors.push('question ID/type changed');
  }
  const current = currentScene?.questions?.find(q => q.id === expected.questionId);
  if (!currentScene || !current) errors.push('current target scene/question missing');
  else if (currentScene.version === change.fromVersion) {
    if (questionContentHash(currentScene, current) !== expected.contentHash) errors.push('current before hash is stale');
    if (JSON.stringify(current) !== JSON.stringify(change.before)) errors.push('candidate before payload differs from current bank');
  }
  return { ok: errors.length === 0, errors };
}

export function reviewHeld(change) {
  const independent = (change.independentReviews || []).find(r => r?.verdict === 'approve' && r?.contentHash === change.afterHash && typeof r.reviewer === 'string' && r.reviewer.trim());
  const rootReview = (change.rootReviews || []).find(r => r?.verdict === 'approve' && r?.contentHash === change.afterHash && typeof r.reviewer === 'string' && r.reviewer.trim());
  return !independent || !rootReview || independent.reviewer === rootReview.reviewer;
}

export function exactApplication({ candidate, currentScene, receipt }) {
  const currentQuestion = currentScene?.questions?.find(q => q.id === candidate?.questionId);
  const receiptChange = receipt?.changes?.find(change =>
    change?.scenarioId === candidate?.scenarioId &&
    change?.questionId === candidate?.questionId &&
    change?.fromVersion === candidate?.fromVersion &&
    change?.toVersion === candidate?.toVersion &&
    change?.afterHash === candidate?.afterHash
  );
  return Boolean(
    receiptChange &&
    currentScene?.version === candidate?.toVersion &&
    currentQuestion &&
    questionContentHash(currentScene, currentQuestion) === candidate.afterHash &&
    candidate?.afterScene &&
    JSON.stringify(currentScene) === JSON.stringify(candidate.afterScene)
  );
}

export function composeSceneCandidates(currentScene, candidates) {
  if (!currentScene || !candidates.length) return { scene: null, errors: ['missing scene/candidates'] };
  const errors = [];
  const versions = new Set(candidates.map(c => c.toVersion));
  const fromVersions = new Set(candidates.map(c => c.fromVersion));
  if (versions.size !== 1 || fromVersions.size !== 1) errors.push('same-scene candidates must share from/to versions');
  const composed = clone(currentScene);
  composed.version = candidates[0].toVersion;
  for (const candidate of candidates) {
    const { after } = sceneSnapshots(candidate);
    const afterQuestion = after?.questions?.find(q => q.id === candidate.questionId);
    if (!afterQuestion) { errors.push(`${candidate.questionId}: missing after question`); continue; }
    if (!sameExcept(after, currentScene, ['version', 'questions'])) errors.push(`${candidate.questionId}: scene metadata changed`);
    composed.questions = composed.questions.map(q => q.id === candidate.questionId ? clone(afterQuestion) : q);
  }
  for (const candidate of candidates) {
    const { after } = sceneSnapshots(candidate);
    if (after && JSON.stringify(after.questions?.map(q => q.id)) !== JSON.stringify(composed.questions.map(q => q.id))) errors.push(`${candidate.questionId}: question roster changed`);
  }
  return { scene: errors.length ? null : composed, errors };
}

export function checkChoiceRepairStaging({ bank, authorization, candidateDocuments = [] } = {}) {
  const expectedRows = (authorization.rows || []).filter(r => r.verdict === 'revise');
  const expected = new Map(expectedRows.map(r => [sceneKey(r.scenarioId, r.questionId), r]));
  const currentById = new Map(bank.map(s => [s.id, s]));
  const changes = new Map(), fileErrors = [];
  const authorizationQuestionIds = new Set();
  for (const row of expectedRows) {
    if (authorizationQuestionIds.has(row.questionId)) fileErrors.push(`authorization duplicate questionId across packets: ${row.questionId}`);
    authorizationQuestionIds.add(row.questionId);
  }
  const historicalRevisions = [];
  for (const item of candidateDocuments) {
    if (item.historical) { historicalRevisions.push(item.file); continue; }
    try {
      const list = extractCandidates(item.document);
      const frozen = item.freezeCandidateSha ?? item.document.freezeCandidateSha;
      if (!frozen) fileErrors.push(`${item.file}: missing FREEZE.json candidateSha256`);
      else if (frozen !== item.rawSHA) fileErrors.push(`${item.file}: FREEZE.json candidateSha256 mismatch`);
      for (const change of list) {
        const key = sceneKey(change.scenarioId, change.questionId);
        if (!expected.has(key)) { fileErrors.push(`${item.file}: unauthorized question ${key}`); continue; }
        if (changes.has(key)) { fileErrors.push(`${item.file}: duplicate candidate ${key}`); continue; }
        const afterScene = item.document.scenarios?.find(s => s.id === change.scenarioId);
        const independentReviews = item.review?.rows?.filter(r => r.questionId === change.questionId).map(r => ({ ...r, reviewer: item.review.reviewer, role: 'independent' })) || [];
        const rootReviews = item.rootReview?.rows?.filter(r => r.questionId === change.questionId).map(r => ({ ...r, reviewer: item.rootReview.reviewer, role: 'root' })) || [];
        changes.set(key, { ...change, afterScene, independentReviews, rootReviews, receipt: item.receipt, file: item.file, held: reviewHeld({ ...change, independentReviews, rootReviews }) });
      }
    } catch (error) { fileErrors.push(`${item.file}: ${error.message}`); }
  }
  const rows = [];
  for (const [key, auth] of expected) {
    const currentScene = currentById.get(auth.scenarioId);
    const currentQuestion = currentScene?.questions.find(q => q.id === auth.questionId);
    const candidate = changes.get(key);
    if (!candidate) {
      rows.push({ ...auth, status: 'unwritten', errors: [] });
      continue;
    }
    if (exactApplication({ candidate, currentScene, receipt: candidate.receipt })) {
      rows.push({ ...auth, status: 'applied', candidateFile: candidate.file, errors: [] });
      continue;
    }
    if (currentScene && currentScene.version > auth.scenarioVersion) {
      rows.push({ ...auth, status: 'hold', candidateFile: candidate.file, errors: ['current source advanced without exact candidate afterHash and application receipt'] });
      continue;
    }
    const validation = validateStagedChange({ change: { ...candidate, beforeScene: candidate.beforeScene ?? currentScene }, expected: auth, currentScene });
    const errors = [...validation.errors];
    if (candidate.held) errors.push('independent/root payload review is not complete');
    rows.push({ ...auth, status: errors.length ? (candidate.held ? 'reviewheld' : 'hold') : 'ready', candidateFile: candidate.file, errors });
  }
  const candidateBank = clone(bank);
  const groups = new Map();
  for (const candidate of changes.values()) {
    if (candidate.held || exactApplication({ candidate, currentScene: currentById.get(candidate.scenarioId), receipt: candidate.receipt })) continue;
    if (!groups.has(candidate.scenarioId)) groups.set(candidate.scenarioId, []);
    groups.get(candidate.scenarioId).push(candidate);
  }
  for (const [scenarioId, candidates] of groups) {
    const s = candidateBank.find(scene => scene.id === scenarioId);
    const composed = composeSceneCandidates(s, candidates);
    if (composed.errors.length) { fileErrors.push(`${scenarioId}: ${composed.errors.join('; ')}`); continue; }
    const target = candidateBank.find(scene => scene.id === scenarioId);
    if (target && composed.scene) Object.assign(target, composed.scene);
  }
  const invalidBank = validateExperimentalBank(candidateBank);
  if (invalidBank.length) fileErrors.push(`candidate composition invalid: ${invalidBank.join('; ')}`);
  const seenVersions = new Map();
  for (const candidate of changes.values()) {
    if (!seenVersions.has(candidate.scenarioId)) seenVersions.set(candidate.scenarioId, candidate.toVersion);
    else if (seenVersions.get(candidate.scenarioId) !== candidate.toVersion) fileErrors.push(`conflicting scene versions: ${candidate.scenarioId}`);
  }
  return { schemaVersion: 1, authorized: expected.size, candidateFiles: candidateDocuments.map(x => x.file), historicalRevisions, fileErrors, rows, summary: { ready: rows.filter(r => r.status === 'ready').length, reviewheld: rows.filter(r => r.status === 'reviewheld').length, hold: rows.filter(r => r.status === 'hold').length, applied: rows.filter(r => r.status === 'applied').length, unwritten: rows.filter(r => r.status === 'unwritten').length } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const authorization = jsonRead(adjudicationPath);
  const bank = readBankFiles().bank;
  const allFiles = candidateFiles(candidateRoot);
  const documents = selectLatestRevisions(allFiles).map(entry => {
    const file = entry.file, document = jsonRead(file), freezePath = path.join(path.dirname(file), 'FREEZE.json');
    const reviewPath = path.join(path.dirname(file), 'independent-review.json');
    const rootReviewPath = path.join(path.dirname(file), 'root-review.json');
    const receiptPath = path.join(path.dirname(file), 'application-receipt.json');
    return { file: path.relative(root, file), rawSHA: sha(fs.readFileSync(file)), document, historical: entry.historical, freezeCandidateSha: fs.existsSync(freezePath) ? jsonRead(freezePath).candidateSha256 : undefined, review: fs.existsSync(reviewPath) ? jsonRead(reviewPath) : null, rootReview: fs.existsSync(rootReviewPath) ? jsonRead(rootReviewPath) : null, receipt: fs.existsSync(receiptPath) ? jsonRead(receiptPath) : null };
  });
  const report = checkChoiceRepairStaging({ bank, authorization, candidateDocuments: documents });
  console.log(JSON.stringify(report, null, 2));
}
