import test from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, hkdfSync, createDecipheriv, randomBytes, createPublicKey, verify } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encrypt, vapidKeys, vapidHeader, addSub, removeSub, validSub, runEvents, dueReminders, groupOf } from './push.mjs';

test('chiffrement RFC 8291 : le navigateur sait relire le message', () => {
  const ua = createECDH('prime256v1'); ua.generateKeys();
  const auth = randomBytes(16);
  const sub = { endpoint: 'https://push.example/x', keys: { p256dh: ua.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } };
  const body = encrypt(sub, '{"title":"Shadowfang Keep dans 30 min"}');
  const salt = body.subarray(0, 16), rs = body.readUInt32BE(16), idlen = body[20], asPub = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  assert.equal(rs, 4096); assert.equal(idlen, 65);
  const shared = ua.computeSecret(asPub);
  const ikm = Buffer.from(hkdfSync('sha256', shared, auth, Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPub]), 32));
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const d = createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const plain = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  assert.equal(plain[plain.length - 1], 2);
  assert.equal(plain.subarray(0, -1).toString(), '{"title":"Shadowfang Keep dans 30 min"}');
});

test('VAPID : clés créées une fois, jeton signé ES256 vérifiable', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vapid-')) + '/';
  const k = vapidKeys(dir), again = vapidKeys(dir);
  assert.equal(k.publicKey, again.publicKey, 'mêmes clés au redémarrage');
  const h = vapidHeader('https://fcm.googleapis.com/fcm/send/abc', k, 'https://dropamine.app', Date.parse('2026-11-26T12:00:00Z'));
  const [, tok, key] = h.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(key, k.publicKey);
  const [hd, bd, sig] = tok.split('.');
  const claims = JSON.parse(Buffer.from(bd, 'base64url'));
  assert.equal(claims.aud, 'https://fcm.googleapis.com'); assert.equal(claims.sub, 'https://dropamine.app');
  const pub = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: k.jwk.x, y: k.jwk.y }, format: 'jwk' });
  assert.ok(verify('sha256', Buffer.from(`${hd}.${bd}`), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url')));
});

test('abonnements : 5 par compte au plus, doublons remplacés, suppression', () => {
  const sub = n => ({ endpoint: 'https://push.example/' + n, keys: { p256dh: 'p', auth: 'a' } });
  assert.ok(validSub(sub(1))); assert.ok(!validSub({ endpoint: 'http://x', keys: {} }));
  let s = {};
  for (let i = 0; i < 7; i++) s = addSub(s, 'bnet:a', sub(i)).store;
  assert.equal(s['bnet:a'].length, 5);
  s = addSub(s, 'bnet:a', sub(6)).store; assert.equal(s['bnet:a'].length, 5, 'même appareil : remplacé');
  assert.equal(addSub(s, 'bnet:b', sub(99), 5, 5).error, 'full');
  assert.equal(removeSub(s, 'https://push.example/6')['bnet:a'].length, 4);
});

const run = (members, extra = {}) => ({ id: 'r1', dungeon: 'ShadowfangKeep', at: '2026-11-27T20:00:00.000Z', by: 'eu/ray-kuilu', owner: 'bnet:ray', members, ...extra });
const m = (key, role, owner) => ({ key, role, owner });
test('notifications d\'une sortie : arrivée, départ, place libérée, groupe complet, annulation', () => {
  const opt = { dungeonName: () => 'Shadowfang Keep' };
  const a = run([m('eu/ray-kuilu', 'tank', 'bnet:ray')]);
  const b = run([...a.members, m('eu/yema-lobrah', 'heal', 'bnet:yema')]);
  const ev = runEvents(a, b, 'bnet:yema', opt);
  assert.deepEqual(ev.map(e => [e.owner, e.msg.title]), [['bnet:ray', 'Shadowfang Keep : Yema Lobrah rejoint ta sortie']]);
  assert.equal(runEvents(a, b, 'bnet:ray', opt).length, 0, 'l\'organisateur ne se notifie pas lui-même');
  // groupe complet
  const full4 = run([m('eu/a', 'tank', 'o1'), m('eu/b', 'heal', 'o2'), m('eu/c', 'dps', 'o3'), m('eu/d', 'dps', 'o4')], { owner: 'o1' });
  const full5 = run([...full4.members, m('eu/e', 'dps', 'o5')], { owner: 'o1' });
  const done = runEvents(full4, full5, 'o5', opt).filter(e => /complet/.test(e.msg.title)).map(e => e.owner).sort();
  assert.deepEqual(done, ['o1', 'o2', 'o3', 'o4']);
  // liste d'attente : un 2e tank attend ; le 1er tank part → le 2e entre dans le groupe
  const wait = run([m('eu/a', 'tank', 'o1'), m('eu/b', 'heal', 'o2'), m('eu/t2', 'tank', 'o9')], { owner: 'o2' });
  const freed = run([m('eu/b', 'heal', 'o2'), m('eu/t2', 'tank', 'o9')], { owner: 'o2' });
  assert.ok(runEvents(wait, freed, 'o1', opt).some(e => e.owner === 'o9' && /place/.test(e.msg.title)));
  assert.equal(groupOf(wait, false).size, 2);
  // annulation : tous les inscrits sauf celui qui annule
  assert.deepEqual(runEvents(b, null, 'bnet:ray', opt).map(e => e.owner), ['bnet:yema']);
});

test('rappels : une fois, dans la demi-heure qui précède', () => {
  const now = Date.parse('2026-11-27T19:40:00Z'), sent = new Set();
  const r = run([m('eu/ray-kuilu', 'tank', 'bnet:ray'), m('eu/yema-lobrah', 'heal', 'bnet:yema')]);
  const first = dueReminders([r], sent, now, () => 'Shadowfang Keep');
  assert.equal(first.length, 2); assert.equal(first[0].msg.title, 'Shadowfang Keep dans 20 min');
  assert.equal(dueReminders([r], sent, now + 60e3).length, 0, 'pas deux fois');
  assert.equal(dueReminders([run([], { id: 'r2' })], new Set(), Date.parse('2026-11-27T18:00:00Z')).length, 0, 'trop tôt');
});
