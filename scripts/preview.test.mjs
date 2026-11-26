import test from 'node:test';
import assert from 'node:assert/strict';
import { previewHtml, previewPath } from './preview.mjs';

test('aperçu de lien : titre, résumé, buste et renvoi vers la fiche', () => {
  const p = { region: 'eu', slug: 'ray-kuilu', name: 'Ray', surname: 'Kuilu', race: 'Elfe de la nuit', class: 'Druide', level: 36, total: 1366, max: 2460,
    guild: { name: 'Everybody Knows' }, professions: [{ id: 393, name: 'Skinning', skill: 223 }, { id: 165, name: 'Leatherworking', skill: 139 }, { id: 185, name: 'Cooking', skill: 161 }],
    inset: 'https://render.worldofwarcraft.com/x-inset.jpg' };
  const h = previewHtml(p, 4);
  assert.match(h, /<meta property="og:title" content="Ray Kuilu · 1 366 \/ 2 460 · Dropamine Hiscores">/);
  assert.match(h, /Druide elfe de la nuit · niveau 36 · Everybody Knows · 4e au niveau total · Dépeçage 223 · Cuisine 161/);
  assert.match(h, /og:image" content="https:\/\/render\.worldofwarcraft\.com\/x-inset\.jpg"/);
  assert.match(h, /url=https:\/\/dropamine\.app\/\?p=char&amp;c=eu%2Fray-kuilu/);
  assert.equal(previewPath({ region: 'eu', slug: 'patience-disciplïne' }), '/c/eu/patience-discipline/');
  assert.ok(!previewHtml({ ...p, name: '<b>' }, 1).includes('<b>'), 'texte échappé');
});
