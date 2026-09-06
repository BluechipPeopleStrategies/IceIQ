"""Import actual GLB candidates into editable Blender files and render a review.
Run: blender --background --python tools/blender/import-player-candidates.py -- INPUT_DIR
These are procedural integration candidates, not approved sculpted production art.
"""
import bpy
import sys
import json
import hashlib
from pathlib import Path
from mathutils import Vector

source = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
output = source / 'blender'
output.mkdir(exist_ok=True)
manifest = json.loads((source / 'manifest.json').read_text())
records = []
for item in manifest['records']:
    glb = source / item['file']
    assert hashlib.sha256(glb.read_bytes()).hexdigest() == item['sha256']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    assert armatures and meshes
    assert sum(len(a.data.bones) for a in armatures) == 13
    # Blender creates an unweighted Icosphere as the armature display shape.
    surfaces = [o for o in meshes if any(m.type == 'ARMATURE' for m in o.modifiers)]
    assert len(surfaces) >= 8
    assert all(len(o.vertex_groups) == 13 for o in surfaces)
    bpy.context.scene['asset_status'] = item['status']
    bpy.context.scene['source_sha256'] = item['sha256']
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.render.fps = 30
    bpy.context.scene.frame_end = 60
    target = output / (glb.stem + '.blend')
    bpy.ops.wm.save_as_mainfile(filepath=str(target), compress=True)
    records.append({'file': target.name, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                    'armatures': len(armatures), 'bones': 13, 'meshes': len(meshes),
                    'actions': [a.name for a in bpy.data.actions]})

# Reopen a saved native file: verify the persisted data, not just import logs.
bpy.ops.wm.open_mainfile(filepath=str(output / records[0]['file']))
assert sum(len(o.data.bones) for o in bpy.data.objects if o.type == 'ARMATURE') == 13
assert len(bpy.data.actions) > 0

bpy.ops.wm.read_factory_settings(use_empty=True)
for i, stage in enumerate(['young', 'youth', 'older']):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source / (stage + '-skater-gold.glb')))
    imported = set(bpy.data.objects) - before
    for obj in imported:
        if obj.parent is None:
            obj.location.x += (i - 1) * 2.2

scene = bpy.context.scene
scene['asset_status'] = 'Procedural integration candidates; sculpture and hockey acceptance pending'
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 1500
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('ReviewWorld')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.62, 0.72, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.5
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.04))
floor = bpy.context.object
floor.name = 'Review floor'
mat = bpy.data.materials.new('Review ice')
mat.diffuse_color = (0.74, 0.81, 0.87, 1)
floor.data.materials.append(mat)
bpy.ops.object.light_add(type='AREA', location=(-3, 5, 7))
bpy.context.object.data.energy = 1000
bpy.context.object.data.shape = 'DISK'
bpy.context.object.data.size = 7
direction = Vector((0, 0, 1)) - bpy.context.object.location
bpy.context.object.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(location=(1.2, 10, 3.4))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 1)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 7.1
scene.camera = camera
scene.render.filepath = str(output / 'age-family-review.png')
bpy.ops.wm.save_as_mainfile(filepath=str(output / 'age-family-review.blend'), compress=True)
bpy.ops.render.render(write_still=True)
(output / 'verification.json').write_text(json.dumps({'status': scene['asset_status'], 'native_reopen_verified': True, 'records': records}, indent=2) + '\n')
print('PLAYER_NATIVE_REVIEW_COMPLETE', str(output))
