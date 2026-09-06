import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function validateFeedback(value,pack,hash){
 if(value?.packetSha256!==hash)throw Error('This draft changed. Reload before sending feedback.');
 const q=pack.directChanges.find(q=>q.questionId===value.questionId);
 if(value.questionId!=='general'&&!q)throw Error('Unknown question.');
 if(typeof value.note!=='string'||!value.note.trim()||value.note.length>4000)throw Error('Add a note of 1–4000 characters.');
 return {id:crypto.randomUUID(),receivedAt:new Date().toISOString(),status:'new',questionId:value.questionId,afterHash:q?.afterHash||null,packetSha256:hash,note:value.note.trim()};
}
export function coachingFeedbackPlugin(){return {name:'local-coaching-feedback',configureServer(server){
 server.middlewares.use('/__coaching-feedback',async(req,res,next)=>{
  if(req.method!=='POST')return next();
  const host=req.headers.host||'';
  if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||req.headers.origin!==`http://${host}`){res.statusCode=403;return res.end('Local same-origin requests only.');}
  res.setHeader('Content-Type','application/json');
  try{let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>20000)throw Error('Feedback too large.');}
   const file=path.join(server.config.root,'docs/factory/coaching-panel/pilot-2026-09-06/staged-repairs.json');
   const raw=fs.readFileSync(file,'utf8'),hash=crypto.createHash('sha256').update(raw).digest('hex');
   const entry=validateFeedback(JSON.parse(body),JSON.parse(raw),hash);
   const dir=path.join(server.config.root,'tmp/coaching-feedback');fs.mkdirSync(dir,{recursive:true});
   fs.appendFileSync(path.join(dir,'inbox.jsonl'),JSON.stringify(entry)+'\n');
   res.end(JSON.stringify({saved:true,id:entry.id}));
  }catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.message}));}
 });
}}}
