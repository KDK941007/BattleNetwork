"""Identify which connected Nexia parts occupy each v2 eye candidate area.

Create a separate, NON-DESTRUCTIVE Blender review file. Candidate triangles are
split and colored by their original mesh island (PART_01, PART_03, etc.), not
by rectangular screen side. No source vertices/topology are edited.
"""
import argparse
import os
import sys
from collections import defaultdict

import bpy


SOURCE_COLLECTION = "TRIPO_CORRECTION"
OUTPUT_COLLECTION = "NEXIA_EYE_PART_DIAGNOSTICS"
EXPECTED_VERTEX_COUNT = 749333
EXPECTED_PART_COUNT = 77
KNOWN_PARTS = (1, 3, 5, 14, 24, 51, 63)
CANDIDATE_GROUPS = (
    "NEXIA_EYE_PREVIEW_SCREEN_LEFT",
    "NEXIA_EYE_PREVIEW_SCREEN_RIGHT",
)
COLORS = {
    1: (1.0, 0.66, 0.14),   # helmet candidate
    3: (0.74, 0.38, 0.92),  # helmet candidate
    5: (0.20, 0.88, 0.42),  # face/side candidate
    14: (0.20, 0.55, 1.00), # face/mask candidate
    24: (0.90, 0.44, 0.16), # ear/temple candidate
    51: (1.0, 0.20, 0.42),  # eye vicinity candidate
    63: (0.35, 0.87, 0.82), # rear accent candidate
}


def arguments():
    argv = sys.argv
    values = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--blend",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_eye_candidate_preview_v2.blend",
        ),
    )
    parser.add_argument(
        "--output",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_eye_component_review.blend",
        ),
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace the diagnostic output only (never source).",
    )
    return parser.parse_args(values)


def rank_islands(mesh):
    n = len(mesh.vertices)
    parent = list(range(n))
    size = [1] * n

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for edge in mesh.edges:
        a, b = edge.vertices
        a, b = find(a), find(b)
        if a != b:
            if size[a] < size[b]:
                a, b = b, a
            parent[b] = a
            size[a] += size[b]

    roots = defaultdict(list)
    for i in range(n):
        roots[find(i)].append(i)

    sorted_components = sorted(roots.values(), key=len, reverse=True)
    if len(sorted_components) != EXPECTED_PART_COUNT:
        raise RuntimeError(
            f"Connected component count changed to {len(sorted_components)}."
        )
    rank_by_vertex = [0] * n
    for rank, vertices in enumerate(sorted_components, start=1):
        for index in vertices:
            rank_by_vertex[index] = rank
    return rank_by_vertex


def get_candidate_flags(obj):
    groups = []
    for name in CANDIDATE_GROUPS:
        group = obj.vertex_groups.get(name)
        if group is None:
            raise RuntimeError(f"Missing v2 candidate group: {name}")
        groups.append(group.index)

    target = obj.vertex_groups.get("NEXIA_EYE_TARGET_UNCONFIRMED")
    if target is None:
        raise RuntimeError("Missing unconfirmed eye target.")
    flags = bytearray(len(obj.data.vertices))
    for vert in obj.data.vertices:
        for link in vert.groups:
            if link.group == target.index:
                raise RuntimeError(
                    "Eye target already has an assignment. "
                    "Aborting to avoid misdiagnosing edited data."
                )
            if link.group == groups[0]:
                flags[vert.index] |= 1
            elif link.group == groups[1]:
                flags[vert.index] |= 2
    return flags


def colored_material(part):
    material = bpy.data.materials.new(f"DIAGNOSTIC_PART_{part:02d}")
    material.diffuse_color = (*COLORS[part], 1.0)
    return material


def add_overlay(collection, original, part, faces, face_side):
    all_ids = sorted(set(i for face in faces for i in face))
    id_map = {old: new for new, old in enumerate(all_ids)}
    positions = [tuple(original.data.vertices[i].co) for i in all_ids]
    polygons = [tuple(id_map[idx] for idx in face) for face in faces]
    new_mesh = bpy.data.meshes.new(
        f"DIAGNOSTIC_PART_{part:02d}_mesh"
    )
    new_mesh.from_pydata(positions, [], polygons)
    new_mesh.update()
    obj = bpy.data.objects.new(
        f"PART_{part:02d}_candidate_surface", new_mesh
    )
    collection.objects.link(obj)
    # In front for clarity. No offset is applied to original source.
    obj.matrix_world = original.matrix_world.copy()
    obj.show_in_front = True
    mat = colored_material(part)
    new_mesh.materials.append(mat)
    obj.color = (*COLORS[part], 1.0)
    obj["diagnostic_only"] = True
    obj["component_rank"] = part
    obj["screen_left_face_count"] = face_side[0]
    obj["screen_right_face_count"] = face_side[1]
    return len(all_ids), len(faces)


def main():
    args = arguments()
    src = os.path.abspath(args.blend)
    dst = os.path.abspath(args.output)

    if src == dst:
        raise RuntimeError("Diagnostic must not overwrite source .blend.")
    if not os.path.isfile(src):
        raise FileNotFoundError(src)
    if os.path.exists(dst) and not args.force:
        raise RuntimeError(
            f"Diagnostic already exists: {dst}. "
            "Use -- --force only to replace that output."
        )

    bpy.ops.wm.open_mainfile(filepath=src)
    work = bpy.data.collections.get(SOURCE_COLLECTION)
    if work is None:
        raise RuntimeError("TRIPO_CORRECTION collection missing.")
    meshes = [obj for obj in work.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError("Expected exactly one Tripo correction mesh.")
    original = meshes[0]
    if len(original.data.vertices) != EXPECTED_VERTEX_COUNT:
        raise RuntimeError("Unexpected source vertex count. Stop.")

    if bpy.data.collections.get(OUTPUT_COLLECTION):
        raise RuntimeError("Diagnostic collection already exists in input.")

    ranks = rank_islands(original.data)
    flags = get_candidate_flags(original)
    faces_per_part = defaultdict(list)
    side_stats = defaultdict(lambda: [0, 0])

    # Use only triangles entirely inside one v2 candidate group and one
    # original connected island. No vertex deletion or deformation.
    for polygon in original.data.polygons:
        face = tuple(polygon.vertices)
        rank = ranks[face[0]]
        if rank not in KNOWN_PARTS:
            continue
        if not all(ranks[idx] == rank for idx in face):
            continue
        left = all(flags[idx] & 1 for idx in face)
        right = all(flags[idx] & 2 for idx in face)
        if not left and not right:
            continue
        faces_per_part[rank].append(face)
        if left:
            side_stats[rank][0] += 1
        if right:
            side_stats[rank][1] += 1

    if not faces_per_part:
        raise RuntimeError(
            "No candidate faces available; source was not saved."
        )

    preview_collection = bpy.data.collections.new(OUTPUT_COLLECTION)
    bpy.context.scene.collection.children.link(preview_collection)
    for part in sorted(faces_per_part):
        nverts, nfaces = add_overlay(
            preview_collection, original, part, faces_per_part[part],
            side_stats[part]
        )
        print(
            f"PART_{part:02d}: overlay_vertices={nverts}, "
            f"faces={nfaces}, "
            f"screen_left={side_stats[part][0]}, "
            f"screen_right={side_stats[part][1]}"
        )

    old_guides = bpy.data.collections.get("NEXIA_EYE_PREVIEW_GUIDES")
    if old_guides is not None:
        old_guides.hide_viewport = True
    for name in (
        "AI_TRIPO_CANDIDATE", "AI_CANDIDATE",
        "BODY", "ARMOR", "RIG", "RENDER",
    ):
        other = bpy.data.collections.get(name)
        if other is not None:
            other.hide_viewport = True

    work.hide_viewport = False
    preview_collection.hide_viewport = False
    original.hide_set(False)
    reference = bpy.data.collections.get("REFERENCE")
    if reference is not None:
        reference.hide_viewport = False

    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = None
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type == "VIEW_3D":
            space = area.spaces.active
            space.shading.type = "SOLID"
            space.shading.color_type = "MATERIAL"
            space.shading.show_xray = False
            space.overlay.show_overlays = True

    scene = bpy.context.scene
    scene["nexia_eye_component_diagnostic"] = "PREVIEW_ONLY"
    scene["nexia_eye_target_assigned"] = False

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    previous = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=dst)
    finally:
        bpy.context.preferences.filepaths.save_version = previous

    print("NEXIA_EYE_COMPONENT_REVIEW_OK")
    print(f"Source file was NOT saved: {src}")
    print(f"Diagnostic saved: {dst}")
    print("Only component-colored COPIES are displayed.")
    print("No original vertex positions or topology were modified.")


if __name__ == "__main__":
    main()
