# Submission kit — Haunt Me a Treat

Official requirements (rivehalloweenchallenge/guidelines): must use the Rive CLI, GPU Canvas, or both
(both + Scripting/Data Binding/State Machines scores higher) · short description naming the features ·
video of the project in action **showing the CLI agent workflow / RML and work in the Rive Editor** ·
Rive link **or embedded URL** · new work · social post tagging @rive_app (X, LinkedIn or Instagram),
30+ s walkthrough, #rivehalloweenchallenge.
Judges: Adam Plouff (Battleaxe), Mayte CG (visual/motion/UI), Mike Sunday (storytelling @ Rive).

> Lines marked **[IF]** are only true once that piece is in the exported file. Delete them otherwise.
> Never claim something the judges can't see.

## Title (Contra post)

**Haunt Me a Treat — your real face is the ghost costume 👻**

## Post text (paste as is, then fix the links)

Put on the sheet. Your webcam brings it to life.

Haunt Me a Treat is a trick-or-treat night you play with your real face. Open your mouth and the sheet gasps, frown and the eye holes turn mean, blink and they blink. Then go door to door:

🧓 a deaf granny who only answers if you SHOUT
🧒 a scared kid you must win over with a smile (scare him and he cries)
😐 a neighbor who has seen it all — show him your scariest face
👹 and finally, a kid in a monster mask knocking on YOUR door. Scare him, or lose your candy.

And then… don't look at your reflection. 🪞

**How it's built**
• **Rive State Machine** runs the whole night: 4 doors, hold timers, fail states, the ending — all thresholds live in Rive, not in code.
• **Data Binding**: 12 face values (jaw, smile, brows, blinks, gaze, head pose, a combined scare score) stream into a Rive View Model every frame. MediaPipe reads your face locally; a 2.5 s neutral calibration adapts every threshold to *your* face.
• **Luau scripting** for the game counters **[IF]** and the shader driver.
• **[IF] GPU Canvas (WGSL)**: one custom shader paints the night — a porch lamp that flickers harder the scarier you are, moonlight dust, mist that parts around the sheet, and a blood-red reveal driven by the State Machine.
• **[IF] Rive CLI + RML**: an agent wrote [component] in RML with the CLI's live preview, `rive --screenshot`/`--data` to test door states headless, then I refined it by hand in the Editor.
• Night porches rendered in Blender; characters from Open Peeps (CC0), rigged and animated by hand in Rive.
• The webcam never leaves your browser. Nothing is uploaded or stored.

▶️ Play (webcam, or mouse/keyboard if you have no camera): https://faadil1.github.io/Haunt-me-a-treat/
▶️ [IF] Rive link: **[PASTE]**
🎬 Process video: **[PASTE]**

Best with headphones. ⚠️ Jump scares & flashing lights.

#rivehalloweenchallenge @rive_app

## Social post (X / LinkedIn / Threads — must tag @rive_app)

My real face is the ghost costume. 👻
I built a trick-or-treat night in @rive_app that you play with your webcam: shout at granny, smile at the scared kid, scare the monster at your door.
Then don't look at your reflection.
Play: https://faadil1.github.io/Haunt-me-a-treat/
#rivehalloweenchallenge

## 30-second video (shot list)

Split screen the whole time: **your face (left) | the ghost (right)**. Headphones-level sound.

| Time | Shot | On-screen text |
|---|---|---|
| 0–3 s | Black. Typewriter intro, then you pull a face and the ghost copies it instantly. | "My real face is the ghost costume." |
| 3–8 s | Granny: you SHOUT, the sheet's mouth opens wide, she gives candy. | "Shout." |
| 8–12 s | Scared kid: you smile, the ghost smiles. | "Smile." |
| 12–17 s | Neighbor + monster kid: your scariest face, the porch lamp flickers, he runs off screaming. | "Scare." |
| 17–25 s | The reveal: the sheet slides off, only the eyes remain and still blink with you. Mirror: your reflection smiles… you don't. The kid behind you. Flash. | (no text) |
| 25–30 s | Souvenir card, then the Rive editor State Machine for 2 s. | "Made with Rive · State Machine · Data Binding · GPU Canvas" |

## Process video (Human Touch, 1–2 min, real time or sped up)

1. The Rive editor: State Machine graph, the View Model with the 12 face properties.
2. You animating by hand: the sheet falling on you, the sheet collapsing, a door opening.
3. Blender render of the porch plates.
4. The page debug panel (press D): your face values moving live.
5. [IF] The shader in the editor and the CLI publish command in the terminal.
