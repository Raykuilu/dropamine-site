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
  };
}

// valeurs du jour, en clés courtes : l = niveau, d = Défense, p{id} = métier, w{arme} = arme (sauf estimations)
export function skillSnapshot(s) {
  const o = { l: s.level, d: s.defense };
  for (const p of s.professions ?? []) o['p' + p.id] = p.skill;
  for (const w of s.weaponList ?? []) if (!w.est) o['w' + w.id] = w.rank;
  return o;
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

// Guildes suivies (data/guilds.json) → personnages à montrer en aperçu : niveau 10+, ni inscrits, ni retirés
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
  const rosters = [];
  for (const g of guilds) {
    const [region, slug] = String(g).toLowerCase().split('/');
    const roster = await get(tok, region, `/data/wow/guild/${encodeURIComponent(slug)}/roster`).catch(err => { console.warn(`· guilde ${g} : ${err.message}`); return null; });
    if (roster) { rosters.push({ region, roster }); console.log(`guilde ${g} : ${roster.members?.length ?? 0} membre(s)`); }
  }
  entries.push(...previewEntries(rosters, new Set(entries.map(e => e.key)), optout));
  // un personnage retiré ne garde pas d'historique
  for (const k of optout) { const [r, s] = k.split('/'); await rm(join(ROOT, 'data/history', r, `${s}.json`), { force: true }); }

  await pool(entries, 6, async e => {
    const c = await fetchCharacter(tok, e.region, e.slug);
    if (!c) {
      // conditions Blizzard : un personnage qui n'existe plus n'est ni affiché ni conservé
      await rm(join(ROOT, 'data/history', e.region, `${e.slug}.json`), { force: true });
      console.warn(`· ${e.key} : introuvable (niveau < 10, pas encore visible ou supprimé)`);
      return;
    }
    const up = uploads[e.key] ?? uploads[e.slug];
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
    if (last?.d === today) { last.t = s.total; last.s = snap; } else hist.push({ d: today, t: s.total, s: snap });
    await writeFile(hfile, JSON.stringify(hist));

    const p = c.profile;
    players.push({
      key: e.key, region: e.region, slug: e.slug, name: p.name, surname: p.surname,
      class: p.character_class?.name, classId: p.character_class?.id ?? null, race: p.race?.name, raceId: p.race?.id ?? null,
      gender: p.gender?.type ?? null, faction: p.faction?.type,
      guild: p.guild ? { name: p.guild.name, slug: p.guild.slug } : null,
      ruleset: p.ruleset?.name ?? null, rulesetId: p.ruleset?.id ?? null,
      ...s, stats: pickStats(c.achStats), reps: pickReps(c.reputations), history: hist,
      render: asset('main-raw'), avatar: asset('avatar'),
      ...(e.preview ? { preview: true } : {}),
      // /played : seulement si le joueur l'a laissé dans sa ligne Dropamine (case cochée dans l'addon)
      ...(up?.played > 0 ? { played: up.played, playedAt: up.at ?? null } : {}),
      // JcJ de l'armurerie (pour tous) ; le reste vient de la ligne Dropamine, groupe par groupe (cases de l'addon)
      ...(c.pvp ? { pvpArmory: { hk: c.pvp.honorable_kills ?? 0, rank: c.pvp.pvp_rank ?? 0 } } : {}),
      ...(up ? { dropamine: Object.fromEntries(['collection', 'achievements', 'records', 'hunt'].filter(k => up[k]).map(k => [k, up[k]])), dropamineAt: up.at ?? null } : {}),
    });
    console.log(`✓ ${e.key} : ${s.total}${s.complete ? '' : ' (estimé)'}${e.preview ? ' [aperçu]' : ''}`);
  });

  players.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  await mkdir(join(ROOT, 'site/data'), { recursive: true });
  await writeFile(join(ROOT, 'site/data/hiscores.json'),
    JSON.stringify({ updated: new Date().toISOString(), players }, null, 1));
  console.log(`${players.length} personnage(s) écrit(s) dans site/data/hiscores.json`);

  await writeFile(join(ROOT, 'site/sitemap.xml'), sitemap(players, today));
  await stampAssets();

  // Nouveautés : le CHANGELOG public de l'addon (une erreur ici ne bloque pas le classement)
  try {
    const res = await fetch(CHANGELOG_URL);
    if (!res.ok) throw new Error(res.status);
    const versions = parseChangelog(await res.text());
    await writeFile(join(ROOT, 'site/data/changelog.json'), JSON.stringify({ updated: new Date().toISOString(), versions }, null, 1));
    console.log(`changelog : ${versions.length} version(s)`);
  } catch (err) { console.warn(`· changelog non mis à jour (${err.message})`); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
}
