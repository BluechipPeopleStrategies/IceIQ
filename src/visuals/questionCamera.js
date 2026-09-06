import { characterProportions } from './characterPresentation.js';
const PRESETS = ['broadcast', 'rink-side', 'behind-net', 'overhead'];
const finite = (value, fallback, name) => { const n = value ?? fallback; if (!Number.isFinite(n)) throw new Error(`Invalid camera ${name}`); return n; };
/** External position/target are Three world metres [rinkY, height, -rinkX]. Angles are radians. */
export function parseStartingView(input) {
 if (input == null) return null;
 const view = typeof input === 'string' ? {type:'preset',preset:input} : input;
 if (view.type === 'preset' && PRESETS.includes(view.preset)) return {type:'preset',preset:view.preset};
 const fov=finite(view.fov,view.type==='first-person'?80:70,'fov');
 if(fov<35 || fov>100) throw new Error('Camera fov must be 35–100 degrees');
 if(view.type==='first-person') {
  if(typeof view.actorId!=='string'||!view.actorId) throw new Error('First-person camera requires actorId');
  const eyeHeight=view.eyeHeight==null?undefined:finite(view.eyeHeight,1.45,'eyeHeight');
  if(eyeHeight<.5||eyeHeight>2.2) throw new Error('Invalid camera eyeHeight');
  return {type:view.type,actorId:view.actorId,eyeHeight,fov,lookYaw:finite(view.lookYaw,0,'lookYaw'),lookPitch:Math.max(-1.2,Math.min(1.2,finite(view.lookPitch,-.45,'lookPitch')))};
 }
 if(view.type==='perspective') {
  if(![view.position,view.target].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))) throw new Error('Perspective camera requires finite position and target');
  if(Math.hypot(...view.position.map((v,i)=>v-view.target[i]))<.01) throw new Error('Camera position and target must be distinct');
  return {type:view.type,position:[...view.position],target:[...view.target],fov};
 }
 throw new Error('Unknown question starting view');
}
export function resolvePlayerEye(view, actors, look = {}) {
 const actor=actors.find(a=>a.id===view.actorId);
 if(!actor) throw new Error(`Camera observer ${view.actorId} is missing`);
 if(![actor.x,actor.y,actor.facing].every(Number.isFinite)) throw new Error(`Camera observer ${view.actorId} requires finite position and facing`);
 const yaw=actor.facing+(look.yaw??view.lookYaw??0),pitch=look.pitch??view.lookPitch??0;
 const position=[actor.y,view.eyeHeight??characterProportions(actor.ageBand,actor.stage).eyeHeight??1.45,-actor.x];
 // Scenario positive facing rotates toward positive rink Y (Three +X).
 const target=[position[0]+Math.sin(yaw)*Math.cos(pitch),position[1]+Math.sin(pitch),position[2]-Math.cos(yaw)*Math.cos(pitch)];
 return {position,target};
}
export function questionViewEntry(previousId, nextId, startingView, currentView) {
 if (previousId === nextId) return currentView;
 return parseStartingView(startingView) ?? (currentView.type === 'preset' ? currentView : {type:'preset',preset:'broadcast'});
}
