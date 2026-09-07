import fs from 'node:fs';import path from 'node:path';
const d='docs/factory/research/question-review';const files=[];
for(const n of [37,38,39,40]){const f=`${d}/packet-${n}`;for(const name of fs.readdirSync(f)){const p=f+'/'+name;if(name.endsWith('.md'))fs.writeFileSync(p,fs.readFileSync(p,'utf8').split(/\r?\n/).map(l=>l.trimEnd()).join('\n').trimEnd()+'\n');files.push(p);}files.push(`docs/factory/claude-project/claude-output/review-packet-${n}.json`,`docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-${n}.md`,`${d}/repairs/claude-packet-${n}-repairs.json`,`${d}/followup/packet-${n}-final-recheck.json`);}
files.push(...['csv','html','json'].map(x=>'docs/factory/claude-question-kit/catalog.'+x),...['README.md','catalog-review.json','combined-review.json','current-content-manifest.json','repair-samples.html','packets-37-40-review.md'].map(x=>d+'/'+x),'src/one-on-one/experimental-bank/u18.json','src/one-on-one/experimental-expansion/u18-additions.json','src/one-on-one/experimental-expansion/u18-scenarios.json',...['audit-experimental-coaching.mjs','audit-question-expansion.mjs','build-question-review-summary.mjs','packet-geometry-regressions.test.mjs','coaching-followup-history.test.mjs'].map(x=>'tools/'+x));
const evidence=`# Packets 37–40 adjudication, 2026-09-06

All four immutable Claude returns are complete: 160 source questions across 20 U18 scenes. Structural validation returned zero errors; packet 38 has one investigated warning because F3 is YOU's stated role, not an extra actor.

Root read all source and retained questions and authored the final payloads. Independent Luna reviewers read and approved the exact final hashes before application. The final repairs affect 113 question versions in 20 scenes; shared scene changes affect question hashes without implying 113 independent defects.

## Additional defects found after the source reviews

- Original U18 penalty kill q7 named Gold 2 as backdoor threat, contradicting the assigned Gold 3; fixed. Later hypothetical states are explicitly distinguished from the initial frame.
- Original U18 turnover q7 named the wrong turnover stage, q8 blurred support teams and q10 implied an unshown reception. Fixed current ownership and defensive/attacking responsibilities.
- Expansion point-cover target moved from x16 to x20 toward the net, rather than toward the blue line; replaced with (11,7).
- Expansion low-coverage target (-21,2) was not net-side of Gold 2; replaced with (-25,3).
- Expansion receiving target moved farther from the loose puck. New (0,0) changes distance from 4.472m to 3.162m without assigning possession.
- Further placement feedback now describes actual pressure/distance tradeoffs instead of promising visibility, access or completed coverage. Selected-player views and explicit special-team counts are distinguished.

Luna's initial 39–40 findings missed the point and net-side geometry defects and miscalculated puck distances. Root corrected them; the subsequent independent recheck used serialized coordinates and approved the final bytes. Earlier AI pass labels are not evidence of perfection.

## Verification

Three new regressions failed against the unrepaired bank: point direction, net-side distance and loose-puck approach. Release test/build and browser results will be appended after execution.

Historical follow-ups retain all55 archived versions. This batch changes five additional current-original matches, from35to30; archive mismatches rise from20to25, resolved through immutable receipts. No historical record is deleted.

Original Claude files and the frozen project snapshot remain unchanged. AI review is not human coach approval or mastery admission. Supabase and unrelated app changes are excluded.
`;
fs.writeFileSync(d+'/packets-37-40-review.md',evidence);
const release='tmp/packets-production-release';for(const file of files){const dest=path.join(release,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);}
const line='2026-09-06 · All40 Claude returns are present and adjudicated. Packets37–40 add113 repaired question versions across20 U18 scenes after exact independent review; final isolated release verification underway. Supabase remains deferred.';
for(const root of ['.',release]){const p=path.join(root,'docs/roadmap/TASKS.md');let s=fs.readFileSync(p,'utf8').replace(/\*\*Last updated:\*\*[^\r\n]*/,'**Last updated:** '+line).replace('## Changelog','## Changelog\n\n- '+line);fs.writeFileSync(p,s);}files.push('docs/roadmap/TASKS.md');fs.writeFileSync('tmp/final-packet-release-files.json',JSON.stringify(files,null,2));console.log(files.length);
