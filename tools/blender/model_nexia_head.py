import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector


HEAD_OBJECT_PREFIX = "HEAD_"

REFERENCE_TOP_Y = 18.0
REFERENCE_BOTTOM_Y = 850.0
REFERENCE_HEIGHT_PX = REFERENCE_BOTTOM_Y - REFERENCE_TOP_Y

# Must stay aligned with tools/blender/blockout_nexia.py.
HEAD_CENTER_SOURCE_Y = 108.0
HEAD_TOP_SOURCE_Y = 18.0
HEAD_BOTTOM_SOURCE_Y = 198.0
HEAD_RADIUS_X_NORMALIZED = 0.117
HEAD_RADIUS_Y_NORMALIZED = 0.113


def z_from_source_y(y):
    return (REFERENCE_BOTTOM_Y - float(y)) / REFERENCE_HEIGHT_PX


def get_head_reference_geometry(scene):
    scale_factor = scene.get("nexia_blockout_fit_scale")
    z_offset = scene.get("nexia_blockout_fit_z_offset")

    if scale_factor is None or z_offset is None:
        raise RuntimeError(
            "Blockout fit metadata is missing. Run tools/blender/blockout_nexia.py first."
        )

    scale_factor = float(scale_factor)
    z_offset = float(z_offset)
    if scale_factor <= 0.0:
        raise RuntimeError(f"Invalid blockout fit scale: {scale_factor}")

    normalized_height = (
        z_from_source_y(HEAD_TOP_SOURCE_Y)
        - z_from_source_y(HEAD_BOTTOM_SOURCE_Y)
    )
    normalized_width = HEAD_RADIUS_X_NORMALIZED * 2.0
    normalized_depth = HEAD_RADIUS_Y_NORMALIZED * 2.0
    normalized_center_z = z_from_source_y(HEAD_CENTER_SOURCE_Y)

    return {
        "center": Vector(
            (
                0.0,
                0.0,
                normalized_center_z * scale_factor + z_offset,
            )
        ),
        "width": normalized_width * scale_factor,
        "depth": normalized_depth * scale_factor,
        "height": normalized_height * scale_factor,
        "scale_factor": scale_factor,
        "z_offset": z_offset,
    }


def parse_args():
    argv = sys.argv
    user_args = argv[argv.index("--") + 1 :] if "--" in argv else []

    parser = argparse.ArgumentParser(
        description="Build the Nexia head and helmet from the approved references."
    )
    parser.add_argument(
        "--blend",
        default=os.path.join("assets", "character", "3d", "nexia", "nexia_model.blend"),
        help="Target Nexia .blend file.",
    )
    return parser.parse_args(user_args)


def abs_path(path):
    return os.path.abspath(path)


def require_object(name):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f"Required object is missing: {name}")
    return obj


def require_collections():
    body = bpy.data.collections.get("BODY")
    armor = bpy.data.collections.get("ARMOR")
    if body is None or armor is None:
        raise RuntimeError("BODY / ARMOR collections are required before head modeling.")
    return body, armor


def clear_previous_head_objects():
    for obj in list(bpy.data.objects):
        if obj.name.startswith(HEAD_OBJECT_PREFIX):
            bpy.data.objects.remove(obj, do_unlink=True)

    for mesh in list(bpy.data.meshes):
        if mesh.name.startswith(HEAD_OBJECT_PREFIX) and mesh.users == 0:
            bpy.data.meshes.remove(mesh)

    for curve in list(bpy.data.curves):
        if curve.name.startswith(HEAD_OBJECT_PREFIX) and curve.users == 0:
            bpy.data.curves.remove(curve)


def ensure_material(name, color, metallic=0.0, roughness=0.5):
    material = bpy.data.materials.get(name)
    if material is None:
        material = bpy.data.materials.new(name)

    material.diffuse_color = (*color, 1.0)
    material.metallic = metallic
    material.roughness = roughness
    return material


def create_uv_sphere_mesh(name, segments=48, rings=32):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(
        bm,
        u_segments=segments,
        v_segments=rings,
        radius=1.0,
    )
    bm.to_mesh(mesh)
    bm.free()

    for polygon in mesh.polygons:
        polygon.use_smooth = True

    return mesh


def create_cube_mesh(name):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def create_cylinder_mesh(name, radius=1.0, depth=2.0, segments=64):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segments,
        radius1=radius,
        radius2=radius,
        depth=depth,
    )
    bm.to_mesh(mesh)
    bm.free()

    for polygon in mesh.polygons:
        polygon.use_smooth = True

    return mesh


def assign_material(obj, material):
    if obj.data is not None and hasattr(obj.data, "materials"):
        obj.data.materials.append(material)


def create_ellipsoid(collection, name, center, radii, material):
    mesh = create_uv_sphere_mesh(name + "_MESH")
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)

    obj.location = center
    obj.scale = radii
    assign_material(obj, material)
    return obj


def create_helmet_shell(
    collection,
    name,
    center,
    width,
    depth,
    height,
    material,
    segments=64,
):
    # Cross-section controlled shell. Each ring defines:
    # (z ratio, X half-width ratio, front-depth ratio, back-depth ratio, Y shift ratio)
    # Front is -Y. The lower front is intentionally tighter than the back so the
    # silhouette reads as a helmet with a face opening rather than a sphere.
    ring_specs = (
        (-0.46, 0.33, 0.25, 0.34, 0.030),
        (-0.34, 0.455, 0.315, 0.44, 0.040),
        (-0.16, 0.52, 0.375, 0.50, 0.050),
        (0.06, 0.525, 0.425, 0.52, 0.050),
        (0.26, 0.495, 0.405, 0.49, 0.040),
        (0.40, 0.405, 0.34, 0.40, 0.020),
        (0.47, 0.245, 0.205, 0.225, 0.000),
    )

    vertices = []
    faces = []

    bottom_index = 0
    vertices.append(
        (
            center[0],
            center[1] + depth * 0.020,
            center[2] - height * 0.485,
        )
    )

    ring_starts = []
    for z_ratio, x_ratio, front_ratio, back_ratio, y_shift_ratio in ring_specs:
        ring_starts.append(len(vertices))
        for segment in range(segments):
            angle = math.tau * segment / segments
            cos_a = math.cos(angle)
            sin_a = math.sin(angle)

            x = center[0] + width * x_ratio * cos_a
            if sin_a < 0.0:
                y_radius = depth * front_ratio
            else:
                y_radius = depth * back_ratio

            y = (
                center[1]
                + depth * y_shift_ratio
                + y_radius * sin_a
            )
            z = center[2] + height * z_ratio
            vertices.append((x, y, z))

    top_index = len(vertices)
    vertices.append(
        (
            center[0],
            center[1],
            center[2] + height * 0.495,
        )
    )

    first_ring = ring_starts[0]
    for segment in range(segments):
        next_segment = (segment + 1) % segments
        faces.append(
            (
                bottom_index,
                first_ring + next_segment,
                first_ring + segment,
            )
        )

    for ring_index in range(len(ring_starts) - 1):
        lower = ring_starts[ring_index]
        upper = ring_starts[ring_index + 1]

        for segment in range(segments):
            next_segment = (segment + 1) % segments
            faces.append(
                (
                    lower + segment,
                    lower + next_segment,
                    upper + next_segment,
                    upper + segment,
                )
            )

    last_ring = ring_starts[-1]
    for segment in range(segments):
        next_segment = (segment + 1) % segments
        faces.append(
            (
                last_ring + segment,
                last_ring + next_segment,
                top_index,
            )
        )

    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()

    for polygon in mesh.polygons:
        polygon.use_smooth = True

    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    assign_material(obj, material)

    subdivision = obj.modifiers.new("HelmetSurface", "SUBSURF")
    subdivision.levels = 1
    subdivision.render_levels = 1

    return obj


def create_rounded_box(
    collection,
    name,
    center,
    half_extents,
    material,
    bevel,
    rotation_euler=None,
):
    mesh = create_cube_mesh(name + "_MESH")
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)

    obj.location = center
    obj.scale = half_extents
    if rotation_euler is not None:
        obj.rotation_euler = rotation_euler
    assign_material(obj, material)

    modifier = obj.modifiers.new("RoundedEdges", "BEVEL")
    modifier.width = bevel
    modifier.segments = 4
    return obj


def create_trapezoid_prism(
    collection,
    name,
    center,
    top_half_width,
    bottom_half_width,
    half_height,
    half_depth,
    material,
    bevel,
):
    vertices = [
        (-bottom_half_width, -half_depth, -half_height),
        (bottom_half_width, -half_depth, -half_height),
        (bottom_half_width, half_depth, -half_height),
        (-bottom_half_width, half_depth, -half_height),
        (-top_half_width, -half_depth, half_height),
        (top_half_width, -half_depth, half_height),
        (top_half_width, half_depth, half_height),
        (-top_half_width, half_depth, half_height),
    ]
    faces = [
        (0, 1, 2, 3),
        (4, 7, 6, 5),
        (0, 4, 5, 1),
        (1, 5, 6, 2),
        (2, 6, 7, 3),
        (4, 0, 3, 7),
    ]

    mesh = bpy.data.meshes.new(name + "_MESH")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()

    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.location = center
    assign_material(obj, material)

    modifier = obj.modifiers.new("RoundedEdges", "BEVEL")
    modifier.width = bevel
    modifier.segments = 4
    return obj


def create_cylinder(collection, name, center, radius, depth, material, axis):
    mesh = create_cylinder_mesh(name + "_MESH", radius=radius, depth=depth)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)

    obj.location = center
    assign_material(obj, material)

    if axis == "X":
        obj.rotation_euler[1] = math.radians(90.0)
    elif axis == "Y":
        obj.rotation_euler[0] = math.radians(90.0)
    elif axis != "Z":
        raise ValueError(f"Unsupported cylinder axis: {axis}")

    return obj


def create_stripe_curve(collection, name, points, bevel_depth, material):
    curve_data = bpy.data.curves.new(name + "_CURVE", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 16
    curve_data.bevel_depth = bevel_depth
    curve_data.bevel_resolution = 4

    spline = curve_data.splines.new(type="BEZIER")
    spline.bezier_points.add(len(points) - 1)

    for bezier_point, coordinate in zip(spline.bezier_points, points):
        bezier_point.co = coordinate
        bezier_point.handle_left_type = "AUTO"
        bezier_point.handle_right_type = "AUTO"

    obj = bpy.data.objects.new(name, curve_data)
    collection.objects.link(obj)
    assign_material(obj, material)
    return obj


def build_head(body_collection, armor_collection, blockout_head, head_geometry):
    center = head_geometry["center"]
    width = head_geometry["width"]
    depth = head_geometry["depth"]
    height = head_geometry["height"]

    if min(width, depth, height) <= 0.0:
        raise RuntimeError(
            "Calculated head dimensions are invalid: "
            f"{(width, depth, height)}"
        )

    blue = ensure_material(
        "NEXIA_HELMET_BLUE",
        (0.035, 0.18, 0.72),
        metallic=0.08,
        roughness=0.34,
    )
    dark_blue = ensure_material(
        "NEXIA_MASK_BLUE",
        (0.015, 0.08, 0.38),
        metallic=0.03,
        roughness=0.42,
    )
    cyan = ensure_material(
        "NEXIA_ACCENT_CYAN",
        (0.08, 0.72, 0.95),
        metallic=0.08,
        roughness=0.28,
    )
    silver = ensure_material(
        "NEXIA_SILVER",
        (0.72, 0.82, 0.87),
        metallic=0.45,
        roughness=0.24,
    )
    skin = ensure_material(
        "NEXIA_FACE_SKIN",
        (0.88, 0.62, 0.48),
        metallic=0.0,
        roughness=0.55,
    )

    # Project-specific convention: -Y is character front.
    # Use a dedicated cross-section mesh instead of a sphere so the front,
    # crown and rear silhouettes can be controlled independently.
    shell_center = (
        center.x,
        center.y,
        center.z,
    )
    shell = create_helmet_shell(
        armor_collection,
        "HEAD_HELMET_SHELL",
        shell_center,
        width,
        depth,
        height,
        blue,
    )

    front_y = center.y - depth * 0.405
    back_y = center.y + depth * 0.455

    # Eye/skin opening: a tapered plate rather than a horizontal oval.
    create_trapezoid_prism(
        body_collection,
        "HEAD_FACE_EXPOSED",
        (center.x, front_y - depth * 0.018, center.z + height * 0.020),
        top_half_width=width * 0.315,
        bottom_half_width=width * 0.255,
        half_height=height * 0.105,
        half_depth=depth * 0.030,
        material=skin,
        bevel=min(width, height) * 0.018,
    )

    # Lower face mask: wider at the eyes and narrower toward the chin.
    create_trapezoid_prism(
        armor_collection,
        "HEAD_FACE_MASK",
        (center.x, front_y - depth * 0.040, center.z - height * 0.155),
        top_half_width=width * 0.300,
        bottom_half_width=width * 0.215,
        half_height=height * 0.130,
        half_depth=depth * 0.045,
        material=dark_blue,
        bevel=min(width, height) * 0.025,
    )

    # Blue brow guards frame the exposed eye region and break the spherical cap.
    brow_y = front_y - depth * 0.050
    brow_z = center.z + height * 0.125
    for side, sign in (("R", 1.0), ("L", -1.0)):
        create_rounded_box(
            armor_collection,
            f"HEAD_BROW_{side}",
            (
                center.x + sign * width * 0.155,
                brow_y,
                brow_z,
            ),
            (width * 0.145, depth * 0.032, height * 0.032),
            blue,
            bevel=min(width, height) * 0.014,
            rotation_euler=(0.0, math.radians(-sign * 11.0), 0.0),
        )

    # Central cyan forehead plates sit close to the cap surface.
    create_trapezoid_prism(
        armor_collection,
        "HEAD_FOREHEAD_TOP",
        (center.x, front_y - depth * 0.020, center.z + height * 0.315),
        top_half_width=width * 0.095,
        bottom_half_width=width * 0.082,
        half_height=height * 0.095,
        half_depth=depth * 0.028,
        material=cyan,
        bevel=min(width, height) * 0.018,
    )

    create_trapezoid_prism(
        armor_collection,
        "HEAD_FOREHEAD_LOWER",
        (center.x, front_y - depth * 0.028, center.z + height * 0.105),
        top_half_width=width * 0.118,
        bottom_half_width=width * 0.100,
        half_height=height * 0.110,
        half_depth=depth * 0.032,
        material=cyan,
        bevel=min(width, height) * 0.020,
    )

    # Rear center plates visible in the approved back reference.
    create_trapezoid_prism(
        armor_collection,
        "HEAD_REAR_CENTER_TOP",
        (center.x, back_y + depth * 0.020, center.z + height * 0.285),
        top_half_width=width * 0.090,
        bottom_half_width=width * 0.080,
        half_height=height * 0.090,
        half_depth=depth * 0.026,
        material=cyan,
        bevel=min(width, height) * 0.016,
    )

    create_trapezoid_prism(
        armor_collection,
        "HEAD_REAR_CENTER_LOWER",
        (center.x, back_y + depth * 0.026, center.z + height * 0.095),
        top_half_width=width * 0.105,
        bottom_half_width=width * 0.095,
        half_height=height * 0.105,
        half_depth=depth * 0.030,
        material=cyan,
        bevel=min(width, height) * 0.018,
    )

    # Cyan side lines wrap from front across the crown to the back. Keep their
    # highest point below the cap top so the curve ends do not look like horns.
    stripe_x = width * 0.205
    stripe_radius = min(width, height) * 0.018

    for side, sign in (("R", 1.0), ("L", -1.0)):
        x = center.x + sign * stripe_x
        points = [
            (x, center.y - depth * 0.405, center.z + height * 0.070),
            (
                x + sign * width * 0.018,
                center.y - depth * 0.265,
                center.z + height * 0.300,
            ),
            (
                x + sign * width * 0.010,
                center.y,
                center.z + height * 0.435,
            ),
            (
                x + sign * width * 0.018,
                center.y + depth * 0.265,
                center.z + height * 0.295,
            ),
            (x, center.y + depth * 0.405, center.z + height * 0.060),
        ]

        create_stripe_curve(
            armor_collection,
            f"HEAD_HELMET_STRIPE_{side}",
            points,
            stripe_radius,
            cyan,
        )

    # Larger ears, moved inward so they overlap the helmet instead of floating.
    ear_z = center.z - height * 0.005
    ear_x = width * 0.495
    outer_radius = height * 0.195
    outer_depth = width * 0.105

    for side, sign in (("R", 1.0), ("L", -1.0)):
        ear_center = (center.x + sign * ear_x, center.y, ear_z)

        create_cylinder(
            armor_collection,
            f"HEAD_EAR_OUTER_{side}",
            ear_center,
            outer_radius,
            outer_depth,
            silver,
            axis="X",
        )
        create_cylinder(
            armor_collection,
            f"HEAD_EAR_MID_{side}",
            (
                ear_center[0] + sign * outer_depth * 0.05,
                ear_center[1],
                ear_center[2],
            ),
            outer_radius * 0.78,
            outer_depth * 1.03,
            cyan,
            axis="X",
        )
        create_cylinder(
            armor_collection,
            f"HEAD_EAR_CORE_{side}",
            (
                ear_center[0] + sign * outer_depth * 0.09,
                ear_center[1],
                ear_center[2],
            ),
            outer_radius * 0.48,
            outer_depth * 1.06,
            blue,
            axis="X",
        )

    blockout_head.hide_viewport = True
    blockout_head.hide_render = True

    return {
        "width": width,
        "depth": depth,
        "height": height,
        "center": tuple(center),
        "shell": shell.name,
    }

def main():
    args = parse_args()
    blend_path = abs_path(args.blend)

    if not os.path.isfile(blend_path):
        raise FileNotFoundError(f"Blend file not found: {blend_path}")

    bpy.ops.wm.open_mainfile(filepath=blend_path)

    blockout_head = require_object("BLOCKOUT_HEAD")
    body_collection, armor_collection = require_collections()

    scene = bpy.context.scene
    head_geometry = get_head_reference_geometry(scene)

    clear_previous_head_objects()
    head_info = build_head(
        body_collection,
        armor_collection,
        blockout_head,
        head_geometry,
    )

    scene["nexia_head_status"] = "FORMAL_HELMET_SHELL_CHECK"
    scene["nexia_head_source"] = "approved front/back/left references"
    scene["nexia_head_blockout_width"] = head_info["width"]
    scene["nexia_head_blockout_depth"] = head_info["depth"]
    scene["nexia_head_blockout_height"] = head_info["height"]
    scene["nexia_head_size_source"] = "normalized_reference_geometry"
    scene["nexia_head_fit_scale"] = head_geometry["scale_factor"]
    scene["nexia_head_fit_z_offset"] = head_geometry["z_offset"]

    bpy.context.view_layer.update()

    previous_save_version = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    finally:
        bpy.context.preferences.filepaths.save_version = previous_save_version

    head_names = sorted(
        obj.name for obj in bpy.data.objects if obj.name.startswith(HEAD_OBJECT_PREFIX)
    )

    print("NEXIA_HEAD_SETUP_OK")
    print(
        "Calculated head dimensions: "
        + str(
            tuple(
                round(value, 6)
                for value in (
                    head_info["width"],
                    head_info["depth"],
                    head_info["height"],
                )
            )
        )
    )
    print(
        "Head center: "
        + str(tuple(round(value, 6) for value in head_info["center"]))
    )
    print(f"Blockout fit scale source: {head_geometry['scale_factor']:.6f}")
    print(f"Head object count: {len(head_names)}")
    print("Objects:")
    for name in head_names:
        print(f"  - {name}")
    print(f"Saved: {blend_path}")


if __name__ == "__main__":
    main()
