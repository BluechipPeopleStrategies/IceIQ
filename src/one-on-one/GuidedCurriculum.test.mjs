import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { curriculumPlayerCopy } from './curriculumAudienceCopy.js';
import { recordCurriculumAnswer } from './curriculumCore.js';

const source = new URL('./GuidedCurriculum.jsx', import.meta.url);
const cache = new URL('../../node_modules/.cache/curriculum-player-flow/', import.meta.url);
mkdirSync(cache, { recursive: true });
const output = new URL('lesson.mjs', cache);
await build({ entryPoints: [fileURLToPath(source)], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'curriculum-player-boundaries', setup(api) {
  api.onResolve({ filter: /^react$/ }, args => /(?:GuidedCurriculum|curriculumMotion)\.jsx$/.test(args.importer) ? { path: 'hooks', namespace: 'player-hooks' } : undefined);
  api.onLoad({ filter: /.*/, namespace: 'player-hooks' }, () => ({ contents: ['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useId'].map(name => `export const ${name}=(...args)=>globalThis.__curriculumPlayerHooks.${name}(...args);`).join('\n') }));
  api.onResolve({ filter: /\.jsx$/ }, args => args.importer === fileURLToPath(source) && !args.path.endsWith('curriculumMotion.jsx') ? { path: args.path, namespace: 'player-child' } : undefined);
  api.onLoad({ filter: /.*/, namespace: 'player-child' }, () => ({ contents: 'const Child=()=>null; export default Child; export const CoachFeedback=Child,HockeyPlayerArt=Child,SvgPlayerLocator=Child,SvgPuckLocator=Child;' }));
} }] });
const { CurriculumSession } = await import(output.href);
const pack = JSON.parse(readFileSync(new URL('./curriculum-draft.json', import.meta.url), 'utf8'));
const equalDeps = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

function mount(ageBand = 'U18', playerId = 'test-player', initialLessonId) {
  let cursor = 0, dirty = true, effects = [], tree;
  const slots = [];
  const hooks = {
    useState(initial) { const slot = slots[cursor++] ||= { value: typeof initial === 'function' ? initial() : initial }; slot.set ||= value => { const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; return [slot.value, slot.set]; },
    useRef(value) { return slots[cursor++] ||= { current: value }; },
    useId() { return hooks.useRef('player-flow').current; },
    useMemo(fn, deps) { const index = cursor++; if (!equalDeps(slots[index]?.deps, deps)) slots[index] = { deps, value: fn() }; return slots[index].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const index = cursor++; if (!equalDeps(slots[index]?.deps, deps)) effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; }); },
  };
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  function flush() { for (let count = 0; dirty; count++) { assert.ok(count < 30, 'hooks settle'); dirty = false; cursor = 0; effects = []; globalThis.__curriculumPlayerHooks = hooks; try { tree = CurriculumSession({ ageBand, playerId, initialLessonId }); } finally { delete globalThis.__curriculumPlayerHooks; } effects.forEach(fn => fn()); } }
  function find(predicate) { let found; function visit(node) { if (Array.isArray(node)) return node.forEach(visit); if (!node?.props) return; if (predicate(node)) found = node; visit(node.props.children); } visit(tree); return found; }
  flush();
  return { flush, find, text: () => text(tree), board: () => find(node => node.props.sceneView === true), motion: () => find(node => node.props.motion)?.props.motion,
    availability(value) { this.board().props.onAvailabilityChange(value); flush(); },
    choose(index) { const button = find(node => node.props['data-curriculum-option'] === index); assert.ok(button); assert.ok(!button.props.disabled, 'option is enabled'); button.props.onClick(); flush(); },
    click(label) { const button = find(node => node.type === 'button' && text(node) === label); assert.ok(button, label); assert.ok(!button.props.disabled); button.props.onClick(); flush(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

function environment(run, reducedMotion = false) {
  const keys = ['window', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const previous = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const saved = new Map(), frames = new Map(); let frameId = 0;
  globalThis.window = { matchMedia: () => ({ matches: reducedMotion, addEventListener() {}, removeEventListener() {} }) };
  globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  globalThis.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  try { run({ saved, frames, tick(time) { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); } }); }
  finally { for (const key of keys) { if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]; } }
}

test('world deep links open only an existing lesson at its own age and never alter stored progress on navigation', () => environment(({ saved }) => {
  const playerId = 'world-link-player', progressKey = `rinkreads_guided_curriculum_v1:${playerId}`;
  const historical = JSON.stringify({ version: 1, answers: { [pack.lessons[0].questions[1].id]: { attempted:true, firstCorrect:true, mastered:true } } });
  saved.set(progressKey, historical);
  for (const lesson of pack.lessons) {
    const session = mount(lesson.ageBand, playerId, lesson.id);
    const current = session.find(node => node.props['aria-current'] === 'step');
    assert.equal(current.props.children.find(node => node.type === 'strong').props.children, lesson.title);
    assert.equal(saved.get(progressKey), historical);
    session.unmount();
  }
  for (const invalid of ['missing-lesson', 'practice-draft-u18-both-defenders']) {
    const session = mount('U7', playerId, invalid);
    assert.equal(session.find(node => node.props['aria-current'] === 'step').props.children.find(node => node.type === 'strong').props.children, 'Look before the puck comes');
    assert.equal(saved.get(progressKey), historical);
    session.unmount();
  }
}));

test('plain U18 feedback preserves F3, and Next lesson opens the new MC at its exact opening pose without the habit step', () => environment(({ saved, tick }) => {
  const sourceLesson = pack.lessons.find(lesson => lesson.id.endsWith('u18-read-receiver'));
  const question = sourceLesson.questions[0], copy = curriculumPlayerCopy(sourceLesson, question);
  const session = mount();
  assert.match(session.text(), /Who can you pass to with a clear path and no opponent close by\?/);
  assert.doesNotMatch(session.text(), /Check the habit|Teaching notes|Enlarge board|receiving space|meets both conditions|lane check|YOUR COACH|Match this lesson/);
  assert.equal(session.board().props.inspectable, undefined);
  assert.equal(session.board().props.visual.caption, copy.visualCaption);
  session.availability(true); session.choose(question.ok);
  const feedback = session.find(node => typeof node.props.explanation === 'string');
  assert.equal(feedback.props.correct, true); assert.equal(feedback.props.explanation, copy.explanation);
  assert.notEqual(feedback.props.explanation, question.why);
  assert.equal(JSON.parse(saved.get('rinkreads_guided_curriculum_v1:test-player')).answers[question.id].mastered, false);
  assert.doesNotMatch(session.text(), /question is mastered|100 points are counted|scenarios mastered/);
  session.click('Next lesson →');
  assert.match(session.text(), /D1 has moved between F1 and you/);
  assert.doesNotMatch(session.text(), /Check the habit|TRUE OR FALSE|100 points are counted/);
  assert.equal(session.find(node => typeof node.props.explanation === 'string'), undefined);
  assert.equal(session.motion().phase, 'paused', 'new renderer must become visible first');
  session.availability(true);
  assert.equal(session.motion().phase, 'playing');
  assert.deepEqual(session.board().props.visual.actors.find(actor => actor.id === 'D1').x, 17);
  assert.deepEqual(session.board().props.visual.actors.find(actor => actor.id === 'D1').y, 4);
  assert.equal(session.board().props.visual.arrows.length, 0, 'the authored D1 movement replaces its old line');
  assert.equal(session.find(node => node.props['data-curriculum-option'] === 2).props.disabled, true);
  // Even an invocation bypassing the disabled DOM control cannot answer early.
  session.find(node => node.props['data-curriculum-option'] === 2).props.onClick(); session.flush();
  assert.equal(Object.keys(JSON.parse(saved.get('rinkreads_guided_curriculum_v1:test-player')).answers).length, 1);
  tick(0); session.flush(); tick(1800); session.flush();
  session.choose(2);
  assert.equal(Object.keys(JSON.parse(saved.get('rinkreads_guided_curriculum_v1:test-player')).answers).length, 2);
  session.unmount();
}));

test('all24 active scenarios keep source option indexes and previously earned deferred TF progress', () => environment(({ saved, tick }) => {
  const deferred = pack.lessons[0].questions[1];
  let count = 0;
  for (const age of ['U7', 'U9', 'U11', 'U13', 'U15', 'U18']) {
    const player = `active-${age}`, key = `rinkreads_guided_curriculum_v1:${player}`;
    saved.set(key, JSON.stringify({ version: 1, answers: { [deferred.id]: { attempted:true,firstCorrect:true,mastered:true } } }));
    const session = mount(age, player); session.availability(true);
    const lessons = ['scanning', 'off-puck-support-offense', 'gap-control', 'odd-man-reads'].map(strand => pack.lessons.find(lesson => lesson.ageBand === age && lesson.curriculumStrand === strand));
    for (let index = 0; index < lessons.length; index++) {
      const question = lessons[index].questions.find(q => q.type === 'mc');
      session.availability(true);
      if (!session.motion().canAnswer) { tick(0); session.flush(); tick(1800); session.flush(); }
      const before = JSON.parse(saved.get(key)).answers;
      session.choose(question.ok);
      const after = JSON.parse(saved.get(key)).answers;
      assert.equal(after[question.id].mastered, false, question.id);
      assert.deepEqual(after[deferred.id], before[deferred.id], 'deferred history is not deleted');
      assert.equal(Object.keys(after).length, index + 2);
      assert.doesNotMatch(session.text(), /Check the habit|Question 2 of 2|2 \/ 2/);
      session.click(index === 3 ? 'Back to first lesson' : 'Next lesson →'); count++;
    }
    assert.equal(session.find(node => typeof node.props.explanation === 'string'), undefined, 'returning to lesson1 has a fresh unanswered view');
    session.unmount();
  }
  assert.equal(count, 24);
}));

test('loading waits for a visible rink, and context failure freezes the opening until explicit resume after retry', () => environment(({ tick, frames, saved }) => {
  const session = mount('U13');
  assert.equal(session.motion().phase, 'paused'); assert.equal(frames.size, 0);
  session.availability(true); assert.equal(session.motion().phase, 'playing');
  tick(0); session.flush(); tick(720); session.flush();
  const beforeFailure = session.board().props.visual.actors;
  session.availability(false);
  assert.equal(session.motion().phase, 'paused'); assert.equal(frames.size, 0);
  tick(9000); session.flush(); assert.deepEqual(session.board().props.visual.actors, beforeFailure);
  session.find(node => node.props['data-curriculum-option'] === 1).props.onClick(); session.flush(); assert.equal(saved.size, 0);
  session.motion().play(); session.flush(); assert.equal(session.motion().phase, 'paused');
  session.availability(true); assert.equal(session.motion().phase, 'paused', 'retry must not resume unseen movement');
  session.motion().play(); session.flush(); tick(10000); session.flush(); tick(12000); session.flush();
  assert.equal(session.motion().phase, 'complete'); session.choose(1);
  session.unmount(); assert.equal(frames.size, 0);
}));

test('reduced motion waits for Play, then answers at the exact final freeze without a timer', () => environment(({ frames }) => {
  const session = mount('U13'); session.availability(true);
  assert.equal(session.motion().phase, 'ready'); assert.equal(frames.size, 0);
  session.motion().play(); session.flush();
  assert.equal(session.motion().phase, 'complete'); assert.equal(frames.size, 0);
  session.choose(1); session.click('Next lesson →');
  assert.equal(session.motion().supported, false); assert.equal(session.motion().canAnswer, true);
  assert.equal(session.find(node => node.props['data-curriculum-option'] === 2).props.disabled, true);
  session.availability(true);
  assert.equal(session.find(node => node.props['data-curriculum-option'] === 2).props.disabled, false);
  session.unmount();
}, true));

test('the U15 placement format uses the exact source question and leaves the MC answer and points unchanged', () => environment(({ saved }) => {
  const session = mount('U15', 'format-player'); session.availability(true);
  const lesson = pack.lessons.find(item => item.id === 'practice-draft-u15-two-angles'), question = lesson.questions[0];
  session.find(node => node.key === lesson.id).props.onClick(); session.flush();
  session.availability(true);
  assert.ok(session.find(node => node.props['data-curriculum-option'] === 0), 'MC is the default');
  session.choose(question.ok);
  const key = 'rinkreads_guided_curriculum_v1:format-player', bytes = saved.get(key);
  session.click('Move the player');
  assert.equal(session.find(node => node.props['data-curriculum-option'] === 0), undefined);
  const exercise = session.find(node => node.props.question?.id === question.id);
  assert.deepEqual(exercise.props.question, question, 'source, not the rewritten audience copy, binds the variant');
  assert.equal(exercise.props.playerId, 'format-player'); assert.equal(saved.get(key), bytes);
  session.click('Choose an answer');
  assert.equal(session.find(node => node.props['data-curriculum-option'] === 0).props['aria-pressed'], true);
  assert.equal(saved.get(key), bytes);
  session.unmount();
}));

test('a queued opening frame cannot advance between renderer failure and effect cleanup', () => environment(({ frames, tick }) => {
  const session = mount('U13'); session.availability(true); tick(0); session.flush(); tick(450); session.flush();
  const frozen = structuredClone(session.board().props.visual), queued = [...frames.values()][0];
  assert.equal(typeof queued, 'function');
  session.board().props.onAvailabilityChange(false);
  queued(1600); session.flush();
  assert.deepEqual(session.board().props.visual, frozen);
  session.unmount(); queued(1800); session.flush();
  assert.deepEqual(session.board().props.visual, frozen);
}));

test('a new lesson requires its own ready event and stale old-question callbacks cannot unlock or submit it', () => environment(({ saved }) => {
  const session = mount('U11', 'swap-player'); session.availability(true);
  const oldBoard = session.board(), oldCallback = oldBoard.props.onAvailabilityChange;
  session.choose(0); session.click('Next lesson →');
  assert.notEqual(session.board().key, oldBoard.key);
  const choice = session.find(node => node.props['data-curriculum-option'] === 0);
  assert.equal(choice.props.disabled, true);
  const before = saved.get('rinkreads_guided_curriculum_v1:swap-player');
  oldCallback(true); choice.props.onClick(); session.flush();
  assert.equal(saved.get('rinkreads_guided_curriculum_v1:swap-player'), before);
  assert.equal(session.find(node => node.props['data-curriculum-option'] === 0).props.disabled, true);
  session.availability(true);
  const staleSubmit = session.find(node => node.props['data-curriculum-option'] === 0).props.onClick;
  session.board().props.onAvailabilityChange(false); staleSubmit(); session.flush();
  assert.equal(saved.get('rinkreads_guided_curriculum_v1:swap-player'), before);
  session.unmount();
}));
