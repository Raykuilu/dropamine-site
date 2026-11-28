// Le relevé du serveur dans son propre fil (worker thread) : la base SQLite, les appels Blizzard, l'export et les
// statistiques ne bloquent jamais le fil principal qui répond au site (connexion, groupes, imports…).
// Le fil principal appelle ces fonctions par messages ({ type: 'call', id, fn, args }) ; les lectures GitHub
// (réglages, Scout, inscrits…) passent par lui ({ type: 'readRaw' }), car c'est lui qui a le jeton.
import { parentPort, workerData } from 'node:worker_threads';
import { gzipSync } from 'node:zlib';
import { startCrawl } from './crawl.mjs';
import { computeStats } from './stats-lib.mjs';

const REGIONS = ['eu', 'us'];
const RULESETS = [1, 2, 3, 15];
const waiting = new Map(); let n = 0;
const readRaw = (path, fallback) => new Promise(res => {
  const id = ++n; waiting.set(id, res);
  parentPort.postMessage({ type: 'readRaw', id, path, fallback });
  setTimeout(() => { if (waiting.has(id)) { waiting.delete(id); res(fallback); } }, 60e3);
});
const crawl = startCrawl({ ...workerData, readRaw });

let allCache = null, statsCache = null;
const API = {
  status: () => crawl.status(),
  feed: since => ({ status: crawl.status(), events: crawl.feed(since) }),
  search: (q, limit, rs) => crawl.search(q, limit, rs),
  rsinfo: r => crawl.rsinfo(r),
  rankList: o => crawl.rankList(o),
  guilds: o => crawl.guilds(o),
  guildSkills: o => crawl.guildSkills(o),
  wall: o => crawl.wall(o),
  weekSkill: o => crawl.weekSkill(o),
  quantiles: o => crawl.quantiles(o),
  compare: o => crawl.compare(o),
  movers: o => crawl.movers(o),
  meDash: keys => crawl.meDash(keys),
  ranks: k => crawl.ranksOf(k),
  guildFull: k => crawl.guildFull(k),
  char: k => crawl.char(k) ?? crawl.readNow(k),
  guild: gkey => crawl.guild(gkey),
  rank: (r, pg, per) => crawl.rank(r, pg, per),
  lookup: (r, name) => crawl.lookup(r, name),
  // tout ce qui est lu, déjà compressé (mise à jour du site) : refait au plus toutes les 10 min
  allGz() {
    if (!allCache || Date.now() - allCache.at > 10 * 60e3) {
      const text = JSON.stringify({ at: new Date().toISOString(), status: crawl.status(), players: crawl.all() });
      allCache = { at: Date.now(), gz: gzipSync(text, { level: 9 }) };
    }
    return allCache.gz;
  },
  // statistiques de tout le serveur, par région et par type de royaume (jamais mélangés) : refaites au plus toutes les 30 min.
  // Sans type : celles de la région entière (ancien format, gardé pour l'admin actuelle).
  stats(r, rs) {
    if (!statsCache || Date.now() - statsCache.at > 30 * 60e3) {
      const all = crawl.all(), by = {};
      for (const x of REGIONS) {
        by[x] = { ...computeStats(all, x), known: crawl.known(x) };
        for (const t of RULESETS) {
          const part = all.filter(p => (p.region || 'eu') === x && p.rulesetId === t);
          if (part.length) by[x + '/' + t] = { ...computeStats(part, x), rs: t, known: null };
        }
      }
      statsCache = { at: Date.now(), by };
    }
    if (rs == null) return statsCache.by[r] ?? null;
    const t = crawl.pickRs(r, rs);
    return statsCache.by[r + '/' + t] ?? { rs: t, n: 0, empty: true };
  },
};

parentPort.on('message', async m => {
  if (m.type === 'readRaw:res') { const res = waiting.get(m.id); waiting.delete(m.id); res?.(m.data); return; }
  if (m.type !== 'call') return;
  try { parentPort.postMessage({ type: 'res', id: m.id, r: await API[m.fn](...(m.args ?? [])) }); }
  catch (err) { parentPort.postMessage({ type: 'res', id: m.id, err: err.message }); }
});
