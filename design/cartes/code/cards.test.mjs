import test from 'node:test';
import assert from 'node:assert/strict';
import { sharePage } from './cards.mjs';

const p = { region: 'eu', slug: 'colìn-maillard', name: 'Colìn', surname: 'Maillard', race: 'Nain', class: 'Chasseur', level: 30, total: 802, max: 2460, guild: { name: 'Everybody <Knows>' } };

test('page de partage : aperçu de la carte et retour vers la fiche', () => {
  const h = sharePage(p, { image: true, day: '2026-11-25' });
  assert.match(h, /og:image" content="https:\/\/dropamine.app\/cards\/eu\/col%C3%ACn-maillard.png\?v=2026-11-25"/);
  assert.match(h, /og:url" content="https:\/\/dropamine.app\/c\/eu\/col%C3%ACn-maillard\/"/);
  assert.ok(h.includes('location.replace("/?p=char&c=eu%2Fcol%C3%ACn-maillard")'));
  assert.ok(h.includes('Everybody &lt;Knows&gt;') && !h.includes('<Knows>'), 'texte échappé');
});

test("page de partage sans image : l'image générale du site", () => {
  assert.match(sharePage(p, { image: false, day: 'x' }), /og:image" content="https:\/\/dropamine.app\/img\/og.jpg"/);
});
