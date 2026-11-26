# Tables de butin (AtlasLoot Forever)

`site/data/loot.json` est extrait des données d'**AtlasLoot Forever** (`AtlasLootClassic_DungeonsAndRaids` :
`data.lua`, `droprate.lua`, `Locales/constants.fr.lua`), sous licence **GPL-2.0** (texte : `LICENSE-AtlasLoot-GPL-2.0.txt`).
Ce fichier dérivé reste sous GPL-2.0 ; le reste du site est sous MIT.

Contenu : donjon → boss (noms anglais et français) → objets (identifiant, et taux de drop quand AtlasLoot le connaît).

Mise à jour, après une nouvelle version d'AtlasLoot Forever :

```
lua scripts/loot/extract.lua "C:/Program Files (x86)/World of Warcraft/_forever_/Interface/AddOns" > site/data/loot.json
```
