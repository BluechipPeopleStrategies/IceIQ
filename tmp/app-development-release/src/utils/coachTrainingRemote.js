const SENTINEL='__general_notes__';
const emptyRatings=()=>({ratings:{},notes:{},assessments:[]});
export function createCoachTrainingRemote(db){
 function available(){if(!db)throw Error('Cloud connection is unavailable.');return db;}
 async function owner(expected){const {data,error}=await available().auth.getSession();if(error)throw error;const id=data?.session?.user?.id;if(!id||(expected&&id!==expected))throw Error('Sign in with the account that owns this record.');return id;}
 async function ratings(playerId,coachId){
  try{
   let query=available().from('coach_ratings').select('coach_id, skill_id, value, note, updated_at').eq('player_id',playerId).neq('skill_id',SENTINEL);
   if(coachId)query=query.eq('coach_id',coachId);
   const {data,error}=await query.order('updated_at',{ascending:true});if(error)throw error;
   const result=emptyRatings();result.assessments=(data||[]).filter(row=>row.skill_id!==SENTINEL);
   for(const row of result.assessments){result.ratings[row.skill_id]=row.value;result.notes[row.skill_id]=row.note||'';}
   return result;
  }catch(error){if(coachId)throw error;return {...emptyRatings(),error:'Coach feedback is unavailable. Try again later.'};}
 }
 async function saveRatings(coachId,playerId,values,notes){
  await owner(coachId);
  const rows=Object.entries(values).filter(([skill,value])=>skill!==SENTINEL&&value).map(([skill_id,value])=>({coach_id:coachId,player_id:playerId,skill_id,value,note:notes?.[skill_id]||null,updated_at:new Date().toISOString()}));
  if(!rows.length)return;
  const {error}=await db.from('coach_ratings').upsert(rows,{onConflict:'coach_id,player_id,skill_id'});if(error)throw error;
 }
 async function privateNote(playerId){
  const coachId=await owner();
  const {data,error}=await db.from('coach_private_notes').select('note').eq('coach_id',coachId).eq('player_id',playerId).maybeSingle();if(error)throw error;
  if(data)return data.note||'';
  // Preserve old author-owned notes until the coach explicitly saves the new store.
  const legacy=await db.from('coach_ratings').select('note').eq('coach_id',coachId).eq('player_id',playerId).eq('skill_id',SENTINEL).maybeSingle();
  if(legacy.error)throw legacy.error;return legacy.data?.note||'';
 }
 async function savePrivateNote(coachId,playerId,note){
  await owner(coachId);
  const {error}=await db.from('coach_private_notes').upsert({coach_id:coachId,player_id:playerId,note:note||'',updated_at:new Date().toISOString()},{onConflict:'coach_id,player_id'});if(error)throw error;
 }
 async function saveTraining(playerId,session){
  await owner(playerId);if(!session.id)throw Error('A stable training entry ID is required.');
  const row={id:session.id,player_id:playerId,session_date:session.date,type:session.type,value:Number(session.value),unit:session.unit,label:session.label||null,notes:session.notes||null,coach:session.coach||null,price:session.price==null||session.price===''?null:Number(session.price),...(session.createdAt?{created_at:session.createdAt}:{})};
  const {data,error}=await db.from('training_sessions').upsert(row,{onConflict:'id'}).select('id').single();
  if(error)throw error;if(data?.id!==session.id)throw Error('The training save was not acknowledged.');return {id:data.id};
 }
 async function training(playerId,{strict=false}={}){
  try{
   available();const rows=[];
   for(let offset=0;;offset+=200){
    const {data,error}=await db.from('training_sessions').select('id, session_date, type, value, unit, label, notes, coach, price, created_at').eq('player_id',playerId).order('session_date',{ascending:false}).order('id',{ascending:false}).range(offset,offset+199);
    if(error)throw error;rows.push(...(data||[]));if(!data||data.length<200)break;
   }
   return rows.map(row=>({id:row.id,date:row.session_date,type:row.type,value:Number(row.value),unit:row.unit,label:row.label||'',notes:row.notes||'',coach:row.coach||'',price:row.price==null?null:Number(row.price),createdAt:row.created_at}));
  }catch(error){if(strict)throw error;return [];}
 }
 return {ratings,saveRatings,privateNote,savePrivateNote,saveTraining,training};
}
