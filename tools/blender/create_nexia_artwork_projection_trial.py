"""Prototype projecting Nexia's EXISTING artwork onto the EXISTING 3D mesh.

Three reference images are taken directly from REF_FRONT, REF_BACK, REF_RIGHT
in nexia_model.blend. Screen-left uses a mirrored right-side image because no
independent left-side reference exists.

Creates a separate .blend for review. The original mesh coordinates, topology,
modifiers and all original files are preserved. Material assignments change
ONLY inside the newly saved trial .blend.

Uses shader-based orthographic projection from four directions (front, back,
right, mirrored-right) blended by world-space surface normals. Pixel alpha is
automatically estimated by flood-removing the pale neutral image background;
this is a first-pass preview, not a final UV bake. The projection CANNOT
correct mismatched geometry or guarantee seamless textures.
"""
import argparse
import os
import sys
from array import array
from collections import deque

import bpy


SOURCE_COLLECTION = "TRIPO_CORRECTION"
EXPECTED_VERTICES = 749333
EXPECTED_SOURCE_REFERENCES = ("REF_FRONT", "REF_BACK", "REF_RIGHT")
MATERIAL_NAME = "NEXIA_ARTWORK_TRIPLANAR_PREVIEW"
IMAGE_PREFIX = "NEXIA_ARTWORK_MATTE_"


def parse_args():
    argv = sys.argv
    user = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--blend",
        default=os.path.join(
            "assets", "character", "3d", "nexia", "nexia_model.blend"
        ),
    )
    parser.add_argument(
        "--output",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_artwork_projection_trial.blend",
        ),
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Replace ONLY the projection trial file; never the input.",
    )
    return parser.parse_args(user)


def is_background(pixels, idx):
    i = idx * 4
    red, green, blue, alpha = pixels[i:i + 4]
    if alpha < 0.1:
        return True
    return (
        min(red, green, blue) >= 0.28
        and max(red, green, blue) - min(red, green, blue) < 0.13
    )


def matte_image(source, name):
    width, height = source.size
    if width < 128 or height < 256:
        raise RuntimeError(
            f"Reference '{source.name}' is unexpectedly small: "
            f"{width}x{height}"
        )
    pixel_count = width * height
    pixels = array("f", [0.0]) * (pixel_count * 4)
    source.pixels.foreach_get(pixels)

    background = bytearray(pixel_count)
    queue = deque()

    def push(index):
        if not background[index] and is_background(pixels, index):
            background[index] = 1
            queue.append(index)

    for x in range(width):
        push(x)
        push((height - 1) * width + x)
    for y in range(height):
        push(y * width)
        push(y * width + width - 1)

    while queue:
        i = queue.popleft()
        x = i % width
        y = i // width
        if x > 0:
            push(i - 1)
        if x + 1 < width:
            push(i + 1)
        if y > 0:
            push(i - width)
        if y + 1 < height:
            push(i + width)

    cleared = sum(background)
    if cleared < pixel_count * 0.08 or cleared > pixel_count * 0.93:
        raise RuntimeError(
            f"Unreliable background extraction for {source.name}: "
            f"{cleared}/{pixel_count} pixels. No trial saved."
        )

    # Remove small disconnected non-background artifacts (e.g. footer text).
    seen = bytearray(pixel_count)
    keep = bytearray(pixel_count)
    for start in range(pixel_count):
        if background[start] or seen[start]:
            continue
        seen[start] = 1
        parts = [start]
        queue.append(start)
        while queue:
            i = queue.popleft()
            x = i % width
            y = i // width
            adjacent = []
            if x > 0:
                adjacent.append(i - 1)
            if x + 1 < width:
                adjacent.append(i + 1)
            if y > 0:
                adjacent.append(i - width)
            if y + 1 < height:
                adjacent.append(i + width)
            for neighbor in adjacent:
                if not seen[neighbor] and not background[neighbor]:
                    seen[neighbor] = 1
                    parts.append(neighbor)
                    queue.append(neighbor)
        # Full-length armor and character remain; isolated labels are dropped.
        if len(parts) >= max(90, int(pixel_count * 0.0006)):
            for i in parts:
                keep[i] = 1

    surviving = sum(keep)
    if surviving < pixel_count * 0.045:
        raise RuntimeError(
            f"Foreground segmentation too small for {source.name}: "
            f"{surviving} pixels. No file saved."
        )
    for i in range(pixel_count):
        if not keep[i]:
            base = i * 4
            pixels[base] = 0.0
            pixels[base + 1] = 0.0
            pixels[base + 2] = 0.0
            pixels[base + 3] = 0.0

    new_image = bpy.data.images.new(
        name=name, width=width, height=height, alpha=True
    )
    new_image.pixels.foreach_set(pixels)
    new_image.update()
    new_image.pack()
    print(
        f"IMAGE_MATTE {source.name}: {width}x{height}, "
        f"removed={pixel_count-surviving}, "
        f"foreground={surviving}"
    )
    return new_image


def math_node(nodes, op, name):
    n = nodes.new("ShaderNodeMath")
    n.operation = op
    n.label = name
    return n


def connect_or_set(links, value, socket):
    if isinstance(value, (int, float)):
        socket.default_value = value
    else:
        links.new(value, socket)


def scalar(nodes, links, op, a, b, name):
    n = math_node(nodes, op, name)
    connect_or_set(links, a, n.inputs[0])
    connect_or_set(links, b, n.inputs[1])
    return n.outputs[0]


def vec(nodes, links, op, a, b, name):
    n = nodes.new("ShaderNodeVectorMath")
    n.operation = op
    n.label = name
    connect_or_set(links, a, n.inputs[0])
    connect_or_set(links, b, n.inputs[1])
    return n.outputs["Vector"]


def scale_vec(nodes, links, color, factor, name):
    n = nodes.new("ShaderNodeVectorMath")
    n.operation = "SCALE"
    n.label = name
    links.new(color, n.inputs["Vector"])
    connect_or_set(links, factor, n.inputs["Scale"])
    return n.outputs["Vector"]


def projector(nodes, links, position, normal, image, axis, sign,
              facing_axis, facing_sign, width_world, height_world, name):
    project_x = scalar(
        nodes, links, "MULTIPLY", position.outputs[axis], sign,
        f"{name}_UV_X_SIGN"
    )
    normalized_x = scalar(
        nodes, links, "DIVIDE", project_x, width_world,
        f"{name}_UV_X_WIDTH"
    )
    u = scalar(nodes, links, "ADD", normalized_x, 0.5,
               f"{name}_UV_U")
    v = scalar(nodes, links, "DIVIDE", position.outputs["Z"],
               height_world, f"{name}_UV_V")

    uv = nodes.new("ShaderNodeCombineXYZ")
    uv.label = f"{name}_UV"
    links.new(u, uv.inputs["X"])
    links.new(v, uv.inputs["Y"])

    texture = nodes.new("ShaderNodeTexImage")
    texture.label = f"{name}_REFERENCE"
    texture.image = image
    texture.extension = "CLIP"
    texture.interpolation = "Linear"
    links.new(uv.outputs["Vector"], texture.inputs["Vector"])

    signed_normal = scalar(
        nodes, links, "MULTIPLY", normal.outputs[facing_axis], facing_sign,
        f"{name}_FACING_SIGN"
    )
    positive_normal = scalar(
        nodes, links, "MAXIMUM", signed_normal, 0.0,
        f"{name}_FRONT_FACING_ONLY"
    )
    visibility = scalar(
        nodes, links, "POWER", positive_normal, 3.0,
        f"{name}_FACING_WEIGHT"
    )
    weight = scalar(
        nodes, links, "MULTIPLY", visibility, texture.outputs["Alpha"],
        f"{name}_ALPHA_WEIGHT"
    )
    return texture.outputs["Color"], weight


def material_from_references(images, dimensions):
    mat = bpy.data.materials.new(MATERIAL_NAME)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    geometry = nodes.new("ShaderNodeNewGeometry")
    p = nodes.new("ShaderNodeSeparateXYZ")
    n = nodes.new("ShaderNodeSeparateXYZ")
    links.new(geometry.outputs["Position"], p.inputs["Vector"])
    links.new(geometry.outputs["Normal"], n.inputs["Vector"])

    # Base dark blue covers holes or weakly illuminated UV regions.
    base = nodes.new("ShaderNodeRGB")
    base.label = "Uncovered blue fallback"
    base.outputs["Color"].default_value = (0.025, 0.040, 0.22, 1.0)
    total_rgb = scale_vec(
        nodes, links, base.outputs["Color"], 0.06, "FALLBACK_COLOR"
    )
    total_weight = 0.06

    faces = [
        ("FRONT", "REF_FRONT", "X", 1.0, "Y", -1.0),
        ("BACK", "REF_BACK", "X", -1.0, "Y", 1.0),
        ("RIGHT", "REF_RIGHT", "Y", 1.0, "X", 1.0),
        # No true LEFT view exists; mirror RIGHT as a temporary approximation.
        ("MIRRORED_LEFT", "REF_RIGHT", "Y", -1.0, "X", -1.0),
    ]
    for label, ref_name, axis, axis_sign, normal_axis, normal_sign in faces:
        img = images[ref_name]
        width_world, height_world = dimensions[ref_name]
        color, weight = projector(
            nodes, links, p, n, img, axis, axis_sign,
            normal_axis, normal_sign, width_world, height_world, label
        )
        colored = scale_vec(
            nodes, links, color, weight, label + "_COLOR_WEIGHTED"
        )
        total_rgb = vec(
            nodes, links, "ADD", total_rgb, colored, label + "_COLOR_SUM"
        )
        total_weight = scalar(
            nodes, links, "ADD", total_weight, weight,
            label + "_WEIGHT_SUM"
        )

    inverse = scalar(
        nodes, links, "DIVIDE", 1.0, total_weight, "NORMALIZE_IMAGE_WEIGHTS"
    )
    normalized = scale_vec(
        nodes, links, total_rgb, inverse, "NORMALIZED_MIXED_ARTWORK"
    )
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Roughness"].default_value = 0.65
    shader.inputs["Metallic"].default_value = 0.05
    links.new(normalized, shader.inputs["Base Color"])
    output = nodes.new("ShaderNodeOutputMaterial")
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return mat


def main():
    options = parse_args()
    source_path = os.path.abspath(options.blend)
    output_path = os.path.abspath(options.output)
    if source_path == output_path:
        raise RuntimeError("Never overwrite the original Nexia .blend.")
    if not os.path.isfile(source_path):
        raise FileNotFoundError(source_path)
    if os.path.exists(output_path) and not options.force:
        raise RuntimeError(
            f"Artwork projection trial exists: {output_path}. "
            "Pass -- --force only if you want to replace that trial."
        )

    bpy.ops.wm.open_mainfile(filepath=source_path)
    work = bpy.data.collections.get(SOURCE_COLLECTION)
    if work is None:
        raise RuntimeError("TRIPO_CORRECTION collection missing.")
    meshes = [obj for obj in work.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError("Expected exactly one Tripo correction mesh.")
    obj = meshes[0]
    if len(obj.data.vertices) != EXPECTED_VERTICES:
        raise RuntimeError(
            "Tripo vertex count changed. Stop rather than guess alignment."
        )

    images = {}
    dimensions = {}
    for name in EXPECTED_SOURCE_REFERENCES:
        ref = bpy.data.objects.get(name)
        if ref is None or ref.type != "EMPTY" or ref.data is None:
            raise RuntimeError(f"Missing or invalid image reference: {name}")
        if not hasattr(ref.data, "size"):
            raise RuntimeError(f"Reference {name} has no image dimensions.")
        image = ref.data
        width_px, height_px = image.size
        if width_px < 128 or height_px < 256:
            raise RuntimeError(f"Reference {name} has invalid size.")
        width_world = (
            ref.empty_display_size * float(width_px) / float(height_px)
        )
        height_world = ref.empty_display_size
        if not 1.8 < height_world < 2.2:
            raise RuntimeError(
                f"Reference {name} unexpectedly scaled: {height_world}"
            )
        dimensions[name] = (width_world, height_world)
        images[name] = matte_image(image, IMAGE_PREFIX + name)

    mat = material_from_references(images, dimensions)
    # Slot changes occur ONLY in this separate, newly saved copy.
    # Do not add procedural eyes from previous unsuccessful trials.
    if len(obj.material_slots) == 0:
        obj.data.materials.append(mat)
    else:
        for slot in obj.material_slots:
            slot.material = mat

    for name in (
        "AI_TRIPO_CANDIDATE", "AI_CANDIDATE", "BODY", "ARMOR", "RIG",
        "RENDER", "NEXIA_UPPER_ISLANDS", "NEXIA_EYE_GEOMETRY_TRIAL",
        "NEXIA_EYE_CONFORMAL_TRIAL", "NEXIA_EYE_PART_DIAGNOSTICS",
    ):
        col = bpy.data.collections.get(name)
        if col is not None:
            col.hide_viewport = True
    work.hide_viewport = False
    obj.hide_set(False)
    refs = bpy.data.collections.get("REFERENCE")
    if refs is not None:
        refs.hide_viewport = False

    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = None

    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type == "VIEW_3D":
            space = area.spaces.active
            space.shading.type = "MATERIAL"
            space.overlay.show_overlays = True
            space.shading.show_xray = False

    scene = bpy.context.scene
    scene["nexia_texture_trial"] = "NON_DESTRUCTIVE_ARTWORK_PROJECTION"
    scene["nexia_texture_trial_note"] = (
        "Front/back/right projections + mirrored right for missing left; "
        "texture-only preview, no geometrical fixes."
    )
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    old_backup = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=output_path)
    finally:
        bpy.context.preferences.filepaths.save_version = old_backup

    print("NEXIA_ARTWORK_PROJECTION_TRIAL_OK")
    print(f"Original source NOT saved: {source_path}")
    print(f"Separate trial saved: {output_path}")
    print("Reference source views: FRONT, BACK, RIGHT (+ mirrored RIGHT).")
    print("Images packed into the trial .blend for portability.")
    print("Shape unchanged; 2D artwork projection may have seams/distortion.")
    print("Compare front, right, back in Material Preview mode.")


if __name__ == "__main__":
    main()
