# Carte personnage : idées et code mis de côté

Retirée du site le 2026-11-25 : la carte à collectionner perdait l'esprit Dropamine (le +1, la goutte, la fenêtre de l'addon).
Tout est gardé ici pour y revenir. Rien de ce dossier n'est publié (seul `site/` l'est).

## Ce qui a été essayé

1. **Premières maquettes** (`_carte.html`) : carte paysage 1200×630, portrait 1080×1350, bannière 1200×400. Thèmes neutre, faction, race, classe. Contenu au choix.
2. **4 directions** (`_cartes2.html?d=1..4`) :
   - `d=1` : carte à collectionner (celle qui a été mise en ligne puis retirée).
   - `d=2` : affiche cinématique, avec un gros portrait et peu de texte.
   - `d=3` : fiche façon jeu, dans le style de la fenêtre de l'addon, avec 8 compétences autour du modèle.
   - `d=4` : le portrait dans la goutte.
3. **Version en ligne** (`code/`, et `code/integration-site.diff` pour le branchement dans `app.js`, `style.css`, `index.html`, `build.mjs` et le workflow) :
   - **`card.js`** dessine la carte 750×1050 :
     - vrai logo, rareté et cadre bronze, argent, or ou légendaire ;
     - ambiance faction, race, classe, Dropamine ou image perso ;
     - météo, finition mate, brillante ou holo ;
     - titre libre et 0 à 4 compétences.
   - **Fenêtre « Ma carte »** : effet holo au survol, téléchargement, copie, partage sur téléphone, réglages gardés dans le navigateur.
   - **Album de guilde** avec vignettes ; numéro de collection (`data/numbers.json`, donné une fois à l'inscription).
   - **`cards.mjs`** : calcul quotidien d'une image par carte, plus une page `/c/{région}/{slug}/` dont l'aperçu Discord montre la carte (Chrome sans fenêtre, environ 40 s pour 14 personnages).

## Pistes non faites

- **Plus fidèle à l'addon** : en haut le toast du dernier +1, puis le portrait, la grille de tuiles comme dans l'addon, la goutte remplie et le total en bas, le cadre olive et bronze ou le thème de l'addon. Rareté et holo discrets ou absents.
- **« Ce que ta carte raconte »**, un choix unique au lieu des cases à cocher :
  - mes meilleures compétences ;
  - tout, en grille ;
  - mes rangs ;
  - mes exploits (victimes, quêtes, morts, vols) ;
  - ma progression (+N cette semaine et une courbe).
- **Dessins de compétences** :
  - A : icônes maison dans le style Dropamine ;
  - B : une carte illustrée par compétence, ce qui demande de vraies illustrations ;
  - C : un blason de spécialité.
- **Aperçu Discord sans la carte** : la même chaîne (`cards.mjs` + pages `/c/…`) peut photographier autre chose, par exemple la fiche du personnage.

## Décors du jeu (piste 3D, arrêtée)

Le terrain de Darnassus a été exporté avec wow.export puis rendu dans Blender au crépuscule. Le sol sort noir, et le corriger demande un nouvel export à la main pour chaque zone. C'est trop coûteux pour un fond de carte. Les dessins 2D de paysage (arbres, collines) ont été refusés.

## Remettre une maquette en route

Copier le fichier voulu dans `site/` et servir le dossier en local.
