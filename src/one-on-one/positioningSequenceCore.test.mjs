import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DRAFT_VERSION, sampleDraft, validateDraft } from './director.js';

let core = {};
try { core = await import('./positioningSequenceCore.js'); } catch {}

function template(size = 1) {
  return core.POSITIONING_TEMPLATES.find(item => item.teamSize === size);
}

function safePoint(size) {
  return size === 1 ? { x: 27, y: -6 } : { x: 5, y: -7 };
}

function directorState(state) {
  return {
    version: DRAFT_VERSION, title: 'Positioning geometry check', duration: 1,
    status: 'development-not-validated',
    actors: state.actors.map(actor => ({ ...actor, frozen: false, fixedPose: null, keys: [{ time: 0, x: actor.x, y: actor.y, facing: actor.facing }] })),
    puck: { ...state.puck },
  };
}

test('planning catalog starts at one-on-one and declares 128 reproducible configurations per team format', () => {
  assert.ok(Array.isArray(core.POSITIONING_TEMPLATES), 'The positioning prototype catalog must exist');
  assert.equal(core.POSITIONING_TEMPLATES.length, 640);
  assert.equal(core.POSITIONING_TEMPLATES[0].teamSize, 1);
  assert.equal(new Set(core.POSITIONING_TEMPLATES.map(item => item.id)).size, 640);
  for (let size = 1; size <= 5; size++) {
    const choices = core.POSITIONING_TEMPLATES.filter(item => item.teamSize === size);
    assert.equal(choices.length, 128);
    assert.equal(new Set(choices.map(item => JSON.stringify(item.parameters))).size, 128);
    for (const item of choices) {
      assert.equal(item.ageBand, 'U11');
      assert.equal(item.focusActorId, size === 1 ? 'D1' : 'F2');
      assert.equal(item.status, 'draft-for-coach-review');
      assert.equal(item.proofMode, 'illustrative-not-physics-validated');
      assert.ok(item.sourceRefs.every(source => source.note.startsWith('docs/library/')));
      assert.deepEqual(item.initialState, item.initialState);
      assert.notStrictEqual(item.initialState, item.initialState, 'Lazy states must not share mutable actors');
    }
  }
});

test('every format has exactly the requested visible skaters and one defending goalie', () => {
  for (const item of core.POSITIONING_TEMPLATES) {
    const state = core.positioningState(core.createPositioningSession(item.id));
    for (const team of ['home', 'away']) assert.equal(state.actors.filter(actor => actor.team === team && actor.role === 'skater').length, item.teamSize);
    assert.equal(state.actors.filter(actor => actor.role === 'goalie').length, 1);
    assert.equal(state.actors.find(actor => actor.label === 'YOU').id, item.focusActorId);
    assert.equal(state.puck.owner, 'F1');
    assert.equal(validateDraft(directorState(state)).ok, true, item.id);
  }
});

test('authored opening poses face the actual puck and goalies track its final freeze without changing a placement', () => {
  for (let size = 1; size <= 5; size++) {
    const item = template(size);
    const session = core.createPositioningSession(item.id);
    const opening = core.positioningState(session);
    assert.equal(opening.actors.find(actor => actor.id === 'F1').facing, 0);
    for (const actor of opening.actors.filter(actor => actor.id !== 'F1')) {
      const expected = Math.atan2(opening.puck.y - actor.y, opening.puck.x - actor.x);
      assert.ok(Math.abs(Math.atan2(Math.sin(actor.facing - expected), Math.cos(actor.facing - expected))) < 1e-12, `${item.id} ${actor.id} should face the real puck`);
    }
    assert.ok(new Set(opening.actors.map(actor => actor.facing)).size >= 3, 'The template must not assign only two generic team headings');
    const selected = core.movePositioningPlayer(session, safePoint(size));
    for (const actor of core.positioningState(selected).actors) {
      assert.equal(actor.facing, opening.actors.find(item => item.id === actor.id).facing, 'A placement must not turn anybody implicitly');
    }
    let progressed = selected;
    for (let read = 0; read < 2; read++) {
      if (read) progressed = core.movePositioningPlayer(progressed, safePoint(size));
      progressed = core.advancePositioningPlayback(core.submitPositioningRead(progressed, 'Space to discuss'), 1);
      const state = core.positioningState(progressed), goalie = state.actors.find(actor => actor.id === 'G');
      const expected = Math.atan2(state.puck.y - goalie.y, state.puck.x - goalie.x);
      assert.ok(Math.abs(Math.atan2(Math.sin(goalie.facing - expected), Math.cos(goalie.facing - expected))) < 1e-12);
      assert.ok(state.actors.every(actor => Number.isFinite(actor.facing)));
    }
    assert.match(item.poseProvenance, /authored|puck/i);
  }
});

test('only the focus player can move, Stay means the read origin, and Back/Forward are role-relative', () => {
  for (let size = 1; size <= 5; size++) {
    const item = template(size);
    const session = core.createPositioningSession(item.id);
    const before = core.positioningState(session);
    const origin = before.actors.find(actor => actor.id === item.focusActorId);
    const moved = core.movePositioningPlayer(session, safePoint(size));
    const after = core.positioningState(moved);
    assert.deepEqual(after.puck, before.puck);
    for (const actor of before.actors.filter(actor => actor.id !== item.focusActorId)) assert.deepEqual(after.actors.find(candidate => candidate.id === actor.id), actor);
    assert.deepEqual(core.positionChoicePoint(moved, 'stay'), { x: origin.x, y: origin.y });
    assert.equal(core.positionChoicePoint(moved, 'back').x, origin.x + (size === 1 ? 3 : -3));
    assert.equal(core.positionChoicePoint(moved, 'forward').x, origin.x + (size === 1 ? -3 : 3));
    assert.equal(core.positioningRead(moved).actorId, item.focusActorId);
    assert.match(core.positioningRead(moved).choiceHints.back, /own net/i);
    assert.match(core.positioningRead(moved).directionExplanation, /own net/i);
    assert.deepEqual(core.positioningState(session), before);
    assert.throws(() => core.movePositioningPlayer(session, { x: NaN, y: 1 }), /finite/i);
    assert.throws(() => core.movePositioningPlayer(session, { x: '2', y: 1 }), /finite/i);
    assert.throws(() => core.positionChoicePoint(session, 'shoot'), /Stay|choice/i);
    const bounded = core.positioningState(core.movePositioningPlayer(session, { x: 99, y: 99 }));
    assert.equal(validateDraft(directorState(bounded)).ok, true);
  }
});

test('all configurations produce distinct actual freeze sequences and preserve chosen poses through three reads', () => {
  const signatures = new Map([1, 2, 3, 4, 5].map(size => [size, new Set()]));
  for (const item of core.POSITIONING_TEMPLATES) {
    let session = core.createPositioningSession(item.id);
    const frames = [core.positioningState(session)];
    const initial = structuredClone(session);
    for (let read = 0; read < 3; read++) {
      assert.equal(core.positioningRead(session).number, read + 1);
      assert.equal(core.positioningRead(session).possession, read === 2 && item.teamSize >= 3 ? 'F3' : 'F1');
      const before = core.positioningState(session);
      session = core.movePositioningPlayer(session, safePoint(item.teamSize));
      const positioned = core.positioningState(session);
      const answer = core.submitPositioningRead(session, `My reason for read ${read + 1}`);
      assert.deepEqual(answer.answers[read].beforeState, before);
      assert.deepEqual(answer.answers[read].point, safePoint(item.teamSize));
      assert.equal(answer.answers[read].reason, `My reason for read ${read + 1}`);
      assert.deepEqual(core.positioningState(answer), positioned, 'Submission cannot reset or snap any actor at playback zero');
      if (read < 2) {
        assert.equal(answer.phase, 'playback');
        assert.throws(() => core.movePositioningPlayer(answer, { x: 12, y: 0 }), /read|playing/i);
        for (const progress of [.01, .5, .99]) {
          const state = core.positioningState(core.advancePositioningPlayback(answer, progress));
          assert.equal(state.actors.find(actor => actor.id === item.focusActorId).x, safePoint(item.teamSize).x);
          assert.equal(state.actors.find(actor => actor.id === item.focusActorId).y, safePoint(item.teamSize).y);
          assert.equal(state.puck.owner, read === 1 && item.teamSize >= 3 ? null : 'F1');
          assert.equal(validateDraft(directorState(state)).ok, true);
          if (state.puck.owner) {
            const attached = sampleDraft(directorState(state), 0).puck;
            assert.equal(state.puck.x, attached.x, 'A carry keeps the actual canonical stick offset while turning');
            assert.equal(state.puck.y, attached.y);
          }
        }
        session = core.advancePositioningPlayback(answer, 1);
        const arrived = core.positioningState(session);
        const expectedPuck = sampleDraft(directorState(arrived), 0).puck;
        assert.equal(arrived.puck.x, expectedPuck.x);
        assert.equal(arrived.puck.y, expectedPuck.y);
        frames.push(arrived);
      } else {
        session = answer;
        assert.equal(session.phase, 'complete');
        assert.equal(session.answers.length, 3);
        assert.equal(Object.hasOwn(session, 'score'), false);
        assert.equal(Object.hasOwn(session, 'correct'), false);
      }
    }
    assert.deepEqual(core.createPositioningSession(item.id), initial);
    signatures.get(item.teamSize).add(createHash('sha256').update(JSON.stringify(frames)).digest('hex'));
    assert.deepEqual(core.restorePositioningSession(JSON.stringify(session)), session);
  }
  for (const [size, hashes] of signatures) assert.equal(hashes.size, 128, `${size}v${size}: count actual distinct geometry, not parameter labels`);
});

test('an overlapping placement or blocked illustrated pass cannot fabricate a successful continuation', () => {
  const item = template(3);
  let session = core.createPositioningSession(item.id);
  const carrier = core.positioningState(session).actors.find(actor => actor.id === 'F1');
  const overlap = core.movePositioningPlayer(session, { x: carrier.x, y: carrier.y });
  const snapshot = structuredClone(overlap);
  assert.throws(() => core.submitPositioningRead(overlap, 'I chose this spot'), /overlap|too close/i);
  assert.deepEqual(overlap, snapshot);
  session = core.advancePositioningPlayback(core.submitPositioningRead(core.movePositioningPlayer(session, safePoint(3)), 'Space'), 1);
  const state = core.positioningState(session);
  const receiver = state.actors.find(actor => actor.id === 'F3');
  const receiverPuck = sampleDraft({ ...directorState(state), puck: { owner: 'F3' } }, 0).puck;
  const blocked = core.movePositioningPlayer(session, { x: (state.puck.x + receiverPuck.x) / 2, y: (state.puck.y + receiverPuck.y) / 2 });
  assert.ok(receiver);
  assert.throws(() => core.submitPositioningRead(blocked, 'I want this middle spot'), /pass path|pass line/i);
  assert.equal(core.positioningState(blocked).puck.owner, 'F1');
});

test('a carrier cannot keep an attached puck through the positioned defender body', () => {
  const session = core.createPositioningSession(template(1).id);
  const puck = core.positioningState(session).puck;
  const blocked = core.movePositioningPlayer(session, { x: puck.x, y: puck.y });
  assert.throws(() => core.submitPositioningRead(blocked, 'I would meet the puck here'), /puck/i);
  assert.equal(core.positioningState(blocked).puck.owner, 'F1');
  assert.equal(blocked.phase, 'read', 'The proposed position remains available for discussion');
});

test('Back and Forward stop at rounded boards without silently changing rink width', () => {
  let session = core.createPositioningSession(template(1).id);
  session = core.advancePositioningPlayback(core.submitPositioningRead(core.movePositioningPlayer(session, { x: 27, y: -8 }), 'Defend this side'), 1);
  const point = core.positionChoicePoint(session, 'back');
  assert.equal(point.y, -8);
  assert.ok(point.x > 27 && point.x < 30);
  assert.equal(validateDraft(directorState(core.positioningState(core.movePositioningPlayer(session, point)))).ok, true);
  assert.match(core.positioningRead(session).choiceHints.back, /up to/i);
});

test('restore validates every submitted freeze, holder and actor identity and preserves incomplete drafts', () => {
  let session = core.createPositioningSession(template(1).id);
  assert.deepEqual(core.restorePositioningSession(JSON.stringify(session)), session);
  session = core.movePositioningPlayer(session, safePoint(1));
  assert.deepEqual(core.restorePositioningSession(JSON.stringify(session)), session);
  assert.throws(() => core.submitPositioningRead(session, '   '), /reason/i);
  assert.throws(() => core.submitPositioningRead(session, 'a'.repeat(601)), /600/);
  const playing = core.advancePositioningPlayback(core.submitPositioningRead(session, 'Protect space'), .4);
  assert.deepEqual(core.restorePositioningSession(JSON.stringify(playing)), playing);
  assert.throws(() => core.advancePositioningPlayback(playing, NaN), /finite/i);
  for (const change of [
    value => { value.answers[0].beforeState.puck.owner = 'D1'; },
    value => { value.answers[0].actorId = 'F1'; },
    value => { value.answers[0].origin.x += 1; },
    value => { value.answers[0].point.x = 999; },
    value => { value.templateId = template(2).id; },
    value => { value.readIndex = 7; },
    value => { value.phase = 'complete'; },
    value => { value.phase = 'read'; },
    value => { value.phase = 'unknown'; },
    value => { value.answers.push(structuredClone(value.answers[0])); },
    value => { value.playbackProgress = -1; },
    value => { value.playbackProgress = 2; },
    value => { value.playbackProgress = Infinity; },
  ]) {
    const invalid = structuredClone(playing);
    change(invalid);
    assert.equal(core.restorePositioningSession(invalid), null);
  }
  assert.equal(core.restorePositioningSession('{bad'), null);
  assert.throws(() => core.createPositioningSession('unknown'), /template/i);
});
