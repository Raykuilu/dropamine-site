# api.dropamine.app

Small Node.js service (no dependency, Node 24) that adds **"Sign in with Battle.net"** to the Dropamine Hiscores:
the player signs in at Blizzard, sees their WoW Forever characters, and registers or removes them.
The registry stays in this repository (`data/registry.json`): the service updates it through the GitHub API,
then triggers the site update.

## Routes

| Route | Use |
|---|---|
| `GET /health` | `ok` (the site shows the Battle.net button only when this answers) |
| `GET /auth/login` → `GET /auth/callback` | Battle.net OAuth (scope `wow.profile`), opens a 12 h session |
| `GET /me` | the signed-in account's Forever characters, and which are registered |
| `POST /claim` / `POST /release` `{ "keys": ["eu/ray-kuilu"] }` | register / hide — only characters of the signed-in account. Hiding also removes a guild-preview character (added to `optout` in the registry) |
| `POST /upload` `{ "line": "DROPAMINE-HS1:…" }` | the `/drop hiscores` line from Dropamine 3.11+: checksum checked, matched to a character of the account (region + first name, level to break ties), weapon ranks capped at 5 × level; stored in `data/uploads.json`, character registered on the way |
| `POST /logout` | ends the session |

Security: the Battle.net token is never stored (only the character list, in memory, for the session);
signed HttpOnly cookies; POST only from `https://dropamine.app`; 40 requests per minute per address.
GitHub writes are retried (5 tries, growing delay) on conflicts and GitHub server errors.

Sessions live in memory: a restart signs everyone out (they just sign in again).

## Guild preview

`data/guilds.json` lists followed guilds (`"eu/everybody-knows"`). The daily build reads their roster and shows members
level 10+ that are not registered, marked *preview*. Anyone can hide their character (Battle.net or the removal form):
it goes to `optout` in `data/registry.json` and is never shown again unless they register.

## Mise en ligne chez Infomaniak (une seule fois)

1. **Créer le site** : Manager → Web & Domaines → `dropamine.app` → ajouter un site **Node.js** sur le sous-domaine **`api.dropamine.app`** (certificat HTTPS activé).
2. **Récupérer le code** : dans la console SSH du site, `git clone https://github.com/Raykuilu/dropamine-site.git`.
3. **Réglages d'exécution** : dossier de l'application `dropamine-site/server`, commande de démarrage `npm start`, port d'écoute celui indiqué par Infomaniak (repris par la variable `PORT`).
4. **Variables d'environnement** (dans le Manager, jamais dans le dépôt) :

   | Variable | Valeur |
   |---|---|
   | `BNET_CLIENT_ID`, `BNET_CLIENT_SECRET` | le client Battle.net (develop.battle.net) |
   | `SESSION_SECRET` | une longue chaîne aléatoire (48 caractères ou plus) |
   | `GITHUB_TOKEN` | un jeton GitHub *fine-grained* limité au dépôt `dropamine-site` : **Contents** lecture/écriture, **Actions** lecture/écriture |
   | `PUBLIC_URL` | `https://api.dropamine.app` |
   | `SITE_URL` | `https://dropamine.app` |

5. **Battle.net** : sur develop.battle.net, dans le client, ajouter l'adresse de retour `https://api.dropamine.app/auth/callback`.
6. **Démarrer**, puis vérifier `https://api.dropamine.app/health` → `ok`. Le bouton « Se connecter avec Battle.net » apparaît alors sur la page Inscription du site.

## Mettre à jour

Console SSH du site Node.js (Manager → le site Node.js → Ouvrir la console SSH) :
`cd ~/sites/<dossier du site> && git pull --ff-only`, puis **Redémarrer** dans le tableau de bord du site.

## Tester

`node --test server/lib.test.mjs scripts/score.test.mjs` (sans réseau).
