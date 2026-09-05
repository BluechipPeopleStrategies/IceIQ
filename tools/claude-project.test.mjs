import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {readBankFiles} from './experimental-bank-files.mjs';
const root='docs/factory/claude-project',read=file=>JSON.parse(readFileSync(join(root,file),'utf8'));

test('frozen Claude package preserves its baseline and accounts for every subsequent calibration repair',()=>{
 const snapshot=read('bank-snapshot.json'),expected=structuredClone(snapshot.scenarios);
 const receiptPath='docs/factory/research/question-review/repairs/claude-calibration-repairs.json';
 if(existsSync(receiptPath)){
  const receipt=JSON.parse(readFileSync(receiptPath,'utf8'));
  assert.equal(receipt.sourceReturn.snapshotId,snapshot.snapshotId);
  assert.equal(receipt.status,'applied-and-independently-rechecked');
  for(const edit of receipt.sceneEdits){
   const index=expected.findIndex(s=>s.id===edit.scenarioId);
   assert.deepEqual(expected[index],edit.before,'Repair must start from the exact frozen scene');
   assert.equal(edit.after.version,edit.before.version+1);
   expected[index]=edit.after;
  }
 }
 assert.deepEqual(expected,readBankFiles().bank,'No undocumented divergence from the handoff');
 const packets=snapshot.packets.map(p=>read(`packets/${p.id}.json`));
 assert.equal(packets.length,40);
 const sceneIds=packets.flatMap(p=>p.scenarios.map(s=>s.id)),qids=packets.flatMap(p=>p.scenarios.flatMap(s=>s.questions.map(q=>q.id)));
 assert.equal(sceneIds.length,200);assert.equal(new Set(sceneIds).size,200);
 assert.equal(qids.length,1600);assert.equal(new Set(qids).size,1600);
 assert.ok(packets.every(p=>p.snapshotId===snapshot.snapshotId));
 const history=read('historical-checks.json');assert.equal(history.currentCoverage.filter(r=>r.historicalHashMatches).length,1600);
 assert.equal(history.reportIndex.find(r=>r.file==='followup/u9-006-recheck.json').rows,1);
 assert.equal(packets[0].historicalReports.find(r=>r.file==='followup/u9-006-recheck.json').rows.length,1);
 assert.ok(packets[0].historicalReports.some(r=>r.superseded));
});
test('every shipped package file matches its manifest',()=>{
 const manifest=read('package-manifest.json');
 for(const file of manifest.files){const bytes=readFileSync(join(root,file.path));assert.equal(bytes.length,file.bytes,file.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);}
});
