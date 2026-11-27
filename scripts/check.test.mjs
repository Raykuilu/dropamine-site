import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiProfs, diffPlayer } from './check.mjs';

const profsApi = { primaries: [{ profession: { id: 393 }, tiers: [{ skill_points: 226 }] }], secondaries: [{ profession: { id: 185 }, tiers: [{ skill_points: 218 }] }] };

test('check : rien de neuf → aucune reconstruction', () => {
  const pub = { level: 37, defense: 185, professions: [{ id: 393, skill: 226 }, { id: 185, skill: 218 }] };
  assert.deepEqual(diffPlayer(pub, { level: 37, defense: 185, profs: apiProfs(profsApi) }), []);
});
test('check : armurerie à jour après déconnexion → reconstruction', () => {
  const pub = { level: 37, defense: 182, professions: [{ id: 393, skill: 225 }, { id: 185, skill: 189 }] };
  const d = diffPlayer(pub, { level: 37, defense: 185, profs: apiProfs(profsApi) });
  assert.equal(d.length, 3);
});
test('check : nouveau métier appris → reconstruction', () => {
  const pub = { level: 37, defense: 185, professions: [{ id: 393, skill: 226 }] };
  assert.equal(diffPlayer(pub, { level: 37, defense: 185, profs: apiProfs(profsApi) }).length, 1);
});
