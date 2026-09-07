import fs from 'node:fs';
import {isCoachRoutePoint} from '../src/one-on-one/coachRouteSurfaceInput.js';
const p=JSON.parse(fs.readFileSync('docs/factory/research/question-review/packet-17/proposed-repairs.json'));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const evidence=[];
for(const row of p.packets[0].scenarios){const s=row.replacement,a=s.setup.actors.find(a=>a.id===s.focusActorId),q=s.questions.find(q=>q.type==='position'),d=s.setup.actors.find(a=>a.team==='away'),puck=s.setup.puck.owner?s.setup.actors.find(a=>a.id===s.setup.puck.owner):s.setup.puck; if(!isCoachRoutePoint(q.reference))throw Error(s.id);evidence.push({id:s.id,start:{x:a.x,y:a.y},reference:q.reference,referenceOnIce:true,defenderDistanceBefore:dist(a,d),defenderDistanceAfter:dist(q.reference,d),...(s.setup.puck.owner===a.id?{puckMovesWithCarrier:true}:{puckDistanceBefore:dist(a,puck),puckDistanceAfter:dist(q.reference,puck)})});}
evidence.push({id:'circle-claims',radius:4.572,b005F1DistanceFromCircleCentre:dist({x:17,y:5},{x:20.7264,y:6.7056}),b006PuckDistanceFromCircleCentre:dist({x:23,y:-5},{x:20.7264,y:-6.7056}),b008StartX:-8,defensiveBlueLineX:-7.62});
fs.writeFileSync('docs/factory/research/question-review/packet-17/root-geometry.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
