import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { POSITIONING_TEMPLATES, createPositioningSession, movePositioningPlayer, positionChoicePoint, submitPositioningRead, advancePositioningPlayback, positioningState } from './positioningSequenceCore.js';
import { stateToStaticDirectorDraft } from './readSequenceCore.js';
import { sampleDraft } from './director.js';

// Run the actual screen state/effects with opaque renderer children. Browser
// pointer, layout and focus behavior remain a separate production-preview check.
const directory = new URL('.', import.meta.url);
const path = fileURLToPath(new URL('ScenarioWorkshop.jsx', directory));
const output = new URL('../../node_modules/.cache/rinkreads-workshop/workshop.mjs', directory);
mkdirSync(fileURLToPath(new URL('.', output)), { recursive: true });
await build({
  stdin: { contents: readFileSync(path, 'utf8').replace("from 'react';", "from 'test:hooks';"), resolveDir: fileURLToPath(directory), sourcefile: path, loader: 'jsx' },
  outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent',
  plugins: [{ name: 'workshop-hooks', setup(api) {
    api.onResolve({ filter: /^test:hooks$/ }, () => ({ path: 'hooks', namespace: 'hooks' }));
    api.onResolve({ filter: /\.jsx$/ }, args => args.importer === path ? { path: args.path, namespace: 'child' } : undefined);
    api.onLoad({ filter: /.*/, namespace: 'hooks' }, () => ({ contents: ['useState', 'useEffect', 'useMemo', 'useRef', 'useId'].map(name => `export const ${name}=(...args)=>globalThis.__workshopHooks.${name}(...args);`).join('\n') }));
    api.onLoad({ filter: /.*/, namespace: 'child' }, () => ({ contents: 'const Child=()=>null; export default Child; export const QuestionBoard=Child;' }));
  } }],
});
const { default: ScenarioWorkshop, PositioningLesson, workshopStorageKey, restoreWorkshopDraft, createWorkshopDraft } = await import(output.href);
const boardOutput = new URL('snapshot-board.mjs', output);
await build({ entryPoints: [fileURLToPath(new URL('CoachQuestionLab.jsx', directory))], outfile: fileURLToPath(boardOutput), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent' });
const { QuestionBoard } = await import(boardOutput.href);
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
function mount(props, Screen = PositioningLesson) {
  const slots = []; let cursor = 0, dirty = true, effects = [], tree;
  const hooks = {
    useState(initial) { const i = cursor++; const slot = slots[i] ||= { value: typeof initial === 'function' ? initial() : initial }; slot.set ||= value => { const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; return [slot.value, slot.set]; },
    useRef(value) { return slots[cursor++] ||= { current: value }; },
    useMemo(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useId() { return `workshop-${cursor++}`; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  function flush() { for (let n = 0; dirty; n++) { assert.ok(n < 30); dirty = false; cursor = 0; effects = []; globalThis.__workshopHooks = hooks; try { tree = Screen(props); } finally { delete globalThis.__workshopHooks; } effects.forEach(fn => fn()); } }
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  function find(predicate) { let found; function visit(node) { if (Array.isArray(node)) return node.forEach(visit); if (!node?.props) return; if (predicate(node)) found = node; visit(node.props.children); } visit(tree); return found; }
  flush();
  return { flush, find, text: () => text(tree), click(label) { const button = find(node => node.type === 'button' && text(node) === label); assert.ok(button, label); assert.ok(!button.props.disabled, `${label} enabled`); button.props.onClick(); flush(); }, changeReason(value) { find(node => node.type === 'textarea').props.onChange({ target: { value } }); flush(); }, move(id, point) { find(node => Array.isArray(node.props.editableIds)).props.onMove(id, point); flush(); }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
function environment(run, reduced = false) {
  const names = ['window', 'document', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const prior = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const frames = new Map(), saved = new Map(), listeners = new Map(); let frame = 0;
  const events = { addEventListener(type, fn) { listeners.set(type, fn); }, removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); } };
  globalThis.window = { ...events, matchMedia: () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }) };
  globalThis.document = { ...events, hidden: false, visibilityState: 'visible' };
  globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
  globalThis.requestAnimationFrame = fn => { frames.set(++frame, fn); return frame; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  try { run({ saved, frames, tick(now) { const work = [...frames.values()]; frames.clear(); work.forEach(fn => fn(now)); } }); }
  finally { for (const name of names) { if (prior[name]) Object.defineProperty(globalThis, name, prior[name]); else delete globalThis[name]; } }
}
const template = POSITIONING_TEMPLATES[0];
function playback(t = template) { return advancePositioningPlayback(submitPositioningRead(movePositioningPlayer(createPositioningSession(t.id), t.teamSize === 1 ? { x: 27, y: -6 } : { x: 5, y: -7 }), 'I want room to read the puck.'), .37); }

test('draft restore validates candidate and reason, separates player keys, and safely pauses exact playback', () => {
  assert.notEqual(workshopStorageKey('a:b', template.id), workshopStorageKey('a', template.id));
  assert.notEqual(workshopStorageKey('a', template.id), workshopStorageKey('a', POSITIONING_TEMPLATES[128].id));
  for (const t of [1, 2, 3, 4, 5].map(size => POSITIONING_TEMPLATES.find(item => item.teamSize === size))) {
    const session = playback(t), draft = { ...createWorkshopDraft(t.id), session, reason: 'Unsubmitted draft', paused: false };
    const restored = restoreWorkshopDraft(JSON.stringify(draft), t.id);
    assert.deepEqual(restored.session, session);
    assert.equal(restored.paused, true);
    assert.equal(restored.reason, draft.reason);
    assert.equal(restoreWorkshopDraft(draft, template.id === t.id ? POSITIONING_TEMPLATES[128].id : template.id), null);
    assert.equal(restoreWorkshopDraft({ ...draft, reason: 'x'.repeat(601) }, t.id), null);
    assert.equal(restoreWorkshopDraft({ ...draft, session: { ...session, playbackProgress: NaN } }, t.id), null);
    const tampered = structuredClone(draft); tampered.session.answers[0].beforeState.puck.owner = 'G';
    assert.equal(restoreWorkshopDraft(tampered, t.id), null);
  }
});

test('position and unfinished reason survive unmount, and only the focus player is editable in both views', () => environment(({ saved }) => {
  const key = workshopStorageKey('player-a', template.id), other = workshopStorageKey('player-b', template.id);
  saved.set(other, 'other player bytes');
  const lesson = mount({ template, playerId: 'player-a' });
  const scene = lesson.find(node => Array.isArray(node.props.editableIds));
  const originalBounds = scene.props.bounds;
  assert.deepEqual(scene.props.editableIds, ['D1']);
  assert.deepEqual(scene.props.fallback.props.allowedActorIds, ['D1']);
  assert.equal(scene.props.fallback.props.initialFraming, 'whole', 'the tactical crop remains stable during playback too');
  lesson.move('F1', { x: 7, y: 3 });
  assert.equal(JSON.parse(saved.get(key)).session.point, null);
  lesson.move('D1', { x: 27, y: -6 }); lesson.changeReason('Keep this unfinished reason.'); lesson.unmount();
  const bytes = saved.get(key), restored = JSON.parse(bytes);
  assert.deepEqual(restored.session.point, { x: 27, y: -6 });
  assert.equal(restored.reason, 'Keep this unfinished reason.');
  const reopened = mount({ template, playerId: 'player-a' });
  assert.equal(reopened.find(node => node.type === 'textarea').props.value, restored.reason);
  assert.deepEqual(reopened.find(node => Array.isArray(node.props.editableIds)).props.state, positioningState(restored.session));
  reopened.unmount(); assert.equal(saved.get(key), bytes); assert.equal(saved.get(other), 'other player bytes');
  const moved = mount({ template, playerId: 'bounds' });
  moved.move('D1', { x: 4, y: -6 });
  assert.strictEqual(moved.find(node => Array.isArray(node.props.editableIds)).props.bounds, originalBounds, 'placement cannot change the camera fit dependencies');
  assert.equal(originalBounds.minX, 0); moved.unmount();
}));

test('restored playback waits, Resume advances from saved frame, Pause and unmount retain original answers', () => environment(({ saved, frames, tick }) => {
  const session = playback(), key = workshopStorageKey('pause-player', template.id);
  saved.set(key, JSON.stringify({ ...createWorkshopDraft(template.id), session, paused: false }));
  const lesson = mount({ template, playerId: 'pause-player' });
  assert.equal(frames.size, 0);
  assert.deepEqual(lesson.find(node => Array.isArray(node.props.editableIds)).props.editableIds, []);
  lesson.click('Resume'); tick(1000); lesson.flush(); tick(1260); lesson.flush(); lesson.click('Pause');
  const paused = JSON.parse(saved.get(key));
  assert.ok(Math.abs(paused.session.playbackProgress - .47) < 1e-9);
  assert.deepEqual(paused.session.answers, session.answers); assert.equal(paused.paused, true);
  const sceneBefore = positioningState(paused.session); lesson.unmount(); assert.equal(frames.size, 0);
  const reopened = mount({ template, playerId: 'pause-player' });
  assert.deepEqual(reopened.find(node => Array.isArray(node.props.editableIds)).props.state, sceneBefore);
  reopened.click('Go to next read');
  assert.equal(JSON.parse(saved.get(key)).session.readIndex, 1);
  assert.equal(reopened.find(node => node.type === 'textarea').props.value, '');
  reopened.unmount();
}));

test('illustration rejection preserves the point and reason without grading it', () => environment(({ saved }) => {
  const key = workshopStorageKey('blocked', template.id), lesson = mount({ template, playerId: 'blocked' });
  const f1 = template.initialState.actors.find(actor => actor.id === 'F1');
  lesson.move('D1', { x: f1.x, y: f1.y }); lesson.changeReason('I want to meet the carrier.');
  const before = saved.get(key); lesson.click('See what happens next');
  assert.equal(saved.get(key), before);
  assert.match(lesson.text(), /illustration|overlap/i);
  assert.equal(lesson.find(node => node.type === 'textarea').props.value, 'I want to meet the carrier.');
  assert.equal(JSON.parse(saved.get(key)).session.answers.length, 0); lesson.unmount();
}));

test('normal playback reaches the next authored freeze and unmount flushes the exact intermediate frame', () => environment(({ saved, frames, tick }) => {
  const key = workshopStorageKey('normal', template.id), lesson = mount({ template, playerId: 'normal' });
  lesson.move('D1', { x: 27, y: -6 }); lesson.changeReason('Keep room between us.'); lesson.click('See what happens next');
  assert.equal(frames.size, 1);
  tick(1000); lesson.flush(); tick(1962); lesson.flush();
  const scene = lesson.find(node => Array.isArray(node.props.editableIds)).props.state;
  lesson.unmount();
  const midway = JSON.parse(saved.get(key));
  assert.ok(Math.abs(midway.session.playbackProgress - .37) < 1e-9);
  assert.deepEqual(positioningState(midway.session), scene);
  const reopened = mount({ template, playerId: 'normal' });
  assert.equal(frames.size, 0); reopened.click('Resume');
  tick(4000); reopened.flush(); tick(5638); reopened.flush();
  const next = JSON.parse(saved.get(key));
  assert.equal(next.session.phase, 'read'); assert.equal(next.session.readIndex, 1);
  assert.deepEqual(next.session.answers, midway.session.answers);
  assert.deepEqual(positioningState(next.session).actors.find(actor => actor.id === 'D1'), scene.actors.find(actor => actor.id === 'D1'));
  assert.equal(frames.size, 0); reopened.unmount();
}));

test('reduced motion completes three real reads manually and resetting changes only this candidate', () => environment(({ saved, frames }) => {
  const t = POSITIONING_TEMPLATES.find(item => item.teamSize === 3), key = workshopStorageKey('manual', t.id);
  const other = workshopStorageKey('manual', template.id); saved.set(other, 'another candidate');
  const lesson = mount({ template: t, playerId: 'manual' });
  for (let read = 0; read < 3; read++) {
    lesson.move('F2', { x: 5, y: -7 }); lesson.changeReason(`Reason for read ${read + 1}.`);
    lesson.click(read === 2 ? 'Save my three reads' : 'See what happens next');
    assert.equal(frames.size, 0);
    if (read < 2) lesson.click('Go to next read');
  }
  const complete = JSON.parse(saved.get(key));
  assert.equal(complete.session.phase, 'complete'); assert.equal(complete.session.answers.length, 3);
  assert.equal(positioningState(complete.session).puck.owner, 'F3');
  assert.ok(!lesson.find(node => node.type === 'textarea'));
  lesson.click('Start this situation over');
  assert.deepEqual(JSON.parse(saved.get(key)).session, createPositioningSession(t.id));
  assert.equal(saved.get(other), 'another candidate'); lesson.unmount();
}, true));

test('the tactical fallback receives the exact in-flight pass snapshot instead of resampling an unowned director puck', () => environment(({ saved }) => {
  const t = POSITIONING_TEMPLATES.find(item => item.teamSize === 3);
  let session = advancePositioningPlayback(playback(t), 1);
  session = advancePositioningPlayback(submitPositioningRead(movePositioningPlayer(session, { x: 5, y: -7 }), 'Be ready for the new carrier.'), .5);
  saved.set(workshopStorageKey('pass', t.id), JSON.stringify({ ...createWorkshopDraft(t.id), session }));
  const lesson = mount({ template: t, playerId: 'pass' });
  const scene = lesson.find(node => Array.isArray(node.props.editableIds));
  assert.equal(scene.props.state.puck.owner, null);
  assert.notDeepEqual(scene.props.state.puck, { owner: null, x: 0, y: 0 });
  assert.deepEqual(scene.props.fallback.props.snapshotState, positioningState(session));
  assert.deepEqual(scene.props.fallback.props.snapshotState.puck, scene.props.state.puck);
  lesson.unmount();
}));

test('explicit phone links select the intended exercise while retaining the selected candidate', () => environment(({ saved }) => {
  const t = POSITIONING_TEMPLATES.find(item => item.teamSize === 4);
  saved.set('rinkreads_scenario_workshop_ui_v1:links', JSON.stringify({ templateId: t.id, mode: 'explore' }));
  window.location = { search: '?arena=sgs' };
  const positioning = mount({ playerId: 'links' }, ScenarioWorkshop);
  assert.match(positioning.text(), /Three connected reads/);
  assert.equal(positioning.find(node => node.type === 'select').props.value, t.id);
  positioning.unmount();
  window.location = { search: '?arena=sgs&sgs=discover' };
  const discover = mount({ playerId: 'links' }, ScenarioWorkshop);
  assert.match(discover.text(), /Explore the rink/);
  assert.ok(!discover.find(node => node.type === 'select'));
  discover.click('U11 · Position & explain');
  assert.equal(discover.find(node => node.type === 'select').props.value, t.id);
  discover.unmount();
}));

test('actual SVG fallback renders every flight puck at its exact snapshot coordinates and default director rendering is unchanged', () => {
  const puckFrom = html => {
    const match = html.match(/class="cq-puck" cx="([^"]+)" cy="([^"]+)"/);
    assert.ok(match, 'the actual visible puck must be rendered');
    return { x: Number(match[1]), y: Number(match[2]) };
  };
  for (const size of [3, 4, 5]) {
    const t = POSITIONING_TEMPLATES.find(item => item.teamSize === size);
    const readTwo = advancePositioningPlayback(playback(t), 1);
    const passing = submitPositioningRead(movePositioningPlayer(readTwo, { x: 5, y: -7 }), 'See the new passing option.');
    for (const progress of [0, .25, .5, .75, 1]) {
      const session = advancePositioningPlayback(passing, progress), state = positioningState(session);
      const draft = stateToStaticDirectorDraft(state, 'Actual pass snapshot'), before = JSON.stringify({ state, draft });
      const html = renderToStaticMarkup(createElement(QuestionBoard, { draft, snapshotState: state, title: 'Actual pass snapshot', selected: 'F2', allowedActorIds: [], view: 'half-right' }));
      assert.deepEqual(puckFrom(html), { x: state.puck.x, y: state.puck.y }, `${size}v${size} at ${progress}`);
      for (const actor of state.actors) assert.ok(html.includes(`translate(${actor.x} ${actor.y})`));
      assert.doesNotMatch(html, /<canvas/);
      assert.equal(JSON.stringify({ state, draft }), before);
      const defaultHtml = renderToStaticMarkup(createElement(QuestionBoard, { draft, title: 'Director default' }));
      const sampled = sampleDraft(draft, 0).puck;
      assert.deepEqual(puckFrom(defaultHtml), { x: sampled.x, y: sampled.y }, 'callers without snapshotState keep existing director sampling');
    }
  }
});

test('the fresh 1v1 demo opens a representative whose 27 button paths can all be illustrated without changing catalog order', () => environment(() => {
  const workshop = mount({ playerId: 'fresh-demo' }, ScenarioWorkshop);
  const templateId = workshop.find(node => node.type === 'select').props.value;
  assert.equal(templateId, 'positioning-1v1-009-v1');
  assert.equal(POSITIONING_TEMPLATES[0].id, 'positioning-1v1-001-v1');
  let completions = 0;
  function visit(session, depth) {
    for (const choice of ['stay', 'back', 'forward']) {
      const next = submitPositioningRead(movePositioningPlayer(session, positionChoicePoint(session, choice)), 'I am reading the carrier and my net.');
      if (depth === 2) { assert.equal(next.phase, 'complete'); completions++; }
      else visit(advancePositioningPlayback(next, 1), depth + 1);
    }
  }
  visit(createPositioningSession(templateId), 0); assert.equal(completions, 27);
  workshop.unmount();
}));
