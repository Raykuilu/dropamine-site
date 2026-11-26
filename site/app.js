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
  'tab.rank': ['Hiscores', 'Classements'], 'tab.char': ['Character', 'Personnage'], 'tab.mine': ['My character', 'Mon personnage'], 'acct.in': ['Sign in', 'Se connecter'], 'acct.out': ['Sign out', 'Se déconnecter'],
  myChars: ['My characters', 'Mes personnages'],
  youHere: ['YOU', 'TOI'],
  pulseDl: ['{n} downloads', '{n} téléchargements'], pulseChars: ['{n} characters tracked', '{n} personnages suivis'], pulseGuilds: ['{n} guild{s}', '{n} guilde{s}'],
  pulseToday: ['updated today at {h}', "mis à jour aujourd'hui à {h}"], pulseOn: ['updated {d}', 'mis à jour le {d}'],
  tipSpare: ['Not in the total: as in the addon, only the weapon in hand and your class’s second skill count', "Hors total : comme dans l'addon, seules l'arme en main et la 2e compétence de ta classe comptent"],
  moreW: ['+ {n} other weapon skill{s}', '+ {n} autre{s} compétence{s} d’arme'], lessW: ['Only weapons in use', 'Seulement les armes utilisées'],
  viewT: ['Display', 'Affichage'], viewList: ['List', 'Liste'], viewGrid: ['Grid, as in the addon', "Grille, comme dans l'addon"],
  share: ['Share', 'Partager'], close: ['Close', 'Fermer'],
  hsBtn: ['Hiscores image', 'Image Hiscores'], hsDl: ['Download PNG', 'Télécharger PNG'], hsCopy: ['Copy image', "Copier l'image"], hsCopied: ['Copied', 'Copiée'], hsNoCopy: ['Copy not allowed here', 'Copie impossible ici'],
  hsSkill: ['Skill', 'Compétence'], hsRank: ['Rank', 'Rang'], hsLevel: ['Level', 'Niveau'], hsWeek: ['7 days', '7 jours'], copied: ['Link copied', 'Lien copié'],
  gainsT: ['TODAY’S +1', 'LES +1 DU JOUR'], gainsNone: ['', ''],
  splitT: ['Split', 'Répartition'], bestByProf: ['Best by profession', 'Meilleurs par métier'], sinceY: ['since yesterday', 'depuis hier'],
  estSep: ['ESTIMATED · NOT RANKED UNTIL THE DROPAMINE LINE IS SENT', 'ESTIMÉS · SANS RANG JUSQU’À L’ENVOI DE LA LIGNE DROPAMINE'],
  skillsT: ['Skills', 'Compétences'], statsT: ['Armory statistics', "Statistiques de l'armurerie"],
  tilesEst: ['hatched tiles: weapons estimated, waiting for the Dropamine line', "tuiles hachurées : armes estimées, en attente de la ligne Dropamine"],
  tipRank: ['Rank {r} / {m}', 'Rang {r} / {m}'], tipPlace: ['{r} in the Hiscores', '{r} au classement'],
  tipEst: ['Estimated: equipped weapon counted at its maximum', 'Estimé : arme équipée comptée au maximum'], 'tab.guild': ['Guilds', 'Guildes'],
  'tab.news': ["What's new", 'Nouveautés'], 'btn.download': ['Download', 'Télécharger'], 'search.ph': ['Find a character…', 'Chercher un personnage…'],
  'foot.addon': ['THE ADDON', "L'ADDON"], 'foot.join': ['Join or leave', "S'inscrire ou se retirer"], 'foot.privacy': ['Privacy', 'Confidentialité'], 'foot.code': ['Site source (open source, MIT)', 'Code du site (open source, MIT)'], 'foot.coffee': ['Buy me a coffee', "M'offrir un café"],
  total: ['Total level', 'Niveau total'], level: ['Level', 'Niveau'], defense: ['Defense', 'Défense'],
  'g.lvl': ['LEVEL', 'NIVEAU'], 'g.wpn': ['WEAPONS & DEFENSE', 'ARMES ET DÉFENSE'], 'g.prf': ['PROFESSIONS', 'MÉTIERS'], 'g.stat': ['STATISTICS', 'STATISTIQUES'], 'g.book': ['DROPAMINE LOGBOOK', 'CARNET DROPAMINE'],
  trust: ['Sent by the players with their Dropamine line: based on trust.', 'Envoyé par les joueurs avec leur ligne Dropamine : basé sur la confiance.'],
  sortBy: ['Rank by', 'Classer par'], trustShort: ['based on trust', 'basé sur la confiance'],
  kills: ['Creatures killed', 'Créatures tuées'], killingBlows: ['Killing blows', 'Coups fatals'], dungeons: ['Dungeons entered', 'Donjons visités'],
  pvpDeaths: ['Killed by players', 'Tué par des joueurs'], duels: ['Duels (won / lost)', 'Duels (gagnés / perdus)'],
  repsT: ['Reputations', 'Réputations'], armorySrc: ['from the armory', "d'après l'armurerie"], repsN: ['{n} factions', '{n} factions'], quests: ['Quests', 'Quêtes'], flights: ['Flights taken', 'Trajets aériens'], deaths: ['Deaths', 'Morts'],
  played: ['Played', 'Temps de jeu'],
  dbTitle: ['Dropamine logbook', 'Carnet Dropamine'], dbWhen: ['sent by the player on {d}', 'envoyé par le joueur le {d}'],
  dbLog: ['Collection log', 'Collection log'], dbAch: ['Dropamine achievements', 'Succès Dropamine'], dbRec: ['Records', 'Records'],
  dbHunt: ['Hunt', 'Chasse'], dbPvp: ['PvP', 'JcJ'], hk: ['Honorable kills', 'Victoires honorables'],
  recSession: ['Best session', 'Meilleure session'], recHour: ['Best hour', 'Meilleure heure'], recDay: ['Best day', 'Meilleur jour'],
  recCombo: ['Longest combo', 'Plus long combo'], recSessions: ['Sessions', 'Sessions'], recGoals: ['Goals reached', 'Objectifs atteints'],
  recTime: ['Time tracked', 'Temps suivi'], huTries: ['{n} tries', '{n} essais'], huFound: ['found', 'trouvé'],
  pvHkWeek: ['HK this week', 'VH cette semaine'], pvHonorWeek: ['Honor this week', 'Honneur cette semaine'], pvHonor: ['Honor points', "Points d'honneur"],
  pvDk: ['Dishonorable kills', 'Victoires déshonorantes'], pvHighest: ['Highest rank', 'Rang le plus haut'], playedN: ['{t} played', '{t} de jeu'], playedTip: ['/played, sent by the player with their Dropamine line', '/played, envoyé par le joueur avec sa ligne Dropamine'],
  rank: ['RANK', 'RANG'], character: ['CHARACTER', 'PERSONNAGE'], split: ['BREAKDOWN', 'RÉPARTITION'], value: ['VALUE', 'VALEUR'], totalH: ['TOTAL', 'TOTAL'],
  member: ['MEMBER', 'MEMBRE'], guildH: ['GUILD', 'GUILDE'], members: ['MEMBERS', 'INSCRITS'], d7: ['7 D', '7 J'],
  est: ['estimated', 'estimé'], preview: ['preview', 'aperçu'],
  sealPreview: ['GUILD PREVIEW · NOT REGISTERED', 'APERÇU DE GUILDE · NON INSCRIT'],
  previewNote: ['Shown because their guild is followed. Is it you? <a href="?p=join" data-view-link="join">Sign in</a> to register for an exact score, or to hide it.',
    "Affiché parce que sa guilde est suivie. C'est toi ? <a href=\"?p=join\" data-view-link=\"join\">Connecte-toi</a> pour t'inscrire avec un score exact, ou pour le masquer."], allModes: ['All modes', 'Tous les modes'], allClasses: ['All classes', 'Toutes les classes'],
  registered: ['{n} registered', '{n} inscrit{s}'], previewN: ['{n} in preview', '{n} en aperçu'],
  legend: ['Weapons estimated, waiting for the Dropamine file', 'Armes estimées, en attente du fichier Dropamine'], weaponsDef: ['Weapons & Defense', 'Armes et Défense'], professions: ['Professions', 'Métiers'],
  failedT: ['Data unavailable', 'Données indisponibles'], failed: ["The Hiscores couldn't be loaded. Try again in a moment.", "Le classement n'a pas pu être chargé. Réessaie dans un instant."],
  nobodyT: ['Nobody yet', "Personne pour l'instant"], nobody: ['No character in this region yet.', 'Aucun personnage dans cette région pour le moment.'], registerYours: ['Register yours', 'Inscris le tien'],
  noCharT: ['No character', 'Aucun personnage'], noChar: ['Search for a character, pick one in the Hiscores, or <a href="?p=join" data-view-link="join">sign in</a> to see yours.', 'Cherche un personnage, choisis-en un dans le classement, ou <a href="?p=join" data-view-link="join">connecte-toi</a> pour voir le tien.'],
  noSearch: ['No character matches.', 'Aucun personnage ne correspond.'],
  chartSoon: ['The chart will appear after a few days of tracking.', 'La courbe apparaîtra après quelques jours de suivi.'],
  levelN: ['level {n}', 'niveau {n}'], of60: ['out of 60', 'sur 60'], profCount: ['{n} profession{s}', '{n} métier{s}'], noProf: ['No profession learned.', 'Aucun métier appris.'],
  progress: ['Progress', 'Progression'], defW: ['Defense {d} · weapons {w}', 'Défense {d} · armes {w}'], estP: [' (estimated)', ' (estimées)'],
  sealOk: ['VERIFIED · ARMORY + DROPAMINE FILE', 'VÉRIFIÉ · ARMURERIE + FICHIER DROPAMINE'], sealEst: ['ARMORY · WEAPONS ESTIMATED', 'ARMURERIE · ARMES ESTIMÉES'],
  totalLevel: ['TOTAL LEVEL', 'NIVEAU TOTAL'],
  ctaEst: ["<b>Estimated score.</b> Weapon skills are not in the armory, so each equipped weapon is counted at its maximum. Is it you? In game, type <code>/drop hiscores</code> and paste the line on the <a href=\"?p=join\" data-view-link=\"join\">Join page</a>: your real weapon skills replace the estimate.",
    "<b>Score estimé.</b> Les compétences d'armes ne sont pas dans l'armurerie : elles sont comptées au maximum pour chaque arme équipée. C'est toi ? En jeu, tape <code>/drop hiscores</code> et colle la ligne sur la <a href=\"?p=join\" data-view-link=\"join\">page Inscription</a> : tes vraies compétences d'armes remplacent l'estimation."],
  guildsT: ['Guilds', 'Guildes'], guildsNote: ["ranked by their members' total · Forever {r}", 'classées par le total de leurs membres · Forever {r}'],
  noGuildT: ['No guild', 'Aucune guilde'], noGuild: ['Guilds appear as soon as one of their members is listed.', "Les guildes apparaissent dès qu'un de leurs membres est affiché."],
  allGuilds: ['← All guilds', '← Toutes les guildes'], membersN: ['{n} member{s}', '{n} membre{s}'],
  guildTotal: ['GUILD TOTAL · {r} GUILD', 'TOTAL DE LA GUILDE · {r} GUILDE'],
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
const STAT_KEYS = ['hk', 'killingBlows', 'kills', 'quests', 'dungeons', 'flights'];
const armoryStat = (p, k) => k === 'hk' ? (p.stats?.hk ?? p.pvpArmory?.hk ?? null) : (p.stats?.[k] ?? null);
// Même référentiel que l'addon (Catalog.lua de Dropamine) : noms, icônes et ordre des armes
const WPN = { axes: ['One-Handed Axes', 'Haches', 'inv_axe_01'], axes2h: ['Two-Handed Axes', 'Haches à deux mains', 'inv_axe_09'],
  maces: ['One-Handed Maces', 'Masses', 'inv_mace_01'], maces2h: ['Two-Handed Maces', 'Masses à deux mains', 'inv_mace_04'],
  swords: ['One-Handed Swords', 'Épées', 'inv_sword_04'], swords2h: ['Two-Handed Swords', 'Épées à deux mains', 'inv_sword_10'],
  polearms: ['Polearms', "Armes d'hast", 'inv_spear_06'], staves: ['Staves', 'Bâtons', 'inv_staff_08'],
  fist: ['Fist Weapons', 'Armes de pugilat', 'inv_gauntlets_04'], daggers: ['Daggers', 'Dagues', 'inv_weapon_shortblade_05'],
  unarmed: ['Unarmed', 'Mains nues', 'inv_gauntlets_04'], feral: ['Feral Combat', 'Combat farouche', 'ability_druid_catform'],
  bows: ['Bows', 'Arcs', 'inv_weapon_bow_02'], guns: ['Guns', 'Armes à feu', 'inv_weapon_rifle_01'],
  crossbows: ['Crossbows', 'Arbalètes', 'inv_weapon_crossbow_01'], thrown: ['Thrown', 'Armes de jet', 'inv_throwingknife_02'],
  wands: ['Wands', 'Baguettes', 'inv_wand_01'] };
const WPN_ORDER = Object.keys(WPN);
const PROF_ICON = { 171: 'trade_alchemy', 164: 'trade_blacksmithing', 333: 'trade_engraving', 202: 'trade_engineering', 182: 'trade_herbalism',
  165: 'trade_leatherworking', 186: 'trade_mining', 393: 'inv_misc_pelt_wolf_01', 197: 'trade_tailoring', 185: 'inv_misc_food_15',
  356: 'trade_fishing', 129: 'spell_holy_sealofsacrifice' };
const DEF_ICON = 'inv_shield_06';
const icon = name => `https://render.worldofwarcraft.com/eu/icons/56/${name}.jpg`;   // icônes du jeu, servies par Blizzard
const wpnOf = (p, id) => p.weaponList?.find(w => w.id === id);
const SKILLS = [
  { id: 'total', group: null, label: () => t('total'), max: '2 460', get: p => p.total },
  { id: 'level', group: 'lvl', label: () => t('level'), max: '60', get: p => p.level, logo: true },
  ...WPN_ORDER.map(id => ({ id: 'w' + id, group: 'wpn', label: () => L2(WPN[id]), max: '300', wpn: id, icon: WPN[id][2],
    get: p => wpnOf(p, id)?.rank || null, est: p => !!wpnOf(p, id)?.est })),
  { id: 'defense', group: 'wpn', label: () => t('defense'), max: '300', get: p => p.defense || null, icon: DEF_ICON },
  ...PROF_ORDER.map(id => ({ id: 'p' + id, group: 'prf', label: () => profName(id), max: '300', prof: id, icon: PROF_ICON[id],
    get: p => p.professions?.find(x => x.id === id)?.skill ?? null })),
  ...STAT_KEYS.map(k => ({ id: k, group: 'stat', label: () => t(k), max: '', get: p => armoryStat(p, k) })),
  // carnet Dropamine : déclaré par le joueur avec sa ligne /drop hiscores (sur la confiance), sauf les VH (armurerie)
  { id: 'clog', group: 'book', label: () => t('dbLog'), max: '', icon: 'inv_box_02', get: p => p.dropamine?.collection?.x ?? null,
    show: (v, p) => `${fmt(v)}<small> / ${fmt(p.dropamine.collection.y)}</small>`, ratio: (v, p) => v / p.dropamine.collection.y },
  { id: 'ach', group: 'book', label: () => t('dbAch'), max: '', logo: true, get: p => p.dropamine?.achievements?.n ?? null,
    show: (v, p) => `${v}<small> / ${p.dropamine.achievements.total}</small>`, ratio: (v, p) => v / p.dropamine.achievements.total },
  { id: 'played', group: 'book', label: () => t('played'), max: '', icon: 'inv_misc_pocketwatch_01', get: p => p.played ?? null, show: v => playedText(v) },
  { id: 'rsession', group: 'book', label: () => t('recSession'), max: '', icon: 'inv_misc_note_01', get: p => p.dropamine?.records?.bestSession ?? null },
  { id: 'rday', group: 'book', label: () => t('recDay'), max: '', icon: 'inv_misc_note_01', get: p => p.dropamine?.records?.bestDay ?? null },
  { id: 'rhour', group: 'book', label: () => t('recHour'), max: '', icon: 'inv_misc_note_01', get: p => p.dropamine?.records?.bestHour ?? null },
  { id: 'rcombo', group: 'book', label: () => t('recCombo'), max: '', icon: 'inv_misc_note_01', get: p => p.dropamine?.records?.longestCombo ?? null, show: v => 'x' + v },
];
const showVal = (sk, v, p) => sk.show ? sk.show(v, p) : fmt(v);
const GROUP_COLOR = { lvl: 'var(--lvl)', wpn: 'var(--wpn)', prf: 'var(--prf)', stat: 'var(--rim)', book: 'var(--gold)' };
const VIEWS = ['home', 'rank', 'char', 'guild', 'news', 'get', 'join', 'privacy'];

let DATA = { players: [] }, NEWS = null;
const state = { view: 'home', region: 'eu', skill: 'total', cls: 0, rs: 0, c: '', g: '', gs: 'total' };
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
  // Au repos, un ruban fin qui ondule doucement. À chaque navigation, une houle (bosse gaussienne)
  // traverse le ruban de gauche à droite, une seule fois.
  const SURGE_W = 170, SURGE_SPEED = 1100;
  let surges = [], loading = false, time = 0, last = performance.now(), running = false;
  const lift = x => {
    let e = loading ? .3 + .1 * Math.sin(time * 5) : 0;
    for (const s of surges) e += s.amp * Math.exp(-(((x - s.x) / SURGE_W) ** 2));
    return Math.min(1, e);
  };
  function draw() {
    const curve = (k, b) => x => {
      const e = lift(x), th = 2.6 + 9 * e;
      return k * th + th * (.22 + .28 * e) * Math.sin(2 * Math.PI * x / b.per + b.ph + (b.run || 0)) * (k / 3 + .4);
    };
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
    time += dt;
    for (const s of surges) { s.x += dt * SURGE_SPEED; s.amp *= Math.pow(.6, dt); }
    surges = surges.filter(s => s.x < W + 2.5 * SURGE_W);
    bands.forEach(b => { b.run = ((b.run || 0) + dt * b.speed) % (2 * Math.PI); });   // ondulation de fond, vitesse constante
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
    swell(power = 1) {
      if (reduce) return;
      if (surges.some(s => s.x < 2 * SURGE_W)) return;          // une houle vient de partir : pas de doublon
      surges.push({ x: -2 * SURGE_W, amp: Math.min(1, power) }); bubbles(Math.round(5 * power)); start();
    },
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
// classement : seules les vraies valeurs ont un rang (une arme estimée ne passe jamais devant une arme réelle)
function rankBy(skill, list) {
  return list.map(p => ({ p, v: skill.get(p) })).filter(x => x.v != null && x.v > 0 && !(skill.est && skill.est(x.p)))
    .sort((a, b) => b.v - a.v || pkey(a.p).localeCompare(pkey(b.p))).map((x, i) => ({ ...x, r: i + 1 }));
}
const failed = () => `<div class="empty"><b>${t('failedT')}</b>${t('failed')}</div>`;
const nobody = () => `<div class="empty"><b>${t('nobodyT')}</b>${t('nobody')} <a href="?p=join" data-view-link="join">${t('registerYours')}</a>.</div>`;
// gain depuis la veille (deux derniers points de l'historique, à un jour d'écart)
const dayGain = p => { const h = p.history || []; if (h.length < 2) return 0; const a = h[h.length - 2], b = h[h.length - 1];
  return new Date(b.d) - new Date(a.d) <= 1.5 * 864e5 ? b.t - a.t : 0; };
const plus = p => { const d = dayGain(p); return d > 0 ? `<span class="plus" title="${t('sinceY')}">+${fmt(d)}</span>` : ''; };
const estTag = p => p.preview ? `<em class="pv">${t('preview')}</em>` : p.complete ? '' : `<em>${t('est')}</em>`;

/* ---------- Accueil : le pont vers les classements ---------- */
// téléchargements CurseForge, mis à jour à la main (chiffre donné par l'auteur)
const CF_DOWNLOADS = 529;
function renderHome() {
  // les chiffres qui montrent que le projet vit (toutes régions)
  if (DATA.players.length) {
    const gs = new Set(DATA.players.filter(p => p.guild).map(p => (p.region || 'eu') + '/' + p.guild.slug));
    const up = DATA.updated ? new Date(DATA.updated) : null;
    const when = up ? (up.toDateString() === new Date().toDateString()
      ? t('pulseToday', { h: up.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }) })
      : t('pulseOn', { d: up.toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) })) : '';
    $$('[data-pulse]').forEach(el => { el.innerHTML = `<i class="live"></i>${t('pulseDl', { n: fmt(CF_DOWNLOADS) })} · ${t('pulseChars', { n: fmt(DATA.players.length) })} · ${t('pulseGuilds', { n: gs.size })}${when ? ' · ' + when : ''}`; });
  }
  const all = rankBy(SKILLS[0], inRegion()), top = all.slice(0, 5);
  // les +1 du jour : les plus gros gains depuis la veille, en petits toasts façon addon
  const gains = inRegion().map(p => ({ p, d: dayGain(p) })).filter(x => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 6);
  const gainsHtml = gains.length ? `<div class="gains"><p class="kicker">${t('gainsT')}</p><div class="gl">${gains.map(({ p, d }) =>
    `<a class="gt" href="?p=char&c=${esc(encodeURIComponent(pkey(p)))}" data-c="${esc(pkey(p))}">${avatar(p)}<span><b>${full(p)}</b><small>${esc(className(p))} ${p.level}</small></span><i>+${fmt(d)}</i></a>`).join('')}</div></div>` : '';
  const line = ({ p, v, r }, cls = '') => `<div class="row${r <= 3 ? ' top' : ''}${cls}" data-c="${esc(pkey(p))}" style="grid-template-columns:44px minmax(0,1fr) minmax(90px,160px) 96px"><span class="rk">${r}</span><span class="nm">${avatar(p)}<span><b>${full(p)}</b>${plus(p)}<small>${who(p)}</small></span></span>${tri(p)}<span class="tot">${fmt(v)}${estTag(p)}</span></div>`;
  // connecté : ton meilleur personnage, sous le top 5 s'il n'y figure pas
  const me = all.find(x => pkey(x.p) === Bnet.best());
  const you = me && !top.includes(me) ? `<div class="you-sep">${t('youHere')}</div>${line(me, ' you')}` : '';
  $('#home-top').innerHTML = DATA.failed ? failed() : top.length
    ? gainsHtml + top.map(x => line(x, pkey(x.p) === Bnet.best() ? ' you' : '')).join('') + you
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
  // comme la grille de l'addon : chaque compétence avec son icône ; une arme n'apparaît que si quelqu'un la pratique
  SKILLS.filter(s => !(s.wpn || s.group === 'book') || s.id === sk.id || region.some(p => s.get(p))).forEach(s => {
    if (s.group !== grp) { grp = s.group; if (grp) nav += `<div class="grp"><i class="dot" style="background:${GROUP_COLOR[grp]}"></i>${t('g.' + grp)}</div>`; }
    const ic = s.logo || s.id === 'total' ? '<i class="sic logo"></i>' : s.icon ? `<img class="sic" src="${icon(s.icon)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<i class="sic none"></i>';
    nav += `<a href="?p=rank&s=${s.id}" data-skill="${s.id}" class="${s.id === sk.id ? 'on' : ''}">${ic}<span class="lb">${s.label()}</span> <span>${s.max}</span></a>`;
  });
  const count = id => region.filter(p => p.rulesetId === id).length;
  const rsChips = `<span class="chip ${state.rs ? '' : 'on'}" data-rs="0">${t('allModes')}<span class="n">${region.length}</span></span>` +
    RULESETS.map(([id, names]) => `<span class="chip ${state.rs === id ? 'on' : ''}" data-rs="${id}">${L2(names)}<span class="n">${count(id)}</span></span>`).join('');
  const clsChips = `<span class="chip ${state.cls ? '' : 'on'}" data-cls="0">${t('allClasses')}</span>` +
    classes.map(c => `<span class="chip ${state.cls === c ? 'on' : ''}" data-cls="${c}">${esc(L2(CLASS[c]))}</span>`).join('');
  const isTotal = sk.id === 'total';
  // armes estimées : affichées sous le classement, sans rang
  const pool = state.cls ? byRs.filter(p => p.classId === state.cls) : byRs;
  const estRows = sk.wpn ? pool.filter(p => sk.est(p) && sk.get(p)).sort((a, b) => sk.get(b) - sk.get(a)).map(p => ({ p, v: sk.get(p), r: 0 })) : [];
  const row = ({ p, v, r }) => `
    <div class="row${r && r <= 3 ? ' top' : ''}${r ? '' : ' unranked'}" data-c="${esc(pkey(p))}" role="row">
      <span class="rk">${r || '–'}</span>
      <span class="nm">${avatar(p)}<span><b>${full(p)}</b>${plus(p)}<small>${who(p)}${rulesetName(p) ? ' · ' + esc(rulesetName(p)) : ''}</small></span></span>
      ${isTotal ? tri(p) : sk.prof ? `<span class="mbar"><i style="--w:${(100 * v / (p.professions.find(x => x.id === sk.prof)?.max || 300)).toFixed(1)}%"></i></span>`
        : sk.wpn ? `<span class="mbar w${sk.est(p) ? ' est' : ''}"><i style="--w:${(100 * v / (5 * p.level)).toFixed(1)}%"></i></span>`
        : sk.ratio ? `<span class="mbar b"><i style="--w:${(100 * Math.min(1, sk.ratio(v, p))).toFixed(1)}%"></i></span>` : '<span class="c3"></span>'}
      <span class="tot">${showVal(sk, v, p)}${isTotal ? estTag(p) : sk.wpn && sk.est(p) ? `<em>${t('est')}</em>` : ''}</span>
    </div>`;
  const rows = (list.length || estRows.length)
    ? list.map(row).join('') + (estRows.length ? `<div class="you-sep est-sep">${t('estSep')}</div>` + estRows.map(row).join('') : '')
    : nobody();
  $('#rank-panel').innerHTML = `
    <div class="head"><h2>${sk.label()}</h2><span class="note">${sk.group === 'book' && !sk.armory ? t('trustShort') + ' · ' : ''}${t('registered', { n: region.filter(p => !p.preview).length })}${region.some(p => p.preview) ? ' · ' + t('previewN', { n: region.filter(p => p.preview).length }) : ''} · Forever ${state.region.toUpperCase()}</span></div>
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
/* Grille de tuiles, comme le panneau de l'addon : icône, rang en bas à droite, « /max » dessous.
   Ordre de l'addon : Niveau, armes, Défense, métiers. Survol = infobulle façon jeu. */
const TIER = [[75, ['Apprentice', 'Apprenti']], [150, ['Journeyman', 'Compagnon']], [225, ['Expert', 'Expert']], [300, ['Artisan', 'Artisan']]];
const tierOf = max => L2((TIER.find(([m]) => max <= m) || TIER[3])[1]);
// Une compétence de la fiche : même données pour la liste et pour la grille
function skillItems(p, peers) {
  const place = sk => rankBy(sk, peers).find(x => x.p === p)?.r;
  const items = [{ key: 'level', ava: p.avatar, name: t('level'), rank: p.level, max: 60, group: 'lvl', r: place(skillById('level')) }];
  const used = new Set(p.equipped || []);
  for (const id of WPN_ORDER) {
    const w = wpnOf(p, id); if (!w) continue;
    items.push({ key: 'w' + id, img: WPN[id][2], name: L2(WPN[id]), rank: w.rank, max: 5 * p.level, group: 'wpn', est: w.est,
      r: w.est ? null : place(skillById('w' + id)), spare: used.size > 0 && !used.has(id) });
  }
  if (p.defense) items.push({ key: 'defense', img: DEF_ICON, name: t('defense'), rank: p.defense, max: 5 * p.level, group: 'wpn', r: place(skillById('defense')) });
  for (const id of PROF_ORDER) {
    const pr = p.professions?.find(x => x.id === id); if (!pr) continue;
    items.push({ key: 'p' + id, img: PROF_ICON[id], name: profName(id, pr.name), rank: pr.skill, max: pr.max || 300, group: 'prf', tier: tierOf(pr.max || 300), r: place(skillById('p' + id)) });
  }
  return items;
}
const tipOf = it => `<b>${esc(it.name)}</b><span>${it.key === 'level' ? `${it.rank} / ${it.max}` : t('tipRank', { r: it.rank, m: it.max })}</span>`
  + (it.tier ? `<span class="tier">${esc(it.tier)}</span>` : '') + (it.r ? `<span class="rk">${t('tipPlace', { r: ord(it.r) })}</span>` : '')
  + (it.est ? `<span class="est">${t('tipEst')}</span>` : '') + (it.spare ? `<span class="est">${t('tipSpare')}</span>` : '');
// l'icône : le portrait du personnage pour le niveau, l'icône du jeu pour le reste
const pic = it => it.key === 'level'
  ? (it.ava ? `<img src="${esc(it.ava)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="logo"></span>')
  : `<img src="${icon(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
const tileOf = it => `<div class="tile g-${it.group}${it.est ? ' est' : ''}${it.spare ? ' spare' : ''}" tabindex="0" data-tip="${esc(tipOf(it))}" aria-label="${esc(it.name)} ${it.rank} / ${it.max}">`
  + pic(it) + `<span class="num"><b>${it.rank}</b><small>/${it.max}</small></span></div>`;
const lineOf = it => `<div class="sline g-${it.group}${it.est ? ' est' : ''}${it.spare ? ' spare' : ''}" tabindex="0" data-tip="${esc(tipOf(it))}">
  <span class="sic2">${pic(it)}</span>
  <span class="snm"><b>${esc(it.name)}</b>${it.tier ? `<small>${esc(it.tier)}</small>` : it.est ? `<small>${t('est')}</small>` : ''}</span>
  <span class="sbar"><i style="--w:${Math.min(100, 100 * it.rank / it.max).toFixed(1)}%"></i></span>
  <span class="sv"><b>${it.rank}</b><small> / ${it.max}</small></span>
  <span class="spl">${it.r ? ord(it.r) : ''}</span></div>`;
let SKVIEW = (() => { try { return localStorage.getItem('skview') === 'grid' ? 'grid' : 'list'; } catch (e) { return 'list'; } })();
let SHOW_SPARE = false;
function skillsBlock(p, peers) {
  const items = skillItems(p, peers), spare = items.filter(i => i.spare);
  const shown = SHOW_SPARE ? items : items.filter(i => !i.spare);
  const body = SKVIEW === 'grid' ? `<div class="tiles">${shown.map(tileOf).join('')}</div>` : `<div class="slist">${shown.map(lineOf).join('')}</div>`;
  const more = spare.length ? `<button class="more" type="button" data-sk="spare">${SHOW_SPARE ? t('lessW') : t('moreW', { n: spare.length })}</button>` : '';
  return `<div class="dpanel">
      <div class="dhead"><h3 class="sub">${t('skillsT')}</h3>
        <div class="vsw" role="group" aria-label="${t('viewT')}">
          <button type="button" data-sk="list" aria-pressed="${SKVIEW === 'list'}" title="${t('viewList')}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><rect x="3" y="4" width="3" height="4" rx=".5"/><rect x="3" y="10" width="3" height="4" rx=".5"/><rect x="3" y="16" width="3" height="4" rx=".5"/></svg></button>
          <button type="button" data-sk="grid" aria-pressed="${SKVIEW === 'grid'}" title="${t('viewGrid')}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></button>
        </div></div>
      ${p.complete ? '' : `<p class="estnote">${t('tilesEst')}</p>`}
      ${body}${more}
      ${dropBar(p)}
    </div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sk]'); if (!b) return;
  const v = b.dataset.sk;
  if (v === 'spare') SHOW_SPARE = !SHOW_SPARE;
  else { SKVIEW = v; try { localStorage.setItem('skview', v); } catch (err) { /* choix gardé pour cette visite */ } }
  Tip.hide(); renderChar(); animate($('#char')); Ribbon.swell(.35);   // animate : remplit à nouveau la barre du total
});
// barre du bas du panneau : la goutte, le niveau total, la barre trois couleurs
const dropBar = p => `<div class="dbar"><span class="logo"></span><span class="dn"><b data-n="${p.total}">${fmt(p.total)}</b><small> / ${fmt(p.max || 2460)}</small></span>${tri(p)}</div>`;

/* Infobulle façon jeu, partagée par toutes les tuiles (survol, focus clavier, toucher) */
const Tip = (() => {
  const el = document.createElement('div'); el.className = 'gtip'; el.setAttribute('role', 'tooltip'); document.body.append(el);
  let cur = null;
  const show = t => {
    cur = t; el.innerHTML = t.dataset.tip; el.classList.add('on');
    const r = t.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    let x = r.right + 10, y = r.top;
    if (x + w > innerWidth - 8) x = r.left - w - 10;
    if (x < 8) { x = Math.max(8, Math.min(innerWidth - w - 8, r.left)); y = r.bottom + 8; }
    if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 8);
    el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
  };
  const hide = () => { cur = null; el.classList.remove('on'); };
  document.addEventListener('mouseover', e => { const t = e.target.closest('[data-tip]'); if (t) show(t); else if (cur) hide(); });
  document.addEventListener('focusin', e => { const t = e.target.closest('[data-tip]'); if (t) show(t); });
  document.addEventListener('focusout', hide);
  document.addEventListener('click', e => { const t = e.target.closest('[data-tip]'); if (t) { cur === t ? hide() : show(t); } else hide(); });
  addEventListener('scroll', hide, { passive: true });
  return { hide };
})();

function renderChar() {
  if (DATA.failed) { $('#char-panel').innerHTML = failed(); return; }
  const p = DATA.players.find(x => pkey(x) === state.c || x.slug === state.c) || DATA.players.find(x => pkey(x) === Bnet.best());
  if (!p) { $('#char-panel').innerHTML = `<div class="empty"><b>${t('noCharT')}</b>${t('noChar')}</div>`; return; }
  state.c = pkey(p);
  const peers = DATA.players.filter(x => (x.region || 'eu') === (p.region || 'eu'));
  const totalRank = rankBy(SKILLS[0], peers).find(x => x.p === p)?.r;
  const hist = p.history || [], gained = hist.length > 1 ? hist[hist.length - 1].t - hist[0].t : 0;
  const nProf = p.professions?.length || 0;
  const st = p.stats || {}, duel = st.duelsWon != null || st.duelsLost != null ? `${fmt(st.duelsWon || 0)} / ${fmt(st.duelsLost || 0)}` : null;
  const stats = [['hk', armoryStat(p, 'hk')], ['killingBlows', st.killingBlows], ['pvpDeaths', st.pvpDeaths], ['duels', duel],
    ['kills', st.kills], ['quests', st.quests], ['dungeons', st.dungeons], ['flights', st.flights], ['deaths', st.deaths]]
    .filter(([, v]) => v != null).map(([k, v]) => `<div>${t(k)}<b>${typeof v === 'number' ? fmt(v) : v}</b></div>`).join('');
  const portrait = p.render
    ? `<div class="portrait"><div class="plinth"></div><div class="plinth2"></div><div class="fig" style="background-image:url('${esc(p.render)}')" role="img" aria-label="${full(p)}"></div></div>`
    : `<div class="vial" role="img" aria-label="Dropamine"></div>`;
  const desc = LANG === 'fr' ? `${esc(className(p))} ${esc(raceName(p))}` : `${esc(raceName(p))} ${esc(className(p))}`;
  const mine = Bnet.mine();
  const picker = mine.length > 1 && mine.includes(p)
    ? `<div class="mine-pick"><span>${t('myChars')}</span>${mine.map(m => `<span class="chip ${m === p ? 'on' : ''}" data-c="${esc(pkey(m))}">${full(m)} <small>${m.level}</small></span>`).join('')}</div>` : '';
  $('#char-panel').innerHTML = `${picker}
    <div class="who${p.render ? ' has-render' : ''}">
      ${portrait}
      <div><h2>${full(p)}</h2><p>${desc} · ${t('levelN', { n: p.level })}${p.guild ? ` · <a href="?p=guild&g=${esc(p.guild.slug)}" data-g="${esc(p.guild.slug)}">${esc(p.guild.name)}</a>` : ''} · ${esc((p.region || 'eu').toUpperCase())}${rulesetName(p) ? ' ' + esc(rulesetName(p)) : ''}</p>
        ${p.preview ? `<span class="seal pv">${t('sealPreview')}</span><p class="pv-note">${t('previewNote')}</p>` : p.complete ? `<span class="seal"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m5 12 5 5 9-10"/></svg>${t('sealOk')}</span>` : `<span class="seal est">${t('sealEst')}</span>`}
        <button class="share" type="button" data-share="${esc(pkey(p))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg><span>${t('share')}</span></button><button class="share hsb" type="button" data-hsimg="${esc(pkey(p))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h6M7 13h10M7 17h8"/></svg><span>${t('hsBtn')}</span></button></div>
      <div class="score">${dayGain(p) > 0 ? `<div class="toast1"><b>+${fmt(dayGain(p))}</b> ${t('sinceY')}</div>` : ''}<div class="n" data-n="${p.total}">${fmt(p.total)}<small> / ${fmt(p.max || 2460)}</small></div><div class="r">${totalRank ? ord(totalRank) + ' · ' : ''}${t('totalLevel')}</div></div>
    </div>
    ${skillsBlock(p, peers)}
    <div class="two">
      <div><h3 class="sub">${t('progress')}${gained ? ` <span>+${fmt(gained)}</span>` : ''}</h3>${chartSvg(hist)}</div>
      <div><h3 class="sub">${t('statsT')}</h3>${stats ? `<div class="ledger">${stats}</div>` : `<div class="empty">—</div>`}</div>
    </div>
    ${repsPanel(p)}
    ${dropBook(p)}
    ${p.complete ? '' : `<div class="cta">${t('ctaEst')}</div>`}`;
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-share]'); if (!b) return;
  const p = DATA.players.find(x => pkey(x) === b.dataset.share); if (!p) return;
  const url = `https://dropamine.app/?p=char&c=${encodeURIComponent(pkey(p))}`;
  const text = `${p.name} ${p.surname} · ${fmt(p.total)} / ${fmt(p.max || 2460)} · Dropamine Hiscores`;
  try {
    if (navigator.share && matchMedia('(pointer:coarse)').matches) { await navigator.share({ title: text, url }); return; }
    await navigator.clipboard.writeText(url);
    const sp = b.querySelector('span'); sp.textContent = t('copied'); b.classList.add('ok');
    setTimeout(() => { sp.textContent = t('share'); b.classList.remove('ok'); }, 1800);
  } catch (err) { /* partage annulé ou presse-papiers refusé : rien à faire */ }
});

/* ---------- Image Hiscores d'un personnage (dessin dans share.js) ---------- */
const SECONDARY_PROFS = [185, 356, 129];
// gain sur 7 jours d'une ligne, d'après l'historique quotidien (null tant qu'il manque un point de comparaison)
function weekGain(p, key) {
  const h = p.history || []; if (h.length < 2) return null;
  const last = h[h.length - 1], cut = new Date(new Date(last.d) - 7 * 864e5).toISOString().slice(0, 10);
  const base = [...h].reverse().find(x => x.d <= cut) || h[0];
  const val = e => key === 't' ? e.t : e.s?.[key];
  return base === last || val(base) == null || val(last) == null ? null : val(last) - val(base);
}
// les lignes de l'image : le total puis les 9 cases comptées par l'addon
// carnet Dropamine sur l'image : seulement ce que le joueur a laissé dans sa ligne (et les VH de l'armurerie)
function hsBook(p) {
  const d = p.dropamine || {}, fr = LANG === 'fr';
  const book = { collection: d.collection, achievements: d.achievements, played: p.played, playedText: p.played ? playedText(p.played) : '',
    records: d.records, hunt: d.hunt, stats: { ...(p.stats || {}), hk: armoryStat(p, 'hk') }, reps: p.reps || [] };
  return { book, BL: fr
    ? { locale: 'fr-FR', li: 1, sessionS: 'Session', dayS: 'Jour', hourS: 'Heure', kb: 'Coups fatals', pvpDeaths: 'Tué par joueurs', duels: 'Duels G / P', dungeons: 'Donjons', reps: 'Réputations', factions: 'factions', title: 'Carnet Dropamine', log: 'Collection log', ach: 'Succès', played: 'Temps de jeu', hk: 'Victoires honorables', week: 'cette sem.',
        rec: 'Records', sessions: 'sessions', session: 'Meilleure session', day: 'Meilleur jour', hour: 'Meilleure heure', combo: 'Plus long combo',
        pvp: 'JcJ', honorWeek: 'Honneur semaine', honor: "Points d'honneur", highest: 'Rang le plus haut', dk: 'Vict. déshonorantes',
        hunt: 'Chasse', found: 'trouvé', tries: 'essais', kills: 'Créatures tuées', quests: 'Quêtes', deaths: 'Morts', flights: 'Trajets aériens', armory: 'Armurerie', inviteT: 'Remplis ton carnet',
        invite1: 'Collection log, records, chasse : tape', invite2: '/drop hiscores en jeu, colle ta ligne sur le site.' }
    : { locale: 'en-US', li: 0, sessionS: 'Session', dayS: 'Day', hourS: 'Hour', kb: 'Killing blows', pvpDeaths: 'Killed by players', duels: 'Duels W / L', dungeons: 'Dungeons', reps: 'Reputations', factions: 'factions', title: 'Dropamine logbook', log: 'Collection log', ach: 'Achievements', played: 'Played', hk: 'Honorable kills', week: 'this week',
        rec: 'Records', sessions: 'sessions', session: 'Best session', day: 'Best day', hour: 'Best hour', combo: 'Longest combo',
        pvp: 'PvP', honorWeek: 'Honor this week', honor: 'Honor points', highest: 'Highest rank', dk: 'Dishonorable kills',
        hunt: 'Hunt', found: 'found', tries: 'tries', kills: 'Creatures killed', quests: 'Quests', deaths: 'Deaths', flights: 'Flights taken', armory: 'Armory', inviteT: 'Fill your logbook',
        invite1: 'Collection log, records, hunt: type', invite2: '/drop hiscores in game, paste your line on the site.' } };
}
function hsRows(p) {
  const peers = DATA.players.filter(x => (x.region || 'eu') === (p.region || 'eu'));
  const rank = id => rankBy(skillById(id), peers).find(x => x.p === p)?.r || null;
  const row = (name, img, v, max, group, id, hkey) => ({ name, img, v, max, group, rank: rank(id), week: weekGain(p, hkey), vText: fmt(v), maxText: fmt(max) });
  const rows = [{ ...row(t('total'), null, p.total, p.max || 2460, 'lvl', 'total', 't'), total: true, parts: p.parts }];
  rows.push(row(t('level'), p.avatar, p.level, 60, 'lvl', 'level', 'l'));
  const prim = (p.professions || []).filter(x => !SECONDARY_PROFS.includes(x.id)).sort((a, b) => b.skill - a.skill).slice(0, 2);
  for (const x of [...prim, ...SECONDARY_PROFS.map(id => p.professions?.find(y => y.id === id)).filter(Boolean)])
    rows.push(row(profName(x.id, x.name), icon(PROF_ICON[x.id] || 'inv_misc_note_01'), x.skill, x.max || 300, 'prf', 'p' + x.id, 'p' + x.id));
  for (const id of p.equipped || []) { const w = wpnOf(p, id); if (w && WPN[id]) rows.push(row(L2(WPN[id]) + (w.est ? ` (${t('est')})` : ''), icon(WPN[id][2]), w.rank, 5 * p.level, 'wpn', 'w' + id, 'w' + id)); }
  if (p.defense) rows.push(row(t('defense'), icon(DEF_ICON), p.defense, 5 * p.level, 'wpn', 'defense', 'd'));
  rows.forEach(r => { r.rankText = r.rank ? fmt(r.rank) : ''; });
  return rows;
}
const HsImage = (() => {
  let dlg, p, opts, finalCv;
  // l'aperçu montre l'invitation « Remplis ton carnet » ; l'image téléchargée, copiée ou partagée ne l'a pas
  const final = async () => {
    if (!finalCv) { const cv = document.createElement('canvas'); await DropShare.draw(cv, p, { ...opts, preview: false }); finalCv = cv; }
    return finalCv;
  };
  const png = () => final().then(cv => new Promise(r => cv.toBlob(r, 'image/png')));
  function build() {
    dlg = document.createElement('dialog'); dlg.className = 'hsd';
    dlg.innerHTML = `<button class="cx" type="button" aria-label="${t('close')}">×</button><canvas width="1200" height="630"></canvas>
      <div class="cact"><button type="button" class="dl">${t('hsDl')}</button><button type="button" class="sh" hidden>${t('share')}</button><button type="button" class="cp">${t('hsCopy')}</button></div>`;
    document.body.append(dlg);
    dlg.addEventListener('click', async e => {
      if (e.target === dlg || e.target.closest('.cx')) return dlg.close();
      if (e.target.closest('.dl')) { const a = document.createElement('a'); a.download = `dropamine-hiscores-${p.slug}.png`; a.href = (await final()).toDataURL('image/png'); a.click(); return; }
      if (e.target.closest('.sh')) {
        try { await navigator.share({ files: [new File([await png()], `dropamine-hiscores-${p.slug}.png`, { type: 'image/png' })], title: `${p.name} ${p.surname} · Dropamine Hiscores` }); }
        catch (err) { /* partage annulé */ }
        return;
      }
      const cp = e.target.closest('.cp');
      if (cp) navigator.clipboard.write([new ClipboardItem({ 'image/png': png() })])
        .then(() => { cp.textContent = t('hsCopied'); setTimeout(() => cp.textContent = t('hsCopy'), 1800); })
        .catch(() => { cp.textContent = t('hsNoCopy'); });
    });
  }
  async function open(player) {
    if (!window.DropShare) return;
    if (!dlg) build();
    p = player;
    let files = false; try { files = !!navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] }) && matchMedia('(pointer:coarse)').matches; } catch (e) { /* pas de partage de fichier */ }
    $('.sh', dlg).hidden = !files;
    dlg.showModal();
    const desc = LANG === 'fr' ? `${className(p)} ${raceName(p)}` : `${raceName(p)} ${className(p)}`;
    await document.fonts.ready;
    finalCv = null;
    opts = { rows: hsRows(p), L: {
      title: `Hiscores · ${p.name} ${p.surname}`,
      sub: `${desc.charAt(0).toUpperCase() + desc.slice(1)} · ${t('levelN', { n: p.level })}${p.guild ? ' · ' + p.guild.name : ''} · Forever ${(p.region || 'eu').toUpperCase()}`,
      cols: [t('hsSkill'), t('hsRank'), t('hsLevel'), t('hsWeek')],
      date: DATA.updated ? new Date(DATA.updated).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) : '' },
      ...hsBook(p) };
    await DropShare.draw($('canvas', dlg), p, { ...opts, preview: true });
    final();   // prépare l'image finale pendant que le joueur regarde
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-hsimg]'); if (!b) return;
    const pl = DATA.players.find(x => pkey(x) === b.dataset.hsimg); if (pl) { Tip.hide(); open(pl); }
  });
  return { open };
})();

// Réputations de l'armurerie : palier (couleurs du jeu) et avancement dans le palier
const REP_COL = ['#cc3322', '#cc3322', '#e0682a', '#e6c84c', '#6fbf4a', '#4cc9a0', '#3fb8c9', '#5aa6e6'];
function repsPanel(p) {
  if (!p.reps?.length) return '';
  const rows = p.reps.map(x => `<li><span>${esc(L2(x.n) || x.n[0])}</span><i class="lbar rep"><i style="width:${x.m ? (100 * x.v / x.m).toFixed(1) : 100}%;background:${REP_COL[x.t] || REP_COL[3]}"></i></i><b style="color:${REP_COL[x.t] || REP_COL[3]}">${esc(L2(x.s) || x.s[0])}</b></li>`).join('');
  return `<div class="dpanel reps"><div class="dhead"><h3 class="sub">${t('repsT')}</h3><span class="db-when">${t('repsN', { n: p.reps.length })} · ${t('armorySrc')}</span></div><ul class="db-list reps">${rows}</ul></div>`;
}

// Carnet Dropamine : tout ce que l'armurerie n'a pas, envoyé par le joueur avec sa ligne /drop hiscores
// (chaque groupe n'existe que si sa case était cochée dans l'addon)
function dropBook(p) {
  const d = p.dropamine || {}, parts = [];
  const bar = (x, y) => `<i class="lbar"><i style="width:${Math.min(100, 100 * x / Math.max(1, y)).toFixed(1)}%"></i></i>`;
  if (d.collection) {
    const c = d.collection;
    const rows = [...c.dungeons].sort((a, b) => b.x / b.y - a.x / a.y).map(g =>
      `<li><span>${esc(g.name)}</span>${bar(g.x, g.y)}<b>${g.x} / ${g.y}</b></li>`).join('');
    parts.push(`<section class="db-card db-wide"><h4>${t('dbLog')}</h4><div class="db-big">${fmt(c.x)}<small> / ${fmt(c.y)}</small></div>${bar(c.x, c.y)}
      ${rows ? `<ul class="db-list">${rows}</ul>` : ''}</section>`);
  }
  if (d.achievements) {
    const a = d.achievements;
    parts.push(`<section class="db-card"><h4>${t('dbAch')}</h4><div class="db-big">${a.n}<small> / ${a.total}</small></div>${bar(a.n, a.total)}</section>`);
  }
  if (p.played) parts.push(`<section class="db-card"><h4>${t('played')}</h4><div class="db-big">${playedText(p.played)}</div><p class="db-note">/played</p></section>`);
  if (d.records) {
    const r = d.records;
    const L = [['recSession', r.bestSession], ['recHour', r.bestHour], ['recDay', r.bestDay], ['recCombo', 'x' + r.longestCombo], ['recSessions', r.sessions], ['recGoals', r.goalsHit]]
      .map(([k, v]) => `<div>${t(k)}<b>${typeof v === 'number' ? fmt(v) : v}</b></div>`).join('');
    parts.push(`<section class="db-card db-wide"><h4>${t('dbRec')}</h4><div class="ledger">${L}<div>${t('recTime')}<b>${playedText(r.playtime)}</b></div></div></section>`);
  }
  if (d.hunt?.length) {
    const rows = d.hunt.map(h => `<li><span>${esc(h.name)}</span><em>${h.tries ? t('huTries', { n: fmt(h.tries) }) : ''}</em><b class="${h.drops ? 'ok' : ''}">${h.drops ? '✓ ' + (h.drops > 1 ? '×' + h.drops : t('huFound')) : '—'}</b></li>`).join('');
    parts.push(`<section class="db-card"><h4>${t('dbHunt')}</h4><ul class="db-list hunt">${rows}</ul></section>`);
  }
  if (!parts.length) return '';
  const when = p.dropamineAt ? new Date(p.dropamineAt).toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) : '';
  return `<div class="dpanel dbook"><div class="dhead"><h3 class="sub">${t('dbTitle')}</h3>${when ? `<span class="db-when">${t('dbWhen', { d: when })} · ${t('trustShort')}</span>` : ''}</div>
    <div class="db-grid">${parts.join('')}</div></div>`;
}

const playedText = s => { const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? (LANG === 'fr' ? `${d} j ${h} h` : `${d}d ${h}h`) : (LANG === 'fr' ? `${h} h ${m} min` : `${h}h ${m}m`); };

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
  const gsk = skillById(state.gs), avail = SKILLS.filter(s => s.id === 'total' || members.some(p => s.get(p) && !(s.est && s.est(p))));
  const ranked = gsk.id === 'total' ? members.map((p, i) => ({ p, v: p.total, r: i + 1 })) : rankBy(gsk, members);
  let og = '', grp0;
  avail.forEach(s => { if (s.group !== grp0) { if (grp0 !== undefined) og += '</optgroup>'; grp0 = s.group; og += `<optgroup label="${s.group ? t('g.' + s.group) : t('total')}">`; }
    og += `<option value="${s.id}"${s.id === gsk.id ? ' selected' : ''}>${esc(s.label())}</option>`; });
  og += '</optgroup>';
  let best = null; members.forEach(p => p.professions?.forEach(pr => { if (!best || pr.skill > best.pr.skill) best = { p, pr }; }));
  const gains = members.map(p => ({ p, d: gain7(p) })).filter(x => x.d > 0).sort((a, b) => b.d - a.d);
  const feat = (k, v, s) => `<div class="feat"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  // la guilde comme un seul grand personnage : sa barre trois couleurs, et le meilleur de chaque métier
  const sum = k => members.reduce((a, p) => a + (p.parts?.[k] || 0), 0);
  const gp = { total: g.total, max: members.length * 2460, parts: { level: sum('level'), combat: sum('combat'), professions: sum('professions') }, complete: members.every(p => p.complete) };
  const bestOf = [];
  for (const id of PROF_ORDER) {
    let b = null; members.forEach(p => { const pr = p.professions?.find(x => x.id === id); if (pr && (!b || pr.skill > b.pr.skill)) b = { p, pr }; });
    if (b) bestOf.push({ key: 'p' + id, img: PROF_ICON[id], name: profName(id, b.pr.name), rank: b.pr.skill, max: b.pr.max || 300, group: 'prf', tier: `${b.p.name} ${b.p.surname}` });
  }
  const bd = members.reduce((b, p) => (p.defense || 0) > (b?.defense || 0) ? p : b, null);
  if (bd?.defense) bestOf.unshift({ key: 'defense', img: DEF_ICON, name: t('defense'), rank: bd.defense, max: 5 * bd.level, group: 'wpn', tier: `${bd.name} ${bd.surname}` });
  const clan = `<div class="dpanel guildp"><div class="dhead"><h3 class="sub">${t('bestByProf')}</h3></div>
      <div class="slist">${bestOf.map(lineOf).join('')}</div>${dropBar(gp)}</div>`;
  $('#guild-panel').innerHTML = `
    <span class="back" data-g="">${t('allGuilds')}</span>
    <div class="who gh">
      <div><h2>${esc(g.name)}</h2><p>${t('membersN', { n: members.length })}</p></div>
      <div class="score"><div class="n" data-n="${g.total}">${fmt(g.total)}</div><div class="r">${t('guildTotal', { r: ord(rank) })}</div></div>
    </div>
    <div class="feats">
      ${feat(t('bestTotal'), full(members[0]), fmt(members[0].total))}
      ${best ? feat(t('bestProf'), full(best.p), `${esc(profName(best.pr.id, best.pr.name))} · ${best.pr.skill}`) : ''}
      ${gains.length ? feat(t('bestWeek'), full(gains[0].p), t('inWeek', { n: fmt(gains[0].d) })) : feat(t('bestWeek'), '—', t('notEnough'))}
    </div>
    ${clan}
    <div class="gsort"><label for="gs">${t('sortBy')}</label><select id="gs" data-gs>${og}</select>${gsk.group === 'book' && !gsk.armory ? `<span class="note">${t('trustShort')}</span>` : ''}</div>
    <div class="rows" style="margin-top:10px">
      <div class="row th g"><span>${t('rank')}</span><span>${t('member')}</span><span class="c3">${gsk.id === 'total' ? t('split') : ''}</span><span class="c4" style="text-align:right">${gsk.id === 'total' ? t('d7') : ''}</span><span style="text-align:right">${gsk.id === 'total' ? t('totalH') : esc(gsk.label())}</span></div>
      ${ranked.length ? ranked.map(({ p, v, r }) => { const d = gain7(p), tot = gsk.id === 'total';
        const bar = tot ? tri(p) : gsk.prof ? `<span class="mbar"><i style="--w:${(100 * v / (p.professions.find(x => x.id === gsk.prof)?.max || 300)).toFixed(1)}%"></i></span>`
          : gsk.wpn ? `<span class="mbar w"><i style="--w:${(100 * v / (5 * p.level)).toFixed(1)}%"></i></span>`
          : gsk.ratio ? `<span class="mbar b"><i style="--w:${(100 * Math.min(1, gsk.ratio(v, p))).toFixed(1)}%"></i></span>` : '<span class="c3"></span>';
        return `<div class="row g${r <= 3 ? ' top' : ''}" data-c="${esc(pkey(p))}"><span class="rk">${r}</span><span class="nm">${avatar(p)}<span><b>${full(p)}</b><small>${esc(className(p))} ${p.level}</small></span></span>${bar}<span class="up">${tot ? (d ? (d > 0 ? '+' : '') + fmt(d) : '—') : ''}</span><span class="tot">${showVal(gsk, v, p)}${tot ? estTag(p) : ''}</span></div>`; }).join('')
        : nobody()}
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
document.addEventListener('change', e => { const sel = e.target.closest('[data-gs]'); if (!sel) return; state.gs = sel.value; renderGuild(); });
document.addEventListener('click', e => { const x = e.target.closest('.release.more .toggle'); if (x) { x.closest('.release').classList.remove('more'); x.remove(); } });

/* ---------- Texte fixe traduit (data-t) et pied de page ---------- */
function applyStatic() {
  $$('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  $$('[data-t-title]').forEach(el => { el.title = t(el.dataset.tTitle); el.setAttribute('aria-label', t(el.dataset.tTitle)); });
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
  bnListed: ['LISTED', 'INSCRIT'], bnPreview: ['GUILD PREVIEW', 'APERÇU'], bnHidden: ['HIDDEN', 'MASQUÉ'], bnLow: ['level 10 required', 'niveau 10 requis'],
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
  // affiché sur le site : inscrit, ou en aperçu de guilde (et pas masqué) ; coché = affiché
  const previewed = c => !c.registered && !c.optout && DATA.players.some(p => p.preview && pkey(p) === c.key);
  const shown = c => !!c.registered || previewed(c);
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
      ${chars.length ? `<div class="list">${chars.map(c => `<label class="${c.level < 10 ? 'off' : ''}${shown(c) ? ' on' : ''}"><input type="checkbox" value="${esc(c.key)}" ${c.level < 10 ? 'disabled' : ''} ${shown(c) ? 'checked' : ''}>
        <span><b>${esc(c.name || c.slug)} ${esc(c.surname || '')}</b><small>${esc(c.region.toUpperCase())} · ${esc(L2(CLASS[c.classId]) || '')} ${c.level}${c.level < 10 ? ' · ' + t('bnLow') : ''}</small></span>
        ${c.registered ? `<span class="tagged">${t('bnListed')}</span>` : previewed(c) ? `<span class="tagged pv">${t('bnPreview')}</span>` : c.optout ? `<span class="tagged off">${t('bnHidden')}</span>` : ''}</label>`).join('')}</div>
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
    await load(); draw(); header();
  }
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-bn]'); if (!el) return;
    e.preventDefault(); const act = el.dataset.bn;
    if (act === 'logout') { await call('/logout', {}).catch(() => {}); me = null; msg = ''; upMsg = ''; draw(); header(); return; }
    if (act === 'upload') {
      const line = $('#hsline')?.value.trim(); if (!line) return;
      el.setAttribute('disabled', '');
      try {
        const r = await call('/upload', { line }), j = await r.json();
        upMsg = r.ok ? t('upOk', { w: fmt(j.weapons), n: j.count }) : L2(I18N.upErr[j.error] || I18N.bnError);
        if (r.ok) Ribbon.swell(.8);
      } catch { upMsg = t('bnError'); }
      await load(); draw(); header(); return;
    }
    const checked = $$('#bnet input:checked').map(i => i.value), all = $$('#bnet input').map(i => i.value);
    const keys = act === 'claim' ? checked.filter(k => !me.characters.find(c => c.key === k)?.registered)
      : all.filter(k => !checked.includes(k) && shown(me.characters.find(c => c.key === k) || {}));
    if (!keys.length) return;
    $$('#bnet [data-bn]').forEach(x => x.setAttribute('disabled', ''));
    try {
      const r = await call('/' + act, { keys });
      const j = await r.json();
      msg = r.ok ? t('bnDone', { n: (j.done || []).length }) : t('bnError');
      Ribbon.swell(.8);
    } catch { msg = t('bnError'); }
    await load(); draw(); header();
  });
  // Compte connecté : bouton de l'en-tête, onglet « Mon personnage », fiches à soi
  const mine = () => me ? DATA.players.filter(p => me.characters?.some(c => c.key === pkey(p)) && !p.optout) : [];
  const best = () => [...mine()].sort((a, b) => b.total - a.total)[0] ? pkey([...mine()].sort((a, b) => b.total - a.total)[0]) : '';
  const isMine = key => mine().some(p => pkey(p) === key);
  function header() {
    const a = $('#acct'); if (!a) return;
    const tag = me?.battletag ? me.battletag.split('#')[0] : '';
    a.classList.toggle('on', !!me);
    a.querySelector('span').textContent = tag || t('acct.in');
    a.title = me ? t('foot.join') : t('acct.in');
    const tab = $('.tabs [data-view="char"]'); if (tab) tab.hidden = !mine().length;
  }
  async function init() { if (await probe()) await load(); }
  // déconnexion depuis la barre de navigation
  $('#acct-out')?.addEventListener('click', async () => {
    await call('/logout', {}).catch(() => {}); me = null; msg = ''; upMsg = '';
    render(false); Ribbon.swell(.6);
  });
  async function refresh() { await load(); render(false); }
  return { show, init, header, mine, best, isMine, refresh };
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
  tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.view === state.view && (b.dataset.view !== 'char' || Bnet.isMine(state.c))));
  Bnet.header();
  $$('.view').forEach(v => v.classList.toggle('on', v.id === state.view));
  $('#sub').textContent = `HISCORES · FOREVER ${state.region.toUpperCase()}`;
  $('#region').value = state.region;
  document.title = state.view === 'home' ? t('title') : `${t(TITLES[state.view])} · Dropamine`;
  animate($('#' + state.view));
  // dons : seulement sur les pages de l'addon, jamais à côté des données Blizzard (classements, fiches, guildes)
  $('#foot-coffee').hidden = !['home', 'get', 'news'].includes(state.view);
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
tabs.forEach(b => b.addEventListener('click', () => go(b.dataset.view === 'char' ? { view: 'char', c: Bnet.best() } : { view: b.dataset.view })));
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
const BOOT_HSIMG = new URLSearchParams(location.search).get('hsimg');   // lien direct vers l'image Hiscores (lu avant que l'adresse soit réécrite)
readUrl();
render(false);
Ribbon.load(true);
Promise.all([
  fetch('data/hiscores.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(d => { DATA = d; })
    .catch(() => { DATA = { players: [], failed: true }; }),
  fetch('data/changelog.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(d => { NEWS = d; })
    .catch(() => { NEWS = { versions: [] }; }),
  Bnet.init(),
]).then(() => { Ribbon.load(false); return document.fonts.ready; })
  .then(() => { render(false); Ribbon.swell(.7); const hs = BOOT_HSIMG; const hp = hs && DATA.players.find(x => pkey(x) === hs); if (hp) HsImage.open(hp); });
