// Accès admin de secours, sans Battle.net (quand Blizzard est injoignable) : à lancer dans la console SSH du serveur.
//
//   node server/admin-link.mjs
//
// Affiche un lien à usage unique, valable 10 minutes, qui ouvre une session admin sur api.dropamine.app/admin.
// Seule l'empreinte du jeton est écrite (server/.state/admin-link.json, hors du dépôt) ; le lien lui-même n'est
// gardé nulle part. Seul quelqu'un qui a déjà accès au serveur peut donc en créer un.
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const LINK_MINUTES = 10;
export const linkFile = dir => dir + 'admin-link.json';
export const hashToken = t => createHash('sha256').update(String(t)).digest('hex');

export function makeAdminLink(stateDir, publicUrl = 'https://api.dropamine.app', now = Date.now()) {
  const token = randomBytes(32).toString('base64url');
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(linkFile(stateDir), JSON.stringify({ hash: hashToken(token), exp: now + LINK_MINUTES * 60e3 }), { mode: 0o600 });
  return `${publicUrl}/auth/admin-link?t=${token}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = fileURLToPath(new URL('./.state/', import.meta.url));
  console.log(`\nLien admin, usage unique, valable ${LINK_MINUTES} minutes :\n\n  ${makeAdminLink(dir)}\n\nOuvre-le dans ton navigateur. Ne le partage pas.\n`);
}

// Vérifie un jeton reçu par /auth/admin-link : bon, pas expiré, jamais utilisé. Le fichier est effacé dès qu'il a servi
// (ou s'il a expiré) : un lien ne marche qu'une fois.
export function consumeAdminLink(stateDir, token, now = Date.now()) {
  let rec;
  try { rec = JSON.parse(readFileSync(linkFile(stateDir), 'utf8')); } catch { return false; }
  if (!rec?.hash || !(rec.exp > now)) { rmSync(linkFile(stateDir), { force: true }); return false; }
  const a = Buffer.from(hashToken(token ?? '')), b = Buffer.from(String(rec.hash));
  if (!token || a.length !== b.length || !timingSafeEqual(a, b)) return false;
  rmSync(linkFile(stateDir), { force: true });
  return true;
}
