import fs from 'node:fs';
import crypto from 'node:crypto';
import {isCoachRoutePoint} from '../src/one-on-one/coachRouteSurfaceInput.js';
const input='docs/factory/claude-ten-hour-project/output/ten-hour-followthrough/draft-revisions.json';
const prior=JSON.parse(fs.readFileSync('docs/factory/claude-ten-hour-project/prior-return/curriculum-drafts.json','utf8')).questionDrafts;
const drafts=JSON.parse(fs.readFileSync(input,'utf8')).drafts;
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const findings={
 'draft26-u15-skate-001-q1':['Recovery speed is inferred from lateral bands without velocity/reach evidence. The explanation calls the lateral difference half a metre, but abs(-11.5 - -10.5) is 1 metre. Its equal-distance statement confuses closest finite-segment distance with perpendicular infinite-line distance. Preserve alternatives; do not key the answer from those claims.','Objective repeats the disproven claim that no skating cue exists at this age.'],
 'draft26-u18-skate-002-q1':['With attack toward +x, F2 at x=14 is 8m farther toward the defended end than F1 at x=6, not trailing 10m behind. Ten metres is Euclidean separation, not longitudinal lag. Correct direction and re-evaluate every answer/feedback dependency.','Objective repeats the disproven claim that no skating cue exists at this age.'],
 'draft26-u7-vocab-001-q1':['No marked line or explicit attacking end is identified in the draft. U7 vocabulary should point to an actual landmark and use concrete wording; current options mix lines with boundaries/shapes. Requires rendered framing check.'],
 'draft26-u7-vocab-002-q1':['Which net and which far boards are not defined. The prompt asks for the closest marking but does not qualify among the choices; crease/goal-line markings are omitted. Mark the target and make comparison scope explicit.'],
 'draft26-u9-receive-001-q1':['The YOU-to-Gold1 infinite-line extension has y=3.9 at F1 x=13, whereas F1 y=1. It does not land at F1 as claimed. No explicit attacked net is specified. Doubling separation lacks a proposed destination. Recompute the actual lane and remove unsupported outcome claims.'],
 'draft26-u9-receive-002-q1':['Clarify control before asking the next pass; reaching a loose puck does not establish possession. Distance-only coverage still requires a qualified tactical check; do not turn proximity into guaranteed coverage.'],
 'draft26-u11-cause-001-q1':['A visible open passing lane does not by itself prove the best action versus holding. Rephrase as a scene-observable comparison or state decision conditions; review the basis:scene label.'],
 'draft26-u11-cause-001-q2':['Player-facing briefing/explanation contains renderer/schema instructions and authoring rationale. Move those to author notes and replace with concise decision-specific feedback. Keep reflection optional at serving time.'],
 'draft26-u11-cause-002-q1':['Attack is -x. F1 at x=-10 is ahead of Gold1 at x=-6 toward that end, not trailing. The answer rationale depends on the incorrect relationship; hold both questions in this scene.'],
 'draft26-u11-cause-002-q2':['Same direction error as q1; catches up is inconsistent with the baseline longitudinal order. Explanation contains authoring comparisons to other drafts. Correct shared setup wording and both question payloads together.'],
};
const rows=drafts.map(d=>{
 const original=prior.find(q=>q.questionId===d.draftId),a=d.after;
 const options=a.options||[];
 return {id:d.draftId,scenarioId:d.scenarioId,status:'hold-not-cleared',beforeHashVerified:!!original&&hash(original)===d.original.sha256,afterHash:hash(a),actorCoordinatesOnIce:a.setup.actors.every(isCoachRoutePoint),answerIdsPresent:a.type==='explain'||(a.answer||[]).every(id=>options.some(o=>o.id===id)),findings:findings[d.draftId],scope:'Structural, arithmetic and clarity review. No qualified hockey approval.',closure:drafts.filter(x=>x.scenarioId===d.scenarioId).map(x=>x.draftId)};
});
if(rows.length!==10||rows.some(r=>!r.beforeHashVerified||!r.findings))throw Error('Draft identity/coverage mismatch');
fs.mkdirSync('docs/factory/followthrough-close',{recursive:true});
fs.writeFileSync('docs/factory/followthrough-close/draft-adjudication.json',JSON.stringify({input,inputSha256:crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex'),status:'all-ten-held',rows},null,2)+'\n');
console.log('10 original hashes verified; 10 staged payloads reviewed and held with individual findings.');
