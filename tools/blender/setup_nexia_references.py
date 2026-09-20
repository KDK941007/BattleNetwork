import argparse
import math
import os
import sys
from array import array

import bpy
from mathutils import Matrix


REFERENCE_OBJECTS = ("REF_FRONT", "REF_BACK", "REF_LEFT", "REF_RIGHT")
REFERENCE_FILES = ("front.png", "back.png", "left.png")


def parse_args():
    argv = sys.argv
    user_args = argv[argv.index("--") + 1 :] if "--" in argv else []

    parser = argparse.ArgumentParser(
        description="Create front/back/left Nexia reference images and place them in Blender."
    )
    parser.add_argument(
        "--blend",
        default=os.path.join("assets", "character", "3d", "nexia", "nexia_model.blend"),
        help="Target .blend file.",
    )
    parser.add_argument(
        "--source",
        default=os.path.join("assets", "character", "ネクシア.png"),
        help="Source turnaround sheet. Expected order: front / back / left-side.",
    )
    parser.add_argument(
        "--reference-dir",
        default=os.path.join("assets", "character", "3d", "nexia", "reference"),
        help="Output directory for cropped reference PNGs.",
    )
    return parser.parse_args(user_args)


def abs_path(path):
    return os.path.abspath(path)


def foreground(r, g, b, a):
    if a < 0.10:
        return False

    avg = (r + g + b) / 3.0
    saturation = max(r, g, b) - min(r, g, b)

    # The supplied turnaround uses a light background and a strongly blue/dark character.
    return avg < 0.84 or saturation > 0.11


def detect_three_horizontal_subjects(image):
    width, height = image.size
    if width < 64 or height < 64:
        raise RuntimeError(f"Source image is too small: {width}x{height}")

    pixels = array("f", [0.0]) * (width * height * 4)
    image.pixels.foreach_get(pixels)

    x_step = max(1, width // 600)
    y_step = max(1, height // 450)

    sampled_rows = max(1, math.ceil(height / y_step))
    min_active_per_column = max(4, int(sampled_rows * 0.035))

    sampled_columns = []
    for x in range(0, width, x_step):
        count = 0
        for y in range(0, height, y_step):
            idx = (y * width + x) * 4
            if foreground(
                pixels[idx],
                pixels[idx + 1],
                pixels[idx + 2],
                pixels[idx + 3],
            ):
                count += 1
        sampled_columns.append((x, count))

    active_x = [x for x, count in sampled_columns if count >= min_active_per_column]
    if not active_x:
        raise RuntimeError("No foreground subject could be detected in the source image.")

    max_gap = max(x_step * 3, int(width * 0.025))
    runs = []
    start = active_x[0]
    previous = active_x[0]

    for x in active_x[1:]:
        if x - previous > max_gap:
            runs.append((start, previous))
            start = x
        previous = x
    runs.append((start, previous))

    # Score each run by sampled foreground pixels.
    scored = []
    for x0, x1 in runs:
        score = sum(count for x, count in sampled_columns if x0 <= x <= x1)
        span = x1 - x0 + x_step
        if span >= width * 0.07:
            scored.append((score, x0, x1))

    if len(scored) < 3:
        raise RuntimeError(
            "Expected three horizontal character views, but fewer than three were detected. "
            "Use the turnaround sheet with front / back / left-side arranged left-to-right."
        )

    selected = sorted(scored, reverse=True)[:3]
    selected = sorted([(x0, x1) for _, x0, x1 in selected], key=lambda pair: pair[0])

    # Reject implausible layouts instead of guessing.
    centers = [((x0 + x1) / 2.0) for x0, x1 in selected]
    if not (centers[0] < centers[1] < centers[2]):
        raise RuntimeError("Detected subjects are not ordered left-to-right as expected.")

    # Find a common vertical extent so the three crops preserve the same joint heights.
    y_min = height
    y_max = -1

    for x0, x1 in selected:
        for y in range(0, height, y_step):
            row_has_foreground = False
            for x in range(max(0, x0), min(width, x1 + x_step), x_step):
                idx = (y * width + x) * 4
                if foreground(
                    pixels[idx],
                    pixels[idx + 1],
                    pixels[idx + 2],
                    pixels[idx + 3],
                ):
                    row_has_foreground = True
                    break
            if row_has_foreground:
                y_min = min(y_min, y)
                y_max = max(y_max, y)

    if y_max < y_min:
        raise RuntimeError("Could not determine common vertical subject bounds.")

    y_padding = max(4, int(height * 0.02))
    y_min = max(0, y_min - y_padding)
    y_max = min(height - 1, y_max + y_padding)

    max_subject_width = max(x1 - x0 + 1 for x0, x1 in selected)
    x_padding = max(6, int(width * 0.02))
    crop_width = max_subject_width + 2 * x_padding

    crops = []
    for x0, x1 in selected:
        center = (x0 + x1) / 2.0
        crop_x0 = int(round(center - crop_width / 2.0))
        crop_x1 = crop_x0 + crop_width - 1

        if crop_x0 < 0:
            crop_x1 -= crop_x0
            crop_x0 = 0
        if crop_x1 >= width:
            shift = crop_x1 - (width - 1)
            crop_x0 -= shift
            crop_x1 -= shift

        crop_x0 = max(0, crop_x0)
        crop_x1 = min(width - 1, crop_x1)

        crops.append((crop_x0, y_min, crop_x1, y_max))

    return pixels, width, height, crops


def save_crop(source_pixels, source_width, box, output_path):
    x0, y0, x1, y1 = box
    crop_width = x1 - x0 + 1
    crop_height = y1 - y0 + 1

    crop_pixels = array("f", [0.0]) * (crop_width * crop_height * 4)

    for dst_y, src_y in enumerate(range(y0, y1 + 1)):
        src_start = (src_y * source_width + x0) * 4
        src_end = src_start + crop_width * 4
        dst_start = dst_y * crop_width * 4
        crop_pixels[dst_start : dst_start + crop_width * 4] = source_pixels[src_start:src_end]

    image_name = "NEXIA_REF_" + os.path.splitext(os.path.basename(output_path))[0].upper()
    crop_image = bpy.data.images.new(
        image_name,
        width=crop_width,
        height=crop_height,
        alpha=True,
    )
    crop_image.pixels.foreach_set(crop_pixels)
    crop_image.filepath_raw = output_path
    crop_image.file_format = "PNG"
    crop_image.save()

    return output_path


def ensure_reference_collection():
    collection = bpy.data.collections.get("REFERENCE")
    if collection is None:
        collection = bpy.data.collections.new("REFERENCE")
        bpy.context.scene.collection.children.link(collection)
    return collection


def clear_previous_reference_objects(collection):
    for name in REFERENCE_OBJECTS:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)

    for obj in list(collection.objects):
        if obj.name.startswith("REF_"):
            bpy.data.objects.remove(obj, do_unlink=True)


def make_transform(basis_x, basis_y, basis_z, location):
    matrix = Matrix.Identity(4)

    matrix[0][0], matrix[1][0], matrix[2][0] = basis_x
    matrix[0][1], matrix[1][1], matrix[2][1] = basis_y
    matrix[0][2], matrix[1][2], matrix[2][2] = basis_z
    matrix.translation = location

    return matrix


def add_reference_image(collection, name, filepath, matrix_world):
    # Use Blender's Data API so this also works in --background mode, where
    # bpy.ops.object.empty_image_add() has no VIEW_3D context and its poll fails.
    image = bpy.data.images.load(filepath, check_existing=False)

    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "IMAGE"
    obj.data = image
    obj.empty_display_size = 2.0
    obj.empty_image_offset = (-0.5, 0.0)
    obj.empty_image_depth = "BACK"
    obj.empty_image_side = "FRONT"
    obj.use_empty_image_alpha = True
    obj.color = (1.0, 1.0, 1.0, 0.42)
    obj.matrix_world = matrix_world

    collection.objects.link(obj)
    bpy.context.view_layer.update()

    return obj


def main():
    args = parse_args()

    blend_path = abs_path(args.blend)
    source_path = abs_path(args.source)
    reference_dir = abs_path(args.reference_dir)

    if not os.path.isfile(blend_path):
        raise FileNotFoundError(f"Blend file not found: {blend_path}")
    if not os.path.isfile(source_path):
        raise FileNotFoundError(f"Reference source not found: {source_path}")

    bpy.ops.wm.open_mainfile(filepath=blend_path)

    source_image = bpy.data.images.load(source_path, check_existing=False)
    source_pixels, source_width, source_height, boxes = detect_three_horizontal_subjects(
        source_image
    )

    os.makedirs(reference_dir, exist_ok=True)

    output_paths = []
    for filename, box in zip(REFERENCE_FILES, boxes):
        output_path = os.path.join(reference_dir, filename)
        output_paths.append(
            save_crop(source_pixels, source_width, box, output_path)
        )

    stale_right_path = os.path.join(reference_dir, "right.png")
    if os.path.isfile(stale_right_path):
        os.remove(stale_right_path)

    reference_collection = ensure_reference_collection()
    clear_previous_reference_objects(reference_collection)

    # Character coordinate convention from setup_nexia_project.py:
    # +Z = up, +X = character right, -Y = character front.
    # Each image uses the same crop height/width and bottom-center origin.
    front_matrix = make_transform(
        basis_x=(1.0, 0.0, 0.0),
        basis_y=(0.0, 0.0, 1.0),
        basis_z=(0.0, -1.0, 0.0),
        location=(0.0, 0.05, 0.0),
    )
    back_matrix = make_transform(
        basis_x=(-1.0, 0.0, 0.0),
        basis_y=(0.0, 0.0, 1.0),
        basis_z=(0.0, 1.0, 0.0),
        location=(0.0, -0.05, 0.0),
    )
    left_matrix = make_transform(
        basis_x=(0.0, 1.0, 0.0),
        basis_y=(0.0, 0.0, 1.0),
        basis_z=(1.0, 0.0, 0.0),
        location=(-0.05, 0.0, 0.0),
    )

    add_reference_image(reference_collection, "REF_FRONT", output_paths[0], front_matrix)
    add_reference_image(reference_collection, "REF_BACK", output_paths[1], back_matrix)
    add_reference_image(reference_collection, "REF_LEFT", output_paths[2], left_matrix)

    scene = bpy.context.scene
    scene["nexia_reference_source"] = bpy.path.relpath(source_path)
    scene["nexia_reference_order"] = "front/back/left-side"
    scene["nexia_reference_alignment"] = "common_crop_height_and_bottom_origin"
    scene["nexia_reference_absolute_height"] = "UNSPECIFIED"

    previous_save_version = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    finally:
        bpy.context.preferences.filepaths.save_version = previous_save_version

    print("NEXIA_REFERENCE_SETUP_OK")
    print(f"Source: {source_path}")
    print(f"Source size: {source_width}x{source_height}")
    print(f"Detected boxes: {boxes}")
    print(f"Reference directory: {reference_dir}")
    print("Objects: REF_FRONT / REF_BACK / REF_LEFT")
    print(f"Saved: {blend_path}")


if __name__ == "__main__":
    main()
