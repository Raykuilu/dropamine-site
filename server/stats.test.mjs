import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, DUEL_MIN } from './stats-lib.mjs';

const P = (o) => ({ region: 'eu', level: 60, classId: 1, raceId: 1, faction: 'ALLIANCE', gender: 'MALE', rulesetId: 1, total: 2000,
  professions: [{ id: 164, skill: 300 }, { id: 186, skill: 250 }, { id: 185, skill: 100 }], stats: {}, guild: { slug: 'g', name: 'G' }, ...o });
test('statistiques : répartitions, métiers, JcJ, duels, records, guildes', () => {
  const ps = [
    P({ key: 'eu/a-a', name: 'A', stats: { hk: 100, pvpDeaths: 10, duelsWon: 15, duelsLost: 5, quests: 900, deaths: 50 } }),
    P({ key: 'eu/b-b', name: 'B', classId: 8, level: 30, total: 900, professions: [{ id: 197, skill: 150 }, { id: 333, skill: 120 }], stats: { hk: 10, pvpDeaths: 10, duelsWon: 1, duelsLost: 1 }, guild: null }),
    P({ key: 'eu/c-c', name: 'C', faction: 'HORDE', raceId: 2, rulesetId: 2 }),
    P({ key: 'us/d-d', region: 'us' }),
    P({ key: 'eu/e-e', level: 9 }),
  ];
  const s = computeStats(ps, 'eu');
  assert.equal(s.n, 3, 'région et niveau 10+'); assert.equal(s.lvl60, 2);
  assert.deepEqual(s.rulesets, { 1: 2, 2: 1 }); assert.deepEqual(s.factions, { ALLIANCE: 2, HORDE: 1 });
  assert.equal(s.levels.find(x => x.a === 30).n, 1);
  const war = s.classes.find(c => c.id === 1), mage = s.classes.find(c => c.id === 8);
  assert.equal(war.n, 2); assert.equal(war.kd, 10, 'victoires honorables par mort JcJ');
  assert.equal(war.duelRate, 0.75); assert.equal(mage.duelRate, null, `moins de ${DUEL_MIN} duels : pas compté`);
  assert.equal(s.profs.find(x => x.id === 164).max, 2);
  assert.deepEqual(s.profPairs[0], { ids: [164, 186], n: 2 });
  assert.equal(s.tops.hk[0].name, 'A'); assert.equal(s.tops.quests[0].v, 900);
  assert.equal(s.guilds.n, 1); assert.equal(s.guilds.top[0].n, 2);
  assert.equal(s.pve60.n, 2); assert.equal(s.pve60.quests, 450);
});

import { computeDepth } from './stats-lib.mjs';
test('stats en profondeur : croisements, profil d’un 60, armes, totaux, top par classe', () => {
  const ps = [
    P({ key: 'eu/a-a', name: 'A', gender: 'MALE', equipped: ['swords'], defense: 300, stats: { deaths: 100, quests: 900, kills: 50, cheers: 3 } }),
    P({ key: 'eu/b-b', name: 'B', gender: 'FEMALE', level: 30, total: 900, equipped: ['bows'], stats: { deaths: 10 } }),
  ];
  const d = computeDepth(ps);
  assert.deepEqual(d.classRace[1], { 1: 2 }); assert.deepEqual(d.genders[1], { MALE: 1, FEMALE: 1 });
  assert.equal(d.classLevels[1][5], 1); assert.equal(d.classLevels[1][2], 1, '30–39');
  assert.equal(d.profile60[1].n, 1); assert.equal(d.profile60[1].deaths, 100); assert.equal(d.defense60[1], 300);
  assert.deepEqual(d.weaponsByClass[1], { swords: 1, bows: 1 });
  assert.equal(d.totals.deaths, 110); assert.equal(d.totals.cheers, 3);
  assert.equal(d.topByClass[1][0].name, 'A'); assert.equal(d.profSkill[164][4], 2, 'forge à 300');
  assert.equal(d.inGuild, 2); assert.equal(d.n60, 1);
});
