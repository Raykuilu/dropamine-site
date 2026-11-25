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

import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const REGIONS = ['eu', 'us', 'tw'];
const LOCALE = { eu: 'fr_FR', us: 'en_US', tw: 'zh_TW' };
const WEAPON_CLASS = 2;          // item_class « Arme »
const TOTAL_MAX = 2460;          // niveau total maximum de Dropamine
const HISTORY_DAYS = 120;        // points gardés par personnage
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

export async function get(tok, region, path) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://${region}.api.blizzard.com${path}${sep}namespace=profile-forever-${region}&locale=${LOCALE[region] || 'en_US'}`;
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
  const profTotal = profs.reduce((s, p) => s + p.skill, 0);
  const defense = statistics?.defense?.base ?? 0;

  let weapons, weaponsSource;
  if (upload && Number.isFinite(upload.weapons)) {
    weapons = upload.weapons; weaponsSource = 'dropamine';
  } else {
    // estimation : chaque type d'arme équipée compté au maximum (5 × niveau)
    const kinds = new Set((equipment?.equipped_items ?? [])
      .filter(i => i.item_class?.id === WEAPON_CLASS)
      .map(i => i.item_subclass?.id));
    weapons = kinds.size * 5 * level; weaponsSource = 'estimate';
  }
  const total = level + defense + weapons + profTotal;
  return {
    level, defense, weapons, weaponsSource, professions: profs,
    parts: { level, combat: defense + weapons, professions: profTotal },
    total, max: TOTAL_MAX, complete: weaponsSource === 'dropamine',
  };
}

function pickStats(achStats) {
  // quelques statistiques de l'armurerie (noms fr_FR / en_US)
  const want = { 'Créatures tuées': 'kills', 'Creatures killed': 'kills', 'Quêtes achevées': 'quests', 'Quests completed': 'quests',
    'Nombre total de morts': 'deaths', 'Total deaths': 'deaths', 'Trajets aériens empruntés': 'flights', 'Flight paths taken': 'flights' };
  const out = {};
  const walk = cats => cats?.forEach(c => {
    c.statistics?.forEach(s => { if (want[s.name]) out[want[s.name]] = Math.round(s.quantity); });
    walk(c.sub_categories);
  });
  walk(achStats?.categories);
  return out;
}

// Une fiche complète (utilisée aussi par l'inscription pour vérifier qu'un personnage existe)
export async function fetchCharacter(tok, region, slug) {
  const base = `/profile/wow/character/${encodeURIComponent(slug)}`;
  const profile = await get(tok, region, base);
  if (!profile) return null;
  const [professions, equipment, statistics, achStats, media] = await Promise.all([
    get(tok, region, `${base}/professions`), get(tok, region, `${base}/equipment`),
    get(tok, region, `${base}/statistics`), get(tok, region, `${base}/achievements/statistics`),
    get(tok, region, `${base}/character-media`).catch(() => null),   // rendu 3D : absent quelques heures après la création
  ]);
  return { profile, professions, equipment, statistics, achStats, media };
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

async function main() {
  const registry = await readJson(join(ROOT, 'data/registry.json'), { characters: [] });
  const uploads = await readJson(join(ROOT, 'data/uploads.json'), {});
  const tok = await token();
  const today = new Date().toISOString().slice(0, 10);
  const players = [];

  for (const raw of registry.characters) {
    const e = parseEntry(raw);
    if (!e) { console.warn(`· entrée ignorée : ${raw}`); continue; }
    const c = await fetchCharacter(tok, e.region, e.slug);
    if (!c) { console.warn(`· ${e.key} : introuvable (niveau < 10 ou pas encore visible)`); continue; }
    const s = score(c, uploads[e.key] ?? uploads[e.slug]);
    const asset = key => c.media?.assets?.find(a => a.key === key)?.value ?? null;

    // historique : un point par jour (ancien emplacement data/history/{slug}.json repris une fois)
    const hdir = join(ROOT, 'data/history', e.region), hfile = join(hdir, `${e.slug}.json`), old = join(ROOT, 'data/history', `${e.slug}.json`);
    await mkdir(hdir, { recursive: true });
    if (!existsSync(hfile) && e.region === 'eu' && existsSync(old)) await rename(old, hfile);
    const hist = await readJson(hfile, []);
    const last = hist[hist.length - 1];
    if (last?.d === today) last.t = s.total; else hist.push({ d: today, t: s.total });
    await writeFile(hfile, JSON.stringify(hist.slice(-HISTORY_DAYS)));

    const p = c.profile;
    players.push({
      key: e.key, region: e.region, slug: e.slug, name: p.name, surname: p.surname,
      class: p.character_class?.name, classId: p.character_class?.id ?? null, race: p.race?.name, raceId: p.race?.id ?? null,
      gender: p.gender?.type ?? null, faction: p.faction?.type,
      guild: p.guild ? { name: p.guild.name, slug: p.guild.slug } : null,
      ruleset: p.ruleset?.name ?? null, rulesetId: p.ruleset?.id ?? null,
      ...s, stats: pickStats(c.achStats), history: hist.slice(-30),
      render: asset('main-raw'), avatar: asset('avatar'),
    });
    console.log(`✓ ${e.key} : ${s.total}${s.complete ? '' : ' (estimé)'}`);
  }

  players.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  await mkdir(join(ROOT, 'site/data'), { recursive: true });
  await writeFile(join(ROOT, 'site/data/hiscores.json'),
    JSON.stringify({ updated: new Date().toISOString(), players }, null, 1));
  console.log(`${players.length} personnage(s) écrit(s) dans site/data/hiscores.json`);

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
