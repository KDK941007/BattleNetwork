"""Prepare a NON-DESTRUCTIVE front-eye candidate preview for Nexia.

Input: the existing nexia_eye_selection_workspace.blend (do not overwrite).
Output: a separate eye candidate preview .blend with colored front-view guides
and provisional vertex groups. No vertices, edges or faces are modified.

Bounding rectangles are deliberately preliminary estimates from previously
reviewed reference screenshots, NOT validated eye-geometry segmentation.
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Euler, Vector


WORK_COLLECTION = "TRIPO_CORRECTION"
HEAD_SCOPE = "NEXIA_HEAD_SCOPE_CANDIDATES"
EYE_UNCONFIRMED = "NEXIA_EYE_TARGET_UNCONFIRMED"
GUIDE_COLLECTION = "NEXIA_EYE_PREVIEW_GUIDES"
# Front is -Y in the BattleNetwork coordinate convention.
# Revised provisional rectangles from the front-reference screenshot.
# Compared with v1, exclude most of the ear unit and lower mask. These are
# NOT exact eye outlines and must not be used directly for vertex deformation.
SCREEN_LEFT = (-0.133, -0.019, 1.647, 1.746)
SCREEN_RIGHT = (0.012, 0.129, 1.647, 1.746)
MAX_FRONT_Y = -0.040
GUIDE_Y = -0.290


def parse_args():
    raw = sys.argv
    argv = raw[raw.index("--") + 1:] if "--" in raw else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--blend",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_eye_selection_workspace.blend"
        ),
    )
    parser.add_argument(
        "--output",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_eye_candidate_preview_v2.blend"
        ),
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Replace ONLY the separate candidate preview; never the source."
    )
    return parser.parse_args(argv)


def ensure_unique_output(source, output, force):
    if source == output:
        raise RuntimeError("Refusing to overwrite the source eye workspace.")
    if not os.path.isfile(source):
        raise FileNotFoundError(f"Input workspace not found: {source}")
    if os.path.exists(output) and not force:
        raise RuntimeError(
            f"Output already exists: {output}. "
            "Omit --force to keep earlier preview work."
        )


def make_emission_material(name, color):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (*color, 1.0)
    emission.inputs["Strength"].default_value = 1.0
    output = nodes.new("ShaderNodeOutputMaterial")
    material.node_tree.links.new(emission.outputs[0], output.inputs["Surface"])
    return material


def add_front_rectangle(collection, name, box, color):
    xmin, xmax, zmin, zmax = box
    curve = bpy.data.curves.new(name + "_curve", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = 0.0028
    curve.bevel_resolution = 2
    polyline = curve.splines.new("POLY")
    polyline.points.add(3)
    coords = [
        (xmin, GUIDE_Y, zmin), (xmax, GUIDE_Y, zmin),
        (xmax, GUIDE_Y, zmax), (xmin, GUIDE_Y, zmax),
    ]
    for point, xyz in zip(polyline.points, coords):
        point.co = (*xyz, 1.0)
    polyline.use_cyclic_u = True
    curve.materials.append(make_emission_material(name + "_color", color))
    obj = bpy.data.objects.new(name, curve)
    obj.color = (*color, 1.0)
    obj.show_in_front = True
    obj["provisional_region_only"] = True
    collection.objects.link(obj)
    return obj


def group_candidate_vertices(obj, group_name, box, scope_group_index):
    xmin, xmax, zmin, zmax = box
    matrix = obj.matrix_world
    indices = []

    # Bounding test uses front projection X/Z and a permissive -Y depth limit.
    # It never infers the location of the iris or the physical eye socket.
    for vertex in obj.data.vertices:
        p = matrix @ vertex.co
        if not (xmin <= p.x <= xmax and zmin <= p.z <= zmax):
            continue
        if p.y > MAX_FRONT_Y:
            continue
        if any(link.group == scope_group_index for link in vertex.groups):
            indices.append(vertex.index)

    if not indices:
        raise RuntimeError(
            f"No vertices found for {group_name}; leave the original file "
            "unchanged and review coordinate ranges."
        )

    group = obj.vertex_groups.new(name=group_name)
    for start in range(0, len(indices), 4096):
        group.add(indices[start:start + 4096], 1.0, "REPLACE")
    return len(indices)


def prepare_view():
    # Keep model in Object Mode: edit-mode wire overlays are too dense.
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type != "VIEW_3D":
            continue
        space = area.spaces.active
        space.overlay.show_overlays = True
        space.shading.type = "SOLID"
        space.shading.color_type = "MATERIAL"
        space.shading.show_xray = False
        region = space.region_3d
        region.view_perspective = "ORTHO"
        region.view_rotation = Euler((math.pi / 2, 0, 0), "XYZ").to_quaternion()
        region.view_location = Vector((0.0, 0.0, 1.755))
        region.view_distance = 0.95


def main():
    args = parse_args()
    source = os.path.abspath(args.blend)
    output = os.path.abspath(args.output)
    ensure_unique_output(source, output, args.force)

    bpy.ops.wm.open_mainfile(filepath=source)

    if bpy.context.active_object and bpy.context.active_object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")

    collection = bpy.data.collections.get(WORK_COLLECTION)
    if collection is None:
        raise RuntimeError("TRIPO_CORRECTION is missing from input workspace.")
    meshes = [obj for obj in collection.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError("Expected exactly one Tripo correction mesh.")

    obj = meshes[0]
    if len(obj.data.vertices) != 749333:
        raise RuntimeError("Tripo mesh vertex count changed; selection aborted.")
    scope = obj.vertex_groups.get(HEAD_SCOPE)
    empty_eye = obj.vertex_groups.get(EYE_UNCONFIRMED)
    if scope is None or empty_eye is None:
        raise RuntimeError("The existing head/eye groups are missing.")
    # The earlier accidental Assign must NOT be present in the reopened input.
    if any(
        any(link.group == empty_eye.index for link in vertex.groups)
        for vertex in obj.data.vertices
    ):
        raise RuntimeError(
            "Unconfirmed eye target group already contains vertices. "
            "Reopen the original unchanged selection workspace instead."
        )
    if obj.vertex_groups.get("NEXIA_EYE_PREVIEW_SCREEN_LEFT"):
        raise RuntimeError("An earlier preview group already exists in source.")
    if obj.vertex_groups.get("NEXIA_EYE_PREVIEW_SCREEN_RIGHT"):
        raise RuntimeError("An earlier preview group already exists in source.")
    for name in ("REF_FRONT", "REF_RIGHT", "REF_BACK"):
        if bpy.data.objects.get(name) is None:
            raise RuntimeError(f"Reference missing: {name}")

    counts = {
        "screen-left": group_candidate_vertices(
            obj, "NEXIA_EYE_PREVIEW_SCREEN_LEFT",
            SCREEN_LEFT, scope.index
        ),
        "screen-right": group_candidate_vertices(
            obj, "NEXIA_EYE_PREVIEW_SCREEN_RIGHT",
            SCREEN_RIGHT, scope.index
        ),
    }

    # Keep the previously empty target group unconfirmed and untouched.
    guides = bpy.data.collections.new(GUIDE_COLLECTION)
    bpy.context.scene.collection.children.link(guides)
    add_front_rectangle(
        guides, "PREVIEW_SCREEN_LEFT_EYE", SCREEN_LEFT, (1.0, 0.28, 0.22)
    )
    add_front_rectangle(
        guides, "PREVIEW_SCREEN_RIGHT_EYE", SCREEN_RIGHT, (0.12, 0.78, 1.0)
    )

    for name in (
        "AI_TRIPO_CANDIDATE", "AI_CANDIDATE", "BODY", "ARMOR",
        "RIG", "RENDER", "NEXIA_UPPER_ISLANDS",
    ):
        other = bpy.data.collections.get(name)
        if other:
            other.hide_viewport = True
    ref_collection = bpy.data.collections.get("REFERENCE")
    if ref_collection:
        ref_collection.hide_viewport = False
    collection.hide_viewport = False

    bpy.ops.object.select_all(action="DESELECT")
    obj.hide_set(False)
    # No orange selection outline obscuring the eye preview.
    bpy.context.view_layer.objects.active = None

    prepare_view()

    scene = bpy.context.scene
    scene["nexia_eye_preview"] = "GUIDES_AND_CANDIDATES_UNCONFIRMED"
    scene["nexia_eye_preview_screen_left_count"] = counts["screen-left"]
    scene["nexia_eye_preview_screen_right_count"] = counts["screen-right"]
    scene["nexia_eye_target_assigned"] = False

    os.makedirs(os.path.dirname(output), exist_ok=True)
    backup_count = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=output)
    finally:
        bpy.context.preferences.filepaths.save_version = backup_count

    print("NEXIA_EYE_CANDIDATE_PREVIEW_OK")
    print(f"Original workspace NOT saved: {source}")
    print(f"Preview saved: {output}")
    print(f"Provisional screen-left vertices: {counts['screen-left']}")
    print(f"Provisional screen-right vertices: {counts['screen-right']}")
    print("Red/cyan frames are refined but UNCONFIRMED eye areas, not validated edits.")
    print("No mesh positions, edges, faces, or eye-target group were modified.")


if __name__ == "__main__":
    main()
