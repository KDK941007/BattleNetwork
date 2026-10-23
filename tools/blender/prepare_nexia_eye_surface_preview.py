"""Visualize which Nexia mesh faces are included in the eye candidate groups.

READS: nexia_eye_candidate_preview_v2.blend
SAVES: nexia_eye_surface_preview.blend (never overwrites the input)

Creates separate red/cyan overlay meshes from faces whose vertices ALL belong
to one of the two preliminary eye candidate groups. The actual correction
mesh is NOT moved, deleted, re-meshed, or re-materialized. The overlays are
strictly for visual diagnosis and are NOT an approved deformation selection.
"""
import argparse
import os
import sys

import bpy
from mathutils import Vector


WORK = "TRIPO_CORRECTION"
PREVIEW = "NEXIA_EYE_SURFACE_PREVIEW"
SOURCE_GROUPS = (
    ("NEXIA_EYE_PREVIEW_SCREEN_LEFT", "SCREEN_LEFT", (1.0, 0.20, 0.18)),
    ("NEXIA_EYE_PREVIEW_SCREEN_RIGHT", "SCREEN_RIGHT", (0.03, 0.78, 0.98)),
)
EMPTY_TARGET = "NEXIA_EYE_TARGET_UNCONFIRMED"
EXPECTED_VERTICES = 749333
FRONT_OFFSET_WORLD = Vector((0.0, -0.004, 0.0))


def args_from_command_line():
    argv = sys.argv
    args = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--blend",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_eye_candidate_preview_v2.blend",
        ),
        help="Input v2 eye candidate preview; loaded but never overwritten.",
    )
    parser.add_argument(
        "--output",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_eye_surface_preview.blend",
        ),
        help="Different .blend file for surface highlighting.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace output PREVIEW file only, never the input or original model.",
    )
    return parser.parse_args(args)


def candidate_vertex_labels(obj):
    group_indices = []
    for name, _, _ in SOURCE_GROUPS:
        group = obj.vertex_groups.get(name)
        if group is None:
            raise RuntimeError(f"Missing candidate group: {name}")
        group_indices.append(group.index)

    target = obj.vertex_groups.get(EMPTY_TARGET)
    if target is None:
        raise RuntimeError(f"Missing unconfirmed target group: {EMPTY_TARGET}")

    labels = bytearray(len(obj.data.vertices))
    counts = [0, 0]
    for vertex in obj.data.vertices:
        for weight in vertex.groups:
            if weight.group == target.index:
                raise RuntimeError(
                    "Unexpected assigned vertices in eye target. "
                    "Stop and reopen the unchanged eye selection workspace."
                )
            if weight.group == group_indices[0]:
                labels[vertex.index] = 1
                counts[0] += 1
            elif weight.group == group_indices[1]:
                labels[vertex.index] = 2
                counts[1] += 1

    if min(counts) == 0:
        raise RuntimeError(
            f"Eye candidate groups are empty: {counts}. No file saved."
        )
    return labels, counts


def new_preview_material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    return mat


def create_overlay(collection, source, label, name, color, polygons):
    if not polygons:
        raise RuntimeError(f"No complete candidate faces for {name}.")

    indices = set()
    for poly in polygons:
        indices.update(poly)

    # Overlay displacement is world-frontward only for the preview,
    # preserving every source coordinate and all original mesh data.
    local_offset = (
        source.matrix_world.inverted().to_3x3() @ FRONT_OFFSET_WORLD
    )
    ordered = sorted(indices)
    remap = {idx: i for i, idx in enumerate(ordered)}
    coords = [
        tuple(source.data.vertices[idx].co + local_offset) for idx in ordered
    ]
    faces = [tuple(remap[idx] for idx in poly) for poly in polygons]
    overlay_mesh = bpy.data.meshes.new(name + "_mesh")
    overlay_mesh.from_pydata(coords, [], faces)
    overlay_mesh.update()

    overlay_obj = bpy.data.objects.new(name, overlay_mesh)
    collection.objects.link(overlay_obj)
    overlay_obj.matrix_world = source.matrix_world.copy()
    overlay_obj.data.materials.append(
        new_preview_material(name + "_color", color)
    )
    overlay_obj.color = (*color, 1.0)
    overlay_obj["preview_only"] = True
    overlay_obj["candidate_label"] = label
    return overlay_obj, len(ordered), len(faces)


def main():
    args = args_from_command_line()
    source_path = os.path.abspath(args.blend)
    output_path = os.path.abspath(args.output)
    if source_path == output_path:
        raise RuntimeError("Refusing to overwrite source .blend.")
    if not os.path.isfile(source_path):
        raise FileNotFoundError(f"Input preview not found: {source_path}")
    if os.path.exists(output_path) and not args.force:
        raise RuntimeError(
            f"Output exists: {output_path}. "
            "Use -- --force only if deliberately replacing the preview."
        )

    bpy.ops.wm.open_mainfile(filepath=source_path)
    work = bpy.data.collections.get(WORK)
    if work is None:
        raise RuntimeError(f"Missing collection: {WORK}")
    meshes = [obj for obj in work.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one correction mesh; found {len(meshes)}.")
    source = meshes[0]
    if len(source.data.vertices) != EXPECTED_VERTICES:
        raise RuntimeError(
            f"Mesh has {len(source.data.vertices)} vertices; "
            f"expected {EXPECTED_VERTICES}. No file saved."
        )
    if bpy.data.collections.get(PREVIEW) is not None:
        raise RuntimeError(f"Preview collection already exists: {PREVIEW}")

    labels, counts = candidate_vertex_labels(source)
    included_faces = [[], []]
    # Do not change a single polygon in the original mesh. Only copy
    # fully included faces into new, separate diagnostic mesh objects.
    for poly in source.data.polygons:
        verts = tuple(poly.vertices)
        first_label = labels[verts[0]]
        if first_label and all(labels[idx] == first_label for idx in verts[1:]):
            included_faces[first_label - 1].append(verts)

    collection = bpy.data.collections.new(PREVIEW)
    bpy.context.scene.collection.children.link(collection)
    results = []

    for index, (group_name, suffix, color) in enumerate(SOURCE_GROUPS):
        obj, vertex_count, face_count = create_overlay(
            collection, source, group_name,
            "EYE_CANDIDATE_FACES_" + suffix,
            color, included_faces[index]
        )
        results.append((obj.name, vertex_count, face_count))

    for name in ("AI_TRIPO_CANDIDATE", "AI_CANDIDATE", "BODY", "ARMOR", "RIG", "RENDER"):
        other = bpy.data.collections.get(name)
        if other is not None:
            other.hide_viewport = True
    work.hide_viewport = False
    ref = bpy.data.collections.get("REFERENCE")
    if ref is not None:
        ref.hide_viewport = False
    collection.hide_viewport = False

    bpy.ops.object.select_all(action="DESELECT")
    source.hide_set(False)
    bpy.context.view_layer.objects.active = None

    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type == "VIEW_3D":
            space = area.spaces.active
            space.shading.type = "SOLID"
            space.shading.color_type = "MATERIAL"
            space.shading.show_xray = False
            space.overlay.show_overlays = True

    scene = bpy.context.scene
    scene["nexia_eye_surface_preview"] = "CANDIDATE_NOT_CONFIRMED"
    scene["nexia_eye_target_assigned"] = False

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    previous_save_version = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=output_path)
    finally:
        bpy.context.preferences.filepaths.save_version = previous_save_version

    print("NEXIA_EYE_SURFACE_PREVIEW_OK")
    print(f"Source was NOT saved: {source_path}")
    print(f"Preview saved: {output_path}")
    print(f"Candidate vertices in groups: {counts}")
    for name, n_verts, n_faces in results:
        print(f"{name}: highlighted vertices={n_verts}, faces={n_faces}")
    print("The red/cyan overlays are copied surfaces, not approved edits.")
    print("No original vertex positions, edges or faces were modified.")


if __name__ == "__main__":
    main()
