// ui.js — l'habillage joueur : ouverture cinématique, chargement, mini-barre, miroir, « How it's made ».
// Les boutons de développement (Load a .riv, Debug, Shout/Smile…) restent accessibles avec ?dev=1,
// et automatiquement quand la page est ouverte en local (file://).
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const H = () => window.HMAT;
  const Q = new URLSearchParams(location.search);
  const DEV = Q.get('dev') === '1' || location.protocol === 'file:';
  const SKIP_INTRO = Q.get('intro') === '0' || Q.has('demo') || DEV;
  const app = $('app');
  document.body.classList.toggle('dev', DEV);

  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };

  // ===================================================================
  // 1. Ouverture
  // ===================================================================
  const intro = el(`
  <div id="intro">
    <div class="fog f1"></div><div class="fog f2"></div><div class="grain"></div>
    <div class="moon"></div>
    <div class="lines"><p id="l1"></p><p id="l2"></p><p id="l3"></p></div>
    <svg id="introGhost" viewBox="0 0 200 240" aria-hidden="true">
      <defs><radialGradient id="ig" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#fbf8ff"/><stop offset="1" stop-color="#d9d2e6"/></radialGradient></defs>
      <path d="M20 118 C14 50 56 10 100 10 C144 10 186 50 180 118 L182 222 L160 206 L140 228 L120 206 L100 228 L80 206 L60 228 L40 206 L18 222 Z" fill="url(#ig)" stroke="#1a1622" stroke-width="4"/>
      <path d="M62 150 C70 175 66 200 60 224 M140 150 C132 175 136 200 140 224 M100 160 L100 226" stroke="#1a162233" stroke-width="3" fill="none"/>
      <g id="igEyes"><ellipse id="igL" cx="72" cy="96" rx="15" ry="20" fill="#0b0910"/><ellipse id="igR" cx="128" cy="96" rx="15" ry="20" fill="#0b0910"/>
      <circle id="igLs" cx="76" cy="90" r="4" fill="#fff" opacity=".85"/><circle id="igRs" cx="132" cy="90" r="4" fill="#fff" opacity=".85"/></g>
      <ellipse id="igMouth" cx="100" cy="146" rx="9" ry="0" fill="#0b0910"/>
    </svg>
    <div class="cta">
      <h1 id="introTitle">HAUNT ME A TREAT</h1>
      <div class="tag">a trick-or-treat night you play with <em>your real face</em></div>
      <button id="startBtn" class="big">Put on the sheet</button>
      <div class="alt"><a href="#" id="mouseLink">No webcam? Play with your mouse</a> · <a href="#" id="aboutLink">How it's made</a></div>
      <div class="chips"><span>Rive State Machine</span><span>Data Binding · 12 face values</span><span>GPU Canvas · WGSL</span><span>Rive CLI · RML</span></div>
      <div class="notes">🎧 best with headphones · ⚠ jump scares &amp; flashing lights · 🔒 your webcam never leaves your browser</div>
    </div>
  </div>`);
  app.appendChild(intro);
  document.body.classList.add('intro-on');

  // titre : chaque lettre peut vaciller comme une ampoule qui meurt
  (() => { const h = $('introTitle'); if (!h) return; h.innerHTML = h.textContent.split(' ').map((w) => `<b class="w">${[...w].map((c) => `<span>${c}</span>`).join('')}</b>`).join(' ');
    const L = h.querySelectorAll('span');
    setInterval(() => { if (!intro.isConnected || Math.random() < 0.5) return; const sp = L[(Math.random() * L.length) | 0]; sp.classList.add('flk'); setTimeout(() => sp.classList.remove('flk'), 300 + Math.random() * 500); }, 900);
  })();
  // le fantôme de l'accueil : yeux fermés pendant le texte, puis il les ouvre et te suit du regard
  (() => {
    const E = { L: $('igL'), R: $('igR'), Ls: $('igLs'), Rs: $('igRs'), M: $('igMouth') };
    if (!E.L) return;
    let open = 0, tgtOpen = 0, lx = 0, ly = 0, tx = 0, ty = 0, blink = 0, nextBlink = performance.now() + 3000, awe = 0, tgtAwe = 0;
    intro.addEventListener('pointermove', (e) => { const r = $('introGhost').getBoundingClientRect(); tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2))); ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.4)) / (innerHeight / 2))); });
    const sb = $('startBtn'); sb.addEventListener('pointerenter', () => tgtAwe = 1); sb.addEventListener('pointerleave', () => tgtAwe = 0);
    window.__igOpen = () => { tgtOpen = 1; };
    (function loop(now){
      if (!intro.isConnected) return;
      requestAnimationFrame(loop);
      open += (tgtOpen - open) * 0.06; lx += (tx - lx) * 0.12; ly += (ty - ly) * 0.12; awe += (tgtAwe - awe) * 0.15;
      if (now > nextBlink){ blink = 1; nextBlink = now + 2500 + Math.random() * 3500; }
      blink = Math.max(0, blink - 0.12);
      const k = Math.max(0.06, open * (1 - Math.sin(Math.min(1, blink) * Math.PI) * 0.95));
      const ry = 20 * k * (1 + awe * 0.35), rx = 15 * (1 + awe * 0.25), dx = lx * 7, dy = ly * 6;
      [[E.L, E.Ls, 72], [E.R, E.Rs, 128]].forEach(([el, sh, cx]) => { el.setAttribute('cx', cx + dx); el.setAttribute('cy', 96 + dy); el.setAttribute('ry', ry); el.setAttribute('rx', rx); sh.setAttribute('cx', cx + 4 + dx * 1.2); sh.setAttribute('cy', 90 + dy - (1 - k) * 6); sh.setAttribute('opacity', k > 0.5 ? 0.85 : 0); });
      E.M.setAttribute('ry', awe * 16); E.M.setAttribute('rx', 9 + awe * 3); E.M.setAttribute('cy', 146 + dy * 0.5);
    })(performance.now());
  })();

  const LINES = [['l1', "It's Halloween night."], ['l2', 'You have no costume.'], ['l3', '…but you have a face.']];
  async function type(){
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    await wait(500);
    const src = window.HMAT_INTRO_LINES ? LINES.map(([id], i) => [id, window.HMAT_INTRO_LINES[i]]) : LINES;
    for (const [id, txt] of src){
      const p = $(id);
      for (let i = 1; i <= txt.length; i++){ p.textContent = txt.slice(0, i); await wait(id === 'l3' ? 70 : 45); }
      await wait(id === 'l3' ? 500 : 650);
    }
    intro.classList.add('ready'); window.__igOpen && window.__igOpen();
  }
  if (SKIP_INTRO){ intro.remove(); document.body.classList.remove('intro-on'); } else type();
  intro.addEventListener('click', (e) => { if (!intro.classList.contains('ready') && e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON'){ (window.HMAT_INTRO_LINES ? LINES.map(([id], i) => [id, window.HMAT_INTRO_LINES[i]]) : LINES).forEach(([id, t]) => $(id).textContent = t); intro.classList.add('ready'); window.__igOpen && window.__igOpen(); } });

  // ===================================================================
  // 5. Chargement (webcam + modèle de visage ~10 Mo)
  // ===================================================================
  const loading = el(`
  <div id="loading">
    <div class="sheet">
      <svg viewBox="0 0 120 150" width="110"><path d="M10 70 C10 25 35 5 60 5 C85 5 110 25 110 70 L110 140 L95 128 L80 142 L65 128 L50 142 L35 128 L20 142 L10 130 Z" fill="#efeaf3"/>
      <ellipse cx="42" cy="58" rx="9" ry="12" fill="#0b0910"/><ellipse cx="78" cy="58" rx="9" ry="12" fill="#0b0910"/></svg>
    </div>
    <div id="loadMsg">Asking to see your face…</div>
    <div class="bar"><i></i></div>
    <div id="loadHint">Allow the camera when your browser asks.</div>
  </div>`);
  app.appendChild(loading);

  function begin(){
    intro.classList.add('gone'); document.body.classList.remove('intro-on'); setTimeout(() => intro.remove(), 700);
    loading.classList.add('on');
    if ($('camBtn')) $('camBtn').click();
    const t0 = performance.now();
    const tick = () => {
      const v = H() && H().video, btn = $('camBtn');
      if (btn && /unavailable/i.test(btn.textContent)){ loading.classList.remove('on'); noCam(); return; }
      if ($('cal') && getComputedStyle($('cal')).display !== 'none'){ loading.classList.remove('on'); afterCam(); return; }
      if (v && v.srcObject){ $('loadMsg').textContent = 'Sewing your sheet…'; $('loadHint').textContent = 'Loading face tracking (about 10 MB, once).'; }
      if (performance.now() - t0 > 45000){ $('loadHint').textContent = 'Still loading… slow connection? You can also play with your mouse.'; }
      requestAnimationFrame(tick);
    };
    tick();
  }
  function noCam(){
    const m = el(`<div id="nocam"><p>No camera found, or access was denied.</p>
      <button id="nocamMouse" class="big">Play with your mouse</button>
      <p class="small">To use your face: allow the camera in the address bar, then reload.</p></div>`);
    app.appendChild(m);
    $('nocamMouse').onclick = () => { m.remove(); mouseMode(); };
  }
  function mouseMode(){
    if (intro.isConnected){ document.body.classList.remove('intro-on'); intro.classList.add('gone'); setTimeout(() => intro.remove(), 700); }
    document.body.classList.add('mouse');
    if (!(H() && H().vmi)) document.body.classList.add('norive');
    showMini();
    // Sans webcam : les boutons « maintenir » écrivent les mêmes valeurs dans le View Model que ton visage,
    // donc la State Machine Rive se joue telle quelle. On lance la tournée (trigger calibrated).
    document.querySelectorAll('.hold').forEach((b) => {
      const k = b.dataset.key, label = { c: 'SHOUT', s: 'SMILE', g: 'SCARY FACE' }[k];
      if (label) b.innerHTML = `<small>hold</small><b>${label}</b><kbd>${k.toUpperCase()}</kbd>`;
    });
    // La page pilote (boutons) : on le signale à Rive comme le mode webcam, pour couper les indices et
    // les listeners souris propres au lien Rive public (sinon deux consignes contradictoires à l'écran).
    if (H()) H().out.webcamMode = true;
    if ($('tourBtn')) setTimeout(() => $('tourBtn').click(), 400);
  }
  function afterCam(){ document.body.classList.add('cam'); showMini(); if (pipWanted) pip.classList.add('on'); }
  $('startBtn') && ($('startBtn').onclick = begin);
  $('mouseLink') && ($('mouseLink').onclick = (e) => { e.preventDefault(); mouseMode(); });

  // ===================================================================
  // 2. Mini-barre joueur
  // ===================================================================
  const mini = el(`
  <div id="mini">
    <button id="mSound" title="Sound (M)">🔊</button>
    <button id="mMirror" title="Show my face tracking">🪞</button>
    <button id="mRecal" title="Recalibrate (neutral face)">↺</button>
    <button id="mFull" title="Fullscreen">⛶</button>
    <button id="mAbout" title="How it's made">?</button>
  </div>`);
  app.appendChild(mini);
  function showMini(){ mini.classList.add('on'); }
  if (SKIP_INTRO) showMini();
  $('mSound').onclick = () => { const b = $('muteBtn'); if (b) b.click(); syncSound(); };
  function syncSound(){ const b = $('muteBtn'); if (b) $('mSound').textContent = b.textContent; }
  addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'm') setTimeout(syncSound, 0); });
  $('mRecal').onclick = () => { const b = $('camBtn'); if (b && /recalibrate/i.test(b.textContent)) b.click(); };
  $('mFull').onclick = () => {
    const d = document;
    if (d.fullscreenElement) d.exitFullscreen && d.exitFullscreen();
    else (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || (() => {})).call(d.documentElement);
  };

  // ===================================================================
  // 3. Miroir : ton visage et les points suivis, à la craie
  // ===================================================================
  const pip = el(`<canvas id="pip" width="240" height="336" title="Your reflection drives the ghost"></canvas>`);
  app.appendChild(pip);
  let pipWanted = !/Mobi|Android/i.test(navigator.userAgent);
  $('mMirror').onclick = () => {
    pipWanted = !pipWanted;
    pip.classList.toggle('on', pipWanted && !!(H() && H().video && H().video.srcObject));
    $('mMirror').classList.toggle('off', !pipWanted);
  };
  const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  const EYE_L = [33, 160, 158, 133, 153, 144], EYE_R = [362, 385, 387, 263, 373, 380];
  const LIPS = [61, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91];
  const BROW_L = [70, 63, 105, 66, 107], BROW_R = [336, 296, 334, 293, 300];
  const pg = pip.getContext('2d');
  // Le miroir hanté : un vieux miroir ovale, verre piqué et cerclé de laiton (il annonce la fin…)
  const MX = 120, MY = 132, RX = 100, RY = 124;
  const frame = document.createElement('canvas'); frame.width = pip.width; frame.height = pip.height;
  (() => {
    const f = frame.getContext('2d');
    const ring = (rx, ry, w, a, b) => { const gr = f.createLinearGradient(0, MY - ry, 0, MY + ry); gr.addColorStop(0, a); gr.addColorStop(.5, b); gr.addColorStop(1, a); f.lineWidth = w; f.strokeStyle = gr; f.beginPath(); f.ellipse(MX, MY, rx, ry, 0, 0, 7); f.stroke(); };
    f.shadowColor = '#000'; f.shadowBlur = 18; ring(RX + 7, RY + 7, 12, '#5b4422', '#d8b878'); f.shadowBlur = 0;
    ring(RX + 7, RY + 7, 2, '#2a1f10', '#2a1f10'); ring(RX + 1, RY + 1, 2, '#f3dfae', '#8a6a36');
    // petits ornements haut et bas
    f.fillStyle = '#c9a866'; f.strokeStyle = '#3a2a12'; f.lineWidth = 1.5;
    for (const [y, d] of [[MY - RY - 10, -1], [MY + RY + 10, 1]]){ f.beginPath(); f.moveTo(MX - 16, y); f.quadraticCurveTo(MX, y + d * 16, MX + 16, y); f.quadraticCurveTo(MX, y + d * 6, MX - 16, y); f.fill(); f.stroke(); f.beginPath(); f.arc(MX, y + d * 4, 4, 0, 7); f.fill(); f.stroke(); }
    // une fêlure dans le verre
    f.save(); f.beginPath(); f.ellipse(MX, MY, RX, RY, 0, 0, 7); f.clip();
    f.strokeStyle = 'rgba(236,232,242,.35)'; f.lineWidth = 1; f.beginPath();
    f.moveTo(MX + RX * 0.95, MY - RY * 0.45); f.lineTo(MX + 52, MY - 38); f.lineTo(MX + 61, MY - 20); f.lineTo(MX + 30, MY + 6);
    f.moveTo(MX + 52, MY - 38); f.lineTo(MX + 34, MY - 62); f.moveTo(MX + 61, MY - 20); f.lineTo(MX + 88, MY + 4); f.stroke();
    // piqûres et reflet
    for (let i = 0; i < 70; i++){ const a = Math.random() * 6.28, r = Math.sqrt(Math.random()); const x = MX + Math.cos(a) * RX * r, y = MY + Math.sin(a) * RY * r; f.fillStyle = `rgba(${Math.random() < .5 ? '20,16,10' : '230,220,200'},${0.05 + Math.random() * 0.12})`; f.beginPath(); f.arc(x, y, 0.6 + Math.random() * 1.8 * (r > .8 ? 2 : 1), 0, 7); f.fill(); }
    const sh = f.createLinearGradient(MX - RX, MY - RY, MX + RX, MY + RY); sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(.35, 'rgba(255,255,255,0)'); f.fillStyle = sh; f.fillRect(0, 0, frame.width, frame.height);
    const vg = f.createRadialGradient(MX, MY, RY * 0.5, MX, MY, RY * 1.05); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,6,2,.7)'); f.fillStyle = vg; f.fillRect(0, 0, frame.width, frame.height);
    f.restore();
  })();
  function drawPip(){
    requestAnimationFrame(drawPip);
    if (!pip.classList.contains('on')) return;
    const h = H(); if (!h || !h.video || !h.video.videoWidth) return;
    const v = h.video, W = pip.width, Hh = pip.height;
    pg.clearRect(0, 0, W, Hh);
    // zone du verre (on cadre le visage dans l'ovale)
    const bw = RX * 2.3, bh = RY * 2.05;
    const s = Math.max(bw / v.videoWidth, bh / v.videoHeight), dw = v.videoWidth * s, dh = v.videoHeight * s, ox = MX - dw / 2, oy = MY - dh / 2;
    pg.save(); pg.beginPath(); pg.ellipse(MX, MY, RX, RY, 0, 0, 7); pg.clip();
    pg.fillStyle = '#0b0910'; pg.fillRect(0, 0, W, Hh);
    pg.save(); pg.translate(W, 0); pg.scale(-1, 1);
    pg.filter = 'grayscale(1) sepia(.35) brightness(0.5) contrast(1.25)'; pg.drawImage(v, W - ox - dw, oy, dw, dh); pg.filter = 'none'; pg.restore();
    const lm = h.lm, o = h.out;
    if (lm){
      const P = (i) => [ox + (1 - lm[i].x) * dw, oy + lm[i].y * dh];
      const line = (idx, close, col, w) => { pg.beginPath(); idx.forEach((i, k) => { const [x, y] = P(i); k ? pg.lineTo(x, y) : pg.moveTo(x, y); }); if (close) pg.closePath(); pg.strokeStyle = col; pg.lineWidth = w; pg.stroke(); };
      pg.shadowColor = '#c9b6ff'; pg.shadowBlur = 6;
      line(OVAL, true, 'rgba(201,182,255,.45)', 1.5);
      line(BROW_L, false, '#c9b6ff', 2); line(BROW_R, false, '#c9b6ff', 2);
      line(EYE_L, true, '#ece8f2', 2); line(EYE_R, true, '#ece8f2', 2);
      line(LIPS, true, o.faceScary > 0.6 ? '#ff6b5e' : o.faceSmile > 0.5 ? '#7fd18b' : '#ffb35c', 2.5);
      pg.shadowBlur = 0;
    } else { pg.fillStyle = '#ece8f2'; pg.font = 'italic 15px Georgia, serif'; pg.textAlign = 'center'; pg.fillText('…where did you go?', MX, MY); pg.textAlign = 'left'; }
    pg.restore();
    pg.drawImage(frame, 0, 0);
    // jauges sous le miroir
    const bars = [['MOUTH', o.faceJaw, '#ffb35c'], ['SMILE', o.faceSmile, '#7fd18b'], ['SCARE', o.faceScary, '#ff6b5e']];
    bars.forEach(([n, val, c], i) => {
      const y = Hh - 40 + i * 14;
      pg.fillStyle = '#0b0910cc'; pg.fillRect(62, y - 7, W - 76, 7);
      pg.fillStyle = c; pg.fillRect(62, y - 7, (W - 76) * Math.max(0, Math.min(1, val || 0)), 7);
      pg.fillStyle = '#ece8f2'; pg.font = '700 9.5px system-ui'; pg.fillText(n, 16, y);
    });
  }
  requestAnimationFrame(drawPip);
  // le miroir se cache pendant la finale et la carte
  setInterval(() => {
    // la webcam a pu être lancée sans passer par l'accueil (mode dev, bouton direct) : on le détecte ici
    const hv = H() && H().video;
    if (hv && hv.srcObject && hv.videoWidth && !document.body.classList.contains('cam')) afterCam();
    const busy = (window.HMAT_FINALE && window.HMAT_FINALE.active) || ($('card') && $('card').style.display === 'flex');
    pip.classList.toggle('hide', !!busy);
    mini.classList.toggle('hide', !!(window.HMAT_FINALE && window.HMAT_FINALE.active));
  }, 250);

  // ===================================================================
  // 7. How it's made
  // ===================================================================
  const about = el(`
  <div id="about"><div class="box">
    <button id="aboutClose" class="x">×</button>
    <h2>How it's made</h2>
    <p><b>Your real face is the ghost costume.</b> Your webcam drives a hand-built Rive ghost: open your mouth and the sheet gasps, frown and the eye holes turn mean, blink and they blink.</p>
    <ul>
      <li><b>Rive State Machine</b> runs the whole trick-or-treat night: four doors, each waiting for a real expression (shout, smile, scary face), with hold timers, fail states and the ending.</li>
      <li><b>Data Binding</b>: 12 face values (jaw, smile, brows, blinks, gaze, head position, roll, a combined “scare” score) stream into a Rive View Model every frame. Thresholds live in Rive, not in code.</li>
      <li><b>GPU Canvas (WGSL)</b>: a custom shader draws the night: porch lamp halo that flickers when you scare, moonlight dust, ground mist that parts around the sheet, and the blood-red reveal.</li>
      <li><b>Luau scripting</b> drives the shader and the candy counters.</li>
      <li><b>MediaPipe Face Landmarker</b> reads 52 expressions locally; a 2.5 s neutral-face calibration adapts every threshold to your face.</li>
      <li>Night porches rendered in <b>Blender</b>; characters from Open Peeps (CC0), rigged and animated in Rive.</li>
    </ul>
    <p class="small">🔒 Nothing leaves your browser: no image is ever uploaded. The replay video is only created on your device when you ask for it. After the ending, one small grayscale picture of your stolen smile is kept <i>in this browser only</i> (localStorage) so the page can greet you when you come back; “make it forget me” on the start screen deletes it.</p>
    <p class="small">Made for the Rive Halloween Challenge · <a href="https://github.com/Faadil1/Haunt-me-a-treat" target="_blank" rel="noopener">source</a> · credits in CREDITS.md</p>
  </div></div>`);
  app.appendChild(about);
  const openAbout = (e) => { if (e) e.preventDefault(); about.classList.add('on'); };
  $('aboutLink') && ($('aboutLink').onclick = openAbout);
  $('mAbout').onclick = openAbout;
  $('aboutClose').onclick = () => about.classList.remove('on');
  about.onclick = (e) => { if (e.target === about) about.classList.remove('on'); };

  // ===================================================================
  // 8. Mode tournage (?film=1) : ton visage à gauche, le fantôme à droite, pour filmer l'écran sans montage
  // ===================================================================
  if (Q.get('film') === '1'){
    document.body.classList.add('film');
    const fc = el(`<div id="filmCam"><canvas></canvas><div class="lab">YOUR FACE</div></div>`);
    document.body.insertBefore(fc, app);
    const lab = el(`<div id="filmLab">THE GHOST</div>`); app.appendChild(lab);
    const cv = fc.querySelector('canvas'), g = cv.getContext('2d');
    const fit = () => { const d = devicePixelRatio || 1; cv.width = fc.clientWidth * d; cv.height = fc.clientHeight * d; };
    fit(); addEventListener('resize', fit); setTimeout(() => dispatchEvent(new Event('resize')), 50);
    (function draw(){
      requestAnimationFrame(draw);
      const h = H(), v = h && h.video; const W = cv.width, Hh = cv.height;
      g.fillStyle = '#05040a'; g.fillRect(0, 0, W, Hh);
      if (!v || !v.videoWidth){ g.fillStyle = '#8a8398'; g.font = `${Math.round(W / 22)}px Georgia, serif`; g.textAlign = 'center'; g.fillText('your face appears here', W / 2, Hh / 2); return; }
      const s = Math.max(W / v.videoWidth, Hh / v.videoHeight), dw = v.videoWidth * s, dh = v.videoHeight * s, ox = (W - dw) / 2, oy = (Hh - dh) / 2;
      g.save(); g.translate(W, 0); g.scale(-1, 1); g.filter = 'contrast(1.08) saturate(.85) brightness(.95)'; g.drawImage(v, W - ox - dw, oy, dw, dh); g.restore(); g.filter = 'none';
      const lm = h.lm, o = h.out || {};
      if (lm){
        const P = (i) => [ox + (1 - lm[i].x) * dw, oy + lm[i].y * dh];
        const line = (idx, close, col, w) => { g.beginPath(); idx.forEach((i, k) => { const [x, y] = P(i); k ? g.lineTo(x, y) : g.moveTo(x, y); }); if (close) g.closePath(); g.strokeStyle = col; g.lineWidth = w; g.stroke(); };
        const d = devicePixelRatio || 1;
        g.save(); g.shadowColor = '#c9b6ff'; g.shadowBlur = 8 * d; g.globalAlpha = .8;
        line(EYE_L, true, '#ece8f2', 1.6 * d); line(EYE_R, true, '#ece8f2', 1.6 * d);
        line(BROW_L, false, '#c9b6ff', 1.8 * d); line(BROW_R, false, '#c9b6ff', 1.8 * d);
        line(LIPS, true, o.faceScary > 0.6 ? '#ff6b5e' : o.faceSmile > 0.5 ? '#7fd18b' : '#ffb35c', 2.4 * d);
        g.restore();
      }
      // vignette
      const vg = g.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * .35, W / 2, Hh / 2, Math.max(W, Hh) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,4,10,.75)'); g.fillStyle = vg; g.fillRect(0, 0, W, Hh);
    })();
  }

  // Le bouton son créé par extras.js part dans la mini-barre (la barre de dev est cachée)
  setTimeout(syncSound, 500);
})();
