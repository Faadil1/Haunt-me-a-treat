// Haunt Me a Treat — pont visage (MediaPipe) → Rive (data binding)
// Script classique : fonctionne en ouvrant index.html directement (file://) ou hébergé.
(() => {
  'use strict';

  // =====================================================================
  // CONTRAT RIVE — noms exacts des propriétés du View Model par défaut
  // (voir README.md). La page écrit ces valeurs à chaque image.
  // =====================================================================
  const CONTRACT = {
    numbers: {
      faceJaw: 'bouche ouverte, 0 → 1',
      faceSmile: 'sourire, 0 → 1',
      faceBrowDown: 'sourcils froncés, 0 → 1',
      faceBrowUp: 'sourcils levés, 0 → 1',
      faceBlinkL: 'œil gauche fermé, 0 → 1',
      faceBlinkR: 'œil droit fermé, 0 → 1',
      faceLookX: 'regard horizontal, -1 (gauche) → 1 (droite)',
      faceLookY: 'regard vertical, -1 (haut) → 1 (bas)',
      faceHeadX: 'position de la tête, -1 → 1',
      faceHeadY: 'position de la tête, -1 → 1',
      faceRoll: 'inclinaison de la tête, en degrés',
      faceScary: 'score « effrayant », 0 → 1',
    },
    booleans: {
      facePresent: 'un visage est détecté',
      webcamMode: 'vrai si la webcam pilote, faux en mode souris/clavier',
    },
    triggersIn: { calibrated: 'la page a fini le calibrage (le drap est posé)' },
    triggersOut: { snapshot: 'Rive demande une capture pour la carte souvenir' },
  };

  const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

  const $ = (id) => document.getElementById(id);
  // Interrupteurs de diagnostic (dans l'URL) : ?gpu=0 (GPU Canvas coupé), ?push=0 (aucune valeur envoyée à Rive)
  const Q = new URLSearchParams(location.search);
  const OPT = { gpu: Q.get('gpu') !== '0', push: Q.get('push') !== '0',
    only: Q.get('only') ? Q.get('only').split(',').map((x) => x.trim()) : null };   // ?only=faceJaw,faceSmile
  const logEl = $('log');
  const log = (m) => { logEl.textContent = `[${new Date().toLocaleTimeString()}] ${m}\n` + logEl.textContent; };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // ---------------------------------------------------------------------
  // Signaux bruts → calibrés → lissés
  // ---------------------------------------------------------------------
  const RAW_KEYS = ['jaw', 'smile', 'browDown', 'browUp', 'blinkL', 'blinkR', 'sneer', 'stretch'];
  // amplitude minimale attendue au-dessus du neutre (tes tests : cri max ≈ 0,38, grimace ≈ 0,34)
  const MIN_RANGE = { jaw: 0.22, smile: 0.30, browDown: 0.20, browUp: 0.25, blinkL: 0.45, blinkR: 0.45, sneer: 0.15, stretch: 0.15 };
  const raw = Object.fromEntries(RAW_KEYS.map((k) => [k, 0]));
  const cal = { done: false, base: Object.fromEntries(RAW_KEYS.map((k) => [k, 0])), peak: Object.fromEntries(RAW_KEYS.map((k) => [k, 0])) };
  const out = {
    faceJaw: 0, faceSmile: 0, faceBrowDown: 0, faceBrowUp: 0, faceBlinkL: 0, faceBlinkR: 0,
    faceLookX: 0, faceLookY: 0, faceHeadX: 0, faceHeadY: 0, faceRoll: 0, faceScary: 0,
    facePresent: false, webcamMode: false,
  };
  const geo = { lookX: 0, lookY: 0, headX: 0, headY: 0, roll: 0 };

  function norm(k){
    const base = cal.base[k];
    const range = Math.max(MIN_RANGE[k], cal.peak[k] - base);
    return clamp((raw[k] - base) / range);
  }
  const ema = (cur, target, k) => cur + (target - cur) * k;

  function computeOut(){
    const n = Object.fromEntries(RAW_KEYS.map((k) => [k, cal.done ? norm(k) : raw[k]]));
    const t = {
      faceJaw: n.jaw, faceSmile: n.smile, faceBrowDown: n.browDown, faceBrowUp: n.browUp,
      faceBlinkL: n.blinkL, faceBlinkR: n.blinkR,
      faceScary: clamp(n.browDown * 0.45 + n.jaw * 0.35 + n.sneer * 0.4 + n.stretch * 0.2),
      faceLookX: geo.lookX, faceLookY: geo.lookY, faceHeadX: geo.headX, faceHeadY: geo.headY, faceRoll: geo.roll,
    };
    for (const k in t){
      const fast = k.startsWith('faceBlink') ? 0.7 : 0.4;   // les clignements doivent rester vifs
      out[k] = ema(out[k], t[k], fast);
    }
  }

  // ---------------------------------------------------------------------
  // Entrées de secours (clavier + boutons maintenus)
  // ---------------------------------------------------------------------
  const held = new Set();
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'd'){ toggleDebug(); return; }
    held.add(k);
  });
  addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()));
  document.querySelectorAll('.hold').forEach((b) => {
    const k = b.dataset.key;
    b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); held.add(k); });
    b.addEventListener('pointerup', () => held.delete(k));
    b.addEventListener('pointercancel', () => held.delete(k));
  });
  function applyHeld(){
    if (!held.size) return false;
    const want = { faceJaw: held.has('c') ? 1 : 0, faceSmile: held.has('s') ? 1 : 0, faceBrowDown: held.has('g') ? 0.9 : 0, faceScary: held.has('g') ? 0.95 : 0 };
    for (const k in want) out[k] = ema(out[k], want[k], 0.35);
    out.faceBlinkL = ema(out.faceBlinkL, 0, 0.5); out.faceBlinkR = ema(out.faceBlinkR, 0, 0.5);
    return true;
  }

  // ---------------------------------------------------------------------
  // Webcam + MediaPipe
  // ---------------------------------------------------------------------
  const video = $('video');
  let landmarker = null, lastVideoT = -1, frames = 0;

  async function startCamera(){
    $('camBtn').disabled = true; $('camBtn').textContent = 'Chargement…';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
      video.srcObject = stream; await video.play();
      const { FaceLandmarker, FilesetResolver } = await import(`${MP}/vision_bundle.mjs`);
      const fileset = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
      const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true });
      try { landmarker = await FaceLandmarker.createFromOptions(fileset, opts('GPU')); log('MediaPipe chargé (GPU)'); }
      catch { landmarker = await FaceLandmarker.createFromOptions(fileset, opts('CPU')); log('MediaPipe chargé (CPU)'); }
      out.webcamMode = true;
      $('camBtn').textContent = 'Recalibrer';
      $('camBtn').disabled = false;
      $('camBtn').onclick = calibrate;
      calibrate();
    } catch (err){
      log(`webcam indisponible : ${err.name || ''} ${err.message || err} — le mode boutons/clavier reste disponible`);
      $('camBtn').textContent = 'Webcam indisponible'; $('camBtn').disabled = true;
      $('prompt').textContent = 'Pas de webcam ? Utilise les boutons Crier, Sourire, Grimacer.';
    }
  }
  $('camBtn').onclick = startCamera;

  function readFace(now){
    if (!landmarker || video.readyState < 2 || video.currentTime === lastVideoT) return;
    lastVideoT = video.currentTime;
    const res = landmarker.detectForVideo(video, now);
    frames++;
    out.facePresent = !!(res.faceLandmarks && res.faceLandmarks.length);
    if (!out.facePresent) return;
    const s = Object.fromEntries(res.faceBlendshapes[0].categories.map((c) => [c.categoryName, c.score]));
    const avg = (...k) => k.reduce((a, x) => a + (s[x] || 0), 0) / k.length;
    // miroir : l'œil gauche de l'image est ton œil droit
    raw.jaw = s.jawOpen || 0;
    raw.smile = avg('mouthSmileLeft', 'mouthSmileRight');
    raw.browDown = avg('browDownLeft', 'browDownRight');
    raw.browUp = s.browInnerUp || 0;
    raw.blinkL = s.eyeBlinkRight || 0;
    raw.blinkR = s.eyeBlinkLeft || 0;
    raw.sneer = avg('noseSneerLeft', 'noseSneerRight');
    raw.stretch = avg('mouthStretchLeft', 'mouthStretchRight');
    if (cal.done) for (const k of RAW_KEYS) cal.peak[k] = Math.max(cal.peak[k] * 0.9997, raw[k]);

    const lm = res.faceLandmarks[0];
    const P = (i) => lm[i];
    // regard : position de l'iris entre les coins de l'œil
    const gaze = (iris, a, b, top, bot) => {
      const ix = (P(iris).x - P(a).x) / ((P(b).x - P(a).x) || 1e-3);
      const iy = (P(iris).y - P(top).y) / ((P(bot).y - P(top).y) || 1e-3);
      return [ix, iy];
    };
    const g1 = gaze(468, 33, 133, 159, 145), g2 = gaze(473, 362, 263, 386, 374);
    geo.lookX = clamp(-((g1[0] + g2[0]) / 2 - 0.5) * 4, -1, 1);
    geo.lookY = clamp(((g1[1] + g2[1]) / 2 - 0.5) * 4, -1, 1);
    const nose = P(1);
    geo.headX = clamp(-(nose.x - 0.5) * 2.5, -1, 1);
    geo.headY = clamp((nose.y - 0.5) * 2.5, -1, 1);
    const L = P(33), R = P(263);
    geo.roll = -Math.atan2(R.y - L.y, R.x - L.x) * 180 / Math.PI;
  }

  // ---------------------------------------------------------------------
  // Calibrage : 2,5 s de visage neutre
  // ---------------------------------------------------------------------
  let calibrating = false;
  function calibrate(){
    if (!landmarker) return;
    calibrating = true; cal.done = false;
    const sums = Object.fromEntries(RAW_KEYS.map((k) => [k, 0])); let n = 0;
    const t0 = performance.now(), DUR = 2500;
    $('cal').style.display = 'flex';
    const tick = () => {
      if (out.facePresent){ for (const k of RAW_KEYS) sums[k] += raw[k]; n++; }
      const p = (performance.now() - t0) / DUR;
      $('ring').style.setProperty('--p', Math.min(100, p * 100) + '%');
      if (p < 1){ requestAnimationFrame(tick); return; }
      if (n < 10){ log('calibrage : visage introuvable, on recommence'); calibrate(); return; }
      for (const k of RAW_KEYS){ cal.base[k] = sums[k] / n; cal.peak[k] = cal.base[k]; }
      cal.done = true; calibrating = false;
      $('cal').style.display = 'none';
      log('calibrage OK — neutre : ' + RAW_KEYS.map((k) => `${k}=${cal.base[k].toFixed(2)}`).join(' '));
      fireIn('calibrated');
      $('prompt').textContent = vmi ? '' : 'Le drap est sur toi. Bouge, cligne, fais des grimaces.';
    };
    requestAnimationFrame(tick);
  }

  // ---------------------------------------------------------------------
  // Rive : chargement d'un .riv et liaison au contrat
  // ---------------------------------------------------------------------
  let r = null, vmi = null, smInputs = {};
  const bound = { numbers: {}, booleans: {}, triggersIn: {} };
  const lastSent = {};

  async function loadRiv(buffer, label){
    if (!window.rive){ log('runtime Rive introuvable (pas de connexion ?)'); return; }
    if (r){ r.cleanup(); r = null; }
    const canvas = $('riveCanvas');
    canvas.style.display = 'block'; $('previewCanvas').style.display = 'none';
    r = new rive.Rive({
      buffer, canvas,
      stateMachines: $('smName').value.trim() || 'Tournee',
      autoplay: true, autoBind: true,
      enableGPUCanvas: OPT.gpu, useOffscreenRenderer: false,
      assetLoader: (asset, bytes) => {
        // diagnostic : un asset embarqué arrive avec ses octets ; sinon il est hébergé (CDN) ou référencé
        const kind = asset.isImage ? 'image' : asset.isFont ? 'police' : asset.isAudio ? 'son' : 'asset';
        const how = bytes && bytes.length ? `embarqué (${Math.round(bytes.length / 1024)} Ko)` : (asset.cdnUuid ? 'hébergé sur le CDN Rive' : 'RÉFÉRENCÉ : non inclus dans le .riv');
        log(`${kind} « ${asset.name} » : ${how}`);
        return false;   // laisse le runtime charger normalement
      },
      layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.Center }),
      onLoad: () => {
        r.resizeDrawingSurfaceToCanvas();
        const wanted = $('smName').value.trim() || 'Tournee';
        const names = r.stateMachineNames || [];
        if (names.length && !names.includes(wanted)){
          log(`State Machine « ${wanted} » introuvable, je prends « ${names[0]} »`);
          $('smName').value = names[0];
          return loadRiv(buffer, label);
        }
        vmi = r.viewModelInstance;
        bindContract(label);
        log(`options : GPU Canvas ${OPT.gpu ? 'activé' : 'COUPÉ'}, envoi des valeurs ${OPT.push ? (OPT.only ? 'seulement ' + OPT.only.join(', ') : 'activé') : 'COUPÉ'}`);
      },
      onLoadError: (e) => log(`erreur de chargement Rive : ${e && e.data || e}`),
      onStateChange: (e) => {
        const states = (e && e.data || []).filter((x) => x && x !== 'Any State' && x !== 'Entry' && x !== 'Exit');
        if (states.length){ log(`état → ${states.join(', ')}`); $('mode').textContent = `Rive · ${states[states.length - 1]}`; }
      },
    });
  }
  $('rivFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    loadRiv(await f.arrayBuffer(), f.name);
  };
  addEventListener('resize', () => r && r.resizeDrawingSurfaceToCanvas());

  function bindContract(label){
    const lines = [`Fichier : ${label}`, `State Machines : ${(r.stateMachineNames || []).join(', ') || '—'}`];
    if (!vmi){
      lines.push('<span class="bad">Aucun View Model lié.</span> Crée un View Model, assigne-le à l\'artboard par défaut, et coche « default instance ».');
      $('contract').innerHTML = lines.join('\n'); $('mode').textContent = 'Rive (sans View Model)'; return;
    }
    const mark = (ok, name) => `${ok ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'} ${name}`;
    for (const k in CONTRACT.numbers){ const p = vmi.number(k); bound.numbers[k] = p; lines.push(mark(!!p, `${k} (nombre)`)); }
    for (const k in CONTRACT.booleans){ const p = vmi.boolean(k); bound.booleans[k] = p; lines.push(mark(!!p, `${k} (booléen)`)); }
    for (const k in CONTRACT.triggersIn){ const p = vmi.trigger(k); bound.triggersIn[k] = p; lines.push(mark(!!p, `${k} (trigger page → Rive)`)); }
    for (const k in CONTRACT.triggersOut){
      const p = vmi.trigger(k);
      lines.push(mark(!!p, `${k} (trigger Rive → page)`));
      if (p) p.on(() => onRiveTrigger(k));
    }
    smInputs = {};
    const sm = r.stateMachineNames && r.stateMachineNames[0];
    const inputs = (sm && r.stateMachineInputs(sm)) || [];
    for (const i of inputs) smInputs[i.name] = i;
    lines.push(inputs.length ? `Entrées de State Machine : ${inputs.map((i) => i.name).join(', ')}` : 'Entrées de State Machine : aucune (logique 100 % View Model)');
    $('contract').innerHTML = lines.join('\n');
    $('mode').textContent = 'Rive';
    log(`Rive chargé : ${label}`);
    if (cal.done) fireIn('calibrated');
  }
  function fireIn(name){
    const t = bound.triggersIn[name]; if (t) t.trigger();
    const i = smInputs[name]; if (i && i.fire) i.fire();      // au cas où la condition utilise une entrée de State Machine
  }
  function onRiveTrigger(name){
    log(`Rive → page : ${name}`);
    if (name === 'snapshot') captureCard();
  }
  function pushToRive(){
    if (!vmi || !OPT.push) return;
    for (const k in bound.numbers){
      const p = bound.numbers[k]; if (!p) continue;
      if (OPT.only && !OPT.only.includes(k)) continue;
      const v = +out[k].toFixed(3);
      if (lastSent[k] !== v){ p.value = v; lastSent[k] = v; const i = smInputs[k]; if (i) i.value = v; }
    }
    for (const k in bound.booleans){
      const p = bound.booleans[k]; if (!p) continue;
      if (lastSent[k] !== out[k]){ p.value = out[k]; lastSent[k] = out[k]; }
    }
  }

  // Carte souvenir : capture de l'image Rive (version simple ; GIF à venir)
  function captureCard(){
    const src = vmi ? $('riveCanvas') : $('previewCanvas');
    requestAnimationFrame(() => {
      try {
        const url = src.toDataURL('image/png');
        log(url.length > 2000 ? 'capture prise (carte souvenir)' : 'capture vide (le rendu WebGL ne conserve pas l\'image)');
      } catch (e){ log('capture impossible : ' + e.message); }
    });
  }

  // ---------------------------------------------------------------------
  // APERÇU sans .riv : drap dessiné en code + simulateur de la tournée.
  // Sert à régler les seuils AVANT de les reporter dans la State Machine Rive.
  // ---------------------------------------------------------------------
  const pc = $('previewCanvas'), g = pc.getContext('2d');
  function fitPreview(){ const d = devicePixelRatio || 1; pc.width = innerWidth * d; pc.height = innerHeight * d; }
  fitPreview(); addEventListener('resize', fitPreview);

  // Seuils = conditions de transition à recopier dans Rive (sur les valeurs 0 → 1)
  const THRESH = { shout: 0.6, smile: 0.6, smileMaxJaw: 0.4, scareKid: 0.7, grimace: 0.6, kidFlee: 0.7, hold: 0.5 };
  const DOORS = [
    { who: 'La mamie sourde', ask: 'CRIE « Trick or treat ! »', ok: () => out.faceJaw > THRESH.shout },
    { who: "L'enfant peureux", ask: 'Souris-lui (bouche fermée)', ok: () => out.faceSmile > THRESH.smile && out.faceJaw < THRESH.smileMaxJaw,
      fail: () => out.faceScary > THRESH.scareKid, failMsg: "Tu lui as fait peur. Il pleure, pas de bonbon." },
    { who: 'Le voisin blasé', ask: 'Ta grimace LA PLUS EFFRAYANTE', ok: () => out.faceScary > THRESH.grimace, score: true },
    { who: 'Un enfant déguisé frappe chez TOI', ask: 'Fais-lui peur pour garder ton sac !', ok: () => out.faceScary > THRESH.kidFlee, final: true },
  ];
  const tour = { i: -1, hold: 0, t: 0, candies: 0, waiting: false, best: 0 };
  $('tourBtn').onclick = () => {
    if (vmi){
      // Avec un .riv : c'est la State Machine Rive qui mène la tournée. La page ne fait que la lancer.
      $('prompt').textContent = ''; $('sub').textContent = '';
      fireIn('calibrated');
      log('tournée lancée dans Rive (trigger calibrated)');
      return;
    }
    tour.i = 0; tour.candies = 0; tour.best = 0; nextDoor();
  };
  function nextDoor(){
    tour.hold = 0; tour.t = 0; tour.waiting = false;
    if (tour.i >= DOORS.length){ tour.i = -1; return; }
    const d = DOORS[tour.i];
    $('prompt').textContent = `${d.who} — ${d.ask}`;
    $('sub').textContent = '🍬'.repeat(tour.candies);
  }
  function endDoor(msg, delay = 1500){ $('prompt').textContent = msg; tour.i++; tour.waiting = true; setTimeout(nextDoor, delay); }
  function stepTour(dt){
    if (vmi || tour.i < 0 || tour.waiting || tour.i >= DOORS.length) return;   // avec un .riv, c'est la State Machine Rive qui décide
    const d = DOORS[tour.i];
    tour.t += dt; tour.best = Math.max(tour.best, out.faceScary);
    if (d.fail && tour.t > 0.8 && d.fail()) return endDoor(d.failMsg);
    tour.hold = d.ok() ? tour.hold + dt : Math.max(0, tour.hold - dt * 2);
    if (tour.hold > THRESH.hold){
      if (d.final){ tour.i = DOORS.length; $('prompt').textContent = `Il s'enfuit en hurlant. Ton sac est sauf : ${tour.candies} bonbons.`;
        $('sub').textContent = `Ta pire grimace de la nuit : ${Math.round(tour.best * 100)} / 100`; captureCard(); return; }
      tour.candies++;
      return endDoor(d.score ? `${d.who} : « ${Math.max(5, Math.round(out.faceScary * 10))}/10. » Un bonbon !` : `${d.who} te donne un bonbon !`, 1300);
    }
    if (tour.t > 12){
      if (d.final){ tour.candies = Math.max(0, tour.candies - 1); tour.i = DOORS.length; $('prompt').textContent = `Il repart avec un de tes bonbons… Il t'en reste ${tour.candies}.`; return; }
      endDoor('La porte se referme…', 1200);
    }
  }

  let anim = 0;
  function drawPreview(dt){
    anim += dt;
    const W = pc.width, H = pc.height, s = Math.min(W / 800, H / 600);
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#120f22'); sky.addColorStop(1, '#05040a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,179,92,.10)'; g.beginPath(); g.ellipse(W / 2, H * 0.92, 380 * s, 60 * s, 0, 0, 7); g.fill();
    g.save();
    g.translate(W / 2 + out.faceHeadX * 120 * s, H * 0.5 + out.faceHeadY * 60 * s);
    g.scale(s, s); g.rotate(out.faceRoll * Math.PI / 180 * 0.9);
    const sway = Math.sin(anim * 1.6) * 6;
    g.fillStyle = '#efeaf3'; g.shadowColor = 'rgba(200,180,255,.35)'; g.shadowBlur = 40;
    g.beginPath(); g.moveTo(-150, 60);
    g.bezierCurveTo(-160, -120, -90, -230, 0, -230); g.bezierCurveTo(90, -230, 160, -120, 150, 60);
    for (let i = 0; i <= 6; i++) g.lineTo(150 - 50 * i, 220 + Math.sin(anim * 2.2 + i) * 10 + (i % 2 ? 22 : 0) + sway);
    g.closePath(); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#0b0910';
    const eyeW = 26 * (1 + out.faceBrowUp * 0.25);
    for (const [side, blink] of [[-1, out.faceBlinkL], [1, out.faceBlinkR]]){
      const h = Math.max(2, 34 * (1 - blink * 0.92) * (1 + out.faceBrowUp * 0.5));
      g.save(); g.translate(side * 52 + out.faceLookX * 10, -110 + out.faceLookY * 8); g.rotate(side * out.faceBrowDown * 0.5);
      g.beginPath(); g.ellipse(0, 0, eyeW, h, 0, 0, 7); g.fill(); g.restore();
    }
    const mo = out.faceJaw, sm = out.faceSmile;
    g.beginPath();
    if (mo > 0.12) g.ellipse(0, -30 + mo * 10, 22 + sm * 18, 8 + mo * 48, 0, 0, 7), g.fill();
    else { g.moveTo(-28 - sm * 14, -32); g.quadraticCurveTo(0, -32 + sm * 26 - out.faceBrowDown * 10, 28 + sm * 14, -32); g.lineWidth = 6; g.strokeStyle = '#0b0910'; g.stroke(); }
    g.restore();
  }

  // ---------------------------------------------------------------------
  // Debug
  // ---------------------------------------------------------------------
  const DBG_KEYS = Object.keys(CONTRACT.numbers);
  $('bars').innerHTML = DBG_KEYS.map((k) => `<div class="lbl"><span>${k}</span><span id="v_${k}">0</span></div><div class="bar"><i id="b_${k}"></i></div>`).join('');
  function toggleDebug(){ const d = $('debug'); d.style.display = d.style.display === 'block' ? 'none' : 'block'; }
  $('dbgBtn').onclick = toggleDebug;
  function drawDebug(){
    if ($('debug').style.display !== 'block') return;
    for (const k of DBG_KEYS){
      const v = out[k];
      const pct = k === 'faceRoll' ? (v + 30) / 60 : (k.match(/Look|Head/) ? (v + 1) / 2 : v);
      $('v_' + k).textContent = v.toFixed(2);
      $('b_' + k).style.width = clamp(pct) * 100 + '%';
    }
  }

  // ---------------------------------------------------------------------
  // Boucle
  // ---------------------------------------------------------------------
  let last = performance.now(), fpsT = last;
  function loop(now){
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const keys = applyHeld();
    if (!keys){
      readFace(now);
      if (out.facePresent && !calibrating) computeOut();
      else if (!out.facePresent) for (const k of ['faceJaw', 'faceSmile', 'faceBrowDown', 'faceScary']) out[k] = ema(out[k], 0, 0.2);
    }
    pushToRive();
    if (!vmi){ stepTour(dt); drawPreview(dt); }
    if (now - fpsT > 1000){
      $('fps').textContent = landmarker ? frames : '—'; frames = 0; fpsT = now;
      $('present').innerHTML = out.facePresent || keys ? '<span class="ok">oui</span>' : '<span class="bad">non</span>';
    }
    drawDebug();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  log('prêt — « Enfiler le drap » pour la webcam, ou les boutons Crier / Sourire / Grimacer');
})();
