// Dropamine Hiscores — récupère les personnages inscrits via l'API Blizzard (WoW Forever),
// calcule leur niveau total à la façon de Dropamine et écrit les données du site.
//
// Entrée  : data/registry.json   (personnages inscrits, par identifiant {prénom}-{nom})
// Sorties : site/data/hiscores.json   (classement + fiches, lu par le site)
//           data/history/{slug}.json  (un point par jour, pour les courbes ; versionné)
//
// Secrets : BNET_CLIENT_ID / BNET_CLIENT_SECRET (variables d'environnement, jamais écrites).
// Node 20+ (fetch natif), aucune dépendance.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGION = 'eu';
const NS = `profile-forever-${REGION}`;
const API = `https://${REGION}.api.blizzard.com`;
const LOCALE = 'fr_FR';
const WEAPON_CLASS = 2;          // item_class « Arme »
const TOTAL_MAX = 2460;          // niveau total maximum de Dropamine
const HISTORY_DAYS = 120;        // points gardés par personnage

// ---------------------------------------------------------------------------
async function token() {
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

async function get(tok, path) {
  const sep = path.includes('?') ? '&' : '?';
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}${path}${sep}namespace=${NS}&locale=${LOCALE}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 404) return null;                       // personnage < niveau 10, ou pas encore visible
    if (res.status === 429) { await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return res.json();
  }
  throw new Error(`${path} → trop de requêtes`);
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
  // quelques statistiques de l'armurerie, par nom de catégorie/statistique (fr_FR)
  const want = { 'Créatures tuées': 'kills', 'Quêtes achevées': 'quests', 'Nombre total de morts': 'deaths', 'Trajets aériens empruntés': 'flights' };
  const out = {};
  const walk = cats => cats?.forEach(c => {
    c.statistics?.forEach(s => { if (want[s.name]) out[want[s.name]] = Math.round(s.quantity); });
    walk(c.sub_categories);
  });
  walk(achStats?.categories);
  return out;
}

// ---------------------------------------------------------------------------
async function main() {
  const registry = JSON.parse(await readFile(join(ROOT, 'data/registry.json'), 'utf8'));
  const uploads = existsSync(join(ROOT, 'data/uploads.json')) ? JSON.parse(await readFile(join(ROOT, 'data/uploads.json'), 'utf8')) : {};
  const tok = await token();
  const today = new Date().toISOString().slice(0, 10);
  const players = [];

  for (const slug of registry.characters) {
    const base = `/profile/wow/character/${encodeURIComponent(slug)}`;
    const profile = await get(tok, base);
    if (!profile) { console.warn(`· ${slug} : introuvable (niveau < 10 ou pas encore visible)`); continue; }
    const [professions, equipment, statistics, achStats] = await Promise.all([
      get(tok, `${base}/professions`), get(tok, `${base}/equipment`),
      get(tok, `${base}/statistics`), get(tok, `${base}/achievements/statistics`),
    ]);
    const s = score({ profile, professions, equipment, statistics }, uploads[slug]);

    // historique : un point par jour
    const hfile = join(ROOT, `data/history/${slug}.json`);
    const hist = existsSync(hfile) ? JSON.parse(await readFile(hfile, 'utf8')) : [];
    const last = hist[hist.length - 1];
    if (last?.d === today) last.t = s.total; else hist.push({ d: today, t: s.total });
    await writeFile(hfile, JSON.stringify(hist.slice(-HISTORY_DAYS)));

    players.push({
      slug, name: profile.name, surname: profile.surname,
      class: profile.character_class?.name, race: profile.race?.name, faction: profile.faction?.type,
      guild: profile.guild ? { name: profile.guild.name, slug: profile.guild.slug } : null,
      ruleset: profile.ruleset?.name, ...s, stats: pickStats(achStats), history: hist.slice(-30),
    });
    console.log(`✓ ${slug} : ${s.total}${s.complete ? '' : ' (estimé)'}`);
  }

  players.sort((a, b) => b.total - a.total || a.slug.localeCompare(b.slug));
  players.forEach((p, i) => { p.rank = i + 1; });

  await mkdir(join(ROOT, 'site/data'), { recursive: true });
  await writeFile(join(ROOT, 'site/data/hiscores.json'),
    JSON.stringify({ updated: new Date().toISOString(), region: REGION, players }, null, 1));
  console.log(`${players.length} personnage(s) écrit(s) dans site/data/hiscores.json`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error('ÉCHEC :', e.message); process.exit(1); });
}
