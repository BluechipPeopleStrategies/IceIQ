import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const output = new URL('../../node_modules/.cache/question-visual-gate/hook.mjs', import.meta.url);
mkdirSync(new URL('./', output), { recursive: true });
await build({ entryPoints: [fileURLToPath(new URL('./useQuestionVisualGate.js', import.meta.url))], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent', plugins: [{ name: 'visual-gate-hooks', setup(api) {
  api.onResolve({ filter: /^react$/ }, () => ({ path: 'hooks', namespace: 'visual-gate-hooks' }));
  api.onLoad({ filter: /.*/, namespace: 'visual-gate-hooks' }, () => ({ contents: ['useState', 'useRef', 'useCallback', 'useEffect'].map(name => `export const ${name}=(...args)=>globalThis.__visualGateHooks.${name}(...args);`).join('\n') }));
} }] });
const { useQuestionVisualGate } = await import(output.href);
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
function mount(question, attempt = 0, enabled = true) {
  const slots = []; let index, effects, value;
  const hooks = {
    useRef(initial) { return slots[index++] ||= { current: initial }; },
    useState(initial) { const slot = slots[index++] ||= { value: initial }; return [slot.value, fn => { slot.value = typeof fn === 'function' ? fn(slot.value) : fn; }]; },
    useCallback(fn, deps) { const id = index++; if (!same(slots[id]?.deps, deps)) slots[id] = { deps, fn }; return slots[id].fn; },
    useEffect(fn, deps) { const id = index++; if (!same(slots[id]?.deps, deps)) effects.push(() => { slots[id]?.cleanup?.(); slots[id] = { deps, cleanup: fn() }; }); },
  };
  function render(next = question, nextAttempt = attempt) { question = next; attempt = nextAttempt; index = 0; effects = []; globalThis.__visualGateHooks = hooks; try { value = useQuestionVisualGate(question, attempt, enabled); } finally { delete globalThis.__visualGateHooks; } effects.forEach(fn => fn()); return value; }
  render(); return { render, get value() { return value; }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
const q = { id: 'question-a', media: { type: 'image', url: '/shared.png' }, overlays: [{ kind: 'arrow', from: [1, 2], to: [3, 4] }] };

test('new question and changed visual start blocked synchronously; stale callbacks cannot unlock a reused image or revisited question', () => {
  const hook = mount(q), first = hook.value; assert.equal(first.canAnswer(), false);
  first.onAvailabilityChange(true); assert.equal(first.canAnswer(), true); hook.render();
  const next = hook.render({ ...q, id: 'question-b' }); assert.equal(next.canAnswer(), false); first.onAvailabilityChange(true); assert.equal(next.canAnswer(), false); assert.equal(first.canAnswer(), false);
  next.onAvailabilityChange(true); assert.equal(next.canAnswer(), true);
  const returnVisit = hook.render(q); first.onAvailabilityChange(true); assert.equal(returnVisit.canAnswer(), false);
  returnVisit.onAvailabilityChange(true); assert.equal(returnVisit.canAnswer(), true);
  const changed = hook.render({ ...q, overlays: [] }); assert.equal(changed.canAnswer(), false); returnVisit.onAvailabilityChange(true); assert.equal(changed.canAnswer(), false);
  changed.onAvailabilityChange(true); const replay = hook.render({ ...q, overlays: [] }, 1); assert.equal(replay.canAnswer(), false);
  hook.unmount(); replay.onAvailabilityChange(true); assert.equal(replay.canAnswer(), false);
});

test('only actual visible time contributes to the countdown or speed bonus across loading and failure', () => {
  const oldNow = Date.now; let now = 100; Date.now = () => now;
  try {
    const hook = mount(q); now = 15100; assert.equal(hook.value.visibleMs(), 0);
    hook.value.onAvailabilityChange(true); hook.render(); now = 17100; assert.equal(hook.value.visibleMs(), 2000);
    hook.value.onAvailabilityChange(false); assert.equal(hook.value.canAnswer(), false); now = 99100; assert.equal(hook.value.visibleMs(), 2000);
    hook.value.onAvailabilityChange(true); hook.render(); now = 100100; assert.equal(hook.value.visibleMs(), 3000); assert.equal(hook.render().timerStartedAt, 97100);
    hook.unmount();
  } finally { Date.now = oldNow; }
});

test('text questions and visuals rendered by a separate interactive widget retain the existing answer availability', () => {
  for (const hook of [mount({ id: 'text', type: 'mc' }), mount(q, 0, false)]) { assert.equal(hook.value.canAnswer(), true); assert.equal(hook.value.requiresVisual, false); hook.unmount(); }
});

const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
function section(start, end) { return app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start))); }
function functionBody(source, name) { const start = source.indexOf(`function ${name}(`); assert.ok(start >= 0, name); let brace = source.indexOf('{', start), depth = 1, end = brace + 1; for (; depth && end < source.length; end++) { if (source[end] === '{') depth++; else if (source[end] === '}') depth--; } return source.slice(start, end); }

test('main and weekly actual scoring handlers reject a failed or previous image before changing selection or results', () => {
  const quiz = section('function Quiz({', 'function QuizFeedbackCard('), weekly = section('function WeeklyQuiz({', 'function WeeklyResults(');
  for (const [source, names] of [[quiz, ['handlePick', 'handleSeqAnswer', 'handleRinkQAnswer', 'handleSkip']], [weekly, ['handlePick', 'handleTF', 'handleSeqAnswer']]]) {
    for (const name of names) {
      let ready = false, writes = 0;
      const context = { questionVisual: { canAnswer: () => ready, visibleMs: () => 1000 }, sel: null, seqAnswered: false, rinkQResult: null, q: { id: 'q', ok: 1, type: 'mc' }, question: { id: 'q' }, qtype: 'mc', results: [], qLen: 5, skippedQs: [], setSel() { writes++; }, setSeqAnswered() { writes++; }, setRinkQResult() { writes++; }, setResults() { writes++; }, setSkippedQs() { writes++; }, advance() {}, setSeqCorrect() {}, setSeqPerfect() {}, setLastSpeedBonus() {}, setSpeedTotal() {}, setMistakeStreak() {}, setQuizDone() {}, submitAnswer() { writes++; }, computeSpeedBonus: () => 0, upsertResult: (_old, result) => [result], answeredCount: () => 1, skipResult: () => ({}) };
      const actual = Function(...Object.keys(context), `${functionBody(source, name)};return ${name};`)(...Object.values(context));
      actual(1); assert.equal(writes, 0, `${name} must stop before state/scoring`);
      ready = true; actual(1); assert.ok(writes > 0, `${name} must retain the normal answer path`);
    }
  }
});

test('all three source image callers key the image and disable answers; timed callbacks recheck the live gate', () => {
  for (const source of [section('function Quiz({', 'function QuizFeedbackCard('), section('function WeeklyQuiz({', 'function WeeklyResults('), section('function QuestionPreviewFallback(', 'function JourneyScreen(')]) {
    assert.match(source, /<ScenarioImage key=\{questionVisual\.key\} questionId=\{q\.id\}/);
    assert.match(source, /onAvailabilityChange=\{questionVisual\.onAvailabilityChange\}/);
    assert.match(source, /disabled=\{(?:answered \|\| )?!questionVisual\.ready\}/);
  }
  const quiz = section('function Quiz({', 'function QuizFeedbackCard(');
  const effect = quiz.slice(quiz.indexOf('if (!timedMode || !question || !questionVisual.ready)'), quiz.indexOf('// Speed-bonus window'));
  assert.match(effect, /setTimeout\(\(\) => \{\s*if \(!questionVisual\.canAnswer\(\)/);
  assert.match(effect, /TIMED_DURATION_MS - questionVisual\.visibleMs\(\)/);
  assert.match(quiz, /function handleSkip\(\) \{\s*if \(!questionVisual\.canAnswer\(\)/);
});
