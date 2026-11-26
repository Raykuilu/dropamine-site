// api.dropamine.app — fonctions pures (testées sans réseau).

// Lien d'un personnage dans la réponse /profile/user/wow → identifiant « région/slug »
//   Forever (sans royaume) : …/profile/wow/character/ray-kuilu?namespace=profile-forever-eu
//   au cas où un royaume apparaîtrait : …/profile/wow/character/{royaume}/{nom} → on garde le nom
export function slugFromHref(href) {
  try {
    const u = new URL(href);
    const parts = u.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('character');
    if (i < 0) return null;
    const rest = parts.slice(i + 1).map(decodeURIComponent);
    if (rest.length === 1) return rest[0].toLowerCase();
    if (rest.length === 2) return rest[1].toLowerCase();
    return null;
  } catch { return null; }
}

// Réponse /profile/user/wow (une région) → personnages Forever du compte
export function charactersFromAccount(json, region) {
  const out = [];
  for (const acc of json?.wow_accounts ?? []) {
    for (const c of acc.characters ?? []) {
      const slug = c.slug ?? slugFromHref(c.character?.href ?? c.key?.href ?? '');
      if (!slug || !slug.includes('-')) continue;
      out.push({
        key: `${region}/${slug}`, region, slug,
        name: c.name ?? null, surname: c.surname ?? null, level: c.level ?? 0,
        classId: c.playable_class?.id ?? null, raceId: c.playable_race?.id ?? null,
        faction: c.faction?.type ?? null,
      });
    }
  }
  return out;
}

// Inscrire / retirer dans le registre (data/registry.json). Renvoie { registry, changed, done, refused }.
export function applyClaim(registry, keys, owner, allowed) {
  const reg = { ...registry, characters: [...(registry.characters ?? [])], owners: { ...(registry.owners ?? {}) } };
  const known = new Set(reg.characters.map(k => String(k).toLowerCase()));
  const done = [], refused = [];
  for (const key of keys) {
    const c = allowed.get(key);
    if (!c) { refused.push({ key, why: 'not-yours' }); continue; }
    if (c.level < 10) { refused.push({ key, why: 'level' }); continue; }
    if (!known.has(key)) { reg.characters.push(key); known.add(key); }
    reg.owners[key] = owner;
    if (reg.optout) reg.optout = reg.optout.filter(k => k !== key);
    done.push(key);
  }
  return { registry: reg, changed: done.length > 0, done, refused };
}
// Retirer = ne plus afficher du tout : désinscrit, et ajouté à optout (pour l'aperçu de guilde)
export function applyRelease(registry, keys, allowed) {
  const reg = { ...registry, characters: [...(registry.characters ?? [])], owners: { ...(registry.owners ?? {}) }, optout: [...(registry.optout ?? [])] };
  const done = [], refused = [];
  for (const key of keys) {
    if (!allowed.has(key)) { refused.push({ key, why: 'not-yours' }); continue; }   // seul le compte Battle.net du personnage peut le retirer
    const before = reg.characters.length, wasOut = reg.optout.includes(key);
    reg.characters = reg.characters.filter(k => String(k).toLowerCase() !== key);
    delete reg.owners[key];
    if (!wasOut) reg.optout.push(key);
    if (reg.characters.length !== before || !wasOut) done.push(key);
  }
  return { registry: reg, changed: done.length > 0, done, refused };
}

// Petits outils : cookies, identifiants valides
export function parseCookies(header) {
  const out = {};
  for (const part of String(header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
export const validKey = k => typeof k === 'string' && /^(eu|us|tw)\/[\p{L}\p{N}]+(-[\p{L}\p{N}]+)+$/u.test(k) && k.length <= 80;

// ---------------------------------------------------------------- ligne « /drop hiscores » (Dropamine 3.11+)
// DROPAMINE-HS1:n=Ray;l=36;r=eu;g=Everybody Knows;d=177;ws=278;w=136=176,54=102;p=393=223,129=208;v=3.11.0;t=…;c=xxxxxxxx
export const HS_PREFIX = 'DROPAMINE-HS1:';
export function hsChecksum(body) {          // même calcul que Hiscores.lua (octets UTF-8, modulo 2^32)
  let h = 5381;
  for (const b of Buffer.from(body, 'utf8')) h = (h * 33 + b) % 4294967296;
  return h.toString(16).padStart(8, '0');
}
const pairs = s => String(s ?? '').split(',').filter(Boolean).map(x => x.split('=')).filter(x => x.length === 2 && /^\d+$/.test(x[1]))
  .map(([id, rank]) => ({ id: /^\d+$/.test(id) ? +id : id, rank: +rank }));
// 3.11.1 : groupes facultatifs (chacun absent si décoché dans l'addon). Valeurs bornées, textes courts.
const num = (v, max = 1e9) => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= max ? n : null; };
const txt = (v, max = 48) => String(v ?? '').replace(/[^\p{L}\p{N} '\-\[\]()]/gu, '').trim().slice(0, max);
const tilde = v => String(v ?? '').split('~');
export function extras(f) {
  const o = {};
  if (f.ct) {                                   // collection log : total et donjons commencés
    const [x, y] = tilde(f.ct).map(v => num(v, 1e5));
    if (x != null && y && x <= y) {
      const dungeons = String(f.cl ?? '').split(',').filter(Boolean).slice(0, 80).map(p => {
        const [name, a, b] = tilde(p); return { name: txt(name), x: num(a, 1e4), y: num(b, 1e4) };
      }).filter(d => d.name && d.x != null && d.y && d.x <= d.y);
      o.collection = { x, y, dungeons };
    }
  }
  if (f.ac) {                                   // succès Dropamine
    const [n, total, ids] = tilde(f.ac);
    if (num(n, 999) != null && num(total, 999) && +n <= +total)
      o.achievements = { n: +n, total: +total, ids: String(ids ?? '').split('.').map(x => x.replace(/[^\w]/g, '').slice(0, 24)).filter(Boolean).slice(0, 200) };
  }
  if (f.rc) {                                   // records Dropamine
    const v = tilde(f.rc).map(x => num(x));
    if (v.length >= 7 && v.slice(0, 7).every(x => x != null)) {
      const [bestSession, bestHour, bestDay, longestCombo, sessions, goalsHit, playtime] = v;
      o.records = { bestSession, bestHour, bestDay, longestCombo, sessions, goalsHit, playtime };
    }
  }
  if (f.hu) {                                   // chasse : objets recherchés
    const hunt = String(f.hu).split(',').slice(0, 20).map(p => {
      const [id, name, tries, drops] = tilde(p); return { id: num(id, 1e7), name: txt(name), tries: num(tries, 1e6), drops: num(drops, 1e4) };
    }).filter(h => h.id && h.name && h.tries != null && h.drops != null);
    if (hunt.length) o.hunt = hunt;
  }
  if (f.pv) {                                   // JcJ : ce que l'armurerie n'a pas
    const v = tilde(f.pv).map(x => num(x));
    if (v.length >= 5 && v.slice(0, 5).every(x => x != null)) {
      const [hkWeek, honorWeek, honor, dkLife, highest, hkToday = 0, honorToday = 0] = v;
      o.pvp = { hkWeek, honorWeek, honor, dkLife, highest, hkToday: hkToday ?? 0, honorToday: honorToday ?? 0 };
    }
  }
  return o;
}
export function parseHiscoresLine(raw) {
  const s = String(raw ?? '').trim().replace(/\s*\n[\s\S]*$/, '');
  if (!s.startsWith(HS_PREFIX)) return { error: 'format' };
  const m = s.slice(HS_PREFIX.length).match(/^(.*);c=([0-9a-f]{8})$/);
  if (!m) return { error: 'format' };
  if (hsChecksum(m[1]) !== m[2]) return { error: 'checksum' };
  const f = {};
  for (const part of m[1].split(';')) { const i = part.indexOf('='); if (i > 0) f[part.slice(0, i)] = part.slice(i + 1); }
  const level = +f.l, weapons = pairs(f.w);
  if (!f.n || !(level >= 1 && level <= 60) || !['eu', 'us', 'tw', 'kr', 'cn'].includes(f.r)) return { error: 'format' };
  if (weapons.some(w => w.rank > 5 * level)) return { error: 'values' };
  return { name: f.n, level, region: f.r, guild: f.g || null, defense: +f.d || 0,
    weapons: weapons.reduce((a, w) => a + w.rank, 0), weaponList: weapons, professions: pairs(f.p), version: f.v || null, time: +f.t || 0,
    // /played (Dropamine 3.11.1+, facultatif) : secondes, plafonné à 10 ans
    played: /^\d+$/.test(f.tp ?? '') && +f.tp > 0 && +f.tp < 315360000 ? +f.tp : null,
    ...extras(f) };
}
// À quel personnage du compte connecté appartient la ligne ? (même région, même prénom ; niveau pour départager)
export function matchUpload(parsed, characters) {
  const same = [...characters.values()].filter(c => c.region === parsed.region && String(c.name ?? '').toLowerCase() === parsed.name.toLowerCase());
  if (same.length === 1) return same[0];
  const byLevel = same.filter(c => c.level === parsed.level);
  return byLevel.length === 1 ? byLevel[0] : null;
}
