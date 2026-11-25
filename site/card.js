// Carte personnage Dropamine : dessin sur <canvas> (750×1050).
// window.DropCard.draw(canvas, player, opts) → Promise<rareté>
// opts : { theme, weather, frame, finish, title, show:{guild,no,bar}, bg:Image|null, skills:[{name,img,v,max,est}], L:{line,rarity[],total,max,no} }
(() => {
  const W = 750, H = 1050;
  const C = { gold: '#e8c88a', cream: '#efe2c6', muted: '#a8946f' };
  // rareté : part du maximum atteinte ; chaque palier débloque un cadre
  const RARITY = [
    { lim: 0.2, col: '#9d9d9d', frame: 'bronze' }, { lim: 0.4, col: '#1eff00', frame: 'bronze' }, { lim: 0.6, col: '#3d8fe8', frame: 'argent' },
    { lim: 0.8, col: '#b55cf5', frame: 'or' }, { lim: 9, col: '#ff8000', frame: 'legende' }];
  const FRAME_ORDER = ['bronze', 'argent', 'or', 'legende'];
  const FRAME_FROM = { bronze: 0, argent: 0.4, or: 0.6, legende: 0.8 };   // part du maximum qui débloque le cadre
  const FRAMES = {
    bronze: ['#e2bd7a', '#7a5a2e', '#c49a5c', '#5a3f1e'], argent: ['#f4f6f8', '#7d8590', '#d5dbe1', '#4b525b'],
    or: ['#fff1b8', '#b8860b', '#ffd75e', '#6a4c08'], legende: ['#ffe2b0', '#c25a00', '#ffa040', '#5a2200'] };
  const AMB = {
    ALLIANCE: { sky: '#173a7a', deep: '#050a18', light: '#7fb0ff', ember: '#e8c88a' }, HORDE: { sky: '#7a1d12', deep: '#140404', light: '#ff9a5a', ember: '#ffcf7a' },
    neutre: { sky: '#3a2814', deep: '#0b0806', light: '#e8c88a', ember: '#ffd79a' } };
  // chaque race a sa lumière et sa météo par défaut
  const RACE = {
    1: { amb: ['#1f3d6e', '#9cc3ff', '#ffe6a8'], weather: 'rays' }, 2: { amb: ['#5a2a10', '#ffb35a', '#ffcf7a'], weather: 'embers' },
    3: { amb: ['#2c3e57', '#d6ecff', '#ffffff'], weather: 'snow' }, 4: { amb: ['#2b1d57', '#b49cff', '#c8ff9a'], weather: 'fireflies' },
    5: { amb: ['#1d3324', '#9fe0a0', '#c8ffb0'], weather: 'mist' }, 6: { amb: ['#5a3a18', '#ffcf8a', '#fff0c0'], weather: 'rays' },
    7: { amb: ['#16434a', '#7ff0e8', '#ffffff'], weather: 'snow' }, 8: { amb: ['#173f44', '#6ff0c8', '#ffa060'], weather: 'embers' } };
  const CLASS_COL = { 1: '#C69B6D', 2: '#F48CBA', 3: '#AAD372', 4: '#FFF468', 5: '#FFFFFF', 7: '#0070DD', 8: '#3FC7EB', 9: '#8788EE', 11: '#FF7C0A' };
  const ambOf = (p, theme) => {
    if (theme === 'race') { const r = (RACE[p.raceId] || RACE[1]).amb; return { sky: r[0], deep: '#05050a', light: r[1], ember: r[2] }; }
    if (theme === 'classe') { const c = CLASS_COL[p.classId] || '#c49a5c'; return { sky: mix(c, '#000000', 0.62), deep: '#050505', light: c, ember: c }; }
    if (theme === 'neutre' || theme === 'image') return AMB.neutre;
    return AMB[p.faction] || AMB.ALLIANCE;
  };
  function mix(a, b, f) { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const x = h(a), y = h(b); return '#' + x.map((v, i) => Math.round(v * (1 - f) + y[i] * f).toString(16).padStart(2, '0')).join(''); }
  const rarityOf = p => { const f = p.total / (p.max || 2460); const i = RARITY.findIndex(r => f < r.lim); return { ...RARITY[i], i }; };
  // cadres débloqués et seuil (en drops) des suivants
  const framesOf = p => FRAME_ORDER.map(k => ({ k, open: FRAME_ORDER.indexOf(k) <= FRAME_ORDER.indexOf(rarityOf(p).frame), at: Math.ceil(FRAME_FROM[k] * (p.max || 2460)) }));
  const sceneOf = p => RACE[p.raceId] || RACE[1];

  const IMG = {};
  const load = src => src ? (IMG[src] || (IMG[src] = new Promise(r => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }))) : Promise.resolve(null);
  // cadrage du rendu 3D : boîte des pixels visibles + centre de masse horizontal (le corps, pas l'arme)
  const CROPS = new WeakMap();
  function cropOf(img) {
    if (CROPS.has(img)) return CROPS.get(img);
    const c = document.createElement('canvas'); c.width = img.width / 4; c.height = img.height / 4;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data; let a = c.width, b = c.height, e = 0, f = 0, m = 0, mx = 0;
    for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) {
      const al = d[(y * c.width + i) * 4 + 3]; if (al <= 20) continue;
      a = Math.min(a, i); e = Math.max(e, i); b = Math.min(b, y); f = Math.max(f, y); m += al; mx += al * i;
    }
    const r = e > a ? { sx: a * 4, sy: b * 4, sw: (e - a + 1) * 4, sh: (f - b + 1) * 4, cx: (mx / m) * 4 } : { sx: 0, sy: 0, sw: img.width, sh: img.height, cx: img.width / 2 };
    CROPS.set(img, r); return r;
  }

  let g, seed;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const grad = (x0, y0, x1, y1, stops) => { const l = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => l.addColorStop(o, c)); return l; };
  function radial(x, y, r, c, a = 1) { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, c); q.addColorStop(1, c.slice(0, 7) + '00'); g.globalAlpha = a; g.fillStyle = q; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.globalAlpha = 1; }
  const SERIF = "'EB Garamond', Georgia, serif", SC = "'Cormorant SC', Georgia, serif", NUM = "'Cormorant Garamond', Georgia, serif", NARROW = "'Arial Narrow', Arial, sans-serif";
  function T(s, x, y, size, color, o = {}) {
    const font = sz => `${o.it ? 'italic ' : ''}${o.w || 400} ${sz}px ${o.f || SERIF}`;
    g.font = font(size); g.textAlign = o.a || 'left'; g.textBaseline = o.b || 'alphabetic'; g.letterSpacing = (o.ls || 0) + 'px';
    if (o.max) { let s2 = size; while (s2 > 10 && g.measureText(s).width > o.max) { s2 -= 1; g.font = font(s2); } }
    if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = o.stroke; g.strokeStyle = '#000'; g.strokeText(s, x, y); }
    if (o.glow) { g.save(); g.shadowColor = o.glow; g.shadowBlur = size * 0.5; g.fillStyle = color; g.fillText(s, x, y); g.restore(); }
    g.fillStyle = color; g.fillText(s, x, y); const w = g.measureText(s).width; g.letterSpacing = '0px'; return w;
  }

  /* ---------- Décor : ciel, paysage de la race, météo ---------- */
  function sky(x, y, w, h, A, rays) {
    g.fillStyle = grad(x, y, x, y + h, [[0, A.sky], [0.75, A.deep], [1, '#000']]); g.fillRect(x, y, w, h);
    const lx = x + w * 0.5, ly = y - h * 0.1;
    g.globalCompositeOperation = 'lighter';
    if (rays) for (let i = 0; i < 7; i++) {
      const a = -0.5 + i * 0.17 + rnd() * 0.06, sp = 0.025 + rnd() * 0.04, len = h * 1.6;
      g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.sin(a - sp) * len, ly + Math.cos(a - sp) * len); g.lineTo(lx + Math.sin(a + sp) * len, ly + Math.cos(a + sp) * len); g.closePath();
      g.fillStyle = grad(lx, ly, lx, ly + len, [[0, A.light + (rays > 1 ? '40' : '22')], [0.6, A.light + '08'], [1, A.light + '00']]); g.fill();
    }
    radial(lx, ly + h * 0.12, h * 0.7, A.light + '50');
    g.globalCompositeOperation = 'source-over';
  }
  function weather(kind, x, y, w, h, A) {
    g.save(); g.globalCompositeOperation = 'lighter';
    if (kind === 'snow') for (let i = 0; i < 160; i++) { const r = 0.8 + rnd() * 2.6, px = x + rnd() * w, py = y + rnd() * h; g.globalAlpha = 0.35 + rnd() * 0.6; radial(px, py, r * 2.2, '#ffffff'); g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, r * 0.7, 0, 7); g.fill(); }
    else if (kind === 'rain') { g.strokeStyle = '#cfe0ff'; for (let i = 0; i < 180; i++) { const px = x + rnd() * w * 1.2, py = y + rnd() * h, l = 14 + rnd() * 22; g.globalAlpha = 0.15 + rnd() * 0.3; g.lineWidth = 1 + rnd(); g.beginPath(); g.moveTo(px, py); g.lineTo(px - l * 0.3, py + l); g.stroke(); } }
    else if (kind === 'fireflies') for (let i = 0; i < 45; i++) { const px = x + rnd() * w, py = y + h * (0.3 + rnd() * 0.65); g.globalAlpha = 0.5 + rnd() * 0.5; radial(px, py, 10 + rnd() * 10, A.ember); g.fillStyle = '#fffbe0'; g.beginPath(); g.arc(px, py, 1.6, 0, 7); g.fill(); }
    else if (kind === 'embers') for (let i = 0; i < 70; i++) { const px = x + rnd() * w, py = y + rnd() * h, r = 0.6 + rnd() * 2.2; g.globalAlpha = 0.3 + rnd() * 0.6; radial(px, py, r * 4, '#ff8a3a'); g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(px, py, r * 0.6, 0, 7); g.fill(); }
    else if (kind === 'mist') { g.globalCompositeOperation = 'source-over'; for (let i = 0; i < 16; i++) radial(x + rnd() * w, y + h * (0.45 + rnd() * 0.55), w * (0.18 + rnd() * 0.25), '#d8f0e0', 0.09); }
    else if (kind === 'rays') for (let i = 0; i < 50; i++) { const px = x + rnd() * w, py = y + rnd() * h, r = 0.6 + rnd() * 1.8; g.globalAlpha = 0.2 + rnd() * 0.5; radial(px, py, r * 4, A.ember); }
    g.restore();
  }
  function vignette(x, y, w, h) { const v = g.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.75); v.addColorStop(0, '#0000'); v.addColorStop(1, '#000000c8'); g.fillStyle = v; g.fillRect(x, y, w, h); }
  function cover(img, x, y, w, h) { const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s; g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }
  function figure(img, cx, bottom, height, glow) {
    const c = cropOf(img), s = height / c.sh, dw = c.sw * s, dx = cx - (c.cx - c.sx) * s;
    g.save(); g.scale(1, 0.22); radial(cx, bottom / 0.22, dw * 0.4, '#000000', 0.85); g.restore();
    g.save(); g.shadowColor = glow; g.shadowBlur = 50; g.drawImage(img, c.sx, c.sy, c.sw, c.sh, dx, bottom - height, dw, height); g.restore();
    g.drawImage(img, c.sx, c.sy, c.sw, c.sh, dx, bottom - height, dw, height);
  }

  /* ---------- Pièces de la carte ---------- */
  function tile(img, x, y, s, k) {
    g.save(); rr(x, y, s, s, s * 0.08); g.fillStyle = '#000'; g.fill(); g.clip();
    if (img) g.drawImage(img, x, y, s, s);
    g.fillStyle = grad(0, y + s * 0.35, 0, y + s, [[0, '#0000'], [1, '#000c']]); g.fillRect(x, y, s, s); g.restore();
    rr(x, y, s, s, s * 0.08); g.lineWidth = Math.max(2, s * 0.035); g.strokeStyle = '#6b5a3a'; g.stroke();
    T((k.est ? '~' : '') + k.v, x + s * 0.92, y + s * 0.6, s * 0.38, '#fff', { f: NARROW, w: 700, a: 'right', stroke: s * 0.06 });
    if (k.max) T('/' + k.max, x + s * 0.92, y + s * 0.88, s * 0.21, '#e6e6e6', { f: NARROW, w: 700, a: 'right', stroke: s * 0.04 });
  }
  function triBar(x, y, w, h, p) {
    const pt = p.parts || {}, mx = p.max || 2460; rr(x, y, w, h, h * 0.3); g.fillStyle = '#0b0806'; g.fill(); g.strokeStyle = '#3c2f1e'; g.lineWidth = 1.5; g.stroke();
    g.save(); rr(x + 2, y + 2, w - 4, h - 4, h * 0.25); g.clip(); let cx = x + 2;
    for (const [f, c] of [[(pt.level || 0) / mx, '#b85a46'], [(pt.combat || 0) / mx, '#6a88c0'], [(pt.professions || 0) / mx, '#5f9a4a']]) { g.fillStyle = c; g.fillRect(cx, y, (w - 4) * f, h); cx += (w - 4) * f; }
    g.fillStyle = '#ffffff22'; g.fillRect(x, y + 2, w, h * 0.3); g.restore();
  }
  function plate(x, y, w, h, F) { rr(x, y, w, h, 6); g.fillStyle = grad(0, y, 0, y + h, [[0, '#2a1e12'], [1, '#120c07']]); g.fill(); g.lineWidth = 2; g.strokeStyle = F[1]; g.stroke(); }
  function sparkle(x, y, r, c) { g.save(); g.globalCompositeOperation = 'lighter'; radial(x, y, r * 3, c); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - r * 2); g.lineTo(x + r * 0.3, y); g.lineTo(x, y + r * 2); g.lineTo(x - r * 0.3, y); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x - r * 2, y); g.lineTo(x, y + r * 0.3); g.lineTo(x + r * 2, y); g.lineTo(x, y - r * 0.3); g.closePath(); g.fill(); g.restore(); }
  // finition : brillante = reflet de lumière ; holo = reflet + arc-en-ciel
  function finish(kind) {
    if (!kind || kind === 'mate') return;
    g.save(); rr(4, 4, W - 8, H - 8, 30); g.clip();
    if (kind === 'holo') {
      g.globalCompositeOperation = 'color-dodge'; g.globalAlpha = 0.22;
      g.fillStyle = grad(0, 0, W, H, [[0, '#ff50b4'], [0.2, '#50c8ff'], [0.4, '#78ff8c'], [0.6, '#ffe65a'], [0.8, '#ff50b4'], [1, '#50c8ff']]); g.fillRect(0, 0, W, H);
    }
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 1;
    g.fillStyle = grad(0, 0, W, H, [[0.2, '#ffffff00'], [0.38, '#ffffffaa'], [0.46, '#ffffff00'], [0.62, '#ffffff00'], [0.7, '#ffffff66'], [0.76, '#ffffff00']]); g.fillRect(0, 0, W, H);
    g.restore();
  }

  async function draw(cv, p, o) {
    cv.width = W; cv.height = H; g = cv.getContext('2d'); seed = 7 + (p.level || 0);
    const L = o.L, R = rarityOf(p), show = { guild: true, no: true, bar: true, ...(o.show || {}) };
    const frame = o.frame && framesOf(p).find(f => f.k === o.frame && f.open) ? o.frame : R.frame, F = FRAMES[frame];
    const A = ambOf(p, o.theme), scene = sceneOf(p), wx = !o.weather || o.weather === 'auto' ? scene.weather : o.weather;
    const [render, logo, ...icons] = await Promise.all([load(p.render), load('Dropamine-Logo.png'), ...o.skills.map(k => load(k.img))]);
    g.clearRect(0, 0, W, H);
    // cadre (matière selon le palier choisi)
    rr(4, 4, W - 8, H - 8, 30); g.fillStyle = grad(0, 0, W, H, [[0, F[0]], [0.35, F[1]], [0.65, F[2]], [1, F[3]]]); g.fill();
    if (frame === 'legende') { g.save(); rr(4, 4, W - 8, H - 8, 30); g.clip(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) radial(rnd() * W, rnd() * H, 30 + rnd() * 60, '#ff8a00', 0.35); g.restore(); }
    rr(18, 18, W - 36, H - 36, 20); g.fillStyle = '#140e08'; g.fill(); g.lineWidth = 2; g.strokeStyle = F[0] + '88'; g.stroke();
    // scène
    const ax = 36, ay = o.title ? 122 : 104, aw = W - 72, ah = o.title ? 542 : 560;
    g.save(); rr(ax, ay, aw, ah, 12); g.clip();
    if (o.theme === 'image' && o.bg) { cover(o.bg, ax, ay, aw, ah); g.fillStyle = '#0000002a'; g.fillRect(ax, ay, aw, ah); }
    else { sky(ax, ay, aw, ah, A, wx === 'rays' ? 2 : wx === 'rain' || wx === 'mist' ? 0 : 1); radial(ax + aw / 2, ay + ah * 0.92, aw * 0.6, A.light + '26'); }
    if (wx !== 'none' && wx !== 'mist') weather(wx, ax, ay, aw, ah, A);
    if (render) figure(render, ax + aw / 2, ay + ah - 16, ah * 0.88, A.light + 'aa');
    else if (logo) g.drawImage(logo, ax + aw / 2 - 150, ay + ah / 2 - 150, 300, 300);
    if (wx === 'mist') weather('mist', ax, ay, aw, ah, A);
    vignette(ax, ay, aw, ah);
    g.restore();
    rr(ax, ay, aw, ah, 12); g.lineWidth = 4; g.strokeStyle = F[2]; g.stroke(); g.lineWidth = 1.5; g.strokeStyle = '#000'; g.stroke();
    // bandeau du nom (et titre), gemme du niveau
    const nh = o.title ? 76 : 58; plate(36, 34, W - 72, nh, F);
    T(`${p.name} ${p.surname}`, 56, 75, 40, C.gold, { f: SC, w: 700, max: W - 200 });
    if (o.title) T(o.title, 57, 101, 21, C.cream, { it: true, max: W - 200 });
    g.beginPath(); g.arc(W - 74, 34 + nh / 2, 25, 0, 7); g.fillStyle = grad(0, 34, 0, 34 + nh, [[0, '#d98a73'], [1, '#7a2e22']]); g.fill(); g.lineWidth = 3; g.strokeStyle = F[2]; g.stroke();
    T(String(p.level), W - 74, 35 + nh / 2, 26, '#fff', { f: NUM, w: 700, a: 'center', b: 'middle', stroke: 3 });
    // gemme de rareté
    g.save(); g.translate(W / 2, ay + ah); g.rotate(Math.PI / 4); g.shadowColor = R.col; g.shadowBlur = 25; g.fillStyle = R.col; g.fillRect(-17, -17, 34, 34); g.restore();
    g.save(); g.translate(W / 2, ay + ah); g.rotate(Math.PI / 4); g.lineWidth = 3; g.strokeStyle = F[2]; g.strokeRect(-17, -17, 34, 34); g.fillStyle = '#ffffff55'; g.fillRect(-13, -13, 10, 10); g.restore();
    plate(36, ay + ah + 24, W - 72, 48, F);
    T(show.guild ? L.line : L.lineNoGuild, 56, ay + ah + 56, 24, C.cream, { max: W - 300 });
    T(L.rarity[R.i], W - 56, ay + ah + 56, 25, R.col, { a: 'right', w: 500 });
    // compétences (0 à 4)
    const ty = ay + ah + 90, n = o.skills.length, s = 120;
    if (n) { const gap = n > 1 ? (W - 72 - n * s) / (n - 1) : 0, x0 = n > 1 ? 36 : (W - s) / 2; o.skills.forEach((k, i) => tile(icons[i], x0 + i * (s + gap), ty, s, k)); }
    // le logo Dropamine d'origine, le total et la barre trois couleurs
    const by = n ? ty + s + 16 : ty + 30;
    if (logo) g.drawImage(logo, 34, by - 10, 96, 96);
    const tw = T(L.total, 132, by + 42, 50, C.gold, { f: NUM, w: 700 });
    T(`/ ${L.max}`, 132 + tw + 10, by + 42, 24, C.muted);
    if (show.bar) triBar(132, by + 56, W - 168, 20, p);
    // pied : numéro de collection et adresse
    if (show.no) T(L.no, 44, H - 30, 20, F[2], { w: 500, max: W - 300 });
    T('dropamine.app', W - 44, H - 30, 20, C.muted, { a: 'right', ls: 2 });
    if (frame === 'legende' || frame === 'or') [[W - 22, 130], [22, 300], [W - 22, 560], [W / 2, 22], [22, 820], [W - 22, 900], [200, H - 22]].slice(0, frame === 'legende' ? 7 : 3)
      .forEach(([x, y]) => sparkle(x, y, 5, frame === 'legende' ? '#ff9a2e' : '#ffd75e'));
    finish(o.finish);
    return R;
  }
  window.DropCard = { draw, rarityOf, framesOf, sceneOf, load, FRAME_ORDER };
})();
