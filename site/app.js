// Dropamine — site : vitrine + Hiscores. Aucune dépendance.
'use strict';
const SHOT = location.search.includes('shot');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || SHOT;
if (SHOT) document.documentElement.classList.add('static');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('fr-FR');
const ord = n => n === 1 ? '1ᵉʳ' : n + 'ᵉ';

/* ---------- Référentiels ---------- */
const PROF = { 165: 'Travail du cuir', 393: 'Dépeçage', 185: 'Cuisine', 356: 'Pêche', 129: 'Secourisme', 171: 'Alchimie',
  164: 'Forge', 333: 'Enchantement', 202: 'Ingénierie', 182: 'Herboristerie', 186: 'Minage', 197: 'Couture' };
const PROF_ORDER = [393, 186, 182, 171, 164, 333, 202, 165, 197, 185, 356, 129];
const STATS = { kills: 'Créatures tuées', quests: 'Quêtes', flights: 'Trajets aériens' };
const RULESETS = [[2, 'Normal'], [1, 'JcJ'], [3, 'Jeu de rôle'], [15, 'Jeu de rôle JcJ']];
const SKILLS = [
  { id: 'total', group: null, label: 'Niveau total', max: '2 460', get: p => p.total },
  { id: 'level', group: 'lvl', label: 'Niveau', max: '60', get: p => p.level },
  { id: 'defense', group: 'wpn', label: 'Défense', max: '300', get: p => p.defense || null },
  ...PROF_ORDER.map(id => ({ id: 'p' + id, group: 'prf', label: PROF[id], max: '300', prof: id,
    get: p => p.professions?.find(x => x.id === id)?.skill ?? null })),
  ...Object.entries(STATS).map(([k, label]) => ({ id: k, group: 'stat', label, max: '', get: p => p.stats?.[k] ?? null })),
];
const GROUPS = { lvl: ['NIVEAU', 'var(--lvl)'], wpn: ['ARMES ET DÉFENSE', 'var(--wpn)'], prf: ['MÉTIERS', 'var(--prf)'], stat: ['STATISTIQUES', 'var(--rim)'] };
const VIEWS = ['home', 'rank', 'char', 'guild', 'news', 'get', 'join', 'privacy'];

let DATA = { players: [] }, NEWS = null;
const state = { view: 'home', region: 'eu', skill: 'total', cls: '', rs: 0, c: '', g: '' };
const inRegion = () => DATA.players.filter(p => (p.region || 'eu') === state.region);

/* ======================================================================
   Le ruban : trois bandes fines sous la navigation. Il gonfle en vague
   à chaque changement de page, ondule plus vite pendant un chargement.
   ====================================================================== */
const Ribbon = (() => {
  const host = $('.ribbon'), NS = 'http://www.w3.org/2000/svg', W = 1000, H = 44;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'none');
  const bands = [
    { fill: '#b85a46', hi: '#eaa08a', per: 330, speed: .55, ph: 0 },
    { fill: '#6a88c0', hi: '#b2c8ec', per: 260, speed: .8, ph: 1.9 },
    { fill: '#5f9a4a', hi: '#a6d68c', per: 210, speed: 1.05, ph: 3.4 },
  ].map(b => {
    const f = document.createElementNS(NS, 'path'), l = document.createElementNS(NS, 'path');
    f.setAttribute('fill', b.fill);
    l.setAttribute('fill', 'none'); l.setAttribute('stroke', b.hi); l.setAttribute('stroke-opacity', '.55');
    l.setAttribute('stroke-width', '1'); l.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(f, l); return { ...b, f, l };
  });
  host.append(svg);
  let energy = 0, loading = false, t = 0, last = performance.now(), running = false;
  function draw() {
    const e = Math.min(1, energy + (loading ? .35 + .15 * Math.sin(t * 6) : 0));
    const th = 2.6 + 9 * e;                                   // épaisseur d'une bande
    const curve = (k, b) => x => k * th + th * (.22 + .28 * e) * Math.sin(2 * Math.PI * x / b.per + b.ph + t * b.speed * (1 + 2.5 * e)) * (k / 3 + .4);
    let prev = () => 0;
    bands.forEach((b, i) => {
      const top = prev, bot = curve(i + 1, b);
      let up = '', down = '', edge = '';
      for (let x = 0; x <= W; x += 20) up += (x ? ' L' : 'M') + x + ' ' + top(x).toFixed(2);
      for (let x = W; x >= 0; x -= 20) down += ' L' + x + ' ' + bot(x).toFixed(2);
      for (let x = 0; x <= W; x += 20) edge += (x ? ' L' : 'M') + x + ' ' + bot(x).toFixed(2);
      b.f.setAttribute('d', up + down + 'Z');
      b.l.setAttribute('d', edge);
      prev = bot;
    });
  }
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    t += dt; energy *= Math.pow(.18, dt);                      // retombe en ~1 s
    draw();
    if (!document.hidden && (energy > .002 || loading || !reduce)) requestAnimationFrame(frame); else running = false;
  }
  function start() { if (running || reduce) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function bubbles(n) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span'); s.className = 'bubble'; const size = 3 + Math.random() * 4;
      s.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-duration:${.9 + Math.random() * .8}s;animation-delay:${Math.random() * .25}s`;
      host.append(s); setTimeout(() => s.remove(), 2000);
    }
  }
  draw(); start();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  return {
    swell(power = 1) { if (reduce) return; energy = Math.max(energy, power); bubbles(Math.round(5 * power)); start(); },
    load(on) { loading = on; if (on) start(); },
  };
})();
$('.brand-logo').addEventListener('mouseenter', () => Ribbon.swell(.35));

/* ---------- Morceaux réutilisés ---------- */
const full = p => `${esc(p.name)} ${esc(p.surname)}`;
const who = p => `${esc(p.class)} ${p.level}${p.guild ? ' · ' + esc(p.guild.name) : ''}`;
const avatar = p => p.avatar ? `<img class="ava" src="${esc(p.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '';
const pkey = p => p.key || `${p.region || 'eu'}/${p.slug}`;
const tri = p => {
  const w = v => (100 * v / (p.max || 2460)).toFixed(1) + '%';
  return `<span class="tri" title="Niveau ${p.parts.level} · Armes et Défense ${p.parts.combat}${p.complete ? '' : ' (armes estimées)'} · Métiers ${p.parts.professions}">` +
    `<i class="l" style="--w:${w(p.parts.level)}"></i><i class="w${p.complete ? '' : ' est'}" style="--w:${w(p.parts.combat)}"></i><i class="p" style="--w:${w(p.parts.professions)}"></i></span>`;
};
const skillById = id => SKILLS.find(s => s.id === id) || SKILLS[0];
function rankBy(skill, list) {
  return list.map(p => ({ p, v: skill.get(p) })).filter(x => x.v != null && x.v > 0)
    .sort((a, b) => b.v - a.v || pkey(a.p).localeCompare(pkey(b.p))).map((x, i) => ({ ...x, r: i + 1 }));
}
const failed = () => `<div class="empty"><b>Données indisponibles</b>Le classement n'a pas pu être chargé. Réessaie dans un instant.</div>`;
const nobody = () => `<div class="empty"><b>Personne pour l'instant</b>Aucun personnage inscrit dans cette région. <a href="?p=join" data-view-link="join">Inscris le tien</a>.</div>`;

/* ---------- Accueil : le pont vers les classements ---------- */
function renderHome() {
  const top = rankBy(SKILLS[0], inRegion()).slice(0, 5);
  $('#home-top').innerHTML = DATA.failed ? failed() : top.length
    ? top.map(({ p, v, r }) => `<div class="row${r <= 3 ? ' top' : ''}" data-c="${esc(pkey(p))}" style="grid-template-columns:44px minmax(0,1fr) minmax(90px,160px) 96px"><span class="rk">${r}</span><span class="nm">${avatar(p)}<span><b>${full(p)}</b><small>${who(p)}</small></span></span>${tri(p)}<span class="tot">${fmt(v)}${p.complete ? '' : '<em>estimé</em>'}</span></div>`).join('')
    : nobody();
}

/* ---------- Classement ---------- */
function renderRank() {
  if (DATA.failed) { $('#rank-panel').innerHTML = failed(); return; }
  const sk = skillById(state.skill), region = inRegion();
  const byRs = state.rs ? region.filter(p => p.rulesetId === state.rs) : region;
  const list = rankBy(sk, state.cls ? byRs.filter(p => p.class === state.cls) : byRs);
  const classes = [...new Set(byRs.map(p => p.class).filter(Boolean))].sort();
  let nav = '', grp;
  SKILLS.forEach(s => {
    if (s.group !== grp) { grp = s.group; if (grp) nav += `<div class="grp"><i class="dot" style="background:${GROUPS[grp][1]}"></i>${GROUPS[grp][0]}</div>`; }
    nav += `<a href="?p=rank&s=${s.id}" data-skill="${s.id}" class="${s.id === sk.id ? 'on' : ''}">${s.label} <span>${s.max}</span></a>`;
  });
  const count = id => region.filter(p => p.rulesetId === id).length;
  const rsChips = `<span class="chip ${state.rs ? '' : 'on'}" data-rs="0">Tous les modes<span class="n">${region.length}</span></span>` +
    RULESETS.map(([id, name]) => `<span class="chip ${state.rs === id ? 'on' : ''}" data-rs="${id}">${name}<span class="n">${count(id)}</span></span>`).join('');
  const clsChips = `<span class="chip ${state.cls ? '' : 'on'}" data-cls="">Toutes les classes</span>` +
    classes.map(c => `<span class="chip ${state.cls === c ? 'on' : ''}" data-cls="${esc(c)}">${esc(c)}</span>`).join('');
  const isTotal = sk.id === 'total';
  const rows = list.length ? list.map(({ p, v, r }) => `
    <div class="row${r <= 3 ? ' top' : ''}" data-c="${esc(pkey(p))}" role="row">
      <span class="rk">${r}</span>
      <span class="nm">${avatar(p)}<span><b>${full(p)}</b><small>${who(p)}${p.ruleset ? ' · ' + esc(p.ruleset) : ''}</small></span></span>
      ${isTotal ? tri(p) : sk.prof ? `<span class="mbar"><i style="--w:${(100 * v / (p.professions.find(x => x.id === sk.prof)?.max || 300)).toFixed(1)}%"></i></span>` : '<span class="c3"></span>'}
      <span class="tot">${fmt(v)}${isTotal && !p.complete ? '<em>estimé</em>' : ''}</span>
    </div>`).join('') : nobody();
  $('#rank-panel').innerHTML = `
    <div class="head"><h2>${sk.label}</h2><span class="note">${region.length} inscrit${region.length > 1 ? 's' : ''} · Forever ${state.region.toUpperCase()}</span></div>
    <div class="chips" role="group" aria-label="Mode de jeu">${rsChips}</div>
    <div class="board">
      <nav class="skills" aria-label="Compétences">${nav}</nav>
      <div>
        <div class="chips" role="group" aria-label="Classe" style="margin:0 0 12px">${clsChips}</div>
        <div class="rows" role="table">
          <div class="row th" role="row"><span>RANG</span><span>PERSONNAGE</span><span class="c3">${isTotal ? 'RÉPARTITION' : ''}</span><span style="text-align:right">${isTotal ? 'TOTAL' : 'VALEUR'}</span></div>
          ${rows}
        </div>
      </div>
    </div>
    ${isTotal ? `<div class="legend"><span><i style="background:var(--lvl)"></i>Niveau</span><span><i style="background:var(--wpn)"></i>Armes et Défense</span><span><i style="background:var(--prf)"></i>Métiers</span><span><i style="background:repeating-linear-gradient(135deg,var(--wpn) 0 3px,#33435f 3px 6px)"></i>Armes estimées, en attente du fichier Dropamine</span></div>` : ''}`;
}

/* ---------- Personnage ---------- */
function chartSvg(hist) {
  if (!hist || hist.length < 2) return `<div class="empty" style="padding:30px 0">La courbe apparaîtra après quelques jours de suivi.</div>`;
  const W = 420, H = 140, pad = 12, ts = hist.map(h => h.t), lo = Math.min(...ts), hi = Math.max(...ts), span = Math.max(1, hi - lo);
  const pts = hist.map((h, i) => [(i / (hist.length - 1)) * W, H - pad - ((h.t - lo) / span) * (H - 2 * pad)]);
  const line = pts.map(p => p.map(n => n.toFixed(1)).join(' ')).join(' L');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" aria-label="Progression"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c49a5c" stop-opacity=".32"/><stop offset="1" stop-color="#c49a5c" stop-opacity="0"/></linearGradient></defs>
    <path d="M${line} L${W} ${H} L0 ${H}Z" fill="url(#area)"/><path class="stroke" d="M${line}" fill="none" stroke="#e8c88a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4.5" fill="#e8c88a"/></svg>`;
}
function renderChar() {
  if (DATA.failed) { $('#char-panel').innerHTML = failed(); return; }
  const p = DATA.players.find(x => pkey(x) === state.c || x.slug === state.c) || inRegion()[0];
  if (!p) { $('#char-panel').innerHTML = `<div class="empty"><b>Aucun personnage</b>Cherche un personnage inscrit, ou choisis-en un dans le classement.</div>`; return; }
  state.c = pkey(p);
  const peers = DATA.players.filter(x => (x.region || 'eu') === (p.region || 'eu'));
  const totalRank = rankBy(SKILLS[0], peers).find(x => x.p === p)?.r;
  const hist = p.history || [], gained = hist.length > 1 ? hist[hist.length - 1].t - hist[0].t : 0;
  const profs = [...(p.professions || [])].sort((a, b) => b.skill - a.skill).map(pr => {
    const r = rankBy(skillById('p' + pr.id), peers).find(x => x.p === p)?.r;
    return `<div class="prof"><span>${PROF[pr.id] || esc(pr.name)}</span><span class="bar"><i style="--w:${(100 * pr.skill / (pr.max || 300)).toFixed(1)}%"></i></span><b>${pr.skill}</b><span>${r ? ord(r) : ''}</span></div>`;
  }).join('') || '<div class="empty">Aucun métier appris.</div>';
  const stats = Object.entries({ ...STATS, deaths: 'Morts' }).filter(([k]) => p.stats?.[k] != null).map(([k, l]) => `<div>${l}<b>${fmt(p.stats[k])}</b></div>`).join('');
  const portrait = p.render
    ? `<div class="portrait"><div class="plinth"></div><div class="plinth2"></div><div class="fig" style="background-image:url('${esc(p.render)}')" role="img" aria-label="${full(p)}"></div></div>`
    : `<div class="vial" role="img" aria-label="Goutte Dropamine"></div>`;
  $('#char-panel').innerHTML = `
    <div class="who${p.render ? ' has-render' : ''}">
      ${portrait}
      <div><h2>${full(p)}</h2><p>${esc(p.class)} ${esc(p.race?.toLowerCase())} · niveau ${p.level}${p.guild ? ` · <a href="?p=guild&g=${esc(p.guild.slug)}" data-g="${esc(p.guild.slug)}">${esc(p.guild.name)}</a>` : ''} · ${esc((p.region || 'eu').toUpperCase())}${p.ruleset ? ' ' + esc(p.ruleset) : ''}</p>
        ${p.complete ? `<span class="seal"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m5 12 5 5 9-10"/></svg>VÉRIFIÉ · ARMURERIE + FICHIER DROPAMINE</span>` : `<span class="seal est">ARMURERIE · ARMES ESTIMÉES</span>`}</div>
      <div class="score"><div class="n" data-n="${p.total}">${fmt(p.total)}<small> / ${fmt(p.max || 2460)}</small></div><div class="r">${totalRank ? ord(totalRank) + ' · ' : ''}NIVEAU TOTAL</div></div>
    </div>
    <div class="split">
      <div><div class="k" style="color:var(--lvl-hi)"><i class="dot" style="background:var(--lvl)"></i>NIVEAU</div><div class="v">${p.level}</div><div class="s">sur 60</div></div>
      <div><div class="k" style="color:var(--wpn-hi)"><i class="dot" style="background:var(--wpn)"></i>ARMES ET DÉFENSE</div><div class="v">${fmt(p.parts.combat)}</div><div class="s">Défense ${p.defense} · armes ${fmt(p.weapons)}${p.complete ? '' : ' (estimées)'}</div></div>
      <div><div class="k" style="color:var(--prf-hi)"><i class="dot" style="background:var(--prf)"></i>MÉTIERS</div><div class="v">${fmt(p.parts.professions)}</div><div class="s">${p.professions?.length || 0} métier${(p.professions?.length || 0) > 1 ? 's' : ''}</div></div>
    </div>
    <div class="two">
      <div><h3 class="sub">Métiers</h3>${profs}</div>
      <div><h3 class="sub">Progression${gained ? ` <span>+${fmt(gained)}</span>` : ''}</h3>${chartSvg(hist)}${stats ? `<div class="ledger">${stats}</div>` : ''}</div>
    </div>
    ${p.complete ? '' : `<div class="cta"><b>Score estimé.</b> Les compétences d'armes ne sont pas dans l'armurerie : elles sont comptées au maximum pour chaque arme équipée. Le fichier Dropamine du joueur donnera bientôt le score exact.</div>`}`;
}

/* ---------- Guildes ---------- */
function guilds() {
  const m = new Map();
  inRegion().forEach(p => { if (!p.guild) return; const g = m.get(p.guild.slug) || { ...p.guild, members: [] }; g.members.push(p); m.set(p.guild.slug, g); });
  return [...m.values()].map(g => ({ ...g, total: g.members.reduce((s, p) => s + p.total, 0) })).sort((a, b) => b.total - a.total);
}
function gain7(p) {
  const h = p.history || []; if (h.length < 2) return null;
  const last = h[h.length - 1], cut = new Date(new Date(last.d) - 7 * 864e5).toISOString().slice(0, 10);
  return last.t - ([...h].reverse().find(x => x.d <= cut) || h[0]).t;
}
function renderGuild() {
  if (DATA.failed) { $('#guild-panel').innerHTML = failed(); return; }
  const all = guilds(), g = all.find(x => x.slug === state.g);
  if (!g) {
    $('#guild-panel').innerHTML = `<div class="head"><h2>Guildes</h2><span class="note">classées par le total de leurs membres inscrits · Forever ${state.region.toUpperCase()}</span></div>
      <div class="rows glist">${all.length ? `<div class="row th"><span>RANG</span><span>GUILDE</span><span style="text-align:right" class="c3">INSCRITS</span><span style="text-align:right">TOTAL</span></div>` +
        all.map((x, i) => `<div class="row${i < 3 ? ' top' : ''}" data-g="${esc(x.slug)}"><span class="rk">${i + 1}</span><span class="nm"><span><b>${esc(x.name)}</b></span></span><span class="val">${x.members.length}</span><span class="tot">${fmt(x.total)}</span></div>`).join('')
        : `<div class="empty"><b>Aucune guilde</b>Les guildes apparaissent dès qu'un de leurs membres est inscrit.</div>`}</div>`;
    return;
  }
  const rank = all.indexOf(g) + 1, members = [...g.members].sort((a, b) => b.total - a.total);
  let best = null; members.forEach(p => p.professions?.forEach(pr => { if (!best || pr.skill > best.pr.skill) best = { p, pr }; }));
  const gains = members.map(p => ({ p, d: gain7(p) })).filter(x => x.d > 0).sort((a, b) => b.d - a.d);
  const feat = (k, v, s) => `<div class="feat"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  $('#guild-panel').innerHTML = `
    <span class="back" data-g="">← Toutes les guildes</span>
    <div class="who" style="grid-template-columns:minmax(0,1fr) auto">
      <div><h2>${esc(g.name)}</h2><p>${members.length} membre${members.length > 1 ? 's' : ''} inscrit${members.length > 1 ? 's' : ''}</p></div>
      <div class="score"><div class="n" data-n="${g.total}">${fmt(g.total)}</div><div class="r">TOTAL DES INSCRITS · ${ord(rank)} GUILDE</div></div>
    </div>
    <div class="feats">
      ${feat('MEILLEUR TOTAL', full(members[0]), fmt(members[0].total))}
      ${best ? feat('MEILLEUR MÉTIER', full(best.p), `${PROF[best.pr.id] || esc(best.pr.name)} · ${best.pr.skill}`) : ''}
      ${gains.length ? feat('PLUS FORTE SEMAINE', full(gains[0].p), `+${fmt(gains[0].d)} en 7 jours`) : feat('PLUS FORTE SEMAINE', '—', 'pas encore assez de suivi')}
    </div>
    <div class="rows" style="margin-top:clamp(18px,2.6vw,28px)">
      <div class="row th g"><span>RANG</span><span>MEMBRE</span><span class="c3">RÉPARTITION</span><span class="c4" style="text-align:right">7 J</span><span style="text-align:right">TOTAL</span></div>
      ${members.map((p, i) => { const d = gain7(p); return `<div class="row g${i < 3 ? ' top' : ''}" data-c="${esc(pkey(p))}"><span class="rk">${i + 1}</span><span class="nm">${avatar(p)}<span><b>${full(p)}</b><small>${esc(p.class)} ${p.level}</small></span></span>${tri(p)}<span class="up">${d ? (d > 0 ? '+' : '') + fmt(d) : '—'}</span><span class="tot">${fmt(p.total)}${p.complete ? '' : '<em>estimé</em>'}</span></div>`; }).join('')}
    </div>`;
}

/* ---------- Nouveautés ---------- */
function renderNews() {
  const box = $('#news-list');
  if (!NEWS) { box.innerHTML = `<div class="empty">Chargement…</div>`; return; }
  if (!NEWS.versions?.length) { box.innerHTML = `<div class="empty"><b>Indisponible</b>Le journal des versions n'a pas pu être chargé.</div>`; return; }
  box.innerHTML = NEWS.versions.map((v, i) => `
    <div class="release${i > 1 ? ' more' : ''}">
      <div class="ver">${esc(v.version)}${i === 0 ? '<small>DERNIÈRE VERSION</small>' : ''}</div>
      <div>${v.sections.map(s => `${s.title ? `<h4>${esc(s.title.toUpperCase())}</h4>` : ''}<ul>${s.items.map(x => `<li>${x}</li>`).join('')}</ul>`).join('')}
        ${i > 1 ? `<span class="toggle">Afficher le détail</span>` : ''}</div>
    </div>`).join('') +
    `<p style="margin:18px 0 0;color:var(--faint);font-style:italic">Historique complet sur <a href="https://github.com/Raykuilu/Dropamine/blob/main/CHANGELOG.md" rel="noopener">GitHub</a>.</p>`;
}
document.addEventListener('click', e => { const t = e.target.closest('.release.more .toggle'); if (t) { t.closest('.release').classList.remove('more'); t.remove(); } });

/* ---------- Animations d'arrivée ---------- */
function animate(view) {
  $$('.tri i,.prof .bar i,.mbar i', view).forEach((el, i) => {
    const target = getComputedStyle(el).getPropertyValue('--w');
    if (reduce) { el.style.width = target; return; }
    el.style.width = '0'; requestAnimationFrame(() => setTimeout(() => { el.style.width = target; }, 60 + i * 18));
  });
  if (reduce) return;
  $$('[data-n]', view).forEach(el => {
    const n = +el.dataset.n, t0 = performance.now();
    (function step(t) { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3);
      el.firstChild.nodeValue = fmt(n * e); if (k < 1) requestAnimationFrame(step); })(t0);
  });
}
const io = 'IntersectionObserver' in window && !reduce
  ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' }) : null;
$$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

/* ---------- Navigation : l'adresse porte l'état (partage, retour arrière) ---------- */
const tabs = $$('.tabs button');
function readUrl() {
  const q = new URLSearchParams(location.search);
  const v = q.get('p');
  state.view = VIEWS.includes(v) ? v : (q.get('c') ? 'char' : q.get('g') ? 'guild' : 'home');
  state.region = ['eu', 'us', 'tw'].includes(q.get('r')) ? q.get('r') : 'eu';
  state.skill = q.get('s') || 'total'; state.cls = q.get('cl') || ''; state.rs = +q.get('m') || 0;
  state.c = q.get('c') || state.c; state.g = q.get('g') || '';
}
function writeUrl(push) {
  if (SHOT) return;
  const q = new URLSearchParams();
  if (state.view !== 'home') q.set('p', state.view);
  if (state.region !== 'eu') q.set('r', state.region);
  if (state.view === 'rank') { if (state.skill !== 'total') q.set('s', state.skill); if (state.cls) q.set('cl', state.cls); if (state.rs) q.set('m', state.rs); }
  if (state.view === 'char' && state.c) q.set('c', state.c);
  if (state.view === 'guild' && state.g) q.set('g', state.g);
  const url = q.toString() ? '?' + q : location.pathname;
  history[push ? 'pushState' : 'replaceState'](null, '', url);
}
const RENDER = { home: renderHome, rank: renderRank, char: renderChar, guild: renderGuild, news: renderNews };
function render(push) {
  (RENDER[state.view] || (() => {}))();
  if (state.view === 'home') renderHome();
  tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.view === state.view));
  $$('.view').forEach(v => v.classList.toggle('on', v.id === state.view));
  $('#sub').textContent = `HISCORES · FOREVER ${state.region.toUpperCase()}`;
  $('#region').value = state.region;
  document.title = { home: "Dropamine — l'addon WoW Forever qui fête chaque +1", rank: 'Classements · Dropamine', char: 'Personnage · Dropamine',
    guild: 'Guildes · Dropamine', news: 'Nouveautés · Dropamine', get: 'Télécharger · Dropamine', join: 'Inscription · Dropamine', privacy: 'Confidentialité · Dropamine' }[state.view];
  animate($('#' + state.view));
  writeUrl(push);
}
function go(patch) {
  const changedView = patch.view && patch.view !== state.view;
  Object.assign(state, patch); render(true);
  Ribbon.swell(changedView ? 1 : .45);
  if (changedView) scrollTo({ top: Math.min(scrollY, $('.nav').offsetTop), behavior: reduce ? 'auto' : 'smooth' });
}
tabs.forEach(b => b.addEventListener('click', () => go({ view: b.dataset.view })));
$('#region').addEventListener('change', e => go({ region: e.target.value, cls: '', g: '' }));
document.addEventListener('click', e => {
  if (e.button || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const t = e.target.closest('[data-view-link],[data-skill],[data-cls],[data-rs],[data-c],[data-g]');
  if (!t || t.closest('.suggest')) return;
  e.preventDefault();
  const d = t.dataset;
  if (d.viewLink) go({ view: d.viewLink });
  else if (d.skill) go({ skill: d.skill });
  else if (d.cls !== undefined) go({ cls: d.cls });
  else if (d.rs !== undefined) go({ rs: +d.rs, cls: '' });
  else if (d.c) go({ view: 'char', c: d.c });
  else if (d.g !== undefined) go({ view: 'guild', g: d.g });
});
addEventListener('popstate', () => { readUrl(); render(false); Ribbon.swell(.6); });

/* ---------- Recherche ---------- */
(function search() {
  const input = $('#q'), box = $('#suggest'); let hits = [], hl = 0;
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const draw = () => {
    box.innerHTML = hits.length ? hits.map((p, i) => `<a href="?p=char&c=${esc(pkey(p))}" class="${i === hl ? 'hl' : ''}" data-key="${esc(pkey(p))}">${full(p)}<small>${esc((p.region || 'eu').toUpperCase())} · ${who(p)}</small></a>`).join('')
      : `<div class="none">Aucun personnage inscrit ne correspond.</div>`;
    box.classList.toggle('on', input.value.trim().length > 0);
  };
  const pick = p => { input.value = ''; box.classList.remove('on'); input.blur(); go({ view: 'char', c: pkey(p), region: p.region || 'eu' }); };
  input.addEventListener('input', () => {
    const q = fold(input.value.trim()); hl = 0;
    hits = q ? DATA.players.filter(p => fold(`${p.name} ${p.surname} ${p.slug}`).includes(q)).slice(0, 8) : [];
    draw();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { hl = Math.min(hits.length - 1, hl + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { hl = Math.max(0, hl - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && hits[hl]) pick(hits[hl]);
    else if (e.key === 'Escape') { box.classList.remove('on'); input.blur(); }
  });
  box.addEventListener('mousedown', e => { const a = e.target.closest('a[data-key]'); if (a) { e.preventDefault(); pick(DATA.players.find(p => pkey(p) === a.dataset.key)); } });
  input.addEventListener('blur', () => setTimeout(() => box.classList.remove('on'), 120));
})();

/* ---------- Démarrage ---------- */
readUrl();
render(false);
Ribbon.load(true);
Promise.all([
  fetch('data/hiscores.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(d => { DATA = d; })
    .catch(() => { DATA = { players: [], failed: true }; }),
  fetch('data/changelog.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(d => { NEWS = d; })
    .catch(() => { NEWS = { versions: [] }; }),
]).then(() => {
  if (DATA.updated) $('#updated').textContent = 'Hiscores mis à jour le ' + new Date(DATA.updated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + '.';
  const v = NEWS?.versions?.[0]?.version;
  if (v) $('#home-meta').textContent = `Version ${v} · gratuit · open source (MIT) · français et anglais`;
  Ribbon.load(false);
  return document.fonts.ready;
}).then(() => { render(false); Ribbon.swell(.7); });
