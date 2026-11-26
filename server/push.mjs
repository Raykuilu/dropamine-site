// Notifications push (Web Push) sans dépendance : chiffrement RFC 8291 (aes128gcm) et identification VAPID RFC 8292.
// Les clés VAPID sont créées au premier démarrage dans .state/vapid.json (jamais versionnées).
import { createECDH, createPrivateKey, generateKeyPairSync, hkdfSync, randomBytes, createCipheriv, sign } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';

const b64u = buf => Buffer.from(buf).toString('base64url');
const unb64u = s => Buffer.from(String(s), 'base64url');

// ---------------------------------------------------------------- clés VAPID
export function vapidKeys(dir) {
  const file = dir + 'vapid.json';
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { /* première fois : on les crée */ }
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = privateKey.export({ format: 'jwk' });
  const keys = { jwk, publicKey: b64u(Buffer.concat([Buffer.from([4]), unb64u(jwk.x), unb64u(jwk.y)])) };
  mkdirSync(dir, { recursive: true });
  writeFileSync(file + '.tmp', JSON.stringify(keys)); renameSync(file + '.tmp', file);
  return keys;
}

// jeton VAPID (ES256) pour le service de push qui héberge l'abonnement
export function vapidHeader(endpoint, keys, subject, now = Date.now()) {
  const aud = new URL(endpoint).origin;
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject }));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key: createPrivateKey({ key: keys.jwk, format: 'jwk' }), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${keys.publicKey}`;
}

// chiffrement du message pour un abonnement { endpoint, keys: { p256dh, auth } } (un seul enregistrement)
export function encrypt(sub, payload, salt = randomBytes(16), ecdh = null) {
  const uaPublic = unb64u(sub.keys.p256dh), authSecret = unb64u(sub.keys.auth);
  const as = ecdh ?? createECDH('prime256v1'); if (!ecdh) as.generateKeys();
  const asPublic = as.getPublicKey(), shared = as.computeSecret(uaPublic);
  const ikm = Buffer.from(hkdfSync('sha256', shared, authSecret, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]), 32));
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const c = createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([c.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const head = Buffer.alloc(21); salt.copy(head, 0); head.writeUInt32BE(4096, 16); head[20] = asPublic.length;
  return Buffer.concat([head, asPublic, body]);
}

// envoi ; renvoie 'gone' si l'abonnement n'existe plus (à supprimer)
export async function sendPush(sub, message, keys, subject) {
  const res = await fetch(sub.endpoint, { method: 'POST', body: encrypt(sub, JSON.stringify(message)), headers: {
    Authorization: vapidHeader(sub.endpoint, keys, subject), TTL: '3600', Urgency: 'high',
    'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' } });
  if (res.status === 404 || res.status === 410) return 'gone';
  return res.ok ? 'ok' : 'err:' + res.status;
}

// ---------------------------------------------------------------- abonnements : { owner: [abonnement, …] } sur le disque du serveur
export const validSub = s => !!s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000
  && typeof s.keys?.p256dh === 'string' && typeof s.keys?.auth === 'string' && s.keys.p256dh.length < 200 && s.keys.auth.length < 100;
export function addSub(store, owner, sub, max = 5, total = 5000) {
  const all = Object.values(store).reduce((n, l) => n + l.length, 0);
  const list = (store[owner] ?? []).filter(x => x.endpoint !== sub.endpoint);
  if (all >= total && !store[owner]?.some(x => x.endpoint === sub.endpoint)) return { error: 'full' };
  list.push({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, at: new Date().toISOString().slice(0, 10) });
  return { store: { ...store, [owner]: list.slice(-max) } };
}
export function removeSub(store, endpoint) {
  const out = {};
  for (const [o, l] of Object.entries(store)) { const k = l.filter(x => x.endpoint !== endpoint); if (k.length) out[o] = k; }
  return out;
}

// ---------------------------------------------------------------- ce qui mérite une notification, d'après l'avant et l'après d'une sortie
// groupe de 5 : 1 tank, 1 soigneur, 3 dégâts ; les suivants attendent (même règle que le site)
export function groupOf(run, raid) {
  if (raid) return new Set(run.members.map(m => m.key));
  const left = { tank: 1, heal: 1, dps: 3 }, g = new Set();
  for (const m of run.members) if (left[m.role] > 0) { left[m.role]--; g.add(m.key); }
  return g;
}
const nice = key => String(key).split('/')[1]?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') ?? key;
// renvoie [{ owner, msg }] ; actor = propriétaire qui a agi (jamais notifié de sa propre action)
export function runEvents(before, after, actor, { dungeonName = k => k, isRaid = () => false } = {}) {
  const out = [], run = after ?? before, name = dungeonName(run.dungeon), when = new Date(run.at);
  const url = `/?p=runs&run=${encodeURIComponent(run.id)}`;
  const push = (owner, title, body) => { if (owner && owner !== actor) out.push({ owner, msg: { title, body, url, tag: 'run-' + run.id } }); };
  const ownerOf = (r, key) => r?.members.find(m => m.key === key)?.owner;
  if (before && !after) {   // annulée par l'organisateur
    for (const m of before.members) push(m.owner, `${name} : sortie annulée`, `${nice(before.by)} a annulé la sortie du ${when.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.`);
    return out;
  }
  const bKeys = new Set((before?.members ?? []).map(m => m.key)), aKeys = new Set(after.members.map(m => m.key));
  for (const m of after.members) if (!bKeys.has(m.key)) push(after.owner, `${name} : ${nice(m.key)} rejoint ta sortie`, `${after.members.length} inscrit${after.members.length > 1 ? 's' : ''} · rôle ${m.role === 'heal' ? 'soigneur' : m.role === 'tank' ? 'tank' : 'dégâts'}`);
  for (const m of before?.members ?? []) if (!aKeys.has(m.key)) push(after.owner, `${name} : ${nice(m.key)} quitte ta sortie`, `${after.members.length} inscrit${after.members.length > 1 ? 's' : ''}`);
  // quelqu'un passe de la liste d'attente au groupe
  if (before) {
    const raid = isRaid(after.dungeon), gb = groupOf(before, raid), ga = groupOf(after, raid);
    for (const k of ga) if (!gb.has(k) && bKeys.has(k)) push(ownerOf(after, k), `${name} : une place s'est libérée`, `Tu passes de la liste d'attente au groupe.`);
    const full = g => !raid && g.size >= 5;
    if (!full(gb) && full(ga)) for (const k of ga) push(ownerOf(after, k), `${name} : groupe complet !`, `Rendez-vous le ${when.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}.`);
  }
  return out;
}
// rappels : sorties qui commencent dans moins de 30 min et pas encore rappelées
export function dueReminders(runs, sent, now = Date.now(), dungeonName = k => k) {
  const out = [];
  for (const r of runs) {
    const left = Date.parse(r.at) - now;
    if (left <= 0 || left > 30 * 60e3 || sent.has(r.id + '@' + r.at)) continue;
    sent.add(r.id + '@' + r.at);
    const min = Math.max(1, Math.round(left / 60e3));
    for (const m of r.members) out.push({ owner: m.owner, msg: { title: `${dungeonName(r.dungeon)} dans ${min} min`, body: `Organisée par ${nice(r.by)} · /w ${nice(r.by).split(' ')[0]}`, url: `/?p=runs&run=${encodeURIComponent(r.id)}`, tag: 'run-' + r.id } });
  }
  return out;
}
