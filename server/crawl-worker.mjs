// Le relevé du serveur dans son propre fil (worker thread) : la base SQLite, les appels Blizzard, l'export et les
// statistiques ne bloquent jamais le fil principal qui répond au site (connexion, groupes, imports…).
// Le fil principal appelle ces fonctions par messages ({ type: 'call', id, fn, args }) ; les lectures GitHub
// (réglages, Scout, inscrits…) passent par lui ({ type: 'readRaw' }), car c'est lui qui a le jeton.
import { parentPort, workerData } from 'node:worker_threads';
import { gzipSync } from 'node:zlib';
import { startCrawl } from './crawl.mjs';
import { computeStats } from './stats-lib.mjs';

const REGIONS = ['eu', 'us', 'tw'];
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
  search: (q, limit) => crawl.search(q, limit),
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
  // statistiques de tout le serveur, par région : refaites au plus toutes les 30 min
  stats(r) {
    if (!statsCache || Date.now() - statsCache.at > 30 * 60e3) {
      const all = crawl.all();
      statsCache = { at: Date.now(), by: Object.fromEntries(REGIONS.map(x => [x, { ...computeStats(all, x), known: crawl.known(x) }])) };
    }
    return statsCache.by[r] ?? null;
  },
};

parentPort.on('message', async m => {
  if (m.type === 'readRaw:res') { const res = waiting.get(m.id); waiting.delete(m.id); res?.(m.data); return; }
  if (m.type !== 'call') return;
  try { parentPort.postMessage({ type: 'res', id: m.id, r: await API[m.fn](...(m.args ?? [])) }); }
  catch (err) { parentPort.postMessage({ type: 'res', id: m.id, err: err.message }); }
});
