// finale.js — « BEHIND YOU » : la fin qui sort de l'écran (mode webcam uniquement).
//
// Quand Rive entre dans l'état Revelation, on laisse Rive jouer sa révélation (le drap qui glisse, le sang),
// puis l'écran devient ton miroir :
//   A. ta vraie image, en noir et blanc, granuleuse
//   B. ton corps s'efface dans le noir ; il ne reste que deux yeux de fantôme posés sur tes vrais yeux
//   C. tu reviens… et l'enfant déguisé est debout DERRIÈRE toi, dans ta vraie pièce (ta silhouette le cache)
//   D. flash blanc, cri, noir. Puis la carte souvenir.
//
// Tout reste dans le navigateur : aucune image n'est enregistrée ni envoyée, rien de tout ça n'est sur la carte.
// Paramètres : ?finale=0 (désactive), ?finaleDelay=7.5 (secondes de révélation Rive avant le miroir), ?demo=finale.
(() => {
  'use strict';
  const H = () => window.HMAT;
  const log = (m) => H() && H().log(m);
  const Q = new URLSearchParams(location.search);
  if (Q.get('finale') === '0') return;
  const DELAY = parseFloat(Q.get('finaleDelay') || '7.5') * 1000;
  const NO_FLASH = matchMedia('(prefers-reduced-motion: reduce)').matches || Q.get('flash') === '0';
  const SEG_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
  const sfx = (...a) => window.HMAT_SFX && window.HMAT_SFX(...a);

  const state = { active: false };
  window.HMAT_FINALE = state;

  // ---------- calques ----------
  const cv = document.createElement('canvas');
  cv.id = 'finaleCanvas';
  Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'none', zIndex: 30, background: '#000' });
  (document.getElementById('app') || document.body).appendChild(cv);
  const g = cv.getContext('2d');
  const maskCv = document.createElement('canvas'); const mg = maskCv.getContext('2d');
  const tmp = document.createElement('canvas'); const tg = tmp.getContext('2d');
  const grain = document.createElement('canvas'); grain.width = grain.height = 256;
  { const gg = grain.getContext('2d'), id = gg.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4){ const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gg.putImageData(id, 0, 0); }
  const kid = new Image(); kid.src = 'assets/characters/enfant_deguise.svg';

  // ---------- détourage (MediaPipe Image Segmenter), préchargé dès que la webcam tourne ----------
  let seg = null, segLoading = false, segFailed = false, haveMask = false, lastSegT = 0;
  async function loadSegmenter(){
    if (seg || segLoading || segFailed || !H() || !H().MP) return;
    segLoading = true;
    try {
      const { ImageSegmenter, FilesetResolver } = await import(`${H().MP}/vision_bundle.mjs`);
      const fileset = await FilesetResolver.forVisionTasks(`${H().MP}/wasm`);
      const opts = (delegate) => ({ baseOptions: { modelAssetPath: SEG_MODEL, delegate }, runningMode: 'VIDEO', outputCategoryMask: false, outputConfidenceMasks: true });
      try { seg = await ImageSegmenter.createFromOptions(fileset, opts('GPU')); }
      catch { seg = await ImageSegmenter.createFromOptions(fileset, opts('CPU')); }
      log('finale : détourage prêt');
    } catch (e){ segFailed = true; log('finale : détourage indisponible (' + e.message + '), repli sans silhouette'); }
    segLoading = false;
  }
  function webcamOn(){ const v = H() && H().video; return !!(v && v.srcObject && v.readyState >= 2 && v.videoWidth); }

  function updateMask(now){
    const v = H().video;
    if (!seg || now - lastSegT < 45) return;
    lastSegT = now;
    try {
      seg.segmentForVideo(v, now, (res) => {
        const m = res.confidenceMasks && res.confidenceMasks[0]; if (!m) return;
        const w = m.width, h = m.height, a = m.getAsFloat32Array();
        if (maskCv.width !== w || maskCv.height !== h){ maskCv.width = w; maskCv.height = h; }
        const id = mg.createImageData(w, h);
        for (let i = 0; i < a.length; i++){ const k = i * 4; id.data[k] = id.data[k + 1] = id.data[k + 2] = 0; id.data[k + 3] = Math.min(255, Math.max(0, (a[i] - 0.25) * 400)); }
        mg.putImageData(id, 0, 0);
        haveMask = true;
      });
    } catch {}
  }

  // ---------- géométrie : vidéo en « cover », en miroir ----------
  function layout(){
    const v = H().video, W = cv.width, Hh = cv.height;
    const vw = v.videoWidth || 640, vh = v.videoHeight || 480, sc = Math.max(W / vw, Hh / vh);
    const dw = vw * sc, dh = vh * sc;
    return { W, Hh, dw, dh, ox: (W - dw) / 2, oy: (Hh - dh) / 2 };
  }
  const toScreen = (L, p) => [L.ox + (1 - p.x) * L.dw, L.oy + p.y * L.dh];

  function drawMirrored(img, L, filter){
    g.save(); g.filter = filter || 'none';
    g.translate(L.W, 0); g.scale(-1, 1);
    g.drawImage(img, L.ox, L.oy, L.dw, L.dh);
    g.restore();
  }
  // la silhouette (masque) en miroir, remplie d'une couleur ou de la vidéo
  function silhouette(L, fill, alpha){
    if (!haveMask) return;
    tg.clearRect(0, 0, tmp.width, tmp.height);
    tg.save(); tg.translate(L.W, 0); tg.scale(-1, 1);
    if (fill === 'video'){ tg.filter = 'grayscale(1) contrast(1.25) brightness(0.62)'; tg.drawImage(H().video, L.ox, L.oy, L.dw, L.dh); tg.filter = 'none'; }
    else { tg.fillStyle = fill; tg.fillRect(L.ox, L.oy, L.dw, L.dh); }
    tg.globalCompositeOperation = 'destination-in';
    tg.filter = 'blur(2px)'; tg.drawImage(maskCv, L.ox, L.oy, L.dw, L.dh); tg.filter = 'none';
    tg.restore(); tg.globalCompositeOperation = 'source-over';
    g.save(); g.globalAlpha = alpha; g.drawImage(tmp, 0, 0); g.restore();
  }

  function faceBox(L){
    const lm = H().lm;
    if (!lm) return { cx: L.W / 2, cy: L.Hh * 0.42, fh: L.Hh * 0.32, eyes: [[L.W / 2 - L.Hh * 0.06, L.Hh * 0.4], [L.W / 2 + L.Hh * 0.06, L.Hh * 0.4]] };
    const top = toScreen(L, lm[10]), chin = toScreen(L, lm[152]);
    const e1 = toScreen(L, lm[468] || lm[33]), e2 = toScreen(L, lm[473] || lm[263]);
    return { cx: (top[0] + chin[0]) / 2, cy: (top[1] + chin[1]) / 2, fh: Math.hypot(chin[0] - top[0], chin[1] - top[1]), eyes: [e1, e2] };
  }

  function ghostEyes(F, a){
    const o = H().out, blink = Math.max(o.faceBlinkL, o.faceBlinkR);
    const w = F.fh * 0.085, hgt = Math.max(1.5, F.fh * 0.075 * (1 - blink * 0.95));
    g.save(); g.globalAlpha = a; g.fillStyle = '#f4f1ff'; g.shadowColor = 'rgba(200,190,255,.95)'; g.shadowBlur = F.fh * 0.12;
    for (const [x, y] of F.eyes){ g.beginPath(); g.ellipse(x, y, w, hgt, 0, 0, 7); g.fill(); }
    g.restore();
  }

  let kidSide = 1;
  function drawKid(L, F, a, t){
    if (!kid.complete || !kid.naturalWidth) return;
    const kh = F.fh * 3.9, kw = kh * kid.naturalWidth / kid.naturalHeight;
    const x = F.cx + kidSide * F.fh * 1.25 - kw / 2 + Math.sin(t * 0.9) * F.fh * 0.02;
    const y = F.cy - F.fh * 0.55;
    g.save(); g.globalAlpha = a; g.filter = 'grayscale(1) brightness(0.62) contrast(1.35) blur(0.6px)';
    g.drawImage(kid, x, y, kw, kh); g.restore();
  }

  function fx(L, t, amount){
    // grain
    g.save(); g.globalAlpha = 0.10 + 0.08 * amount; g.globalCompositeOperation = 'overlay';
    const ox = Math.random() * 256, oy = Math.random() * 256;
    g.fillStyle = g.createPattern(grain, 'repeat'); g.translate(-ox, -oy); g.fillRect(ox, oy, L.W, L.Hh); g.restore();
    // lignes de balayage + coupures horizontales
    g.save(); g.globalAlpha = 0.18; g.fillStyle = '#000';
    for (let y = 0; y < L.Hh; y += 4) g.fillRect(0, y, L.W, 1);
    g.restore();
    if (Math.random() < 0.08 + amount * 0.25){
      const y = Math.random() * L.Hh, h = 8 + Math.random() * 40, dx = (Math.random() - 0.5) * 60 * (0.5 + amount);
      g.drawImage(cv, 0, y, L.W, h, dx, y, L.W, h);
    }
    // vignette
    const vg = g.createRadialGradient(L.W / 2, L.Hh / 2, L.Hh * 0.3, L.W / 2, L.Hh / 2, L.Hh * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.85)');
    g.fillStyle = vg; g.fillRect(0, 0, L.W, L.Hh);
  }

  // ---------- la séquence ----------
  const T = { A: 1.6, B: 4.6, D: 8.6, END: 10.2 };   // A miroir · B effacement · C l'enfant derrière toi · D flash
  let t0 = 0, raf = 0, heart = false, stung = false;

  // Résolution interne fixe (≤ 1280 px de large) : évite de réallouer le canvas à chaque image
  // (avec un zoom Windows à 125 %, innerWidth × devicePixelRatio n'est pas entier) et garde les filtres légers.
  function fit(){
    const w = Math.min(1280, Math.round(innerWidth)), h = Math.round(w * innerHeight / innerWidth);
    if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
    if (tmp.width !== w || tmp.height !== h){ tmp.width = w; tmp.height = h; }
  }
  let phaseLogged = '', errLogged = false;
  function frame(now){
    raf = requestAnimationFrame(frame);
    try { draw(now); }
    catch (e){ if (!errLogged){ errLogged = true; log('finale : erreur ' + (e && e.message)); } }
  }
  function draw(now){
    const t = (performance.now() - t0) / 1000;
    const ph = t < T.A ? 'A miroir' : t < T.B ? 'B effacement' : t < T.D ? 'C derrière toi' : 'D flash';
    if (ph !== phaseLogged){ phaseLogged = ph; log('finale : ' + ph + (haveMask ? ' (silhouette)' : ' (sans silhouette)')); }
    fit();
    const L = layout();
    updateMask(now);
    const F = faceBox(L);
    if (!kidSideSet){ kidSide = F.cx > L.W / 2 ? -1 : 1; kidSideSet = true; }
    g.fillStyle = '#000'; g.fillRect(0, 0, L.W, L.Hh);

    if (t < T.D){
      const fadeIn = Math.min(1, t / 0.8);
      g.save(); g.globalAlpha = fadeIn;
      drawMirrored(H().video, L, 'grayscale(1) contrast(1.25) brightness(0.55)');
      g.restore();
      if (t >= T.B) drawKid(L, F, Math.min(0.92, (t - T.B) / 2.2), t);   // C : l'enfant apparaît derrière toi
      if (t >= T.A && t < T.B){
        // B : tu t'effaces dans le noir ; deux yeux de fantôme restent
        const k = Math.min(1, (t - T.A) / 1.2);
        if (haveMask) silhouette(L, '#000', k);
        else { g.save(); g.globalAlpha = k * 0.92; g.fillStyle = '#000'; g.beginPath(); g.ellipse(F.cx, F.cy, F.fh * 0.62, F.fh * 0.8, 0, 0, 7); g.fill(); g.restore(); }
        ghostEyes(F, k);
      } else if (t >= T.B){
        // C : tu reviens (ta silhouette passe DEVANT l'enfant), avec des retours du vide
        silhouette(L, 'video', 1);
        if (Math.random() < 0.12){ silhouette(L, '#000', 0.9); ghostEyes(F, 1); }
        if (!heart){ heart = true; sfx('heartFast', T.D - T.B); }
      }
      fx(L, t, t >= T.B ? (t - T.B) / (T.D - T.B) : 0.2);
    } else if (t < T.D + 0.14 && !NO_FLASH){
      g.fillStyle = '#fff'; g.fillRect(0, 0, L.W, L.Hh);
      if (!stung){ stung = true; sfx('stinger'); }
    } else {
      if (!stung){ stung = true; sfx('stinger'); }
      g.fillStyle = '#000'; g.fillRect(0, 0, L.W, L.Hh);
      if (t > T.D + 0.5){
        g.fillStyle = '#8a1018'; g.textAlign = 'center'; g.font = `800 ${Math.round(L.Hh * 0.06)}px system-ui, sans-serif`;
        g.globalAlpha = Math.min(1, (t - T.D - 0.5) / 0.6);
        g.fillText('Don\u2019t turn around.', L.W / 2, L.Hh / 2); g.globalAlpha = 1;
      }
    }
    if (t >= T.END) stop();
  }
  let kidSideSet = false;

  function start(){
    if (!webcamOn()){ state.active = false; dispatchEvent(new Event('hmat:finale-done')); return; }
    log('finale : BEHIND YOU');
    cv.style.display = 'block'; t0 = performance.now(); heart = stung = kidSideSet = false; phaseLogged = ''; errLogged = false;
    raf = requestAnimationFrame(frame);
  }
  function stop(){
    cancelAnimationFrame(raf); cv.style.display = 'none';
    state.active = false; dispatchEvent(new Event('hmat:finale-done'));
  }

  let timer = 0;
  addEventListener('hmat:state', (e) => {
    if (webcamOn()) loadSegmenter();
    for (const raw of e.detail){
      const s = String(raw).toLowerCase();
      if (/revel|reflet|vitre|twist/.test(s) && !state.active && webcamOn()){
        state.active = true; clearTimeout(timer); timer = setTimeout(start, DELAY);
      }
      if (/enfiler|drap_tombe/.test(s) && state.active){ clearTimeout(timer); stop(); }
    }
  });

  // démo : ?demo=finale lance la séquence 2 s après le démarrage de la webcam
  if (Q.get('demo') === 'finale'){
    const wait = () => webcamOn() ? (loadSegmenter(), setTimeout(() => { state.active = true; start(); }, 2500)) : setTimeout(wait, 300);
    wait();
  }
})();
