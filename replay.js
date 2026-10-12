// replay.js — le clip à partager : ton vrai visage | ton fantôme, pendant la dernière porte.
//
// Enregistre la porte finale (de l'entrée dans Fin jusqu'à 1,5 s après l'issue, 15 s max) en DEUX versions :
//   • « fantôme seul » : l'image Rive, avec le titre
//   • « avec mon visage » : écran partagé webcam (miroir) | Rive
// Les deux restent en mémoire dans le navigateur, rien n'est envoyé. La version avec visage n'est utilisée
// que si le joueur coche « Add my face ». Elles sont effacées à chaque nouvelle partie.
(() => {
  'use strict';
  const H = () => window.HMAT;
  const log = (m) => H() && H().log(m);
  const $ = (id) => document.getElementById(id);
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return;

  const MIME = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const EXT = MIME.includes('mp4') ? 'mp4' : 'webm';
  const W = 1280, Hh = 720;

  const ghostCv = Object.assign(document.createElement('canvas'), { width: W, height: Hh });
  const faceCv = Object.assign(document.createElement('canvas'), { width: W, height: Hh });
  const gg = ghostCv.getContext('2d'), fg = faceCv.getContext('2d');

  // l'image Rive passe par un flux vidéo : c'est fiable même quand le canvas WebGL ne garde pas son image
  let riveVid = null;
  function riveSource(){
    if (riveVid) return riveVid;
    const c = H() && H().canvas; if (!c || !c.captureStream) return null;
    riveVid = document.createElement('video'); riveVid.muted = true; riveVid.playsInline = true;
    riveVid.srcObject = c.captureStream(30); riveVid.play().catch(() => {});
    return riveVid;
  }
  const webcamOn = () => { const v = H() && H().video; return !!(v && v.srcObject && v.readyState >= 2 && v.videoWidth); };

  function cover(ctx, img, iw, ih, x, y, w, h, mirror){
    if (!iw || !ih) return;
    const s = Math.max(w / iw, h / ih), sw = w / s, sh = h / s;
    const sx = (iw - sw) / 2, sy = (ih - sh) / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (mirror){ ctx.translate(x * 2 + w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h); ctx.restore();
  }
  function label(ctx, text, x, y, size = 30, color = '#ece8f2', align = 'left'){
    ctx.save(); ctx.font = `800 ${size}px system-ui, sans-serif`; ctx.textAlign = align;
    ctx.shadowColor = '#000'; ctx.shadowBlur = 10; ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
  }
  function scoreBar(ctx){
    const v = H().out.faceScary;
    ctx.save(); ctx.fillStyle = '#0008'; ctx.fillRect(40, Hh - 54, W - 80, 16);
    ctx.fillStyle = v > 0.7 ? '#ff4d3d' : '#ffb35c'; ctx.fillRect(40, Hh - 54, (W - 80) * v, 16); ctx.restore();
    label(ctx, `SCARE ${Math.round(v * 100)}`, W - 40, Hh - 66, 26, '#ffb35c', 'right');
  }

  function drawFrames(){
    const rv = riveSource();
    // fantôme seul
    gg.fillStyle = '#05040a'; gg.fillRect(0, 0, W, Hh);
    if (rv && rv.videoWidth) cover(gg, rv, rv.videoWidth, rv.videoHeight, 0, 0, W, Hh, false);
    label(gg, 'HAUNT ME A TREAT', 40, 60, 36); label(gg, 'my real face drives this ghost · made with @rive_app', 40, 96, 22, '#c9b6ff');
    scoreBar(gg);
    // écran partagé
    if (webcamOn()){
      const v = H().video;
      fg.fillStyle = '#05040a'; fg.fillRect(0, 0, W, Hh);
      fg.save(); fg.filter = 'contrast(1.1) saturate(0.85)';
      cover(fg, v, v.videoWidth, v.videoHeight, 0, 0, W / 2, Hh, true); fg.restore();
      if (rv && rv.videoWidth) cover(fg, rv, rv.videoWidth, rv.videoHeight, W / 2, 0, W / 2, Hh, false);
      fg.fillStyle = '#c9b6ff'; fg.fillRect(W / 2 - 2, 0, 4, Hh);
      label(fg, 'ME', 30, 56, 34); label(fg, 'MY GHOST', W / 2 + 30, 56, 34);
      label(fg, 'HAUNT ME A TREAT · made with @rive_app', W / 2, Hh - 84, 24, '#ece8f2', 'center');
      scoreBar(fg);
    }
  }

  const rec = { on: false, ghost: null, face: null, chunksG: [], chunksF: [], blobG: null, blobF: null, raf: 0, stopT: 0 };
  function loop(){ if (!rec.on) return; drawFrames(); rec.raf = requestAnimationFrame(loop); }
  function mk(cv, chunks, done){
    const r = new MediaRecorder(cv.captureStream(30), MIME ? { mimeType: MIME, videoBitsPerSecond: 4e6 } : undefined);
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => done(new Blob(chunks, { type: MIME || 'video/webm' }));
    r.start(250); return r;
  }
  function start(){
    if (rec.on) return;
    reset(); riveSource(); drawFrames();
    rec.on = true;
    rec.ghost = mk(ghostCv, rec.chunksG, (b) => { rec.blobG = b; ready(); });
    if (webcamOn()) rec.face = mk(faceCv, rec.chunksF, (b) => { rec.blobF = b; ready(); });
    loop();
    rec.stopT = setTimeout(stop, 15000);
    log('replay : enregistrement de la dernière porte');
  }
  function stop(){
    if (!rec.on) return;
    rec.on = false; cancelAnimationFrame(rec.raf); clearTimeout(rec.stopT);
    try { rec.ghost && rec.ghost.stop(); } catch {}
    try { rec.face && rec.face.stop(); } catch {}
  }
  function reset(){ stop(); rec.chunksG = []; rec.chunksF = []; rec.blobG = rec.blobF = null; rec.ghost = rec.face = null; ready(); }

  addEventListener('hmat:state', (e) => {
    for (const raw of e.detail){
      const s = String(raw).toLowerCase();
      if (/enfiler|drap_tombe/.test(s)) reset();
      else if (/^fin$/.test(s)) start();
      else if (/gagne|perdu/.test(s)) setTimeout(stop, 1500);
    }
  });

  // ---------- boutons sur la carte souvenir ----------
  let btn = null, chk = null;
  function ui(){
    const row = document.querySelector('#card .row'); if (!row || btn) return;
    const wrap = document.createElement('div'); wrap.className = 'row'; wrap.style.alignItems = 'center';
    wrap.innerHTML = `<button id="replayBtn" disabled>Download my replay (video)</button>
      <label id="faceOpt" style="display:flex;gap:6px;align-items:center;color:#c9b6ff;font-size:14px;cursor:pointer">
      <input type="checkbox" id="replayFace"> Add my face (split screen)</label>`;
    row.parentNode.insertBefore(wrap, row.nextSibling);
    btn = $('replayBtn'); chk = $('replayFace');
    btn.onclick = save; ready();
  }
  function ready(){
    if (!btn) return;
    const any = rec.blobG || rec.blobF;
    btn.disabled = !any;
    btn.textContent = any ? 'Download my replay (video)' : (rec.on ? 'Recording replay…' : 'Replay: play the last door');
    $('faceOpt').style.display = rec.blobF ? 'flex' : 'none';
  }
  function save(){
    const b = (chk && chk.checked && rec.blobF) ? rec.blobF : rec.blobG; if (!b) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(b);
    a.download = `haunt-me-a-treat-replay.${EXT}`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  // la carte est créée par extras.js : on attend qu'elle existe
  const wait = () => document.querySelector('#card .row') ? ui() : setTimeout(wait, 200);
  wait();
})();
