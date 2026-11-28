import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countHit, summarize } from './analytics.mjs';

test('audience maison : compteurs du jour et résumé, sans donnée personnelle', () => {
  const d = {};
  assert.equal(countHit(d, { p: 'rank', l: 'fr', r: 'eu', m: 1, ref: 'www.reddit.com' }, true), true);
  countHit(d, { p: 'char', c: 'EU/Ray-Kuilu', l: 'fr', r: 'eu' }, false);
  countHit(d, { p: 'search', q: 'Fros<script>' }, false);
  countHit(d, { p: 'rank', ref: 'dropamine.app' }, false);
  assert.equal(countHit(d, { p: 'nimporte' }, true), false, 'page inconnue ignorée');
  assert.equal(d.views, 3, 'une recherche n’est pas une page vue'); assert.equal(d.uniq, 1);
  assert.deepEqual(d.pages, { rank: 2, char: 1 }); assert.deepEqual(d.devices, { mobile: 1, desktop: 3 });
  assert.deepEqual(d.refs, { 'www.reddit.com': 1 }, 'le site lui-même n’est pas une origine');
  assert.deepEqual(d.chars, { 'eu/ray-kuilu': 1 }); assert.deepEqual(d.searches, { frosscript: 1 }, 'texte nettoyé');
  const s = summarize({ '2026-11-27': { views: 5, uniq: 2, pages: { home: 5 } }, '2026-11-28': d }, '2026-11-27', '2026-11-28');
  assert.equal(s.views, 8); assert.equal(s.uniq, 3); assert.equal(s.pages.home, 5); assert.equal(s.days.length, 2);
});
