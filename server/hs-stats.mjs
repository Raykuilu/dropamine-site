// Page Stats, « surprises » (docs/stats-etude.md) : le mur du maximum, la compétence de la semaine, ta place dans le monde
// (centiles), le face-à-face des types de royaume. Toujours par région ET type de royaume : jamais de chiffres mélangés.
// Les passages de cap (niveau 60, total maximal, métier à 300) sont notés dans `ms` au moment où le relevé les voit ;
// comme tout le relevé, ils sont effacés après 30 jours (conditions Blizzard).
import { pickRs, rowOut } from './hs-index.mjs';

const DAY = 864e5;
const iso = d => new Date(d * DAY).toISOString().slice(0, 10);
const STMTS = new WeakMap();
const st = (db, sql) => { let m = STMTS.get(db); if (!m) STMTS.set(db, m = new Map()); let s = m.get(sql); if (!s) m.set(sql, s = db.prepare(sql)); return s; };

export function openStats(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS ms (key TEXT NOT NULL, what TEXT NOT NULL, region TEXT, rs INTEGER, d INTEGER NOT NULL, pre INTEGER DEFAULT 0, PRIMARY KEY (key, what));
    CREATE INDEX IF NOT EXISTS ms_list ON ms (region, rs, what, pre, d);`);
}

// ------------------------------------------------------------------------------------------- caps (milestones)
export const PROF_CAP = 300;
// caps atteints dans un point d'historique { t, s } (max : total maximal de la fiche)
export function capsOf(pt, max) {
  const out = [];
  if (pt?.s?.l >= 60) out.push('l60');
  if (max > 0 && pt?.t >= max) out.push('max');
  for (const [k, v] of Object.entries(pt?.s ?? {})) if (/^p\d+$/.test(k) && v >= PROF_CAP) out.push(k);
  return out;
}
// prev : point précédent (null au premier relevé : les caps déjà atteints sont notés « déjà là », pre = 1)
export function recordCaps(db, player, prev, cur, today) {
  const was = new Set(prev ? capsOf(prev, player.max) : []);
  const ins = st(db, 'INSERT OR IGNORE INTO ms (key, what, region, rs, d, pre) VALUES (?, ?, ?, ?, ?, ?)');
  for (const c of capsOf(cur, player.max)) ins.run(player.key, c, player.region, player.rulesetId ?? null, today, prev && !was.has(c) ? 0 : 1);
}
// amorce depuis l'historique déjà gardé (30 jours) : une seule fois
export function backfillCaps(db) {
  if (st(db, "SELECT v FROM meta WHERE k = 'msfill'").get()) return 0;
  const info = new Map(st(db, "SELECT key, region, rs, json_extract(data, '$.max') AS max FROM chars WHERE data IS NOT NULL").all().map(r => [r.key, r]));
  const ins = st(db, 'INSERT OR IGNORE INTO ms (key, what, region, rs, d, pre) VALUES (?, ?, ?, ?, ?, ?)');
  let key = null, seen = null, n = 0;
  db.exec('BEGIN');
  try {
    for (const h of st(db, 'SELECT key, d, t, s FROM hist ORDER BY key, d').iterate()) {
      const c = info.get(h.key); if (!c) continue;
      const caps = capsOf({ t: h.t, s: JSON.parse(h.s) }, c.max);
      if (h.key !== key) { key = h.key; seen = new Set(caps); for (const x of caps) { ins.run(h.key, x, c.region, c.rs, h.d, 1); n++; } continue; }
      for (const x of caps) if (!seen.has(x)) { seen.add(x); ins.run(h.key, x, c.region, c.rs, h.d, 0); n++; }
    }
    st(db, "INSERT INTO meta (k, v) VALUES ('msfill', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(String(Date.now()));
    db.exec('COMMIT');
  } catch (err) { db.exec('ROLLBACK'); throw err; }
  return n;
}
export const purgeCaps = (db, cut) => st(db, 'DELETE FROM ms WHERE d < ?').run(cut);

// fiche légère pour les listes de la page Stats
const light = (db, key, extra = {}) => {
  const r = st(db, 'SELECT key, data, g1 AS cg1, g7 AS cg7 FROM chars WHERE key = ?').get(key);
  return r ? rowOut(db, r, extra) : null;
};

// ------------------------------------------------------------------------------------- A. le mur du maximum
// combien sont au maximum, les derniers arrivés (vus par le relevé), et « les prochains » avec une estimation
export function wall(db, { region, rs, today, n = 24, next = 5 }) {
  rs = pickRs(db, region, rs);
  const cap = st(db, `SELECT json_extract(data, '$.max') AS m, COUNT(*) AS c FROM chars WHERE region = ? AND rs = ? AND data IS NOT NULL
    GROUP BY m ORDER BY c DESC LIMIT 1`).get(region, rs)?.m ?? null;
  if (!cap) return { region, rs, cap: null, atMax: 0, week: 0, players: 0, recent: [], next: [] };
  const players = st(db, 'SELECT COUNT(*) AS n FROM chars WHERE region = ? AND rs = ? AND data IS NOT NULL').get(region, rs).n;
  const atMax = st(db, 'SELECT COUNT(*) AS n FROM chars WHERE region = ? AND rs = ? AND data IS NOT NULL AND total >= ?').get(region, rs, cap).n;
  const week = st(db, "SELECT COUNT(*) AS n FROM ms WHERE region = ? AND rs = ? AND what = 'max' AND pre = 0 AND d > ?").get(region, rs, today - 7).n;
  const recent = st(db, "SELECT key, d FROM ms WHERE region = ? AND rs = ? AND what = 'max' AND pre = 0 ORDER BY d DESC, key LIMIT ?").all(region, rs, n)
    .map(m => light(db, m.key, { at: iso(m.d) })).filter(Boolean);
  const nx = st(db, 'SELECT key, total, g7 FROM chars WHERE region = ? AND rs = ? AND data IS NOT NULL AND total < ? ORDER BY total DESC, g7 DESC, key LIMIT ?').all(region, rs, cap, next)
    .map(c => light(db, c.key, { left: cap - c.total, eta: c.g7 > 0 ? Math.ceil((cap - c.total) / (c.g7 / 7)) : null })).filter(Boolean);
  return { region, rs, cap, players, atMax, week, recent, next: nx };
}

// -------------------------------------------------------------------------------- B. la compétence de la semaine
// une compétence par semaine (du lundi au dimanche, UTC), en rotation fixe : le site peut l'afficher sans attendre
export const WEEK_SKILLS = ['p356', 'p185', 'p129', 'defense', 'p186', 'p182', 'p393', 'p197', 'p164', 'p165', 'p171', 'p202', 'p333'];
const mondayOf = day => day - ((day + 3) % 7);            // 1970-01-01 était un jeudi
export const weekSkillOf = day => WEEK_SKILLS[Math.floor(mondayOf(day) / 7) % WEEK_SKILLS.length];
export function weekSkill(db, { region, rs, today, n = 10, k = null }) {
  rs = pickRs(db, region, rs);
  const mon = mondayOf(today), skill = weekSkillOf(today), path = '$.' + (skill === 'defense' ? 'd' : skill);
  // départ : le dernier point avant lundi, sinon le premier de la semaine ; arrivée : le dernier point
  const rows = st(db, `SELECT h.key, h.d, json_extract(h.s, ?) AS v FROM hist h
      WHERE h.d >= ? AND h.key IN (SELECT key FROM sk WHERE region = ? AND rs = ? AND skill = ?) ORDER BY h.key, h.d`).all(path, mon - 7, region, rs, skill);
  const gain = new Map();
  let key = null, base = null, last = null;
  const close = () => { if (key != null && base != null && last != null && last > base) gain.set(key, last - base); };
  for (const r of rows) {
    if (r.key !== key) { close(); key = r.key; base = null; last = null; }
    if (r.v == null) continue;
    if (r.d < mon || base == null) base = r.d < mon ? r.v : (base ?? r.v);
    if (r.d >= mon) last = r.v;
  }
  close();
  const list = [...gain].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  let prev = null, rk = 0;
  const ranked = list.map(([key, g], i) => { if (g !== prev) { rk = i + 1; prev = g; } return { key, g, r: rk }; });
  const mine = k ? ranked.find(x => x.key === k) : null;
  return { region, rs, skill, start: iso(mon), end: iso(mon + 6), daysLeft: mon + 7 - today, total: list.reduce((a, x) => a + x[1], 0), players: list.length,
    podium: ranked.slice(0, n).map(x => light(db, x.key, { r: x.r, gain: x.g })).filter(Boolean), me: mine ? { key: k, r: mine.r, gain: mine.g } : (k ? { key: k, r: null, gain: 0 } : null) };
}

// ------------------------------------------------------------------------------ C. ta place dans le monde
// centiles par compétence, pour le type de royaume et pour chaque classe : le site place lui-même le joueur
export const Q_SKILLS = ['total', 'level', 'defense', 'hk', 'kd', 'duels', 'killingBlows', 'kills', 'quests', 'dungeons', 'flights'];
export const Q_POINTS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99];
const quant = vs => Q_POINTS.map(q => vs[Math.min(vs.length - 1, Math.floor(q / 100 * vs.length))]);
export function quantiles(db, { region, rs }) {
  rs = pickRs(db, region, rs);
  const out = {};
  for (const sk of Q_SKILLS) {
    const all = [], by = {};
    for (const r of st(db, 'SELECT cls, v FROM sk WHERE region = ? AND rs = ? AND skill = ? ORDER BY v').iterate(region, rs, sk)) {
      all.push(r.v); if (r.cls) (by[r.cls] ??= []).push(r.v);
    }
    if (!all.length) continue;
    out[sk] = { n: all.length, q: quant(all), cls: Object.fromEntries(Object.entries(by).filter(([, v]) => v.length >= 20).map(([c, v]) => [c, { n: v.length, q: quant(v) }])) };
  }
  return { region, rs, points: Q_POINTS, skills: out };
}

// ---------------------------------------------------------------------------- face à face des types de royaume
// une ligne par type : effectif, part de 60, au max, moyennes par joueur (jamais de sommes entre types), classes, factions
export function compare(db, { region }) {
  const rows = st(db, `SELECT rs, COUNT(*) AS n, SUM(level >= 60) AS l60, AVG(total) AS avg, AVG(COALESCE(g7, 0)) AS g7, SUM(COALESCE(g7, 0) > 0) AS movers,
      SUM(total >= json_extract(data, '$.max')) AS atMax FROM chars WHERE region = ? AND data IS NOT NULL AND rs > 0 GROUP BY rs`).all(region);
  const cls = st(db, 'SELECT rs, cls, COUNT(*) AS n FROM chars WHERE region = ? AND data IS NOT NULL AND rs > 0 AND cls IS NOT NULL GROUP BY rs, cls').all(region);
  const fac = st(db, 'SELECT rs, faction, COUNT(*) AS n FROM chars WHERE region = ? AND data IS NOT NULL AND rs > 0 AND faction IS NOT NULL GROUP BY rs, faction').all(region);
  const types = {};
  for (const r of rows) types[r.rs] = { n: r.n, l60: r.l60 ?? 0, atMax: r.atMax ?? 0, avgTotal: Math.round(r.avg ?? 0), avgG7: Math.round((r.g7 ?? 0) * 10) / 10,
    movers: r.movers ?? 0, small: r.n < 300, classes: {}, factions: {} };
  for (const c of cls) if (types[c.rs]) types[c.rs].classes[c.cls] = c.n;
  for (const f of fac) if (types[f.rs]) types[f.rs].factions[f.faction] = f.n;
  return { region, types };
}
