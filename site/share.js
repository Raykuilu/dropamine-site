// Image Hiscores d'un personnage (1200×630) : portrait 3D + parchemin façon classement OSRS,
// avec la touche Dropamine (ruban trois couleurs, sceau-goutte, barres de couleur par groupe).
// window.DropShare.draw(canvas, player, { rows:[{name,img,v,max,rank,week,group,total}], L:{title,sub,cols[4],date}, book, BL })
// Double page : compétences à gauche, carnet Dropamine à droite (ce que l'armurerie n'a pas, plus quelques stats armurerie).
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
  // le ruban du site (même dessin que l'en-tête, au repos) : trois bandes pleines empilées,
  // chacune bordée d'un reflet clair, posées sur le haut du parchemin d'un bord à l'autre
  const BANDS = [
    { fill: '#b85a46', hi: '#eaa08a', per: 330, ph: 0 },
    { fill: '#6a88c0', hi: '#b2c8ec', per: 260, ph: 1.9 },
    { fill: '#5f9a4a', hi: '#a6d68c', per: 210, ph: 3.4 },
  ];
  function ribbon(x, y, w, s = 2.6) {
    const th = 2.6 * s;
    const curve = (k, b) => i => y + k * th + th * 0.22 * Math.sin(2 * Math.PI * i / (b.per * s / 1.2) + b.ph) * (k / 3 + 0.4);
    let prev = () => y;
    g.save(); g.beginPath(); g.rect(x, y - 8, w, th * 4 + 16); g.clip();
    g.shadowColor = '#3a241055'; g.shadowBlur = 6; g.shadowOffsetY = 2;
    BANDS.forEach((b, k) => {
      const top = prev, bot = curve(k + 1, b);
      g.beginPath();
      for (let i = 0; i <= w; i += 2) g[i ? 'lineTo' : 'moveTo'](x + i, top(i));
      for (let i = w; i >= 0; i -= 2) g.lineTo(x + i, bot(i));
      g.closePath(); g.fillStyle = b.fill; g.fill();
      prev = bot;
    });
    g.shadowColor = '#0000';
    BANDS.forEach((b, k) => {
      const bot = curve(k + 1, b);
      g.beginPath(); for (let i = 0; i <= w; i += 2) g[i ? 'lineTo' : 'moveTo'](x + i, bot(i));
      g.strokeStyle = b.hi; g.globalAlpha = 0.55; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1;
    });
    g.restore();
  }

  // ---- mise en page en double page (livre ouvert) ----
  const INK = '#2a1a08', INK2 = '#5a4020', SOFT = '#7a5a30', LINE = '#5a3f1e', GOLD = '#9a6400', GREEN = '#2f6a1a';
  const PAGE = { top: 150, bottom: 590, lx: 424, lw: 362, mid: 800, rx: 818, rw: 352 };
  // barre dorée
  function gbar(x, y, w, h, ratio) {
    rr(x, y, w, h, h / 2); g.fillStyle = '#5a3a1030'; g.fill();
    if (ratio > 0) { g.fillStyle = grad(x, 0, x + w, 0, [[0, '#a07a3c'], [1, '#d9b066']]); rr(x, y, Math.max(h, w * Math.min(1, ratio)), h, h / 2); g.fill(); }
  }
  function icon(img, x, y, s) { if (!img) return; g.drawImage(img, x, y, s, s); g.strokeStyle = LINE; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1); }
  // en-tête de rubrique : icône, petites capitales, résumé à droite, filet
  function head(x, w, y, img, label, right) {
    icon(img, x, y - 17, 22);
    T(label.toUpperCase(), x + (img ? 30 : 0), y, 13, SOFT, { f: NARROW, w: 700 });
    if (right) T(right, x + w, y, 16, INK, { f: NARROW, w: 700, a: 'right' });
    g.fillStyle = LINE + '99'; g.fillRect(x, y + 7, w, 1.5);
  }
  const fmtN = (n, loc) => Math.round(n).toLocaleString(loc || undefined);

  // page de gauche : les compétences (nom + mini-barre de couleur, niveau / max, rang)
  function skills(rows, icons, logo, L) {
    const { lx: x, lw: w } = PAGE, cLvl = x + w - 74, cMax = x + w - 70, cRank = x + w - 2;
    head(x, w, PAGE.top + 18, null, L.cols[0], null);
    T(L.cols[2].toUpperCase(), cLvl + 22, PAGE.top + 18, 13, SOFT, { f: NARROW, w: 700, a: 'right' });
    T(L.cols[1].toUpperCase(), cRank, PAGE.top + 18, 13, SOFT, { f: NARROW, w: 700, a: 'right' });
    const top = PAGE.top + 50, rh = (PAGE.bottom - 14 - top) / rows.length;
    rows.forEach((r, i) => {
      const y = top + i * rh;
      if (i % 2) { g.fillStyle = '#5a3a1010'; g.fillRect(x - 6, y - rh + 13, w + 10, rh); }
      if (r.total) { if (logo) g.drawImage(logo, x - 2, y - 24, 30, 30); } else icon(icons[i], x, y - 21, 26);
      T(r.name, x + 36, y - 3, 18, INK, { f: NARROW, w: r.total ? 700 : 400, max: cLvl - x - 90 });
      // mini-barre sous le nom
      const bx = x + 36, bw = cLvl - x - 96, by = y + 3;
      rr(bx, by, bw, 4, 2); g.fillStyle = '#5a3a1026'; g.fill();
      if (r.total && r.parts) { let xx = bx; for (const [k, gname] of [['level', 'lvl'], ['combat', 'wpn'], ['professions', 'prf']]) { const ww = bw * (r.parts[k] || 0) / r.max; g.fillStyle = COL[gname][0]; g.fillRect(xx, by, ww, 4); xx += ww; } }
      else { g.fillStyle = grad(bx, 0, bx + bw, 0, [[0, COL[r.group][0]], [1, COL[r.group][1]]]); rr(bx, by, Math.max(4, bw * Math.min(1, r.v / r.max)), 4, 2); g.fill(); }
      T(r.vText, cLvl, y, 20, INK, { f: NARROW, w: 700, a: 'right' });
      T('/' + r.maxText, cMax, y, 13, SOFT, { f: NARROW });
      if (r.week > 0) T('+' + r.week, cMax, y - 15, 12, GREEN, { f: NARROW, w: 700 });
      T(r.rank ? r.rankText : '—', cRank, y, 20, r.rank === 1 ? GOLD : INK, { f: NARROW, w: r.rank === 1 ? 700 : 400, a: 'right' });
    });
  }

  // page de droite : le carnet Dropamine, rubriques présentes seulement, espacement réparti
  function book(B0, BL, BI, logo, preview) {
    let B = B0;
    const { rx: x, rw: w } = PAGE, loc = BL.locale;
    const tiles = [];
    if (B.achievements) tiles.push({ img: logo, label: BL.ach, value: `${B.achievements.n} / ${B.achievements.total}`, ratio: B.achievements.n / B.achievements.total });
    if (B.played) tiles.push({ img: BI.time, label: BL.played, value: B.playedText });
    if (B.hk != null) tiles.push({ img: BI.pvp, label: BL.hk, value: fmtN(B.hk, loc), sub: B.pvp?.hkWeek ? `+${B.pvp.hkWeek} ${BL.week}` : null });
    const sparse = !B.collection && !B.records && !B.achievements && !B.hunt?.length;
    const armory = [['kills', BL.kills], ['quests', BL.quests], ['deaths', BL.deaths], ['flights', BL.flights]].filter(([k]) => B.stats?.[k] != null);
    if (sparse && tiles.length === 1 && B.hk != null && !B.played) { tiles.length = 0; armory.unshift(['hk', BL.hk]); B = { ...B, stats: { ...B.stats, hk: B.hk } }; }
    while (!sparse && tiles.length < 3 && armory.length) { const [k, label] = armory.shift(); tiles.push({ img: BI[k], label, value: fmtN(B.stats[k], loc) }); }
    const S = [];   // [hauteur, dessin(y)]
    S.push([30, y => { T(BL.title, x, y + 18, 24, '#3a2410', { f: SC, w: 700 }); }]);
    if (B.collection) {
      const c = B.collection, ds = [...c.dungeons].sort((a, b) => b.x / b.y - a.x / a.y || b.x - a.x).slice(0, B.dungeonMax ?? 3);
      S.push([40 + ds.length * 19, y => {
        head(x, w, y + 14, BI.col, BL.log, `${fmtN(c.x, loc)} / ${fmtN(c.y, loc)}`);
        gbar(x, y + 28, w, 6, c.x / c.y);
        ds.forEach((d, i) => {
          const yy = y + 52 + i * 19;
          T(d.name, x + 4, yy, 15, INK2, { f: NARROW, max: w - 150 });
          gbar(x + w - 136, yy - 8, 80, 5, d.x / d.y);
          T(`${d.x} / ${d.y}`, x + w, yy, 15, INK2, { f: NARROW, w: 700, a: 'right' });
        });
      }]);
    }
    if (tiles.length) {
      const tw = w / tiles.length;
      S.push([64, y => tiles.forEach((t, i) => {
        const tx = x + i * tw;
        if (i) { g.fillStyle = LINE + '44'; g.fillRect(tx - 1, y + 2, 1, 52); }
        const ix = tx + (i ? 10 : 0);
        icon(t.img, ix, y + 4, 20);
        T(t.label.toUpperCase(), ix + 26, y + 18, 11, SOFT, { f: NARROW, w: 700, max: tw - 40 });
        T(t.value, ix, y + 44, 23, INK, { f: NARROW, w: 700, max: tw - 16 });
        if (t.ratio != null) gbar(ix, y + 50, tw - 22, 4, t.ratio);
        else if (t.sub) T(t.sub, ix, y + 58, 11, GREEN, { f: NARROW, w: 700 });
      })]);
    }
    const ledger = (items, y) => items.forEach(([k, v], i) => {
      const cx = x + (i % 2) * (w / 2 + 8), cw = w / 2 - 8, yy = y + Math.floor(i / 2) * 20;
      T(k, cx, yy, 15, INK2, { f: NARROW, max: cw - 46 });
      T(v, cx + cw, yy, 16, INK, { f: NARROW, w: 700, a: 'right' });
    });
    if (B.records) {
      const r = B.records;
      const items = [[BL.session, fmtN(r.bestSession, loc)], [BL.day, fmtN(r.bestDay, loc)], [BL.hour, fmtN(r.bestHour, loc)], [BL.combo, 'x' + r.longestCombo]];
      S.push([62, y => { head(x, w, y + 14, BI.rec, BL.rec, r.sessions ? `${r.sessions} ${BL.sessions}` : null); ledger(items, y + 38); }]);
    }
    if (B.pvp && (B.pvp.honorWeek || B.pvp.honor || B.pvp.highest)) {
      const v = B.pvp, items = [[BL.honorWeek, fmtN(v.honorWeek, loc)], [BL.honor, fmtN(v.honor, loc)]];
      if (v.highest) items.push([BL.highest, String(v.highest)]);
      if (v.dkLife) items.push([BL.dk, fmtN(v.dkLife, loc)]);
      S.push([22 + Math.ceil(items.length / 2) * 20 + 2, y => { head(x, w, y + 14, BI.pvp, BL.pvp, null); ledger(items, y + 38); }]);
    }
    if (B.hunt?.length) {
      const hs = [...B.hunt].sort((a, b) => (b.drops > 0) - (a.drops > 0) || b.tries - a.tries).slice(0, B.huntMax ?? 3);
      S.push([24 + hs.length * 19 + 4, y => {
        head(x, w, y + 14, BI.hunt, BL.hunt, `${B.hunt.filter(h => h.drops).length} / ${B.hunt.length}`);
        hs.forEach((h, i) => {
          const yy = y + 38 + i * 19;
          T(h.name, x + 4, yy, 15, INK2, { f: NARROW, max: w - 110 });
          T(h.drops ? `✓ ${BL.found}` : h.tries ? `${fmtN(h.tries, loc)} ${BL.tries}` : '—', x + w, yy, 15, h.drops ? GREEN : SOFT, { f: NARROW, w: h.drops ? 700 : 400, a: 'right' });
        });
      }]);
    }
    if (sparse && armory.length) {
      const items = armory.map(([k, label]) => [label, fmtN(B.stats[k], loc)]);
      S.push([24 + Math.ceil(items.length / 2) * 20 + 2, y => { head(x, w, y + 14, BI.quests, BL.armory, null); ledger(items, y + 38); }]);
    } else if (armory.length && !B.noArmoryLine) {
      S.push([20, y => T(armory.slice(0, 3).map(([k, label]) => `${label} ${fmtN(B.stats[k], loc)}`).join('  ·  '), x, y + 14, 14, SOFT, { f: NARROW, max: w })]);
    }
    if (sparse && preview) {   // invitation : seulement dans l'aperçu, jamais dans l'image finale
      S.push([92, y => {
        rr(x, y, w, 88, 8); g.fillStyle = '#5a3a100c'; g.fill(); g.setLineDash([5, 4]); g.strokeStyle = LINE + '88'; g.lineWidth = 1.2; g.stroke(); g.setLineDash([]);
        if (logo) g.drawImage(logo, x + 14, y + 18, 50, 50);
        T(BL.inviteT, x + 76, y + 30, 17, INK, { f: SC, w: 700, max: w - 90 });
        T(BL.invite1, x + 76, y + 52, 14, INK2, { max: w - 90 });
        T(BL.invite2, x + 76, y + 70, 14, INK2, { max: w - 90 });
      }]);
    }
    // espacement réparti sur la hauteur de la page
    {
      const need = S.slice(1).reduce((a, [h]) => a + h, 0) + 8 * (S.length - 2), room0 = PAGE.bottom - PAGE.top - S[0][0] - 14;
      if (need > room0 && !B0.fit) {
        const steps = [{ noArmoryLine: true }, { huntMax: 2 }, { dungeonMax: 2 }, { huntMax: 1 }, { dungeonMax: 1 }];
        const k = (B0.fitStep ?? -1) + 1;
        if (k < steps.length) return book({ ...B0, ...steps.slice(0, k + 1).reduce((a, x) => ({ ...a, ...x }), {}), fitStep: k }, BL, BI, logo, preview);
      }
    }
    const [title, ...body] = S, top = PAGE.top + title[0] + 14, room = PAGE.bottom - top;
    title[1](PAGE.top);
    const used = body.reduce((a, [h]) => a + h, 0), gap = Math.max(6, Math.min(30, (room - used) / Math.max(1, body.length)));
    let y = top + Math.max(0, (room - used - gap * (body.length - 1)) / 2) * (sparse ? 1 : 0);
    body.forEach(([h, fn]) => { fn(y); y += h + gap; });
  }

  // o.book : { collection, achievements, played, playedText, hk, pvp, records, hunt, stats } ; o.BL : ses textes ;
  // o.preview : aperçu dans la fenêtre (invitation à remplir le carnet), sinon image finale
  async function draw(cv, p, o) {
    // dessin en double résolution (2400×1260) : net sur écran haute définition et une fois partagé
    const S = 2;
    cv.width = W * S; cv.height = H * S; g = cv.getContext('2d'); g.setTransform(S, 0, 0, S, 0, 0); seed = 11;
    g.imageSmoothingQuality = 'high';
    const L = o.L, rows = o.rows, B = o.book || {}, BL = o.BL || {};
    const NAMES = { ...BOOK_ICONS, pvp: p.faction === 'HORDE' ? 'inv_bannerpvp_01' : 'inv_bannerpvp_02' }, bi = Object.keys(NAMES);
    const [portrait, logo, ...rest] = await Promise.all([load(p.render), load('Dropamine-Logo.png'), ...rows.map(r => load(r.img)), ...bi.map(k => load(iconUrl(NAMES[k])))]);
    const icons = rest.slice(0, rows.length), BI = Object.fromEntries(bi.map((k, i) => [k, rest[rows.length + i]]));
    // fond et portrait
    g.fillStyle = '#0b0806'; g.fillRect(0, 0, W, H);
    g.fillStyle = grad(0, 0, 0, H, [[0, '#1d2433'], [1, '#07080b']]); g.fillRect(0, 0, 400, H);
    radial(200, 300, 270, '#c49a5c44');
    if (portrait) figure(portrait, 200, H - 34, 540);
    else if (logo) g.drawImage(logo, 60, 170, 280, 280);
    // parchemin, sur toute la moitié droite
    const px = 400, sw = W - px;
    g.fillStyle = grad(px, 0, px, H, [[0, '#ecdfb6'], [1, '#cdb684']]); g.fillRect(px, 0, sw, H);
    for (let i = 0; i < 3400; i++) { g.fillStyle = rnd() < 0.5 ? '#5a3a1009' : '#ffffff12'; g.fillRect(px + rnd() * sw, rnd() * H, 3, 2); }
    const v = g.createRadialGradient(px + sw / 2, H / 2, sw * 0.3, px + sw / 2, H / 2, sw * 0.75); v.addColorStop(0, '#0000'); v.addColorStop(1, '#5a3a1036'); g.fillStyle = v; g.fillRect(px, 0, sw, H);
    g.fillStyle = grad(px, 0, px + 18, 0, [[0, '#00000055'], [1, '#0000']]); g.fillRect(px, 0, 18, H);   // ombre du portrait sur la feuille
    g.fillStyle = LINE; g.fillRect(px, 0, 3, H);
    g.strokeStyle = LINE + '88'; g.lineWidth = 1.5; g.strokeRect(px + 10, 8, sw - 18, H - 16);
    ribbon(px + 3, 0, sw - 3);   // collé au bord haut, comme sous la barre du site
    // titre et sceau-goutte (le logo d'origine)
    T(L.title, px + 30, 90, 38, '#3a2410', { f: SC, w: 700, max: sw - 210 });
    T(L.sub, px + 32, 118, 19, INK2, { max: sw - 210 });
    if (logo) { g.save(); g.translate(W - 100, 88); g.rotate(-0.12); g.shadowColor = '#3a241088'; g.shadowBlur = 10; g.shadowOffsetY = 4; g.drawImage(logo, -56, -56, 112, 112); g.restore(); }
    // pli du livre
    const m = PAGE.mid;
    g.fillStyle = grad(m - 16, 0, m + 16, 0, [[0, '#0000'], [0.5, '#5a3a1033'], [1, '#0000']]); g.fillRect(m - 16, PAGE.top + 4, 32, PAGE.bottom - PAGE.top - 4);
    g.fillStyle = LINE + '55'; g.fillRect(m, PAGE.top + 10, 1, PAGE.bottom - PAGE.top - 16);
    skills(rows, icons, logo, L);
    book(B, BL, BI, logo, !!o.preview);
    T(L.date, px + 32, H - 24, 15, SOFT);
    T('dropamine.app', W - 30, H - 24, 16, SOFT, { a: 'right' });
  }
  const BOOK_ICONS = { col: 'inv_box_02', time: 'inv_misc_pocketwatch_01', pvp: 'inv_bannerpvp_02', rec: 'inv_misc_note_01', hunt: 'ability_hunter_snipershot', kills: 'ability_warrior_rampage', quests: 'inv_misc_book_08', deaths: 'ability_rogue_feigndeath', flights: 'ability_mount_gryphon_01' };
  const iconUrl = n => `https://render.worldofwarcraft.com/eu/icons/56/${n}.jpg`;
  window.DropShare = { draw };
})();
