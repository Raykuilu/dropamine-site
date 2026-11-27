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
// Dropamine 3.13+ : une seule famille de codes « DROP:<type><version>: » ; même contenu, même somme de contrôle
export const HS_PREFIXES = ['DROP:HS2:', HS_PREFIX];
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

// Scout : outil privé de l'administrateur (addon non publié). Ligne DROP:SCOUT1:r=eu;t=…;p=nom~niveau~classe~guilde~source~jour~donjon,…
// « nom » = « Prénom Nom » (Forever) : c'est ce que l'armurerie connaît. Sources : g groupe, u guilde, w /who, x croisé.
export const SCOUT_KEEP_DAYS = 30, SCOUT_MAX = 5000;
const SCOUT_RANK = { g: 4, u: 3, w: 2, x: 1 };
export const scoutSlug = name => String(name ?? '').toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
export function parseScoutLine(line) {
  const m = String(line ?? '').trim().match(/^DROP:SCOUT1:([\s\S]+)$/);
  if (!m) return { error: 'format' };
  const f = {};
  for (const part of m[1].split(';')) { const i = part.indexOf('='); if (i > 0) f[part.slice(0, i)] = part.slice(i + 1); }
  if (!['eu', 'us', 'tw'].includes(f.r)) return { error: 'region' };
  const players = String(f.p ?? '').split(',').slice(0, SCOUT_MAX).map(p => {
    const [name, l, c, g, s, d, dun] = p.split('~'), n = txt(name, 48);
    if (!n || !n.includes(' ')) return null;   // prénom seul (ancienne version de Scout) : introuvable dans l'armurerie
    return { name: n, level: num(l, 100) ?? 0, cls: String(c ?? '').replace(/[^A-Z]/g, '').slice(0, 12), guild: txt(g, 48),
      src: SCOUT_RANK[s] ? s : 'x', day: num(d, 1e6), dun: txt(dun, 60) };
  }).filter(Boolean);
  return { region: f.r, players };
}
// Admin : réglages du remplissage (data/settings.json) et guildes suivies (data/guilds.json)
export const SETTINGS_RANGE = { newPerRun: [0, 500], maxPreviews: [0, 10000] };
export function applySettings(cur, body) {
  const out = { ...(cur ?? {}) };
  for (const [k, [lo, hi]] of Object.entries(SETTINGS_RANGE)) {
    if (body?.[k] == null || body[k] === '') continue;
    const n = Number(body[k]);
    if (!Number.isInteger(n) || n < lo || n > hi) return { error: k };
    out[k] = n;
  }
  return { registry: out, changed: JSON.stringify(out) !== JSON.stringify(cur ?? {}) };
}
// Vidage automatique de la file : le serveur relance la mise à jour toutes les heures tant qu'il reste
// des personnages en attente (GitHub saute la plupart de ses lancements à heure fixe).
// queue = data/queue.json, settings = data/settings.json, lastRun = dernier lancement { at, done }.
export const AUTO_RUN_GAP = 55 * 60e3;
export function queueDue(queue, settings, lastRun, now = Date.now()) {
  if (lastRun && !lastRun.done) return false;                                   // une mise à jour tourne déjà
  if (lastRun && now - lastRun.at < AUTO_RUN_GAP) return false;                 // une par heure au plus
  if (!Object.keys(queue?.players ?? {}).length) return false;                  // file vide
  if ((settings?.newPerRun ?? 1) === 0) return false;                           // remplissage coupé dans l'admin
  const last = queue?.runs?.[0], cap = settings?.maxPreviews ?? 3000;
  if (last && last.kept + last.fresh >= cap) return false;                      // plafond d'aperçus atteint
  return true;
}
export function applyGuildFollow(data, key, follow) {
  key = String(key ?? '').toLowerCase().trim();
  if (!/^(eu|us|tw)\/[\p{L}\p{N}-]{2,60}$/u.test(key)) return { error: 'guild' };
  const list = [...new Set((data?.guilds ?? []).map(g => String(g).toLowerCase()))];
  const has = list.includes(key);
  if (follow === has) return { registry: data, changed: false };
  const guilds = follow ? [...list, key] : list.filter(g => g !== key);
  return { registry: { ...(data ?? {}), guilds }, changed: true };
}
export function applyScout(data, region, players, now = Date.now()) {
  const day = Math.floor(now / 864e5), cut = day - SCOUT_KEEP_DAYS;
  const list = { ...(data?.players ?? {}) };
  let added = 0;
  for (const p of players) {
    const slug = scoutSlug(p.name);
    if (!slug.includes('-')) continue;
    const key = `${region}/${slug}`, cur = list[key];
    if (!cur) added++;
    list[key] = {
      l: Math.max(p.level || 0, cur?.l ?? 0),
      ...((p.cls || cur?.c) ? { c: p.cls || cur.c } : {}),
      ...((p.guild || cur?.g) ? { g: p.guild || cur.g } : {}),
      s: (SCOUT_RANK[p.src] ?? 0) >= (SCOUT_RANK[cur?.s] ?? 0) ? p.src : cur.s,
      d: Math.max(Math.min(day, p.day ?? day), cur?.d ?? 0),
      ...((p.dun || cur?.dun) ? { dun: p.dun || cur.dun } : {}),
    };
  }
  for (const [k, v] of Object.entries(list)) if ((v.d ?? 0) < cut) delete list[k];   // règle Blizzard : 30 jours au plus
  const out = { _comment: 'Joueurs repérés en jeu par l\'administrateur (Dropamine Scout) : montrés en aperçu (niveau 10+), oubliés après 30 jours sans être revus.', players: list };
  return { registry: out, changed: JSON.stringify(out) !== JSON.stringify(data), added, total: Object.keys(list).length };
}
const tilde = v => String(v ?? '').split('~');
export function extras(f) {
  const o = {};
  if (f.ct) {                                   // collection log : total et donjons commencés
    const [x, y] = tilde(f.ct).map(v => num(v, 1e5));
    if (x != null && y && x <= y) {
      const dungeons = String(f.cl ?? '').split(',').filter(Boolean).slice(0, 80).map(p => {
        const [name, a, b] = tilde(p); return { name: txt(name), x: num(a, 1e4), y: num(b, 1e4) };
      }).filter(d => d.name && d.x != null && d.y && d.x <= d.y);
      // objets obtenus (Dropamine 3.11.1+) : identifiants en base 36 séparés par des points, 3 000 au plus
      const items = [...new Set(String(f.ci ?? '').split('.').filter(v => /^[0-9a-z]{1,6}$/.test(v)).map(v => parseInt(v, 36)))]
        .filter(id => id > 0 && id < 1e7).slice(0, 3000).sort((a, b) => a - b);
      o.collection = { x, y, dungeons, ...(items.length ? { items } : {}) };
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
    // Dropamine 3.12.0+ : numéro~essais~drops (codes seuls, le site met le nom) ; avant : numéro~nom~essais~drops
    const hunt = String(f.hu).split(',').slice(0, 20).map(p => {
      const v = tilde(p), [id, name, tries, drops] = v.length === 3 ? [v[0], '', v[1], v[2]] : v;
      return { id: num(id, 1e7), name: txt(name), tries: num(tries, 1e6), drops: num(drops, 1e4) };
    }).filter(h => h.id && h.tries != null && h.drops != null);
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
  const pre = HS_PREFIXES.find(x => s.startsWith(x));
  if (!pre) return { error: 'format' };
  const m = s.slice(pre.length).match(/^(.*);c=([0-9a-f]{8})$/);
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
    // Dropamine 3.13+ : langue du client (frFR, enUS…) : les noms des objets propres à Forever arrivent dans cette langue
    lc: /^[a-z]{2}[A-Z]{2}$/.test(f.lc ?? '') ? f.lc : null,
    ...extras(f) };
}
// À quel personnage du compte connecté appartient la ligne ? (même région, même prénom ; niveau pour départager)
export function matchUpload(parsed, characters) {
  const same = [...characters.values()].filter(c => c.region === parsed.region && String(c.name ?? '').toLowerCase() === parsed.name.toLowerCase());
  if (same.length === 1) return same[0];
  const byLevel = same.filter(c => c.level === parsed.level);
  return byLevel.length === 1 ? byLevel[0] : null;
}

// ---------------------------------------------------------------- runs de donjon (data/runs.json)
// { runs: [{ id, dungeon, at (ISO), note, by (clé du créateur), owner (compte), created, members: [{ key, role, owner }] }] }
export const RUN_ROLES = ['tank', 'heal', 'dps'];
const RUN_KEEP_MS = 3 * 3600e3;                       // un run reste visible 3 h après son heure
export function pruneRuns(data, now = Date.now()) {
  const runs = (data?.runs ?? []).filter(r => Date.parse(r.at) + RUN_KEEP_MS > now);
  return { runs, changed: runs.length !== (data?.runs ?? []).length };
}
export function publicRuns(data, now = Date.now()) {   // ce que le site affiche : sans les comptes
  return pruneRuns(data, now).runs.map(({ owner, members, ...r }) => ({ ...r, members: members.map(({ owner: _, ...m }) => m) }))
    .sort((a, b) => a.at.localeCompare(b.at));
}
const cleanNote = s => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 140);
export function applyRunCreate(data, input, owner, characters, dungeons, now = Date.now()) {
  const { runs } = pruneRuns(data, now);
  const key = String(input.key ?? '').toLowerCase(), c = characters.get(key);
  if (!c) return { error: 'not-yours' };
  if (!dungeons.has(String(input.dungeon))) return { error: 'dungeon' };
  const at = Date.parse(input.at);
  if (!Number.isFinite(at) || at < now - 15 * 60e3 || at > now + 30 * 864e5) return { error: 'date' };
  if (runs.filter(r => r.owner === owner).length >= 5) return { error: 'too-many' };
  if (runs.length >= 1000) return { error: 'full' };
  const role = RUN_ROLES.includes(input.role) ? input.role : 'dps';
  const run = { id: Math.floor(now).toString(36) + Math.random().toString(36).slice(2, 6), dungeon: String(input.dungeon), at: new Date(at).toISOString(),
    note: cleanNote(input.note), by: key, owner, created: new Date(now).toISOString(), members: [{ key, role, owner }] };
  return { registry: { runs: [...runs, run] }, changed: true, run };
}
export function applyRunJoin(data, input, owner, characters, now = Date.now()) {
  const { runs } = pruneRuns(data, now);
  const key = String(input.key ?? '').toLowerCase();
  if (!characters.get(key)) return { error: 'not-yours' };
  const run = runs.find(r => r.id === input.id);
  if (!run) return { error: 'gone' };
  if (run.members.some(m => m.owner === owner && m.key !== key)) return { error: 'already' };   // un personnage par compte
  const role = RUN_ROLES.includes(input.role) ? input.role : 'dps';
  const members = run.members.filter(m => m.key !== key);
  if (members.length >= 40) return { error: 'full' };
  const upd = { ...run, members: [...members, { key, role, owner }] };
  return { registry: { runs: runs.map(r => r === run ? upd : r) }, changed: true, run: upd };
}
export function applyRunLeave(data, input, owner, now = Date.now()) {
  const { runs } = pruneRuns(data, now);
  const run = runs.find(r => r.id === input.id);
  if (!run) return { error: 'gone' };
  if (run.owner === owner) return { registry: { runs: runs.filter(r => r !== run) }, changed: true, cancelled: true };   // le créateur annule
  const members = run.members.filter(m => m.owner !== owner);
  if (members.length === run.members.length) return { registry: { runs }, changed: false };
  return { registry: { runs: runs.map(r => r === run ? { ...run, members } : r) }, changed: true };
}
// l'organisateur modifie la date, l'heure, la note ou le donjon ; un inscrit change son rôle avec /runs/join (même personnage)
export function applyRunEdit(data, input, owner, dungeons, now = Date.now()) {
  const { runs } = pruneRuns(data, now);
  const run = runs.find(r => r.id === input.id);
  if (!run) return { error: 'gone' };
  if (run.owner !== owner) return { error: 'not-yours' };
  const upd = { ...run };
  if (input.at != null) {
    const at = Date.parse(input.at);
    if (!Number.isFinite(at) || at < now - 15 * 60e3 || at > now + 30 * 864e5) return { error: 'date' };
    upd.at = new Date(at).toISOString();
  }
  if (input.note != null) upd.note = cleanNote(input.note);
  if (input.dungeon != null) { if (!dungeons.has(String(input.dungeon))) return { error: 'dungeon' }; upd.dungeon = String(input.dungeon); }
  upd.edited = new Date(now).toISOString();
  return { registry: { runs: runs.map(r => r === run ? upd : r) }, changed: true, run: upd };
}

// ---------------------------------------------------------------- liste d'objets recherchés modifiée sur le site (data/uploads.json)
// Le joueur coche ou retire des objets sur sa fiche : la liste est enregistrée tout de suite (huntSite = date) et visible des autres.
// Les essais et les drops déjà comptés par l'addon sont gardés ; une nouvelle ligne /drop hiscores avec sa chasse remplace tout (le jeu reste maître).
export const HUNT_MAX = 20;
export function applyHuntEdit(uploads, key, items, today = new Date().toISOString().slice(0, 10)) {
  if (!Array.isArray(items)) return { error: 'items' };
  const seen = new Set(), clean = [];
  for (const x of items) {
    const id = num(x?.id, 1e7), name = txt(x?.name, 80);
    if (!id || seen.has(id)) continue;
    seen.add(id); clean.push({ id, name });
  }
  if (clean.length > HUNT_MAX) return { error: 'full' };
  const cur = uploads[key] ?? {}, prev = new Map((cur.hunt ?? []).map(h => [h.id, h]));
  const hunt = clean.map(({ id, name }) => prev.get(id) ?? { id, name: name || '#' + id, tries: 0, drops: 0 });
  const entry = { ...cur, hunt, huntSite: today };
  if (!hunt.length) delete entry.hunt;
  const changed = JSON.stringify(cur.hunt ?? []) !== JSON.stringify(hunt) || cur.huntSite !== today;
  return { registry: { ...uploads, [key]: entry }, changed, hunt };
}
// nouvelle ligne du jeu sans chasse (case décochée) : la liste faite sur le site reste
export function keepSiteHunt(entry, prev) {
  if (entry.hunt || !prev?.huntSite || !prev.hunt) return entry;
  return { ...entry, hunt: prev.hunt, huntSite: prev.huntSite };
}
