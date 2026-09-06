export function auditChoiceQuality(bank){
 const cue=/\b(without (?:looking|checking)|regardless|always|never|close your eyes)\b/i;
 const groups=new Map(),flags=[];
 for(const s of bank)for(const q of s.questions){
  if(!['choice','multi'].includes(q.type))continue;
  const row={scenarioId:s.id,scenarioVersion:s.version,questionId:q.id,ageBand:s.ageBand,type:q.type,prompt:q.prompt};
  const hits=q.options.filter(o=>cue.test(o.text)).map(o=>({optionId:o.id,text:o.text,keyed:q.answer.includes(o.id)}));
  if(hits.length)flags.push({...row,reason:'wording-cue-candidate',options:hits,status:'needs-content-review-not-proven-error'});
  if(q.type==='choice'){
   const key=s.ageBand,group=groups.get(key)||{ageBand:key,questions:0,correctPositions:{}};
   const position=q.options.findIndex(o=>q.answer.includes(o.id))+1;
   group.questions++;group.correctPositions[position]=(group.correctPositions[position]||0)+1;groups.set(key,group);
  }
 }
 return {scenarios:bank.length,questions:bank.reduce((n,s)=>n+s.questions.length,0),flaggedQuestions:flags.length,flags,answerPositionByAge:[...groups.values()]};
}
