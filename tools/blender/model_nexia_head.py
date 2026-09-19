import argparse
import math
import os
import sys

import bmesh
import bpy


HEAD_OBJECT_PREFIX = "HEAD_"


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


def create_rounded_box(collection, name, center, half_extents, material, bevel):
    mesh = create_cube_mesh(name + "_MESH")
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)

    obj.location = center
    obj.scale = half_extents
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


def build_head(body_collection, armor_collection, blockout_head):
    dims = blockout_head.dimensions.copy()
    center = blockout_head.matrix_world.translation.copy()

    width = dims.x
    depth = dims.y
    height = dims.z

    if min(width, depth, height) <= 0.0:
        raise RuntimeError(f"BLOCKOUT_HEAD has invalid dimensions: {tuple(dims)}")

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

    shell = create_ellipsoid(
        armor_collection,
        "HEAD_HELMET_SHELL",
        center,
        (width * 0.515, depth * 0.515, height * 0.505),
        blue,
    )

    # Project-specific convention: -Y is character front.
    front_y = center.y - depth * 0.49

    create_ellipsoid(
        body_collection,
        "HEAD_FACE_EXPOSED",
        (center.x, front_y - depth * 0.015, center.z + height * 0.015),
        (width * 0.315, depth * 0.035, height * 0.135),
        skin,
    )

    create_rounded_box(
        armor_collection,
        "HEAD_FACE_MASK",
        (center.x, front_y - depth * 0.035, center.z - height * 0.145),
        (width * 0.305, depth * 0.055, height * 0.125),
        dark_blue,
        bevel=min(width, height) * 0.035,
    )

    create_rounded_box(
        armor_collection,
        "HEAD_FOREHEAD_TOP",
        (center.x, front_y - depth * 0.025, center.z + height * 0.315),
        (width * 0.115, depth * 0.045, height * 0.105),
        cyan,
        bevel=min(width, height) * 0.025,
    )

    create_rounded_box(
        armor_collection,
        "HEAD_FOREHEAD_LOWER",
        (center.x, front_y - depth * 0.035, center.z + height * 0.105),
        (width * 0.125, depth * 0.050, height * 0.125),
        cyan,
        bevel=min(width, height) * 0.030,
    )

    stripe_x = width * 0.205
    stripe_radius = min(width, height) * 0.028

    for side, sign in (("R", 1.0), ("L", -1.0)):
        x = center.x + sign * stripe_x
        points = [
            (x, center.y - depth * 0.43, center.z + height * 0.10),
            (
                x + sign * width * 0.025,
                center.y - depth * 0.28,
                center.z + height * 0.32,
            ),
            (
                x + sign * width * 0.015,
                center.y,
                center.z + height * 0.49,
            ),
            (
                x + sign * width * 0.025,
                center.y + depth * 0.28,
                center.z + height * 0.31,
            ),
            (x, center.y + depth * 0.43, center.z + height * 0.08),
        ]

        create_stripe_curve(
            armor_collection,
            f"HEAD_HELMET_STRIPE_{side}",
            points,
            stripe_radius,
            cyan,
        )

    ear_z = center.z - height * 0.015
    ear_x = width * 0.56
    outer_radius = height * 0.17
    outer_depth = width * 0.075

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
                ear_center[0] + sign * outer_depth * 0.08,
                ear_center[1],
                ear_center[2],
            ),
            outer_radius * 0.76,
            outer_depth * 1.04,
            cyan,
            axis="X",
        )
        create_cylinder(
            armor_collection,
            f"HEAD_EAR_CORE_{side}",
            (
                ear_center[0] + sign * outer_depth * 0.13,
                ear_center[1],
                ear_center[2],
            ),
            outer_radius * 0.46,
            outer_depth * 1.08,
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

    clear_previous_head_objects()
    head_info = build_head(body_collection, armor_collection, blockout_head)

    scene = bpy.context.scene
    scene["nexia_head_status"] = "ROUGH_HEAD_HELMET_CHECK"
    scene["nexia_head_source"] = "approved front/back/right references"
    scene["nexia_head_blockout_width"] = head_info["width"]
    scene["nexia_head_blockout_depth"] = head_info["depth"]
    scene["nexia_head_blockout_height"] = head_info["height"]

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
        "Head blockout dimensions: "
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
    print(f"Head object count: {len(head_names)}")
    print("Objects:")
    for name in head_names:
        print(f"  - {name}")
    print(f"Saved: {blend_path}")


if __name__ == "__main__":
    main()
