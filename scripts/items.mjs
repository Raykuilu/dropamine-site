// Cache des objets pour le collection log du site : nom (anglais, français), qualité, icône, lignes d'infobulle.
// Source : API Blizzard (catalogue Classic pour le nom et l'infobulle, catalogue Forever pour l'icône).
// Les objets propres à Forever n'ont pas de fiche dans l'API : nom anglais repris d'AtlasLoot (loot.json « names »).
// Conditions Blizzard : rien de plus vieux que 30 jours, donc chaque fiche porte sa date et est rafraîchie.
//   node scripts/items.mjs [limite]   (BNET_CLIENT_ID / BNET_CLIENT_SECRET dans l'environnement)
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ITEMS_FILE = join(ROOT, 'site/data/items.json');
const MAX_AGE_DAYS = 25;   // marge sous les 30 jours

const L = o => o ? [o.en_US ?? '', o.fr_FR ?? o.en_US ?? ''] : null;
const line = (o, c) => { const v = L(o); return v && v[0] ? (c ? [...v, c] : v) : null; };
const hex = c => c ? '#' + [c.r, c.g, c.b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('') : null;

// une fiche compacte : { n: [en, fr], q: 'RARE', ic: 'chemin d'icône', t: [[en, fr, couleur?], …], d: 'AAAA-MM-JJ' }
export function compact(item, iconPath, today) {
  const p = item?.preview_item ?? {};
  const t = [];
  const push = x => { if (x) t.push(x); };
  push(line(p.binding?.name));
  const slot = L(p.inventory_type?.name), sub = L(p.item_subclass?.name);
  if (slot?.[0] || sub?.[0]) t.push([[slot?.[0], sub?.[0]].filter(Boolean).join(' · '), [slot?.[1], sub?.[1]].filter(Boolean).join(' · ')]);
  push(line(p.armor?.display?.display_string));
  if (p.weapon) {
    const w = [L(p.weapon.damage?.display_string), L(p.weapon.attack_speed?.display_string)].filter(Boolean);
    if (w.length) t.push([w.map(x => x[0]).join(' · '), w.map(x => x[1]).join(' · ')]);
    push(line(p.weapon.dps?.display_string));
  }
  for (const s of p.stats ?? []) push(line(s.display?.display_string, s.is_negated ? '#ff2020' : hex(s.display?.color) === '#ffffff' ? null : hex(s.display?.color)));
  for (const s of p.spells ?? []) push(line(s.description, '#1eff00'));
  push(line(p.requirements?.level?.display_string));
  if (p.description) push(line(p.description, '#ffd100'));
  return { n: L(item?.name ?? p.name) ?? ['', ''], q: item?.quality?.type ?? p.quality?.type ?? null, ic: iconPath ?? null, t, d: today };
}

async function api(tok, path, ns) {
  const url = `https://eu.api.blizzard.com${path}?namespace=${ns}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 404) return null;
    if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 1200 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return res.json();
  }
  return null;
}

export async function fetchItem(tok, id, today, names = {}) {
  const [item, media] = await Promise.all([api(tok, `/data/wow/item/${id}`, 'static-classic-eu'), api(tok, `/data/wow/media/item/${id}`, 'static-forever-eu')]);
  const icon = media?.assets?.find(a => a.key === 'icon')?.value?.replace(/^https:\/\/render\.worldofwarcraft\.com\//, '') ?? null;
  if (!item && !icon && !names[id]) return null;
  const c = compact(item, icon, today);
  if (!item && names[id]) c.n = [names[id], names[id]];   // objet propre à Forever : nom anglais d'AtlasLoot
  return c;
}

async function pool(list, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) await fn(list[i++]); }));
}

// identifiants à connaître : toutes les tables de butin, plus ce que les joueurs ont envoyé (obtenus, chasse)
export async function wantedIds(players = []) {
  const ids = new Set();
  const loot = existsSync(join(ROOT, 'site/data/loot.json')) ? JSON.parse(await readFile(join(ROOT, 'site/data/loot.json'), 'utf8')) : { dungeons: [] };
  for (const d of loot.dungeons) for (const b of d.bosses) for (const e of b.i) ids.add(Array.isArray(e) ? e[0] : e);
  for (const p of players) {
    for (const id of p.dropamine?.collection?.items ?? []) ids.add(id);
    for (const h of p.dropamine?.hunt ?? []) if (h.id) ids.add(h.id);
  }
  return { ids: [...ids].filter(n => Number.isInteger(n) && n > 0).sort((a, b) => a - b), names: loot.names ?? {} };
}

// met à jour le cache : objets absents d'abord, puis les plus anciens ; « limit » appels d'objets au plus par passage
export async function updateItems(tok, players = [], limit = 800) {
  const today = new Date().toISOString().slice(0, 10);
  const cache = existsSync(ITEMS_FILE) ? JSON.parse(await readFile(ITEMS_FILE, 'utf8')) : {};
  const { ids, names } = await wantedIds(players);
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString().slice(0, 10);
  const todo = [...ids.filter(id => !cache[id]), ...ids.filter(id => cache[id] && cache[id].d < cutoff).sort((a, b) => cache[a].d.localeCompare(cache[b].d))].slice(0, limit);
  let done = 0, missing = 0;
  await pool(todo, 8, async id => {
    try { const c = await fetchItem(tok, id, today, names); if (c) { cache[id] = c; done++; } else missing++; }
    catch (e) { console.warn(`objet ${id} : ${e.message}`); }
  });
  // on garde seulement ce qui sert encore, et rien de plus vieux que 30 jours
  const keep = new Set(ids.map(String)), hard = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  for (const k of Object.keys(cache)) if (!keep.has(k) || cache[k].d < hard) delete cache[k];
  await writeFile(ITEMS_FILE, JSON.stringify(cache));
  console.log(`objets : ${done} mis à jour, ${missing} introuvables, ${Object.keys(cache).length} en cache (${ids.length} voulus)`);
  return cache;
}


// Illustrations des donjons : le journal des donjons de l'API Blizzard (Retail) a une vignette par donjon.
// On l'associe aux tables d'AtlasLoot par le nom (« Scarlet Monastery Library » → « Scarlet Monastery »).
export const ART_FILE = join(ROOT, 'site/data/art.json');
const norm = s => String(s).toLowerCase().replace(/^the\s+/, '').replace(/[^a-z]/g, '');
export async function updateArt(tok) {
  const loot = JSON.parse(await readFile(join(ROOT, 'site/data/loot.json'), 'utf8'));
  const idx = await api(tok, '/data/wow/journal-instance/index', 'static-eu');
  const list = (idx?.instances ?? []).map(i => ({ id: i.id, n: norm(i.name?.en_US ?? i.name) })).filter(i => i.n);
  const art = {};
  await pool(loot.dungeons, 6, async d => {
    const k = norm(d.name);
    const m = list.filter(i => k.startsWith(i.n)).sort((a, b) => b.n.length - a.n.length)[0]
      ?? list.filter(i => i.n.startsWith(k)).sort((a, b) => a.n.length - b.n.length)[0]   // « Onyxia » → « Onyxia's Lair »
      ?? list.filter(i => i.n.slice(0, 8) === k.slice(0, 8) && k.length >= 8)[0];          // « Dire Maul East » → « Dire Maul - … »
    if (!m) return;
    const media = await api(tok, `/data/wow/media/journal-instance/${m.id}`, 'static-eu');
    const url = media?.assets?.find(a => a.key === 'tile')?.value;
    if (url) art[d.key] = url.replace(/^https:\/\/render\.worldofwarcraft\.com\//, '');
  });
  await writeFile(ART_FILE, JSON.stringify(art));
  console.log(`illustrations : ${Object.keys(art).length} / ${loot.dungeons.length} donjons`);
  return art;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { token } = await import('./build.mjs');
  const players = existsSync(join(ROOT, 'site/data/hiscores.json')) ? JSON.parse(await readFile(join(ROOT, 'site/data/hiscores.json'), 'utf8')).players : [];
  const tok = await token();
  await updateItems(tok, players, Number(process.argv[2]) || 5000);
  await updateArt(tok);
}
