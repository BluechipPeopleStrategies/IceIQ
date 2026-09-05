import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPracticeJudge, PracticeJudgeError, readPracticeSource, validateJudgeRequest } from './practice-judge.mjs';
import { getPracticeJudgeStatus, judgePracticeAttempt } from '../src/one-on-one/judgeClient.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const draft = {
  version: 'test-draft', title: 'must not leave the server boundary', telemetry: { session: 'private' },
  actors: [{ id: 'private-player-id', label: 'Private Player', team: 'home', role: 'skater', keys: [{ time: 0, x: -4.14, y: 2.26, facing: 91.04 }] }],
  puck: { owner: 'private-player-id' },
};

function request(note = 'docs/library/gap-control.md') {
  return {
    question: {
      prompt: 'Where should the defender stand and why?',
      ageBand: 'U11',
      sourceRef: { note },
      coachExplanation: 'Protect the middle while matching the rush speed.',
      expectedAction: null,
      type: 'position',
      initialDraft: structuredClone(draft),
      referenceDraft: structuredClone(draft),
    },
    attempt: { draft: structuredClone(draft), reason: 'I stayed inside so the puck carrier sees less middle ice.', action: null },
  };
}

const sound = {
  verdict: 'sound',
  headline: 'You protected the middle',
  explanation: 'Your position keeps you between the puck carrier and the dangerous ice while leaving room to match speed.',
  cue: 'Inside shoulder first.',
  nextQuestion: 'What changes if the puck carrier slows down?',
  confidence: 'high',
};

test('sends a server-side Responses API request and validates structured output', async () => {
  let call;
  const judge = createPracticeJudge({
    apiKey: 'server-test-key', rootDir,
    fetchImpl: async (url, options) => {
      call = { url, options };
      return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(sound) }] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  const result = await judge.judge(request());
  assert.deepEqual(result.judgment, sound);
  assert.equal(result.source.kind, 'library-document');
  assert.equal(call.url, 'https://api.openai.com/v1/responses');
  assert.equal(call.options.headers.Authorization, 'Bearer server-test-key');
  const apiBody = JSON.parse(call.options.body);
  assert.equal(apiBody.store, false);
  assert.equal(apiBody.text.format.type, 'json_schema');
  assert.equal(apiBody.text.format.strict, true);
  const modelInput = JSON.parse(apiBody.input[0].content[0].text);
  assert.deepEqual(modelInput.attempt.draft, {
    actors: [{ actor: 'actor-1', team: 'home', role: 'skater', x: -4.1, y: 2.3, facing: 91 }],
    puck: { owner: 'actor-1' },
  });
  assert.doesNotMatch(apiBody.input[0].content[0].text, /Private Player|private-player-id|telemetry|session/);
});

test('accepts a bounded open rubric for alternative valid reads', () => {
  const payload = request();
  payload.question.rubric = {
    mode: 'open',
    mustNotice: ['middle threat', 'support lane'],
    acceptableActions: ['pass', 'carry'],
    avoid: ['grading by coordinate matching'],
    followUpCue: 'What changes when pressure arrives?',
  };
  assert.deepEqual(validateJudgeRequest(payload).question.rubric, payload.question.rubric);
});

test('reads only an explicit real document in docs/library', async () => {
  const validated = validateJudgeRequest(request('docs/library/gap-control.md'));
  const source = await readPracticeSource(validated.source, { rootDir });
  assert.equal(source.kind, 'library-document');
  assert.match(source.text, /gap/i);
  assert.equal(source.label, 'gap-control.md');
});

test('rejects malicious and merely path-looking source notes', () => {
  for (const note of ['docs/library/../secret.md', '..\\.env', 'C:\\Users\\secret.txt', 'https://example.com/guide.md']) {
    assert.throws(() => validateJudgeRequest(request(note)), error => error instanceof PracticeJudgeError && error.status === 400 && error.code === 'invalid_source');
  }
});

test('missing key returns 503 without calling fetch', async () => {
  let called = false;
  const judge = createPracticeJudge({ rootDir, fetchImpl: async () => { called = true; } });
  await assert.rejects(judge.judge(request()), error => error instanceof PracticeJudgeError && error.status === 503 && error.code === 'not_configured');
  assert.equal(called, false);
});

test('times out a stalled model request and clears the one-request lock', async () => {
  let calls = 0;
  const judge = createPracticeJudge({
    apiKey: 'server-test-key', rootDir, timeoutMs: 50,
    fetchImpl: async (_url, { signal }) => {
      calls += 1;
      if (calls > 1) return new Response(JSON.stringify({ output_text: JSON.stringify(sound) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }));
    },
  });
  await assert.rejects(judge.judge(request()), error => error instanceof PracticeJudgeError && error.status === 504 && error.code === 'timeout');
  assert.equal((await judge.judge(request())).judgment.verdict, 'sound');
});

test('permits only one active model review', async () => {
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  const judge = createPracticeJudge({
    apiKey: 'server-test-key', rootDir,
    fetchImpl: async () => {
      await waiting;
      return new Response(JSON.stringify({ output_text: JSON.stringify(sound) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  const first = judge.judge(request());
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(judge.judge(request()), error => error instanceof PracticeJudgeError && error.status === 429 && error.code === 'busy');
  release();
  assert.equal((await first).judgment.verdict, 'sound');
});

test('malformed model output never becomes a grade', async () => {
  const judge = createPracticeJudge({
    apiKey: 'server-test-key', rootDir,
    fetchImpl: async () => new Response(JSON.stringify({ output_text: '{"verdict":"sound"}' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  });
  await assert.rejects(judge.judge(request()), error => error instanceof PracticeJudgeError && error.status === 502 && error.code === 'malformed_model_output');
});

test('an authored note is clearly unreviewed and cannot receive a positive verdict', async () => {
  const judge = createPracticeJudge({
    apiKey: 'server-test-key', rootDir,
    fetchImpl: async () => new Response(JSON.stringify({ output_text: JSON.stringify(sound) }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  });
  const result = await judge.judge(request('Local coach-authored practice question'));
  assert.equal(result.source.kind, 'authored-reference-unreviewed');
  assert.equal(result.judgment.verdict, 'needs-coach-review');
  assert.equal(result.judgment.confidence, 'low');
});

test('client reports missing configuration without a fake judgment', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ ok: false, code: 'not_configured', message: 'AI coach review is not configured on this server.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  const status = await getPracticeJudgeStatus({ fetchImpl });
  const result = await judgePracticeAttempt(request(), { fetchImpl });
  assert.equal(status.configured, false);
  assert.equal(result.ok, false);
  assert.equal(result.unavailable, true);
  assert.equal(result.code, 'not_configured');
  assert.equal(result.judgment, null);
});
