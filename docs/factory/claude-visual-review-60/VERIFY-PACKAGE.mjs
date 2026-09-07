import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
for(const row of read('FILE-HASHES.json').files){
 const file=path.resolve(root,row.path);
 assert(file.startsWith(root+path.sep),'Path escapes package');
 assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),row.sha256,row.path);
}
const assignment=read('assignment.json'),ids=new Set(),scenes=new Set();
for(const packet of assignment.packets){
 const manifest=read(`packets/${packet.packetId}-manifest.json`);
 const blind=read(`packets/${packet.packetId}-blind.json`);
 const keyed=read(`packets/${packet.packetId}-after-solve.json`);
 assert(blind.scenes.length<=5);
 for(const t of manifest.targets){
  assert(!ids.has(t.questionId));ids.add(t.questionId);scenes.add(t.scenarioId);
  const s=blind.scenes.find(s=>s.id===t.scenarioId),q=s?.questions.find(q=>q.id===t.questionId);
  assert(q);assert.equal(s.version,t.scenarioVersion);
  for(const field of ['answer','explanation','reference'])assert(!(field in q));
  const full=keyed.scenes.find(s=>s.id===t.scenarioId);assert(full?.questions.some(q=>q.id===t.questionId));
 }
}
assert.equal(ids.size,60);assert.equal(scenes.size,55);assert.equal(assignment.requestedDurationMinutes,300);
console.log('Package verified: 60 unique questions, 55 scenes, 11 packets, five-hour assignment. File checks are not hockey or visual approval.');
