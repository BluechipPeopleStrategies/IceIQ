import {loadFlow,normalizeAge,STAGES,canContinue} from '../one-on-one/foundationFlowCore.js';
export function pilotHomeModel({playerId,ageBand,storage}={}){
  const age=normalizeAge(ageBand),supported=!!playerId&&['U7','U9','U11'].includes(age);
  if(!supported)return {supported:false,age};
  const {flow,available}=loadFlow(storage,{playerId,ageBand:age});
  const started=flow.stage>0||flow.spots.length>0;
  const explored=STAGES.map((_,stage)=>stage<5&&canContinue({...flow,stage}));
  return {supported:true,age,available,stage:flow.stage,next:STAGES[flow.stage],label:flow.stage===5?'View recap':started?'Continue':'Start',completed:explored.slice(0,5).every(Boolean),explored,started};
}
