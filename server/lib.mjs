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
    done.push(key);
  }
  return { registry: reg, changed: done.length > 0, done, refused };
}
export function applyRelease(registry, keys, allowed) {
  const reg = { ...registry, characters: [...(registry.characters ?? [])], owners: { ...(registry.owners ?? {}) } };
  const done = [], refused = [];
  for (const key of keys) {
    if (!allowed.has(key)) { refused.push({ key, why: 'not-yours' }); continue; }   // seul le compte Battle.net du personnage peut le retirer
    const before = reg.characters.length;
    reg.characters = reg.characters.filter(k => String(k).toLowerCase() !== key);
    delete reg.owners[key];
    if (reg.characters.length !== before) done.push(key);
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
