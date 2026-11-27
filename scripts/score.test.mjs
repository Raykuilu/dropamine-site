// Tests du calcul de score (node --test scripts/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score, pickStats, pickReps } from './build.mjs';

const prof = (id, skill, max) => ({ profession: { id, name: 'p' + id }, tiers: [{ skill_points: skill, max_skill_points: max, known_recipes: [{}, {}] }] });
const ray = {
  profile: { level: 36 },
  professions: { primaries: [prof(165, 120, 150), prof(393, 223, 300)], secondaries: [prof(185, 161, 225), prof(356, 137, 225), prof(129, 208, 225)] },
  statistics: { defense: { base: 177 } },
  equipment: { equipped_items: [
    { item_class: { id: 2 }, item_subclass: { id: 10 } },   // bâton
    { item_class: { id: 4 }, item_subclass: { id: 2 } },    // cuir (armure)
  ] },
};

test('estimation : une arme équipée = 5 × niveau', () => {
  const s = score(ray);
  assert.equal(s.parts.professions, 849);
  assert.equal(s.defense, 177);
  assert.equal(s.weapons, 180);
  assert.equal(s.total, 36 + 849 + 177 + 180);
  assert.equal(s.complete, false);
});

test('fichier Dropamine : vraies armes, score complet', () => {
  const s = score(ray, { weapons: 278 });
  assert.equal(s.total, 36 + 849 + 177 + 278);
  assert.equal(s.complete, true);
});

test('deux armes du même type ne comptent qu\'une fois', () => {
  const two = { ...ray, equipment: { equipped_items: [
    { item_class: { id: 2 }, item_subclass: { id: 7 } }, { item_class: { id: 2 }, item_subclass: { id: 7 } },
  ] } };
  assert.equal(score(two).weapons, 180);
});

import { parseEntry, parseChangelog } from './build.mjs';

test('inscription : formats acceptés', () => {
  assert.deepEqual(parseEntry('Ray Kuilu'), { region: 'eu', slug: 'ray-kuilu', key: 'eu/ray-kuilu' });
  assert.equal(parseEntry('US/Judgement-Judy').key, 'us/judgement-judy');
  assert.equal(parseEntry('eu: Dé Mine').slug, 'dé-mine');
  assert.equal(parseEntry('Ray'), null);                 // il faut prénom et nom
  assert.equal(parseEntry('xx/ray-kuilu').region, 'eu'); // région inconnue : pas un préfixe
});

test('CHANGELOG : versions, sections, puces imbriquées', () => {
  const md = '# Changelog\n\n## 3.10.0\n\n### New\n- **Big** thing with `/drop hc`\n  - detail\n- Other\n\n### Fixes\n- Fix\n\n## 3.9.0\n\n- Old\n';
  const v = parseChangelog(md);
  assert.equal(v.length, 2);
  assert.equal(v[0].version, '3.10.0');
  assert.equal(v[0].sections[0].items[0], '<b>Big</b> thing with <code>/drop hc</code> — detail');
  assert.equal(v[0].sections[1].title, 'Fixes');
  assert.equal(v[1].sections[0].items[0], 'Old');
});

import { entryFromForm } from './register.mjs';

test('formulaire GitHub → entrée', () => {
  const body = '### Région / Region\n\nEU\n\n### Personnage (prénom et nom) / Character (first name and surname)\n\nRay Kuilu\n\n### Accord / Consent\n\n- [X] ok';
  assert.equal(entryFromForm(body).key, 'eu/ray-kuilu');
  assert.equal(entryFromForm(body.replace('EU', 'KR')), null);              // région non prise en charge
  assert.equal(entryFromForm(body.replace('Ray Kuilu', 'Ray')), null);      // nom incomplet
  assert.equal(entryFromForm('n\'importe quoi'), null);
});

import { previewEntries } from './build.mjs';
test('aperçu de guilde : niveau 10+, sans les inscrits ni les retirés', () => {
  const m = (slug, level) => ({ character: { slug, level } });
  const roster = { members: [m('tim-plar', 36), m('low-guy', 9), m('ray-kuilu', 36), m('gone-away', 20), m('solo', 30)] };
  const out = previewEntries([{ region: 'eu', roster }], new Set(['eu/ray-kuilu']), new Set(['eu/gone-away']));
  assert.deepEqual(out.map(e => e.key), ['eu/tim-plar']);
  assert.equal(out[0].preview, true);
});

import { stampHtml } from './build.mjs';
test('empreintes des fichiers du site', () => {
  const h = { 'app.js': 'aaaa1111', 'style.css': 'bbbb2222' };
  const out = stampHtml('<link rel="stylesheet" href="style.css"><script src="app.js?v=0000ffff"></script>', h);
  assert.equal(out, '<link rel="stylesheet" href="style.css?v=bbbb2222"><script src="app.js?v=aaaa1111"></script>');
});

import { sitemap } from './build.mjs';
test('plan du site : pages fixes, fiches et guildes, adresses échappées', () => {
  const x = sitemap([{ key: 'eu/ray-kuilu', region: 'eu', guild: { slug: 'everybody-knows' } }, { key: 'us/a-b', region: 'us', guild: null }], '2026-11-25');
  assert.ok(x.includes('<loc>https://dropamine.app/?p=char&amp;c=eu%2Fray-kuilu</loc>'));
  assert.ok(x.includes('<loc>https://dropamine.app/?p=guild&amp;g=everybody-knows</loc>'));
  assert.ok(x.includes('<lastmod>2026-11-25</lastmod>'));
});

test('total comme l’addon : Défense + arme de mêlée en main + 2e case de la classe', () => {
  const up = { weapons: 999, weaponList: [{ id: 'maces2h', rank: 128 }, { id: 'polearms', rank: 151 }, { id: 'staves', rank: 103 }, { id: 'unarmed', rank: 130 }, { id: 'feral', rank: 999 }, { id: 'axes', rank: 0 }] };
  // druide au bâton : Bâtons + Combat farouche (plafonné à 180), les autres armes ne comptent pas
  const druid = score({ ...ray, profile: { level: 36, character_class: { id: 11 } } }, up);
  assert.deepEqual(druid.weaponList.map(w => w.id), ['maces2h', 'polearms', 'staves', 'unarmed', 'feral']);
  assert.equal(druid.weapons, 103 + 180);
  assert.equal(druid.total, 36 + 849 + 177 + 103 + 180);
  // guerrier : arme en main droite + arme à distance équipée (emplacements de l'armurerie)
  const eq = { equipped_items: [{ slot: { type: 'MAIN_HAND' }, item_class: { id: 2 }, item_subclass: { id: 0 } }, { slot: { type: 'RANGED' }, item_class: { id: 2 }, item_subclass: { id: 2 } }] };
  const war = score({ ...ray, profile: { level: 36, character_class: { id: 1 } }, equipment: eq }, { weapons: 1, weaponList: [{ id: 'axes', rank: 150 }, { id: 'bows', rank: 90 }, { id: 'swords', rank: 170 }] });
  assert.deepEqual(war.equipped, ['axes', 'bows']); assert.equal(war.weapons, 240);
  // paladin : pas de 2e case ; rien en main : Mains nues
  const pal = score({ ...ray, profile: { level: 36, character_class: { id: 2 } }, equipment: {} }, { weapons: 1, weaponList: [{ id: 'unarmed', rank: 60 }, { id: 'maces', rank: 170 }] });
  assert.deepEqual(pal.equipped, ['unarmed']); assert.equal(pal.weapons, 60);
  // estimation : arme de mêlée en main seulement (deux armes sans emplacement : la première de mêlée)
  const est = score({ ...ray, equipment: { equipped_items: [{ item_class: { id: 2 }, item_subclass: { id: 10 } }, { item_class: { id: 2 }, item_subclass: { id: 15 } }] } });
  assert.deepEqual(est.weaponList.map(w => w.id), ['staves']); assert.equal(est.weapons, 180);
});

test('métiers comme l’addon : les 2 meilleurs principaux + Cuisine, Pêche, Secourisme', () => {
  const three = { ...ray, professions: { ...ray.professions, primaries: [prof(165, 120, 150), prof(393, 223, 300), prof(186, 50, 75)] } };
  assert.equal(score(three).parts.professions, 849);
});

test('armes en main : depuis l’armurerie, + Combat farouche pour un druide', () => {
  const eq = { equipped_items: [{ item_class: { id: 2 }, item_subclass: { id: 10 } }] };
  const druid = score({ profile: { level: 36, character_class: { id: 11 } }, professions: {}, statistics: {}, equipment: eq }, { weapons: 100, weaponList: [{ id: 'staves', rank: 100 }] });
  assert.deepEqual(druid.equipped, ['staves', 'feral']);
  const est = score({ profile: { level: 36, character_class: { id: 11 } }, professions: {}, statistics: {}, equipment: eq });
  assert.deepEqual(est.weaponList.map(w => w.id), ['staves', 'feral']);   // l'estimation compte aussi Combat farouche
  assert.equal(est.weapons, 360);
});

import { skillSnapshot } from './build.mjs';
test('historique : chaque compétence du jour, sans les armes estimées', () => {
  const snap = skillSnapshot(score(ray, { weapons: 1, weaponList: [{ id: 'staves', rank: 103 }] }));
  assert.deepEqual(snap, { l: 36, d: 177, p165: 120, p393: 223, p185: 161, p356: 137, p129: 208, wstaves: 103 });
  assert.equal(skillSnapshot(score(ray)).wstaves, undefined);
});

test("statistiques de l'armurerie lues par identifiant (JcJ, donjons)", () => {
  const s = pickStats({ categories: [{ statistics: [{ id: 588, name: 'x', quantity: 24 }], sub_categories: [{ statistics: [
    { id: 1501, name: 'y', quantity: 11 }, { id: 319, quantity: 1 }, { id: 320, quantity: 2 }, { id: 1487, quantity: 2890 }, { id: 932, quantity: 18 }, { id: 9999, quantity: 5 }] }] }] });
  assert.deepEqual(s, { hk: 24, pvpDeaths: 11, duelsWon: 1, duelsLost: 2, killingBlows: 2890, dungeons: 18 });
});

test('réputations de l\'armurerie : deux langues, triées par avancement', () => {
  const r = pickReps({ reputations: [
    { faction: { id: 72, name: { en_US: 'Stormwind', fr_FR: 'Hurlevent' } }, standing: { raw: 14378, value: 5378, max: 12000, tier: 5, name: { en_US: 'Honored', fr_FR: 'Honoré' } } },
    { faction: { id: 69, name: { en_US: 'Darnassus', fr_FR: 'Darnassus' } }, standing: { raw: 20246, value: 11246, max: 12000, tier: 5, name: { en_US: 'Honored', fr_FR: 'Honoré' } } }] });
  assert.deepEqual(r.map(x => x.id), [69, 72]);
  assert.deepEqual(r[1], { id: 72, n: ['Stormwind', 'Hurlevent'], t: 5, s: ['Honored', 'Honoré'], v: 5378, m: 12000 });
});

test('boss vaincus : la sous-catégorie Boss compte les boss différents et le total', () => {
  const s = pickStats({ categories: [{ name: 'Donjons et raids', statistics: [{ id: 932, quantity: 18 }], sub_categories: [{ name: 'Boss', statistics: [
    { id: 63570, name: 'VanCleef', quantity: 2 }, { id: 6140, name: 'Thermojoncteur', quantity: 1 }, { id: 1, name: 'x', quantity: 0 }] }] }] });
  assert.deepEqual(s, { dungeons: 18, bosses: 2, bossKills: 3 });
});

test('derniers loots : seulement ce qui est nouveau depuis le relevé précédent', async () => {
  const { newLoots } = await import('./build.mjs');
  const prev = { dropamine: { collection: { items: [1, 2] }, hunt: [{ id: 9, drops: 0 }] }, loots: [[5, '2026-11-01']] };
  const up = { at: '2026-11-26T10:00:00Z', collection: { items: [1, 2, 3] }, hunt: [{ id: 9, drops: 1 }] };
  assert.deepEqual(newLoots(prev, up, '2026-11-26'), [[3, '2026-11-26'], [9, '2026-11-26'], [5, '2026-11-01']]);
  assert.deepEqual(newLoots(undefined, up, '2026-11-26'), [], 'premier export : rien de « nouveau »');
  assert.deepEqual(newLoots(prev, up, '2026-12-20'), [[3, '2026-11-26'], [9, '2026-11-26']], 'plus de 30 jours : oublié');
});

import { weaponFloor } from './build.mjs';
test('arme : jamais plus bas que le meilleur rang de l’historique (ligne fausse, combat farouche à 1)', () => {
  const up = { weapons: 300, weaponList: [{ id: 'feral', rank: 1 }, { id: 'staves', rank: 108 }] };
  const hist = [{ d: '2026-11-25', s: { wferal: 178, wstaves: 103 } }, { d: '2026-11-26', s: { wferal: 179 } }];
  const r = weaponFloor(up, hist);
  assert.equal(r.weaponList.find(w => w.id === 'feral').rank, 179);
  assert.equal(r.weaponList.find(w => w.id === 'staves').rank, 108, 'la ligne plus haute gagne');
  assert.equal(r.weapons, 287);
  assert.equal(weaponFloor(null, hist), null);
});

test('chasse vérifiée : compte un objet cherché au relevé précédent, vu porté maintenant', async () => {
  const { huntCheck } = await import('./build.mjs');
  assert.deepEqual(huntCheck(undefined, '2026-11-26', [5, 6], [5]), { hq: [6] }, 'premier relevé : la base, rien ne compte');
  assert.deepEqual(huntCheck({ d: '2026-11-25', hq: [6, 7] }, '2026-11-26', [5, 6, 7], [5, 6]), { hq: [7], hf: [6] }, '5 était déjà porté quand il est entré dans la liste');
  assert.deepEqual(huntCheck({ d: '2026-11-26', hq: [7], hf: [6] }, '2026-11-26', [6, 7], [6, 7]), { hq: [], hf: [6, 7] }, 'cumulé sur la journée');
  assert.deepEqual(huntCheck({ d: '2026-11-26', hq: [7], hf: [6] }, '2026-11-27', [7], []), { hq: [7] }, 'nouveau jour : on repart à zéro');
  assert.deepEqual(huntCheck(undefined, '2026-11-26', [], [1]), {}, 'pas de liste : rien');
});

test('Scout : aperçus (récents, niveau 10+, ni inscrits ni retirés)', async () => {
  const { scoutEntries } = await import('./build.mjs');
  const day = 20784;
  const sc = { players: { 'eu/a-b': { l: 30, d: day }, 'eu/c-d': { l: 9, d: day }, 'eu/e-f': { l: 40, d: day - 31 }, 'eu/ray-kuilu': { l: 37, d: day }, 'eu/g-h': { l: 20, d: day - 2, dun: 'Les Mortemines' }, 'eu/x-y': { l: 50, d: day } } };
  const out = scoutEntries(sc, new Set(['eu/ray-kuilu']), new Set(['eu/x-y']), day);
  assert.deepEqual(out.map(e => e.key), ['eu/a-b', 'eu/g-h']);
  assert.equal(out[1].scout.dun, 'Les Mortemines');
  assert.ok(out.every(e => e.preview));
});
