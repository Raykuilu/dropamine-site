// Image Hiscores d'un personnage (1200×630) : portrait 3D + parchemin façon classement OSRS,
// avec la touche Dropamine (ruban trois couleurs, sceau-goutte, barres de couleur par groupe).
// window.DropShare.draw(canvas, player, { rows:[{name,img,v,max,rank,week,group,total}], L:{title,sub,cols[4],date} })
(() => {
  const W = 1200, H = 630;
  const COL = { lvl: ['#b85a46', '#d98a73'], wpn: ['#6a88c0', '#9cb6e0'], prf: ['#5f9a4a', '#8cc472'] };
  const NARROW = "'Arial Narrow', Arial, sans-serif", SC = "'Cormorant SC', Georgia, serif", SERIF = "'EB Garamond', Georgia, serif";
  const IMG = {};
  const load = s => s ? (IMG[s] || (IMG[s] = new Promise(r => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => r(i); i.onerror = () => r(null); i.src = s; }))) : Promise.resolve(null);
  let g, seed;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const grad = (x0, y0, x1, y1, s) => { const l = g.createLinearGradient(x0, y0, x1, y1); s.forEach(([o, c]) => l.addColorStop(o, c)); return l; };
  function radial(x, y, r, c, a = 1) { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, c); q.addColorStop(1, c.slice(0, 7) + '00'); g.globalAlpha = a; g.fillStyle = q; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.globalAlpha = 1; }
  function T(s, x, y, size, color, o = {}) {
    const font = z => `${o.w || 400} ${z}px ${o.f || SERIF}`;
    g.font = font(size); g.textAlign = o.a || 'left'; g.textBaseline = 'alphabetic';
    if (o.max) { let z = size; while (z > 10 && g.measureText(s).width > o.max) g.font = font(--z); }
    g.fillStyle = color; g.fillText(s, x, y); return g.measureText(s).width;
  }
  // cadrage du rendu 3D sur le corps (centre de masse horizontal), pas sur l'arme
  function cropOf(img) {
    const c = document.createElement('canvas'); c.width = img.width / 4; c.height = img.height / 4;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data; let a = c.width, b = c.height, e = 0, f = 0, m = 0, mx = 0;
    for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) { const al = d[(y * c.width + i) * 4 + 3]; if (al > 20) { a = Math.min(a, i); e = Math.max(e, i); b = Math.min(b, y); f = Math.max(f, y); m += al; mx += al * i; } }
    return e > a ? { sx: a * 4, sy: b * 4, sw: (e - a + 1) * 4, sh: (f - b + 1) * 4, cx: mx / m * 4 } : null;
  }
  function figure(img, cx, bottom, height) {
    const c = cropOf(img); if (!c) return;
    const s = Math.min(height / c.sh, 360 / c.sw), h = c.sh * s, dw = c.sw * s, dx = cx - (c.cx - c.sx) * s;
    g.save(); g.scale(1, 0.2); radial(cx, bottom / 0.2, dw * 0.45, '#000000', 0.8); g.restore();
    g.save(); g.shadowColor = '#c49a5c88'; g.shadowBlur = 40; g.drawImage(img, c.sx, c.sy, c.sw, c.sh, dx, bottom - h, dw, h); g.restore();
    g.drawImage(img, c.sx, c.sy, c.sw, c.sh, dx, bottom - h, dw, h);
  }
  // le ruban trois couleurs du site, posé en haut du parchemin
  function ribbon(x, y, w) {
    [['#b85a46', 0], ['#6a88c0', 6], ['#5f9a4a', 12]].forEach(([c, dy], k) => {
      g.beginPath(); for (let i = 0; i <= w; i += 4) g[i ? 'lineTo' : 'moveTo'](x + i, y + dy + Math.sin(i / w * Math.PI * 4 + k * 0.9) * 2.2);
      g.lineWidth = 5; g.strokeStyle = c; g.lineCap = 'round'; g.stroke();
    });
  }

  async function draw(cv, p, o) {
    cv.width = W; cv.height = H; g = cv.getContext('2d'); seed = 11;
    const L = o.L, rows = o.rows;
    const [portrait, logo, ...icons] = await Promise.all([load(p.render), load('Dropamine-Logo.png'), ...rows.map(r => load(r.img))]);
    // fond et portrait
    g.fillStyle = '#0b0806'; g.fillRect(0, 0, W, H);
    g.fillStyle = grad(0, 0, 0, H, [[0, '#1d2433'], [1, '#07080b']]); g.fillRect(0, 0, 400, H);
    radial(200, 300, 270, '#c49a5c44');
    if (portrait) figure(portrait, 200, H - 34, 540);
    else if (logo) g.drawImage(logo, 60, 170, 280, 280);
    // parchemin
    const px = 400, py = 18, pw = W - 418, ph = H - 36;
    g.fillStyle = grad(px, py, px, py + ph, [[0, '#ecdfb6'], [1, '#cdb684']]); rr(px, py, pw, ph, 8); g.fill();
    g.save(); rr(px, py, pw, ph, 8); g.clip();
    for (let i = 0; i < 3200; i++) { g.fillStyle = rnd() < 0.5 ? '#5a3a1009' : '#ffffff12'; g.fillRect(px + rnd() * pw, py + rnd() * ph, 3, 2); }
    const v = g.createRadialGradient(px + pw / 2, py + ph / 2, pw * 0.3, px + pw / 2, py + ph / 2, pw * 0.7); v.addColorStop(0, '#0000'); v.addColorStop(1, '#5a3a1030'); g.fillStyle = v; g.fillRect(px, py, pw, ph);
    g.restore();
    rr(px, py, pw, ph, 8); g.lineWidth = 4; g.strokeStyle = '#5a3f1e'; g.stroke();
    ribbon(px + 24, py + 16, pw - 48);
    // titre et sceau-goutte (le logo d'origine)
    T(L.title, px + 30, py + 72, 38, '#3a2410', { f: SC, w: 700, max: pw - 190 });
    T(L.sub, px + 32, py + 100, 19, '#5a4020', { max: pw - 190 });
    if (logo) { g.save(); g.translate(px + pw - 82, py + 70); g.rotate(-0.12); g.shadowColor = '#3a241088'; g.shadowBlur = 10; g.shadowOffsetY = 4; g.drawImage(logo, -56, -56, 112, 112); g.restore(); }
    // tableau
    const c0 = px + 40, cBar = px + 290, cRank = px + 500, cLvl = px + 672, cWeek = px + pw - 36;
    T(L.cols[0], c0, py + 138, 17, '#7a5a30', { f: NARROW, w: 700 });
    T(L.cols[1], cRank, py + 138, 17, '#7a5a30', { f: NARROW, w: 700, a: 'right' });
    T(L.cols[2], cLvl, py + 138, 17, '#7a5a30', { f: NARROW, w: 700, a: 'right' });
    T(L.cols[3], cWeek, py + 138, 17, '#7a5a30', { f: NARROW, w: 700, a: 'right' });
    g.fillStyle = '#5a3f1e'; g.fillRect(px + 30, py + 148, pw - 60, 2);
    const rh = Math.min(40, (ph - 190) / rows.length);
    rows.forEach((r, i) => {
      const y = py + 180 + i * rh;
      if (i % 2) { g.fillStyle = '#5a3a1012'; g.fillRect(px + 30, y - rh + 14, pw - 60, rh); }
      if (r.total) { if (logo) g.drawImage(logo, c0 - 2, y - 26, 34, 34); }
      else if (icons[i]) { g.drawImage(icons[i], c0, y - 22, 30, 30); g.strokeStyle = '#5a3f1e'; g.lineWidth = 1; g.strokeRect(c0 + 0.5, y - 21.5, 29, 29); }
      T(r.name, c0 + 42, y, 21, '#2a1a08', { f: NARROW, w: r.total ? 700 : 400, max: 210 });
      // mini-barre à la couleur du groupe (trois couleurs pour le total)
      const bw = 150, by = y - 12;
      rr(cBar, by, bw, 8, 3); g.fillStyle = '#5a3a1030'; g.fill();
      if (r.total && r.parts) { let x = cBar; for (const [k, gname] of [['level', 'lvl'], ['combat', 'wpn'], ['professions', 'prf']]) { const w = bw * (r.parts[k] || 0) / r.max; g.fillStyle = COL[gname][0]; g.fillRect(x, by, w, 8); x += w; } }
      else { g.fillStyle = grad(cBar, 0, cBar + bw, 0, [[0, COL[r.group][0]], [1, COL[r.group][1]]]); rr(cBar, by, bw * Math.min(1, r.v / r.max), 8, 3); g.fill(); }
      T(r.rank ? r.rankText : '—', cRank, y, 21, r.rank === 1 ? '#9a6400' : '#2a1a08', { f: NARROW, w: r.rank === 1 ? 700 : 400, a: 'right' });
      T(`${r.vText} / ${r.maxText}`, cLvl, y, 21, '#2a1a08', { f: NARROW, w: 700, a: 'right' });
      T(r.week > 0 ? '+' + r.week : '—', cWeek, y, 21, r.week > 0 ? '#2f6a1a' : '#8a7050', { f: NARROW, a: 'right' });
    });
    T(L.date, px + 32, py + ph - 18, 16, '#7a5a30');
    T('dropamine.app', px + pw - 28, py + ph - 18, 17, '#7a5a30', { a: 'right' });
  }
  window.DropShare = { draw };
})();
