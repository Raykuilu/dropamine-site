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

import { homeIndex, HOME_TOP } from './build.mjs';
test('accueil léger : inscrits, joueurs qui ont progressé, top 5 par région, totaux de tout le monde', () => {
  const mk = (i, o = {}) => ({ key: 'eu/p-' + i, region: 'eu', slug: 'p-' + i, total: i, preview: true, history: [{ d: '2026-11-27', t: i }], ...o });
  const ps = Array.from({ length: 20 }, (_, i) => mk(i));
  ps[0] = mk(0, { preview: undefined, guild: { slug: 'g1' }, dropamine: { collection: { x: 7 } } });   // inscrit, petit total
  ps[1] = mk(1, { history: [{ d: '2026-11-20', t: 0 }, { d: '2026-11-27', t: 1 }], guild: { slug: 'g2' } });
  ps.push(mk(99, { region: 'us', key: 'us/x' }));
  const h = homeIndex(ps, 'T');
  const keys = new Set(h.players.map(p => p.key));
  assert.equal(h.partial, true); assert.equal(h.updated, 'T');
  assert.deepEqual(h.counts, { players: 21, guilds: 2, found: 7 });
  assert.ok(keys.has('eu/p-0') && keys.has('eu/p-1') && keys.has('us/x'));
  for (let i = 19; i > 19 - HOME_TOP; i--) assert.ok(keys.has('eu/p-' + i));
  assert.equal(h.players.length, 2 + HOME_TOP + 1);
});
