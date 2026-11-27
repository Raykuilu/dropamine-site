// Ordre des donjons : le bloc <dunorder> de site/app.js, évalué tel quel (même ordre que le carnet de l'addon)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../site/app.js', import.meta.url), 'utf8');
const block = src.slice(src.indexOf('// <dunorder>'), src.indexOf('// </dunorder>'));
const ctx = {
  RAIDS: { Onyxia: { size: 40 } },
  isRaid: d => d.key === 'Onyxia' || d.key === 'MoltenCore' || !(d.lvl || [])[0],
  t: (k, v = {}) => k === 'clogBand' ? `Donjons niv. ${v.a}-${v.b}` : k,
  // même calcul que site/app.js : niveau conseillé affiché (« niveau 16–30 »)
  dunFrom: d => { const [lo, mid] = d.lvl || []; return lo ? Math.max(lo, (mid || lo) - 6) : 0; },
};
vm.runInNewContext(block + '\nthis.byLevel = byLevel; this.dunBandLabel = dunBandLabel;', ctx);

const D = (key, lvl, extra = {}) => ({ key, name: key, lvl, ...extra });
const list = [
  D('WorldBosses', []), D('MoltenCore', [60, 60, 60]), D('Scholomance', [48, 56, 60]),
  D('Onyxia', [60, 60, 60]), D('Deadmines', [10, 18, 23]), D('Fishing', [], { activity: true }),
  D('Uldaman', [30, 41, 51]), D('RagefireChasm', [8, 15, 21]), D('Gnomeregan', [19, 27, 38]),
  D('BlackfathomDeeps', [15, 24, 32]), D('Naxxramas', [0, 0, 0]), D('BarrowDeeps', [60, 60, 60]),
];
ctx.isRaid = d => ['Onyxia', 'MoltenCore', 'Naxxramas', 'BarrowDeeps'].includes(d.key) || !(d.lvl || [])[0];

test('donjons : tranches du niveau conseillé affiché, puis raids, puis activités', () => {
  const order = [...list].sort(ctx.byLevel).map(d => d.key);
  assert.deepEqual(order, ['RagefireChasm', 'Deadmines', 'BlackfathomDeeps', 'Gnomeregan', 'Uldaman', 'Scholomance',
    'MoltenCore', 'Onyxia', 'Naxxramas', 'BarrowDeeps', 'Fishing', 'WorldBosses']);
});

test('en-têtes de tranche', () => {
  assert.equal(ctx.dunBandLabel(D('Deadmines', [10, 18, 23])), 'Donjons niv. 10-29');
  assert.equal(ctx.dunBandLabel(D('BlackfathomDeeps', [15, 24, 32])), 'Donjons niv. 10-29');   // affiché « niveau 18–32 »
  assert.equal(ctx.dunBandLabel(D('Uldaman', [30, 41, 51])), 'Donjons niv. 30-49');            // affiché « niveau 35–51 »
  assert.equal(ctx.dunBandLabel(D('Scholomance', [48, 56, 60])), 'Donjons niv. 50-60');
  assert.equal(ctx.dunBandLabel(D('Onyxia', [60, 60, 60])), 'clogRaids');
  assert.equal(ctx.dunBandLabel(D('Fishing', [], { activity: true })), 'clogOther');
});
