# Accélération de l'enregistrement après « Importer les paris »

Le périmètre concerne la validation finale et l'enregistrement du lot. L'analyse
OCR, ses fournisseurs et la consommation des crédits ne sont pas modifiés.

## Changement

Les lots de plusieurs nouveaux paris sont écrits dans une seule transaction :
un verrou de bankroll, une lecture de son état et de ses références, une lecture
groupée des preuves Scan, puis des insertions groupées des paris et sélections.
Les calculs de conversion et les règles de preuve utilisent les mêmes fonctions
que la création d'un pari individuel.

Les conversions sont validées avant la première insertion. Une erreur pendant
l'écriture des sélections annule aussi les nouveaux paris du lot. Les contrôles
de propriété, de doublons, de référence de conversion et de rapprochement des
résultats sont conservés. La mise à jour des paris déjà en attente conserve son
parcours existant.

Les quatre lectures indépendantes précédant l'import s'exécutent ensemble.
Les événements de mesure indépendants sont également envoyés ensemble, après
les écritures métier, avec le même contrôle de consentement.

## Validation locale

- 221 tests ciblés réussis : import, création, montants, unités, preuves et
  certification, dont comparaison des données produites par les deux parcours.
- 2 tests réussis sur un PostgreSQL temporaire limité à localhost : insertion
  réelle avec sélections et annulation de la transaction sur sélection invalide.
- TypeScript réussi. ESLint complet passe sur tous les fichiers modifiés,
  y compris les composants React.

Le test de comptage sur 100 nouveaux paris passe de 500 à 5 requêtes pour le
cœur de la création, hors sélections et gestion de transaction. Le benchmark
réel sur 100 paris avec une sélection chacun mesure **1 064 ms** par le parcours
séquentiel contre **74 ms** par le parcours groupé, soit environ **14,4 fois**
plus rapide pour cette étape sur la base locale de test.

Cette mesure ne représente pas le temps complet en production, qui comprend
aussi les contrôles de l'import, le réseau, la mise à jour des statistiques Scan
et le nettoyage des captures.

## Reproduire la mesure

Le test d'intégration est désactivé par défaut. Définir
`RUN_LOCAL_BET_BATCH_TEST=1`, puis lancer
`pnpm test --maxWorkers=1 src/lib/bets/create-batch.integration.test.ts`.
`IMPORT_BATCH_BENCHMARK_REPORT` permet de choisir un fichier JSON de sortie pour
les durées. Ce test crée et supprime sa propre base locale, sans utiliser de
base distante ni de données utilisateur.

## Écran bloqué après un déploiement

Les journaux de production du 15 octobre 2026, entre 19:37 et 19:38 UTC,
montrent des POST sur `/fr/scan` refusés avec `Failed to find Server Action`,
juste après la mise en ligne du commit MyStake `7f6839f`. Cela correspond à une
page ouverte sur une version précédente. Le parcours client ne gérait pas le
rejet de la promesse et restait à l'étape « importing ».

Le client affiche désormais une invitation à vérifier la bankroll et à
actualiser la page. Une erreur réseau reste présentée comme un résultat inconnu :
elle ne déclenche jamais de seconde soumission automatique. Une demande encore
en attente après 30 secondes affiche un lien vers la bankroll, sans assimiler
ce délai à un échec ni annuler une écriture qui pourrait encore aboutir.

Après une réponse d'import réussie, l'écran confirme immédiatement le résultat.
Le partage qualité facultatif, la suppression du brouillon et celle des
captures s'exécutent indépendamment en arrière-plan. Leur échec ou leur délai
ne peut pas faire repasser un import réussi en échec. Les transferts qualité
sont interrompus après 30 secondes ; le suivi des nettoyages est limité à
45 secondes. Sept tests supplémentaires couvrent les rejets, les délais,
l'absence de nouvelle soumission et les nettoyages bloqués.

Le diagnostic repose sur les journaux du site, et la correction est vérifiée
localement. Sa présence en production doit être confirmée après publication.

Le sélecteur de bankroll de l’extension utilise le composant de sélection
thématisé de l’application afin de conserver un fond sombre et un texte lisible.

## Reprise d’une ancienne analyse de l’extension

Le cache IndexedDB de l’extension et le rejeu serveur ne vérifiaient pas la
version d’extraction. Un lot analysé avant la correction MyStake pouvait donc
conserver son ancien type de pari ou sa date absente après une mise à jour.
Les deux caches contrôlent désormais `SCAN_PROMPT_VERSION`. Le serveur vérifie
également la version contenue dans la réponse sauvegardée.

Une analyse à jour reste réutilisée sans appel OCR ni consommation de Scan.
Une ancienne analyse passe par le parcours de scan existant : rejeu d’une réponse
à jour si elle existe, sinon nouvelle lecture avec les règles et quotas actuels.
Un échec de cette lecture conserve l’image et l’ancien cache pour une reprise.
L’écran explique quand une mise à jour nécessite un nouveau Scan.

Le test `extension-cache-upgrade.test.ts` parcourt le cache client, le rejeu
serveur, le client HTTP et la préparation de la revue avec des réponses simulées.
Il vérifie le passage au handicap asiatique, la date du 25 septembre de l’année
en cours et l’absence d’un second appel lors de la reprise du résultat corrigé.
Aucune capture utilisateur n’est envoyée à un fournisseur pendant ce test.
