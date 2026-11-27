// Défis de la semaine : le bloc <week> de site/app.js, évalué tel quel
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../site/app.js', import.meta.url), 'utf8');
const block = src.slice(src.indexOf('// <week>'), src.indexOf('// </week>'));
const WEEK = vm.runInNewContext(block + '\nWEEK');

const H = (...pts) => pts.map(([d, s, hk]) => ({ d, s, ...(hk != null ? { hk } : {}) }));

test('semaine : lundi, semaine suivante, numéro ISO', () => {
  assert.equal(WEEK.monday('2026-11-27'), '2026-11-23');   // vendredi → lundi
  assert.equal(WEEK.monday('2026-11-23'), '2026-11-23');
  assert.equal(WEEK.monday('2026-11-29'), '2026-11-23');   // dimanche
  assert.equal(WEEK.next('2026-11-23'), '2026-11-30');
  assert.equal(WEEK.num('2026-11-23'), 48);
  assert.equal(WEEK.num('2026-12-28'), 53);
});

test('gain : depuis le dernier relevé avant lundi, gains vérifiés seulement (pas les armes)', () => {
  const h = H(['2026-11-21', { l: 36, d: 170, p185: 150, wstaves: 90 }, 10],
    ['2026-11-24', { l: 37, d: 175, p185: 180, wstaves: 110 }, 20],
    ['2026-11-27', { l: 37, d: 185, p185: 218, wstaves: 120 }, 29]);
  const g = WEEK.gain(h, '2026-11-23');
  assert.equal(g.total, 1 + 15 + 68);
  assert.equal(g.prof, 68);
  assert.equal(g.hk, 19);
  assert.equal(g.by.wstaves, undefined);
});

test('gain : premier relevé dans la semaine = départ ; un seul relevé = rien ; nouveau métier ignoré', () => {
  assert.equal(WEEK.gain(H(['2026-11-25', { l: 10, p185: 1 }], ['2026-11-26', { l: 12, p185: 20, p356: 50 }]), '2026-11-23').total, 2 + 19);
  assert.equal(WEEK.gain(H(['2026-11-25', { l: 10 }]), '2026-11-23').total, 0);
  assert.equal(WEEK.gain(H(['2026-11-10', { l: 10 }]), '2026-11-23').total, 0);   // rien cette semaine
});

test('tableau : skiller par tranche, compétence de la semaine, combattant, défi commun', () => {
  const p = (name, level, h) => ({ name, level, total: level * 10, history: h });
  const players = [
    p('A', 20, H(['2026-11-22', { l: 18, p185: 50 }, 0], ['2026-11-27', { l: 20, p185: 90 }, 5])),
    p('B', 40, H(['2026-11-22', { l: 40, p185: 100, p356: 10 }, 100], ['2026-11-27', { l: 40, p185: 101, p356: 40 }, 150])),
    p('C', 60, H(['2026-11-22', { l: 60, p356: 200 }, 0], ['2026-11-27', { l: 60, p356: 200 }, 0])),
  ];
  const b = WEEK.board(players, '2026-11-23');
  assert.equal(b.skiller[0][0].p.name, 'A'); assert.equal(b.skiller[0][0].v, 42);
  assert.equal(b.skiller[1][0].p.name, 'B'); assert.equal(b.skiller[1][0].v, 31);
  assert.equal(b.skiller[2].length, 0);                       // C n'a rien gagné : pas de podium
  assert.equal(b.fighter[0].p.name, 'B'); assert.equal(b.fighter[0].v, 50);
  assert.equal(b.common, 40 + 31);
  assert.equal(b.helpers, 2);
  assert.ok(['p185', 'p356'].includes(b.skill));
  assert.equal(WEEK.board(players, '2026-11-23').skill, b.skill);   // même tirage pour tout le monde
});

test('tranches de niveau', () => {
  assert.equal(WEEK.bracketOf(10), 0); assert.equal(WEEK.bracketOf(29), 0);
  assert.equal(WEEK.bracketOf(30), 1); assert.equal(WEEK.bracketOf(60), 2);
  assert.equal(WEEK.bracketOf(5), -1);
});

test('défi commun : battre la semaine dernière (+10 %), sinon ~60 par joueur actif', () => {
  assert.equal(WEEK.goalFor(1000, 5), 1100);
  assert.equal(WEEK.goalFor(0, 16), 1000);
  assert.equal(WEEK.goalFor(0, 2), 300);   // plancher
  const p = (name, level, h, guild) => ({ name, level, total: 1, history: h, region: 'eu', guild });
  const g = { slug: 'ek', name: 'Everybody Knows' };
  const players = [
    p('A', 20, H(['2026-11-15', { p185: 10 }], ['2026-11-21', { p185: 60 }], ['2026-11-27', { p185: 100 }]), g),
    p('B', 40, H(['2026-11-15', { p356: 10 }], ['2026-11-21', { p356: 60 }], ['2026-11-27', { p356: 70 }])),
  ];
  const b = WEEK.board(players, '2026-11-23', '2026-11-27');
  assert.equal(b.lastCommon, 100);           // semaine 47 : +50 et +50
  assert.equal(b.goal, 150);                 // 110, arrondi à 50 au-dessus
  assert.equal(b.common, 50);
  assert.equal(b.active, 2);
  const gu = WEEK.guild(players, '2026-11-23', 'eu/ek');
  assert.equal(gu.common, 40); assert.equal(gu.last, 50); assert.equal(gu.goal, 100);
  assert.equal(WEEK.guild(players, '2026-11-23', 'eu/none'), null);
});

test('jours : meilleur gain de chaque jour, jours à venir, apport du jour', () => {
  const players = [
    { name: 'A', level: 20, total: 1, history: H(['2026-11-24', { l: 10, p185: 1 }], ['2026-11-25', { l: 11, p185: 5 }], ['2026-11-26', { l: 11, p185: 25 }]) },
    { name: 'B', level: 20, total: 1, history: H(['2026-11-24', { l: 10 }], ['2026-11-25', { l: 13 }]) },
  ];
  const b = WEEK.board(players, '2026-11-23', '2026-11-26');
  assert.deepEqual(JSON.parse(JSON.stringify(b.days.map(d => d.d))), ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']);
  assert.equal(b.days[2].top[0].p.name, 'A'); assert.equal(b.days[2].top[0].v, 5);   // mer : A +1 +4 = 5, B +3
  assert.equal(b.days[3].top[0].v, 20);
  assert.equal(b.days[4].future, true); assert.equal(b.days[3].future, false);
  assert.equal(b.today, '2026-11-26'); assert.equal(b.commonToday, 20);
});

test('deux étapes : tout monté → Chasseur (objets de chasse confirmés portés), plus Skiller', () => {
  const mx = { l: 60, d: 300, p186: 300, p185: 300 };
  const done = { key: 'a', total: 900, level: 60, defense: 300, professions: [{ id: 186, skill: 300 }, { id: 185, skill: 300 }, { id: 762, skill: 75 }],
    history: [{ d: '2026-11-21', s: mx, hq: [5, 6] }, { d: '2026-11-24', s: mx, hq: [6], hf: [5] }, { d: '2026-11-26', s: mx, hq: [], hf: [6] }] };
  const almost = { key: 'b', total: 800, level: 60, defense: 300, professions: [{ id: 186, skill: 300 }, { id: 185, skill: 290 }],
    history: [{ d: '2026-11-21', s: { l: 60, d: 300, p186: 300, p185: 280 } }, { d: '2026-11-25', s: { l: 60, d: 300, p186: 300, p185: 290 } }] };
  assert.equal(WEEK.maxed(done), true, 'la Monte ne compte pas');
  assert.equal(WEEK.maxed(almost), false);
  const b = WEEK.board([done, almost], '2026-11-23', '2026-11-27');
  assert.equal(b.hunters, 1);
  assert.equal(b.hunter.length, 1); assert.equal(b.hunter[0].v, 2);
  assert.equal(b.skiller[2].length, 1); assert.equal(b.skiller[2][0].p, almost, 'le chasseur quitte le Skiller');
  assert.equal(WEEK.gainDay(done.history, '2026-11-24').hunt, 1);
  assert.equal(WEEK.gain(done.history, '2026-11-16').hunt, 0, 'semaine d’avant : rien');
});
