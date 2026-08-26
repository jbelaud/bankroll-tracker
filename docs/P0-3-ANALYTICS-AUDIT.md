# P0.3 — Audit Growth Analytics

Date : 24 août 2026.

## A. Ce que l’existant permet déjà

- `User.createdAt` donne les inscriptions et permet des cohortes temporelles simples.
- `Bankroll.createdAt` permet de connaître la création d’une première bankroll.
- `Bet.createdAt` permet de mesurer le volume total de paris et une approximation du premier pari.
- `ScanUsage` journalise une analyse facturée par screenshot avec utilisateur, plan, modèle, tokens, coût et date.
- Les scans vides créent aussi une ligne `ScanUsage`; le quota est libéré, mais le statut vide n’est pas stocké.
- `ScanQualityReport`, uniquement après consentement, conserve bookmaker, modèle, version du prompt, extraction brute, correction finale et synthèse des corrections.
- L’administration affiche déjà inscriptions, utilisateurs avec bankroll, utilisateurs actifs, bankrolls, paris, scans, utilisateurs ayant scanné, coûts, tokens, revenus Stripe, bêta-testeurs, invitations, feedbacks et qualité OCR volontaire.
- Les erreurs techniques du Scan sont journalisées côté serveur, sans contenu complet de capture.
- Aucun SDK analytics tiers ni session replay n’est installé.

## B. Ce qui manque

- visiteurs anonymes et `landing_view` ;
- début d’inscription et source d’acquisition ;
- first touch, signup source et UTM ;
- cohorte `beta_wave_1` ;
- événements de parcours Scan avant l’appel facturé : ouverture, sélection, démarrage ;
- statut durable de chaque analyse : résultat exploitable, vide ou échec technique ;
- durée d’analyse, bookmaker sélectionné/détecté, nombre de paris détectés ;
- début et fin de vérification, exclusions/suppressions, avertissements et corrections par champ ;
- lien durable entre un screenshot analysé, un lot d’import et les paris créés ;
- distinction des paris manuels et OCR ;
- paliers 1, 3, 5 et 10 paris ;
- Time To Value, funnel complet, rétention J1/J7/J30 et distribution de quota dans une vue Growth dédiée.

## C. Données à stocker durablement en base

- attribution d’acquisition du compte : source normalisée, UTM first touch, UTM signup, cohorte bêta ;
- événements serveur faisant foi pour les jalons importants ;
- statut et métriques opérationnelles de chaque `ScanUsage` ;
- méthode de création de chaque pari (`MANUAL` ou `SCAN`) ;
- identifiant de lot d’import et rattachement aux analyses source ;
- compteurs de correction et noms de champs corrigés, sans valeur personnelle corrigée ;
- timestamps nécessaires au funnel et au Time To Value.

## D. Données pouvant être envoyées à un outil analytics

Un outil européen comme PostHog EU sera utile plus tard pour funnels, cohortes, rétention, parcours et éventuellement replay. Il doit recevoir uniquement : nom d’événement, identifiant interne pseudonymisé, langue, device générique, source/UTM, cohorte, bookmaker, compteurs, statut, version du parser et durées.

L’intégration d’un outil tiers ne remplace pas les écritures serveur durables pour les imports, paliers d’activation, coûts et métriques OCR.

## E. Données à ne pas envoyer à un outil tiers

- capture ou URL de capture ;
- extraction OCR brute ou texte du ticket ;
- référence de ticket ;
- description/sélection/événement saisis par l’utilisateur ;
- pseudo ou nom de compte bookmaker ;
- solde, mise ou gain au niveau individuel ;
- adresse e-mail, nom, token, cookie signé ou secret ;
- notes d’administration et contenu des feedbacks.

## Décision P0

Ne pas installer PostHog avant la mise en place de la source de vérité serveur. Le dépôt permet déjà d’exploiter une partie de l’acquisition et des coûts, mais ne permet pas de reconstruire le funnel demandé ni de définir proprement les taux de qualité OCR. La priorité est de compléter le schéma et les événements serveur, puis d’ajouter éventuellement PostHog EU comme couche d’analyse comportementale après création du compte externe.

## Implémentation P0 — en attente de migration production

La migration Prisma `20260824090000_add_growth_scan_measurement` ajoute la base durable suivante :

- `growth_events` pour les vues landing, débuts d’inscription et étapes de parcours sans capture, texte OCR, e-mail, mise ou sélection individuelle ;
- métadonnées opérationnelles sur `scan_usages` : résultat `READY` / `EMPTY` / `TECHNICAL_FAILURE`, bookmaker choisi/détecté, durée, nombre de paris détectés/importés/exclus, corrections agrégées, version de prompt et fin de vérification ;
- provenance `UNKNOWN` / `MANUAL` / `SCAN` et lien optionnel vers le Scan pour chaque nouveau pari. Les anciennes lignes sont volontairement `UNKNOWN`.

Les événements principaux sont produits au plus près de leur source : landing, inscription, création de bankroll, ouverture/sélection/démarrage de Scan, résultat, vide, panne, début/fin de vérification, alertes doublon/bookmaker, corrections, import et premier import OCR. Les métriques serveur restent best-effort : un incident analytics ne bloque jamais inscription, création de bankroll, Scan ou import.

Limite connue : le modèle actuel de pari ne sépare pas encore compétition, événement et sélection. La correction de ces informations est donc mesurée via le champ descriptif existant, sans prétendre fournir une précision par sous-champ inexistante.
