import fs from 'node:fs';import crypto from 'node:crypto';import {placementSource} from '../src/one-on-one/placementEvaluation.js';
const file=new URL('../docs/factory/coaching-panel/placement-pilot.json',import.meta.url);if(fs.existsSync(file))throw Error('Pilot exists. Create a new revision rather than overwrite reviewed rubrics.');
const pack=JSON.parse(fs.readFileSync(new URL('../docs/factory/coaching-panel/pilot-2026-09-06/staged-repairs.json',import.meta.url),'utf8')),s=pack.scenarios.find(s=>s.id==='exp26-u11-001');
const distance=(id,target,label,strongMin,strongMax,workableMin,workableMax,feedback)=>({id,type:'distance',target,label,strongMin,strongMax,workableMin,workableMax,feedback});
const criteria={
 'exp26-u11-001-q4':[
 distance('approach','puck','Approach distance',.75,3,.25,4.5,{strong:'Near the puck with room before the touch.',workable:'Approach distance is at the edge of this draft range.',adjust:'Try a spot closer to the puck, leaving room before the touch.'}),
 {id:'side',type:'middle-side',target:'puck',label:'Middle side',strongMin:.5,workableMin:0,feedback:{strong:'You are on the middle side of the puck.',workable:'There is little room between your spot and the puck’s board-side line.',adjust:'Move to the middle side of the puck.'}},
 distance('pressure','a1','Room from D1',3,null,1.5,null,{strong:'This spot leaves room from D1.',workable:'D1 is close. Consider more room.',adjust:'This spot crowds D1.'})],
 'exp26-u11-001-q9':[
 {id:'middle',type:'middle',label:'Middle support',strongMax:.5,workableMax:1,feedback:{strong:'F2 is close to the rink’s middle.',workable:'F2 is near the middle, with some width.',adjust:'Bring F2 closer to the middle for this task.'}},
 {id:'lane',type:'lane',target:'puck',blockers:['a1'],label:'Line from the puck',strongMin:2,workableMin:1,feedback:{strong:'D1 is outside the direct line from the puck.',workable:'D1 is near that line. Try a different angle.',adjust:'D1 crowds the direct line. Change the support angle.'}},
 distance('support','puck','Support distance',2,15,1,18,{strong:'F2 is within this draft support-distance range.',workable:'The support distance has a tradeoff.',adjust:'Try a more connected support spot.'})]};
const rubrics=Object.entries(criteria).map(([id,criteria])=>{const q=s.questions.find(q=>q.id===id),sourceSignature=placementSource(s,q);const r={questionId:id,scenarioVersion:s.version,sourceSignature,contentHash:crypto.createHash('sha256').update(sourceSignature).digest('hex'),rubricVersion:1,status:'draft',actorId:q.actorId,criteria};return {...r,rubricHash:crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex')}});
fs.writeFileSync(file,JSON.stringify({status:'draft-geometry-only',limitations:'Thresholds authored for prototype testing only; no human calibration, predictive physics or mastery eligibility.',rubrics},null,2)+'\n');
