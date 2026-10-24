"""Nexia eye artwork as a SHALLOW 3D surface following the existing face.

Unlike the previous floating elliptical eyeball trial, this experiment projects
narrow, angular anime-style eye decals onto the existing Tripo head mesh. White
eye, cyan iris, pupil and glint are REAL mesh faces with distinct materials,
but the original 749333-vertex Tripo mesh is never altered.

This is a VISUAL PROTOTYPE and not a finished socket/rigged eyeball. Confirm
front AND right side views. If it fails, stop procedural eye overlay attempts.

Input:  assets/character/3d/nexia/nexia_model.blend
Output: assets/character/3d/nexia/nexia_conformal_eye_trial.blend
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Euler, Vector

SOURCE_COLLECTION = "TRIPO_CORRECTION"
TRIAL_COLLECTION = "NEXIA_EYE_CONFORMAL_TRIAL"
EXPECTED_VERTICES = 749333
NX = 90
NZ = 26
RAY_START_Y = -1.0
RAY_DISTANCE = 2.0
FACE_OFFSET = 0.0035   # 3.5mm forward from the actual facial surface
LID_OFFSET = 0.0055

EYES = (
    {"label": "SCREEN_LEFT", "center_x": -0.078, "half_width": 0.058, "side": -1},
    {"label": "SCREEN_RIGHT", "center_x": 0.077, "half_width": 0.058, "side": 1},
)


def args():
    argv = sys.argv
    values = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--blend",
        default=os.path.join("assets", "character", "3d", "nexia", "nexia_model.blend"),
    )
    parser.add_argument(
        "--output",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_conformal_eye_trial.blend",
        ),
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Overwrite trial output ONLY, never the original blend.",
    )
    return parser.parse_args(values)


def new_material(name, color, roughness=0.28):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    if shader:
        shader.inputs["Base Color"].default_value = (*color, 1.0)
        shader.inputs["Roughness"].default_value = roughness
    return material


def reference_eye_outline(u, side):
    """Angled top lid and nearly level lower lid, as in the reference art.

    Coordinate u increases from screen-left to screen-right. Each eye's
    outer corner is on the side indicated by 'side'.
    """
    outside = side * u
    upper = 1.697 + 0.017 * outside
    lower = 1.662 - 0.002 * outside
    return upper, lower


def eye_z(u, v, side):
    top, bottom = reference_eye_outline(u, side)
    midpoint = (top + bottom) * 0.5
    half_height = (top - bottom) * 0.5
    # Eye tapers to fine corners instead of floating as an oval ball.
    taper = math.sqrt(max(0.00002, 1 - u * u))
    return midpoint + v * half_height * taper


def find_surface(source, x, z, forward_offset):
    inv = source.matrix_world.inverted_safe()
    ray_origin = inv @ Vector((x, RAY_START_Y, z))
    ray_direction = (
        inv.to_3x3() @ Vector((0.0, 1.0, 0.0))
    ).normalized()
    hit, point, normal, face_index = source.ray_cast(
        ray_origin, ray_direction, distance=RAY_DISTANCE
    )
    if not hit:
        raise RuntimeError(
            f"No Tripo surface under eye projection at X={x:.4f}, Z={z:.4f}. "
            "No trial will be saved; do not guess a substitute position."
        )
    original_world = source.matrix_world @ point
    return (x, original_world.y - forward_offset, z)


def shade_region(x, z, spec):
    """Choose a material for each actual polygon, not a floating eyeball."""
    side = spec["side"]
    iris_x = spec["center_x"] - side * 0.012
    iris_z = 1.683
    u = (x - iris_x) / 0.0155
    v = (z - iris_z) / 0.0200
    radius = u * u + v * v
    if ((x - (iris_x - 0.0045)) / 0.0028) ** 2 + (
        (z - (iris_z + 0.0078)) / 0.0033
    ) ** 2 <= 1.0:
        return 3  # glint
    if radius <= 0.24:
        return 2  # pupil
    if radius <= 1.0:
        return 1  # iris
    return 0  # sclera


def make_eye_surface(collection, source, spec, mats):
    name = spec["label"]
    center_x = spec["center_x"]
    half_width = spec["half_width"]
    side = spec["side"]
    coords = []
    polygon_regions = []
    total_depths = []

    for i in range(NX + 1):
        u = -1 + 2 * i / NX
        x = center_x + u * half_width
        for j in range(NZ + 1):
            v = -1 + 2 * j / NZ
            z = eye_z(u, v, side)
            position = find_surface(source, x, z, FACE_OFFSET)
            coords.append(position)
            total_depths.append(position[1])

    faces = []
    stride = NZ + 1
    for i in range(NX):
        u = -1 + 2 * (i + 0.5) / NX
        x = center_x + u * half_width
        for j in range(NZ):
            v = -1 + 2 * (j + 0.5) / NZ
            z = eye_z(u, v, side)
            a = i * stride + j
            b = (i + 1) * stride + j
            faces.append((a, b, b + 1, a + 1))
            polygon_regions.append(shade_region(x, z, spec))

    mesh = bpy.data.meshes.new(f"{name}_CONFORMAL_EYE_mesh")
    mesh.from_pydata(coords, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(f"{name}_CONFORMAL_EYE", mesh)
    collection.objects.link(obj)
    for mat in mats:
        mesh.materials.append(mat)
    for poly, mat_id in zip(mesh.polygons, polygon_regions):
        poly.material_index = mat_id
        poly.use_smooth = True

    obj["non_destructive_trial"] = True
    obj["surface_projection"] = "front_ray_following_tripo"
    obj["note"] = "Colored eye face; not a sculpted eye socket"
    return obj, (min(total_depths), max(total_depths))


def make_lid_curve(collection, source, spec, mat):
    side = spec["side"]
    cx = spec["center_x"]
    half_width = spec["half_width"]
    n = 100
    curve = bpy.data.curves.new(spec["label"] + "_LID_curve", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = 0.0026
    curve.bevel_resolution = 3
    polyline = curve.splines.new("POLY")
    polyline.points.add(n)
    for idx in range(n + 1):
        u = -1 + 2 * idx / n
        x = cx + half_width * u
        z = eye_z(u, 1.0, side) + 0.0007
        p = find_surface(source, x, z, LID_OFFSET)
        polyline.points[idx].co = (*p, 1.0)
    curve.materials.append(mat)
    obj = bpy.data.objects.new(spec["label"] + "_UPPER_LID", curve)
    collection.objects.link(obj)
    obj["non_destructive_trial"] = True
    return obj


def setup_view():
    for name in (
        "AI_TRIPO_CANDIDATE", "AI_CANDIDATE", "BODY", "ARMOR", "RIG",
        "RENDER", "NEXIA_UPPER_ISLANDS", "NEXIA_EYE_PREVIEW_GUIDES",
    ):
        col = bpy.data.collections.get(name)
        if col:
            col.hide_viewport = True

    work = bpy.data.collections.get(SOURCE_COLLECTION)
    work.hide_viewport = False
    refs = bpy.data.collections.get("REFERENCE")
    if refs:
        refs.hide_viewport = False

    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = None

    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type != "VIEW_3D":
            continue
        space = area.spaces.active
        space.shading.type = "SOLID"
        space.shading.color_type = "MATERIAL"
        space.shading.show_xray = False
        space.overlay.show_overlays = True
        region = space.region_3d
        region.view_perspective = "ORTHO"
        region.view_rotation = Euler((math.pi / 2, 0, 0), "XYZ").to_quaternion()
        region.view_location = Vector((0.0, 0.0, 1.75))
        region.view_distance = 0.90


def main():
    settings = args()
    src = os.path.abspath(settings.blend)
    dst = os.path.abspath(settings.output)
    if src == dst:
        raise RuntimeError("Refusing to overwrite the original source .blend.")
    if not os.path.isfile(src):
        raise FileNotFoundError(src)
    if os.path.exists(dst) and not settings.force:
        raise RuntimeError(
            f"Trial exists: {dst}; remove only the trial or explicitly use -- --force."
        )

    bpy.ops.wm.open_mainfile(filepath=src)
    work = bpy.data.collections.get(SOURCE_COLLECTION)
    if work is None:
        raise RuntimeError(f"Missing collection: {SOURCE_COLLECTION}")
    meshes = [obj for obj in work.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one Tripo correction mesh; got {len(meshes)}.")
    source = meshes[0]
    if len(source.data.vertices) != EXPECTED_VERTICES:
        raise RuntimeError(
            "Mesh vertex count changed: abort rather than guess."
        )
    if source.modifiers:
        raise RuntimeError("Source mesh has modifiers; refusing to use a Mask probe.")
    for name in ("REF_FRONT", "REF_RIGHT", "REF_BACK"):
        if bpy.data.objects.get(name) is None:
            raise RuntimeError(f"Missing reference: {name}")
    if bpy.data.collections.get(TRIAL_COLLECTION):
        raise RuntimeError("Source already contains a conformal trial collection.")

    collection = bpy.data.collections.new(TRIAL_COLLECTION)
    bpy.context.scene.collection.children.link(collection)
    sclera = new_material("NEXIA_CONFORMAL_ICE_WHITE", (0.86, 0.95, 1.0))
    iris = new_material("NEXIA_CONFORMAL_CYAN_IRIS", (0.015, 0.60, 0.77))
    pupil = new_material("NEXIA_CONFORMAL_NAVY_PUPIL", (0.004, 0.022, 0.085))
    glint = new_material("NEXIA_CONFORMAL_EYE_HIGHLIGHT", (1.0, 1.0, 1.0))
    lid = new_material("NEXIA_CONFORMAL_NAVY_LID", (0.013, 0.020, 0.090))

    created = []
    for spec in EYES:
        eye, depth = make_eye_surface(
            collection, source, spec, (sclera, iris, pupil, glint)
        )
        created.append(eye)
        created.append(make_lid_curve(collection, source, spec, lid))
        print(
            f"{spec['label']}: attached_eye_depth_y={depth}, "
            f"eye_width={2 * spec['half_width']}"
        )

    setup_view()
    bpy.context.scene["nexia_conformal_eye_status"] = (
        "PROTOTYPE_EYE_COLOR_SURFACE_NOT_FINAL_SOCKET"
    )
    bpy.context.scene["nexia_conformal_original_mesh_unchanged"] = True

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    original_save_versions = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=dst)
    finally:
        bpy.context.preferences.filepaths.save_version = original_save_versions

    print("NEXIA_CONFORMAL_EYE_TRIAL_OK")
    print(f"Original file NOT saved: {src}")
    print(f"Conformal eye trial saved: {dst}")
    print(f"New eye objects: {len(created)}")
    print("Toggle NEXIA_EYE_CONFORMAL_TRIAL to compare before/after.")
    print("Eye outlines follow model depth instead of floating in front.")
    print("No vertices, faces or modifiers of Tripo original were edited.")
    print("IMPORTANT: This does not cut physical eye sockets in the head.")


if __name__ == "__main__":
    main()
