// Statistiques de tout le serveur, calculées à partir du relevé (fiches légères de crawl.mjs).
// Une seule passe sur les personnages, par région ; le résultat est petit (quelques Ko) et mis en cache par le serveur.
export const LEVEL_BRACKETS = [[10, 19], [20, 29], [30, 39], [40, 49], [50, 59], [60, 60]];
export const PRIMARY_PROFS = [164, 165, 171, 182, 186, 197, 202, 333, 393];
export const DUEL_MIN = 20;        // duels minimum pour compter un personnage dans les taux de victoire
const TOP = 10;

const add = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const ratio = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 1000 : null);
const mean = (s, n) => (n > 0 ? Math.round((s / n) * 10) / 10 : null);
const who = p => ({ key: p.key, name: p.name, surname: p.surname, classId: p.classId, level: p.level, guild: p.guild?.name ?? null });

function pushTop(list, p, v) {                          // garde les TOP plus grandes valeurs
  if (!(v > 0)) return;
  if (list.length < TOP) { list.push({ ...who(p), v }); list.sort((a, b) => b.v - a.v); return; }
  if (v > list[list.length - 1].v) { list[list.length - 1] = { ...who(p), v }; list.sort((a, b) => b.v - a.v); }
}

export function computeStats(players, region) {
  const ps = players.filter(p => (p.region || 'eu') === region && p.level >= 10);
  const out = {
    region, n: ps.length, lvl60: 0, at: new Date().toISOString(),
    rulesets: {}, factions: {}, genders: {}, levels: LEVEL_BRACKETS.map(([a, b]) => ({ a, b, n: 0 })),
    classes: {}, races: {}, profs: {}, profPairs: {}, guilds: { n: 0, top: [] },
    pve60: { n: 0, quests: 0, deaths: 0, kills: 0, dungeons: 0, flights: 0, fallDeaths: 0, bosses: 0 },
    pvp: { hk: 0, kb: 0, pvpDeaths: 0, duelsWon: 0, duelsLost: 0 },
    tops: { total: [], hk: [], killingBlows: [], duelsWon: [], quests: [], kills: [], deaths: [], flights: [], fish: [], dungeons: [] },
  };
  const guilds = new Map();
  for (const p of ps) {
    const st = p.stats ?? {}, c = p.classId ?? 0, l60 = p.level >= 60;
    if (l60) out.lvl60++;
    add(out.rulesets, p.rulesetId ?? 0); add(out.factions, p.faction ?? '?'); add(out.genders, p.gender ?? '?');
    const br = out.levels.find(x => p.level >= x.a && p.level <= x.b); if (br) br.n++;
    // classes : nombre, niveaux, total, par mode, JcJ et duels
    const k = out.classes[c] ??= { n: 0, lvl60: 0, level: 0, total: 0, rulesets: {}, factions: {}, hk: 0, kb: 0, pvpDeaths: 0, duelsWon: 0, duelsLost: 0, duelists: 0, deaths60: 0, n60: 0 };
    k.n++; k.level += p.level; k.total += p.total ?? 0; add(k.rulesets, p.rulesetId ?? 0); add(k.factions, p.faction ?? '?');
    if (l60) { k.lvl60++; k.n60++; k.deaths60 += st.deaths ?? 0; }
    k.hk += st.hk ?? 0; k.kb += st.killingBlows ?? 0; k.pvpDeaths += st.pvpDeaths ?? 0;
    const dw = st.duelsWon ?? 0, dl = st.duelsLost ?? 0;
    if (dw + dl >= DUEL_MIN) { k.duelsWon += dw; k.duelsLost += dl; k.duelists++; }
    // races
    const r = out.races[p.raceId ?? 0] ??= { n: 0, faction: p.faction ?? '?', classes: {} };
    r.n++; add(r.classes, c);
    // métiers : qui les a, combien au maximum (300), moyenne ; paires de métiers principaux
    const prim = [];
    for (const pr of p.professions ?? []) {
      const m = out.profs[pr.id] ??= { n: 0, max: 0, skill: 0 };
      m.n++; m.skill += pr.skill ?? 0; if ((pr.skill ?? 0) >= 300) m.max++;
      if (PRIMARY_PROFS.includes(pr.id)) prim.push(pr.id);
    }
    if (prim.length === 2) add(out.profPairs, prim.sort((a, b) => a - b).join('+'));
    // JcJ et JcE
    out.pvp.hk += st.hk ?? 0; out.pvp.kb += st.killingBlows ?? 0; out.pvp.pvpDeaths += st.pvpDeaths ?? 0; out.pvp.duelsWon += dw; out.pvp.duelsLost += dl;
    if (l60) { const e = out.pve60; e.n++; for (const f of ['quests', 'deaths', 'kills', 'dungeons', 'flights', 'fallDeaths', 'bosses']) e[f] += st[f] ?? 0; }
    // guildes
    if (p.guild?.slug) { const g = guilds.get(p.guild.slug) ?? { name: p.guild.name, n: 0, lvl60: 0, total: 0 }; g.n++; if (l60) g.lvl60++; g.total += p.total ?? 0; guilds.set(p.guild.slug, g); }
    // records
    pushTop(out.tops.total, p, p.total); pushTop(out.tops.hk, p, st.hk); pushTop(out.tops.killingBlows, p, st.killingBlows);
    pushTop(out.tops.duelsWon, p, dw); pushTop(out.tops.quests, p, st.quests); pushTop(out.tops.kills, p, st.kills);
    pushTop(out.tops.deaths, p, st.deaths); pushTop(out.tops.flights, p, st.flights); pushTop(out.tops.fish, p, st.fish); pushTop(out.tops.dungeons, p, st.dungeons);
  }
  // moyennes et taux, en tableaux triés (plus simples à dessiner)
  out.classes = Object.entries(out.classes).map(([id, k]) => ({
    id: +id, n: k.n, share: ratio(k.n, out.n), lvl60: k.lvl60, avgLevel: mean(k.level, k.n), avgTotal: mean(k.total, k.n),
    rulesets: k.rulesets, factions: k.factions, hk: k.hk, hkPer: mean(k.hk, k.n), kd: ratio(k.hk, k.pvpDeaths),   // victoires honorables par mort en JcJ (les « coups fatals » comptent aussi les monstres)
    duelRate: ratio(k.duelsWon, k.duelsWon + k.duelsLost), duels: k.duelsWon + k.duelsLost, duelists: k.duelists, deaths60: mean(k.deaths60, k.n60),
  })).sort((a, b) => b.n - a.n);
  out.races = Object.entries(out.races).map(([id, r]) => ({ id: +id, n: r.n, share: ratio(r.n, out.n), faction: r.faction, classes: r.classes })).sort((a, b) => b.n - a.n);
  out.profs = Object.entries(out.profs).map(([id, m]) => ({ id: +id, n: m.n, share: ratio(m.n, out.n), max: m.max, avg: mean(m.skill, m.n) })).sort((a, b) => b.n - a.n);
  out.profPairs = Object.entries(out.profPairs).map(([k, n]) => ({ ids: k.split('+').map(Number), n })).sort((a, b) => b.n - a.n).slice(0, TOP);
  const e = out.pve60; out.pve60 = { n: e.n, ...Object.fromEntries(['quests', 'deaths', 'kills', 'dungeons', 'flights', 'fallDeaths', 'bosses'].map(f => [f, mean(e[f], e.n)])) };
  out.pvp.kd = ratio(out.pvp.hk, out.pvp.pvpDeaths); out.pvp.duelRate = ratio(out.pvp.duelsWon, out.pvp.duelsWon + out.pvp.duelsLost);
  out.guilds = { n: guilds.size, top: [...guilds.values()].sort((a, b) => b.n - a.n).slice(0, TOP).map(g => ({ ...g, avgTotal: mean(g.total, g.n) })) };
  return out;
}
