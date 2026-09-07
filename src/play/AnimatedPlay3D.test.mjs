import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { ALL_ANIMATED_PLAYS } from './playCatalog.js';
import { resolveKind } from './questionKinds.js';
import { animatedPointToRink } from './animatedRinkAdapter.js';
import { animatedActionIntents } from './animatedActionIntents.js';

const source = new URL('./AnimatedPlay.jsx', import.meta.url), cache = new URL('../../node_modules/.cache/animated-player-3d/', import.meta.url);
mkdirSync(cache, { recursive: true }); const output = new URL('component.mjs', cache);
await build({ entryPoints: [fileURLToPath(source)], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'animated-player-tests', setup(api) {
  api.onResolve({ filter: /^react$/ }, args => /(?:AnimatedPlay\.jsx|useAnimatedRinkPlayback\.js)$/.test(args.importer) ? { path: 'hooks', namespace: 'animated-hooks' } : undefined);
  api.onLoad({ filter: /.*/, namespace: 'animated-hooks' }, () => ({ contents: `export default {}; ${['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef'].map(name => `export const ${name}=(...args)=>globalThis.__animated3DHooks.${name}(...args);`).join('\n')}` }));
  api.onResolve({ filter: /(?:ScenarioRinkView|CoachFeedback)\.jsx$/ }, () => ({ path: 'child', namespace: 'animated-child' }));
  api.onLoad({ filter: /.*/, namespace: 'animated-child' }, () => ({ contents: 'const Child=()=>null; export default Child; export const CoachFeedback=Child;' }));
} }] });
const { default: AnimatedPlay } = await import(output.href);
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => Object.is(item, b[index]));
function mount(play, ageBand = 'U13') {
  let cursor = 0, dirty = true, effects = [], tree; const slots = [], events = [];
  const hooks = {
    useState(initial) { const slot = slots[cursor++] ||= { value: typeof initial === 'function' ? initial() : initial }; slot.set ||= value => { const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; return [slot.value, slot.set]; },
    useRef(value) { return slots[cursor++] ||= { current: value }; },
    useMemo(fn, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) slots[index] = { deps, value: fn() }; return slots[index].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; }); },
  };
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  function flush() { for (let count = 0; dirty; count++) { assert.ok(count < 30); dirty = false; cursor = 0; effects = []; globalThis.__animated3DHooks = hooks; try { tree = AnimatedPlay({ play, ageBand, onEvent: event => events.push(event) }); } finally { delete globalThis.__animated3DHooks; } effects.forEach(fn => fn()); } }
  function find(predicate) { let found; function visit(node) { if (Array.isArray(node)) return node.forEach(visit); if (!node?.props) return; if (predicate(node)) found = node; visit(node.props.children); } visit(tree); return found; }
  flush();
  return { events, find, flush, text: () => text(tree), scene: () => find(node => Array.isArray(node.props.state?.actors)),
    ready(value = true) { this.scene().props.onAvailabilityChange(value); flush(); },
    answer(id) { const button = find(node => node.props['data-answer-id'] === id); assert.ok(button, id); assert.ok(!button.props.disabled); button.props.onClick(); flush(); },
    click(label) { const button = find(node => node.type === 'button' && text(node) === label); assert.ok(button, label); assert.ok(!button.props.disabled); button.props.onClick(); flush(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
function environment(run, reducedMotion = false) {
  const keys = ['window', 'localStorage', 'sessionStorage', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'];
  const previous = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const frames = new Map(), timers = new Map(), storage = new Map(); let id = 0;
  globalThis.window = { matchMedia: () => ({ matches: reducedMotion }) };
  globalThis.localStorage = globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  globalThis.requestAnimationFrame = fn => { frames.set(++id, fn); return id; }; globalThis.cancelAnimationFrame = key => frames.delete(key);
  globalThis.setTimeout = fn => { timers.set(++id, fn); return id; }; globalThis.clearTimeout = key => timers.delete(key);
  try { run({ frames, timers, tick(time) { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); }, finishAnswers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); } }); }
  finally { for (const key of keys) { if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]; } }
}
function sample(kind) {
  for (const play of ALL_ANIMATED_PLAYS) for (const [id, node] of Object.entries(play.nodes)) if (resolveKind(node) === kind) return { play: { ...play, start: id }, node };
  throw Error(`Missing ${kind}`);
}

test('all25 catalog plays use one shared3D scene with visible YOU identity and no SVG board', () => environment(() => {
  for (const play of ALL_ANIMATED_PLAYS) {
    const component = mount(play);
    assert.ok(component.scene(), play.id); assert.equal(component.find(node => node.type === 'svg'), undefined);
    const id = play.nodes[play.start].decisionActor;
    if (id) { assert.equal(component.scene().props.focusActorId, id); assert.equal(component.scene().props.state.actors.find(actor => actor.id === id).label, 'YOU'); }
    component.unmount();
  }
}));

test('button, direct lane and direct actor answers retain source IDs and correctness through outcomes', () => environment(({ tick, finishAnswers }) => {
  for (const kind of ['read-mc', 'lane-pick', 'spot-mistake', 'predict-next']) {
    const { play, node } = sample(kind), component = mount(play), option = node.ask.opts.find(opt => opt.ok) || node.ask.opts[0];
    component.ready(); tick(0); component.flush(); tick(10000); component.flush();
    const beforeActors = structuredClone(component.scene().props.state.actors);
    if (kind === 'lane-pick') component.scene().props.onIcePoint(animatedPointToRink(option.zone));
    else if (kind === 'spot-mistake') component.scene().props.onActorAnswer(option.actorId, 'rink-tap');
    else component.answer(option.id);
    component.flush();
    const event = component.events.find(item => item.event === 'answer');
    assert.equal(event.answerId, option.id); assert.equal(event.ok, !!option.ok); assert.equal(event.kind, kind);
    assert.deepEqual(component.scene().props.state.actors, beforeActors, 'Answer controls do not drag players.');
    if (kind === 'predict-next') assert.doesNotMatch(component.text(), / - right read| - nice read!/);
    finishAnswers(); component.flush();
    assert.deepEqual([component.scene().props.state.puck.x, component.scene().props.state.puck.y], Object.values(animatedPointToRink(play.nodes[option.next].enterPuck || play.nodes[option.next].puck)));
    assert.equal(component.scene().props.focusActorId, node.decisionActor ?? null, 'An authored YOU survives the outcome; a question without one does not invent identity.');
    assert.equal(component.events.filter(item => item.event === 'answer').length, 1); component.unmount();
  }
}));

test('verdict keeps judge plus justification scoring and follows the judge route, independent of option shuffle', () => environment(({ tick, finishAnswers }) => {
  const { play, node } = sample('verdict'), component = mount(play);
  component.ready(); tick(0); component.flush(); tick(10000); component.flush();
  const judge = node.ask.opts.find(option => !option.ok), why = node.ask.justify.opts.find(option => option.ok);
  component.answer(judge.id);
  assert.equal(component.events.at(-1).event, 'judge'); assert.equal(component.events.at(-1).answerId, judge.id);
  component.answer(why.id);
  const event = component.events.at(-1);
  assert.equal(event.answerId, judge.id); assert.equal(event.justifyId, why.id); assert.equal(event.ok, false);
  finishAnswers(); component.flush();
  assert.deepEqual([component.scene().props.state.puck.x, component.scene().props.state.puck.y], Object.values(animatedPointToRink(play.nodes[judge.next].enterPuck || play.nodes[judge.next].puck)));
  component.unmount();
}));

test('render failure stops watch and answer clocks until explicit resume, and unmount cancels pending work', () => environment(({ tick, finishAnswers, frames, timers }) => {
  const source = ALL_ANIMATED_PLAYS.find(play => play.id === 'verdict_2v1_forced_shot_u11_v1');
  const component = mount(source); assert.equal(frames.size, 0); component.ready();
  tick(0); component.flush(); tick(600); component.flush(); const before = structuredClone(component.scene().props.state);
  component.ready(false); assert.equal(frames.size, 0);
  tick(10000); component.flush(); assert.deepEqual(component.scene().props.state, before);
  component.ready(); assert.equal(frames.size, 0); component.click('Continue play');
  tick(11000); component.flush(); tick(15000); component.flush();
  assert.ok(component.find(node => node.props['data-answer-id']), 'watch advances to the question after resume');
  const judge = source.nodes.judge.ask.opts[0]; component.answer(judge.id);
  component.answer(source.nodes.judge.ask.justify.opts[0].id);
  assert.equal(timers.size, 1); component.ready(false); assert.equal(timers.size, 0);
  finishAnswers(); component.flush(); assert.equal(component.scene().props.focusActorId, source.nodes.judge.decisionActor ?? null);
  component.unmount(); assert.equal(frames.size, 0); assert.equal(timers.size, 0);
}));

test('reduced motion uses explicit position changes without timers and preserves the answer gate', () => environment(({ frames }) => {
  const { play, node } = sample('read-mc'), component = mount(play);
  component.ready(); assert.equal(frames.size, 0);
  assert.equal(component.find(item => item.props['data-answer-id']).props.disabled, true);
  component.click('Show the next position');
  assert.equal(component.find(item => item.props['data-answer-id']).props.disabled, false);
  component.answer(node.ask.opts[0].id); component.unmount();
}, true));

test('a queued animation frame cannot advance between synchronous renderer failure and effect cleanup', () => environment(({ tick, frames }) => {
  const { play } = sample('read-mc'), component = mount(play);
  component.ready(); tick(0); component.flush(); tick(300); component.flush();
  const before = structuredClone(component.scene().props.state), queued = [...frames.values()][0]; assert.equal(typeof queued, 'function');
  component.scene().props.onAvailabilityChange(false);
  queued(10000); component.flush();
  assert.deepEqual(component.scene().props.state, before); assert.equal(frames.size, 0);
  component.unmount(); queued(20000); assert.equal(frames.size, 0);
}));

test('library removes the coach chooser while keeping automatic coach feedback', () => {
  const source = readFileSync(new URL('../one-on-one/PracticeLibrary.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /coachId|coachOverride|aria-label="Your coach"|pf-coaches/);
  assert.match(source, /getCoachForQuestion\(q,item\.age,'Forward'\)/);
});

test('on-rink pass/shot taps preview the exact source option and require confirmation before scoring', () => environment(({ tick }) => {
  const { play, node } = sample('read-mc');
  const actionPlay = ALL_ANIMATED_PLAYS.find(item => item.id === 'play_2v1_backdoor_read_u11_v1');
  for (const action of ['pass', 'shoot']) {
    const component = mount(actionPlay); component.ready(); tick(0); component.flush(); tick(10000); component.flush();
    const intents = animatedActionIntents(actionPlay, actionPlay.nodes.rush), intent = intents.find(item => item.kind === action);
    if (action === 'pass') component.scene().props.onActorAnswer(intent.actorId, 'rink-tap');
    else component.scene().props.onGoalAnswer('right', 'rink-tap');
    component.flush();
    assert.equal(component.events.length, 0, 'a rink tap is a preview, not a submitted answer');
    assert.match(component.text(), /Your play:/);
    component.ready(false);
    const confirm = component.find(item => item.type === 'button' && item.props.children === 'Confirm play');
    assert.equal(confirm.props.disabled, true); confirm.props.onClick(); component.flush(); assert.equal(component.events.length, 0);
    component.ready(); component.click('Continue play'); component.click('Confirm play');
    assert.equal(component.events.at(-1).answerId, intent.option.id); assert.equal(component.events.at(-1).ok, !!intent.option.ok);
    component.unmount();
  }
  assert.equal(animatedActionIntents(play, node).length, 0, 'defensive MC does not invent shooting or passing choices');
}));
