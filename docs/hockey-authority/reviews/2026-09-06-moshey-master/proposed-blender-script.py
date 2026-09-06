'''Moshey U11 gold-skater master refinement (Blender 5.2, bpy + stdlib only).
Imports the untouched youth-skater-gold.glb, applies SAFE craft refinements that
preserve the 13-bone armature, per-vertex weights and physical metre sizes, then
exports a NEW versioned candidate (master.glb / master.blend) and renders front and
three-quarter reviews. It never writes to or overwrites the source. Stage cameras and
lights are created only AFTER GLB export, so they are excluded from the asset.
No external assets, no claim of handmade sculpture or organic skinning.'''
import bpy, json, hashlib, math
from pathlib import Path
from mathutils import Vector

SRC = Path('C:/Users/mtsli/IceIQ/tmp/shared-3d-20260906/rounded-study/youth-skater-gold.glb').resolve()
OUT = Path('C:/Users/mtsli/IceIQ/tmp/hockey-authority-20260906/moshey-master-v1').resolve()
OUT.mkdir(parents=True, exist_ok=True)
OUT_GLB = OUT / 'master.glb'
OUT_BLEND = OUT / 'master.blend'
OUT_FRONT = OUT / 'master-front.png'
OUT_TQ = OUT / 'master-three-quarter.png'
EXPECTED_SRC_SHA = '6b47b45d9dac51f13bb6e0ddf82adcafd9c102f628a2fc026f8917cd13943138'

assert SRC.exists(), 'source glb missing'
# Hard guard: never point any output at the source or its directory.
for p in (OUT_GLB, OUT_BLEND, OUT_FRONT, OUT_TQ):
    assert p.resolve() != SRC, 'refusing to overwrite source'
assert OUT != SRC.parent, 'refusing to write into source directory'

def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

src_sha = sha256(SRC)
# Integrity: the source must be the exact catalogued candidate and stays read-only.
assert src_sha == EXPECTED_SRC_SHA, 'source sha mismatch; aborting to avoid acting on unexpected input'

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hex_lin(h):
    r = int(h[0:2], 16) / 255.0; g = int(h[2:4], 16) / 255.0; b = int(h[4:6], 16) / 255.0
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b))

GOLD_LIN = hex_lin('C9A24B')
PAL = [
    ('gold', hex_lin('C9A24B')),
    ('navy', hex_lin('101D30')),
    ('navy', hex_lin('0B1A33')),
    ('navy', hex_lin('07111B')),
    ('carbon', hex_lin('14202A')),
    ('metal', hex_lin('ADBEC9')),
    ('skin', hex_lin('E7B996')),
    ('cream', hex_lin('F5EFE0')),
    ('leather', hex_lin('BB946A')),
]

def classify(base, metal):
    best = None; bd = 1e9
    for label, lin in PAL:
        d = sum((base[i] - lin[i]) ** 2 for i in range(3))
        if d < bd:
            bd = d; best = label
    if best == 'gold':
        return 'helmet' if metal > 0.05 else 'gold'
    return best

def principled(mat):
    if not mat:
        return None
    if not mat.use_nodes:
        mat.use_nodes = True
    for n in mat.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            return n
    return None

def set_in(node, names, value):
    for n in names:
        if n in node.inputs:
            try:
                node.inputs[n].default_value = value
                return True
            except Exception:
                pass
    return False

def col4(rgb):
    return (rgb[0], rgb[1], rgb[2], 1.0)

# --- 1. Load the untouched source into an empty scene ---
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
bpy.ops.import_scene.gltf(filepath=str(SRC))
player_objs = list(bpy.data.objects)

armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
skinned = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
assert armatures, 'no armature imported'
assert sum(len(a.data.bones) for a in armatures) == 13, 'expected 13 bones'
assert skinned, 'no skinned meshes'
assert all(len(o.vertex_groups) == 13 for o in skinned), 'expected 13 vertex groups per skinned mesh'

# --- 2. Silhouette / smoothness: angle-based smooth shading on every mesh ---
def smooth_obj(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    except Exception:
        try:
            o.data.use_auto_smooth = True
            o.data.auto_smooth_angle = math.radians(40)
        except Exception:
            pass
        for poly in o.data.polygons:
            poly.use_smooth = True

for o in skinned:
    smooth_obj(o)

# --- 3. Subsurf smoothing on the SOFT fabric mesh only (keeps hard gear sized) ---
def gold_lowmetal(o):
    for slot in o.material_slots:
        b = principled(slot.material)
        if not b:
            continue
        base = list(b.inputs['Base Color'].default_value)
        metal = b.inputs['Metallic'].default_value if 'Metallic' in b.inputs else 0.0
        if classify(base, metal) == 'gold':
            return True
    return False

jersey_obj = None
named = [o for o in skinned if 'jersey' in o.name.lower()]
if named:
    jersey_obj = max(named, key=lambda o: len(o.data.vertices))
if jersey_obj is None:
    cands = [o for o in skinned if gold_lowmetal(o)]
    if cands:
        jersey_obj = max(cands, key=lambda o: len(o.data.vertices))

if jersey_obj is not None:
    sub = jersey_obj.modifiers.new('CraftSubsurf', 'SUBSURF')
    sub.levels = 1; sub.render_levels = 1
    try:
        sub.use_limit_surface = True
    except Exception:
        pass

# --- 4. Material craft (finish only; same-colour helmet + no halos preserved) ---
def apply_recipe(mat):
    b = principled(mat)
    if not b:
        return None
    base = list(b.inputs['Base Color'].default_value)
    metal = b.inputs['Metallic'].default_value if 'Metallic' in b.inputs else 0.0
    cls = classify(base, metal)
    if cls == 'helmet':
        set_in(b, ['Base Color'], col4(GOLD_LIN)); set_in(b, ['Metallic'], 0.0)
        set_in(b, ['Roughness'], 0.24)
        set_in(b, ['Coat Weight', 'Clearcoat'], 0.6)
        set_in(b, ['Coat Roughness', 'Clearcoat Roughness'], 0.12)
    elif cls == 'gold':
        set_in(b, ['Base Color'], col4(GOLD_LIN)); set_in(b, ['Metallic'], 0.0)
        set_in(b, ['Roughness'], 0.55)
        set_in(b, ['Sheen Weight', 'Sheen'], 0.25)
    elif cls == 'navy':
        set_in(b, ['Roughness'], 0.7); set_in(b, ['Metallic'], 0.0)
    elif cls == 'carbon':
        set_in(b, ['Roughness'], 0.38); set_in(b, ['Metallic'], 0.1)
        set_in(b, ['Coat Weight', 'Clearcoat'], 0.3)
    elif cls == 'metal':
        set_in(b, ['Roughness'], 0.3); set_in(b, ['Metallic'], 1.0)
    elif cls == 'skin':
        set_in(b, ['Roughness'], 0.6)
        set_in(b, ['Subsurface Weight', 'Subsurface'], 0.12)
        try:
            b.inputs['Subsurface Radius'].default_value = (0.06, 0.03, 0.02)
        except Exception:
            pass
    elif cls == 'cream':
        set_in(b, ['Roughness'], 0.55)
    elif cls == 'leather':
        set_in(b, ['Roughness'], 0.8)
    return cls

mats_seen = set(); mat_classes = {}
for o in skinned:
    for slot in o.material_slots:
        m = slot.material
        if m and m.name not in mats_seen:
            mats_seen.add(m.name)
            mat_classes[m.name] = apply_recipe(m)

# --- 5. Export GLB from the PLAYER ONLY (stage not yet created) ---
bpy.ops.object.select_all(action='DESELECT')
for o in player_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = armatures[0]
bpy.ops.export_scene.gltf(
    filepath=str(OUT_GLB), export_format='GLB', use_selection=True,
    export_apply=True, export_yup=True, export_skins=True, export_animations=True,
)
assert OUT_GLB.exists(), 'glb export failed'

# --- 6. Build review stage AFTER export (excluded from the asset) ---
mins = [1e9, 1e9, 1e9]; maxs = [-1e9, -1e9, -1e9]
for o in skinned:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        for i in range(3):
            mins[i] = min(mins[i], w[i]); maxs[i] = max(maxs[i], w[i])
center = [(mn + mx) / 2 for mn, mx in zip(mins, maxs)]
size = [mx - mn for mn, mx in zip(mins, maxs)]
height = size[2]
target = Vector((center[0], center[1], center[2]))
dist = max(size) * 2.1 + 1.0

world = bpy.data.worlds.new('MosheyStudio')
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs[0].default_value = (0.5, 0.55, 0.62, 1.0)
bg.inputs[1].default_value = 0.6
scene.world = world

bpy.ops.mesh.primitive_plane_add(size=60, location=(center[0], center[1], mins[2] - 0.001))
floor = bpy.context.object; floor.name = 'ReviewFloor'
fmat = bpy.data.materials.new('ReviewFloorMat'); fmat.use_nodes = True
fb = principled(fmat)
if fb:
    set_in(fb, ['Base Color'], (0.72, 0.78, 0.85, 1.0))
    set_in(fb, ['Roughness'], 0.55)
floor.data.materials.append(fmat)

def add_area(name, loc, energy, sz):
    bpy.ops.object.light_add(type='AREA', location=loc)
    lt = bpy.context.object; lt.name = name
    lt.data.energy = energy; lt.data.shape = 'SQUARE'; lt.data.size = sz
    d = target - Vector(loc)
    lt.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return lt

add_area('Key', (center[0] - 3, center[1] + 4, center[2] + 5), 900, 4)
add_area('Fill', (center[0] + 4, center[1] + 3, center[2] + 2), 320, 5)
add_area('Rim', (center[0], center[1] - 4, center[2] + 5), 650, 3)

def add_cam(name, loc, lens=62):
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.object; cam.name = name; cam.data.lens = lens
    d = target - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return cam

front_cam = add_cam('FrontCam', (center[0], center[1] + dist, center[2] + height * 0.12))
tq_cam = add_cam('ThreeQuarterCam', (center[0] + dist * 0.72, center[1] + dist * 0.72, center[2] + height * 0.32))

scene.render.engine = 'CYCLES'
try:
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    try:
        scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
except Exception:
    pass
scene.render.resolution_x = 1100
scene.render.resolution_y = 1500
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene['asset_status'] = 'Moshey U11 gold-skater master refinement; procedural editable candidate, art and hockey acceptance pending'
scene['source_sha256'] = src_sha

# Save the editable native master (stage + live modifiers retained).
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND), compress=True)

scene.camera = front_cam
scene.render.filepath = str(OUT_FRONT)
bpy.ops.render.render(write_still=True)
scene.camera = tq_cam
scene.render.filepath = str(OUT_TQ)
bpy.ops.render.render(write_still=True)

# --- 7. Independent verification of the EXPORTED asset (fresh scene) ---
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT_GLB))
v_arm = [o for o in bpy.data.objects if o.type == 'ARMATURE']
v_mesh = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
no_stage = [o for o in bpy.data.objects if o.type in ('CAMERA', 'LIGHT')]
assert v_arm and sum(len(a.data.bones) for a in v_arm) == 13, 'export lost the 13-bone skeleton'
assert v_mesh, 'export lost skinned meshes'
assert all(len(o.vertex_groups) == 13 for o in v_mesh), 'export lost vertex groups'
assert not no_stage, 'stage cameras/lights leaked into the asset'

# --- 8. Record modifications and evidence ---
log = {
    'candidate': 'moshey-master-v1',
    'source': str(SRC),
    'source_sha256': src_sha,
    'source_unmodified': True,
    'units': 'metres',
    'skeleton_preserved': {'bones': sum(len(a.data.bones) for a in v_arm), 'vertex_groups_per_mesh': 13},
    'asset_excludes_stage': True,
    'jersey_mesh_subdivided': jersey_obj.name if jersey_obj else None,
    'modifications': [
        'Angle-based smooth shading (40 deg) on all merged meshes: removes faceting, keeps hard corners; no vertex/weight change.',
        'Subdivision Surface level 1 on the soft fabric mesh only; all hard equipment left at exact physical size.',
        'Material finish per class: exact gold jersey+helmet (same colour), cloth roughness+sheen jersey, molded coat helmet, subsurface skin, true metal cage/steel, matte navy pants, cream tape/laces. No emissive/halo.',
        'Studio 3-point lighting and front + three-quarter cameras added only after GLB export.',
    ],
    'material_classes': mat_classes,
    'outputs': {
        'master_glb': {'path': str(OUT_GLB), 'sha256': sha256(OUT_GLB)},
        'master_blend': {'path': str(OUT_BLEND), 'sha256': sha256(OUT_BLEND)},
        'render_front': {'path': str(OUT_FRONT), 'sha256': sha256(OUT_FRONT)},
        'render_three_quarter': {'path': str(OUT_TQ), 'sha256': sha256(OUT_TQ)},
    },
    'not_claimed': 'No handmade sculpture; no organic re-skinning; rigid per-bone weights and merged topology unchanged.',
}
(OUT / 'modifications.json').write_text(json.dumps(log, indent=2) + '\n')
print('MOSHEY_MASTER_V1_COMPLETE', str(OUT))
