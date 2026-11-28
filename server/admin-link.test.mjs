import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeAdminLink, consumeAdminLink, linkFile } from './admin-link.mjs';

test('lien admin de secours : usage unique, 10 minutes, seule l\'empreinte est écrite', () => {
  const dir = mkdtempSync(join(tmpdir(), 'adl-')) + '/', now = 1_000_000;
  const url = makeAdminLink(dir, 'https://api.x', now);
  const t = new URL(url).searchParams.get('t');
  assert.match(url, /^https:\/\/api\.x\/auth\/admin-link\?t=/);
  assert.ok(!readFileSync(linkFile(dir), 'utf8').includes(t), 'le jeton lui-même n\'est pas gardé');
  assert.equal(consumeAdminLink(dir, 'mauvais', now), false);
  assert.equal(consumeAdminLink(dir, null, now), false);
  assert.equal(consumeAdminLink(dir, t, now + 1000), true);
  assert.equal(consumeAdminLink(dir, t, now + 2000), false, 'déjà utilisé');
  assert.ok(!existsSync(linkFile(dir)));
  const t2 = new URL(makeAdminLink(dir, 'https://api.x', now)).searchParams.get('t');
  assert.equal(consumeAdminLink(dir, t2, now + 11 * 60e3), false, 'expiré');
  assert.ok(!existsSync(linkFile(dir)), 'lien expiré effacé');
});
