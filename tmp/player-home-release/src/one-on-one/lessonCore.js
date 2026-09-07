import { masteryDescriptor } from './spacedMasteryCore.js';

export const TYPE_LABELS = {mc:'Multiple choice',tf:'True / false',next:'What happens next?',mistake:'Spot the mistake',seq:'Sequence',multi:'Choose all that apply',scenario:'On-ice scenario','animated-play':'Read the play'};
export function libraryMasteryDescriptor(item) {
  const format=item.type==='scenario'?`scenario:${item.source.interaction?.type||item.source.interaction?.kind||item.source.kind||'unknown'}`:item.type;
  return masteryDescriptor(item.source,{ageBand:item.age,concept:item.concept,format,origin:item.masteryOrigin});
}
export function questionOptions(q) {
  if(q.type==='tf') return [{value:true,text:'True'},{value:false,text:'False'}];
  return (q.opts || q.choices || []).map((text,value)=>({value,text}));
}
export function scoreLesson(q,answer) {
  if(q.type==='tf') return typeof answer==='boolean' && answer===q.ok;
  if(q.type==='seq') return Array.isArray(answer) && answer.length===q.correct_order?.length && answer.every((x,i)=>x===q.correct_order[i]);
  if(q.type==='multi') {const expected=q.correct_indices || q.correct || q.ok;return Array.isArray(expected)&&Array.isArray(answer)&&answer.length===expected.length&&expected.every(i=>answer.includes(i));}
  return Number.isInteger(answer) && answer===(q.ok ?? q.correct);
}
export function creditLesson(progress,key,correct) {
  if(typeof correct!=='boolean')throw new TypeError('correct must be boolean');
  const old=progress[key];
  return {...progress,[key]:{firstCorrect:old?.firstCorrect ?? correct,lastCorrect:correct,mastered:old?.mastered===true,points:Number.isFinite(old?.points)?old.points:0}};
}
export function buildLibrary(bank,plays) {
  const rows=Object.entries(bank).flatMap(([age,items])=>items.map(source=>({key:`${age}:${source.id}`,age,type:source.type||'mc',concept:source.conceptId||source.concepts?.[0]||source.concept||String(source.nodeId||'').match(/^u(?:7|9|11|13|15|18)\.(.+)$/i)?.[1]||'',title:source.title||source.sit||source.q||source.prompt||source.id,masteryOrigin:'existing-served',source})));
  for(const source of plays) for(const band of source.ageBands||['U7','U9','U11','U13','U15','U18']) {
    const age=Object.keys(bank).find(a=>a.startsWith(`${band} `))||band;
    rows.push({key:`${age}:${source.id}`,age,type:'animated-play',concept:source.concept,title:source.title,source});
  }
  return rows;
}
