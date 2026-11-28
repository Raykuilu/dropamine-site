import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openCrawlDb, saveChar, purgeOld } from './crawl.mjs';
import { rankList } from './hs-index.mjs';
import { capsOf, backfillCaps, wall, weekSkill, weekSkillOf, WEEK_SKILLS, quantiles, compare, computeScores, scoreParts } from './hs-stats.mjs';
import { indexChar, ranksOf } from './hs-index.mjs';

const P = (key, o = {}) => ({ key, region: key.split('/')[0], slug: key.split('/')[1], name: key.split('/')[1].split('-')[0], surname: 'zed', classId: 1, raceId: 1,
  faction: 'ALLIANCE', rulesetId: 1, level: 60, total: 1000, max: 2460, defense: 300, weaponList: [], professions: [{ id: 356, skill: 100 }],
  parts: { professions: 100 }, stats: { hk: 30, pvpDeaths: 10, quests: 50 }, complete: true, ...o });
const MON = 20789;   // un jour de référence (2026-12-01)
const monday = d => d - ((d + 3) % 7);

test('caps : niveau 60, total maximal, métier à 300', () => {
  assert.deepEqual(capsOf({ t: 2460, s: { l: 60, p356: 300, p185: 299 } }, 2460), ['l60', 'max', 'p356']);
  assert.deepEqual(capsOf({ t: 2459, s: { l: 59 } }, 2460), []);
});

test('mur du maximum : compte, arrivés vus par le relevé (pas les « déjà là »), prochains avec estimation', () => {
  const db = openCrawlDb(':memory:'), today = MON;
  saveChar(db, P('eu/old-a', { total: 2460 }), today - 3);                  // déjà au max au premier relevé
  saveChar(db, P('eu/new-b', { total: 2450 }), today - 8);
  saveChar(db, P('eu/new-b', { total: 2460 }), today - 1);                  // arrivé hier
  saveChar(db, P('eu/near-c', { total: 2440 }), today - 7);
  saveChar(db, P('eu/near-c', { total: 2454 }), today);                     // +14 en 7 j → 6 restants ≈ 3 jours
  saveChar(db, P('eu/rp-d', { total: 2460, rulesetId: 3 }), today);
  const w = wall(db, { region: 'eu', rs: 1, today });
  assert.equal(w.cap, 2460); assert.equal(w.atMax, 2); assert.equal(w.players, 3); assert.equal(w.week, 1);
  assert.deepEqual(w.recent.map(x => [x.p.key, x.at]), [['eu/new-b', new Date((today - 1) * 864e5).toISOString().slice(0, 10)]]);
  assert.deepEqual(w.next.map(x => [x.p.key, x.left, x.eta]), [['eu/near-c', 6, 3]]);
  assert.equal(wall(db, { region: 'eu', rs: 3, today }).atMax, 1, 'types jamais mélangés');
  // 30 jours plus tard, les caps vus disparaissent comme le reste du relevé
  purgeOld(db, today + 31);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ms').get().n, 0);
});

test('amorce des caps depuis l\'historique, une seule fois', () => {
  const db = openCrawlDb(':memory:'), today = MON;
  saveChar(db, P('eu/x-y', { level: 59, total: 2000 }), today - 5);
  saveChar(db, P('eu/x-y', { level: 60, total: 2100 }), today - 2);
  db.exec('DELETE FROM ms');
  assert.equal(backfillCaps(db), 1);
  assert.deepEqual(db.prepare('SELECT what, d, pre FROM ms').all().map(r => ({ ...r })), [{ what: 'l60', d: today - 2, pre: 0 }]);
  assert.equal(backfillCaps(db), 0);
});

test('compétence de la semaine : gains depuis lundi, rang, ta place', () => {
  let mon = monday(MON); while (!/^p\d+$/.test(weekSkillOf(mon))) mon += 7;   // une semaine de métier
  const db = openCrawlDb(':memory:'), skill = weekSkillOf(mon);
  assert.ok(WEEK_SKILLS.includes(skill)); assert.equal(weekSkillOf(mon + 6), skill); assert.notEqual(weekSkillOf(mon + 7), skill);
  const id = Number(skill.slice(1)), prof = v => [{ id, skill: v }];
  if (!/^p\d+$/.test(skill)) return;   // rotation : la semaine testée tombe sur un métier
  saveChar(db, P('eu/a-a', { professions: prof(100) }), mon - 2);
  saveChar(db, P('eu/a-a', { professions: prof(140) }), mon + 2);         // +40
  saveChar(db, P('eu/b-b', { professions: prof(200) }), mon + 1);         // premier point dans la semaine : base
  saveChar(db, P('eu/b-b', { professions: prof(240) }), mon + 3);         // +40, ex æquo
  saveChar(db, P('eu/c-c', { professions: prof(10) }), mon - 1);
  saveChar(db, P('eu/c-c', { professions: prof(15) }), mon + 3);          // +5
  saveChar(db, P('eu/d-d', { professions: prof(50) }), mon + 3);          // un seul point : rien
  const w = weekSkill(db, { region: 'eu', rs: 1, today: mon + 3, k: 'eu/c-c' });
  assert.equal(w.skill, skill); assert.equal(w.daysLeft, 4); assert.equal(w.total, 85); assert.equal(w.players, 3);
  assert.deepEqual(w.podium.map(x => [x.p.key, x.gain, x.r]), [['eu/a-a', 40, 1], ['eu/b-b', 40, 1], ['eu/c-c', 5, 3]]);
  assert.deepEqual(w.me, { key: 'eu/c-c', r: 3, gain: 5 });
});

test('centiles par type et par classe ; face-à-face ; Leveling', () => {
  const db = openCrawlDb(':memory:'), today = MON;
  for (let i = 0; i < 40; i++) saveChar(db, P(`eu/q${i}-z`, { classId: i < 25 ? 11 : 1, level: i < 10 ? 30 + i : 60, total: 1000 + i, stats: { hk: i, quests: i * 10 } }), today);
  saveChar(db, P('eu/rp-z', { rulesetId: 3, total: 50 }), today);
  const q = quantiles(db, { region: 'eu', rs: 1 });
  assert.equal(q.skills.quests.n, 39, 'valeurs > 0 seulement');
  assert.equal(q.skills.quests.q[4], 200, 'médiane');
  assert.ok(q.skills.quests.cls[11] && !q.skills.quests.cls[1], 'classe : 20 valeurs au moins');
  const c = compare(db, { region: 'eu' });
  assert.equal(c.types[1].n, 40); assert.equal(c.types[1].l60, 30); assert.equal(c.types[3].n, 1); assert.ok(c.types[3].small);
  const lv = rankList(db, { region: 'eu', rs: 1, low: true });
  assert.equal(lv.total, 10); assert.equal(lv.rows[0].p.level, 39);
});

test('Score global : moyenne des notes, K/D facultatif, deux meilleurs métiers, sans armes, types séparés', () => {
  const db = openCrawlDb(':memory:'), today = MON;
  // A meilleur partout ; B moyen ; C faible sans JcJ (pas de K/D : pas pénalisé, juste absent) ; D dans un autre type
  saveChar(db, P('eu/aa-z', { total: 2400, level: 60, defense: 300, weaponList: [{ id: 'swords', rank: 300 }], professions: [{ id: 186, skill: 300 }, { id: 182, skill: 300 }],
    stats: { hk: 900, pvpDeaths: 100, duelsWon: 50, killingBlows: 500, kills: 9000, quests: 400, dungeons: 30, flights: 80 } }), today);
  saveChar(db, P('eu/bb-z', { total: 1800, level: 50, defense: 250, weaponList: [{ id: 'swords', rank: 200 }], professions: [{ id: 186, skill: 150 }],
    stats: { hk: 100, pvpDeaths: 100, duelsWon: 5, killingBlows: 50, kills: 3000, quests: 200, dungeons: 10, flights: 20 } }), today);
  saveChar(db, P('eu/cc-z', { total: 900, level: 30, defense: 150, weaponList: [], professions: [], stats: { kills: 500, quests: 50 } }), today);
  saveChar(db, P('eu/dd-z', { total: 2460, rulesetId: 3 }), today);
  assert.equal(computeScores(db), 4);
  const r = rankList(db, { region: 'eu', rs: 1, skill: 'score' });
  assert.deepEqual(r.rows.map(x => x.p.key), ['eu/aa-z', 'eu/bb-z', 'eu/cc-z']);
  assert.ok(r.rows[0].v > r.rows[1].v && r.rows[1].v > r.rows[2].v);
  assert.ok(r.rows.every(x => x.v >= 0 && x.v <= 100));
  const a = scoreParts(db, 'eu/aa-z'), c = scoreParts(db, 'eu/cc-z');
  assert.equal(a.total, 83); assert.equal(a.weapon, undefined, 'armes non comptées (rang réel des inscrits seulement)'); assert.equal(a.prof, 83);
  assert.ok('kd' in a && !('kd' in c), 'K/D seulement s\'il existe');
  assert.equal(c.prof, 0);
  assert.equal(rankList(db, { region: 'eu', rs: 3, skill: 'score' }).total, 1, 'jamais mélangé');
  // une relecture garde le score jusqu'au prochain calcul ; le rang du score sort avec les autres
  saveChar(db, P('eu/bb-z', { total: 1810 }), today);
  assert.equal(rankList(db, { region: 'eu', rs: 1, skill: 'score' }).total, 3);
  assert.equal(ranksOf(db, 'eu/aa-z').score.r, 1);
});
