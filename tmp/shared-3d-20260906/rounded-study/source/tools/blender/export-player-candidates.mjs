/** Export the actual shared procedural candidate, not an approved sculpted master.
 * node tools/blender/export-player-candidates.mjs [output-directory]
 * Neutral stance and one explicitly named scan inspection clip only. This does
 * not invent an accepted skating/contact animation or tactical source trace.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { AnimationClip, QuaternionKeyframeTrack } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildHockeyPlayerRig } from '../../src/one-on-one/hockeyPlayerRig.js';
if (!globalThis.FileReader) globalThis.FileReader = class {
 async readAsArrayBuffer(blob) { this.result=await blob.arrayBuffer(); this.onloadend?.(); }
 async readAsDataURL(blob) { this.result=`data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onloadend?.(); }
};
const output=path.resolve(process.argv[2] || 'tmp/shared-3d-20260906/player-candidates');
await fs.mkdir(output,{recursive:true});
const sourceFiles=[];
for(const name of ['src/one-on-one/hockeyPlayerRig.js','src/visuals/characterPresentation.js','tools/blender/export-player-candidates.mjs']) {
 const bytes=await fs.readFile(name);
 const snapshot=path.join('source',name);
 await fs.mkdir(path.dirname(path.join(output,snapshot)),{recursive:true});
 await fs.writeFile(path.join(output,snapshot),bytes);
 sourceFiles.push({file:name,snapshot:snapshot.replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
const finish=process.argv[3] === 'rounded-study' ? 'rounded-study' : undefined;
const records=[];
for(const stage of ['young','youth','older']) for(const goalie of [false,true]) for(const colour of ['#0B1A33','#C9A24B']) {
 const rig=buildHockeyPlayerRig({stage,goalie,colour,finish});
 try {
  const times=[0,.5,1,1.5,2], values=[];
  for(const yaw of [0,.55,0,-.55,0]) { rig.applyPose({lookYaw:yaw}); const head=rig.group.getObjectByName('head');values.push(...head.quaternion.toArray()); }
  rig.applyPose({});
  // Rotation plus pivot-position track are both required to keep the scan at
  // the neck socket. Bake the exact applyPose transform into the export.
  const positions=[];
  for(const yaw of [0,.55,0,-.55,0]) {rig.applyPose({lookYaw:yaw});positions.push(...rig.group.getObjectByName('head').position.toArray());}
  rig.applyPose({});
  const {VectorKeyframeTrack}=await import('three');
  const clip=new AnimationClip('inspection-head-scan-candidate',2,[new QuaternionKeyframeTrack('head.quaternion',times,values),new VectorKeyframeTrack('head.position',times,positions)]);
  const data=await new GLTFExporter().parseAsync(rig.group,{binary:true,animations:[clip]});
  const bytes=Buffer.from(data),name=`${stage}-${goalie?'goalie':'skater'}-${colour==='#0B1A33'?'navy':'gold'}.glb`;
  await fs.writeFile(path.join(output,name),bytes);
  records.push({file:name,stage,goalie,colour,finish:finish??'integration-candidate',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),status:'procedural editable candidate; art and hockey acceptance pending',skeleton:'13 rigid weighted equipment bones',clips:[clip.name],source:'src/one-on-one/hockeyPlayerRig.js'});
 }finally{rig.dispose();}
}
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),sourceFiles,units:'metres',up:'+Y',forward:'-Z',handedness:'right-shot skater / standard left-catching goalie',records},null,2)+'\n');
console.log(JSON.stringify({output,files:records.length,totalBytes:records.reduce((a,r)=>a+r.bytes,0)}));
