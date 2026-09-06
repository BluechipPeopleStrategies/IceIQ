import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const cache = new URL('../../node_modules/.cache/learning-worlds/', import.meta.url);
mkdirSync(cache, { recursive: true });
const coreOutput = new URL('core.mjs', cache);
await build({ entryPoints: [fileURLToPath(new URL('./learningWorldsCore.js', import.meta.url))], outfile: fileURLToPath(coreOutput), bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent' });
const { getLearningWorlds, missionAvailability, LEARNING_ACTIVITIES, learningActivitiesForAge } = await import(coreOutput.href);
const ledger = JSON.parse(readFileSync(new URL('../data/curriculum-ledger.json', import.meta.url), 'utf8'));
const pack = JSON.parse(readFileSync(new URL('./curriculum-draft.json', import.meta.url), 'utf8'));

test('all six worlds use canonical domains and every age has exactly its ledger missions', () => {
  for (const band of ledger.meta.ageBands) {
    const result = getLearningWorlds(`${band} / Age name`);
    assert.equal(result.band, band);
    assert.deepEqual(result.worlds.map(world => world.id), ledger.domains.map(domain => domain.id));
    assert.deepEqual(result.worlds.map(world => world.art), [0, 1, 2, 3, 4, 5]);
    const missions = result.worlds.flatMap(world => world.missions);
    assert.deepEqual(missions.map(mission => mission.id).sort(), ledger.nodes.filter(node => node.ageId === band).map(node => node.id).sort());
    for (const world of result.worlds) for (const mission of world.missions) {
      assert.equal(ledger.concepts.find(concept => concept.id === mission.conceptId).domainId, world.id);
      assert.ok(mission.title && mission.objective);
      assert.equal(mission.completed, undefined); assert.equal(mission.rank, undefined); assert.equal(mission.stars, undefined);
    }
  }
  assert.equal(getLearningWorlds('not-an-age').band, 'U11');
});

test('authored starter availability follows concept identity, with younger foundations separate from future missions', () => {
  for (const band of ledger.meta.ageBands) {
    const worlds = getLearningWorlds(band).worlds;
    const linked = worlds.flatMap(world => [...world.missions.flatMap(mission => mission.guidedLessons), ...world.foundations]);
    assert.deepEqual(linked.map(lesson => lesson.id).sort(), pack.lessons.filter(lesson => lesson.ageBand === band).map(lesson => lesson.id).sort());
    for (const world of worlds) for (const mission of world.missions) for (const lesson of mission.guidedLessons) {
      assert.equal(lesson.conceptId, mission.conceptId);
      assert.equal(lesson.ageBand, band);
      assert.equal(lesson.questionCount, 1, 'deferred habit questions do not count as playable scenarios');
    }
  }
  const young = getLearningWorlds('U7').worlds;
  assert.equal(young.find(world => world.id === 'defensive-play').missions.length, 0);
  assert.ok(young.find(world => world.id === 'hockey-sense').missions.find(mission => mission.conceptId === 'reading-the-play').guidedLessons.some(lesson => lesson.id === 'practice-draft-u7-guard-way'));
  assert.deepEqual(young.find(world => world.id === 'offensive-play').foundations.map(lesson => lesson.id), ['practice-draft-u7-open-friend']);
});

test('availability counts only real library items matching both the selected age and supported concept filter', () => {
  const library = [
    { key: 'u11-passing', age: 'U11 / Atom', concept: 'passing', type: 'mc' },
    { key: 'u18-passing', age: 'U18 / Midget', concept: 'passing', type: 'mc' },
    { key: 'u11-other', age: 'U11 / Atom', concept: 'receiving', source: { concepts: ['passing'] } },
  ];
  const worlds = getLearningWorlds('U11', { library }).worlds;
  const passing = worlds.flatMap(world => world.missions).find(mission => mission.conceptId === 'passing');
  assert.equal(passing.libraryCount, 1);
  assert.equal(missionAvailability(passing, 'ready'), 'library');
  const empty = worlds.flatMap(world => world.missions).find(mission => mission.conceptId === 'edges-balance');
  assert.equal(missionAvailability(empty, 'ready'), 'study');
  assert.equal(missionAvailability(empty, 'loading'), 'loading');
  assert.equal(missionAvailability(empty, 'error'), 'unknown');
  assert.deepEqual(LEARNING_ACTIVITIES.map(activity => activity.id), ['guided', 'library', 'discover', 'choose', 'position', 'play', 'brain']);
});

const source = fileURLToPath(new URL('./LearningWorlds.jsx', import.meta.url));
const componentOutput = new URL('component.mjs', cache);
await build({ entryPoints: [source], outfile: fileURLToPath(componentOutput), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'worlds-view-tests', setup(api) {
  api.onResolve({ filter: /^react$/ }, () => ({ path: 'hooks', namespace: 'world-hooks' }));
  api.onLoad({ filter: /.*/, namespace: 'world-hooks' }, () => ({ contents: ['useState', 'useEffect', 'useRef', 'useId'].map(name => `export const ${name}=(...args)=>globalThis.__worldHooks.${name}(...args);`).join('\n') }));
  api.onResolve({ filter: /(?:qbLoader|playCatalog)\.js$/ }, args => ({ path: args.path, namespace: 'world-catalog' }));
  api.onLoad({ filter: /.*/, namespace: 'world-catalog' }, () => ({ contents: 'export const loadQB=async()=>({}); export const ALL_ANIMATED_PLAYS=[];' }));
} }] });
const { LearningWorldsView } = await import(componentOutput.href);

function mount(props = {}) {
  const slots = [], navigations = []; let cursor = 0, tree;
  const hooks = {
    useState(initial) { const slot = slots[cursor++] ||= { value: typeof initial === 'function' ? initial() : initial }; return [slot.value, value => { slot.value = typeof value === 'function' ? value(slot.value) : value; }]; },
    useRef(initial) { return slots[cursor++] ||= { current: initial }; },
    useId() { return 'world-test'; },
  };
  let current = { ageBand: 'U11', library: [], libraryStatus: 'ready', onNavigate: action => navigations.push(action), onAgeChange: ageBand => { current.ageBand = ageBand; }, ...props };
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  function render() { cursor = 0; globalThis.__worldHooks = hooks; try { tree = LearningWorldsView(current); } finally { delete globalThis.__worldHooks; } }
  function all(predicate) {
    const found = [];
    const visit = node => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node?.props) return;
      if (predicate(node)) found.push(node);
      if (typeof node.type === 'function') return visit(node.type(node.props));
      visit(node.props.children);
    };
    visit(tree);
    return found;
  }
  render();
  return { all, navigations, text: () => text(tree), setProps(next) { current = { ...current, ...next }; render(); }, clickWhere(predicate) { const button = all(node => node.type === 'button' && predicate(node))[0]; assert.ok(button); button.props.onClick(); render(); }, changeAge(value) { all(node => node.type === 'select')[0].props.onChange({ target: { value } }); render(); } };
}

test('selecting worlds reveals actual missions, real actions, and no invented completion or awards', () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw Error('world browsing must not read saved attempts'); }, setItem() { throw Error('world browsing must not award progress'); } };
  try {
    const component = mount();
    assert.equal(component.all(node => node.props['data-world-id']).length, 6);
    component.clickWhere(node => node.props['data-world-id'] === 'skating-movement');
    assert.match(component.text(), /Spot who can react/);
    assert.match(component.text(), /No matching guided or library lesson for U11 yet/);
    assert.doesNotMatch(component.text(), /Start mission|Mastered|Unlocked|\bXP\b|★|\bCaptain\b|physical skill mastery/);
    component.clickWhere(node => node.props['data-world-id'] === 'hockey-sense');
    component.clickWhere(node => node.props['data-mission-id'] === 'scanning');
    component.clickWhere(node => node.props['data-lesson-id'] === 'practice-draft-u11-check-both-sides');
    assert.deepEqual(component.navigations.at(-1), { tab: 'learn', learn: 'guided', ageBand: 'U11', lessonId: 'practice-draft-u11-check-both-sides' });
    for (const activity of learningActivitiesForAge('U11')) component.clickWhere(node => node.props['data-activity-id'] === activity.id);
    assert.equal(component.navigations.length, 7);
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});

test('changing age removes unavailable formal missions while retaining all six domains and an honest empty state', () => {
  const component = mount();
  component.clickWhere(node => node.props['data-world-id'] === 'defensive-play');
  component.clickWhere(node => node.props['data-mission-id'] === 'gap-control');
  component.changeAge('U7');
  assert.equal(component.all(node => node.props['data-world-id']).length, 6);
  assert.equal(component.all(node => node.props['data-mission-id']).length, 0);
  assert.match(component.text(), /No separate missions for U7 in this world yet/);
  component.clickWhere(node => node.props['data-world-id'] === 'offensive-play');
  assert.ok(component.all(node => node.props['data-lesson-id'] === 'practice-draft-u7-open-friend').length);
  component.changeAge('U18');
  assert.equal(component.all(node => node.props['data-mission-id']).length, 7);
});

test('loading and failed inventory do not announce an unavailable mission or offer a fake start', () => {
  const component = mount({ libraryStatus: 'loading' });
  component.clickWhere(node => node.props['data-world-id'] === 'puck-skills');
  assert.match(component.text(), /Checking the lesson library/);
  assert.doesNotMatch(component.text(), /No matching guided or library lesson/);
  component.setProps({ libraryStatus: 'error' });
  assert.match(component.text(), /Library availability could not be checked/);
  assert.doesNotMatch(component.text(), /Start mission/);
});

test('a home deep link opens the requested real world with a safe fallback for an unknown domain', () => {
  const linked = mount({ ageBand: 'U13', initialWorldId: 'defensive-play' });
  assert.equal(linked.all(node => node.props['data-world-id'] === 'defensive-play' && node.props['aria-pressed']).length, 1);
  assert.match(linked.text(), /Manage the space in front/);
  const invalid = mount({ initialWorldId: 'invented' });
  assert.equal(invalid.all(node => node.props['data-world-id'] === 'hockey-sense' && node.props['aria-pressed']).length, 1);
});

test('older age pathways promote decisions rather than beginner rink discovery', () => {
 for(const age of ['U11','U13','U15','U18','U15 / Bantam']) {
  const activities=learningActivitiesForAge(age);
  assert.ok(!activities.some(a=>a.id==='discover'));
  assert.ok(activities.some(a=>a.id==='library'));
  assert.ok(activities.some(a=>a.id==='choose'));
 }
 for(const age of ['U7','U9','U9 / Novice']) assert.ok(learningActivitiesForAge(age).some(a=>a.id==='discover'));
});

test('U11 and older world views do not send missing missions to rink discovery', () => {
 for(const ageBand of ['U11','U13','U15','U18']) {
  const view=mount({ageBand});
  assert.doesNotMatch(view.text(), /Explore the rink|Get to know the ice/);
 }
});
