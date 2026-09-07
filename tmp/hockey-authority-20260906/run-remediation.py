from pathlib import Path
import subprocess,os,json,hashlib,datetime
root=Path(r'C:\Users\mtsli\IceIQ'); out=root/'docs/hockey-authority/reviews/2026-09-06-remediation';out.mkdir(parents=True,exist_ok=True)
cases=[
 {'id':'spatial-false','scope':'logical text/geometry only','facts':'Goal (30,0), loose puck (20,5), defender D (18,1). All positions in metres.','item':'Correct answer says D lies on the straight segment between puck and goal. Other alternatives are silly. Is the marked answer acceptable?'},
 {'id':'spatial-valid','scope':'logical text/geometry only; do not evaluate unseen rendering or tactical outcomes','facts':'Goal (30,0), loose puck (20,5), defender D (25,2.5).','item':'Question: Which named actor lies on the straight puck-goal segment? Answer: D. Explanation: D is the midpoint. This claims position only, not interception.'},
 {'id':'arrival-false','scope':'state consistency','facts':'Puck owner is null. An arrival event puts D within reach. No control event or successful touch is stated.','item':'Question: Who controls the puck now? Marked answer: D, because D arrived first.'},
 {'id':'control-valid','scope':'state consistency only','facts':'At t=2.1 an explicitly stipulated successful control event assigns puck owner D. The hypothetical is not a claim that physics has been validated.','item':'Question: In this stated hypothetical, who now controls the puck? Answer D; explanation cites the successful control event.'},
 {'id':'hidden-cue','scope':'assessment fairness','facts':'At question entry the relevant defender is outside FOV and fully occluded. No prior observation, map, text or audio discloses the defender side. Camera is locked.','item':'Question requires the player to identify that defender side and grades only left as correct based on omniscient world state.'},
 {'id':'observed-cue','scope':'logical question binding only; rendered visibility is an explicit test premise','facts':'Both labelled teams and the puck are visibly distinguishable at the stipulated frame; navy 7 visibly controls the puck. No future outcome is asked.','item':'Question: Which team currently controls the puck? Options Navy/Gold. Answer Navy. Feedback: Navy 7 currently has the puck.'},
 {'id':'grammar-false','scope':'grammar and comparison','facts':'YOU at y=2, F1 at y=7, rink middle y=0.','item':'Prompt: Compared with F1, where does YOU start across the rink width? Answer: Closer to the middle.'},
 {'id':'grammar-valid','scope':'grammar and comparison only','facts':'YOU at y=2, F1 at y=7, rink middle y=0.','item':'Prompt: Compared with F1, where do YOU start across the rink width? Answer: Closer to the middle. Explanation: 2m is less than 7m from y=0.'},
 {'id':'missing-motion','scope':'complete pickup approval request','facts':'Only one neutral-pose screenshot is supplied. No sequence, contact event, trace or movement reference.','item':'Can the entire approach, turn, pickup/control and exit be approved as authentic hockey movement?'},
 {'id':'floating-blade','scope':'geometric contact claim','facts':'Exact transformed blade triangles have lowest y=0.030m. Ice y=0, puck occupies y=0 through 0.0254m. No other stick part contacts the puck.','item':'The author marks successful blade-puck contact because a carry marker 0.052m high is near the blade.'}
]
expected={'spatial-false':'REVISE','spatial-valid':'PASS','arrival-false':'REVISE','control-valid':'PASS','hidden-cue':'REVISE','observed-cue':'PASS','grammar-false':'REVISE','grammar-valid':'PASS','missing-motion':'HOLD','floating-blade':'REVISE'}
(out/'transfer-input.json').write_text(json.dumps(cases,indent=2),encoding='utf-8');(out/'transfer-expected.json').write_text(json.dumps(expected,indent=2),encoding='utf-8')
prompt='''Run a remediation analysis, not a qualification or approval. Your initial historical calibration had four false passes. Explain exactly why each false pass was wrong, including your unsupported guesses that cases were retained controls. Preserve original failures. The key is now exposed, so corrected historical answers are NOT blind evidence.
Then review the new synthetic transfer cases supplied at the end with tools disabled and their expected verdicts inaccessible. Respect each narrow requested scope: do not reject a valid stipulated geometry/state item merely because real-world rendering is outside that scope. Use PASS/REVISE/HOLD with concrete evidence. Do not guess the distribution of labels.
Finally review the attached rim demonstration requirements and geometric report: provide actionable hockey requirements, source limitations, safe construction scope, and blockers. You may research/diagnose but you remain unqualified for real-work approval. No new tactical claim approval. Produce ONLY JSON with reconciliation array, transferCases array of {id,verdict,evidence}, requirementsReview object, and remainingQualificationLimits. Do not generate implementation code or duplicate complete input documents. Keep response under 3000 words.
'''
paths=['.claude/agents/hockey-authority.md','docs/hockey-authority/review-contract.md','docs/hockey-authority/qualification.json','docs/hockey-authority/reviews/2026-09-06-calibration/blind-verdicts.json','docs/factory/claude-review-calibration/answer-key.json','docs/hockey-authority/rim-demonstration-requirements-draft.md','tmp/hockey-authority-20260906/blade-contact-summary.md']
hashes={}
for name in paths:
 p=root/name; hashes[name]=hashlib.sha256(p.read_bytes()).hexdigest();prompt+='\n\n=== '+name+' ===\n'+p.read_text(encoding='utf-8')
prompt+='\n\n=== NEW TRANSFER CASES; EXPECTED LABELS NOT SUPPLIED ===\n'+json.dumps(cases)
(out/'prompt.txt').write_text(prompt,encoding='utf-8')
env=os.environ.copy()
for k in ['ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN','CLAUDE_CODE_USE_BEDROCK','CLAUDE_CODE_USE_VERTEX','CLAUDE_CODE_USE_FOUNDRY']:env.pop(k,None)
exe=r'C:\Users\mtsli\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe'
record={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'inputHashes':hashes,'transferExpectedSupplied':False,'tools':[]}
(out/'run.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
r=subprocess.run([exe,'-p','--agent','hockey-authority','--tools','','--output-format','json','--no-session-persistence'],input=prompt,text=True,encoding='utf-8',capture_output=True,cwd=root,env=env)
(out/'raw.json').write_text(r.stdout,encoding='utf-8');(out/'stderr.txt').write_text(r.stderr,encoding='utf-8');record.update(exitCode=r.returncode,completedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),outputSha256=hashlib.sha256(r.stdout.encode()).hexdigest());(out/'run.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print(json.dumps({'exitCode':r.returncode,'outputBytes':len(r.stdout),'folder':str(out)}),flush=True)
