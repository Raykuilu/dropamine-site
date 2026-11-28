import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openCrawlDb, saveChar, goneChar, purgeOld, charByKey, searchChars } from './crawl.mjs';
import { skillValues, gains, loadOverlay, indexChar, refreshGuilds, rulesetCounts, rankList, guildList, movers, meDash, reindexAll, indexStale, ranksOf } from './hs-index.mjs';

const P = (key, o = {}) => ({ key, region: key.split('/')[0], slug: key.split('/')[1], name: key.split('/')[1].split('-')[0], surname: 'zed', classId: 1, raceId: 1,
  faction: 'ALLIANCE', guild: { name: 'Les Gens', slug: 'les-gens' }, rulesetId: 1, level: 60, total: 1000, defense: 300,
  weaponList: [{ id: 'swords', rank: 300, est: true }], professions: [{ id: 186, skill: 150 }], parts: { professions: 150 }, stats: { hk: 30, pvpDeaths: 10, duelsWon: 2 }, complete: true, ...o });

test('valeurs classées : mêmes règles que le site', () => {
  const v = skillValues(P('eu/a-b'));
  assert.equal(v.total, 1000); assert.equal(v.p186, 150); assert.equal(v.hk, 30); assert.equal(v.kd, 3);
  assert.ok(!('wswords' in v), 'arme estimée exclue');
  assert.equal(skillValues(P('eu/a-b', { weaponList: [{ id: 'swords', rank: 280 }] })).wswords, 280);
  assert.ok(!('kd' in skillValues(P('eu/a-b', { stats: { hk: 5, pvpDeaths: 2 } }))), 'K/D : 20 combats au moins');
  assert.ok(!('duels' in skillValues(P('eu/a-b', { stats: { duelsWon: 0 } }))), 'valeur nulle : pas classé');
  assert.equal(skillValues(P('eu/a-b', { dropamine: { collection: { x: 9, y: 100 } } })).clog, 9);
});

test('gains : veille et 7 jours', () => {
  const h = [{ d: '2026-11-20', t: 900, s: { l: 58 } }, { d: '2026-11-27', t: 980, s: { l: 59 } }, { d: '2026-11-28', t: 1000, s: { l: 60 } }];
  assert.deepEqual(gains(h, true), { g1: 20, g7: 100 });
  assert.deepEqual(gains([h[0], h[2]], true), { g1: 0, g7: 100 }, 'points trop espacés : pas de gain du jour');
  assert.deepEqual(gains(h.slice(-1), true), { g1: 0, g7: 0 });
});

test('classements par région et type de royaume, jamais mélangés', async () => {
  const db = openCrawlDb(':memory:'), today = 20785;
  saveChar(db, P('eu/a-b', { total: 1500 }), today);
  saveChar(db, P('eu/c-d', { total: 1200, classId: 8, faction: 'HORDE', guild: { name: 'Krijgers', slug: 'krijgers' } }), today);
  saveChar(db, P('eu/e-f', { total: 2000, rulesetId: 2 }), today);
  saveChar(db, P('us/g-h', { total: 2400 }), today);
  const r = rankList(db, { region: 'eu', rs: 1 });
  assert.deepEqual(r.rows.map(x => x.p.key), ['eu/a-b', 'eu/c-d']);
  assert.equal(r.rs, 1); assert.equal(r.total, 2);
  assert.deepEqual(rankList(db, { region: 'eu', rs: 2 }).rows.map(x => x.p.key), ['eu/e-f']);
  assert.equal(rankList(db, { region: 'eu' }).rs, 1, 'sans type : le plus peuplé');
  assert.deepEqual(rulesetCounts(db, 'eu'), { counts: { 1: 2, 2: 1, 3: 0, 15: 0 }, def: 1 });
  assert.deepEqual(rankList(db, { region: 'eu', rs: 1, cls: 8 }).rows.map(x => x.p.key), ['eu/c-d'], 'filtre de classe');
  assert.deepEqual(rankList(db, { region: 'eu', rs: 1, fac: 'HORDE' }).rows.map(x => x.p.key), ['eu/c-d'], 'filtre de faction');
  const me = rankList(db, { region: 'eu', rs: 1, k: 'eu/c-d', per: 1 });
  assert.equal(me.me.r, 2); assert.equal(me.page, 2); assert.equal(me.rows[0].p.key, 'eu/c-d');
  assert.equal(ranksOf(db, 'eu/c-d').total.r, 2);
  // guildes
  refreshGuilds(db);
  const g = guildList(db, { region: 'eu', rs: 1 });
  assert.deepEqual(g.rows.map(x => [x.key, x.n, x.total]), [['eu/les-gens', 1, 1500], ['eu/krijgers', 1, 1200]]);
  assert.equal(guildList(db, { region: 'eu', rs: 1, q: 'krij' }).rows[0].r, 2, 'le rang reste celui du classement complet');
  assert.equal(guildList(db, { region: 'eu', rs: 1, fac: 'HORDE' }).rows.length, 1);
  assert.equal(guildList(db, { region: 'eu', rs: 2 }).rows[0].key, 'eu/les-gens', 'la même guilde existe dans un autre type : comptée à part');
  // recherche : le type choisi d'abord
  assert.equal(searchChars(db, 'zed', 5, 2)[0].key, 'eu/e-f');
  // personnage disparu : retiré des classements
  goneChar(db, 'eu/a-b', today);
  assert.deepEqual(rankList(db, { region: 'eu', rs: 1 }).rows.map(x => x.p.key), ['eu/c-d']);
  // purge des 30 jours
  purgeOld(db, today + 31);
  assert.equal(rankList(db, { region: 'eu', rs: 1 }).total, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sk').get().n, 0);
});

test('inscrits : données riches, gains, tableau de bord, réindex', async () => {
  const db = openCrawlDb(':memory:'), today = 20785;
  saveChar(db, P('eu/a-b', { total: 1500 }), today - 7);
  saveChar(db, P('eu/a-b', { total: 1600 }), today - 1);
  saveChar(db, P('eu/a-b', { total: 1650 }), today);
  saveChar(db, P('eu/c-d', { total: 1200 }), today);
  const keys = loadOverlay(db, { players: [{ ...P('eu/a-b', { total: 1700, weaponList: [{ id: 'swords', rank: 290 }] }), dropamine: { collection: { x: 12, y: 1499 } }, history: [1, 2] }] });
  keys.forEach(k => indexChar(db, k));
  const r = rankList(db, { region: 'eu', rs: 1 });
  assert.equal(r.rows[0].p.key, 'eu/a-b'); assert.equal(r.rows[0].v, 1700, "total de l'inscrit (vraies armes)");
  assert.equal(r.rows[0].g1, 50); assert.equal(r.rows[0].g7, 150);
  assert.ok(!('history' in r.rows[0].p), 'pas d\'historique dans les listes');
  assert.equal(rankList(db, { region: 'eu', rs: 1, skill: 'wswords' }).rows[0].v, 290);
  assert.equal(rankList(db, { region: 'eu', rs: 1, skill: 'clog' }).rows[0].v, 12);
  assert.equal(charByKey(db, 'eu/a-b').dropamine.collection.x, 12, 'fiche enrichie');
  refreshGuilds(db);
  const mv = movers(db, { region: 'eu', rs: 1, today });
  assert.deepEqual(mv.day.map(x => [x.p.key, x.g1]), [['eu/a-b', 50]]);
  assert.equal(mv.guilds[0].g7, 150);
  const d = meDash(db, ['eu/a-b', 'eu/zz-zz'], k => charByKey(db, k));
  assert.equal(d['eu/zz-zz'], null);
  assert.equal(d['eu/a-b'].ranks.total.r, 1); assert.equal(d['eu/a-b'].guild.rank, 1); assert.equal(d['eu/a-b'].guild.members, 2);
  assert.ok(d['eu/a-b'].p.history.length >= 3, 'tableau de bord : fiche complète avec historique');
  // réindex complet
  db.exec('DELETE FROM sk');
  assert.ok(indexStale(db));
  assert.equal(await reindexAll(db, { yieldFn: async () => {} }), 2);
  assert.ok(!indexStale(db));
  assert.equal(rankList(db, { region: 'eu', rs: 1 }).total, 2);
  // fin d'inscription : l'inscrit n'apparaît plus dans reg.json, ses données riches disparaissent
  loadOverlay(db, { players: [] }).forEach(k => indexChar(db, k));
  assert.equal(rankList(db, { region: 'eu', rs: 1, skill: 'clog' }).total, 0);
});
