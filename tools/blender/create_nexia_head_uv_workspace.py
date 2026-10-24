"""Prepare an editable per-part UV workspace for Nexia's existing HEAD.

This replaces repeated global image projection by separating the seven known
HEAD-region connected islands into independent editable mesh objects, each
with an actual UV layer and four direction-specific illustration materials.

For every face, choose FRONT / RIGHT / BACK / LEFT based on its world-space
surface normal. UVs start with flat camera-style mapping and are intended for
subsequent MANUAL island alignment; they are not a finished texture and cannot
fix missing or mismatched geometry. The original dense source mesh remains
unchanged in data; in this separate output file only, a reversible Mask modifier
hides the seven copied components to avoid duplicate overlapping surfaces.

Source: nexia_four_view_workspace.blend
Output: nexia_head_uv_workspace.blend
"""
import argparse
import os
import sys
from collections import Counter, defaultdict

import bpy
from mathutils import Vector


SOURCE_COLLECTION = "TRIPO_CORRECTION"
OUTPUT_COLLECTION = "NEXIA_HEAD_UV_PARTS"
SOURCE_VERTEX_COUNT = 749333
SOURCE_PART_COUNT = 77
SELECT_PARTS = (1, 3, 5, 14, 24, 51, 63)
REFS = ("REF_FRONT", "REF_RIGHT", "REF_BACK", "REF_LEFT")
VIEW_NAMES = ("FRONT", "RIGHT", "BACK", "LEFT")
HIDE_GROUP = "NEXIA_HEAD_COPIED_PARTS_HIDE_SOURCE"
HIDE_MODIFIER = "PREVIEW_HideCopiedHeadParts"


def arguments():
    argv = sys.argv
    values = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--blend", default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_four_view_workspace.blend",
        )
    )
    parser.add_argument(
        "--output", default=os.path.join(
            "assets", "character", "3d", "nexia",
            "nexia_head_uv_workspace.blend",
        )
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Overwrite this separate OUTPUT ONLY; source remains protected.",
    )
    return parser.parse_args(values)


def rank_connected_components(mesh):
    n = len(mesh.vertices)
    parent = list(range(n))
    size = [1] * n

    def find(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    for edge in mesh.edges:
        a, b = edge.vertices
        a, b = find(a), find(b)
        if a != b:
            if size[a] < size[b]:
                a, b = b, a
            parent[b] = a
            size[a] += size[b]

    roots = [find(i) for i in range(n)]
    counts = Counter(roots)
    ordered = sorted(counts, key=lambda r: (-counts[r], r))
    if len(ordered) != SOURCE_PART_COUNT:
        raise RuntimeError(
            f"Expected {SOURCE_PART_COUNT} mesh components, got {len(ordered)}."
        )
    rank_by_root = {r: i + 1 for i, r in enumerate(ordered)}
    ranks = bytearray(rank_by_root[r] for r in roots)
    part_counts = {
        rank: counts[root]
        for root, rank in rank_by_root.items()
        if rank in SELECT_PARTS
    }
    if not set(part_counts) == set(SELECT_PARTS):
        raise RuntimeError("Required head components not found.")
    return ranks, part_counts


def direction_for_normal(normal):
    # World front is -Y, right is +X, back is +Y, left is -X.
    if abs(normal.y) >= abs(normal.x):
        return "FRONT" if normal.y < 0 else "BACK"
    return "RIGHT" if normal.x > 0 else "LEFT"


def uv_from_point(point, direction, sizes):
    width, height = sizes[direction]
    if direction == "FRONT":
        horizontal = point.x
    elif direction == "BACK":
        horizontal = -point.x
    elif direction == "RIGHT":
        horizontal = point.y
    else:
        horizontal = -point.y
    return (0.5 + horizontal / width, point.z / height)


def image_material(ref_name, label):
    ref = bpy.data.objects.get(ref_name)
    if ref is None or ref.type != "EMPTY" or ref.data is None:
        raise RuntimeError(f"Reference {ref_name} is not available.")
    image = ref.data
    if len(image.size) != 2 or min(image.size) < 64:
        raise RuntimeError(f"Reference image size invalid: {ref_name}")
    mat = bpy.data.materials.new("NEXIA_UV_" + label)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    texcoord = nodes.new("ShaderNodeUVMap")
    texcoord.uv_map = "NEXIA_UV_EDITABLE"
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.extension = "CLIP"
    tex.interpolation = "Linear"
    links.new(texcoord.outputs["UV"], tex.inputs["Vector"])
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Roughness"].default_value = 0.65
    links.new(tex.outputs["Color"], shader.inputs["Base Color"])
    output = nodes.new("ShaderNodeOutputMaterial")
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return mat


def new_head_part(source, rank, polygons, collection, materials, sizes):
    if not polygons:
        raise RuntimeError(f"No polygons for PART_{rank:02d}.")
    old_vertices = sorted(
        set(index for face, _direction in polygons for index in face)
    )
    reverse = {orig: local for local, orig in enumerate(old_vertices)}
    vertex_coords = [tuple(source.data.vertices[i].co) for i in old_vertices]
    new_faces = [
        tuple(reverse[i] for i in face) for face, direction in polygons
    ]
    mesh = bpy.data.meshes.new(f"NEXIA_HEAD_PART_{rank:02d}_mesh")
    mesh.from_pydata(vertex_coords, [], new_faces)
    mesh.update()
    for direction in VIEW_NAMES:
        mesh.materials.append(materials[direction])

    uvmap = mesh.uv_layers.new(name="NEXIA_UV_EDITABLE")
    matrix = source.matrix_world
    for poly, (face, direction) in zip(mesh.polygons, polygons):
        poly.material_index = VIEW_NAMES.index(direction)
        poly.use_smooth = True
        for loop_idx in poly.loop_indices:
            local_vertex = mesh.loops[loop_idx].vertex_index
            world = matrix @ mesh.vertices[local_vertex].co
            uvmap.data[loop_idx].uv = uv_from_point(world, direction, sizes)

    obj = bpy.data.objects.new(f"NEXIA_HEAD_PART_{rank:02d}", mesh)
    collection.objects.link(obj)
    obj.matrix_world = source.matrix_world.copy()
    obj["source_connected_component_rank"] = rank
    obj["uv_mapping_status"] = "EDITABLE_INITIAL_UV_NOT_ACCEPTED"
    obj["source_face_count"] = len(polygons)
    return obj


def hide_copied_parts_in_source(source, ranks):
    if source.vertex_groups.get(HIDE_GROUP):
        raise RuntimeError("The source already has a copied-parts hide group.")
    if source.modifiers.get(HIDE_MODIFIER):
        raise RuntimeError("The source already has a copied-parts Mask.")
    indices = [i for i, rank in enumerate(ranks) if rank in SELECT_PARTS]
    group = source.vertex_groups.new(name=HIDE_GROUP)
    for i in range(0, len(indices), 4096):
        group.add(indices[i:i + 4096], 1.0, "REPLACE")

    mod = source.modifiers.new(HIDE_MODIFIER, "MASK")
    mod.mode = "VERTEX_GROUP"
    mod.vertex_group = HIDE_GROUP
    mod.invert_vertex_group = True
    mod.show_viewport = True
    mod.show_render = True
    mod.show_in_editmode = False
    return len(indices)


def main():
    opts = arguments()
    src = os.path.abspath(opts.blend)
    dst = os.path.abspath(opts.output)
    if src == dst:
        raise RuntimeError("Refusing to overwrite four-view source workspace.")
    if not os.path.isfile(src):
        raise FileNotFoundError(f"Workspace not found: {src}")
    if os.path.exists(dst) and not opts.force:
        raise RuntimeError(
            f"Output already exists: {dst}. Refusing overwrite; "
            "only use -- --force if intentionally replacing this UV workspace."
        )

    bpy.ops.wm.open_mainfile(filepath=src)
    collection = bpy.data.collections.get(SOURCE_COLLECTION)
    if collection is None:
        raise RuntimeError("TRIPO_CORRECTION collection missing.")
    originals = [o for o in collection.objects if o.type == "MESH"]
    if len(originals) != 1:
        raise RuntimeError("Expected a single correction model mesh.")
    source = originals[0]
    if len(source.data.vertices) != SOURCE_VERTEX_COUNT:
        raise RuntimeError("The original Tripo vertex count has changed.")
    if source.modifiers:
        raise RuntimeError(
            "Source mesh already has modifiers; use the unmodified four-view workspace."
        )
    if bpy.data.collections.get(OUTPUT_COLLECTION):
        raise RuntimeError("UV part collection already exists in input.")

    sizes = {}
    materials = {}
    for direction, ref_name in zip(VIEW_NAMES, REFS):
        ref = bpy.data.objects.get(ref_name)
        if ref is None or ref.type != "EMPTY" or ref.data is None:
            raise RuntimeError(f"Missing {ref_name} illustration image.")
        width, height = ref.data.size
        ref_height = ref.empty_display_size
        if not (width > 100 and height > 100 and 1.8 < ref_height < 2.2):
            raise RuntimeError(f"Reference scale invalid: {ref_name}")
        sizes[direction] = (ref_height * width / height, ref_height)
        materials[direction] = image_material(ref_name, direction)

    ranks, part_counts = rank_connected_components(source.data)
    polygons_by_rank = defaultdict(list)
    transform_normal = source.matrix_world.to_3x3().inverted().transposed()
    for poly in source.data.polygons:
        face = tuple(poly.vertices)
        rank = ranks[face[0]]
        if rank not in SELECT_PARTS:
            continue
        if any(ranks[i] != rank for i in face[1:]):
            raise RuntimeError(f"Triangle crosses source island PART_{rank:02d}")
        world_normal = (transform_normal @ poly.normal).normalized()
        direction = direction_for_normal(world_normal)
        polygons_by_rank[rank].append((face, direction))

    new_collection = bpy.data.collections.new(OUTPUT_COLLECTION)
    bpy.context.scene.collection.children.link(new_collection)
    for rank in SELECT_PARTS:
        obj = new_head_part(
            source, rank, polygons_by_rank[rank],
            new_collection, materials, sizes
        )
        print(
            f"NEXIA_UV_PART_{rank:02d}: "
            f"vertices={len(obj.data.vertices)}, "
            f"faces={len(obj.data.polygons)}"
        )
    hidden_count = hide_copied_parts_in_source(source, ranks)
    if hidden_count != sum(part_counts.values()):
        raise RuntimeError("Head copy vertex count mismatch.")

    for name in (
        "AI_TRIPO_CANDIDATE", "AI_CANDIDATE", "BODY", "ARMOR",
        "RIG", "RENDER", "NEXIA_UPPER_ISLANDS",
    ):
        other = bpy.data.collections.get(name)
        if other:
            other.hide_viewport = True
    collection.hide_viewport = False
    new_collection.hide_viewport = False
    source.hide_set(False)
    reference_collection = bpy.data.collections.get("REFERENCE")
    if reference_collection:
        reference_collection.hide_viewport = False

    bpy.ops.object.select_all(action="DESELECT")
    focus = bpy.data.objects.get("NEXIA_HEAD_PART_03")
    focus.select_set(True)
    bpy.context.view_layer.objects.active = focus
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type == "VIEW_3D":
            space = area.spaces.active
            space.shading.type = "MATERIAL"
            space.shading.show_xray = False
            space.overlay.show_overlays = True

    scene = bpy.context.scene
    scene["nexia_head_uv_status"] = "MANUAL_ALIGNMENT_WORKSPACE_ONLY"
    scene["nexia_source_geometry_modified"] = False
    scene["nexia_copied_component_ranks"] = ",".join(map(str, SELECT_PARTS))
    scene["nexia_head_uv_notice"] = (
        "Initial UV projected by dominant normals; manual UV and geometry "
        "corrections needed for precise eye/visor/helmet alignment."
    )

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    old_save_version = bpy.context.preferences.filepaths.save_version
    try:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=dst)
    finally:
        bpy.context.preferences.filepaths.save_version = old_save_version

    print("NEXIA_HEAD_UV_WORKSPACE_OK")
    print(f"Source Blender file NOT saved: {src}")
    print(f"Separate UV workspace saved: {dst}")
    print(f"Head vertices on independent editable parts: {hidden_count}")
    print("Copied head pieces are editable; original geometry unchanged.")
    print("Source correction model is masked only in the separate workspace.")
    print("UV locations are starting values, NOT final image alignment.")


if __name__ == "__main__":
    main()
