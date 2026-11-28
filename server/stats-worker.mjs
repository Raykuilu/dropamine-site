// Statistiques de tout le serveur (/hs/stats) calculées dans leur propre fil, en tâche de fond, sur une connexion SQLite
// en lecture seule. Le calcul parcourt toutes les fiches (≈ 1 min sur l'hébergement) : il n'est jamais fait pendant une
// requête. Chaque version (refaite toutes les 30 min, gardée sur disque pour les redémarrages, au plus 30 jours comme le
// relevé) est envoyée au fil principal ({ type: 'stats', cache }), qui répond lui-même : jamais d'attente pendant un calcul.
import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { allPlayers, knownCounts } from './crawl.mjs';
import { computeStats } from './stats-lib.mjs';
import { RULESETS } from './hs-index.mjs';

const REGIONS = ['eu', 'us'];
const FILE = join(workerData.stateDir, 'crawl.db'), SAVED = join(workerData.stateDir, 'stats.json');
const EVERY = 30 * 60e3, FIRST = workerData.firstDelay ?? 60e3, KEEP = 30 * 864e5;
let db = null, cache = null, busy = false;
const publish = () => { if (cache) parentPort.postMessage({ type: 'stats', cache }); };
const base = () => db ??= new DatabaseSync(FILE, { readOnly: true });

// par région (ancien format, pour l'admin) et par région × type de royaume (jamais mélangés)
export function buildStats(d) {
  const all = allPlayers(d), by = {};
  for (const x of REGIONS) {
    by[x] = { ...computeStats(all, x), known: knownCounts(d, x) };
    for (const t of RULESETS) {
      const part = all.filter(p => (p.region || 'eu') === x && p.rulesetId === t);
      if (part.length) by[x + '/' + t] = { ...computeStats(part, x), rs: t, known: null };
    }
  }
  return { at: Date.now(), by };
}
function rebuild() {
  if (busy) return; busy = true;
  try {
    cache = buildStats(base()); publish();
    try { writeFileSync(SAVED + '.tmp', JSON.stringify(cache)); renameSync(SAVED + '.tmp', SAVED); } catch { /* disque : on garde la mémoire */ }
  } catch (err) { console.warn('statistiques :', err.message); }
  finally { busy = false; }
}
try { const s = JSON.parse(readFileSync(SAVED, 'utf8')); if (Date.now() - s.at < KEEP) { cache = s; publish(); } } catch { /* pas encore de version gardée */ }
setTimeout(() => { rebuild(); setInterval(rebuild, EVERY).unref?.(); }, cache ? FIRST : 5e3).unref?.();

// le fil reste vivant (minuteries) ; il ne reçoit pas de requêtes
parentPort.on('message', () => {});
