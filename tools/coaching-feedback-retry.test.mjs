import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {coachingFeedbackPlugin} from './coaching-feedback-plugin.mjs';

test('concurrent retries persist once, survive restart, reject changed payload and preserve distinct notes/owners', async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rr-feedback-retry-'));
 const packet=JSON.stringify({directChanges:[{questionId:'q1',afterHash:'hash'}],scenarios:[]});
 const dir=path.join(root,'docs/factory/coaching-panel/pilot-2026-09-06');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'staged-repairs.json'),packet);
 const start=async()=>{let middleware;coachingFeedbackPlugin().configureServer({config:{root},middlewares:{use:(_path,fn)=>middleware=fn}});const server=http.createServer((req,res)=>middleware(req,res,()=>res.end()));await new Promise(r=>server.listen(0,'127.0.0.1',r));return server;};
 let server=await start();
 const body={scope:'coaching-pilot-2026-09-06',packetSha256:crypto.createHash('sha256').update(packet).digest('hex'),questionId:'q1',note:'SYNTHETIC retry note',submissionId:crypto.randomUUID()};
 const post=async(value=body,owner='owner-1111111111111111')=>{const origin=`http://127.0.0.1:${server.address().port}`;const r=await fetch(origin+'/__coaching-feedback',{method:'POST',headers:{origin,'content-type':'application/json','x-feedback-owner':owner},body:JSON.stringify(value)});return {status:r.status,...await r.json()};};
 const rows=()=>fs.readFileSync(path.join(root,'tmp/coaching-feedback/inbox.jsonl'),'utf8').trim().split('\n');
 try {
  const results=await Promise.all(Array.from({length:8},()=>post()));assert.ok(results.every(r=>r.saved));assert.equal(new Set(results.map(r=>r.id)).size,1);assert.equal(rows().length,1);
  await new Promise(r=>server.close(r));server=await start();assert.equal((await post()).id,results[0].id);assert.equal(rows().length,1);
  assert.equal((await post({...body,note:'Changed payload'})).status,400);assert.equal(rows().length,1);
  assert.notEqual((await post({...body,submissionId:crypto.randomUUID()})).id,results[0].id);
  assert.notEqual((await post(body,'owner-2222222222222222')).id,results[0].id);assert.equal(rows().length,3);
 }finally{await new Promise(r=>server.close(r));assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('rr-feedback-retry-'));fs.rmSync(root,{recursive:true,force:true});}
});
