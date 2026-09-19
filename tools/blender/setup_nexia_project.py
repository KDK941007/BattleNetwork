import argparse
import os
import sys

import bpy


COLLECTION_NAMES = ("REFERENCE", "BODY", "ARMOR", "RIG", "RENDER")


def parse_args():
    argv = sys.argv
    user_args = argv[argv.index("--") + 1 :] if "--" in argv else []

    parser = argparse.ArgumentParser(
        description="Create the base Blender project for Nexia modeling."
    )
    parser.add_argument(
        "--output",
        default=os.path.join("assets", "character", "3d", "nexia", "nexia_model.blend"),
        help="Output .blend path. Relative paths are resolved from the current working directory.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Allow overwriting an existing .blend file.",
    )
    return parser.parse_args(user_args)


def remove_all_objects():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.armatures,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.images,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def clear_child_collections():
    scene_collection = bpy.context.scene.collection
    for collection in list(scene_collection.children):
        scene_collection.children.unlink(collection)
        if collection.users == 0:
            bpy.data.collections.remove(collection)


def create_collections():
    scene_collection = bpy.context.scene.collection
    for name in COLLECTION_NAMES:
        collection = bpy.data.collections.new(name)
        scene_collection.children.link(collection)


def configure_scene():
    scene = bpy.context.scene

    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"

    scene["nexia_project"] = True
    scene["nexia_blender_version"] = bpy.app.version_string
    scene["nexia_up_axis"] = "+Z"
    scene["nexia_right_axis"] = "+X"
    scene["nexia_front_axis"] = "-Y"
    scene["nexia_origin_rule"] = "feet_center_at_world_origin"
    scene["nexia_absolute_character_height"] = "UNSPECIFIED"

    # Modeling convention:
    # +Z = up, +X = character right, -Y = character front.
    scene.cursor.location = (0.0, 0.0, 0.0)


def save_project(output_path, force):
    output_path = os.path.abspath(output_path)

    if os.path.exists(output_path) and not force:
        raise FileExistsError(
            f"Output already exists: {output_path}\n"
            "Use --force only when overwriting is intentional."
        )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=output_path)
    return output_path


def main():
    args = parse_args()

    remove_all_objects()
    clear_child_collections()
    create_collections()
    configure_scene()

    output_path = save_project(args.output, args.force)

    print("NEXIA_PROJECT_SETUP_OK")
    print(f"Blender: {bpy.app.version_string}")
    print("Axes: +Z up / +X character-right / -Y front")
    print("Origin rule: feet center at world origin")
    print(f"Collections: {', '.join(COLLECTION_NAMES)}")
    print(f"Saved: {output_path}")


if __name__ == "__main__":
    main()
