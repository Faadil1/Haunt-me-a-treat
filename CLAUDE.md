# CLAUDE.md — Haunt Me a Treat (construction Rive via le MCP Rive)

Projet pour le Rive Halloween Challenge 2026 sur Contra. Deadline : lundi 12 octobre 2026, 23 h 59 PDT.
Lis aussi `README.md` : il contient le contrat complet (noms des propriétés, états, seuils, assets).

## Le concept, en une phrase

*Mets le drap. Ton visage le fait vivre. Fais la tournée des bonbons.*
La webcam (MediaPipe, dans `bridge.js`) envoie des valeurs 0 → 1 au View Model Rive. Le fichier Rive porte
TOUTE la logique de jeu dans sa State Machine. La page hôte ne fait que fournir les valeurs.

## Outil : le MCP Rive

Connecté via `claude mcp add --transport http rive http://127.0.0.1:9791/mcp`.
L'application Rive de bureau doit être ouverte avec le fichier du projet.

Règles :
- Travaille **une phase à la fois** (voir plus bas). À la fin de chaque phase, résume ce que tu as créé et
  attends que l'utilisateur valide avant la suivante.
- Utilise **exactement** les noms du contrat. Ils sont sensibles à la casse. La page hôte vérifie chaque nom.
- Avant de modifier, interroge la hiérarchie existante. Ne supprime jamais un élément que tu n'as pas créé
  sans demander.
- **Human Touch** : le jury note le travail fait à la main dans l'éditeur. Tu construis la structure
  (View Model, liaisons, State Machine, états, transitions, conditions). L'utilisateur fait le rig du tissu,
  le timing et le polish des animations. Ne crée pas d'animations « finales » à sa place : crée des
  animations de placeholder clairement nommées `TODO_...` quand une transition en a besoin.
- **Unités des liaisons (vérifié en test réel)** : une liaison d'échelle attend un **facteur** (1.0 = 100 %,
  jamais 100) ; une liaison de rotation attend des **radians** (degrés × π/180). Une erreur d'unité sur
  l'échelle a rendu les trous des yeux gigantesques et masqué tout le reste. Avant d'exporter, vérifie
  qu'avec toutes les valeurs du View Model à 0, chaque propriété liée vaut exactement sa valeur de base.
- L'éditeur ne réévalue pas les liaisons hors du mode Play : le seul test fiable est l'export `.riv`
  chargé dans `index.html` (diagnostics : `?push=0`, `?gpu=0`, `?only=faceJaw,...`).
- Si un outil MCP échoue ou ne sait pas faire quelque chose (par exemple importer un SVG), dis-le et donne
  à l'utilisateur l'étape manuelle exacte.

## Phase 1 — Artboard et View Model (le contrat)

1. Artboard `Main`, 1920 × 1080, fond `#05040A`.
2. View Model `Costume` avec :
   - nombres : `faceJaw`, `faceSmile`, `faceBrowDown`, `faceBrowUp`, `faceBlinkL`, `faceBlinkR`,
     `faceLookX`, `faceLookY`, `faceHeadX`, `faceHeadY`, `faceRoll`, `faceScary`
   - booléens : `facePresent`, `webcamMode`
   - triggers : `calibrated` (page → Rive), `snapshot` (Rive → page)
   - nombres internes au jeu (optionnels mais utiles) : `candies`, `doorIndex`, `neighborScore`
3. Une **instance par défaut** de `Costume`, assignée à l'artboard `Main` (la page s'y lie avec autoBind).

Vérification : l'utilisateur exporte le `.riv`, le charge dans `index.html` (« Charger un .riv »),
ouvre le debug (touche D) : toutes les propriétés du contrat doivent avoir une coche verte.

## Phase 2 — Les assets

L'import de SVG n'est pas listé dans le MCP : l'utilisateur glisse lui-même dans l'éditeur
`assets/characters/drap.svg`, les 4 personnages, et les 5 PNG de `assets/backgrounds/`.
Ensuite, toi :
- vérifie que les groupes nommés sont bien là (`trou_oeil_G/D`, `pupille_G/D`, `bouche_fermee`,
  `bouche_ouverte`, `bouche_sourire`, `drap_corps`, `drap_ourlet`, `plis`, `sac`, et `face_*` pour chaque
  personnage) ;
- organise la hiérarchie : `Decor` (les 5 fonds, un seul visible à la fois), `Habitants` (les 4 personnages,
  placés dans l'embrasure de leur porte, enfants à ~70 % de la taille des adultes), `Drap` (au premier plan,
  centré en bas).

## Phase 3 — Le drap piloté par le visage (liaisons)

Lie les propriétés du View Model aux objets du drap :
- `pupille_G` / `pupille_D` : position X ← `faceLookX` (± 10 px), Y ← `faceLookY` (± 8 px)
- `trou_oeil_G` : échelle Y ← 1 − 0,9 × `faceBlinkL` ; `trou_oeil_D` : échelle Y ← 1 − 0,9 × `faceBlinkR`
- `trou_oeil_G/D` : échelle X et Y × (1 + 0,3 × `faceBrowUp`) ; rotation ← ± 15° × `faceBrowDown`
  (sens opposés à gauche et à droite, pour un regard méchant)
- `bouche_ouverte` : opacité ← `faceJaw` ; échelle Y ← 0,6 + 0,6 × `faceJaw`
- `bouche_sourire` : opacité ← `faceSmile` × (1 − `faceJaw`)
- `bouche_fermee` : opacité ← 1 − max(`faceJaw`, `faceSmile`)
- groupe `Drap` : rotation ← `faceRoll` × 0,9 ; position X ← `faceHeadX` × 120 ; position Y ← `faceHeadY` × 60
- si `facePresent` est faux : le drap flotte doucement (animation d'attente `TODO_idle_float`)

Utilise les convertisseurs de data binding de Rive pour les opérations (multiplier, inverser, borner).
Si une formule n'est pas faisable telle quelle, propose l'équivalent le plus proche.

## Phase 4 — La State Machine `Tournee`

Une couche `Drap` (toujours active, les liaisons ci-dessus) et une couche `Tournee` :

| État | Fond visible | Entrée | Sortie |
|---|---|---|---|
| `Attente` | `street` | — | trigger `calibrated` → `Enfiler` |
| `Enfiler` | `street` | anim `TODO_drap_tombe` | fin d'anim → `Porte1` |
| `Porte1` (mamie, `face_Old`) | `porch_1_mamie` | — | `faceJaw > 0.6` → `Porte1_Tient` ; après 12 s → `Porte1_Ferme` |
| `Porte1_Tient` (`face_Awe`) | idem | — | après 0,5 s → `Porte1_Bonbon` ; `faceJaw < 0.6` → `Porte1` |
| `Porte1_Bonbon` (`face_SmileBig`) | idem | `candies` + 1 | après 1,3 s → `Porte2` |
| `Porte1_Ferme` (`face_Concerned`) | idem | — | après 1,2 s → `Porte2` |
| `Porte2` (enfant, `face_Cute`) | `porch_2_enfant` | — | `faceSmile > 0.6` ET `faceJaw < 0.4` → `Porte2_Tient` ; `faceScary > 0.7` → `Porte2_Pleure` ; 12 s → `Porte2_Ferme` |
| `Porte2_Tient` (`face_Smile`) | idem | — | 0,5 s → `Porte2_Bonbon` ; condition perdue → `Porte2` |
| `Porte2_Bonbon` (`face_Smile`) | idem | `candies` + 1 | 1,3 s → `Porte3` |
| `Porte2_Pleure` (`face_Fear`) | idem | — | 1,6 s → `Porte3` |
| `Porte3` (voisin, `face_Tired`) | `porch_3_voisin` | — | `faceScary > 0.6` → `Porte3_Tient` ; 12 s → `Porte3_Ferme` |
| `Porte3_Tient` (`face_Suspicious`) | idem | — | 0,5 s → `Porte3_Note` ; condition perdue → `Porte3` |
| `Porte3_Note` (`face_Awe`) | idem | `neighborScore` ← `faceScary` × 10 ; `candies` + 1 | 1,5 s → `Fin` |
| `Fin` (enfant déguisé, `face_Monster`) | `porch_4_chezmoi` | — | `faceScary > 0.7` → `Fin_Tient` ; 12 s → `Fin_Perdu` |
| `Fin_Tient` (`face_Hectic`) | idem | — | 0,5 s → `Fin_Gagne` ; condition perdue → `Fin` |
| `Fin_Gagne` (`face_Fear`, il s'enfuit) | idem | trigger `snapshot` | → `Carte` |
| `Fin_Perdu` (`face_Cheeky`, il prend un bonbon) | idem | `candies` − 1 | → `Carte` |
| `Carte` | `street` | affiche `candies` et `neighborScore` | trigger `calibrated` → `Enfiler` (rejouer) |

Pour chaque état : rends visible le bon fond et le bon visage (opacité 1, les autres 0).
Les « 12 s » et « 0,5 s » sont des transitions avec temps de sortie ou des timelines de durée fixe.

## Phase 5 — Mode souris (lien Rive public sans webcam)

Quand `webcamMode` est faux :
- Listener « pointer down » sur la bouche du drap → anime `faceJaw` vers 1 (relâcher → 0)
- Listener « hover » sur les joues → `faceSmile` vers 1
- Listener « pointer down » sur le haut du drap → `faceScary` et `faceBrowDown` vers 1
- Texte d'indice visible : « Clique la bouche pour crier », etc.

## Phase 6 — GPU Canvas (shaders WGSL)

Quand l'utilisateur le demande, avec les shaders fournis dans `shaders/` (à venir) : brume au sol,
halo de la lampe de porche, lumière de lune sur le tissu. Utilise les outils MCP de scripts et shaders,
recompile, lis la console et corrige les erreurs.

## Après chaque phase

1. Résume ce que tu as fait.
2. Demande à l'utilisateur d'exporter le `.riv` dans `assets/rive/haunt.riv` et de le tester dans
   `index.html`.
3. Propose un commit sur une branche dédiée avec un message clair.
