import test from 'node:test';
import assert from 'node:assert/strict';
import { READ_SEQUENCE_CATALOG, createReadSequenceSession, submitFirstRead, advanceSequencePlayback, selectSecondRead, currentSequenceState } from './readSequenceCore.js';
import { thirdReadTeaching, possessionSentence } from './readSequenceTeaching.js';

test('every connected branch asks recovery or support from the actual possession freeze', () => {
  let count = 0;
  for (const definition of READ_SEQUENCE_CATALOG) for (const [action, branch] of Object.entries(definition.branches)) {
    const first = advanceSequencePlayback(submitFirstRead(createReadSequenceSession(definition.id), { action, reason: 'I can see the players and puck.' }), 1);
    for (const target of branch.read2.targets) {
      const session = advanceSequencePlayback(selectSecondRead(first, target.id), 1);
      const before = JSON.stringify(session);
      const state = currentSequenceState(session);
      const copy = thirdReadTeaching(session);
      assert.notEqual(session.third.actorId, state.puck.owner, `${definition.id}/${action}/${target.id}: mover must be off puck`);
      assert.equal(copy.kind, state.puck.owner ? 'support' : 'recovery');
      if (!state.puck.owner) {
        assert.match(copy.prompt, /puck is still loose/);
        assert.match(copy.reasonLabel, /Who will get the puck/);
        assert.doesNotMatch(copy.prompt, /shoot|pass to|player with the puck/i);
      } else assert.match(copy.prompt, /have the puck|has the puck/);
      assert.equal(JSON.stringify(session), before, 'teaching copy cannot mutate a lesson');
      count++;
    }
  }
  assert.equal(count, 15);
});

test('the reported U11 shot then high-support path stays a loose-puck decision', () => {
  let session = advanceSequencePlayback(submitFirstRead(createReadSequenceSession(), { action: 'shoot', reason: 'I saw a shooting lane.' }), 1);
  session = advanceSequencePlayback(selectSecondRead(session, 'high-support'), 1);
  assert.equal(currentSequenceState(session).puck.owner, null);
  assert.equal(possessionSentence(currentSequenceState(session)), 'The puck is loose. No player has possession.');
  assert.match(thirdReadTeaching(session, { routeMode: true }).prompt, /Plan a path for YOU/);
  assert.match(thirdReadTeaching(session).finalCue, /did not award possession/);
});
