// haunt.js — la page elle-même est hantée. Tout est côté navigateur, rien n'est envoyé.
//  1. Il garde ton visage : après la fin, une image de ton sourire volé reste dans CE navigateur (localStorage).
//     Quand tu reviens, l'accueil a changé… et l'enfant est un peu plus près à chaque visite (It Follows).
//     Lien « make it forget me » : efface vraiment l'image.
//  2. L'onglet hanté : si tu pars, le titre et l'icône te rappellent.
//  3. Le curseur possédé : pendant la Révélation, ton curseur disparaît, un autre bouge tout seul puis s'enfuit.
//  4. Fin cachée : sur la carte, reste immobile 10 s face caméra… quelque chose revient dans le reflet.
//  5. Images subliminales (L'Exorciste) : deux images d'1/12 s de TON visage aux yeux blancs, pendant la tournée.
// Paramètres : ?haunt=0 désactive tout, ?flash=0 coupe les images subliminales.
(() => {
  'use strict';
  const Q = new URLSearchParams(location.search);
  if (Q.get('haunt') === '0') return;
  const $ = (id) => document.getElementById(id);
  const H = () => window.HMAT;
  const log = (m) => H() && H().log && H().log(m);
  const sfx = (...a) => window.HMAT_SFX && window.HMAT_SFX(...a);
  const NO_FLASH = matchMedia('(prefers-reduced-motion: reduce)').matches || Q.get('flash') === '0';
  const KEY = 'hmat_kept_v1';
  const store = {
    get(){ try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } },
    set(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch { return false; } },
    clear(){ try { localStorage.removeItem(KEY); } catch {} },
  };
  const webcamOn = () => { const v = H() && H().video; return !!(v && v.srcObject && v.readyState >= 2 && v.videoWidth); };
  const app = $('app') || document.body;

  // ---------------------------------------------------------------
  // 2. L'onglet hanté
  // ---------------------------------------------------------------
  const TITLE = document.title;
  const icon = document.querySelector('link[rel="icon"]');
  const ICON = icon && icon.href;
  const ICON_RED = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 150'%3E%3Cpath d='M10 70C10 25 35 5 60 5s50 20 50 65v70l-15-12-15 14-15-14-15 14-15-14-15 14-10-12z' fill='%23efeaf3'/%3E%3Cellipse cx='42' cy='58' rx='13' ry='16' fill='%23b0101c'/%3E%3Cellipse cx='78' cy='58' rx='13' ry='16' fill='%23b0101c'/%3E%3Ccircle cx='42' cy='58' r='4' fill='%23fff'/%3E%3Ccircle cx='78' cy='58' r='4' fill='%23fff'/%3E%3C/svg%3E";
  const AWAY = ["don't leave me…", 'I can still see you 👁', 'come back', 'you left the door open', '👁 👁'];
  let awayTimer = 0;
  document.addEventListener('visibilitychange', () => {
    clearInterval(awayTimer);
    if (document.hidden){
      let i = 0; document.title = AWAY[0]; if (icon) icon.href = ICON_RED;
      awayTimer = setInterval(() => { i = (i + 1) % AWAY.length; document.title = AWAY[i]; }, 2600);
    } else {
      document.title = 'I saw you leave.';
      setTimeout(() => { document.title = TITLE; if (icon) icon.href = ICON; }, 2400);
    }
  });

  // ---------------------------------------------------------------
  // 1. Il garde ton visage
  // ---------------------------------------------------------------
  function keepFace(){
    if (!webcamOn()) return;
    const F = window.HMAT_FINALE || {};
    const frames = F.smile || [];
    let src = frames.length > 4 ? frames[Math.floor(frames.length * 0.55)] : H().video;
    const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height; if (!sw || !sh) return;
    const c = document.createElement('canvas'); c.width = 200; c.height = Math.round(200 * sh / sw);
    const g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1);
    g.filter = 'grayscale(1) contrast(1.3) brightness(.7)'; g.drawImage(src, 0, 0, c.width, c.height);
    const prev = store.get();
    const ok = store.set({ img: c.toDataURL('image/jpeg', 0.6), smile: frames.length > 4, t: Date.now(), visits: prev ? prev.visits : 0 });
    log(ok ? 'hanté : il garde ton visage (dans ce navigateur seulement)' : 'hanté : stockage refusé');
  }
  addEventListener('hmat:finale-done', keepFace);

  const kept = store.get();
  const intro = $('intro');
  if (kept && intro){
    kept.visits = (kept.visits || 0) + 1; store.set(kept);
    const days = Math.floor((Date.now() - kept.t) / 86400000);
    const lines = [
      'You came back.',
      kept.smile ? 'It kept your smile.' : 'It kept your face.',
      days >= 1 ? `…it has been waiting ${days} day${days > 1 ? 's' : ''}.` : '…and it wants the rest.',
    ];
    window.HMAT_INTRO_LINES = lines;
    // le miroir de l'accueil : ton visage gardé, et l'enfant derrière, plus près à chaque visite
    const near = Math.min(1, 0.25 + kept.visits * 0.25);
    const m = document.createElement('div'); m.id = 'keptMirror';
    m.innerHTML = `<div class="glass"><img alt="" src="${kept.img}"><img class="kid" alt="" src="assets/characters/enfant_deguise.svg"></div>`;
    intro.insertBefore(m, intro.querySelector('.cta'));
    const kid = m.querySelector('.kid');
    kid.style.height = (40 + near * 50) + '%'; kid.style.right = (-10 + near * 22) + '%'; kid.style.opacity = (0.35 + near * 0.5).toFixed(2);
    const ghost = $('introGhost'); if (ghost) ghost.style.display = 'none';
    const alt = intro.querySelector('.alt');
    if (alt){
      const a = document.createElement('a'); a.href = '#'; a.textContent = 'make it forget me';
      a.onclick = (e) => { e.preventDefault(); store.clear(); m.style.transition = 'opacity 1.4s'; m.style.opacity = '0'; a.textContent = 'forgotten. (it says it won’t forget you)'; a.onclick = (ev) => ev.preventDefault(); };
      alt.append(' · ', a);
    }
    log('hanté : retour n°' + kept.visits);
  }

  // ---------------------------------------------------------------
  // 3. Le curseur possédé (pendant la Révélation, souris uniquement)
  // ---------------------------------------------------------------
  const fine = matchMedia('(pointer: fine)').matches;
  let mx = innerWidth / 2, my = innerHeight / 2;
  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  const fake = document.createElement('div'); fake.id = 'fakeCursor';
  fake.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.4 L17.5 13.4 Z" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  document.body.appendChild(fake);
  let possessed = false;
  function possess(){
    if (!fine || possessed) return; possessed = true;
    document.body.classList.add('possessed');
    let x = mx, y = my; const t0 = performance.now();
    const target = () => { const b = document.querySelector('#mini') || app; const r = b.getBoundingClientRect(); return [innerWidth * 0.5, innerHeight * 0.55, r]; };
    fake.style.display = 'block';
    (function step(now){
      const t = (now - t0) / 1000;
      if (t > 6.6){ fake.style.display = 'none'; document.body.classList.remove('possessed'); return; }
      const [tx, ty] = target();
      if (t < 2.2){ x += (tx - x) * 0.025; y += (ty - y) * 0.025; }                       // il glisse tout seul vers le centre
      else if (t < 4.2){ x += Math.sin(t * 41) * 3.2; y += Math.cos(t * 37) * 2.4; }        // il tremble, comme s'il hésitait
      else if (t < 4.5){ /* il s'arrête net */ }
      else { const k = (t - 4.5) * 90; x += (x < innerWidth / 2 ? -1 : 1) * k; y -= k * 0.35; } // il s'enfuit
      fake.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(step);
    })(t0);
  }

  // ---------------------------------------------------------------
  // 5. Images subliminales : ton visage, yeux blancs, 1/12 s
  // ---------------------------------------------------------------
  const sub = document.createElement('canvas'); sub.id = 'subliminal'; app.appendChild(sub);
  const sg = sub.getContext('2d');
  const subDone = new Set();
  function subliminal(tag){
    if (NO_FLASH || subDone.has(tag) || !webcamOn() || (window.HMAT_FINALE && window.HMAT_FINALE.active)) return;
    subDone.add(tag);
    setTimeout(() => {
      if (!webcamOn()) return;
      const v = H().video, W = sub.width = Math.min(1280, innerWidth), Hh = sub.height = Math.round(W * innerHeight / innerWidth);
      const s = Math.max(W / v.videoWidth, Hh / v.videoHeight), dw = v.videoWidth * s, dh = v.videoHeight * s, ox = (W - dw) / 2, oy = (Hh - dh) / 2;
      sg.save(); sg.translate(W, 0); sg.scale(-1, 1); sg.filter = 'grayscale(1) contrast(1.9) brightness(.55)'; sg.drawImage(v, ox, oy, dw, dh); sg.restore(); sg.filter = 'none';
      const lm = H().lm;
      if (lm){
        const P = (p) => [ox + (1 - p.x) * dw, oy + p.y * dh];
        const top = P(lm[10]), chin = P(lm[152]), fh = Math.hypot(chin[0] - top[0], chin[1] - top[1]);
        sg.fillStyle = '#fff'; sg.shadowColor = '#fff'; sg.shadowBlur = fh * 0.1;
        for (const i of [468, 473]){ const p = lm[i] || lm[i === 468 ? 33 : 263]; const [x, y] = P(p); sg.beginPath(); sg.ellipse(x, y, fh * 0.07, fh * 0.06, 0, 0, 7); sg.fill(); }
        sg.shadowBlur = 0;
        // la bouche noircie, étirée
        const a = P(lm[61]), b = P(lm[291]), cu = P(lm[13]), cd = P(lm[14]);
        sg.fillStyle = '#000'; sg.beginPath(); sg.ellipse((a[0] + b[0]) / 2, (cu[1] + cd[1]) / 2 + fh * 0.03, Math.abs(b[0] - a[0]) * 0.75, fh * 0.12, 0, 0, 7); sg.fill();
      }
      sub.style.display = 'block';
      setTimeout(() => { sub.style.display = 'none'; }, 85);
      log('hanté : image subliminale (' + tag + ')');
    }, 900 + Math.random() * 1400);
  }

  // ---------------------------------------------------------------
  // 4. Fin cachée : immobile 10 s devant la carte
  // ---------------------------------------------------------------
  const hid = document.createElement('canvas'); hid.id = 'hiddenEnd'; app.appendChild(hid);
  const hg = hid.getContext('2d');
  let stillSince = 0, lastX = null, lastY = null, hiddenDone = false;
  setInterval(() => {
    const card = $('card'); const onCard = card && card.style.display === 'flex';
    if (!onCard || hiddenDone || !webcamOn() || !H().lm){ stillSince = 0; lastX = null; return; }
    const o = H().out, x = o.faceHeadX || 0, y = o.faceHeadY || 0;
    const moved = lastX !== null && (Math.abs(x - lastX) > 0.035 || Math.abs(y - lastY) > 0.035 || (o.faceJaw || 0) > 0.35);
    lastX = x; lastY = y;
    if (moved || !stillSince){ stillSince = performance.now(); return; }
    if (performance.now() - stillSince > 10000){ hiddenDone = true; hiddenEnding(); }
  }, 200);
  function hiddenEnding(){
    log('hanté : fin cachée');
    const v = H().video, t0 = performance.now();
    hid.style.display = 'block'; sfx('tension');
    (function step(now){
      const t = (now - t0) / 1000;
      const W = hid.width = Math.min(1280, innerWidth), Hh = hid.height = Math.round(W * innerHeight / innerWidth);
      const s = Math.max(W / v.videoWidth, Hh / v.videoHeight), dw = v.videoWidth * s, dh = v.videoHeight * s, ox = (W - dw) / 2, oy = (Hh - dh) / 2;
      const a = t < 1.2 ? t / 1.2 : t < 4.2 ? 1 : Math.max(0, 1 - (t - 4.2) / 0.5);
      hg.clearRect(0, 0, W, Hh); hg.globalAlpha = a * 0.9;
      hg.save(); hg.translate(W, 0); hg.scale(-1, 1); hg.filter = 'grayscale(1) contrast(1.3) brightness(.5)'; hg.drawImage(v, ox, oy, dw, dh); hg.restore(); hg.filter = 'none';
      const lm = H().lm;
      if (lm && t > 1.6){
        const P = (p) => [ox + (1 - p.x) * dw, oy + p.y * dh];
        const top = P(lm[10]), chin = P(lm[152]), fh = Math.hypot(chin[0] - top[0], chin[1] - top[1]);
        const cx = (top[0] + chin[0]) / 2, side = cx > W / 2 ? -1 : 1;
        // le drap, juste derrière ton épaule, qui se penche vers toi
        const gx = cx + side * fh * (1.05 - Math.min(0.25, (t - 1.6) * 0.12)), gy = top[1] - fh * 0.15, k = Math.min(1, (t - 1.6) / 1.2);
        hg.save(); hg.globalAlpha = a * k * 0.85; hg.translate(gx, gy); hg.rotate(-side * 0.12); const sc = fh / 120;
        hg.fillStyle = '#e9e4f2'; hg.shadowColor = 'rgba(220,210,255,.8)'; hg.shadowBlur = 30;
        hg.beginPath(); hg.moveTo(-60 * sc, 40 * sc); hg.bezierCurveTo(-66 * sc, -60 * sc, -30 * sc, -100 * sc, 0, -100 * sc); hg.bezierCurveTo(30 * sc, -100 * sc, 66 * sc, -60 * sc, 60 * sc, 40 * sc); hg.lineTo(60 * sc, 260 * sc); hg.lineTo(-60 * sc, 260 * sc); hg.closePath(); hg.fill();
        hg.shadowBlur = 0; hg.fillStyle = '#05040a';
        hg.beginPath(); hg.ellipse(-22 * sc, -40 * sc, 11 * sc, 15 * sc, 0, 0, 7); hg.ellipse(22 * sc, -40 * sc, 11 * sc, 15 * sc, 0, 0, 7); hg.fill();
        hg.restore();
      }
      if (t > 2.4){ hg.globalAlpha = a * Math.min(1, (t - 2.4) / 0.6); hg.fillStyle = '#c9b6ff'; hg.textAlign = 'center'; hg.font = `italic ${Math.round(Hh * 0.045)}px 'IM Fell English', Georgia, serif`; hg.fillText('…you stayed. so will I.', W / 2, Hh * 0.88); }
      hg.globalAlpha = 1;
      if (t < 4.8) requestAnimationFrame(step); else { hid.style.display = 'none'; }
    })(t0);
  }

  // ---------------------------------------------------------------
  // déclencheurs
  // ---------------------------------------------------------------
  addEventListener('hmat:state', (e) => {
    for (const raw of e.detail){
      const s = String(raw).toLowerCase();
      if (/^revel/.test(s)) possess();
      if (/porte3_arrivee|^porte3$/.test(s)) subliminal('porte3');
      if (/^fin$|fin_arrivee/.test(s)) subliminal('fin');
      if (/enfiler/.test(s)){ subDone.clear(); possessed = false; hiddenDone = false; }
    }
  });

  // démos : ?demo=sub (image subliminale), ?demo=hidden (fin cachée), ?demo=cursor
  if (Q.get('demo') === 'sub'){ const w = () => webcamOn() ? subliminal('demo') : setTimeout(w, 300); w(); }
  if (Q.get('demo') === 'hidden'){ const w = () => webcamOn() ? setTimeout(hiddenEnding, 1500) : setTimeout(w, 300); w(); }
  if (Q.get('demo') === 'cursor') setTimeout(possess, 1500);
})();
