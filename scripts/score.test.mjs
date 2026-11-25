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
