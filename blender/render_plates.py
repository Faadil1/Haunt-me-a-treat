"""
Haunt Me a Treat — rendu des arrière-plans de nuit à partir du City Kit Suburban de Kenney (CC0).

Usage (Blender 4.x/5.x, ou le module Python bpy) :
    blender -b -P render_plates.py -- <dossier_GLTF_Kenney> <dossier_sortie> [largeur] [hauteur] [samples]
    python3 render_plates.py <dossier_GLTF_Kenney> <dossier_sortie> [largeur] [hauteur] [samples]

Produit : porch_1_mamie.png, porch_2_enfant.png, porch_3_voisin.png, porch_4_chezmoi.png, street.png
Style : nuit bleue, fenêtres orangées, lune froide, contours noirs (Freestyle) pour coller au trait d'Open Peeps.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

argv = sys.argv
argv = argv[argv.index('--') + 1:] if '--' in argv else argv[1:]
KIT = Path(argv[0])
OUT = Path(argv[1]); OUT.mkdir(parents=True, exist_ok=True)
W = int(argv[2]) if len(argv) > 2 else 1920
H = int(argv[3]) if len(argv) > 3 else 1080
SAMPLES = int(argv[4]) if len(argv) > 4 else 48
ONLY = argv[5] if len(argv) > 5 else None

# ----------------------------------------------------------------------------
# Palette (encre + nuit). Couleurs en linéaire approximatif.
# ----------------------------------------------------------------------------
PAL = {
    '_defaultMat': (0.055, 0.065, 0.12),   # murs : bleu nuit
    'border':      (0.11, 0.115, 0.16),    # bordures
    'roof':        (0.025, 0.02, 0.045),   # toit : presque noir violacé
    'door':        (0.09, 0.045, 0.03),    # porte : bois sombre
    'ground':      (0.012, 0.018, 0.025),
    'path':        (0.06, 0.06, 0.075),
    'leaf':        (0.012, 0.03, 0.035),
    'trunk':       (0.03, 0.02, 0.018),
}
WINDOW_GLOW = (1.0, 0.42, 0.12)
INK = (0.55, 0.5, 0.72)   # trait « craie » pâle : un trait noir serait invisible sur la nuit


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = SAMPLES
    try:
        sc.cycles.use_denoising = True
    except Exception:
        pass
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0.0
    # monde : ciel nuit en dégradé
    world = bpy.data.worlds.new('Night'); sc.world = world
    world.use_nodes = True
    nt = world.node_tree; nt.nodes.clear()
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.03, 0.022, 0.06, 1)
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (0.002, 0.003, 0.012, 1)
    bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = 1.0
    out = nt.nodes.new('ShaderNodeOutputWorld')
    nt.links.new(tc.outputs['Window'], sep.inputs[0])
    nt.links.new(sep.outputs['Y'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    # contours encrés
    sc.render.use_freestyle = True
    sc.render.line_thickness_mode = 'ABSOLUTE'
    sc.render.line_thickness = max(1.5, W / 900)
    vl = sc.view_layers[0]
    vl.use_freestyle = True
    fs = vl.freestyle_settings
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
    ls.select_by_visibility = True
    ls.select_by_edge_types = True
    ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
    if ls.linestyle is None:
        ls.linestyle = bpy.data.linestyles.new('ink')
    ls.linestyle.color = INK
    ls.linestyle.thickness = max(1.5, W / 900)
    fs.crease_angle = math.radians(140)
    return sc


def flat_mat(name, color, emission=None, strength=0.0, rough=0.9):
    m = bpy.data.materials.get('HMT_' + name) or bpy.data.materials.new('HMT_' + name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    if emission:
        key = 'Emission Color' if 'Emission Color' in b.inputs else 'Emission'
        b.inputs[key].default_value = (*emission, 1)
        b.inputs['Emission Strength'].default_value = strength
    return m


def restyle(objs, windows_on=True):
    for o in objs:
        if o.type != 'MESH':
            continue
        for i, slot in enumerate(o.material_slots):
            n = slot.material.name if slot.material else '_defaultMat'
            base = n.split('.')[0]
            if base == 'window':
                slot.material = flat_mat('window_on' if windows_on else 'window_off',
                                         (0.25, 0.1, 0.03) if windows_on else (0.02, 0.025, 0.05),
                                         WINDOW_GLOW if windows_on else None, 6.0 if windows_on else 0)
            elif base in PAL:
                slot.material = flat_mat(base, PAL[base])
            else:
                slot.material = flat_mat('_defaultMat', PAL['_defaultMat'])


def load(name, loc=(0, 0, 0), rot_z=0.0, windows_on=True, restyle_as=None):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(KIT / f'{name}.glb'))
    new = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in new if o.parent is None]
    for r in roots:
        r.location = Vector(loc)
        r.rotation_euler[2] += rot_z
    if restyle_as:
        for o in new:
            if o.type == 'MESH':
                for slot in o.material_slots:
                    slot.material = flat_mat(restyle_as, PAL[restyle_as])
    else:
        restyle(new, windows_on)
    bpy.context.view_layer.update()
    return new


def door_frame(objs):
    """Centre, normale et hauteur de la porte d'entrée (pas du garage), en coordonnées monde.
    Les polygones du matériau 'door' sont regroupés par proximité ; on garde le groupe le plus
    « porte d'entrée » : le plus haut par rapport à sa largeur."""
    polys = []
    for o in objs:
        if o.type != 'MESH':
            continue
        mw = o.matrix_world
        names = [s.material.name if s.material else '' for s in o.material_slots]
        for p in o.data.polygons:
            if 'door' not in names[p.material_index]:
                continue
            n = (mw.to_3x3() @ p.normal).normalized()
            if abs(n.z) > 0.5:
                continue
            vs = [mw @ o.data.vertices[v].co for v in p.vertices]
            polys.append((mw @ p.center, n, p.area, vs))
    if not polys:
        return None
    clusters = []
    for pc in polys:
        for c in clusters:
            if min((pc[0] - q[0]).length for q in c) < 0.12:
                c.append(pc); break
        else:
            clusters.append([pc])
    def score(c):
        vs = [v for q in c for v in q[3]]
        h = max(v.z for v in vs) - min(v.z for v in vs)
        horiz = [Vector((v.x, v.y, 0)) for v in vs]
        w = max((a - b).length for a in horiz for b in horiz) or 1e-3
        return h / w, h
    best = max(clusters, key=lambda c: score(c)[0])
    center = sum((q[0] for q in best), Vector((0, 0, 0))) / len(best)
    nrm = sum((q[1] * q[2] for q in best), Vector((0, 0, 0)))
    nrm.z = 0
    return center, nrm.normalized(), score(best)[1]


def ground(size=400):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, 0))
    g = bpy.context.active_object
    g.data.materials.append(flat_mat('ground', PAL['ground']))
    coll = bpy.data.collections.get('NoInk') or bpy.data.collections.new('NoInk')
    if coll.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(coll)
    for c in g.users_collection:
        c.objects.unlink(g)
    coll.objects.link(g)
    ls = bpy.context.scene.view_layers[0].freestyle_settings.linesets[0]
    ls.select_by_collection = True
    ls.collection = coll
    ls.collection_negation = 'EXCLUSIVE'
    return g


def lights(target, normal):
    # lune : soleil froid, rasant, de côté
    bpy.ops.object.light_add(type='SUN', location=(0, 0, 10))
    moon = bpy.context.active_object
    moon.data.energy = 1.6
    moon.data.color = (0.55, 0.68, 1.0)
    moon.data.angle = math.radians(1.5)
    side = Vector((-normal.y, normal.x, 0))
    d = (normal * 0.6 + side * 0.8 + Vector((0, 0, 0.9))).normalized()
    moon.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    # lampe de porche chaude au-dessus de la porte
    bpy.ops.object.light_add(type='POINT', location=target + normal * 0.35 + Vector((0, 0, 0.30)))
    porch = bpy.context.active_object
    porch.data.energy = 5
    porch.data.color = (1.0, 0.55, 0.22)
    porch.data.shadow_soft_size = 0.05
    # léger contre-jour violet pour détacher les silhouettes
    bpy.ops.object.light_add(type='AREA', location=target - normal * 3 + Vector((0, 0, 3)))
    rim = bpy.context.active_object
    rim.data.energy = 12; rim.data.color = (0.5, 0.35, 1.0); rim.data.size = 4


def camera(target, normal, dist=1.45, height=0.14, lens=32, look_up=0.17):
    loc = target + normal * dist + Vector((0, 0, height))
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.active_object
    cam.data.lens = lens
    aim = target + Vector((0, 0, look_up))
    cam.rotation_euler = (aim - loc).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam
    return cam


def render(path):
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    print('RENDU', path)


PORCHES = [
    ('porch_1_mamie', 'house_type05'),
    ('porch_2_enfant', 'house_type12'),
    ('porch_3_voisin', 'house_type15'),
    ('porch_4_chezmoi', 'house_type08'),
]

for out_name, house in PORCHES:
    if ONLY and ONLY != out_name:
        continue
    reset()
    objs = load(house)
    df = door_frame(objs)
    if not df:
        print('porte introuvable pour', house); continue
    center, normal, door_h = df
    ground()
    lights(center, normal)
    camera(center, normal)
    render(OUT / f'{out_name}.png')

# Plan large de la rue (écran titre / transitions)
if not ONLY or ONLY == 'street':
    reset()
    houses = ['house_type05', 'house_type12', 'house_type09', 'house_type15', 'house_type08']
    spacing = 2.3
    FACE = Vector((0, -1, 0))          # toutes les façades regardent la caméra
    for i, h in enumerate(houses):
        objs = load(h, loc=(i * spacing - spacing * 2, 0, 0), windows_on=(i != 2))
        df = door_frame(objs)
        if df:
            n = df[1]
            ang = math.atan2(FACE.y, FACE.x) - math.atan2(n.y, n.x)
            for o in objs:
                if o.parent is None:
                    o.rotation_euler[2] += ang
        bpy.context.view_layer.update()
    ground()
    for i in range(-3, 3):
        for o in load('tree_small', restyle_as='leaf'):
            if o.parent is None:
                o.location = Vector((i * spacing + spacing / 2, -1.25, 0))
    center = Vector((0, 0, 0.45))
    lights(center, FACE)
    cam = camera(center, FACE, dist=5.6, height=0.9, lens=21, look_up=0.35)
    bpy.context.view_layer.update()
    m = cam.matrix_world.to_3x3()
    fwd, up, right = m @ Vector((0, 0, -1)), m @ Vector((0, 1, 0)), m @ Vector((1, 0, 0))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.1, location=cam.location + fwd * 40 + up * 8 - right * 13)
    disc = bpy.context.active_object
    disc.data.materials.append(flat_mat('moon', (0.8, 0.85, 1.0), (0.85, 0.9, 1.0), 4.0))
    render(OUT / 'street.png')
