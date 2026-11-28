// Routes publiques /hs/* (lectures du relevé : classements, guildes, gains, fiches, stats, recherche).
// Partagées par le service (server.mjs) et l'API locale de développement (dev-api.mjs).
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

export function hsRoutes({ getCrawl, send, cors, validKey, regions }) {
const REGIONS = regions;
// réponses publiques du relevé (données de l'armurerie, comme le site) : ETag (304 si rien n'a changé), compressées si le client l'accepte
function sendPublic(req, res, body, maxAge = 60, pre = null) {
  const text = pre?.text ?? JSON.stringify(body), etag = pre?.etag ?? etagOf(text);
  const h = { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${maxAge}`, ETag: etag };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, h); return res.end(); }
  if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) { res.writeHead(200, { ...h, 'Content-Encoding': 'gzip' }); return res.end(pre?.gz ?? gzipSync(text)); }
  res.writeHead(200, h); res.end(text);
}
const etagOf = text => '"' + createHash('sha1').update(text).digest('base64url').slice(0, 20) + '"';
// cache des réponses les plus demandées (classements, guildes, gains) : 500 entrées au plus, durée courte (≤ 10 min),
// donc jamais plus vieux que les règles Blizzard ; une même requête en cours n'est jamais relancée
const HS_CACHE = new Map(), HS_MAX = 500;
function hsCached(key, ttl, fn) {
  const hit = HS_CACHE.get(key);
  if (hit && Date.now() - hit.at < ttl * 1000) { HS_CACHE.delete(key); HS_CACHE.set(key, hit); return hit.p; }
  const p = Promise.resolve().then(fn).then(body => { const text = JSON.stringify(body); return { body, text, etag: etagOf(text), gz: gzipSync(text) }; });
  HS_CACHE.set(key, { at: Date.now(), p });
  p.catch(() => HS_CACHE.delete(key));
  while (HS_CACHE.size > HS_MAX) HS_CACHE.delete(HS_CACHE.keys().next().value);
  return p;
}
const intParam = (url, k, def, min, max) => { const v = Math.floor(+url.searchParams.get(k)); return url.searchParams.has(k) && Number.isFinite(v) && v >= min ? Math.min(v, max) : def; };
const rsParam = url => { const v = +url.searchParams.get('rs'); return [1, 2, 3, 15].includes(v) ? v : null; };
const facParam = url => { const f = url.searchParams.get('fac'); return f === 'ALLIANCE' || f === 'HORDE' ? f : null; };
const SKILL_RE = /^(total|level|defense|hk|kd|duels|hpk|pvprank|killingBlows|kills|quests|dungeons|flights|clog|ach|played|rsession|rday|rhour|rcombo|w[a-z0-9]{2,12}|p\d{2,4})$/;
async function sendHs(req, res, url, ttl, fn) {
  const r = await hsCached(url.pathname + '?' + [...url.searchParams].sort().map(([k, v]) => k + '=' + v).join('&'), ttl, fn);
  sendPublic(req, res, r.body, Math.min(ttl, 120), r);
}
const lookups = { hour: 0, n: 0, by: new Map() };   // quotas de la recherche directe chez Blizzard
const regionOf = url => REGIONS.includes(url.searchParams.get('r')) ? url.searchParams.get('r') : 'eu';
return async function crawlRoute(req, res, url) {
  if (!url.pathname.startsWith('/hs/') || req.method !== 'GET') return false;
  const crawl = getCrawl();
  if (!crawl) { send(res, 503, { error: 'relevé indisponible' }, cors); return true; }
  const p = url.pathname;
  try {
    if (p === '/hs/status') sendPublic(req, res, await crawl.call('status'), 30);
    else if (p === '/hs/feed') sendPublic(req, res, await crawl.call('feed', Math.max(0, Math.floor(+url.searchParams.get('since') || 0))), 0);
    else if (p === '/hs/all.gz') {
      // le fichier compressé tel quel (le proxy d'Infomaniak retire la compression HTTP « Content-Encoding »)
      const gz = Buffer.from(await crawl.call('allGz'));
      res.writeHead(200, { ...cors, 'Content-Type': 'application/gzip', 'Content-Length': gz.length, 'Cache-Control': 'public, max-age=300' }); res.end(gz);
    }
    else if (p === '/hs/stats') {
      const s = await crawl.call('stats', regionOf(url), rsParam(url));
      s ? sendPublic(req, res, s, 600) : send(res, 404, { error: 'inconnu' }, cors);
    }
    else if (p === '/hs/search') sendPublic(req, res, { results: await crawl.call('search', String(url.searchParams.get('q') || '').slice(0, 40), 20, rsParam(url)) }, 60);
    else if (p === '/hs/rsinfo') await sendHs(req, res, url, 600, () => crawl.call('rsinfo', regionOf(url)));
    else if (p === '/hs/rank' && ['skill', 'rs', 'k', 'cls', 'fac', 'per'].some(x => url.searchParams.has(x))) {
      // classement complet par compétence, région et type de royaume (pagination, ou page d'un personnage avec k=)
      const skill = String(url.searchParams.get('skill') || 'total'), k = String(url.searchParams.get('k') || '').toLowerCase();
      if (!SKILL_RE.test(skill) || (k && !validKey(k))) { send(res, 400, { error: 'paramètre' }, cors); return true; }
      await sendHs(req, res, url, 60, () => crawl.call('rankList', { region: regionOf(url), rs: rsParam(url), skill, cls: intParam(url, 'cls', null, 1, 20),
        fac: facParam(url), page: intParam(url, 'pg', 1, 1, 100000), per: intParam(url, 'per', 50, 10, 100), k: k || null }));
    }
    else if (p === '/hs/guilds') {
      const m = String(url.searchParams.get('m') || 'total');
      await sendHs(req, res, url, 120, () => crawl.call('guilds', { region: regionOf(url), rs: rsParam(url), m: ['total', 'avg', 'l60', 'hk', 'prof', 'members', 'g7'].includes(m) ? m : 'total',
        q: String(url.searchParams.get('q') || '').slice(0, 40), fac: facParam(url), page: intParam(url, 'pg', 1, 1, 10000), per: intParam(url, 'per', 50, 10, 100) }));
    }
    else if (p === '/hs/movers') await sendHs(req, res, url, 300, () => crawl.call('movers', { region: regionOf(url), rs: rsParam(url), n: intParam(url, 'n', 10, 1, 30) }));
    else if (p === '/hs/me-dash') {
      const keys = [...new Set(String(url.searchParams.get('k') || '').toLowerCase().split(',').map(s => s.trim()).filter(validKey))].slice(0, 10);
      if (!keys.length) { send(res, 400, { error: 'clé' }, cors); return true; }
      await sendHs(req, res, url, 60, async () => ({ chars: await crawl.call('meDash', keys) }));
    }
    else if (p === '/hs/guild') {
      const k = String(url.searchParams.get('k') || '').toLowerCase();
      /^(eu|us|tw)\/[\p{L}\p{N}' -]{1,60}$/u.test(k) ? sendPublic(req, res, await crawl.call('guild', k), 300) : send(res, 400, { error: 'clé' }, cors);
    }
    else if (p === '/hs/char') {
      const k = String(url.searchParams.get('k') || '').toLowerCase();
      const c = validKey(k) ? await crawl.call('char', k) : null;
      c ? sendPublic(req, res, c, 300) : send(res, 404, { error: 'inconnu' }, cors);
    }
    else if (p === '/hs/lookup') {
      // recherche directe chez Blizzard (5 appels) : 10 par heure et par adresse, 300 par heure en tout
      const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '?', hour = Math.floor(Date.now() / 3600e3);
      if (lookups.hour !== hour) { lookups.hour = hour; lookups.n = 0; lookups.by.clear(); }
      if (lookups.n >= 300 || (lookups.by.get(ip) || 0) >= 10) { send(res, 429, { error: 'trop de recherches, réessaie dans une heure' }, cors); return true; }
      const name = String(url.searchParams.get('n') || '').slice(0, 40);
      lookups.n++; lookups.by.set(ip, (lookups.by.get(ip) || 0) + 1);
      const c = await crawl.call('lookup', regionOf(url), name).catch(() => null);
      c ? sendPublic(req, res, c, 300) : send(res, 404, { error: 'introuvable' }, cors);
    }
    else if (p === '/hs/rank') {
      const pg = Math.max(1, Math.min(10000, Math.floor(+url.searchParams.get('pg') || 1)));
      sendPublic(req, res, await crawl.call('rank', regionOf(url), pg, 50), 120);
    }
    else send(res, 404, { error: 'inconnu' }, cors);
  } catch (err) { send(res, 503, { error: 'relevé indisponible' }, cors); }
  return true;
}
}
