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
    if (o.max) { let z = size; while (z > (o.min ?? 10) && g.measureText(s).width > o.max) g.font = font(--z); }
    // toujours trop long (autres langues) : coupé avec « … » plutôt que de déborder sur la colonne voisine
    if (o.max && g.measureText(s).width > o.max) { while (s.length > 1 && g.measureText(s + '…').width > o.max) s = s.slice(0, -1); s = s.replace(/\s+$/, '') + '…'; }
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
  function figure(img, cx, bottom, height, onScene) {
    const c = cropOf(img); if (!c) return;
    const s = Math.min(height / c.sh, 360 / c.sw), h = c.sh * s, dw = c.sw * s, dx = cx - (c.cx - c.sx) * s;
    g.save(); g.scale(1, 0.2); radial(cx, bottom / 0.2, dw * 0.45, '#000000', 0.8); g.restore();
    g.save(); g.shadowColor = onScene ? '#00000088' : '#c49a5c88'; g.shadowBlur = onScene ? 24 : 40; g.drawImage(img, c.sx, c.sy, c.sw, c.sh, dx, bottom - h, dw, h); g.restore();
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
    const { lx: x, lw: w } = PAGE, cLvl = x + w - 86, cMax = x + w - 82, cRank = x + w - 2;
    head(x, w, PAGE.top + 18, null, L.cols[0], null);
    T(L.cols[2].toUpperCase(), cLvl + 22, PAGE.top + 18, 13, SOFT, { f: NARROW, w: 700, a: 'right' });
    T(L.cols[1].toUpperCase(), cRank, PAGE.top + 18, 13, SOFT, { f: NARROW, w: 700, a: 'right' });
    const top = PAGE.top + 50, rh = (PAGE.bottom - 14 - top) / rows.length;
    rows.forEach((r, i) => {
      const y = top + i * rh;
      if (i % 2) { g.fillStyle = '#5a3a1010'; g.fillRect(x - 6, y - rh + 13, w + 10, rh); }
      if (!r.total) icon(icons[i], x, y - 21, 26);
      T(r.name, x + 36, y - 3, 18, INK, { f: NARROW, w: r.total ? 700 : 400, max: cLvl - x - 90 });
      // mini-barre sous le nom
      const bx = x + 36, bw = cLvl - x - 96, by = y + 3;
      rr(bx, by, bw, 4, 2); g.fillStyle = '#5a3a1026'; g.fill();
      if (r.total && r.parts) { let xx = bx; for (const [k, gname] of [['level', 'lvl'], ['combat', 'wpn'], ['professions', 'prf']]) { const ww = bw * (r.parts[k] || 0) / r.max; g.fillStyle = COL[gname][0]; g.fillRect(xx, by, ww, 4); xx += ww; } }
      else { g.fillStyle = grad(bx, 0, bx + bw, 0, [[0, COL[r.group][0]], [1, COL[r.group][1]]]); rr(bx, by, Math.max(4, bw * Math.min(1, r.v / r.max)), 4, 2); g.fill(); }
      T(r.vText, cLvl, y, 20, INK, { f: NARROW, w: 700, a: 'right' });
      const mw = T('/' + r.maxText, cMax, y, 13, SOFT, { f: NARROW, max: 44, min: 10 });
      if (r.week > 0) T('+' + r.week, cMax, y - 15, 12, GREEN, { f: NARROW, w: 700 });
      // le rang prend la place restante à droite du maximum (rangs à 4 ou 5 chiffres : police réduite, jamais de chevauchement)
      T(r.rank ? r.rankText : '—', cRank, y, 20, r.rank === 1 ? GOLD : INK, { f: NARROW, w: r.rank === 1 ? 700 : 400, a: 'right', max: cRank - cMax - mw - 6, min: 11 });
    });
  }

  // page de droite : l'armurerie d'abord (JcJ, combats, réputations), puis le carnet déclaré par le joueur.
  // Si la page déborde, on allège le déclaré (chasse, records) ; l'armurerie reste toujours.
  const REP_INK = ['#9a2a1a', '#9a2a1a', '#b5561e', '#8a7020', '#3f7a26', '#2f7a5a', '#24706e', '#1f5f8a'];
  function book(B0, BL, BI, logo, preview) {
    const B = B0, { rx: x, rw: w } = PAGE, loc = BL.locale, st = B.stats || {};
    const ledger = (items, y, step = 19) => items.forEach(([k, v], i) => {
      const cx = x + (i % 2) * (w / 2 + 8), cw = w / 2 - 8, yy = y + Math.floor(i / 2) * step;
      T(k, cx, yy, 15, INK2, { f: NARROW, max: cw - 50 });
      T(v, cx + cw, yy, 16, INK, { f: NARROW, w: 700, a: 'right' });
    });
    const S = [];   // [hauteur, dessin(y)]
    S.push([28, y => { T(BL.title, x, y + 18, 24, '#3a2410', { f: SC, w: 700 }); }]);
    // 1) armurerie : JcJ d'abord
    const n = v => v != null ? fmtN(v, loc) : null;
    const arm = [[BL.hk, n(st.hk)], [BL.kb, n(st.killingBlows)], [BL.pvpDeaths, n(st.pvpDeaths)],
      [BL.duels, st.duelsWon != null || st.duelsLost != null ? `${st.duelsWon || 0} / ${st.duelsLost || 0}` : null],
      [BL.kills, n(st.kills)], [BL.quests, n(st.quests)], [BL.dungeons, n(st.dungeons)], [BL.deaths, n(st.deaths)]].filter(([, v]) => v != null);
    // K/D (victoires honorables ÷ morts face aux joueurs), dès 20 combats : mis en avant à droite du titre, comme sur la fiche
    const kd = st.hk != null && st.pvpDeaths != null && st.hk + st.pvpDeaths >= 20 ? (st.pvpDeaths ? st.hk / st.pvpDeaths : st.hk) : null;
    if (arm.length) S.push([24 + Math.ceil(arm.length / 2) * 19, y => {
      head(x, w, y + 14, BI.pvp, BL.armory, null);
      if (kd != null) {
        const v = kd.toLocaleString(loc || undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        T(v, x + w, y + 12, 22, kd >= 1 ? GREEN : INK, { f: NARROW, w: 700, a: 'right' });
        g.font = '700 22px ' + NARROW; const vw = g.measureText(v).width;
        T('K/D', x + w - vw - 8, y + 12, 13, SOFT, { f: NARROW, w: 700, a: 'right' });
      }
      ledger(arm, y + 37);
    }]);
    // 2) réputations (armurerie)
    // sans carnet Dropamine, les réputations ont la place de s'étendre
    const bare = !B.collection && !B.achievements && !B.played && !B.records && !B.hunt?.length;
    const reps = (B.reps || []).slice(0, B.repMax ?? (bare ? 10 : 3));
    if (reps.length) S.push([24 + reps.length * 19, y => {
      const hon = (B.reps || []).filter(r => r.t >= 5).length;
      head(x, w, y + 14, BI.rep, BL.reps, `${B.reps.length} ${BL.factions}`);
      reps.forEach((r, i) => {
        const yy = y + 37 + i * 19, col = REP_INK[r.t] ?? REP_INK[3];
        T(r.n[BL.li] || r.n[0], x + 4, yy, 15, INK2, { f: NARROW, max: w - 190 });
        rr(x + w - 176, yy - 8, 84, 5, 2.5); g.fillStyle = '#5a3a1026'; g.fill();
        rr(x + w - 176, yy - 8, Math.max(5, 84 * (r.m ? r.v / r.m : 1)), 5, 2.5); g.fillStyle = col; g.fill();
        T(r.s[BL.li] || r.s[0], x + w, yy, 15, col, { f: NARROW, w: 700, a: 'right' });
      });
    }]);
    // 3) carnet déclaré : trois chiffres
    const tiles = [];
    if (B.collection) tiles.push({ img: BI.col, label: BL.log, value: `${fmtN(B.collection.x, loc)} / ${fmtN(B.collection.y, loc)}`, ratio: B.collection.x / B.collection.y });
    if (B.achievements) tiles.push({ img: BI.ach, label: BL.ach, value: `${B.achievements.n} / ${B.achievements.total}`, ratio: B.achievements.n / B.achievements.total });
    if (B.played) tiles.push({ img: BI.time, label: BL.played, value: B.playedText });
    if (tiles.length) {
      const tw = w / tiles.length;
      S.push([58, y => tiles.forEach((t, i) => {
        const tx = x + i * tw, ix = tx + (i ? 10 : 0);
        if (i) { g.fillStyle = LINE + '44'; g.fillRect(tx - 1, y + 2, 1, 50); }
        icon(t.img, ix, y + 3, 16);
        T(t.label.toUpperCase(), ix + 20, y + 15, 11, SOFT, { f: NARROW, w: 700, max: tw - 30, min: 8 });
        T(t.value, ix, y + 41, 22, INK, { f: NARROW, w: 700, max: tw - 16 });
        if (t.ratio != null) gbar(ix, y + 48, tw - 22, 4, t.ratio);
      })]);
    }
    // 4) records, en une ligne
    if (B.records && !B.noRecords) {
      const r = B.records;
      S.push([42, y => {
        head(x, w, y + 14, BI.rec, BL.rec, r.sessions ? `${r.sessions} ${BL.sessions}` : null);
        T(`${BL.sessionS} ${fmtN(r.bestSession, loc)}   ·   ${BL.dayS} ${fmtN(r.bestDay, loc)}   ·   ${BL.hourS} ${fmtN(r.bestHour, loc)}   ·   combo x${r.longestCombo}`, x, y + 37, 15, INK2, { f: NARROW, max: w });
      }]);
    }
    // 5) chasse
    if (B.hunt?.length && (B.huntMax ?? 2) > 0) {
      const hs = [...B.hunt].sort((a, b) => (b.drops > 0) - (a.drops > 0) || b.tries - a.tries).slice(0, B.huntMax ?? 2);
      S.push([24 + hs.length * 19, y => {
        head(x, w, y + 14, BI.hunt, BL.hunt, `${B.hunt.filter(h => h.drops).length} / ${B.hunt.length}`);
        hs.forEach((h, i) => {
          const yy = y + 37 + i * 19;
          T(h.name, x + 4, yy, 15, INK2, { f: NARROW, max: w - 110 });
          T(h.drops ? `✓ ${BL.found}` : h.tries ? `${fmtN(h.tries, loc)} ${BL.tries}` : '—', x + w, yy, 15, h.drops ? GREEN : SOFT, { f: NARROW, w: h.drops ? 700 : 400, a: 'right' });
        });
      }]);
    }
    const sparse = !tiles.length && !B.records && !B.hunt?.length;
    if (sparse && preview) {   // invitation : seulement dans l'aperçu, jamais dans l'image finale
      S.push([80, y => {
        rr(x, y, w, 76, 8); g.fillStyle = '#5a3a100c'; g.fill(); g.setLineDash([5, 4]); g.strokeStyle = LINE + '88'; g.lineWidth = 1.2; g.stroke(); g.setLineDash([]);
        if (logo) g.drawImage(logo, x + 14, y + 14, 46, 46);
        T(BL.inviteT, x + 72, y + 26, 17, INK, { f: SC, w: 700, max: w - 86 });
        T(BL.invite1, x + 72, y + 46, 14, INK2, { max: w - 86 });
        T(BL.invite2, x + 72, y + 63, 14, INK2, { max: w - 86 });
      }]);
    }
    // trop haut ? on allège le déclaré, puis les réputations
    const room = PAGE.bottom - PAGE.top - S[0][0] - 10, need = S.slice(1).reduce((a, [h]) => a + h, 0) + 8 * (S.length - 2);
    if (need > room) {
      const steps = [{ huntMax: 1 }, { repMax: 2 }, { huntMax: 0 }, { repMax: 1 }, { noRecords: true }];
      const k = (B0.fitStep ?? -1) + 1;
      if (k < steps.length) return book({ ...B0, ...steps.slice(0, k + 1).reduce((a, o) => ({ ...a, ...o }), {}), fitStep: k }, BL, BI, logo, preview);
    }
    // image finale sans carnet : pas de titre « carnet » au-dessus d'un vide, l'armurerie part du haut de la page
    const noTitle = sparse && !preview;
    const [title, ...body] = S, top = noTitle ? PAGE.top + 4 : PAGE.top + title[0] + 10, avail = PAGE.bottom - top;
    if (!noTitle) title[1](PAGE.top);
    const used = body.reduce((a, [h]) => a + h, 0), gap = Math.max(8, Math.min(26, (avail - used) / Math.max(1, body.length)));
    let y = top + (sparse && !noTitle ? Math.max(0, (avail - used - gap * (body.length - 1)) / 2) : 0);
    body.forEach(([h, fn]) => { fn(y); y += h + gap; });
  }

  // o.book : { collection, achievements, played, playedText, hk, pvp, records, hunt, stats } ; o.BL : ses textes ;
  // o.preview : aperçu dans la fenêtre (invitation à remplir le carnet), sinon image finale
  // décor de race de l'armurerie Blizzard (même image que la page personnage), derrière le portrait
  const RACE_BG = { 1: 'human', 2: 'orc', 3: 'dwarf', 4: 'night_elf', 5: 'undead', 6: 'tauren', 7: 'gnome', 8: 'troll' };
  const bgUrl = p => RACE_BG[p.raceId] ? `https://render.worldofwarcraft.com/profile-backgrounds/v2/armory_bg_race_${RACE_BG[p.raceId]}.jpg` : null;
  async function draw(cv, p, o) {
    // dessin en double résolution (2400×1260) : net sur écran haute définition et une fois partagé
    const S = 2;
    cv.width = W * S; cv.height = H * S; g = cv.getContext('2d'); g.setTransform(S, 0, 0, S, 0, 0); seed = 11;
    g.imageSmoothingQuality = 'high';
    const L = o.L, rows = o.rows, B = o.book || {}, BL = o.BL || {};
    const NAMES = { ...BOOK_ICONS, pvp: p.faction === 'HORDE' ? 'inv_bannerpvp_01' : 'inv_bannerpvp_02' }, bi = Object.keys(NAMES);
    // adresse distincte : la page personnage a déjà mis ces images en cache sans en-tête CORS, et le canvas les refuserait
    const cors = u => u ? u + (u.includes('?') ? '&' : '?') + 'cors=1' : u;
    const [portrait, logo, bg, ...rest] = await Promise.all([load(cors(p.render)), load('Dropamine-Logo.png'), load(cors(bgUrl(p))), ...rows.map(r => load(r.img)), ...bi.map(k => load(iconUrl(NAMES[k])))]);
    const icons = rest.slice(0, rows.length), BI = Object.fromEntries(bi.map((k, i) => [k, rest[rows.length + i]]));
    // fond et portrait
    g.fillStyle = '#0b0806'; g.fillRect(0, 0, W, H);
    g.fillStyle = grad(0, 0, 0, H, [[0, '#1d2433'], [1, '#07080b']]); g.fillRect(0, 0, 400, H);
    if (bg) {
      // recadrage « cover » sur la moitié gauche, centré sur l'endroit où l'armurerie pose le personnage
      const s2 = Math.max(400 / bg.width, H / bg.height), dw = bg.width * s2, dh = bg.height * s2;
      g.drawImage(bg, 200 - dw / 2, (H - dh) / 2, dw, dh);
      g.fillStyle = grad(0, 0, 0, H, [[0, '#0000'], [0.6, '#0000'], [1, '#000a']]); g.fillRect(0, 0, 400, H);
      g.fillStyle = grad(300, 0, 400, 0, [[0, '#0000'], [1, '#0006']]); g.fillRect(300, 0, 100, H);
    } else radial(200, 300, 270, '#c49a5c44');
    if (portrait) figure(portrait, 200, H - 34, 540, !!bg);
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
    if (logo) { g.save(); g.translate(W - 104, 90); g.rotate(-0.12); g.shadowColor = "#3a241088"; g.shadowBlur = 12; g.shadowOffsetY = 5; g.drawImage(logo, -68, -68, 136, 136); g.restore(); }
    // pli du livre
    const m = PAGE.mid;
    g.fillStyle = grad(m - 16, 0, m + 16, 0, [[0, '#0000'], [0.5, '#5a3a1033'], [1, '#0000']]); g.fillRect(m - 16, PAGE.top + 4, 32, PAGE.bottom - PAGE.top - 4);
    g.fillStyle = LINE + '55'; g.fillRect(m, PAGE.top + 10, 1, PAGE.bottom - PAGE.top - 16);
    skills(rows, icons, logo, L);
    book(B, BL, BI, logo, !!o.preview);
    T(L.date, px + 32, H - 24, 15, SOFT);
    T('dropamine.app', W - 30, H - 24, 16, SOFT, { a: 'right' });
  }
  const BOOK_ICONS = { ach: 'achievement_general', col: 'inv_box_02', time: 'inv_misc_pocketwatch_01', pvp: 'inv_bannerpvp_02', rec: 'inv_misc_note_01', hunt: 'ability_hunter_snipershot', kills: 'ability_warrior_rampage', quests: 'inv_misc_book_08', deaths: 'ability_rogue_feigndeath', flights: 'ability_mount_gryphon_01', rep: 'inv_misc_tabardpvp_01' };
  const iconUrl = n => `https://render.worldofwarcraft.com/eu/icons/56/${n}.jpg`;
  window.DropShare = { draw };
})();
