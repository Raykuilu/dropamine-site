// Tests du service api.dropamine.app (sans réseau) : node --test server/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugFromHref, charactersFromAccount, applyClaim, applyRelease, parseCookies, validKey } from './lib.mjs';

test('lien de personnage → slug', () => {
  assert.equal(slugFromHref('https://eu.api.blizzard.com/profile/wow/character/ray-kuilu?namespace=profile-forever-eu'), 'ray-kuilu');
  assert.equal(slugFromHref('https://eu.api.blizzard.com/profile/wow/character/some-realm/Bob?namespace=x'), 'bob');
  assert.equal(slugFromHref('pas une adresse'), null);
});

test('compte Battle.net → personnages Forever', () => {
  const json = { wow_accounts: [{ characters: [
    { character: { href: 'https://eu.api.blizzard.com/profile/wow/character/ray-kuilu?namespace=profile-forever-eu' }, name: 'Ray', level: 36, playable_class: { id: 11 } },
    { character: { href: 'https://eu.api.blizzard.com/profile/wow/character/solo?namespace=profile-forever-eu' }, name: 'Solo', level: 5 },
  ] }] };
  const list = charactersFromAccount(json, 'eu');
  assert.equal(list.length, 1);                       // « solo » n'a pas de nom de famille : ignoré
  assert.deepEqual([list[0].key, list[0].level, list[0].classId], ['eu/ray-kuilu', 36, 11]);
});

const mine = new Map([['eu/ray-kuilu', { level: 36 }], ['eu/dé-mine', { level: 8 }]]);

test('inscription : seulement ses personnages, niveau 10 minimum', () => {
  const r = applyClaim({ characters: [] }, ['eu/ray-kuilu', 'eu/dé-mine', 'eu/autre-gars'], 'bnet:1', mine);
  assert.deepEqual(r.done, ['eu/ray-kuilu']);
  assert.deepEqual(r.refused.map(x => x.why), ['level', 'not-yours']);
  assert.deepEqual(r.registry.characters, ['eu/ray-kuilu']);
  assert.equal(r.registry.owners['eu/ray-kuilu'], 'bnet:1');
});

test('inscription déjà faite : pas de doublon', () => {
  const r = applyClaim({ characters: ['eu/ray-kuilu'], owners: { 'eu/ray-kuilu': 'Raykuilu' } }, ['eu/ray-kuilu'], 'bnet:1', mine);
  assert.deepEqual(r.registry.characters, ['eu/ray-kuilu']);
  assert.equal(r.registry.owners['eu/ray-kuilu'], 'bnet:1');   // le compte Battle.net devient propriétaire
});

test('retrait : seulement ses personnages', () => {
  const reg = { characters: ['eu/ray-kuilu', 'eu/autre-gars'], owners: {} };
  const r = applyRelease(reg, ['eu/ray-kuilu', 'eu/autre-gars'], mine);
  assert.deepEqual(r.done, ['eu/ray-kuilu']);
  assert.deepEqual(r.registry.characters, ['eu/autre-gars']);
  assert.equal(reg.characters.length, 2);                        // l'original n'est pas modifié
});

test('cookies et identifiants', () => {
  assert.deepEqual(parseCookies('a=1; dsid=x%2Fy'), { a: '1', dsid: 'x/y' });
  assert.ok(validKey('eu/ray-kuilu')); assert.ok(validKey('eu/dé-mine'));
  assert.ok(!validKey('eu/ray')); assert.ok(!validKey('kr/ray-kuilu')); assert.ok(!validKey('eu/ray-kuilu"><script>'));
});

import { hsChecksum, parseHiscoresLine, matchUpload, HS_PREFIX } from './lib.mjs';
const hsLine = body => HS_PREFIX + body + ';c=' + hsChecksum(body);
const BODY = 'n=Ray;l=36;r=eu;g=Everybody Knows;d=177;ws=278;w=136=176,54=102;p=393=223,129=208;v=3.11.0;t=1795600000';

test('ligne hiscores : lue, vérifiée, rattachée au bon personnage', () => {
  const p = parseHiscoresLine(hsLine(BODY) + '\n \nRay · niveau 36');
  assert.equal(p.weapons, 278); assert.equal(p.defense, 177); assert.equal(p.guild, 'Everybody Knows');
  assert.deepEqual(p.weaponList, [{ id: 136, rank: 176 }, { id: 54, rank: 102 }]);
  const chars = new Map([['eu/ray-kuilu', { key: 'eu/ray-kuilu', region: 'eu', name: 'Ray', level: 36 }], ['us/ray-other', { key: 'us/ray-other', region: 'us', name: 'Ray', level: 20 }]]);
  assert.equal(matchUpload(p, chars).key, 'eu/ray-kuilu');
  assert.equal(matchUpload({ ...p, name: 'Bob' }, chars), null);
});
test('ligne hiscores : /played facultatif', () => {
  assert.equal(parseHiscoresLine(hsLine(BODY)).played, null);                 // case décochée : rien
  assert.equal(parseHiscoresLine(hsLine(BODY + ';tp=300000')).played, 300000);
  assert.equal(parseHiscoresLine(hsLine(BODY + ';tp=abc')).played, null);
  assert.equal(parseHiscoresLine(hsLine(BODY + ';tp=999999999999')).played, null);
});
test('ligne hiscores : groupes facultatifs (collection, succès, records, chasse, JcJ)', () => {
  const extra = ";ct=6~69;cl=Gnomeregan~5~29,Onyxia's Lair~1~12;ac=2~3~goal1.sess25;rc=61~19~88~7~30~4~123456;hu=9449~Roueur manuel [test]~42~1;pv=12~340~900~1~3~0~0";
  const p = parseHiscoresLine(hsLine(BODY + extra));
  assert.deepEqual(p.collection, { x: 6, y: 69, dungeons: [{ name: 'Gnomeregan', x: 5, y: 29 }, { name: "Onyxia's Lair", x: 1, y: 12 }] });
  assert.deepEqual(p.achievements, { n: 2, total: 3, ids: ['goal1', 'sess25'] });
  assert.equal(p.records.bestDay, 88); assert.equal(p.records.playtime, 123456);
  assert.deepEqual(p.hunt, [{ id: 9449, name: 'Roueur manuel [test]', tries: 42, drops: 1 }]);
  assert.equal(p.pvp.honorWeek, 340);
  const none = parseHiscoresLine(hsLine(BODY));                               // tout décoché
  for (const k of ['collection', 'achievements', 'records', 'hunt', 'pvp']) assert.equal(none[k], undefined);
  assert.equal(parseHiscoresLine(hsLine(BODY + ';ct=70~69')).collection, undefined);   // incohérent : ignoré
  // objets obtenus en base 36
  assert.deepEqual(parseHiscoresLine(hsLine(BODY + ';ct=2~69;cl=Gnomeregan~2~29;ci=5vgb.7ah.7ah.zz!z.10')).collection.items, [36, 9449, 274043]);   // doublon et valeur invalide ignorés
  assert.equal(parseHiscoresLine(hsLine(BODY + ';hu=1~<script>~1~0')).hunt[0].name, 'script');
});
test('ligne hiscores : modifiée, tronquée ou impossible → refusée', () => {
  assert.equal(parseHiscoresLine(hsLine(BODY).replace('176', '300')).error, 'checksum');
  assert.equal(parseHiscoresLine('bonjour').error, 'format');
  assert.equal(parseHiscoresLine(hsLine(BODY.replace('136=176', '136=999'))).error, 'values');
});

test('retirer un personnage en aperçu de guilde → optout ; le réinscrire → plus optout', () => {
  const mine = new Map([['eu/tim-plar', { key: 'eu/tim-plar', level: 36 }]]);
  const r = applyRelease({ characters: ['eu/ray-kuilu'], owners: {} }, ['eu/tim-plar'], mine);
  assert.deepEqual(r.done, ['eu/tim-plar']); assert.deepEqual(r.registry.optout, ['eu/tim-plar']);
  assert.equal(applyRelease(r.registry, ['eu/tim-plar'], mine).changed, false);   // déjà retiré
  const c = applyClaim(r.registry, ['eu/tim-plar'], 'bnet:1', mine);
  assert.deepEqual(c.registry.optout, []); assert.ok(c.registry.characters.includes('eu/tim-plar'));
});

import { applyRunCreate, applyRunJoin, applyRunLeave, publicRuns, pruneRuns } from './lib.mjs';
test('runs : créer, rejoindre, quitter, annuler, purger', () => {
  const now = Date.parse('2026-11-26T12:00:00Z');
  const mine = new Map([['eu/ray-kuilu', { key: 'eu/ray-kuilu', level: 36 }], ['eu/tim-plar', { key: 'eu/tim-plar', level: 36 }]]);
  const bob = new Map([['eu/bob-x', { key: 'eu/bob-x', level: 30 }]]);
  const dungeons = new Set(['Gnomeregan']);
  assert.equal(applyRunCreate({}, { key: 'eu/bob-x', dungeon: 'Gnomeregan', at: '2026-11-26T20:00:00Z' }, 'A', mine, dungeons, now).error, 'not-yours');
  assert.equal(applyRunCreate({}, { key: 'eu/ray-kuilu', dungeon: 'Nowhere', at: '2026-11-26T20:00:00Z' }, 'A', mine, dungeons, now).error, 'dungeon');
  assert.equal(applyRunCreate({}, { key: 'eu/ray-kuilu', dungeon: 'Gnomeregan', at: '2026-11-20T20:00:00Z' }, 'A', mine, dungeons, now).error, 'date');
  const c = applyRunCreate({}, { key: 'EU/Ray-Kuilu', dungeon: 'Gnomeregan', at: '2026-11-26T20:00:00Z', note: '<b>Roueur</b> !', role: 'heal' }, 'A', mine, dungeons, now);
  assert.equal(c.run.note, 'bRoueur/b !'); assert.deepEqual(c.run.members, [{ key: 'eu/ray-kuilu', role: 'heal', owner: 'A' }]);
  const j = applyRunJoin(c.registry, { id: c.run.id, key: 'eu/bob-x', role: 'tank' }, 'B', bob, now);
  assert.equal(j.run.members.length, 2);
  assert.equal(applyRunJoin(j.registry, { id: c.run.id, key: 'eu/tim-plar' }, 'A', mine, now).error, 'already');   // un perso par compte
  const pub = publicRuns(j.registry, now);
  assert.equal(pub[0].owner, undefined); assert.equal(pub[0].members[1].owner, undefined); assert.equal(pub[0].members[1].role, 'tank');
  const l = applyRunLeave(j.registry, { id: c.run.id }, 'B', now);
  assert.equal(l.registry.runs[0].members.length, 1);
  assert.equal(applyRunLeave(l.registry, { id: c.run.id }, 'A', now).cancelled, true);           // le créateur annule
  assert.equal(pruneRuns(j.registry, now + 12 * 3600e3).runs.length, 0);                          // 3 h après l'heure : disparu
});

import { applyRunEdit } from './lib.mjs';
test('runs : modifier (organisateur seulement), changer de rôle', () => {
  const now = Date.parse('2026-11-26T12:00:00Z');
  const mine = new Map([['eu/ray-kuilu', { key: 'eu/ray-kuilu', level: 36 }]]), bob = new Map([['eu/bob-x', { key: 'eu/bob-x', level: 30 }]]);
  const dungeons = new Set(['Gnomeregan', 'ShadowfangKeep']);
  const c = applyRunCreate({}, { key: 'eu/ray-kuilu', dungeon: 'Gnomeregan', at: '2026-11-26T20:00:00Z' }, 'A', mine, dungeons, now);
  const j = applyRunJoin(c.registry, { id: c.run.id, key: 'eu/bob-x', role: 'dps' }, 'B', bob, now);
  assert.equal(applyRunEdit(j.registry, { id: c.run.id, note: 'x' }, 'B', dungeons, now).error, 'not-yours');
  assert.equal(applyRunEdit(j.registry, { id: c.run.id, at: '2027-06-01T20:00:00Z' }, 'A', dungeons, now).error, 'date');
  const e = applyRunEdit(j.registry, { id: c.run.id, at: '2026-11-27T21:00:00Z', note: 'Full clear', dungeon: 'ShadowfangKeep' }, 'A', dungeons, now);
  assert.equal(e.run.at, '2026-11-27T21:00:00.000Z'); assert.equal(e.run.note, 'Full clear'); assert.equal(e.run.dungeon, 'ShadowfangKeep'); assert.equal(e.run.members.length, 2);
  const r = applyRunJoin(e.registry, { id: c.run.id, key: 'eu/bob-x', role: 'heal' }, 'B', bob, now);   // même perso : change de rôle
  assert.equal(r.run.members.find(m => m.key === 'eu/bob-x').role, 'heal');
  assert.equal(r.run.members.length, 2);
});

import { applyHuntEdit, keepSiteHunt } from './lib.mjs';
test('liste d’objets recherchés modifiée sur le site', () => {
  const up = { 'eu/ray-kuilu': { at: '2026-11-20', hunt: [{ id: 2262, name: 'Marque de Kern', tries: 7, drops: 0 }], collection: { x: 1 } } };
  const r = applyHuntEdit(up, 'eu/ray-kuilu', [{ id: 2262, name: 'x' }, { id: 7720, name: 'Bandeau de la Croisade écarlate' }, { id: 7720, name: 'doublon' }], '2026-11-26');
  assert.equal(r.changed, true);
  const e = r.registry['eu/ray-kuilu'];
  assert.deepEqual(e.hunt[0], { id: 2262, name: 'Marque de Kern', tries: 7, drops: 0 }, 'essais gardés');
  assert.deepEqual(e.hunt[1], { id: 7720, name: 'Bandeau de la Croisade écarlate', tries: 0, drops: 0 });
  assert.equal(e.hunt.length, 2, 'doublon ignoré');
  assert.equal(e.huntSite, '2026-11-26'); assert.equal(e.collection.x, 1); assert.equal(e.at, '2026-11-20', 'date de l’export du jeu inchangée');
  assert.equal(applyHuntEdit(up, 'eu/ray-kuilu', Array.from({ length: 21 }, (_, i) => ({ id: i + 1, name: 'o' }))).error, 'full');
  assert.equal(applyHuntEdit(up, 'eu/ray-kuilu', 'x').error, 'items');
  // personnage sans ligne Dropamine : la liste suffit
  assert.equal(applyHuntEdit({}, 'eu/new-one', [{ id: 5, name: 'A' }], '2026-11-26').registry['eu/new-one'].hunt.length, 1);
  // liste vidée
  assert.equal(applyHuntEdit(up, 'eu/ray-kuilu', [], '2026-11-26').registry['eu/ray-kuilu'].hunt, undefined);
  // nouvelle ligne du jeu sans chasse : la liste du site reste ; avec chasse : le jeu remplace
  assert.equal(keepSiteHunt({ at: 'x' }, e).hunt.length, 2);
  assert.equal(keepSiteHunt({ at: 'x', hunt: [{ id: 9 }] }, e).hunt.length, 1);
  assert.equal(keepSiteHunt({ at: 'x' }, { hunt: [{ id: 1 }] }).hunt, undefined, 'liste du jeu d’avant : pas gardée');
});
