// Lectures du relevé pour le site (classements, guildes, fiches, recherche) dans leur propre fil, sur une connexion
// SQLite en lecture seule. Le fil du relevé écrit sans arrêt (12 ouvriers) : en mode WAL, ces lectures ne l'attendent
// jamais, et lui n'attend jamais le site. Même protocole de messages que crawl-worker.mjs ({ type: 'call', id, fn, args }).
import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { charByKey, searchChars, guildMembers, rankPage } from './crawl.mjs';
import { rulesetCounts, rankList, guildList, guildSkillList, guildFull, movers, meDash, ranksOf } from './hs-index.mjs';
import { dayOf } from './crawl-lib.mjs';

const FILE = join(workerData.stateDir, 'crawl.db');
let db = null;
// ouverte au premier appel (au tout premier démarrage, la base est créée par le fil du relevé)
function base() {
  if (!db) {
    db = new DatabaseSync(FILE, { readOnly: true });
    db.exec('PRAGMA busy_timeout = 5000; PRAGMA cache_size = -32768;');
  }
  return db;
}

export const READS = {
  search: (q, limit, rs) => searchChars(base(), q, limit, rs),
  rsinfo: r => ({ region: r, ...rulesetCounts(base(), r) }),
  rankList: o => rankList(base(), o),
  guilds: o => guildList(base(), o),
  guildSkills: o => guildSkillList(base(), o),
  movers: o => movers(base(), { ...o, today: dayOf() }),
  meDash: keys => meDash(base(), keys, k => charByKey(base(), k)),
  ranks: k => ranksOf(base(), k),
  guildFull: k => guildFull(base(), k),
  char: k => charByKey(base(), k),          // null : pas encore lu (le fil principal demande alors au relevé de le lire)
  guild: k => guildMembers(base(), k),
  rank: (r, pg, per) => rankPage(base(), r, pg, per),
};

parentPort.on('message', m => {
  if (m.type !== 'call') return;
  try { parentPort.postMessage({ type: 'res', id: m.id, r: READS[m.fn](...(m.args ?? [])) }); }
  catch (err) { parentPort.postMessage({ type: 'res', id: m.id, err: err.message }); }
});
