"""
Assemble les personnages du jeu à partir d'Open Peeps (CC0, Pablo Stanley).

Pour chaque personnage : un gabarit « Standing » + plusieurs visages empilés dans un même SVG.
Chaque visage est un groupe nommé `face_<Nom>` ; le premier est visible, les autres ont opacity="0".
Dans Rive : importer le SVG, puis chaque état de la State Machine règle l'opacité du bon visage.

Usage : python3 compose_peeps.py "<dossier Flat Assets>" <dossier_sortie>
"""
import re
import sys
from pathlib import Path

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)

# Mise à l'échelle atome → gabarit Standing (mesurée sur les fichiers : x 0,2375, y 0,237)
SX, SY = 0.2375, 0.237

CAST = {
    # nom : (gabarit, retirer les accessoires ?, [visages : premier = neutre])
    'mamie':          ('peep-standing-8',  True,  ['Old', 'Awe', 'Concerned', 'Smile Big']),
    'enfant_peureux': ('peep-standing-16', False, ['Cute', 'Smile', 'Concerned Fear', 'Fear'], True),
    'voisin_blase':   ('peep-standing-30', False, ['Tired', 'Suspicious', 'Awe', 'Smile']),
    'enfant_deguise': ('peep-standing-11', False, ['Monster', 'Cheeky', 'Hectic', 'Fear'], True),
}


def face_paths(name):
    svg = (SRC / 'Separate Atoms' / 'face' / f'{name}.svg').read_text()
    inner = re.search(r'<g id="face/[^"]*"[^>]*>(.*)</g>\s*</svg>', svg, re.S).group(1)
    return inner


KID_HEAD = 1.35   # tête agrandie : proportions d'enfant


def kidify(svg):
    # agrandit le groupe Head autour du cou (bas-centre de la tête) et élargit le cadre vers le haut
    def head(m):
        x, y = float(m.group(1)), float(m.group(2))
        w, h = 473 * SX, 567 * SY
        cx, cy = w * 0.5, h * 0.92
        nx, ny = x - cx * (KID_HEAD - 1), y - cy * (KID_HEAD - 1)
        return f'<g id="Head"{m.group(3)}transform="translate({nx:.3f}, {ny:.3f}) scale({KID_HEAD})">'
    svg = re.sub(r'<g id="Head"( stroke-width="1" | )?transform="translate\(([-\d.]+), ([-\d.]+)\)">',
                 lambda m: head(type('M', (), {'group': lambda self, i: {1: m.group(2), 2: m.group(3), 3: m.group(1) or ' '}[i]})()), svg, count=1)
    m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg)
    w, h = float(m.group(1)), float(m.group(2))
    pad = 60
    svg = svg.replace(m.group(0), f'viewBox="{-pad/2} {-pad} {w+pad} {h+pad}"', 1)
    svg = re.sub(r'width="[\d.]+px" height="[\d.]+px"', f'width="{w+pad}px" height="{h+pad}px"', svg, count=1)
    return svg


def compose(key, template, strip_acc, faces, kid=False):
    svg = (SRC / 'Templates' / 'Standing' / f'{template}.svg').read_text()
    if kid:
        svg = kidify(svg)
    m = re.search(r'(<g id="face/[^"]*")([^>]*)>(.*?)</g>', svg, re.S)
    attrs = m.group(2)
    stack = []
    for i, f in enumerate(faces):
        slug = f.replace(' ', '')
        op = '' if i == 0 else ' opacity="0"'
        stack.append(f'<g id="face_{slug}"{op} transform="scale({SX},{SY})">{face_paths(f)}</g>')
    new_face = f'<g id="faces"{attrs}>' + ''.join(stack) + '</g>'
    svg = svg[:m.start()] + new_face + svg[m.end():]
    if strip_acc:
        svg = re.sub(r'<g id="accessories/[^"]*"[^>]*>.*?</g>', '', svg, count=1, flags=re.S)
    svg = re.sub(r'<title>.*?</title>', f'<title>{key}</title>', svg, count=1)
    (OUT / f'{key}.svg').write_text(svg)
    # une variante par visage, pour l'aperçu
    for i, f in enumerate(faces):
        slug = f.replace(' ', '')
        v = re.sub(r'(<g id="face_[^"]*")( opacity="0")?', lambda mm: mm.group(1) + ('' if mm.group(1).endswith(f'face_{slug}"') else ' opacity="0"'), svg)
        (OUT / 'preview').mkdir(exist_ok=True)
        (OUT / 'preview' / f'{key}__{slug}.svg').write_text(v)
    print('OK', key, faces)


for k, spec in CAST.items():
    compose(k, *spec)
