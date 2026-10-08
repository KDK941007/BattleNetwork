"""Read-only diagnostics for the current Nexia Tripo correction mesh.

This script NEVER saves or edits the .blend file.
"""
import argparse
import os
import sys
from collections import defaultdict

import bpy
from mathutils import Vector


COLLECTION_NAME = "TRIPO_CORRECTION"


def parse_args():
    argv = sys.argv
    user_args = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser(
        description="Inspect the Nexia Tripo correction mesh without editing it."
    )
    parser.add_argument(
        "--blend",
        default=os.path.join(
            "assets", "character", "3d", "nexia", "nexia_model.blend"
        ),
    )
    return parser.parse_args(user_args)


def world_bounds(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = tuple(min(point[i] for point in points) for i in range(3))
    high = tuple(max(point[i] for point in points) for i in range(3))
    return low, high


def fmt(vector):
    return "(" + ", ".join(f"{value:.5f}" for value in vector) + ")"


def inspect_mesh(obj):
    mesh = obj.data
    count = len(mesh.vertices)
    print(f"MESH: {obj.name}")
    print(f"  vertices={count}, edges={len(mesh.edges)}, faces={len(mesh.polygons)}")
    min_world, max_world = world_bounds(obj)
    print(f"  world_min={fmt(min_world)}")
    print(f"  world_max={fmt(max_world)}")

    if count == 0:
        return

    parent = list(range(count))
    size = [1] * count

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        root_a, root_b = find(a), find(b)
        if root_a == root_b:
            return
        if size[root_a] < size[root_b]:
            root_a, root_b = root_b, root_a
        parent[root_b] = root_a
        size[root_a] += size[root_b]

    for edge in mesh.edges:
        a, b = edge.vertices
        union(a, b)

    parts = defaultdict(list)
    for v in mesh.vertices:
        parts[find(v.index)].append(v.index)

    print(f"  connected_parts={len(parts)}")
    ranked = sorted(parts.values(), key=len, reverse=True)

    for part_no, indices in enumerate(ranked[:12], start=1):
        coords = [obj.matrix_world @ mesh.vertices[i].co for i in indices]
        lo = tuple(min(p[axis] for p in coords) for axis in range(3))
        hi = tuple(max(p[axis] for p in coords) for axis in range(3))
        print(
            f"  part_{part_no}: vertices={len(indices)}, "
            f"world_min={fmt(lo)}, world_max={fmt(hi)}"
        )
    if len(ranked) > 12:
        print(f"  remaining_parts={len(ranked) - 12}")

    total_height = max_world[2] - min_world[2]
    if total_height > 0:
        for top_fraction in (0.20, 0.30):
            z_threshold = max_world[2] - total_height * top_fraction
            upper_count = sum(
                1
                for vert in mesh.vertices
                if (obj.matrix_world @ vert.co).z >= z_threshold
            )
            print(
                f"  vertices_in_top_{int(top_fraction * 100)}pct="
                f"{upper_count} (diagnostic region only; not a head selection)"
            )


def main():
    args = parse_args()
    path = os.path.abspath(args.blend)
    if not os.path.isfile(path):
        raise FileNotFoundError(path)

    bpy.ops.wm.open_mainfile(filepath=path)

    collection = bpy.data.collections.get(COLLECTION_NAME)
    if collection is None:
        raise RuntimeError(
            f"{COLLECTION_NAME} missing. Prepare the correction workspace first."
        )

    for name in ("REF_FRONT", "REF_LEFT", "REF_BACK"):
        reference = bpy.data.objects.get(name)
        if reference is None:
            raise RuntimeError(f"Missing reference: {name}")
        image = reference.data
        print(f"REFERENCE: {name} size={tuple(image.size)}")

    meshes = [obj for obj in collection.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"{COLLECTION_NAME} contains no mesh object.")

    print(f"WORK_COLLECTION: {COLLECTION_NAME}")
    print(f"MESH_OBJECTS: {len(meshes)}")

    for obj in meshes:
        inspect_mesh(obj)

    print("NEXIA_TRIPO_MESH_INSPECTION_OK")
    print("READ_ONLY: No objects or files were changed.")


if __name__ == "__main__":
    main()
