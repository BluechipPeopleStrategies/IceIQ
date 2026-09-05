export const TYPE_LABELS = {mc:'Multiple choice',tf:'True / false',next:'What happens next?',mistake:'Spot the mistake',seq:'Sequence',multi:'Choose all that apply',scenario:'On-ice scenario','animated-play':'Read the play'};
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
  const old=progress[key];
  return {...progress,[key]:{firstCorrect:old?.firstCorrect ?? correct,mastered:!!(correct||old?.mastered),points:correct||old?.mastered?100:0}};
}
export function buildLibrary(bank,plays) {
  const rows=Object.entries(bank).flatMap(([age,items])=>items.map(source=>({key:`${age}:${source.id}`,age,type:source.type||'mc',concept:source.conceptId||source.concepts?.[0]||source.concept||'',title:source.title||source.sit||source.q||source.prompt||source.id,source})));
  for(const source of plays) for(const band of source.ageBands||['U7','U9','U11','U13','U15','U18']) {
    const age=Object.keys(bank).find(a=>a.startsWith(`${band} `))||band;
    rows.push({key:`${age}:${source.id}`,age,type:'animated-play',concept:source.concept,title:source.title,source});
  }
  return rows;
}
