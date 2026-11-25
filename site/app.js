// Dropamine — site : vitrine + Hiscores, en anglais et en français. Aucune dépendance.
'use strict';
const SHOT = location.search.includes('shot');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || SHOT;
if (SHOT) document.documentElement.classList.add('static');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ======================================================================
   Langue : le texte fixe est en double dans la page (lang="en" / lang="fr"),
   le texte calculé passe par t(). Choix gardé dans le navigateur.
   ====================================================================== */
let LANG = document.documentElement.dataset.lang === 'fr' ? 'fr' : 'en';
const I18N = {
  'tab.rank': ['Hiscores', 'Classements'], 'tab.char': ['Character', 'Personnage'], 'tab.guild': ['Guilds', 'Guildes'],
  'tab.news': ["What's new", 'Nouveautés'], 'btn.download': ['Download', 'Télécharger'], 'search.ph': ['Find a character…', 'Chercher un personnage…'],
  'foot.addon': ['THE ADDON', "L'ADDON"], 'foot.join': ['Join or leave', "S'inscrire ou se retirer"], 'foot.privacy': ['Privacy', 'Confidentialité'], 'foot.code': ['Site source', 'Code du site'], 'foot.coffee': ['Buy me a coffee', "M'offrir un café"],
  total: ['Total level', 'Niveau total'], level: ['Level', 'Niveau'], defense: ['Defense', 'Défense'],
  'g.lvl': ['LEVEL', 'NIVEAU'], 'g.wpn': ['WEAPONS & DEFENSE', 'ARMES ET DÉFENSE'], 'g.prf': ['PROFESSIONS', 'MÉTIERS'], 'g.stat': ['STATISTICS', 'STATISTIQUES'],
  kills: ['Creatures killed', 'Créatures tuées'], quests: ['Quests', 'Quêtes'], flights: ['Flights taken', 'Trajets aériens'], deaths: ['Deaths', 'Morts'],
  rank: ['RANK', 'RANG'], character: ['CHARACTER', 'PERSONNAGE'], split: ['BREAKDOWN', 'RÉPARTITION'], value: ['VALUE', 'VALEUR'], totalH: ['TOTAL', 'TOTAL'],
  member: ['MEMBER', 'MEMBRE'], guildH: ['GUILD', 'GUILDE'], members: ['MEMBERS', 'INSCRITS'], d7: ['7 D', '7 J'],
  est: ['estimated', 'estimé'], allModes: ['All modes', 'Tous les modes'], allClasses: ['All classes', 'Toutes les classes'],
  registered: ['{n} registered', '{n} inscrit{s}'],
  legend: ['Weapons estimated, waiting for the Dropamine file', 'Armes estimées, en attente du fichier Dropamine'], weaponsDef: ['Weapons & Defense', 'Armes et Défense'], professions: ['Professions', 'Métiers'],
  failedT: ['Data unavailable', 'Données indisponibles'], failed: ["The Hiscores couldn't be loaded. Try again in a moment.", "Le classement n'a pas pu être chargé. Réessaie dans un instant."],
  nobodyT: ['Nobody yet', "Personne pour l'instant"], nobody: ['No registered character in this region.', 'Aucun personnage inscrit dans cette région.'], registerYours: ['Register yours', 'Inscris le tien'],
  noCharT: ['No character', 'Aucun personnage'], noChar: ['Search for a registered character, or pick one in the Hiscores.', 'Cherche un personnage inscrit, ou choisis-en un dans le classement.'],
  noSearch: ['No registered character matches.', 'Aucun personnage inscrit ne correspond.'],
  chartSoon: ['The chart will appear after a few days of tracking.', 'La courbe apparaîtra après quelques jours de suivi.'],
  levelN: ['level {n}', 'niveau {n}'], of60: ['out of 60', 'sur 60'], profCount: ['{n} profession{s}', '{n} métier{s}'], noProf: ['No profession learned.', 'Aucun métier appris.'],
  progress: ['Progress', 'Progression'], defW: ['Defense {d} · weapons {w}', 'Défense {d} · armes {w}'], estP: [' (estimated)', ' (estimées)'],
  sealOk: ['VERIFIED · ARMORY + DROPAMINE FILE', 'VÉRIFIÉ · ARMURERIE + FICHIER DROPAMINE'], sealEst: ['ARMORY · WEAPONS ESTIMATED', 'ARMURERIE · ARMES ESTIMÉES'],
  totalLevel: ['TOTAL LEVEL', 'NIVEAU TOTAL'],
  ctaEst: ["<b>Estimated score.</b> Weapon skills are not in the armory, so each equipped weapon is counted at its maximum. The player's Dropamine file will soon give the exact score.",
    "<b>Score estimé.</b> Les compétences d'armes ne sont pas dans l'armurerie : elles sont comptées au maximum pour chaque arme équipée. Le fichier Dropamine du joueur donnera bientôt le score exact."],
  guildsT: ['Guilds', 'Guildes'], guildsNote: ["ranked by their registered members' total · Forever {r}", 'classées par le total de leurs membres inscrits · Forever {r}'],
  noGuildT: ['No guild', 'Aucune guilde'], noGuild: ['Guilds appear as soon as one of their members registers.', "Les guildes apparaissent dès qu'un de leurs membres est inscrit."],
  allGuilds: ['← All guilds', '← Toutes les guildes'], membersN: ['{n} registered member{s}', '{n} membre{s} inscrit{s}'],
  guildTotal: ['REGISTERED TOTAL · {r} GUILD', 'TOTAL DES INSCRITS · {r} GUILDE'],
  bestTotal: ['BEST TOTAL', 'MEILLEUR TOTAL'], bestProf: ['BEST PROFESSION', 'MEILLEUR MÉTIER'], bestWeek: ['BEST WEEK', 'PLUS FORTE SEMAINE'],
  inWeek: ['+{n} in 7 days', '+{n} en 7 jours'], notEnough: ['not enough tracking yet', 'pas encore assez de suivi'],
  latest: ['LATEST VERSION', 'DERNIÈRE VERSION'], showMore: ['Show details', 'Afficher le détail'], fullHistory: ['Full history on', 'Historique complet sur'],
  newsFailT: ['Unavailable', 'Indisponible'], newsFail: ["The changelog couldn't be loaded.", "Le journal des versions n'a pas pu être chargé."],
  updated: ['Hiscores updated {d}.', 'Hiscores mis à jour le {d}.'], meta: ['Version {v} · free · open source (MIT) · English and French', 'Version {v} · gratuit · open source (MIT) · français et anglais'],
  loading: ['Loading…', 'Chargement…'],
  title: ['Dropamine — the WoW Forever addon that celebrates every +1', "Dropamine — l'addon WoW Forever qui fête chaque +1"],
};
const t = (k, vars = {}) => {
  let s = (I18N[k] || [k, k])[LANG === 'fr' ? 1 : 0];
  for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, b);
  return s.replaceAll('{s}', +vars.n > 1 ? 's' : '');
};
const locale = () => LANG === 'fr' ? 'fr-FR' : 'en-GB';
const fmt = n => Math.round(n).toLocaleString(locale());
const ord = n => LANG === 'fr' ? (n === 1 ? '1ᵉʳ' : n + 'ᵉ') : n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

/* ---------- Référentiels (identifiants de l'API → noms dans les deux langues) ---------- */
const PROF = { 165: ['Leatherworking', 'Travail du cuir'], 393: ['Skinning', 'Dépeçage'], 185: ['Cooking', 'Cuisine'], 356: ['Fishing', 'Pêche'],
  129: ['First Aid', 'Secourisme'], 171: ['Alchemy', 'Alchimie'], 164: ['Blacksmithing', 'Forge'], 333: ['Enchanting', 'Enchantement'],
  202: ['Engineering', 'Ingénierie'], 182: ['Herbalism', 'Herboristerie'], 186: ['Mining', 'Minage'], 197: ['Tailoring', 'Couture'] };
const CLASS = { 1: ['Warrior', 'Guerrier'], 2: ['Paladin', 'Paladin'], 3: ['Hunter', 'Chasseur'], 4: ['Rogue', 'Voleur'], 5: ['Priest', 'Prêtre'],
  7: ['Shaman', 'Chaman'], 8: ['Mage', 'Mage'], 9: ['Warlock', 'Démoniste'], 11: ['Druid', 'Druide'] };
const RACE = { 1: ['Human', 'humain'], 2: ['Orc', 'orc'], 3: ['Dwarf', 'nain'], 4: ['Night Elf', 'elfe de la nuit'], 5: ['Undead', 'mort-vivant'],
  6: ['Tauren', 'tauren'], 7: ['Gnome', 'gnome'], 8: ['Troll', 'troll'] };
const RULESETS = [[2, ['Normal', 'Normal']], [1, ['PvP', 'JcJ']], [3, ['RP', 'Jeu de rôle']], [15, ['RP-PvP', 'Jeu de rôle JcJ']]];
const L2 = pair => pair ? pair[LANG === 'fr' ? 1 : 0] : '';
const profName = (id, fallback) => L2(PROF[id]) || fallback || '';
const className = p => L2(CLASS[p.classId]) || p.class || '';
const raceName = p => L2(RACE[p.raceId]) || (p.race || '').toLowerCase();
const rulesetName = p => L2((RULESETS.find(([id]) => id === p.rulesetId) || [])[1]) || p.ruleset || '';
const PROF_ORDER = [393, 186, 182, 171, 164, 333, 202, 165, 197, 185, 356, 129];
const STAT_KEYS = ['kills', 'quests', 'flights'];
const SKILLS = [
  { id: 'total', group: null, label: () => t('total'), max: '2 460', get: p => p.total },
  { id: 'level', group: 'lvl', label: () => t('level'), max: '60', get: p => p.level },
  { id: 'defense', group: 'wpn', label: () => t('defense'), max: '300', get: p => p.defense || null },
  ...PROF_ORDER.map(id => ({ id: 'p' + id, group: 'prf', label: () => profName(id), max: '300', prof: id,
    get: p => p.professions?.find(x => x.id === id)?.skill ?? null })),
  ...STAT_KEYS.map(k => ({ id: k, group: 'stat', label: () => t(k), max: '', get: p => p.stats?.[k] ?? null })),
];
const GROUP_COLOR = { lvl: 'var(--lvl)', wpn: 'var(--wpn)', prf: 'var(--prf)', stat: 'var(--rim)' };
const VIEWS = ['home', 'rank', 'char', 'guild', 'news', 'get', 'join', 'privacy'];

let DATA = { players: [] }, NEWS = null;
const state = { view: 'home', region: 'eu', skill: 'total', cls: 0, rs: 0, c: '', g: '' };
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
  let energy = 0, loading = false, time = 0, last = performance.now(), running = false;
  function draw() {
    const e = Math.min(1, energy + (loading ? .35 + .15 * Math.sin(time * 6) : 0));
    const th = 2.6 + 9 * e;
    const curve = (k, b) => x => k * th + th * (.22 + .28 * e) * Math.sin(2 * Math.PI * x / b.per + b.ph + (b.run || 0)) * (k / 3 + .4);
    let prev = () => 0;
    bands.forEach((b, i) => {
      const top = prev, bot = curve(i + 1, b);
      let up = '', down = '', edge = '';
      for (let x = 0; x <= W; x += 20) up += (x ? ' L' : 'M') + x + ' ' + top(x).toFixed(2);
      for (let x = W; x >= 0; x -= 20) down += ' L' + x + ' ' + bot(x).toFixed(2);
      for (let x = 0; x <= W; x += 20) edge += (x ? ' L' : 'M') + x + ' ' + bot(x).toFixed(2);
      b.f.setAttribute('d', up + down + 'Z'); b.l.setAttribute('d', edge);
      prev = bot;
    });
  }
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    time += dt; energy *= Math.pow(.18, dt);
    const e = Math.min(1, energy + (loading ? .35 : 0));
    bands.forEach(b => { b.run = ((b.run || 0) + dt * b.speed * (1 + .5 * e)) % (2 * Math.PI); });   // phase cumulée : la vague gonfle sans s'emballer
    draw();
    if (!document.hidden) requestAnimationFrame(frame); else running = false;
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
const who = p => `${esc(className(p))} ${p.level}${p.guild ? ' · ' + esc(p.guild.name) : ''}`;
const avatar = p => p.avatar ? `<img class="ava" src="${esc(p.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '';
const pkey = p => p.key || `${p.region || 'eu'}/${p.slug}`;
const tri = p => {
  const w = v => (100 * v / (p.max || 2460)).toFixed(1) + '%';
  return `<span class="tri" title="${t('level')} ${p.parts.level} · ${t('weaponsDef')} ${p.parts.combat}${p.complete ? '' : t('estP')} · ${t('professions')} ${p.parts.professions}">` +
    `<i class="l" style="--w:${w(p.parts.level)}"></i><i class="w${p.complete ? '' : ' est'}" style="--w:${w(p.parts.combat)}"></i><i class="p" style="--w:${w(p.parts.professions)}"></i></span>`;
};
const skillById = id => SKILLS.find(s => s.id === id) || SKILLS[0];
function rankBy(skill, list) {
  return list.map(p => ({ p, v: skill.get(p) })).filter(x => x.v != null && x.v > 0)
    .sort((a, b) => b.v - a.v || pkey(a.p).localeCompare(pkey(b.p))).map((x, i) => ({ ...x, r: i + 1 }));
}
const failed = () => `<div class="empty"><b>${t('failedT')}</b>${t('failed')}</div>`;
const nobody = () => `<div class="empty"><b>${t('nobodyT')}</b>${t('nobody')} <a href="?p=join" data-view-link="join">${t('registerYours')}</a>.</div>`;
const estTag = p => p.complete ? '' : `<em>${t('est')}</em>`;

/* ---------- Accueil : le pont vers les classements ---------- */
function renderHome() {
  const top = rankBy(SKILLS[0], inRegion()).slice(0, 5);
  $('#home-top').innerHTML = DATA.failed ? failed() : top.length
    ? top.map(({ p, v, r }) => `<div class="row${r <= 3 ? ' top' : ''}" data-c="${esc(pkey(p))}" style="grid-template-columns:44px minmax(0,1fr) minmax(90px,160px) 96px"><span class="rk">${r}</span><span class="nm">${avatar(p)}<span><b>${full(p)}</b><small>${who(p)}</small></span></span>${tri(p)}<span class="tot">${fmt(v)}${estTag(p)}</span></div>`).join('')
    : nobody();
}

/* ---------- Classement ---------- */
function renderRank() {
  if (DATA.failed) { $('#rank-panel').innerHTML = failed(); return; }
  const sk = skillById(state.skill), region = inRegion();
  const byRs = state.rs ? region.filter(p => p.rulesetId === state.rs) : region;
  const list = rankBy(sk, state.cls ? byRs.filter(p => p.classId === state.cls) : byRs);
  const classes = [...new Set(byRs.map(p => p.classId).filter(Boolean))].sort((a, b) => L2(CLASS[a]).localeCompare(L2(CLASS[b])));
  let nav = '', grp;
  SKILLS.forEach(s => {
    if (s.group !== grp) { grp = s.group; if (grp) nav += `<div class="grp"><i class="dot" style="background:${GROUP_COLOR[grp]}"></i>${t('g.' + grp)}</div>`; }
    nav += `<a href="?p=rank&s=${s.id}" data-skill="${s.id}" class="${s.id === sk.id ? 'on' : ''}">${s.label()} <span>${s.max}</span></a>`;
  });
  const count = id => region.filter(p => p.rulesetId === id).length;
  const rsChips = `<span class="chip ${state.rs ? '' : 'on'}" data-rs="0">${t('allModes')}<span class="n">${region.length}</span></span>` +
    RULESETS.map(([id, names]) => `<span class="chip ${state.rs === id ? 'on' : ''}" data-rs="${id}">${L2(names)}<span class="n">${count(id)}</span></span>`).join('');
  const clsChips = `<span class="chip ${state.cls ? '' : 'on'}" data-cls="0">${t('allClasses')}</span>` +
    classes.map(c => `<span class="chip ${state.cls === c ? 'on' : ''}" data-cls="${c}">${esc(L2(CLASS[c]))}</span>`).join('');
  const isTotal = sk.id === 'total';
  const rows = list.length ? list.map(({ p, v, r }) => `
    <div class="row${r <= 3 ? ' top' : ''}" data-c="${esc(pkey(p))}" role="row">
      <span class="rk">${r}</span>
      <span class="nm">${avatar(p)}<span><b>${full(p)}</b><small>${who(p)}${rulesetName(p) ? ' · ' + esc(rulesetName(p)) : ''}</small></span></span>
      ${isTotal ? tri(p) : sk.prof ? `<span class="mbar"><i style="--w:${(100 * v / (p.professions.find(x => x.id === sk.prof)?.max || 300)).toFixed(1)}%"></i></span>` : '<span class="c3"></span>'}
      <span class="tot">${fmt(v)}${isTotal ? estTag(p) : ''}</span>
    </div>`).join('') : nobody();
  $('#rank-panel').innerHTML = `
    <div class="head"><h2>${sk.label()}</h2><span class="note">${t('registered', { n: region.length })} · Forever ${state.region.toUpperCase()}</span></div>
    <div class="chips" role="group">${rsChips}</div>
    <div class="board">
      <nav class="skills">${nav}</nav>
      <div>
        <div class="chips" role="group" style="margin:0 0 12px">${clsChips}</div>
        <div class="rows" role="table">
          <div class="row th" role="row"><span>${t('rank')}</span><span>${t('character')}</span><span class="c3">${isTotal ? t('split') : ''}</span><span style="text-align:right">${isTotal ? t('totalH') : t('value')}</span></div>
          ${rows}
        </div>
      </div>
    </div>
    ${isTotal ? `<div class="legend"><span><i style="background:var(--lvl)"></i>${t('level')}</span><span><i style="background:var(--wpn)"></i>${t('weaponsDef')}</span><span><i style="background:var(--prf)"></i>${t('professions')}</span><span><i style="background:repeating-linear-gradient(135deg,var(--wpn) 0 3px,#33435f 3px 6px)"></i>${t('legend')}</span></div>` : ''}`;
}

/* ---------- Personnage ---------- */
function chartSvg(hist) {
  if (!hist || hist.length < 2) return `<div class="empty" style="padding:30px 0">${t('chartSoon')}</div>`;
  const W = 420, H = 140, pad = 12, ts = hist.map(h => h.t), lo = Math.min(...ts), hi = Math.max(...ts), span = Math.max(1, hi - lo);
  const pts = hist.map((h, i) => [(i / (hist.length - 1)) * W, H - pad - ((h.t - lo) / span) * (H - 2 * pad)]);
  const line = pts.map(p => p.map(n => n.toFixed(1)).join(' ')).join(' L');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" aria-label="${t('progress')}"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c49a5c" stop-opacity=".32"/><stop offset="1" stop-color="#c49a5c" stop-opacity="0"/></linearGradient></defs>
    <path d="M${line} L${W} ${H} L0 ${H}Z" fill="url(#area)"/><path class="stroke" d="M${line}" fill="none" stroke="#e8c88a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4.5" fill="#e8c88a"/></svg>`;
}
function renderChar() {
  if (DATA.failed) { $('#char-panel').innerHTML = failed(); return; }
  const p = DATA.players.find(x => pkey(x) === state.c || x.slug === state.c) || inRegion()[0];
  if (!p) { $('#char-panel').innerHTML = `<div class="empty"><b>${t('noCharT')}</b>${t('noChar')}</div>`; return; }
  state.c = pkey(p);
  const peers = DATA.players.filter(x => (x.region || 'eu') === (p.region || 'eu'));
  const totalRank = rankBy(SKILLS[0], peers).find(x => x.p === p)?.r;
  const hist = p.history || [], gained = hist.length > 1 ? hist[hist.length - 1].t - hist[0].t : 0;
  const nProf = p.professions?.length || 0;
  const profs = [...(p.professions || [])].sort((a, b) => b.skill - a.skill).map(pr => {
    const r = rankBy(skillById('p' + pr.id), peers).find(x => x.p === p)?.r;
    return `<div class="prof"><span>${esc(profName(pr.id, pr.name))}</span><span class="bar"><i style="--w:${(100 * pr.skill / (pr.max || 300)).toFixed(1)}%"></i></span><b>${pr.skill}</b><span>${r ? ord(r) : ''}</span></div>`;
  }).join('') || `<div class="empty">${t('noProf')}</div>`;
  const stats = [...STAT_KEYS, 'deaths'].filter(k => p.stats?.[k] != null).map(k => `<div>${t(k)}<b>${fmt(p.stats[k])}</b></div>`).join('');
  const portrait = p.render
    ? `<div class="portrait"><div class="plinth"></div><div class="plinth2"></div><div class="fig" style="background-image:url('${esc(p.render)}')" role="img" aria-label="${full(p)}"></div></div>`
    : `<div class="vial" role="img" aria-label="Dropamine"></div>`;
  const desc = LANG === 'fr' ? `${esc(className(p))} ${esc(raceName(p))}` : `${esc(raceName(p))} ${esc(className(p))}`;
  $('#char-panel').innerHTML = `
    <div class="who${p.render ? ' has-render' : ''}">
      ${portrait}
      <div><h2>${full(p)}</h2><p>${desc} · ${t('levelN', { n: p.level })}${p.guild ? ` · <a href="?p=guild&g=${esc(p.guild.slug)}" data-g="${esc(p.guild.slug)}">${esc(p.guild.name)}</a>` : ''} · ${esc((p.region || 'eu').toUpperCase())}${rulesetName(p) ? ' ' + esc(rulesetName(p)) : ''}</p>
        ${p.complete ? `<span class="seal"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m5 12 5 5 9-10"/></svg>${t('sealOk')}</span>` : `<span class="seal est">${t('sealEst')}</span>`}</div>
      <div class="score"><div class="n" data-n="${p.total}">${fmt(p.total)}<small> / ${fmt(p.max || 2460)}</small></div><div class="r">${totalRank ? ord(totalRank) + ' · ' : ''}${t('totalLevel')}</div></div>
    </div>
    <div class="split">
      <div><div class="k" style="color:var(--lvl-hi)"><i class="dot" style="background:var(--lvl)"></i>${t('g.lvl')}</div><div class="v">${p.level}</div><div class="s">${t('of60')}</div></div>
      <div><div class="k" style="color:var(--wpn-hi)"><i class="dot" style="background:var(--wpn)"></i>${t('g.wpn')}</div><div class="v">${fmt(p.parts.combat)}</div><div class="s">${t('defW', { d: p.defense, w: fmt(p.weapons) })}${p.complete ? '' : t('estP')}</div></div>
      <div><div class="k" style="color:var(--prf-hi)"><i class="dot" style="background:var(--prf)"></i>${t('g.prf')}</div><div class="v">${fmt(p.parts.professions)}</div><div class="s">${t('profCount', { n: nProf })}</div></div>
    </div>
    <div class="two">
      <div><h3 class="sub">${t('professions')}</h3>${profs}</div>
      <div><h3 class="sub">${t('progress')}${gained ? ` <span>+${fmt(gained)}</span>` : ''}</h3>${chartSvg(hist)}${stats ? `<div class="ledger">${stats}</div>` : ''}</div>
    </div>
    ${p.complete ? '' : `<div class="cta">${t('ctaEst')}</div>`}`;
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
    $('#guild-panel').innerHTML = `<div class="head"><h2>${t('guildsT')}</h2><span class="note">${t('guildsNote', { r: state.region.toUpperCase() })}</span></div>
      <div class="rows glist">${all.length ? `<div class="row th"><span>${t('rank')}</span><span>${t('guildH')}</span><span style="text-align:right" class="c3">${t('members')}</span><span style="text-align:right">${t('totalH')}</span></div>` +
        all.map((x, i) => `<div class="row${i < 3 ? ' top' : ''}" data-g="${esc(x.slug)}"><span class="rk">${i + 1}</span><span class="nm"><span><b>${esc(x.name)}</b></span></span><span class="val">${x.members.length}</span><span class="tot">${fmt(x.total)}</span></div>`).join('')
        : `<div class="empty"><b>${t('noGuildT')}</b>${t('noGuild')}</div>`}</div>`;
    return;
  }
  const rank = all.indexOf(g) + 1, members = [...g.members].sort((a, b) => b.total - a.total);
  let best = null; members.forEach(p => p.professions?.forEach(pr => { if (!best || pr.skill > best.pr.skill) best = { p, pr }; }));
  const gains = members.map(p => ({ p, d: gain7(p) })).filter(x => x.d > 0).sort((a, b) => b.d - a.d);
  const feat = (k, v, s) => `<div class="feat"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  $('#guild-panel').innerHTML = `
    <span class="back" data-g="">${t('allGuilds')}</span>
    <div class="who" style="grid-template-columns:minmax(0,1fr) auto">
      <div><h2>${esc(g.name)}</h2><p>${t('membersN', { n: members.length })}</p></div>
      <div class="score"><div class="n" data-n="${g.total}">${fmt(g.total)}</div><div class="r">${t('guildTotal', { r: ord(rank) })}</div></div>
    </div>
    <div class="feats">
      ${feat(t('bestTotal'), full(members[0]), fmt(members[0].total))}
      ${best ? feat(t('bestProf'), full(best.p), `${esc(profName(best.pr.id, best.pr.name))} · ${best.pr.skill}`) : ''}
      ${gains.length ? feat(t('bestWeek'), full(gains[0].p), t('inWeek', { n: fmt(gains[0].d) })) : feat(t('bestWeek'), '—', t('notEnough'))}
    </div>
    <div class="rows" style="margin-top:clamp(18px,2.6vw,28px)">
      <div class="row th g"><span>${t('rank')}</span><span>${t('member')}</span><span class="c3">${t('split')}</span><span class="c4" style="text-align:right">${t('d7')}</span><span style="text-align:right">${t('totalH')}</span></div>
      ${members.map((p, i) => { const d = gain7(p); return `<div class="row g${i < 3 ? ' top' : ''}" data-c="${esc(pkey(p))}"><span class="rk">${i + 1}</span><span class="nm">${avatar(p)}<span><b>${full(p)}</b><small>${esc(className(p))} ${p.level}</small></span></span>${tri(p)}<span class="up">${d ? (d > 0 ? '+' : '') + fmt(d) : '—'}</span><span class="tot">${fmt(p.total)}${estTag(p)}</span></div>`; }).join('')}
    </div>`;
}

/* ---------- Nouveautés ---------- */
function renderNews() {
  const box = $('#news-list');
  if (!NEWS) { box.innerHTML = `<div class="empty">${t('loading')}</div>`; return; }
  if (!NEWS.versions?.length) { box.innerHTML = `<div class="empty"><b>${t('newsFailT')}</b>${t('newsFail')}</div>`; return; }
  box.innerHTML = NEWS.versions.map((v, i) => `
    <div class="release${i > 1 ? ' more' : ''}">
      <div class="ver">${esc(v.version)}${i === 0 ? `<small>${t('latest')}</small>` : ''}</div>
      <div>${v.sections.map(s => `${s.title ? `<h4>${esc(s.title.toUpperCase())}</h4>` : ''}<ul>${s.items.map(x => `<li>${x}</li>`).join('')}</ul>`).join('')}
        ${i > 1 ? `<span class="toggle">${t('showMore')}</span>` : ''}</div>
    </div>`).join('') +
    `<p style="margin:18px 0 0;color:var(--faint);font-style:italic">${t('fullHistory')} <a href="https://github.com/Raykuilu/Dropamine/blob/main/CHANGELOG.md" rel="noopener">GitHub</a>.</p>`;
}
document.addEventListener('click', e => { const x = e.target.closest('.release.more .toggle'); if (x) { x.closest('.release').classList.remove('more'); x.remove(); } });

/* ---------- Texte fixe traduit (data-t) et pied de page ---------- */
function applyStatic() {
  $$('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  $$('[data-t-ph]').forEach(el => { el.placeholder = t(el.dataset.tPh); el.setAttribute('aria-label', t(el.dataset.tPh)); });
  $('#lang').textContent = LANG === 'fr' ? 'EN' : 'FR';
  $('#lang').title = LANG === 'fr' ? 'English' : 'Français';
  if (DATA.updated) $('#updated').textContent = t('updated', { d: new Date(DATA.updated).toLocaleDateString(locale(), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) });
  const v = NEWS?.versions?.[0]?.version;
  if (v) $$('[data-meta]').forEach(el => {
    const link = el.querySelector('a');   // le lien « café » survit à la mise à jour du numéro de version
    el.textContent = (el.closest('[lang]').lang === 'fr' ? I18N.meta[1] : I18N.meta[0]).replace('{v}', v) + (link ? ' · ' : '');
    if (link) el.append(link);
  });
}

/* ======================================================================
   Connexion Battle.net (api.dropamine.app) : n'apparaît que si le service répond.
   ====================================================================== */
const API = 'https://api.dropamine.app';
Object.assign(I18N, {
  bnTitle: ['Register with Battle.net', 'Inscription avec Battle.net'],
  bnPitch: ['Sign in with Blizzard: your Forever characters are listed, tick the ones to show. We never see your password.',
    'Connecte-toi chez Blizzard : tes personnages Forever s\'affichent, coche ceux à montrer. Nous ne voyons jamais ton mot de passe.'],
  bnLogin: ['Sign in with Battle.net', 'Se connecter avec Battle.net'], bnLogout: ['Sign out', 'Se déconnecter'],
  bnNone: ['No Forever character on this account (level 10+, logged out at least once).', 'Aucun personnage Forever sur ce compte (niveau 10 minimum, déconnecté au moins une fois).'],
  bnListed: ['LISTED', 'INSCRIT'], bnLow: ['level 10 required', 'niveau 10 requis'],
  bnAdd: ['Register selected', 'Inscrire la sélection'], bnRemove: ['Remove selected', 'Retirer la sélection'],
  bnDone: ['Done: {n} character{s} updated. The Hiscores refresh within a few minutes.', 'C\'est fait : {n} personnage{s} mis à jour. Les classements se rafraîchissent d\'ici quelques minutes.'],
  bnError: ['Something went wrong. Try again in a moment.', 'Un problème est survenu. Réessaie dans un instant.'],
  bnAuthError: ['Battle.net sign-in did not complete. Try again.', 'La connexion Battle.net n\'a pas abouti. Réessaie.'],
  bnDown: ['Battle.net sign-in is unavailable right now. Try again later, or use the GitHub form below.',
    'La connexion Battle.net est indisponible pour le moment. Réessaie plus tard, ou utilise le formulaire GitHub ci-dessous.'],
  upTitle: ['Exact score with Dropamine', 'Score exact avec Dropamine'],
  upPitch: ['In game, type /drop hiscores, copy the line (Ctrl+C) and paste it here. Your real weapon skills replace the estimate.',
    'En jeu, tape /drop hiscores, copie la ligne (Ctrl+C) et colle-la ici. Tes vraies compétences d\'armes remplacent l\'estimation.'],
  upSend: ['Send my line', 'Envoyer ma ligne'], upPh: ['DROPAMINE-HS1:…', 'DROPAMINE-HS1:…'],
  upOk: ['Received: {w} weapon skill points ({n} weapons). The Hiscores refresh within a few minutes.',
    'Reçu : {w} points de compétences d\'armes ({n} armes). Les classements se rafraîchissent d\'ici quelques minutes.'],
  upErr: {
    format: ['This is not a Dropamine line. Copy the whole first line of the /drop hiscores window.', 'Ce n\'est pas une ligne Dropamine. Copie toute la première ligne de la fenêtre /drop hiscores.'],
    checksum: ['This line was cut or modified. Copy it again from the game.', 'Cette ligne est tronquée ou modifiée. Recopie-la depuis le jeu.'],
    values: ['These values are not possible for this level.', 'Ces valeurs sont impossibles pour ce niveau.'],
    'not-yours': ['This character is not on your Battle.net account (same region and first name).', 'Ce personnage n\'est pas sur ton compte Battle.net (même région et même prénom).'],
    level: ['Level 10 is required.', 'Le niveau 10 est requis.'],
  },
});
const Bnet = (() => {
  let alive = null, me = null, msg = '', upMsg = '';
  const box = () => $('#bnet');
  const call = (path, body) => fetch(API + path, body ? { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'include' });
  async function probe() {
    if (alive !== null) return alive;
    try { alive = (await fetch(API + '/health', { cache: 'no-store' })).ok; } catch { alive = false; }
    return alive;
  }
  async function load() {
    try { const r = await call('/me'); me = r.ok ? await r.json() : null; } catch { me = null; }
  }
  function draw() {
    const b = box(); b.hidden = false;
    if (!alive) { b.innerHTML = `<div class="head"><h2>${t('bnTitle')}</h2></div><p class="lead">${t('bnDown')}</p>`; return; }
    if (!me) {
      b.innerHTML = `<div class="head"><h2>${t('bnTitle')}</h2></div><p class="lead">${t('bnPitch')}</p>
        <a class="btn bnet-btn" href="${API}/auth/login">${t('bnLogin')}</a>${msg ? `<p class="msg">${msg}</p>` : ''}`;
      return;
    }
    const chars = me.characters || [];
    b.innerHTML = `<div class="who-bn"><b>${esc(me.battletag || 'Battle.net')}</b><a data-bn="logout">${t('bnLogout')}</a></div>
      ${chars.length ? `<div class="list">${chars.map(c => `<label class="${c.level < 10 ? 'off' : ''}${c.registered ? ' on' : ''}"><input type="checkbox" value="${esc(c.key)}" ${c.level < 10 ? 'disabled' : ''} ${c.registered ? 'checked' : ''}>
        <span><b>${esc(c.name || c.slug)} ${esc(c.surname || '')}</b><small>${esc(c.region.toUpperCase())} · ${esc(L2(CLASS[c.classId]) || '')} ${c.level}${c.level < 10 ? ' · ' + t('bnLow') : ''}</small></span>
        ${c.registered ? `<span class="tagged">${t('bnListed')}</span>` : ''}</label>`).join('')}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn gold" data-bn="claim">${t('bnAdd')}</button><button class="btn ghost" data-bn="release">${t('bnRemove')}</button></div>`
        : `<p class="msg">${t('bnNone')}</p>`}
      ${msg ? `<p class="msg">${msg}</p>` : ''}
      ${chars.length ? `<div class="paste"><h3>${t('upTitle')}</h3><p>${esc(t('upPitch')).replace('/drop hiscores', '<code>/drop hiscores</code>')}</p>
        <textarea id="hsline" spellcheck="false" placeholder="${t('upPh')}"></textarea>
        <button class="btn gold" data-bn="upload">${t('upSend')}</button>${upMsg ? `<p class="msg">${upMsg}</p>` : ''}</div>` : ''}`;
  }
  async function show() {
    if (!(await probe())) { draw(); return; }
    const q = new URLSearchParams(location.search);
    if (q.get('bnet') === 'error') msg = t('bnAuthError');
    await load(); draw();
  }
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-bn]'); if (!el) return;
    e.preventDefault(); const act = el.dataset.bn;
    if (act === 'logout') { await call('/logout', {}).catch(() => {}); me = null; msg = ''; upMsg = ''; draw(); return; }
    if (act === 'upload') {
      const line = $('#hsline')?.value.trim(); if (!line) return;
      el.setAttribute('disabled', '');
      try {
        const r = await call('/upload', { line }), j = await r.json();
        upMsg = r.ok ? t('upOk', { w: fmt(j.weapons), n: j.count }) : L2(I18N.upErr[j.error] || I18N.bnError);
        if (r.ok) Ribbon.swell(.8);
      } catch { upMsg = t('bnError'); }
      await load(); draw(); return;
    }
    const checked = $$('#bnet input:checked').map(i => i.value), all = $$('#bnet input').map(i => i.value);
    const keys = act === 'claim' ? checked : all.filter(k => !checked.includes(k) && me.characters.find(c => c.key === k)?.registered);
    if (!keys.length) return;
    $$('#bnet [data-bn]').forEach(x => x.setAttribute('disabled', ''));
    try {
      const r = await call('/' + act, { keys });
      const j = await r.json();
      msg = r.ok ? t('bnDone', { n: (j.done || []).length }) : t('bnError');
      Ribbon.swell(.8);
    } catch { msg = t('bnError'); }
    await load(); draw();
  });
  return { show };
})();

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
    (function step(now) { const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3);
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
  state.view = VIEWS.includes(v) ? v : (q.get('bnet') ? 'join' : q.get('c') ? 'char' : q.get('g') ? 'guild' : 'home');
  state.region = ['eu', 'us', 'tw'].includes(q.get('r')) ? q.get('r') : 'eu';
  state.skill = q.get('s') || 'total'; state.cls = +q.get('cl') || 0; state.rs = +q.get('m') || 0;
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
  history[push ? 'pushState' : 'replaceState'](null, '', q.toString() ? '?' + q : location.pathname);
}
const RENDER = { rank: renderRank, char: renderChar, guild: renderGuild, news: renderNews, join: () => Bnet.show() };
const TITLES = { rank: 'tab.rank', char: 'tab.char', guild: 'tab.guild', news: 'tab.news', get: 'btn.download', join: 'foot.join', privacy: 'foot.privacy' };
function render(push) {
  applyStatic();
  renderHome();
  (RENDER[state.view] || (() => {}))();
  tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.view === state.view));
  $$('.view').forEach(v => v.classList.toggle('on', v.id === state.view));
  $('#sub').textContent = `HISCORES · FOREVER ${state.region.toUpperCase()}`;
  $('#region').value = state.region;
  document.title = state.view === 'home' ? t('title') : `${t(TITLES[state.view])} · Dropamine`;
  animate($('#' + state.view));
  writeUrl(push);
}
function go(patch) {
  const changedView = patch.view && patch.view !== state.view;
  Object.assign(state, patch); render(true);
  Ribbon.swell(changedView ? 1 : .45);
  if (changedView) scrollTo({ top: Math.min(scrollY, $('.nav').offsetTop), behavior: reduce ? 'auto' : 'smooth' });
}
function setLang(l) {
  LANG = l; document.documentElement.lang = l; document.documentElement.dataset.lang = l;
  try { localStorage.setItem('lang', l); } catch (e) { /* stockage indisponible : le choix vaut pour cette visite */ }
  render(false); Ribbon.swell(.6);
}
tabs.forEach(b => b.addEventListener('click', () => go({ view: b.dataset.view })));
$('#region').addEventListener('change', e => go({ region: e.target.value, cls: 0, g: '' }));
$('#lang').addEventListener('click', () => setLang(LANG === 'fr' ? 'en' : 'fr'));
document.addEventListener('click', e => {
  if (e.button || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const el = e.target.closest('[data-view-link],[data-skill],[data-cls],[data-rs],[data-c],[data-g]');
  if (!el || el.closest('.suggest')) return;
  e.preventDefault();
  const d = el.dataset;
  if (d.viewLink) go({ view: d.viewLink });
  else if (d.skill) go({ skill: d.skill });
  else if (d.cls !== undefined) go({ cls: +d.cls });
  else if (d.rs !== undefined) go({ rs: +d.rs, cls: 0 });
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
      : `<div class="none">${t('noSearch')}</div>`;
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
]).then(() => { Ribbon.load(false); return document.fonts.ready; })
  .then(() => { render(false); Ribbon.swell(.7); });
