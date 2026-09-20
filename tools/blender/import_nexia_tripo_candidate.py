import argparse
import math
import os
import sys

import bpy
from mathutils import Vector


TRIPO_COLLECTION_NAME = "AI_TRIPO_CANDIDATE"
TRIPO_ROOT_NAME = "AI_TRIPO_ROOT"
TRIPO_MARKER = "nexia_tripo_candidate"

REFERENCE_TOP_Y = 18.0
REFERENCE_BOTTOM_Y = 850.0


def parse_args():
    argv = sys.argv
    user_args = argv[argv.index("--") + 1 :] if "--" in argv else []

    parser = argparse.ArgumentParser(
        description=(
            "Import and align the Tripo Nexia candidate while preserving the "
            "existing Hunyuan AI_CANDIDATE collection."
        )
    )
    parser.add_argument(
        "--blend",
        default=os.path.join(
            "assets", "character", "3d", "nexia", "nexia_model.blend"
        ),
        help="Target Nexia .blend file.",
    )
    parser.add_argument(
        "--glb",
        default=os.path.join(
            "assets",
            "character",
            "3d",
            "nexia",
            "ai",
            "tripo-multiview.glb",
        ),
        help="Tripo-generated GLB to import.",
    )
    parser.add_argument(
        "--yaw",
        type=float,
        default=0.0,
        help=(
            "Optional Z-axis yaw in degrees after import. "
            "Keep 0 for the first comparison; only change after visual confirmation."
        ),
    )
    return parser.parse_args(user_args)


def abs_path(path):
    return os.path.abspath(path)


def require_reference(name):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f"Required reference is missing: {name}")
    return obj


def get_front_reference_fit():
    ref = require_reference("REF_FRONT")
    image = getattr(ref, "data", None)

    if image is None or not hasattr(image, "size"):
        raise RuntimeError("REF_FRONT does not contain image data.")

    image_width, image_height = image.size
    if image_width <= 0 or image_height <= 0:
        raise RuntimeError(
            f"REF_FRONT image has invalid dimensions: {image_width}x{image_height}"
        )

    vertical_axis_world = ref.matrix_world.to_3x3() @ Vector((0.0, 1.0, 0.0))
    frame_height_world = ref.empty_display_size * vertical_axis_world.length
    frame_bottom_world = ref.matrix_world.translation.z

    visible_bottom_world = frame_bottom_world + frame_height_world * (
        (image_height - REFERENCE_BOTTOM_Y) / image_height
    )
    visible_top_world = frame_bottom_world + frame_height_world * (
        (image_height - REFERENCE_TOP_Y) / image_height
    )
    visible_height_world = visible_top_world - visible_bottom_world

    if visible_height_world <= 0.0:
        raise RuntimeError(
            "Calculated REF_FRONT visible height is not positive: "
            f"{visible_height_world}"
        )

    return {
        "visible_bottom_world": visible_bottom_world,
        "visible_top_world": visible_top_world,
        "visible_height_world": visible_height_world,
    }


def clear_previous_tripo_candidate():
    collection = bpy.data.collections.get(TRIPO_COLLECTION_NAME)
    if collection is not None:
        for obj in list(collection.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(collection)

    for mesh in list(bpy.data.meshes):
        if mesh.get(TRIPO_MARKER) and mesh.users == 0:
            bpy.data.meshes.remove(mesh)

    for material in list(bpy.data.materials):
        if material.get(TRIPO_MARKER) and material.users == 0:
            bpy.data.materials.remove(material)


def create_candidate_collection():
    collection = bpy.data.collections.new(TRIPO_COLLECTION_NAME)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_object_to_collection(obj, collection):
    for source_collection in list(obj.users_collection):
        source_collection.objects.unlink(obj)
    collection.objects.link(obj)


def mark_candidate_data(obj):
    obj[TRIPO_MARKER] = True

    if obj.data is not None:
        try:
            obj.data[TRIPO_MARKER] = True
        except TypeError:
            pass

    if obj.type == "MESH" and obj.data is not None:
        for material in obj.data.materials:
            if material is not None:
                material[TRIPO_MARKER] = True


def imported_mesh_objects(imported_objects):
    return [obj for obj in imported_objects if obj.type == "MESH"]


def world_bounds(mesh_objects):
    if not mesh_objects:
        raise RuntimeError("Imported GLB does not contain any mesh objects.")

    points = []
    for obj in mesh_objects:
        for corner in obj.bound_box:
            points.append(obj.matrix_world @ Vector(corner))

    min_corner = Vector(
        (
            min(point.x for point in points),
            min(point.y for point in points),
            min(point.z for point in points),
        )
    )
    max_corner = Vector(
        (
            max(point.x for point in points),
            max(point.y for point in points),
            max(point.z for point in points),
        )
    )

    return min_corner, max_corner


def fit_candidate(root, mesh_objects, reference_fit, yaw_degrees):
    root.rotation_mode = "XYZ"
    root.rotation_euler = (0.0, 0.0, math.radians(yaw_degrees))
    bpy.context.view_layer.update()

    before_min, before_max = world_bounds(mesh_objects)
    before_extent = before_max - before_min

    extents = {
        "X": before_extent.x,
        "Y": before_extent.y,
        "Z": before_extent.z,
    }
    tallest_axis = max(extents, key=extents.get)
    if tallest_axis != "Z":
        raise RuntimeError(
            "Imported Tripo GLB is not Z-up after Blender glTF import. "
            f"Detected extents: X={before_extent.x:.6f}, "
            f"Y={before_extent.y:.6f}, Z={before_extent.z:.6f}. "
            "Stop instead of guessing an axis rotation."
        )

    if before_extent.z <= 0.0:
        raise RuntimeError(f"Imported Tripo candidate height is invalid: {before_extent.z}")

    uniform_scale = reference_fit["visible_height_world"] / before_extent.z
    root.scale = (uniform_scale, uniform_scale, uniform_scale)
    bpy.context.view_layer.update()

    scaled_min, scaled_max = world_bounds(mesh_objects)
    scaled_center = (scaled_min + scaled_max) * 0.5

    root.location.x -= scaled_center.x
    root.location.y -= scaled_center.y
    root.location.z += reference_fit["visible_bottom_world"] - scaled_min.z
    bpy.context.view_layer.update()

    final_min, final_max = world_bounds(mesh_objects)
    final_extent = final_max - final_min

    return {
        "source_extent": tuple(before_extent),
        "uniform_scale": uniform_scale,
        "final_min": tuple(final_min),
        "final_max": tuple(final_max),
        "final_extent": tuple(final_extent),
    }


def main():
    args = parse_args()

    blend_path = abs_path(args.blend)
    glb_path = abs_path(args.glb)

    if not os.path.isfile(blend_path):
        raise FileNotFoundError(f"Blend file not found: {blend_path}")
    if not os.path.isfile(glb_path):
        raise FileNotFoundError(
            "Tripo candidate GLB not found: "
            f"{glb_path}\n"
            "Generate/download it first or pass --glb <path>."
        )

    bpy.ops.wm.open_mainfile(filepath=blend_path)

    require_reference("REF_FRONT")
    require_reference("REF_BACK")
    require_reference("REF_LEFT")
    reference_fit = get_front_reference_fit()

    clear_previous_tripo_candidate()
    candidate_collection = create_candidate_collection()

    before_objects = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=glb_path)
    imported_objects = [
        obj for obj in bpy.data.objects if obj not in before_objects
    ]

    if not imported_objects:
        raise RuntimeError("Blender glTF importer did not create any objects.")

    for obj in imported_objects:
        move_object_to_collection(obj, candidate_collection)
        mark_candidate_data(obj)

    root = bpy.data.objects.new(TRIPO_ROOT_NAME, None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.12
    root[TRIPO_MARKER] = True
    candidate_collection.objects.link(root)

    imported_set = set(imported_objects)
    top_level_objects = [
        obj for obj in imported_objects if obj.parent not in imported_set
    ]

    for obj in top_level_objects:
        matrix_world = obj.matrix_world.copy()
        obj.parent = root
        obj.matrix_world = matrix_world

    bpy.context.view_layer.update()

    mesh_objects = imported_mesh_objects(imported_objects)
    fit_info = fit_candidate(
        root,
        mesh_objects,
        reference_fit,
        args.yaw,
    )

    scene = bpy.context.scene
    scene["nexia_tripo_candidate_source"] = bpy.path.relpath(glb_path)
    scene["nexia_tripo_candidate_collection"] = TRIPO_COLLECTION_NAME
    scene["nexia_tripo_candidate_yaw_deg"] = float(args.yaw)
    scene["nexia_tripo_candidate_fit_scale"] = fit_info["uniform_scale"]
    scene["nexia_tripo_candidate_status"] = "REFERENCE_COMPARISON_PENDING"

    previous_save_version = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    finally:
        bpy.context.preferences.filepaths.save_version = previous_save_version

    print("NEXIA_TRIPO_IMPORT_OK")
    print(f"Source GLB: {glb_path}")
    print(f"Imported object count: {len(imported_objects)}")
    print(f"Imported mesh count: {len(mesh_objects)}")
    print(
        "Source Blender extents: "
        + str(tuple(round(value, 6) for value in fit_info["source_extent"]))
    )
    print(f"Applied yaw: {args.yaw:.3f} deg")
    print(f"Applied uniform scale: {fit_info['uniform_scale']:.6f}")
    print(
        "Final fitted extents: "
        + str(tuple(round(value, 6) for value in fit_info["final_extent"]))
    )
    print(
        "Final minimum: "
        + str(tuple(round(value, 6) for value in fit_info["final_min"]))
    )
    print(
        "Final maximum: "
        + str(tuple(round(value, 6) for value in fit_info["final_max"]))
    )
    print(f"Collection: {TRIPO_COLLECTION_NAME}")
    print("Existing Hunyuan AI_CANDIDATE collection was preserved.")
    print(f"Saved: {blend_path}")


if __name__ == "__main__":
    main()
