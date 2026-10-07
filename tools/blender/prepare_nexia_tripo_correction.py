import argparse
import os
import sys

import bpy


SOURCE_COLLECTION = "AI_TRIPO_CANDIDATE"
WORK_COLLECTION = "TRIPO_CORRECTION"
WORK_PREFIX = "CORR_"
WORK_MARKER = "nexia_tripo_correction"


def parse_args():
    argv = sys.argv
    user_args = argv[argv.index("--") + 1:] if "--" in argv else []

    parser = argparse.ArgumentParser(
        description=(
            "Create a non-destructive Nexia Tripo correction workspace while "
            "preserving the imported AI_TRIPO_CANDIDATE source."
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
        "--force",
        action="store_true",
        help=(
            "Replace an existing TRIPO_CORRECTION workspace. "
            "The AI_TRIPO_CANDIDATE source is never deleted."
        ),
    )
    return parser.parse_args(user_args)


def abs_path(path):
    return os.path.abspath(path)


def require_collection(name):
    collection = bpy.data.collections.get(name)
    if collection is None:
        raise RuntimeError(f"Required collection is missing: {name}")
    return collection


def require_reference(name):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f"Required reference is missing: {name}")
    return obj


def remove_work_collection():
    collection = bpy.data.collections.get(WORK_COLLECTION)
    if collection is None:
        return

    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    bpy.data.collections.remove(collection)

    for mesh in list(bpy.data.meshes):
        if mesh.get(WORK_MARKER) and mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def duplicate_source_collection(source):
    work = bpy.data.collections.new(WORK_COLLECTION)
    bpy.context.scene.collection.children.link(work)

    source_objects = list(source.objects)
    if not source_objects:
        raise RuntimeError(f"{SOURCE_COLLECTION} does not contain any objects.")

    duplicate_by_source = {}
    source_world = {}

    for obj in source_objects:
        source_world[obj] = obj.matrix_world.copy()

        dup = obj.copy()
        dup.name = WORK_PREFIX + obj.name
        dup[WORK_MARKER] = True

        if obj.data is not None:
            try:
                dup.data = obj.data.copy()
                dup.data[WORK_MARKER] = True
            except (AttributeError, TypeError):
                pass

        work.objects.link(dup)
        duplicate_by_source[obj] = dup

    for src, dup in duplicate_by_source.items():
        if src.parent in duplicate_by_source:
            dup.parent = duplicate_by_source[src.parent]
        else:
            dup.parent = None
        dup.matrix_world = source_world[src]

    return work, duplicate_by_source


def configure_visibility(work):
    reference = require_collection("REFERENCE")
    reference.hide_viewport = False
    reference.hide_render = False
    work.hide_viewport = False
    work.hide_render = False

    source = require_collection(SOURCE_COLLECTION)
    source.hide_viewport = True
    source.hide_render = True

    for name in ("AI_CANDIDATE", "BODY", "ARMOR", "RIG", "RENDER"):
        collection = bpy.data.collections.get(name)
        if collection is not None:
            collection.hide_viewport = True
            collection.hide_render = True


def select_work_mesh(duplicate_by_source):
    bpy.ops.object.select_all(action="DESELECT")
    selected = None

    for dup in duplicate_by_source.values():
        if dup.type == "MESH":
            dup.hide_set(False)
            dup.select_set(True)
            if selected is None:
                selected = dup

    if selected is None:
        raise RuntimeError("TRIPO_CORRECTION does not contain a mesh object.")

    bpy.context.view_layer.objects.active = selected
    return selected


def main():
    args = parse_args()
    blend_path = abs_path(args.blend)

    if not os.path.isfile(blend_path):
        raise FileNotFoundError(f"Blend file not found: {blend_path}")

    bpy.ops.wm.open_mainfile(filepath=blend_path)

    require_reference("REF_FRONT")
    require_reference("REF_BACK")
    require_reference("REF_LEFT")
    source = require_collection(SOURCE_COLLECTION)

    existing = bpy.data.collections.get(WORK_COLLECTION)
    if existing is not None:
        if not args.force:
            raise RuntimeError(
                f"{WORK_COLLECTION} already exists. "
                "Use -- --force only when you intentionally want to rebuild "
                "the correction workspace from the untouched Tripo source."
            )
        remove_work_collection()

    work, duplicates = duplicate_source_collection(source)
    configure_visibility(work)
    active_mesh = select_work_mesh(duplicates)

    scene = bpy.context.scene
    scene["nexia_formal_3d_base"] = "TRIPO_H3.1_MULTIVIEW"
    scene["nexia_tripo_correction_collection"] = WORK_COLLECTION
    scene["nexia_tripo_correction_status"] = "HEAD_FACE_MASK_PENDING"
    scene["nexia_tripo_source_preserved"] = True

    previous_save_version = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    finally:
        bpy.context.preferences.filepaths.save_version = previous_save_version

    print("NEXIA_TRIPO_CORRECTION_WORKSPACE_OK")
    print(f"Source preserved: {SOURCE_COLLECTION}")
    print(f"Working collection: {WORK_COLLECTION}")
    print(f"Active mesh: {active_mesh.name}")
    print("References: REF_FRONT / REF_BACK / REF_LEFT")
    print("Next step: correct head / face / mask only; do not edit other body regions yet.")
    print(f"Saved: {blend_path}")


if __name__ == "__main__":
    main()
