# HAUNT ME A TREAT (titre provisoire)

*Mets le drap. Ton visage le fait vivre. Fais la tournée des bonbons.*

Rive Halloween Challenge 2026 (Contra). Deadline : lundi 12 octobre, 23 h 59 PDT, soit mardi 13 octobre, 2 h 59 heure de Gatineau.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | La page : canvas Rive, boutons, calibrage, panneau debug (touche D) |
| `bridge.js` | Webcam → MediaPipe → valeurs 0–1 calibrées → View Model Rive |

Ouvre `index.html` directement dans Edge ou Chrome. Sans fichier `.riv`, la page affiche un **aperçu** (drap dessiné en code et simulateur de la tournée) qui sert à régler les seuils. Avec « Charger un .riv », ton fichier prend le relais et la page vérifie le contrat : une coche verte par propriété trouvée, une croix rouge par propriété manquante.

## Le contrat Rive

Dans l'éditeur Rive :

1. Crée un **View Model** (par exemple `Costume`).
2. Assigne-le à l'**artboard par défaut** et crée une **instance par défaut**. La page s'y lie automatiquement.
3. Ajoute exactement ces propriétés. Les noms sont sensibles à la casse.

### Nombres (la page écrit, à chaque image)

| Propriété | Valeurs | Sert à |
|---|---|---|
| `faceJaw` | 0 → 1 | le tissu se creuse à la bouche |
| `faceSmile` | 0 → 1 | le tissu sourit |
| `faceBrowDown` | 0 → 1 | trous des yeux inclinés, regard méchant |
| `faceBrowUp` | 0 → 1 | trous des yeux agrandis, surprise |
| `faceBlinkL` | 0 → 1 | trou de l'œil gauche qui se ferme |
| `faceBlinkR` | 0 → 1 | trou de l'œil droit qui se ferme |
| `faceLookX` | -1 → 1 | pupilles dans les trous, gauche/droite |
| `faceLookY` | -1 → 1 | pupilles dans les trous, haut/bas |
| `faceHeadX` | -1 → 1 | le drap se déplace |
| `faceHeadY` | -1 → 1 | le drap se déplace |
| `faceRoll` | degrés (env. -30 → 30) | le drap s'incline |
| `faceScary` | 0 → 1 | score « effrayant » combiné |

Toutes les valeurs sont **déjà calibrées sur le visage du joueur** : 0 = son visage neutre, 1 = son expression la plus forte. Tes seuils dans Rive fonctionnent donc pour tout le monde.

### Booléens (la page écrit)

| Propriété | Sens |
|---|---|
| `facePresent` | un visage est détecté. À faux, le drap peut « flotter seul » |
| `webcamMode` | vrai si la webcam pilote, faux en mode souris |

### Triggers

| Trigger | Sens | Quand |
|---|---|---|
| `calibrated` | page → Rive | le calibrage est fini : joue l'animation « le drap tombe sur toi » |
| `snapshot` | Rive → page | demande la capture de la carte souvenir (à déclencher au meilleur moment de la grimace finale) |

## La State Machine

C'est elle qui porte toute la logique de jeu : c'est ce que le jury doit voir dans l'éditeur. La page ne fait que fournir les valeurs.

**Couche 1, le drap (toujours active).** Des Blend States 1D ou des liaisons directes :
- `faceJaw` et `faceSmile` → forme de la bouche (mesh du tissu)
- `faceBlinkL` et `faceBlinkR` → hauteur de chaque trou d'œil
- `faceBrowDown` et `faceBrowUp` → inclinaison et taille des trous
- `faceLookX` et `faceLookY` → pupilles
- `faceHeadX`, `faceHeadY` et `faceRoll` → position et rotation du drap, avec un retard de tissu (bones en chaîne)

**Couche 2, la tournée.** Les conditions de transition portent sur les propriétés ci-dessus. Les seuils sont ceux du simulateur, à ajuster si besoin.

| État | Passe à l'état suivant si… | Sinon |
|---|---|---|
| Enfiler | trigger `calibrated` | — |
| Porte 1, la mamie sourde | `faceJaw > 0.6` tenu 0,5 s | 12 s → la porte se ferme |
| Porte 2, l'enfant peureux | `faceSmile > 0.6` et `faceJaw < 0.4` tenu 0,5 s | `faceScary > 0.7` → il pleure, pas de bonbon |
| Porte 3, le voisin blasé | `faceScary > 0.6` tenu 0,5 s → note sur 10 | 12 s → la porte se ferme |
| Fin : un enfant déguisé frappe chez toi | `faceScary > 0.7` tenu 0,5 s → il s'enfuit, ton sac est sauf | 12 s → il repart avec un de tes bonbons |
| Carte souvenir | trigger `snapshot` | — |

Pour le « tenu 0,5 s » : un état intermédiaire « en train de… » avec une transition de sortie après 500 ms, et un retour arrière si la condition tombe.

## Le lien Rive public (mode sans webcam)

Le règlement exige un lien Rive jouable, et un lien Rive seul ne lance pas la webcam. Le fichier doit donc être jouable seul, à la souris :
- des **Listeners** sur la bouche, les sourcils et le drap entier (maintenir le clic = crier, survoler les joues = sourire, etc.) qui animent les mêmes états ;
- `webcamMode` à faux par défaut, ce qui affiche les indices « clique la bouche pour crier ».

Le même fichier, piloté par deux entrées différentes : c'est un argument pour la soumission.

## Les assets (`assets/`)

**Arrière-plans** (`assets/backgrounds/`, 1920×1080, rendus Blender de nuit, trait « craie ») :

| Fichier | Scène |
|---|---|
| `street.png` | la rue : écran titre et transitions entre les portes |
| `porch_1_mamie.png` | porte 1 |
| `porch_2_enfant.png` | porte 2 |
| `porch_3_voisin.png` | porte 3 |
| `porch_4_chezmoi.png` | la fin : ta maison |

**Personnages** (`assets/characters/`, SVG à importer dans Rive). Chaque fichier contient les 4 visages empilés dans des groupes nommés. Le premier est visible, les autres sont à opacité 0. Chaque état de la State Machine montre le bon visage.

| Fichier | Visages | Quand |
|---|---|---|
| `drap.svg` | `trou_oeil_G/D`, `pupille_G/D`, `bouche_fermee`, `bouche_ouverte`, `bouche_sourire`, `drap_corps`, `drap_ourlet`, `plis`, `sac` | toujours, piloté par le visage |
| `mamie.svg` | `face_Old` | elle attend |
| | `face_Awe` | « Hein ?! » quand tu cries |
| | `face_Concerned` | elle n'entend pas, la porte se ferme |
| | `face_SmileBig` | elle donne le bonbon |
| `enfant_peureux.svg` | `face_Cute` | il attend |
| | `face_Smile` | tu lui souris, il donne le bonbon |
| | `face_ConcernedFear` | début de peur |
| | `face_Fear` | tu lui as fait peur, il pleure |
| `voisin_blase.svg` | `face_Tired` | blasé |
| | `face_Suspicious` | il jauge ta grimace |
| | `face_Awe` | impressionné |
| | `face_Smile` | il donne le bonbon |
| `enfant_deguise.svg` | `face_Monster` | il vient te faire peur (masque) |
| | `face_Cheeky` | il se moque |
| | `face_Hectic` | il commence à flancher |
| | `face_Fear` | tu lui as fait peur, il s'enfuit |

Les enfants ont une tête agrandie : réduis-les à environ 70 % de la taille des adultes dans Rive pour qu'ils se lisent comme des enfants.

Pour régénérer ou changer le casting : `tools/compose_peeps.py` (dictionnaire `CAST`). Pour refaire les décors : `blender/render_plates.py`. Les deux scripts sont documentés en tête de fichier.

## Répartition du travail

| Qui | Quoi |
|---|---|
| **Toi (Human Touch)** | Dessin et rig du drap et des 4 personnages, portes, State Machine, animations, son, process filmé dans l'éditeur |
| **Blender** | Décor 3D de la rue et des porches, rendu en arrière-plans éclairés par la lune |
| **Claude** | Ce pont, les shaders WGSL (lune sur le tissu, brume, halos des porches), la carte souvenir animée, l'hébergement Cloudflare, la relecture du contrat |

## À faire

- [ ] Direction artistique et croquis du drap et des 4 personnages
- [ ] Fichier Rive v0 : View Model au contrat, le drap seul, couche 1 → tester avec « Charger un .riv »
- [ ] Les 4 portes et la couche 2
- [ ] Mode souris pour le lien Rive public
- [ ] Shaders GPU Canvas
- [ ] Arrière-plans Blender
- [ ] Son
- [ ] Carte souvenir (GIF)
- [ ] Hébergement, vidéo de process, post @rive_app, soumission
