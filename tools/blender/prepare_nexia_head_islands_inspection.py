"""Create an inspection-only .blend with independently selectable upper mesh islands.

The original nexia_model.blend is only read and is never overwritten.
This script does not modify vertex positions or perform artistic corrections.
"""
import argparse
import os
import sys
from collections import defaultdict

import bpy
from mathutils import Vector


WORK_COLLECTION = "TRIPO_CORRECTION"
INSPECTION_COLLECTION = "NEXIA_UPPER_ISLANDS"


def parse_args():
    argv = sys.argv
    args = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--blend",
        default=os.path.join("assets", "character", "3d", "nexia", "nexia_model.blend"),
    )
    parser.add_argument(
        "--output",
        default=os.path.join(
            "assets", "character", "3d", "nexia", "nexia_head_islands_inspection.blend"
        ),
    )
    parser.add_argument(
        "--force", action="store_true", help="Overwrite inspection output only."
    )
    return parser.parse_args(args)


def connected_components(mesh):
    size = len(mesh.vertices)
    parent = list(range(size))
    weights = [1] * size

    def find(value):
        while parent[value] != value:
            parent[value] = parent[parent[value]]
            value = parent[value]
        return value

    for edge in mesh.edges:
        a, b = edge.vertices
        a, b = find(a), find(b)
        if a != b:
            if weights[a] < weights[b]:
                a, b = b, a
            parent[b] = a
            weights[a] += weights[b]

    parts = defaultdict(list)
    for vert in mesh.vertices:
        parts[find(vert.index)].append(vert.index)
    ranked = sorted(parts.items(), key=lambda pair: len(pair[1]), reverse=True)
    return ranked, find


def world_bounds(obj):
    coords = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = tuple(min(p[i] for p in coords) for i in range(3))
    high = tuple(max(p[i] for p in coords) for i in range(3))
    return low, high


def main():
    args = parse_args()
    source_path = os.path.abspath(args.blend)
    output_path = os.path.abspath(args.output)
    if source_path == output_path:
        raise RuntimeError("Inspection output must not overwrite source .blend.")
    if not os.path.isfile(source_path):
        raise FileNotFoundError(source_path)
    if os.path.exists(output_path) and not args.force:
        raise RuntimeError(
            f"Inspection output already exists: {output_path}. "
            "Use -- --force only to replace the inspection copy."
        )

    bpy.ops.wm.open_mainfile(filepath=source_path)
    work = bpy.data.collections.get(WORK_COLLECTION)
    if work is None:
        raise RuntimeError(f"Missing collection: {WORK_COLLECTION}")
    meshes = [obj for obj in work.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(
            f"Expected one Tripo correction mesh, found {len(meshes)}. Stop."
        )
    source = meshes[0]
    mesh = source.data
    ranked, find = connected_components(mesh)
    low, high = world_bounds(source)
    cutoff = high[2] - (high[2] - low[2]) * 0.30

    chosen = []
    for part_id, (root, indices) in enumerate(ranked, start=1):
        zmax = max((source.matrix_world @ mesh.vertices[i].co).z for i in indices)
        if zmax >= cutoff:
            chosen.append((part_id, root, indices))

    # Gather only the faces belonging to selected connected components.
    target_roots = {root for _, root, _ in chosen}
    faces_by_root = defaultdict(list)
    for polygon in mesh.polygons:
        root = find(polygon.vertices[0])
        if root in target_roots:
            faces_by_root[root].append(tuple(polygon.vertices))

    inspection = bpy.data.collections.new(INSPECTION_COLLECTION)
    bpy.context.scene.collection.children.link(inspection)

    for part_id, root, indices in chosen:
        index_map = {source_i: local_i for local_i, source_i in enumerate(indices)}
        coordinates = [tuple(mesh.vertices[i].co) for i in indices]
        faces = [
            tuple(index_map[i] for i in old_face)
            for old_face in faces_by_root[root]
        ]
        part_mesh = bpy.data.meshes.new(f"UPPER_PART_{part_id:02d}_mesh")
        part_mesh.from_pydata(coordinates, [], faces)
        part_mesh.update()

        part = bpy.data.objects.new(
            f"UPPER_PART_{part_id:02d}_{len(indices)}v", part_mesh
        )
        inspection.objects.link(part)
        part.matrix_world = source.matrix_world.copy()
        part["original_component_rank"] = part_id
        part["inspection_only"] = True
        print(
            f"UPPER_PART_{part_id:02d}: vertices={len(indices)}, "
            f"faces={len(faces)}"
        )

    # Hide the intact full model only inside the inspection copy.
    source.hide_set(True)
    source.hide_render = True
    for name in ("AI_TRIPO_CANDIDATE", "AI_CANDIDATE", "BODY", "ARMOR", "RIG", "RENDER"):
        collection = bpy.data.collections.get(name)
        if collection:
            collection.hide_viewport = True
            collection.hide_render = True

    work.hide_viewport = False
    inspection.hide_viewport = False
    reference = bpy.data.collections.get("REFERENCE")
    if reference:
        reference.hide_viewport = False

    bpy.ops.object.select_all(action="DESELECT")
    for obj in inspection.objects:
        obj.select_set(False)
    bpy.context.view_layer.objects.active = None

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    old_version = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=output_path)
    finally:
        bpy.context.preferences.filepaths.save_version = old_version

    print("NEXIA_HEAD_ISLAND_INSPECTION_OK")
    print(f"Original .blend not saved or modified: {source_path}")
    print(f"Inspection file: {output_path}")
    print(f"Upper candidates: {len(chosen)} of {len(ranked)} connected components")
    print("These are candidates only, not confirmed head pieces.")
    print("Use the Outliner to hide and show UPPER_PART objects individually.")


if __name__ == "__main__":
    main()
