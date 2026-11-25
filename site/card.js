// Carte personnage Dropamine : dessin sur <canvas> (750×1050), chargé seulement quand on ouvre une carte.
// window.DropCard.draw(canvas, player, opts) → Promise ; opts : { theme, skills:[{name, ic, v, max, est}], L:{…libellés}, no }
(() => {
  const W = 750, H = 1050;
  const C = { lvl: '#b85a46', wpn: '#6a88c0', prf: '#5f9a4a', gold: '#e8c88a', cream: '#efe2c6', muted: '#a8946f', rim: '#c49a5c', rimLo: '#8a6a3a' };
  // rareté : part du maximum atteinte ; le cadre suit (bronze → argent → or → légendaire)
  const RARITY = [
    { lim: 0.2, col: '#9d9d9d', frame: 'bronze' }, { lim: 0.4, col: '#1eff00', frame: 'bronze' }, { lim: 0.6, col: '#3d8fe8', frame: 'argent' },
    { lim: 0.8, col: '#b55cf5', frame: 'or' }, { lim: 9, col: '#ff8000', frame: 'legende' }];
  const FRAMES = {
    bronze: ['#e2bd7a', '#7a5a2e', '#c49a5c', '#5a3f1e'], argent: ['#f4f6f8', '#7d8590', '#d5dbe1', '#4b525b'],
    or: ['#fff1b8', '#b8860b', '#ffd75e', '#6a4c08'], legende: ['#ffe2b0', '#c25a00', '#ffa040', '#5a2200'] };
  const AMB = {
    ALLIANCE: { sky: '#173a7a', deep: '#050a18', light: '#7fb0ff', ember: '#e8c88a' }, HORDE: { sky: '#7a1d12', deep: '#140404', light: '#ff9a5a', ember: '#ffcf7a' },
    neutre: { sky: '#3a2814', deep: '#0b0806', light: '#e8c88a', ember: '#ffd79a' } };
  const RACE_AMB = { 1: ['#1f3d6e', '#9cc3ff', '#ffe6a8'], 2: ['#4a2c12', '#ffb35a', '#ffcf7a'], 3: ['#2c3e57', '#d6ecff', '#ffffff'], 4: ['#2b1d57', '#b49cff', '#8ff0dc'],
    5: ['#1d3324', '#9fe0a0', '#c8ffb0'], 6: ['#5a3a18', '#ffcf8a', '#fff0c0'], 7: ['#16434a', '#7ff0e8', '#ffb3e0'], 8: ['#173f44', '#6ff0c8', '#ffa060'] };
  const CLASS_COL = { 1: '#C69B6D', 2: '#F48CBA', 3: '#AAD372', 4: '#FFF468', 5: '#FFFFFF', 7: '#0070DD', 8: '#3FC7EB', 9: '#8788EE', 11: '#FF7C0A' };
  const ambOf = (p, theme) => {
    if (theme === 'race') { const r = RACE_AMB[p.raceId] || RACE_AMB[1]; return { sky: r[0], deep: '#05050a', light: r[1], ember: r[2] }; }
    if (theme === 'classe') { const c = CLASS_COL[p.classId] || C.rim; return { sky: mix(c, '#000000', 0.62), deep: '#050505', light: c, ember: c }; }
    if (theme === 'neutre') return AMB.neutre;
    return AMB[p.faction] || AMB.ALLIANCE;
  };
  function mix(a, b, f) { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const x = h(a), y = h(b); return '#' + x.map((v, i) => Math.round(v * (1 - f) + y[i] * f).toString(16).padStart(2, '0')).join(''); }
  const rarityOf = p => { const f = p.total / (p.max || 2460); const i = RARITY.findIndex(r => f < r.lim); return { ...RARITY[i], i }; };

  const IMG = {};
  const load = src => src ? (IMG[src] || (IMG[src] = new Promise(r => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }))) : Promise.resolve(null);
  const CROPS = new WeakMap();
  function cropOf(img) {
    if (CROPS.has(img)) return CROPS.get(img);
    const c = document.createElement('canvas'); c.width = img.width / 4; c.height = img.height / 4;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data; let a = c.width, b = c.height, e = 0, f = 0;
    for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 20) { a = Math.min(a, i); e = Math.max(e, i); b = Math.min(b, y); f = Math.max(f, y); }
    const r = e > a ? [a * 4, b * 4, (e - a + 1) * 4, (f - b + 1) * 4] : [0, 0, img.width, img.height]; CROPS.set(img, r); return r;
  }

  let g, seed;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const grad = (x0, y0, x1, y1, stops) => { const l = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => l.addColorStop(o, c)); return l; };
  function radial(x, y, r, c, a = 1) { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, c); q.addColorStop(1, c.slice(0, 7) + '00'); g.globalAlpha = a; g.fillStyle = q; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.globalAlpha = 1; }
  function T(s, x, y, size, color, o = {}) {
    g.font = `${o.w || 400} ${size}px ${o.f || "'EB Garamond', Georgia, serif"}`; g.textAlign = o.a || 'left'; g.textBaseline = o.b || 'alphabetic';
    g.letterSpacing = (o.ls || 0) + 'px';
    if (o.max) { let s2 = size; while (s2 > 10 && g.measureText(s).width > o.max) { s2 -= 1; g.font = `${o.w || 400} ${s2}px ${o.f || "'EB Garamond', Georgia, serif"}`; } }
    if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = o.stroke; g.strokeStyle = '#000'; g.strokeText(s, x, y); }
    if (o.glow) { g.save(); g.shadowColor = o.glow; g.shadowBlur = size * 0.5; g.fillStyle = color; g.fillText(s, x, y); g.restore(); }
    g.fillStyle = color; g.fillText(s, x, y); const w = g.measureText(s).width; g.letterSpacing = '0px'; return w;
  }
  // décor généré : ciel, rayons, brume, braises, vignette (en attendant de vrais décors du jeu)
  function atmos(x, y, w, h, A) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = grad(x, y, x, y + h, [[0, A.sky], [0.7, A.deep], [1, '#000']]); g.fillRect(x, y, w, h);
    const lx = x + w * 0.5, ly = y - h * 0.1;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const a = -0.5 + i * 0.17 + rnd() * 0.06, sp = 0.025 + rnd() * 0.04, len = h * 1.6;
      g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.sin(a - sp) * len, ly + Math.cos(a - sp) * len); g.lineTo(lx + Math.sin(a + sp) * len, ly + Math.cos(a + sp) * len); g.closePath();
      g.fillStyle = grad(lx, ly, lx, ly + len, [[0, A.light + '30'], [0.6, A.light + '08'], [1, A.light + '00']]); g.fill();
    }
    radial(lx, ly + h * 0.1, h * 0.7, A.light + '55');
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 9; i++) radial(x + rnd() * w, y + h * (0.65 + rnd() * 0.35), w * (0.15 + rnd() * 0.2), '#ffffff', 0.05);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 60; i++) { const ex = x + rnd() * w, ey = y + rnd() * h, er = 0.6 + rnd() * 2.2; g.globalAlpha = 0.25 + rnd() * 0.6; radial(ex, ey, er * 4, A.ember); g.fillStyle = A.ember; g.beginPath(); g.arc(ex, ey, er * 0.6, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const v = g.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.75); v.addColorStop(0, '#0000'); v.addColorStop(1, '#000000d0'); g.fillStyle = v; g.fillRect(x, y, w, h);
    g.restore();
  }
  function figure(img, cx, bottom, height, glow) {
    const [sx, sy, sw, sh] = cropOf(img), s = height / sh, dw = sw * s;
    g.save(); g.scale(1, 0.22); radial(cx, bottom / 0.22, dw * 0.45, '#000000', 0.8); g.restore();
    g.save(); g.shadowColor = glow; g.shadowBlur = 50; g.drawImage(img, sx, sy, sw, sh, cx - dw / 2, bottom - height, dw, height); g.restore();
    g.drawImage(img, sx, sy, sw, sh, cx - dw / 2, bottom - height, dw, height);
  }
  function dropPath(cx, top, w, h) {
    const r = w / 2, cy = top + h - r;
    g.beginPath(); g.moveTo(cx, top);
    g.bezierCurveTo(cx + r * 0.25, top + (h - r) * 0.45, cx + r, cy - r * 0.75, cx + r, cy);
    g.arc(cx, cy, r, 0, Math.PI);
    g.bezierCurveTo(cx - r, cy - r * 0.75, cx - r * 0.25, top + (h - r) * 0.45, cx, top); g.closePath();
  }
  function drop(cx, top, w, h, p) {
    const pt = p.parts || { level: 0, combat: 0, professions: 0 }, mx = p.max || 2460, x0 = cx - w / 2, bot = top + h;
    const bands = [[pt.professions / mx, C.prf, '#8cc472'], [pt.combat / mx, C.wpn, '#9cb6e0'], [pt.level / mx, C.lvl, '#d98a73']];
    g.save(); dropPath(cx, top, w, h); g.clip(); g.fillStyle = '#1a120b'; g.fillRect(x0, top, w, h);
    let acc = 0; const ys = bands.map(([f]) => (acc += f, bot - h * 0.06 - h * 0.82 * acc));
    for (let i = bands.length - 1; i >= 0; i--) {
      const y = ys[i], ph = i * 1.7, wave = x => y + Math.sin(x / w * Math.PI * 3 + ph) * h * 0.02;
      g.beginPath(); g.moveTo(x0, bot); for (let x = 0; x <= w; x += 2) g.lineTo(x0 + x, wave(x)); g.lineTo(x0 + w, bot); g.closePath();
      g.fillStyle = grad(0, y, 0, y + h * 0.25, [[0, bands[i][2]], [1, bands[i][1]]]); g.fill();
    }
    radial(cx - w * 0.22, top + h * 0.45, w * 0.3, '#ffffff', 0.1); g.restore();
    dropPath(cx, top, w, h); g.lineWidth = w * 0.11; g.strokeStyle = '#120c06'; g.stroke();
    g.lineWidth = w * 0.08; g.strokeStyle = grad(cx - w / 2, top, cx + w / 2, top + h, [[0, '#e2bd7a'], [0.5, '#8a6a3a'], [1, '#c49a5c']]); g.stroke();
  }
  function tile(img, x, y, s, k) {
    g.save(); rr(x, y, s, s, s * 0.08); g.fillStyle = '#000'; g.fill(); g.clip();
    if (img) g.drawImage(img, x, y, s, s);
    g.fillStyle = grad(0, y + s * 0.35, 0, y + s, [[0, '#0000'], [1, '#000c']]); g.fillRect(x, y, s, s); g.restore();
    rr(x, y, s, s, s * 0.08); g.lineWidth = Math.max(2, s * 0.035); g.strokeStyle = '#6b5a3a'; g.stroke();
    const f = "'Arial Narrow', Arial, sans-serif";
    T((k.est ? '~' : '') + k.v, x + s * 0.92, y + s * 0.6, s * 0.36, '#fff', { f, w: 700, a: 'right', stroke: s * 0.06 });
    if (k.max) T('/' + k.max, x + s * 0.92, y + s * 0.88, s * 0.2, '#e6e6e6', { f, w: 700, a: 'right', stroke: s * 0.04 });
  }
  function triBar(x, y, w, h, p) {
    const pt = p.parts || {}, mx = p.max || 2460; rr(x, y, w, h, h * 0.3); g.fillStyle = '#0b0806'; g.fill(); g.strokeStyle = '#3c2f1e'; g.lineWidth = 1.5; g.stroke();
    g.save(); rr(x + 2, y + 2, w - 4, h - 4, h * 0.25); g.clip(); let cx = x + 2;
    for (const [f, c] of [[(pt.level || 0) / mx, C.lvl], [(pt.combat || 0) / mx, C.wpn], [(pt.professions || 0) / mx, C.prf]]) { g.fillStyle = c; g.fillRect(cx, y, (w - 4) * f, h); cx += (w - 4) * f; }
    g.fillStyle = '#ffffff22'; g.fillRect(x, y + 2, w, h * 0.3); g.restore();
  }
  function plate(x, y, w, h, F) { rr(x, y, w, h, 6); g.fillStyle = grad(0, y, 0, y + h, [[0, '#2a1e12'], [1, '#120c07']]); g.fill(); g.lineWidth = 2; g.strokeStyle = F[1]; g.stroke(); }
  // éclats du cadre légendaire
  function sparkle(x, y, r, c) { g.save(); g.globalCompositeOperation = 'lighter'; radial(x, y, r * 3, c); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - r * 2); g.lineTo(x + r * 0.3, y); g.lineTo(x, y + r * 2); g.lineTo(x - r * 0.3, y); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x - r * 2, y); g.lineTo(x, y + r * 0.3); g.lineTo(x + r * 2, y); g.lineTo(x, y - r * 0.3); g.closePath(); g.fill(); g.restore(); }

  async function draw(cv, p, o) {
    cv.width = W; cv.height = H; g = cv.getContext('2d'); seed = 7;
    const L = o.L, R = rarityOf(p), F = FRAMES[R.frame], A = ambOf(p, o.theme);
    const [render, ...icons] = await Promise.all([load(p.render), ...o.skills.map(k => load(k.img))]);
    // cadre (sa matière dépend de la rareté)
    g.clearRect(0, 0, W, H);
    rr(4, 4, W - 8, H - 8, 30); g.fillStyle = grad(0, 0, W, H, [[0, F[0]], [0.35, F[1]], [0.65, F[2]], [1, F[3]]]); g.fill();
    if (R.frame === 'legende') { g.save(); rr(4, 4, W - 8, H - 8, 30); g.clip(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) radial(rnd() * W, rnd() * H, 30 + rnd() * 60, '#ff8a00', 0.35); g.restore(); }
    rr(18, 18, W - 36, H - 36, 20); g.fillStyle = '#140e08'; g.fill(); g.lineWidth = 2; g.strokeStyle = F[0] + '88'; g.stroke();
    const ax = 36, ay = 104, aw = W - 72, ah = 560;
    g.save(); rr(ax, ay, aw, ah, 12); g.clip(); atmos(ax, ay, aw, ah, A);
    if (render) figure(render, ax + aw / 2, ay + ah - 18, ah * 0.9, A.light + 'aa');
    else drop(ax + aw / 2, ay + 110, 220, 300, p);
    g.restore();
    rr(ax, ay, aw, ah, 12); g.lineWidth = 4; g.strokeStyle = F[2]; g.stroke(); g.lineWidth = 1.5; g.strokeStyle = '#000'; g.stroke();
    // bandeau du nom et gemme du niveau
    plate(36, 34, W - 72, 58, F);
    T(`${p.name} ${p.surname}`, 56, 75, 38, C.gold, { f: "'Cormorant SC', Georgia, serif", w: 700, max: W - 200 });
    g.beginPath(); g.arc(W - 74, 63, 24, 0, 7); g.fillStyle = grad(0, 39, 0, 87, [[0, '#d98a73'], [1, '#7a2e22']]); g.fill(); g.lineWidth = 3; g.strokeStyle = F[2]; g.stroke();
    T(String(p.level), W - 74, 64, 24, '#fff', { f: "'Cormorant Garamond', Georgia, serif", w: 700, a: 'center', b: 'middle', stroke: 3 });
    // gemme de rareté
    g.save(); g.translate(W / 2, ay + ah); g.rotate(Math.PI / 4); g.shadowColor = R.col; g.shadowBlur = 25; g.fillStyle = R.col; g.fillRect(-16, -16, 32, 32); g.restore();
    g.save(); g.translate(W / 2, ay + ah); g.rotate(Math.PI / 4); g.lineWidth = 3; g.strokeStyle = F[2]; g.strokeRect(-16, -16, 32, 32); g.fillStyle = '#ffffff55'; g.fillRect(-12, -12, 10, 10); g.restore();
    plate(36, ay + ah + 24, W - 72, 44, F);
    T(L.line, 56, ay + ah + 53, 21, C.cream, { max: W - 290 });
    T(L.rarity[R.i], W - 56, ay + ah + 53, 21, R.col, { a: 'right', w: 500 });
    // compétences choisies (4 au plus)
    const ty = ay + ah + 86, n = Math.max(1, o.skills.length), s = 120, gap = n > 1 ? (W - 72 - n * s) / (n - 1) : 0, x0 = n > 1 ? 36 : (W - s) / 2;
    o.skills.forEach((k, i) => tile(icons[i], x0 + i * (s + gap), ty, s, k));
    // goutte, total, barre trois couleurs
    const by = ty + s + 22; drop(80, by - 6, 62, 90, p);
    const tw = T(L.total, 130, by + 46, 46, C.gold, { f: "'Cormorant Garamond', Georgia, serif", w: 700 });
    T(`/ ${L.max}`, 130 + tw + 10, by + 46, 22, C.muted);
    triBar(130, by + 58, W - 166, 18, p);
    // pied : numéro de collection et adresse
    T(L.no, 44, H - 32, 17, F[2], { w: 500, ls: 1 });
    T('dropamine.app', W - 44, H - 32, 17, C.muted, { a: 'right', ls: 3 });
    if (R.frame === 'legende' || R.frame === 'or') for (let i = 0; i < (R.frame === 'legende' ? 7 : 3); i++) { const e = [[W - 22, 120], [22, 300], [W - 22, 560], [W / 2, 22], [22, 820], [W - 22, 900], [200, H - 22]][i]; sparkle(e[0], e[1], 5, R.frame === 'legende' ? '#ff9a2e' : '#ffd75e'); }
    return R;
  }
  window.DropCard = { draw, rarityOf, load };
})();
