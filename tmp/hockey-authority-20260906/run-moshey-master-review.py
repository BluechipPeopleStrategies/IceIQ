from pathlib import Path
import subprocess, os, json, hashlib, datetime
root=Path(r'C:\Users\mtsli\IceIQ')
out=root/'docs/hockey-authority/reviews/2026-09-06-moshey-master'
out.mkdir(parents=True,exist_ok=True)
brief=Path(r'C:\Users\mtsli\BlueChip\.claude\agents\moshey.md').read_text(encoding='utf-8')
scope='''You are Moshey, acting on Thomas's explicit request for RinkReads hockey 3D models. This task-specific scope overrides BlueChip video/branding/9:16/source/CTA requirements in the reused brief: no BlueChip production is involved. Work only in C:/Users/mtsli/IceIQ. Own visual craft, not hockey judgment. Root will execute your reviewed Blender script locally. No paid APIs, purchases, installs or public actions. Original model references remain intact. Only Read, Glob and Grep tools are available. Return evidence and code in your response; do not pretend you executed rendering.'''
agent={'moshey-rinkreads':{'description':'Moshey visual craft review for the approved RinkReads player master demonstration','prompt':brief+'\n\n'+scope,'tools':['Read','Glob','Grep']}}
prompt='''Inspect the actual existing candidate image tmp/shared-3d-20260906/rounded-study/blender/age-family-review.png with Read. Inspect src/one-on-one/hockeyPlayerRig.js and tools/blender/import-player-candidates.py as needed. User wants smooth high-quality anime-like younger players, increasingly athletic realistic older ones, solid gold or navy jersey and SAME COLOR helmet; no 3D halos; full stick and readable first-person equipment. This existing candidate is below desired art quality.
Your bounded assignment: critique actual image, and design ONE U11 gold skater master refinement, independent of pending hockey movement review. Preserve functional armature, existing original files and physically sized equipment. Provide an executable Blender 5.2 Python script for a NEW VERSIONED LOCAL candidate that imports tmp/shared-3d-20260906/rounded-study/youth-skater-gold.glb, meaningfully improves silhouette/clothing/equipment craft where feasible, exports to tmp/hockey-authority-20260906/moshey-master-v1/master.glb and master.blend, and renders front and three-quarter PNG views to that directory. Keep assets in metres and record modifications. Use only bpy/Python standard libs, no external assets; do not claim handmade sculpture or accepted organic skinning. The script must not write anywhere else or overwrite the source. Do not flatten/remove the skeleton. Stage cameras/lighting should be excluded from GLB asset export. Explicitly leave limitations where original merged geometry/weights prevent a safe refinement.
Return ONLY JSON with critique (image-specific), intendedChanges, limitations, and blenderScript string. Focus on shape and fitted equipment before surface gimmicks. Root will review and run the script, inspect actual outputs and reject superficial changes. You are not reviewing hockey correctness or certifying a pickup.'''
(out/'prompt.txt').write_text(prompt,encoding='utf-8')
env=os.environ.copy()
for k in ['ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN','CLAUDE_CODE_USE_BEDROCK','CLAUDE_CODE_USE_VERTEX','CLAUDE_CODE_USE_FOUNDRY']: env.pop(k,None)
exe=r'C:\Users\mtsli\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe'
cmd=[exe,'-p','--agents',json.dumps(agent),'--agent','moshey-rinkreads','--tools','Read,Glob,Grep','--allowedTools','Read,Glob,Grep','--output-format','json','--no-session-persistence']
record={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'roleSourceSha256':hashlib.sha256(brief.encode()).hexdigest(),'tools':['Read','Glob','Grep'],'scope':scope}
(out/'run.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
r=subprocess.run(cmd,input=prompt,text=True,encoding='utf-8',capture_output=True,cwd=root,env=env)
(out/'raw.json').write_text(r.stdout,encoding='utf-8'); (out/'stderr.txt').write_text(r.stderr,encoding='utf-8')
record.update(exitCode=r.returncode,completedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),outputSha256=hashlib.sha256(r.stdout.encode()).hexdigest())
(out/'run.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print(json.dumps({'exitCode':r.returncode,'outputBytes':len(r.stdout),'folder':str(out)}),flush=True)
