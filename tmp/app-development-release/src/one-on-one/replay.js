import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import { normalizeSetup, DT } from './simulation.js';

export const REPLAY_VERSION = 'rinkreads-practice-replay-v1';
export function branchFrames(frames, index) {
  if (!Array.isArray(frames) || !Number.isInteger(index) || index < 0 || index >= frames.length) throw new Error('Choose an existing replay frame.');
  return frames.slice(0, index + 1);
}

export function validateReplay(value) {
  if (value?.version !== REPLAY_VERSION || !Array.isArray(value.frames) || !value.frames.length || value.frames.length > 2401) throw new Error('This replay format or length is unsupported.');
  if(!['play','read','coach'].includes(value.mode))throw new Error('Replay mode is unsupported.');
  if(!value.setup)throw new Error('Replay setup is missing.');
  normalizeSetup(value.setup);
  let lastTime = -1;
  const b = NHL_200X85_PROFILE.bounds;
  let lastTick=-1,terminal=false;
  for (const f of value.frames) {
    if (!Number.isFinite(f.time) || f.time<0 || f.time <= lastTime || f.time > 40 || Math.abs(f.time-f.tick*DT)>.00001) throw new Error('Replay time is invalid.');
    if(!Number.isInteger(f.tick)||f.tick!==lastTick+1||!Number.isInteger(f.seed)||f.seed<0||f.seed>4294967295||terminal)throw new Error('Replay clock or seed is invalid.');
    if(![null,'goal','save','turnover','timeout'].includes(f.outcome)||![null,'attacker'].includes(f.puck?.owner))throw new Error('Replay state is invalid.');
    if(!f.setup)throw new Error('Replay frame setup is missing.');
    normalizeSetup(f.setup);lastTick=f.tick;terminal=!!f.outcome;
    lastTime = f.time;
    for (const key of ['attacker', 'defender', 'goalie', 'puck']) {
      const a = f[key];
      if (!a || !['x', 'y', 'vx', 'vy'].every(k => Number.isFinite(a[k]))) throw new Error('Replay contains an invalid player or puck.');
      if(key!=='puck'&&!Number.isFinite(a.facing))throw new Error('Replay facing is invalid.');
      const margin=key==='puck'?.08:.55,r=8.5344-margin;
      const dx=Math.max(0,Math.abs(a.x)-(b.maxX-8.5344)),dy=Math.max(0,Math.abs(a.y)-(b.maxY-8.5344));
      if (a.x < b.minX+margin-1e-8 || a.x > b.maxX-margin+1e-8 || a.y < b.minY+margin-1e-8 || a.y > b.maxY-margin+1e-8 || (dx>0&&dy>0&&Math.hypot(dx,dy)>r+1e-8)) throw new Error('Replay position is outside the rink.');
    }
  }
  return true;
}
