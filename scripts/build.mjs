// Dropamine Hiscores — récupère les personnages inscrits via l'API Blizzard (WoW Forever),
// calcule leur niveau total à la façon de Dropamine et écrit les données du site.
//
// Entrée  : data/registry.json   personnages inscrits, « région/prénom-nom » (région par défaut : eu)
//           data/uploads.json    armes envoyées par les joueurs (fichier Dropamine), par clé « région/slug »
// Sorties : site/data/hiscores.json    classement + fiches, lu par le site
//           site/data/changelog.json   dernières versions de l'addon (CHANGELOG de Dropamine)
//           data/history/{région}/{slug}.json  un point par jour, pour les courbes (versionné)
//
// Secrets : BNET_CLIENT_ID / BNET_CLIENT_SECRET (variables d'environnement, jamais écrites).
// Node 20+ (fetch natif), aucune dépendance.

import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const REGIONS = ['eu', 'us', 'tw'];
const LOCALE = { eu: 'fr_FR', us: 'en_US', tw: 'zh_TW' };
const WEAPON_CLASS = 2;          // item_class « Arme »
const TOTAL_MAX = 2460;          // niveau total maximum de Dropamine
// mêmes règles que l'addon (Core.lua : ResolveCombatTiles, SECOND_SLOT_BY_CLASS)
const RANGED_ONLY = new Set(['bows', 'guns', 'crossbows', 'thrown']);
const RANGED_KINDS = new Set([...RANGED_ONLY, 'wands']);
const MELEE_KINDS = new Set(['axes', 'axes2h', 'maces', 'maces2h', 'swords', 'swords2h', 'polearms', 'staves', 'fist', 'daggers', 'unarmed']);
const SECOND_BY_CLASS = { 9: 'wands', 8: 'wands', 5: 'wands', 11: 'feral', 3: 'ranged', 1: 'ranged', 4: 'ranged' };   // paladin, chaman : aucune
const SECONDARY_PROFS = new Set([185, 356, 129]);   // Cuisine, Pêche, Secourisme
// sous-classe d'arme Blizzard → identifiant de compétence de l'addon (Catalog.lua de Dropamine)
const WEAPON_ID = { 0: 'axes', 1: 'axes2h', 2: 'bows', 3: 'guns', 4: 'maces', 5: 'maces2h', 6: 'polearms', 7: 'swords',
  8: 'swords2h', 10: 'staves', 13: 'fist', 15: 'daggers', 16: 'thrown', 18: 'crossbows', 19: 'wands' };
const HISTORY_DAYS = 30;         // points gardés par personnage (conditions Blizzard : 30 jours maximum)
const CHANGELOG_URL = 'https://raw.githubusercontent.com/Raykuilu/Dropamine/main/CHANGELOG.md';
const CHANGELOG_FR_URL = 'https://raw.githubusercontent.com/Raykuilu/Dropamine/main/CHANGELOG.fr.md';   // traduction (versions récentes)

// ---------------------------------------------------------------------------
export async function token() {
  const id = process.env.BNET_CLIENT_ID, secret = process.env.BNET_CLIENT_SECRET;
  if (!id || !secret) throw new Error('BNET_CLIENT_ID / BNET_CLIENT_SECRET manquants');
  const res = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64') },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  if (!res.ok) throw new Error(`jeton refusé (${res.status})`);
  return (await res.json()).access_token;
}

// allLocales : noms dans toutes les langues (objet { en_US, fr_FR, … }) au lieu d'une seule
export async function get(tok, region, path, allLocales = false) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://${region}.api.blizzard.com${path}${sep}namespace=profile-forever-${region}${allLocales ? '' : `&locale=${LOCALE[region] || 'en_US'}`}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 404) return null;                       // personnage < niveau 10, ou pas encore visible
    if (res.status === 429) { await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error(`${region}${path} → ${res.status}`);
    return res.json();
  }
  throw new Error(`${region}${path} → trop de requêtes`);
}

// « Ray Kuilu », « ray-kuilu », « EU/Ray-Kuilu » → { region, slug }
export function parseEntry(raw, fallbackRegion = 'eu') {
  let s = String(raw ?? '').trim();
  let region = fallbackRegion;
  const m = s.match(/^([a-z]{2})\s*[/:]\s*(.+)$/i);
  if (m && REGIONS.includes(m[1].toLowerCase())) { region = m[1].toLowerCase(); s = m[2]; }
  const slug = s.toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return slug.includes('-') ? { region, slug, key: `${region}/${slug}` } : null;
}

// ---------------------------------------------------------------------------
// Calcul : niveau + métiers + Défense (API) + armes (fichier Dropamine, sinon estimées)
// Une compétence d'arme ne baisse jamais en jeu : chaque arme de la ligne Dropamine garde au moins son meilleur rang
// vu dans l'historique (une ligne fausse, ex. combat farouche à 1 avec Dropamine 3.12.1, ne fait plus rien baisser)
export function weaponFloor(upload, hist = []) {
  if (!upload || !Array.isArray(upload.weaponList)) return upload;
  const best = {};
  for (const h of hist) for (const [k, v] of Object.entries(h.s ?? {})) if (k[0] === 'w' && Number.isFinite(v)) best[k.slice(1)] = Math.max(best[k.slice(1)] ?? 0, v);
  const weaponList = upload.weaponList.map(w => ({ ...w, rank: Math.max(+w.rank || 0, best[String(w.id)] ?? 0) }));
  return { ...upload, weaponList, weapons: weaponList.reduce((n, w) => n + (+w.rank || 0), 0) };
}
export function score({ profile, professions, equipment, statistics }, upload) {
  const level = profile.level ?? 0;
  const profs = [];
  for (const kind of ['primaries', 'secondaries']) {
    for (const p of professions?.[kind] ?? []) {
      const t = p.tiers?.[0];
      if (t) profs.push({ id: p.profession.id, name: p.profession.name, skill: t.skill_points, max: t.max_skill_points, recipes: t.known_recipes?.length ?? 0 });
    }
  }
  // comme l'addon : les 2 meilleurs métiers principaux + Cuisine, Pêche, Secourisme (la Monte n'entre pas)
  const primaries = profs.filter(p => !SECONDARY_PROFS.has(p.id) && (professions?.primaries ?? []).some(x => x.profession.id === p.id))
    .sort((a, b) => b.skill - a.skill).slice(0, 2);
  const profTotal = [...primaries, ...profs.filter(p => SECONDARY_PROFS.has(p.id))].reduce((s, p) => s + p.skill, 0);
  const defense = statistics?.defense?.base ?? 0;

  // comme l'addon : 3 cases de combat = l'arme de mêlée en main + une 2e compétence selon la classe + Défense
  const items = (equipment?.equipped_items ?? []).filter(i => i.item_class?.id === WEAPON_CLASS)
    .map(i => ({ slot: i.slot?.type, kind: WEAPON_ID[i.item_subclass?.id] })).filter(i => i.kind);
  const mh = items.find(i => i.slot === 'MAIN_HAND') ?? items.find(i => !i.slot && !RANGED_KINDS.has(i.kind));
  const rg = items.find(i => i.slot === 'RANGED') ?? items.find(i => !i.slot && RANGED_KINDS.has(i.kind));
  const mode = SECOND_BY_CLASS[profile.character_class?.id];
  const uploaded = upload && Number.isFinite(upload.weapons);
  const list = uploaded && Array.isArray(upload.weaponList)
    ? upload.weaponList.map(w => ({ id: String(w.id), rank: Math.min(+w.rank || 0, 5 * level) })).filter(w => w.rank > 0) : [];
  const rankOf = id => list.find(w => w.id === id)?.rank ?? 0;
  const best = ids => list.filter(w => ids.has(w.id)).sort((a, b) => b.rank - a.rank)[0]?.id ?? null;
  const meleeId = mh && !RANGED_KINDS.has(mh.kind) ? mh.kind : items.length ? best(MELEE_KINDS) : 'unarmed';
  const secondId = mode === 'feral' ? 'feral' : mode === 'wands' ? 'wands'
    : mode === 'ranged' ? (rg && RANGED_ONLY.has(rg.kind) && (!uploaded || rankOf(rg.kind)) ? rg.kind : uploaded ? best(RANGED_ONLY) : null) : null;
  const equipped = [meleeId, secondId].filter(Boolean);

  let weapons, weaponsSource, weaponList;
  if (uploaded) {
    // ligne « /drop hiscores » : chaque arme plafonnée à 5 × le niveau actuel ; seules les 2 cases de combat comptent
    weaponList = list;
    weapons = list.length ? rankOf(meleeId) + (secondId ? rankOf(secondId) : 0) : Math.min(upload.weapons, 2 * 5 * level);
    weaponsSource = 'dropamine';
  } else {
    // estimation : l'arme de mêlée et l'arme à distance (ou baguette) équipées, comptées au maximum (5 × niveau) ;
    // pour un druide, le Combat farouche (sa 2e compétence, sans objet) aussi, comme dans l'addon
    const kinds = [mh && !RANGED_KINDS.has(mh.kind) ? mh.kind : null, rg && secondId === rg.kind ? rg.kind : mode === 'wands' && rg?.kind === 'wands' ? 'wands' : mode === 'feral' ? 'feral' : null].filter(Boolean);
    weaponList = kinds.map(id => ({ id, rank: 5 * level, est: true }));
    weapons = kinds.length * 5 * level; weaponsSource = 'estimate';
  }
  const total = level + defense + weapons + profTotal;
  return {
    level, defense, weapons, weaponsSource, weaponList, equipped, professions: profs,
    parts: { level, combat: defense + weapons, professions: profTotal },
    total, max: TOTAL_MAX, complete: weaponsSource === 'dropamine',
    // équipement porté (emplacement, objet) : base des suggestions de « Ma chasse »
    gear: (equipment?.equipped_items ?? []).filter(i => i.slot?.type && i.item?.id).map(i => [i.slot.type, i.item.id]),
  };
}

// derniers loots datés : ce qui apparaît dans le carnet (ou devient « trouvé » dans la chasse) depuis l'export précédent.
// Le premier export d'un joueur ne compte pas (tout serait « nouveau »). Rien de plus vieux que 30 jours.
export function newLoots(prev, up, today) {
  const old = prev?.loots ?? [], fresh = [];
  const before = prev?.dropamine?.collection?.items;
  if (Array.isArray(up?.collection?.items) && Array.isArray(before) && before.length) {
    const b = new Set(before);
    for (const id of up.collection.items) if (!b.has(id)) fresh.push(id);
  }
  if (Array.isArray(prev?.dropamine?.hunt)) {
    const was = new Set(prev.dropamine.hunt.filter(h => h.drops > 0).map(h => h.id));
    for (const h of up?.hunt ?? []) if (h.drops > 0 && !was.has(h.id) && !fresh.includes(h.id)) fresh.push(h.id);
  }
  const day = String(up?.at ?? today).slice(0, 10) || today;
  const cutoff = new Date(Date.parse(today) - 29 * 864e5).toISOString().slice(0, 10);
  const seen = new Set(old.map(x => x[0]));
  return [...fresh.filter(id => !seen.has(id)).map(id => [id, day]), ...old].filter(x => x[1] >= cutoff).slice(0, 30);
}

// valeurs du jour, en clés courtes : l = niveau, d = Défense, p{id} = métier, w{arme} = arme (sauf estimations)
export function skillSnapshot(s) {
  const o = { l: s.level, d: s.defense };
  for (const p of s.professions ?? []) o['p' + p.id] = p.skill;
  for (const w of s.weaponList ?? []) if (!w.est) o['w' + w.id] = w.rank;
  return o;
}

// chasse vérifiée par l'armurerie : un objet de la liste de chasse compte le jour où on le voit porté, s'il était encore
// cherché au relevé précédent (hq = objets cherchés et pas encore portés ; hf = trouvés ce jour-là, cumulés sur la journée).
// Premier relevé : seulement la base (rien ne compte). Un objet déjà porté quand il entre dans la liste ne compte pas.
export function huntCheck(last, today, huntIds, gearIds) {
  const want = [...new Set((huntIds ?? []).filter(Number.isFinite))];
  if (!want.length && !last?.hq) return {};
  const worn = new Set(gearIds ?? []);
  const hq = want.filter(id => !worn.has(id));
  const was = new Set(last?.hq ?? []);
  const found = last?.hq ? want.filter(id => worn.has(id) && was.has(id)) : [];
  const hf = [...new Set([...(last?.d === today ? last.hf ?? [] : []), ...found])];
  return { hq, ...(hf.length ? { hf } : {}) };
}

// statistiques de l'armurerie, par identifiant (stables quelle que soit la langue)
export const STAT_IDS = { 107: 'kills', 98: 'quests', 60: 'deaths', 349: 'flights', 932: 'dungeons',
  588: 'hk', 1487: 'killingBlows', 1501: 'pvpDeaths', 318: 'factionDeaths', 319: 'duelsWon', 320: 'duelsLost',
  108: 'critters', 94: 'questsAbandoned', 918: 'dungeonDeaths', 114: 'fallDeaths', 113: 'fatigueDeaths',
  353: 'hearth', 1518: 'fish', 339: 'mounts', 345: 'healthPotions', 922: 'manaPotions', 347: 'food', 346: 'drinks', 1045: 'cheers' };
// réputations : [{ id, n: [en, fr], t: palier 0-7, s: [en, fr], v, m }] de la plus avancée à la moins avancée
export function pickReps(reps) {
  return (reps?.reputations ?? []).filter(r => r.faction?.id && r.standing)
    .map(r => ({ id: r.faction.id, n: [r.faction.name?.en_US ?? '', r.faction.name?.fr_FR ?? r.faction.name?.en_US ?? ''],
      t: r.standing.tier ?? 3, s: [r.standing.name?.en_US ?? '', r.standing.name?.fr_FR ?? ''], v: r.standing.value ?? 0, m: r.standing.max ?? 0, raw: r.standing.raw ?? 0 }))
    .sort((a, b) => b.raw - a.raw).map(({ raw, ...r }) => r);
}
export function pickStats(achStats) {
  // repli sur les noms (fr_FR / en_US) si un identifiant manquait
  const want = { 'Créatures tuées': 'kills', 'Creatures killed': 'kills', 'Quêtes achevées': 'quests', 'Quests completed': 'quests',
    'Nombre total de morts': 'deaths', 'Total deaths': 'deaths', 'Trajets aériens empruntés': 'flights', 'Flight paths taken': 'flights' };
  const out = {};
  const walk = (cats, boss) => cats?.forEach(c => {
    const inBoss = boss || /^boss/i.test(c.name ?? '');
    if (inBoss) c.statistics?.forEach(s => { if (s.quantity > 0) { out.bosses = (out.bosses || 0) + 1; out.bossKills = (out.bossKills || 0) + Math.round(s.quantity); } });
    else c.statistics?.forEach(s => { const k = STAT_IDS[s.id] || want[s.name]; if (k && out[k] == null) out[k] = Math.round(s.quantity); });
    walk(c.sub_categories, inBoss);
  });
  walk(achStats?.categories);
  return out;
}

// Une fiche complète (utilisée aussi par l'inscription pour vérifier qu'un personnage existe)
export async function fetchCharacter(tok, region, slug) {
  const base = `/profile/wow/character/${encodeURIComponent(slug)}`;
  const profile = await get(tok, region, base);
  if (!profile) return null;
  const [professions, equipment, statistics, achStats, media, pvp, reputations] = await Promise.all([
    get(tok, region, `${base}/professions`), get(tok, region, `${base}/equipment`),
    get(tok, region, `${base}/statistics`), get(tok, region, `${base}/achievements/statistics`),
    get(tok, region, `${base}/character-media`).catch(() => null),   // rendu 3D : absent quelques heures après la création
    get(tok, region, `${base}/pvp-summary`).catch(() => null),       // victoires honorables (à vie) et rang JcJ
    get(tok, region, `${base}/reputations`, true).catch(() => null),  // réputations, noms en anglais et en français
  ]);
  return { profile, professions, equipment, statistics, achStats, media, pvp, reputations };
}

// ---------------------------------------------------------------------------
// CHANGELOG de l'addon (Markdown) → versions { version, sections: [{ title, items }] }
export function parseChangelog(md, keep = 6) {
  const versions = [];
  let v = null, sec = null;
  const inline = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  for (const line of md.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^##\s+(.+)/)) && !line.startsWith('###')) { v = { version: m[1].trim(), sections: [] }; versions.push(v); sec = null; }
    else if (v && (m = line.match(/^###\s+(.+)/))) { sec = { title: m[1].trim(), items: [] }; v.sections.push(sec); }
    else if (v && (m = line.match(/^-\s+(.+)/))) { if (!sec) { sec = { title: '', items: [] }; v.sections.push(sec); } sec.items.push(inline(m[1])); }
    else if (v && sec && (m = line.match(/^\s{2,}-\s+(.+)/))) { sec.items[sec.items.length - 1] += ' — ' + inline(m[1]); }
  }
  return versions.slice(0, keep);
}

// ---------------------------------------------------------------------------
async function readJson(file, fallback) {
  return existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : fallback;
}

// (avant la file d'attente) Guildes suivies (data/guilds.json) → personnages à montrer en aperçu : niveau 10+, ni inscrits, ni retirés
export function previewEntries(rosters, registered, optout) {
  const out = new Map();
  for (const { region, roster } of rosters) {
    for (const m of roster?.members ?? []) {
      const c = m.character, slug = c?.slug?.toLowerCase();
      if (!slug || !slug.includes('-') || (c.level ?? 0) < 10) continue;
      const key = `${region}/${slug}`;
      if (registered.has(key) || optout.has(key) || out.has(key)) continue;
      out.set(key, { region, slug, key, preview: true });
    }
  }
  return [...out.values()];
}

// Scout (data/scouted.json) → aperçus : vus depuis moins de 30 jours, niveau 10+, ni inscrits, ni retirés, ni déjà montrés ;
// les plus récents d'abord, SCOUT_LIMIT au plus par relevé (appels Blizzard)
export const SCOUT_LIMIT = 400;
// guildes suivies relues au plus par mise à jour quand le serveur est arrêté (appels Blizzard)
export const FOLLOW_MAX = 1500;
export function scoutEntries(scouted, taken, optout, day = Math.floor(Date.now() / 864e5)) {
  return Object.entries(scouted?.players ?? {})
    .filter(([key, v]) => (v.d ?? 0) >= day - 30 && (v.l ?? 0) >= 10 && !taken.has(key) && !optout.has(key) && /^(eu|us|tw)\/[^/]+-[^/]+$/.test(key))
    .sort((a, b) => (b[1].d ?? 0) - (a[1].d ?? 0) || (b[1].l ?? 0) - (a[1].l ?? 0))
    .slice(0, SCOUT_LIMIT)
    .map(([key, v]) => { const [region, slug] = key.split('/'); return { region, slug, key, preview: true, scout: v.dun ? { dun: v.dun, d: v.d } : { d: v.d } }; });
}

// ---------------------------------------------------------------------------
// File d'attente des aperçus (data/queue.json) : le site se remplit tout seul, au rythme que l'API supporte.
// Sources : Scout (repérés en jeu), guildes suivies (data/guilds.json), puis les membres des guildes de ces joueurs
// et des inscrits (un seul niveau : un membre ajouté par sa guilde n'ouvre pas la sienne).
// À chaque relevé : NEW nouveaux vérifiés, REFRESH aperçus relus (les plus anciens ; une fois par jour au plus), les autres
// gardent leur dernière fiche. Un aperçu pas relu depuis STALE jours est retiré (conditions Blizzard : 30 jours au plus).
export const QUEUE = { NEW: 150, REFRESH: 500, GUILDS: 10, GUILD_EVERY: 7, MAX_PREVIEWS: 3000, MAX_QUEUE: 20000, STALE: 25, GONE_DAYS: 30 };
const PRIO = { scout: 0, follow: 1, guild: 2 };
const KEY_RE = /^(eu|us|tw)\/[^/]+-[^/]+$/;
// mode de la mise à jour selon le relevé du serveur : off (il ne tourne pas : ancienne file d'attente),
// all (il tourne : on publie tout ce qu'il a lu, sans plafond, plus les aperçus déjà publiés qu'il n'a pas encore relus)
export function serverMode(srv) {
  const st = srv?.status;
  return st && st.target > 0 && Array.isArray(srv.players) ? 'all' : 'off';
}
export const validEntryKey = k => typeof k === 'string' && KEY_RE.test(k);
export function emptyQueue() { return { players: {}, guilds: {}, gone: {}, runs: [] }; }
// ajoute des candidats { key, via, l } : ni inscrits, ni retirés, ni déjà montrés, ni introuvables récemment ; garde la meilleure source
export function enqueue(queue, items, taken, optout, day) {
  let added = 0;
  for (const it of items) {
    const key = String(it.key ?? '').toLowerCase();
    if (!KEY_RE.test(key) || taken.has(key) || optout.has(key)) continue;
    if (queue.gone[key] != null && queue.gone[key] >= day - QUEUE.GONE_DAYS) continue;
    const cur = queue.players[key];
    if (!cur) { if (Object.keys(queue.players).length >= QUEUE.MAX_QUEUE) continue; added++; }
    queue.players[key] = { via: cur && PRIO[cur.via] <= PRIO[it.via] ? cur.via : it.via, l: Math.max(it.l ?? 0, cur?.l ?? 0), a: cur?.a ?? day };
  }
  return added;
}
// les n suivants : source d'abord (Scout, guildes suivies, membres de guilde), puis les plus hauts niveaux, puis les plus anciens
export function nextFromQueue(queue, n) {
  return Object.entries(queue.players)
    .sort((a, b) => PRIO[a[1].via] - PRIO[b[1].via] || (b[1].l ?? 0) - (a[1].l ?? 0) || (a[1].a ?? 0) - (b[1].a ?? 0) || a[0].localeCompare(b[0]))
    .slice(0, Math.max(0, n))
    .map(([key, v]) => { const [region, slug] = key.split('/'); return { region, slug, key, preview: true, via: v.via, queued: true }; });
}
// aperçus du relevé précédent : à relire (jamais relus aujourd'hui, les plus anciens d'abord, REFRESH au plus) ou gardés tels quels
export function planPreviews(prev, taken, optout, day) {
  const live = prev.filter(p => p.preview && !taken.has(p.key) && !optout.has(p.key) && (p.fetched ?? day) >= day - QUEUE.STALE);
  const due = live.filter(p => (p.fetched ?? 0) < day).sort((a, b) => (a.fetched ?? 0) - (b.fetched ?? 0)).slice(0, QUEUE.REFRESH);
  const dueKeys = new Set(due.map(p => p.key));
  return { refresh: due.map(p => ({ region: p.region, slug: p.slug, key: p.key, preview: true, via: p.via ?? 'follow' })),
    keep: live.filter(p => !dueKeys.has(p.key)), count: live.length };
}
// guildes à lire : celles des inscrits et des aperçus venus de Scout ou des guildes suivies, pas lues depuis GUILD_EVERY jours
export function guildsToRead(players, queue, day, n = QUEUE.GUILDS) {
  const seen = new Map();
  for (const p of players) {
    if (!p.guild?.slug || (p.preview && p.via === 'guild')) continue;
    const k = `${p.region}/${p.guild.slug}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([k]) => (queue.guilds[k] ?? -1e9) < day - QUEUE.GUILD_EVERY)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([k]) => k);
}

// ---------------------------------------------------------------------------
// Données du site en deux niveaux (le site reste rapide quand le nombre de personnages grandit) :
//  - site/data/hiscores.json : l'index léger, chargé par toutes les pages (classements, recherche, accueil, groupes) ;
//  - site/data/c/<région>/<slug>.json : la fiche complète, chargée à la demande (fiche, image Hiscores, page Moi).
// Statistiques gardées dans l'index : celles des classements (le reste n'est montré que sur la fiche)
export const RANK_STATS = ['killingBlows', 'kills', 'quests', 'dungeons', 'flights', 'hk', 'pvpDeaths', 'duelsWon', 'duelsLost'];
// historique compact : seuls les points où une valeur change (le dernier d'une série et le premier de la suivante),
// plus le premier et le dernier. Les gains (jour, semaine, défis) donnent le même résultat : entre deux points gardés, rien n'a bougé.
export function compactHistory(hist) {
  const h = (hist ?? []).map(({ hq, ...x }) => x);   // hq ne sert qu'au relevé (fichiers data/history)
  const key = x => JSON.stringify([x.t, x.s, x.hk, x.pw, x.hf]);
  return h.filter((x, i) => i === 0 || i === h.length - 1 || key(x) !== key(h[i - 1]) || key(x) !== key(h[i + 1]));
}
export function indexPlayer(p) {
  const { reps, gear, render, inset, stats, history, professions, ...rest } = p;
  const st = {};
  for (const k of RANK_STATS) if (stats?.[k] != null) st[k] = stats[k];
  return { ...rest, ...(Object.keys(st).length ? { stats: st } : {}), ...(professions ? { professions: professions.map(({ recipes, ...x }) => x) } : {}),
    history: compactHistory(history) };
}
// Accueil léger (site/data/home.json) : l'accueil n'a besoin que des inscrits, de ceux qui ont bougé (semaine, direct),
// du top 5 de chaque région et de quelques totaux ; l'index complet n'est chargé qu'en ouvrant une autre page.
export const HOME_TOP = 5;
export function homeIndex(players, updated) {
  const keep = new Set(), byRegion = new Map();
  for (const p of players) {
    if (!p.preview || (p.history?.length ?? 0) > 1) keep.add(p);   // inscrits, et ceux qui ont progressé
    const r = p.region || 'eu'; (byRegion.get(r) ?? byRegion.set(r, []).get(r)).push(p);
  }
  for (const list of byRegion.values()) [...list].sort((a, b) => b.total - a.total).slice(0, HOME_TOP).forEach(p => keep.add(p));
  const guilds = new Set(players.filter(p => p.guild?.slug).map(p => (p.region || 'eu') + '/' + p.guild.slug));
  const counts = { players: players.length, guilds: guilds.size, found: players.reduce((n, p) => n + (p.dropamine?.collection?.x || 0), 0) };
  return { updated, partial: true, counts, players: players.filter(p => keep.has(p)).map(indexPlayer) };
}
export function detailPlayer(p) {
  const { history, ...rest } = p;
  return { ...rest, history: (history ?? []).map(({ hq, ...x }) => x) };
}
export const detailPath = p => `data/c/${p.region}/${p.slug}.json`;

// n tâches en parallèle au plus (limite d'appels Blizzard : 36 000 par heure)
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

// Plan du site pour les moteurs de recherche : les pages fixes, puis une fiche par personnage et par guilde
export function sitemap(players, day) {
  const SITE = 'https://dropamine.app/';
  const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const urls = ['', '?p=rank', '?p=guild', '?p=news', '?p=get', '?p=join', '?p=privacy'].map(q => SITE + q);
  for (const p of players) urls.push(`${SITE}?p=char&c=${encodeURIComponent(p.key)}`);
  const guilds = new Set(players.filter(p => p.guild?.slug).map(p => `${p.region !== 'eu' ? `r=${p.region}&` : ''}g=${encodeURIComponent(p.guild.slug)}`));
  for (const g of guilds) urls.push(`${SITE}?p=guild&${g}`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map(u => `  <url><loc>${xml(u)}</loc><lastmod>${day}</lastmod></url>`).join('\n') + '\n</urlset>\n';
}

// Un navigateur ne doit jamais mélanger une page neuve avec un vieux app.js / style.css en cache :
// index.html les appelle avec l'empreinte de leur contenu (app.js?v=xxxxxxxx).
export function stampHtml(html, hashes) {
  return html.replace(/(src|href)="(app\.js|share\.js|style\.css)(\?v=[0-9a-f]+)?"/g, (_, attr, file) => `${attr}="${file}?v=${hashes[file]}"`);
}
async function stampAssets() {
  const { createHash } = await import('node:crypto');
  const hashes = {};
  for (const f of ['app.js', 'share.js', 'style.css']) hashes[f] = createHash('sha256').update(await readFile(join(ROOT, 'site', f))).digest('hex').slice(0, 8);
  const file = join(ROOT, 'site/index.html');
  await writeFile(file, stampHtml(await readFile(file, 'utf8'), hashes));
  console.log(`empreintes : ${Object.entries(hashes).map(([f, h]) => f + ' ' + h).join(', ')}`);
}

async function main() {
  const registry = await readJson(join(ROOT, 'data/registry.json'), { characters: [] });
  const uploads = await readJson(join(ROOT, 'data/uploads.json'), {});
  const guilds = (await readJson(join(ROOT, 'data/guilds.json'), { guilds: [] })).guilds ?? [];
  const tok = await token();
  const today = new Date().toISOString().slice(0, 10);
  const players = [];

  const entries = [];
  for (const raw of registry.characters) {
    const e = parseEntry(raw);
    if (e) entries.push(e); else console.warn(`· entrée ignorée : ${raw}`);
  }
  const optout = new Set((registry.optout ?? []).map(k => String(k).toLowerCase()));
  const regKeys = new Set(entries.map(e => e.key));
  const day = Math.floor(Date.now() / 864e5);
  // relevé précédent : celui du site en ligne (le fichier du dépôt n'est pas versionné), sinon la copie locale
  let prevList = null;
  try { const r = await fetch(`https://dropamine.app/data/hiscores.json?nc=${Date.now()}`); if (r.ok) prevList = (await r.json()).players; } catch { /* hors ligne */ }
  if (!Array.isArray(prevList)) prevList = (await readJson(join(ROOT, 'site/data/hiscores.json'), { players: [] })).players ?? [];
  // relevé du serveur (api.dropamine.app, server/crawl.mjs) : quand il tourne, c'est lui qui lit les aperçus chez Blizzard,
  // la mise à jour ne relit plus que les inscrits (la limite Blizzard de 36 000 appels / h est partagée)
  // export déjà compressé (/hs/all.gz : ≈ 200 octets par personnage au lieu de 1,3 Ko)
  const srv = await fetch('https://api.dropamine.app/hs/all.gz', { signal: AbortSignal.timeout(300e3) })
    .then(async r => r.ok ? JSON.parse(gunzipSync(Buffer.from(await r.arrayBuffer())).toString('utf8')) : null).catch(() => null);
  const mode = serverMode(srv);
  console.log(`relevé serveur : ${mode}${srv?.status ? ` (${srv.status.read} lus, ${srv.status.active} actifs, ${srv.status.waiting} à découvrir)` : ''}`);
  // file d'attente (mode « off ») : guildes suivies et Scout y entrent ; puis les guildes des joueurs connus (un seul niveau)
  const queue = { ...emptyQueue(), ...(await readJson(join(ROOT, 'data/queue.json'), emptyQueue())) };
  let plan, fresh = [], qAdd = 0, run, srvPlayers = [];
  if (mode === 'off') {
    plan = planPreviews(prevList, regKeys, optout, day);
    const shown = new Set([...regKeys, ...plan.keep.map(p => p.key), ...plan.refresh.map(e => e.key)]);
    const rosterItems = async (gkey, via) => {
      const [region, slug] = gkey.split('/');
      const roster = await get(tok, region, `/data/wow/guild/${encodeURIComponent(slug)}/roster`).catch(err => { console.warn(`· guilde ${gkey} : ${err.message}`); return null; });
      queue.guilds[gkey] = day;
      return (roster?.members ?? []).map(m => m.character).filter(c => c?.slug && (c.level ?? 0) >= 10)
        .map(c => ({ key: `${region}/${c.slug.toLowerCase()}`, via, l: c.level }));
    };
    // guildes suivies : celles pas relues depuis QUEUE.GUILD_EVERY jours, FOLLOW_MAX par mise à jour (la liste en compte des dizaines de milliers)
    const dueFollow = guilds.map(g => String(g).toLowerCase()).filter(g => (queue.guilds[g] ?? -1e9) < day - QUEUE.GUILD_EVERY).slice(0, FOLLOW_MAX);
    for (const g of dueFollow) qAdd += enqueue(queue, await rosterItems(g, 'follow'), shown, optout, day);
    const scouted = await readJson(join(ROOT, 'data/scouted.json'), { players: {} });
    qAdd += enqueue(queue, Object.entries(scouted.players ?? {}).filter(([, v]) => (v.d ?? 0) >= day - 30 && (v.l ?? 0) >= 10)
      .map(([key, v]) => ({ key, via: 'scout', l: v.l })), shown, optout, day);
    for (const g of guildsToRead([...prevList.filter(p => regKeys.has(p.key)), ...plan.keep, ...prevList.filter(p => plan.refresh.some(e => e.key === p.key))], queue, day))
      qAdd += enqueue(queue, await rosterItems(g, 'guild'), shown, optout, day);
    for (const k of shown) delete queue.players[k];
    // réglages de la page admin (data/settings.json), sinon les valeurs par défaut
    const settings = await readJson(join(ROOT, 'data/settings.json'), {});
    const NEW = Number.isInteger(settings.newPerRun) ? settings.newPerRun : QUEUE.NEW;
    const MAX = Number.isInteger(settings.maxPreviews) ? settings.maxPreviews : QUEUE.MAX_PREVIEWS;
    const room = Math.max(0, MAX - plan.count);
    fresh = nextFromQueue(queue, Math.min(NEW, room));
    run = { t: new Date().toISOString(), added: qAdd, refreshed: plan.refresh.length, kept: plan.keep.length, fresh: fresh.length, previews: plan.count };
    console.log(`file : ${Object.keys(queue.players).length} en attente (+${qAdd}) · aperçus : ${plan.count} (${plan.refresh.length} relus, ${plan.keep.length} gardés) · nouveaux : ${fresh.length}`);
    entries.push(...plan.refresh, ...fresh);
    for (const e of fresh) delete queue.players[e.key];
  } else {
    const out = k => regKeys.has(k) || optout.has(k);
    srvPlayers = srv.players.filter(p => validEntryKey(p.key) && !out(p.key));                       // tout ce que le relevé a lu
    const read = new Set(srvPlayers.map(p => p.key));
    const keep = prevList.filter(p => p.preview && !out(p.key) && !read.has(p.key));                 // pas encore relus : gardés tels quels
    plan = { keep, refresh: [], count: keep.length + srvPlayers.length };
    run = { t: new Date().toISOString(), mode, added: 0, refreshed: 0, kept: keep.length, fresh: srvPlayers.length, previews: plan.count };
    console.log(`aperçus : ${plan.count} (${srvPlayers.length} du relevé serveur, ${keep.length} gardés en attendant leur relecture)`);
  }
  // un personnage retiré ne garde pas d'historique
  for (const k of optout) { const [r, s] = k.split('/'); await rm(join(ROOT, 'data/history', r, `${s}.json`), { force: true }); }

  // relevé précédent : pour dater les nouveaux loots
  const prevPlayers = new Map(prevList.map(p => [p.key, p]));
  await pool(entries, 6, async e => {
    // une erreur passagère de l'API (500, délai) ne fait plus échouer tout le relevé : on garde la dernière fiche,
    // ou le nouveau retourne dans la file pour le relevé suivant
    let c;
    try { c = await fetchCharacter(tok, e.region, e.slug); }
    catch (err) {
      console.warn(`· ${e.key} : API indisponible (${err.message}), gardé pour le prochain relevé`);
      const old = prevPlayers.get(e.key);
      if (old) players.push(old);
      else if (e.queued) queue.players[e.key] = { via: e.via, l: 0, a: day };
      return;
    }
    if (!c) {
      // conditions Blizzard : un personnage qui n'existe plus n'est ni affiché ni conservé
      await rm(join(ROOT, 'data/history', e.region, `${e.slug}.json`), { force: true });
      console.warn(`· ${e.key} : introuvable (niveau < 10, pas encore visible ou supprimé)`);
      if (e.preview) queue.gone[e.key] = day;
      return;
    }
    const upRaw = uploads[e.key] ?? uploads[e.slug];
    const up = weaponFloor(upRaw, await readJson(join(ROOT, 'data/history', e.region, `${e.slug}.json`), []));
    const s = score(c, up);
    const asset = key => c.media?.assets?.find(a => a.key === key)?.value ?? null;

    // historique : un point par jour (ancien emplacement data/history/{slug}.json repris une fois)
    const hdir = join(ROOT, 'data/history', e.region), hfile = join(hdir, `${e.slug}.json`), old = join(ROOT, 'data/history', `${e.slug}.json`);
    await mkdir(hdir, { recursive: true });
    if (!existsSync(hfile) && e.region === 'eu' && existsSync(old)) await rename(old, hfile);
    // conditions Blizzard : rien de plus vieux que 30 jours (par date, pas par nombre de points)
    const cutoff = new Date(Date.now() - (HISTORY_DAYS - 1) * 864e5).toISOString().slice(0, 10);
    const hist = (await readJson(hfile, [])).filter(h => h.d >= cutoff);
    const last = hist[hist.length - 1];
    // chaque compétence du jour aussi (gain sur 7 jours par ligne de l'image Hiscores)
    const snap = skillSnapshot(s);
    const hkNow = pickStats(c.achStats)?.hk ?? c.pvp?.honorable_kills ?? null;   // armurerie : référence des victoires honorables
    // semaine JcJ de l'addon (honneur, victoires), seulement si la ligne a moins de 2 jours : saison semaine par semaine
    const pw = up?.pvp && up.at && Date.now() - Date.parse(up.at) < 2 * 864e5 ? [up.pvp.honorWeek ?? 0, up.pvp.hkWeek ?? 0] : null;
    // chasse confirmée par l'équipement porté (étape 2 des défis de la semaine)
    const hc = huntCheck(last, today, (up?.hunt ?? []).map(h => h.id), s.gear.map(g => g[1]));
    if (last?.d === today) { last.t = s.total; last.s = snap; if (hkNow != null) last.hk = hkNow; if (pw) last.pw = pw; delete last.hq; delete last.hf; Object.assign(last, hc); }
    else hist.push({ d: today, t: s.total, s: snap, ...(hkNow != null ? { hk: hkNow } : {}), ...(pw ? { pw } : {}), ...hc });
    await writeFile(hfile, JSON.stringify(hist));

    const p = c.profile;
    players.push({
      key: e.key, region: e.region, slug: e.slug, name: p.name, surname: p.surname,
      class: p.character_class?.name, classId: p.character_class?.id ?? null, race: p.race?.name, raceId: p.race?.id ?? null,
      gender: p.gender?.type ?? null, faction: p.faction?.type,
      guild: p.guild ? { name: p.guild.name, slug: p.guild.slug } : null,
      ruleset: p.ruleset?.name ?? null, rulesetId: p.ruleset?.id ?? null,
      ...s, stats: pickStats(c.achStats), reps: e.preview ? pickReps(c.reputations).slice(0, 5) : pickReps(c.reputations), history: hist,
      render: asset('main-raw'), avatar: asset('avatar'), inset: asset('inset'),   // buste : image des aperçus de liens
      ...(e.preview ? { preview: true, via: e.via ?? 'follow' } : {}), fetched: day,
      // /played : seulement si le joueur l'a laissé dans sa ligne Dropamine (case cochée dans l'addon)
      ...(up?.played > 0 ? { played: up.played, playedAt: up.at ?? null } : {}),
      // JcJ de l'armurerie (pour tous) ; le reste vient de la ligne Dropamine, groupe par groupe (cases de l'addon)
      ...(c.pvp ? { pvpArmory: { hk: c.pvp.honorable_kills ?? 0, rank: c.pvp.pvp_rank ?? 0 } } : {}),
      ...(() => { const l = newLoots(prevPlayers.get(e.key), up, today); return l.length ? { loots: l } : {}; })(),
      // huntSite : liste d'objets recherchés modifiée sur le site (pas encore dans le jeu)
      ...(up ? { dropamine: Object.fromEntries(['collection', 'achievements', 'records', 'hunt', 'huntSite', 'pvp', 'lc'].filter(k => up[k]).map(k => [k, up[k]])), dropamineAt: up.at ?? null } : {}),
    });
    console.log(`✓ ${e.key} : ${s.total}${s.complete ? '' : ' (estimé)'}${e.preview ? ' [aperçu]' : ''}`);
  });

  players.push(...srvPlayers);
  const done = new Set(players.map(p => p.key));
  // aperçus gardés tels quels : leur fiche complète vient du site en ligne (l'index n'a plus tout)
  await pool(plan.keep.filter(p => !done.has(p.key)), 16, async p => {
    let full = null;
    try {
      const r = await fetch(`https://dropamine.app/${detailPath(p).split('/').map(encodeURIComponent).join('/')}?v=${day}`);
      if (r.ok) full = await r.json();
    } catch { /* hors ligne */ }
    players.push(full && full.key === p.key ? full : p);
  });
  for (const [k, d] of Object.entries(queue.gone)) if (d < day - QUEUE.GONE_DAYS) delete queue.gone[k];
  for (const [k, d] of Object.entries(queue.guilds)) if (d < day - 60) delete queue.guilds[k];
  run.waiting = Object.keys(queue.players).length; run.published = players.length;
  run.notFound = Object.values(queue.gone).filter(d => d === day).length;
  queue.runs = [run, ...(queue.runs ?? [])].slice(0, 20);
  await writeFile(join(ROOT, 'data/queue.json'), JSON.stringify({ _comment: 'File d\'attente des aperçus (scripts/build.mjs, QUEUE) : écrite par le relevé.', ...queue }));
  players.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  await mkdir(join(ROOT, 'site/data'), { recursive: true });
  const updated = new Date().toISOString(), index = JSON.stringify({ updated, players: players.map(indexPlayer) });
  await writeFile(join(ROOT, 'site/data/hiscores.json'), index);
  const home = JSON.stringify(homeIndex(players, updated));
  await writeFile(join(ROOT, 'site/data/home.json'), home);
  await rm(join(ROOT, 'site/data/c'), { recursive: true, force: true });
  for (const p of players) {
    const f = join(ROOT, 'site', detailPath(p));
    await mkdir(dirname(f), { recursive: true });
    await writeFile(f, JSON.stringify(detailPlayer(p)));
  }
  console.log(`${players.length} personnage(s) : index ${(index.length / 1e6).toFixed(2)} Mo (site/data/hiscores.json), fiches dans site/data/c/`);

  await writeFile(join(ROOT, 'site/sitemap.xml'), sitemap(players, today));
  // aperçus de liens par personnage (WhatsApp, Discord…) : site/c/<région>/<slug>/
  const { writePreviews } = await import('./preview.mjs');
  console.log(`aperçus de liens : ${await writePreviews(ROOT, players)} page(s)`);
  await stampAssets();

  // Nouveautés : le CHANGELOG public de l'addon (une erreur ici ne bloque pas le classement)
  try {
    const res = await fetch(CHANGELOG_URL);
    if (!res.ok) throw new Error(res.status);
    const versions = parseChangelog(await res.text());
    const fr = await fetch(CHANGELOG_FR_URL).then(r => r.ok ? r.text() : '').catch(() => '');
    const versionsFr = fr ? parseChangelog(fr) : [];
    await writeFile(join(ROOT, 'site/data/changelog.json'), JSON.stringify({ updated: new Date().toISOString(), versions, versionsFr }, null, 1));
    console.log(`changelog : ${versions.length} version(s)`);
  } catch (err) { console.warn(`· changelog non mis à jour (${err.message})`); }

  // Objets du collection log (noms, icônes, infobulles) : cache mis à jour par petites portions (une erreur ne bloque rien)
  try {
    const { updateItems } = await import('./items.mjs');
    const { updateArt } = await import('./items.mjs');
    await updateItems(tok, players, 800);
    await updateArt(tok);
  } catch (err) { console.warn(`· objets non mis à jour (${err.message})`); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
}
