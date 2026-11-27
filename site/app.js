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
// 7 langues. Anglais et français sont dans le code et dans la page ; les autres viennent de data/i18n/<langue>.json
// (textes du site par clé, petits noms par leur texte anglais, blocs de la page) et data/i18n/items.<langue>.json,
// chargés seulement pour la langue choisie. Ce qui manque s'affiche en anglais.
const LANGS = ['en', 'fr', 'de', 'es', 'it', 'pt', 'ru'];
const LANG_NAMES = { en: 'English', fr: 'Français', de: 'Deutsch', es: 'Español', it: 'Italiano', pt: 'Português', ru: 'Русский' };
let LANG = LANGS.includes(document.documentElement.dataset.lang) ? document.documentElement.dataset.lang : 'en';
const li = () => Math.max(0, LANGS.indexOf(LANG));
let I18X = null, ITEMX = null;   // langue en plus : textes et noms, puis ses objets
const extra = () => LANG !== 'en' && LANG !== 'fr';
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
  tipEst: ['Estimated: equipped weapon counted at its maximum', 'Estimé : arme équipée comptée au maximum'], 'tab.guild': ['Guilds', 'Guildes'], 'tab.runs': ['Groups', 'Groupes'],
  runsT: ['Find a group', 'Trouver un groupe'],
  runsPlanned: ['Planned outings', 'Sorties prévues'], runsNone: ['No outing planned yet: propose one below.', 'Aucune sortie prévue pour l’instant : propose-en une plus bas.'],
  runsApiDown: ['service unavailable', 'service indisponible'], runsIdeas: ['Worth running', 'À faire en groupe'],
  runsIdeasNote: ['who needs which dungeon: wanted items and collection gaps', 'qui a besoin de quel donjon : objets recherchés et trous du carnet'],
  runsMyLvl: ['At my level', 'À mon niveau'], runsInterested: ['interested', 'intéressés'], runsHuntersShort: ['want an item', 'veulent un objet'],
  runsExpShort: ['wanted items / outing', 'objets recherchés / sortie'], runsMissShort: ['missing in logs', 'manquants aux logs'],
  runsMissing: ['{n} missing', '{n} manquants'], runsGroup: ['Suggested group', 'Groupe suggéré'], runsNobody: ['nobody', 'personne'],
  fitOk: ['right level', 'bon niveau'], fitHigh: ['over level', 'au-dessus'],
  'role.tank': ['Tank', 'Tank'], 'role.heal': ['Healer', 'Soigneur'], 'role.dps': ['Damage', 'Dégâts'],
  runPropose: ['Propose an outing', 'Proposer une sortie'], optDun: ['Dungeons', 'Donjons'], optRaid: ['Raids', 'Raids'], optAct: ['Other activities', 'Autres activités'], needPlaces: ['{n} place{s}', '{n} place{s}'], runProposeAny: ['Propose an outing (dungeon, raid or activity)', 'Proposer une sortie (donjon, raid ou activité)'], runDunPick: ['Dungeon or raid', 'Donjon ou raid'], runWhen: ['When', 'Quand'], runChar: ['Character', 'Personnage'], runRole: ['Role', 'Rôle'],
  runNote: ['Note', 'Note'], runNotePh: ['e.g. full clear, Pummeler farm', 'ex. : full clear, farm du Faucheur'], runCreate: ['Create the outing', 'Créer la sortie'],
  runJoin: ['Join', 'S’inscrire'], runIcsTitle: ['Group: {d} (WoW Forever)', 'Groupe : {d} (WoW Forever)'], runMore: ['{n} more', '{n} de plus'], runWait: ['Waiting list ({n})', 'Liste d’attente ({n})'], runWaitN: ['{n} waiting', '{n} en attente'],
  runFullHint: ['Group complete: you will be on the waiting list.', 'Groupe complet : tu passeras en liste d’attente.'],
  runMoreRuns: ['Show {n} more outings', 'Voir {n} sorties de plus'], runMoreDun: ['Show {n} more dungeons', 'Voir {n} donjons de plus'],
  pfAll: ['All', 'Tous'], pfMine: ['My outings', 'Mes sorties'], pfOpen: ['Open spots', 'Places libres'], pfAllDun: ['All dungeons', 'Tous les donjons'],
  pfCount: ['{n} outing{s}', '{n} sortie{s}'], pfNone: ['No outing matches these filters.', 'Aucune sortie ne correspond à ces filtres.'],
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
  'runErr.x': ['Something went wrong, try again.', 'Ça n’a pas marché, réessaie.'], runsNote: ['players who need the same dungeons as you', 'les joueurs qui doivent faire les mêmes donjons que toi'],
  runsGuild: ['My guild', 'Ma guilde'], runsAll: ['All players', 'Tous les joueurs'], runsHunters: ['{n} want an item', '{n} veulent un objet'], runsHunter1: ['1 wants an item', '1 veut un objet'],
  runsExp: ['≈ {n} wanted items per run', '≈ {n} objets recherchés par run'], runsLvl: ['level {a}–{b}', 'niveau {a}–{b}'], runsYou: ['you', 'toi'],
  runsLow: ['too low', 'trop bas'], runsTrash: ['trash', 'monstres'], runsEmptyT: ['Nobody has shared yet', 'Personne n’a encore partagé'],
  runsEmpty: ['In game, add the items you want (Hunt tab), type /drop hiscores and paste the line on the Join page: you then show up here with everyone who needs the same dungeons.', 'En jeu, ajoute les objets que tu veux (onglet Chasse), tape /drop hiscores et colle la ligne sur la page Inscription : tu apparais alors ici avec tous ceux qui ont besoin des mêmes donjons.'],
  runsNoGuild: ['Nobody in your guild has shared yet: showing all players.', 'Personne de ta guilde n’a encore partagé : tous les joueurs sont affichés.'],
  runsSrc: ['Loot tables: AtlasLoot Forever (GPL-2.0).', 'Tables de butin : AtlasLoot Forever (GPL-2.0).'],
  'tab.news': ["What's new", 'Nouveautés'], 'btn.download': ['Download', 'Télécharger'], 'search.ph': ['Find a character…', 'Chercher un personnage…'],
  'foot.addon': ['THE ADDON', "L'ADDON"], 'foot.join': ['Join or leave', "S'inscrire ou se retirer"], 'foot.privacy': ['Privacy', 'Confidentialité'], 'foot.about': ['About', 'À propos'], newsEnOnly: ['', 'en anglais'], 'foot.code': ['Site source (open source, MIT)', 'Code du site (open source, MIT)'], 'foot.coffee': ['Buy me a coffee', "M'offrir un café"],
  total: ['Total level', 'Niveau total'], level: ['Level', 'Niveau'], defense: ['Defense', 'Défense'],
  'g.lvl': ['LEVEL', 'NIVEAU'], 'g.wpn': ['WEAPONS & DEFENSE', 'ARMES ET DÉFENSE'], 'g.prf': ['PROFESSIONS', 'MÉTIERS'], 'g.pvp': ['PVP', 'JCJ'], duelsWonT: ['Duels won', 'Duels gagnés'],
  hpkT: ['Honor per kill', 'Honneur par victoire'], hpkNote: ['this week, from 10 honorable kills · high = opponents your size or stronger', 'cette semaine, dès 10 victoires honorables · élevé = des adversaires à ta taille ou plus forts'],
  hpkSub: ['{h} honor for {k} kills this week', '{h} d’honneur pour {k} victoires cette semaine'],
  pvWeeksT: ['Honor per kill, week by week', 'Honneur par victoire, semaine par semaine'], pvWeekOf: ['Week of {d}', 'Semaine du {d}'],
  'foot.trfb': ['Report a translation mistake', 'Signaler une erreur de traduction'], trfbTitle: ['Translation mistake', 'Erreur de traduction'],
  trfbBody: ['Thanks for helping! Copy the wrong text and write the right one (site or addon).', 'Merci de ton aide ! Copie le texte faux et écris le bon (site ou addon).'],
  trfbPage: ['Page:', 'Page :'], trfbLang: ['Language:', 'Langue :'], trfbWrong: ['Wrong text:', 'Texte faux :'], trfbRight: ['Right text:', 'Bon texte :'],
  pendTitle: ['From your /drop hiscores line, waiting for the armory', 'De ta ligne /drop hiscores, en attente de l’armurerie'],
  pendTip: ['{v} in your line, waiting for the armory', '{v} dans ta ligne, en attente de l’armurerie'],
  pendTotal: ['+{n} from your line, waiting for the armory', '+{n} de ta ligne, en attente de l’armurerie'],
  pendTotal2: ['official: {o} · +{n} from your line, waiting for the armory', 'officiel : {o} · +{n} de ta ligne, en attente de l’armurerie'],
  hpkOk: ['armory', 'armurerie'], hpkOkTip: ['Kills checked against the Blizzard armory (last 7 days)', 'Victoires recoupées avec l’armurerie Blizzard (7 derniers jours)'],
  hpkPend: ['not checked yet', 'pas encore vérifié'], hpkPendTip: ['Checked against the Blizzard armory after a few days of history', 'Recoupé avec l’armurerie Blizzard après quelques jours d’historique'], duelsNote: ['won – lost', 'gagnés – perdus'], 'g.stat': ['STATISTICS', 'STATISTIQUES'], 'g.book': ['DROPAMINE PROGRESS', 'PROGRESSION DROPAMINE'],
  trust: ['Sent by the players with their Dropamine export: based on trust.', 'Envoyé par les joueurs avec leur ligne Dropamine : basé sur la confiance.'],
  sortBy: ['Rank by', 'Classer par'], trustShort: ['based on trust', 'basé sur la confiance'],
  kills: ['Creatures killed', 'Créatures tuées'], killingBlows: ['Killing blows', 'Coups fatals'], dungeons: ['Dungeons entered', 'Donjons visités'],
  pvpDeaths: ['Killed by players', 'Tué par des joueurs'], duels: ['Duels (won / lost)', 'Duels (gagnés / perdus)'],
  repsT: ['Reputations', 'Réputations'],
  stT: ['Get started', 'Bien démarrer'], stN: ['{n} / {m} done', '{n} / {m} fait'],
  stLead: ['Four steps, and the site can match you with players who need the same dungeons.', 'Quatre étapes, et le site peut te mettre en relation avec ceux qui doivent faire les mêmes donjons.'],
  st1: ['Sign in with Battle.net', 'Connexion Battle.net'], st1d: ['Done: the site knows your Forever characters.', 'C’est fait : le site connaît tes personnages Forever.'],
  st2: ['Register your character', 'Inscrire ton personnage'], st2d: ['Level 10 or more, visible on the armory. It shows up after the next armory read.', 'Niveau 10 ou plus, visible sur l’armurerie. Il apparaît au relevé suivant.'], st2a: ['Register', 'Inscrire'],
  st3: ['Send your game export', 'Envoyer ton export du jeu'], st3d: ['Install the addon, type /drop hiscores in game and paste the line.', 'Installe l’addon, tape /drop hiscores en jeu et colle la ligne.'], st3a: ['Paste my line', 'Coller ma ligne'],
  st4: ['Show what you need', 'Montrer ce qu’il te manque'], st4d: ['Your collection log and wanted items: others who need the same dungeons can then find you.', 'Ton carnet et tes objets recherchés : ceux qui ont besoin des mêmes donjons te trouvent.'], st4a: ['See the same dungeons', 'Voir les mêmes donjons'],
  agoLt1h: ['less than an hour ago', 'il y a moins d’une heure'], agoH: ['{n} h ago', 'il y a {n} h'], freshArm: ['Armory read {d} (once a day)', 'Armurerie relue {d} (une fois par jour)'],
  freshExp: ['game export: {d}', 'export du jeu : {d}'], freshNoExp: ['no game export yet', 'pas encore d’export du jeu'],
  runW: ['Copy the /w', 'Copier le /w'], runGame: ['Reminder in game', 'Rappel dans le jeu'], wAny: ['any role', 'n’importe quel rôle'],
  wMsg: ['Hi! I’d like to join your {d} outing ({h}), as {r}.', 'Salut ! Je viens pour ta sortie {d} ({h}), en {r}.'],
  nTitle: ['Notifications', 'Notifications'], nPushOff: ['Turn on on this device', 'Activer sur cet appareil'], nPushOn: ['On for this device', 'Activées sur cet appareil'],
  nSoundOff: ['Sound off', 'Son coupé'], nSoundOn: ['Sound on', 'Son activé'], nDenied: ['Blocked by the browser', 'Bloquées par le navigateur'],
  nNoPush: ['This browser cannot receive notifications when the site is closed.', 'Ce navigateur ne reçoit pas de notifications site fermé.'],
  nIos: ['On iPhone: first add the site to your home screen (Share → Add to Home Screen), then open it from there.', 'Sur iPhone : ajoute d’abord le site à l’écran d’accueil (Partager → Sur l’écran d’accueil), puis ouvre-le depuis là.'],
  nHint: ['Joins and departures on your outings, a freed spot, a full group, a reminder 30 min before.', 'Arrivées et départs dans tes sorties, place libérée, groupe complet, rappel 30 min avant.'],
  nJoin: ['joins your {d} outing', 'rejoint ta sortie {d}'], nLeave: ['leaves your {d} outing', 'quitte ta sortie {d}'], nCancel: [': outing cancelled', ' : sortie annulée'],
  nSoon: ['starts in {n} min', 'commence dans {n} min'],
  rtabRuns: ['Planned outings', 'Sorties prévues'], rtabIdeas: ['Same dungeons', 'Mêmes donjons'], pfAtLvl: ['{n} at your level', '{n} à ton niveau'], needT: ['needs {x}', 'cherche {x}'], needDps: ['{n} dps', '{n} dégât{s}'],
  runIn: ['Signed up', 'Inscrit'], runWaitBtn: ['Waitlist', 'Attente'], runSee: ['See', 'Voir'], runBy: ['by {n}', 'par {n}'],
  raidK: ['FOREVER · RAIDS', 'FOREVER · RAIDS'], raidT: ['Raids open soon', 'Les raids ouvrent bientôt'], raidSub: ['Barrow Deeps (10), Hyjal Summit (20) and Onyxia’s Lair (40, attunement) open on {d}, level 60. Time not announced yet.', 'Barrow Deeps (10), Hyjal Summit (20) et le Repaire d’Onyxia (40, harmonisation) ouvrent le {d}, niveau 60. Heure pas encore annoncée.'],
  raidOpenT: ['Raids are open!', 'Les raids sont ouverts !'], raidOpenSub: ['Barrow Deeps, Hyjal Summit and Onyxia’s Lair: get your group together.', 'Barrow Deeps, Hyjal Summit et le Repaire d’Onyxia : rassemble ton groupe.'],
  cdD: ['days', 'jours'], cdH: ['hours', 'heures'], cdM: ['min', 'min'], cdS: ['sec', 's'],
  raidSugNote: ['Raids are left out until they open on {d}; only Onyxia will then be suggested (the other raids are not in the loot tables yet).', 'Les raids sont écartés jusqu’à leur ouverture le {d} ; seul Onyxia sera alors suggéré (les autres raids ne sont pas encore dans les tables de butin).'],
  hsQ: ['Dungeon, boss, item, player…', 'Donjon, boss, objet, joueur…'], hsLvl: ['Level', 'Niveau'], hsLvlAll: ['All levels', 'Tous niveaux'], hsLvlMe: ['My level', 'À mon niveau'], hsLvlBand: ['Level {a}–{b}', 'Niveau {a}–{b}'],
  hsType: ['Type', 'Type'], hsDun: ['Dungeon', 'Donjon'], hsDunAll: ['All dungeons', 'Tous les donjons'], hsTypeAll: ['All types', 'Tous types'], hsTypeDun: ['Dungeons', 'Donjons'], hsTypeFor: ['Forever dungeons', 'Donjons Forever'], hsTypeRaid: ['Raids', 'Raids'],
  hsRole: ['Missing role', 'Rôle manquant'], hsRoleAll: ['Any role', 'Tous rôles'], 'hsNeed.tank': ['Needs a tank', 'Cherche un tank'], 'hsNeed.heal': ['Needs a healer', 'Cherche un soigneur'], 'hsNeed.dps': ['Needs damage', 'Cherche des dégâts'], hsWhen: ['When', 'Quand'], hsWhenAll: ['Any time', 'Tout le temps'], hsWhenWeek: ['Next 7 days', '7 prochains jours'],
  hsReset: ['Reset', 'Tout effacer'], hsNone: ['Nothing matches this search.', 'Rien ne correspond à cette recherche.'],
  'slot.HEAD': ['Head', 'Tête'], 'slot.NECK': ['Neck', 'Cou'], 'slot.SHOULDER': ['Shoulders', 'Épaules'], 'slot.BACK': ['Back', 'Dos'], 'slot.CHEST': ['Chest', 'Torse'],
  'slot.WRIST': ['Wrists', 'Poignets'], 'slot.HANDS': ['Hands', 'Mains'], 'slot.WAIST': ['Waist', 'Taille'], 'slot.LEGS': ['Legs', 'Jambes'], 'slot.FEET': ['Feet', 'Pieds'],
  'slot.FINGER': ['Finger', 'Doigt'], 'slot.TRINKET': ['Trinket', 'Bijou'], 'slot.MAIN': ['Weapon', 'Arme'], 'slot.OFF': ['Off hand', 'Main gauche'], 'slot.RANGED': ['Ranged', 'Distance'],
  hsSub: ['the items I want, slot by slot', 'les objets que je veux, emplacement par emplacement'], hsMore: ['+{n} more', '+{n} autre{s}'],
  hsFound: ['items from the list found', 'objets de la liste trouvés'], hsTries: ['{n} tries in total', '{n} essais au total'], hsSlots: ['{n} slot{s} targeted', '{n} emplacement{s} visé{s}'],
  hsOrganise: ['Find a group', 'Trouver un groupe'], hsRate: ['{r} per try', '{r} par essai'], hsRateNo: ['rate unknown', 'taux inconnu'], hsToTry: ['to try', 'à tenter'],
  hsEmpty: ['No wanted item yet: pick some below, or add them in game (Hunt tab).', 'Aucun objet recherché pour l’instant : choisis-en ci-dessous, ou ajoute-les en jeu (onglet Chasse).'],
  hsSugT: ['Suggested items', 'Objets suggérés'], hsSugSub: ['best items within reach, slot by slot · you choose', 'les meilleurs objets à ta portée, par emplacement · tu choisis'],
  hsSugHow: ['Dungeon drops your class can use, at your level, better than what you wear (item level). Tick what you want, then paste the command in game.', 'Des objets de donjon que ta classe peut porter, à ton niveau, meilleurs que ce que tu portes (niveau d’objet). Coche ce que tu veux, puis colle la commande en jeu.'],
  hsSugNoGear: ['Dungeon drops your class can use, at your level. Your worn gear is read with the next daily armory update: suggestions will then only show upgrades.', 'Des objets de donjon que ta classe peut porter, à ton niveau. Ton équipement porté sera lu au prochain relevé quotidien de l’armurerie : les suggestions ne montreront alors que des améliorations.'],
  hsSugNone: ['No better dungeon drop found for your level right now.', 'Aucun meilleur objet de donjon trouvé à ton niveau pour l’instant.'],
  hsWorn: ['worn', 'porté'], hsIlvl: ['ilvl {n}', 'niv. {n}'], hsPicked: ['{n} picked', '{n} choisi{s}'], hsFree: ['{n} free spot{s} in game', '{n} place{s} libre{s} en jeu'],
  hsCmdCopy: ['Copy for the game', 'Copier pour le jeu'], hsSave: ['Add to my list', 'Ajouter à ma liste'], hsDel: ['Remove from my list', 'Retirer de ma liste'],
  hsSaved: ['Saved: your list is on the site now. Copy it for the game to keep both the same.', 'Enregistré : ta liste est sur le site. Copie-la pour le jeu pour garder les deux pareilles.'],
  hsRemoved: ['Removed on the site. Also remove it in game (Hunt tab), or your next /drop hiscores brings it back.', 'Retiré sur le site. Retire-le aussi en jeu (onglet Chasse), sinon ton prochain /drop hiscores le remettra.'],
  hsErr: ['Could not save, try again in a moment.', 'Enregistrement impossible, réessaie dans un instant.'], hsFull: ['Your list is full (20 items).', 'Ta liste est pleine (20 objets).'],
  hsSiteNote: ['List changed on the site on {d}, not in the game yet.', 'Liste modifiée sur le site le {d}, pas encore dans le jeu.'], hsCodeHow: ['In game: paste it in the chat box and press Enter.', 'En jeu : colle-la dans le chat et valide.'], 'tb.home': ['Home', 'Accueil'], 'tb.hunt': ['Groups', 'Groupes'], 'tb.me': ['Me', 'Moi'],
  lvTitle: ['Right now on Forever', 'En ce moment sur Forever'], lvSub: ['the last 7 days', 'les 7 derniers jours'],
  lvUp: ['<b>{n}</b> +{d} {s} <em>→ {v}</em>', '<b>{n}</b> +{d} {s} <em>→ {v}</em>'],
  lvFound: ['<b>{n}</b> got <em>{i}</em>', '<b>{n}</b> a obtenu <em>{i}</em>'], lvLoots: ['Latest loot', 'Derniers loots'], lvLootsSub: ['what players got, dated by their export', 'ce que les joueurs ont obtenu, daté par leur export'],
  lvRun: ['<b>{n}</b> plans {d} <em>· {w}</em>', '<b>{n}</b> propose {d} <em>· {w}</em>'],
  lvToday: ['today', "aujourd'hui"], lvYesterday: ['yesterday', 'hier'], lvDays: ['{n} d ago', 'il y a {n} j'],
  lvcDl: ['downloads', 'téléchargements'], lvcChars: ['characters', 'personnages'], lvcGuilds: ['guilds', 'guildes'], lvcRuns: ['planned outings', 'sorties prévues'], lvcItems: ['items in collection logs', 'objets dans les carnets'],
  lvRuns: ['Next outings', 'Prochaines sorties'], lvNoRun: ['No outing planned yet: be the first to propose one.', "Aucune sortie prévue pour l'instant : propose la première."],
  lvWeek: ['This week', 'La semaine'], lvRising: ['Rising guilds', 'Les guildes qui montent'], lvMembers: ['{n} active', '{n} actif{s}'],
  lvNoWeek: ['Nobody has moved yet this week.', "Personne n'a encore bougé cette semaine."], lvEmpty: ['Quiet for now: the next +1 will show up here.', 'Calme plat pour l’instant : le prochain +1 arrivera ici.'],
  dashHi: ['Hi {n}', 'Salut {n}'], dashSheet: ['My sheet', 'Ma fiche'], dashSend: ['Update from the game', 'Mettre à jour depuis le jeu'], in7: ['in 7 days', 'en 7 jours'],
  dashLast: ['last sent {d}', 'dernier envoi : {d}'], dashNoLine: ['Nothing sent from the game yet: type /drop hiscores in game and paste the line.', 'Rien d’envoyé depuis le jeu : tape /drop hiscores en jeu et colle la ligne.'],
  dashOldLine: ['Your game export is {n} days old: paste it again to update your collection log and wanted items.', 'Ton export du jeu date de {n} jours : recolle-le pour mettre à jour ton carnet et tes objets recherchés.'],
  dashRuns: ['My outings', 'Mes sorties'], dashNoRun: ['You are not in any outing yet.', 'Tu n’es inscrit à aucune sortie.'], dashOpenRuns: ['Open outings for you', 'Sorties ouvertes pour toi'],
  dashAllRuns: ['Find a group →', 'Trouver un groupe →'], dashHunt: ['My wanted items', 'Mes objets recherchés'], dashNoHunt: ['No wanted item yet: add some in the addon (Hunt tab) or from your sheet.', 'Aucun objet recherché : ajoute-en dans l’addon (onglet Chasse) ou depuis ta fiche.'],
  dashAlso: ['{n} others need this dungeon', '{n} autres ont besoin de ce donjon'], dashNear: ['Almost done', 'Presque finis'],
  dashNoLog: ['Paste your game export to see your collection log.', 'Colle ton export du jeu pour voir ton carnet de collection.'],
  dashGuildRank: ['{r} of {n} in the guild', '{r} sur {n} dans la guilde'], dashGuild: ['Guild page →', 'Page de la guilde →'],
  dashNext: ['Next steps', 'Prochaines marches'], dashLeft: ['{n} to go', 'encore {n}'], dashAbout: ['About the addon', 'Découvrir l’addon'], install: ['Install the app', 'Installer l’app'],
  clogResend: ['Paste your /drop hiscores export again to see each item as an icon.', 'Renvoie ta ligne /drop hiscores pour voir chaque objet en icône.'],
  clogNone: ['No dungeon item obtained yet.', 'Aucun objet de donjon obtenu pour l’instant.'],
  clogSrc: ['Loot tables: AtlasLoot Forever (GPL-2.0) · items: Blizzard API.', 'Tables de butin : AtlasLoot Forever (GPL-2.0) · objets : API Blizzard.'],
  obtained: ['Obtained', 'Obtenu'], notObtained: ['Not obtained yet', 'Pas encore obtenu'], itemForever: ['Forever item', 'Objet propre à Forever'], advT: ['Adventure', 'Aventure'], pvpT: ['PvP', 'JcJ'],
  srcArm: ['Armory', 'Armurerie'], srcDecl: ['Dropamine · on trust', 'Dropamine · sur la confiance'],
  kd: ['K/D ratio', 'Ratio K/D'], kdMin: ['from 20 fights (honorable kills + deaths)', 'dès 20 combats (VH + morts)'], kdHow: ['{k} honorable kills for {d} deaths to players', '{k} victoires honorables pour {d} morts face aux joueurs'],
  duelsT: ['Duels won – lost', 'Duels gagnés – perdus'], pvpRank: ['PvP rank', 'Rang JcJ'],
  subWinRate: ['{n}% won', '{n} % de victoires'], subFaction: ['{n} by the opposite faction', '{n} par la faction adverse'],
  subCritters: ['+ {n} critters', '+ {n} bestioles'], subAbandoned: ['{n} abandoned', '{n} abandonnées'], subBosses: ['{n} bosses defeated', '{n} boss vaincus'],
  subHearth: ['{n} hearthstones', '{n} pierres de foyer'], subDungeonDeaths: ['{n} in dungeons', '{n} en donjon'], subKb: ['monsters and players', 'monstres et joueurs'],
  fish: ['Fish caught', 'Poissons pêchés'], mounts: ['Mounts', 'Montures'], potions: ['Potions', 'Potions'], subPotions: ['{h} health · {m} mana', '{h} soins · {m} mana'], armorySrc: ['from the armory', "d'après l'armurerie"], repsN: ['{n} factions', '{n} factions'], quests: ['Quests', 'Quêtes'], flights: ['Flights taken', 'Trajets aériens'], deaths: ['Deaths', 'Morts'],
  played: ['Played', 'Temps de jeu'],
  dbTitle: ['Dropamine progress', 'Progression Dropamine'], dbWhen: ['sent by the player on {d}', 'envoyé par le joueur le {d}'],
  dbLog: ['Collection log', 'Carnet de collection'], dbAch: ['Dropamine achievements', 'Succès Dropamine'], dbRec: ['Records', 'Records'],
  dbHunt: ['Wanted items', 'Objets recherchés'], dbPvp: ['PvP', 'JcJ'], hk: ['Honorable kills', 'Victoires honorables'],
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
  updated: ['Hiscores updated {d}.', 'Hiscores mis à jour le {d}.'], meta: ['Version {v} · free · open source (MIT) · 7 languages', 'Version {v} · gratuit · open source (MIT) · 7 langues'],
  loading: ['Loading…', 'Chargement…'],
  title: ['Dropamine — the WoW Forever addon that celebrates every +1', "Dropamine — l'addon WoW Forever qui fête chaque +1"],
  dgSort: ["Today's best gains", 'Meilleurs gains du jour'], dgTip: ['Who gained the most since yesterday, in this ranking', 'Qui a le plus progressé depuis hier, dans ce classement'],
  dgNone: ['Nobody has gained here since yesterday yet.', "Personne n'a encore progressé ici depuis hier."],
  durDH: ['{d}d {h}h', '{d} j {h} h'], durHM: ['{h}h {m}m', '{h} h {m} min'],
};
const t = (k, vars = {}) => {
  const e = I18N[k];
  let s = (extra() && I18X?.ui?.[k]) || (e ? (LANG === 'fr' ? e[1] : e[0]) : k);
  for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, b);
  return s.replaceAll('{s}', +vars.n > 1 ? 's' : '');
};
// petite goutte animée à la place des « Chargement… »
let dropN = 0;
// goutte de chargement : la bordure du logo (img/drop-frame.png) sur le liquide animé ; même dessin que le #splash
// (contour intérieur tiré du logo par scripts/drop-frame.mjs)
const dropMark = (size) => { const id = 'dl' + (++dropN); return `<span class="drop" style="--s:${size}px"><svg class="drop-liq" viewBox="0 0 512 512" aria-hidden="true"><defs><clipPath id="${id}"><path d="M254 104L251 108L245 112L241 116L238 120L235 124L231 128L228 132L224 136L221 140L217 144L214 148L210 152L207 156L203 160L199 164L196 168L192 172L189 176L185 180L182 184L178 188L175 192L171 196L168 200L165 204L162 208L159 212L156 216L153 220L149 224L146 228L144 232L141 236L139 240L136 244L134 248L132 252L130 256L128 260L127 264L125 268L123 272L122 276L121 280L120 284L118 288L118 292L117 296L116 300L116 304L115 308L115 312L115 316L115 320L115 324L115 328L116 332L116 336L117 340L118 344L118 348L119 352L120 356L122 360L123 364L124 368L126 372L128 376L130 380L132 384L134 388L136 392L139 396L142 400L145 404L148 408L152 412L155 416L160 420L164 424L169 428L174 432L180 436L186 440L194 444L203 448L214 452L230 456L282 456L298 452L309 448L318 444L326 440L332 436L338 432L343 428L348 424L352 420L357 416L360 412L364 408L367 404L370 400L373 396L376 392L378 388L380 384L382 380L384 376L386 372L388 368L389 364L390 360L392 356L393 352L394 348L394 344L395 340L396 336L396 332L397 328L397 324L397 320L397 316L397 312L397 308L396 304L396 300L395 296L394 292L393 288L392 284L391 280L390 276L389 272L387 268L385 264L384 260L382 256L380 252L378 248L376 244L373 240L371 236L368 232L366 228L363 224L360 220L356 216L353 212L350 208L347 204L344 200L341 196L337 192L334 188L330 184L327 180L323 176L320 172L316 168L313 164L309 160L305 156L302 152L298 148L295 144L291 140L288 136L284 132L281 128L277 124L274 120L271 116L267 112L261 108L258 104z"/></clipPath></defs><g clip-path="url(#${id})"><rect width="512" height="512" fill="#3a2c20"/><g class="sp-fill"><path class="sp-w r" d="M-200 226q50-10 100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0V512H-200z" fill="#b0584a" stroke="#fff" stroke-opacity=".28" stroke-width="3"/><path class="sp-w b" d="M-200 290q50-9 100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0V512H-200z" fill="#6c88c0" stroke="#fff" stroke-opacity=".28" stroke-width="3"/><path class="sp-w g" d="M-200 350q50-8 100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0V512H-200z" fill="#5e9748" stroke="#fff" stroke-opacity=".28" stroke-width="3"/><g class="sp-bub" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.5"><circle cx="206" cy="265" r="6"/><circle cx="196" cy="317" r="8"/><circle cx="318" cy="332" r="4.5"/><circle cx="329" cy="384" r="6"/></g></g></g></svg><img class="drop-frame" src="img/drop-frame.png" alt=""></span>`; };
const loadingBox = () => `<div class="empty dload">${dropMark(64)}<span>${t('loading')}</span></div>`;
const LOCALES = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT', pt: 'pt-BR', ru: 'ru-RU' };
const locale = () => LOCALES[LANG] || 'en-GB';
const fmt = n => Math.round(n).toLocaleString(locale());
const ord = n => LANG === 'fr' ? (n === 1 ? '1ᵉʳ' : n + 'ᵉ') : LANG === 'de' ? n + '.' : LANG === 'ru' ? n + '-й' : extra() ? n + 'º' : n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

/* ---------- Référentiels (identifiants de l'API → noms dans les deux langues) ---------- */
const PROF = { 165: ['Leatherworking', 'Travail du cuir'], 393: ['Skinning', 'Dépeçage'], 185: ['Cooking', 'Cuisine'], 356: ['Fishing', 'Pêche'],
  129: ['First Aid', 'Secourisme'], 171: ['Alchemy', 'Alchimie'], 164: ['Blacksmithing', 'Forge'], 333: ['Enchanting', 'Enchantement'],
  202: ['Engineering', 'Ingénierie'], 182: ['Herbalism', 'Herboristerie'], 186: ['Mining', 'Minage'], 197: ['Tailoring', 'Couture'] };
const CLASS = { 1: ['Warrior', 'Guerrier'], 2: ['Paladin', 'Paladin'], 3: ['Hunter', 'Chasseur'], 4: ['Rogue', 'Voleur'], 5: ['Priest', 'Prêtre'],
  7: ['Shaman', 'Chaman'], 8: ['Mage', 'Mage'], 9: ['Warlock', 'Démoniste'], 11: ['Druid', 'Druide'] };
const RACE = { 1: ['Human', 'humain'], 2: ['Orc', 'orc'], 3: ['Dwarf', 'nain'], 4: ['Night Elf', 'elfe de la nuit'], 5: ['Undead', 'mort-vivant'],
  6: ['Tauren', 'tauren'], 7: ['Gnome', 'gnome'], 8: ['Troll', 'troll'] };
const RULESETS = [[2, ['Normal', 'Normal']], [1, ['PvP', 'JcJ']], [3, ['RP', 'Jeu de rôle']], [15, ['RP-PvP', 'Jeu de rôle JcJ']]];
// [anglais, français] (ou les 7 langues) ; autre langue : la traduction du texte anglais, sinon l'anglais
const L2 = pair => { if (!pair) return ''; if (LANG === 'fr') return pair[1] ?? pair[0]; if (LANG === 'en') return pair[0];
  return (pair.length === 7 && pair[li()]) || I18X?.names?.[pair[0]] || pair[0]; };
const profName = (id, fallback) => L2(PROF[id]) || fallback || '';
const className = p => L2(CLASS[p.classId]) || p.class || '';
const raceName = p => L2(RACE[p.raceId]) || (p.race || '').toLowerCase();
const rulesetName = p => L2((RULESETS.find(([id]) => id === p.rulesetId) || [])[1]) || p.ruleset || '';
const PROF_ORDER = [393, 186, 182, 171, 164, 333, 202, 165, 197, 185, 356, 129];
const STAT_KEYS = ['killingBlows', 'kills', 'quests', 'dungeons', 'flights'];   // les VH sont dans la catégorie JcJ
const STAT_ICON = { killingBlows: 'ability_backstab', kills: 'inv_misc_bone_skull_02', quests: 'inv_misc_book_08', dungeons: 'inv_misc_key_10', flights: 'ability_mount_gryphon_01' };
// honneur par victoire (semaine de la ligne Dropamine) : tuer des joueurs bien plus faibles ne rapporte rien, l'honneur d'une
// victoire suit le niveau et le rang de l'adversaire : une valeur haute = des adversaires à sa taille ou plus forts
// Toujours recoupé avec l'armurerie Blizzard : victoires honorables gagnées sur les 7 derniers jours (historique quotidien).
// L'addon compte en direct et l'armurerie est relue une fois par jour : marge des victoires du jour (+3).
const armoryWeekHK = p => { const h = (p.history || []).filter(x => x.hk != null); if (h.length < 2) return null;
  const b = h[h.length - 1], start = Date.parse(b.d) - 7 * 864e5, a = h.find(x => Date.parse(x.d) >= start);
  if (!a || a === b || Date.parse(a.d) > start + 864e5) return null;   // moins de 6 jours d'historique : pas encore vérifiable
  return Math.max(0, b.hk - a.hk); };
// 'ok' vérifié, 'pending' pas encore vérifiable, 'over' l'addon déclare plus que l'armurerie (exclu du classement)
const hpkCheck = p => { const v = p.dropamine?.pvp, arm = armoryWeekHK(p); if (!v) return null; if (arm == null) return 'pending';
  return v.hkWeek <= arm + (v.hkToday || 0) + 3 ? 'ok' : 'over'; };
const hpkOf = p => { const v = p.dropamine?.pvp, at = Date.parse(p.dropamineAt || '');
  if (!v || !(v.hkWeek >= 10) || !(v.honorWeek >= 0) || !(Date.now() - at < 7 * 864e5)) return null;
  if (hpkCheck(p) === 'over') return null;
  return v.honorWeek / v.hkWeek; };
const hpkBadge = p => { const c = hpkCheck(p); return c === 'ok' ? `<em class="vchk ok" title="${t('hpkOkTip')}">✓ ${t('hpkOk')}</em>` : c === 'pending' ? `<em class="vchk" title="${t('hpkPendTip')}">${t('hpkPend')}</em>` : ''; };
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
  // JcJ (armurerie) : victoires honorables, K/D, duels, rang
  { id: 'hk', group: 'pvp', label: () => t('hk'), max: '', icon: 'inv_bannerpvp_02', get: p => armoryStat(p, 'hk') },
  // K/D : victoires honorables ÷ morts face aux joueurs (armurerie) ; seulement si les deux chiffres sont connus
  // et au moins 20 combats (VH + morts), pour qu'un 12 / 0 ne passe pas devant un 420 / 60
  { id: 'kd', group: 'pvp', label: () => t('kd'), max: '', icon: 'ability_dualwield',
    note: () => t('kdMin'),
    get: p => { const k = armoryStat(p, 'hk'), d = p.stats?.pvpDeaths; return k && d != null && k + d >= 20 ? (d ? k / d : k) : null; },
    show: (v, p) => `${v.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<small class="kdd"> · ${fmt(armoryStat(p, 'hk'))} / ${fmt(p.stats.pvpDeaths)}</small>`,
    ratio: (v, p) => armoryStat(p, 'hk') / (armoryStat(p, 'hk') + p.stats.pvpDeaths) },
  { id: 'duels', group: 'pvp', label: () => t('duelsWonT'), max: '', icon: 'ability_warrior_challange', note: () => t('duelsNote'),
    get: p => p.stats?.duelsWon ?? null, show: (v, p) => `${fmt(v)}<small> – ${fmt(p.stats.duelsLost || 0)}</small>`,
    ratio: (v, p) => v / ((v + (p.stats.duelsLost || 0)) || 1) },
  { id: 'hpk', group: 'pvp', label: () => t('hpkT'), max: '', icon: 'spell_holy_sealofwrath', note: () => t('hpkNote'), get: hpkOf,
    show: (v, p) => `${v.toLocaleString(locale(), { maximumFractionDigits: 1 })}<small class="kdd"> · ${fmt(p.dropamine.pvp.honorWeek)} / ${fmt(p.dropamine.pvp.hkWeek)}</small>${hpkBadge(p)}` },
  { id: 'pvprank', group: 'pvp', label: () => t('pvpRank'), max: '', icon: 'inv_misc_tabardpvp_01', get: p => p.pvpArmory?.rank || null },
  ...STAT_KEYS.map(k => ({ id: k, group: 'stat', label: () => t(k), max: '', icon: STAT_ICON[k], get: p => armoryStat(p, k) })),
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
const GROUP_COLOR = { lvl: 'var(--lvl)', wpn: 'var(--wpn)', prf: 'var(--prf)', pvp: '#a874d6', stat: 'var(--rim)', book: 'var(--gold)' };
const VIEWS = ['home', 'rank', 'char', 'guild', 'runs', 'news', 'get', 'join', 'privacy', 'about'];

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
const plus = (p, g) => { const d = g ?? dayGain(p); return d > 0 ? `<span class="plus" title="${t('sinceY')}">+${fmt(d)}</span>` : ''; };
// gain du jour pour la compétence affichée (instantané de la veille) ; niveau total et statistiques sans instantané : le gain total
function skillGain(p, sk) {
  const key = sk.id === 'level' ? 'l' : sk.id === 'defense' ? 'd' : /^[pw]\d/.test(sk.id) ? sk.id : null;
  const h = p.history || []; if (!key || h.length < 2) return dayGain(p);
  const a = h[h.length - 2], b = h[h.length - 1];
  if (new Date(b.d) - new Date(a.d) > 1.5 * 864e5 || a.s?.[key] == null || b.s?.[key] == null) return key ? 0 : dayGain(p);
  return b.s[key] - a.s[key];
}
const estTag = p => p.preview ? `<em class="pv">${t('preview')}</em>` : p.complete ? '' : `<em>${t('est')}</em>`;

/* ---------- Accueil : le pont vers les classements ---------- */
// téléchargements CurseForge, mis à jour à la main (chiffre donné par l'auteur)
let CF_DOWNLOADS = 593;   // valeur de secours ; le vrai chiffre vient du serveur (relevé CurseForge toutes les 3 h)
let cfLoad = null;
const loadCf = () => cfLoad ??= fetch(API + '/stats').then(r => r.json()).then(j => { const n = j?.curseforge?.downloads; if (n > CF_DOWNLOADS) { CF_DOWNLOADS = n; if (state.view === 'home') renderHome(); } }).catch(() => {});
// une sortie prévue, en ligne compacte sur fond de donjon (accueil, accueil connecté)
const runLine = r => { const dd = LOOT?.dungeons.find(x => x.key === r.dungeon), d0 = new Date(r.at);
  return `<li class="drun"${dd ? artStyle(dd.key) : ''}><a href="?p=runs&run=${esc(r.id)}" data-runlink="${esc(r.id)}"><b>${esc(dd?.name || r.dungeon)}</b><span>${d0.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' })} · ${d0.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })} · ${relWhen(d0)}</span><small>${t('runCount', { n: r.members.length })}</small></a></li>`; };

// ---------- Accueil visiteur : « En ce moment sur Forever » ----------
// le fil : les +1 de la semaine (historique quotidien), les sorties proposées, les objets chassés trouvés
function liveFeed() {
  const out = [], today = new Date().setHours(0, 0, 0, 0), week = 7 * 864e5;
  const label = (p, k) => k === 'l' ? t('level') : k === 'd' ? t('defense') : k[0] === 'p' ? profName(+k.slice(1), (p.professions || []).find(x => x.id === +k.slice(1))?.name) : '';
  for (const p of inRegion()) {
    const h = p.history || [];
    for (let i = h.length - 1; i > 0 && today - new Date(h[i].d) <= week; i--) {
      const a = h[i - 1], b = h[i]; if (!a.s || !b.s || new Date(b.d) - new Date(a.d) > 1.5 * 864e5) continue;
      for (const k of Object.keys(b.s)) {
        if (k[0] === 'w' || a.s[k] == null || b.s[k] <= a.s[k]) continue;
        const name = label(p, k); if (!name) continue;
        out.push({ at: new Date(b.d).getTime(), p, html: t('lvUp', { n: full(p), d: fmt(b.s[k] - a.s[k]), s: esc(name), v: fmt(b.s[k]) }), gain: b.s[k] - a.s[k] });
      }
    }
    for (const [id, d] of p.loots || []) { const at = Date.parse(d);
      if (today - at <= week) out.push({ at, p, html: t('lvFound', { n: full(p), i: esc(lootName(p, id)) }), item: id }); }
  }
  const byKey = new Map(DATA.players.map(p => [pkey(p), p]));
  for (const r of RUNS || []) {
    const at = Date.parse(r.created || ''), p = byKey.get(r.by), dd = LOOT?.dungeons.find(x => x.key === r.dungeon);
    if (p && dd && Date.now() - at <= week) out.push({ at, p, html: t('lvRun', { n: full(p), d: esc(dd.name), w: esc(relWhen(new Date(r.at))) }), run: r.id });
  }
  // les plus récents d'abord ; le même jour, les loots puis les plus gros gains
  return out.sort((a, b) => b.at - a.at || (b.item ? 1 : 0) - (a.item ? 1 : 0) || (b.gain || 0) - (a.gain || 0));
}
const lootName = (p, id) => { const h = (p.dropamine?.hunt || []).find(x => x.id === id); return h ? huntName(h) : itemName(id); };
const dayAgo = at => { const n = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / 864e5);
  return n <= 0 ? t('lvToday') : n === 1 ? t('lvYesterday') : t('lvDays', { n }); };
let liveLoad = null, LIVE = [];
function renderLive() {
  const box = $('#live'); if (!box) return;
  if (!liveLoad) liveLoad = Promise.all([loadLoot(), loadItems(), loadArt(), loadRuns()]).then(() => { if (state.view === 'home') { renderLive(); animate(box); } });
  if (DATA.failed || !DATA.players.length) { box.hidden = true; return; }
  box.hidden = false;
  const region = inRegion(), now = Date.now();
  LIVE = liveFeed();
  const runs = (RUNS || []).filter(r => Date.parse(r.at) > now - 15 * 60e3);
  const guildsN = new Set(DATA.players.filter(p => p.guild).map(p => (p.region || 'eu') + '/' + p.guild.slug)).size;
  const found = DATA.players.reduce((n, p) => n + (p.dropamine?.collection?.x || 0), 0);
  const counters = [[CF_DOWNLOADS, t('lvcDl')], [DATA.players.length, t('lvcChars')], [guildsN, t('lvcGuilds')], [runs.length, t('lvcRuns')], [found, t('lvcItems')]]
    .map(([n, l]) => `<div><b data-n="${n}">${fmt(n)}</b><span>${l}</span></div>`).join('');
  const feed = LIVE.slice(0, 8).map(e => `<li${e.run ? ` data-runlink="${esc(e.run)}"` : ` data-c="${esc(pkey(e.p))}"`}>${avatar(e.p)}<span>${e.html}</span><time>${dayAgo(e.at)}</time></li>`).join('');
  // la semaine : le podium des gains et les guildes qui montent
  const movers = region.map(p => ({ p, g: gain7(p) || 0 })).filter(x => x.g > 0).sort((a, b) => b.g - a.g).slice(0, 3);
  const podium = movers.length ? `<ol class="podium">${[movers[1], movers[0], movers[2]].map((x, i) => x ? `<li class="pd${[2, 1, 3][i]}" data-c="${esc(pkey(x.p))}">${avatar(x.p)}<b>${full(x.p)}</b><span class="up">+${fmt(x.g)}</span><i>${[2, 1, 3][i]}</i></li>` : '<li class="pd-empty"></li>').join('')}</ol>` : `<p class="note">${t('lvNoWeek')}</p>`;
  const gmap = new Map();
  for (const p of region) if (p.guild && gain7(p) > 0) { const g = gmap.get(p.guild.slug) || { g: p.guild, n: 0, m: 0 }; g.n += gain7(p); g.m++; gmap.set(p.guild.slug, g); }
  const rising = [...gmap.values()].sort((a, b) => b.n - a.n).slice(0, 3)
    .map(x => `<li><a href="?p=guild&g=${esc(x.g.slug)}" data-g="${esc(x.g.slug)}"><b>${esc(x.g.name)}</b><small>${t('lvMembers', { n: x.m })}</small><span class="up">+${fmt(x.n)}</span></a></li>`).join('');
  const loots = region.flatMap(p => (p.loots || []).map(([id, d]) => ({ p, id, at: Date.parse(d) }))).sort((a, b) => b.at - a.at).slice(0, 10);
  const lootRow = loots.length ? `<section class="panel lv-loots"><div class="cathead"><h3 class="sub">${t('lvLoots')}</h3><span class="cx2">${t('lvLootsSub')}</span></div>
    <div class="lootrow">${loots.map(x => `<a class="loot" href="?p=char&c=${esc(encodeURIComponent(pkey(x.p)))}" data-c="${esc(pkey(x.p))}">${itemChip(x.id)}<b style="color:${QCOL[ITEMS?.[x.id]?.q] || 'var(--cream)'}">${esc(lootName(x.p, x.id))}</b><small>${esc(x.p.name)} · ${dayAgo(x.at)}</small></a>`).join('')}</div></section>` : '';
  box.innerHTML = `${raidBanner()}<div class="lv-count">${counters}</div>${lootRow}
    <div class="lv-grid">
      <section class="panel lv-feed"><div class="cathead"><h3 class="sub"><i class="live"></i>${t('lvTitle')}</h3><span class="cx2">${t('lvSub')}</span></div>
        ${feed ? `<ul>${feed}</ul>` : `<p class="note">${t('lvEmpty')}</p>`}</section>
      <div class="lv-side">
        <section class="panel"><div class="cathead"><h3 class="sub">${t('lvRuns')}</h3><a class="lnk cx2" href="?p=runs" data-view-link="runs">${t('dashAllRuns')}</a></div>
          ${runs.length ? `<ul class="dlist">${runs.slice(0, 3).map(runLine).join('')}</ul>` : `<p class="note">${RUNS === null ? t('runsApiDown') : t('lvNoRun')}</p>`}</section>
        <section class="panel"><div class="cathead"><h3 class="sub">${t('lvWeek')}</h3></div>${podium}
          ${rising ? `<h4 class="lv-h4">${t('lvRising')}</h4><ul class="dlist lv-guilds">${rising}</ul>` : ''}</section>
      </div>
    </div>`;
}
// de temps en temps, un toast façon addon reprend une ligne du fil (accueil visiteur seulement)
let toastN = 0;
setInterval(() => {
  if (reduce || state.view !== 'home' || document.hidden || $('#home').classList.contains('logged') || toastN >= 6 || !LIVE.length) return;
  const e = LIVE[toastN % Math.min(LIVE.length, 8)]; toastN++;
  let wrap = $('#ltoasts'); if (!wrap) { wrap = document.createElement('div'); wrap.id = 'ltoasts'; wrap.setAttribute('aria-hidden', 'true'); document.body.append(wrap); }
  const el = document.createElement('div'); el.className = 'ltoast';
  el.innerHTML = `${avatar(e.p)}<span>${e.html}</span>`;
  wrap.append(el); setTimeout(() => el.classList.add('out'), 4800); setTimeout(() => el.remove(), 5400);
}, 9000);

// ---------- Bien démarrer : du téléchargement à la mise en relation, en 4 étapes qui se cochent toutes seules ----------
function startCard(me) {
  const exp = me.some(p => p.dropamineAt), shared = me.some(p => p.dropamine?.hunt?.length || p.dropamine?.collection?.items?.length);
  const steps = [
    [true, t('st1'), t('st1d'), ''],
    [me.length > 0, t('st2'), t('st2d'), `<a class="btn ghost" href="?p=join" data-view-link="join">${t('st2a')}</a>`],
    [exp, t('st3'), t('st3d'), `<a class="btn ghost" href="?p=join" data-view-link="join">${t('st3a')}</a>`],
    [shared, t('st4'), t('st4d'), `<a class="btn ghost" href="?p=runs&tab=ideas" data-view-link="runs">${t('st4a')}</a>`],
  ];
  const done = steps.filter(x => x[0]).length;
  if (done === steps.length) return '';
  const next = steps.findIndex(x => !x[0]);
  return `<section class="start"><div class="cathead"><h3 class="sub">${t('stT')}</h3><span class="cx2">${t('stN', { n: done, m: steps.length })}</span></div>
    <p class="note">${t('stLead')}</p>
    <ol>${steps.map(([ok, title, desc, act], i) => `<li class="${ok ? 'ok' : i === next ? 'now' : ''}"><i>${ok ? '✓' : i + 1}</i><div><b>${title}</b><small>${desc}</small></div>${!ok && i === next ? act : ''}</li>`).join('')}</ol></section>`;
}

// ---------- Accueil personnel (connecté) : tout ce qui sert au quotidien, en un coup d'œil ----------
function renderDash() {
  const box = $('#dash'); if (!box) return false;
  const me = Bnet.mine();
  $('#home').classList.toggle('logged', !!me.length);
  if (!me.length) {
    if (Bnet.logged?.()) { box.hidden = false; $('#home').classList.add('logged'); box.innerHTML = startCard(me); return true; }
    box.hidden = true; return false;
  }
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
        <div class="dh-n">${totalB(p)}<small> / ${fmt(p.max || 2460)}</small></div>
        <div class="dh-g">${rank ? `<span>${ord(rank)} · ${t('totalLevel')}</span>` : ''}${d1 > 0 ? `<span class="up">+${fmt(d1)} ${t('sinceY')}</span>` : ''}${d7 > 0 ? `<span class="up">+${fmt(d7)} ${t('in7')}</span>` : ''}</div>
        <div class="dh-a"><a class="btn gold" href="?p=char&c=${esc(pkey(p))}" data-c="${esc(pkey(p))}">${t('dashSheet')}</a><button class="btn ghost" data-hsimg="${esc(pkey(p))}">${t('hsBtn')}</button><a class="btn ghost" href="?p=join" data-view-link="join">${t('dashSend')}</a></div>
        ${old == null ? '' : old > 7 ? `<p class="dh-warn">${t('dashOldLine', { n: Math.floor(old) })}</p>` : `<p class="dh-last">${[d.collection && t('dbLog'), d.hunt && t('dbHunt'), d.achievements && t('dbAch'), d.records && t('dbRec'), p.played && t('played')].filter(Boolean).join(', ')} · ${t('dashLast', { d: dayAgo(Date.parse(p.dropamineAt)) })}</p>`}</div></div>`;
  // 2) mes runs, et ceux à ma portée
  const mineKeys = new Set(me.map(pkey));
  const myRuns = (RUNS || []).filter(r => r.members.some(m => mineKeys.has(m.key)));
  const openRuns = (RUNS || []).filter(r => !r.members.some(m => mineKeys.has(m.key)) && LOOT && (() => { const dd = LOOT.dungeons.find(x => x.key === r.dungeon); return dd && fitOf(p, dd) !== 'low'; })()).slice(0, 3);
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
  box.innerHTML = `${chooser}${hero}${startCard(me)}${raidBanner()}<div class="dgrid">${runsCard}${huntCard}${colCard}${stepCard}${guildCard}</div>
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
  loadCf();
  renderLive();
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
    ? top.map(x => line(x, pkey(x.p) === Bnet.best() ? ' you' : '')).join('') + you
    : nobody();
}

/* ---------- Classement ---------- */
// groupes de compétences ouverts (retenus sur cet appareil)
const skFoldKey = 'dropamine.skgroups';
const skFoldGet = () => { try { return JSON.parse(localStorage.getItem(skFoldKey)) || {}; } catch { return {}; } };
const skFold = g => !!skFoldGet()[g];
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sgt]'); if (!b) return;
  const box = b.parentElement, open = box.classList.toggle('shut') === false;
  b.setAttribute('aria-expanded', open);
  const m = skFoldGet(); m[b.dataset.sgt] = open; try { localStorage.setItem(skFoldKey, JSON.stringify(m)); } catch {}
});
function renderRank() {
  if (DATA.failed) { $('#rank-panel').innerHTML = failed(); return; }
  const sk = skillById(state.skill), region = inRegion();
  const byRs = state.rs ? region.filter(p => p.rulesetId === state.rs) : region;
  let list = rankBy(sk, state.cls ? byRs.filter(p => p.classId === state.cls) : byRs);
  // tri par meilleur gain du jour (les + verts) : seuls ceux qui ont progressé, rangés par gain
  if (state.dg) list = list.map(x => ({ ...x, g: skillGain(x.p, sk) })).filter(x => x.g > 0).sort((a, b) => b.g - a.g || b.v - a.v).map((x, i) => ({ ...x, r: i + 1 }));
  const classes = [...new Set(byRs.map(p => p.classId).filter(Boolean))].sort((a, b) => L2(CLASS[a]).localeCompare(L2(CLASS[b])));
  let nav = '', grp;
  // comme la grille de l'addon : chaque compétence avec son icône ; une arme n'apparaît que si quelqu'un la pratique
  // groupes pliables (Armes, Métiers…) : le groupe de la compétence affichée reste ouvert, les autres suivent le choix du joueur
  const shown = SKILLS.filter(s => !(s.wpn || s.group === 'book' || s.group === 'pvp') || s.id === sk.id || region.some(p => s.get(p)));
  shown.forEach(s => {
    if (s.group !== grp) {
      if (grp) nav += '</div>';
      grp = s.group;
      if (grp) { const n = shown.filter(x => x.group === grp).length, open = grp === sk.group || n < 3 || skFold(grp);
        nav += `<div class="sg${open ? '' : ' shut'}"><button type="button" class="grp" data-sgt="${grp}" aria-expanded="${open}"><i class="dot" style="background:${GROUP_COLOR[grp]}"></i>${t('g.' + grp)}<span class="sgn">${n}</span><i class="chev" aria-hidden="true"></i></button>`; }
      else nav += '<div class="sg">';
    }
    const ic = s.logo || s.id === 'total' ? '<i class="sic logo"></i>' : s.icon ? `<img class="sic" src="${icon(s.icon)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<i class="sic none"></i>';
    nav += `<a href="?p=rank&s=${s.id}" data-skill="${s.id}" class="${s.id === sk.id ? 'on' : ''}">${ic}<span class="lb">${s.label()}</span> <span>${s.max}</span></a>`;
  });
  const count = id => region.filter(p => p.rulesetId === id).length;
  const rsChips = `<span class="chip ${state.rs ? '' : 'on'}" data-rs="0">${t('allModes')}<span class="n">${region.length}</span></span>` +
    RULESETS.map(([id, names]) => `<span class="chip ${state.rs === id ? 'on' : ''}" data-rs="${id}">${L2(names)}<span class="n">${count(id)}</span></span>`).join('')
    + `<span class="chip dg${state.dg ? ' on' : ''}" data-dg role="button" tabindex="0" title="${t('dgTip')}">▲ ${t('dgSort')}</span>`;
  const clsChips = `<span class="chip ${state.cls ? '' : 'on'}" data-cls="0">${t('allClasses')}</span>` +
    classes.map(c => `<span class="chip ${state.cls === c ? 'on' : ''}" data-cls="${c}">${esc(L2(CLASS[c]))}</span>`).join('');
  const isTotal = sk.id === 'total';
  // armes estimées : affichées sous le classement, sans rang
  const pool = state.cls ? byRs.filter(p => p.classId === state.cls) : byRs;
  const estRows = sk.wpn ? pool.filter(p => sk.est(p) && sk.get(p)).sort((a, b) => sk.get(b) - sk.get(a)).map(p => ({ p, v: sk.get(p), r: 0 })) : [];
  const row = ({ p, v, r, g }) => `
    <div class="row${r && r <= 3 ? ' top' : ''}${r ? '' : ' unranked'}" data-c="${esc(pkey(p))}" role="row">
      <span class="rk">${r || '–'}</span>
      <span class="nm">${avatar(p)}<span><b>${full(p)}</b>${plus(p, g)}<small>${who(p)}${rulesetName(p) ? ' · ' + esc(rulesetName(p)) : ''}</small></span></span>
      ${isTotal ? tri(p) : sk.prof ? `<span class="mbar"><i style="--w:${(100 * v / (p.professions.find(x => x.id === sk.prof)?.max || 300)).toFixed(1)}%"></i></span>`
        : sk.wpn ? `<span class="mbar w${sk.est(p) ? ' est' : ''}"><i style="--w:${(100 * v / (5 * p.level)).toFixed(1)}%"></i></span>`
        : sk.ratio ? `<span class="mbar b"><i style="--w:${(100 * Math.min(1, sk.ratio(v, p))).toFixed(1)}%"></i></span>` : '<span class="c3"></span>'}
      <span class="tot">${showVal(sk, v, p)}${isTotal ? estTag(p) : sk.wpn && sk.est(p) ? `<em>${t('est')}</em>` : ''}</span>
    </div>`;
  const rows = state.dg ? (list.length ? list.map(row).join('') : `<div class="empty">${t('dgNone')}</div>`)
    : (list.length || estRows.length)
    ? list.map(row).join('') + (estRows.length ? `<div class="you-sep est-sep">${t('estSep')}</div>` + estRows.map(row).join('') : '')
    : nobody();
  $('#rank-panel').innerHTML = `
    <div class="head"><h2>${sk.label()}</h2><span class="note">${sk.group === 'book' && !sk.armory ? t('trustShort') + ' · ' : ''}${sk.note ? sk.note() + ' · ' : ''}${t('registered', { n: region.filter(p => !p.preview).length })}${region.some(p => p.preview) ? ' · ' + t('previewN', { n: region.filter(p => p.preview).length }) : ''} · Forever ${state.region.toUpperCase()}</span></div>
    <div class="chips" role="group">${rsChips}</div>
    <div class="board">
      <nav class="skills">${nav}</div></nav>
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
// Ligne /drop hiscores collée : ses chiffres s'affichent aussitôt sur sa fiche, en discret (« en attente de l'armurerie »),
// jusqu'au prochain relevé du site ; le classement reste celui de l'armurerie.
const PROF_OF = { alchemy: 171, blacksmithing: 164, enchanting: 333, engineering: 202, herbalism: 182, leatherworking: 165, mining: 186,
  skinning: 393, tailoring: 197, cooking: 185, fishing: 356, firstaid: 129 };
function parsePendingLine(line) {
  const f = {};
  for (const part of String(line).split(/\r?\n/)[0].split(';')) { const i = part.indexOf('='); if (i > 0) f[part.slice(0, i).replace(/^DROPAMINE-HS1:/, '')] = part.slice(i + 1); }
  const pairs = s => Object.fromEntries(String(s || '').split(',').map(x => x.split('=')).filter(x => x.length === 2 && /^\d+$/.test(x[1])).map(([k, v]) => [k, +v]));
  const prof = {}; for (const [k, v] of Object.entries(pairs(f.p))) if (PROF_OF[k] && v > 0) prof[PROF_OF[k]] = v;
  return { at: Date.now(), name: f.n, level: +f.l || 0, defense: +f.d || 0, prof, w: pairs(f.w) };
}
const pendKey = k => 'pendline:' + k;
function pendingOf(p) {
  let x = null; try { x = JSON.parse(localStorage.getItem(pendKey(pkey(p))) || 'null'); } catch (e) { return null; }
  if (!x) return null;
  // Gardée tant qu'elle dépasse l'armurerie (chaque case n'affiche que ce qui est au-dessus de l'officiel) ; oubliée après 7 jours.
  // Pas de test sur DATA.updated : le serveur reconstruit les données juste après l'envoi, avec l'armurerie encore en retard.
  if (!(Date.now() - x.at < 7 * 864e5)) { try { localStorage.removeItem(pendKey(pkey(p))); } catch (e) { /* rien */ } return null; }
  return x;
}
// Une compétence de la fiche : même données pour la liste et pour la grille
function skillItems(p, peers) {
  const items = skillItems0(p, peers), pend = Bnet.isMine(pkey(p)) ? pendingOf(p) : null;
  if (!pend) return items;
  for (const it of items) {
    const v = it.key === 'level' ? pend.level : it.key === 'defense' ? pend.defense : it.key[0] === 'p' ? pend.prof[+it.key.slice(1)] : it.key[0] === 'w' ? pend.w[it.key.slice(1)] : null;
    if (v && v > it.rank) it.pend = v;
  }
  return items;
}
// Ligne collée en attente : combien elle ajoute au total (seulement ce qui compte : pas les armes de rechange)
function pendDelta(p) {
  if (!p || !p.key || !Bnet.isMine(pkey(p)) || !pendingOf(p)) return 0;
  return skillItems(p, []).filter(it => it.pend && !it.spare).reduce((n, it) => n + it.pend - it.rank, 0);
}
// Total affiché : simulé et discret s'il y a une ligne en attente
const totalB = (p, d = pendDelta(p)) => `<b${d > 0 ? ` class="pend" title="${esc(t('pendTotal2', { o: fmt(p.total), n: fmt(d) }))}"` : ''} data-n="${p.total + d}">${fmt(p.total + d)}</b>`;
function skillItems0(p, peers) {
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
  + (it.est ? `<span class="est">${t('tipEst')}</span>` : '') + (it.spare ? `<span class="est">${t('tipSpare')}</span>` : '')
  + (it.pend ? `<span class="est">${t('pendTip', { v: it.pend })}</span>` : '');
// l'icône : le portrait du personnage pour le niveau, l'icône du jeu pour le reste
const pic = it => it.key === 'level'
  ? (it.ava ? `<img src="${esc(it.ava)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="logo"></span>')
  : `<img src="${icon(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
const tileOf = it => `<div class="tile g-${it.group}${it.est ? ' est' : ''}${it.spare ? ' spare' : ''}" tabindex="0" data-tip="${esc(tipOf(it))}" aria-label="${esc(it.name)} ${it.rank} / ${it.max}">`
  + pic(it) + `<span class="num"><b${it.pend ? ' class="pend"' : ''}>${it.pend || it.rank}</b><small>/${it.max}</small></span></div>`;
const lineOf = it => `<div class="sline g-${it.group}${it.est ? ' est' : ''}${it.spare ? ' spare' : ''}" tabindex="0" data-tip="${esc(tipOf(it))}">
  <span class="sic2">${pic(it)}</span>
  <span class="snm"><b>${esc(it.name)}</b>${it.tier ? `<small>${esc(it.tier)}</small>` : it.est ? `<small>${t('est')}</small>` : ''}</span>
  <span class="sbar"><i style="--w:${Math.min(100, 100 * it.rank / it.max).toFixed(1)}%"></i>${it.pend ? `<i class="pend" style="--w:${Math.min(100, 100 * it.pend / it.max).toFixed(1)}%"></i>` : ''}</span>
  <span class="sv"><b${it.pend ? ` class="pend" title="${esc(t('pendTitle'))}"` : ''}>${it.pend || it.rank}</b><small> / ${it.max}</small></span>
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
const dropBar = p => `<div class="dbar"><span class="logo"></span><span class="dn">${totalB(p)}<small> / ${fmt(p.max || 2460)}</small></span>${tri(p)}</div>`;

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

// fraîcheur : quand l'armurerie a été relue, et l'âge de l'export du jeu (sans lui, le site ne sait pas ce qu'il te manque)
const hoursAgo = at => { const h = (Date.now() - at) / 36e5; return h < 1 ? t('agoLt1h') : h < 24 ? t('agoH', { n: Math.round(h) }) : dayAgo(at); };
const freshLine = p => `<p class="fresh">${DATA.updated ? t('freshArm', { d: hoursAgo(Date.parse(DATA.updated)) }) : ''}${p.preview ? '' : ' · ' + (p.dropamineAt ? t('freshExp', { d: dayAgo(Date.parse(p.dropamineAt)) }) : t('freshNoExp'))}</p>`;
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
  const desc = ['fr', 'es', 'it', 'pt'].includes(LANG) ? `${esc(className(p))} ${esc(raceName(p))}` : `${esc(raceName(p))} ${esc(className(p))}`;
  const mine = Bnet.mine();
  const picker = mine.length > 1 && mine.includes(p)
    ? `<div class="mine-pick"><span>${t('myChars')}</span>${mine.map(m => `<span class="chip ${m === p ? 'on' : ''}" data-c="${esc(pkey(m))}">${full(m)} <small>${m.level}</small></span>`).join('')}</div>` : '';
  $('#char-panel').innerHTML = `${picker}
    <div class="who${p.render ? ' has-render' : ''}">
      ${portrait}
      <div><h2>${full(p)}</h2><p>${desc} · ${t('levelN', { n: p.level })}${p.guild ? ` · <a href="?p=guild&g=${esc(p.guild.slug)}" data-g="${esc(p.guild.slug)}">${esc(p.guild.name)}</a>` : ''} · ${esc((p.region || 'eu').toUpperCase())}${rulesetName(p) ? ' ' + esc(rulesetName(p)) : ''}</p>
        ${p.preview ? `<span class="seal pv">${t('sealPreview')}</span><p class="pv-note">${t('previewNote')}</p>` : p.complete ? `<span class="seal"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m5 12 5 5 9-10"/></svg>${t('sealOk')}</span>` : `<span class="seal est">${t('sealEst')}</span>`}
        <button class="share" type="button" data-share="${esc(pkey(p))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg><span>${t('share')}</span></button><button class="share hsb" type="button" data-hsimg="${esc(pkey(p))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h6M7 13h10M7 17h8"/></svg><span>${t('hsBtn')}</span></button>${freshLine(p)}</div>
      ${(() => {
        // ligne collée en attente : le total simulé en grand, discret ; l'officiel (armurerie) dessous.
        // Ne comptent que ce qui compte dans le total : niveau, Défense, les 2 armes en main, les métiers.
        const d = pendDelta(p);
        const shown = p.total + d;
        return `<div class="score">${dayGain(p) > 0 ? `<div class="toast1"><b>+${fmt(dayGain(p))}</b> ${t('sinceY')}</div>` : ''}<div class="n${d > 0 ? ' pend' : ''}" data-n="${shown}"${d > 0 ? ` title="${esc(t('pendTitle'))}"` : ''}>${fmt(shown)}<small> / ${fmt(p.max || 2460)}</small></div><div class="r">${totalRank ? ord(totalRank) + ' · ' : ''}${t('totalLevel')}</div>${d > 0 ? `<div class="pendnote">${t('pendTotal2', { o: fmt(p.total), n: fmt(d) })}</div>` : ''}</div>`;
      })()}
    </div>
    ${secNav(p)}
    <div id="sec-skills">${skillsBlock(p, peers)}</div>
    ${dropBook(p)}
    ${huntPanel(p)}
    ${pvpPanel(p)}
    ${advPanel(p, hist, gained)}
    ${repsPanel(p)}
    ${p.complete ? '' : `<div class="cta">${t('ctaEst')}</div>`}`;
  if (p.dropamine?.collection?.items?.length) fillClog(p);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-share]'); if (!b) return;
  const p = DATA.players.find(x => pkey(x) === b.dataset.share); if (!p) return;
  // lien d'aperçu : une page par personnage avec son propre résumé et son buste (WhatsApp, Discord…), qui mène à la fiche
  const url = `https://dropamine.app/c/${p.region || 'eu'}/${String(p.slug).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9-]/g, '')}/`;
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
    records: d.records, hunt: d.hunt?.map(h => ({ ...h, name: huntName(h) })), stats: { ...(p.stats || {}), hk: armoryStat(p, 'hk') }, reps: p.reps || [] };
  return { book, BL: fr
    ? { locale: 'fr-FR', li: 1, sessionS: 'Session', dayS: 'Jour', hourS: 'Heure', kb: 'Coups fatals', pvpDeaths: 'Tué par joueurs', duels: 'Duels G / P', dungeons: 'Donjons', reps: 'Réputations', factions: 'factions', title: 'Progression Dropamine', log: 'Carnet de collection', ach: 'Succès', played: 'Temps de jeu', hk: 'Victoires honorables', week: 'cette sem.',
        rec: 'Records', sessions: 'sessions', session: 'Meilleure session', day: 'Meilleur jour', hour: 'Meilleure heure', combo: 'Plus long combo',
        pvp: 'JcJ', honorWeek: 'Honneur semaine', honor: "Points d'honneur", highest: 'Rang le plus haut', dk: 'Vict. déshonorantes',
        hunt: 'Objets recherchés', found: 'trouvé', tries: 'essais', kills: 'Créatures tuées', quests: 'Quêtes', deaths: 'Morts', flights: 'Trajets aériens', armory: 'Armurerie', inviteT: 'Complète ta progression',
        invite1: 'Carnet, records, objets recherchés : tape', invite2: '/drop hiscores en jeu, colle ta ligne sur le site.' }
    : { locale: 'en-US', li: 0, sessionS: 'Session', dayS: 'Day', hourS: 'Hour', kb: 'Killing blows', pvpDeaths: 'Killed by players', duels: 'Duels W / L', dungeons: 'Dungeons', reps: 'Reputations', factions: 'factions', title: 'Dropamine progress', log: 'Collection log', ach: 'Achievements', played: 'Played', hk: 'Honorable kills', week: 'this week',
        rec: 'Records', sessions: 'sessions', session: 'Best session', day: 'Best day', hour: 'Best hour', combo: 'Longest combo',
        pvp: 'PvP', honorWeek: 'Honor this week', honor: 'Honor points', highest: 'Highest rank', dk: 'Dishonorable kills',
        hunt: 'Wanted items', found: 'found', tries: 'tries', kills: 'Creatures killed', quests: 'Quests', deaths: 'Deaths', flights: 'Flights taken', armory: 'Armory', inviteT: 'Complete your progress',
        invite1: 'Collection log, records, wanted items: type', invite2: '/drop hiscores in game, paste your line on the site.' } };
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
    await loadItems();   // noms d'objets dans la langue de l'image
    if (!dlg) build();
    p = player;
    let files = false; try { files = !!navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] }) && matchMedia('(pointer:coarse)').matches; } catch (e) { /* pas de partage de fichier */ }
    $('.sh', dlg).hidden = !files;
    dlg.showModal();
    const desc = ['fr', 'es', 'it', 'pt'].includes(LANG) ? `${className(p)} ${raceName(p)}` : `${raceName(p)} ${className(p)}`;
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
  const book = ['collection', 'achievements', 'records'].some(k => d[k]) || p.played;
  const items = [['sec-skills', t('skillsT')], [book ? 'sec-book' : null, t('dbTitle')], [d.hunt?.length || Bnet.isMine(pkey(p)) ? 'sec-hunt' : null, t('dbHunt')],
    [armoryStat(p, 'hk') != null || st.pvpDeaths != null ? 'sec-pvp' : null, t('pvpT')], ['sec-adv', t('advT')],
    [p.reps?.length ? 'sec-reps' : null, t('repsT')]].filter(([id]) => id);
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
// saison JcJ : pour chaque semaine (lundi), la dernière semaine déclarée par l'addon ; honneur par victoire et victoires
function pvpWeeks(p) {
  const byWeek = new Map();
  for (const h of p.history || []) {
    if (!h.pw) continue;
    const d = new Date(h.d + 'T12:00:00Z'), monday = new Date(d); monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    byWeek.set(monday.toISOString().slice(0, 10), h.pw);
  }
  return [...byWeek].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4).map(([w, [hon, hk]]) => ({ w, hon, hk, hpk: hk >= 10 ? hon / hk : null }));
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
        ${(() => { const h = hpkOf(p); return h == null ? '' : tile('spell_holy_sealofwrath', t('hpkT'), h.toLocaleString(locale(), { maximumFractionDigits: 1 }),
          t('hpkSub', { h: fmt(p.dropamine.pvp.honorWeek), k: fmt(p.dropamine.pvp.hkWeek) }) + ' ' + hpkBadge(p)); })()}
        ${(() => { const ws = pvpWeeks(p); return ws.length < 2 ? '' : `<div class="pvweeks"><h4 class="minor">${t('pvWeeksT')}</h4><ul>${ws.map(x => `<li><span>${t('pvWeekOf', { d: new Date(x.w + 'T12:00:00Z').toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) })}</span><b>${x.hpk == null ? '—' : x.hpk.toLocaleString(locale(), { maximumFractionDigits: 1 })}</b><small>${fmt(x.hon)} / ${fmt(x.hk)}</small></li>`).join('')}</ul></div>`; })()}
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
/* ---------- Ouverture des raids sur Forever : le 9 décembre 2026 (heure pas encore annoncée : minuit, heure de Paris) ----------
   Ouvrent ce jour-là : Barrow Deeps (10), Hyjal Summit (20), Repaire d'Onyxia (40, harmonisation). Pas le Cœur du Magma ni les autres.
   Dans les tables de butin, seul Onyxia existe : c'est le seul raid suggéré, et seulement après l'ouverture. */
const RAID_OPEN = Date.parse('2026-12-09T00:00:00+01:00');
const OPEN_RAIDS = new Set(['Onyxia', 'BarrowDeeps', 'HyjalSummit']);
const raidsOpen = () => Date.now() >= RAID_OPEN;
const raidAvailable = d => raidsOpen() && OPEN_RAIDS.has(d.key);
function raidBanner() {
  const left = RAID_OPEN - Date.now();
  if (left < -3 * 864e5) return '';   // trois jours après l'ouverture, le bandeau s'efface
  const date = new Date(RAID_OPEN).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  return `<section class="raidb${left <= 0 ? ' open' : ''}" style="--art:url('https://render.worldofwarcraft.com/eu/zones/onyxias-lair-small.jpg')">
    <div class="rb-t"><p class="kicker">${t('raidK')}</p><h3>${left > 0 ? t('raidT') : t('raidOpenT')}</h3><p>${left > 0 ? t('raidSub', { d: date }) : t('raidOpenSub')}</p></div>
    ${left > 0 ? `<div class="rb-c" data-countdown="${RAID_OPEN}">${countdownHtml(left)}</div>` : ''}</section>`;
}
function countdownHtml(ms) {
  const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), sec = Math.floor(ms % 6e4 / 1e3);
  const cell = (n, k) => `<div><b>${String(n).padStart(2, '0')}</b><span>${t(k)}</span></div>`;
  return cell(d, 'cdD') + cell(h, 'cdH') + cell(m, 'cdM') + cell(sec, 'cdS');
}
// le compte à rebours avance chaque seconde, seulement quand il est à l'écran
setInterval(() => {
  if (document.hidden) return;
  for (const el of document.querySelectorAll('[data-countdown]')) {
    const left = +el.dataset.countdown - Date.now();
    if (left <= 0) { if (state.view === 'home') renderHome(); return; }
    el.innerHTML = countdownHtml(left);
  }
}, 1000);

/* ---------- Ma chasse : la liste de chasse emplacement par emplacement, et des suggestions pour la remplir ---------- */
// emplacement de l'objet (type d'inventaire de l'API) → case de la silhouette
const SLOT_OF = { HEAD: 'HEAD', NECK: 'NECK', SHOULDER: 'SHOULDER', CLOAK: 'BACK', CHEST: 'CHEST', ROBE: 'CHEST', WRIST: 'WRIST', HAND: 'HANDS', WAIST: 'WAIST',
  LEGS: 'LEGS', FEET: 'FEET', FINGER: 'FINGER', TRINKET: 'TRINKET', WEAPON: 'MAIN', TWOHWEAPON: 'MAIN', WEAPONMAINHAND: 'MAIN', WEAPONOFFHAND: 'OFF',
  SHIELD: 'OFF', HOLDABLE: 'OFF', RANGED: 'RANGED', RANGEDRIGHT: 'RANGED', THROWN: 'RANGED', RELIC: 'RANGED' };
// emplacement de l'équipement porté (armurerie) → même case
const GEAR_SLOT = { HEAD: 'HEAD', NECK: 'NECK', SHOULDER: 'SHOULDER', BACK: 'BACK', CHEST: 'CHEST', WRIST: 'WRIST', HANDS: 'HANDS', WAIST: 'WAIST', LEGS: 'LEGS',
  FEET: 'FEET', FINGER_1: 'FINGER', FINGER_2: 'FINGER', TRINKET_1: 'TRINKET', TRINKET_2: 'TRINKET', MAIN_HAND: 'MAIN', OFF_HAND: 'OFF', RANGED: 'RANGED' };
const DOLL_L = ['HEAD', 'NECK', 'SHOULDER', 'BACK', 'CHEST', 'WRIST'], DOLL_R = ['HANDS', 'WAIST', 'LEGS', 'FEET', 'FINGER', 'TRINKET'], DOLL_B = ['MAIN', 'OFF', 'RANGED'];
const ARMOR_SLOTS = new Set(['HEAD', 'SHOULDER', 'CHEST', 'WRIST', 'HANDS', 'WAIST', 'LEGS', 'FEET']);
const WPN_SUB = { 0: 'axes', 1: 'axes2h', 2: 'bows', 3: 'guns', 4: 'maces', 5: 'maces2h', 6: 'polearms', 7: 'swords', 8: 'swords2h', 10: 'staves', 13: 'fist', 15: 'daggers', 16: 'thrown', 18: 'crossbows', 19: 'wands' };
// armes que chaque classe peut apprendre (Classic)
const CLASS_WPN = { 1: 'axes axes2h bows crossbows guns maces maces2h polearms swords swords2h staves fist daggers thrown', 2: 'axes axes2h maces maces2h polearms swords swords2h',
  3: 'axes axes2h bows crossbows guns polearms swords swords2h staves fist daggers thrown', 4: 'bows crossbows guns maces swords fist daggers thrown',
  5: 'maces staves daggers wands', 7: 'axes axes2h maces maces2h staves fist daggers', 8: 'swords staves daggers wands', 9: 'swords staves daggers wands', 11: 'maces maces2h staves fist daggers' };
// la meilleure armure portable : plaques et mailles à partir du niveau 40
const armorFor = p => { const c = p.classId, hi = p.level >= 40; return [1, 2].includes(c) ? (hi ? 4 : 3) : [3, 7].includes(c) ? (hi ? 3 : 2) : [4, 11].includes(c) ? 2 : 1; };
function canUse(p, it) {
  const [cls, sub] = it.c || [];
  if (cls === 4) {
    if (it.s === 'SHIELD') return [1, 2, 7].includes(p.classId);
    if (it.s === 'HOLDABLE') return [2, 5, 7, 8, 9, 11].includes(p.classId);
    if (!ARMOR_SLOTS.has(SLOT_OF[it.s])) return true;   // cou, dos, doigt, bijou : tout le monde
    return sub === armorFor(p);
  }
  if (cls === 2) return (CLASS_WPN[p.classId] || '').split(' ').includes(WPN_SUB[sub]);
  return false;
}
const cleanName = s => String(s || '').replace(/\s*\([^)]*\)\s*$/, '');
// nom de la fiche officielle s'il existe ; sinon (objet propre à Forever) le nom envoyé par le jeu, en français sur le site français
const huntName = h => { const x = ITEMS?.[h.id], own = cleanName(h.name); if (x?.q) return itemName(h.id); return (LANG === 'fr' ? own : extra() ? ITEMX?.[h.id]?.[0] || x?.n?.[0] : x?.n?.[0]) || own || x?.n?.[0] || '#' + h.id; };
const bestSrc = id => (LOOT?.idx?.get(id) || []).slice().sort((a, b) => (b.rate || 0) - (a.rate || 0))[0];
const bossName = b => isTrash(b) ? t('runsTrash') : (L2(b.n) || b.n[0]);
const rateTxt = r => r ? r.toLocaleString(locale(), { maximumFractionDigits: r < 10 ? 1 : 0 }) + ' %' : '';
const itemChip = id => `<span class="ci lit" data-item="${id}" style="--q:${QCOL[ITEMS?.[id]?.q] || '#8a7a5a'}"><img src="${itemIcon(id)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`;
function wornBySlot(p) { const w = {}; for (const [s, id] of p.gear || []) { const k = GEAR_SLOT[s]; if (k) (w[k] ||= []).push(id); } return w; }
// suggestions : objets de donjon utilisables, à ton niveau, meilleurs que ce que tu portes (niveau d'objet), ni obtenus ni déjà chassés
function huntSuggest(p) {
  const owned = new Set(p.dropamine?.collection?.items || []), hunted = new Set((p.dropamine?.hunt || []).map(h => h.id));
  const worn = wornBySlot(p), out = {};
  const wornLv = k => { const ids = worn[k] || []; return ids.length ? Math.min(...ids.map(id => ITEMS?.[id]?.lv || 0)) : 0; };
  for (const d of LOOT.dungeons) {
    if (fitOf(p, d) === 'low' || (isRaid(d) && !raidAvailable(d))) continue;
    for (const b of d.bosses) for (const e of b.i) {
      if (noDrop(b)) continue;
      const id = Array.isArray(e) ? e[0] : e, rate = Array.isArray(e) ? e[1] : null, it = ITEMS?.[id];
      if (!it?.s || !it.lv || !['UNCOMMON', 'RARE', 'EPIC'].includes(it.q)) continue;
      const k = SLOT_OF[it.s];
      if (!k || owned.has(id) || hunted.has(id) || (worn[k] || []).includes(id)) continue;
      const rl = it.rl || Math.max(1, it.lv - 5);   // niveau requis absent : estimé d'après le niveau d'objet
      if (rl > p.level + 3 || rl < p.level - 12 || !canUse(p, it)) continue;
      // fiche de l'API sans rapport avec le donjon (autre version de l'objet) : on ne s'y fie pas
      const mid = (d.lvl || [])[1]; if (mid && rl < mid - 12) continue;
      const base = wornLv(k), gain = it.lv - base;
      if (base && gain <= 0) continue;
      const score = (base ? gain : it.lv / 4) + (it.q === 'EPIC' ? 6 : it.q === 'RARE' ? 3 : 0) + (rate ? Math.min(rate, 40) / 8 : 0);
      const m = (out[k] ||= new Map()), prev = m.get(id);
      if (!prev || (rate || 0) > (prev.rate || 0)) m.set(id, { id, it, d, b, rate, gain: base ? gain : null, score });
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, m]) => [k, [...m.values()].sort((a, b) => b.score - a.score).slice(0, 3)]));
}
let huntWait = null;
function huntPanel(p) {
  const hunt = p.dropamine?.hunt || [], mine = Bnet.isMine(pkey(p));
  if (!hunt.length && !mine) return '';
  if (!LOOT || !ITEMS) {
    huntWait ??= Promise.all([loadLoot(), loadItems()]).then(() => { if (state.view === 'char') renderChar(); });
    return `<section class="cat hunt" id="sec-hunt">${catHead('hunt', t('dbHunt'), 'decl')}${loadingBox()}</section>`;
  }
  const bySlot = {};
  for (const h of hunt) { const k = SLOT_OF[ITEMS[h.id]?.s]; if (k) (bySlot[k] ||= []).push(h); }
  const tile = (k, side) => { const hs = bySlot[k] || [], h = hs[0];
    return `<div class="hslot ${side}${h ? ' on' : ''}${h?.drops ? ' got' : ''}">${h ? itemChip(h.id) : '<span class="ci none" aria-hidden="true"></span>'}
      <span class="hs-t"><small>${t('slot.' + k)}</small>${h ? `<b>${esc(huntName(h))}</b>${hs.length > 1 ? `<em>${t('hsMore', { n: hs.length - 1 })}</em>` : ''}` : ''}</span></div>`; };
  const found = hunt.filter(h => h.drops > 0).length, tries = hunt.reduce((n, h) => n + (h.tries || 0), 0), slots = Object.keys(bySlot).length;
  const doll = `<div class="hdoll">
      <div class="hcol">${DOLL_L.map(k => tile(k, 'l')).join('')}</div>
      <div class="hmid"><img src="Dropamine-Logo.png" alt="" width="64" height="64"><div class="hbig"><b>${found}</b> / ${hunt.length}</div><p>${t('hsFound')}</p>
        <p class="hsm">${t('hsTries', { n: fmt(tries) })} · ${t('hsSlots', { n: slots })}</p>
        <a class="btn gold" href="?p=runs" data-view-link="runs">${t('hsOrganise')}</a></div>
      <div class="hcol r">${DOLL_R.map(k => tile(k, 'r')).join('')}</div>
      <div class="hbot">${DOLL_B.map(k => tile(k, 'l')).join('')}</div></div>`;
  const rows = hunt.map(h => { const s = bestSrc(h.id);
    return `<li class="${h.drops ? 'got' : ''}">${itemChip(h.id)}<b style="color:${QCOL[ITEMS[h.id]?.q] || 'var(--cream)'}">${esc(huntName(h))}</b>
      <span class="src">${s ? `${esc(bossName(s.b))} · ${esc(s.d.name)}` : ''}</span><span class="rt">${s?.rate ? t('hsRate', { r: rateTxt(s.rate) }) : t('hsRateNo')}</span>
      <span class="st">${h.drops ? '✓ ' + t('huFound') : h.tries ? t('huTries', { n: fmt(h.tries) }) : t('hsToTry')}${mine ? `<button class="hdel" type="button" data-hdel="${h.id}" title="${t('hsDel')}" aria-label="${t('hsDel')}">×</button>` : ''}</span></li>`; }).join('');
  const list = hunt.length ? `<ul class="hlist">${rows}</ul>` : `<p class="note">${t('hsEmpty')}</p>`;
  const msg = state.huntMsgFor === pkey(p) ? state.huntMsg : '';
  const siteNote = mine && (p.dropamine?.huntSite || msg) ? `<div class="hsite">${msg ? `<p class="msg">${msg}</p>` : ''}${p.dropamine?.huntSite && hunt.length
    ? `<p>${t('hsSiteNote', { d: new Date(p.dropamine.huntSite).toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) })}</p><code>${'/drop DROP-CH1:' + hunt.filter(h => !h.drops).map(h => b36(h.id)).join('.')}</code><button class="btn ghost" type="button" data-hsync>${t('hsCmdCopy')}</button>` : ''}</div>` : '';
  return `<section class="cat hunt" id="sec-hunt">${catHead('hunt', t('dbHunt'), 'decl', t('hsSub'))}${doll}${siteNote}${list}${mine ? huntBuilder(p, hunt) : ''}</section>`;
}
function huntBuilder(p, hunt) {
  const sug = huntSuggest(p), worn = wornBySlot(p), free = Math.max(0, 20 - hunt.length);
  const order = [...DOLL_L, ...DOLL_R, ...DOLL_B].filter(k => sug[k]?.length);
  const groups = order.map(k => { const w = (worn[k] || [])[0];
    return `<section class="hsg"><h4>${t('slot.' + k)}${w ? `<small>${t('hsWorn')} ${itemChip(w)}${ITEMS?.[w]?.lv ? ' ' + t('hsIlvl', { n: ITEMS[w].lv }) : ''}</small>` : ''}</h4>
      ${sug[k].map(x => `<label class="hopt"><input type="checkbox" data-hpick="${x.id}">${itemChip(x.id)}<span><b style="color:${QCOL[x.it.q]}">${esc(itemName(x.id))}</b>
        <small>${esc(bossName(x.b))} · ${esc(x.d.name)}${x.rate ? ' · ' + rateTxt(x.rate) : ''}</small></span><i class="gain">${x.gain ? '+' + x.gain : t('hsIlvl', { n: x.it.lv })}</i></label>`).join('')}</section>`; }).join('');
  return `<div class="hsug" data-free="${free}"><div class="cathead"><h3 class="sub">${t('hsSugT')}</h3><span class="cx2">${t('hsSugSub')}</span></div>
    <p class="note">${p.gear?.length ? t('hsSugHow') : t('hsSugNoGear')}${!raidsOpen() && p.level >= 55 ? ' ' + t('raidSugNote', { d: new Date(RAID_OPEN).toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) }) : ''}</p>
    ${groups ? `<div class="hsug-grid">${groups}</div>` : `<p class="note">${t('hsSugNone')}</p>`}
    <div class="hcode"><span data-hcount>${t('hsPicked', { n: 0 })} · ${t('hsFree', { n: free })}</span><code data-hcode>/drop …</code>
      <button class="btn gold" type="button" data-hsave disabled>${t('hsSave')}</button><button class="btn ghost" type="button" data-hcopy disabled>${t('hsCmdCopy')}</button><small>${t('hsCodeHow')}</small></div></div>`;
}
// coches → commande d'import (identifiants en base 36) ; jamais plus que les places libres de la liste en jeu
const b36 = n => Number(n).toString(36);
document.addEventListener('change', e => {
  const box = e.target.closest('.hsug'); if (!box || !e.target.matches('[data-hpick]')) return;
  const free = +box.dataset.free, picked = [...box.querySelectorAll('[data-hpick]:checked')];
  if (picked.length > free) { e.target.checked = false; picked.splice(picked.indexOf(e.target), 1); }
  const ids = picked.map(x => +x.dataset.hpick), cmd = ids.length ? `/drop DROP-CH1:${ids.map(b36).join('.')}` : '/drop …';
  box.querySelector('[data-hcount]').textContent = t('hsPicked', { n: ids.length }) + ' · ' + t('hsFree', { n: free });
  box.querySelector('[data-hcode]').textContent = cmd;
  box.querySelector('[data-hcopy]').disabled = !ids.length;
  box.querySelector('[data-hsave]').disabled = !ids.length;
});
// liste enregistrée sur le site (compte connecté) : visible tout de suite ; le prochain /drop hiscores avec la chasse la remplace
async function saveHunt(ids, msgKey) {
  const p = DATA.players.find(x => pkey(x) === state.c); if (!p || !Bnet.isMine(pkey(p))) return;
  try {
    const r = await Bnet.call('/hunt/save', { key: pkey(p), items: ids.map(id => ({ id, name: itemName(id) })) }), j = await r.json().catch(() => ({}));
    if (!r.ok) { state.huntMsg = t(j.error === 'full' ? 'hsFull' : 'hsErr'); }
    else { p.dropamine = { ...(p.dropamine || {}), hunt: j.hunt, huntSite: new Date().toISOString().slice(0, 10) }; if (!j.hunt?.length) delete p.dropamine.hunt; state.huntMsg = t(msgKey); Ribbon.swell(.7); }
  } catch { state.huntMsg = t('hsErr'); }
  state.huntMsgFor = pkey(p); renderChar(); document.getElementById('sec-hunt')?.scrollIntoView({ block: 'start' });
}
document.addEventListener('click', e => {
  const sv = e.target.closest('[data-hsave]'), del = e.target.closest('[data-hdel]'), sync = e.target.closest('[data-hsync]');
  const p = (sv || del || sync) && DATA.players.find(x => pkey(x) === state.c); if (!p) return;
  const cur = (p.dropamine?.hunt || []).map(h => h.id);
  if (sv) { sv.disabled = true; saveHunt([...cur, ...[...sv.closest('.hsug').querySelectorAll('[data-hpick]:checked')].map(x => +x.dataset.hpick)], 'hsSaved'); }
  if (del) saveHunt(cur.filter(id => id !== +del.dataset.hdel), 'hsRemoved');
  if (sync) navigator.clipboard?.writeText(sync.previousElementSibling.textContent).then(() => { sync.textContent = t('copied'); setTimeout(() => { sync.textContent = t('hsCmdCopy'); }, 1600); }).catch(() => {});
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-hcopy]'); if (!b) return;
  try { await navigator.clipboard.writeText(b.closest('.hsug').querySelector('[data-hcode]').textContent); b.textContent = t('copied'); setTimeout(() => { b.textContent = t('hsCmdCopy'); }, 1600); }
  catch (err) { /* copie refusée : la commande reste lisible et sélectionnable */ }
});

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
  if (false) {
    const rows = d.hunt.map(h => `<li><span>${esc(h.name)}</span><em>${h.tries ? t('huTries', { n: fmt(h.tries) }) : ''}</em><b class="${h.drops ? 'ok' : ''}">${h.drops ? '✓ ' + (h.drops > 1 ? '×' + h.drops : t('huFound')) : '—'}</b></li>`).join('');
    parts.push(`<section class="db-card"><h4>${t('dbHunt')}</h4><ul class="db-list hunt">${rows}</ul></section>`);
  }
  if (!parts.length) return '';
  const when = p.dropamineAt ? new Date(p.dropamineAt).toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) : '';
  return `<section class="cat dbook" id="sec-book">${catHead('book', t('dbTitle'), 'decl', when ? t('dbWhen', { d: when }) : '')}
    <div class="db-grid">${parts.join('')}</div></section>`;
}

const playedText = s => { const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? t('durDH', { d, h }) : t('durHM', { h, m }); };

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
const RAIDS = {};   // site/data/raids.json : { clé: { size, roles: { tank, heal, dps }, opens } } ; activités : { size, activity }
const capOf = key => RAIDS[key]?.roles ? { ...RAIDS[key].roles } : { tank: 1, heal: 1, dps: 3 };
// une sortie a-t-elle encore de la place (pour ce rôle) ?
function runHasRoom(run, role) {
  const RI = RAIDS[run.dungeon];
  if (RI?.activity) return run.members.length < RI.size;
  const l = capOf(run.dungeon); run.members.forEach(m => l[m.role]--);
  return role ? l[role] > 0 : (l.tank > 0 || l.heal > 0 || l.dps > 0);
}
function loadLoot() {
  return lootLoad ??= Promise.all([fetch('data/loot.json').then(r => r.json()), fetch('data/dnames.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
    fetch('data/raids.json').then(r => r.ok ? r.json() : {}).catch(() => ({}))]).then(([j, names, rj]) => {
    // raids de Forever (taille, rôles, ouverture) ; ceux sans table de butin (pas encore connue) entrent dans la liste sans boss
    for (const a of rj.activities || []) {
      RAIDS[a.key] = { ...a, activity: true };
      names[a.key] = a.names;
      if (!j.dungeons.some(d => d.key === a.key)) j.dungeons.push({ key: a.key, name: a.names[0], lvl: [], bosses: [], activity: true });
    }
    for (const r of rj.raids || []) {
      RAIDS[r.key] = r;
      if (r.names) names[r.key] = names[r.key] || r.names;
      if (!j.dungeons.some(d => d.key === r.key)) j.dungeons.push({ key: r.key, name: r.names?.[0] || r.key, lvl: [r.level || 60, r.level || 60, r.level || 60], bosses: [], upcoming: true });
    }
    // nom du donjon dans la langue du site (noms officiels du Journal Blizzard) : d.name suit la langue partout
    for (const d of j.dungeons) { const en = d.name, n = names[d.key]; Object.defineProperty(d, 'name', { get: () => (n ? n[li()] : en) || en, enumerable: true }); d.names = n || [en, en]; }
    const idx = new Map();
    for (const d of j.dungeons) for (const b of d.bosses) if (!noDrop(b)) for (const it of b.i) {
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
const itemName = id => { const x = ITEMS?.[id]; if (extra() && ITEMX?.[id]?.[0]) return ITEMX[id][0]; return x ? ((LANG === 'fr' ? x.n[1] : x.n[0]) || x.n[0]) : '#' + id; };
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
    const lx = extra() && ITEMX?.[id]?.[1];
    const lines = (it?.t || []).map((l, i) => `<div${l[2] ? ` style="color:${l[2]}"` : ''}>${esc(lx?.[i] || (LANG === 'fr' ? l[1] || l[0] : l[0]))}</div>`).join('');
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
  .then(j => { RUNS = j.runs || []; Notif?.check?.(); }).catch(e => { if (e.message !== '429') RUNS = RUNS ?? null; })) : runsLoad;
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
// tables d'AtlasLoot qui ne sont pas du butin : clés (le Maillet de Zul'Farrak rangé avec le Monastère), récompenses de quête, ensembles
const noDrop = b => /^keys$|quest rewards|\((horde|alliance) quest\)|^aq opening$|^tier \d sets$|heirlooms/i.test(b.n[0]);
const ROLE_OK = { tank: [1, 2, 11], heal: [5, 7, 2, 11] };   // par préférence : guerrier, paladin, druide / prêtre, chaman, paladin, druide
const ROLE_IC = { tank: 'ability_defend', heal: 'spell_holy_flashheal', dps: 'ability_dualwield' };
function dunItems(d) { const all = new Set(); d.bosses.forEach(b => b.i.forEach(e => all.add(Array.isArray(e) ? e[0] : e))); return all; }
// niveau d'un donjon : [entrée, niveau habituel, fin]. On le compte « à ta portée » à partir du niveau habituel - 6
// (le niveau d'entrée seul laissait passer Dire Maul à 31 ou le Temple englouti à 35)
const dunFrom = d => { const [lo, mid] = d.lvl || []; return lo ? Math.max(lo, (mid || lo) - 6) : 0; };
const fitOf = (p, d) => { const [lo, , hi] = d.lvl || []; if (!lo) return 'ok'; return p.level < dunFrom(d) ? 'low' : p.level > hi + 5 ? 'high' : 'ok'; };
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
  const said = (p, role) => p.role === role ? 0 : 1;   // rôle déclaré (données de démo) : passe en premier
  const fitRank = p => (people.get ? people.get(p) : new Map(people).get(p))?.fit === 'low' ? 1 : 0;   // trop bas : en dernier ; au-dessus : peut porter le groupe
  const used = new Set(), pick = role => {
    const p = pool.filter(x => !used.has(x) && ROLE_OK[role].includes(x.classId))
      .sort((x, y) => said(x, role) - said(y, role) || fitRank(x) - fitRank(y) || ROLE_OK[role].indexOf(x.classId) - ROLE_OK[role].indexOf(y.classId))[0];
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
// /w à l'organisateur, prêt à coller dans le chat du jeu
function runWhisper(run, role) {
  const d = LOOT.dungeons.find(x => x.key === run.dungeon), org = DATA.players.find(p => pkey(p) === run.by), at = new Date(run.at);
  // Forever : le /w demande le prénom et le nom (« /w Ray Kuilu … »)
  const who = org ? `${org.name} ${org.surname || ''}`.trim() : (String(run.by).split('/')[1] || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return `/w ${who} ${t('wMsg', { d: d?.name || run.dungeon, h: at.toLocaleString(locale(), { weekday: 'short', hour: '2-digit', minute: '2-digit' }), r: role ? t('role.' + role).toLowerCase() : t('wAny') })}`;
}
// rappel en jeu : l'addon garde la sortie et prévient 15 min avant (/drop sortie DROP-RUN1:<heure en base 36>~<donjon>~<organisateur>)
function runGameCode(run) {
  const d = LOOT.dungeons.find(x => x.key === run.dungeon), org = DATA.players.find(p => pkey(p) === run.by);
  const clean = x => String(x || '').replace(/[~|\n]/g, ' ').trim().replace(/\s+/g, '_').slice(0, 40);
  return `/drop DROP-RUN1:${Math.floor(Date.parse(run.at) / 1000).toString(36)}~${clean(d?.name || run.dungeon)}~${clean(org ? `${org.name} ${org.surname || ''}` : String(run.by).split('/')[1])}`;
}

// ---------- Notifications des sorties ----------
// site ouvert : on compare les sorties toutes les minutes (toast façon addon, titre de l'onglet, son au choix) ;
// site fermé : notifications push de l'appareil (abonnement enregistré sur api.dropamine.app, au choix du joueur)
const Notif = (() => {
  let snap = null, unread = 0, ctx = null;
  const baseTitle = () => document.title.replace(/^\(\d+\) /, '');
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } return null; };
  const soundOn = () => store('dropSound') === '1';
  const seen = new Set(JSON.parse(sessionStorage.getItem('dropSeen') || '[]'));
  const mark = k => { seen.add(k); try { sessionStorage.setItem('dropSeen', JSON.stringify([...seen].slice(-200))); } catch (e) { /* rien */ } };
  // le « drop » : deux notes douces (Web Audio, aucun fichier)
  function ping() {
    if (!soundOn()) return;
    try {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ctx.currentTime;
      [[660, 0], [990, .09]].forEach(([f, dt]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t0 + dt); g.gain.linearRampToValueAtTime(.18, t0 + dt + .015); g.gain.exponentialRampToValueAtTime(.001, t0 + dt + .35);
        o.connect(g).connect(ctx.destination); o.start(t0 + dt); o.stop(t0 + dt + .4); });
    } catch (e) { /* son indisponible */ }
  }
  function toast(html, runId) {
    let wrap = $('#ltoasts'); if (!wrap) { wrap = document.createElement('div'); wrap.id = 'ltoasts'; document.body.append(wrap); }
    const el = document.createElement('button'); el.type = 'button'; el.className = 'ltoast ntoast'; el.innerHTML = html;
    el.addEventListener('click', () => { el.remove(); state.runFocus = runId; state.ropen = runId; state.runFocused = false; go({ view: 'runs' }); });
    wrap.append(el); setTimeout(() => el.classList.add('out'), 9000); setTimeout(() => el.remove(), 9600);
    ping();
    if (document.hidden) { unread++; document.title = `(${unread}) ${baseTitle()}`; }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && unread) { unread = 0; document.title = baseTitle(); } });
  const dn = run => esc(LOOT?.dungeons.find(x => x.key === run.dungeon)?.name || run.dungeon);
  const nm = key => { const p = DATA.players.find(x => pkey(x) === key); return p ? esc(p.name) : esc(String(key).split('/')[1] || key); };
  // après chaque lecture des sorties : ce qui a changé pour moi
  function check() {
    const mine = new Set(Bnet.mine().map(pkey)); if (!mine.size || !RUNS) return;
    const now = Date.now(), cur = new Map(RUNS.map(r => [r.id, r]));
    const involved = r => mine.has(r.by) || r.members.some(m => mine.has(m.key));
    if (snap) {
      for (const [id, old] of snap) {
        const r = cur.get(id);
        if (!r) { if (Date.parse(old.at) > now) toast(`<b>${dn(old)}</b> ${t('nCancel')}`, id); continue; }
        if (mine.has(r.by)) {
          const was = new Set(old.members.map(m => m.key));
          for (const m of r.members) if (!was.has(m.key) && !mine.has(m.key)) toast(`<b>${nm(m.key)}</b> ${t('nJoin', { d: dn(r) })}`, id);
          for (const m of old.members) if (!r.members.some(x => x.key === m.key) && !mine.has(m.key)) toast(`<b>${nm(m.key)}</b> ${t('nLeave', { d: dn(r) })}`, id);
        }
      }
    }
    // rappels 30 min et 5 min avant, une fois chacun
    for (const r of RUNS) if (involved(r)) for (const min of [30, 5]) {
      const left = Date.parse(r.at) - now, k = r.id + '@' + r.at + '#' + min;
      if (left > 0 && left <= min * 60e3 && !seen.has(k)) { mark(k); toast(`<b>${dn(r)}</b> ${t('nSoon', { n: Math.max(1, Math.round(left / 60e3)) })}`, r.id); }
    }
    snap = new Map(RUNS.filter(involved).map(r => [r.id, structuredClone(r)]));
  }
  // hors de la page Chasse en groupe : on relit les sorties chaque minute si l'on est connecté
  setInterval(async () => { if (state.view !== 'runs' && Bnet.mine().length && !runsBackoff) { await loadRuns(true); check(); } }, 60e3);
  // --------------------------------------------------- push (site fermé)
  const pushOk = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let pushOn = null;
  async function pushState() {
    if (!pushOk()) return (pushOn = false);
    const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription();
    return (pushOn = !!sub && Notification.permission === 'granted');
  }
  const keyBytes = b => { const s0 = atob(b.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b.length % 4) % 4)); return Uint8Array.from(s0, c => c.charCodeAt(0)); };
  async function enable() {
    if (await Notification.requestPermission() !== 'granted') throw new Error('denied');
    const reg = await navigator.serviceWorker.ready, { key } = await (await fetch(API + '/push/key')).json();
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
    const res = await Bnet.call('/push/subscribe', { sub: sub.toJSON() }); if (!res.ok) throw new Error('server');
    pushOn = true;
  }
  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration(), sub = await reg?.pushManager.getSubscription();
    if (sub) { await Bnet.call('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
    pushOn = false;
  }
  // le petit panneau de la page Chasse en groupe
  function panel() {
    if (!Bnet.mine().length) return '';
    if (pushOn === null) pushState().then(() => { if (state.view === 'runs') { const el = $('#npanel'); if (el) el.outerHTML = panel(); } });
    const push = !pushOk() ? `<small>${t('nNoPush')}</small>` : ios && !standalone ? `<small>${t('nIos')}</small>`
      : pushOn ? `<button class="chip on" type="button" data-npush="off">🔔 ${t('nPushOn')}</button>` : `<button class="chip" type="button" data-npush="on">🔔 ${t('nPushOff')}</button>`;
    return `<div class="npanel" id="npanel"><span class="np-t">${t('nTitle')}</span>${push}<button class="chip${soundOn() ? ' on' : ''}" type="button" data-nsound>${soundOn() ? '🔊 ' + t('nSoundOn') : '🔈 ' + t('nSoundOff')}</button><small class="np-h">${t('nHint')}</small></div>`;
  }
  document.addEventListener('click', async e => {
    const sd = e.target.closest('[data-nsound]');
    if (sd) { store('dropSound', soundOn() ? '0' : '1'); ping(); $('#npanel').outerHTML = panel(); return; }
    const pb = e.target.closest('[data-npush]'); if (!pb) return;
    pb.disabled = true;
    try { if (pb.dataset.npush === 'on') await enable(); else await disable(); $('#npanel').outerHTML = panel(); }
    catch (err) { pb.disabled = false; pb.textContent = err.message === 'denied' ? t('nDenied') : t('runErr.x'); }
  });
  return { check, panel };
})();

function runIcs(run) {
  const d = LOOT.dungeons.find(x => x.key === run.dungeon), st = new Date(run.at), en = new Date(st.getTime() + 2 * 3600e3);
  const f = x => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dropamine//Runs//FR', 'BEGIN:VEVENT', `UID:${run.id}@dropamine.app`, `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(st)}`, `DTEND:${f(en)}`, `SUMMARY:${t('runIcsTitle', { d: (d?.name || run.dungeon).replace(/[,;]/g, ' ') })}`,
    `DESCRIPTION:${(run.note || '').replace(/[,;\n]/g, ' ')}`, `URL:${runUrl(run.id)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT30M', `DESCRIPTION:${t('runIcsTitle', { d: (d?.name || run.dungeon).replace(/[,;]/g, ' ') })}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.download = `run-${run.dungeon}.ics`; a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// ---------- Chasse en groupe : recherche (texte, niveau, type, rôle manquant, moment), gardée dans le lien ----------
const FOREVER_DUN = new Set(['ExcavationSiteWetlands', 'ShapersTerrace', 'TheAlcazPrison', 'TheBlackmawHold', 'TheCityOfDalaran', 'TheDrownedCity', 'TheHallOfThanes', 'TheKrolDokStronghold', 'TheRuinsOfLordaeron']);
const isRaid = d => !!RAIDS[d.key] || !(d.lvl || [])[0] || /Raid|Core|Lair|Naxx|Qiraj|Gurub|Hyjal|Barrow|Blackwing|Onyxia|WorldBosses/i.test(d.key);
const dunType = d => isRaid(d) ? 'raid' : FOREVER_DUN.has(d.key) ? 'forever' : 'dungeon';
const fold = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const LV_BANDS = [10, 20, 30, 40, 50];
function lvlMatch(d, me) {
  const hl = state.hl; if (!hl) return true;
  if (hl === 'me') return me.some(p => fitOf(p, d) === 'ok');
  const [lo, , hi] = d.lvl || [], b = +hl;
  return lo ? dunFrom(d) <= b + 9 && hi >= b : b >= 50;   // raids : avec la tranche 50-60
}
// tous les mots cherchés doivent se trouver quelque part dans le texte de la carte
const textMatch = hay => { const q = fold(state.hq).split(/\s+/).filter(Boolean); if (!q.length) return true; const h = fold(hay); return q.every(w => h.includes(w)); };
const dunText = d => [...(d.names || [d.name]), ...d.bosses.map(b => b.n.join(' '))].join(' ');   // recherche dans les deux langues
const huntsText = p => (p?.dropamine?.hunt || []).map(h => huntName(h) + ' ' + itemName(h.id)).join(' ');
const searchActive = () => !!(state.hq || state.hl || state.ht || state.hd || state.hr || state.hw || (state.pf && state.pf !== 'all'));
// liste des donjons pour la recherche : donjons, donjons Forever, raids ; chacun par niveau
function dunOptions() {
  const groups = [['dungeon', t('hsTypeDun')], ['forever', t('hsTypeFor')], ['raid', t('hsTypeRaid')]];
  return groups.map(([k, label]) => {
    const ds = LOOT.dungeons.filter(d => dunType(d) === k).sort((a, b) => (dunFrom(a) || 99) - (dunFrom(b) || 99) || a.name.localeCompare(b.name));
    return ds.length ? `<optgroup label="${esc(label)}">${ds.map(d => { const [lo, , hi] = d.lvl || [];
      return `<option value="${esc(d.key)}"${state.hd === d.key ? ' selected' : ''}>${esc(d.name)}${lo ? ` (${dunFrom(d)}–${hi})` : ''}</option>`; }).join('')}</optgroup>` : '';
  }).join('');
}
function renderRuns() {
  const box = $('#runs-panel');
  if (!LOOT || !ITEMS || !ART) {
    box.innerHTML = loadingBox();
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
  if (state.rlvl && me.length && !state.hl) runs = runs.filter(x => me.some(p => fitOf(p, x.d) === 'ok'));
  runs = runs.filter(x => lvlMatch(x.d, me) && (!state.ht || dunType(x.d) === state.ht) && (!state.hd || x.d.key === state.hd)
    && textMatch(dunText(x.d) + ' ' + [...x.people.keys()].map(p => p.name + ' ' + (p.guild?.name || '') + ' ' + huntsText(p)).join(' ')));
  const chips = `<div class="chips" role="group">${myGuild ? `<span class="chip ${scope === 'guild' ? 'on' : ''}" data-rscope="guild">${t('runsGuild')} · ${esc(myGuild.name)}</span>` : ''}<span class="chip ${scope === 'all' ? 'on' : ''}" data-rscope="all">${t('runsAll')}</span></div>`;

  // runs prévus (API) : ce que chaque inscrit chasse dans ce donjon
  const byKey = new Map(DATA.players.map(p => [pkey(p), p]));
  const huntsIn = (p, d) => (p?.dropamine?.hunt || []).filter(h => !h.drops && (LOOT.idx.get(h.id) || []).some(x => x.d.key === d.key))
    .map(h => ({ h, boss: (LOOT.idx.get(h.id) || []).find(x => x.d.key === d.key).b, rate: (LOOT.idx.get(h.id) || []).find(x => x.d.key === d.key).rate }));
  const mineKeys = new Set(me.map(pkey));
  const charSel = (sel) => `<select data-run-char>${me.map(p => `<option value="${esc(pkey(p))}"${pkey(p) === sel ? ' selected' : ''}>${full(p)} (${p.level})</option>`).join('')}</select>`;
  const roleSel = (sel, attr = 'data-run-role') => `<select ${attr}>${['tank', 'heal', 'dps'].map(x => `<option value="${x}"${x === sel ? ' selected' : ''}>${t('role.' + x)}</option>`).join('')}</select>`;
  const allRuns = [...(RUNS || [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));   // par date (les raids du 9 décembre après le reste)
  const pf = state.pf || 'all', pd = state.pd || '';
  const filtered = allRuns.filter(run => (pf !== 'mine' || run.members.some(m => mineKeys.has(m.key)))
    && (pf !== 'open' || runHasRoom(run))
    && (!pd || run.dungeon === pd)
    && (() => { const d = LOOT.dungeons.find(x => x.key === run.dungeon); if (!d) return false;
      if (!lvlMatch(d, me) || (state.ht && dunType(d) !== state.ht) || (state.hd && d.key !== state.hd)) return false;
      if (state.hr) { if (isRaid(d) && !RAIDS[d.key]) return false; if (!runHasRoom(run, state.hr)) return false; }
      if (state.hw) { const at = Date.parse(run.at), end = new Date(); end.setHours(23, 59, 59, 999); if (at > (state.hw === 'today' ? end.getTime() : Date.now() + 7 * 864e5)) return false; }
      return textMatch(dunText(d) + ' ' + (run.note || '') + ' ' + run.members.map(m => { const p = byKey.get(m.key); return (p ? p.name + ' ' + huntsText(p) : m.key); }).join(' ')); })());
  const plimit = state.plimit || 30, page = filtered.slice(0, plimit);
  const atLvl = me.length ? filtered.filter(run => { const d = LOOT.dungeons.find(x => x.key === run.dungeon); return d && me.some(p => fitOf(p, d) === 'ok'); }).length : 0;
  const dayKey = iso => new Date(iso).toDateString();
  const dayTitle = iso => { const d = new Date(iso), diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
    return diff <= 0 ? t('dayToday') : diff === 1 ? t('dayTomorrow') : d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }); };
  const dunsWithRuns = [...new Set(allRuns.map(x => x.dungeon))].map(k => LOOT.dungeons.find(d => d.key === k)).filter(Boolean);
  const pfiltersOld = allRuns.length > 1 ? `<div class="pfil chips">${[['all', 'pfAll'], ...(me.length ? [['mine', 'pfMine']] : []), ['open', 'pfOpen']].map(([k, l]) => `<span class="chip ${pf === k ? 'on' : ''}" data-pf="${k}">${t(l)}</span>`).join('')}
    ${dunsWithRuns.length > 1 ? `<select data-pd><option value="">${t('pfAllDun')}</option>${dunsWithRuns.map(d => `<option value="${esc(d.key)}"${pd === d.key ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select>` : ''}<span class="pcount">${t('pfCount', { n: filtered.length })}</span></div>` : '';
  const opt = (k, v, label) => `<option value="${v}"${(state[k] || '') === v ? ' selected' : ''}>${label}</option>`;
  const pfilters = `<div class="hsearch" role="search">
      <label class="hs-q"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" data-hq value="${esc(state.hq || '')}" placeholder="${t('hsQ')}" aria-label="${t('hsQ')}"></label>
      <select data-hf="hl" aria-label="${t('hsLvl')}">${opt('hl', '', t('hsLvlAll'))}${me.length ? opt('hl', 'me', t('hsLvlMe')) : ''}${LV_BANDS.map(b => opt('hl', String(b), t('hsLvlBand', { a: b, b: b + 10 }))).join('')}</select>
      <select data-hf="hd" aria-label="${t('hsDun')}">${opt('hd', '', t('hsDunAll'))}${dunOptions()}</select>
      <select data-hf="hr" aria-label="${t('hsRole')}">${opt('hr', '', t('hsRoleAll'))}${['tank', 'heal', 'dps'].map(x => opt('hr', x, t('hsNeed.' + x))).join('')}</select>
      <select data-hf="hw" aria-label="${t('hsWhen')}">${opt('hw', '', t('hsWhenAll'))}${opt('hw', 'today', t('dayToday'))}${opt('hw', 'week', t('hsWhenWeek'))}</select>
      <div class="hs-row">${[['all', 'pfAll'], ...(me.length ? [['mine', 'pfMine']] : []), ['open', 'pfOpen']].map(([k, l]) => `<span class="chip ${pf === k ? 'on' : ''}" data-pf="${k}">${t(l)}</span>`).join('')}
        <span class="pcount">${t('pfCount', { n: filtered.length })}${me.length ? ' · ' + t('pfAtLvl', { n: atLvl }) : ''}</span>${searchActive() ? `<button class="lnk" type="button" data-hreset>${t('hsReset')}</button>` : ''}</div></div>`;
  let lastDay = '';
  const perDay = new Map(); filtered.forEach(run => perDay.set(dayKey(run.at), (perDay.get(dayKey(run.at)) || 0) + 1));
  const planned = page.map(run => {
    const dk = dayKey(run.at), head = dk !== lastDay ? `${lastDay ? '</div>' : ''}<h4 class="rday">${dayTitle(run.at)}<small>${t('pfCount', { n: perDay.get(dk) })}</small></h4><div class="rlist">` : ''; lastDay = dk;
    return head + plannedCard(run);
  }).join('') + (page.length ? '</div>' : '') + (filtered.length > plimit ? `<p class="rmore"><button class="btn ghost" data-pmore>${t('runMoreRuns', { n: Math.min(30, filtered.length - plimit) })}</button></p>` : '');
  function plannedCard(run) {
    const d = LOOT.dungeons.find(x => x.key === run.dungeon); if (!d) return '';
    const myMember = run.members.find(m => mineKeys.has(m.key)), iOwn = mineKeys.has(run.by);
    const RI = RAIDS[d.key];
    const isAct = !!RI?.activity;
    const raid = !RI && /Raid|Core|Lair|Naxx|Qiraj|Gurub|Hyjal|Barrow|Blackwing|Onyxia|WorldBosses/i.test(d.key);   // raid sans composition connue : on compte
    const cap = isAct ? { tank: 99, heal: 99, dps: 99 } : capOf(d.key);
    const left = { ...cap }, group = [], wait = [];
    for (const m of run.members) {
      if (raid) { group.push(m); continue; }
      if (isAct) { (group.length < RI.size ? group : wait).push(m); continue; }   // activité : les premiers inscrits, puis l'attente
      if (left[m.role] > 0) { left[m.role]--; group.push(m); } else wait.push(m);
    }
    const counts = { tank: 0, heal: 0, dps: 0 }; group.forEach(m => counts[m.role] = (counts[m.role] || 0) + 1);
    // composition d'un groupe de 5 : 1 tank, 1 soigneur, 3 dégâts
    const slots = raid || isAct ? '' : RI ? `<span class="rcompo">${['tank', 'heal', 'dps'].map(r => `<span class="rc ${r}${counts[r] >= cap[r] ? ' on' : ''}">${roleIcon(r)}${counts[r]}/${cap[r]}</span>`).join('')}</span>` : ['tank', 'heal', 'dps', 'dps', 'dps'].map((role, i) => {
      const filled = role === 'dps' ? counts.dps > i - 2 : counts[role] > 0;
      return `<i class="slot ${role}${filled ? ' on' : ''}" title="${t('role.' + role)}"></i>`; }).join('');
    const full5 = !raid && (isAct ? group.length >= RI.size : counts.tank >= cap.tank && counts.heal >= cap.heal && counts.dps >= cap.dps);
    const size = RI ? RI.size : 5;
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
    const open = state.ropen === run.id || (state.runFocus === run.id && state.ropen === undefined);
    const [, , hiL] = d.lvl || [], loL = dunFrom(d), org = byKey.get(run.by);
    const needs = raid ? '' : isAct ? (group.length < RI.size ? [t('needPlaces', { n: RI.size - group.length })] : []) : [left.tank > 0 && t('role.tank').toLowerCase(), left.heal > 0 && t('role.heal').toLowerCase(), left.dps > 0 && t('needDps', { n: left.dps })].filter(Boolean);
    const stack = group.slice(0, 4).map(m => byKey.get(m.key)).filter(Boolean).map(p => avatar(p)).join('');
    const act = myMember ? `<span class="btn mine">✓ ${t('runIn')}</span>` : full5 ? `<span class="btn ghost">${t('runWaitBtn')}</span>` : `<span class="btn gold">${me.length ? t('runJoin') : t('runSee')}</span>`;
    return `<div class="rrow${myMember ? ' mine' : ''}${full5 && !myMember ? ' full' : ''}${open ? ' open' : ''}${state.runFocus === run.id ? ' focus' : ''}" id="run-${esc(run.id)}"${artStyle(d.key)}>
      <div class="rr-h" data-ropen="${esc(run.id)}" role="button" tabindex="0" aria-expanded="${open}">
        <span class="rr-art" aria-hidden="true"></span>
        <span class="rr-when"><b>${d0.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}</b><small>${relWhen(d0)}</small></span>
        <span class="rr-t"><b>${esc(d.name)}${loL ? ` <i class="lvl${me.some(p => fitOf(p, d) === 'ok') ? ' ok' : ''}">${loL === hiL ? loL : loL + '–' + hiL}</i>` : ''}</b><small>${run.note ? '« ' + esc(run.note) + ' »' : t('runBy', { n: org ? esc(org.name) : esc(run.by.split('/')[1] || '') })}${run.edited ? ` · ${t('runEdited')}` : ''}</small></span>
        <span class="rr-need">${slots ? `<span class="slots">${slots}</span>` : ''}<small class="${needs.length ? '' : 'done'}">${raid ? t('runCount', { n: run.members.length }) : needs.length ? t('needT', { x: needs.join(', ') }) : t('runFull') + (wait.length ? ' · ' + t('runWaitN', { n: wait.length }) : '')}</small></span>
        <span class="rr-who">${stack}<em>${raid ? run.members.length : group.length + '/' + size}</em></span>
        <span class="rr-act">${act}</span>
      </div>
      ${open ? `<div class="rr-x"><ul>${members}</ul>
      <div class="pact">${joinForm}${myMember ? `<button class="btn ghost" data-run-leave="${esc(run.id)}">${iOwn ? t('runCancel') : t('runLeave')}</button>` : ''}${edit}
        <span class="tools">${!iOwn && org ? `<button class="lnk" data-run-w="${esc(run.id)}">${t('runW')}</button>` : ''}${myMember ? `<button class="lnk" data-run-game="${esc(run.id)}">${t('runGame')}</button>` : ''}<button class="lnk" data-run-copy="${esc(run.id)}">${t('runCopy')}</button><button class="lnk" data-run-link="${esc(run.id)}">${t('runLink')}</button><button class="lnk" data-run-ics="${esc(run.id)}">${t('runIcs')}</button></span>
        ${!me.length ? `<small>${t('runLogin')}</small>` : ''}</div></div>` : ''}</div>`;
  }
  // donjons, raids, autres activités : trois groupes dans la liste
  const dOpt = x => `<option value="${esc(x.key)}">${esc(x.name)}${RAIDS[x.key] ? ` (${RAIDS[x.key].size})` : ''}</option>`;
  const byName = (a, b) => a.name.localeCompare(b.name);
  const dunOpts = [['optDun', LOOT.dungeons.filter(x => !isRaid(x))], ['optRaid', LOOT.dungeons.filter(x => isRaid(x) && !x.activity && x.key !== 'WorldBosses')],
    ['optAct', LOOT.dungeons.filter(x => x.activity || x.key === 'WorldBosses')]]
    .map(([k, list]) => list.length ? `<optgroup label="${t(k)}">${[...list].sort(byName).map(dOpt).join('')}</optgroup>` : '').join('');
  const proposeAny = me.length ? `<details class="propose any"><summary class="btn gold">${t('runProposeAny')}</summary><div class="pform" data-dun="">
      <label>${t('runDunPick')}<select data-run-dunpick>${dunOpts}</select></label>
      <label>${t('runWhen')}<input type="datetime-local" data-run-at value="${localInput(nextEvening())}" min="${localInput(new Date())}"></label>
      <label>${t('runChar')}<select data-run-char>${me.map(p => `<option value="${esc(pkey(p))}">${full(p)} (${p.level})</option>`).join('')}</select></label>
      <label>${t('runRole')}<select data-run-role>${['dps', 'tank', 'heal'].map(x => `<option value="${x}">${t('role.' + x)}</option>`).join('')}</select></label>
      <label class="wide">${t('runNote')}<input type="text" maxlength="140" data-run-note placeholder="${t('runNotePh')}"></label>
      <button class="btn gold" data-run-create>${t('runCreate')}</button></div></details>` : '';
  const plannedBlock = `<section class="planned">${proposeAny}${RUNS === null ? `<p class="note">${t('runsApiDown')}</p>` : ''}
    ${state.runMsg ? `<p class="msg">${state.runMsg}</p>` : ''}${planned || `<p class="note">${allRuns.length ? t('pfNone') : t('runsNone')}</p>`}</section>`;

  const card = run => {
    const [, , hi] = run.d.lvl || [], lo = dunFrom(run.d);
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
  const rtab = state.rtab === 'ideas' || state.rtab === 'planned' ? state.rtab : (filtered.length ? 'planned' : 'ideas');
  box.innerHTML = `<div class="head"><h2>${t('runsT')}</h2><span class="note">${t('runsNote')} · Forever ${state.region.toUpperCase()}</span></div>
    <div class="rtabs" role="tablist"><button role="tab" data-rtab="planned" aria-selected="${rtab === 'planned'}">${t('rtabRuns')}<em>${filtered.length}</em></button><button role="tab" data-rtab="ideas" aria-selected="${rtab === 'ideas'}">${t('rtabIdeas')}<em>${runs.length}</em></button></div>
    ${Notif.panel()}${chips}${pfilters}${note}${rtab === 'planned' ? plannedBlock : `<p class="note rideas-n">${t('runsIdeasNote')}</p>
    ${!runs.length && searchActive() ? `<p class="note">${t('hsNone')}</p>` : ''}${runs.length ? `<div class="runs">${runs.slice(0, state.ilimit || 8).map(card).join('')}</div>${runs.length > (state.ilimit || 8) ? `<button class="btn ghost more" data-imore>${t('runMoreDun', { n: runs.length - (state.ilimit || 8) })}</button>` : ''}` : `<div class="empty"><b>${t('runsEmptyT')}</b>${t('runsEmpty')}</div>`}
    `}<p class="runs-src">${t('runsSrc')}</p>`;
  if (state.runFocus && !state.runFocused) { const el = document.getElementById('run-' + state.runFocus); if (el) { state.runFocused = true; el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); } }
}
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-ropen]')) { e.preventDefault(); e.target.click(); } });
document.addEventListener('input', e => {
  const q = e.target.closest('[data-hq]'); if (!q) return;
  clearTimeout(renderRuns.t); renderRuns.t = setTimeout(() => {
    state.hq = q.value.trim(); state.plimit = 30; state.ilimit = 8; renderRuns(); writeUrl(false);
    const n = $('[data-hq]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
  }, 220);
});
document.addEventListener('change', e => {
  const f = e.target.closest('[data-hf]'); if (!f) return;
  state[f.dataset.hf] = f.value; state.plimit = 30; state.ilimit = 8; renderRuns(); writeUrl(false);
});
document.addEventListener('click', e => {
  if (!e.target.closest('[data-hreset]')) return;
  Object.assign(state, { hq: '', hl: '', ht: '', hd: '', hr: '', hw: '', pf: 'all', plimit: 30, ilimit: 8 }); renderRuns(); writeUrl(false);
});
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
  const dgb = e.target.closest('[data-dg]'); if (dgb) { state.dg = !state.dg; renderRank(); writeUrl(false); return; }
  const c = e.target.closest('[data-rscope]'); if (c) { state.rscope = c.dataset.rscope; renderRuns(); return; }
  if (e.target.closest('[data-rlvl]')) { state.rlvl = !state.rlvl; renderRuns(); return; }
  const pfc = e.target.closest('[data-pf]'); if (pfc) { state.pf = pfc.dataset.pf; state.plimit = 30; renderRuns(); return; }
  if (e.target.closest('[data-pmore]')) { state.plimit = (state.plimit || 30) + 30; renderRuns(); return; }
  const tb = e.target.closest('[data-rtab]'); if (tb) { state.rtab = tb.dataset.rtab; renderRuns(); writeUrl(false); return; }
  const ro = e.target.closest('[data-ropen]');
  if (ro) { const id = ro.dataset.ropen, wasOpen = ro.closest('.rrow').classList.contains('open'); state.ropen = wasOpen ? null : id; renderRuns();
    if (!wasOpen) document.getElementById('run-' + id)?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); return; }
  if (e.target.closest('[data-imore]')) { state.ilimit = (state.ilimit || 8) + 8; renderRuns(); return; }
  const cr = e.target.closest('[data-run-create]');
  if (cr) { const f = cr.closest('.pform'), at = $('[data-run-at]', f).value;
    if (!at) { state.runMsg = t('runErr.date'); renderRuns(); return; }
    runAction('/runs/create', { dungeon: f.dataset.dun || $('[data-run-dunpick]', f)?.value, at: new Date(at).toISOString(), key: $('[data-run-char]', f).value, role: $('[data-run-role]', f).value, note: $('[data-run-note]', f).value });
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
  const copyBtn = async (b, text) => { try { await navigator.clipboard.writeText(text); const o = b.textContent; b.textContent = t('copied'); setTimeout(() => { b.textContent = o; }, 1600); } catch (err) { prompt('', text); } };
  const wb = e.target.closest('[data-run-w]');
  if (wb) { const x = run(wb.dataset.runW); if (x) { const mineK = new Set(Bnet.mine().map(pkey)), mem = x.members.find(m => mineK.has(m.key));
    const sel = wb.closest('.rr-x')?.querySelector('.joinf [data-run-role]'); copyBtn(wb, runWhisper(x, mem?.role || sel?.value)); } }
  const gb = e.target.closest('[data-run-game]'); if (gb) { const x = run(gb.dataset.runGame); if (x) copyBtn(gb, runGameCode(x)); }
});
document.addEventListener('change', e => {
  const pds = e.target.closest('[data-pd]'); if (pds) { state.pd = pds.value; state.plimit = 30; renderRuns(); return; }
  const sel = e.target.closest('[data-run-role-change]');
  if (sel) runAction('/runs/join', { id: sel.dataset.runRoleChange, key: sel.dataset.key, role: sel.value, change: true });
});


/* ---------- Nouveautés ---------- */
function renderNews() {
  const box = $('#news-list');
  if (!NEWS) { box.innerHTML = loadingBox(); return; }
  if (!NEWS.versions?.length) { box.innerHTML = `<div class="empty"><b>${t('newsFailT')}</b>${t('newsFail')}</div>`; return; }
  const fr = LANG === 'fr' ? new Map((NEWS.versionsFr || []).map(v => [v.version, v])) : null;
  box.innerHTML = NEWS.versions.map(v0 => fr?.get(v0.version) || (fr ? { ...v0, enOnly: true } : v0)).map((v, i) => `
    <div class="release${i > 1 ? ' folded' : ''}">
      <div class="ver">${esc(v.version)}${i === 0 ? `<small>${t('latest')}</small>` : ''}${v.enOnly ? `<small class="en-only">${t('newsEnOnly')}</small>` : ''}</div>
      <div>${v.sections.map(s => `${s.title ? `<h4>${esc(s.title.toUpperCase())}</h4>` : ''}<ul>${s.items.map(x => `<li>${x}</li>`).join('')}</ul>`).join('')}
        ${i > 1 ? `<span class="toggle">${t('showMore')}</span>` : ''}</div>
    </div>`).join('') +
    `<p style="margin:18px 0 0;color:var(--faint);font-style:italic">${t('fullHistory')} <a href="https://github.com/Raykuilu/Dropamine/blob/main/${LANG === 'fr' ? 'CHANGELOG.fr.md' : 'CHANGELOG.md'}" rel="noopener">GitHub</a>.</p>`;
}
document.addEventListener('click', e => { const a = e.target.closest('[data-sec]'); if (!a) return; e.preventDefault(); document.getElementById(a.dataset.sec)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });
document.addEventListener('change', e => { const sel = e.target.closest('[data-gs]'); if (!sel) return; state.gs = sel.value; renderGuild(); animate($('#guild-panel')); });
document.addEventListener('click', e => { const x = e.target.closest('.release.folded .toggle'); if (x) { x.closest('.release').classList.remove('folded'); x.remove(); } });

// version de l'addon : la dernière publiée sur GitHub (demandée une fois par visite), sinon celle du journal des versions
// relu par le site (qui peut avoir un jour de retard après une publication)
const verNum = x => String(x || '').replace(/^v/, '').split('.').map(n => +n || 0);
const newerVersion = (a, b) => { if (!a) return b; if (!b) return a; const x = verNum(a), y = verNum(b);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0) ? a : b; return b; };
let LATEST_VER = null;
function parseChangelogMd(md, keep = 6) {
  const out = []; let v = null, sec = null;
  const inline = x => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  for (const line of md.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^##\s+(.+)/)) && !line.startsWith('###')) { v = { version: m[1].trim(), sections: [] }; out.push(v); sec = null; }
    else if (v && (m = line.match(/^###\s+(.+)/))) { sec = { title: m[1].trim(), items: [] }; v.sections.push(sec); }
    else if (v && (m = line.match(/^-\s+(.+)/))) { if (!sec) { sec = { title: '', items: [] }; v.sections.push(sec); } sec.items.push(inline(m[1])); }
    else if (v && sec && (m = line.match(/^\s{2,}-\s+(.+)/))) { sec.items[sec.items.length - 1] += ' — ' + inline(m[1]); }
  }
  return out.slice(0, keep);
}
// appelé quand on connaît la dernière version publiée et le journal du site
function freshenNews() {
  const known = NEWS?.versions?.[0]?.version;
  if (!LATEST_VER || !NEWS || freshenNews.done || !known || newerVersion(LATEST_VER, known) === known) return;
  freshenNews.done = true;
  const raw = f => fetch('https://raw.githubusercontent.com/Raykuilu/Dropamine/main/' + f).then(x => x.ok ? x.text() : null).catch(() => null);
  Promise.all([raw('CHANGELOG.md'), raw('CHANGELOG.fr.md')]).then(([md, mdFr]) => {
    const vs = md && parseChangelogMd(md);
    if (!vs?.length || newerVersion(vs[0].version, known) === known) return;
    NEWS = { ...NEWS, versions: vs, versionsFr: mdFr ? parseChangelogMd(mdFr) : NEWS.versionsFr };
    if (state.view === 'news') renderNews();
    applyStatic();
  }).catch(() => {});
}
try { LATEST_VER = sessionStorage.getItem('dropLatest'); } catch (e) { /* stockage indisponible */ }
if (!LATEST_VER) fetch('https://api.github.com/repos/Raykuilu/Dropamine/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
  .then(r => r.ok ? r.json() : null).then(j => {
    const tag = String(j?.tag_name || '').replace(/^v/, '');
    if (!/^\d+\.\d+\.\d+$/.test(tag)) return;
    LATEST_VER = tag; try { sessionStorage.setItem('dropLatest', tag); } catch (e) { /* rien */ }
    applyStatic(); freshenNews();
  }).catch(() => {});

/* ---------- Texte fixe traduit (data-t) et pied de page ---------- */
function applyStatic() {
  $$('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  fitNav();
  $('#install')?.setAttribute('title', t('install')); $('#install')?.setAttribute('aria-label', t('install'));
  $$('[data-t-title]').forEach(el => { el.title = t(el.dataset.tTitle); el.setAttribute('aria-label', t(el.dataset.tTitle)); });
  $$('[data-t-ph]').forEach(el => { el.placeholder = t(el.dataset.tPh); el.setAttribute('aria-label', t(el.dataset.tPh)); });
  if ($('#lang')) $('#lang').value = LANG;
  const fb = $('#trfb');
  if (fb) {
    const title = `[${LANG}] ${t('trfbTitle')}`, body = `${t('trfbBody')}\n\n${t('trfbPage')} ${location.href}\n${t('trfbLang')} ${LANG_NAMES[LANG] || LANG}\n\n${t('trfbWrong')} \n${t('trfbRight')} \n`;
    fb.href = 'https://github.com/Raykuilu/Dropamine/issues/new?labels=translation&title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
  }
  applyBlocks();
  if (DATA.updated) $('#updated').textContent = t('updated', { d: new Date(DATA.updated).toLocaleDateString(locale(), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) });
  const v = newerVersion(LATEST_VER, NEWS?.versions?.[0]?.version);
  if (v) $$('[data-meta]').forEach(el => {
    const link = el.querySelector('a');   // le lien « café » survit à la mise à jour du numéro de version
    el.textContent = (el.closest('[lang]').lang === 'fr' ? I18N.meta[1] : el.closest('[lang]').lang === 'en' && !extra() ? I18N.meta[0] : t('meta')).replace('{v}', v) + (link ? ' · ' : '');
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
        if (r.ok) { Ribbon.swell(.8); if (j.key) { try { localStorage.setItem(pendKey(j.key), JSON.stringify(parsePendingLine(line))); } catch (e) { /* stockage indisponible */ } } }
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
    // connecté : le BattleTag, que la traduction de la page ne doit pas réécrire en « Se connecter »
    const sp = a.querySelector('span'); if (tag) sp.removeAttribute('data-t'); else sp.dataset.t = 'acct.in';
    sp.textContent = tag || t('acct.in');
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
  state.skill = q.get('s') || 'total'; state.cls = +q.get('cl') || 0; state.rs = +q.get('m') || 0; state.dg = q.get('dg') === '1';
  state.c = q.get('c') || state.c; state.g = q.get('g') || '';
  if (state.view === 'runs') Object.assign(state, { rtab: q.get('tab') === 'ideas' ? 'ideas' : q.get('tab') === 'planned' ? 'planned' : undefined, hq: q.get('q') || '', hl: q.get('lv') || '', ht: q.get('ty') || '', hd: q.get('d') || '', hr: q.get('role') || '', hw: q.get('when') || '', pf: q.get('f') || state.pf || 'all' });
}
function writeUrl(push) {
  if (SHOT) return;
  const q = new URLSearchParams();
  if (DEMO) q.set('demo', DEMO);
  if (state.view !== 'home') q.set('p', state.view);
  if (state.region !== 'eu') q.set('r', state.region);
  if (state.view === 'rank') { if (state.dg) q.set('dg', '1'); if (state.skill !== 'total') q.set('s', state.skill); if (state.cls) q.set('cl', state.cls); if (state.rs) q.set('m', state.rs); }
  if (state.view === 'char' && state.c) q.set('c', state.c);
  if (state.view === 'guild' && state.g) q.set('g', state.g);
  if (state.view === 'runs') { [['q', 'hq'], ['lv', 'hl'], ['ty', 'ht'], ['d', 'hd'], ['role', 'hr'], ['when', 'hw']].forEach(([k, v]) => { if (state[v]) q.set(k, state[v]); }); if (state.pf && state.pf !== 'all') q.set('f', state.pf); if (state.rtab === 'ideas') q.set('tab', 'ideas'); if (state.runFocus) q.set('run', state.runFocus); }
  history[push ? 'pushState' : 'replaceState'](null, '', q.toString() ? '?' + q : location.pathname);
}
const RENDER = { rank: renderRank, char: renderChar, guild: renderGuild, runs: renderRuns, news: renderNews, join: () => Bnet.show() };
const TITLES = { rank: 'tab.rank', char: 'tab.char', guild: 'tab.guild', runs: 'tab.runs', news: 'tab.news', get: 'btn.download', join: 'foot.join', privacy: 'foot.privacy', about: 'foot.about' };
function render(push) {
  applyStatic();
  renderHome();
  (RENDER[state.view] || (() => {}))();
  tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.view === state.view && (b.dataset.view !== 'char' || Bnet.isMine(state.c))));
  const meView = (state.view === 'char' && Bnet.isMine(state.c)) || state.view === 'join';
  $$('.tabbar [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === 'me' ? meView : b.dataset.go === state.view && !(state.view === 'char')));
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
  // nouvelle page : on repart du haut, tout de suite (un défilement animé se faisait interrompre par le nouvel affichage)
  if (changedView) { scrollTo({ top: 0, behavior: 'auto' }); requestAnimationFrame(() => scrollTo({ top: 0, behavior: 'auto' })); }
}
// menu : une seule rangée si tout tient, sinon onglets puis outils (la largeur dépend de la langue et de la connexion)
function fitNav() {
  const nav = $('.nav'), wrap = $('.nav .wrap'), tabs = $('.tabs'), tools = $('.tools'); if (!nav || !wrap) return;
  nav.classList.remove('rows2');
  if (!nav.contains(tools)) return;
  const kids = [...tools.children].filter(e => !e.hidden && e.offsetWidth);
  const need = tabs.scrollWidth + kids.reduce((n, e) => n + (e.classList.contains('search') ? 130 : e.offsetWidth), 0) + 8 * kids.length + 10;
  nav.classList.toggle('rows2', need > wrap.clientWidth);
}
// ordinateur large : langue, région, recherche, compte et téléchargement montent dans l'en-tête ; le menu ne garde que les onglets
const wideMq = matchMedia('(min-width: 1221px)');
function placeTools() {
  const tools = $('.tools'), hero = $('.hero .wrap'), navWrap = $('.nav .wrap'); if (!tools || !hero || !navWrap) return;
  if (wideMq.matches) { if (tools.parentNode !== hero) hero.append(tools); }
  else if (tools.parentNode !== navWrap) navWrap.append(tools);
  $('.hero').classList.toggle('has-tools', wideMq.matches);
  fitNav();
}
wideMq.addEventListener?.('change', placeTools);
placeTools();
addEventListener('resize', () => { clearTimeout(fitNav.t); fitNav.t = setTimeout(fitNav, 120); });
// langue en plus : ses textes et ses objets, une seule fois par langue
const i18nCache = {};
function loadLang(l) {
  if (l === 'en' || l === 'fr') { I18X = ITEMX = null; return Promise.resolve(); }
  i18nCache[l] ??= Promise.all([
    fetch('data/i18n/' + l + '.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
    fetch('data/i18n/items.' + l + '.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
  ]);
  return i18nCache[l].then(([x, items]) => { if (LANG === l) { I18X = x; ITEMX = items; } });
}
// blocs fixes de la page (lang="en" avec data-k) : remplacés par leur traduction, l'anglais d'origine gardé pour revenir
function applyBlocks() {
  $$('[lang="en"][data-k]').forEach(el => {
    el._en ??= el.innerHTML;
    const tr = extra() && I18X?.html?.[el.dataset.k];
    if (tr) el.innerHTML = tr; else if (el.innerHTML !== el._en) el.innerHTML = el._en;
  });
}
function setLang(l) {
  if (!LANGS.includes(l)) l = 'en';
  LANG = l; document.documentElement.lang = l; document.documentElement.dataset.lang = l;
  try { localStorage.setItem('lang', l); } catch (e) { /* stockage indisponible : le choix vaut pour cette visite */ }
  loadLang(l).then(() => { if (LANG === l) { render(false); Ribbon.swell(.6); } });
}
tabs.forEach(b => b.addEventListener('click', () => go(b.dataset.view === 'char' ? { view: 'char', c: Bnet.best() } : { view: b.dataset.view })));
// barre du bas : « Moi » = ma fiche si connecté, sinon la page d'inscription
$$('.tabbar [data-go]').forEach(b => b.addEventListener('click', () => { const v = b.dataset.go;
  go(v === 'me' ? (Bnet.best() ? { view: 'char', c: Bnet.best() } : { view: 'join' }) : { view: v }); }));
$('#region').addEventListener('change', e => go({ region: e.target.value, cls: 0, g: '' }));
$('#lang').addEventListener('change', e => setLang(e.target.value));
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

/* ---------- Démo (poste de développement seulement) : ?demo=1 ----------
   Données d'exemple pour les captures du trailer, dans un vrai donjon (la Cathédrale du Monastère Écarlate) : Ray Kuilu (le druide des vidéos)
   connecté au centre (tank ours), son groupe réel (Colìn Maillard au soin, Yema Lobrah, Rakshir Noirsillage et Tim Plar aux dégâts),
   chacun avec ses propres objets recherchés (utilisables par sa classe, aucun en double dans le groupe), des joueurs fictifs autour
   (noms inventés) et des sorties prévues. Rien n'est envoyé au serveur : les lectures sont interceptées dans le navigateur.
   ?demo=<clé du donjon> (ex. ?demo=RazorfenDowns) prend un autre donjon. */
const DEMO = location.hostname === 'localhost' ? new URLSearchParams(location.search).get('demo') : null;
if (DEMO) {
  const realFetch = window.fetch.bind(window);
  const rnd = (s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; })(1367);
  const pickN = (arr, n) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const RAY = 'eu/ray-kuilu', COLIN = 'eu/colìn-maillard', DPS = ['eu/yema-lobrah', 'eu/rakshir-noirsillage', 'eu/tim-plar'], REAL = [COLIN, ...DPS], DKEY = DEMO.length > 2 ? DEMO : 'ScarletMonasteryCathedral';
  const FAKE = [['Brennor', 'Rochefer'], ['Thalyssa', 'Chantelune'], ['Korgath', 'Cendrelame'], ['Elwynna', 'Brisevent'], ['Durik', 'Marteau-Clair'],
    ['Sylvaëlle', 'Valombre'], ['Morvan', 'Pierregrise'], ['Isolde', 'Haute-Rive'], ['Garrek', 'Lamenoire'], ['Nyra', 'Sombrefeu']];
  const world = (async () => {
    const [hs, loot, items, art, prod] = await Promise.all(['data/hiscores.json', 'data/loot.json', 'data/items.json', 'data/art.json'].map(u => realFetch(u).then(r => r.json()))
      .concat(realFetch('https://dropamine.app/data/hiscores.json').then(r => r.json()).catch(() => null)));
    const dun = loot.dungeons.find(d => d.key === DKEY) || loot.dungeons.find(d => d.key === 'ScarletMonasteryCathedral');
    const dIds = dun.bosses.flatMap(b => b.i.map(e => Array.isArray(e) ? e[0] : e));
    // objets à chasser : armes et armures du donjon (pas les récompenses de quête ni les clés)
    const huntIds = [...new Set(dun.bosses.filter(b => !noDrop(b)).flatMap(b => b.i.map(e => Array.isArray(e) ? e[0] : e)))]
      .filter(id => items[id] && [2, 4].includes(items[id].c?.[0]) && items[id].q !== 'COMMON');
    const taken = new Set(), entry = (id, tries) => ({ id, name: items[id].n[1] || items[id].n[0], tries: Math.floor(rnd() * tries), drops: 0 });
    // le groupe : des objets que sa classe peut porter, jamais deux fois le même (personne ne se bat pour un besoin)
    const huntFor = (p, n, tries = 30) => {
      const mine = pickN(huntIds.filter(id => !taken.has(id) && canUse(p, items[id])), n);
      if (mine.length < n) mine.push(...pickN(huntIds.filter(id => !taken.has(id) && !mine.includes(id)), n - mine.length));
      mine.forEach(id => taken.add(id)); return mine.map(id => entry(id, tries));
    };
    // les autres : ce que leur classe peut porter, doublons permis
    const huntAny = (p, n) => pickN(huntIds.filter(id => canUse(p, items[id])), n).map(id => entry(id, 30));
    const now = Date.now(), ago = d => new Date(now - d * 864e5).toISOString().slice(0, 10);
    // Ray : sa fiche publique (chiffres des vidéos), un carnet à moitié rempli dans ce donjon, trois objets recherchés ici
    const ray = structuredClone(prod?.players.find(p => p.key === RAY) || hs.players.find(p => p.key === RAY));
    for (const x of ray.professions || []) { if (x.id === 393) x.skill = 224; if (x.id === 129) x.skill = 209; }
    ray.total = 1367; if (ray.parts) ray.parts.professions = (ray.professions || []).reduce((s, x) => s + x.skill, 0);
    ray.dropamine = ray.dropamine || {}; ray.dropamineAt = ago(0);
    ray.dropamine.hunt = [...huntFor(ray, 4, 12), ...(ray.dropamine.hunt || [])].slice(0, 8);
    ray.dropamine.collection = { ...(ray.dropamine.collection || {}), items: [...new Set([...(ray.dropamine.collection?.items || []), ...pickN(dIds, Math.round(dIds.length * .55))])] };
    const Y = ray.dropamine.collection.y || 1499;
    ray.dropamine.collection.x = ray.dropamine.collection.items.length; ray.dropamine.collection.y = Y;
    // historique de l'armurerie (démo) : 30 victoires honorables en 7 jours, la semaine de l'addon (24) est vérifiée
    ray.history = [{ d: ago(22), t: 1300, hk: 40, pw: [610, 12] }, { d: ago(15), t: 1330, hk: 62, pw: [1380, 22] }, { d: ago(8), t: 1367, hk: 100, pw: [2210, 31] }, { d: ago(7), t: 1367, hk: 100 }, { d: ago(0), t: 1367, hk: 130, pw: [1850, 24] }];
    ray.dropamine.pvp = { hkWeek: 24, honorWeek: 1850, honor: 4200, dkLife: 0, highest: 0 };   // honneur par victoire (démo)
    ray.role = 'tank';   // tank ours : le groupe suggéré le met au tank
    // son groupe (vrais personnages) : Colìn au soin, trois dégâts ; les autres vrais joueurs deviennent des personnages fictifs
    const players = [ray];
    for (const key of REAL) {
      const p = structuredClone(hs.players.find(x => x.key === key)); if (!p) continue;
      p.level = Math.max(p.level, 33); p.role = key === COLIN ? 'heal' : 'dps'; p.dropamineAt = ago(1);
      if (key === DPS[0]) p.history = [{ d: ago(7), t: p.total, hk: 50 }, { d: ago(0), t: p.total, hk: 55 }];   // démo : déclare plus que l'armurerie, exclu
      p._pvpDemo = true;
      p.dropamine = { hunt: huntFor(p, 4), collection: { items: pickN(dIds, 10 + Math.floor(rnd() * 12)) } };
      Object.assign(p.dropamine.collection, { x: p.dropamine.collection.items.length, y: Y });
      const hk = 10 + Math.floor(rnd() * 40); p.dropamine.pvp = { hkWeek: hk, honorWeek: Math.round(hk * (25 + rnd() * 70)), honor: 0, dkLife: 0, highest: 0 };
      players.push(p);
    }
    const others = hs.players.filter(p => p.key !== RAY && !REAL.includes(p.key));
    const guilds = [ray.guild, ray.guild, { name: 'Les Veilleurs de l’Aube', slug: 'les-veilleurs-de-laube' }, ray.guild, { name: 'Cercle de Cénarius', slug: 'cercle-de-cenarius' }];
    FAKE.forEach(([name, surname], i) => {
      const p = structuredClone(others[i % others.length]);
      const slug = (name + '-' + surname).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
      Object.assign(p, { name, surname, slug, key: 'eu/' + slug, guild: guilds[i % guilds.length], dropamineAt: ago(i % 4) });
      if (p.level < 33) p.level = 33 + (i * 5) % 8;   // les petits niveaux remontés au niveau du donjon ; les 60 gardent leur total
      p.dropamine = { hunt: huntAny(p, 1 + i % 3), collection: { items: pickN(dIds, 6 + (i * 7) % 20) } };
      Object.assign(p.dropamine.collection, { x: p.dropamine.collection.items.length, y: Y });
      players.push(p);
    });
    hs.players = [...players].sort((a, b) => b.total - a.total);
    // sorties prévues : ce soir dans ce donjon, le groupe de Ray au complet ; demain une autre avec liste d'attente ; puis d'autres donjons
    const at = (days, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); };
    const k = i => players[1 + REAL.length + i].key, mk = (key, role) => ({ key, role });
    const runs = [
      { id: 'demo1', dungeon: DKEY, at: at(new Date().getHours() >= 21 ? 1 : 0, 21), by: RAY, note: 'On boucle 3 fois, chacun son objet', created: ago(0),
        members: [mk(RAY, 'tank'), mk(COLIN, 'heal'), ...DPS.map(x => mk(x, 'dps'))] },
      { id: 'demo2', dungeon: DKEY, at: at(1, 20, 30), by: k(4), note: 'Farm tranquille', created: ago(0),
        members: [mk(k(4), 'tank'), mk(k(7), 'heal'), mk(k(2), 'dps'), mk(k(3), 'dps'), mk(k(5), 'dps'), mk(k(6), 'dps')] },
      { id: 'demo3', dungeon: 'RazorfenDowns', at: at(1, 21), by: k(6), note: 'Cherche soigneur', created: ago(1), members: [mk(k(6), 'tank'), mk(k(1), 'dps')] },
      { id: 'demo4', dungeon: DKEY === 'ScarletMonasteryArmory' ? 'ScarletMonasteryLibrary' : 'ScarletMonasteryArmory', at: at(2, 20), by: k(8), note: '', created: ago(1), members: [mk(k(8), 'dps'), mk(k(7), 'heal'), mk(k(0), 'tank')] },
      { id: 'demo6', dungeon: 'HyjalSummit', at: at(13, 21), by: RAY, note: 'Première soirée Hyjal, venez nombreux', created: ago(0),
        members: [mk(RAY, 'tank'), mk(COLIN, 'heal'), ...DPS.map(x => mk(x, 'dps')), mk(k(0), 'tank'), mk(k(7), 'heal'), mk(k(2), 'dps')] },
      { id: 'demo7', dungeon: 'ActPvP', at: at(2, 22), by: k(1), note: 'Raid sur Tarren Mill, venez !', created: ago(0), members: [mk(k(1), 'dps'), mk(k(3), 'heal'), mk(RAY, 'tank')] },
      { id: 'demo5', dungeon: 'Uldaman', at: at(3, 21, 15), by: k(5), note: 'Ambiance détente', created: ago(2), members: [mk(k(5), 'dps')] },
    ];
    return { hs, loot, art, runs };
  })();
  const json = o => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json' } });
  window.fetch = async (u, o) => {
    const s = String(u?.url || u);
    if (/(^|\/)data\/hiscores\.json/.test(s)) return json((await world).hs);
    if (/(^|\/)data\/loot\.json/.test(s)) return json((await world).loot);
    if (/(^|\/)data\/art\.json/.test(s)) return json((await world).art);
    if (s.startsWith(API + '/runs')) return json({ ok: true, runs: (await world).runs });
    if (s.startsWith(API + '/me')) return json({ battletag: 'Raykuilu#0000', characters: [{ key: RAY, region: 'eu', slug: 'ray-kuilu', name: 'Ray', surname: 'Kuilu', classId: 11, level: 36, registered: true }] });
    if (s.startsWith(API + '/hunt/save')) {   // liste enregistrée « sur le site » : renvoyée telle quelle, essais gardés
      const { key, items } = JSON.parse(o?.body || '{}'), p = (await world).hs.players.find(x => x.key === key), prev = new Map((p?.dropamine?.hunt || []).map(h => [h.id, h]));
      return json({ ok: true, hunt: items.map(x => prev.get(x.id) || { id: x.id, name: x.name, tries: 0, drops: 0 }) });
    }
    if (s.startsWith(API)) return json({ ok: true });   // rien ne part vers le serveur
    return realFetch(u, o);
  };
  // Ray connecté
  Bnet.isMine = key => key === RAY; Bnet.mine = () => DATA.players.filter(p => pkey(p) === RAY); Bnet.best = () => RAY;
}

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
  loadLang(LANG),
]).then(() => { Ribbon.load(false); return document.fonts.ready; })
  .then(() => { render(false); freshenNews(); Ribbon.swell(.7); const hs = BOOT_HSIMG; const hp = hs && DATA.players.find(x => pkey(x) === hs); if (hp) HsImage.open(hp); });

/* ---------- Application installable (PWA) ---------- */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
// bouton « Installer l'app » quand le navigateur le propose (Android, Chrome, Edge) ; sur iPhone : Partager → Sur l'écran d'accueil
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const b = $('#install'); if (b) b.hidden = false; fitNav(); });
addEventListener('appinstalled', () => { installEvt = null; const b = $('#install'); if (b) b.hidden = true; fitNav(); });
document.addEventListener('click', async e => {
  if (!e.target.closest('#install')) return;
  if (installEvt) { installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; e.target.closest('#install').hidden = true; }
});
document.fonts?.ready.then(fitNav);
// captures de test, sur le poste de développement seulement : ?as=eu/ray-kuilu affiche le site « connecté » avec ce personnage
if (location.hostname === 'localhost' && new URLSearchParams(location.search).get('as')) {
  const as = new URLSearchParams(location.search).get('as');
  Bnet.isMine = key => key === as; Bnet.mine = () => DATA.players.filter(p => pkey(p) === as); Bnet.best = () => as;
}
// captures de test (localhost) : ?go=sec-hunt montre la page à partir de cette section
if (location.hostname === 'localhost' && new URLSearchParams(location.search).get('go'))
  setInterval(() => { const el = document.getElementById(new URLSearchParams(location.search).get('go')); if (!el) return;
    // les captures sans fenêtre ne défilent pas : on masque ce qui précède la section
    for (let n = el; n && n !== document.body; n = n.parentElement) { let x = n.previousElementSibling; while (x) { if (!x.matches('.sprite,script')) x.style.display = 'none'; x = x.previousElementSibling; } } }, 400);

// goutte d'ouverture : levée après ~1,1 s (le temps qu'elle se remplisse), puis retirée
if (!document.documentElement.classList.contains('nosplash')) setTimeout(() => {
  document.documentElement.classList.add('ready'); setTimeout(() => $('#splash')?.remove(), 700);
}, Math.max(250, 1150 - performance.now()));
else $('#splash')?.remove();
// captures de test (localhost) : ?img=1 ouvre l'image Hiscores du personnage affiché
if (location.hostname === 'localhost' && new URLSearchParams(location.search).get('img')) setTimeout(() => $('[data-hsimg]')?.click(), 3500);
// captures de test (localhost) : ?fakeruns=1 remplit la chasse en groupe avec des sorties fictives (vrais personnages, vrais donjons)
if (location.hostname === 'localhost' && new URLSearchParams(location.search).get('fakeruns')) {
  const fake = () => {
    if (!DATA.players.length || !LOOT?.dungeons) return setTimeout(fake, 300);
    const ps = DATA.players, ds = LOOT.dungeons.filter(d => (d.lvl || [])[0]), roles = ['tank', 'heal', 'dps', 'dps', 'dps'], now = Date.now();
    RUNS = Array.from({ length: 24 }, (_, i) => {
      const at = new Date(now + (2 + i * 5.5) * 36e5), d = ds[(i * 7) % ds.length], n = 1 + (i * 3) % 6, by = ps[i % ps.length];
      return { id: 'f' + i, dungeon: d.key, at: at.toISOString(), note: i % 3 ? ['Farm tranquille', 'Cherche soigneur, ambiance détente', 'On boucle 3 fois'][i % 3] : '', by: pkey(by),
        created: new Date(now - i * 36e5).toISOString(), members: Array.from({ length: n }, (_, k) => ({ key: pkey(ps[(i + k) % ps.length]), role: roles[k % 5] })) };
    });
    runsLoad = Promise.resolve(); if (state.view === 'runs') renderRuns(); else if (state.view === 'home') renderHome();
  };
  loadLoot(); fake();
}
