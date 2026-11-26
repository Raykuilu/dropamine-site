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
  assert.equal(c.s, 'HEAD'); assert.deepEqual(c.c, [4, 2]); assert.equal(c.lv, 25); assert.equal(c.rl, 20); assert.deepEqual(c.n, ['Hood', 'Capuche']);
});
