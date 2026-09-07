import bpy,json,hashlib
from pathlib import Path
folder=Path(r'C:\Users\mtsli\IceIQ\tmp\hockey-authority-20260906\moshey-master-v1')
source=Path(r'C:\Users\mtsli\IceIQ\tmp\shared-3d-20260906\rounded-study\youth-skater-gold.glb')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
log=json.loads((folder/'modifications.json').read_text())
assert sha(source)==log['source_sha256']
for item in log['outputs'].values():assert sha(Path(item['path']))==item['sha256']
bpy.ops.wm.open_mainfile(filepath=str(folder/'master.blend'))
native_bones=sum(len(o.data.bones) for o in bpy.data.objects if o.type=='ARMATURE')
assert native_bones==13
assert bpy.context.scene.unit_settings.system=='METRIC'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(folder/'master.glb'))
arms=[o for o in bpy.data.objects if o.type=='ARMATURE']
surfaces=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
assert sum(len(o.data.bones) for o in arms)==13
assert len(surfaces)==9
assert all(len(o.vertex_groups)==13 for o in surfaces)
assert not any(o.type in ('LIGHT','CAMERA') for o in bpy.data.objects)
report={'nativeReopened':True,'nativeBones':native_bones,'exportedSkinnedMeshes':len(surfaces),'exportedBones':13,'sourceUnchanged':True,'fileHashesVerified':True,'stageExcluded':True,'artAcceptance':'REVISE','hockeyApproval':'not reviewed','browserIntegration':'not performed','outputHashes':{p.name:sha(p) for p in folder.iterdir() if p.suffix in ['.blend','.glb','.png']}}
out=Path(r'C:\Users\mtsli\IceIQ\docs\hockey-authority\reviews\2026-09-06-moshey-master\root-verification.json')
out.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report),flush=True)
