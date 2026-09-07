import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ANIMATED_PLAYS } from './playCatalog.js';
import { resolveKind } from './questionKinds.js';
import { playSpaceToRinkFrame } from '../scenario-engine/frameAdapters.js';
import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import { animatedEntryDuration, animatedMotionPolyline, animatedPointToRink, animatedRinkBounds, animatedRinkOverlays, animatedZoneChoice, sampleAnimatedRink } from './animatedRinkAdapter.js';

test('all25 plays and98 nodes map exact positions, teams, goalie roles and puck without changing a source answer', () => {
  const original = structuredClone(ALL_ANIMATED_PLAYS); let count = 0, explicit = 0;
  for (const play of ALL_ANIMATED_PLAYS) {
    const bounds = animatedRinkBounds(play);
    for (const node of Object.values(play.nodes)) {
      count++;
      const frame = sampleAnimatedRink(play, node, 1);
      for (const actor of frame.actors) {
        const sourceActor = play.actors.find(item => item.id === actor.id), point = playSpaceToRinkFrame(node.pos[actor.id]);
        assert.deepEqual([actor.x, actor.y], point); assert.equal(actor.team, sourceActor.team);
        assert.equal(actor.role === 'goalie', sourceActor.role === 'goalie'); assert.ok(Number.isFinite(actor.facing));
        assert.ok(actor.x >= bounds.minX && actor.x <= bounds.maxX);
      }
      assert.deepEqual([frame.puck.x, frame.puck.y], playSpaceToRinkFrame(node.puck));
      assert.equal(frame.puck.owner, node.possessionChange?.toActor || null, 'Neither a static role nor a nearby actor invents ownership.');
      if (frame.puck.owner) explicit++;
      const opening = sampleAnimatedRink(play, node, 0), middle = sampleAnimatedRink(play, node, .5);
      for (const actor of opening.actors) assert.deepEqual([actor.x, actor.y], playSpaceToRinkFrame(node.enter?.[actor.id] || node.pos[actor.id]));
      assert.deepEqual([opening.puck.x, opening.puck.y], playSpaceToRinkFrame(node.enterPuck || node.puck));
      assert.ok(middle.actors.every(actor => Number.isFinite(actor.x) && Number.isFinite(actor.y)));
      const overlays = animatedRinkOverlays(node, { kind: resolveKind(node) });
      assert.ok(overlays.polylines.every(line => line.points.every(point => point.every(Number.isFinite))));
    }
  }
  assert.equal(ALL_ANIMATED_PLAYS.length, 25); assert.equal(count, 98); assert.equal(explicit, 5);
  assert.deepEqual(ALL_ANIMATED_PLAYS, original, 'Every option id/ok/next, justification, source and pose remains unchanged.');
});

test('all five question kinds survive; actual lane spots return the original option object and index', () => {
  const kinds = new Set(); let lanes = 0;
  for (const play of ALL_ANIMATED_PLAYS) for (const node of Object.values(play.nodes)) {
    const kind = resolveKind(node); if (!kind) continue; kinds.add(kind);
    if (kind !== 'lane-pick') continue;
    lanes++;
    for (const young of [true, false]) {
      const overlays = animatedRinkOverlays(node, { kind, young });
      assert.equal(overlays.targets.length, node.ask.opts.length);
      node.ask.opts.forEach((option, index) => {
        const hit = animatedZoneChoice(node, animatedPointToRink(option.zone), { young });
        assert.equal(hit.option, option); assert.equal(hit.index, index);
        const center = animatedPointToRink(option.zone), radius = (young ? option.zone[2] || 6 : 4.5) * .3048;
        assert.equal(animatedZoneChoice(node, { x: center.x + radius + .001, y: center.y }, { young })?.option === option, false);
      });
    }
  }
  assert.deepEqual([...kinds].sort(), ['lane-pick', 'predict-next', 'read-mc', 'spot-mistake', 'verdict']); assert.equal(lanes, 3);
});

test('routes preserve existing visible-motion rules, curve waypoints and reveal delays', () => {
  const curve = { kind: 'skate', from: [140, 30], via: [[150, 20], [160, 25]], to: [170, 35] };
  const line = animatedMotionPolyline(curve);
  for (const point of [curve.from, ...curve.via, curve.to]) {
    const expected = playSpaceToRinkFrame(point);
    assert.ok(line.some(p => Math.hypot(p[0] - expected[0], p[1] - expected[1]) < 1e-9));
  }
  const node = { terminal: false, motions: [curve, { kind: 'shot', from: [150, 40], to: [190, 42] }, { kind: 'blocked', from: [140, 30], to: [180, 40] }] };
  assert.equal(animatedRinkOverlays(node, { elapsed: 499 }).polylines.length, 0);
  assert.equal(animatedRinkOverlays(node, { elapsed: 500 }).polylines.length, 1, 'Skate and shot answers stay hidden before an answer.');
  assert.equal(animatedRinkOverlays({ ...node, terminal: true }).polylines.length, 3);
});

test('short watch beats still reach their authored end and YOU identity survives terminal roles', () => {
  const play = ALL_ANIMATED_PLAYS.find(item => item.id === 'spotmistake_2v1_flat_support_u11_v1');
  assert.equal(animatedEntryDuration(play.nodes.watch), 700);
  const frame = sampleAnimatedRink(play, play.nodes.rewind, 1, 'F2');
  assert.equal(frame.actors.find(actor => actor.id === 'F2').label, 'YOU');
  assert.equal(frame.puck.owner, 'D1');
  assert.throws(() => animatedPointToRink([Infinity, 20]));
  assert.throws(() => animatedPointToRink([210, 42]));
});

test('historical full-view plays fit the authored decision end, all openings/outcomes/targets and the real net', () => {
  const goalX = NHL_200X85_PROFILE.landmarks.goalLineRight[0];
  for (const play of ALL_ANIMATED_PLAYS) {
    const bounds = animatedRinkBounds(play);
    assert.ok(bounds.maxX - bounds.minX < 38, `${play.id}: no unrelated whole-rink view`);
    for (const node of Object.values(play.nodes)) for (const point of [...Object.values(node.pos), ...Object.values(node.enter || {}), node.puck, ...(node.enterPuck ? [node.enterPuck] : []), ...(node.ask?.opts || []).filter(option => option.zone).map(option => option.zone.slice(0, 2))]) {
      const { x, y } = animatedPointToRink(point);
      assert.ok(x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY, `${play.id}: ${point}`);
    }
    assert.ok(bounds.minX <= goalX && bounds.maxX >= goalX + 1.2);
    assert.ok(bounds.minY <= -1.2 && bounds.maxY >= 1.2);
    if (play.view === 'horizontal') assert.ok(bounds.minX > 0, 'The old horizontal tag must not force the other half of the rink into view.');
  }
});

test('named rule lines stay in frame and cue prose never covers actors or action targets in3D', () => {
  const source = ALL_ANIMATED_PLAYS.find(play => play.id === 'play_2v1_goalie_late_after_pass_u11_v1');
  const blue = NHL_200X85_PROFILE.landmarks.blueLineRightMid[0], goal = NHL_200X85_PROFILE.landmarks.goalLineRight[0];
  const withPrompt = prompt => ({ ...source, nodes: { ...source.nodes, catch: { ...source.nodes.catch, ask: { ...source.nodes.catch.ask, q: prompt } } } });
  assert.ok(animatedRinkBounds(withPrompt('Check the blue line before entering.')).minX < blue);
  assert.ok(animatedRinkBounds(withPrompt('Has the puck crossed the centre line?')).minX < 0);
  const icing = animatedRinkBounds(withPrompt('Is this icing?')); assert.ok(icing.minX <= -goal && icing.maxX >= goal);
  for (const play of ALL_ANIMATED_PLAYS) for (const node of Object.values(play.nodes)) {
    const snapshot = JSON.stringify(node);
    assert.deepEqual(animatedRinkOverlays(node, { kind: resolveKind(node), cueLabel: node.cue?.label || 'Cue prose' }).labels, []);
    assert.equal(JSON.stringify(node), snapshot);
  }
});
