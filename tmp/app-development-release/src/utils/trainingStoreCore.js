export const trainingLocalDate=(date=new Date(),timeZone)=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',...(timeZone?{timeZone}:{})}).format(date);
const KEY='rinkreads_training_log';
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const signature=row=>JSON.stringify(['date','type','value','unit','label','notes','coach','price'].map(k=>k==='value'?Number(row[k]):k==='price'?(row[k]==null||row[k]===''?null:Number(row[k])):row[k]??''));
export function trainingTotals(rows){return rows.reduce((total,row)=>{const value=Number(row.value);if(Number.isFinite(value)&&value>=0){if(row.unit==='min')total.minutes+=value;if(row.unit==='pucks')total.pucks+=value;}return total;},{minutes:0,pucks:0});}

export function mergeTrainingRows(local,remote){
 const result=local.map(row=>({...row})),matched=new Set();
 for(const row of remote){
  if(!row?.id)continue;
  const at=result.findIndex(item=>item.id===row.id);
  if(at>=0){if(result[at].sync!=='pending')result[at]={...result[at],...row,sync:'synced'};continue;}
  // One-to-one matching only. Two similar sessions may both be real sessions.
  const legacy=result.findIndex((item,i)=>!item.id&&!matched.has(i)&&signature(item)===signature(row));
  if(legacy>=0){matched.add(legacy);result[legacy]={...result[legacy],...row,sync:'synced'};}
  else result.push({...row,sync:'synced'});
 }
 return result;
}

export function createTrainingStore({storage,remoteSave,remoteRead,isEphemeral=()=>false,uuid=()=>crypto.randomUUID(),now=()=>new Date()}){
 const active=new Map();
 const readAll=()=>{const raw=storage.getItem(KEY);if(raw===null)return {};const all=JSON.parse(raw);if(!object(all))throw Error('Training history could not be read.');return all;};
 function read(playerId){const all=readAll();const log=all[playerId]??{sessions:[]};if(!object(log)||!Array.isArray(log.sessions)||log.sessions.some(row=>!object(row)))throw Error('Training history could not be read.');return log;}
 function write(playerId,sessions){const all=readAll();const previous=read(playerId);storage.setItem(KEY,JSON.stringify({...all,[playerId]:{...previous,sessions}}));}
 function save(playerId,input){
  if(typeof playerId!=='string'||!playerId)throw Error('Choose a player before saving.');
  const date=input.date||trainingLocalDate(now());
  const today=trainingLocalDate(now());
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)!==date||date>today)throw Error('Choose a valid date up to today.');
  const value=Number(input.value),price=input.price==null||input.price===''?null:Number(input.price);
  if(!Number.isFinite(value)||value<=0||!input.type||!input.unit||(price!==null&&(!Number.isFinite(price)||price<0)))throw Error('Check the activity amount and cost.');
  const row={...input,id:uuid(),date,value,price,createdAt:now().toISOString(),sync:isEphemeral(playerId)?'local':'pending'};
  write(playerId,[...read(playerId).sessions,row]);return row;
 }
 async function runSync(playerId){
  if(isEphemeral(playerId))return {status:'local'};
  let failed=false;
  try{
   for(const row of read(playerId).sessions.filter(row=>row.id&&row.sync==='pending')){
    try{
     const receipt=await remoteSave(playerId,row);
     if(receipt?.id!==row.id)throw Error('No save acknowledgement');
     write(playerId,read(playerId).sessions.map(current=>current.id===row.id?{...current,sync:'synced'}:current));
    }catch{failed=true;}
   }
   try{const remote=await remoteRead(playerId);if(!Array.isArray(remote))throw Error('No remote history');write(playerId,mergeTrainingRows(read(playerId).sessions,remote));}catch{failed=true;}
   return {status:failed?'pending':'synced'};
  }catch{return {status:'unavailable'};}
 }
 function sync(playerId){if(active.has(playerId))return active.get(playerId);const task=runSync(playerId).finally(()=>active.delete(playerId));active.set(playerId,task);return task;}
 return {read,save,sync};
}
