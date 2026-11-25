// Cartes personnage du jour : une image par personnage (750×1050 et vignette 300×420), et une page
// de partage /c/{région}/{slug}/ dont l'aperçu (Discord, X…) montre la carte, puis renvoie vers la fiche.
// Le dessin est celui du site (?cardshot=…), photographié par un Chrome sans fenêtre.
// Usage : node scripts/cards.mjs   (CHROME=chemin du navigateur si besoin)
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g, ' ');

// page de partage : les balises d'aperçu, puis la fiche du personnage
export function sharePage(p, { image, day }) {
  const key = `${p.region || 'eu'}/${p.slug}`, back = `/?p=char&c=${encodeURIComponent(key)}`;
  const url = `https://dropamine.app/c/${encodeURIComponent(p.region || 'eu')}/${encodeURIComponent(p.slug)}/`;
  const title = `${p.name} ${p.surname} · ${num(p.total)} / ${num(p.max || 2460)} · Dropamine`;
  const desc = [`${p.race || ''} ${p.class || ''} niveau ${p.level}`.trim(), p.guild?.name, `Forever ${(p.region || 'eu').toUpperCase()}`].filter(Boolean).join(' · ');
  const img = image ? `https://dropamine.app/cards/${encodeURIComponent(p.region || 'eu')}/${encodeURIComponent(p.slug)}.png?v=${day}` : 'https://dropamine.app/img/og.jpg';
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="profile"><meta property="og:site_name" content="Dropamine">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(img)}">
${image ? '<meta property="og:image:width" content="750"><meta property="og:image:height" content="1050">' : ''}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(img)}">
<meta name="theme-color" content="#e8c88a">
<meta name="robots" content="noindex">
<link rel="canonical" href="https://dropamine.app${esc(back)}">
<meta http-equiv="refresh" content="0;url=${esc(back)}">
<script>location.replace(${JSON.stringify(back)})</script>
</head><body style="background:#0b0806;color:#efe2c6;font-family:Georgia,serif;padding:24px"><p><a style="color:#e8c88a" href="${esc(back)}">${esc(p.name)} ${esc(p.surname)} · Dropamine</a></p></body></html>
`;
}

function serve() {
  const srv = createServer(async (req, res) => {
    try {
      const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
      let file = join(SITE, path || 'index.html');
      if (!file.startsWith(SITE)) throw new Error('hors du site');
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}
function chromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  const c = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
  return c.find(existsSync);
}
function shot(bin, url, out, size, scale) {
  const args = ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--virtual-time-budget=20000',
    `--window-size=${size}`, `--force-device-scale-factor=${scale}`, `--screenshot=${out}`, url];
  return new Promise(res => {
    const ch = spawn(bin, args, { stdio: 'ignore' });
    const kill = setTimeout(() => ch.kill(), 90_000);
    ch.on('exit', () => { clearTimeout(kill); res(existsSync(out)); });
    ch.on('error', () => { clearTimeout(kill); res(false); });
  });
}
async function pool(items, n, fn) { const q = [...items]; await Promise.all(Array.from({ length: n }, async () => { while (q.length) await fn(q.shift()); })); }

async function main() {
  const data = JSON.parse(await readFile(join(SITE, 'data/hiscores.json'), 'utf8'));
  const day = (data.updated || new Date().toISOString()).slice(0, 10);
  const bin = chromePath();
  if (!bin) console.warn('· aucun Chrome trouvé : pages de partage sans image de carte');
  const srv = bin ? await serve() : null, base = srv ? `http://127.0.0.1:${srv.address().port}` : '';
  let ok = 0;
  await pool(data.players, 3, async p => {
    const region = p.region || 'eu', dir = join(SITE, 'cards', region);
    await mkdir(dir, { recursive: true });
    let image = false;
    if (bin) {
      const url = `${base}/?cardshot=${encodeURIComponent(`${region}/${p.slug}`)}`;
      image = await shot(bin, url, join(dir, `${p.slug}.png`), '750,1050', 1);
      if (image) await shot(bin, url, join(dir, `${p.slug}-s.png`), '750,1050', 0.4);
      if (image) ok++; else console.warn(`· carte ${region}/${p.slug} : échec`);
    }
    const pdir = join(SITE, 'c', region, p.slug);
    await mkdir(pdir, { recursive: true });
    await writeFile(join(pdir, 'index.html'), sharePage(p, { image, day }));
  });
  srv?.close();
  console.log(`cartes : ${ok} / ${data.players.length} image(s), ${data.players.length} page(s) de partage`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(err => { console.error(err); process.exitCode = 1; });
