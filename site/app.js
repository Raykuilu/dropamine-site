// Dropamine — site : vitrine + Hiscores, en anglais et en français. Aucune dépendance.
'use strict';
const SHOT = location.search.includes('shot');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || SHOT;
if (SHOT) document.documentElement.classList.add('static');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ======================================================================
   Langue : le texte fixe est en double dans la page (lang="en" / lang="fr"),
   le texte calculé passe par t(). Choix gardé dans le navigateur.
   ====================================================================== */
let LANG = document.documentElement.dataset.lang === 'fr' ? 'fr' : 'en';
const I18N = {
  'tab.rank': ['Hiscores', 'Classements'], 'tab.char': ['Character', 'Personnage'], 'tab.mine': ['My character', 'Mon personnage'], 'acct.in': ['Sign in', 'Se connecter'], 'acct.out': ['Sign out', 'Se déconnecter'],
  myChars: ['My characters', 'Mes personnages'],
  youHere: ['YOU', 'TOI'],
  pulseDl: ['{n} downloads', '{n} téléchargements'], pulseChars: ['{n} characters tracked', '{n} personnages suivis'], pulseGuilds: ['{n} guild{s}', '{n} guilde{s}'],
  pulseToday: ['updated today at {h}', "mis à jour aujourd'hui à {h}"], pulseOn: ['updated {d}', 'mis à jour le {d}'],
  tipSpare: ['Not in the total: as in the addon, only the weapon in hand and your class’s second skill count', "Hors total : comme dans l'addon, seules l'arme en main et la 2e compétence de ta classe comptent"],
  moreW: ['+ {n} other weapon skill{s}', '+ {n} autre{s} compétence{s} d’arme'], lessW: ['Only weapons in use', 'Seulement les armes utilisées'],
  viewT: ['Display', 'Affichage'], viewList: ['List', 'Liste'], viewGrid: ['Grid, as in the addon', "Grille, comme dans l'addon"],
  share: ['Share', 'Partager'], close: ['Close', 'Fermer'],
  hsBtn: ['Hiscores image', 'Image Hiscores'], hsDl: ['Download PNG', 'Télécharger PNG'], hsCopy: ['Copy image', "Copier l'image"], hsCopied: ['Copied', 'Copiée'], hsNoCopy: ['Copy not allowed here', 'Copie impossible ici'],
  hsSkill: ['Skill', 'Compétence'], hsRank: ['Rank', 'Rang'], hsLevel: ['Level', 'Niveau'], hsWeek: ['7 days', '7 jours'], copied: ['Link copied', 'Lien copié'],
  gainsT: ['TODAY’S +1', 'LES +1 DU JOUR'], gainsNone: ['', ''],
  splitT: ['Split', 'Répartition'], bestByProf: ['Best by profession', 'Meilleurs par métier'], sinceY: ['since yesterday', 'depuis hier'],
  estSep: ['ESTIMATED · NOT RANKED UNTIL THE DROPAMINE LINE IS SENT', 'ESTIMÉS · SANS RANG JUSQU’À L’ENVOI DE LA LIGNE DROPAMINE'],
  skillsT: ['Skills', 'Compétences'], statsT: ['Armory statistics', "Statistiques de l'armurerie"],
  tilesEst: ['hatched tiles: weapons estimated, waiting for the Dropamine export', "tuiles hachurées : armes estimées, en attente de la ligne Dropamine"],
  tipRank: ['Rank {r} / {m}', 'Rang {r} / {m}'], tipPlace: ['{r} in the Hiscores', '{r} au classement'],
  tipEst: ['Estimated: equipped weapon counted at its maximum', 'Estimé : arme équipée comptée au maximum'], 'tab.guild': ['Guilds', 'Guildes'], 'tab.runs': ['Group hunt', 'Chasse en groupe'],
  runsT: ['Group hunt', 'Chasse en groupe'],
  runsPlanned: ['Planned outings', 'Sorties prévues'], runsNone: ['No outing planned yet: propose one below.', 'Aucune sortie prévue pour l’instant : propose-en une plus bas.'],
  runsApiDown: ['service unavailable', 'service indisponible'], runsIdeas: ['Worth running', 'À faire en groupe'],
  runsIdeasNote: ['who hunts what, and what the collection logs miss', 'qui chasse quoi, et ce qui manque aux collection logs'],
  runsMyLvl: ['At my level', 'À mon niveau'], runsInterested: ['interested', 'intéressés'], runsHuntersShort: ['hunting', 'en chasse'],
  runsExpShort: ['wanted items / outing', 'objets recherchés / sortie'], runsMissShort: ['missing in logs', 'manquants aux logs'],
  runsMissing: ['{n} missing', '{n} manquants'], runsGroup: ['Suggested group', 'Groupe suggéré'], runsNobody: ['nobody', 'personne'],
  fitOk: ['right level', 'bon niveau'], fitHigh: ['over level', 'au-dessus'],
  'role.tank': ['Tank', 'Tank'], 'role.heal': ['Healer', 'Soigneur'], 'role.dps': ['Damage', 'Dégâts'],
  runPropose: ['Propose an outing', 'Proposer une sortie'], runWhen: ['When', 'Quand'], runChar: ['Character', 'Personnage'], runRole: ['Role', 'Rôle'],
  runNote: ['Note', 'Note'], runNotePh: ['e.g. full clear, Pummeler farm', 'ex. : full clear, farm du Faucheur'], runCreate: ['Create the outing', 'Créer la sortie'],
  runJoin: ['Join', 'S’inscrire'], runIcsTitle: ['Group hunt: {d} (WoW Forever)', 'Chasse en groupe : {d} (WoW Forever)'], runMore: ['{n} more', '{n} de plus'], runWait: ['Waiting list ({n})', 'Liste d’attente ({n})'], runWaitN: ['{n} waiting', '{n} en attente'],
  runFullHint: ['Group complete: you will be on the waiting list.', 'Groupe complet : tu passeras en liste d’attente.'],
  runMoreRuns: ['Show {n} more outings', 'Voir {n} sorties de plus'], runMoreDun: ['Show {n} more dungeons', 'Voir {n} donjons de plus'],
  pfAll: ['All', 'Tous'], pfMine: ['My outings', 'Mes sorties'], pfOpen: ['Open spots', 'Places libres'], pfAllDun: ['All dungeons', 'Tous les donjons'],
  pfCount: ['{n} outings', '{n} sorties'], pfNone: ['No outing matches these filters.', 'Aucune sortie ne correspond à ces filtres.'],
  dayToday: ['Today', 'Aujourd’hui'], dayTomorrow: ['Tomorrow', 'Demain'], runEdit: ['Edit', 'Modifier'], runSave: ['Save', 'Enregistrer'], runDungeon: ['Dungeon', 'Donjon'],
  runSaved: ['Outing updated.', 'Sortie modifiée.'], runRoleChanged: ['Role changed.', 'Rôle changé.'], runEdited: ['edited', 'modifié'],
  runFull: ['Group complete', 'Groupe complet'], runCount: ['{n} signed up', '{n} inscrit(s)'],
  runCopy: ['Copy announcement', 'Copier l’annonce'], runLink: ['Copy link', 'Copier le lien'], runIcs: ['Add to calendar', 'Agenda'], runCopied: ['Copied ✓', 'Copié ✓'],
  runCancelQ: ['Cancel this outing for everyone?', 'Annuler cette sortie pour tout le monde ?'],
  runNow: ['in progress', 'en cours'], runInMin: ['in {n} min', 'dans {n} min'], runInH: ['in {n} h', 'dans {n} h'], runTomorrow: ['tomorrow', 'demain'], runInD: ['in {n} days', 'dans {n} jours'],
  runAnn: ['Outing {d} · {w} · {n} signed up', 'Sortie {d} · {w} · {n} inscrit(s)'], runLeave: ['Leave', 'Quitter'], runCancel: ['Cancel the outing', 'Annuler la sortie'], runOrg: ['organiser', 'organise'],
  runLogin: ['Sign in with Battle.net to join.', 'Connecte-toi avec Battle.net pour t’inscrire.'],
  runCreated: ['Outing created.', 'Sortie créée.'], runJoined: ['You joined the outing.', 'Tu es inscrit à la sortie.'], runLeft: ['You left the outing.', 'Tu as quitté la sortie.'], runCancelled: ['Outing cancelled.', 'Sortie annulée.'],
  'runErr.date': ['Pick a date within the next 30 days.', 'Choisis une date dans les 30 prochains jours.'], 'runErr.not-yours': ['This character is not on your account.', 'Ce personnage n’est pas sur ton compte.'],
  'runErr.already': ['One of your characters is already in this outing.', 'Un de tes personnages est déjà dans cette sortie.'], 'runErr.too-many': ['You already organise 5 outings.', 'Tu organises déjà 5 sorties.'],
  'runErr.gone': ['This outing no longer exists.', 'Cette sortie n’existe plus.'], 'runErr.full': ['Full.', 'Complet.'], 'runErr.dungeon': ['Unknown dungeon.', 'Donjon inconnu.'],
  'runErr.x': ['Something went wrong, try again.', 'Ça n’a pas marché, réessaie.'], runsNote: ['who hunts what, and where', 'qui chasse quoi, et où'],
  runsGuild: ['My guild', 'Ma guilde'], runsAll: ['All players', 'Tous les joueurs'], runsHunters: ['{n} hunters', '{n} chasseurs'], runsHunter1: ['1 hunter', '1 chasseur'],
  runsExp: ['≈ {n} wanted items per run', '≈ {n} objets recherchés par run'], runsLvl: ['level {a}–{b}', 'niveau {a}–{b}'], runsYou: ['you', 'toi'],
  runsLow: ['too low', 'trop bas'], runsTrash: ['trash', 'monstres'], runsEmptyT: ['No hunt shared yet', 'Aucune chasse partagée pour l’instant'],
  runsEmpty: ['In game, add items to your hunt list, type /drop hiscores (Hunt ticked) and paste the export on the Join page: your dungeons show up here.', 'En jeu, ajoute des objets à ta liste de chasse, tape /drop hiscores (case Chasse cochée) et colle la ligne sur la page Inscription : tes donjons apparaissent ici.'],
  runsNoGuild: ['Nobody in your guild shares a hunt yet: showing all players.', 'Personne de ta guilde ne partage sa chasse pour l’instant : tous les joueurs sont affichés.'],
  runsSrc: ['Loot tables: AtlasLoot Forever (GPL-2.0).', 'Tables de butin : AtlasLoot Forever (GPL-2.0).'],
  'tab.news': ["What's new", 'Nouveautés'], 'btn.download': ['Download', 'Télécharger'], 'search.ph': ['Find a character…', 'Chercher un personnage…'],
  'foot.addon': ['THE ADDON', "L'ADDON"], 'foot.join': ['Join or leave', "S'inscrire ou se retirer"], 'foot.privacy': ['Privacy', 'Confidentialité'], 'foot.code': ['Site source (open source, MIT)', 'Code du site (open source, MIT)'], 'foot.coffee': ['Buy me a coffee', "M'offrir un café"],
  total: ['Total level', 'Niveau total'], level: ['Level', 'Niveau'], defense: ['Defense', 'Défense'],
  'g.lvl': ['LEVEL', 'NIVEAU'], 'g.wpn': ['WEAPONS & DEFENSE', 'ARMES ET DÉFENSE'], 'g.prf': ['PROFESSIONS', 'MÉTIERS'], 'g.stat': ['STATISTICS', 'STATISTIQUES'], 'g.book': ['DROPAMINE LOGBOOK', 'CARNET DROPAMINE'],
  trust: ['Sent by the players with their Dropamine export: based on trust.', 'Envoyé par les joueurs avec leur ligne Dropamine : basé sur la confiance.'],
  sortBy: ['Rank by', 'Classer par'], trustShort: ['based on trust', 'basé sur la confiance'],
  kills: ['Creatures killed', 'Créatures tuées'], killingBlows: ['Killing blows', 'Coups fatals'], dungeons: ['Dungeons entered', 'Donjons visités'],
  pvpDeaths: ['Killed by players', 'Tué par des joueurs'], duels: ['Duels (won / lost)', 'Duels (gagnés / perdus)'],
  repsT: ['Reputations', 'Réputations'],
  dashHi: ['Hi {n}', 'Salut {n}'], dashSheet: ['My sheet', 'Ma fiche'], dashSend: ['Update my logbook', 'Mettre à jour mon carnet'], in7: ['in 7 days', 'en 7 jours'],
  dashNoLine: ['Your logbook is empty: type /drop hiscores in game and paste the export.', 'Ton carnet est vide : tape /drop hiscores en jeu et colle la ligne.'],
  dashOldLine: ['Your Dropamine export is {n} days old: paste it again to update collection log and hunt.', 'Ta ligne Dropamine date de {n} jours : renvoie-la pour mettre à jour collection log et chasse.'],
  dashRuns: ['My outings', 'Mes sorties'], dashNoRun: ['You are not in any outing yet.', 'Tu n’es inscrit à aucune sortie.'], dashOpenRuns: ['Open outings for you', 'Sorties ouvertes pour toi'],
  dashAllRuns: ['Group hunt →', 'Chasse en groupe →'], dashHunt: ['My hunt', 'Ma chasse'], dashNoHunt: ['Nothing to hunt: add items in the addon (Hunt tab).', 'Rien en chasse : ajoute des objets dans l’addon (onglet Chasse).'],
  dashAlso: ['{n} others hunt there', '{n} autres y chassent'], dashNear: ['Almost done', 'Presque finis'],
  dashNoLog: ['Paste your Dropamine export to see your collection log.', 'Envoie ta ligne Dropamine pour voir ton collection log.'],
  dashGuildRank: ['{r} of {n} in the guild', '{r} sur {n} dans la guilde'], dashGuild: ['Guild page →', 'Page de la guilde →'],
  dashNext: ['Next steps', 'Prochaines marches'], dashLeft: ['{n} to go', 'encore {n}'], dashAbout: ['About the addon', 'Découvrir l’addon'], install: ['Install the app', 'Installer l’app'],
  clogResend: ['Paste your /drop hiscores export again to see each item as an icon.', 'Renvoie ta ligne /drop hiscores pour voir chaque objet en icône.'],
  clogNone: ['No dungeon item obtained yet.', 'Aucun objet de donjon obtenu pour l’instant.'],
  clogSrc: ['Loot tables: AtlasLoot Forever (GPL-2.0) · items: Blizzard API.', 'Tables de butin : AtlasLoot Forever (GPL-2.0) · objets : API Blizzard.'],
  obtained: ['Obtained', 'Obtenu'], notObtained: ['Not obtained yet', 'Pas encore obtenu'], itemForever: ['Forever item', 'Objet propre à Forever'], advT: ['Adventure', 'Aventure'], pvpT: ['PvP', 'JcJ'],
  srcArm: ['Armory', 'Armurerie'], srcDecl: ['Dropamine · on trust', 'Dropamine · sur la confiance'],
  kd: ['K/D ratio', 'Ratio K/D'], kdHow: ['{k} honorable kills for {d} deaths to players', '{k} victoires honorables pour {d} morts face aux joueurs'],
  duelsT: ['Duels won – lost', 'Duels gagnés – perdus'], pvpRank: ['PvP rank', 'Rang JcJ'],
  subWinRate: ['{n}% won', '{n} % de victoires'], subFaction: ['{n} by the opposite faction', '{n} par la faction adverse'],
  subCritters: ['+ {n} critters', '+ {n} bestioles'], subAbandoned: ['{n} abandoned', '{n} abandonnées'], subBosses: ['{n} bosses defeated', '{n} boss vaincus'],
  subHearth: ['{n} hearthstones', '{n} pierres de foyer'], subDungeonDeaths: ['{n} in dungeons', '{n} en donjon'], subKb: ['monsters and players', 'monstres et joueurs'],
  fish: ['Fish caught', 'Poissons pêchés'], mounts: ['Mounts', 'Montures'], potions: ['Potions', 'Potions'], subPotions: ['{h} health · {m} mana', '{h} soins · {m} mana'], armorySrc: ['from the armory', "d'après l'armurerie"], repsN: ['{n} factions', '{n} factions'], quests: ['Quests', 'Quêtes'], flights: ['Flights taken', 'Trajets aériens'], deaths: ['Deaths', 'Morts'],
  played: ['Played', 'Temps de jeu'],
  dbTitle: ['Dropamine logbook', 'Carnet Dropamine'], dbWhen: ['sent by the player on {d}', 'envoyé par le joueur le {d}'],
  dbLog: ['Collection log', 'Collection log'], dbAch: ['Dropamine achievements', 'Succès Dropamine'], dbRec: ['Records', 'Records'],
  dbHunt: ['Hunt', 'Chasse'], dbPvp: ['PvP', 'JcJ'], hk: ['Honorable kills', 'Victoires honorables'],
  recSession: ['Best session', 'Meilleure session'], recHour: ['Best hour', 'Meilleure heure'], recDay: ['Best day', 'Meilleur jour'],
  recCombo: ['Longest combo', 'Plus long combo'], recSessions: ['Sessions', 'Sessions'], recGoals: ['Goals reached', 'Objectifs atteints'],
  recTime: ['Time tracked', 'Temps suivi'], huTries: ['{n} tries', '{n} essais'], huFound: ['found', 'trouvé'],
  pvHkWeek: ['HK this week', 'VH cette semaine'], pvHonorWeek: ['Honor this week', 'Honneur cette semaine'], pvHonor: ['Honor points', "Points d'honneur"],
  pvDk: ['Dishonorable kills', 'Victoires déshonorantes'], pvHighest: ['Highest rank', 'Rang le plus haut'], playedN: ['{t} played', '{t} de jeu'], playedTip: ['/played, sent by the player with their Dropamine export', '/played, envoyé par le joueur avec sa ligne Dropamine'],
  rank: ['RANK', 'RANG'], character: ['CHARACTER', 'PERSONNAGE'], split: ['BREAKDOWN', 'RÉPARTITION'], value: ['VALUE', 'VALEUR'], totalH: ['TOTAL', 'TOTAL'],
  member: ['MEMBER', 'MEMBRE'], guildH: ['GUILD', 'GUILDE'], members: ['MEMBERS', 'INSCRITS'], d7: ['7 D', '7 J'],
  est: ['estimated', 'estimé'], preview: ['preview', 'aperçu'],
  sealPreview: ['GUILD PREVIEW · NOT REGISTERED', 'APERÇU DE GUILDE · NON INSCRIT'],
  previewNote: ['Shown because their guild is followed. Is it you? <a href="?p=join" data-view-link="join">Sign in</a> to register for an exact score, or to hide it.',
    "Affiché parce que sa guilde est suivie. C'est toi ? <a href=\"?p=join\" data-view-link=\"join\">Connecte-toi</a> pour t'inscrire avec un score exact, ou pour le masquer."], allModes: ['All modes', 'Tous les modes'], allClasses: ['All classes', 'Toutes les classes'],
  registered: ['{n} registered', '{n} inscrit{s}'], previewN: ['{n} in preview', '{n} en aperçu'],
  legend: ['Weapons estimated, waiting for the Dropamine file', 'Armes estimées, en attente du fichier Dropamine'], weaponsDef: ['Weapons & Defense', 'Armes et Défense'], professions: ['Professions', 'Métiers'],
  failedT: ['Data unavailable', 'Données indisponibles'], failed: ["The Hiscores couldn't be loaded. Try again in a moment.", "Le classement n'a pas pu être chargé. Réessaie dans un instant."],
  nobodyT: ['Nobody yet', "Personne pour l'instant"], nobody: ['No character in this region yet.', 'Aucun personnage dans cette région pour le moment.'], registerYours: ['Register yours', 'Inscris le tien'],
  noCharT: ['No character', 'Aucun personnage'], noChar: ['Search for a character, pick one in the Hiscores, or <a href="?p=join" data-view-link="join">sign in</a> to see yours.', 'Cherche un personnage, choisis-en un dans le classement, ou <a href="?p=join" data-view-link="join">connecte-toi</a> pour voir le tien.'],
  noSearch: ['No character matches.', 'Aucun personnage ne correspond.'],
  chartSoon: ['The chart will appear after a few days of tracking.', 'La courbe apparaîtra après quelques jours de suivi.'],
  levelN: ['level {n}', 'niveau {n}'], of60: ['out of 60', 'sur 60'], profCount: ['{n} profession{s}', '{n} métier{s}'], noProf: ['No profession learned.', 'Aucun métier appris.'],
  progress: ['Progress', 'Progression'], defW: ['Defense {d} · weapons {w}', 'Défense {d} · armes {w}'], estP: [' (estimated)', ' (estimées)'],
  sealOk: ['VERIFIED · ARMORY + DROPAMINE FILE', 'VÉRIFIÉ · ARMURERIE + FICHIER DROPAMINE'], sealEst: ['ARMORY · WEAPONS ESTIMATED', 'ARMURERIE · ARMES ESTIMÉES'],
  totalLevel: ['TOTAL LEVEL', 'NIVEAU TOTAL'],
  ctaEst: ["<b>Estimated score.</b> Weapon skills are not in the armory, so each equipped weapon is counted at its maximum. Is it you? In game, type <code>/drop hiscores</code> and paste the export on the <a href=\"?p=join\" data-view-link=\"join\">Join page</a>: your real weapon skills replace the estimate.",
    "<b>Score estimé.</b> Les compétences d'armes ne sont pas dans l'armurerie : elles sont comptées au maximum pour chaque arme équipée. C'est toi ? En jeu, tape <code>/drop hiscores</code> et colle la ligne sur la <a href=\"?p=join\" data-view-link=\"join\">page Inscription</a> : tes vraies compétences d'armes remplacent l'estimation."],
  guildsT: ['Guilds', 'Guildes'], guildsNote: ["ranked by their members' total · Forever {r}", 'classées par le total de leurs membres · Forever {r}'],
  noGuildT: ['No guild', 'Aucune guilde'], noGuild: ['Guilds appear as soon as one of their members is listed.', "Les guildes apparaissent dès qu'un de leurs membres est affiché."],
  allGuilds: ['← All guilds', '← Toutes les guildes'], membersN: ['{n} member{s}', '{n} membre{s}'],
  guildTotal: ['GUILD TOTAL · {r} GUILD', 'TOTAL DE LA GUILDE · {r} GUILDE'],
  bestTotal: ['BEST TOTAL', 'MEILLEUR TOTAL'], bestProf: ['BEST PROFESSION', 'MEILLEUR MÉTIER'], bestWeek: ['BEST WEEK', 'PLUS FORTE SEMAINE'],
  inWeek: ['+{n} in 7 days', '+{n} en 7 jours'], notEnough: ['not enough tracking yet', 'pas encore assez de suivi'],
  latest: ['LATEST VERSION', 'DERNIÈRE VERSION'], showMore: ['Show details', 'Afficher le détail'], fullHistory: ['Full history on', 'Historique complet sur'],
  newsFailT: ['Unavailable', 'Indisponible'], newsFail: ["The changelog couldn't be loaded.", "Le journal des versions n'a pas pu être chargé."],
  updated: ['Hiscores updated {d}.', 'Hiscores mis à jour le {d}.'], meta: ['Version {v} · free · open source (MIT) · English and French', 'Version {v} · gratuit · open source (MIT) · français et anglais'],
  loading: ['Loading…', 'Chargement…'],
  title: ['Dropamine — the WoW Forever addon that celebrates every +1', "Dropamine — l'addon WoW Forever qui fête chaque +1"],
};
const t = (k, vars = {}) => {
  let s = (I18N[k] || [k, k])[LANG === 'fr' ? 1 : 0];
  for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, b);
  return s.replaceAll('{s}', +vars.n > 1 ? 's' : '');
};
const locale = () => LANG === 'fr' ? 'fr-FR' : 'en-GB';
const fmt = n => Math.round(n).toLocaleString(locale());
const ord = n => LANG === 'fr' ? (n === 1 ? '1ᵉʳ' : n + 'ᵉ') : n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

/* ---------- Référentiels (identifiants de l'API → noms dans les deux langues) ---------- */
const PROF = { 165: ['Leatherworking', 'Travail du cuir'], 393: ['Skinning', 'Dépeçage'], 185: ['Cooking', 'Cuisine'], 356: ['Fishing', 'Pêche'],
  129: ['First Aid', 'Secourisme'], 171: ['Alchemy', 'Alchimie'], 164: ['Blacksmithing', 'Forge'], 333: ['Enchanting', 'Enchantement'],
  202: ['Engineering', 'Ingénierie'], 182: ['Herbalism', 'Herboristerie'], 186: ['Mining', 'Minage'], 197: ['Tailoring', 'Couture'] };
const CLASS = { 1: ['Warrior', 'Guerrier'], 2: ['Paladin', 'Paladin'], 3: ['Hunter', 'Chasseur'], 4: ['Rogue', 'Voleur'], 5: ['Priest', 'Prêtre'],
  7: ['Shaman', 'Chaman'], 8: ['Mage', 'Mage'], 9: ['Warlock', 'Démoniste'], 11: ['Druid', 'Druide'] };
const RACE = { 1: ['Human', 'humain'], 2: ['Orc', 'orc'], 3: ['Dwarf', 'nain'], 4: ['Night Elf', 'elfe de la nuit'], 5: ['Undead', 'mort-vivant'],
  6: ['Tauren', 'tauren'], 7: ['Gnome', 'gnome'], 8: ['Troll', 'troll'] };
const RULESETS = [[2, ['Normal', 'Normal']], [1, ['PvP', 'JcJ']], [3, ['RP', 'Jeu de rôle']], [15, ['RP-PvP', 'Jeu de rôle JcJ']]];
const L2 = pair => pair ? pair[LANG === 'fr' ? 1 : 0] : '';
const profName = (id, fallback) => L2(PROF[id]) || fallback || '';
const className = p => L2(CLASS[p.classId]) || p.class || '';
const raceName = p => L2(RACE[p.raceId]) || (p.race || '').toLowerCase();
const rulesetName = p => L2((RULESETS.find(([id]) => id === p.rulesetId) || [])[1]) || p.ruleset || '';
const PROF_ORDER = [393, 186, 182, 171, 164, 333, 202, 165, 197, 185, 356, 129];
const STAT_KEYS = ['hk', 'killingBlows', 'kills', 'quests', 'dungeons', 'flights'];
const armoryStat = (p, k) => k === 'hk' ? (p.stats?.hk ?? p.pvpArmory?.hk ?? null) : (p.stats?.[k] ?? null);
// Même référentiel que l'addon (Catalog.lua de Dropamine) : noms, icônes et ordre des armes
const WPN = { axes: ['One-Handed Axes', 'Haches', 'inv_axe_01'], axes2h: ['Two-Handed Axes', 'Haches à deux mains', 'inv_axe_09'],
  maces: ['One-Handed Maces', 'Masses', 'inv_mace_01'], maces2h: ['Two-Handed Maces', 'Masses à deux mains', 'inv_mace_04'],
  swords: ['One-Handed Swords', 'Épées', 'inv_sword_04'], swords2h: ['Two-Handed Swords', 'Épées à deux mains', 'inv_sword_10'],
  polearms: ['Polearms', "Armes d'hast", 'inv_spear_06'], staves: ['Staves', 'Bâtons', 'inv_staff_08'],
  fist: ['Fist Weapons', 'Armes de pugilat', 'inv_gauntlets_04'], daggers: ['Daggers', 'Dagues', 'inv_weapon_shortblade_05'],
  unarmed: ['Unarmed', 'Mains nues', 'inv_gauntlets_04'], feral: ['Feral Combat', 'Combat farouche', 'ability_druid_catform'],
  bows: ['Bows', 'Arcs', 'inv_weapon_bow_02'], guns: ['Guns', 'Armes à feu', 'inv_weapon_rifle_01'],
  crossbows: ['Crossbows', 'Arbalètes', 'inv_weapon_crossbow_01'], thrown: ['Thrown', 'Armes de jet', 'inv_throwingknife_02'],
  wands: ['Wands', 'Baguettes', 'inv_wand_01'] };
const WPN_ORDER = Object.keys(WPN);
const PROF_ICON = { 171: 'trade_alchemy', 164: 'trade_blacksmithing', 333: 'trade_engraving', 202: 'trade_engineering', 182: 'trade_herbalism',
  165: 'trade_leatherworking', 186: 'trade_mining', 393: 'inv_misc_pelt_wolf_01', 197: 'trade_tailoring', 185: 'inv_misc_food_15',
  356: 'trade_fishing', 129: 'spell_holy_sealofsacrifice' };
const DEF_ICON = 'inv_shield_06';
const icon = name => `https://render.worldofwarcraft.com/eu/icons/56/${name}.jpg`;   // icônes du jeu, servies par Blizzard
const wpnOf = (p, id) => p.weaponList?.find(w => w.id === id);
const SKILLS = [
  { id: 'total', group: null, label: () => t('total'), max: '2 460', get: p => p.total },
  { id: 'level', group: 'lvl', label: () => t('level'), max: '60', get: p => p.level, logo: true },
  ...WPN_ORDER.map(id => ({ id: 'w' + id, group: 'wpn', label: () => L2(WPN[id]), max: '300', wpn: id, icon: WPN[id][2],
    get: p => wpnOf(p, id)?.rank || null, est: p => !!wpnOf(p, id)?.est })),
  { id: 'defense', group: 'wpn', label: () => t('defense'), max: '300', get: p => p.defense || null, icon: DEF_ICON },
  ...PROF_ORDER.map(id => ({ id: 'p' + id, group: 'prf', label: () => profName(id), max: '300', prof: id, icon: PROF_ICON[id],
    get: p => p.professions?.find(x => x.id === id)?.skill ?? null })),
  ...STAT_KEYS.map(k => ({ id: k, group: 'stat', label: () => t(k), max: '', get: p => armoryStat(p, k) })),
  // carnet Dropamine : déclaré par le joueur avec sa ligne /drop hiscores (sur la confiance), sauf les VH (armurerie)
  { id: 'clog', group: 'book', label: () => t('dbLog'), max: '', icon: 'inv_box_02', get: p => p.dropamine?.collection?.x ?? null,
    show: (v, p) => `${fmt(v)}<small> / ${fmt(p.dropamine.collection.y)}</small>`, ratio: (v, p) => v / p.dropamine.collection.y },
  { id: 'ach', group: 'book', label: () => t('dbAch'), max: '', logo: true, get: p => p.dropamine?.achievements?.n ?? null,
    show: (v, p) => `${v}<small> / ${p.dropamine.achievements.total}</small>`, ratio: (v, p) => v / p.dropamine.achievements.total },
  { id: 'played', group: 'book', label: () => t('played'), max: '', icon: 'inv_misc_pocketwatch_01', get: p => p.played ?? null, show: v => playedText(v) },
  { id: 'rsession', group: 'book', label: () => t('recSession'), max: '', icon: 'inv_misc_note_01', get: p => p.dropamine?.records?.bestSession ?? null },
  { id: 'rday', group: 'book', label: () => t('recDay'), max: '', icon: 'inv_misc_note_01', get: p => p.dropamine?.records?.bestDay ?? null },
  { id: 'rhour', group: 'book', label: () => t('recHour'), max: '', icon: 'inv_misc_note_01', get: p => p.dropamine?.records?.bestHour ?? null },
  { id: 'rcombo', group: 'book', label: () => t('recCombo'), max: '', icon: 'inv_misc_note_01', get: p => p.dropamine?.records?.longestCombo ?? null, show: v => 'x' + v },
];
const showVal = (sk, v, p) => sk.show ? sk.show(v, p) : fmt(v);
const GROUP_COLOR = { lvl: 'var(--lvl)', wpn: 'var(--wpn)', prf: 'var(--prf)', stat: 'var(--rim)', book: 'var(--gold)' };
const VIEWS = ['home', 'rank', 'char', 'guild', 'runs', 'news', 'get', 'join', 'privacy'];

let DATA = { players: [] }, NEWS = null;
const state = { view: 'home', region: 'eu', skill: 'total', cls: 0, rs: 0, c: '', g: '', gs: 'total', rscope: '' };
const inRegion = () => DATA.players.filter(p => (p.region || 'eu') === state.region);

/* ======================================================================
   Le ruban : trois bandes fines sous la navigation. Il gonfle en vague
   à chaque changement de page, ondule plus vite pendant un chargement.
   ====================================================================== */
const Ribbon = (() => {
  const host = $('.ribbon'), NS = 'http://www.w3.org/2000/svg', W = 1000, H = 44;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'none');
  const bands = [
    { fill: '#b85a46', hi: '#eaa08a', per: 330, speed: .55, ph: 0 },
    { fill: '#6a88c0', hi: '#b2c8ec', per: 260, speed: .8, ph: 1.9 },
    { fill: '#5f9a4a', hi: '#a6d68c', per: 210, speed: 1.05, ph: 3.4 },
  ].map(b => {
    const f = document.createElementNS(NS, 'path'), l = document.createElementNS(NS, 'path');
    f.setAttribute('fill', b.fill);
    l.setAttribute('fill', 'none'); l.setAttribute('stroke', b.hi); l.setAttribute('stroke-opacity', '.55');
    l.setAttribute('stroke-width', '1'); l.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(f, l); return { ...b, f, l };
  });
  host.append(svg);
  // Au repos, un ruban fin qui ondule doucement. À chaque navigation, une houle (bosse gaussienne)
  // traverse le ruban de gauche à droite, une seule fois.
  const SURGE_W = 170, SURGE_SPEED = 1100;
  let surges = [], loading = false, time = 0, last = performance.now(), running = false;
  const lift = x => {
    let e = loading ? .3 + .1 * Math.sin(time * 5) : 0;
    for (const s of surges) e += s.amp * Math.exp(-(((x - s.x) / SURGE_W) ** 2));
    return Math.min(1, e);
  };
  function draw() {
    const curve = (k, b) => x => {
      const e = lift(x), th = 2.6 + 9 * e;
      return k * th + th * (.22 + .28 * e) * Math.sin(2 * Math.PI * x / b.per + b.ph + (b.run || 0)) * (k / 3 + .4);
    };
    let prev = () => 0;
    bands.forEach((b, i) => {
      const top = prev, bot = curve(i + 1, b);
      let up = '', down = '', edge = '';
      for (let x = 0; x <= W; x += 20) up += (x ? ' L' : 'M') + x + ' ' + top(x).toFixed(2);
      for (let x = W; x >= 0; x -= 20) down += ' L' + x + ' ' + bot(x).toFixed(2);
      for (let x = 0; x <= W; x += 20) edge += (x ? ' L' : 'M') + x + ' ' + bot(x).toFixed(2);
      b.f.setAttribute('d', up + down + 'Z'); b.l.setAttribute('d', edge);
      prev = bot;
    });
  }
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    time += dt;
    for (const s of surges) { s.x += dt * SURGE_SPEED; s.amp *= Math.pow(.6, dt); }
    surges = surges.filter(s => s.x < W + 2.5 * SURGE_W);
    bands.forEach(b => { b.run = ((b.run || 0) + dt * b.speed) % (2 * Math.PI); });   // ondulation de fond, vitesse constante
    draw();
    if (!document.hidden) requestAnimationFrame(frame); else running = false;
  }
  function start() { if (running || reduce) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function bubbles(n) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span'); s.className = 'bubble'; const size = 3 + Math.random() * 4;
      s.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-duration:${.9 + Math.random() * .8}s;animation-delay:${Math.random() * .25}s`;
      host.append(s); setTimeout(() => s.remove(), 2000);
    }
  }
  draw(); start();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  return {
    swell(power = 1) {
      if (reduce) return;
      if (surges.some(s => s.x < 2 * SURGE_W)) return;          // une houle vient de partir : pas de doublon
      surges.push({ x: -2 * SURGE_W, amp: Math.min(1, power) }); bubbles(Math.round(5 * power)); start();
    },
    load(on) { loading = on; if (on) start(); },
  };
})();
$('.brand-logo').addEventListener('mouseenter', () => Ribbon.swell(.35));

/* ---------- Morceaux réutilisés ---------- */
const full = p => `${esc(p.name)} ${esc(p.surname)}`;
const who = p => `${esc(className(p))} ${p.level}${p.guild ? ' · ' + esc(p.guild.name) : ''}`;
const avatar = p => p.avatar ? `<img class="ava" src="${esc(p.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '';
const pkey = p => p.key || `${p.region || 'eu'}/${p.slug}`;
const tri = p => {
  const w = v => (100 * v / (p.max || 2460)).toFixed(1) + '%';
  return `<span class="tri" title="${t('level')} ${p.parts.level} · ${t('weaponsDef')} ${p.parts.combat}${p.complete ? '' : t('estP')} · ${t('professions')} ${p.parts.professions}">` +
    `<i class="l" style="--w:${w(p.parts.level)}"></i><i class="w${p.complete ? '' : ' est'}" style="--w:${w(p.parts.combat)}"></i><i class="p" style="--w:${w(p.parts.professions)}"></i></span>`;
};
const skillById = id => SKILLS.find(s => s.id === id) || SKILLS[0];
// classement : seules les vraies valeurs ont un rang (une arme estimée ne passe jamais devant une arme réelle)
function rankBy(skill, list) {
  return list.map(p => ({ p, v: skill.get(p) })).filter(x => x.v != null && x.v > 0 && !(skill.est && skill.est(x.p)))
    .sort((a, b) => b.v - a.v || pkey(a.p).localeCompare(pkey(b.p))).map((x, i) => ({ ...x, r: i + 1 }));
}
const failed = () => `<div class="empty"><b>${t('failedT')}</b>${t('failed')}</div>`;
const nobody = () => `<div class="empty"><b>${t('nobodyT')}</b>${t('nobody')} <a href="?p=join" data-view-link="join">${t('registerYours')}</a>.</div>`;
// gain depuis la veille (deux derniers points de l'historique, à un jour d'écart)
function histDiff(p, a, b) {
  if (p.complete || !a.s || !b.s) return b.t - a.t;
  return Object.keys(b.s).filter(k => k[0] !== 'w' && a.s[k] != null).reduce((n, k) => n + (b.s[k] - a.s[k]), 0);
}
const dayGain = p => { const h = p.history || []; if (h.length < 2) return 0; const a = h[h.length - 2], b = h[h.length - 1];
  return new Date(b.d) - new Date(a.d) <= 1.5 * 864e5 ? histDiff(p, a, b) : 0; };
const plus = p => { const d = dayGain(p); return d > 0 ? `<span class="plus" title="${t('sinceY')}">+${fmt(d)}</span>` : ''; };
const estTag = p => p.preview ? `<em class="pv">${t('preview')}</em>` : p.complete ? '' : `<em>${t('est')}</em>`;

/* ---------- Accueil : le pont vers les classements ---------- */
// téléchargements CurseForge, mis à jour à la main (chiffre donné par l'auteur)
const CF_DOWNLOADS = 529;
// ---------- Accueil personnel (connecté) : tout ce qui sert au quotidien, en un coup d'œil ----------
function renderDash() {
  const box = $('#dash'); if (!box) return false;
  const me = Bnet.mine();
  $('#home').classList.toggle('logged', !!me.length);
  if (!me.length) { box.hidden = true; return false; }
  box.hidden = false;
  if (!LOOT || !ITEMS || !ART || !runsLoad) Promise.all([loadLoot(), loadItems(), loadArt(), loadRuns()]).then(() => { if (state.view === 'home') renderDash(); });
  const p = me.find(x => pkey(x) === state.dc) || [...me].sort((a, b) => b.total - a.total)[0];
  const peers = DATA.players.filter(x => (x.region || 'eu') === (p.region || 'eu'));
  const rank = rankBy(SKILLS[0], peers).find(x => x.p === p)?.r, d1 = dayGain(p), d7 = gain7(p);
  const chooser = me.length > 1 ? `<div class="chips">${me.map(x => `<span class="chip ${x === p ? 'on' : ''}" data-dc="${esc(pkey(x))}">${full(x)} <small>${x.level}</small></span>`).join('')}</div>` : '';
  const d = p.dropamine || {};
  const old = p.dropamineAt ? (Date.now() - Date.parse(p.dropamineAt)) / 864e5 : null;
  // 1) le personnage
  const hero = `<div class="dhero"${p.render ? ` style="--fig:url('${esc(p.render)}')"` : ''}>
      <div class="dh-l"><h2>${t('dashHi', { n: esc(p.name) })}</h2><p>${esc(className(p))} · ${t('levelN', { n: p.level })}${p.guild ? ' · ' + esc(p.guild.name) : ''}</p>
        <div class="dh-n"><b data-n="${p.total}">${fmt(p.total)}</b><small> / ${fmt(p.max || 2460)}</small></div>
        <div class="dh-g">${rank ? `<span>${ord(rank)} · ${t('totalLevel')}</span>` : ''}${d1 > 0 ? `<span class="up">+${fmt(d1)} ${t('sinceY')}</span>` : ''}${d7 > 0 ? `<span class="up">+${fmt(d7)} ${t('in7')}</span>` : ''}</div>
        <div class="dh-a"><a class="btn gold" href="?p=char&c=${esc(pkey(p))}" data-c="${esc(pkey(p))}">${t('dashSheet')}</a><button class="btn ghost" data-hsimg="${esc(pkey(p))}">${t('hsBtn')}</button><a class="btn ghost" href="?p=join" data-view-link="join">${t('dashSend')}</a></div>
        ${old == null ? `<p class="dh-warn">${t('dashNoLine')}</p>` : old > 7 ? `<p class="dh-warn">${t('dashOldLine', { n: Math.floor(old) })}</p>` : ''}</div></div>`;
  // 2) mes runs, et ceux à ma portée
  const mineKeys = new Set(me.map(pkey));
  const myRuns = (RUNS || []).filter(r => r.members.some(m => mineKeys.has(m.key)));
  const openRuns = (RUNS || []).filter(r => !r.members.some(m => mineKeys.has(m.key)) && LOOT && (() => { const dd = LOOT.dungeons.find(x => x.key === r.dungeon); return dd && fitOf(p, dd) !== 'low'; })()).slice(0, 3);
  const runLine = r => { const dd = LOOT?.dungeons.find(x => x.key === r.dungeon), d0 = new Date(r.at);
    return `<li class="drun"${dd ? artStyle(dd.key) : ''}><a href="?p=runs&run=${esc(r.id)}" data-runlink="${esc(r.id)}"><b>${esc(dd?.name || r.dungeon)}</b><span>${d0.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' })} · ${d0.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })} · ${relWhen(d0)}</span><small>${t('runCount', { n: r.members.length })}</small></a></li>`; };
  const runsCard = `<section class="dcard"><h3>${t('dashRuns')}</h3>${myRuns.length ? `<ul class="dlist">${myRuns.slice(0, 4).map(runLine).join('')}</ul>` : `<p class="note">${t('dashNoRun')}</p>`}
      ${openRuns.length ? `<h4>${t('dashOpenRuns')}</h4><ul class="dlist">${openRuns.map(runLine).join('')}</ul>` : ''}
      <a class="lnk" href="?p=runs" data-view-link="runs">${t('dashAllRuns')}</a></section>`;
  // 3) ma chasse : objets pas encore trouvés, et qui d'autre chasse au même endroit
  const hunts = (d.hunt || []).filter(x => !x.drops);
  const others = id => { const keys = new Set((LOOT?.idx.get(id) || []).map(x => x.d.key));
    return DATA.players.filter(o => o !== p && (o.dropamine?.hunt || []).some(x => !x.drops && (LOOT?.idx.get(x.id) || []).some(y => keys.has(y.d.key)))).length; };
  const huntCard = `<section class="dcard"><h3>${t('dashHunt')}</h3>${hunts.length ? `<ul class="dhunt">${hunts.slice(0, 6).map(x => { const src = (LOOT?.idx.get(x.id) || []).sort((a, b) => (b.rate || 0) - (a.rate || 0))[0];
      const n = LOOT ? others(x.id) : 0;
      return `<li><span class="ci" data-item="${x.id}" data-boss="${esc(src ? (L2(src.b.n) || src.b.n[0]) : '')}"${src?.rate ? ` data-rate="${src.rate}"` : ''} style="--q:${QCOL[ITEMS?.[x.id]?.q] || '#8a7a5a'}"><img src="${itemIcon(x.id)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>
        <span><b>${esc(x.name)}</b><small>${src ? esc(src.d.name) + (src.rate ? ` · ${fmt(src.rate)} %` : '') : ''}${x.tries ? ` · ${t('huTries', { n: fmt(x.tries) })}` : ''}${n ? ` · <i class="also">${t('dashAlso', { n })}</i>` : ''}</small></span></li>`; }).join('')}</ul>` : `<p class="note">${t('dashNoHunt')}</p>`}</section>`;
  // 4) collection log : où j'en suis, et les donjons presque finis
  const col = d.collection;
  let near = '';
  if (col?.items?.length && LOOT) {
    const g = new Set(col.items);
    near = LOOT.dungeons.map(dd => { const all = dunItems(dd), have = [...all].filter(id => g.has(id)).length; return { dd, have, total: all.size }; })
      .filter(x => x.have > 0 && x.have < x.total).sort((a, b) => b.have / b.total - a.have / a.total).slice(0, 3)
      .map(x => `<li><span>${esc(x.dd.name)}</span><i class="lbar"><i style="width:${(100 * x.have / x.total).toFixed(1)}%"></i></i><b>${x.have} / ${x.total}</b></li>`).join('');
  }
  const colCard = `<section class="dcard"><h3>${t('dbLog')}</h3>${col ? `<div class="db-big">${fmt(col.x)}<small> / ${fmt(col.y)}</small></div><i class="lbar"><i style="width:${(100 * col.x / col.y).toFixed(2)}%"></i></i>
      ${near ? `<h4>${t('dashNear')}</h4><ul class="db-list one">${near}</ul>` : ''}` : `<p class="note">${t('dashNoLog')}</p>`}</section>`;
  // 5) ma guilde : mon rang, les plus forts de la semaine
  let guildCard = '';
  if (p.guild) {
    const mates = DATA.players.filter(x => x.guild?.slug === p.guild.slug && (x.region || 'eu') === (p.region || 'eu'));
    const gr = [...mates].sort((a, b) => b.total - a.total).indexOf(p) + 1;
    const movers = mates.map(x => ({ x, g: gain7(x) })).filter(o => o.g > 0).sort((a, b) => b.g - a.g).slice(0, 3);
    guildCard = `<section class="dcard"><h3>${esc(p.guild.name)}</h3><p class="dg">${t('dashGuildRank', { r: ord(gr), n: mates.length })}</p>
      ${movers.length ? `<h4>${t('bestWeek')}</h4><ul class="dlist">${movers.map(o => `<li><a data-c="${esc(pkey(o.x))}" href="?p=char&c=${esc(pkey(o.x))}">${avatar(o.x)}<b>${full(o.x)}</b><span class="up">+${fmt(o.g)}</span></a></li>`).join('')}</ul>` : ''}
      <a class="lnk" href="?p=guild&g=${esc(p.guild.slug)}" data-g="${esc(p.guild.slug)}">${t('dashGuild')}</a></section>`;
  }
  // 6) prochaines marches : les compétences les plus proches de leur maximum actuel
  const steps = [...(p.professions || []).map(x => ({ n: profName(x.id, x.name), v: x.skill, m: x.max || 300, ic: PROF_ICON[x.id] })),
    ...(p.weaponList || []).filter(w => !w.est && (p.equipped || []).includes(w.id)).map(w => ({ n: L2(WPN[w.id]), v: w.rank, m: 5 * p.level, ic: WPN[w.id]?.[2] })),
    { n: t('defense'), v: p.defense || 0, m: 5 * p.level, ic: DEF_ICON }]
    .filter(x => x.v > 0 && x.v < x.m).sort((a, b) => (b.v / b.m) - (a.v / a.m)).slice(0, 4);
  const stepCard = steps.length ? `<section class="dcard"><h3>${t('dashNext')}</h3><ul class="dsteps">${steps.map(x => `<li><img src="${icon(x.ic)}" alt="" referrerpolicy="no-referrer"><span>${esc(x.n)}</span><i class="lbar"><i style="width:${(100 * x.v / x.m).toFixed(1)}%"></i></i><b>${x.v} / ${x.m}</b><small>${t('dashLeft', { n: x.m - x.v })}</small></li>`).join('')}</ul></section>` : '';
  box.innerHTML = `${chooser}${hero}<div class="dgrid">${runsCard}${huntCard}${colCard}${stepCard}${guildCard}</div>
    <p class="dash-more"><a class="lnk" data-dash-intro>${t('dashAbout')}</a></p>`;
  return true;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-dc]'); if (c) { state.dc = c.dataset.dc; renderDash(); return; }
  const rl = e.target.closest('[data-runlink]'); if (rl) { e.preventDefault(); state.runFocus = rl.dataset.runlink; state.runFocused = false; go({ view: 'runs' }); return; }
  if (e.target.closest('[data-dash-intro]')) { $('#home').classList.toggle('show-intro'); }
});

function renderHome() {
  renderDash();
  // les chiffres qui montrent que le projet vit (toutes régions)
  if (DATA.players.length) {
    const gs = new Set(DATA.players.filter(p => p.guild).map(p => (p.region || 'eu') + '/' + p.guild.slug));
    const up = DATA.updated ? new Date(DATA.updated) : null;
    const when = up ? (up.toDateString() === new Date().toDateString()
      ? t('pulseToday', { h: up.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }) })
      : t('pulseOn', { d: up.toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) })) : '';
    $$('[data-pulse]').forEach(el => { el.innerHTML = `<i class="live"></i>${t('pulseDl', { n: fmt(CF_DOWNLOADS) })} · ${t('pulseChars', { n: fmt(DATA.players.length) })} · ${t('pulseGuilds', { n: gs.size })}${when ? ' · ' + when : ''}`; });
  }
  const all = rankBy(SKILLS[0], inRegion()), top = all.slice(0, 5);
  // les +1 du jour : les plus gros gains depuis la veille, en petits toasts façon addon
  const gains = inRegion().map(p => ({ p, d: dayGain(p) })).filter(x => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 6);
  const gainsHtml = gains.length ? `<div class="gains"><p class="kicker">${t('gainsT')}</p><div class="gl">${gains.map(({ p, d }) =>
    `<a class="gt" href="?p=char&c=${esc(encodeURIComponent(pkey(p)))}" data-c="${esc(pkey(p))}">${avatar(p)}<span><b>${full(p)}</b><small>${esc(className(p))} ${p.level}</small></span><i>+${fmt(d)}</i></a>`).join('')}</div></div>` : '';
  const line = ({ p, v, r }, cls = '') => `<div class="row${r <= 3 ? ' top' : ''}${cls}" data-c="${esc(pkey(p))}" style="grid-template-columns:44px minmax(0,1fr) minmax(90px,160px) 96px"><span class="rk">${r}</span><span class="nm">${avatar(p)}<span><b>${full(p)}</b>${plus(p)}<small>${who(p)}</small></span></span>${tri(p)}<span class="tot">${fmt(v)}${estTag(p)}</span></div>`;
  // connecté : ton meilleur personnage, sous le top 5 s'il n'y figure pas
  const me = all.find(x => pkey(x.p) === Bnet.best());
  const you = me && !top.includes(me) ? `<div class="you-sep">${t('youHere')}</div>${line(me, ' you')}` : '';
  $('#home-top').innerHTML = DATA.failed ? failed() : top.length
    ? gainsHtml + top.map(x => line(x, pkey(x.p) === Bnet.best() ? ' you' : '')).join('') + you
    : nobody();
}

/* ---------- Classement ---------- */
function renderRank() {
  if (DATA.failed) { $('#rank-panel').innerHTML = failed(); return; }
  const sk = skillById(state.skill), region = inRegion();
  const byRs = state.rs ? region.filter(p => p.rulesetId === state.rs) : region;
  const list = rankBy(sk, state.cls ? byRs.filter(p => p.classId === state.cls) : byRs);
  const classes = [...new Set(byRs.map(p => p.classId).filter(Boolean))].sort((a, b) => L2(CLASS[a]).localeCompare(L2(CLASS[b])));
  let nav = '', grp;
  // comme la grille de l'addon : chaque compétence avec son icône ; une arme n'apparaît que si quelqu'un la pratique
  SKILLS.filter(s => !(s.wpn || s.group === 'book') || s.id === sk.id || region.some(p => s.get(p))).forEach(s => {
    if (s.group !== grp) { grp = s.group; if (grp) nav += `<div class="grp"><i class="dot" style="background:${GROUP_COLOR[grp]}"></i>${t('g.' + grp)}</div>`; }
    const ic = s.logo || s.id === 'total' ? '<i class="sic logo"></i>' : s.icon ? `<img class="sic" src="${icon(s.icon)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<i class="sic none"></i>';
    nav += `<a href="?p=rank&s=${s.id}" data-skill="${s.id}" class="${s.id === sk.id ? 'on' : ''}">${ic}<span class="lb">${s.label()}</span> <span>${s.max}</span></a>`;
  });
  const count = id => region.filter(p => p.rulesetId === id).length;
  const rsChips = `<span class="chip ${state.rs ? '' : 'on'}" data-rs="0">${t('allModes')}<span class="n">${region.length}</span></span>` +
    RULESETS.map(([id, names]) => `<span class="chip ${state.rs === id ? 'on' : ''}" data-rs="${id}">${L2(names)}<span class="n">${count(id)}</span></span>`).join('');
  const clsChips = `<span class="chip ${state.cls ? '' : 'on'}" data-cls="0">${t('allClasses')}</span>` +
    classes.map(c => `<span class="chip ${state.cls === c ? 'on' : ''}" data-cls="${c}">${esc(L2(CLASS[c]))}</span>`).join('');
  const isTotal = sk.id === 'total';
  // armes estimées : affichées sous le classement, sans rang
  const pool = state.cls ? byRs.filter(p => p.classId === state.cls) : byRs;
  const estRows = sk.wpn ? pool.filter(p => sk.est(p) && sk.get(p)).sort((a, b) => sk.get(b) - sk.get(a)).map(p => ({ p, v: sk.get(p), r: 0 })) : [];
  const row = ({ p, v, r }) => `
    <div class="row${r && r <= 3 ? ' top' : ''}${r ? '' : ' unranked'}" data-c="${esc(pkey(p))}" role="row">
      <span class="rk">${r || '–'}</span>
      <span class="nm">${avatar(p)}<span><b>${full(p)}</b>${plus(p)}<small>${who(p)}${rulesetName(p) ? ' · ' + esc(rulesetName(p)) : ''}</small></span></span>
      ${isTotal ? tri(p) : sk.prof ? `<span class="mbar"><i style="--w:${(100 * v / (p.professions.find(x => x.id === sk.prof)?.max || 300)).toFixed(1)}%"></i></span>`
        : sk.wpn ? `<span class="mbar w${sk.est(p) ? ' est' : ''}"><i style="--w:${(100 * v / (5 * p.level)).toFixed(1)}%"></i></span>`
        : sk.ratio ? `<span class="mbar b"><i style="--w:${(100 * Math.min(1, sk.ratio(v, p))).toFixed(1)}%"></i></span>` : '<span class="c3"></span>'}
      <span class="tot">${showVal(sk, v, p)}${isTotal ? estTag(p) : sk.wpn && sk.est(p) ? `<em>${t('est')}</em>` : ''}</span>
    </div>`;
  const rows = (list.length || estRows.length)
    ? list.map(row).join('') + (estRows.length ? `<div class="you-sep est-sep">${t('estSep')}</div>` + estRows.map(row).join('') : '')
    : nobody();
  $('#rank-panel').innerHTML = `
    <div class="head"><h2>${sk.label()}</h2><span class="note">${sk.group === 'book' && !sk.armory ? t('trustShort') + ' · ' : ''}${t('registered', { n: region.filter(p => !p.preview).length })}${region.some(p => p.preview) ? ' · ' + t('previewN', { n: region.filter(p => p.preview).length }) : ''} · Forever ${state.region.toUpperCase()}</span></div>
    <div class="chips" role="group">${rsChips}</div>
    <div class="board">
      <nav class="skills">${nav}</nav>
      <div>
        <div class="chips" role="group" style="margin:0 0 12px">${clsChips}</div>
        <div class="rows" role="table">
          <div class="row th" role="row"><span>${t('rank')}</span><span>${t('character')}</span><span class="c3">${isTotal ? t('split') : ''}</span><span style="text-align:right">${isTotal ? t('totalH') : t('value')}</span></div>
          ${rows}
        </div>
      </div>
    </div>
    ${isTotal ? `<div class="legend"><span><i style="background:var(--lvl)"></i>${t('level')}</span><span><i style="background:var(--wpn)"></i>${t('weaponsDef')}</span><span><i style="background:var(--prf)"></i>${t('professions')}</span><span><i style="background:repeating-linear-gradient(135deg,var(--wpn) 0 3px,#33435f 3px 6px)"></i>${t('legend')}</span></div>` : ''}`;
}

/* ---------- Personnage ---------- */
function chartSvg(hist) {
  if (!hist || hist.length < 2) return `<div class="empty" style="padding:30px 0">${t('chartSoon')}</div>`;
  const W = 420, H = 140, pad = 12, ts = hist.map(h => h.t), lo = Math.min(...ts), hi = Math.max(...ts), span = Math.max(1, hi - lo);
  const pts = hist.map((h, i) => [(i / (hist.length - 1)) * W, H - pad - ((h.t - lo) / span) * (H - 2 * pad)]);
  const line = pts.map(p => p.map(n => n.toFixed(1)).join(' ')).join(' L');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" aria-label="${t('progress')}"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c49a5c" stop-opacity=".32"/><stop offset="1" stop-color="#c49a5c" stop-opacity="0"/></linearGradient></defs>
    <path d="M${line} L${W} ${H} L0 ${H}Z" fill="url(#area)"/><path class="stroke" d="M${line}" fill="none" stroke="#e8c88a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4.5" fill="#e8c88a"/></svg>`;
}
/* Grille de tuiles, comme le panneau de l'addon : icône, rang en bas à droite, « /max » dessous.
   Ordre de l'addon : Niveau, armes, Défense, métiers. Survol = infobulle façon jeu. */
const TIER = [[75, ['Apprentice', 'Apprenti']], [150, ['Journeyman', 'Compagnon']], [225, ['Expert', 'Expert']], [300, ['Artisan', 'Artisan']]];
const tierOf = max => L2((TIER.find(([m]) => max <= m) || TIER[3])[1]);
// Une compétence de la fiche : même données pour la liste et pour la grille
function skillItems(p, peers) {
  const place = sk => rankBy(sk, peers).find(x => x.p === p)?.r;
  const items = [{ key: 'level', ava: p.avatar, name: t('level'), rank: p.level, max: 60, group: 'lvl', r: place(skillById('level')) }];
  const used = new Set(p.equipped || []);
  for (const id of WPN_ORDER) {
    const w = wpnOf(p, id); if (!w) continue;
    items.push({ key: 'w' + id, img: WPN[id][2], name: L2(WPN[id]), rank: w.rank, max: 5 * p.level, group: 'wpn', est: w.est,
      r: w.est ? null : place(skillById('w' + id)), spare: used.size > 0 && !used.has(id) });
  }
  if (p.defense) items.push({ key: 'defense', img: DEF_ICON, name: t('defense'), rank: p.defense, max: 5 * p.level, group: 'wpn', r: place(skillById('defense')) });
  for (const id of PROF_ORDER) {
    const pr = p.professions?.find(x => x.id === id); if (!pr) continue;
    items.push({ key: 'p' + id, img: PROF_ICON[id], name: profName(id, pr.name), rank: pr.skill, max: pr.max || 300, group: 'prf', tier: tierOf(pr.max || 300), r: place(skillById('p' + id)) });
  }
  return items;
}
const tipOf = it => `<b>${esc(it.name)}</b><span>${it.key === 'level' ? `${it.rank} / ${it.max}` : t('tipRank', { r: it.rank, m: it.max })}</span>`
  + (it.tier ? `<span class="tier">${esc(it.tier)}</span>` : '') + (it.r ? `<span class="rk">${t('tipPlace', { r: ord(it.r) })}</span>` : '')
  + (it.est ? `<span class="est">${t('tipEst')}</span>` : '') + (it.spare ? `<span class="est">${t('tipSpare')}</span>` : '');
// l'icône : le portrait du personnage pour le niveau, l'icône du jeu pour le reste
const pic = it => it.key === 'level'
  ? (it.ava ? `<img src="${esc(it.ava)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="logo"></span>')
  : `<img src="${icon(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
const tileOf = it => `<div class="tile g-${it.group}${it.est ? ' est' : ''}${it.spare ? ' spare' : ''}" tabindex="0" data-tip="${esc(tipOf(it))}" aria-label="${esc(it.name)} ${it.rank} / ${it.max}">`
  + pic(it) + `<span class="num"><b>${it.rank}</b><small>/${it.max}</small></span></div>`;
const lineOf = it => `<div class="sline g-${it.group}${it.est ? ' est' : ''}${it.spare ? ' spare' : ''}" tabindex="0" data-tip="${esc(tipOf(it))}">
  <span class="sic2">${pic(it)}</span>
  <span class="snm"><b>${esc(it.name)}</b>${it.tier ? `<small>${esc(it.tier)}</small>` : it.est ? `<small>${t('est')}</small>` : ''}</span>
  <span class="sbar"><i style="--w:${Math.min(100, 100 * it.rank / it.max).toFixed(1)}%"></i></span>
  <span class="sv"><b>${it.rank}</b><small> / ${it.max}</small></span>
  <span class="spl">${it.r ? ord(it.r) : ''}</span></div>`;
let SKVIEW = (() => { try { return localStorage.getItem('skview') === 'grid' ? 'grid' : 'list'; } catch (e) { return 'list'; } })();
let SHOW_SPARE = false;
function skillsBlock(p, peers) {
  const items = skillItems(p, peers), spare = items.filter(i => i.spare);
  const shown = SHOW_SPARE ? items : items.filter(i => !i.spare);
  const body = SKVIEW === 'grid' ? `<div class="stiles">${shown.map(tileOf).join('')}</div>` : `<div class="slist">${shown.map(lineOf).join('')}</div>`;
  const more = spare.length ? `<button class="more" type="button" data-sk="spare">${SHOW_SPARE ? t('lessW') : t('moreW', { n: spare.length })}</button>` : '';
  return `<div class="dpanel">
      <div class="dhead"><h3 class="sub">${t('skillsT')}</h3>
        <div class="vsw" role="group" aria-label="${t('viewT')}">
          <button type="button" data-sk="list" aria-pressed="${SKVIEW === 'list'}" title="${t('viewList')}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><rect x="3" y="4" width="3" height="4" rx=".5"/><rect x="3" y="10" width="3" height="4" rx=".5"/><rect x="3" y="16" width="3" height="4" rx=".5"/></svg></button>
          <button type="button" data-sk="grid" aria-pressed="${SKVIEW === 'grid'}" title="${t('viewGrid')}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></button>
        </div></div>
      ${p.complete ? '' : `<p class="estnote">${t('tilesEst')}</p>`}
      ${body}${more}
      ${dropBar(p)}
    </div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sk]'); if (!b) return;
  const v = b.dataset.sk;
  if (v === 'spare') SHOW_SPARE = !SHOW_SPARE;
  else { SKVIEW = v; try { localStorage.setItem('skview', v); } catch (err) { /* choix gardé pour cette visite */ } }
  Tip.hide(); renderChar(); animate($('#char')); Ribbon.swell(.35);   // animate : remplit à nouveau la barre du total
});
// barre du bas du panneau : la goutte, le niveau total, la barre trois couleurs
const dropBar = p => `<div class="dbar"><span class="logo"></span><span class="dn"><b data-n="${p.total}">${fmt(p.total)}</b><small> / ${fmt(p.max || 2460)}</small></span>${tri(p)}</div>`;

/* Infobulle façon jeu, partagée par toutes les tuiles (survol, focus clavier, toucher) */
const Tip = (() => {
  const el = document.createElement('div'); el.className = 'gtip'; el.setAttribute('role', 'tooltip'); document.body.append(el);
  let cur = null;
  const show = t => {
    cur = t; el.innerHTML = t.dataset.tip; el.classList.add('on');
    const r = t.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    let x = r.right + 10, y = r.top;
    if (x + w > innerWidth - 8) x = r.left - w - 10;
    if (x < 8) { x = Math.max(8, Math.min(innerWidth - w - 8, r.left)); y = r.bottom + 8; }
    if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 8);
    el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
  };
  const hide = () => { cur = null; el.classList.remove('on'); };
  document.addEventListener('mouseover', e => { const t = e.target.closest('[data-tip]'); if (t) show(t); else if (cur) hide(); });
  document.addEventListener('focusin', e => { const t = e.target.closest('[data-tip]'); if (t) show(t); });
  document.addEventListener('focusout', hide);
  document.addEventListener('click', e => { const t = e.target.closest('[data-tip]'); if (t) { cur === t ? hide() : show(t); } else hide(); });
  addEventListener('scroll', hide, { passive: true });
  return { hide };
})();

function renderChar() {
  if (DATA.failed) { $('#char-panel').innerHTML = failed(); return; }
  const p = DATA.players.find(x => pkey(x) === state.c || x.slug === state.c) || DATA.players.find(x => pkey(x) === Bnet.best());
  if (!p) { $('#char-panel').innerHTML = `<div class="empty"><b>${t('noCharT')}</b>${t('noChar')}</div>`; return; }
  state.c = pkey(p);
  const peers = DATA.players.filter(x => (x.region || 'eu') === (p.region || 'eu'));
  const totalRank = rankBy(SKILLS[0], peers).find(x => x.p === p)?.r;
  const hist = p.history || [], gained = hist.length > 1 ? hist[hist.length - 1].t - hist[0].t : 0;
  const nProf = p.professions?.length || 0;
  const portrait = p.render
    ? `<div class="portrait"><div class="plinth"></div><div class="plinth2"></div><div class="fig" style="background-image:url('${esc(p.render)}')" role="img" aria-label="${full(p)}"></div></div>`
    : `<div class="vial" role="img" aria-label="Dropamine"></div>`;
  const desc = LANG === 'fr' ? `${esc(className(p))} ${esc(raceName(p))}` : `${esc(raceName(p))} ${esc(className(p))}`;
  const mine = Bnet.mine();
  const picker = mine.length > 1 && mine.includes(p)
    ? `<div class="mine-pick"><span>${t('myChars')}</span>${mine.map(m => `<span class="chip ${m === p ? 'on' : ''}" data-c="${esc(pkey(m))}">${full(m)} <small>${m.level}</small></span>`).join('')}</div>` : '';
  $('#char-panel').innerHTML = `${picker}
    <div class="who${p.render ? ' has-render' : ''}">
      ${portrait}
      <div><h2>${full(p)}</h2><p>${desc} · ${t('levelN', { n: p.level })}${p.guild ? ` · <a href="?p=guild&g=${esc(p.guild.slug)}" data-g="${esc(p.guild.slug)}">${esc(p.guild.name)}</a>` : ''} · ${esc((p.region || 'eu').toUpperCase())}${rulesetName(p) ? ' ' + esc(rulesetName(p)) : ''}</p>
        ${p.preview ? `<span class="seal pv">${t('sealPreview')}</span><p class="pv-note">${t('previewNote')}</p>` : p.complete ? `<span class="seal"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m5 12 5 5 9-10"/></svg>${t('sealOk')}</span>` : `<span class="seal est">${t('sealEst')}</span>`}
        <button class="share" type="button" data-share="${esc(pkey(p))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg><span>${t('share')}</span></button><button class="share hsb" type="button" data-hsimg="${esc(pkey(p))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h6M7 13h10M7 17h8"/></svg><span>${t('hsBtn')}</span></button></div>
      <div class="score">${dayGain(p) > 0 ? `<div class="toast1"><b>+${fmt(dayGain(p))}</b> ${t('sinceY')}</div>` : ''}<div class="n" data-n="${p.total}">${fmt(p.total)}<small> / ${fmt(p.max || 2460)}</small></div><div class="r">${totalRank ? ord(totalRank) + ' · ' : ''}${t('totalLevel')}</div></div>
    </div>
    ${secNav(p)}
    <div id="sec-skills">${skillsBlock(p, peers)}</div>
    ${advPanel(p, hist, gained)}
    ${pvpPanel(p)}
    ${repsPanel(p)}
    ${dropBook(p)}
    ${p.complete ? '' : `<div class="cta">${t('ctaEst')}</div>`}`;
  if (p.dropamine?.collection?.items?.length) fillClog(p);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-share]'); if (!b) return;
  const p = DATA.players.find(x => pkey(x) === b.dataset.share); if (!p) return;
  const url = `https://dropamine.app/?p=char&c=${encodeURIComponent(pkey(p))}`;
  const text = `${p.name} ${p.surname} · ${fmt(p.total)} / ${fmt(p.max || 2460)} · Dropamine Hiscores`;
  try {
    if (navigator.share && matchMedia('(pointer:coarse)').matches) { await navigator.share({ title: text, url }); return; }
    await navigator.clipboard.writeText(url);
    const sp = b.querySelector('span'); sp.textContent = t('copied'); b.classList.add('ok');
    setTimeout(() => { sp.textContent = t('share'); b.classList.remove('ok'); }, 1800);
  } catch (err) { /* partage annulé ou presse-papiers refusé : rien à faire */ }
});

/* ---------- Image Hiscores d'un personnage (dessin dans share.js) ---------- */
const SECONDARY_PROFS = [185, 356, 129];
// gain sur 7 jours d'une ligne, d'après l'historique quotidien (null tant qu'il manque un point de comparaison)
function weekGain(p, key) {
  const h = p.history || []; if (h.length < 2) return null;
  const last = h[h.length - 1], cut = new Date(new Date(last.d) - 7 * 864e5).toISOString().slice(0, 10);
  const base = [...h].reverse().find(x => x.d <= cut) || h[0];
  const val = e => key === 't' ? e.t : e.s?.[key];
  if (key === 't') return base === last ? null : histDiff(p, base, last);
  return base === last || val(base) == null || val(last) == null ? null : val(last) - val(base);
}
// les lignes de l'image : le total puis les 9 cases comptées par l'addon
// carnet Dropamine sur l'image : seulement ce que le joueur a laissé dans sa ligne (et les VH de l'armurerie)
function hsBook(p) {
  const d = p.dropamine || {}, fr = LANG === 'fr';
  const book = { collection: d.collection, achievements: d.achievements, played: p.played, playedText: p.played ? playedText(p.played) : '',
    records: d.records, hunt: d.hunt, stats: { ...(p.stats || {}), hk: armoryStat(p, 'hk') }, reps: p.reps || [] };
  return { book, BL: fr
    ? { locale: 'fr-FR', li: 1, sessionS: 'Session', dayS: 'Jour', hourS: 'Heure', kb: 'Coups fatals', pvpDeaths: 'Tué par joueurs', duels: 'Duels G / P', dungeons: 'Donjons', reps: 'Réputations', factions: 'factions', title: 'Carnet Dropamine', log: 'Collection log', ach: 'Succès', played: 'Temps de jeu', hk: 'Victoires honorables', week: 'cette sem.',
        rec: 'Records', sessions: 'sessions', session: 'Meilleure session', day: 'Meilleur jour', hour: 'Meilleure heure', combo: 'Plus long combo',
        pvp: 'JcJ', honorWeek: 'Honneur semaine', honor: "Points d'honneur", highest: 'Rang le plus haut', dk: 'Vict. déshonorantes',
        hunt: 'Chasse', found: 'trouvé', tries: 'essais', kills: 'Créatures tuées', quests: 'Quêtes', deaths: 'Morts', flights: 'Trajets aériens', armory: 'Armurerie', inviteT: 'Remplis ton carnet',
        invite1: 'Collection log, records, chasse : tape', invite2: '/drop hiscores en jeu, colle ta ligne sur le site.' }
    : { locale: 'en-US', li: 0, sessionS: 'Session', dayS: 'Day', hourS: 'Hour', kb: 'Killing blows', pvpDeaths: 'Killed by players', duels: 'Duels W / L', dungeons: 'Dungeons', reps: 'Reputations', factions: 'factions', title: 'Dropamine logbook', log: 'Collection log', ach: 'Achievements', played: 'Played', hk: 'Honorable kills', week: 'this week',
        rec: 'Records', sessions: 'sessions', session: 'Best session', day: 'Best day', hour: 'Best hour', combo: 'Longest combo',
        pvp: 'PvP', honorWeek: 'Honor this week', honor: 'Honor points', highest: 'Highest rank', dk: 'Dishonorable kills',
        hunt: 'Hunt', found: 'found', tries: 'tries', kills: 'Creatures killed', quests: 'Quests', deaths: 'Deaths', flights: 'Flights taken', armory: 'Armory', inviteT: 'Fill your logbook',
        invite1: 'Collection log, records, hunt: type', invite2: '/drop hiscores in game, paste your line on the site.' } };
}
function hsRows(p) {
  const peers = DATA.players.filter(x => (x.region || 'eu') === (p.region || 'eu'));
  const rank = id => rankBy(skillById(id), peers).find(x => x.p === p)?.r || null;
  const row = (name, img, v, max, group, id, hkey) => ({ name, img, v, max, group, rank: rank(id), week: weekGain(p, hkey), vText: fmt(v), maxText: fmt(max) });
  const rows = [{ ...row(t('total'), null, p.total, p.max || 2460, 'lvl', 'total', 't'), total: true, parts: p.parts }];
  rows.push(row(t('level'), p.avatar, p.level, 60, 'lvl', 'level', 'l'));
  const prim = (p.professions || []).filter(x => !SECONDARY_PROFS.includes(x.id)).sort((a, b) => b.skill - a.skill).slice(0, 2);
  for (const x of [...prim, ...SECONDARY_PROFS.map(id => p.professions?.find(y => y.id === id)).filter(Boolean)])
    rows.push(row(profName(x.id, x.name), icon(PROF_ICON[x.id] || 'inv_misc_note_01'), x.skill, x.max || 300, 'prf', 'p' + x.id, 'p' + x.id));
  for (const id of p.equipped || []) { const w = wpnOf(p, id); if (w && WPN[id]) rows.push(row(L2(WPN[id]) + (w.est ? ` (${t('est')})` : ''), icon(WPN[id][2]), w.rank, 5 * p.level, 'wpn', 'w' + id, 'w' + id)); }
  if (p.defense) rows.push(row(t('defense'), icon(DEF_ICON), p.defense, 5 * p.level, 'wpn', 'defense', 'd'));
  rows.forEach(r => { r.rankText = r.rank ? fmt(r.rank) : ''; });
  return rows;
}
const HsImage = (() => {
  let dlg, p, opts, finalCv;
  // l'aperçu montre l'invitation « Remplis ton carnet » ; l'image téléchargée, copiée ou partagée ne l'a pas
  const final = async () => {
    if (!finalCv) { const cv = document.createElement('canvas'); await DropShare.draw(cv, p, { ...opts, preview: false }); finalCv = cv; }
    return finalCv;
  };
  const png = () => final().then(cv => new Promise(r => cv.toBlob(r, 'image/png')));
  function build() {
    dlg = document.createElement('dialog'); dlg.className = 'hsd';
    dlg.innerHTML = `<button class="cx" type="button" aria-label="${t('close')}">×</button><canvas width="1200" height="630"></canvas>
      <div class="cact"><button type="button" class="dl">${t('hsDl')}</button><button type="button" class="sh" hidden>${t('share')}</button><button type="button" class="cp">${t('hsCopy')}</button></div>`;
    document.body.append(dlg);
    dlg.addEventListener('click', async e => {
      if (e.target === dlg || e.target.closest('.cx')) return dlg.close();
      if (e.target.closest('.dl')) { const a = document.createElement('a'); a.download = `dropamine-hiscores-${p.slug}.png`; a.href = (await final()).toDataURL('image/png'); a.click(); return; }
      if (e.target.closest('.sh')) {
        try { await navigator.share({ files: [new File([await png()], `dropamine-hiscores-${p.slug}.png`, { type: 'image/png' })], title: `${p.name} ${p.surname} · Dropamine Hiscores` }); }
        catch (err) { /* partage annulé */ }
        return;
      }
      const cp = e.target.closest('.cp');
      if (cp) navigator.clipboard.write([new ClipboardItem({ 'image/png': png() })])
        .then(() => { cp.textContent = t('hsCopied'); setTimeout(() => cp.textContent = t('hsCopy'), 1800); })
        .catch(() => { cp.textContent = t('hsNoCopy'); });
    });
  }
  async function open(player) {
    if (!window.DropShare) return;
    if (!dlg) build();
    p = player;
    let files = false; try { files = !!navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] }) && matchMedia('(pointer:coarse)').matches; } catch (e) { /* pas de partage de fichier */ }
    $('.sh', dlg).hidden = !files;
    dlg.showModal();
    const desc = LANG === 'fr' ? `${className(p)} ${raceName(p)}` : `${raceName(p)} ${className(p)}`;
    await document.fonts.ready;
    finalCv = null;
    opts = { rows: hsRows(p), L: {
      title: `Hiscores · ${p.name} ${p.surname}`,
      sub: `${desc.charAt(0).toUpperCase() + desc.slice(1)} · ${t('levelN', { n: p.level })}${p.guild ? ' · ' + p.guild.name : ''} · Forever ${(p.region || 'eu').toUpperCase()}`,
      cols: [t('hsSkill'), t('hsRank'), t('hsLevel'), t('hsWeek')],
      date: DATA.updated ? new Date(DATA.updated).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) : '' },
      ...hsBook(p) };
    // l'invitation « Remplis ton carnet » : seulement dans l'aperçu de ses propres personnages
    await DropShare.draw($('canvas', dlg), p, { ...opts, preview: Bnet.mine().includes(p) });
    final();   // prépare l'image finale pendant que le joueur regarde
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-hsimg]'); if (!b) return;
    const pl = DATA.players.find(x => pkey(x) === b.dataset.hsimg); if (pl) { Tip.hide(); open(pl); }
  });
  return { open };
})();

// ---------- Fiche par catégories : Compétences · Aventure · JcJ · Réputations · Carnet ----------
// en-tête de catégorie : titre, source (armurerie ou déclaré), extra à droite
const catHead = (id, title, src, extra = '') => `<div class="cathead"><h3 class="sub">${title}</h3><span class="src ${src}">${t(src === 'arm' ? 'srcArm' : 'srcDecl')}</span>${extra ? `<span class="cx2">${extra}</span>` : ''}</div>`;
// tuile : icône du jeu, intitulé, grand chiffre, précision
const tile = (ic, label, value, sub = '', cls = '') => value == null ? '' :
  `<div class="stile ${cls}">${ic ? `<img class="sti" src="${icon(ic)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<i class="sti logo"></i>'}<span class="stl">${label}</span><b class="stv">${typeof value === 'number' ? fmt(value) : value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
const kdOf = st => st.hk == null ? null : st.pvpDeaths ? st.hk / st.pvpDeaths : st.hk;
function secNav(p) {
  const st = p.stats || {}, d = p.dropamine || {};
  const items = [['sec-skills', t('skillsT')], ['sec-adv', t('advT')], [armoryStat(p, 'hk') != null || st.pvpDeaths != null ? 'sec-pvp' : null, t('pvpT')],
    [p.reps?.length ? 'sec-reps' : null, t('repsT')], [Object.keys(d).length || p.played ? 'sec-book' : null, t('dbTitle')]].filter(([id]) => id);
  return `<nav class="secnav">${items.map(([id, l]) => `<a href="#${id}" data-sec="${id}">${l}</a>`).join('')}</nav>`;
}
function advPanel(p, hist, gained) {
  const st = p.stats || {};
  const tiles = [
    tile('ability_warrior_rampage', t('kills'), st.kills, st.critters ? t('subCritters', { n: fmt(st.critters) }) : ''),
    tile('inv_misc_book_08', t('quests'), st.quests, st.questsAbandoned ? t('subAbandoned', { n: fmt(st.questsAbandoned) }) : ''),
    tile('inv_misc_key_03', t('dungeons'), st.dungeons, st.bosses ? t('subBosses', { n: fmt(st.bosses) }) : ''),
    tile('ability_mount_gryphon_01', t('flights'), st.flights, st.hearth ? t('subHearth', { n: fmt(st.hearth) }) : ''),
    tile('spell_holy_resurrection', t('deaths'), st.deaths, st.dungeonDeaths ? t('subDungeonDeaths', { n: fmt(st.dungeonDeaths) }) : ''),
    tile('ability_backstab', t('killingBlows'), st.killingBlows, t('subKb')),
    tile('inv_misc_fish_02', t('fish'), st.fish),
    tile('ability_mount_whitetiger', t('mounts'), st.mounts),
    tile('inv_potion_51', t('potions'), st.healthPotions != null || st.manaPotions != null ? (st.healthPotions || 0) + (st.manaPotions || 0) : null,
      st.manaPotions != null ? t('subPotions', { h: fmt(st.healthPotions || 0), m: fmt(st.manaPotions || 0) }) : ''),
  ].join('');
  return `<section class="cat" id="sec-adv">${catHead('adv', t('advT'), 'arm')}
    <div class="advgrid"><div class="prog"><h4 class="minor">${t('progress')}${gained ? ` <span>+${fmt(gained)}</span>` : ''}</h4>${chartSvg(hist)}</div>
    <div class="stiles">${tiles || `<div class="empty">—</div>`}</div></div></section>`;
}
function pvpPanel(p) {
  const st = { ...(p.stats || {}), hk: armoryStat(p, 'hk') };
  if (st.hk == null && st.pvpDeaths == null) return '';
  const kd = kdOf(st), duels = (st.duelsWon || 0) + (st.duelsLost || 0), rate = duels ? Math.round(100 * (st.duelsWon || 0) / duels) : null;
  const rank = p.pvpArmory?.rank || 0;
  return `<section class="cat pvp" id="sec-pvp">${catHead('pvp', t('pvpT'), 'arm')}
    <div class="pvpgrid">
      <div class="kd"><span class="tl">${t('kd')}</span><b>${kd == null ? '—' : kd.toLocaleString(locale(), { maximumFractionDigits: 2, minimumFractionDigits: kd % 1 ? 2 : 0 })}</b>
        <small>${t('kdHow', { k: fmt(st.hk || 0), d: fmt(st.pvpDeaths || 0) })}</small>
        <i class="kdbar"><i style="width:${st.hk || st.pvpDeaths ? (100 * (st.hk || 0) / ((st.hk || 0) + (st.pvpDeaths || 0))).toFixed(1) : 0}%"></i></i></div>
      <div class="stiles">
        ${tile(p.faction === 'HORDE' ? 'inv_bannerpvp_01' : 'inv_bannerpvp_02', t('hk'), st.hk)}
        ${tile('ability_rogue_feigndeath', t('pvpDeaths'), st.pvpDeaths, st.factionDeaths != null ? t('subFaction', { n: fmt(st.factionDeaths) }) : '')}
        ${tile('ability_dualwield', t('duelsT'), duels || st.duelsWon != null ? `${fmt(st.duelsWon || 0)} – ${fmt(st.duelsLost || 0)}` : null, rate != null ? t('subWinRate', { n: rate }) : '')}
        ${rank ? tile('inv_misc_tabardpvp_01', t('pvpRank'), rank) : ''}
      </div></div></section>`;
}

// Réputations de l'armurerie : palier (couleurs du jeu) et avancement dans le palier
const REP_COL = ['#cc3322', '#cc3322', '#e0682a', '#e6c84c', '#6fbf4a', '#4cc9a0', '#3fb8c9', '#5aa6e6'];
function repsPanel(p) {
  if (!p.reps?.length) return '';
  const rows = p.reps.map(x => `<li><span>${esc(L2(x.n) || x.n[0])}</span><i class="lbar rep"><i style="width:${x.m ? (100 * x.v / x.m).toFixed(1) : 100}%;background:${REP_COL[x.t] || REP_COL[3]}"></i></i><b style="color:${REP_COL[x.t] || REP_COL[3]}">${esc(L2(x.s) || x.s[0])}</b></li>`).join('');
  const tiers = {}; p.reps.forEach(x => { tiers[x.t] = (tiers[x.t] || 0) + 1; });
  const summary = Object.keys(tiers).map(Number).sort((a, b) => b - a).map(k => { const x = p.reps.find(y => y.t === k);
    return `<span class="tier" style="--c:${REP_COL[k] || REP_COL[3]}"><b>${tiers[k]}</b> ${esc(L2(x.s) || x.s[0])}</span>`; }).join('');
  return `<section class="cat" id="sec-reps">${catHead('reps', t('repsT'), 'arm', t('repsN', { n: p.reps.length }))}<div class="tiers">${summary}</div><ul class="db-list reps">${rows}</ul></section>`;
}

// Carnet Dropamine : tout ce que l'armurerie n'a pas, envoyé par le joueur avec sa ligne /drop hiscores
// (chaque groupe n'existe que si sa case était cochée dans l'addon)
function dropBook(p) {
  const d = p.dropamine || {}, parts = [];
  const bar = (x, y) => `<i class="lbar"><i style="width:${Math.min(100, 100 * x / Math.max(1, y)).toFixed(1)}%"></i></i>`;
  if (d.collection) {
    const c = d.collection;
    const rows = [...c.dungeons].sort((a, b) => b.x / b.y - a.x / a.y).map(g =>
      `<li><span>${esc(g.name)}</span>${bar(g.x, g.y)}<b>${g.x} / ${g.y}</b></li>`).join('');
    parts.push(`<section class="db-card db-wide"><h4>${t('dbLog')}</h4><div class="db-big">${fmt(c.x)}<small> / ${fmt(c.y)}</small></div>${bar(c.x, c.y)}
      ${c.items?.length ? `<div class="clog" data-clog>${t('loading')}</div>` : `${rows ? `<ul class="db-list">${rows}</ul>` : ''}<p class="db-note">${t('clogResend')}</p>`}</section>`);
  }
  if (d.achievements) {
    const a = d.achievements;
    parts.push(`<section class="db-card"><h4>${t('dbAch')}</h4><div class="db-big">${a.n}<small> / ${a.total}</small></div>${bar(a.n, a.total)}</section>`);
  }
  if (p.played) parts.push(`<section class="db-card"><h4>${t('played')}</h4><div class="db-big">${playedText(p.played)}</div><p class="db-note">/played</p></section>`);
  if (d.records) {
    const r = d.records;
    const L = [['recSession', r.bestSession], ['recHour', r.bestHour], ['recDay', r.bestDay], ['recCombo', 'x' + r.longestCombo], ['recSessions', r.sessions], ['recGoals', r.goalsHit]]
      .map(([k, v]) => `<div>${t(k)}<b>${typeof v === 'number' ? fmt(v) : v}</b></div>`).join('');
    parts.push(`<section class="db-card db-wide"><h4>${t('dbRec')}</h4><div class="ledger">${L}<div>${t('recTime')}<b>${playedText(r.playtime)}</b></div></div></section>`);
  }
  if (d.hunt?.length) {
    const rows = d.hunt.map(h => `<li><span>${esc(h.name)}</span><em>${h.tries ? t('huTries', { n: fmt(h.tries) }) : ''}</em><b class="${h.drops ? 'ok' : ''}">${h.drops ? '✓ ' + (h.drops > 1 ? '×' + h.drops : t('huFound')) : '—'}</b></li>`).join('');
    parts.push(`<section class="db-card"><h4>${t('dbHunt')}</h4><ul class="db-list hunt">${rows}</ul></section>`);
  }
  if (!parts.length) return '';
  const when = p.dropamineAt ? new Date(p.dropamineAt).toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) : '';
  return `<section class="cat dbook" id="sec-book">${catHead('book', t('dbTitle'), 'decl', when ? t('dbWhen', { d: when }) : '')}
    <div class="db-grid">${parts.join('')}</div></section>`;
}

const playedText = s => { const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? (LANG === 'fr' ? `${d} j ${h} h` : `${d}d ${h}h`) : (LANG === 'fr' ? `${h} h ${m} min` : `${h}h ${m}m`); };

/* ---------- Guildes ---------- */
function guilds() {
  const m = new Map();
  inRegion().forEach(p => { if (!p.guild) return; const g = m.get(p.guild.slug) || { ...p.guild, members: [] }; g.members.push(p); m.set(p.guild.slug, g); });
  return [...m.values()].map(g => ({ ...g, total: g.members.reduce((s, p) => s + p.total, 0) })).sort((a, b) => b.total - a.total);
}
function gain7(p) {
  const h = p.history || []; if (h.length < 2) return null;
  const last = h[h.length - 1], cut = new Date(new Date(last.d) - 7 * 864e5).toISOString().slice(0, 10);
  return histDiff(p, [...h].reverse().find(x => x.d <= cut) || h[0], last);
}
function renderGuild() {
  if (DATA.failed) { $('#guild-panel').innerHTML = failed(); return; }
  const all = guilds(), g = all.find(x => x.slug === state.g);
  if (!g) {
    $('#guild-panel').innerHTML = `<div class="head"><h2>${t('guildsT')}</h2><span class="note">${t('guildsNote', { r: state.region.toUpperCase() })}</span></div>
      <div class="rows glist">${all.length ? `<div class="row th"><span>${t('rank')}</span><span>${t('guildH')}</span><span style="text-align:right" class="c3">${t('members')}</span><span style="text-align:right">${t('totalH')}</span></div>` +
        all.map((x, i) => `<div class="row${i < 3 ? ' top' : ''}" data-g="${esc(x.slug)}"><span class="rk">${i + 1}</span><span class="nm"><span><b>${esc(x.name)}</b></span></span><span class="val">${x.members.length}</span><span class="tot">${fmt(x.total)}</span></div>`).join('')
        : `<div class="empty"><b>${t('noGuildT')}</b>${t('noGuild')}</div>`}</div>`;
    return;
  }
  const rank = all.indexOf(g) + 1, members = [...g.members].sort((a, b) => b.total - a.total);
  const gsk = skillById(state.gs), avail = SKILLS.filter(s => s.id === 'total' || members.some(p => s.get(p) && !(s.est && s.est(p))));
  const ranked = gsk.id === 'total' ? members.map((p, i) => ({ p, v: p.total, r: i + 1 })) : rankBy(gsk, members);
  let og = '', grp0;
  avail.forEach(s => {
    const opt = `<option value="${s.id}"${s.id === gsk.id ? ' selected' : ''}>${esc(s.label())}</option>`;
    if (!s.group) { og += opt; return; }   // « Niveau total » seul, hors groupe
    if (s.group !== grp0) { if (grp0) og += '</optgroup>'; grp0 = s.group; og += `<optgroup label="${t('g.' + s.group)}">`; }
    og += opt; });
  if (grp0) og += '</optgroup>';
  let best = null; members.forEach(p => p.professions?.forEach(pr => { if (!best || pr.skill > best.pr.skill) best = { p, pr }; }));
  const gains = members.map(p => ({ p, d: gain7(p) })).filter(x => x.d > 0).sort((a, b) => b.d - a.d);
  const feat = (k, v, s) => `<div class="feat"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  // la guilde comme un seul grand personnage : sa barre trois couleurs, et le meilleur de chaque métier
  const sum = k => members.reduce((a, p) => a + (p.parts?.[k] || 0), 0);
  const gp = { total: g.total, max: members.length * 2460, parts: { level: sum('level'), combat: sum('combat'), professions: sum('professions') }, complete: members.every(p => p.complete) };
  const bestOf = [];
  for (const id of PROF_ORDER) {
    let b = null; members.forEach(p => { const pr = p.professions?.find(x => x.id === id); if (pr && (!b || pr.skill > b.pr.skill)) b = { p, pr }; });
    if (b) bestOf.push({ key: 'p' + id, img: PROF_ICON[id], name: profName(id, b.pr.name), rank: b.pr.skill, max: b.pr.max || 300, group: 'prf', tier: `${b.p.name} ${b.p.surname}` });
  }
  const bd = members.reduce((b, p) => (p.defense || 0) > (b?.defense || 0) ? p : b, null);
  if (bd?.defense) bestOf.unshift({ key: 'defense', img: DEF_ICON, name: t('defense'), rank: bd.defense, max: 5 * bd.level, group: 'wpn', tier: `${bd.name} ${bd.surname}` });
  const clan = `<div class="dpanel guildp"><div class="dhead"><h3 class="sub">${t('bestByProf')}</h3></div>
      <div class="slist">${bestOf.map(lineOf).join('')}</div>${dropBar(gp)}</div>`;
  $('#guild-panel').innerHTML = `
    <span class="back" data-g="">${t('allGuilds')}</span>
    <div class="who gh">
      <div><h2>${esc(g.name)}</h2><p>${t('membersN', { n: members.length })}</p></div>
      <div class="score"><div class="n" data-n="${g.total}">${fmt(g.total)}</div><div class="r">${t('guildTotal', { r: ord(rank) })}</div></div>
    </div>
    <div class="feats">
      ${feat(t('bestTotal'), full(members[0]), fmt(members[0].total))}
      ${best ? feat(t('bestProf'), full(best.p), `${esc(profName(best.pr.id, best.pr.name))} · ${best.pr.skill}`) : ''}
      ${gains.length ? feat(t('bestWeek'), full(gains[0].p), t('inWeek', { n: fmt(gains[0].d) })) : feat(t('bestWeek'), '—', t('notEnough'))}
    </div>
    ${clan}
    <div class="gsort"><label for="gs">${t('sortBy')}</label><select id="gs" data-gs>${og}</select>${gsk.group === 'book' && !gsk.armory ? `<span class="note">${t('trustShort')}</span>` : ''}</div>
    <div class="rows" style="margin-top:10px">
      <div class="row th g"><span>${t('rank')}</span><span>${t('member')}</span><span class="c3">${gsk.id === 'total' ? t('split') : ''}</span><span class="c4" style="text-align:right">${gsk.id === 'total' ? t('d7') : ''}</span><span style="text-align:right">${gsk.id === 'total' ? t('totalH') : esc(gsk.label())}</span></div>
      ${ranked.length ? ranked.map(({ p, v, r }) => { const d = gain7(p), tot = gsk.id === 'total';
        const bar = tot ? tri(p) : gsk.prof ? `<span class="mbar"><i style="--w:${(100 * v / (p.professions.find(x => x.id === gsk.prof)?.max || 300)).toFixed(1)}%"></i></span>`
          : gsk.wpn ? `<span class="mbar w"><i style="--w:${(100 * v / (5 * p.level)).toFixed(1)}%"></i></span>`
          : gsk.ratio ? `<span class="mbar b"><i style="--w:${(100 * Math.min(1, gsk.ratio(v, p))).toFixed(1)}%"></i></span>` : '<span class="c3"></span>';
        return `<div class="row g${r <= 3 ? ' top' : ''}" data-c="${esc(pkey(p))}"><span class="rk">${r}</span><span class="nm">${avatar(p)}<span><b>${full(p)}</b><small>${esc(className(p))} ${p.level}</small></span></span>${bar}<span class="up">${tot ? (d ? (d > 0 ? '+' : '') + fmt(d) : '—') : ''}</span><span class="tot">${showVal(gsk, v, p)}${tot ? estTag(p) : ''}</span></div>`; }).join('')
        : nobody()}
    </div>`;
}

/* ---------- Runs : les joueurs qui chassent dans le même donjon ---------- */
// Tables de butin d'AtlasLoot Forever (GPL-2.0), chargées à la première visite : objet → donjon, boss, taux de drop
let LOOT = null, lootLoad = null;
function loadLoot() {
  return lootLoad ??= fetch('data/loot.json').then(r => r.json()).then(j => {
    const idx = new Map();
    for (const d of j.dungeons) for (const b of d.bosses) for (const it of b.i) {
      const [id, rate] = Array.isArray(it) ? it : [it, null];
      if (!idx.has(id)) idx.set(id, []);
      idx.get(id).push({ d, b, rate });
    }
    LOOT = { ...j, idx };
  }).catch(() => { LOOT = { failed: true }; });
}
// ---------- Collection log en icônes : tables d'AtlasLoot Forever, objets obtenus envoyés par le joueur ----------
let ITEMS = null, itemsLoad = null;
const loadItems = () => itemsLoad ??= fetch('data/items.json').then(r => r.json()).then(j => { ITEMS = j; }).catch(() => { ITEMS = {}; });
const QCOL = { POOR: '#9d9d9d', COMMON: '#ffffff', UNCOMMON: '#1eff00', RARE: '#0070dd', EPIC: '#a335ee', LEGENDARY: '#ff8000' };
const itemName = id => { const x = ITEMS?.[id]; return x ? (L2(x.n) || x.n[0]) : '#' + id; };
const itemIcon = id => ITEMS?.[id]?.ic ? 'https://render.worldofwarcraft.com/' + ITEMS[id].ic : icon('inv_misc_questionmark');
function clogData(p) {
  const got = new Set(p.dropamine.collection.items);
  return LOOT.dungeons.map(d => {
    const all = new Set(), bosses = d.bosses.map(b => ({ b, items: b.i.map(e => Array.isArray(e) ? { id: e[0], rate: e[1] } : { id: e, rate: null }) }));
    bosses.forEach(x => x.items.forEach(i => all.add(i.id)));
    const have = [...all].filter(id => got.has(id)).length;
    return { d, bosses, have, total: all.size };
  }).filter(x => x.have > 0).sort((a, b) => b.have / b.total - a.have / a.total || b.have - a.have);
}
async function fillClog(p) {
  await Promise.all([loadLoot(), loadItems()]);
  const box = $('[data-clog]'); if (!box || state.c !== pkey(p)) return;
  if (LOOT?.failed) { box.textContent = '—'; return; }
  const got = new Set(p.dropamine.collection.items), list = clogData(p);
  if (!list.length) { box.innerHTML = `<p class="db-note">${t('clogNone')}</p>`; return; }
  const bossName = b => L2(b.n) || b.n[0];
  box.innerHTML = list.map((x, k) => `<details class="cdun"${k === 0 ? ' open' : ''}><summary><span class="cdn">${esc(x.d.name)}</span>
      <i class="lbar"><i style="width:${(100 * x.have / x.total).toFixed(1)}%"></i></i><b>${x.have} / ${x.total}</b></summary>
      <div class="cboss">${x.bosses.map(({ b, items }) => `<div class="cb"><span class="cbn">${esc(bossName(b))}</span><div class="cgrid">${items.map(i =>
        `<span class="ci${got.has(i.id) ? ' got' : ''}" data-item="${i.id}" data-boss="${esc(bossName(b))}"${i.rate != null ? ` data-rate="${i.rate}"` : ''} style="--q:${QCOL[ITEMS?.[i.id]?.q] || '#8a7a5a'}"><img src="${itemIcon(i.id)}" alt="${esc(itemName(i.id))}" loading="lazy" referrerpolicy="no-referrer"></span>`).join('')}</div></div>`).join('')}</div></details>`).join('')
    + `<p class="db-note">${t('clogSrc')}</p>`;
}
// infobulle d'objet, façon jeu
const ItemTip = (() => {
  let el = null;
  const show = (t0, x, y) => {
    const id = +t0.dataset.item, it = ITEMS?.[id];
    if (!el) { el = document.createElement('div'); el.className = 'itip'; document.body.append(el); }
    const lines = (it?.t || []).map(l => `<div${l[2] ? ` style="color:${l[2]}"` : ''}>${esc(LANG === 'fr' ? l[1] || l[0] : l[0])}</div>`).join('');
    el.innerHTML = `<b style="color:${QCOL[it?.q] || '#e8d9b0'}">${esc(itemName(id))}</b>${lines || `<div class="dim">${t('itemForever')}</div>`}
      <div class="src">${esc(t0.dataset.boss || '')}${t0.dataset.rate ? ` · ${(+t0.dataset.rate).toLocaleString(locale())} %` : ''}</div>
      <div class="${t0.classList.contains('got') ? 'ok' : 'no'}">${t0.classList.contains('got') ? t('obtained') : t('notObtained')}</div>`;
    el.style.display = 'block';
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.min(innerWidth - w - 8, x + 16) + 'px'; el.style.top = Math.min(innerHeight - h - 8, y + 16) + 'px';
  };
  document.addEventListener('mouseover', e => { const t0 = e.target.closest('[data-item]'); if (t0) show(t0, e.clientX, e.clientY); });
  document.addEventListener('mousemove', e => { if (el?.style.display === 'block' && e.target.closest('[data-item]')) show(e.target.closest('[data-item]'), e.clientX, e.clientY); });
  document.addEventListener('mouseout', e => { if (el && e.target.closest('[data-item]') && !e.relatedTarget?.closest?.('[data-item]')) el.style.display = 'none'; });
  return {};
})();
// ---------- Runs de donjon : qui chasse quoi, ce qui manque au collection log, groupes et runs prévus ----------
let ART = null, artLoad = null, RUNS = null, runsLoad = null;
const loadArt = () => artLoad ??= fetch('data/art.json').then(r => r.json()).then(j => { ART = j; }).catch(() => { ART = {}; });
let runsSig = '', runsBackoff = 0;
const loadRuns = (force) => (force || !runsLoad) ? (runsLoad = fetch(API + '/runs', { cache: 'no-cache' })
  .then(r => { if (r.status === 429) { runsBackoff = Math.min(4, runsBackoff + 1); throw new Error('429'); } runsBackoff = 0; return r.json(); })
  .then(j => { RUNS = j.runs || []; }).catch(e => { if (e.message !== '429') RUNS = RUNS ?? null; })) : runsLoad;
// rafraîchissement : toutes les 60 s (plus lent si le serveur demande de patienter), seulement page Runs visible,
// et jamais pendant qu'on remplit un formulaire ; on ne redessine que si la liste a changé
setInterval(async () => {
  if (state.view !== 'runs' || document.hidden || !LOOT || (runsBackoff && Math.random() > 1 / (2 ** runsBackoff))) return;
  const busy = document.activeElement?.closest?.('#runs-panel input, #runs-panel select, #runs-panel textarea') || $('#runs-panel details.propose[open], #runs-panel details.redit[open]');
  if (busy) return;
  const before = JSON.stringify(RUNS);
  await loadRuns(true);
  if (JSON.stringify(RUNS) !== before) renderRuns();
}, 60e3);
const isTrash = b => /^(Trash|Ennemis)/i.test(b.n[0]);
const ROLE_OK = { tank: [1, 2, 11], heal: [5, 7, 2, 11] };   // par préférence : guerrier, paladin, druide / prêtre, chaman, paladin, druide
const ROLE_IC = { tank: 'ability_defend', heal: 'spell_holy_flashheal', dps: 'ability_dualwield' };
function dunItems(d) { const all = new Set(); d.bosses.forEach(b => b.i.forEach(e => all.add(Array.isArray(e) ? e[0] : e))); return all; }
const fitOf = (p, d) => { const [lo, , hi] = d.lvl || []; if (!lo) return 'ok'; return p.level < lo ? 'low' : p.level > hi + 5 ? 'high' : 'ok'; };
function runsData(players) {
  const map = new Map(), get = d => { if (!map.has(d.key)) map.set(d.key, { d, people: new Map(), exp: 0, missing: 0 }); return map.get(d.key); };
  const person = (run, p) => { if (!run.people.has(p)) run.people.set(p, { hunts: [], missing: null, fit: fitOf(p, run.d) }); return run.people.get(p); };
  // 1) la chasse : chaque objet pas encore trouvé, au meilleur boss de chaque donjon
  for (const p of players) for (const h of p.dropamine?.hunt || []) {
    if (h.drops > 0) continue;
    const byD = new Map();
    for (const x of LOOT.idx.get(h.id) || []) { const cur = byD.get(x.d.key); if (!cur || (x.rate || 0) > (cur.rate || 0)) byD.set(x.d.key, x); }
    for (const x of byD.values()) { const run = get(x.d); person(run, p).hunts.push({ h, boss: x.b, rate: x.rate }); run.exp += (x.rate ?? 5) / 100; }
  }
  // 2) le collection log : les donjons commencés et ceux du bon niveau, avec le nombre d'objets manquants
  for (const p of players) {
    const got = p.dropamine?.collection?.items; if (!got?.length) continue;
    const g = new Set(got);
    for (const d of LOOT.dungeons) {
      const all = dunItems(d), have = [...all].filter(id => g.has(id)).length, fit = fitOf(p, d);
      if (!(have > 0 || fit === 'ok') || have === all.size) continue;
      const run = map.get(d.key) || (fit === 'ok' && have > 0 ? get(d) : null); if (!run) continue;
      const x = person(run, p); x.missing = all.size - have; x.have = have; run.missing += all.size - have;
    }
  }
  return [...map.values()].sort((a, b) => [...b.people.values()].filter(x => x.hunts.length).length - [...a.people.values()].filter(x => x.hunts.length).length
    || b.people.size - a.people.size || b.exp - a.exp || b.missing - a.missing);
}
// groupe suggéré : un tank, un soigneur, trois dégâts, parmi les gens du bon niveau d'abord
function suggestGroup(people) {
  const pool = [...people].sort(([, a], [, b]) => (a.fit === 'ok' ? 0 : 1) - (b.fit === 'ok' ? 0 : 1) || b.hunts.length - a.hunts.length).map(([p]) => p);
  const fitRank = p => (people.get ? people.get(p) : new Map(people).get(p))?.fit === 'low' ? 1 : 0;   // trop bas : en dernier ; au-dessus : peut porter le groupe
  const used = new Set(), pick = role => {
    const p = pool.filter(x => !used.has(x) && ROLE_OK[role].includes(x.classId))
      .sort((x, y) => fitRank(x) - fitRank(y) || ROLE_OK[role].indexOf(x.classId) - ROLE_OK[role].indexOf(y.classId))[0];
    if (p) used.add(p); return p;
  };
  const tank = pick('tank'), heal = pick('heal'), dps = pool.filter(x => !used.has(x)).slice(0, 3);
  return { tank, heal, dps };
}
const itemIcons = list => list.map(x => `<span class="ci got" data-item="${x.h.id}" data-boss="${esc(isTrash(x.boss) ? t('runsTrash') : (L2(x.boss.n) || x.boss.n[0]))}"${x.rate != null ? ` data-rate="${x.rate}"` : ''} style="--q:${QCOL[ITEMS?.[x.h.id]?.q] || '#8a7a5a'}"><img src="${itemIcon(x.h.id)}" alt="${esc(x.h.name)}" loading="lazy" referrerpolicy="no-referrer"></span>`).join('');
const fitTag = f => f === 'ok' ? `<i class="fit ok">${t('fitOk')}</i>` : f === 'low' ? `<i class="fit low">${t('runsLow')}</i>` : `<i class="fit high">${t('fitHigh')}</i>`;
const artStyle = key => ART?.[key] ? ` style="--art:url('https://render.worldofwarcraft.com/${ART[key]}')"` : '';
const roleIcon = role => `<img class="role" src="${icon(ROLE_IC[role] || ROLE_IC.dps)}" alt="${t('role.' + (role || 'dps'))}" title="${t('role.' + (role || 'dps'))}" referrerpolicy="no-referrer">`;
const whenText = iso => new Date(iso).toLocaleString(locale(), { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

const localInput = d => { const z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };
const nextEvening = () => { const d = new Date(); d.setDate(d.getDate() + (d.getHours() >= 20 ? 1 : 0)); d.setHours(21, 0, 0, 0); return d; };
function relWhen(d) {
  const ms = d - Date.now(), h = ms / 3600e3;
  if (ms < 0) return t('runNow');
  if (h < 1) return t('runInMin', { n: Math.max(1, Math.round(ms / 60e3)) });
  if (h < 24) return t('runInH', { n: Math.round(h) });
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
  return days === 1 ? t('runTomorrow') : t('runInD', { n: days });
}
const runUrl = id => `${location.origin}/?p=runs&run=${encodeURIComponent(id)}`;
function runText(run) {
  const d = LOOT.dungeons.find(x => x.key === run.dungeon), byKey = new Map(DATA.players.map(p => [pkey(p), p]));
  const who = run.members.map(m => { const p = byKey.get(m.key); return `${t('role.' + m.role)} ${p ? p.name : m.key.split('/')[1]}`; }).join(', ');
  return `[Dropamine] ${t('runAnn', { d: d?.name || run.dungeon, w: whenText(run.at), n: run.members.length })}${run.note ? ` · « ${run.note} »` : ''} · ${who} · ${runUrl(run.id)}`;
}
function runIcs(run) {
  const d = LOOT.dungeons.find(x => x.key === run.dungeon), st = new Date(run.at), en = new Date(st.getTime() + 2 * 3600e3);
  const f = x => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dropamine//Runs//FR', 'BEGIN:VEVENT', `UID:${run.id}@dropamine.app`, `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(st)}`, `DTEND:${f(en)}`, `SUMMARY:${t('runIcsTitle', { d: (d?.name || run.dungeon).replace(/[,;]/g, ' ') })}`,
    `DESCRIPTION:${(run.note || '').replace(/[,;\n]/g, ' ')}`, `URL:${runUrl(run.id)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.download = `run-${run.dungeon}.ics`; a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function renderRuns() {
  const box = $('#runs-panel');
  if (!LOOT || !ITEMS || !ART) {
    box.innerHTML = `<div class="empty">${t('loading')}</div>`;
    Promise.all([loadLoot(), loadItems(), loadArt(), loadRuns()]).then(() => { if (state.view === 'runs') { renderRuns(); animate($('#runs')); } });
    return;
  }
  if (LOOT.failed || DATA.failed) { box.innerHTML = failed(); return; }
  const me = Bnet.mine(), myGuild = me.find(p => p.guild)?.guild;
  const all = inRegion().filter(p => p.dropamine?.hunt?.length || p.dropamine?.collection?.items?.length);
  const scope = state.rscope || (myGuild ? 'guild' : 'all');
  let list = scope === 'guild' && myGuild ? all.filter(p => p.guild?.slug === myGuild.slug) : all, note = '';
  if (scope === 'guild' && myGuild && !list.length) { list = all; note = `<p class="note runs-note">${t('runsNoGuild')}</p>`; }
  let runs = runsData(list);
  if (state.rlvl && me.length) runs = runs.filter(x => me.some(p => fitOf(p, x.d) === 'ok'));
  const chips = `<div class="chips" role="group">${myGuild ? `<span class="chip ${scope === 'guild' ? 'on' : ''}" data-rscope="guild">${t('runsGuild')} · ${esc(myGuild.name)}</span>` : ''}<span class="chip ${scope === 'all' ? 'on' : ''}" data-rscope="all">${t('runsAll')}</span>${me.length ? `<span class="chip ${state.rlvl ? 'on' : ''}" data-rlvl>${t('runsMyLvl')}</span>` : ''}</div>`;

  // runs prévus (API) : ce que chaque inscrit chasse dans ce donjon
  const byKey = new Map(DATA.players.map(p => [pkey(p), p]));
  const huntsIn = (p, d) => (p?.dropamine?.hunt || []).filter(h => !h.drops && (LOOT.idx.get(h.id) || []).some(x => x.d.key === d.key))
    .map(h => ({ h, boss: (LOOT.idx.get(h.id) || []).find(x => x.d.key === d.key).b, rate: (LOOT.idx.get(h.id) || []).find(x => x.d.key === d.key).rate }));
  const mineKeys = new Set(me.map(pkey));
  const charSel = (sel) => `<select data-run-char>${me.map(p => `<option value="${esc(pkey(p))}"${pkey(p) === sel ? ' selected' : ''}>${full(p)} (${p.level})</option>`).join('')}</select>`;
  const roleSel = (sel, attr = 'data-run-role') => `<select ${attr}>${['tank', 'heal', 'dps'].map(x => `<option value="${x}"${x === sel ? ' selected' : ''}>${t('role.' + x)}</option>`).join('')}</select>`;
  const allRuns = RUNS || [];
  const pf = state.pf || 'all', pd = state.pd || '';
  const filtered = allRuns.filter(run => (pf !== 'mine' || run.members.some(m => mineKeys.has(m.key)))
    && (pf !== 'open' || (() => { const l = { tank: 1, heal: 1, dps: 3 }; run.members.forEach(m => l[m.role]--); return l.tank > 0 || l.heal > 0 || l.dps > 0; })())
    && (!pd || run.dungeon === pd));
  const plimit = state.plimit || 10, page = filtered.slice(0, plimit);
  const dayKey = iso => new Date(iso).toDateString();
  const dayTitle = iso => { const d = new Date(iso), diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
    return diff <= 0 ? t('dayToday') : diff === 1 ? t('dayTomorrow') : d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }); };
  const dunsWithRuns = [...new Set(allRuns.map(x => x.dungeon))].map(k => LOOT.dungeons.find(d => d.key === k)).filter(Boolean);
  const pfilters = allRuns.length > 1 ? `<div class="pfil chips">${[['all', 'pfAll'], ...(me.length ? [['mine', 'pfMine']] : []), ['open', 'pfOpen']].map(([k, l]) => `<span class="chip ${pf === k ? 'on' : ''}" data-pf="${k}">${t(l)}</span>`).join('')}
    ${dunsWithRuns.length > 1 ? `<select data-pd><option value="">${t('pfAllDun')}</option>${dunsWithRuns.map(d => `<option value="${esc(d.key)}"${pd === d.key ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select>` : ''}<span class="pcount">${t('pfCount', { n: filtered.length })}</span></div>` : '';
  let lastDay = '';
  const planned = page.map(run => {
    const dk = dayKey(run.at), head = dk !== lastDay ? `<h4 class="day">${dayTitle(run.at)}</h4>` : ''; lastDay = dk;
    return head + plannedCard(run);
  }).join('') + (filtered.length > plimit ? `<button class="btn ghost more" data-pmore>${t('runMoreRuns', { n: filtered.length - plimit })}</button>` : '');
  function plannedCard(run) {
    const d = LOOT.dungeons.find(x => x.key === run.dungeon); if (!d) return '';
    const myMember = run.members.find(m => mineKeys.has(m.key)), iOwn = mineKeys.has(run.by);
    const raid = /Raid|Core|Lair|Naxx|Qiraj|Gurub|Hyjal|Blackwing|Onyxia|WorldBosses/i.test(d.key);
    const left = { tank: 1, heal: 1, dps: 3 }, group = [], wait = [];
    for (const m of run.members) { if (raid) { group.push(m); continue; } if (left[m.role] > 0) { left[m.role]--; group.push(m); } else wait.push(m); }
    const counts = { tank: 0, heal: 0, dps: 0 }; group.forEach(m => counts[m.role] = (counts[m.role] || 0) + 1);
    // composition d'un groupe de 5 : 1 tank, 1 soigneur, 3 dégâts
    const slots = raid ? '' : ['tank', 'heal', 'dps', 'dps', 'dps'].map((role, i) => {
      const filled = role === 'dps' ? counts.dps > i - 2 : counts[role] > 0;
      return `<i class="slot ${role}${filled ? ' on' : ''}" title="${t('role.' + role)}"></i>`; }).join('');
    const full5 = !raid && counts.tank >= 1 && counts.heal >= 1 && counts.dps >= 3;
    const memberRow = m => { const p = byKey.get(m.key); const hs = huntsIn(p, d), me1 = mineKeys.has(m.key);
      return `<li class="${me1 ? 'me' : ''}">${roleIcon(m.role)}<span class="nm" ${p ? `data-c="${esc(m.key)}"` : ''}>${p ? avatar(p) : ''}<span><b>${p ? full(p) : esc(m.key.split('/')[1])}${m.key === run.by ? ` <em>${t('runOrg')}</em>` : ''}</b><small>${p ? `${esc(className(p))} ${p.level} ${fitTag(fitOf(p, d))}` : ''}</small></span></span><span class="its">${itemIcons(hs)}</span>
        ${me1 ? `<span class="myrole">${roleSel(m.role, `data-run-role-change="${esc(run.id)}" data-key="${esc(m.key)}"`)}</span>` : ''}</li>`; };
    // beaucoup de monde : les 8 premiers visibles, le reste replié ; la liste d'attente à part
    const shown = group.slice(0, 8), more = group.slice(8);
    const members = shown.map(memberRow).join('')
      + (more.length ? `<li class="morewrap"><details><summary class="lnk">${t('runMore', { n: more.length })}</summary><ul>${more.map(memberRow).join('')}</ul></details></li>` : '')
      + (wait.length ? `<li class="morewrap"><details class="wl"${wait.some(m => mineKeys.has(m.key)) ? ' open' : ''}><summary class="lnk">${t('runWait', { n: wait.length })}</summary><ul>${wait.map(memberRow).join('')}</ul></details></li>` : '');
    const d0 = new Date(run.at);
    const dateBlock = `<div class="dblock"><span class="dw">${d0.toLocaleDateString(locale(), { weekday: 'short' })}</span><b>${d0.getDate()}</b><span class="dm">${d0.toLocaleDateString(locale(), { month: 'short' })}</span><span class="dt">${d0.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}</span></div>`;
    const joinForm = me.length && !myMember ? `<span class="joinf">${charSel()}${roleSel(left.tank ? 'tank' : left.heal ? 'heal' : 'dps')}<button class="btn gold" data-run-join="${esc(run.id)}">${t('runJoin')}</button>${!raid && !left.tank && !left.heal && !left.dps ? `<small>${t('runFullHint')}</small>` : ''}</span>` : '';
    const edit = iOwn ? `<details class="redit"><summary class="btn ghost">${t('runEdit')}</summary><div class="pform" data-edit="${esc(run.id)}">
        <label>${t('runWhen')}<input type="datetime-local" data-run-at value="${localInput(d0)}" min="${localInput(new Date())}"></label>
        <label>${t('runDungeon')}<select data-run-dun>${[...LOOT.dungeons].sort((a, b) => a.name.localeCompare(b.name)).map(x => `<option value="${esc(x.key)}"${x.key === d.key ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label class="wide">${t('runNote')}<input type="text" maxlength="140" data-run-note value="${esc(run.note || '')}" placeholder="${t('runNotePh')}"></label>
        <button class="btn gold" data-run-save>${t('runSave')}</button></div></details>` : '';
    return `<div class="prun${myMember ? ' mine' : ''}${state.runFocus === run.id ? ' focus' : ''}" id="run-${esc(run.id)}"${artStyle(d.key)}>
      <div class="prh">${dateBlock}<div class="pti"><h3>${esc(d.name)}</h3><span class="when">${relWhen(d0)}${run.edited ? ` · <i>${t('runEdited')}</i>` : ''}</span>
        ${run.note ? `<p class="pnote">« ${esc(run.note)} »</p>` : ''}</div>
        <div class="comp">${slots ? `<div class="slots">${slots}</div>` : ''}<span class="cnt">${full5 ? `<b class="full">${t('runFull')}</b>${wait.length ? ` · ${t('runWaitN', { n: wait.length })}` : ''}` : t('runCount', { n: run.members.length })}</span></div></div>
      <ul>${members}</ul>
      <div class="pact">${joinForm}${myMember ? `<button class="btn ghost" data-run-leave="${esc(run.id)}">${iOwn ? t('runCancel') : t('runLeave')}</button>` : ''}${edit}
        <span class="tools"><button class="lnk" data-run-copy="${esc(run.id)}">${t('runCopy')}</button><button class="lnk" data-run-link="${esc(run.id)}">${t('runLink')}</button><button class="lnk" data-run-ics="${esc(run.id)}">${t('runIcs')}</button></span>
        ${!me.length ? `<small>${t('runLogin')}</small>` : ''}</div></div>`;
  }
  const plannedBlock = `<section class="planned"><div class="cathead"><h3 class="sub">${t('runsPlanned')}</h3>${RUNS === null ? `<span class="cx2">${t('runsApiDown')}</span>` : ''}</div>
    ${state.runMsg ? `<p class="msg">${state.runMsg}</p>` : ''}${pfilters}${planned || `<p class="note">${allRuns.length ? t('pfNone') : t('runsNone')}</p>`}</section>`;

  const card = run => {
    const [lo, , hi] = run.d.lvl || [];
    const ppl = [...run.people], hunters = ppl.filter(([, x]) => x.hunts.length).length;
    const g = suggestGroup(ppl);
    const sorted = ppl.sort(([, a], [, b]) => b.hunts.length - a.hunts.length || (b.missing || 0) - (a.missing || 0));
    const rowOf = ([p, x]) => {
      const mine = me.includes(p);
      return `<li class="${mine ? 'me' : ''}"><span class="nm" data-c="${esc(pkey(p))}">${avatar(p)}<span><b>${full(p)}${mine ? ` <em>${t('runsYou')}</em>` : ''}</b><small>${esc(className(p))} ${p.level} ${fitTag(x.fit)}${p.guild ? ' · ' + esc(p.guild.name) : ''}</small></span></span>
        <span class="its">${itemIcons(x.hunts)}</span><span class="miss">${x.missing != null ? t('runsMissing', { n: x.missing }) : ''}</span></li>`;
    };
    const rows = sorted.slice(0, 6).map(rowOf).join('') + (sorted.length > 6 ? `<li class="morewrap"><details><summary class="lnk">${t('runMore', { n: sorted.length - 6 })}</summary><ul>${sorted.slice(6).map(rowOf).join('')}</ul></details></li>` : '');
    const gp = (role, p) => p ? `<span class="gp">${roleIcon(role)}${esc(p.name)}</span>` : `<span class="gp off">${roleIcon(role)}${t('runsNobody')}</span>`;
    const form = me.length ? `<details class="propose"><summary class="btn ghost">${t('runPropose')}</summary><div class="pform" data-dun="${esc(run.d.key)}">
        <label>${t('runWhen')}<input type="datetime-local" data-run-at value="${localInput(nextEvening())}" min="${localInput(new Date())}"></label>
        <label>${t('runChar')}<select data-run-char>${me.map(p => `<option value="${esc(pkey(p))}">${full(p)} (${p.level})</option>`).join('')}</select></label>
        <label>${t('runRole')}<select data-run-role>${['dps', 'tank', 'heal'].map(x => `<option value="${x}">${t('role.' + x)}</option>`).join('')}</select></label>
        <label class="wide">${t('runNote')}<input type="text" maxlength="140" data-run-note placeholder="${t('runNotePh')}"></label>
        <button class="btn gold" data-run-create>${t('runCreate')}</button></div></details>` : '';
    return `<div class="run"${artStyle(run.d.key)}><div class="rh"><div class="rt"><h3>${esc(run.d.name)}</h3>${lo ? `<span class="lv">${t('runsLvl', { a: lo, b: hi })}</span>` : ''}</div>
        <div class="badges"><span><b>${run.people.size}</b> ${t('runsInterested')}</span>${hunters ? `<span><b>${hunters}</b> ${t('runsHuntersShort')}</span>` : ''}<span><b>≈ ${run.exp.toLocaleString(locale(), { maximumFractionDigits: 1 })}</b> ${t('runsExpShort')}</span>${run.missing ? `<span><b>${fmt(run.missing)}</b> ${t('runsMissShort')}</span>` : ''}</div></div>
      <ul>${rows}</ul>
      <div class="rf"><span class="glabel">${t('runsGroup')}</span>${gp('tank', g.tank)}${gp('heal', g.heal)}${g.dps.map(p => gp('dps', p)).join('')}${form}</div></div>`;
  };
  box.innerHTML = `<div class="head"><h2>${t('runsT')}</h2><span class="note">${t('runsNote')} · Forever ${state.region.toUpperCase()}</span></div>
    ${chips}${note}${plannedBlock}
    <div class="cathead" style="margin-top:22px"><h3 class="sub">${t('runsIdeas')}</h3><span class="cx2">${t('runsIdeasNote')}</span></div>
    ${runs.length ? `<div class="runs">${runs.slice(0, state.ilimit || 8).map(card).join('')}</div>${runs.length > (state.ilimit || 8) ? `<button class="btn ghost more" data-imore>${t('runMoreDun', { n: runs.length - (state.ilimit || 8) })}</button>` : ''}` : `<div class="empty"><b>${t('runsEmptyT')}</b>${t('runsEmpty')}</div>`}
    <p class="runs-src">${t('runsSrc')}</p>`;
  if (state.runFocus && !state.runFocused) { const el = document.getElementById('run-' + state.runFocus); if (el) { state.runFocused = true; el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); } }
}
// actions : filtres, proposer, rejoindre, quitter
async function runAction(path, body) {
  try {
    const r = await Bnet.call(path, body), j = await r.json();
    state.runMsg = r.ok ? t(path === '/runs/create' ? 'runCreated' : path === '/runs/edit' ? 'runSaved' : path === '/runs/join' ? (body.change ? 'runRoleChanged' : 'runJoined') : j.cancelled ? 'runCancelled' : 'runLeft') : t('runErr.' + (j.error || 'x'));
    if (r.ok && j.id) state.runFocus = j.id;
    if (r.ok) { RUNS = j.runs || RUNS; Ribbon.swell(.7); }
  } catch { state.runMsg = t('runErr.x'); }
  renderRuns();
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-rscope]'); if (c) { state.rscope = c.dataset.rscope; renderRuns(); return; }
  if (e.target.closest('[data-rlvl]')) { state.rlvl = !state.rlvl; renderRuns(); return; }
  const pfc = e.target.closest('[data-pf]'); if (pfc) { state.pf = pfc.dataset.pf; state.plimit = 10; renderRuns(); return; }
  if (e.target.closest('[data-pmore]')) { state.plimit = (state.plimit || 10) + 10; renderRuns(); return; }
  if (e.target.closest('[data-imore]')) { state.ilimit = (state.ilimit || 8) + 8; renderRuns(); return; }
  const cr = e.target.closest('[data-run-create]');
  if (cr) { const f = cr.closest('.pform'), at = $('[data-run-at]', f).value;
    if (!at) { state.runMsg = t('runErr.date'); renderRuns(); return; }
    runAction('/runs/create', { dungeon: f.dataset.dun, at: new Date(at).toISOString(), key: $('[data-run-char]', f).value, role: $('[data-run-role]', f).value, note: $('[data-run-note]', f).value });
    return; }
  const jn = e.target.closest('[data-run-join]');
  if (jn) { const f = jn.closest('.joinf'); runAction('/runs/join', { id: jn.dataset.runJoin, key: $('[data-run-char]', f).value, role: $('[data-run-role]', f).value }); return; }
  const lv = e.target.closest('[data-run-leave]');
  if (lv) { if (lv.textContent === t('runCancel') && !confirm(t('runCancelQ'))) return; runAction('/runs/leave', { id: lv.dataset.runLeave }); return; }
  const sv = e.target.closest('[data-run-save]');
  if (sv) { const f = sv.closest('.pform'), at = $('[data-run-at]', f).value;
    runAction('/runs/edit', { id: f.dataset.edit, ...(at ? { at: new Date(at).toISOString() } : {}), dungeon: $('[data-run-dun]', f).value, note: $('[data-run-note]', f).value }); return; }
  const run = id => (RUNS || []).find(x => x.id === id);
  const cp = e.target.closest('[data-run-copy]');
  if (cp) { const x = run(cp.dataset.runCopy); if (x) navigator.clipboard?.writeText(runText(x)).then(() => { cp.textContent = t('runCopied'); setTimeout(() => cp.textContent = t('runCopy'), 1800); }); return; }
  const ln = e.target.closest('[data-run-link]');
  if (ln) { navigator.clipboard?.writeText(runUrl(ln.dataset.runLink)).then(() => { ln.textContent = t('runCopied'); setTimeout(() => ln.textContent = t('runLink'), 1800); }); return; }
  const ic = e.target.closest('[data-run-ics]'); if (ic) { const x = run(ic.dataset.runIcs); if (x) runIcs(x); }
});
document.addEventListener('change', e => {
  const pds = e.target.closest('[data-pd]'); if (pds) { state.pd = pds.value; state.plimit = 10; renderRuns(); return; }
  const sel = e.target.closest('[data-run-role-change]');
  if (sel) runAction('/runs/join', { id: sel.dataset.runRoleChange, key: sel.dataset.key, role: sel.value, change: true });
});


/* ---------- Nouveautés ---------- */
function renderNews() {
  const box = $('#news-list');
  if (!NEWS) { box.innerHTML = `<div class="empty">${t('loading')}</div>`; return; }
  if (!NEWS.versions?.length) { box.innerHTML = `<div class="empty"><b>${t('newsFailT')}</b>${t('newsFail')}</div>`; return; }
  box.innerHTML = NEWS.versions.map((v, i) => `
    <div class="release${i > 1 ? ' more' : ''}">
      <div class="ver">${esc(v.version)}${i === 0 ? `<small>${t('latest')}</small>` : ''}</div>
      <div>${v.sections.map(s => `${s.title ? `<h4>${esc(s.title.toUpperCase())}</h4>` : ''}<ul>${s.items.map(x => `<li>${x}</li>`).join('')}</ul>`).join('')}
        ${i > 1 ? `<span class="toggle">${t('showMore')}</span>` : ''}</div>
    </div>`).join('') +
    `<p style="margin:18px 0 0;color:var(--faint);font-style:italic">${t('fullHistory')} <a href="https://github.com/Raykuilu/Dropamine/blob/main/CHANGELOG.md" rel="noopener">GitHub</a>.</p>`;
}
document.addEventListener('click', e => { const a = e.target.closest('[data-sec]'); if (!a) return; e.preventDefault(); document.getElementById(a.dataset.sec)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });
document.addEventListener('change', e => { const sel = e.target.closest('[data-gs]'); if (!sel) return; state.gs = sel.value; renderGuild(); animate($('#guild-panel')); });
document.addEventListener('click', e => { const x = e.target.closest('.release.more .toggle'); if (x) { x.closest('.release').classList.remove('more'); x.remove(); } });

/* ---------- Texte fixe traduit (data-t) et pied de page ---------- */
function applyStatic() {
  $$('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  $$('[data-t-title]').forEach(el => { el.title = t(el.dataset.tTitle); el.setAttribute('aria-label', t(el.dataset.tTitle)); });
  $$('[data-t-ph]').forEach(el => { el.placeholder = t(el.dataset.tPh); el.setAttribute('aria-label', t(el.dataset.tPh)); });
  $('#lang').textContent = LANG === 'fr' ? 'EN' : 'FR';
  $('#lang').title = LANG === 'fr' ? 'English' : 'Français';
  if (DATA.updated) $('#updated').textContent = t('updated', { d: new Date(DATA.updated).toLocaleDateString(locale(), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) });
  const v = NEWS?.versions?.[0]?.version;
  if (v) $$('[data-meta]').forEach(el => {
    const link = el.querySelector('a');   // le lien « café » survit à la mise à jour du numéro de version
    el.textContent = (el.closest('[lang]').lang === 'fr' ? I18N.meta[1] : I18N.meta[0]).replace('{v}', v) + (link ? ' · ' : '');
    if (link) el.append(link);
  });
}

/* ======================================================================
   Connexion Battle.net (api.dropamine.app) : n'apparaît que si le service répond.
   ====================================================================== */
const API = 'https://api.dropamine.app';
Object.assign(I18N, {
  bnTitle: ['Register with Battle.net', 'Inscription avec Battle.net'],
  bnPitch: ['Sign in with Blizzard: your Forever characters are listed, tick the ones to show. We never see your password.',
    'Connecte-toi chez Blizzard : tes personnages Forever s\'affichent, coche ceux à montrer. Nous ne voyons jamais ton mot de passe.'],
  bnLogin: ['Sign in with Battle.net', 'Se connecter avec Battle.net'], bnLogout: ['Sign out', 'Se déconnecter'],
  bnNone: ['No Forever character on this account (level 10+, logged out at least once).', 'Aucun personnage Forever sur ce compte (niveau 10 minimum, déconnecté au moins une fois).'],
  bnListed: ['LISTED', 'INSCRIT'], bnPreview: ['GUILD PREVIEW', 'APERÇU'], bnHidden: ['HIDDEN', 'MASQUÉ'], bnLow: ['level 10 required', 'niveau 10 requis'],
  bnAdd: ['Register selected', 'Inscrire la sélection'], bnRemove: ['Remove selected', 'Retirer la sélection'],
  bnDone: ['Done: {n} character{s} updated. The Hiscores refresh within a few minutes.', 'C\'est fait : {n} personnage{s} mis à jour. Les classements se rafraîchissent d\'ici quelques minutes.'],
  bnError: ['Something went wrong. Try again in a moment.', 'Un problème est survenu. Réessaie dans un instant.'],
  bnAuthError: ['Battle.net sign-in did not complete. Try again.', 'La connexion Battle.net n\'a pas abouti. Réessaie.'],
  bnDown: ['Battle.net sign-in is unavailable right now. Try again later, or use the GitHub form below.',
    'La connexion Battle.net est indisponible pour le moment. Réessaie plus tard, ou utilise le formulaire GitHub ci-dessous.'],
  upTitle: ['Exact score with Dropamine', 'Score exact avec Dropamine'],
  upPitch: ['In game, type /drop hiscores, copy the export (Ctrl+C) and paste it here. Your real weapon skills replace the estimate.',
    'En jeu, tape /drop hiscores, copie la ligne (Ctrl+C) et colle-la ici. Tes vraies compétences d\'armes remplacent l\'estimation.'],
  upSend: ['Update my logbook', 'Mettre à jour mon carnet'], upPh: ['DROPAMINE-HS1:…', 'DROPAMINE-HS1:…'],
  upOk: ['Received: {w} weapon skill points ({n} weapons). The Hiscores refresh within a few minutes.',
    'Reçu : {w} points de compétences d\'armes ({n} armes). Les classements se rafraîchissent d\'ici quelques minutes.'],
  upErr: {
    format: ['This is not a Dropamine export. Copy the whole first row of the /drop hiscores window.', 'Ce n\'est pas une ligne Dropamine. Copie toute la première ligne de la fenêtre /drop hiscores.'],
    checksum: ['This export was cut or modified. Copy it again from the game.', 'Cette ligne est tronquée ou modifiée. Recopie-la depuis le jeu.'],
    values: ['These values are not possible for this level.', 'Ces valeurs sont impossibles pour ce niveau.'],
    'not-yours': ['This character is not on your Battle.net account (same region and first name).', 'Ce personnage n\'est pas sur ton compte Battle.net (même région et même prénom).'],
    level: ['Level 10 is required.', 'Le niveau 10 est requis.'],
  },
});
const Bnet = (() => {
  let alive = null, me = null, msg = '', upMsg = '';
  // affiché sur le site : inscrit, ou en aperçu de guilde (et pas masqué) ; coché = affiché
  const previewed = c => !c.registered && !c.optout && DATA.players.some(p => p.preview && pkey(p) === c.key);
  const shown = c => !!c.registered || previewed(c);
  const box = () => $('#bnet');
  const call = (path, body) => fetch(API + path, body ? { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'include' });
  async function probe() {
    if (alive !== null) return alive;
    try { alive = (await fetch(API + '/health', { cache: 'no-store' })).ok; } catch { alive = false; }
    return alive;
  }
  async function load() {
    try { const r = await call('/me'); me = r.ok ? await r.json() : null; } catch { me = null; }
  }
  function draw() {
    const b = box(); b.hidden = false;
    if (!alive) { b.innerHTML = `<div class="head"><h2>${t('bnTitle')}</h2></div><p class="lead">${t('bnDown')}</p>`; return; }
    if (!me) {
      b.innerHTML = `<div class="head"><h2>${t('bnTitle')}</h2></div><p class="lead">${t('bnPitch')}</p>
        <a class="btn bnet-btn" href="${API}/auth/login">${t('bnLogin')}</a>${msg ? `<p class="msg">${msg}</p>` : ''}`;
      return;
    }
    const chars = me.characters || [];
    b.innerHTML = `<div class="who-bn"><b>${esc(me.battletag || 'Battle.net')}</b><a data-bn="logout">${t('bnLogout')}</a></div>
      ${chars.length ? `<div class="list">${chars.map(c => `<label class="${c.level < 10 ? 'off' : ''}${shown(c) ? ' on' : ''}"><input type="checkbox" value="${esc(c.key)}" ${c.level < 10 ? 'disabled' : ''} ${shown(c) ? 'checked' : ''}>
        <span><b>${esc(c.name || c.slug)} ${esc(c.surname || '')}</b><small>${esc(c.region.toUpperCase())} · ${esc(L2(CLASS[c.classId]) || '')} ${c.level}${c.level < 10 ? ' · ' + t('bnLow') : ''}</small></span>
        ${c.registered ? `<span class="tagged">${t('bnListed')}</span>` : previewed(c) ? `<span class="tagged pv">${t('bnPreview')}</span>` : c.optout ? `<span class="tagged off">${t('bnHidden')}</span>` : ''}</label>`).join('')}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn gold" data-bn="claim">${t('bnAdd')}</button><button class="btn ghost" data-bn="release">${t('bnRemove')}</button></div>`
        : `<p class="msg">${t('bnNone')}</p>`}
      ${msg ? `<p class="msg">${msg}</p>` : ''}
      ${chars.length ? `<div class="paste"><h3>${t('upTitle')}</h3><p>${esc(t('upPitch')).replace('/drop hiscores', '<code>/drop hiscores</code>')}</p>
        <textarea id="hsline" spellcheck="false" placeholder="${t('upPh')}"></textarea>
        <button class="btn gold" data-bn="upload">${t('upSend')}</button>${upMsg ? `<p class="msg">${upMsg}</p>` : ''}</div>` : ''}`;
  }
  async function show() {
    if (!(await probe())) { draw(); return; }
    const q = new URLSearchParams(location.search);
    if (q.get('bnet') === 'error') msg = t('bnAuthError');
    await load(); draw(); header();
  }
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-bn]'); if (!el) return;
    e.preventDefault(); const act = el.dataset.bn;
    if (act === 'logout') { await call('/logout', {}).catch(() => {}); me = null; msg = ''; upMsg = ''; draw(); header(); return; }
    if (act === 'upload') {
      const line = $('#hsline')?.value.trim(); if (!line) return;
      el.setAttribute('disabled', '');
      try {
        const r = await call('/upload', { line }), j = await r.json();
        upMsg = r.ok ? t('upOk', { w: fmt(j.weapons), n: j.count }) : L2(I18N.upErr[j.error] || I18N.bnError);
        if (r.ok) Ribbon.swell(.8);
      } catch { upMsg = t('bnError'); }
      await load(); draw(); header(); return;
    }
    const checked = $$('#bnet input:checked').map(i => i.value), all = $$('#bnet input').map(i => i.value);
    const keys = act === 'claim' ? checked.filter(k => !me.characters.find(c => c.key === k)?.registered)
      : all.filter(k => !checked.includes(k) && shown(me.characters.find(c => c.key === k) || {}));
    if (!keys.length) return;
    $$('#bnet [data-bn]').forEach(x => x.setAttribute('disabled', ''));
    try {
      const r = await call('/' + act, { keys });
      const j = await r.json();
      msg = r.ok ? t('bnDone', { n: (j.done || []).length }) : t('bnError');
      Ribbon.swell(.8);
    } catch { msg = t('bnError'); }
    await load(); draw(); header();
  });
  // Compte connecté : bouton de l'en-tête, onglet « Mon personnage », fiches à soi
  const mine = () => me ? DATA.players.filter(p => me.characters?.some(c => c.key === pkey(p)) && !p.optout) : [];
  const best = () => [...mine()].sort((a, b) => b.total - a.total)[0] ? pkey([...mine()].sort((a, b) => b.total - a.total)[0]) : '';
  const isMine = key => mine().some(p => pkey(p) === key);
  function header() {
    const a = $('#acct'); if (!a) return;
    const tag = me?.battletag ? me.battletag.split('#')[0] : '';
    a.classList.toggle('on', !!me);
    a.querySelector('span').textContent = tag || t('acct.in');
    a.title = me ? t('foot.join') : t('acct.in');
    const tab = $('.tabs [data-view="char"]'); if (tab) tab.hidden = !mine().length;
  }
  async function init() { if (await probe()) await load(); }
  // déconnexion depuis la barre de navigation
  $('#acct-out')?.addEventListener('click', async () => {
    await call('/logout', {}).catch(() => {}); me = null; msg = ''; upMsg = '';
    render(false); Ribbon.swell(.6);
  });
  async function refresh() { await load(); render(false); }
  return { show, init, header, mine, best, isMine, refresh, call, logged: () => !!me };
})();

/* ---------- Animations d'arrivée ---------- */
function animate(view) {
  $$('.tri i,.prof .bar i,.mbar i', view).forEach((el, i) => {
    const target = getComputedStyle(el).getPropertyValue('--w');
    if (reduce) { el.style.width = target; return; }
    el.style.width = '0'; requestAnimationFrame(() => setTimeout(() => { el.style.width = target; }, 60 + i * 18));
  });
  if (reduce) return;
  $$('[data-n]', view).forEach(el => {
    const n = +el.dataset.n, t0 = performance.now();
    (function step(now) { const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3);
      el.firstChild.nodeValue = fmt(n * e); if (k < 1) requestAnimationFrame(step); })(t0);
  });
}
const io = 'IntersectionObserver' in window && !reduce
  ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' }) : null;
$$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

/* ---------- Navigation : l'adresse porte l'état (partage, retour arrière) ---------- */
const tabs = $$('.tabs button');
function readUrl() {
  const q = new URLSearchParams(location.search);
  const v = q.get('p');
  state.view = VIEWS.includes(v) ? v : (q.get('bnet') ? 'join' : q.get('c') ? 'char' : q.get('g') ? 'guild' : 'home');
  state.region = ['eu', 'us', 'tw'].includes(q.get('r')) ? q.get('r') : 'eu';
  state.skill = q.get('s') || 'total'; state.cls = +q.get('cl') || 0; state.rs = +q.get('m') || 0;
  state.c = q.get('c') || state.c; state.g = q.get('g') || '';
}
function writeUrl(push) {
  if (SHOT) return;
  const q = new URLSearchParams();
  if (state.view !== 'home') q.set('p', state.view);
  if (state.region !== 'eu') q.set('r', state.region);
  if (state.view === 'rank') { if (state.skill !== 'total') q.set('s', state.skill); if (state.cls) q.set('cl', state.cls); if (state.rs) q.set('m', state.rs); }
  if (state.view === 'char' && state.c) q.set('c', state.c);
  if (state.view === 'guild' && state.g) q.set('g', state.g);
  history[push ? 'pushState' : 'replaceState'](null, '', q.toString() ? '?' + q : location.pathname);
}
const RENDER = { rank: renderRank, char: renderChar, guild: renderGuild, runs: renderRuns, news: renderNews, join: () => Bnet.show() };
const TITLES = { rank: 'tab.rank', char: 'tab.char', guild: 'tab.guild', runs: 'tab.runs', news: 'tab.news', get: 'btn.download', join: 'foot.join', privacy: 'foot.privacy' };
function render(push) {
  applyStatic();
  renderHome();
  (RENDER[state.view] || (() => {}))();
  tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.view === state.view && (b.dataset.view !== 'char' || Bnet.isMine(state.c))));
  Bnet.header();
  $$('.view').forEach(v => v.classList.toggle('on', v.id === state.view));
  $('#sub').textContent = `HISCORES · FOREVER ${state.region.toUpperCase()}`;
  $('#region').value = state.region;
  document.title = state.view === 'home' ? t('title') : `${t(TITLES[state.view])} · Dropamine`;
  animate($('#' + state.view));
  // dons : seulement sur les pages de l'addon, jamais à côté des données Blizzard (classements, fiches, guildes)
  $('#foot-coffee').hidden = !['home', 'get', 'news'].includes(state.view);
  writeUrl(push);
}
function go(patch) {
  const changedView = patch.view && patch.view !== state.view;
  Object.assign(state, patch); render(true);
  Ribbon.swell(changedView ? 1 : .45);
  if (changedView) scrollTo({ top: Math.min(scrollY, $('.nav').offsetTop), behavior: reduce ? 'auto' : 'smooth' });
}
function setLang(l) {
  LANG = l; document.documentElement.lang = l; document.documentElement.dataset.lang = l;
  try { localStorage.setItem('lang', l); } catch (e) { /* stockage indisponible : le choix vaut pour cette visite */ }
  render(false); Ribbon.swell(.6);
}
tabs.forEach(b => b.addEventListener('click', () => go(b.dataset.view === 'char' ? { view: 'char', c: Bnet.best() } : { view: b.dataset.view })));
$('#region').addEventListener('change', e => go({ region: e.target.value, cls: 0, g: '' }));
$('#lang').addEventListener('click', () => setLang(LANG === 'fr' ? 'en' : 'fr'));
document.addEventListener('click', e => {
  if (e.button || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const el = e.target.closest('[data-view-link],[data-skill],[data-cls],[data-rs],[data-c],[data-g]');
  if (!el || el.closest('.suggest')) return;
  e.preventDefault();
  const d = el.dataset;
  if (d.viewLink) go({ view: d.viewLink });
  else if (d.skill) go({ skill: d.skill });
  else if (d.cls !== undefined) go({ cls: +d.cls });
  else if (d.rs !== undefined) go({ rs: +d.rs, cls: 0 });
  else if (d.c) go({ view: 'char', c: d.c });
  else if (d.g !== undefined) go({ view: 'guild', g: d.g });
});
addEventListener('popstate', () => { readUrl(); render(false); Ribbon.swell(.6); });

/* ---------- Recherche ---------- */
(function search() {
  const input = $('#q'), box = $('#suggest'); let hits = [], hl = 0;
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const draw = () => {
    box.innerHTML = hits.length ? hits.map((p, i) => `<a href="?p=char&c=${esc(pkey(p))}" class="${i === hl ? 'hl' : ''}" data-key="${esc(pkey(p))}">${full(p)}<small>${esc((p.region || 'eu').toUpperCase())} · ${who(p)}</small></a>`).join('')
      : `<div class="none">${t('noSearch')}</div>`;
    box.classList.toggle('on', input.value.trim().length > 0);
  };
  const pick = p => { input.value = ''; box.classList.remove('on'); input.blur(); go({ view: 'char', c: pkey(p), region: p.region || 'eu' }); };
  input.addEventListener('input', () => {
    const q = fold(input.value.trim()); hl = 0;
    hits = q ? DATA.players.filter(p => fold(`${p.name} ${p.surname} ${p.slug}`).includes(q)).slice(0, 8) : [];
    draw();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { hl = Math.min(hits.length - 1, hl + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { hl = Math.max(0, hl - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && hits[hl]) pick(hits[hl]);
    else if (e.key === 'Escape') { box.classList.remove('on'); input.blur(); }
  });
  box.addEventListener('mousedown', e => { const a = e.target.closest('a[data-key]'); if (a) { e.preventDefault(); pick(DATA.players.find(p => pkey(p) === a.dataset.key)); } });
  input.addEventListener('blur', () => setTimeout(() => box.classList.remove('on'), 120));
})();

/* ---------- Démarrage ---------- */
const BOOT_RUN = new URLSearchParams(location.search).get('run');   // lien direct vers un run prévu
if (BOOT_RUN) state.runFocus = BOOT_RUN;
const BOOT_HSIMG = new URLSearchParams(location.search).get('hsimg');   // lien direct vers l'image Hiscores (lu avant que l'adresse soit réécrite)
readUrl();
render(false);
Ribbon.load(true);
Promise.all([
  fetch('data/hiscores.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(d => { DATA = d; })
    .catch(() => { DATA = { players: [], failed: true }; }),
  fetch('data/changelog.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(d => { NEWS = d; })
    .catch(() => { NEWS = { versions: [] }; }),
  Bnet.init(),
]).then(() => { Ribbon.load(false); return document.fonts.ready; })
  .then(() => { render(false); Ribbon.swell(.7); const hs = BOOT_HSIMG; const hp = hs && DATA.players.find(x => pkey(x) === hs); if (hp) HsImage.open(hp); });

/* ---------- Application installable (PWA) ---------- */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
// bouton « Installer l'app » quand le navigateur le propose (Android, Chrome, Edge) ; sur iPhone : Partager → Sur l'écran d'accueil
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const b = $('#install'); if (b) b.hidden = false; });
addEventListener('appinstalled', () => { installEvt = null; const b = $('#install'); if (b) b.hidden = true; });
document.addEventListener('click', async e => {
  if (!e.target.closest('#install')) return;
  if (installEvt) { installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; e.target.closest('#install').hidden = true; }
});
