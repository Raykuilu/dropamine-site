// Aperçus de liens par personnage : site/c/<région>/<slug>/index.html
// Une page minuscule avec ses balises Open Graph (titre, résumé, buste 3D) pour WhatsApp, Discord, etc.,
// qui renvoie aussitôt vers la fiche du personnage. Générées à chaque relevé, jamais versionnées.
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const SITE = 'https://dropamine.app';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = n => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
// métiers en français (identifiants de l'API)
const PROF_FR = { 164: 'Forge', 165: 'Travail du cuir', 171: 'Alchimie', 182: 'Herboristerie', 185: 'Cuisine', 186: 'Minage', 197: 'Couture', 202: 'Ingénierie', 333: 'Enchantement', 356: 'Pêche', 393: 'Dépeçage', 129: 'Secourisme' };
// dossier sans accents (« disciplïne » → « discipline ») : adresse sûre partout
export const previewSlug = slug => String(slug).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9-]/g, '');
export const previewPath = p => `/c/${p.region || 'eu'}/${previewSlug(p.slug)}/`;

export function previewHtml(p, rank) {
  const name = [p.name, p.surname].filter(Boolean).join(' ');
  const url = `${SITE}/?p=char&c=${encodeURIComponent((p.region || 'eu') + '/' + p.slug)}`;
  const title = `${name} · ${num(p.total)} / ${num(p.max || 2460)} · Dropamine Hiscores`;
  const top = [...(p.professions || [])].sort((a, b) => b.skill - a.skill).slice(0, 2).map(x => `${PROF_FR[x.id] || x.name} ${x.skill}`);
  const desc = [[p.class, String(p.race || '').toLowerCase()].filter(Boolean).join(' ') + ` · niveau ${p.level}`, p.guild?.name, rank ? `${rank}${rank === 1 ? 'er' : 'e'} au niveau total` : null, ...top]
    .filter(Boolean).join(' · ');
  const img = p.inset || p.avatar || `${SITE}/img/og.jpg`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="Dropamine">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="${esc(SITE + previewPath(p))}">
<meta name="twitter:card" content="summary">
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(url)}">
<meta http-equiv="refresh" content="0; url=${esc(url)}">
<script>location.replace(${JSON.stringify(url)});</script>
</head><body><a href="${esc(url)}">${esc(name)} · Dropamine</a></body></html>
`;
}

// toutes les pages, refaites à chaque relevé (un personnage retiré perd la sienne)
export async function writePreviews(root, players) {
  const dir = join(root, 'site/c');
  await rm(dir, { recursive: true, force: true });
  const byRegion = new Map();
  for (const p of players) (byRegion.get(p.region || 'eu') ?? byRegion.set(p.region || 'eu', []).get(p.region || 'eu')).push(p);
  let n = 0;
  for (const list of byRegion.values()) {
    const ranked = [...list].sort((a, b) => b.total - a.total);   // même ordre que le classement du site
    for (const p of list) {
      if (!p.slug) continue;
      const r = ranked.indexOf(p) + 1;
      const d = join(dir, p.region || 'eu', previewSlug(p.slug));
      await mkdir(d, { recursive: true });
      await writeFile(join(d, 'index.html'), previewHtml(p, r || null));
      n++;
    }
  }
  return n;
}
