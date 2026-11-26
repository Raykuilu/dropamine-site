// Noms des donjons dans les 7 langues du site : site/data/dnames.json { clé AtlasLoot: [en, fr, de, es, it, pt, ru] }
// Source : le Journal des donjons de l'API Blizzard (noms officiels, toutes langues). Les ailes (Monastère, Hache-Tripes)
// reprennent le nom officiel du donjon et le nom de l'aile ; les donjons propres à Forever (absents de l'API) ont notre traduction.
//   node scripts/dnames.mjs   (BNET_CLIENT_ID / BNET_CLIENT_SECRET dans l'environnement)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = ['en_US', 'fr_FR', 'de_DE', 'es_ES', 'it_IT', 'pt_BR', 'ru_RU'];
const norm = s => String(s).toLowerCase().replace(/^the\s+/, '').replace(/[^a-z]/g, '');
// ailes : [nom anglais du donjon dans l'API, suffixe par langue (en, fr, de, es, it, pt, ru), nom forcé (facultatif)]
const W = (a, b, c, d, e, f, g) => [a, b, c, d, e, f, g];
const WINGS = {
  ScarletMonasteryArmory: ['Scarlet Monastery', W(' - Armory', ' – Armurerie', ' – Waffenkammer', ' – Armería', ' – Armeria', ' – Arsenal', ' – Оружейная')],
  ScarletMonasteryCathedral: ['Scarlet Monastery', W(' - Cathedral', ' – Cathédrale', ' – Kathedrale', ' – Catedral', ' – Cattedrale', ' – Catedral', ' – Собор')],
  ScarletMonasteryGraveyard: ['Scarlet Monastery', W(' - Graveyard', ' – Cimetière', ' – Friedhof', ' – Cementerio', ' – Cimitero', ' – Cemitério', ' – Кладбище')],
  ScarletMonasteryLibrary: ['Scarlet Monastery', W(' - Library', ' – Bibliothèque', ' – Bibliothek', ' – Biblioteca', ' – Biblioteca', ' – Biblioteca', ' – Библиотека')],
  DireMaulEast: ['Dire Maul - Warpwood Quarter', null], DireMaulNorth: ['Dire Maul - Gordok Commons', null], DireMaulWest: ['Dire Maul - Capital Gardens', null],
  Stratholme: ['Stratholme - Main Gate', null, 'Stratholme'], Onyxia: ["Onyxia's Lair", null], Ragefire: ['Ragefire Chasm', null],
  TheRuinsofAhnQiraj: ["Ruins of Ahn'Qiraj", null], TheTempleofAhnQiraj: ["Temple of Ahn'Qiraj", null],
};
// donjons propres à WoW Forever (pas dans l'API) : notre traduction [fr, de, es, it, pt, ru]
const FOREVER = {
  ExcavationSiteWetlands: ['Site de fouilles des Paluns', 'Ausgrabungsstätte im Sumpfland', 'Excavación de los Humedales', 'Scavi delle Paludi', 'Escavação dos Pantanais', 'Раскопки в Болотине'],
  ShapersTerrace: ['Terrasse des Façonneurs', 'Terrasse der Former', 'Terraza de los Creadores', 'Terrazza dei Plasmatori', 'Terraço dos Moldadores', 'Терраса Творцов'],
  TheAlcazPrison: ['La prison d’Alcaz', 'Das Gefängnis von Alcaz', 'La Prisión de Alcaz', 'La Prigione di Alcaz', 'A Prisão de Alcaz', 'Тюрьма Алькаса'],
  TheBlackmawHold: ['Le fort de Noiregueule', 'Die Feste der Schwarzschlund', 'El Bastión Faucenegra', 'La Rocca di Faucenera', 'A Fortaleza Bocanegra', 'Крепость Черной Пасти'],
  TheCityOfDalaran: ['La cité de Dalaran', 'Die Stadt Dalaran', 'La Ciudad de Dalaran', 'La Città di Dalaran', 'A Cidade de Dalaran', 'Город Даларан'],
  TheDrownedCity: ['La cité engloutie', 'Die versunkene Stadt', 'La Ciudad Sumergida', 'La Città Sommersa', 'A Cidade Submersa', 'Затонувший город'],
  TheHallOfThanes: ['La salle des Thanes', 'Die Halle der Thane', 'La Sala de los Thanes', 'La Sala dei Thane', 'O Salão dos Thanes', 'Зал Танов'],
  TheKrolDokStronghold: ['Le bastion de Krol Dok', 'Die Festung Krol Dok', 'El Bastión de Krol Dok', 'La Roccaforte di Krol Dok', 'A Fortaleza de Krol Dok', 'Цитадель Крол Док'],
  TheRuinsOfLordaeron: ['Les ruines de Lordaeron', 'Die Ruinen von Lordaeron', 'Las Ruinas de Lordaeron', 'Le Rovine di Lordaeron', 'As Ruínas de Lordaeron', 'Руины Лордерона'],
  WorldBosses: ['Boss mondiaux', 'Weltbosse', 'Jefes del mundo', 'Boss del mondo', 'Chefes mundiais', 'Мировые боссы'],
};
// noms anglais un peu bruts d'AtlasLoot, corrigés pour l'affichage
const EN_FIX = { TheRuinsofAhnQiraj: "Ruins of Ahn'Qiraj", TheTempleofAhnQiraj: "Temple of Ahn'Qiraj", Onyxia: "Onyxia's Lair", Ragefire: 'Ragefire Chasm',
  TheCityOfDalaran: 'The City of Dalaran', TheHallOfThanes: 'The Hall of Thanes', TheRuinsOfLordaeron: 'The Ruins of Lordaeron', TheKrolDokStronghold: 'The Krol Dok Stronghold',
  "TheTempleOfAtal'Hakkar": "The Temple of Atal'Hakkar" };
const tidy = s => String(s).replace(/’/g, '’');

export async function updateDungeonNames(tok) {
  const loot = JSON.parse(await readFile(join(ROOT, 'site/data/loot.json'), 'utf8'));
  const res = await fetch('https://eu.api.blizzard.com/data/wow/journal-instance/index?namespace=static-eu', { headers: { Authorization: `Bearer ${tok}` } });
  const list = (await res.json()).instances ?? [];
  const byEn = new Map(list.map(i => [i.name?.en_US, i])), byNorm = list.map(i => ({ i, n: norm(i.name?.en_US ?? '') }));
  const all = i => LOCALES.map(l => i.name?.[l] ?? i.name?.en_US);
  const out = {};
  for (const d of loot.dungeons) {
    const en = EN_FIX[d.key] ?? d.name;
    if (FOREVER[d.key]) { out[d.key] = [en, ...FOREVER[d.key]]; continue; }
    let names = null;
    const w = WINGS[d.key];
    if (w) {
      const i = byEn.get(w[0]);
      // nom du donjon + nom de l'aile ; Stratholme : le nom seul (sans « - Main Gate ») ; les autres : le nom de l'API tel quel
      if (i) names = all(i).map((n, k) => (k === 0 ? en : w[1] ? n + w[1][k] : w[2] ? n.replace(/\s*[-–:].*$/, '') : n));
    }
    if (!names) {
      const k = norm(d.name);
      const m = byNorm.find(x => x.n === k) ?? byNorm.filter(x => k.startsWith(x.n)).sort((a, b) => b.n.length - a.n.length)[0];
      names = m ? all(m.i).map((n, i) => (i === 0 ? en : n)) : LOCALES.map(() => en);
    }
    out[d.key] = names.map(tidy);
  }
  await writeFile(join(ROOT, 'site/data/dnames.json'), JSON.stringify(out, null, 1));
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { token } = await import('./build.mjs');
  const out = await updateDungeonNames(await token());
  for (const [k, names] of Object.entries(out)) console.log(k.padEnd(28), names.join(' | '));
}
