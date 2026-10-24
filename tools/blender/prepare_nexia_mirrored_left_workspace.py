"""Prepare Nexia's approved mirrored-LEFT reference without changing the source.

The user explicitly chose mirroring RIGHT instead of illustrating an independent
LEFT view. This script creates reference/left.png and adds REF_LEFT in a NEW
Blender workspace. The original nexia_model.blend is not saved or overwritten.

Run (repository root):
  blender --background --python tools/blender/prepare_nexia_mirrored_left_workspace.py

Result:
  assets/character/3d/nexia/reference/left.png
  assets/character/3d/nexia/nexia_four_view_workspace.blend
"""
import argparse
import os
import sys
from array import array

import bpy
from mathutils import Matrix


def parse_args():
    argv = sys.argv
    args = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--blend",
        default=os.path.join(
            "assets", "character", "3d", "nexia", "nexia_model.blend"
        ),
    )
    parser.add_argument(
        "--right",
        default=os.path.join(
            "assets", "character", "3d", "nexia", "reference", "right.png"
        ),
    )
    parser.add_argument(
        "--left",
        default=os.path.join(
            "assets", "character", "3d", "nexia", "reference", "left.png"
        ),
    )
    parser.add_argument(
        "--output",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_four_view_workspace.blend"
        ),
    )
    return parser.parse_args(args)


def fail_if_collision(blend, right, left, output):
    # Do not overwrite pre-existing approved art or Blender work.
    if os.path.abspath(blend) == os.path.abspath(output):
        raise RuntimeError("Output must be different from the original .blend.")
    if os.path.abspath(right) == os.path.abspath(left):
        raise RuntimeError("LEFT image must not overwrite RIGHT.")
    for name, path in (("source .blend", blend), ("RIGHT PNG", right)):
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Missing {name}: {path}")
    for name, path in (("LEFT PNG", left), ("four-view workspace", output)):
        if os.path.exists(path):
            raise RuntimeError(
                f"{name} already exists: {path}. Nothing was overwritten. "
                "Review/rename the existing file before retrying."
            )


def flip_horizontal(right_path, left_path):
    image = bpy.data.images.load(right_path, check_existing=False)
    width, height = image.size
    if width < 32 or height < 32:
        raise RuntimeError(f"Invalid RIGHT reference dimensions: {width}x{height}")

    pixels = array("f", [0.0]) * (width * height * 4)
    image.pixels.foreach_get(pixels)
    mirrored = array("f", [0.0]) * len(pixels)

    for y in range(height):
        row = y * width * 4
        for x in range(width):
            source = row + (width - 1 - x) * 4
            target = row + x * 4
            mirrored[target:target + 4] = pixels[source:source + 4]

    # Pixel-level check before any file is written.
    for y in (0, height // 2, height - 1):
        for x in (0, width // 2, width - 1):
            out = (y * width + x) * 4
            src = (y * width + (width - 1 - x)) * 4
            if mirrored[out:out + 4] != pixels[src:src + 4]:
                raise RuntimeError("Horizontal mirroring integrity check failed.")

    left_image = bpy.data.images.new(
        "NEXIA_REF_LEFT_FROM_RIGHT_MIRROR",
        width=width, height=height, alpha=True
    )
    left_image.pixels.foreach_set(mirrored)
    left_image.filepath_raw = left_path
    left_image.file_format = "PNG"
    left_image.save()
    return width, height


def left_matrix():
    # Existing RIGHT (from setup_nexia_references.py):
    # basis_x=(0,+1,0), basis_y=(0,0,+1), basis_z=(+1,0,0),
    # location=(-0.05,0,0).
    # The LEFT viewpoint uses opposite X normal and reverses the image
    # horizontal world axis. The PNG itself was flipped horizontally above.
    matrix = Matrix.Identity(4)
    columns = (
        (0.0, -1.0, 0.0),  # image horizontal
        (0.0, 0.0, 1.0),   # image vertical
        (-1.0, 0.0, 0.0),  # towards viewer on LEFT
    )
    for column, values in enumerate(columns):
        for row, val in enumerate(values):
            matrix[row][column] = val
    matrix.translation = (0.05, 0.0, 0.0)
    return matrix


def main():
    opts = parse_args()
    blend = os.path.abspath(opts.blend)
    right = os.path.abspath(opts.right)
    left = os.path.abspath(opts.left)
    output = os.path.abspath(opts.output)
    fail_if_collision(blend, right, left, output)

    bpy.ops.wm.open_mainfile(filepath=blend)

    reference = bpy.data.collections.get("REFERENCE")
    right_ref = bpy.data.objects.get("REF_RIGHT")
    if reference is None or right_ref is None:
        raise RuntimeError("Existing REFERENCE/REF_RIGHT was not found.")
    if right_ref.type != "EMPTY" or not hasattr(right_ref.data, "size"):
        raise RuntimeError("Existing REF_RIGHT is not a valid image reference.")
    if bpy.data.objects.get("REF_LEFT") is not None:
        raise RuntimeError("REF_LEFT already exists; refusing to replace it.")
    for name in ("REF_FRONT", "REF_BACK"):
        if bpy.data.objects.get(name) is None:
            raise RuntimeError(f"Required existing reference missing: {name}")

    dims = flip_horizontal(right, left)
    img = bpy.data.images.load(left, check_existing=False)
    if tuple(img.size) != tuple(dims):
        raise RuntimeError("Saved LEFT PNG dimensions differ from RIGHT.")

    obj = bpy.data.objects.new("REF_LEFT", None)
    obj.empty_display_type = "IMAGE"
    obj.data = img
    obj.empty_display_size = right_ref.empty_display_size
    obj.empty_image_offset = (-0.5, 0.0)
    obj.empty_image_depth = "BACK"
    obj.empty_image_side = "FRONT"
    obj.use_empty_image_alpha = True
    obj.color = (1.0, 1.0, 1.0, 0.42)
    obj.matrix_world = left_matrix()
    reference.objects.link(obj)

    bpy.context.scene["nexia_left_reference_source"] = "MIRRORED_REF_RIGHT"
    bpy.context.scene["nexia_left_reference_user_approved"] = True
    bpy.context.scene["nexia_reference_views"] = "FRONT_BACK_RIGHT_LEFT_MIRRORED"

    previous_save_version = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=output)
    finally:
        bpy.context.preferences.filepaths.save_version = previous_save_version

    print("NEXIA_MIRRORED_LEFT_WORKSPACE_OK")
    print(f"Original .blend NOT saved: {blend}")
    print(f"RIGHT source unchanged: {right}")
    print(f"LEFT mirrored reference ({dims[0]}x{dims[1]}): {left}")
    print(f"Four-view workspace saved: {output}")
    print("Objects: REF_FRONT / REF_BACK / REF_RIGHT / REF_LEFT")
    print("No original model vertices, polygons or materials were edited.")


if __name__ == "__main__":
    main()
