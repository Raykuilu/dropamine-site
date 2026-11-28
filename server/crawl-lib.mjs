// Relevé continu de tout le serveur (fonctions pures, testées dans crawl-lib.test.mjs).
// Le moteur (base SQLite, appels Blizzard, boucle) est dans crawl.mjs.
import { score, pickStats, skillSnapshot } from '../scripts/build.mjs';

export const DAY = 864e5;
export const CRAWL = {
  RATE: 5,              // appels Blizzard par seconde (≈ 18 000 / h) : loin de la limite Blizzard (36 000 / h) ; 28/11 : 9/s a mené à un blocage
  RATE_MAX: 6,          // plafond du réglage admin (≈ 21 600 / h, le plafond horaire ci-dessous coupe de toute façon à 20 000)
  CALLS_CHAR: 5,        // profil, métiers, équipement, statistiques, statistiques de hauts faits
  MIN_LEVEL: 10,        // l'armurerie ne montre rien en dessous
  REFRESH_ACTIVE: 1,    // jours entre deux relectures d'un personnage actif
  REFRESH_IDLE: 7,      // … d'un personnage qui ne bouge plus
  ACTIVE_DAYS: 14,      // « actif » : a progressé ces 14 derniers jours
  ROSTER_DAYS: 3,       // jours entre deux lectures de la liste d'une guilde
  KEEP_DAYS: 30,        // conditions Blizzard : rien de plus vieux que 30 jours
  GONE_RETRY: 30,       // un personnage introuvable n'est retenté qu'après 30 jours
};
export const SRC_PRIO = { reg: 0, scout: 1, follow: 2, site: 3, guild: 4 };
export const dayOf = (t = Date.now()) => Math.floor(t / DAY);
export const isoDay = d => new Date(d * DAY).toISOString().slice(0, 10);

// clé « région/slug » valide (le slug Forever est « prénom-nom »)
export const charKey = (region, slug) => `${region}/${String(slug).toLowerCase()}`;
// « Prénom Nom » tapé dans la recherche → slug de l'armurerie Forever (« prénom-nom », accents gardés) ; null si ce n'est pas un nom complet
export function lookupSlug(text) {
  const w = String(text ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (w.length !== 2 || !w.every(x => /^\p{L}{2,16}$/u.test(x))) return null;
  return w.join('-');
}
export const validCharKey = k => typeof k === 'string' && /^(eu|us|tw)\/[^/\s]+-[^/\s]+$/.test(k) && k.length <= 80;

// prochain passage d'un personnage déjà lu : souvent s'il bouge, une fois par semaine sinon (toujours bien avant 30 jours)
export function nextVisit(today, activeDay, first = false) {
  if (first) return today + CRAWL.REFRESH_ACTIVE;
  const active = activeDay != null && today - activeDay <= CRAWL.ACTIVE_DAYS;
  return today + (active ? CRAWL.REFRESH_ACTIVE : CRAWL.REFRESH_IDLE);
}

// liste d'une guilde → personnages à découvrir (niveau 10+)
export function rosterMembers(region, roster) {
  const gname = roster?.guild?.name ?? null, gfaction = roster?.guild?.faction?.type ?? null;
  return (roster?.members ?? []).map(m => m.character)
    .filter(c => c?.slug && (c.level ?? 0) >= CRAWL.MIN_LEVEL)
    .map(c => ({ key: charKey(region, c.slug), level: c.level, name: c.name ?? null, surname: c.surname ?? null,
      cls: c.playable_class?.id ?? null, race: c.playable_race?.id ?? null, faction: c.faction?.type ?? gfaction, gname }));
}

// fiche légère d'un personnage (même calcul que la mise à jour du site, sans réputations, rendu 3D ni équipement détaillé)
export function crawlPlayer(region, slug, c) {
  const s = score(c, null);
  const p = c.profile;
  const { gear, ...rest } = s;
  const stats = pickStats(c.achStats);
  return {
    key: charKey(region, slug), region, slug: String(slug).toLowerCase(), name: p.name, surname: p.surname,
    class: p.character_class?.name, classId: p.character_class?.id ?? null, race: p.race?.name, raceId: p.race?.id ?? null,
    gender: p.gender?.type ?? null, faction: p.faction?.type,
    guild: p.guild ? { name: p.guild.name, slug: p.guild.slug } : null,
    ruleset: p.ruleset?.name ?? null, rulesetId: p.ruleset?.id ?? null,
    ...rest, stats, preview: true, via: 'crawl',
  };
}

// point d'historique du jour (même format que data/history) et « a-t-il progressé ? »
export function histPoint(player) {
  const s = skillSnapshot(player);
  return { t: player.total, s, ...(player.stats?.hk != null ? { hk: player.stats.hk } : {}) };
}
export function moved(prev, cur) {
  if (!prev) return false;                                   // premier passage : rien à comparer
  return prev.t !== cur.t || (prev.hk ?? 0) !== (cur.hk ?? 0) || JSON.stringify(prev.s) !== JSON.stringify(cur.s);
}

// file de découverte : d'abord les sources sûres (Scout, guildes suivies), puis les plus hauts niveaux
export function discoverOrder(a, b) {
  return (SRC_PRIO[a.src] ?? 9) - (SRC_PRIO[b.src] ?? 9) || (b.level ?? 0) - (a.level ?? 0) || a.key.localeCompare(b.key);
}

// Régulateur du débit, recalculé chaque minute (comme la difficulté de Bitcoin, en très simple) :
// un refus de Blizzard divise le débit par deux, chaque minute sans refus le remonte d'un demi-cran jusqu'au réglage ;
// au-delà de HOUR_CAP appels sur l'heure glissante, le relevé de fond s'arrête (les visiteurs gardent leur marge jusqu'à HOUR_MAX).
export const HOUR_CAP = 20000, HOUR_MAX = 22000;   // 28/11 : large marge sous les 36 000 / h de Blizzard
export const slowDown = rate => Math.max(1, rate / 2);
export const speedUp = (rate, target, since429) => (since429 > 60e3 && rate < target ? Math.min(target, rate + 0.5) : Math.min(rate, target));
export function regMode({ rate, target, hourCalls, manualLastMin }) {
  if (hourCalls >= HOUR_CAP) return 'pause';
  if (rate < target) return 'ralenti';
  if (manualLastMin > rate * 60 * 0.2) return 'afflux';
  return 'normal';
}

// estimations pour l'admin : débit réel et temps restant pour découvrir ce qui attend
export function crawlEta(waiting, callsPerHour, callsPerChar = CRAWL.CALLS_CHAR) {
  const perHour = callsPerHour / callsPerChar;
  return perHour > 0 ? Math.ceil(waiting / perHour) : null;   // en heures
}

// Disjoncteur (28/11, blocage Blizzard) : après THRESHOLD échecs d'affilée (403, 5xx, réseau, jeton refusé), plus aucun
// appel pendant 15 min, puis UN seul essai ; s'il échoue, la pause double (jusqu'à 2 h). Un succès remet tout à zéro.
// `blocked` : Blizzard refuse en 403 (adresse ou clé bloquée) — c'est ce qu'on surveille pour l'alerte de déblocage.
export function makeBreaker({ threshold = 20, base = 15 * 60e3, max = 2 * 3600e3 } = {}) {
  const b = { fails: 0, trips: 0, until: 0, blocked: false, blockedSince: null, probing: false };
  b.allow = (now = Date.now()) => {
    if (now < b.until) return false;
    if (b.fails >= threshold) { if (b.probing) return false; b.probing = true; }   // demi-ouvert : un seul essai à la fois
    return true;
  };
  b.ok = () => { b.fails = 0; b.trips = 0; b.until = 0; b.probing = false; b.blocked = false; b.blockedSince = null; };
  b.fail = (status, now = Date.now()) => {
    b.fails++; b.probing = false;
    if (status === 403 && !b.blocked) { b.blocked = true; b.blockedSince = now; }
    if (b.fails >= threshold) { b.trips++; b.until = now + Math.min(max, base * 2 ** (b.trips - 1)); return true; }   // disjoncte
    return false;
  };
  b.state = (now = Date.now()) => ({ open: now < b.until, until: b.until > now ? new Date(b.until).toISOString() : null, fails: b.fails, trips: b.trips,
    blocked: b.blocked, blockedSince: b.blockedSince ? new Date(b.blockedSince).toISOString() : null });
  return b;
}
