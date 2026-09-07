import {isCoachRoutePoint} from './coachRouteSurfaceInput.js';
export function placementSource(s,q){const {questions,version,...scene}=s;return JSON.stringify({scene,question:q})}
// Conservative grid: shade a cell only when its centre and four corners agree.
export function samplePlacementAreas(input,size=.5){
 if(!Number.isFinite(size)||size<.25||size>2)return [];
 const cells=[];
 for(let x=-30;x<=30;x+=size)for(let y=-12.5;y<=12.5;y+=size){
  const points=[{x,y},...[-1,1].flatMap(a=>[-1,1].map(b=>({x:x+a*size/2,y:y+b*size/2})))];
  const bands=points.map(point=>evaluatePlacement({...input,point}).previewBand);
  if(bands.every(b=>b==='strong'||b==='workable'))cells.push({x,y,size,band:bands.every(b=>b==='strong')?'strong':'workable'});
 }
 return cells;
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;if(d<1e-10)return NaN;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d));return distance(p,{x:a.x+t*dx,y:a.y+t*dy})}
export function evaluatePlacement({scene,point,rubric:r,questionId,scenarioVersion,sourceSignature}){
 const unknown=reason=>({band:'needs-judgment',reason,criteria:[],masteryEligible:false});
 if(!r)return unknown('This question does not have a reviewed placement rubric yet.');
 if(r.questionId!==questionId||r.scenarioVersion!==scenarioVersion||r.sourceSignature!==sourceSignature)return unknown('The placement rubric no longer matches this question.');
 if(!isCoachRoutePoint(point)||!scene?.actors?.some(a=>a.id===r.actorId)||!r.criteria?.length)return unknown('A valid placement and its scene evidence are needed.');
 const actors=scene.actors.map(a=>a.id===r.actorId?{...a,...point}:a),find=id=>id==='puck'?scene.puck:actors.find(a=>a.id===id);
 const rows=[];
 for(const c of r.criteria){let value;
  const limits=['strongMin','strongMax','workableMin','workableMax'];
  if(limits.some(k=>c[k]!=null&&!Number.isFinite(c[k]))||!limits.slice(0,2).some(k=>c[k]!=null)||!limits.slice(2).some(k=>c[k]!=null))return unknown('The placement thresholds are incomplete.');
  const target=find(c.target);
  if(c.type==='distance'&&target)value=distance(point,target);
  else if(c.type==='middle')value=Math.abs(point.y);
  else if(c.type==='middle-side'&&target)value=Math.abs(target.y)-Math.abs(point.y);
  else if(c.type==='lane'&&target&&c.blockers?.length){const blockers=c.blockers.map(find);if(blockers.some(b=>!b))return unknown('A named defender is missing.');value=Math.min(...blockers.map(b=>segmentDistance(b,point,target)));}
  if(!Number.isFinite(value))return unknown('This geometry cannot be evaluated from the scene.');
  const inRange=(min,max)=>value>=(min??-Infinity)-1e-6&&value<=(max??Infinity)+1e-6;
  const band=inRange(c.strongMin,c.strongMax)?'strong':inRange(c.workableMin,c.workableMax)?'workable':'adjust';
  rows.push({id:c.id,label:c.label,band,value,reason:c.feedback?.[band]||c.label});
 }
 const result=rows.some(c=>c.band==='adjust')?'adjust':rows.some(c=>c.band==='workable')?'workable':'strong';
 // Current engine is a draft geometry preview. No rubric may self-assert hockey approval.
 return {band:'needs-judgment',previewBand:result,criteria:rows,masteryEligible:false,reason:'Draft geometric conditions, not a calibrated hockey grade.'};
}
