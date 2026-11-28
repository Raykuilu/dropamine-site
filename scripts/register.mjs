// Inscription / retrait automatiques, depuis un formulaire GitHub (issue).
// Lancé par .github/workflows/register.yml. Le contenu de l'issue est une donnée non fiable :
// il arrive par variable d'environnement et n'est jamais exécuté ni interpolé dans le shell.
//
// Entrées (env) : KIND (inscription | retrait), ISSUE_BODY, ISSUE_AUTHOR, BNET_CLIENT_ID / SECRET
// Sorties : data/registry.json mis à jour, out/reply.md (réponse à poster), out/status (ok | refused | review)

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEntry, token, fetchCharacter } from './build.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Formulaire GitHub → { "Région / Region": "EU", "Personnage ...": "Ray Kuilu", ... }
export function parseForm(body) {
  const out = {};
  const parts = String(body ?? '').split(/^###\s+/m).slice(1);
  for (const p of parts) {
    const [title, ...rest] = p.split(/\r?\n/);
    out[title.trim()] = rest.join('\n').trim();
  }
  return out;
}

export function entryFromForm(body) {
  const f = parseForm(body);
  const region = Object.entries(f).find(([k]) => /^r[ée]gion/i.test(k))?.[1] ?? '';
  const name = Object.entries(f).find(([k]) => /^personnage|^character/i.test(k))?.[1] ?? '';
  if (!/^(EU|US|TW)$/i.test(region.trim())) return null;
  if (name.length > 60 || name.includes('\n')) return null;
  return parseEntry(`${region.trim()}/${name}`);
}

async function main() {
  const kind = process.env.KIND, author = process.env.ISSUE_AUTHOR || '';
  const regFile = join(ROOT, 'data/registry.json');
  const reg = JSON.parse(await readFile(regFile, 'utf8'));
  reg.owners ??= {};
  const reply = [];
  let status = 'refused';
  const e = entryFromForm(process.env.ISSUE_BODY);

  if (!e) {
    reply.push("Je n'ai pas compris la région ou le personnage. Indique la région (EU, US ou TW) et le personnage sous la forme « Prénom Nom », comme dans l'armurerie.",
      '', "I couldn't read the region or the character. Please give the region (EU, US or TW) and the character as “Firstname Surname”, as in the armory.");
  } else if (kind === 'inscription') {
    const keys = reg.characters.map(c => parseEntry(c)?.key);
    if (keys.includes(e.key)) {
      reply.push(`**${e.key}** est déjà inscrit. / **${e.key}** is already registered.`); status = 'ok';
    } else {
      const c = await fetchCharacter(await token(), e.region, e.slug);
      if (!c) {
        reply.push(`Je ne trouve pas **${e.key}** dans l'armurerie. Le personnage doit être niveau 10 ou plus et s'être déconnecté au moins une fois ; l'armurerie peut aussi avoir quelques heures de retard. Tu peux réessayer plus tard.`,
          '', `I can't find **${e.key}** in the armory. The character must be level 10+ and have logged out at least once; the armory can also lag a few hours. Please try again later.`);
      } else {
        reg.characters.push(e.key);
        reg.owners[e.key] = author;
        if (reg.optout) reg.optout = reg.optout.filter(k => k !== e.key);
        status = 'ok';
        reply.push(`**${c.profile.name} ${c.profile.surname}** (${e.region.toUpperCase()}, niveau ${c.profile.level}) est inscrit ! Il apparaîtra sur https://dropamine.app d'ici quelques minutes.`,
          '', `**${c.profile.name} ${c.profile.surname}** is registered! It will show on https://dropamine.app within a few minutes.`);
      }
    }
  } else if (kind === 'retrait') {
    const idx = reg.characters.findIndex(c => parseEntry(c)?.key === e.key);
    if (idx < 0) {
      // pas inscrit : peut-être affiché en aperçu par sa guilde → on ne l'affichera plus (liste optout)
      reg.optout ??= [];
      if (!reg.optout.includes(e.key)) reg.optout.push(e.key);
      await rm(join(ROOT, 'data/history', e.region, `${e.slug}.json`), { force: true });
      reply.push(`**${e.key}** ne sera plus affiché sur le site (ni inscrit, ni en aperçu de guilde). / **${e.key}** will no longer be shown on the site (neither registered nor as a guild preview).`); status = 'ok';
    } else if ((reg.owners[e.key] && reg.owners[e.key] !== author) || reg.ownersEnc?.[e.key]) {
      // seul le compte qui a inscrit le personnage peut le retirer automatiquement
      status = 'review';
      reply.push("Ce personnage a été inscrit par un autre compte GitHub : le mainteneur va vérifier la demande à la main.",
        '', 'This character was registered by another GitHub account: the maintainer will review the request.');
    } else {
      reg.characters.splice(idx, 1);
      delete reg.owners[e.key]; if (reg.ownersEnc) delete reg.ownersEnc[e.key];
      await rm(join(ROOT, 'data/history', e.region, `${e.slug}.json`), { force: true });
      const upFile = join(ROOT, 'data/uploads.json');
      if (existsSync(upFile)) { const up = JSON.parse(await readFile(upFile, 'utf8')); delete up[e.key]; await writeFile(upFile, JSON.stringify(up, null, 2) + '\n'); }
      status = 'ok';
      reply.push(`**${e.key}** est retiré, avec son historique. / **${e.key}** has been removed, with its history.`);
    }
  }

  await writeFile(regFile, JSON.stringify(reg, null, 2) + '\n');
  await mkdir(join(ROOT, 'out'), { recursive: true });
  await writeFile(join(ROOT, 'out/reply.md'), reply.join('\n') + '\n');
  await writeFile(join(ROOT, 'out/status'), status);
  console.log(status, e?.key ?? '(illisible)');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error('ÉCHEC :', err.message); process.exit(1); });
}
