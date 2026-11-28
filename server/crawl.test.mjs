import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRAWL, nextVisit, rosterMembers, crawlPlayer, moved, histPoint, discoverOrder, crawlEta, validCharKey } from './crawl-lib.mjs';
import { openCrawlDb, addChars, addGuild, saveChar, goneChar, purgeOld, pickWork, dueGuild, activePlayers, charByKey, searchChars, rankPage, crawlCounts } from './crawl.mjs';

const api = (o = {}) => ({
  profile: { name: 'Ray', surname: 'Kuilu', level: 37, character_class: { id: 11, name: 'Druide' }, race: { id: 4, name: 'Elfe de la nuit' }, faction: { type: 'ALLIANCE' },
    guild: { name: 'Everybody Knows', slug: 'everybody-knows' }, ruleset: { id: 1, name: 'Normal' }, ...o.profile },
  professions: { primaries: [{ profession: { id: 393, name: 'Skinning' }, tiers: [{ skill_points: o.skin ?? 200, max_skill_points: 225 }] }] },
  equipment: { equipped_items: [] }, statistics: {}, achStats: { categories: [] },
});

test('relevé : règles pures', () => {
  assert.equal(nextVisit(100, 99), 100 + CRAWL.REFRESH_ACTIVE);
  assert.equal(nextVisit(100, 50), 100 + CRAWL.REFRESH_IDLE);
  assert.equal(nextVisit(100, null), 100 + CRAWL.REFRESH_IDLE);
  assert.ok(CRAWL.REFRESH_IDLE < CRAWL.KEEP_DAYS, 'relu bien avant 30 jours');
  assert.deepEqual(rosterMembers('eu', { members: [{ character: { slug: 'A-B', level: 12 } }, { character: { slug: 'c-d', level: 9 } }, { character: {} }] }), [{ key: 'eu/a-b', level: 12 }]);
  assert.ok(validCharKey('eu/ray-kuilu') && !validCharKey('eu/ray') && !validCharKey('xx/a-b'));
  const p = crawlPlayer('eu', 'Ray-Kuilu', api());
  assert.equal(p.key, 'eu/ray-kuilu'); assert.equal(p.level, 37); assert.equal(p.guild.slug, 'everybody-knows'); assert.equal(p.preview, true);
  assert.ok(!('gear' in p));
  assert.equal(moved(null, histPoint(p)), false, 'premier passage : pas « actif »');
  assert.equal(moved(histPoint(p), histPoint(crawlPlayer('eu', 'ray-kuilu', api({ skin: 201 })))), true);
  const order = [{ key: 'b', src: 'guild', level: 60 }, { key: 'a', src: 'scout', level: 10 }, { key: 'c', src: 'guild', level: 20 }].sort(discoverOrder);
  assert.deepEqual(order.map(x => x.key), ['a', 'b', 'c']);
  assert.equal(crawlEta(1000, 5000), 1); assert.equal(crawlEta(10, 0), null);
});

test('relevé : base, découverte, actifs, introuvables, 30 jours, recherche, classement', () => {
  const db = openCrawlDb(':memory:');
  assert.equal(addChars(db, [{ key: 'eu/ray-kuilu', level: 37 }, { key: 'eu/x-y', level: 60 }, { key: 'pas-valide' }], 'guild', 100), 2);
  addChars(db, [{ key: 'eu/ray-kuilu' }], 'scout', 100);   // meilleure source : passe devant
  assert.deepEqual(pickWork(db, 2, new Set(), 100).map(w => w.key), ['eu/ray-kuilu', 'eu/x-y']);
  assert.deepEqual(pickWork(db, 2, new Set(['eu/ray-kuilu']), 100).map(w => w.key), ['eu/x-y']);

  saveChar(db, crawlPlayer('eu', 'ray-kuilu', api()), 100);
  assert.equal(activePlayers(db, 14, 100).length, 0, 'un seul point : pas encore actif');
  assert.equal(dueGuild(db, 100)?.key, 'eu/everybody-knows', 'sa guilde entre dans la boule de neige');
  saveChar(db, crawlPlayer('eu', 'ray-kuilu', api({ skin: 210 })), 101);
  const act = activePlayers(db, 14, 101);
  assert.equal(act.length, 1); assert.equal(act[0].history.length, 2); assert.equal(act[0].history[1].s.p393, 210);
  assert.equal(charByKey(db, 'eu/ray-kuilu').total, act[0].total);
  assert.deepEqual(pickWork(db, 5, new Set(), 101).map(w => w.key), ['eu/x-y'], 'déjà lu aujourd\'hui : pas relu');
  assert.deepEqual(searchChars(db, 'ray').map(r => r.key), ['eu/ray-kuilu']);
  assert.deepEqual(searchChars(db, 'kui').map(r => r.key), ['eu/ray-kuilu'], 'par le nom de famille');
  assert.deepEqual(searchChars(db, 'ray ku').map(r => r.key), ['eu/ray-kuilu']);
  assert.deepEqual(searchChars(db, 'r'), [], 'au moins 2 lettres');
  const rk = rankPage(db, 'eu', 1, 50); assert.equal(rk.total, 1); assert.equal(rk.rows[0].r, 1);

  goneChar(db, 'eu/ray-kuilu', 102);
  assert.equal(charByKey(db, 'eu/ray-kuilu'), null, 'introuvable : effacé');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM hist').get().n, 0);
  saveChar(db, crawlPlayer('eu', 'x-y', api({ profile: { name: 'X', surname: 'Y', guild: null } })), 102);
  purgeOld(db, 102 + CRAWL.KEEP_DAYS + 1);
  assert.equal(charByKey(db, 'eu/x-y'), null, 'plus de 30 jours sans relecture : effacé');
  addGuild(db, 'eu', 'Les-Veilleurs', 'Les Veilleurs', 'follow');
  const c = crawlCounts(db, 140);
  assert.equal(c.known, 2); assert.equal(c.read, 0); assert.equal(c.guilds, 2);
});

import { lookupSlug } from './crawl-lib.mjs';
test('recherche directe : seulement un « Prénom Nom » complet', () => {
  assert.equal(lookupSlug('Ray Kuilu'), 'ray-kuilu');
  assert.equal(lookupSlug('  Dé   Monique '), 'dé-monique');
  for (const bad of ['ray', 'a b', 'ray kuilu x', 'x<y z', 'ray-kuilu', '']) assert.equal(lookupSlug(bad), null, bad);
});
