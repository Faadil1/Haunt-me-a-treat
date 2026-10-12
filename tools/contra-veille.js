// Veille Contra — #rivehalloweenchallenge
// À coller dans la console (F12 > Console) sur :
// https://contra.com/community/topic/rivehalloweenchallenge/recent
// Le script défile tout seul, accumule les posts, puis copie le JSON dans ton presse-papiers
// (et télécharge aussi un fichier contra-veille.json en secours).

(async () => {
  const MAX_ROUNDS = 80;       // nombre max de défilements
  const WAIT_MS = 1600;        // attente entre défilements
  const STALL_LIMIT = 4;       // arrêt si rien de nouveau après N tours
  const POST_RE = /\/community\/([A-Za-z0-9]{8})-[^/?#]+/;

  // Mots-clés qui recoupent Haunt Me a Treat (pour repérer les concurrents directs)
  const FLAGS = {
    webcam: /webcam|camera|caméra|mediapipe|face ?track|facial|visage|your face|ton visage|expression/i,
    micro: /micro(phone)?|voice|voix|scream into|shout|crie/i,
    fantomeDrap: /sheet ghost|bedsheet|drap|ghost costume/i,
    trickOrTreat: /trick.?or.?treat|candy|bonbon|door ?to ?door|porte/i,
    gpuCanvas: /gpu canvas|wgsl|shader/i,
    cli: /rive cli|\bcli\b|rive --/i,
    son: /sound|audio|son\b/i,
  };
  const posts = new Map();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

  const num = (s) => {
    if (!s) return null;
    const m = String(s).replace(',', '.').match(/(\d+(?:\.\d+)?)\s*([kK])?/);
    if (!m) return null;
    return Math.round(parseFloat(m[1]) * (m[2] ? 1000 : 1));
  };

  // Remonte depuis le lien jusqu'au plus grand conteneur qui ne contient qu'UN seul post
  const cardOf = (a, id) => {
    let el = a;
    while (el.parentElement && el.parentElement !== document.body) {
      const p = el.parentElement;
      const ids = new Set(
        [...p.querySelectorAll('a[href*="/community/"]')]
          .map((x) => (x.getAttribute('href') || '').match(POST_RE))
          .filter(Boolean)
          .map((m) => m[1])
      );
      if (ids.size > 1 || (ids.size === 1 && !ids.has(id))) break;
      el = p;
    }
    return el;
  };

  const engagement = (card) => {
    const out = { likes: null, comments: null };
    card.querySelectorAll('[aria-label], [title]').forEach((el) => {
      const label = (el.getAttribute('aria-label') || el.getAttribute('title') || '') + ' ' + clean(el.textContent);
      if (/like|j'aime|heart|upvote/i.test(label) && out.likes === null) out.likes = num(label);
      if (/comment/i.test(label) && out.comments === null) out.comments = num(label);
    });
    return out;
  };

  const collect = () => {
    let added = 0;
    document.querySelectorAll('a[href*="/community/"]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const m = href.match(POST_RE);
      if (!m) return;
      const id = m[1];
      if (/\/community\/topic\//.test(href)) return;
      const card = cardOf(a, id);
      const text = clean(card.innerText);
      const prev = posts.get(id);
      if (prev && prev.text.length >= text.length) return;

      const time = card.querySelector('time');
      const authorLink = [...card.querySelectorAll('a[href]')].find((x) => {
        const h = x.getAttribute('href') || '';
        return /^\/[A-Za-z0-9_.-]+\/?$/.test(h) && !/^\/(community|search|explore)/.test(h);
      });
      const heading = card.querySelector('h1,h2,h3,h4');
      const eng = engagement(card);
      const smallNums = [...card.querySelectorAll('span,button,div')]
        .filter((el) => el.children.length === 0 && /^\d+(\.\d+)?[kK]?$/.test(clean(el.textContent)))
        .map((el) => clean(el.textContent));

      posts.set(id, {
        id,
        url: 'https://contra.com' + href.split('?')[0],
        title: clean(heading ? heading.textContent : a.textContent).slice(0, 200),
        author: authorLink ? clean(authorLink.textContent) : null,
        authorUrl: authorLink ? 'https://contra.com' + authorLink.getAttribute('href') : null,
        date: time ? time.getAttribute('datetime') || clean(time.textContent) : null,
        isSubmission: /\bSubmission\b/.test(text),
        likes: eng.likes,
        comments: eng.comments,
        rawNumbers: smallNums.slice(0, 6),
        hasShowMore: /Show more|Voir plus/i.test(text),
        flags: Object.keys(FLAGS).filter((k) => FLAGS[k].test(text)),
        text: text.slice(0, 1500),
      });
      if (!prev) added++;
    });
    return added;
  };

  console.log('%cVeille Contra : défilement en cours…', 'color:#e8743b;font-weight:bold');
  let stall = 0;
  for (let i = 0; i < MAX_ROUNDS && stall < STALL_LIMIT; i++) {
    const added = collect();
    stall = added === 0 ? stall + 1 : 0;
    console.log(`Tour ${i + 1} : +${added} (total ${posts.size})`);
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(WAIT_MS);
  }
  collect();

  const result = {
    capturedAt: new Date().toISOString(),
    page: location.href,
    count: posts.size,
    posts: [...posts.values()],
  };
  const json = JSON.stringify(result, null, 2);

  try { copy(json); console.log('%cJSON copié dans le presse-papiers ✔', 'color:green;font-weight:bold'); }
  catch (e) { console.warn('copy() indisponible, utilise le fichier téléchargé.'); }

  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'contra-veille-' + new Date().toISOString().slice(0, 16).replace(':', 'h') + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();

  const close = result.posts.filter((p) => p.flags.includes('webcam') || p.flags.includes('fantomeDrap') || p.flags.includes('trickOrTreat'));
  console.log('%cÀ regarder en priorité (webcam / visage / drap / trick-or-treat) :', 'color:#e8743b;font-weight:bold');
  console.table(close.map((p) => ({ titre: p.title.slice(0, 60), auteur: p.author, date: p.date, flags: p.flags.join(','), url: p.url })));
  console.log(`Terminé : ${posts.size} posts.`);
  return result;
})();
