// Index des classements dans la base du relevé (SQLite) : le site ne charge plus l'index complet,
// il demande à l'API la page qu'il affiche (classement, guildes, gains, tableau de bord).
//
// - Table `sk` : une ligne par personnage lu et par compétence classée (valeur > 0), avec la région et le type de royaume
//   (rs : 1 JcJ, 2 Normal, 3 JdR, 15 JdR-JcJ). Index (région, type, compétence, valeur ↓, clé) : une page = une lecture d'index.
// - Colonnes pré-calculées dans `chars` : rs, g1 (gain depuis la veille), g7 (gain sur 7 jours), hk, prof.
// - Table `gagg` : guildes agrégées (membres lus, niveaux 60, total, VH, métiers, gain 7 jours), refaite toutes les 10 min.
// - Table `ov` : données riches des inscrits (ligne Dropamine, vraies compétences d'armes, /played…) publiées par la mise à jour
//   du site (data/reg.json) ; elles priment sur la fiche légère du relevé pour le classement et la fiche.
// Mêmes règles que le site (site/app.js, SKILLS) : valeur > 0, armes estimées exclues, K/D à partir de 20 combats.
// Les types de royaume ne sont jamais mélangés : chaque liste est filtrée par région ET type.
import { isoDay } from './crawl-lib.mjs';

export const RULESETS = [1, 2, 3, 15];
export const STAT_KEYS = ['killingBlows', 'kills', 'quests', 'dungeons', 'flights'];
export const INDEX_VERSION = '2';
// requêtes préparées une fois par base (les recompiler à chaque appel coûtait l'essentiel du temps)
const STMTS = new WeakMap();
const st = (db, sql) => { let m = STMTS.get(db); if (!m) STMTS.set(db, m = new Map()); let s = m.get(sql); if (!s) m.set(sql, s = db.prepare(sql)); return s; };
const BOOK = { clog: p => p.dropamine?.collection?.x, ach: p => p.dropamine?.achievements?.n, played: p => p.played,
  rsession: p => p.dropamine?.records?.bestSession, rday: p => p.dropamine?.records?.bestDay, rhour: p => p.dropamine?.records?.bestHour,
  rcombo: p => p.dropamine?.records?.longestCombo };

const hkOf = p => p.stats?.hk ?? p.pvpArmory?.hk ?? null;
// toutes les valeurs classées d'un personnage : { compétence: valeur } (valeurs > 0 seulement)
export function skillValues(p, now = Date.now()) {
  const out = {};
  const put = (k, v) => { if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v; };
  put('total', p.total); put('level', p.level); put('defense', p.defense);
  for (const w of p.weaponList ?? []) if (!w.est) put('w' + w.id, w.rank);
  for (const x of p.professions ?? []) put('p' + x.id, x.skill);
  const hk = hkOf(p), d = p.stats?.pvpDeaths;
  put('hk', hk);
  if (hk && d != null && hk + d >= 20) put('kd', d ? hk / d : hk);
  put('duels', p.stats?.duelsWon);
  const pw = p.dropamine?.pvp, at = Date.parse(p.dropamineAt || '');
  if (pw && pw.hkWeek >= 10 && pw.honorWeek >= 0 && now - at < 7 * 864e5) put('hpk', pw.honorWeek / pw.hkWeek);
  put('pvprank', p.pvpArmory?.rank);
  for (const k of STAT_KEYS) put(k, p.stats?.[k]);
  for (const [k, f] of Object.entries(BOOK)) put(k, f(p));
  return out;
}

// gains (même calcul que le site : histDiff, dayGain, gain7) à partir des points d'historique { d: 'AAAA-MM-JJ', t, s }
export function histDiff(complete, a, b) {
  if (complete || !a.s || !b.s) return b.t - a.t;
  return Object.keys(b.s).filter(k => k[0] !== 'w' && a.s[k] != null).reduce((n, k) => n + (b.s[k] - a.s[k]), 0);
}
export function gains(hist, complete) {
  if (!hist || hist.length < 2) return { g1: 0, g7: 0 };
  const b = hist[hist.length - 1], a = hist[hist.length - 2];
  const g1 = Date.parse(b.d) - Date.parse(a.d) <= 1.5 * 864e5 ? histDiff(complete, a, b) : 0;
  const cut = new Date(Date.parse(b.d) - 7 * 864e5).toISOString().slice(0, 10);
  const g7 = histDiff(complete, [...hist].reverse().find(x => x.d <= cut) || hist[0], b);
  return { g1: Math.max(0, g1 || 0), g7: Math.max(0, g7 || 0) };
}

export function openIndex(db) {
  // ancienne forme de la table de classement : refaite (elle se reconstruit depuis les fiches)
  const cols = db.prepare("SELECT name FROM pragma_table_info('sk')").all().map(r => r.name);
  if (cols.length && !cols.includes('cls')) { db.exec("DROP TABLE sk; DELETE FROM meta WHERE k = 'hsidx'"); }
  db.exec(`
    CREATE TABLE IF NOT EXISTS sk (region TEXT NOT NULL, rs INTEGER NOT NULL, skill TEXT NOT NULL, v REAL NOT NULL, key TEXT NOT NULL,
      cls INTEGER, fac TEXT, PRIMARY KEY (region, rs, skill, v DESC, key)) WITHOUT ROWID;
    CREATE INDEX IF NOT EXISTS sk_key ON sk (key);
    CREATE INDEX IF NOT EXISTS sk_cls ON sk (region, rs, skill, cls, v DESC, key);
    CREATE TABLE IF NOT EXISTS ov (key TEXT PRIMARY KEY, data TEXT NOT NULL, at INTEGER);
    CREATE TABLE IF NOT EXISTS gagg (key TEXT NOT NULL, region TEXT NOT NULL, rs INTEGER NOT NULL, slug TEXT, name TEXT, faction TEXT,
      n INTEGER, l60 INTEGER, total INTEGER, hk INTEGER, prof INTEGER, g7 INTEGER, nf TEXT, PRIMARY KEY (key, rs));
    CREATE INDEX IF NOT EXISTS gagg_list ON gagg (region, rs, total);
  `);
  for (const col of ['rs INTEGER', 'g1 INTEGER', 'g7 INTEGER', 'hk INTEGER', 'prof INTEGER']) {
    try { db.exec(`ALTER TABLE chars ADD COLUMN ${col}`); } catch { /* déjà là */ }
  }
  db.exec(`CREATE INDEX IF NOT EXISTS chars_g1 ON chars (region, rs, g1);
    CREATE INDEX IF NOT EXISTS chars_g7 ON chars (region, rs, g7);
    CREATE INDEX IF NOT EXISTS chars_guild ON chars (guild);`);
}

// données servies pour un personnage : la fiche du relevé, enrichie par celle des inscrits (ov) quand elle existe
export function merged(db, key, data) {
  const o = st(db, 'SELECT data FROM ov WHERE key = ?').get(key);
  return o ? mergeWith(data, JSON.parse(o.data)) : data;
}
function mergeWith(data, r) {
  // le relevé est plus frais pour l'armurerie ; l'inscrit apporte ce que l'armurerie n'a pas
  return data ? { ...data, ...pick(r, ['weaponList', 'weapons', 'weaponsSource', 'complete', 'parts', 'total', 'max', 'dropamine', 'dropamineAt', 'played', 'playedAt',
    'pvpArmory', 'loots', 'reps', 'render', 'avatar', 'inset']), preview: r.preview ?? data.preview, via: r.via ?? data.via } : r;
}
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] != null).map(k => [k, o[k]]));

// (ré)indexe un personnage lu : colonnes pré-calculées et lignes de classement
export function indexChar(db, key) {
  const row = st(db, 'SELECT key, region, data FROM chars WHERE key = ?').get(key);
  st(db, 'DELETE FROM sk WHERE key = ?').run(key);
  if (!row?.data) { st(db, 'UPDATE chars SET rs = NULL, g1 = NULL, g7 = NULL, hk = NULL, prof = NULL WHERE key = ?').run(key); return; }
  const hist = st(db, 'SELECT d, t, s FROM hist WHERE key = ? ORDER BY d').all(key);
  writeIndex(db, key, row.region, merged(db, key, JSON.parse(row.data)), hist);
}
// hist : lignes brutes de la table hist (d en jours, s en JSON)
function writeIndex(db, key, region, p, hist, table = 'sk') {
  const { g1, g7 } = gains(hist.map(h => ({ d: isoDay(h.d), t: h.t, s: JSON.parse(h.s) })), p.complete);
  const rs = RULESETS.includes(p.rulesetId) ? p.rulesetId : 0;
  // total : celui de l'inscrit s'il a envoyé ses vraies compétences d'armes (même chiffre partout : classement, guilde, recherche)
  st(db, 'UPDATE chars SET rs = ?, g1 = ?, g7 = ?, hk = ?, prof = ?, total = ? WHERE key = ?').run(rs, g1, g7, hkOf(p) ?? 0, p.parts?.professions ?? 0, p.total ?? null, key);
  const ins = st(db, `INSERT OR REPLACE INTO ${table} (region, rs, skill, v, key, cls, fac) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const [k, v] of Object.entries(skillValues(p))) ins.run(region, rs, k, v, key, p.classId ?? null, p.faction ?? null);
}
// Tout réindexer (nouvelle version de l'index) : une seule passe sur les fiches et l'historique, sans requête par personnage,
// le fil rendant la main entre deux lots. Les lignes vont d'abord dans une table sans index, puis sont recopiées triées
// dans le classement et les index secondaires sont refaits à la fin : bien plus rapide que 1,7 million d'insertions en désordre.
// Appelé au démarrage du relevé, avant ses ouvriers : rien d'autre n'écrit dans la base pendant ce temps.
// Appelé au démarrage du relevé, avant ses ouvriers : rien d'autre n'écrit dans la base pendant ce temps.
export async function reindexAll(db, { batch = 2000, yieldFn = () => new Promise(r => setImmediate(r)) } = {}) {
  const ov = new Map(db.prepare('SELECT key, data FROM ov').all().map(r => [r.key, r.data]));
  const rows = db.prepare('SELECT key, region, data FROM chars WHERE data IS NOT NULL ORDER BY key').all();
  const histOf = new Map();
  for (const h of db.prepare('SELECT key, d, t, s FROM hist ORDER BY key, d').iterate()) (histOf.get(h.key) ?? histOf.set(h.key, []).get(h.key)).push(h);
  db.exec(`DROP TABLE IF EXISTS sk_tmp; CREATE TABLE sk_tmp (region TEXT, rs INTEGER, skill TEXT, v REAL, key TEXT, cls INTEGER, fac TEXT);`);
  for (let i = 0; i < rows.length; i += batch) {
    db.exec('BEGIN');
    try {
      for (const row of rows.slice(i, i + batch)) {
        const data = JSON.parse(row.data), o = ov.get(row.key);
        writeIndex(db, row.key, row.region, o ? mergeWith(data, JSON.parse(o)) : data, histOf.get(row.key) ?? [], 'sk_tmp');
      }
      db.exec('COMMIT');
    } catch (err) { db.exec('ROLLBACK'); throw err; }
    await yieldFn();
  }
  db.exec(`BEGIN;
    DROP INDEX IF EXISTS sk_key; DROP INDEX IF EXISTS sk_cls; DELETE FROM sk;
    INSERT OR REPLACE INTO sk (region, rs, skill, v, key, cls, fac) SELECT region, rs, skill, v, key, cls, fac FROM sk_tmp ORDER BY region, rs, skill, v DESC, key;
    CREATE INDEX sk_key ON sk (key); CREATE INDEX sk_cls ON sk (region, rs, skill, cls, v DESC, key);
    DROP TABLE sk_tmp; COMMIT;`);
  db.prepare("INSERT INTO meta (k, v) VALUES ('hsidx', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(INDEX_VERSION);
  return rows.length;
}
export const indexStale = db => db.prepare("SELECT v FROM meta WHERE k = 'hsidx'").get()?.v !== INDEX_VERSION;

// inscrits publiés par la mise à jour du site : { players: [...] } → table ov ; renvoie les clés à réindexer
export function loadOverlay(db, reg, now = Date.now()) {
  const list = Array.isArray(reg?.players) ? reg.players.filter(p => p?.key) : null;
  if (!list) return [];
  const before = new Set(db.prepare('SELECT key FROM ov').all().map(r => r.key));
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM ov');
    const ins = db.prepare('INSERT INTO ov (key, data, at) VALUES (?, ?, ?)');
    for (const p of list) { const { history, ...rest } = p; ins.run(p.key, JSON.stringify(rest), now); }
    db.exec('COMMIT');
  } catch (err) { db.exec('ROLLBACK'); throw err; }
  return [...new Set([...before, ...list.map(p => p.key)])];
}

// guildes agrégées par région ET type de royaume : une ligne par (guilde, type), jamais de mélange
// (une guilde vit sur un royaume ; si des membres lus ont un autre type, ils sont comptés dans ce type-là)
export function refreshGuilds(db) {
  const rows = db.prepare(`SELECT c.guild AS key, c.region, c.rs, c.faction, COUNT(*) AS n, SUM(c.level >= 60) AS l60, SUM(c.total) AS total,
      SUM(c.hk) AS hk, SUM(c.prof) AS prof, SUM(c.g7) AS g7 FROM chars c WHERE c.data IS NOT NULL AND c.guild IS NOT NULL AND c.rs > 0 GROUP BY c.guild, c.rs, c.faction`).all();
  const by = new Map();
  for (const r of rows) {
    const id = r.key + '#' + r.rs;
    const g = by.get(id) ?? by.set(id, { key: r.key, region: r.region, rs: r.rs, n: 0, l60: 0, total: 0, hk: 0, prof: 0, g7: 0, facN: {} }).get(id);
    for (const k of ['n', 'l60', 'total', 'hk', 'prof', 'g7']) g[k] += r[k] ?? 0;
    if (r.faction) g.facN[r.faction] = (g.facN[r.faction] ?? 0) + r.n;
  }
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const names = db.prepare('SELECT name FROM guilds WHERE key = ?');
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM gagg');
    const ins = db.prepare('INSERT INTO gagg (key, region, rs, slug, name, faction, n, l60, total, hk, prof, g7, nf) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const g of by.values()) {
      const name = names.get(g.key)?.name ?? g.key.split('/')[1];
      ins.run(g.key, g.region, g.rs, g.key.split('/')[1], name, top(g.facN), g.n, g.l60, g.total, g.hk, g.prof, g.g7, fold(name));
    }
    db.exec('COMMIT');
  } catch (err) { db.exec('ROLLBACK'); throw err; }
  return by.size;
}
const fold = s => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// --------------------------------------------------------------------------------------------- lectures
// nombre de personnages lus par type, et type par défaut (le plus peuplé) d'une région
export function rulesetCounts(db, region) {
  const by = Object.fromEntries(RULESETS.map(r => [r, 0]));
  for (const r of db.prepare('SELECT rs, COUNT(*) AS n FROM chars WHERE region = ? AND data IS NOT NULL AND rs > 0 GROUP BY rs').all(region)) by[r.rs] = r.n;
  const def = Number(Object.entries(by).sort((a, b) => b[1] - a[1])[0][0]);
  return { counts: by, def };
}
export const pickRs = (db, region, rs) => RULESETS.includes(+rs) ? +rs : rulesetCounts(db, region).def;

// ligne de classement : la fiche (sans historique) + valeur, rang, gains
function rowOut(db, r, extra = {}) {
  const p = merged(db, r.key, r.data ? JSON.parse(r.data) : null);
  if (!p) return null;
  delete p.history;
  return { ...extra, g1: r.g1 ?? 0, g7: r.g7 ?? 0, p };
}
const clsFilter = cls => (Number.isInteger(cls) && cls > 0 ? ' AND cls = ' + cls : '');
const facFilter = fac => (fac === 'ALLIANCE' || fac === 'HORDE' ? ` AND fac = '${fac}'` : '');

// une page d'un classement ; `k` : renvoie la page qui contient ce personnage (et son rang)
export function rankList(db, { region, rs, skill = 'total', cls = null, fac = null, page = 1, per = 50, k = null }) {
  rs = pickRs(db, region, rs);
  const from = `FROM sk WHERE region = ? AND rs = ? AND skill = ?${clsFilter(cls)}${facFilter(fac)}`;
  const args = [region, rs, skill];
  const total = st(db, `SELECT COUNT(*) AS n ${from}`).get(...args).n;
  let me = null;
  if (k) {
    const mine = st(db, `SELECT v ${from} AND key = ?`).get(...args, k);
    if (mine) {
      const r = st(db, `SELECT COUNT(*) AS n ${from} AND (v > ? OR (v = ? AND key < ?))`).get(...args, mine.v, mine.v, k).n + 1;
      me = { key: k, r, v: mine.v }; page = Math.ceil(r / per);
    }
  }
  page = Math.max(1, Math.min(page, Math.max(1, Math.ceil(total / per))));
  const one = st(db, 'SELECT key, data, g1, g7 FROM chars WHERE key = ?');
  const rows = st(db, `SELECT key, v ${from} ORDER BY v DESC, key LIMIT ? OFFSET ?`).all(...args, per, (page - 1) * per)
    .map(s => ({ ...one.get(s.key), v: s.v }));
  return { region, rs, skill, cls, fac, total, page, per, pages: Math.ceil(total / per), me,
    rows: rows.map((r, i) => rowOut(db, r, { r: (page - 1) * per + i + 1, v: r.v })).filter(Boolean) };
}
// rang d'un personnage dans quelques classements (fiche, tableau de bord)
export function ranksOf(db, key, skills = ['total']) {
  const c = st(db, 'SELECT region, rs FROM chars WHERE key = ? AND data IS NOT NULL').get(key); if (!c) return {};
  const out = {};
  for (const sk of skills) {
    const mine = st(db, 'SELECT v FROM sk WHERE region = ? AND rs = ? AND skill = ? AND key = ?').get(c.region, c.rs, sk, key);
    if (!mine) continue;
    const n = st(db, 'SELECT COUNT(*) AS n FROM sk WHERE region = ? AND rs = ? AND skill = ? AND (v > ? OR (v = ? AND key < ?))').get(c.region, c.rs, sk, mine.v, mine.v, key).n;
    out[sk] = { r: n + 1, v: mine.v, of: st(db, 'SELECT COUNT(*) AS n FROM sk WHERE region = ? AND rs = ? AND skill = ?').get(c.region, c.rs, sk).n };
  }
  return out;
}

export const GUILD_MODES = { total: 'total', avg: 'CASE WHEN n >= 3 THEN total / n END', l60: 'l60', hk: 'hk', prof: 'prof', members: 'n', g7: 'g7' };
export function guildList(db, { region, rs, m = 'total', q = '', fac = null, page = 1, per = 50 }) {
  rs = pickRs(db, region, rs);
  const expr = GUILD_MODES[m] ?? GUILD_MODES.total;
  const qf = fold(q).trim();
  const where = `region = ? AND rs = ? AND (${expr}) > 0${fac === 'ALLIANCE' || fac === 'HORDE' ? ` AND faction = '${fac}'` : ''}`;
  // le rang reste celui du classement complet, même quand on filtre par nom
  const all = db.prepare(`SELECT key, slug, name, faction, rs, n, l60, total, hk, prof, g7, nf, (${expr}) AS v FROM gagg WHERE ${where} ORDER BY v DESC, total DESC, key`).all(region, rs);
  const ranked = all.map((g, i) => ({ ...g, r: i + 1 })).filter(g => !qf || g.nf.includes(qf));
  const total = ranked.length, pages = Math.ceil(total / per);
  page = Math.max(1, Math.min(page, Math.max(1, pages)));
  return { region, rs, m, total, page, per, pages, rows: ranked.slice((page - 1) * per, page * per).map(({ nf, ...g }) => ({ ...g, avg: g.n ? Math.round(g.total / g.n) : 0 })) };
}

// meilleurs gains : du jour (lus hier ou aujourd'hui), de la semaine, et guildes qui montent
export function movers(db, { region, rs, n = 10, today }) {
  rs = pickRs(db, region, rs);
  const q = (col, since) => db.prepare(`SELECT key, data, g1, g7 FROM chars WHERE region = ? AND rs = ? AND ${col} > 0 AND data IS NOT NULL${since ? ' AND fetched >= ' + since : ''} ORDER BY ${col} DESC, key LIMIT ?`).all(region, rs, n);
  return { region, rs,
    day: q('g1', today - 1).map(r => rowOut(db, r)).filter(Boolean),
    week: q('g7', today - 7).map(r => rowOut(db, r)).filter(Boolean),
    guilds: db.prepare('SELECT key, slug, name, faction, n, g7 FROM gagg WHERE region = ? AND rs = ? AND g7 > 0 ORDER BY g7 DESC LIMIT ?').all(region, rs, Math.min(n, 10)) };
}

// tableau de bord connecté, en une requête : pour chaque personnage, sa fiche complète, ses rangs, ses gains et sa guilde
export function meDash(db, keys, hydrate) {
  const out = {};
  for (const key of keys) {
    const p = hydrate(key); if (!p) { out[key] = null; continue; }
    const c = db.prepare('SELECT region, rs, guild, g1, g7 FROM chars WHERE key = ?').get(key);
    let guild = null;
    if (c?.guild) {
      const g = db.prepare('SELECT key, slug, name, faction, rs, n, l60, total, g7 FROM gagg WHERE key = ? AND rs = ?').get(c.guild, c.rs);
      const mates = db.prepare('SELECT key, total, data, g1, g7 FROM chars WHERE guild = ? AND rs = ? AND data IS NOT NULL ORDER BY total DESC, key').all(c.guild, c.rs);
      guild = { ...(g ?? { key: c.guild, name: p.guild?.name ?? null }), rank: mates.findIndex(m => m.key === key) + 1, members: mates.length,
        movers: [...mates].filter(m => m.g7 > 0).sort((a, b) => b.g7 - a.g7).slice(0, 3).map(r => rowOut(db, r)).filter(Boolean) };
    }
    out[key] = { p, g1: c?.g1 ?? 0, g7: c?.g7 ?? 0, rs: c?.rs ?? null, ranks: ranksOf(db, key, ['total', 'level', 'hk']), guild };
  }
  return out;
}
