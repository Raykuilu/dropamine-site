import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBreaker, CRAWL, HOUR_CAP } from './crawl-lib.mjs';

test('limites prudentes : 5 / s par défaut, plafond horaire loin des 36 000 de Blizzard', () => {
  assert.equal(CRAWL.RATE, 5); assert.ok(CRAWL.RATE_MAX <= 6); assert.ok(HOUR_CAP <= 20000);
});

test('disjoncteur : 20 échecs d\'affilée → pause 15 min, un seul essai, pause doublée, succès = remise à zéro', () => {
  const b = makeBreaker(), t0 = 1_000_000;
  for (let i = 0; i < 19; i++) assert.equal(b.fail(500, t0), false);
  assert.ok(b.allow(t0), '19 échecs : on continue');
  assert.equal(b.fail(403, t0), true, '20e : disjoncte');
  assert.ok(b.blocked && b.state(t0).open && b.state(t0).blockedSince);
  assert.equal(b.allow(t0 + 14 * 60e3), false, 'pause de 15 min');
  assert.equal(b.allow(t0 + 15 * 60e3), true, 'un essai');
  assert.equal(b.allow(t0 + 15 * 60e3), false, 'un seul à la fois');
  assert.equal(b.fail(403, t0 + 15 * 60e3), true, 'essai raté : nouvelle pause');
  assert.equal(b.until, t0 + 15 * 60e3 + 30 * 60e3, 'pause doublée (30 min)');
  b.ok();
  assert.ok(!b.blocked && b.fails === 0 && b.allow(t0), 'succès : tout repart');
  // jamais plus de 2 h
  for (let k = 0; k < 10; k++) for (let i = 0; i < 20; i++) b.fail(403, t0);
  assert.ok(b.until - t0 <= 2 * 3600e3);
});
