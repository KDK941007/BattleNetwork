"""Nexia eye-socket visibility probe; REVERSIBLE and NON-DESTRUCTIVE.

Reads the v2 eye candidate workspace and adds ONE disabled-in-render Mask
modifier to a separate output .blend. Only provisional face-island candidates
(PART_51 on screen-left, PART_14 on screen-right) are hidden by the modifier.
The Tripo mesh data (vertices, edges and faces) stays intact. The result is
strictly a diagnostic: an apparent eye through a hole may simply be the 2D
REFERENCE image in the background, NOT a modeled eyeball.

Output must be reviewed before any permanent edit; do not apply the modifier.
"""
import argparse
import os
import sys
from collections import defaultdict

import bpy


EXPECTED_VERTICES = 749333
EXPECTED_COMPONENTS = 77
COLLECTION = "TRIPO_CORRECTION"
OUTPUT_GROUP = "NEXIA_DIAGNOSTIC_EYE_COVER_HIDE"
MODIFIER_NAME = "PREVIEW_ONLY_HideFaceEyeCovers"
SIDE_SETTINGS = (
    ("NEXIA_EYE_PREVIEW_SCREEN_LEFT", 51, -1),
    ("NEXIA_EYE_PREVIEW_SCREEN_RIGHT", 14, 1),
)


def arguments():
    argv = sys.argv
    raw = argv[argv.index("--") + 1:] if "--" in argv else []
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--blend",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_eye_candidate_preview_v2.blend",
        ),
    )
    p.add_argument(
        "--output",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_eye_hole_probe.blend",
        ),
    )
    p.add_argument(
        "--force", action="store_true",
        help="Replace ONLY the output probe .blend, never its input.",
    )
    return p.parse_args(raw)


def component_ranks(mesh):
    n = len(mesh.vertices)
    parents = list(range(n))
    sizes = [1] * n

    def find(idx):
        while parents[idx] != idx:
            parents[idx] = parents[parents[idx]]
            idx = parents[idx]
        return idx

    for edge in mesh.edges:
        left, right = edge.vertices
        left, right = find(left), find(right)
        if left == right:
            continue
        if sizes[left] < sizes[right]:
            left, right = right, left
        parents[right] = left
        sizes[left] += sizes[right]

    islands = defaultdict(list)
    for idx in range(n):
        islands[find(idx)].append(idx)
    sorted_islands = sorted(islands.values(), key=len, reverse=True)
    if len(sorted_islands) != EXPECTED_COMPONENTS:
        raise RuntimeError(
            f"Unexpected islands: {len(sorted_islands)} (expected {EXPECTED_COMPONENTS})."
        )
    ranks = bytearray(n)
    for rank, members in enumerate(sorted_islands, 1):
        for idx in members:
            ranks[idx] = rank
    return ranks


def locate_group_indices(obj):
    results = []
    for name, rank, sign in SIDE_SETTINGS:
        group = obj.vertex_groups.get(name)
        if group is None:
            raise RuntimeError(f"Missing candidate group {name}")
        results.append((group.index, rank, sign))
    target = obj.vertex_groups.get("NEXIA_EYE_TARGET_UNCONFIRMED")
    if target is None:
        raise RuntimeError("Missing empty eye target group.")
    return results, target.index


def make_probe(obj, ranks):
    if obj.vertex_groups.get(OUTPUT_GROUP) or obj.modifiers.get(MODIFIER_NAME):
        raise RuntimeError("Probe already exists in input file.")
    settings, target_idx = locate_group_indices(obj)
    indices = []
    counts = [0, 0]
    for vertex in obj.data.vertices:
        for link in vertex.groups:
            if link.group == target_idx:
                raise RuntimeError(
                    "The eye edit-target group is not empty. Refusing to continue."
                )
        part_rank = ranks[vertex.index]
        for number, (idx, required_rank, sign) in enumerate(settings):
            if part_rank != required_rank:
                continue
            world_x = (obj.matrix_world @ vertex.co).x
            if (world_x * sign) < -0.005:
                # Compare in WORLD coordinates; the imported mesh may have a
                # non-identity yaw transform in the correction collection.
                # This is not a precise eye boundary.
                continue
            if any(link.group == idx for link in vertex.groups):
                indices.append(vertex.index)
                counts[number] += 1
                break

    if min(counts) < 25:
        raise RuntimeError(
            f"Too few vertices for one side: {counts}. "
            "Input or sign convention should be checked."
        )

    group = obj.vertex_groups.new(name=OUTPUT_GROUP)
    for i in range(0, len(indices), 4096):
        group.add(indices[i:i + 4096], 1.0, "REPLACE")

    modifier = obj.modifiers.new(name=MODIFIER_NAME, type="MASK")
    modifier.mode = "VERTEX_GROUP"
    modifier.vertex_group = OUTPUT_GROUP
    modifier.invert_vertex_group = True
    modifier.threshold = 0.5
    modifier.use_smooth = False
    modifier.show_viewport = True
    modifier.show_render = False
    modifier.show_in_editmode = False

    return counts, modifier.name


def main():
    args = arguments()
    source_path = os.path.abspath(args.blend)
    output_path = os.path.abspath(args.output)
    if source_path == output_path:
        raise RuntimeError("Probe must not overwrite the input .blend.")
    if not os.path.isfile(source_path):
        raise FileNotFoundError(source_path)
    if os.path.exists(output_path) and not args.force:
        raise RuntimeError(
            f"Output already exists: {output_path}. "
            "Use -- --force only to replace this diagnostic output."
        )

    bpy.ops.wm.open_mainfile(filepath=source_path)

    work = bpy.data.collections.get(COLLECTION)
    if work is None:
        raise RuntimeError(f"Missing source collection: {COLLECTION}")
    meshes = [obj for obj in work.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one work mesh; found {len(meshes)}.")
    obj = meshes[0]
    if len(obj.data.vertices) != EXPECTED_VERTICES:
        raise RuntimeError(
            f"Mesh vertex count {len(obj.data.vertices)} does not match."
        )

    ranks = component_ranks(obj.data)
    counts, modifier_name = make_probe(obj, ranks)

    guides = bpy.data.collections.get("NEXIA_EYE_PREVIEW_GUIDES")
    if guides is not None:
        guides.hide_viewport = True
    for name in (
        "AI_TRIPO_CANDIDATE", "AI_CANDIDATE", "BODY",
        "ARMOR", "RIG", "RENDER",
    ):
        other = bpy.data.collections.get(name)
        if other is not None:
            other.hide_viewport = True

    work.hide_viewport = False
    reference = bpy.data.collections.get("REFERENCE")
    if reference is not None:
        reference.hide_viewport = False

    bpy.ops.object.select_all(action="DESELECT")
    obj.hide_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type == "VIEW_3D":
            space = area.spaces.active
            space.shading.type = "SOLID"
            space.shading.show_xray = False
            space.overlay.show_overlays = True

    bpy.context.scene["nexia_eye_hole_probe"] = "NON_DESTRUCTIVE_NOT_A_FINAL_EDIT"
    bpy.context.scene["nexia_eye_target_assigned"] = False

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    old_version = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=output_path)
    finally:
        bpy.context.preferences.filepaths.save_version = old_version

    print("NEXIA_EYE_HOLE_PROBE_OK")
    print(f"Source blend NOT saved: {source_path}")
    print(f"Separate preview saved: {output_path}")
    print(f"Temporarily hidden vertices: screen-left {counts[0]}, screen-right {counts[1]}")
    print(f"Modifier: {modifier_name}")
    print("Toggle modifier viewport icon to compare with and without holes.")
    print("WARNING: Any eyes seen through the holes may be the 2D reference image.")
    print("No source vertices/faces were moved or deleted; DO NOT apply the modifier.")


if __name__ == "__main__":
    main()
