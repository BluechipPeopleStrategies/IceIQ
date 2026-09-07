import {readFileSync,writeFileSync} from 'node:fs';
const file='tools/build-question-catalog.mjs';
let source=readFileSync(file,'utf8');
const edits=[
 ["import {writeFileSync,mkdirSync,existsSync}","import {writeFileSync,mkdirSync,existsSync,readFileSync}"],
 ["const embedded=JSON.stringify({bank,rows})","const authoringInstructions=readFileSync(join(directory,'START-HERE.md'),'utf8');\nconst embedded=JSON.stringify({bank,rows,authoringInstructions})"],
 ['<span class="kicker">MAKE A CLAUDE BATCH</span><h2>Pick a small assignment.</h2><p>Select up to five scenarios below for context. Copy the brief into Claude with <a href="START-HERE.md">the authoring instructions</a>, or download the context as JSON. Start with five new situations and six questions each.</p>', '<span class="kicker">CREATE MORE QUESTIONS WITH CLAUDE</span><h2>Give Claude a clear assignment.</h2><p>This prepares instructions and examples for you to paste into Claude. It does not generate questions or contact Claude.</p><ol><li>Choose an age and topic below. Optionally select up to five scenes as examples.</li><li>Copy the assignment and paste it into a Claude conversation. It includes our complete authoring instructions.</li><li>Bring Claude’s returned JSON file here. We’ll validate it, review the hockey reasoning and repair issues before adding it to experimental practice.</li></ol><p class="muted">The starting assignment is five new situations with six questions each. You can change that request in Claude. <a href="START-HERE.md">Read the authoring guide</a>.</p>'],
 ['id="copy">Copy Claude brief</button><button id="context">Download context</button>', 'id="copy">Copy assignment for Claude</button><button id="context">Download selected examples</button>'],
 ['<summary>Read or manually copy the brief</summary>', '<summary>Preview what you’ll paste into Claude</summary>'],
 ["const {bank,rows}=JSON.parse", "const {bank,rows,authoringInstructions}=JSON.parse"],
 ["$('brief').value='Follow the attached RinkReads START-HERE.md authoring contract. '+assignment+", "$('brief').value=assignment+($('topic').value?' Focus on '+$('topic').value+'.':'')+"],
 ["+'\\\\n\\\\n'+JSON.stringify(context(),null,2);", "+'\\\\n\\\\nAUTHORING CONTRACT\\\\n'+authoringInstructions+'\\\\n\\\\nREFERENCE SCENES\\\\n'+JSON.stringify(context(),null,2);"],
];
for(const [before,after] of edits){if(!source.includes(before))throw Error('Missing exact catalog snippet: '+before.slice(0,100));source=source.replace(before,after);}
writeFileSync(file,source);
const samplesFile='tools/build-question-repair-samples.mjs';
let samples=readFileSync(samplesFile,'utf8');
samples=samples.replace('function question(q){return', 'function question(q,s){return');
samples=samples.replace("esc(q.prompt)+'</p>'+(q.options?", "esc(q.prompt)+'</p>'+(q.type==='position'?'<p class=\"note\"><b>Player moved:</b> '+esc(s.actorNames[q.actorId]||q.actorId)+'<br><b>Example position:</b> '+esc(q.reference.x)+', '+esc(q.reference.y)+' metres from rink centre</p>':'')+(q.options?");
samples=samples.replace('question(s.before)', 'question(s.before,s)').replace('question(s.after)', 'question(s.after,s)');
writeFileSync(samplesFile,samples);
console.log('Clarified the Claude handoff and placement repair comparison.');
