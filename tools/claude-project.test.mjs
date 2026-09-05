import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {readBankFiles} from './experimental-bank-files.mjs';
const root='docs/factory/claude-project',read=file=>JSON.parse(readFileSync(join(root,file),'utf8'));

test('Claude package covers each current scene/question exactly once and preserves exact review evidence',()=>{
 const snapshot=read('bank-snapshot.json');assert.deepEqual(snapshot.scenarios,readBankFiles().bank);
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
