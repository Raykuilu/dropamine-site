// API locale de développement : les mêmes routes /hs/* que api.dropamine.app (hs-routes.mjs), servies depuis une base
// SQLite locale remplie avec l'export public du relevé (/hs/all.gz). Aucun appel Blizzard, aucun secret, aucune écriture GitHub.
//
//   node server/dev-api.mjs --seed      télécharge l'export et (re)crée la base (server/.state-dev/crawl.db)
//   node server/dev-api.mjs             sert http://localhost:8787 (CORS ouvert, pour le site servi en local)
import { createServer } from 'node:http';
import { gunzipSync } from 'node:zlib';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openCrawlDb, saveChar, charByKey, searchChars, guildMembers, crawlCounts, allPlayers, knownCounts } from './crawl.mjs';
import { reindexAll, refreshGuilds, loadOverlay, indexChar, indexStale, rulesetCounts, rankList, guildList, guildFull, movers, meDash, pickRs, ranksOf } from './hs-index.mjs';
import { dayOf, validCharKey } from './crawl-lib.mjs';
import { computeStats } from './stats-lib.mjs';
import { hsRoutes } from './hs-routes.mjs';

const DIR = fileURLToPath(new URL('./.state-dev/', import.meta.url)), FILE = DIR + 'crawl.db';
const PORT = +(process.env.PORT || 8787);
const dayNum = iso => Math.floor(Date.parse(iso + 'T00:00:00Z') / 864e5);

export async function seedDev(db, players, reg) {
  const ins = db.prepare('INSERT OR REPLACE INTO hist (key, d, t, s, hk) VALUES (?, ?, ?, ?, ?)');
  let n = 0;
  db.exec('BEGIN');
  for (const p of players) {
    const h = (p.history ?? []).filter(x => x?.d);
    if (!p.key || !h.length) continue;
    for (const x of h.slice(0, -1)) ins.run(p.key, dayNum(x.d), x.t, JSON.stringify(x.s ?? {}), x.hk ?? null);
    const { history, fetched, ...data } = p;
    saveChar(db, data, dayNum(h[h.length - 1].d));
    if (++n % 2000 === 0) { db.exec('COMMIT'); db.exec('BEGIN'); }
  }
  db.exec('COMMIT');
  if (reg) { const keys = loadOverlay(db, reg); db.exec('BEGIN'); for (const k of keys) indexChar(db, k); db.exec('COMMIT'); }
  await reindexAll(db, { yieldFn: async () => {} });
  refreshGuilds(db);
  return n;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(DIR, { recursive: true });
  if (process.argv.includes('--seed') || !existsSync(FILE)) {
    for (const f of [FILE, FILE + '-wal', FILE + '-shm']) rmSync(f, { force: true });
    console.log('export du relevé…');
    const all = JSON.parse(gunzipSync(Buffer.from(await (await fetch('https://api.dropamine.app/hs/all.gz')).arrayBuffer())).toString('utf8'));
    // inscrits : data/reg.json une fois publié, sinon les inscrits de l'index du site
    let reg = await fetch('https://dropamine.app/data/reg.json').then(r => r.ok ? r.json() : null).catch(() => null);
    if (!reg) { const idx = await fetch('https://dropamine.app/data/hiscores.json').then(r => r.json()); reg = { players: idx.players.filter(p => !p.preview) }; }
    const db = openCrawlDb(FILE), t = Date.now();
    const n = await seedDev(db, all.players, reg);
    console.log(`base locale : ${n} personnages, ${reg.players.length} inscrits, ${Date.now() - t} ms`);
    db.close();
  }
  const db = openCrawlDb(FILE);
  if (indexStale(db)) { console.log('index des classements : nouvelle version, réindex…'); await reindexAll(db, { yieldFn: async () => {} }); refreshGuilds(db); }
  const REGIONS = ['eu', 'us'];
  let statsCache = null;
  const API = {
    status: () => ({ ...crawlCounts(db), dev: true }),
    feed: () => ({ status: crawlCounts(db), events: [] }),
    search: (q, limit, rs) => searchChars(db, q, limit, rs),
    rsinfo: r => ({ region: r, ...rulesetCounts(db, r) }),
    rankList: o => rankList(db, o),
    guilds: o => guildList(db, o),
    movers: o => movers(db, { ...o, today: Number(db.prepare('SELECT MAX(fetched) AS d FROM chars').get().d) || dayOf() }),
    meDash: keys => meDash(db, keys, k => charByKey(db, k)),
    ranks: k => ranksOf(db, k),
    guildFull: k => guildFull(db, k),
    char: k => charByKey(db, k),
    guild: k => guildMembers(db, k),
    rank: (r, pg, per) => rankList(db, { region: r, page: pg, per }),
    lookup: () => null,
    allGz: () => { throw new Error('indisponible en local'); },
    stats(r, rs) {
      if (!statsCache) {
        const all = allPlayers(db), by = {};
        for (const x of REGIONS) {
          by[x] = { ...computeStats(all, x), known: knownCounts(db, x) };
          for (const t of [1, 2, 3, 15]) { const part = all.filter(p => (p.region || 'eu') === x && p.rulesetId === t); if (part.length) by[x + '/' + t] = { ...computeStats(part, x), rs: t, known: null }; }
        }
        statsCache = by;
      }
      if (rs == null) return statsCache[r] ?? null;
      const t = pickRs(db, r, rs); return statsCache[r + '/' + t] ?? { rs: t, n: 0, empty: true };
    },
  };
  const crawl = { call: async (fn, ...args) => API[fn](...args) };
  const cors = { 'Access-Control-Allow-Origin': '*', Vary: 'Accept-Encoding' };
  const send = (res, status, body, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers }); res.end(JSON.stringify(body)); };
  const route = hsRoutes({ getCrawl: () => crawl, send, cors, validKey: validCharKey, regions: REGIONS });
  createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`), t = Date.now();
    if (req.method === 'OPTIONS') return send(res, 204, '', { ...cors, 'Access-Control-Allow-Headers': '*' });
    if (!(await route(req, res, url))) send(res, 404, { error: 'inconnu (API locale : routes /hs/* seulement)' }, cors);
    console.log(`${res.statusCode} ${url.pathname}${url.search} ${Date.now() - t} ms`);
  }).listen(PORT, () => console.log(`API locale : http://localhost:${PORT}/hs/rank?r=eu&skill=total`));
}
