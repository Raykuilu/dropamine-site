// Tests du calcul de score (node --test scripts/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score } from './build.mjs';

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

test('armes par type : ligne Dropamine (plafonnée, sans les 0) ou estimation par arme équipée', () => {
  const base = { profile: { level: 36 }, professions: {}, statistics: {} };
  const up = score(base, { weapons: 999, weaponList: [{ id: 'staves', rank: 103 }, { id: 'feral', rank: 999 }, { id: 'axes', rank: 0 }] });
  assert.deepEqual(up.weaponList, [{ id: 'staves', rank: 103 }, { id: 'feral', rank: 180 }]);
  assert.equal(up.weapons, 283);
  const est = score({ ...base, equipment: { equipped_items: [{ item_class: { id: 2 }, item_subclass: { id: 10 } }, { item_class: { id: 2 }, item_subclass: { id: 15 } }] } });
  assert.deepEqual(est.weaponList.map(w => w.id), ['staves', 'daggers']);
  assert.equal(est.weapons, 360); assert.ok(est.weaponList.every(w => w.est));
});
