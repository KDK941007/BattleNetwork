import argparse
import os
import sys

import bmesh
import bpy
from mathutils import Vector


NORMALIZED_HEIGHT = 1.0

# Landmark ratios measured from the approved 358x896 front/right reference crops.
# Absolute character height remains UNSPECIFIED; these values only define a
# normalized modeling workspace where the visible character height is 1.0.
REFERENCE_TOP_Y = 18.0
REFERENCE_BOTTOM_Y = 850.0
REFERENCE_HEIGHT_PX = REFERENCE_BOTTOM_Y - REFERENCE_TOP_Y


def z_from_source_y(y):
    return (REFERENCE_BOTTOM_Y - float(y)) / REFERENCE_HEIGHT_PX


def parse_args():
    argv = sys.argv
    user_args = argv[argv.index("--") + 1 :] if "--" in argv else []

    parser = argparse.ArgumentParser(
        description="Create the rough Nexia body blockout from approved reference proportions."
    )
    parser.add_argument(
        "--blend",
        default=os.path.join("assets", "character", "3d", "nexia", "nexia_model.blend"),
        help="Target Nexia .blend file.",
    )
    return parser.parse_args(user_args)


def abs_path(path):
    return os.path.abspath(path)


def ensure_body_collection():
    collection = bpy.data.collections.get("BODY")
    if collection is None:
        collection = bpy.data.collections.new("BODY")
        bpy.context.scene.collection.children.link(collection)
    return collection


def clear_previous_blockout():
    for obj in list(bpy.data.objects):
        if obj.name.startswith("BLOCKOUT_"):
            bpy.data.objects.remove(obj, do_unlink=True)

    for mesh in list(bpy.data.meshes):
        if mesh.name.startswith("BLOCKOUT_") and mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def create_blockout_material():
    material = bpy.data.materials.get("BLOCKOUT_MATERIAL")
    if material is None:
        material = bpy.data.materials.new("BLOCKOUT_MATERIAL")

    material.diffuse_color = (0.55, 0.55, 0.55, 1.0)
    material.roughness = 0.8
    return material


def create_unit_uv_sphere_mesh(name):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(
        bm,
        u_segments=24,
        v_segments=16,
        radius=1.0,
    )
    bm.to_mesh(mesh)
    bm.free()

    for polygon in mesh.polygons:
        polygon.use_smooth = True

    return mesh


def create_ellipsoid(collection, material, name, center, radii, rotation=None):
    mesh = create_unit_uv_sphere_mesh(name + "_MESH")
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)

    obj.location = center
    obj.scale = radii

    if rotation is not None:
        obj.rotation_mode = "QUATERNION"
        obj.rotation_quaternion = rotation

    if material is not None:
        mesh.materials.append(material)

    obj["nexia_blockout"] = True
    return obj


def create_segment(collection, material, name, start, end, radius_x, radius_y):
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    length = direction.length

    if length <= 0.0:
        raise ValueError(f"Zero-length blockout segment: {name}")

    center = (start_v + end_v) * 0.5
    rotation = Vector((0.0, 0.0, 1.0)).rotation_difference(direction.normalized())

    return create_ellipsoid(
        collection,
        material,
        name,
        center,
        (radius_x, radius_y, length * 0.5),
        rotation,
    )


def mirrored_x(point):
    return (-point[0], point[1], point[2])


def create_symmetric_segment_pair(
    collection,
    material,
    base_name,
    right_start,
    right_end,
    radius_x,
    radius_y,
):
    right = create_segment(
        collection,
        material,
        base_name + "_R",
        right_start,
        right_end,
        radius_x,
        radius_y,
    )
    left = create_segment(
        collection,
        material,
        base_name + "_L",
        mirrored_x(right_start),
        mirrored_x(right_end),
        radius_x,
        radius_y,
    )
    return right, left


def create_symmetric_ellipsoid_pair(
    collection,
    material,
    base_name,
    right_center,
    radii,
):
    right = create_ellipsoid(
        collection,
        material,
        base_name + "_R",
        right_center,
        radii,
    )
    left = create_ellipsoid(
        collection,
        material,
        base_name + "_L",
        mirrored_x(right_center),
        radii,
    )
    return right, left


def require_references():
    missing = [
        name
        for name in ("REF_FRONT", "REF_BACK", "REF_RIGHT")
        if bpy.data.objects.get(name) is None
    ]
    if missing:
        raise RuntimeError(
            "Reference setup is incomplete. Missing: " + ", ".join(missing)
        )


def build_blockout(collection, material):
    # Central volumes.
    create_ellipsoid(
        collection,
        material,
        "BLOCKOUT_HEAD",
        (0.0, 0.0, z_from_source_y(108.0)),
        (0.117, 0.113, (z_from_source_y(18.0) - z_from_source_y(198.0)) * 0.5),
    )

    create_segment(
        collection,
        material,
        "BLOCKOUT_NECK",
        (0.0, 0.0, z_from_source_y(198.0)),
        (0.0, 0.0, z_from_source_y(220.0)),
        0.045,
        0.045,
    )

    create_ellipsoid(
        collection,
        material,
        "BLOCKOUT_CHEST",
        (0.0, 0.0, z_from_source_y(276.0)),
        (0.103, 0.078, 0.085),
    )

    create_ellipsoid(
        collection,
        material,
        "BLOCKOUT_ABDOMEN",
        (0.0, 0.0, z_from_source_y(380.0)),
        (0.078, 0.060, 0.095),
    )

    create_ellipsoid(
        collection,
        material,
        "BLOCKOUT_PELVIS",
        (0.0, 0.0, z_from_source_y(465.0)),
        (0.085, 0.063, 0.060),
    )

    # Arms. Parameters are derived from the approved front/side silhouettes;
    # both sides are generated from the same source parameters.
    shoulder_r = (0.112, 0.0, z_from_source_y(235.0))
    elbow_r = (0.137, 0.0, z_from_source_y(345.0))
    wrist_r = (0.151, 0.0, z_from_source_y(445.0))

    create_symmetric_segment_pair(
        collection,
        material,
        "BLOCKOUT_UPPER_ARM",
        shoulder_r,
        elbow_r,
        0.036,
        0.044,
    )

    create_symmetric_segment_pair(
        collection,
        material,
        "BLOCKOUT_FOREARM",
        elbow_r,
        wrist_r,
        0.041,
        0.055,
    )

    create_symmetric_ellipsoid_pair(
        collection,
        material,
        "BLOCKOUT_HAND",
        (0.154, -0.002, z_from_source_y(477.0)),
        (0.038, 0.043, 0.043),
    )

    # Legs.
    hip_r = (0.047, 0.0, z_from_source_y(465.0))
    knee_r = (0.071, 0.0, z_from_source_y(592.0))
    ankle_r = (0.088, 0.0, z_from_source_y(752.0))

    create_symmetric_segment_pair(
        collection,
        material,
        "BLOCKOUT_THIGH",
        hip_r,
        knee_r,
        0.046,
        0.054,
    )

    create_symmetric_segment_pair(
        collection,
        material,
        "BLOCKOUT_LOWER_LEG",
        knee_r,
        ankle_r,
        0.063,
        0.073,
    )

    create_symmetric_ellipsoid_pair(
        collection,
        material,
        "BLOCKOUT_FOOT",
        (0.091, -0.043, z_from_source_y(807.0)),
        (0.067, 0.118, 0.057),
    )


def main():
    args = parse_args()
    blend_path = abs_path(args.blend)

    if not os.path.isfile(blend_path):
        raise FileNotFoundError(f"Blend file not found: {blend_path}")

    bpy.ops.wm.open_mainfile(filepath=blend_path)
    require_references()

    clear_previous_blockout()
    collection = ensure_body_collection()
    material = create_blockout_material()
    build_blockout(collection, material)

    scene = bpy.context.scene
    scene["nexia_blockout_normalized_height"] = NORMALIZED_HEIGHT
    scene["nexia_blockout_reference_top_y"] = REFERENCE_TOP_Y
    scene["nexia_blockout_reference_bottom_y"] = REFERENCE_BOTTOM_Y
    scene["nexia_blockout_absolute_height"] = "UNSPECIFIED"
    scene["nexia_blockout_status"] = "ROUGH_PROPORTION_CHECK"

    bpy.context.view_layer.update()
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    blockout_names = sorted(
        obj.name for obj in bpy.data.objects if obj.name.startswith("BLOCKOUT_")
    )

    print("NEXIA_BLOCKOUT_SETUP_OK")
    print(f"Normalized visible height: {NORMALIZED_HEIGHT}")
    print("Absolute character height: UNSPECIFIED")
    print(f"Blockout object count: {len(blockout_names)}")
    print("Objects:")
    for name in blockout_names:
        print(f"  - {name}")
    print(f"Saved: {blend_path}")


if __name__ == "__main__":
    main()
