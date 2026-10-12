// extras.js — son et carte souvenir de Haunt Me a Treat.
// Écoute les états de la State Machine Rive (événement « hmat:state » envoyé par bridge.js).
// Aucune image de la webcam n'est utilisée : la carte est faite de l'image Rive et des valeurs du visage.
(() => {
  'use strict';
  const H = () => window.HMAT;
  const log = (m) => H() && H().log(m);
  const $ = (id) => document.getElementById(id);

  // ===================================================================
  // SON (Web Audio, synthétisé : aucun fichier requis)
  // Pour remplacer un son par ton propre enregistrement (Human Touch) : dépose
  // assets/sounds/<nom>.mp3 (knock, creak, slam, candy, sob, scream, whoosh, jeer). Version hébergée seulement.
  // ===================================================================
  let ac = null, master = null, muted = false;
  const custom = {};
  const SOUND_NAMES = ['knock', 'creak', 'slam', 'candy', 'sob', 'scream', 'whoosh', 'jeer'];

  function audio(){
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
    startAmbience(); startVoice(); startBuzz(); loadCustom();
    return ac;
  }
  // le navigateur exige un geste de l'utilisateur pour démarrer le son
  ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, () => { const a = audio(); if (a && a.state === 'suspended') a.resume(); }, { capture: true }));

  async function loadCustom(){
    if (!/^https?:/.test(location.protocol)) return;
    for (const n of SOUND_NAMES){
      try {
        const res = await fetch(`assets/sounds/${n}.mp3`); if (!res.ok) continue;
        custom[n] = await ac.decodeAudioData(await res.arrayBuffer()); log(`son perso : ${n}.mp3`);
      } catch {}
    }
  }
  function playCustom(n, vol = 1){
    if (!custom[n]) return false;
    const s = ac.createBufferSource(), g = ac.createGain(); g.gain.value = vol;
    s.buffer = custom[n]; s.connect(g).connect(master); s.start(); return true;
  }

  let noiseBuf = null;
  function noise(){
    if (noiseBuf) return noiseBuf;
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function env(g, t, a, peak, d){ g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function noiseHit(t, { f = 800, q = 1, type = 'bandpass', a = 0.005, d = 0.2, vol = 0.5, sweepTo = null } = {}){
    const s = ac.createBufferSource(); s.buffer = noise();
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t + a + d);
    const g = ac.createGain(); env(g, t, a, vol, d);
    s.connect(fl).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + a + d + 0.05);
  }
  function tone(t, { f = 440, to = null, type = 'sine', a = 0.01, d = 0.3, vol = 0.3, vib = 0 } = {}){
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + d);
    if (vib){ const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 6; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + a + d + 0.05); }
    const g = ac.createGain(); env(g, t, a, vol, d);
    o.connect(g).connect(master); o.start(t); o.stop(t + a + d + 0.05);
  }

  const SFX = {
    whoosh(){ const t = ac.currentTime; if (playCustom('whoosh')) return; noiseHit(t, { f: 300, sweepTo: 2400, q: 0.8, a: 0.25, d: 0.6, vol: 0.5 }); noiseHit(t + 0.7, { f: 200, type: 'lowpass', a: 0.01, d: 0.35, vol: 0.4 }); },
    knock(){ const t = ac.currentTime + 0.05; if (playCustom('knock')) return;
      for (const dt of [0, 0.22, 0.6, 0.82]){ tone(t + dt, { f: 140, to: 70, type: 'sine', a: 0.002, d: 0.12, vol: 0.7 }); noiseHit(t + dt, { f: 1200, q: 2, a: 0.001, d: 0.05, vol: 0.3 }); } },
    creak(){ const t = ac.currentTime + 1.3; if (playCustom('creak')) return;
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t);
      o.frequency.linearRampToValueAtTime(140, t + 0.4); o.frequency.linearRampToValueAtTime(70, t + 0.9);
      const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 900; fl.Q.value = 6;
      const g = ac.createGain(); env(g, t, 0.08, 0.18, 0.85);
      o.connect(fl).connect(g).connect(master); o.start(t); o.stop(t + 1.0); },
    slam(){ const t = ac.currentTime; if (playCustom('slam')) return;
      tone(t, { f: 90, to: 35, a: 0.002, d: 0.35, vol: 0.9 }); noiseHit(t, { f: 500, type: 'lowpass', a: 0.002, d: 0.3, vol: 0.6 }); },
    candy(){ const t = ac.currentTime; if (playCustom('candy')) return;
      [1318, 1760, 2637].forEach((f, i) => tone(t + i * 0.09, { f, type: 'triangle', a: 0.004, d: 0.5, vol: 0.18 }));
      noiseHit(t + 0.3, { f: 5000, q: 0.7, type: 'highpass', a: 0.01, d: 0.25, vol: 0.12 }); },
    tension(){ const t = ac.currentTime; tone(t, { f: 220, to: 330, type: 'triangle', a: 0.05, d: 0.45, vol: 0.08 }); },
    sob(){ const t = ac.currentTime; if (playCustom('sob')) return;
      [[523, 392], [466, 349], [415, 311], [392, 196]].forEach(([a, b], i) => tone(t + i * 0.32, { f: a, to: b, type: 'sawtooth', a: 0.02, d: i === 3 ? 0.7 : 0.26, vol: 0.09, vib: 8 })); },
    scream(){ const t = ac.currentTime; if (playCustom('scream')) return;
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(1100, t + 0.25); o.frequency.exponentialRampToValueAtTime(500, t + 1.1);
      const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 9; lg.gain.value = 40; l.connect(lg).connect(o.frequency);
      const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1000; f1.Q.value = 4;
      const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2600; f2.Q.value = 5;
      const g = ac.createGain(); env(g, t, 0.04, 0.35, 1.1);
      o.connect(f1).connect(g); o.connect(f2).connect(g); g.connect(master);
      o.start(t); l.start(t); o.stop(t + 1.2); l.stop(t + 1.2);
      // pas qui s'éloignent en courant
      for (let i = 0; i < 6; i++) tone(t + 0.5 + i * 0.16, { f: 110, to: 60, a: 0.002, d: 0.08, vol: 0.4 * (1 - i / 7) }); },
    jeer(){ const t = ac.currentTime; if (playCustom('jeer')) return;
      [784, 659, 880, 784, 659].forEach((f, i) => tone(t + i * 0.18, { f, type: 'square', a: 0.01, d: 0.14, vol: 0.06 })); },
    win(){ const t = ac.currentTime + 1.2; [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.1, { f, type: 'triangle', a: 0.01, d: 0.6, vol: 0.12 })); },
  };
  const sfx = (n) => { if (audio() && ac.state === 'running') try { SFX[n](); } catch (e) { log('son : ' + e.message); } };

  // Ambiance : vent filtré qui respire + grillons
  function startAmbience(){
    const s = ac.createBufferSource(); s.buffer = noise(); s.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 400; fl.Q.value = 0.6;
    const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 0.07; lg.gain.value = 220; l.connect(lg).connect(fl.frequency);
    const g = ac.createGain(); g.gain.value = 0.06;
    s.connect(fl).connect(g).connect(master); s.start(); l.start();
    const chirp = () => {
      if (!muted){ const t = ac.currentTime; for (let i = 0; i < 3; i++) tone(t + i * 0.07, { f: 4200 + Math.random() * 300, a: 0.005, d: 0.04, vol: 0.025 }); }
      setTimeout(chirp, 900 + Math.random() * 2500);
    };
    chirp();
  }
  // Ta voix de fantôme : un « hoouuu » qui suit l'ouverture de ta bouche
  let voiceGain = null, voiceOsc = null;
  function startVoice(){
    voiceOsc = ac.createOscillator(); voiceOsc.type = 'sawtooth'; voiceOsc.frequency.value = 160;
    const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5; lg.gain.value = 6; l.connect(lg).connect(voiceOsc.frequency);
    const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 380; f1.Q.value = 5;
    const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 900;
    voiceGain = ac.createGain(); voiceGain.gain.value = 0;
    voiceOsc.connect(f1).connect(f2).connect(voiceGain).connect(master); voiceOsc.start(); l.start();
  }
  // Grésillement électrique de la lampe : monte avec faceScary (même logique que le shader NuitFX)
  let buzzGain = null;
  function startBuzz(){
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 60;
    const fl = ac.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = 400;
    buzzGain = ac.createGain(); buzzGain.gain.value = 0;
    o.connect(fl).connect(buzzGain).connect(master); o.start();
  }
  let atDoor = false;
  function tickAudio(){
    if (ac && H()){
      const o = H().out, t = ac.currentTime;
      if (voiceGain){
        const v = H().vmi ? Math.max(0, o.faceJaw - 0.15) * 0.35 : 0;
        voiceGain.gain.setTargetAtTime(v, t, 0.08);
        voiceOsc.frequency.setTargetAtTime(150 + o.faceBrowUp * 90 - o.faceBrowDown * 40 + o.faceJaw * 40, t, 0.1);
      }
      if (buzzGain){
        const crack = Math.random() < o.faceScary * 0.25 ? 1 : 0.3;
        buzzGain.gain.setTargetAtTime(atDoor ? Math.max(0, o.faceScary - 0.3) * 0.12 * crack : 0, t, 0.03);
      }
    }
    requestAnimationFrame(tickAudio);
  }
  requestAnimationFrame(tickAudio);

  // ===================================================================
  // ÉTATS DE LA STATE MACHINE → sons + suivi de la partie
  // ===================================================================
  const game = { candies: 0, best: 0, bestFace: null, bestShot: null, outcome: null, scoreVoisin: 0, lastShot: 0, playing: false };

  addEventListener('hmat:state', (e) => {
    for (const raw of e.detail){
      const s = String(raw).toLowerCase();
      const leave = () => { atDoor = false; };
      if (/enfiler|drap_tombe/.test(s)){ sfx('whoosh'); leave(); Object.assign(game, { candies: 0, best: 0, bestFace: null, bestShot: null, outcome: null, scoreVoisin: 0, playing: true }); hideCard(); }
      else if (/bonbon|note/.test(s)){ sfx('candy'); if (atDoor) game.candies++; leave(); }
      else if (/ferme/.test(s)){ sfx('slam'); leave(); }
      else if (/pleure/.test(s)){ sfx('sob'); leave(); }
      else if (/gagne/.test(s)){ game.outcome = 'win'; sfx('scream'); sfx('win'); leave(); }
      else if (/perdu/.test(s)){ game.outcome = 'lose'; sfx('jeer'); if (atDoor) game.candies = Math.max(0, game.candies - 1); leave(); }
      else if (/tient/.test(s)){ sfx('tension'); }
      else if (/carte/.test(s)){ leave(); if (game.playing) setTimeout(showCard, 600); game.playing = false; }
      else if (/arrivee|^porte[1-4]$|^fin$/.test(s)){
        if (!atDoor){ sfx('knock'); sfx('creak'); }   // une seule fois par porte, pas à chaque retour depuis « _Tient »
        atDoor = true;
      }
    }
  });
  addEventListener('hmat:trigger', (e) => { if (e.detail === 'snapshot') grabShot(true); });

  // Suit la pire grimace de la partie, et garde l'image Rive de ce moment
  function trackBest(now){
    const h = H();
    if (h && h.vmi && game.playing && atDoor){
      const v = h.out.faceScary;
      if (v > game.best + 0.02){
        game.best = v; game.bestFace = { ...h.out };
        if (now - game.lastShot > 250){ game.lastShot = now; grabShot(false); }
      }
    }
    requestAnimationFrame(trackBest);
  }
  requestAnimationFrame(trackBest);

  // Copie de l'image Rive. Le canvas WebGL ne garde pas son image entre deux images : on copie
  // juste après le rendu de Rive (requestAnimationFrame imbriqué), et on vérifie qu'elle n'est pas vide.
  function grabShot(force){
    const src = H() && H().canvas; if (!src || !src.width) return;
    requestAnimationFrame(() => setTimeout(() => {
      try {
        const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
        const g = c.getContext('2d'); g.drawImage(src, 0, 0);
        const px = g.getImageData(c.width / 2, c.height * 0.75, 1, 1).data;
        if (px[0] + px[1] + px[2] + px[3] > 0 || force) game.bestShot = c;
      } catch {}
    }, 0));
  }

  function readVM(name){
    try { const p = H().vmi && H().vmi.number(name); return p ? p.value : null; } catch { return null; }
  }

  // ===================================================================
  // CARTE SOUVENIR (1080 × 1350, format post)
  // ===================================================================
  const css = document.createElement('style');
  css.textContent = `
  #card{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:#05040acc;backdrop-filter:blur(4px);z-index:20;padding:16px}
  #card .wrap{display:flex;flex-direction:column;gap:12px;align-items:center;max-height:100%}
  #card canvas{max-height:calc(100vh - 110px);max-width:100%;border-radius:14px;box-shadow:0 20px 60px #000c}
  #card .row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
  #muteBtn{min-width:44px}`;
  document.head.appendChild(css);
  const card = document.createElement('div'); card.id = 'card';
  card.innerHTML = `<div class="wrap"><canvas id="cardCanvas" width="1080" height="1350"></canvas>
    <div class="row"><button id="cardSave" class="primary">Télécharger ma carte</button><button id="cardShare">Partager</button><button id="cardAgain">Rejouer</button><button id="cardClose">Fermer</button></div></div>`;
  ($('app') || document.body).appendChild(card);

  const bg = new Image(); bg.src = 'assets/backgrounds_jpg/porch_4_chezmoi.jpg';

  function drawGhost(g, f, x, y, s){
    g.save(); g.translate(x, y); g.scale(s, s); g.rotate((f.faceRoll || 0) * Math.PI / 180 * 0.5);
    g.fillStyle = '#f2eef6'; g.shadowColor = 'rgba(190,170,255,.55)'; g.shadowBlur = 60;
    g.beginPath(); g.moveTo(-150, 60);
    g.bezierCurveTo(-160, -120, -90, -230, 0, -230); g.bezierCurveTo(90, -230, 160, -120, 150, 60);
    for (let i = 0; i <= 6; i++) g.lineTo(150 - 50 * i, 220 + (i % 2 ? 26 : 0));
    g.closePath(); g.fill(); g.shadowBlur = 0;
    g.lineWidth = 5; g.strokeStyle = '#1a1622'; g.stroke();
    g.fillStyle = '#0b0910';
    for (const [side, blink] of [[-1, f.faceBlinkL], [1, f.faceBlinkR]]){
      const h = Math.max(3, 36 * (1 - blink * 0.9) * (1 + f.faceBrowUp * 0.4));
      g.save(); g.translate(side * 52, -110); g.rotate(side * f.faceBrowDown * 0.5);
      g.beginPath(); g.ellipse(0, 0, 28, h, 0, 0, 7); g.fill(); g.restore();
    }
    g.beginPath(); g.ellipse(0, -25 + f.faceJaw * 12, 22 + f.faceSmile * 14, 8 + f.faceJaw * 55, 0, 0, 7); g.fill();
    g.restore();
  }

  function renderCard(){
    const c = $('cardCanvas'), g = c.getContext('2d'), W = c.width, Hh = c.height;
    const candies = readVM('candies') ?? game.candies;
    const nScore = readVM('neighborScore');
    const grim = Math.round(game.best * 100);
    // fond
    const sky = g.createLinearGradient(0, 0, 0, Hh); sky.addColorStop(0, '#16112a'); sky.addColorStop(1, '#05040a');
    g.fillStyle = sky; g.fillRect(0, 0, W, Hh);
    if (bg.complete && bg.naturalWidth){ g.globalAlpha = 0.55; const s = Hh * 0.62 / bg.naturalHeight; const bw = bg.naturalWidth * s; g.drawImage(bg, (W - bw) / 2, 150, bw, Hh * 0.62); g.globalAlpha = 1; }
    const v = g.createRadialGradient(W / 2, Hh * 0.5, Hh * 0.25, W / 2, Hh * 0.5, Hh * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.75)');
    g.fillStyle = v; g.fillRect(0, 0, W, Hh);
    // l'image : la vraie image Rive de ta pire grimace, sinon un fantôme dessiné avec tes valeurs
    const shot = game.bestShot;
    if (shot){
      const sw = shot.width, sh = shot.height, crop = Math.min(sw, sh * 0.9);
      const sx = (sw - crop) / 2, sy = Math.max(0, sh - crop * 0.95);
      g.save(); g.beginPath(); g.roundRect(90, 190, W - 180, W - 180, 28); g.clip();
      g.drawImage(shot, sx, sy, crop, crop * 0.95, 90, 190, W - 180, (W - 180) * 0.95);
      g.restore();
      g.lineWidth = 4; g.strokeStyle = '#c9b6ff'; g.beginPath(); g.roundRect(90, 190, W - 180, W - 180, 28); g.stroke();
    } else if (game.bestFace) drawGhost(g, game.bestFace, W / 2, 600, 1.3);
    else drawGhost(g, { faceJaw: 0.9, faceSmile: 0, faceBrowDown: 1, faceBrowUp: 0, faceBlinkL: 0, faceBlinkR: 0, faceRoll: 0 }, W / 2, 600, 1.3);
    // textes
    g.textAlign = 'center'; g.fillStyle = '#ece8f2';
    g.font = '800 64px system-ui, sans-serif'; g.fillText('HAUNT ME A TREAT', W / 2, 110);
    g.font = '500 30px system-ui, sans-serif'; g.fillStyle = '#c9b6ff'; g.fillText('ma pire grimace de la nuit', W / 2, 158);
    const y0 = 1080;
    g.font = '900 120px system-ui, sans-serif'; g.fillStyle = '#ffb35c'; g.fillText(`${grim}/100`, W / 2, y0);
    g.font = '700 40px system-ui, sans-serif'; g.fillStyle = '#ece8f2';
    const line = game.outcome === 'win' ? 'Le petit monstre s’est enfui en hurlant.' : game.outcome === 'lose' ? 'Il est reparti avec un de mes bonbons…' : 'Tournée terminée.';
    g.fillText(line, W / 2, y0 + 70);
    g.font = '600 36px system-ui, sans-serif'; g.fillStyle = '#c9b6ff';
    g.fillText(`${'🍬'.repeat(Math.max(0, Math.min(6, candies | 0)))}  ${candies | 0} bonbon${(candies | 0) > 1 ? 's' : ''}${nScore != null ? `  ·  voisin : ${Math.round(nScore)}/10` : ''}`, W / 2, y0 + 130);
    g.font = '500 28px system-ui, sans-serif'; g.fillStyle = '#8a8398';
    g.fillText('Mon vrai visage pilotait le fantôme · fait avec @rive_app', W / 2, Hh - 40);
  }

  function showCard(){ renderCard(); card.style.display = 'flex'; log('carte souvenir affichée'); }
  function hideCard(){ card.style.display = 'none'; }
  $('cardClose').onclick = hideCard;
  $('cardAgain').onclick = () => { hideCard(); $('tourBtn') && $('tourBtn').click(); };
  $('cardSave').onclick = () => $('cardCanvas').toBlob((b) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'haunt-me-a-treat.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
  $('cardShare').onclick = () => $('cardCanvas').toBlob(async (b) => {
    const file = new File([b], 'haunt-me-a-treat.png', { type: 'image/png' });
    const text = `Mon visage a hanté le quartier : ${Math.round(game.best * 100)}/100 de grimace. Haunt Me a Treat, fait avec @rive_app #RiveHalloweenChallenge`;
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text, url: location.href.split('?')[0] });
      else { await navigator.clipboard.writeText(text + ' ' + location.href.split('?')[0]); $('cardShare').textContent = 'Texte copié !'; }
    } catch {}
  }, 'image/png');

  // bouton son (touche M)
  const hud = document.querySelector('.hud');
  if (hud){
    const mb = document.createElement('button'); mb.id = 'muteBtn'; mb.title = 'Son (M)'; mb.textContent = '🔊';
    const toggle = () => { muted = !muted; mb.textContent = muted ? '🔇' : '🔊'; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ac.currentTime, 0.05); };
    mb.onclick = toggle; hud.insertBefore(mb, $('dbgBtn'));
    addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'm') toggle(); });
  }

  // test sans Rive : ?demo=card affiche une carte d'exemple
  if (/[?&]demo=card/.test(location.search)) setTimeout(() => {
    game.best = 0.87; game.outcome = 'win';
    game.bestFace = { faceJaw: 0.95, faceSmile: 0, faceBrowDown: 1, faceBrowUp: 0, faceBlinkL: 0, faceBlinkR: 0.1, faceRoll: 6 };
    showCard();
  }, 500);
})();
