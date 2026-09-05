import test from 'node:test';
import assert from 'node:assert/strict';
import { branchFrames, validateReplay } from './replay.js';
import { createGame, stepGame, DEFAULT_SETUP } from './simulation.js';

const actor = (x = 0) => ({ x, y: 0, vx: 0, vy: 0, facing: 0 });
const frame = (time = 0) => ({ time, tick: Math.round(time * 60), seed:7,setup:DEFAULT_SETUP,attacker: actor(), defender: actor(5), goalie: actor(26), puck: { x: 0, y: 0, vx: 0, vy: 0, owner: 'attacker' }, outcome: null });
test('taking over from a replay keeps the chosen moment and removes its future', () => {
  const frames = [frame(0), frame(1), frame(2)];
  const branch = branchFrames(frames, 1);
  assert.deepEqual(branch.map(f => f.time), [0, 1]);
  assert.equal(frames.length, 3);
  assert.notEqual(branch, frames);
  assert.throws(() => branchFrames(frames, -1));
  assert.throws(() => branchFrames(frames, 3));
});
test('replay validation rejects nonfinite and out-of-rink positions before export', () => {
  const value = { version: 'rinkreads-practice-replay-v1',mode:'play',setup:DEFAULT_SETUP,frames: [frame(), frame(1/60)] };
  assert.equal(validateReplay(value), true);
  const bad = structuredClone(value); bad.frames[1].attacker.x = Infinity;
  assert.throws(() => validateReplay(bad));
  bad.frames[1].attacker.x = 300;
  assert.throws(() => validateReplay(bad));
});
test('recorded simulation round-trips and rejects corrupt clocks, orientation, bounds and enums',()=>{
 const start=createGame(), frames=[start];for(let i=0;i<120;i++)frames.push(stepGame(frames.at(-1),{moveX:1}));
 const replay={version:'rinkreads-practice-replay-v1',mode:'play',setup:DEFAULT_SETUP,frames};
 assert.equal(validateReplay(JSON.parse(JSON.stringify(replay))),true);
 for(const mutate of [v=>v.mode='unknown',v=>v.frames[0].time=-.5,v=>v.frames[1].tick=0,v=>v.frames[1].attacker.facing=NaN,v=>v.frames[1].attacker.x=30.7,v=>Object.assign(v.frames[1].attacker,{x:30,y:12}),v=>v.frames[0].puck.owner='nobody',v=>v.frames[0].outcome='banana']){const copy=structuredClone(replay);mutate(copy);assert.throws(()=>validateReplay(copy));}
});
test('replay validation rejects backward time and excessive frame counts', () => {
  assert.throws(() => validateReplay({ version: 'rinkreads-practice-replay-v1', frames: [frame(1), frame(0)] }));
  assert.throws(() => validateReplay({ version: 'rinkreads-practice-replay-v1', frames: Array(2402).fill(frame()) }));
  assert.throws(() => validateReplay({ version: 'unknown', frames: [frame()] }));
});
