export const CHOICE_ORDER_VERSION='choice-order-v1';
let fallbackSeed;
export function choiceSeed(storage){
 if(!fallbackSeed)fallbackSeed=globalThis.crypto?.randomUUID?.()||`local-${Math.random().toString(36).slice(2)}`;
 try{const target=storage??globalThis.localStorage,key='rr-choice-presentation-v1',saved=target?.getItem(key);if(typeof saved==='string'&&saved.length>0&&saved.length<=120)return saved;target?.setItem(key,fallbackSeed);}catch{}
 return fallbackSeed;
}
export function presentChoices(q,{contentHash='',seed='',preserveOrder=false}={}){
 const options=[...(q.options||[])];if(!['choice','multi'].includes(q.type)||preserveOrder)return options;
 // FNV seed + Mulberry32: answer keys never enter the permutation.
 let n=2166136261;for(const c of `${CHOICE_ORDER_VERSION}|${q.id}|${contentHash}|${seed}`)n=Math.imul(n^c.charCodeAt(0),16777619);
 const random=()=>{n+=0x6D2B79F5;let t=Math.imul(n^n>>>15,1|n);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};
 for(let i=options.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
 return options;
}
export function presentationMetadata(q,options){
 if(!['choice','multi'].includes(q.type)||!Array.isArray(options)||!Array.isArray(q.options))return {};
 const ids=options.map(o=>o.id),valid=q.options.map(o=>o.id);
 if(ids.length!==valid.length||ids.length>20||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!valid.includes(id)))return {};
 return {shownOptionIds:ids,choiceOrderVersion:CHOICE_ORDER_VERSION};
}
