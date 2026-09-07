import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from './readSequenceCore.js';

const reason = 'I noticed space beside the defender.';

function firstChoice(definition, action) {
  return core.submitFirstRead(core.createReadSequenceSession(definition.id), { action, reason });
}

function secondChoice(definition, action, targetId) {
  return core.selectSecondRead(core.advanceSequencePlayback(firstChoice(definition, action), 1), targetId);
}

test('every first consequence starts at the exact owned opening and transfers possession only on arrival', () => {
  for (const definition of core.READ_SEQUENCE_CATALOG) {
    for (const [action, branch] of Object.entries(definition.branches)) {
      const session = firstChoice(definition, action);
      const snapshot = structuredClone(session);
      assert.deepEqual(core.currentSequenceState(session), definition.initialState, `${definition.ageBand} ${action}: initial frame`);
      for (const progress of [.001, .5, .999]) {
        const frame = core.currentSequenceState(core.advanceSequencePlayback(session, progress));
        assert.equal(frame.puck.owner, action === 'carry' ? 'F1' : null);
      }
      assert.deepEqual(core.currentSequenceState(core.advanceSequencePlayback(session, 1)), branch.state);
      assert.deepEqual(session, snapshot);
    }
  }
});

test('all 15 second consequences begin at their actual prior freeze and end at the selected target', () => {
  for (const definition of core.READ_SEQUENCE_CATALOG) {
    for (const [action, branch] of Object.entries(definition.branches)) {
      for (const target of branch.read2.targets) {
        const session = secondChoice(definition, action, target.id);
        assert.deepEqual(core.currentSequenceState(session), branch.state, `${definition.ageBand} ${action}/${target.id}: prior freeze`);
        const transitOwner = branch.state.puck.owner === target.state.puck.owner ? branch.state.puck.owner : null;
        for (const progress of [.001, .5, .999]) {
          assert.equal(core.currentSequenceState(core.advanceSequencePlayback(session, progress)).puck.owner, transitOwner);
        }
        const arrived = core.advanceSequencePlayback(session, 1);
        assert.deepEqual(core.currentSequenceState(arrived), target.state);
        assert.notEqual(arrived.third.actorId, target.state.puck.owner, 'Read three must move an off-puck player');
      }
    }
  }
});

test('unclaimed stationary pucks do not invent motion during either authored support movement', () => {
  const cases = [
    [core.U11_READ_SEQUENCE, 'rebound-space', { owner: null, x: 21.2, y: -2.1 }],
    [core.U11_READ_SEQUENCE, 'high-support', { owner: null, x: 21.2, y: -2.1 }],
    [core.U13_READ_SEQUENCE, 'inside-support', { owner: null, x: 23.2, y: 3.2 }],
    [core.U13_READ_SEQUENCE, 'wide-support', { owner: null, x: 23.2, y: 3.2 }],
  ];
  for (const [definition, targetId, puck] of cases) {
    const session = secondChoice(definition, 'shoot', targetId);
    for (let step = 0; step <= 100; step++) {
      assert.deepEqual(core.currentSequenceState(core.advanceSequencePlayback(session, step / 100)).puck, puck);
    }
  }
});

test('replaying from read two stops at the first consequence without starting an unchosen action', () => {
  for (const definition of core.READ_SEQUENCE_CATALOG) {
    for (const action of Object.keys(definition.branches)) {
      const readTwo = core.advanceSequencePlayback(firstChoice(definition, action), 1);
      const replay = core.replayFirstConsequence(readTwo);
      assert.equal(core.isSequencePlaybackPhase(replay.phase), true);
      const finished = core.advanceSequencePlayback(replay, 1);
      assert.equal(core.isSequencePlaybackPhase(finished.phase), false);
      assert.deepEqual(finished, readTwo);
    }
  }
});

test('all completed branches replay both actual consequences and preserve route, comparison and serialized answers', () => {
  for (const definition of core.READ_SEQUENCE_CATALOG) {
    for (const [action, branch] of Object.entries(definition.branches)) {
      for (const target of branch.read2.targets) {
        const readThree = core.advanceSequencePlayback(secondChoice(definition, action, target.id), 1);
        const routed = core.setThirdReadRoute(readThree, [{ x: 19, y: -7 }, { x: 20, y: -6 }]);
        let completed = core.submitThirdRead(routed, reason);
        if (definition.id === core.U11_READ_SEQUENCE.id) {
          completed = core.submitChangedCueRead(completed, { action: 'carry', reason });
        }
        for (const original of [readThree, routed, completed]) {
          const snapshot = structuredClone(original);
          const saved = original.phase === 'complete' ? core.serializeReadSequence(original) : null;
          const replay = core.replayFirstConsequence(original);
          const second = core.advanceSequencePlayback(replay, 1);
          assert.equal(second.phase, 'replay-2', `${definition.ageBand} ${action}/${target.id}`);
          assert.deepEqual(core.currentSequenceState(replay), definition.initialState);
          assert.equal(second.playbackProgress, 0);
          assert.equal(second.replayReturnPhase, original.phase);
          assert.equal(core.isSequencePlaybackPhase(second.phase), true);
          assert.deepEqual(core.currentSequenceState(second), branch.state, 'First arrival must remain visible before the second action');
          assert.equal(core.getThirdReadRoute(second), null, 'A saved route must not replace the second consequence');
          assert.deepEqual(second.third, original.third);
          const middle = core.advanceSequencePlayback(second, .5);
          const ordinaryMiddle = core.advanceSequencePlayback(secondChoice(definition, action, target.id), .5);
          assert.deepEqual(core.currentSequenceState(middle), core.currentSequenceState(ordinaryMiddle));
          assert.throws(() => core.selectSecondRead(middle, target.id), /Finish the first consequence/);
          const finished = core.advanceSequencePlayback(second, 1);
          assert.equal(core.isSequencePlaybackPhase(finished.phase), false);
          assert.deepEqual(finished, original);
          assert.deepEqual(original, snapshot);
          if (saved) {
            assert.equal(core.serializeReadSequence(finished), saved);
            assert.deepEqual(core.restoreReadSequence(saved, definition.id), original);
          }
        }
      }
    }
  }
});
