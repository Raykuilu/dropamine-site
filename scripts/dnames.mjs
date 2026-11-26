// Noms des donjons en anglais et en français : site/data/dnames.json { clé AtlasLoot: [en, fr] }
// Source : le Journal des donjons de l'API Blizzard (noms officiels, toutes langues). Les ailes (Monastère, Hache-Tripes)
// reprennent le nom officiel du donjon et de l'aile ; les donjons propres à Forever (absents de l'API) ont notre traduction.
//   node scripts/dnames.mjs   (BNET_CLIENT_ID / BNET_CLIENT_SECRET dans l'environnement)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const norm = s => String(s).toLowerCase().replace(/^the\s+/, '').replace(/[^a-z]/g, '');
// ailes et cas que le nom anglais seul ne suffit pas à retrouver
const WINGS = {
  ScarletMonasteryArmory: ['Scarlet Monastery', ' – Armurerie'], ScarletMonasteryCathedral: ['Scarlet Monastery', ' – Cathédrale'],
  ScarletMonasteryGraveyard: ['Scarlet Monastery', ' – Cimetière'], ScarletMonasteryLibrary: ['Scarlet Monastery', ' – Bibliothèque'],
  DireMaulEast: ['Dire Maul - Warpwood Quarter', ''], DireMaulNorth: ['Dire Maul - Gordok Commons', ''], DireMaulWest: ['Dire Maul - Capital Gardens', ''],
  Stratholme: ['Stratholme - Main Gate', '', 'Stratholme'], Onyxia: ["Onyxia's Lair", ''], Ragefire: ['Ragefire Chasm', ''],
  TheRuinsofAhnQiraj: ["Ruins of Ahn'Qiraj", ''], TheTempleofAhnQiraj: ["Temple of Ahn'Qiraj", ''],
};
// donjons propres à WoW Forever (pas dans l'API) : notre traduction
const FOREVER_FR = {
  ExcavationSiteWetlands: 'Site de fouilles des Paluns', ShapersTerrace: 'Terrasse des Façonneurs', TheAlcazPrison: 'La prison d’Alcaz',
  TheBlackmawHold: 'Le fort de Noiregueule', TheCityOfDalaran: 'La cité de Dalaran', TheDrownedCity: 'La cité engloutie',
  TheHallOfThanes: 'La salle des Thanes', TheKrolDokStronghold: 'Le bastion de Krol Dok', TheRuinsOfLordaeron: 'Les ruines de Lordaeron',
  WorldBosses: 'Boss mondiaux',
};
// noms anglais un peu bruts d'AtlasLoot, corrigés pour l'affichage
const EN_FIX = { TheRuinsofAhnQiraj: "Ruins of Ahn'Qiraj", TheTempleofAhnQiraj: "Temple of Ahn'Qiraj", Onyxia: "Onyxia's Lair", Ragefire: 'Ragefire Chasm',
  TheCityOfDalaran: 'The City of Dalaran', TheHallOfThanes: 'The Hall of Thanes', TheRuinsOfLordaeron: 'The Ruins of Lordaeron', TheKrolDokStronghold: 'The Krol Dok Stronghold',
  "TheTempleOfAtal'Hakkar": "The Temple of Atal'Hakkar" };

export async function updateDungeonNames(tok) {
  const loot = JSON.parse(await readFile(join(ROOT, 'site/data/loot.json'), 'utf8'));
  const res = await fetch('https://eu.api.blizzard.com/data/wow/journal-instance/index?namespace=static-eu', { headers: { Authorization: `Bearer ${tok}` } });
  const list = (await res.json()).instances ?? [];
  const byEn = new Map(list.map(i => [i.name?.en_US, i])), byNorm = list.map(i => ({ i, n: norm(i.name?.en_US ?? '') }));
  const out = {};
  for (const d of loot.dungeons) {
    const en = EN_FIX[d.key] ?? d.name;
    if (FOREVER_FR[d.key]) { out[d.key] = [en, FOREVER_FR[d.key]]; continue; }
    const w = WINGS[d.key];
    let fr = null;
    if (w) { const i = byEn.get(w[0]); if (i) fr = (w[2] ?? i.name.fr_FR) + w[1]; }
    if (!fr) {
      const k = norm(d.name);
      const m = byNorm.find(x => x.n === k) ?? byNorm.filter(x => k.startsWith(x.n)).sort((a, b) => b.n.length - a.n.length)[0];
      fr = m?.i.name.fr_FR ?? null;
    }
    out[d.key] = [en, (fr ?? en).replace(/’/g, '’')];
  }
  await writeFile(join(ROOT, 'site/data/dnames.json'), JSON.stringify(out, null, 1));
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { token } = await import('./build.mjs');
  const out = await updateDungeonNames(await token());
  for (const [k, [en, fr]] of Object.entries(out)) console.log(k.padEnd(28), en.padEnd(30), fr);
}
