"""Build REAL geometry for Nexia's eyes on a protected Blender trial copy.

Creates separate 3D objects for the eye-socket backing, white sclera, cyan
iris, dark pupil, highlights and upper eyelid on BOTH sides. No faces are
deleted and the dense original Tripo mesh is not edited.

This is an artistic FIRST TRIAL, not a verified final 1:1 reconstruction:
coordinates and proportions are tunable below. Eye components sit just in
front of the existing helmet/face, rather than pretending that temporary Mask
holes constitute a finished socket. Review front and RIGHT views before
continuing to proper recesses, material work, or rigging.

READS: assets/character/3d/nexia/nexia_model.blend
SAVES: assets/character/3d/nexia/nexia_eye_shape_trial.blend
DO NOT overwrite the source or previously created diagnostic files.
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Euler, Vector


CORRECTION = "TRIPO_CORRECTION"
TRIAL = "NEXIA_EYE_GEOMETRY_TRIAL"
EXPECTED_VERTICES = 749333
# World-coordinate provisional eye positions (Front=-Y, Z=up).
# Adjust these only AFTER checking a rendered comparison of the first trial.
EYES = (
    {"name": "SCREEN_LEFT", "x": -0.078, "z": 1.693, "side": -1},
    {"name": "SCREEN_RIGHT", "x": 0.076, "z": 1.693, "side": 1},
)
# The source Tripo mesh is a high-poly single object. We DO NOT alter it.
RAY_START_Y = -1.2
RAY_DISTANCE = 3.0
FRAME_CLEARANCE = 0.009
SEGMENTS = 48


def arguments():
    argv = sys.argv
    user_args = argv[argv.index("--") + 1:] if "--" in argv else []
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
            "nexia_eye_shape_trial.blend",
        ),
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Replace ONLY the separate trial blend; never the source."
    )
    return parser.parse_args(user_args)


def material(name, rgba, metallic=0.0, roughness=0.4):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    if principled is not None:
        principled.inputs["Base Color"].default_value = rgba
        principled.inputs["Metallic"].default_value = metallic
        principled.inputs["Roughness"].default_value = roughness
    return mat


def ray_front_y(source, x, z):
    transform = source.matrix_world.inverted_safe()
    origin = transform @ Vector((x, RAY_START_Y, z))
    direction = (transform.to_3x3() @ Vector((0.0, 1.0, 0.0))).normalized()
    hit, loc, _normal, _idx = source.ray_cast(
        origin, direction, distance=RAY_DISTANCE
    )
    if not hit:
        return None
    return float((source.matrix_world @ loc).y)


def front_anchor_y(source, x, z):
    # Probe a sparse cross section of the actual candidate's geometry.
    # The minimum frontmost Y avoids burying the eye behind the old armor.
    measurements = []
    for dx, dz in (
        (0.0, 0.0), (-0.035, 0.0), (0.035, 0.0),
        (0.0, -0.020), (0.0, 0.020),
        (-0.020, -0.012), (0.020, -0.012),
        (-0.020, 0.012), (0.020, 0.012),
    ):
        y = ray_front_y(source, x + dx, z + dz)
        if y is not None:
            measurements.append(y)
    if len(measurements) < 5:
        raise RuntimeError(
            f"Insufficient 3D surface hits at eye x={x}, z={z}: "
            f"{len(measurements)}. No trial file saved."
        )
    # Y decreases toward the front of the character.
    return min(measurements) - FRAME_CLEARANCE


def almond_geometry(collection, name, cx, cz, y_base, rx, rz, side,
                    material_slot, front_offset=0.0, bow=0.004,
                    lean=0.004, flatten=1.0):
    """Build a convex 3D lens using concentric elliptical rings and triangles.

    Lens profile is sharper at the outer corners and rises toward the outside
    like the character's reference expression. The 3D surface is real mesh
    geometry with a shallow convex arc, not an image plane.
    """
    rings = (0.0, 0.34, 0.67, 1.0)
    verts = [(cx, y_base - front_offset - bow, cz)]
    for radius in rings[1:]:
        for j in range(SEGMENTS):
            a = 2.0 * math.pi * j / SEGMENTS
            u = math.cos(a)
            v = math.sin(a)
            # Reference eye-brow slopes downward toward inner corner.
            outside = u * side
            z_middle = cz + lean * outside * radius
            taper = 0.84 + 0.16 * abs(v)
            verts.append((
                cx + rx * radius * u,
                y_base - front_offset - bow * (1.0 - radius * radius),
                z_middle + rz * radius * v * taper * flatten,
            ))

    faces = []
    # center to first ring
    for j in range(SEGMENTS):
        first = 1 + j
        second = 1 + ((j + 1) % SEGMENTS)
        faces.append((0, first, second))
    for ri in range(1, len(rings) - 1):
        inner = 1 + (ri - 1) * SEGMENTS
        outer = inner + SEGMENTS
        for j in range(SEGMENTS):
            k = (j + 1) % SEGMENTS
            faces.append((
                inner + j, outer + j, outer + k, inner + k
            ))

    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    mesh.materials.append(material_slot)
    obj["trial_eye_only"] = True
    for poly in mesh.polygons:
        poly.use_smooth = True
    return obj


def upper_lid(collection, name, cx, cz, y_base, rx, rz, side, mat):
    """A slim beveled curve over the upper part of the eye."""
    curve = bpy.data.curves.new(name + "_curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 16
    curve.bevel_depth = 0.0026
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    count = 23
    spline.points.add(count - 1)
    for i in range(count):
        t = i / (count - 1)
        x = cx + rx * (2 * t - 1)
        z = cz + rz * (max(0, math.sin(math.pi * t)) ** 0.8)
        z += side * 0.004 * (2 * t - 1)
        spline.points[i].co = (x, y_base - 0.025, z, 1.0)
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    curve.materials.append(mat)
    obj["trial_eye_only"] = True
    return obj


def make_eye_parts(collection, source, spec, mats):
    x, z, side = spec["x"], spec["z"], spec["side"]
    name = spec["name"]
    y = front_anchor_y(source, x, z)

    # Put a dark backing plate over the legacy solid face surface. This is a
    # deliberate temporary visual trial, NOT a true carved-out eye socket.
    eye_parts = (
        ("SOCKET", 0.057, 0.037, 0.000, 0.0035, mats["socket"]),
        ("SCLERA", 0.051, 0.030, 0.008, 0.005, mats["sclera"]),
    )
    created = []
    for label, rx, rz, offset, bow, mat in eye_parts:
        created.append(almond_geometry(
            collection, name + "_" + label, x, z, y, rx, rz, side, mat,
            front_offset=offset, bow=bow,
            lean=0.005 if label == "SOCKET" else 0.004
        ))

    # Irises look slightly inward. Each is raised from the white sclera.
    iris_x = x - side * 0.011
    iris_z = z - 0.002
    created.append(almond_geometry(
        collection, name + "_IRIS", iris_x, iris_z, y,
        0.018, 0.024, side, mats["iris"],
        front_offset=0.018, bow=0.005, lean=0.0
    ))
    created.append(almond_geometry(
        collection, name + "_PUPIL", iris_x - side * 0.0006,
        iris_z, y, 0.008, 0.014, side, mats["pupil"],
        front_offset=0.025, bow=0.0035, lean=0.0
    ))
    created.append(almond_geometry(
        collection, name + "_GLINT",
        iris_x - 0.005, iris_z + 0.010, y,
        0.0038, 0.005, side, mats["glint"],
        front_offset=0.031, bow=0.001, lean=0.0
    ))
    created.append(upper_lid(
        collection, name + "_UPPER_EYELID", x, z, y,
        0.052, 0.030, side, mats["socket"]
    ))

    print(
        f"{name}: center=({x:+.3f},{z:.3f}), "
        f"original_front_surface_y={y + FRAME_CLEARANCE:.4f}, "
        f"trial_anchor_y={y:.4f}"
    )
    return created


def configure_view(collection):
    for name in (
        "AI_TRIPO_CANDIDATE", "AI_CANDIDATE",
        "BODY", "ARMOR", "RIG", "RENDER",
        "NEXIA_UPPER_ISLANDS", "NEXIA_EYE_PREVIEW_GUIDES",
        "NEXIA_EYE_PART_DIAGNOSTICS",
    ):
        c = bpy.data.collections.get(name)
        if c is not None:
            c.hide_viewport = True

    work = bpy.data.collections.get(CORRECTION)
    work.hide_viewport = False
    refs = bpy.data.collections.get("REFERENCE")
    if refs is not None:
        refs.hide_viewport = False
    collection.hide_viewport = False

    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = None
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type != "VIEW_3D":
            continue
        space = area.spaces.active
        space.overlay.show_overlays = True
        space.shading.type = "SOLID"
        space.shading.color_type = "MATERIAL"
        space.shading.show_xray = False
        region = space.region_3d
        region.view_perspective = "ORTHO"
        region.view_rotation = Euler(
            (math.pi / 2, 0.0, 0.0), "XYZ"
        ).to_quaternion()
        region.view_location = Vector((0.0, 0.0, 1.76))
        region.view_distance = 0.92


def main():
    args = arguments()
    source_path = os.path.abspath(args.blend)
    output_path = os.path.abspath(args.output)
    if source_path == output_path:
        raise RuntimeError("Trial output cannot overwrite source model.")
    if not os.path.isfile(source_path):
        raise FileNotFoundError(source_path)
    if os.path.exists(output_path) and not args.force:
        raise RuntimeError(
            f"Eye trial already exists: {output_path}. "
            "Do not discard it without explicitly passing -- --force."
        )

    bpy.ops.wm.open_mainfile(filepath=source_path)
    work = bpy.data.collections.get(CORRECTION)
    if work is None:
        raise RuntimeError("TRIPO_CORRECTION is missing.")
    meshes = [obj for obj in work.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(
            f"Expected 1 correction mesh; found {len(meshes)}"
        )
    source = meshes[0]
    if len(source.data.vertices) != EXPECTED_VERTICES:
        raise RuntimeError(
            "Unexpected Tripo mesh vertex count. "
            "Refusing to guess where eye geometry belongs."
        )
    if source.modifiers:
        raise RuntimeError(
            "Correction mesh already has modifiers. Use the original "
            "nexia_model.blend instead of a diagnostic Mask result."
        )
    for name in ("REF_FRONT", "REF_RIGHT", "REF_BACK"):
        if bpy.data.objects.get(name) is None:
            raise RuntimeError(f"Missing reference object: {name}")
    if bpy.data.collections.get(TRIAL):
        raise RuntimeError(
            f"{TRIAL} already present in input. Refusing to overwrite."
        )

    collection = bpy.data.collections.new(TRIAL)
    bpy.context.scene.collection.children.link(collection)
    mats = {
        "socket": material(
            "NEXIA_TRIAL_SOCKET_DEEP_NAVY", (0.012, 0.020, 0.100, 1),
            metallic=0.15, roughness=0.36
        ),
        "sclera": material(
            "NEXIA_TRIAL_SCLERA_ICE", (0.88, 0.96, 1.00, 1),
            metallic=0.0, roughness=0.21
        ),
        "iris": material(
            "NEXIA_TRIAL_IRIS_CYAN", (0.016, 0.58, 0.78, 1),
            metallic=0.13, roughness=0.17
        ),
        "pupil": material(
            "NEXIA_TRIAL_PUPIL_NAVY", (0.004, 0.035, 0.09, 1),
            metallic=0.04, roughness=0.16
        ),
        "glint": material(
            "NEXIA_TRIAL_SPECULAR_HIGHLIGHT", (0.97, 1.0, 1.0, 1),
            metallic=0.0, roughness=0.08
        ),
    }

    objects = []
    for spec in EYES:
        objects.extend(make_eye_parts(collection, source, spec, mats))

    configure_view(collection)
    bpy.context.scene["nexia_eye_trial_status"] = (
        "VISUAL_PROTOTYPE_NOT_FINAL_GEOMETRY"
    )
    bpy.context.scene["nexia_eye_trial_model_mutated"] = False
    bpy.context.scene["nexia_eye_trial_note"] = (
        "Actual layered eye meshes added; front overlay, not carved sockets."
    )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    previous_save_version = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=output_path)
    finally:
        bpy.context.preferences.filepaths.save_version = previous_save_version

    print("NEXIA_EYE_GEOMETRY_TRIAL_OK")
    print(f"Original source NOT saved: {source_path}")
    print(f"Eye trial saved: {output_path}")
    print(f"New eye geometry objects: {len(objects)}")
    print("Toggle NEXIA_EYE_GEOMETRY_TRIAL collection for before/after.")
    print("No original mesh coordinates, polygons, modifiers were changed.")
    print("This is an overlay prototype, not a finished eye socket.")


if __name__ == "__main__":
    main()
