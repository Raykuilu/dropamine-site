// Aperçus de liens : personnages site/c/<région>/<slug>/, guildes site/g/<région>/<slug>/, sections (/classements/…)
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

// la page minuscule : balises d'aperçu, puis renvoi immédiat vers la vraie page du site
function stubHtml({ title, desc, img, path, url, type = 'website', large = false, label }) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Dropamine">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="${esc(SITE + path)}">
<meta name="twitter:card" content="${large ? 'summary_large_image' : 'summary'}">
<meta name="theme-color" content="#110d09">
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(url)}">
<meta http-equiv="refresh" content="0; url=${esc(url)}">
<script>location.replace(${JSON.stringify(url)});</script>
</head><body><a href="${esc(url)}">${esc(label || title)}</a></body></html>
`;
}
const ordFr = n => `${n}${n === 1 ? 'er' : 'e'}`;

// ---- guildes : site/g/<région>/<slug>/
export const guildPath = (region, slug) => `/g/${region || 'eu'}/${previewSlug(slug)}/`;
export function guildPreviewHtml(g, rank) {
  const region = g.region || 'eu', m = g.members;
  const url = `${SITE}/?p=guild${region !== 'eu' ? '&r=' + region : ''}&g=${encodeURIComponent(g.slug)}`;
  const title = `${g.name} · guilde ${region.toUpperCase()} · ${m.length} membre${m.length > 1 ? 's' : ''} · Dropamine`;
  const best = [...m].sort((a, b) => b.total - a.total)[0], n60 = m.filter(p => p.level >= 60).length;
  const desc = [`${ordFr(rank)} guilde au niveau total (${num(g.total)})`, n60 ? `${n60} au niveau 60` : null,
    best ? `meilleur : ${[best.name, best.surname].filter(Boolean).join(' ')} (${num(best.total)})` : null, 'WoW Forever'].filter(Boolean).join(' · ');
  return stubHtml({ title, desc, img: `${SITE}/img/og-guild.png`, path: guildPath(region, g.slug), url, large: true, label: g.name });
}

// ---- sections du site : /classements/, /guildes/, /groupes/, /nouveautes/
export const SECTIONS = [
  { dir: 'classements', p: 'rank', img: 'og.jpg', title: 'Classements · Dropamine Hiscores', desc: n => `${num(n.players)} personnages de WoW Forever classés compétence par compétence, vérifiés par l’armurerie officielle.` },
  { dir: 'guildes', p: 'guild', img: 'og-guild.png', title: 'Classement des guildes · Dropamine', desc: n => `${num(n.guilds)} guildes de WoW Forever classées : niveau total, niveaux 60, victoires honorables, métiers.` },
  { dir: 'groupes', p: 'runs', img: 'og.jpg', title: 'Groupes de donjon · Dropamine', desc: () => 'Trouve ceux qui doivent faire les mêmes donjons que toi : sorties prévues, rôles, rappels.' },
  { dir: 'nouveautes', p: 'news', img: 'og.jpg', title: 'Nouveautés de l’addon · Dropamine', desc: () => 'Les dernières versions de Dropamine, l’addon WoW Forever qui fête chaque +1.' },
];
export const sectionHtml = (sec, counts) => stubHtml({ title: sec.title, desc: sec.desc(counts), img: `${SITE}/img/${sec.img}`, path: `/${sec.dir}/`, url: `${SITE}/?p=${sec.p}`, large: true });

export function previewHtml(p, rank) {
  const name = [p.name, p.surname].filter(Boolean).join(' ');
  const url = `${SITE}/?p=char&c=${encodeURIComponent((p.region || 'eu') + '/' + p.slug)}`;
  const title = `${name} · ${num(p.total)} / ${num(p.max || 2460)} · Dropamine Hiscores`;
  const top = [...(p.professions || [])].sort((a, b) => b.skill - a.skill).slice(0, 2).map(x => `${PROF_FR[x.id] || x.name} ${x.skill}`);
  const desc = [[p.class, String(p.race || '').toLowerCase()].filter(Boolean).join(' ') + ` · niveau ${p.level}`, p.guild?.name, rank ? `${rank}${rank === 1 ? 'er' : 'e'} au niveau total` : null, ...top]
    .filter(Boolean).join(' · ');
  const img = p.inset || p.avatar || `${SITE}/img/og.jpg`;
  return stubHtml({ title, desc, img, path: previewPath(p), url, type: 'profile', label: `${name} · Dropamine` });
}

// toutes les pages, refaites à chaque relevé (un personnage retiré perd la sienne)
export async function writePreviews(root, players) {
  const dir = join(root, 'site/c');
  await rm(dir, { recursive: true, force: true });
  const byRegion = new Map();
  for (const p of players) (byRegion.get(p.region || 'eu') ?? byRegion.set(p.region || 'eu', []).get(p.region || 'eu')).push(p);
  let n = 0;
  for (const list of byRegion.values()) {
    const rankOf = new Map([...list].sort((a, b) => b.total - a.total).map((p, i) => [p, i + 1]));   // même ordre que le classement du site
    for (const p of list) {
      if (!p.slug) continue;
      const r = rankOf.get(p) || 0;
      const d = join(dir, p.region || 'eu', previewSlug(p.slug));
      await mkdir(d, { recursive: true });
      await writeFile(join(d, 'index.html'), previewHtml(p, r || null));
      n++;
    }
  }
  // guildes (par région, même ordre que le classement des guildes du site)
  await rm(join(root, 'site/g'), { recursive: true, force: true });
  let guildCount = 0;
  for (const [region, list] of byRegion) {
    const m = new Map();
    for (const p of list) if (p.guild?.slug) (m.get(p.guild.slug) ?? m.set(p.guild.slug, { ...p.guild, region, members: [] }).get(p.guild.slug)).members.push(p);
    const gs = [...m.values()].map(g => ({ ...g, total: g.members.reduce((t, p) => t + p.total, 0) })).sort((a, b) => b.total - a.total);
    for (const [i, g] of gs.entries()) {
      const d = join(root, 'site/g', region, previewSlug(g.slug));
      await mkdir(d, { recursive: true });
      await writeFile(join(d, 'index.html'), guildPreviewHtml(g, i + 1));
      n++; guildCount++;
    }
  }
  // sections
  for (const sec of SECTIONS) {
    const d = join(root, 'site', sec.dir);
    await mkdir(d, { recursive: true });
    await writeFile(join(d, 'index.html'), sectionHtml(sec, { players: players.length, guilds: guildCount }));
    n++;
  }
  return n;
}
