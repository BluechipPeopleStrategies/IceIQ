import {useEffect,useMemo} from 'react';
import {evaluatePlacement,placementSource} from './placementEvaluation.js';
import pack from '../../docs/factory/coaching-panel/placement-pilot.json';
export default function PlacementFeedback({scenario,question,scene,point,onTry,onExample,onNext}){
 const rubric=import.meta.env.DEV?pack.rubrics.find(r=>r.questionId===question.id):null;
 const result=useMemo(()=>evaluatePlacement({scene,point,rubric,questionId:question.id,scenarioVersion:scenario.version,sourceSignature:placementSource(scenario,question)}),[scene,point,rubric,scenario,question]);
 useEffect(()=>{if(!result.previewBand)return;try{const key='rr-placement-preview-events',rows=JSON.parse(localStorage.getItem(key)||'[]');const event={questionId:question.id,contentHash:rubric.contentHash,rubricHash:rubric.rubricHash,point,band:result.previewBand,criteria:result.criteria,masteryEligible:false};const serial=JSON.stringify(event);if(rows.at(-1)?.signature!==serial){rows.push({at:new Date().toISOString(),signature:serial,...event});localStorage.setItem(key,JSON.stringify(rows.slice(-300)))}}catch{}},[result,point,question.id,rubric]);
 return <section aria-label="Placement feedback" className="rr-feedback"><strong>{result.previewBand?{strong:'Draft check: strong geometry',workable:'Draft check: workable with a tradeoff',adjust:'Draft check: try adjusting'}[result.previewBand]:'Placement needs judgment'}</strong>
 {result.previewBand?<><ul>{result.criteria.slice(0,3).map(c=><li key={c.id}><b>{c.band==='strong'?'Works':c.band==='workable'?'Tradeoff':'Adjust'}:</b> {c.reason}</li>)}</ul><small>Experimental geometry ranges. They do not predict a completed pass or award mastery.</small></>:<p>{result.reason} Compare the passing lane, spacing and pressure with the example.</p>}
 <p><button type="button" onClick={onTry}>Try another spot</button>{onNext&&<button type="button" onClick={onNext}>Next question →</button>}</p><details><summary>Compare the example</summary><p>{question.explanation}</p><button type="button" onClick={onExample}>Show example on overhead board</button></details></section>;
}
