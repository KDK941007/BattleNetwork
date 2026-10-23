"""Read-only front-to-back ray diagnostic for Nexia's two eye regions.

Traces several sight lines from in front of the face into the source Tripo
mesh. Prints the independent connected-part ranks and depths hit in order.
This helps distinguish (a) the exposed front cover and (b) other geometry
still occluding the eyes after a temporary Mask modifier.

DOES NOT edit or save any .blend file, vertex group, face, or modifier.
"""
import argparse
import os
import sys
from collections import Counter, defaultdict

import bpy
from mathutils import Vector


EXPECTED_VERTEX_COUNT = 749333
EXPECTED_COMPONENTS = 77
SOURCE_COLLECTION = "TRIPO_CORRECTION"
EYE_TARGET = "NEXIA_EYE_TARGET_UNCONFIRMED"
# Positions are *provisional*, derived from the model's front eye guides.
# They sample representative sightlines but do not classify an eyeball.
EYE_X = (
    ("LEFT_OUTER", -0.112),
    ("LEFT_CENTER", -0.076),
    ("LEFT_INNER", -0.040),
    ("RIGHT_INNER", 0.039),
    ("RIGHT_CENTER", 0.074),
    ("RIGHT_OUTER", 0.109),
)
EYE_Z = (1.660, 1.690, 1.720)
RAY_START_Y = -1.0
MAX_LAYERS = 8
EPSILON_LOCAL = 0.00035


def parse_args():
    argv = sys.argv
    items = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--blend",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_eye_candidate_preview_v2.blend"
        ),
    )
    return parser.parse_args(items)


def compute_component_rank(mesh):
    n = len(mesh.vertices)
    parent = list(range(n))
    weight = [1] * n

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for edge in mesh.edges:
        a, b = map(find, edge.vertices)
        if a == b:
            continue
        if weight[a] < weight[b]:
            a, b = b, a
        parent[b] = a
        weight[a] += weight[b]

    components = defaultdict(list)
    for vertex in mesh.vertices:
        components[find(vertex.index)].append(vertex.index)

    ranked = sorted(components.values(), key=len, reverse=True)
    if len(ranked) != EXPECTED_COMPONENTS:
        raise RuntimeError(
            f"Expected {EXPECTED_COMPONENTS} connected parts; "
            f"found {len(ranked)}. No geometry was changed."
        )

    by_vertex = bytearray(n)
    for rank, indices in enumerate(ranked, 1):
        for idx in indices:
            by_vertex[idx] = rank
    return by_vertex


def eye_group_must_be_empty(obj):
    group = obj.vertex_groups.get(EYE_TARGET)
    if group is None:
        raise RuntimeError(f"Required target group absent: {EYE_TARGET}")
    for vertex in obj.data.vertices:
        if any(link.group == group.index for link in vertex.groups):
            raise RuntimeError(
                "Eye target group is not empty; do not diagnose edited input."
            )


def cast_layers(obj, ranks, x, z):
    world_to_local = obj.matrix_world.inverted_safe()
    origin = world_to_local @ Vector((x, RAY_START_Y, z))
    direction = (world_to_local.to_3x3() @ Vector((0, 1, 0))).normalized()
    layers = []

    for _ in range(MAX_LAYERS):
        # Object.ray_cast returns a polygon index of the unmodified source
        # mesh when the object has no modifiers; we validate that upfront.
        hit, point, normal, polygon_index = obj.ray_cast(
            origin, direction, distance=10.0
        )
        if not hit:
            break
        if polygon_index < 0 or polygon_index >= len(obj.data.polygons):
            raise RuntimeError("Ray hit an unmapped polygon index.")

        polygon = obj.data.polygons[polygon_index]
        part_rank = ranks[polygon.vertices[0]]
        world_point = obj.matrix_world @ point
        layers.append((part_rank, world_point.y))
        origin = point + EPSILON_LOCAL * direction

    return layers


def main():
    args = parse_args()
    path = os.path.abspath(args.blend)
    if not os.path.isfile(path):
        raise FileNotFoundError(path)

    bpy.ops.wm.open_mainfile(filepath=path)

    collection = bpy.data.collections.get(SOURCE_COLLECTION)
    if collection is None:
        raise RuntimeError(f"Missing collection: {SOURCE_COLLECTION}")
    objects = [o for o in collection.objects if o.type == "MESH"]
    if len(objects) != 1:
        raise RuntimeError(f"Expected exactly one correction mesh: {len(objects)}")
    obj = objects[0]

    if len(obj.data.vertices) != EXPECTED_VERTEX_COUNT:
        raise RuntimeError("Vertex count changed; aborting.")
    if len(obj.modifiers):
        raise RuntimeError(
            "The input mesh has modifiers. Use the unmodified v2 candidate "
            "preview; otherwise polygon indices may not map reliably."
        )

    eye_group_must_be_empty(obj)
    ranks = compute_component_rank(obj.data)
    seen_front = Counter()
    missing = 0

    print("NEXIA_EYE_RAY_DEPTH_DIAGNOSTIC_BEGIN")
    print(f"Input (read only): {path}")
    print("Convention: Front=-Y; Y values are world-space depth.")
    print("PART ranks are from the original 77 connected mesh components.")
    print("Each line lists the first 8 surfaces intersected from the front.")
    for label, x in EYE_X:
        for z in EYE_Z:
            hits = cast_layers(obj, ranks, x, z)
            if hits:
                seen_front[hits[0][0]] += 1
                display = " -> ".join(
                    f"PART_{rank:02d}@Y={y:.4f}" for rank, y in hits
                )
            else:
                missing += 1
                display = "NO_SURFACE_HIT"
            print(f"RAY {label} X={x:+.3f} Z={z:.3f}: {display}")

    print("FRONT_MOST_COMPONENT_COUNTS:")
    for rank, count in seen_front.most_common():
        print(f"  PART_{rank:02d}: {count} rays")
    print(f"NO_SURFACE_HIT_COUNT: {missing}")
    print("INTERPRETATION WARNING: A face hit is not proof of an actual eye mesh.")
    print("NEXIA_EYE_RAY_DEPTH_DIAGNOSTIC_OK")
    print("READ_ONLY: No Blender files or mesh data were saved or changed.")


if __name__ == "__main__":
    main()
