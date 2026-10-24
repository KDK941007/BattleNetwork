"""Four-view HEAD-ONLY illustration alignment trial (non-destructive).

The previous whole-body projection used one world-to-artwork transform for
every body part. This script creates a SEPARATE .blend, derives independent
front/back/right/left head mapping from upper-head silhouette measurements,
and projects the original illustrations onto the head area only.

IMPORTANT: The aligned head silhouettes are a starting point, not proof that
every eye/visor/ear landmark coincides. No original vertices or UVs are edited.
If eye/visor detail is still wrong after one correction, manual UV work or
head remodeling must replace automatic reprojection.

Source: nexia_four_view_workspace.blend (REF_LEFT mirrors REF_RIGHT by choice)
Output: nexia_head_alignment_trial.blend
"""
import argparse
import importlib.util
import os
import sys
from array import array
from collections import defaultdict

import bpy
from mathutils import Vector


WORK = "TRIPO_CORRECTION"
EXPECTED_VERTICES = 749333
REFS = ("REF_FRONT", "REF_BACK", "REF_RIGHT", "REF_LEFT")
VIEWS = (
    ("FRONT", "REF_FRONT", "X", +1.0, "Y", -1.0),
    ("BACK", "REF_BACK", "X", -1.0, "Y", +1.0),
    ("RIGHT", "REF_RIGHT", "Y", +1.0, "X", +1.0),
    ("LEFT", "REF_LEFT", "Y", -1.0, "X", -1.0),
)
# Upper-head band excludes shoulders and most jaw contours. Only used for
# coarse registration, NOT for precise manual landmarks.
BAND_BOTTOM = 1.76
BAND_TOP = 1.89
SILHOUETTE_MARGIN = 0.015
HEAD_MASK_LOW = 1.50
HEAD_MASK_HIGH = 1.56


def parse_args():
    argv = sys.argv
    values = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--blend",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_four_view_workspace.blend",
        ),
    )
    parser.add_argument(
        "--output",
        default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_head_alignment_trial.blend",
        ),
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Replace only the separate output trial, NEVER the input.",
    )
    return parser.parse_args(values)


def quantiles(samples):
    if len(samples) < 60:
        raise RuntimeError(f"Insufficient head samples: {len(samples)}")
    samples.sort()
    n = len(samples) - 1
    return (
        samples[round(n * 0.025)],
        samples[round(n * 0.975)],
    )


def is_blue_armor(r, g, b, a):
    # The user's original Nexia artwork is saturated navy and cyan;
    # background/annotation gray is nearly neutral, so exclude it.
    return (
        a > 0.45
        and b > 0.10
        and b > r + 0.045
        and b >= g * 0.78
        and max(r, g, b) - min(r, g, b) > 0.06
    )


def reference_head_measure(ref):
    img = ref.data
    width, height = img.size
    if width < 128 or height < 256:
        raise RuntimeError(f"Invalid reference size: {ref.name}: {width}x{height}")
    pixel_values = array("f", [0.0]) * (width * height * 4)
    img.pixels.foreach_get(pixel_values)
    world_height = ref.empty_display_size
    world_width = world_height * width / height
    rows_from = max(0, int(BAND_BOTTOM / world_height * height))
    rows_to = min(height, int(BAND_TOP / world_height * height) + 1)
    horizontal = []
    for y in range(rows_from, rows_to):
        for x in range(width):
            i = (y * width + x) * 4
            if is_blue_armor(*pixel_values[i:i + 4]):
                u = ((x + 0.5) / width - 0.5) * world_width
                horizontal.append(u)

    minimum, maximum = quantiles(horizontal)
    if not 0.19 <= maximum - minimum <= 0.72:
        raise RuntimeError(
            f"Implausible image head width in {ref.name}: "
            f"{maximum - minimum:.3f}m, samples={len(horizontal)}"
        )
    return minimum, maximum, world_width, world_height, len(horizontal)


def model_head_measure(obj):
    # Restrict to HEAD-area high-Z cross section, not the whole-body bounds.
    model_values = {"X": [], "Y": []}
    matrix = obj.matrix_world
    max_top_z = -1e9
    for vert in obj.data.vertices:
        p = matrix @ vert.co
        if abs(p.x) <= 0.37 and abs(p.y) <= 0.34 and 1.48 <= p.z <= 2.08:
            max_top_z = max(max_top_z, p.z)
        if not (BAND_BOTTOM <= p.z <= BAND_TOP):
            continue
        if abs(p.x) > 0.36 or abs(p.y) > 0.34:
            continue
        model_values["X"].append(p.x)
        model_values["Y"].append(p.y)

    if not (1.85 < max_top_z < 2.10):
        raise RuntimeError(f"Unexpected source head top z={max_top_z:.4f}")
    bounds = {axis: quantiles(values) for axis, values in model_values.items()}
    if not 0.26 <= bounds["X"][1] - bounds["X"][0] <= 0.85:
        raise RuntimeError(f"Implausible model head width: {bounds['X']}")
    if not 0.25 <= bounds["Y"][1] - bounds["Y"][0] <= 0.78:
        raise RuntimeError(f"Implausible model head depth: {bounds['Y']}")
    return bounds


def build_calibration(source, references):
    bounds = model_head_measure(source)
    result = {}
    for label, ref_name, axis, sign, _, _ in VIEWS:
        ref = references[ref_name]
        lo_img, hi_img, width, height, count = reference_head_measure(ref)
        lo_m, hi_m = bounds[axis]
        if sign < 0:
            lo_m, hi_m = -hi_m, -lo_m
        model_width = hi_m - lo_m
        image_width = hi_img - lo_img
        scale = image_width / model_width
        shift = (lo_img + hi_img) / 2 - scale * (lo_m + hi_m) / 2
        if not (0.70 <= scale <= 1.45) or abs(shift) > 0.16:
            raise RuntimeError(
                f"Implausible {label} head calibration: "
                f"scale={scale:.3f} shift={shift:.3f}. "
                "Do not guess a mapping."
            )
        result[label] = {
            "image": ref_name,
            "axis": axis,
            "sign": sign,
            "width": width,
            "height": height,
            "scale": scale,
            "shift": shift,
            "samples": count,
            "model": (lo_m, hi_m),
            "reference": (lo_img, hi_img),
        }
    return result


def load_original_projection_module():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    module_path = os.path.join(
        script_dir, "create_nexia_artwork_projection_trial.py"
    )
    spec = importlib.util.spec_from_file_location(
        "nexia_original_projector", module_path
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to import the previous image matte helper.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def calibrated_projector(helper, nodes, links, p, n, image, calibration,
                         normal_axis, normal_sign, label):
    axis = calibration["axis"]
    sign = calibration["sign"]
    width = calibration["width"]
    height = calibration["height"]
    scale = calibration["scale"]
    shift = calibration["shift"]

    oriented = helper.scalar(nodes, links, "MULTIPLY", p.outputs[axis], sign,
                             label + "_MODEL_DIRECTION")
    zoomed = helper.scalar(nodes, links, "MULTIPLY", oriented, scale,
                           label + "_HEAD_STRETCH")
    translated = helper.scalar(nodes, links, "ADD", zoomed, shift,
                               label + "_HEAD_CENTER")
    u = helper.scalar(nodes, links, "DIVIDE", translated, width,
                      label + "_U_SCALE")
    u = helper.scalar(nodes, links, "ADD", u, 0.5, label + "_U_OFFSET")
    v = helper.scalar(nodes, links, "DIVIDE", p.outputs["Z"], height,
                      label + "_V")

    coord = nodes.new("ShaderNodeCombineXYZ")
    coord.label = label + "_HEAD_UV"
    links.new(u, coord.inputs["X"])
    links.new(v, coord.inputs["Y"])

    tex = nodes.new("ShaderNodeTexImage")
    tex.label = label + "_ARTWORK"
    tex.image = image
    tex.extension = "CLIP"
    tex.interpolation = "Linear"
    links.new(coord.outputs["Vector"], tex.inputs["Vector"])

    oriented_normal = helper.scalar(
        nodes, links, "MULTIPLY", n.outputs[normal_axis], normal_sign,
        label + "_FACE_DIRECTION"
    )
    visible = helper.scalar(nodes, links, "MAXIMUM", oriented_normal, 0.0,
                            label + "_FRONT_ONLY")
    visible = helper.scalar(nodes, links, "POWER", visible, 4.0,
                            label + "_DIRECTION_PRIORITY")
    weight = helper.scalar(nodes, links, "MULTIPLY",
                           visible, tex.outputs["Alpha"],
                           label + "_VISIBLE_WEIGHT")
    return tex.outputs["Color"], weight


def build_head_material(helper, images, calibrations):
    mat = bpy.data.materials.new("NEXIA_HEAD_CALIBRATED_4VIEW_TRIAL")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    geom = nodes.new("ShaderNodeNewGeometry")
    pos = nodes.new("ShaderNodeSeparateXYZ")
    norm = nodes.new("ShaderNodeSeparateXYZ")
    links.new(geom.outputs["Position"], pos.inputs[0])
    links.new(geom.outputs["Normal"], norm.inputs[0])

    empty_blue = nodes.new("ShaderNodeRGB")
    empty_blue.outputs[0].default_value = (0.025, 0.043, 0.20, 1.0)
    total_color = helper.scale_vec(
        nodes, links, empty_blue.outputs["Color"], 0.045, "BLUE_FALLBACK"
    )
    total_weight = 0.045
    for label, ref_name, _axis, _sign, normal_axis, normal_sign in VIEWS:
        color, weight = calibrated_projector(
            helper, nodes, links, pos, norm, images[ref_name],
            calibrations[label], normal_axis, normal_sign, label
        )
        weighted_color = helper.scale_vec(
            nodes, links, color, weight, label + "_WEIGHTED_COLOR"
        )
        total_color = helper.vec(
            nodes, links, "ADD", total_color, weighted_color,
            label + "_ADD_COLOR"
        )
        total_weight = helper.scalar(
            nodes, links, "ADD", total_weight, weight, label + "_ADD_WEIGHT"
        )
    inverse = helper.scalar(
        nodes, links, "DIVIDE", 1.0, total_weight, "NORMALIZE_WEIGHT"
    )
    calibrated_rgb = helper.scale_vec(
        nodes, links, total_color, inverse, "CALIBRATED_HEAD_RGB"
    )

    # The correction model is one mesh; the shader limits the recolor to
    # a head-height band WITHOUT assigning/changing any source polygons.
    head_height = helper.scalar(
        nodes, links, "SUBTRACT", pos.outputs["Z"], HEAD_MASK_LOW,
        "HEAD_HEIGHT_OFFSET"
    )
    t = helper.scalar(
        nodes, links, "DIVIDE", head_height,
        HEAD_MASK_HIGH - HEAD_MASK_LOW,
        "HEAD_HEIGHT_NORMALIZE"
    )
    clamped = helper.math_node(nodes, "MULTIPLY_ADD", "HEAD_MASK_CLAMP")
    links.new(t, clamped.inputs[0])
    clamped.inputs[1].default_value = 1.0
    clamped.inputs[2].default_value = 0.0
    mask_min = helper.scalar(
        nodes, links, "MAXIMUM", clamped.outputs[0], 0.0,
        "HEAD_MASK_MIN"
    )
    head_mask = helper.scalar(
        nodes, links, "MINIMUM", mask_min, 1.0,
        "HEAD_MASK_MAX"
    )

    gray = nodes.new("ShaderNodeRGB")
    gray.outputs["Color"].default_value = (0.28, 0.28, 0.28, 1.0)
    mixer = nodes.new("ShaderNodeMixRGB")
    mixer.blend_type = "MIX"
    links.new(head_mask, mixer.inputs[0])
    links.new(gray.outputs["Color"], mixer.inputs[1])
    links.new(calibrated_rgb, mixer.inputs[2])

    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.62
    links.new(mixer.outputs["Color"], bsdf.inputs["Base Color"])
    output = nodes.new("ShaderNodeOutputMaterial")
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return mat


def main():
    opts = parse_args()
    src = os.path.abspath(opts.blend)
    out = os.path.abspath(opts.output)
    if src == out:
        raise RuntimeError("Refusing to overwrite source 4-view workspace.")
    if not os.path.isfile(src):
        raise FileNotFoundError(src)
    if os.path.exists(out) and not opts.force:
        raise RuntimeError(
            "Head alignment trial output exists. Nothing overwritten; "
            "only use -- --force to replace THAT trial intentionally."
        )

    bpy.ops.wm.open_mainfile(filepath=src)
    collection = bpy.data.collections.get(WORK)
    if collection is None:
        raise RuntimeError(f"Missing {WORK} collection.")
    meshes = [obj for obj in collection.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError("Expected one correction model mesh.")
    source = meshes[0]
    if len(source.data.vertices) != EXPECTED_VERTICES:
        raise RuntimeError("Unexpected model vertex count; refusing guesses.")
    if source.modifiers:
        raise RuntimeError("Source has modifiers; use the original four-view workspace.")

    references = {}
    for ref_name in REFS:
        obj = bpy.data.objects.get(ref_name)
        if not obj or obj.type != "EMPTY" or not hasattr(obj.data, "pixels"):
            raise RuntimeError(f"Missing reference image {ref_name}")
        references[ref_name] = obj

    measurements = build_calibration(source, references)
    helper = load_original_projection_module()
    images = {
        name: helper.matte_image(ref.data, "HEAD_MATTE_" + name)
        for name, ref in references.items()
    }
    material = build_head_material(helper, images, measurements)

    # This material change exists ONLY in a separate trial .blend.
    if not source.material_slots:
        source.data.materials.append(material)
    else:
        for slot in source.material_slots:
            slot.material = material

    for name in (
        "AI_TRIPO_CANDIDATE", "AI_CANDIDATE", "BODY", "ARMOR",
        "RIG", "RENDER", "NEXIA_UPPER_ISLANDS",
    ):
        other = bpy.data.collections.get(name)
        if other:
            other.hide_viewport = True
    collection.hide_viewport = False
    source.hide_set(False)
    ref_collection = bpy.data.collections.get("REFERENCE")
    if ref_collection:
        ref_collection.hide_viewport = False

    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = None
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type == "VIEW_3D":
            space = area.spaces.active
            space.shading.type = "MATERIAL"
            space.shading.show_xray = False
            space.overlay.show_overlays = True

    scene = bpy.context.scene
    scene["nexia_head_alignment_status"] = "AUTOMATIC_SILHOUETTE_PILOT_NOT_APPROVED"
    scene["nexia_head_shape_unchanged"] = True
    for name, params in measurements.items():
        scene[f"nexia_head_{name.lower()}_uv_scale"] = float(params["scale"])
        scene[f"nexia_head_{name.lower()}_uv_shift"] = float(params["shift"])
        print(
            f"HEAD_ALIGNMENT_{name}: "
            f"scale={params['scale']:.5f}, shift={params['shift']:+.5f}, "
            f"reference_width={params['reference']}, "
            f"model_width={params['model']}, samples={params['samples']}"
        )

    os.makedirs(os.path.dirname(out), exist_ok=True)
    previous = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=out)
    finally:
        bpy.context.preferences.filepaths.save_version = previous

    print("NEXIA_HEAD_ALIGNMENT_TRIAL_OK")
    print(f"Original four-view workspace NOT saved: {src}")
    print(f"Calibrated trial output: {out}")
    print("Only head-height band uses new color. Body is neutral gray.")
    print("Do not mistake silhouette registration for correct eye/visor UVs.")
    print("No original mesh vertices, faces, or modifiers were changed.")


if __name__ == "__main__":
    main()
