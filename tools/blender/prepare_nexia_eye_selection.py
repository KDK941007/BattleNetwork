"""Prepare a geometry-preserving Nexia eye-selection workspace.

Creates a NEW .blend file with named vertex groups. Does not move vertices,
delete faces, modify the existing correction blend, or decide which geometry
should be removed for the eye opening.
"""
import argparse
import os
import sys
from collections import defaultdict

import bpy


WORK_COLLECTION = "TRIPO_CORRECTION"
HEAD_SCOPE_NAME = "NEXIA_HEAD_SCOPE_CANDIDATES"
EYE_TARGET_NAME = "NEXIA_EYE_TARGET_UNCONFIRMED"

# Ranks are determined by sorting connected mesh islands by vertex count.
# Each selected island has been visually inspected by the user, but the union
# is a provisional head scope, not a verified eye-only selection.
EXPECTED_TOTAL_VERTICES = 749333
EXPECTED_TOTAL_PARTS = 77
CANDIDATE_RANKS_AND_COUNTS = {
    1: 32803,
    3: 31864,
    5: 25975,
    14: 17727,
    24: 13197,
    51: 5090,
    63: 2453,
}


def parse_args():
    argv = sys.argv
    user_args = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--blend",
        default=os.path.join(
            "assets", "character", "3d", "nexia", "nexia_model.blend"
        ),
        help="Original correction blend to read (never saved by this script).",
    )
    parser.add_argument(
        "--output",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_eye_selection_workspace.blend",
        ),
        help="New selection workspace blend; must differ from --blend.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Explicitly permit replacing the selection workspace, NEVER the source.",
    )
    return parser.parse_args(user_args)


def ranked_components(mesh):
    count = len(mesh.vertices)
    parent = list(range(count))
    weights = [1] * count

    def find(idx):
        while parent[idx] != idx:
            parent[idx] = parent[parent[idx]]
            idx = parent[idx]
        return idx

    for edge in mesh.edges:
        a, b = edge.vertices
        a, b = find(a), find(b)
        if a != b:
            if weights[a] < weights[b]:
                a, b = b, a
            parent[b] = a
            weights[a] += weights[b]

    components = defaultdict(list)
    for idx in range(count):
        components[find(idx)].append(idx)
    return sorted(components.values(), key=len, reverse=True)


def assign_in_chunks(group, indices, batch_size=4096):
    for first in range(0, len(indices), batch_size):
        group.add(indices[first:first + batch_size], 1.0, "REPLACE")


def setup_visibility_and_selection(obj):
    work = bpy.data.collections.get(WORK_COLLECTION)
    reference = bpy.data.collections.get("REFERENCE")
    work.hide_viewport = False
    if reference is not None:
        reference.hide_viewport = False

    for name in (
        "AI_TRIPO_CANDIDATE", "AI_CANDIDATE", "BODY", "ARMOR", "RIG",
        "RENDER", "NEXIA_UPPER_ISLANDS",
    ):
        collection = bpy.data.collections.get(name)
        if collection is not None:
            collection.hide_viewport = True

    bpy.ops.object.select_all(action="DESELECT")
    obj.hide_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    for vertex in obj.data.vertices:
        vertex.select = False

    # Do not enter Edit Mode automatically: user must visually verify the
    # candidate group and deliberately select the eye region first.


def main():
    args = parse_args()
    source_path = os.path.abspath(args.blend)
    output_path = os.path.abspath(args.output)

    if source_path == output_path:
        raise RuntimeError("Refusing to overwrite the original .blend file.")
    if not os.path.isfile(source_path):
        raise FileNotFoundError(f"Original blend not found: {source_path}")
    if os.path.exists(output_path) and not args.force:
        raise RuntimeError(
            f"Selection workspace already exists: {output_path}. "
            "Existing work is preserved. Use -- --force only if intentionally "
            "replacing the selection workspace."
        )

    bpy.ops.wm.open_mainfile(filepath=source_path)

    work = bpy.data.collections.get(WORK_COLLECTION)
    if work is None:
        raise RuntimeError(f"Missing collection: {WORK_COLLECTION}")
    meshes = [obj for obj in work.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(
            f"Expected one correction mesh, got {len(meshes)}. No file saved."
        )
    for name in ("REF_FRONT", "REF_RIGHT", "REF_BACK"):
        if bpy.data.objects.get(name) is None:
            raise RuntimeError(f"Missing reference: {name}. No file saved.")

    obj = meshes[0]
    mesh = obj.data

    if len(mesh.vertices) != EXPECTED_TOTAL_VERTICES:
        raise RuntimeError(
            f"Mesh changed: expected {EXPECTED_TOTAL_VERTICES} vertices, "
            f"found {len(mesh.vertices)}. Aborting rather than guessing."
        )

    if obj.vertex_groups.get(HEAD_SCOPE_NAME) or obj.vertex_groups.get(EYE_TARGET_NAME):
        raise RuntimeError(
            "Selection groups already exist in source blend. "
            "Refusing to replace or overwrite an earlier selection."
        )

    parts = ranked_components(mesh)
    if len(parts) != EXPECTED_TOTAL_PARTS:
        raise RuntimeError(
            f"Connected-part count changed: {len(parts)} rather than "
            f"{EXPECTED_TOTAL_PARTS}. No file saved."
        )

    for rank, expected_size in CANDIDATE_RANKS_AND_COUNTS.items():
        actual_size = len(parts[rank - 1])
        if actual_size != expected_size:
            raise RuntimeError(
                f"Part {rank} changed: {actual_size} versus {expected_size} "
                "vertices. No file saved."
            )

    # These groups contain metadata only. Positions and topology are unchanged.
    scope = obj.vertex_groups.new(name=HEAD_SCOPE_NAME)
    total_scope = 0
    for rank in CANDIDATE_RANKS_AND_COUNTS:
        indices = parts[rank - 1]
        assign_in_chunks(scope, indices)
        total_scope += len(indices)

    obj.vertex_groups.new(name=EYE_TARGET_NAME)  # Intentionally empty.
    setup_visibility_and_selection(obj)

    scene = bpy.context.scene
    scene["nexia_eye_selection_stage"] = "UNCONFIRMED_DO_NOT_DEFORM"
    scene["nexia_head_scope_ranks"] = "1,3,5,14,24,51,63"
    scene["nexia_eye_target_assigned"] = False

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    previous_version = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=output_path)
    finally:
        bpy.context.preferences.filepaths.save_version = previous_version

    print("NEXIA_EYE_SELECTION_WORKSPACE_OK")
    print(f"Source file NOT saved: {source_path}")
    print(f"New selection workspace: {output_path}")
    print(f"Provisional head-candidate vertices: {total_scope}")
    print(f"Head candidate group: {HEAD_SCOPE_NAME}")
    print(f"Empty, unconfirmed eye target group: {EYE_TARGET_NAME}")
    print("No vertex positions, edges, or faces were changed.")
    print("DO NOT deform or delete eye geometry before visual selection review.")


if __name__ == "__main__":
    main()
