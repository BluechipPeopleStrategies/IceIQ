// Synthetic, throwaway end-to-end exercise of the local coaching-feedback
// endpoint served by tools/coaching-feedback-plugin.mjs on the dedicated
// dev server (port 5179) started for Task D. Not part of the app; lives
// under tmp/ (gitignored), never committed. All note text is clearly
// marked SYNTHETIC so nothing here could be mistaken for real player data.
import crypto from 'node:crypto';
import {readBankFiles} from '../tools/experimental-bank-files.mjs';
import {makeScene} from '../src/one-on-one/experimentalBankCore.js';

const BASE = 'http://localhost:5179';
const {bank} = readBankFiles();
const s = bank[0]; // exp26-u7-001
const q = s.questions[0]; // exp26-u7-001-q1
const scene = makeScene(s, null); // same derivation ExperimentalPractice.jsx uses for the CoachingFeedbackPanel `scene` prop

function hashOf(scenario, question) {
  const {questions, version, ...sourceScene} = scenario;
  return crypto.createHash('sha256').update(JSON.stringify({scene: sourceScene, question})).digest('hex');
}

const goodHash = hashOf(s, q);
const staleHash = 'a'.repeat(64);

async function post(body, headers = {}) {
  const res = await fetch(`${BASE}/__coaching-feedback`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Origin': 'http://localhost:5179', ...headers},
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return {status: res.status, json};
}

async function get(headers = {}, qs = '') {
  const res = await fetch(`${BASE}/__coaching-feedback${qs}`, {headers: {'Origin': 'http://localhost:5179', ...headers}});
  let json = null;
  try { json = await res.json(); } catch {}
  return {status: res.status, json};
}

const results = {};

const ownerA = 'synthetic-owner-alpha-0001';
const r1 = await post({
  scenarioId: s.id, scenarioVersion: s.version, questionId: q.id, contentHash: goodHash,
  note: 'SYNTHETIC TEST: both passing lanes look blocked to me.', tags: ['Scene looks wrong'],
  context: {view: 'overhead', actors: scene.actors.map(({id, x, y, facing}) => ({id, x, y, facing})), puck: scene.puck},
}, {'X-Feedback-Owner': ownerA});
results.validSubmission = r1;

const r2 = await post({
  scenarioId: s.id, scenarioVersion: s.version, questionId: q.id, contentHash: staleHash,
  note: 'SYNTHETIC TEST: stale hash should be rejected.',
}, {'X-Feedback-Owner': ownerA});
results.staleHash = r2;

const r3 = await post({
  scenarioId: s.id, scenarioVersion: s.version, questionId: q.id, contentHash: goodHash,
  note: '   ',
}, {'X-Feedback-Owner': ownerA});
results.emptyNote = r3;

const res4 = await fetch(`${BASE}/__coaching-feedback`, {
  method: 'POST', headers: {'Content-Type': 'application/json', 'Origin': 'http://evil.example.com'},
  body: JSON.stringify({scenarioId: s.id, scenarioVersion: s.version, questionId: q.id, contentHash: goodHash, note: 'SYNTHETIC TEST: cross-origin, should be blocked.'}),
});
results.crossOrigin = {status: res4.status, text: await res4.text()};

const dbl = await Promise.all([
  post({scenarioId: s.id, scenarioVersion: s.version, questionId: q.id, contentHash: goodHash, note: 'SYNTHETIC TEST: double-submit A'}, {'X-Feedback-Owner': ownerA}),
  post({scenarioId: s.id, scenarioVersion: s.version, questionId: q.id, contentHash: goodHash, note: 'SYNTHETIC TEST: double-submit A'}, {'X-Feedback-Owner': ownerA}),
]);
results.doubleSubmit = dbl;

const ownerB = 'synthetic-owner-beta-0002';
const r6 = await post({
  scenarioId: s.id, scenarioVersion: s.version, questionId: q.id, contentHash: goodHash,
  note: 'SYNTHETIC TEST: owner B private note.',
}, {'X-Feedback-Owner': ownerB});
results.ownerBSubmission = r6;

results.playerViewA = await get({'X-Feedback-Owner': ownerA});
results.playerViewB = await get({'X-Feedback-Owner': ownerB});
results.adminView = await get({}, '?view=admin');

const feedbackId = r1.json?.id;
const res8 = await fetch(`${BASE}/__coaching-feedback?action=comment`, {
  method: 'POST', headers: {'Content-Type': 'application/json', 'Origin': 'http://localhost:5179'},
  body: JSON.stringify({feedbackId, note: 'SYNTHETIC ADMIN NOTE: investigating lane geometry.'}),
});
results.internalNote = {status: res8.status, json: await res8.json()};

results.playerViewAfterInternalNote = await get({'X-Feedback-Owner': ownerA});

console.log(JSON.stringify(results, null, 2));
