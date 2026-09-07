"""Generate low-poly RinkReads rink and marker GLB assets with Blender.

Run with:
  blender --background --python tools/blender/generate_rink_assets.py
"""

from __future__ import annotations

import bmesh
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
SOURCE_SCRIPT = "tools/blender/generate_rink_assets.py"

RINK_OUTPUT = ROOT / "public" / "assets" / "3d" / "rink" / "rink-lowpoly.glb"
RINK_MANIFEST = ROOT / "public" / "assets" / "3d" / "rink" / "rink-lowpoly.manifest.json"
MARKER_OUTPUT = ROOT / "public" / "assets" / "3d" / "markers" / "marker-pack-lowpoly.glb"
MARKER_MANIFEST = ROOT / "public" / "assets" / "3d" / "markers" / "marker-pack-lowpoly.manifest.json"

RINK_LENGTH_M = 60.0
RINK_WIDTH_M = 30.0
LINE_HEIGHT_M = 0.035
BOARD_THICKNESS_M = 0.45
BOARD_HEIGHT_M = 0.55

LINE_POSITIONS = {
    "leftGoal": 40 / 600,
    "leftBlue": 213 / 600,
    "center": 0.5,
    "rightBlue": 387 / 600,
    "rightGoal": 560 / 600,
}

COLORS = {
    "ice": "#dff5ff",
    "boards": "#f8fafc",
    "board_top": "#d4d4d8",
    "blue_line": "#2563eb",
    "red_line": "#b91c1c",
    "glass": "#bfefff",
    "crease": "#7dd3fc",
    "player": "#fbbf24",
    "teammate": "#38bdf8",
    "defender": "#111827",
    "goalie": "#f97316",
    "puck": "#020617",
    "ring": "#ffffff",
}

# Faceoff markings, matching the canonical 600x300 SVG landmark positions
# already used by the legacy 2D renderer (RinkReadsRink.jsx / IceIQ CLAUDE.md):
# end-zone dots (100,80) (100,220) (500,80) (500,220); NZ dots (228,80)
# (228,220) (372,80) (372,220) -- converted to world metres so the 3D and 2D
# renderers agree on where every marking actually sits.
FACEOFF_CIRCLE_RADIUS_M = 4.572  # 15 ft, real end-zone/centre-ice circle
FACEOFF_DOT_RADIUS_M = 0.3  # ~1 ft
GOAL_CREASE_RADIUS_M = 1.83  # 6 ft, real goal crease semicircle

END_ZONE_FACEOFF_POINTS = {
    "left_top": (-20.0, -7.0),
    "left_bottom": (-20.0, 7.0),
    "right_top": (20.0, -7.0),
    "right_bottom": (20.0, 7.0),
}
NEUTRAL_ZONE_DOT_POINTS = {
    "nz_left_top": (-7.2, -7.0),
    "nz_left_bottom": (-7.2, 7.0),
    "nz_right_top": (7.2, -7.0),
    "nz_right_bottom": (7.2, 7.0),
}

EXPORT_SETTINGS = {
    "format": "GLB",
    "apply-transforms": True,
    "draco": False,
    "textures": False,
    "triangulated": True,
}


def hex_to_rgba(hex_color: str, alpha: float = 1.0) -> tuple[float, float, float, float]:
    raw = hex_color.removeprefix("#")
    if len(raw) != 6:
        raise ValueError(f"Expected 6-digit hex color, got {hex_color!r}")
    return (
        int(raw[0:2], 16) / 255,
        int(raw[2:4], 16) / 255,
        int(raw[4:6], 16) / 255,
        alpha,
    )


def make_unlit_material(name: str, hex_color: str, alpha: float = 1.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    rgba = hex_to_rgba(hex_color, alpha)
    mat.diffuse_color = rgba
    mat.use_nodes = True

    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new(type="ShaderNodeOutputMaterial")
    output.location = (220, 0)
    emission = nodes.new(type="ShaderNodeEmission")
    emission.location = (0, 0)
    emission.inputs["Color"].default_value = rgba
    emission.inputs["Strength"].default_value = 1.0
    mat.node_tree.links.new(emission.outputs["Emission"], output.inputs["Surface"])

    if alpha < 1.0:
        mat.blend_method = "BLEND"
        mat.show_transparent_back = True
        if hasattr(mat, "surface_render_method"):
            try:
                mat.surface_render_method = "BLENDED"
            except TypeError:
                pass
    mat.use_backface_culling = False
    return mat


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0


def world_to_blender(point: tuple[float, float, float]) -> tuple[float, float, float]:
    """Map runtime world axes (X length, Y up, Z width) to Blender Z-up axes."""

    x, y, z = point
    return (x, -z, y)


def normalized_x(value: float) -> float:
    return (value - 0.5) * RINK_LENGTH_M


class MeshBuilder:
    def __init__(self, name: str):
        self.name = name
        self.verts: list[tuple[float, float, float]] = []
        self.faces: list[tuple[int, ...]] = []
        self.face_materials: list[int] = []
        self.materials: list[bpy.types.Material] = []

    def material_index(self, material: bpy.types.Material) -> int:
        if material not in self.materials:
            self.materials.append(material)
        return self.materials.index(material)

    def add_box(
        self,
        center: tuple[float, float, float],
        size: tuple[float, float, float],
        material: bpy.types.Material,
        yaw_rad: float = 0.0,
    ) -> None:
        cx, cy, cz = center
        sx, sy, sz = size
        c = math.cos(yaw_rad)
        s = math.sin(yaw_rad)

        corners = []
        for lx, ly, lz in (
            (-sx / 2, -sy / 2, -sz / 2),
            (sx / 2, -sy / 2, -sz / 2),
            (sx / 2, sy / 2, -sz / 2),
            (-sx / 2, sy / 2, -sz / 2),
            (-sx / 2, -sy / 2, sz / 2),
            (sx / 2, -sy / 2, sz / 2),
            (sx / 2, sy / 2, sz / 2),
            (-sx / 2, sy / 2, sz / 2),
        ):
            rx = lx * c - lz * s
            rz = lx * s + lz * c
            corners.append(world_to_blender((cx + rx, cy + ly, cz + rz)))

        start = len(self.verts)
        self.verts.extend(corners)
        material_index = self.material_index(material)
        for face in (
            (0, 1, 2, 3),
            (4, 7, 6, 5),
            (0, 4, 5, 1),
            (1, 5, 6, 2),
            (2, 6, 7, 3),
            (3, 7, 4, 0),
        ):
            self.faces.append(tuple(start + index for index in face))
            self.face_materials.append(material_index)

    def add_flat_plane(
        self,
        name_center: tuple[float, float, float],
        size_x: float,
        size_z: float,
        material: bpy.types.Material,
    ) -> None:
        cx, cy, cz = name_center
        corners = [
            world_to_blender((cx - size_x / 2, cy, cz - size_z / 2)),
            world_to_blender((cx + size_x / 2, cy, cz - size_z / 2)),
            world_to_blender((cx + size_x / 2, cy, cz + size_z / 2)),
            world_to_blender((cx - size_x / 2, cy, cz + size_z / 2)),
        ]
        self._add_double_sided_face(corners, material)

    def add_vertical_plane_x(
        self,
        center: tuple[float, float, float],
        length_x: float,
        height_y: float,
        material: bpy.types.Material,
    ) -> None:
        cx, cy, cz = center
        corners = [
            world_to_blender((cx - length_x / 2, cy - height_y / 2, cz)),
            world_to_blender((cx + length_x / 2, cy - height_y / 2, cz)),
            world_to_blender((cx + length_x / 2, cy + height_y / 2, cz)),
            world_to_blender((cx - length_x / 2, cy + height_y / 2, cz)),
        ]
        self._add_double_sided_face(corners, material)

    def add_vertical_plane_z(
        self,
        center: tuple[float, float, float],
        length_z: float,
        height_y: float,
        material: bpy.types.Material,
    ) -> None:
        cx, cy, cz = center
        corners = [
            world_to_blender((cx, cy - height_y / 2, cz - length_z / 2)),
            world_to_blender((cx, cy - height_y / 2, cz + length_z / 2)),
            world_to_blender((cx, cy + height_y / 2, cz + length_z / 2)),
            world_to_blender((cx, cy + height_y / 2, cz - length_z / 2)),
        ]
        self._add_double_sided_face(corners, material)

    def add_half_disc(
        self,
        center: tuple[float, float, float],
        radius: float,
        bulge_direction: float,
        material: bpy.types.Material,
        segments: int = 16,
    ) -> None:
        """A flat semicircle (goal crease paint) whose straight edge sits on
        the goal line and whose arc bulges toward centre ice. bulge_direction
        is +1 (arc extends toward +X) or -1 (arc extends toward -X)."""

        cx, cy, cz = center
        arc_points = []
        for i in range(segments + 1):
            angle = -math.pi / 2 + math.pi * i / segments
            lx = bulge_direction * radius * math.cos(angle)
            lz = radius * math.sin(angle)
            arc_points.append((cx + lx, cy, cz + lz))

        start = len(self.verts)
        self.verts.append(world_to_blender(center))
        for point in arc_points:
            self.verts.append(world_to_blender(point))
        material_index = self.material_index(material)
        center_index = start
        for i in range(1, segments + 1):
            a = center_index + i
            b = center_index + i + 1
            self.faces.append((center_index, a, b))
            self.face_materials.append(material_index)
            self.faces.append((center_index, b, a))
            self.face_materials.append(material_index)

    def _add_double_sided_face(
        self,
        corners: list[tuple[float, float, float]],
        material: bpy.types.Material,
    ) -> None:
        start = len(self.verts)
        self.verts.extend(corners)
        material_index = self.material_index(material)
        self.faces.append((start, start + 1, start + 2, start + 3))
        self.face_materials.append(material_index)
        self.faces.append((start + 3, start + 2, start + 1, start))
        self.face_materials.append(material_index)

    def to_object(self) -> bpy.types.Object:
        mesh = bpy.data.meshes.new(f"{self.name}_mesh")
        mesh.from_pydata(self.verts, [], self.faces)
        mesh.update()
        for material in self.materials:
            mesh.materials.append(material)
        for polygon, material_index in zip(mesh.polygons, self.face_materials):
            polygon.material_index = material_index
            polygon.use_smooth = False

        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.collection.objects.link(obj)
        return obj


def make_box_object(
    name: str,
    center: tuple[float, float, float],
    size: tuple[float, float, float],
    material: bpy.types.Material,
    yaw_rad: float = 0.0,
) -> bpy.types.Object:
    builder = MeshBuilder(name)
    builder.add_box(center, size, material, yaw_rad)
    return builder.to_object()


def make_anchor(name: str, position: tuple[float, float, float]) -> bpy.types.Object:
    anchor = bpy.data.objects.new(name, None)
    anchor.empty_display_type = "PLAIN_AXES"
    anchor.empty_display_size = 0.45
    anchor.location = world_to_blender(position)
    bpy.context.collection.objects.link(anchor)
    return anchor


def make_cylinder_object(
    name: str,
    radius: float,
    depth: float,
    vertices: int,
    center: tuple[float, float, float],
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        end_fill_type="TRIFAN",
        location=world_to_blender(center),
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_mesh"
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    return obj


def make_torus_object(
    name: str,
    major_radius: float,
    minor_radius: float,
    major_segments: int,
    minor_segments: int,
    center: tuple[float, float, float],
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_segments=major_segments,
        minor_segments=minor_segments,
        major_radius=major_radius,
        minor_radius=minor_radius,
        generate_uvs=False,
        location=world_to_blender(center),
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_mesh"
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    return obj


def join_as_marker(name: str, parts: list[bpy.types.Object]) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()

    marker = bpy.context.object
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR", center="MEDIAN")
    marker.name = name
    marker.data.name = f"{name}_mesh"
    return marker


def triangulate_all_meshes() -> None:
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        mesh = obj.data
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.triangulate(bm, faces=list(bm.faces))
        bm.to_mesh(mesh)
        bm.free()
        mesh.update()
        for polygon in mesh.polygons:
            polygon.use_smooth = False


def export_selected(objects: list[bpy.types.Object], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    triangulate_all_meshes()

    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]

    disallowed_images = [
        image
        for image in bpy.data.images
        if image.filepath or image.packed_file or image.source == "FILE"
    ]
    if disallowed_images:
        image_names = ", ".join(image.name for image in disallowed_images)
        raise RuntimeError(f"Image datablocks are not allowed in these assets: {image_names}")

    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        use_selection=True,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_image_format="NONE",
        export_draco_mesh_compression_enable=False,
        export_meshopt_compression_enable=False,
    )


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_manifest(asset_path: Path, manifest_path: Path, export_date: str) -> dict[str, object]:
    manifest = {
        "source_script": SOURCE_SCRIPT,
        "blender_version": ".".join(str(part) for part in bpy.app.version),
        "export_settings": EXPORT_SETTINGS,
        "export_date": export_date,
        "asset_path": asset_path.relative_to(ROOT).as_posix(),
        "sha256": file_sha256(asset_path),
        "byte_size": asset_path.stat().st_size,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def create_rink_asset() -> list[bpy.types.Object]:
    materials = {
        "ice": make_unlit_material("mat_ice_pale_blue", COLORS["ice"]),
        "boards": make_unlit_material("mat_boards_white", COLORS["boards"]),
        "board_top": make_unlit_material("mat_board_top_grey", COLORS["board_top"]),
        "blue_line": make_unlit_material("mat_line_blue", COLORS["blue_line"]),
        "red_line": make_unlit_material("mat_line_red", COLORS["red_line"]),
        "glass": make_unlit_material("mat_glass_low_opacity", COLORS["glass"], alpha=0.26),
        "crease": make_unlit_material("mat_crease_blue", COLORS["crease"], alpha=0.55),
    }

    surface_builder = MeshBuilder("rink_surface")
    surface_builder.add_flat_plane((0, 0, 0), RINK_LENGTH_M, RINK_WIDTH_M, materials["ice"])
    rink_surface = surface_builder.to_object()

    boards_builder = MeshBuilder("boards")
    boards_builder.add_box(
        (-RINK_LENGTH_M / 2 - BOARD_THICKNESS_M / 2, BOARD_HEIGHT_M / 2, 0),
        (BOARD_THICKNESS_M, BOARD_HEIGHT_M, RINK_WIDTH_M + BOARD_THICKNESS_M * 2),
        materials["boards"],
    )
    boards_builder.add_box(
        (RINK_LENGTH_M / 2 + BOARD_THICKNESS_M / 2, BOARD_HEIGHT_M / 2, 0),
        (BOARD_THICKNESS_M, BOARD_HEIGHT_M, RINK_WIDTH_M + BOARD_THICKNESS_M * 2),
        materials["boards"],
    )
    boards_builder.add_box(
        (0, BOARD_HEIGHT_M / 2, -RINK_WIDTH_M / 2 - BOARD_THICKNESS_M / 2),
        (RINK_LENGTH_M + BOARD_THICKNESS_M * 2, BOARD_HEIGHT_M, BOARD_THICKNESS_M),
        materials["boards"],
    )
    boards_builder.add_box(
        (0, BOARD_HEIGHT_M / 2, RINK_WIDTH_M / 2 + BOARD_THICKNESS_M / 2),
        (RINK_LENGTH_M + BOARD_THICKNESS_M * 2, BOARD_HEIGHT_M, BOARD_THICKNESS_M),
        materials["boards"],
    )
    boards_builder.add_box(
        (0, BOARD_HEIGHT_M + 0.02, -RINK_WIDTH_M / 2 - BOARD_THICKNESS_M / 2),
        (RINK_LENGTH_M + BOARD_THICKNESS_M * 2, 0.08, 0.12),
        materials["board_top"],
    )
    boards_builder.add_box(
        (0, BOARD_HEIGHT_M + 0.02, RINK_WIDTH_M / 2 + BOARD_THICKNESS_M / 2),
        (RINK_LENGTH_M + BOARD_THICKNESS_M * 2, 0.08, 0.12),
        materials["board_top"],
    )
    boards = boards_builder.to_object()

    glass_builder = MeshBuilder("glass")
    glass_height = 1.1
    glass_center_y = BOARD_HEIGHT_M + 0.05 + glass_height / 2
    glass_builder.add_vertical_plane_x(
        (0, glass_center_y, -RINK_WIDTH_M / 2 - BOARD_THICKNESS_M - 0.015),
        RINK_LENGTH_M,
        glass_height,
        materials["glass"],
    )
    glass_builder.add_vertical_plane_x(
        (0, glass_center_y, RINK_WIDTH_M / 2 + BOARD_THICKNESS_M + 0.015),
        RINK_LENGTH_M,
        glass_height,
        materials["glass"],
    )
    glass_builder.add_vertical_plane_z(
        (-RINK_LENGTH_M / 2 - BOARD_THICKNESS_M - 0.015, glass_center_y, 0),
        RINK_WIDTH_M,
        glass_height,
        materials["glass"],
    )
    glass_builder.add_vertical_plane_z(
        (RINK_LENGTH_M / 2 + BOARD_THICKNESS_M + 0.015, glass_center_y, 0),
        RINK_WIDTH_M,
        glass_height,
        materials["glass"],
    )
    glass = glass_builder.to_object()

    blue_line_left = make_box_object(
        "blue_line_left",
        (normalized_x(LINE_POSITIONS["leftBlue"]), LINE_HEIGHT_M / 2, 0),
        (0.22, LINE_HEIGHT_M, RINK_WIDTH_M),
        materials["blue_line"],
    )
    blue_line_right = make_box_object(
        "blue_line_right",
        (normalized_x(LINE_POSITIONS["rightBlue"]), LINE_HEIGHT_M / 2, 0),
        (0.22, LINE_HEIGHT_M, RINK_WIDTH_M),
        materials["blue_line"],
    )
    center_line = make_box_object(
        "center_line",
        (normalized_x(LINE_POSITIONS["center"]), LINE_HEIGHT_M / 2, 0),
        (0.16, LINE_HEIGHT_M, RINK_WIDTH_M),
        materials["red_line"],
    )
    goal_line_left = make_box_object(
        "goal_line_left",
        (normalized_x(LINE_POSITIONS["leftGoal"]), LINE_HEIGHT_M / 2, 0),
        (0.12, LINE_HEIGHT_M, RINK_WIDTH_M),
        materials["red_line"],
    )
    goal_line_right = make_box_object(
        "goal_line_right",
        (normalized_x(LINE_POSITIONS["rightGoal"]), LINE_HEIGHT_M / 2, 0),
        (0.12, LINE_HEIGHT_M, RINK_WIDTH_M),
        materials["red_line"],
    )

    goal_left = make_goal_object(
        "goal_left",
        normalized_x(LINE_POSITIONS["leftGoal"]),
        -1,
        materials["red_line"],
    )
    goal_right = make_goal_object(
        "goal_right",
        normalized_x(LINE_POSITIONS["rightGoal"]),
        1,
        materials["red_line"],
    )

    faceoff_circles = []
    for name, (x, z) in END_ZONE_FACEOFF_POINTS.items():
        faceoff_circles.append(
            make_torus_object(
                f"faceoff_circle_{name}",
                FACEOFF_CIRCLE_RADIUS_M,
                0.05,
                40,
                6,
                (x, LINE_HEIGHT_M / 2, z),
                materials["red_line"],
            )
        )
        faceoff_circles.append(
            make_cylinder_object(
                f"faceoff_dot_{name}",
                FACEOFF_DOT_RADIUS_M,
                LINE_HEIGHT_M,
                20,
                (x, LINE_HEIGHT_M / 2, z),
                materials["red_line"],
            )
        )
    for name, (x, z) in NEUTRAL_ZONE_DOT_POINTS.items():
        faceoff_circles.append(
            make_cylinder_object(
                f"faceoff_dot_{name}",
                FACEOFF_DOT_RADIUS_M,
                LINE_HEIGHT_M,
                20,
                (x, LINE_HEIGHT_M / 2, z),
                materials["red_line"],
            )
        )

    center_circle = make_torus_object(
        "center_circle",
        FACEOFF_CIRCLE_RADIUS_M,
        0.05,
        40,
        6,
        (0, LINE_HEIGHT_M / 2, 0),
        materials["blue_line"],
    )

    crease_left_builder = MeshBuilder("goal_crease_left")
    crease_left_builder.add_half_disc(
        (normalized_x(LINE_POSITIONS["leftGoal"]), LINE_HEIGHT_M / 2, 0),
        GOAL_CREASE_RADIUS_M,
        1,
        materials["crease"],
    )
    goal_crease_left = crease_left_builder.to_object()

    crease_right_builder = MeshBuilder("goal_crease_right")
    crease_right_builder.add_half_disc(
        (normalized_x(LINE_POSITIONS["rightGoal"]), LINE_HEIGHT_M / 2, 0),
        GOAL_CREASE_RADIUS_M,
        -1,
        materials["crease"],
    )
    goal_crease_right = crease_right_builder.to_object()

    anchors = [
        make_anchor("anchor_center", (0, 0, 0)),
        make_anchor("anchor_left_goal", (normalized_x(LINE_POSITIONS["leftGoal"]), 0, 0)),
        make_anchor("anchor_right_goal", (normalized_x(LINE_POSITIONS["rightGoal"]), 0, 0)),
        make_anchor("anchor_top_boards", (0, 0, -RINK_WIDTH_M / 2)),
        make_anchor("anchor_bottom_boards", (0, 0, RINK_WIDTH_M / 2)),
    ]

    return [
        rink_surface,
        boards,
        glass,
        blue_line_left,
        blue_line_right,
        center_line,
        goal_line_left,
        goal_line_right,
        goal_left,
        goal_right,
        *faceoff_circles,
        center_circle,
        goal_crease_left,
        goal_crease_right,
        *anchors,
    ]


def make_goal_object(
    name: str,
    goal_line_x: float,
    direction: int,
    material: bpy.types.Material,
) -> bpy.types.Object:
    depth = 1.2
    width = 3.0
    bar = 0.16
    height = 0.16
    builder = MeshBuilder(name)
    builder.add_box(
        (goal_line_x + direction * depth / 2, height, -width / 2),
        (depth, height, bar),
        material,
    )
    builder.add_box(
        (goal_line_x + direction * depth / 2, height, width / 2),
        (depth, height, bar),
        material,
    )
    builder.add_box(
        (goal_line_x + direction * depth, height, 0),
        (bar, height, width + bar),
        material,
    )
    return builder.to_object()


def create_marker_pack() -> list[bpy.types.Object]:
    materials = {
        "player": make_unlit_material("mat_marker_player", COLORS["player"]),
        "teammate": make_unlit_material("mat_marker_teammate", COLORS["teammate"]),
        "defender": make_unlit_material("mat_marker_defender", COLORS["defender"]),
        "goalie": make_unlit_material("mat_marker_goalie", COLORS["goalie"]),
        "puck": make_unlit_material("mat_marker_puck", COLORS["puck"]),
        "ring": make_unlit_material("mat_marker_ring", COLORS["ring"]),
    }

    marker_player = join_as_marker(
        "marker_player",
        [
            make_cylinder_object("marker_player_disc", 0.65, 0.18, 24, (0, 0.12, 0), materials["player"]),
            make_torus_object("marker_player_ring_inner", 0.78, 0.045, 20, 6, (0, 0.23, 0), materials["ring"]),
            make_torus_object(
                "marker_player_ring_outer",
                0.98,
                0.045,
                20,
                6,
                (0, 0.30, 0),
                materials["defender"],
            ),
        ],
    )

    marker_teammate = join_as_marker(
        "marker_teammate",
        [
            make_cylinder_object(
                "marker_teammate_disc",
                0.65,
                0.18,
                24,
                (0, 0.12, 0),
                materials["teammate"],
            ),
            make_torus_object("marker_teammate_ring", 0.78, 0.04, 20, 6, (0, 0.23, 0), materials["ring"]),
        ],
    )

    marker_defender = join_as_marker(
        "marker_defender",
        [
            make_cylinder_object(
                "marker_defender_disc",
                0.65,
                0.18,
                24,
                (0, 0.12, 0),
                materials["defender"],
            ),
            make_box_object(
                "marker_defender_cross_a",
                (0, 0.27, 0),
                (1.25, 0.08, 0.18),
                materials["ring"],
                yaw_rad=math.pi / 4,
            ),
            make_box_object(
                "marker_defender_cross_b",
                (0, 0.28, 0),
                (1.25, 0.08, 0.18),
                materials["ring"],
                yaw_rad=-math.pi / 4,
            ),
        ],
    )

    marker_goalie = join_as_marker(
        "marker_goalie",
        [
            make_box_object("marker_goalie_block", (0, 0.16, 0), (1.1, 0.32, 1.25), materials["goalie"]),
            make_torus_object("marker_goalie_ring", 0.78, 0.04, 20, 6, (0, 0.34, 0), materials["defender"]),
        ],
    )

    marker_puck = join_as_marker(
        "marker_puck",
        [
            make_cylinder_object("marker_puck_disc", 0.28, 0.12, 18, (0, 0.10, 0), materials["puck"]),
            make_torus_object("marker_puck_ring", 0.34, 0.025, 16, 6, (0, 0.18, 0), materials["ring"]),
        ],
    )

    return [marker_player, marker_teammate, marker_defender, marker_goalie, marker_puck]


def main() -> None:
    export_date = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    reset_scene()
    rink_objects = create_rink_asset()
    export_selected(rink_objects, RINK_OUTPUT)
    rink_manifest = write_manifest(RINK_OUTPUT, RINK_MANIFEST, export_date)

    reset_scene()
    marker_objects = create_marker_pack()
    export_selected(marker_objects, MARKER_OUTPUT)
    marker_manifest = write_manifest(MARKER_OUTPUT, MARKER_MANIFEST, export_date)

    print("Generated RinkReads low-poly GLB assets")
    for manifest in (rink_manifest, marker_manifest):
        print(
            f"{manifest['asset_path']}: {manifest['byte_size']} bytes, "
            f"sha256={manifest['sha256']}"
        )


if __name__ == "__main__":
    main()
