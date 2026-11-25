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
test('ligne hiscores : modifiée, tronquée ou impossible → refusée', () => {
  assert.equal(parseHiscoresLine(hsLine(BODY).replace('176', '300')).error, 'checksum');
  assert.equal(parseHiscoresLine('bonjour').error, 'format');
  assert.equal(parseHiscoresLine(hsLine(BODY.replace('136=176', '136=999'))).error, 'values');
});
