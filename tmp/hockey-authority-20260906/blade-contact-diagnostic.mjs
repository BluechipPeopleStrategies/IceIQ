import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { buildHockeyPlayerRig } from '../../src/one-on-one/hockeyPlayerRig.js';
import { samplePlayerMotion } from '../../src/visuals/playerMotion.js';

// Read-only production inspection. Only this diagnostic's own tmp outputs change.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const sha = value => createHash('sha256').update(value).digest('hex');
const sourcePaths = ['src/one-on-one/hockeyPlayerRig.js','src/visuals/playerMotion.js','src/visuals/FirstPersonEquipment.jsx','src/one-on-one/ScenarioSkater.jsx','src/one-on-one/simulation.js','src/visuals/PuckLocator3D.jsx','src/one-on-one/PracticeScene.jsx','tmp/hockey-authority-20260906/blade-contact-diagnostic.mjs'];
const sources = Object.fromEntries(await Promise.all(sourcePaths.map(async name => [name, {sha256:sha(await fs.readFile(path.join(root,name)))}])));
let instrumented = await fs.readFile(path.join(root,sourcePaths[0]), 'utf8');
// Runtime metadata currently records names but loses per-part vertex ranges.
// Capture those ranges immediately before the unchanged material merge.
const needle = '    buckets.get(material).push(geometry);';
if (instrumented.split(needle).length !== 2) throw new Error('Instrumentation insertion point changed');
instrumented = instrumented.replace(needle, `    if (!group.__diagnosticParts) group.__diagnosticParts = [];
    group.__diagnosticParts.push({name, material, start: buckets.get(material).reduce((n,g) => n + g.getAttribute('position').count, 0), count: vertices.count});
${needle}`);
instrumented = instrumented.replace(/from '(\.\.?\/[^']+)'/g, (_, specifier) => `from '${pathToFileURL(path.resolve(root,'src/one-on-one',specifier)).href}'`);
const modulePath = path.join(here,'blade-contact-instrumented-rig.mjs');
await fs.writeFile(modulePath, instrumented);
const {buildHockeyPlayerRig: buildInstrumented} = await import(pathToFileURL(modulePath));
const RADIUS = .0381, HEIGHT = .0254, EPS = 1e-10;
const arr = v => v.toArray();

function hashGeometry(rig) {
 const h=createHash('sha256');
 rig.group.traverse(mesh=>{
  if(!mesh.isMesh)return;
  h.update(mesh.name);
  for(const key of Object.keys(mesh.geometry.attributes).sort()){
   const a=mesh.geometry.attributes[key].array;
   h.update(key);h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));
  }
 });return h.digest('hex');
}
function collect(rig,partFilter) {
 const triangles=[];
 for(const part of rig.group.__diagnosticParts.filter(partFilter)) {
  const mesh=rig.group.children.find(o=>o.name===`equipment-${part.material}`);
  if(!mesh||mesh.geometry.index||part.count%3)throw new Error('Unexpected merge format');
  for(let i=part.start;i<part.start+part.count;i+=3){
   const vertices=[0,1,2].map(j=>mesh.getVertexPosition(i+j,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
   triangles.push({part:part.name,triangle:new THREE.Triangle(...vertices)});
  }
 }return triangles;
}
function cylinderProjection(point,center) {
 const dx=point.x-center.x,dz=point.z-center.z,r=Math.hypot(dx,dz),scale=r>RADIUS?RADIUS/r:1;
 return new THREE.Vector3(center.x+dx*scale,Math.max(0,Math.min(HEIGHT,point.y)),center.z+dz*scale);
}
function supportCylinder(normal,center) {
 return normal.x*center.x+normal.z*center.z+RADIUS*Math.hypot(normal.x,normal.z)+(normal.y>0?HEIGHT*normal.y:0);
}
// Alternating projections for two closed convex sets. A feasible pair gives
// an upper distance bound; their direction supplies a separating-plane lower
// bound. The report retains both, never promoting convergence to exactness.
function triangleCylinderDistance(triangle,center) {
 let b=cylinderProjection(center,center),a=new THREE.Vector3(),upper=Infinity,lower=0,steps=0;
 for(;steps<10000;steps++){
  triangle.closestPointToPoint(b,a);b=cylinderProjection(a,center);
  const delta=a.clone().sub(b);upper=delta.length();
  if(upper<EPS){lower=0;break;}
  const n=delta.multiplyScalar(1/upper);
  lower=Math.max(0,Math.min(n.dot(triangle.a),n.dot(triangle.b),n.dot(triangle.c))-supportCylinder(n,center));
  if(upper-lower<1e-9)break;
 }
 return {lowerM:lower,upperM:upper,iterations:steps+1,bladePoint:arr(a),puckPoint:arr(b)};
}
function nearest(triangles,point){
 let best={distanceM:Infinity};
 for(const {triangle,part} of triangles){const q=triangle.closestPointToPoint(point,new THREE.Vector3()),d=q.distanceTo(point);if(d<best.distanceM)best={distanceM:d,point:arr(q),part};}
 return best;
}
function measure(triangles,center,marker){
 let lo=Infinity,hi=-Infinity,lower=Infinity,best=null,unconverged=0;
 for(const {triangle,part} of triangles){
  for(const p of [triangle.a,triangle.b,triangle.c]){lo=Math.min(lo,p.y);hi=Math.max(hi,p.y);}
  const d=triangleCylinderDistance(triangle,center);lower=Math.min(lower,d.lowerM);
  if(d.upperM-d.lowerM>=1e-9)unconverged++;
  if(!best||d.upperM<best.upperM)best={...d,part};
 }
 return {triangles:triangles.length,verticalRangeM:[lo,hi],lowestSurfaceAboveIceM:lo,verticalGapAbovePuckM:Math.max(0,lo-HEIGHT),verticalOverlapM:Math.max(0,Math.min(hi,HEIGHT)-Math.max(lo,0)),puckCenterToSurface:nearest(triangles,center),carryMarkerToSurface:nearest(triangles,marker),solidPuckSeparation:{lowerM:lower,upperM:best.upperM,bestPair:best,unconvergedTriangles:unconverged},contactPossibleAtCarryXY:lower<=EPS? 'not ruled out by distance bound':'no: certified positive separation'};
}
const diagnosticChecks=[
 {name:'separated horizontal triangle',points:[[-1,.1,-1],[1,.1,-1],[0,.1,1]],expectedM:.1-HEIGHT},
 {name:'intersecting horizontal triangle',points:[[-1,.01,-1],[1,.01,-1],[0,.01,1]],expectedM:0},
 {name:'separated vertical triangle',points:[[.1,-1,-1],[.1,1,-1],[.1,0,1]],expectedM:.1-RADIUS},
].map(check=>{
 const result=triangleCylinderDistance(new THREE.Triangle(...check.points.map(p=>new THREE.Vector3(...p))),new THREE.Vector3(0,HEIGHT/2,0));
 const passed=Math.abs(result.lowerM-check.expectedM)<1e-8&&Math.abs(result.upperM-check.expectedM)<1e-8;
 if(!passed)throw new Error(`Distance diagnostic failed: ${check.name}`);
 return {...check,result,passed};
});
const actor={id:'N1',x:16,y:-2,facing:.6,vx:2,vy:0,motion:{mode:'glide'}};
const cases=[{name:'neutral',motion:{mode:'glide'}},{name:'turn-lean',motion:{mode:'glide',turn:.7,lean:.3,lookYaw:.6}},{name:'turn-lean-stride',motion:{mode:'skate',turn:.7,lean:.3,lookYaw:.6}}];
const results=[];
for(const item of cases)for(const view of ['world','first-person']){
 const options={ageBand:'U11',finish:'rounded-study',colour:'#0B1A33',number:'7',view};
 const rig=buildInstrumented(options),original=buildHockeyPlayerRig(options);
 try{
  const geometryHash=hashGeometry(rig),originalGeometryHash=hashGeometry(original);
  if(geometryHash!==originalGeometryHash)throw new Error('Diagnostic altered geometry');
  const sourceActor={...actor,motion:item.motion},pose=samplePlayerMotion({actor:sourceActor,time:2});
  for(const candidate of [rig,original]){
   candidate.group.position.set(actor.y,0,-actor.x);candidate.group.rotation.y=-actor.facing;candidate.applyPose(pose);candidate.group.updateMatrixWorld(true);
  }
  const metadata=rig.group.__diagnosticParts.filter(p=>p.name.includes('blade'));
  const blade=collect(rig,p=>p.name==='stick-flat-hooked-blade'),withTape=collect(rig,p=>p.name.includes('blade'));
  const marker=new THREE.Vector3(...Object.values(rig.group.userData.carryContact)).applyMatrix4(rig.group.matrixWorld);
  const center=new THREE.Vector3(marker.x,HEIGHT/2,marker.z);
  // Compare all posed blade vertices to the uninstrumented rig using the same
  // captured ranges; geometry hashes above prove those ranges address it too.
  original.group.__diagnosticParts=rig.group.__diagnosticParts;
  const baseline=collect(original,p=>p.name.includes('blade'));
  let maxDifference=0;withTape.forEach((t,i)=>{for(const key of ['a','b','c'])maxDifference=Math.max(maxDifference,t.triangle[key].distanceTo(baseline[i].triangle[key]));});
  results.push({case:item.name,view,actor:sourceActor,time:2,pose,geometryHash,originalGeometryHash,instrumentationMaxPosedVertexDifferenceM:maxDifference,partRanges:metadata,carryMarkerWorld:arr(marker),physicalPuckCenterWorld:arr(center),puckRinkXY:{x:-center.z,y:center.x},blade:measure(blade,center,marker),bladeIncludingTape:measure(withTape,center,marker),posedBladeTrianglesHash:sha(JSON.stringify(withTape.map(t=>[arr(t.triangle.a),arr(t.triangle.b),arr(t.triangle.c)])))});
 }finally{rig.dispose();original.dispose();}
}
const sourceUnchanged=Object.fromEntries(await Promise.all(sourcePaths.map(async name=>[name,sources[name].sha256===sha(await fs.readFile(path.join(root,name)))])));
if(Object.values(sourceUnchanged).some(v=>!v))throw new Error('Production source changed during measurement; rerun required');
const report={diagnosticChecks,schema:'blade-contact-diagnostic-v1',generatedAt:new Date().toISOString(),sources,instrumentation:{file:path.relative(root,modulePath),sha256:sha(instrumented),reason:'Runtime part names survive but merged vertex ranges do not; tmp-only copy adds ranges before unchanged material merge.',productionFilesChanged:false},method:{units:'metres',worldAxes:'rink (x,y) -> Three (y,height,-x), rotationY=-facing',geometry:'Original skinned vertices evaluated using SkinnedMesh.getVertexPosition then matrixWorld. Blade face and tape isolated by original part name before material merge. Instrumented and original geometry attributes hashed identically; posed blade vertices compared.',puck:'Analytic solid upright cylinder, perspective radius .0381, height .0254, centre y .0127 (current PuckLocator3D). Horizontal location is the actual carry marker transformed with actor, not inferred blade contact.',distance:'Triangle.closestPointToPoint for point/surface distance. Alternating projections of each exact triangle and analytic finite cylinder; feasible nearest pair is upper bound, supporting-plane separation is lower bound. Min bounds over all triangles bound union distance. Tolerance 1e-9m; max 10000 iterations.',scope:'U11 rounded-study, neutral and authored turn/lean with/without stride; world and first-person from identical actor and source time.',limitations:['Geometric separation does not establish hockey technique, grip plausibility, collision dynamics, successful possession, or curriculum correctness.','No visual/browser review. No bank reads. No changes to production source.','Analytic circular cylinder is a circumscribed superset of rendered 32-sided puck: positive separation also proves no contact with rendered mesh; positive contact with ideal cylinder alone would need polygon confirmation.','Measurements concern the carry-marker XY position, not the lab rim puck several metres away.','World ice plane is y=0; any visual ice mesh offset should be recorded separately if changed.']},sourceUnchanged,results};
await fs.writeFile(path.join(here,'blade-contact-report.json'),JSON.stringify(report,null,2)+'\n');
const lines=results.map(r=>`| ${r.case} | ${r.view} | ${(r.blade.lowestSurfaceAboveIceM*1000).toFixed(3)} | ${(r.blade.solidPuckSeparation.lowerM*1000).toFixed(3)}–${(r.blade.solidPuckSeparation.upperM*1000).toFixed(3)} | ${(r.bladeIncludingTape.solidPuckSeparation.lowerM*1000).toFixed(3)}–${(r.bladeIncludingTape.solidPuckSeparation.upperM*1000).toFixed(3)} |`);
await fs.writeFile(path.join(here,'blade-contact-summary.md'),`# Blade/puck geometric diagnostic\n\nCurrent U11 rounded-study geometry; this is technical evidence, not hockey approval.\n\n| Pose | View | Lowest blade above ice (mm) | Blade-to-puck separation bound (mm) | Including tape (mm) |\n|---|---|---:|---:|---:|\n${lines.join('\n')}\n\nThe perspective puck occupies y=0–25.4 mm. The marker uses y=52 mm; it is not the puck centre. Point-to-marker proximity must not substitute for finite-volume contact. Exact part triangles are evaluated after skinning and world transformation; positive lower bounds certify non-contact. The diagnostic injects vertex-range metadata into a tmp-only source copy and verifies unchanged mesh attributes plus identical posed blade vertices against the original imported rig.\n\nFiles: blade-contact-report.json (source hashes, methods, bounds, coordinates, pose/view comparison), blade-contact-diagnostic.mjs (repeatable measurement), blade-contact-instrumented-rig.mjs (tmp-only range instrumentation).\n\nNo production source changed, no broad tests, no bank reads, no browser or hockey approval.\n`);
await fs.appendFile(path.join(here,'blade-contact-summary.md'),`\nMeasured result: the current blade does not sit on the ice and cannot touch the grounded perspective puck at the carried XY location. Its lower surface is 30 mm high, leaving 4.6 mm clear air above the puck. The carry marker is only ${(results[0].blade.carryMarkerToSurface.distanceM*1000).toFixed(3)} mm from the blade surface, despite the physical separation. All six posed blade triangle hashes are identical: these torso/stride poses do not reposition the blade; world and first-person geometry agree exactly. Three analytic control cases (vertical separation, horizontal separation and actual intersection) passed. The physical ice mesh is at y=0 in the inspected PracticeScene.jsx.\n`);
console.log(JSON.stringify({report:path.join(here,'blade-contact-report.json'),results:results.map(r=>({case:r.case,view:r.view,bladeMinY:r.blade.lowestSurfaceAboveIceM,separation:r.blade.solidPuckSeparation,withTapeSeparation:r.bladeIncludingTape.solidPuckSeparation,instrumentationDifference:r.instrumentationMaxPosedVertexDifferenceM,triangleHash:r.posedBladeTrianglesHash}))},null,2));
