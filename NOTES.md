# Max et l'Œil de Jade — notes

Jeu de plateforme pour téléphone, à jouer en paysage. Il mélange l'exploration d'un *Rick Dangerous* (munitions limitées, dynamite, momies) et les pièges farceurs d'un *Level Devil* (le décor change sous les pieds).
L'explorateur Max fait la course contre le professeur Archibald jusqu'à l'Œil de Jade, à travers 5 mondes de 20 niveaux.

- Version en ligne : https://smob-fr.github.io/max-oeil-de-jade/ (publiée depuis la branche `main` de ce dépôt)
- Ce dépôt est la source de référence. Copies :
  - `smob-fr/suivi-piano`, dossier `jeu/` (branche `claude/rick-dangerous-level-devil-game-bllelk`) ;
  - `smob-fr/jeux`, dossier `jeux/max-et-loeil-de-jade/` (branche `import/max-et-loeil-de-jade`).
- Cadrage complet (mondes, niveaux, ennemis, histoire) : `CADRAGE.md`
- Retours des testeurs et réponses : `RETOURS.md`
- Présentation pour les joueurs : `README.md`

## Technique

- **JavaScript pur, sans bibliothèque ni outil de construction.** Le jeu est un `<canvas>` 2D dessiné à la main, sans image de sprite. Max, les ennemis et les décors sont tracés en code.
  - `index.html` : la page, le style, les menus et les commandes tactiles.
  - `game.js` (≈ 5 200 lignes) : le moteur. Il gère la physique, les collisions, les ennemis, les pièges, les 5 boss, le rendu, le son (synthétisé avec Web Audio) et la sauvegarde (`localStorage`).
  - `mondes.js` : la carte des 5 mondes, en SVG.
- **Les niveaux sont générés par un script Python**, `outils/niveaux.py` (≈ 4 400 lignes). Il produit `levels.js`, qu'il ne faut jamais modifier à la main. Le script fait trois choses :
  - il assemble chaque niveau à partir de « motifs » (passages typiques de chaque monde) jusqu'à la longueur visée, avec un tirage aléatoire à graine fixe ;
  - il ajoute les **pièges surprises** à la Level Devil, le drapeau du milieu et les pièces ;
  - il **vérifie que chaque niveau est faisable**. Un vérificateur de chemin simule les sauts, la nage avec la réserve d'air, le froid et les plateformes mobiles. Il teste le niveau avec 0, 1, 2 et 3 morts, car certains pièges changent de place après une mort. Un piège qui rend le niveau infaisable est refusé.
- **Grille de cases de 16 pixels, 60 images par seconde à pas fixe.** Chaque niveau est une liste de lignes de caractères : `#` pierre, `^` pics, `~` nuage, `R` lave, `P` départ, `D` porte… La légende complète figure dans les commentaires de `game.js` et `niveaux.py`.
- **Application installable (PWA).**
  - `manifest.webmanifest` et `sw.js` (service worker) permettent de jouer hors ligne. Il faut changer la constante `VERSION` de `sw.js` à chaque publication.
  - Le jeu est publié sur GitHub Pages ; `.nojekyll` sert à cette publication.
- **Performances sur téléphone.**
  - Les cases immobiles et le décor fixe sont dessinés une fois, par morceaux de 16 colonnes mis en cache.
  - Le fond est dessiné en basse définition.
  - La résolution baisse toute seule si le téléphone rame.
- **Commandes tactiles.**
  - Les flèches forment une seule zone : on glisse le doigt de ◀ à ▶.
  - SAUT, COUP et TNT suivent chaque doigt (`touchstart`/`touchend`).
  - Un appui bref donne toujours un vrai saut.
  - Au clavier :
    - se déplacer : ◀ ▶ ou Q/D ;
    - sauter : espace, ▲ ou Z ;
    - frapper : X ;
    - dynamite : C ou ▼ ;
    - pause : P ou Échap ;
    - recommencer : R.

## Compiler et tester

Il n'y a rien à compiler pour le moteur. Seuls les niveaux sont générés, et il faut Python 3 (testé avec 3.13), sans dépendance.

```sh
python3 outils/niveaux.py          # réécrit levels.js et vérifie les 100 niveaux
python3 -m http.server 8765        # puis ouvrir http://localhost:8765/
```

- Le script affiche « 100 niveaux écrits, … 0 erreur(s) ». Il se termine avec le code 1 si un niveau n'est pas faisable.
- Il affiche aussi les pièges surprises posés dans chaque niveau, et ceux que le vérificateur a refusés.
- La génération est déterministe : relancer le script redonne exactement le même `levels.js`.
- Mode testeur : case « testeur » dans les options, pour ouvrir tous les niveaux.
- Outils de test dans la console : l'objet `window.__temple`.
  - `playFrom(i)` lance le niveau `i`.
  - `mesurePerf(n)` fait avancer `n` images et en donne le temps moyen.
  - `room` donne l'état du niveau en cours.
  - `apercuNiveau(i)` donne une image du niveau entier.
- **Tests automatiques** (`outils/tests/`, 16 tests, environ 4 minutes) : les robots qui battent les 5 boss, chaque mécanique des 5 mondes, les 100 niveaux, les plateformes mobiles et le saut tactile. Pour les lancer : une seule fois `cd outils/tests && npm install && npx playwright install chromium`, puis `node outils/tests/lancer.js` depuis la racine (ou `node outils/tests/lancer.js boss saut` pour n'en lancer qu'une partie ; code de sortie 1 en cas d'échec).

## Fonctionnalités

- **5 mondes de 20 niveaux** sur une grande carte. Chaque monde compte 19 niveaux longs (160 à 240 cases, un drapeau de sauvegarde au milieu), puis un boss.
  - Les niveaux 5, 10 et 15 sont des niveaux d'histoire.
  - Il y a un Défi tous les 3 niveaux.
  - Le niveau 19 est la grande épreuve du monde.
- **Monde 1, l'Empire inca**
  - Mécaniques : lianes, singes voleurs, bébés jaguars, têtes de jaguar qui crachent du feu, rayon du dieu Soleil, salles secrètes, ressorts fragiles, radeaux qui coulent, sabliers, torches, rocher qui roule.
  - Boss : le Jaguar de pierre.
- **Monde 2, l'Himalaya**
  - Mécaniques : neige profonde, glace vive, ponts de corde, avalanche, crevasses cachées, lac gelé, geysers, jauge de froid et braseros, ski, blizzard ; loups, aigles, yétis, chèvres, bonshommes de neige.
  - Boss : le Yéti grognon.
- **Monde 3, les abysses** : on alterne îles et plongée, avec une réserve d'air à surveiller.
  - Mécaniques : méduses, crabes, anguilles, poissons-globes, requin, mines à pousser, sas, tourbillons, coffres qui mordent, torpilles, algues, abysses noirs avec un poisson-lanterne.
  - Boss : la pieuvre géante.
- **Monde 4, le royaume des nuages** : il n'y a pas de sol.
  - Mécaniques : nuages qui fondent, faux nuages, trampolines, nuages voyageurs, arcs-en-ciel, orage annoncé par une ombre, ballons, moulins, cerfs-volants, pluie, grêle, nuages souffleurs, oiseaux, petits éclairs vivants.
  - Boss : l'Oiseau-tonnerre, qu'on assomme en sonnant les cloches au bon moment.
- **Monde 5, la cité d'or**
  - Mécaniques : lave, tapis roulants, jets de feu, wagonnet, pluie de magma, dalles qui fondent, engrenages, pistons, vapeur, effondrement, compte à rebours ; golems (deux coups), salamandres, gardiens d'or, robots d'alarme.
  - Boss : le Fouisseur d'Archibald. Après le combat, la machine explose et l'Œil de Jade sort des débris.
- **Pas d'armes.** On saute sur les ennemis ou on les assomme d'un coup de massue, et la dynamite ouvre les murs fissurés. Les boss sont assommés, jamais tués.
- **Pièges surprises à la Level Devil** dans chaque ligne droite : sol qui s'ouvre, pics qui jaillissent, bloc qui tombe, piège qui change de place après une mort, requin qui surgit, nuage qui fond…
- **Histoire racontée en fin de niveau** par Archibald, avec de l'humour.
- **Aide automatique** : tous les 3 échecs dans un niveau, les pièges ralentissent.
- **Économie**
  - Des pièces d'or permettent d'obtenir des amulettes de jade (protection contre 2 coups).
  - Après une mort, le jeu propose « Repartir d'ici ? ».
  - Après beaucoup d'échecs, on peut passer le niveau.
  - Les achats et les vidéos sponsorisées ne sont que des écrans de démonstration sur le web.
- **Sauvegarde** de la progression. Chaque niveau a un identifiant stable (`inca-3`, `aby-12`…), et la sauvegarde suit les niveaux même si leur ordre change.

## État d'avancement

- **Les 5 mondes sont jouables de bout en bout**, avec 100 niveaux et 5 boss.
- Le vérificateur confirme que les 100 niveaux sont faisables, avec 0 à 3 morts.
- Des robots de test battent les 5 boss.
- Les mondes 1 à 3 ont été joués et validés par le testeur principal : longueur, difficulté et pièges surprises.
- Les mondes 4 et 5 ont été finis le 9 et le 10 novembre 2026. Ils sont en cours de test réel. Premiers retours traités :
  - salamandre impossible à sauter, corrigé ;
  - fin du Fouisseur avec l'Œil de Jade, ajoutée.
- Commandes tactiles retravaillées le 10 novembre : saut fiable même sur un appui bref, grand bouton SAUT rectangulaire. À confirmer sur téléphone.

## Ce qui reste à faire

- **Valider en jeu les mondes 4 et 5**, en particulier :
  - la difficulté des sauts entre nuages ;
  - les moulins, les cerfs-volants et le wagonnet ;
  - le combat contre l'Oiseau-tonnerre ;
  - le Fouisseur.
- **Confirmer sur un vrai téléphone** que le bouton SAUT ne rate plus aucun appui, et que le jeu reste fluide dans les mondes 4 et 5.
- **Écran de fin du jeu** : il ne montre pas encore l'Œil de Jade et la fin de l'histoire (Max et Archibald ensemble). Pour l'instant, la fin passe par le récit du dernier niveau.
- **Musique** : il n'y a que des bruitages synthétisés. Le cadrage prévoit une musique par monde.
- **Version des stores** (appli) : vrais achats intégrés et vraies vidéos sponsorisées, à brancher. Sur le web, ce sont des écrans de démonstration.
- **Tests automatiques** : lancer `outils/tests/` en intégration continue, à chaque envoi sur GitHub.
- **Nettoyage**
  - `niveaux.py` contient encore les fonctions des anciens niveaux provisoires (`acte1` à `acte10`). Elles servent seulement à reprendre les anciennes sauvegardes.
  - `game.js` mériterait d'être découpé par monde.
- **Mondes futurs** envisagés dans `CADRAGE.md` : pyramides, île aux pirates, forêt hantée, train fou, banquise, laboratoire d'Archibald.
