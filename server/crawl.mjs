// Relevé continu de tout le serveur WoW Forever, en tâche de fond dans le service api.dropamine.app.
//
// - Découverte en boule de neige : Scout, guildes suivies, inscrits et joueurs du site → leurs guildes → les membres
//   de ces guildes → leurs guildes… (une liste de guilde = 1 appel, elle donne des dizaines de personnages).
// - Chaque personnage est lu en version légère (5 appels) et rangé dans une base SQLite (server/.state/crawl.db) :
//   niveau total, compétences, guilde, et un point d'historique par jour.
// - Débit réglé (appels par seconde) pour rester sous la limite Blizzard (36 000 / h, partagée avec la mise à jour GitHub).
// - Conditions Blizzard : rien de plus vieux que 30 jours ; un personnage introuvable est effacé.
//
// Le site publie ensuite ceux qui sont actifs (export /hs/active) et peut chercher dans tout le serveur (/hs/search, /hs/char).
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { CRAWL, SRC_PRIO, dayOf, isoDay, charKey, validCharKey, nextVisit, rosterMembers, crawlPlayer, histPoint, moved, discoverOrder, crawlEta, lookupSlug, HOUR_CAP, HOUR_MAX, slowDown, speedUp, regMode } from './crawl-lib.mjs';

const LOCALE = { eu: 'fr_FR', us: 'en_US', tw: 'zh_TW' };
export const fold = s => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function openCrawlDb(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS chars (
      key TEXT PRIMARY KEY, region TEXT NOT NULL, slug TEXT NOT NULL, src TEXT, prio INTEGER DEFAULT 9, level INTEGER DEFAULT 0,
      found INTEGER, fetched INTEGER, next_at INTEGER, active_at INTEGER, gone INTEGER DEFAULT 0, fails INTEGER DEFAULT 0,
      guild TEXT, nf TEXT, sf TEXT, total INTEGER, data TEXT);
    CREATE INDEX IF NOT EXISTS chars_new ON chars (fetched, gone, prio, level);
    CREATE INDEX IF NOT EXISTS chars_due ON chars (gone, next_at);
    CREATE INDEX IF NOT EXISTS chars_active ON chars (active_at);
    CREATE INDEX IF NOT EXISTS chars_rank ON chars (region, total);
    CREATE INDEX IF NOT EXISTS chars_nf ON chars (nf);
    CREATE INDEX IF NOT EXISTS chars_sf ON chars (sf);
    CREATE TABLE IF NOT EXISTS hist (key TEXT NOT NULL, d INTEGER NOT NULL, t INTEGER, s TEXT, hk INTEGER, PRIMARY KEY (key, d));
    CREATE TABLE IF NOT EXISTS guilds (key TEXT PRIMARY KEY, region TEXT NOT NULL, slug TEXT NOT NULL, name TEXT, members INTEGER, roster_at INTEGER, src TEXT);
    CREATE INDEX IF NOT EXISTS guilds_due ON guilds (roster_at);
    CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
  `);
  for (const col of ['name TEXT', 'surname TEXT', 'cls INTEGER', 'race INTEGER', 'faction TEXT', 'gname TEXT']) {
    try { db.exec(`ALTER TABLE chars ADD COLUMN ${col}`); } catch { /* déjà là */ }
  }
  db.exec('CREATE INDEX IF NOT EXISTS chars_known ON chars (region, cls)');
  return db;
}

// ajoute des personnages à découvrir (une meilleure source fait passer devant)
export function addChars(db, items, src, today = dayOf()) {
  const ins = db.prepare(`INSERT INTO chars (key, region, slug, src, prio, level, found, next_at, name, surname, cls, race, faction, gname, nf, sf, guild)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET prio = MIN(prio, excluded.prio), src = CASE WHEN excluded.prio < prio THEN excluded.src ELSE src END,
      level = MAX(level, excluded.level), name = COALESCE(excluded.name, name), surname = COALESCE(excluded.surname, surname),
      cls = COALESCE(excluded.cls, cls), race = COALESCE(excluded.race, race), faction = COALESCE(excluded.faction, faction),
      gname = COALESCE(excluded.gname, gname), nf = COALESCE(nf, excluded.nf), sf = COALESCE(sf, excluded.sf), guild = COALESCE(excluded.guild, guild)`);
  let n = 0;
  db.exec('BEGIN');
  try {
    for (const it of items) {
      if (!validCharKey(it.key)) continue;
      const [region, slug] = it.key.split('/');
      ins.run(it.key, region, slug, src, SRC_PRIO[src] ?? 9, it.level ?? 0, today, today, it.name ?? null, it.surname ?? null, it.cls ?? null,
        it.race ?? null, it.faction ?? null, it.gname ?? null, it.name ? fold(it.name) : null, it.surname ? fold(it.surname) : null, it.gkey ?? null);
      n++;
    }
    db.exec('COMMIT');
  } catch (err) { db.exec('ROLLBACK'); throw err; }
  return n;
}
export function addGuild(db, region, slug, name, src) {
  if (!slug) return;
  db.prepare(`INSERT INTO guilds (key, region, slug, name, src) VALUES (?, ?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET name = COALESCE(excluded.name, name)`)
    .run(`${region}/${String(slug).toLowerCase()}`, region, String(slug).toLowerCase(), name ?? null, src);
}

// enregistre une fiche lue : point d'historique du jour, « actif » s'il a progressé, prochain passage
export function saveChar(db, player, today = dayOf()) {
  const pt = histPoint(player);
  const prev = db.prepare('SELECT t, s, hk FROM hist WHERE key = ? AND d < ? ORDER BY d DESC LIMIT 1').get(player.key, today);
  const prevPt = prev ? { t: prev.t, s: JSON.parse(prev.s), ...(prev.hk != null ? { hk: prev.hk } : {}) } : null;
  const old = db.prepare('SELECT active_at FROM chars WHERE key = ?').get(player.key);
  const active = moved(prevPt, pt) ? today : (old?.active_at ?? null);
  db.prepare('INSERT INTO hist (key, d, t, s, hk) VALUES (?, ?, ?, ?, ?) ON CONFLICT(key, d) DO UPDATE SET t = excluded.t, s = excluded.s, hk = excluded.hk')
    .run(player.key, today, pt.t, JSON.stringify(pt.s), pt.hk ?? null);
  const gkey = player.guild?.slug ? `${player.region}/${player.guild.slug.toLowerCase()}` : null;
  db.prepare(`INSERT INTO chars (key, region, slug, src, prio, level, found, fetched, next_at, active_at, gone, fails, guild, nf, sf, total, data)
      VALUES (?, ?, ?, 'site', 3, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET level = excluded.level, fetched = excluded.fetched, next_at = excluded.next_at, active_at = excluded.active_at,
      gone = 0, fails = 0, guild = excluded.guild, nf = excluded.nf, sf = excluded.sf, total = excluded.total, data = excluded.data`)
    .run(player.key, player.region, player.slug, player.level, today, today, nextVisit(today, active, !prevPt), active, gkey,
      fold(player.name), fold(player.surname), player.total, JSON.stringify(player));
  db.prepare('UPDATE chars SET name = ?, surname = ?, cls = ?, race = ?, faction = ?, gname = ? WHERE key = ?')
    .run(player.name ?? null, player.surname ?? null, player.classId ?? null, player.raceId ?? null, player.faction ?? null, player.guild?.name ?? null, player.key);
  if (gkey) addGuild(db, player.region, player.guild.slug, player.guild.name, 'char');
  return { active: active != null && today - active <= CRAWL.ACTIVE_DAYS };
}
// introuvable (supprimé, renommé, sous le niveau 10) : conditions Blizzard, on efface tout ce qu'on savait
export function setMedia(db, key, media, today = dayOf()) {
  const row = db.prepare('SELECT data FROM chars WHERE key = ? AND data IS NOT NULL').get(key); if (!row) return;
  const p = JSON.parse(row.data), asset = k => media?.assets?.find(a => a.key === k)?.value ?? null;
  Object.assign(p, { avatar: asset('avatar'), inset: asset('inset'), render: asset('main-raw'), mediaAt: today });
  db.prepare('UPDATE chars SET data = ? WHERE key = ?').run(JSON.stringify(p), key);
}
export const needsMedia = (p, today = dayOf()) => !p.mediaAt || today - p.mediaAt >= 7;
export function goneChar(db, key, today = dayOf()) {
  db.prepare('UPDATE chars SET gone = ?, data = NULL, total = NULL, fetched = NULL, next_at = ?, nf = NULL, sf = NULL, name = NULL, surname = NULL, cls = NULL, race = NULL, faction = NULL, gname = NULL WHERE key = ?').run(today, today + CRAWL.GONE_RETRY, key);
  db.prepare('DELETE FROM hist WHERE key = ?').run(key);
}
// ménage quotidien : rien de plus vieux que 30 jours
export function purgeOld(db, today = dayOf()) {
  const cut = today - CRAWL.KEEP_DAYS;
  db.prepare('DELETE FROM hist WHERE d < ?').run(cut);
  db.prepare('UPDATE chars SET data = NULL, total = NULL, fetched = NULL, nf = NULL, sf = NULL, name = NULL, surname = NULL, cls = NULL, race = NULL, faction = NULL, gname = NULL, next_at = ? WHERE fetched IS NOT NULL AND fetched < ?').run(today, cut);
  db.prepare('UPDATE chars SET gone = 0 WHERE gone > 0 AND next_at <= ?').run(today);   // introuvables : retentés après 30 jours
}

// prochains travaux : d'abord la découverte, puis les relectures dues
export function pickWork(db, n, skip, today = dayOf()) {
  const out = [];
  const take = rows => { for (const r of rows) if (out.length < n && !skip.has(r.key)) out.push(r); };
  take(db.prepare('SELECT key, region, slug FROM chars WHERE fetched IS NULL AND gone = 0 ORDER BY prio, level DESC LIMIT ?').all(n + skip.size));
  if (out.length < n) take(db.prepare('SELECT key, region, slug FROM chars WHERE fetched IS NOT NULL AND gone = 0 AND next_at <= ? ORDER BY next_at LIMIT ?').all(today, n + skip.size));
  return out;
}
export function dueGuild(db, today = dayOf()) {
  return db.prepare('SELECT key, region, slug, src FROM guilds WHERE roster_at IS NULL OR roster_at <= ? ORDER BY roster_at IS NOT NULL, roster_at LIMIT 1').get(today - CRAWL.ROSTER_DAYS) ?? null;
}

// lectures pour le site
const hydrate = (db, row) => {
  const p = JSON.parse(row.data);
  p.history = db.prepare('SELECT d, t, s, hk FROM hist WHERE key = ? ORDER BY d').all(row.key)
    .map(h => ({ d: isoDay(h.d), t: h.t, s: JSON.parse(h.s), ...(h.hk != null ? { hk: h.hk } : {}) }));
  p.fetched = row.fetched;
  return p;
};
export function allPlayers(db) {
  const hist = new Map();
  for (const h of db.prepare('SELECT key, d, t, s, hk FROM hist ORDER BY key, d').iterate())
    (hist.get(h.key) ?? hist.set(h.key, []).get(h.key)).push({ d: isoDay(h.d), t: h.t, s: JSON.parse(h.s), ...(h.hk != null ? { hk: h.hk } : {}) });
  const out = [];
  for (const r of db.prepare('SELECT key, data, fetched FROM chars WHERE data IS NOT NULL').iterate()) {
    const p = JSON.parse(r.data); p.history = hist.get(r.key) ?? []; p.fetched = r.fetched; out.push(p);
  }
  return out;
}
export function activePlayers(db, days = CRAWL.ACTIVE_DAYS, today = dayOf()) {
  return db.prepare('SELECT key, data, fetched FROM chars WHERE active_at >= ? AND data IS NOT NULL').all(today - days).map(r => hydrate(db, r));
}
export function charByKey(db, key) {
  const r = db.prepare('SELECT key, data, fetched FROM chars WHERE key = ? AND data IS NOT NULL').get(key);
  return r ? hydrate(db, r) : null;
}
export function searchChars(db, q, limit = 20) {
  const words = fold(q).trim().split(/\s+/).filter(Boolean);
  if (!words.length || words[0].length < 2) return [];
  const [a, b] = words, hi = s => s + '\u{10FFFF}';
  const cols = 'key, region, slug, name, surname, level, cls, total, gname, data IS NOT NULL AS isread';
  const rows = b
    ? db.prepare(`SELECT ${cols} FROM chars WHERE nf = ? AND sf >= ? AND sf < ? AND gone = 0 ORDER BY isread DESC, total DESC, level DESC LIMIT ?`).all(a, b, hi(b), limit)
    : db.prepare(`SELECT ${cols} FROM chars WHERE gone = 0 AND ((nf >= ? AND nf < ?) OR (sf >= ? AND sf < ?)) ORDER BY isread DESC, total DESC, level DESC LIMIT ?`).all(a, hi(a), a, hi(a), limit);
  return rows.map(r => ({ key: r.key, region: r.region, slug: r.slug, name: r.name, surname: r.surname, level: r.level, classId: r.cls, total: r.total, guild: r.gname, read: !!r.isread }));
}
export function knownCounts(db, region) {
  const q = sql => db.prepare(sql).all(region);
  const base = "FROM chars WHERE region = ? AND gone = 0 AND cls IS NOT NULL";
  const n = db.prepare(`SELECT COUNT(*) AS n, SUM(level >= 60) AS l60 ${base}`).get(region);
  return {
    n: n.n ?? 0, lvl60: n.l60 ?? 0,
    classes: Object.fromEntries(q(`SELECT cls AS k, COUNT(*) AS n ${base} GROUP BY cls`).map(r => [r.k, r.n])),
    classes60: Object.fromEntries(q(`SELECT cls AS k, COUNT(*) AS n ${base} AND level >= 60 GROUP BY cls`).map(r => [r.k, r.n])),
    races: Object.fromEntries(q(`SELECT race AS k, COUNT(*) AS n ${base} AND race IS NOT NULL GROUP BY race`).map(r => [r.k, r.n])),
    factions: Object.fromEntries(q(`SELECT faction AS k, COUNT(*) AS n ${base} AND faction IS NOT NULL GROUP BY faction`).map(r => [r.k, r.n])),
    levels: q(`SELECT CASE WHEN level >= 60 THEN 60 ELSE (level / 10) * 10 END AS k, COUNT(*) AS n ${base} GROUP BY k`).map(r => ({ a: r.k, b: r.k === 60 ? 60 : r.k + 9, n: r.n })),
    guilds: db.prepare("SELECT COUNT(DISTINCT gname) AS n FROM chars WHERE region = ? AND gone = 0 AND gname IS NOT NULL").get(region).n,
  };
}
export function guildMembers(db, gkey) {
  const g = db.prepare('SELECT key, name, members, roster_at FROM guilds WHERE key = ?').get(gkey);
  const region = gkey.split('/')[0];
  const rows = db.prepare(`SELECT key, name, surname, level, cls, race, faction, total, data IS NOT NULL AS isread FROM chars
    WHERE gone = 0 AND region = ? AND (guild = ? OR (guild IS NULL AND gname = ?)) ORDER BY total DESC, level DESC LIMIT 2000`).all(region, gkey, g?.name ?? '');
  return { key: gkey, name: g?.name ?? null, roster: g?.members ?? null, rosterAt: g?.roster_at ?? null,
    members: rows.map(r => ({ key: r.key, name: r.name, surname: r.surname, level: r.level, classId: r.cls, raceId: r.race, faction: r.faction, total: r.total, read: !!r.isread })) };
}
export function rankPage(db, region, page = 1, per = 50) {
  const n = db.prepare('SELECT COUNT(*) AS n FROM chars WHERE region = ? AND data IS NOT NULL').get(region).n;
  const rows = db.prepare('SELECT data FROM chars WHERE region = ? AND data IS NOT NULL ORDER BY total DESC, key LIMIT ? OFFSET ?').all(region, per, (page - 1) * per);
  return { total: n, page, per, rows: rows.map((r, i) => { const p = JSON.parse(r.data); return { r: (page - 1) * per + i + 1, key: p.key, name: p.name, surname: p.surname, level: p.level, classId: p.classId, total: p.total, guild: p.guild?.name ?? null }; }) };
}
export function crawlCounts(db, today = dayOf()) {
  const one = sql => db.prepare(sql).get(today - CRAWL.ACTIVE_DAYS)?.n ?? 0;
  return {
    known: db.prepare('SELECT COUNT(*) AS n FROM chars').get().n,
    read: db.prepare('SELECT COUNT(*) AS n FROM chars WHERE data IS NOT NULL').get().n,
    waiting: db.prepare('SELECT COUNT(*) AS n FROM chars WHERE fetched IS NULL AND gone = 0').get().n,
    due: db.prepare('SELECT COUNT(*) AS n FROM chars WHERE fetched IS NOT NULL AND gone = 0 AND next_at <= ?').get(today).n,
    gone: db.prepare('SELECT COUNT(*) AS n FROM chars WHERE gone > 0').get().n,
    active: one('SELECT COUNT(*) AS n FROM chars WHERE active_at >= ?'),
    lvl60: db.prepare('SELECT COUNT(*) AS n FROM chars WHERE data IS NOT NULL AND level >= 60').get().n,
    guilds: db.prepare('SELECT COUNT(*) AS n FROM guilds').get().n,
    guildsDue: db.prepare('SELECT COUNT(*) AS n FROM guilds WHERE roster_at IS NULL OR roster_at <= ?').get(today - CRAWL.ROSTER_DAYS).n,
  };
}

// ---------------------------------------------------------------------------------------------- moteur
export function startCrawl({ stateDir, clientId, clientSecret, readRaw, log = console }) {
  mkdirSync(stateDir, { recursive: true });
  const db = openCrawlDb(join(stateDir, 'crawl.db'));
  let target = CRAWL.RATE, rate = CRAWL.RATE, last429 = 0, bucket = 0, lastFill = Date.now(), tok = null, tokExp = 0, stopped = false, busy = 0, errors = 0, lastErr = null, refused = 0, manualWaiting = 0;
  const manualMin = new Array(60).fill(0);   // appels faits pour des visiteurs, par minute
  const minutes = new Array(60).fill(0), minuteOf = () => Math.floor(Date.now() / 60e3);
  let curMin = minuteOf();
  const count = (n, manual) => { const m = minuteOf(); while (curMin < m) { curMin++; minutes[curMin % 60] = 0; manualMin[curMin % 60] = 0; } minutes[m % 60] += n; if (manual) manualMin[m % 60] += n; };
  const manualLastMin = () => { count(0); return manualMin[curMin % 60] + manualMin[(curMin + 59) % 60]; };
  const callsLastHour = () => { count(0); return minutes.reduce((a, b) => a + b, 0); };
  const callsLast10 = () => { count(0); let n = 0; for (let i = 1; i <= 10; i++) n += minutes[(curMin - i + 60) % 60]; return n; };
  const inflight = new Set();
  const feed = []; let feedId = 0;
  const note = ev => { feed.push({ id: ++feedId, t: Date.now(), ...ev }); if (feed.length > 200) feed.shift(); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // seau de jetons : `rate` appels par seconde au plus. Un visiteur (recherche, fiche demandée) passe avant le relevé de fond,
  // qui lui cède la place tant qu'un appel de visiteur attend ; au-delà de HOUR_CAP sur l'heure, le fond s'arrête.
  async function take(n, manual = false) {
    if (manual) manualWaiting++;
    try {
      for (;;) {
        if (stopped) throw new Error('arrêté');
        if (!manual && (manualWaiting > 0 || callsLastHour() >= HOUR_CAP)) { await sleep(manualWaiting > 0 ? 100 : 5000); continue; }
        if (manual && callsLastHour() >= HOUR_MAX) throw new Error('limite Blizzard de l\'heure atteinte');
        const now = Date.now(); bucket = Math.min(rate * 2, bucket + (now - lastFill) / 1000 * rate); lastFill = now;
        if (rate > 0 && bucket >= n) { bucket -= n; count(n, manual); return; }
        await sleep(rate > 0 ? Math.max(50, (n - bucket) / rate * 1000) : 5000);
      }
    } finally { if (manual) manualWaiting--; }
  }
  async function token() {
    if (tok && Date.now() < tokExp) return tok;
    const res = await fetch('https://oauth.battle.net/token', { method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64') }, body: new URLSearchParams({ grant_type: 'client_credentials' }) });
    if (!res.ok) throw new Error(`jeton Blizzard refusé (${res.status})`);
    const j = await res.json(); tok = j.access_token; tokExp = Date.now() + Math.max(60, (j.expires_in ?? 3600) - 300) * 1000;
    return tok;
  }
  async function get(region, path, manual = false) {
    await take(1, manual);
    const sep = path.includes('?') ? '&' : '?';
    const url = `https://${region}.api.blizzard.com${path}${sep}namespace=profile-forever-${region}&locale=${LOCALE[region] || 'en_US'}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${await token()}` }, signal: AbortSignal.timeout(20e3) });
      if (res.status === 404) return null;
      if (res.status === 401) { tok = null; continue; }
      if (res.status === 429) { refused++; last429 = Date.now(); note({ type: 'refused', rate: slowDown(rate) }); rate = slowDown(rate); await sleep(2000 * (attempt + 1)); continue; }   // Blizzard freine : débit divisé par deux
      if (!res.ok) throw new Error(`${region}${path} → ${res.status}`);
      return res.json();
    }
    throw new Error(`${region}${path} → trop de requêtes`);
  }
  async function readChar(w, manual = false) {
    const base = `/profile/wow/character/${encodeURIComponent(w.slug)}`;
    const profile = await get(w.region, base, manual);
    if (!profile) { goneChar(db, w.key); note({ type: 'gone', key: w.key, manual }); return; }
    const [professions, equipment, statistics, achStats] = await Promise.all([
      get(w.region, `${base}/professions`, manual), get(w.region, `${base}/equipment`, manual), get(w.region, `${base}/statistics`, manual), get(w.region, `${base}/achievements/statistics`, manual)]);
    const player = crawlPlayer(w.region, w.slug, { profile, professions, equipment, statistics, achStats });
    const old = db.prepare('SELECT data FROM chars WHERE key = ? AND data IS NOT NULL').get(w.key);
    const prev = old ? JSON.parse(old.data) : null;
    if (prev?.mediaAt) Object.assign(player, { avatar: prev.avatar, inset: prev.inset, render: prev.render, mediaAt: prev.mediaAt });
    const { active } = saveChar(db, player);
    note({ type: 'char', key: player.key, name: player.name, surname: player.surname, cls: player.classId, level: player.level, total: player.total,
      guild: player.guild?.name ?? null, faction: player.faction ?? null, active, manual, first: !prev });
    if (active && needsMedia(player)) setMedia(db, w.key, await get(w.region, `${base}/character-media`).catch(() => null));
  }
  async function readGuild(g) {
    const roster = await get(g.region, `/data/wow/guild/${encodeURIComponent(g.slug)}/roster`);
    const members = rosterMembers(g.region, roster);
    addChars(db, members.map(m => ({ ...m, gkey: g.key })), g.src === 'follow' ? 'follow' : 'guild');
    db.prepare('UPDATE guilds SET roster_at = ?, members = ? WHERE key = ?').run(dayOf(), roster ? (roster.members ?? []).length : 0, g.key);
    note({ type: 'guild', key: g.key, name: roster?.guild?.name ?? g.slug, faction: roster?.guild?.faction?.type ?? null, members: members.length });
  }
  // une tâche à la fois par « ouvrier » ; une liste de guilde toutes les 4 tâches, pour que la boule de neige grossisse
  let turn = 0;
  async function worker() {
    while (!stopped) {
      if (rate <= 0) { await sleep(10e3); continue; }
      try {
        const g = turn++ % 2 === 0 ? dueGuild(db) : null;
        if (g && !inflight.has(g.key)) { inflight.add(g.key); busy++; try { await readGuild(g); } finally { inflight.delete(g.key); busy--; } continue; }
        const [w] = pickWork(db, 1, inflight);
        if (!w) { const g2 = dueGuild(db); if (g2 && !inflight.has(g2.key)) { inflight.add(g2.key); busy++; try { await readGuild(g2); } finally { inflight.delete(g2.key); busy--; } } else await sleep(30e3); continue; }
        inflight.add(w.key); busy++;
        try { await readChar(w); }
        catch (err) {
          errors++; lastErr = `${new Date().toISOString()} ${err.message}`;
          db.prepare('UPDATE chars SET fails = fails + 1, next_at = ? WHERE key = ?').run(dayOf() + 1, w.key);   // réessayé demain
        } finally { inflight.delete(w.key); busy--; }
      } catch (err) { if (stopped) return; errors++; lastErr = `${new Date().toISOString()} ${err.message}`; await sleep(5e3); }
    }
  }
  // graines : ce que le site connaît déjà (inscrits, Scout, guildes suivies, file d'attente, joueurs publiés)
  async function seed() {
    try {
      const [registry, scouted, follow, queue] = await Promise.all([readRaw('data/registry.json', {}), readRaw('data/scouted.json', {}), readRaw('data/guilds.json', {}), readRaw('data/queue.json', {})]);
      const regKeys = (registry.characters ?? []).map(k => String(k).includes('/') ? String(k).toLowerCase() : 'eu/' + String(k).toLowerCase());
      addChars(db, regKeys.map(key => ({ key })), 'reg');
      addChars(db, Object.entries(scouted.players ?? {}).filter(([, v]) => (v.l ?? 0) >= CRAWL.MIN_LEVEL).map(([key, v]) => ({ key, level: v.l })), 'scout');
      for (const g of follow.guilds ?? []) { const [r, s] = String(g).toLowerCase().split('/'); addGuild(db, r, s, null, 'follow'); }
      addChars(db, Object.entries(queue.players ?? {}).map(([key, v]) => ({ key, level: v.l })), 'site');
      const site = await fetch('https://dropamine.app/data/hiscores.json').then(r => r.ok ? r.json() : null).catch(() => null);
      if (site?.players) {
        addChars(db, site.players.map(p => ({ key: p.key, level: p.level })), 'site');
        for (const p of site.players) if (p.guild?.slug) addGuild(db, p.region || 'eu', p.guild.slug, p.guild.name, 'site');
      }
      db.prepare("INSERT INTO meta (k, v) VALUES ('seeded', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(new Date().toISOString());
      if (!db.prepare("SELECT v FROM meta WHERE k = 'since'").get()) db.prepare("INSERT INTO meta (k, v) VALUES ('since', ?)").run(String(dayOf()));
    } catch (err) { log.warn('relevé serveur, graines :', err.message); }
  }
  // réglages (page admin, data/settings.json) : crawlRate = appels par seconde, 0 = arrêté
  async function settings() {
    try { const s = await readRaw('data/settings.json', {}); if (Number.isFinite(s.crawlRate)) { target = Math.max(0, Math.min(CRAWL.RATE_MAX, s.crawlRate)); rate = Date.now() - last429 > 10 * 60e3 ? target : Math.min(rate, target); } }
    catch { /* on garde le réglage courant */ }
  }
  const timers = [];
  (async () => {
    await settings(); await seed(); purgeOld(db);
    timers.push(setInterval(() => { rate = speedUp(rate, target, Date.now() - last429); }, 60e3), setInterval(settings, 10 * 60e3), setInterval(seed, 6 * 3600e3), setInterval(() => purgeOld(db), 6 * 3600e3));
    timers.forEach(t => t.unref?.());
    for (let i = 0; i < 12; i++) worker();
  })();
  return {
    db,
    status() {
      const c = crawlCounts(db), calls = callsLastHour();
      const manual = manualLastMin();
      const perMin = Array.from({ length: 30 }, (_, i) => minutes[(curMin - 29 + i + 60) % 60]);
      return { ...c, rate, target, perHour: Math.round(rate * 3600), callsLastHour: calls, refused, busy, errors, lastErr,
        mode: regMode({ rate, target, hourCalls: calls, manualLastMin: manual }), manualLastMin: manual, perMin, last429: last429 ? new Date(last429).toISOString() : null,
        etaHours: crawlEta(c.waiting, callsLast10() * 6), since: Number(db.prepare("SELECT v FROM meta WHERE k = 'since'").get()?.v ?? 0) || null,
        seeded: db.prepare("SELECT v FROM meta WHERE k = 'seeded'").get()?.v ?? null };
    },
    active: days => activePlayers(db, days),
    all: () => allPlayers(db),
    char: key => charByKey(db, key),
    search: (q, limit) => searchChars(db, q, limit),
    rank: (region, page, per) => rankPage(db, region, page, per),
    add: (items, src) => addChars(db, items, src),
    async readNow(key) {
      const known = charByKey(db, key); if (known) return known;
      const row = db.prepare('SELECT region, slug FROM chars WHERE key = ? AND gone = 0').get(key);
      if (!row || rate <= 0 || inflight.has(key)) return null;
      inflight.add(key);
      try { await readChar({ key, region: row.region, slug: row.slug }, true); } finally { inflight.delete(key); }
      return charByKey(db, key);
    },
    known: region => knownCounts(db, region),
    guild: gkey => guildMembers(db, gkey),
    feed: since => feed.filter(x => x.id > (since || 0)),
    // recherche directe : un joueur que le relevé ne connaît pas encore est lu tout de suite chez Blizzard (5 appels)
    async lookup(region, name) {
      const slug = lookupSlug(name); if (!slug || rate <= 0) return null;   // relevé coupé dans l'admin : pas d'appel Blizzard
      const key = charKey(region, slug);
      const known = charByKey(db, key); if (known) return known;
      if (inflight.has(key)) { for (let i = 0; i < 40 && inflight.has(key); i++) await sleep(500); return charByKey(db, key); }
      addChars(db, [{ key }], 'scout');
      inflight.add(key);
      try { await readChar({ key, region, slug }, true); } finally { inflight.delete(key); }
      return charByKey(db, key);
    },
    stop() { stopped = true; timers.forEach(clearInterval); },
  };
}
