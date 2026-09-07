import fs from 'node:fs';
import {readBankFiles} from '../tools/experimental-bank-files.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../docs/factory/claude-project/claude-output/review-packet-01-calibration.json',import.meta.url),'utf8'));
const bank=readBankFiles().bank;
const changed=(before,after,skip=[])=>Object.keys(after).filter(key=>!skip.includes(key)&&JSON.stringify(before[key])!==JSON.stringify(after[key])).map(field=>({field,before:before[field],after:after[field]}));
const diffs=data.repairs.map(repair=>{
  const scene=bank.find(s=>s.id===repair.scenarioId);
  const questions=repair.replacement.questions.flatMap(q=>{
    const fields=changed(scene.questions.find(old=>old.id===q.id),q);
    return fields.length?[{id:q.id,fields}]:[];
  });
  return {id:scene.id,scene:changed(scene,repair.replacement,['questions','version']),questions};
});
fs.writeFileSync(new URL('./claude-calibration-diff.json',import.meta.url),JSON.stringify(diffs,null,2));
console.log(JSON.stringify(diffs.filter(s=>process.argv.slice(2).some(id=>s.id.includes(id))),null,2));
