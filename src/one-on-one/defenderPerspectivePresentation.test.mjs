import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createReadSequenceSession, submitFirstRead, advanceSequencePlayback, stateToStaticDirectorDraft } from './readSequenceCore.js';
import { createDefenderPerspective, defenderPerspectiveState, moveDefenderPerspective, submitDefenderPerspective, serializeDefenderPerspective } from './defenderPerspectiveCore.js';

const cache = new URL('../../node_modules/.cache/defender-perspective/', import.meta.url);
mkdirSync(cache, { recursive: true });
const components = {};
for (const [name, file] of [['panel', 'DefenderPerspective.jsx'], ['board', 'CoachQuestionLab.jsx']]) {
  const output = new URL(`${name}.mjs`, cache);
  await build({ entryPoints: [fileURLToPath(new URL(file, import.meta.url))], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent' });
  components[name] = await import(output.href);
}
const Panel = components.panel.default;
const { QuestionBoard } = components.board;
const first = submitFirstRead(createReadSequenceSession(), { action: 'pass', reason: 'F2 is available.' });
const freeze = advanceSequencePlayback(first, 1);

test('the real UI offers an explicit role handoff only once the puck arrives', () => {
  for (const session of [createReadSequenceSession(), advanceSequencePlayback(first, .5)]) {
    assert.equal(renderToStaticMarkup(createElement(Panel, { session })), '');
  }
  const html = renderToStaticMarkup(createElement(Panel, { session: freeze }));
  assert.match(html, /PASS COMPLETE · F2 HAS THE PUCK/);
  assert.match(html, /Read D1’s next move/);
  assert.doesNotMatch(html, /<svg|<canvas|YOU ARE D1/);
});

test('D1 display uses the real SVG locator and only D1 receives movement controls', () => {
  const attempt = createDefenderPerspective(freeze);
  const state = defenderPerspectiveState(attempt);
  const html = renderToStaticMarkup(createElement(QuestionBoard, {
    draft: stateToStaticDirectorDraft(state), snapshotState: state, selected: 'D1', focusActorId: 'D1',
    onMove: () => assert.fail('Rendering cannot move an actor.'), onSelect: () => {},
    editableTeam: 'away', allowedActorIds: ['D1'], view: 'half-right', title: 'Defender perspective',
  }));
  assert.equal((html.match(/data-player-locator="D1"/g) || []).length, 1);
  assert.equal((html.match(/role="button"/g) || []).length, 1);
  assert.match(html, /aria-label="D1, away skater\. Arrow keys move this player\."[^>]*>[\s\S]*?data-player-locator="D1"/);
  assert.match(html, /aria-label="F1, home skater"/);
  assert.equal(state.puck.owner, 'F2');
});

test('a named D4 question highlights D4 in a readonly SVG even when YOU and the puck carrier differ', () => {
  const state = defenderPerspectiveState(createDefenderPerspective(freeze));
  state.actors.find(actor => actor.id === 'F1').label = 'YOU';
  const defender = state.actors.find(actor => actor.id === 'D1');
  defender.id = 'D4'; defender.label = 'D4';
  const before = JSON.stringify(state);
  const html = renderToStaticMarkup(createElement(QuestionBoard, {
    draft: stateToStaticDirectorDraft(state), snapshotState: state, selected: 'F2', focusActorId: 'D4',
    editableTeam: 'away', view: 'half-right', title: 'What should D4 be looking to do?',
  }));
  assert.equal((html.match(/data-player-locator=/g) || []).length, 1);
  assert.match(html, /data-player-locator="D4"/);
  assert.doesNotMatch(html, /role="button"/);
  assert.equal(JSON.stringify(state), before);
});

test('a saved defender position with an empty optional reason can be reopened after page reload', () => {
  const complete = submitDefenderPerspective(moveDefenderPerspective(createDefenderPerspective(freeze), 'D1', { x: 18, y: 0 }, 'rink'));
  const previous = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => serializeDefenderPerspective(complete) };
  try {
    const html = renderToStaticMarkup(createElement(Panel, { session: createReadSequenceSession() }));
    assert.match(html, /SAVED DEFENDER PERSPECTIVE/);
    assert.match(html, /Reopen saved defender read/);
    assert.doesNotMatch(html, /PASS COMPLETE/);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});
