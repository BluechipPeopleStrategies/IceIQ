import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadSceneFrame} from './readSequenceVisuals.js';
import {samplePlayerMotion} from '../visuals/playerMotion.js';

test('authored motion survives a paused seek with zero inferred velocity', () => {
  const state = {actors:[{id:'D1',x:2,y:1,vx:-3,vy:0,facing:0,motion:{mode:'skate'}}],puck:{x:3,y:1}};
  const before = structuredClone(state);
  const frame = createReadSceneFrame(state, {time:1.3,preserveActorVelocity:true,velocityById:{D1:{vx:0,vy:0}}});
  assert.equal(frame.actors[0].vx,-3);
  assert.equal(frame.time,1.3);
  assert.deepEqual(frame.actors[0].motion,{mode:'skate'});
  assert.deepEqual(state,before);
});

test('nonfinite authored components become zero without changing the legacy default', () => {
  const state={actors:[{id:'D1',vx:Infinity,vy:2}],puck:{}};
  const options={velocityById:{D1:{vx:3,vy:4}}};
  assert.deepEqual(createReadSceneFrame(state,options).actors.map(a=>[a.vx,a.vy]),[[3,4]]);
  assert.deepEqual(createReadSceneFrame(state,{...options,preserveActorVelocity:true}).actors.map(a=>[a.vx,a.vy]),[[0,2]]);
});

test('the same source and time produce identical articulated poses during playback, pause and direct seek', () => {
  for (const velocity of [{vx:-3,vy:0}, {}, {vx:NaN,vy:Infinity}]) {
    const state = { actors: [{id:'D1', x:12, y:4, facing:0, ...velocity,
      motion:{mode:'skate', action:{type:'rim-pickup',phases:[{name:'prepare',start:1,end:2,turn:.6,lookYaw:.4}]}}}], puck:{x:13,y:4,owner:null} };
    const before = structuredClone(state);
    // Old playback supplied a last-render estimate; pause/seek supplied none.
    // Neither is an authored velocity source or permitted to change this pose.
    for (const preserveActorVelocity of [true, false]) {
      const frames = [{D1:{vx:4,vy:1}}, {}, {D1:{vx:-8,vy:0}}].map(velocityById =>
        createReadSceneFrame(state,{time:1.5,preserveActorVelocity,velocityById}));
      const poses = frames.map(frame=>samplePlayerMotion({actor:frame.actors[0],time:frame.time}));
      assert.deepEqual(poses[0],poses[1]);
      assert.deepEqual(poses[0],poses[2]);
      assert.equal(poses[0].action.phase,'prepare');
      assert.equal(poses[0].stride > 0,Number.isFinite(velocity.vx));
      for (const frame of frames) assert.deepEqual(frame.puck,state.puck);
    }
    assert.deepEqual(state,before);
  }
});
