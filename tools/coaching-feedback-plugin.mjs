import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {readBankFiles} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
import {presentationMetadata} from '../src/one-on-one/choicePresentation.js';
export function validateContextFeedback(value,bank){
 const s=bank.find(s=>s.id===value.scenarioId),q=s?.questions.find(q=>q.id===value.questionId);
 if(!q||s.version!==value.scenarioVersion||questionContentHash(s,q)!==value.contentHash)throw Error('Question changed. Reload before sending. Your note remains saved.');
 if(typeof value.note!=='string'||!value.note.trim()||value.note.length>4000)throw Error('Add a note of 1–4000 characters.');
 if(JSON.stringify(value.context||{}).length>12000)throw Error('Context too large.');
 const rawContext=value.context||{},context={};
 const point=p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Invalid scene point.');return {x:p.x,y:p.y};};
 const text=v=>typeof v==='string'&&v.length>0&&v.length<=100;
 if(rawContext.view!==undefined){if(!['3d','overhead'].includes(rawContext.view))throw Error('Invalid view.');context.view=rawContext.view;}
 if(rawContext.actors!==undefined){if(!Array.isArray(rawContext.actors)||rawContext.actors.length>30)throw Error('Invalid actors.');context.actors=rawContext.actors.map(a=>{if(!text(a.id)||!Number.isFinite(a.facing))throw Error('Invalid actor.');return {id:a.id,...point(a),facing:a.facing};});}
 if(rawContext.puck!==undefined){context.puck=point(rawContext.puck);if(text(rawContext.puck.owner))context.puck.owner=rawContext.puck.owner;}
 for(const field of ['shownOptionIds','choiceOrderVersion'])if(rawContext[field]!==undefined)context[field]=rawContext[field];
 if(q.type!=='explain'&&rawContext.answer!==undefined){const answer=rawContext.answer;if(answer===null)context.answer=null;else if(q.type==='position')context.answer=point(answer);else {const validIds=(q.options||[]).map(o=>o.id);if(!Array.isArray(answer)||answer.length>20||new Set(answer).size!==answer.length||answer.some(id=>!text(id)||!validIds.includes(id)))throw Error('Invalid answer IDs.');context.answer=[...answer];}}
 if(context.shownOptionIds!==undefined||context.choiceOrderVersion!==undefined){
  const verified=presentationMetadata(q,Array.isArray(context.shownOptionIds)?context.shownOptionIds.map(id=>({id})):[]);
  if(!verified.shownOptionIds||verified.choiceOrderVersion!==context.choiceOrderVersion)throw Error('Displayed choices do not match the question.');
 }
 const allowed=['Scene looks wrong','Wording unclear','Answer questionable','Too easy/hard','This works well'];
 return {id:crypto.randomUUID(),receivedAt:new Date().toISOString(),status:'new',questionId:q.id,scenarioId:s.id,scenarioVersion:s.version,afterHash:value.contentHash,note:value.note.trim(),tags:(value.tags||[]).filter(t=>allowed.includes(t)),context,questionSnapshot:q};
}
export function mergeFeedbackHistory(notes,dispositions){return notes.map(note=>{const updates=dispositions.filter(d=>d.feedbackId===note.id&&['investigating','changed','needs-context','no-change'].includes(d.status));return {...note,status:updates.at(-1)?.status||'received',updates,internalNotes:dispositions.filter(d=>d.feedbackId===note.id&&d.status==='internal-note')};});}
const lines=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l)):[];
export function playerFeedbackView(notes,owner){return owner?notes.filter(n=>n.ownerId===owner).map(n=>({id:n.id,note:n.note,questionId:n.questionId,receivedAt:n.receivedAt,status:n.status,updates:n.updates.filter(u=>u.publicSummary).map(u=>({status:u.status,summary:u.publicSummary}))})):[];}
export function validateFeedback(value,pack,hash){
 if(value?.packetSha256!==hash)throw Error('This draft changed. Reload before sending feedback.');
 const q=pack.directChanges.find(q=>q.questionId===value.questionId);
 if(value.questionId!=='general'&&!q)throw Error('Unknown question.');
 if(typeof value.note!=='string'||!value.note.trim()||value.note.length>4000)throw Error('Add a note of 1–4000 characters.');
 return {id:crypto.randomUUID(),receivedAt:new Date().toISOString(),status:'new',questionId:value.questionId,afterHash:q?.afterHash||null,packetSha256:hash,note:value.note.trim()};
}
export function coachingFeedbackPlugin(){return {name:'local-coaching-feedback',configureServer(server){
 server.middlewares.use('/__coaching-feedback',async(req,res,next)=>{
  if(!['POST','GET'].includes(req.method))return next();
  const host=req.headers.host||'';
  const sameOrigin=req.headers.origin===`http://${host}`||(req.method==='GET'&&!req.headers.origin&&req.headers['sec-fetch-site']==='same-origin');
  if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||!sameOrigin){res.statusCode=403;return res.end('Local same-origin requests only.');}
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  const dir=path.join(server.config.root,'tmp/coaching-feedback');
  if(req.method==='GET'){try{const notes=mergeFeedbackHistory(lines(path.join(dir,'inbox.jsonl')),lines(path.join(dir,'dispositions.jsonl')));const admin=new URL(req.url,'http://localhost').searchParams.get('view')==='admin';return res.end(JSON.stringify({previewOnly:true,notes:admin?notes:playerFeedbackView(notes,req.headers['x-feedback-owner'])}));}catch{res.statusCode=500;return res.end(JSON.stringify({error:'Could not read feedback history.'}));}}
  try{let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>20000)throw Error('Feedback too large.');}
   if(new URL(req.url,'http://localhost').searchParams.get('action')==='comment'){
    const v=JSON.parse(body);if(!lines(path.join(dir,'inbox.jsonl')).some(n=>n.id===v.feedbackId)||typeof v.note!=='string'||!v.note.trim()||v.note.length>4000)throw Error('Require an existing feedback item and a short note.');
    fs.appendFileSync(path.join(dir,'dispositions.jsonl'),JSON.stringify({feedbackId:v.feedbackId,status:'internal-note',summary:v.note.trim(),recordedAt:new Date().toISOString()})+'\n');return res.end(JSON.stringify({saved:true}));
   }
   const file=path.join(server.config.root,'docs/factory/coaching-panel/pilot-2026-09-06/staged-repairs.json');
   const raw=fs.readFileSync(file,'utf8'),hash=crypto.createHash('sha256').update(raw).digest('hex');
   const value=JSON.parse(body),pack=JSON.parse(raw);
   const bank=value.scope==='coaching-pilot-2026-09-06'?pack.scenarios:value.scope==='skating-2026-09-06'?JSON.parse(fs.readFileSync(path.join(server.config.root,'docs/factory/calibration/skating-movement-2026-09-06.json'),'utf8')).candidates:readBankFiles().bank;
   const entry=value.contentHash?validateContextFeedback(value,bank):validateFeedback(value,pack,hash);
   const owner=req.headers['x-feedback-owner'];if(typeof owner==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(owner))entry.ownerId=owner;
   fs.mkdirSync(dir,{recursive:true});
   fs.appendFileSync(path.join(dir,'inbox.jsonl'),JSON.stringify(entry)+'\n');
   res.end(JSON.stringify({saved:true,id:entry.id}));
  }catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.message}));}
 });
}}}
