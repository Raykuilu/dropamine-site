// api.dropamine.app — connexion Battle.net pour les Hiscores de dropamine.app.
// Node 24, aucune dépendance. Les secrets viennent uniquement des variables d'environnement.
//
//   GET  /health              → ok
//   GET  /auth/login          → redirige vers Battle.net (OAuth, portée wow.profile)
//   GET  /auth/callback       → reçoit le code, lit les personnages Forever du compte, ouvre la session
//   GET  /me                  → { battletag, characters: [...], registered: [...] }  (session requise)
//   POST /claim   { keys }    → inscrit ces personnages (seulement ceux du compte connecté)
//   POST /release { keys }    → les retire (seulement ceux du compte connecté)
//   POST /upload  { line }    → ligne « /drop hiscores » : compétences d'armes exactes (inscrit le personnage au passage)
//   POST /logout
//   GET  /push/key            → clé publique VAPID (notifications push)
//   POST /push/subscribe      → { sub } : cet appareil reçoit les notifications des sorties du compte (session requise)
//   POST /push/unsubscribe    → { endpoint }
//
// Le registre vit dans le dépôt GitHub du site (data/registry.json) : le service le met à jour
// par l'API GitHub, puis relance la mise à jour quotidienne du site.

import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { charactersFromAccount, applyClaim, applyRelease, parseCookies, validKey, parseHiscoresLine, matchUpload,
  applyRunCreate, applyRunJoin, applyRunLeave, applyRunEdit, publicRuns, applyHuntEdit, keepSiteHunt, parseScoutLine, applyScout, applySettings, applyGuildFollow, queueDue } from './lib.mjs';
import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { vapidKeys, sendPush, validSub, addSub, removeSub, runEvents, dueReminders } from './push.mjs';

// Secrets : variables d'environnement, ou à défaut un fichier server/.env privé (jamais versionné)
const ENV_FILE = fileURLToPath(new URL('./.env', import.meta.url));
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const env = k => { const v = process.env[k]; if (!v) throw new Error(`variable d'environnement manquante : ${k}`); return v; };
const CFG = {
  port: +(process.env.PORT || 3000),
  clientId: env('BNET_CLIENT_ID'), clientSecret: env('BNET_CLIENT_SECRET'),
  sessionSecret: env('SESSION_SECRET'),
  ghToken: env('GITHUB_TOKEN'), ghRepo: process.env.GITHUB_REPO || 'Raykuilu/dropamine-site',
  publicUrl: (process.env.PUBLIC_URL || 'https://api.dropamine.app').replace(/\/$/, ''),
  siteUrl: (process.env.SITE_URL || 'https://dropamine.app').replace(/\/$/, ''),
  // BattleTags administrateurs (outil Scout), séparés par des virgules : réglés sur le serveur, jamais dans le dépôt
  admins: new Set(String(process.env.ADMIN_TAGS || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean)),
};
const isAdmin = s => !!s?.battletag && CFG.admins.has(String(s.battletag).toLowerCase());
const REGIONS = ['eu', 'us', 'tw'];
const SESSION_HOURS = 12;

// ---------------------------------------------------------------- sessions (en mémoire)
const sessions = new Map();          // id → { exp, bnetId, battletag, characters: Map(key → perso) }
const sign = v => createHmac('sha256', CFG.sessionSecret).update(v).digest('base64url');
const seal = v => `${v}.${sign(v)}`;
// Le registre est public : on n'y écrit jamais le numéro de compte Battle.net, seulement une empreinte
// (HMAC avec le secret du service), stable pour un même compte mais impossible à relier à lui.
const ownerOf = s => `bnet:${createHmac('sha256', CFG.sessionSecret).update('owner:' + s.bnetId).digest('base64url').slice(0, 16)}`;
function unseal(s) {
  const i = String(s ?? '').lastIndexOf('.'); if (i < 1) return null;
  const v = s.slice(0, i), a = Buffer.from(s.slice(i + 1)), b = Buffer.from(sign(v));
  return a.length === b.length && timingSafeEqual(a, b) ? v : null;
}
setInterval(() => { const now = Date.now(); for (const [k, s] of sessions) if (s.exp < now) sessions.delete(k); }, 10 * 60e3).unref();
const cookie = (name, value, maxAge) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
function session(req) {
  const id = unseal(parseCookies(req.headers.cookie).dsid);
  const s = id && sessions.get(id);
  return s && s.exp > Date.now() ? s : null;
}

// ---------------------------------------------------------------- petites protections
const hits = new Map();
function limited(req, max = 40) {               // 40 requêtes par minute et par adresse
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '?';
  const now = Date.now(), h = hits.get(ip) ?? { n: 0, t: now };
  if (now - h.t > 60e3) { h.n = 0; h.t = now; }
  h.n++; hits.set(ip, h);
  return h.n > max;
}
setInterval(() => hits.clear(), 10 * 60e3).unref();

// ---------------------------------------------------------------- Battle.net
async function bnetToken(code) {
  const res = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${CFG.clientId}:${CFG.clientSecret}`).toString('base64') },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: `${CFG.publicUrl}/auth/callback` }),
  });
  if (!res.ok) throw new Error(`échange du code refusé (${res.status})`);
  return (await res.json()).access_token;
}
async function bnetJson(url, tok) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
  if (res.status === 404 || res.status === 403) return null;     // pas de personnage dans cette région
  if (!res.ok) throw new Error(`${new URL(url).pathname} → ${res.status}`);
  return res.json();
}
async function accountCharacters(tok) {
  const all = [];
  await Promise.all(REGIONS.map(async r => {
    const j = await bnetJson(`https://${r}.api.blizzard.com/profile/user/wow?namespace=profile-forever-${r}&locale=en_US`, tok).catch(() => null);
    if (j) all.push(...charactersFromAccount(j, r));
  }));
  return all;
}

// ---------------------------------------------------------------- GitHub (registre + historique)
const gh = (path, init = {}) => fetch(`https://api.github.com/repos/${CFG.ghRepo}${path}`, {
  ...init, headers: { Authorization: `Bearer ${CFG.ghToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'dropamine-api', ...(init.headers || {}) },
});
async function readFile(path, fallback) {
  const res = await gh(`/contents/${path}?ref=main`);
  if (res.status === 404 && fallback !== undefined) return { data: fallback, sha: undefined };
  if (!res.ok) throw new Error(`lecture de ${path} (${res.status})`);
  const j = await res.json();
  return { data: JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')), sha: j.sha };
}
const readRegistry = async () => { const { data, sha } = await readFile('data/registry.json'); return { registry: data, sha }; };
async function writeFile(path, data, sha, message) {
  const res = await gh(`/contents/${path}`, { method: 'PUT', body: JSON.stringify({
    message, sha, branch: 'main',
    content: Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64'),
    committer: { name: 'dropamine-api', email: '41898282+github-actions[bot]@users.noreply.github.com' },
  }) });
  // 409 / 422 : quelqu'un a écrit entre-temps (ou la branche n'est pas encore à jour juste après un commit) ;
  // 5xx : incident passager chez GitHub. Dans ces cas on relit et on recommence.
  if (res.status === 409 || res.status === 422 || res.status >= 500) {
    console.warn(new Date().toISOString(), `écriture de ${path} : ${res.status}, nouvel essai`);
    return false;
  }
  if (!res.ok) throw new Error(`écriture de ${path} (${res.status})`);
  return true;
}
async function deleteHistory(key) {
  const [region, slug] = key.split('/');
  const path = `/contents/data/history/${region}/${encodeURIComponent(slug)}.json`;
  const res = await gh(`${path}?ref=main`); if (!res.ok) return;
  const { sha } = await res.json();
  await gh(path, { method: 'DELETE', body: JSON.stringify({ message: `Hiscores: remove history of ${key}`, sha, branch: 'main' }) });
}
const refreshSite = () => gh('/actions/workflows/update.yml/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main' }) }).catch(() => {});
// vidage automatique de la file : toutes les 10 min on regarde s'il faut relancer (une fois par heure au plus, voir queueDue)
const readRaw = async (path, fallback) => {
  const res = await gh(`/contents/${path}?ref=main`, { headers: { Accept: 'application/vnd.github.raw+json' } });
  if (res.status === 404) return fallback;
  if (!res.ok) throw new Error(`lecture de ${path} (${res.status})`);
  return res.json();
};
async function autoRun() {
  try {
    const runs = await gh('/actions/workflows/update.yml/runs?per_page=1').then(r => r.ok ? r.json() : null);
    const r = runs?.workflow_runs?.[0];
    const lastRun = r ? { at: Date.parse(r.created_at), done: r.status === 'completed' } : null;
    if (lastRun && !lastRun.done) return;
    const [queue, settings] = await Promise.all([readRaw('data/queue.json', {}), readRaw('data/settings.json', {})]);
    if (!queueDue(queue, settings, lastRun)) return;
    console.log(new Date().toISOString(), `file : ${Object.keys(queue.players ?? {}).length} en attente, mise à jour lancée`);
    await refreshSite();
  } catch (err) { console.warn('vidage de la file :', err.message); }
}
setInterval(autoRun, 10 * 60e3).unref();
// lecture → modification → écriture, recommencée si quelqu'un a écrit entre-temps
async function updateFile(path, fallback, fn, message) {
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt) await new Promise(ok => setTimeout(ok, 800 * attempt));   // 0,8 s, 1,6 s, 2,4 s, 3,2 s
    let got;
    try { got = await readFile(path, fallback); } catch (err) { if (attempt === 4) throw err; continue; }   // lecture ratée : on réessaie aussi
    const { data, sha } = got;
    const r = fn(data);
    if (!r.changed) return r;
    if (await writeFile(path, r.registry, sha, message)) return r;
  }
  throw new Error(`${path} occupé, réessaie dans un instant`);
}
const updateRegistry = (fn, message) => updateFile('data/registry.json', undefined, fn, message);
const updateUploads = (fn, message) => updateFile('data/uploads.json', {}, fn, message);
// ---------------------------------------------------------------- runs : en mémoire, sauvegardés sur le disque du serveur
// Beaucoup d'inscriptions possibles : pas un commit GitHub par clic. La mémoire fait foi, chaque changement est écrit
// sur disque (fichier temporaire puis renommage), les écritures passent une par une (file), et une copie de secours
// part sur GitHub (data/runs.json) au plus toutes les 15 minutes s'il y a eu du changement.
const STATE_DIR = fileURLToPath(new URL('./.state/', import.meta.url));
const RUNS_FILE = STATE_DIR + 'runs.json';
let RUNS = null, runsDirty = false, runsQueue = Promise.resolve();
async function runsLoad() {
  if (RUNS) return RUNS;
  try { RUNS = JSON.parse(readFileSync(RUNS_FILE, 'utf8')); }
  catch { RUNS = (await readFile('data/runs.json', { runs: [] }).catch(() => ({ data: { runs: [] } }))).data; }   // premier démarrage : reprise de la copie GitHub
  return RUNS;
}
let runsPub = null;
function runsPublic() {
  const slot = Math.floor(Date.now() / 900e3);
  if (!runsPub || runsPub.slot !== slot) {
    const text = JSON.stringify({ runs: publicRuns(RUNS ?? { runs: [] }) });
    runsPub = { slot, text, gz: gzipSync(text), etag: '"' + createHmac('sha1', 'runs').update(text).digest('base64url').slice(0, 16) + '"' };
  }
  return runsPub;
}
function sendRuns(req, res) {
  const p = runsPublic(), h = { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache', ETag: p.etag };
  if (req.headers['if-none-match'] === p.etag) { res.writeHead(304, h); return res.end(); }
  if (/gzip/.test(String(req.headers['accept-encoding'] || ''))) { res.writeHead(200, { ...h, 'Content-Encoding': 'gzip' }); return res.end(p.gz); }
  res.writeHead(200, h); res.end(p.text);
}
function runsSave() {
  runsPub = null;
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(RUNS_FILE + '.tmp', JSON.stringify(RUNS));
  renameSync(RUNS_FILE + '.tmp', RUNS_FILE);
  runsDirty = true;
}
// une modification à la fois ; fn(données) → { registry, changed, … } ou { error }
const updateRuns = fn => (runsQueue = runsQueue.then(async () => {
  const cur = await runsLoad(), r = fn(cur);
  if (!r.error && r.changed) { RUNS = r.registry; runsSave(); }
  return r;
}).catch(err => { console.error('runs :', err.message); return { error: 'x' }; }));
setInterval(async () => {
  if (!runsDirty || !RUNS) return;
  runsDirty = false;
  try { await updateFile('data/runs.json', { runs: [] }, () => ({ registry: RUNS, changed: true }), 'Runs: backup'); }
  catch (err) { runsDirty = true; console.warn('copie des runs sur GitHub :', err.message); }
}, 15 * 60e3).unref();
// téléchargements CurseForge : relevés toutes les 3 h via cfwidget (la page CurseForge refuse les robots)
let cfStats = { downloads: 593, at: null };
async function cfRefresh() {
  try {
    const res = await fetch('https://api.cfwidget.com/wow/addons/dropamine', { headers: { 'User-Agent': 'dropamine-api' }, signal: AbortSignal.timeout(15e3) });
    const j = res.ok ? await res.json() : null, n = Number(j?.downloads?.total);
    if (Number.isFinite(n) && n >= cfStats.downloads) cfStats = { downloads: n, at: new Date().toISOString() };
  } catch (err) { console.warn('téléchargements CurseForge :', err.message); }
}
cfRefresh(); setInterval(cfRefresh, 3 * 3600e3).unref();
// donjons connus : les tables de butin du site (même dépôt), relues au plus une fois par heure
const LOOT_FILE = fileURLToPath(new URL('../site/data/loot.json', import.meta.url));
let dunCache = { t: 0, set: new Set(), names: new Map() };
const dungeonKeys = () => {
  if (Date.now() - dunCache.t > 3600e3) {
    try {
      const ds = JSON.parse(readFileSync(LOOT_FILE, 'utf8')).dungeons;
      // notifications en français : noms officiels du Journal Blizzard (site/data/dnames.json), sinon le nom anglais
      let fr = {}; try { fr = JSON.parse(readFileSync(LOOT_FILE.replace('loot.json', 'dnames.json'), 'utf8')); } catch { /* noms anglais */ }
      // raids annoncés sans table de butin (Barrow Deeps, Hyjal…) : site/data/raids.json
      let raids = []; try { const rj = JSON.parse(readFileSync(LOOT_FILE.replace('loot.json', 'raids.json'), 'utf8')); raids = [...(rj.raids ?? []), ...(rj.activities ?? [])]; } catch { /* aucun */ }
      const all = [...ds, ...raids.filter(r => !ds.some(d => d.key === r.key)).map(r => ({ key: r.key, name: r.names?.[0] ?? r.key }))];
      dunCache = { t: Date.now(), set: new Set(all.map(d => d.key)), names: new Map(all.map(d => [d.key, fr[d.key]?.[1] || raids.find(r => r.key === d.key)?.names?.[1] || d.name])) };
    } catch { /* on garde l'ancienne liste */ }
  }
  return dunCache.set;
};

// ---------------------------------------------------------------- notifications push
// abonnements par compte (empreinte Battle.net, jamais l'identifiant) dans .state/push.json ; clés VAPID dans .state/vapid.json
const PUSH_FILE = STATE_DIR + 'push.json', VAPID = vapidKeys(STATE_DIR);
let SUBS = {}; try { SUBS = JSON.parse(readFileSync(PUSH_FILE, 'utf8')); } catch { /* aucun abonnement encore */ }
function subsSave() { mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(PUSH_FILE + '.tmp', JSON.stringify(SUBS)); renameSync(PUSH_FILE + '.tmp', PUSH_FILE); }
const dunName = k => (dungeonKeys(), dunCache.names.get(k) ?? k);
const RAID_RE = /Raid|Core|Lair|Naxx|Qiraj|Gurub|Hyjal|Blackwing|Onyxia|WorldBosses/i;
async function notify(events) {
  let gone = false;
  for (const { owner, msg } of events) for (const sub of SUBS[owner] ?? []) {
    const r = await sendPush(sub, { ...msg, url: CFG.siteUrl + msg.url }, VAPID, CFG.siteUrl).catch(e => 'err:' + e.message);
    if (r === 'gone') { SUBS = removeSub(SUBS, sub.endpoint); gone = true; }
    else if (r !== 'ok') console.warn('push :', r);
  }
  if (gone) subsSave();
}
// rappels 30 min avant, vérifiés chaque minute
const reminded = new Set();
setInterval(() => { if (RUNS) notify(dueReminders(RUNS.runs ?? [], reminded, Date.now(), dunName)).catch(() => {}); }, 60e3).unref();

// ---------------------------------------------------------------- HTTP
function send(res, status, body, headers = {}) {
  const json = typeof body !== 'string';
  res.writeHead(status, { 'Content-Type': json ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(json ? JSON.stringify(body) : body);
}
const cors = { 'Access-Control-Allow-Origin': CFG.siteUrl, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin, Accept-Encoding' };
async function readBody(req, max = 16e3) {   // max : 16 Ko par défaut ; la ligne Scout a droit à plus
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > max) throw new Error('requête trop grosse'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
const back = (status) => `${CFG.siteUrl}/?p=join&bnet=${status}`;

// outils internes facultatifs (hors dépôt) : chargés seulement s'ils sont présents sur le serveur
let internal = null;
try {
  internal = (await import('./private/admin.mjs')).default({ gh, readRaw, session, isAdmin, send, cfStats: () => cfStats, stateDir: STATE_DIR });
} catch (err) { if (err.code !== 'ERR_MODULE_NOT_FOUND') console.warn('outils internes :', err.message); }

const server = createServer(async (req, res) => {
  const url = new URL(req.url, CFG.publicUrl);
  try {
    if (limited(req, url.pathname === '/runs' && req.method === 'GET' ? 120 : 40)) return send(res, 429, { error: 'trop de requêtes' }, { ...cors, 'Retry-After': '60' });
    if (req.method === 'OPTIONS') return send(res, 204, '', { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' });

    if (internal && await internal(req, res, url)) return;
    if (url.pathname === '/health') return send(res, 200, 'ok', cors);
    if (url.pathname === '/runs' && req.method === 'GET') { await runsLoad(); return sendRuns(req, res); }
    if (url.pathname === '/push/key' && req.method === 'GET') return send(res, 200, { key: VAPID.publicKey }, { ...cors, 'Cache-Control': 'public, max-age=86400' });
    if (url.pathname === '/stats' && req.method === 'GET') return send(res, 200, { curseforge: cfStats }, { ...cors, 'Cache-Control': 'public, max-age=900' });

    if (url.pathname === '/auth/login' && req.method === 'GET') {
      const state = randomBytes(18).toString('base64url');
      const q = new URLSearchParams({ client_id: CFG.clientId, response_type: 'code', scope: 'openid wow.profile', state, redirect_uri: `${CFG.publicUrl}/auth/callback` });
      return send(res, 302, '', { Location: `https://oauth.battle.net/authorize?${q}`, 'Set-Cookie': cookie('dstate', seal(state), 600) });
    }

    if (url.pathname === '/auth/callback' && req.method === 'GET') {
      const expected = unseal(parseCookies(req.headers.cookie).dstate);
      if (!expected || expected !== url.searchParams.get('state') || !url.searchParams.get('code')) return send(res, 302, '', { Location: back('error') });
      const tok = await bnetToken(url.searchParams.get('code'));
      const [user, characters] = await Promise.all([bnetJson('https://oauth.battle.net/userinfo', tok), accountCharacters(tok)]);
      const id = randomBytes(24).toString('base64url');
      sessions.set(id, { exp: Date.now() + SESSION_HOURS * 3600e3, bnetId: String(user?.id ?? user?.sub ?? ''), battletag: user?.battletag ?? '',
        characters: new Map(characters.map(c => [c.key, c])) });
      // le jeton Battle.net n'est pas gardé : seule la liste des personnages l'est, pour la durée de la session
      return send(res, 302, '', { Location: back('ok'), 'Set-Cookie': [cookie('dsid', seal(id), SESSION_HOURS * 3600), cookie('dstate', '', 0)] });
    }

    // routes de session : appelées par dropamine.app (CORS avec cookie)
    if (['/me', '/claim', '/release', '/upload', '/logout', '/runs/create', '/runs/join', '/runs/leave', '/runs/edit', '/push/subscribe', '/push/unsubscribe', '/hunt/save', '/scout', '/admin/run', '/admin/settings', '/admin/guild', '/admin/hide'].includes(url.pathname)) {
      if (req.method === 'POST' && req.headers.origin !== CFG.siteUrl && req.headers.origin !== CFG.publicUrl) return send(res, 403, { error: 'origine refusée' }, cors);
      const s = session(req);
      if (url.pathname === '/logout') {
        const id = unseal(parseCookies(req.headers.cookie).dsid); if (id) sessions.delete(id);
        return send(res, 200, { ok: true }, { ...cors, 'Set-Cookie': cookie('dsid', '', 0) });
      }
      if (!s) return send(res, 401, { error: 'non connecté' }, cors);

      if (url.pathname === '/me' && req.method === 'GET') {
        const { registry } = await readRegistry();
        const reg = new Set((registry.characters ?? []).map(k => String(k).toLowerCase()));
        const out = new Set((registry.optout ?? []).map(k => String(k).toLowerCase()));
        const list = [...s.characters.values()].sort((a, b) => b.level - a.level).map(c => ({ ...c, registered: reg.has(c.key), optout: out.has(c.key) }));
        return send(res, 200, { battletag: s.battletag, characters: list, ...(isAdmin(s) ? { admin: true } : {}) }, cors);
      }
      if ((url.pathname === '/claim' || url.pathname === '/release') && req.method === 'POST') {
        const body = await readBody(req);
        const keys = [...new Set((Array.isArray(body.keys) ? body.keys : []).map(k => String(k).toLowerCase()))].filter(validKey).slice(0, 50);
        if (!keys.length) return send(res, 400, { error: 'aucun personnage' }, cors);
        const owner = ownerOf(s);
        const r = url.pathname === '/claim'
          ? await updateRegistry(reg => applyClaim(reg, keys, owner, s.characters), `Hiscores: register ${keys.join(', ')} (Battle.net)`)
          : await updateRegistry(reg => applyRelease(reg, keys, s.characters), `Hiscores: remove ${keys.join(', ')} (Battle.net)`);
        if (url.pathname === '/release' && r.done.length) {
          for (const k of r.done) await deleteHistory(k).catch(() => {});
          await updateUploads(u => {
            const n = { ...u }; let changed = false;
            for (const k of r.done) if (n[k]) { delete n[k]; changed = true; }
            return { registry: n, changed };
          }, `Hiscores: remove Dropamine line of ${r.done.join(', ')}`).catch(() => {});
        }
        if (r.changed) refreshSite();
        return send(res, 200, { done: r.done, refused: r.refused }, cors);
      }
      if (url.pathname === '/upload' && req.method === 'POST') {
        const p = parseHiscoresLine((await readBody(req)).line);
        if (p.error) return send(res, 400, { error: p.error }, cors);
        const c = matchUpload(p, s.characters);
        if (!c) return send(res, 400, { error: 'not-yours' }, cors);
        if (c.level < 10) return send(res, 400, { error: 'level' }, cors);
        await updateRegistry(reg => applyClaim(reg, [c.key], ownerOf(s), s.characters), `Hiscores: register ${c.key} (Battle.net)`);
        const entry = { weapons: p.weapons, weaponList: p.weaponList, defense: p.defense, level: p.level,
          professions: p.professions, version: p.version, at: new Date().toISOString().slice(0, 10),
          ...(p.played ? { played: p.played } : {}), ...(p.lc ? { lc: p.lc } : {}),
          ...Object.fromEntries(['collection', 'achievements', 'records', 'hunt', 'pvp'].filter(k => p[k]).map(k => [k, p[k]])) };
        await updateUploads(u => ({ registry: { ...u, [c.key]: keepSiteHunt(entry, u[c.key]) }, changed: true }), `Hiscores: Dropamine line for ${c.key}`);
        refreshSite();
        return send(res, 200, { key: c.key, weapons: p.weapons, count: p.weaponList.length }, cors);
      }
      // objets recherchés choisis sur le site, pour un personnage du compte connecté
      if (url.pathname === '/hunt/save' && req.method === 'POST') {
        const body = await readBody(req), key = String(body.key ?? '').toLowerCase(), c = s.characters.get(key);
        if (!validKey(key) || !c) return send(res, 400, { error: 'not-yours' }, cors);
        if (c.level < 10) return send(res, 400, { error: 'level' }, cors);
        await updateRegistry(reg => applyClaim(reg, [key], ownerOf(s), s.characters), `Hiscores: register ${key} (Battle.net)`);
        let out = null;
        const r = await updateUploads(u => (out = applyHuntEdit(u, key, body.items)).error ? { changed: false } : out, `Hiscores: wanted items of ${key} (site)`);
        if (out?.error) return send(res, 400, { error: out.error }, cors);
        if (r.changed) refreshSite();
        return send(res, 200, { ok: true, hunt: out.hunt }, cors);
      }
      // Admin (page admin.html) : relancer un relevé, réglages du remplissage, guildes suivies, retirer un personnage
      if (url.pathname.startsWith('/admin/') && req.method === 'POST') {
        if (!isAdmin(s)) return send(res, 403, { error: 'admin' }, cors);
        const body = await readBody(req);
        if (url.pathname === '/admin/run') { await refreshSite(); return send(res, 200, { ok: true }, cors); }
        if (url.pathname === '/admin/settings') {
          let out = null;
          const r = await updateFile('data/settings.json', {}, d => (out = applySettings(d, body)).error ? { changed: false } : out, 'Hiscores: settings (admin)');
          if (out?.error) return send(res, 400, { error: out.error }, cors);
          return send(res, 200, { ok: true, settings: out.registry, changed: !!r.changed }, cors);
        }
        if (url.pathname === '/admin/guild') {
          let out = null;
          const r = await updateFile('data/guilds.json', { guilds: [] }, d => (out = applyGuildFollow(d, body.key, !!body.follow)).error ? { changed: false } : out, `Hiscores: ${body.follow ? 'follow' : 'unfollow'} guild ${String(body.key ?? '')} (admin)`);
          if (out?.error) return send(res, 400, { error: out.error }, cors);
          if (r.changed) refreshSite();
          return send(res, 200, { ok: true, guilds: out.registry.guilds }, cors);
        }
        if (url.pathname === '/admin/hide') {
          const key = String(body.key ?? '').toLowerCase();
          if (!validKey(key)) return send(res, 400, { error: 'key' }, cors);
          const r = await updateRegistry(reg => applyRelease(reg, [key], new Set([key])), `Hiscores: remove ${key} (admin)`);
          for (const k of r.done ?? []) await deleteHistory(k).catch(() => {});
          if (r.changed) refreshSite();
          return send(res, 200, { ok: true, done: r.done ?? [] }, cors);
        }
      }
      // Scout : la ligne de l'addon privé de l'administrateur → data/scouted.json (joueurs montrés en aperçu au relevé suivant)
      if (url.pathname === '/scout' && req.method === 'POST') {
        if (!isAdmin(s)) return send(res, 403, { error: 'admin' }, cors);
        const p = parseScoutLine((await readBody(req, 512e3)).line);   // jusqu'à ~5 000 joueurs
        if (p.error) return send(res, 400, { error: p.error }, cors);
        let out = null;
        const r = await updateFile('data/scouted.json', { players: {} }, d => (out = applyScout(d, p.region, p.players)), `Hiscores: scout (${p.players.length} players)`);
        if (r.changed) refreshSite();
        return send(res, 200, { ok: true, received: p.players.length, added: out?.added ?? 0, total: out?.total ?? 0 }, cors);
      }
      if (url.pathname === '/push/subscribe' && req.method === 'POST') {
        const { sub } = await readBody(req);
        if (!validSub(sub)) return send(res, 400, { error: 'abonnement invalide' }, cors);
        const r = addSub(SUBS, ownerOf(s), sub);
        if (r.error) return send(res, 503, { error: r.error }, cors);
        SUBS = r.store; subsSave();
        return send(res, 200, { ok: true }, cors);
      }
      if (url.pathname === '/push/unsubscribe' && req.method === 'POST') {
        const { endpoint } = await readBody(req);
        SUBS = removeSub(SUBS, String(endpoint ?? '')); subsSave();
        return send(res, 200, { ok: true }, cors);
      }
      // runs : créer (avec un de ses personnages), rejoindre, quitter (le créateur annule)
      if (url.pathname.startsWith('/runs/') && req.method === 'POST') {
        const body = await readBody(req), owner = ownerOf(s);
        const fn = url.pathname === '/runs/create' ? d => applyRunCreate(d, body, owner, s.characters, dungeonKeys())
          : url.pathname === '/runs/edit' ? d => applyRunEdit(d, body, owner, dungeonKeys())
          : url.pathname === '/runs/join' ? d => applyRunJoin(d, body, owner, s.characters) : d => applyRunLeave(d, body, owner);
        const before = structuredClone((await runsLoad()).runs?.find(x => x.id === body.id) ?? null);
        const r = await updateRuns(fn);
        if (r.error) return send(res, 400, { error: r.error }, cors);
        // notifications : l'organisateur (arrivées, départs), les inscrits (place libérée, groupe complet, annulation)
        const after = RUNS.runs?.find(x => x.id === (r.run?.id ?? body.id)) ?? null;
        if (before || after) notify(runEvents(before, after, owner, { dungeonName: dunName, isRaid: k => RAID_RE.test(k) })).catch(() => {});
        return send(res, 200, { ok: true, id: r.run?.id ?? body.id, cancelled: !!r.cancelled, runs: publicRuns(RUNS) }, cors);
      }
    }
    return send(res, 404, { error: 'introuvable' });
  } catch (err) {
    console.error(new Date().toISOString(), req.method, url.pathname, err.message);
    if (url.pathname === '/auth/callback') return send(res, 302, '', { Location: back('error') });
    return send(res, 500, { error: 'erreur du service' }, cors);
  }
});
server.listen(CFG.port, () => console.log(`api.dropamine.app à l'écoute sur le port ${CFG.port}`));
