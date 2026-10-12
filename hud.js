// hud.js — le compteur de bonbons construit avec la Rive CLI (cli/candy-hud, écrit en RML).
// Il tourne comme un second fichier Rive, en haut à gauche, pendant la tournée. La page lui transmet
// le nombre de bonbons (View Model « HUD », propriété « candies ») ; son script Luau déclenche le rebond.
(() => {
  'use strict';
  const H = () => window.HMAT;
  const log = (m) => H() && H().log(m);
  const URL_HUD = 'assets/rive/candy-hud.riv';
  if (/[?&]hud=0/.test(location.search)) return;

  const cv = document.createElement('canvas');
  cv.id = 'hudCanvas';
  Object.assign(cv.style, { position: 'absolute', left: '14px', top: '14px', width: 'min(240px, 28vw)', aspectRatio: '320 / 140', zIndex: 14, display: 'none', pointerEvents: 'none' });
  (document.getElementById('app') || document.body).appendChild(cv);

  let r = null, prop = null, shown = false, last = -1;
  async function load(){
    if (!window.rive || !/^https?:/.test(location.protocol)) return;   // en local (file://), fetch est bloqué : pas de HUD
    try {
      const res = await fetch(URL_HUD, { cache: 'no-cache' }); if (!res.ok) return;
      const buf = await res.arrayBuffer();
      r = new rive.Rive({
        buffer: buf, canvas: cv, autoplay: true, autoBind: true, stateMachines: 'State Machine 1',
        layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.TopLeft }),
        onLoad: () => {
          r.resizeDrawingSurfaceToCanvas();
          const vmi = r.viewModelInstance; prop = vmi && vmi.number('candies');
          log(prop ? 'HUD (Rive CLI) chargé' : 'HUD chargé, mais propriété candies introuvable');
        },
        onLoadError: (e) => log('HUD : erreur de chargement ' + (e && e.data || e)),
      });
    } catch (e){ log('HUD indisponible : ' + e.message); }
  }
  const wait = () => window.rive ? load() : setTimeout(wait, 200);
  wait();

  addEventListener('hmat:state', (e) => {
    for (const raw of e.detail){
      const s = String(raw).toLowerCase();
      if (/enfiler|drap_tombe|^porte1$/.test(s)) shown = true;
      if (/revel|carte|attente/.test(s)) shown = false;
    }
  });
  function tick(){
    const g = window.HMAT_GAME;
    const on = !!(r && shown && !(window.HMAT_FINALE && window.HMAT_FINALE.active));
    if (cv.style.display !== (on ? 'block' : 'none')){ cv.style.display = on ? 'block' : 'none'; if (on && r) r.resizeDrawingSurfaceToCanvas(); }
    if (prop && g && g.candies !== last){ last = g.candies; prop.value = g.candies; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
