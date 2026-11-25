# Dropamine — site

The website of [Dropamine](https://github.com/Raykuilu/Dropamine), the OSRS-style skills addon for WoW Forever:
it presents the addon and hosts the **Dropamine Hiscores**.

## How it works

- `data/registry.json` lists the registered characters (`{name}-{surname}`, lowercase). Only they appear on the site.
- Once a day, a GitHub Action (`.github/workflows/update.yml`) runs `scripts/build.mjs`:
  it reads each character from the Blizzard API (namespace `profile-forever-eu`), computes the Dropamine total level,
  writes `site/data/hiscores.json`, commits the daily point in `data/history/`, and publishes `site/` on GitHub Pages.
- Total level = level + professions + Defense (from the armory) + weapon skills.
  Weapon skills come from the player's Dropamine file when they sent it (`data/uploads.json`);
  otherwise they are **estimated** (each equipped weapon type counted at 5 × level).

## Run locally

Requires Node 20+. Set `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET` (a Battle.net API client), then:

```sh
node --test scripts/*.test.mjs
node scripts/build.mjs
```

Open `site/index.html` in a browser.

## Secrets

The Battle.net client id and secret live only in the repository secrets (`BNET_CLIENT_ID`, `BNET_CLIENT_SECRET`)
and in local environment variables. They are never written to the repository.

## Data and privacy

Data comes from the public WoW Forever armory and from files players choose to send.
A player who asks to be removed is deleted from `data/registry.json` and `data/history/`.

World of Warcraft is © Blizzard Entertainment. This site is a community project, not affiliated with Blizzard.

## License

MIT
