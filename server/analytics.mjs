// Mesure d'audience maison et journal des actions, pour la page admin.
//
// Audience : aucun cookie, aucune adresse IP enregistrée. Chaque visite envoie seulement la page vue, la langue, la région,
// le type d'appareil et le site d'origine. Les visiteurs uniques du jour sont comptés avec une empreinte (IP + navigateur)
// passée dans un sel aléatoire qui change chaque jour et n'est jamais écrit : impossible de reconnaître quelqu'un d'un jour à l'autre.
// Les totaux par jour sont gardés 90 jours (ce ne sont que des compteurs).
//
// Journal : connexions et actions des comptes (BattleTag, heure, action), gardé 30 jours, visible seulement par l'admin.
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const KEEP_DAYS = 90, JOURNAL_DAYS = 30, JOURNAL_MAX = 5000, TOP = 200;
const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const clean = (v, max = 60) => typeof v === 'string' ? v.trim().slice(0, max).replace(/[^\p{L}\p{N}\s/._'-]/gu, '') : '';
const add = (o, k, n = 1) => { if (k) o[k] = (o[k] ?? 0) + n; };
const trim = (o, n = TOP) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n));
export const VIEWS = ['home', 'rank', 'char', 'guild', 'runs', 'news', 'stats', 'get', 'join', 'privacy', 'about', 'search'];

// une visite → les compteurs du jour (fonction pure, testée)
export function countHit(d, hit, isNewVisitor) {
  const p = VIEWS.includes(hit.p) ? hit.p : null;
  if (!p) return false;
  d.views = (d.views ?? 0) + (p === 'search' ? 0 : 1);
  if (isNewVisitor) d.uniq = (d.uniq ?? 0) + 1;
  for (const f of ['pages', 'langs', 'regions', 'devices', 'refs', 'chars', 'guilds', 'searches']) d[f] ??= {};
  if (p !== 'search') add(d.pages, p);
  add(d.langs, /^[a-z]{2}$/.test(hit.l) ? hit.l : null);
  add(d.regions, ['eu', 'us', 'tw'].includes(hit.r) ? hit.r : null);
  add(d.devices, hit.m ? 'mobile' : 'desktop');
  const ref = clean(hit.ref, 80).toLowerCase();
  if (ref && !/dropamine\.app$/.test(ref)) add(d.refs, ref);
  if (p === 'char') add(d.chars, clean(hit.c, 80).toLowerCase());
  if (p === 'guild') add(d.guilds, clean(hit.g, 80).toLowerCase());
  if (p === 'search') add(d.searches, clean(hit.q, 40).toLowerCase());
  return true;
}
// plusieurs jours → un résumé (totaux, courbe jour par jour, classements)
export function summarize(days, from, to) {
  const out = { days: [], views: 0, uniq: 0, pages: {}, langs: {}, regions: {}, devices: {}, refs: {}, chars: {}, guilds: {}, searches: {} };
  for (const [k, d] of Object.entries(days).sort()) {
    if (k < from || k > to) continue;
    out.days.push({ d: k, views: d.views ?? 0, uniq: d.uniq ?? 0 });
    out.views += d.views ?? 0; out.uniq += d.uniq ?? 0;
    for (const f of ['pages', 'langs', 'regions', 'devices', 'refs', 'chars', 'guilds', 'searches']) for (const [x, n] of Object.entries(d[f] ?? {})) add(out[f], x, n);
  }
  for (const f of ['refs', 'chars', 'guilds', 'searches']) out[f] = trim(out[f], 30);
  return out;
}

export function createAnalytics(stateDir) {
  mkdirSync(stateDir, { recursive: true });
  const file = join(stateDir, 'analytics.json'), jfile = join(stateDir, 'journal.json');
  let data = { days: {} }, journal = [];
  try { data = JSON.parse(readFileSync(file, 'utf8')); } catch { /* première fois */ }
  try { journal = JSON.parse(readFileSync(jfile, 'utf8')); } catch { /* première fois */ }
  let salt = { d: day(), v: randomBytes(16) }, seen = new Set(), dirty = false;
  function save() {
    if (!dirty) return;
    const cut = day(Date.now() - KEEP_DAYS * 864e5), jcut = Date.now() - JOURNAL_DAYS * 864e5;
    for (const k of Object.keys(data.days)) if (k < cut) delete data.days[k];
    for (const d of Object.values(data.days)) for (const f of ['refs', 'chars', 'guilds', 'searches']) if (d[f]) d[f] = trim(d[f]);
    journal = journal.filter(e => e.t >= jcut).slice(-JOURNAL_MAX);
    writeFileSync(file + '.tmp', JSON.stringify(data)); renameSync(file + '.tmp', file);
    writeFileSync(jfile + '.tmp', JSON.stringify(journal)); renameSync(jfile + '.tmp', jfile);
    dirty = false;
  }
  setInterval(save, 10 * 60e3).unref();
  process.on('SIGTERM', () => { try { save(); } catch { /* rien */ } process.exit(0); });
  return {
    hit(ip, ua, body) {
      const today = day();
      if (salt.d !== today) { salt = { d: today, v: randomBytes(16) }; seen = new Set(); }   // nouveau jour : nouveau sel, rien ne relie les jours
      const h = createHash('sha256').update(salt.v).update(String(ip)).update(String(ua).slice(0, 200)).digest('base64url').slice(0, 16);
      const isNew = !seen.has(h); if (isNew) seen.add(h);
      if (countHit(data.days[today] ??= {}, body ?? {}, isNew)) dirty = true;
    },
    log(type, who, detail = null) {
      journal.push({ t: Date.now(), type, who: who ? String(who).slice(0, 40) : null, ...(detail ? { detail: String(detail).slice(0, 200) } : {}) });
      if (journal.length > JOURNAL_MAX * 1.2) journal = journal.slice(-JOURNAL_MAX);
      dirty = true;
    },
    summary(n = 30) { return summarize(data.days, day(Date.now() - (n - 1) * 864e5), day()); },
    journal(limit = 300, type = null) { return journal.filter(e => !type || e.type === type).slice(-limit).reverse(); },
    save,
  };
}
