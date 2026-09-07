import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ANIMATED_PLAYS } from './playCatalog.js';
import { animatedActionIntents } from './animatedActionIntents.js';

test('nine explicit action reads map18 taps to existing source options without creating carry answers', () => {
  let reads = 0, correct = 0, incorrect = 0;
  for (const play of ALL_ANIMATED_PLAYS) for (const node of Object.values(play.nodes)) {
    const intents = animatedActionIntents(play, node); if (!intents.length) continue; reads++;
    assert.equal(intents.length, 2);
    for (const intent of intents) {
      assert.ok(node.ask.opts.includes(intent.option)); assert.ok(play.nodes[intent.option.next]);
      if (intent.option.ok) correct++; else incorrect++;
      if (intent.kind === 'pass') assert.equal(play.actors.find(actor => actor.id === intent.actorId).team, play.actors.find(actor => actor.id === node.decisionActor).team);
      else { assert.equal(intent.kind, 'shoot'); assert.equal(intent.goalSide, 'right'); }
    }
  }
  assert.equal(reads, 9); assert.equal(correct, 9); assert.equal(incorrect, 9);
});

test('missing source options, changed identities and defensive reads never acquire inferred tap actions', () => {
  const play = ALL_ANIMATED_PLAYS.find(item => item.id === 'play_2v1_backdoor_read_u11_v1'), node = play.nodes.rush;
  assert.deepEqual(animatedActionIntents(play, { ...node, decisionActor: 'D1' }), []);
  assert.deepEqual(animatedActionIntents(play, { ...node, ask: { ...node.ask, opts: node.ask.opts.filter(opt => opt.id !== 'pass_backdoor') } }), []);
  assert.deepEqual(animatedActionIntents({ ...play, id: 'new-unbound-read' }, node), []);
  assert.deepEqual(animatedActionIntents({ ...play, actors: play.actors.map(actor => actor.id === 'F2' ? { ...actor, team: 'away' } : actor) }, node), []);
});
