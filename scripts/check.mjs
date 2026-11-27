// Dropamine Hiscores — vérification légère, chaque heure : l'armurerie a-t-elle bougé depuis la dernière publication ?
// Pour chaque personnage publié : 3 petits appels (fiche, métiers, statistiques), comparés au site en ligne.
// Rien n'a changé → on s'arrête là (pas de reconstruction, pas de commit). Sinon → « changed=true » pour le workflow.
// L'armurerie de Blizzard ne se met à jour qu'à la déconnexion : c'est ce moment qu'on attrape.
import { appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { token, get } from './build.mjs';

const SITE = 'https://dropamine.app/data/hiscores.json';

// métiers de l'API : { id: rang }
export function apiProfs(professions) {
  const out = {};
  for (const g of [...(professions?.primaries ?? []), ...(professions?.secondaries ?? [])]) {
    const id = g.profession?.id; if (!id) continue;
    const pts = g.tiers?.[0]?.skill_points;   // comme build.mjs (score)
    if (Number.isFinite(pts)) out[id] = Math.max(out[id] ?? 0, pts);
  }
  return out;
}

// ce qui diffère entre le site publié et l'armurerie (vide = rien à faire)
export function diffPlayer(pub, api) {
  const d = [];
  if (api.level && api.level !== pub.level) d.push(`niveau ${pub.level} → ${api.level}`);
  if (api.defense && api.defense !== (pub.defense ?? 0)) d.push(`défense ${pub.defense ?? 0} → ${api.defense}`);
  const mine = Object.fromEntries((pub.professions ?? []).map(p => [p.id, p.skill]));
  for (const [id, v] of Object.entries(api.profs ?? {})) if ((mine[id] ?? 0) !== v) d.push(`métier ${id} ${mine[id] ?? 0} → ${v}`);
  return d;
}

async function main() {
  const out = async v => { if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${v}\n`); };
  const res = await fetch(`${SITE}?nc=${Date.now()}`);
  if (!res.ok) { console.log(`site illisible (${res.status}) : reconstruction`); return out(true); }
  const pub = await res.json();
  const tok = await token();
  let changed = false;
  for (const p of pub.players ?? []) {
    const base = `/profile/wow/character/${encodeURIComponent(p.slug)}`;
    try {
      const [summary, profs, stats] = await Promise.all([get(tok, p.region, base), get(tok, p.region, base + '/professions'), get(tok, p.region, base + '/statistics')]);
      if (!summary) continue;
      const d = diffPlayer(p, { level: summary.level, defense: stats?.defense?.base, profs: apiProfs(profs) });
      if (d.length) { changed = true; console.log(`${p.key} : ${d.join(', ')}`); }
    } catch (err) { console.warn(`· ${p.key} : ${err.message}`); }
  }
  console.log(changed ? 'armurerie changée : reconstruction' : 'rien de neuf : pas de reconstruction');
  return out(changed);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(err => { console.error(err.message); process.exit(1); });
