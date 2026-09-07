import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { READ_SEQUENCE_CATALOG, U11_READ_SEQUENCE } from '../one-on-one/readSequenceCore.js';
import { createReadSceneFrame } from '../one-on-one/readSequenceVisuals.js';

const input = new URL('./PlayerLocator.jsx', import.meta.url);
const cache = new URL('../../node_modules/.cache/player-locator/', import.meta.url);
mkdirSync(cache, { recursive: true });
let locator = {};
if (existsSync(input)) {
  const output = new URL('locator.mjs', cache);
  await build({ entryPoints: [fileURLToPath(input)], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', logLevel: 'silent' });
  locator = await import(output.href);
}
test('learner identity survives readonly, another actor selected and a changed puck owner', () => {
  assert.equal(typeof locator.isLearnerActor, 'function', 'A stable learner identity contract must exist.');
  const actor = { id: 'F1', label: 'YOU', selected: false, hasPuck: false };
  assert.equal(locator.isLearnerActor(actor), true);
  assert.equal(locator.isLearnerActor({ id: 'F2', label: 'F2', selected: true, hasPuck: true }), false);
  assert.equal(locator.isLearnerActor({ id: 'defender' }, 'defender'), true);
  assert.equal(locator.isLearnerActor(actor, 'defender'), false, 'Explicit controlled role overrides a generic label.');
  assert.equal(locator.isLearnerActor(null), false);
});

test('an explicit named focus can be D4 without changing identity, possession or selection', () => {
  assert.equal(typeof locator.isFocusedActor, 'function');
  const actors = [{ id: 'F1', label: 'YOU' }, { id: 'D4', label: 'D4' }, { id: 'F2', label: 'F2', selected: true, hasPuck: true }];
  assert.deepEqual(actors.filter(actor => locator.isFocusedActor(actor, 'D4')).map(actor => actor.id), ['D4']);
  assert.deepEqual(actors.filter(actor => locator.isFocusedActor(actor)).map(actor => actor.id), ['F1']);
  assert.deepEqual(actors.filter(actor => locator.isFocusedActor(actor, 'unknown')), []);
  assert.deepEqual(actors.filter(actor => locator.isFocusedActor(actor, null)), []);
  assert.equal(actors[1].label, 'D4');
});
test('3D players have no persistent halo while SVG identity remains noninteractive', () => {
  assert.equal(typeof locator.PlayerLocator, 'function');
  assert.equal(locator.PlayerLocator(), null);
  const svg = locator.SvgPlayerLocator({ radius: 1.5 });
  assert.equal(svg.props['data-player-locator'], 'YOU');
  assert.equal(svg.props.pointerEvents, 'none');
  assert.equal(svg.props.children.length, 3);
});

const stageOutput = new URL('legacy-stage.mjs', cache);
await build({
  entryPoints: [fileURLToPath(new URL('../one-on-one/ReadSequence.jsx', import.meta.url))],
  outfile: fileURLToPath(stageOutput), bundle: true, packages: 'external',
  platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent',
  // Exercise the real internal renderer without adding a test-only production API.
  plugins: [{ name: 'expose-legacy-rink-stage', setup(builder) {
    builder.onLoad({ filter: /[\\/]ReadSequence\.jsx$/ }, args => ({
      contents: `${readFileSync(args.path, 'utf8')}\nexport { RinkStage };`, loader: 'jsx',
    }));
  } }],
});
const { RinkStage } = await import(stageOutput.href);

function actorMarkup(html, id) {
  const start = html.indexOf(`data-actor="${id}"`);
  assert.ok(start >= 0, `Actor ${id} must be rendered.`);
  const end = html.indexOf('data-actor=', start + 12);
  return html.slice(start, end < 0 ? undefined : end);
}

test('legacy tactical board keeps the learner marked before input and through possession changes', () => {
  const state = structuredClone(U11_READ_SEQUENCE.initialState);
  const learner = state.actors.find(actor => actor.label === 'YOU');
  const teammate = state.actors.find(actor => actor.id !== learner.id && actor.team === learner.team);
  const before = JSON.stringify(state);
  for (const owner of [learner.id, teammate.id, null]) {
    const freeze = { ...state, puck: { ...state.puck, owner } };
    const html = renderToStaticMarkup(createElement(RinkStage, { state: freeze }));
    assert.equal((html.match(/data-player-locator="YOU"/g) || []).length, 1);
    assert.match(actorMarkup(html, learner.id), /data-player-locator="YOU"/);
    assert.doesNotMatch(actorMarkup(html, teammate.id), /data-player-locator="YOU"/);
    assert.doesNotMatch(actorMarkup(html, learner.id), /role="button"|tabindex="0"/);
  }
  assert.equal(JSON.stringify(state), before, 'The locator cannot alter the play.');
});

test('editing a different actor never transfers the legacy learner marker or movement permission', () => {
  const state = structuredClone(U11_READ_SEQUENCE.initialState);
  const learner = state.actors.find(actor => actor.label === 'YOU');
  const teammate = state.actors.find(actor => actor.id !== learner.id && actor.team === learner.team);
  const html = renderToStaticMarkup(createElement(RinkStage, {
    state, moveActorId: teammate.id, onMove: () => assert.fail('Rendering cannot submit movement.'),
  }));
  assert.equal((html.match(/data-player-locator="YOU"/g) || []).length, 1);
  assert.match(actorMarkup(html, learner.id), /data-player-locator="YOU"/);
  assert.doesNotMatch(actorMarkup(html, learner.id), /role="button"|tabindex="0"/);
  assert.doesNotMatch(actorMarkup(html, teammate.id), /data-player-locator="YOU"/);
  assert.match(actorMarkup(html, teammate.id), /role="button"/);
});

test('every authored age and branch keeps the same learner identity in SVG and shared 3D frames', () => {
  for (const definition of READ_SEQUENCE_CATALOG) {
    const states = [definition.initialState, ...Object.values(definition.branches).flatMap(branch => [branch.state, ...branch.read2.targets.map(target => target.state)])];
    for (const state of states) {
      const before = JSON.stringify(state);
      const learnerIds = state.actors.filter(locator.isLearnerActor).map(actor => actor.id);
      const frame = createReadSceneFrame(state, { time: 1.5 });
      assert.deepEqual(frame.actors.filter(locator.isLearnerActor).map(actor => actor.id), learnerIds);
      const html = renderToStaticMarkup(createElement(RinkStage, { state, definition, framingControls: false }));
      assert.equal((html.match(/data-player-locator="YOU"/g) || []).length, learnerIds.length);
      for (const actor of state.actors) {
        assert.equal(actorMarkup(html, actor.id).includes('data-player-locator="YOU"'), learnerIds.includes(actor.id));
      }
      assert.equal(JSON.stringify(state), before);
    }
  }
});
