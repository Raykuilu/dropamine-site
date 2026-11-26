import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAtlasName, compact } from './items.mjs';

test('nom AtlasLoot : emplacement et type tirés de la parenthèse', () => {
  assert.deepEqual(parseAtlasName('Oathbound Bracers (wrist, leather)'), { name: 'Oathbound Bracers', s: 'WRIST', c: [4, 2] });
  assert.deepEqual(parseAtlasName('Ward (off hand, shield)'), { name: 'Ward', s: 'SHIELD', c: [4, 6] });
  assert.deepEqual(parseAtlasName('Blade (two-hand, sword)'), { name: 'Blade', s: 'TWOHWEAPON', c: [2, 8] });
  assert.deepEqual(parseAtlasName('Ring (finger)'), { name: 'Ring', s: 'FINGER', c: [4, 0] });
  assert.deepEqual(parseAtlasName('Plain name'), { name: 'Plain name' });
});

test('fiche compacte : emplacement, classe et niveaux pour les suggestions', () => {
  const c = compact({ name: { en_US: 'Hood', fr_FR: 'Capuche' }, quality: { type: 'RARE' }, level: 25, required_level: 20,
    inventory_type: { type: 'HEAD' }, item_class: { id: 4 }, item_subclass: { id: 2 } }, 'x.jpg', '2026-11-26');
  assert.equal(c.s, 'HEAD'); assert.deepEqual(c.c, [4, 2]); assert.equal(c.lv, 25); assert.equal(c.rl, 20); assert.deepEqual(c.n.slice(0, 2), ['Hood', 'Capuche']); assert.equal(c.n.length, 7);
});

import { splitItems, compact as compact7 } from './items.mjs';
test('objets : 7 langues dans le cache, anglais et français publiés, une langue de plus par fichier', () => {
  const nm = { en_US: 'Mark of Kern', fr_FR: 'Marque de Kern', de_DE: 'Mal von Kern', es_ES: 'Marca de Kern', it_IT: 'Marchio di Kern', pt_BR: 'Marca de Kern', ru_RU: 'Знак Керна' };
  const c = compact7({ name: nm, quality: { type: 'RARE' }, preview_item: { stats: [{ display: { display_string: { en_US: '+5 Stamina', fr_FR: '+5 Endurance', de_DE: '+5 Ausdauer' }, color: { r: 255, g: 255, b: 255 } } }] } }, null, '2026-11-26');
  assert.equal(c.n.length, 7); assert.equal(c.n[6], 'Знак Керна');
  assert.equal(c.t[0][2], '+5 Ausdauer'); assert.equal(c.t[0][3], '+5 Stamina', 'langue absente : anglais');
  const { base, extra } = splitItems({ 2262: c, 7: { n: ['Old', 'Vieux'], t: [['Soulbound', 'Lié', '#ffd100']] } });
  assert.deepEqual(base[2262].n, ['Mark of Kern', 'Marque de Kern']);
  assert.deepEqual(base[2262].t[0], ['+5 Stamina', '+5 Endurance']);
  assert.deepEqual(base[7].t[0], ['Soulbound', 'Lié', '#ffd100'], 'ancienne fiche : couleur gardée');
  assert.deepEqual(extra.ru[2262], ['Знак Керна', ['+5 Stamina']]);
  assert.equal(extra.de[2262][1][0], '+5 Ausdauer');
  assert.equal(extra.de[7], undefined, 'fiche ancienne (2 langues) : rien en plus');
});
