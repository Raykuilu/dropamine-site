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
| `POST /claim` / `POST /release` `{ "keys": ["eu/ray-kuilu"] }` | register / remove — only characters of the signed-in account |
| `POST /logout` | ends the session |

Security: the Battle.net token is never stored (only the character list, in memory, for the session);
signed HttpOnly cookies; POST only from `https://dropamine.app`; 40 requests per minute per address.

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

Console SSH : `cd dropamine-site && git pull`, puis **Redémarrer** dans le Manager.

## Tester

`node --test server/` (sans réseau).
