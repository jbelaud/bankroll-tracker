# Import MyStake

MyStake figure dans le catalogue des bookmakers, séparément de Stake. Le scan
utilise le parcours existant : une capture par ticket, puis revue du lot envoyé
par l'extension. Aucun changement du schéma de données n'est nécessaire.

## Lecture des tickets

L'en-tête horizontal contient, dans cet ordre : statut, référence `#`, date et
heure de prise du pari, format, mise en EUR, cote, retour en EUR. Le dernier
montant n'est jamais la mise. `Single` correspond à un pari simple.

| Statut visible | Résultat importé |
| --- | --- |
| Won | Gagné |
| Lost | Perdu |
| Current | En attente |
| RETURNED | Remboursé, même avec un retour affiché à 0 EUR |

La référence sert à détecter les doublons et à rapprocher un ticket en attente
de sa capture clôturée. Une capture sans nom ou logo lisible conserve une
détection de bookmaker nulle ; la bankroll sélectionnée ne prouve pas la marque.

## Marchés

| Sport | Marché et sélection visibles | Type dans Kalivoa |
| --- | --- | --- |
| Basketball | Total points (incl. overtime) | Total points (prolongations incluses) |
| Tennis | Total games | Total de jeux |
| Football | Total / Over ou Under | Over/Under buts |
| Football | Handicap / Pick: 1 (0) ou 2 (0) | Handicap asiatique |

Le libellé conserve le sens du pari, son seuil et l'affiche. Pour le handicap à
zéro, `1` joue le premier participant et `2` le second. Un autre handicap
sans mention explicite reste dans le type Handicap.

Les trois sports des captures existent déjà. Le mécanisme de taxonomie
personnelle reste disponible pour les autres disciplines et marchés : les
ajouts se font après validation par l'utilisateur.

## Référence de contrôle : les sept captures fournies

| Référence | Mise | Cote | Résultat | Type |
| --- | ---: | ---: | --- | --- |
| 306582485 | 4 EUR | 1,71 | Gagné | Total points (prolongations incluses) |
| 306702732 | 11 EUR | 2,09 | En attente | Over/Under buts |
| 306571224 | 4 EUR | 2,15 | Perdu | Total de jeux |
| 306676939 | 6 EUR | 1,46 | Remboursé | Handicap asiatique |
| 306566301 | 3 EUR | 2,22 | En attente | Handicap asiatique |
| 306562379 | 3 EUR | 1,85 | Perdu | Total points (prolongations incluses) |
| 306700189 | 5 EUR | 1,32 | En attente | Handicap asiatique |

Toutes ces dates de prise du pari sont partielles (`Today` ou `3 October`). Le
scan conserve le texte mais laisse la date à confirmer, sans inventer l'année.
La date à gauche de l'affiche est celle de l'événement.

## Vérification

Les tests locaux couvrent les statuts des sept en-têtes, la normalisation des
marchés, l'absence d'année et la distinction entre Stake et MyStake.

Le test OCR réel est facultatif et appelle le fournisseur IA configuré. Il
nécessite une autorisation pour la transmission et les appels payants. Les
captures ne sont pas incluses dans le dépôt. Pour l'exécuter, placer les sept
images dans un dossier, nommées `01.png` à `07.png`, définir
`MYSTAKE_SCAN_FIXTURES_DIR` vers ce dossier, puis lancer
`pnpm test scripts/verify-mystake.test.ts`. Sans cette variable, le test reste
ignoré lors de la suite normale. MyStake conserve le statut non testé tant
que la vérification réelle n'a pas réussi.

Vérification du 4 octobre 2026 : 108 tests ciblés réussis ; la suite globale
compte 420 tests réussis, mais deux suites d'intégration échouent au démarrage
de PostgreSQL embarqué faute de mémoire (`ENOMEM`). Le test OCR réel, autorisé
par l'utilisateur, est bloqué dès la première image par Google : erreur 403
`PERMISSION_DENIED`, accès refusé au projet configuré. Aucune extraction des
sept images n'a donc pu être validée par le fournisseur.
