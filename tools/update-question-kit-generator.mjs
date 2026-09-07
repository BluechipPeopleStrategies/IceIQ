import {readFileSync,writeFileSync} from 'node:fs';
const path='tools/build-question-catalog.mjs';
let source=readFileSync(path,'utf8');
source=source.replace("const url='http://localhost:5173/?arena=experimental&age='", "const url=(location.protocol.startsWith('http')?location.origin:'http://localhost:5173')+'/?arena=experimental&age='");
source=source.replace(/function updateBrief\(\)\{[^\n]+/,String.raw`function updateBrief(){
 const targets=[...selected].map(id=>byId.get(id)),referenceAges=[...new Set(targets.map(s=>s.ageBand))],targetAge=$('age').value||(referenceAges.length===1?referenceAges[0]:'');
 const assignment=targetAge?'Create five NEW '+targetAge+' scenarios with six questions each.':'Ask me for the target age and topic before creating five new scenarios with six questions each.';
 $('brief').value='Follow the attached RinkReads START-HERE.md authoring contract. '+assignment+' Use unique batch and scenario IDs. Return a draft-not-reviewed JSON batch, with an empty additions array. Each new situation must add a different decision or cue beyond the reference scenes below. Include scene-specific explanations and believable alternatives. No changes to existing IDs or content. '+(referenceAges.length?'Reference ages: '+referenceAges.join(', ')+'. Adapt their principles to the target age; do not carry a different age format or rule into the new scene.':'No reference scenes selected.')+'\\n\\n'+JSON.stringify(context(),null,2);
}`);
writeFileSync(path,source);
