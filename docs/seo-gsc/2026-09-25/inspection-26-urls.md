# Inspection des 26 URL du sitemap — 25 septembre 2026

Source : Google Search Console, inspection d'URL via la connexion GSC Wizard à la propriété `sc-domain:kalivoa.com`. La réponse décrit l'index connu de Google, pas un test en direct. Le sitemap soumis `https://kalivoa.com/sitemap.xml` contient 26 URL ; GSC indique 0 erreur et 0 avertissement de lecture, mais son champ « indexed: 0 » contredit l'inspection individuelle et n'est pas utilisé pour ce décompte.

**Résultat : 24/26 indexées.** `/fr` est indexée (dernière exploration le 23/09/2026 à 20:25 UTC). `/fr/privacy` et `/fr/responsible-gambling` restent classées comme doublons ; leurs dernières explorations datent respectivement du 11/09 et du 29/08, avant la correction des balises canonical/hreflang publiée le 25/09. Le contrôle du HTML en production après le déploiement `f8db588` confirme HTTP 200, canonique propre et 3 liens hreflang sur chacune des 6 pages légales FR/EN. Attendre une nouvelle exploration avant d'évaluer l'effet sur l'indexation.

| URL | Statut GSC | Dernière exploration (UTC) |
|---|---|---|
| `/fr` | Indexée | 2026-09-23 |
| `/fr/features` | Indexée | 2026-08-25 |
| `/fr/screenshot-import` | Indexée | 2026-08-26 |
| `/fr/bankroll-tracking` | Indexée | 2026-08-25 |
| `/fr/bookmakers` | Indexée | 2026-09-18 |
| `/fr/bookmakers/unibet` | Indexée | 2026-08-25 |
| `/fr/bookmakers/betclic` | Indexée | 2026-08-29 |
| `/fr/bookmakers/winamax` | Indexée | 2026-09-06 |
| `/fr/pricing` | Indexée | 2026-09-07 |
| `/fr/faq` | Indexée | 2026-08-26 |
| `/fr/privacy` | Non indexée : doublon sans canonique retenue | 2026-09-11 |
| `/fr/terms` | Indexée | 2026-09-19 |
| `/fr/responsible-gambling` | Non indexée : doublon sans canonique retenue | 2026-08-29 |
| `/en` | Indexée | 2026-09-08 |
| `/en/features` | Indexée | 2026-08-25 |
| `/en/screenshot-import` | Indexée | 2026-08-29 |
| `/en/bankroll-tracking` | Indexée | 2026-08-26 |
| `/en/bookmakers` | Indexée | 2026-08-29 |
| `/en/bookmakers/unibet` | Indexée | 2026-09-07 |
| `/en/bookmakers/betclic` | Indexée | 2026-08-30 |
| `/en/bookmakers/winamax` | Indexée | 2026-08-25 |
| `/en/pricing` | Indexée | 2026-08-25 |
| `/en/faq` | Indexée | 2026-08-24 |
| `/en/privacy` | Indexée | 2026-08-25 |
| `/en/terms` | Indexée | 2026-08-25 |
| `/en/responsible-gambling` | Indexée | 2026-08-26 |

## Performances hebdomadaires

| Période | Clics | Impressions de la propriété | CTR | Position moyenne |
|---|---:|---:|---:|---:|
| 7–13 septembre | 0 | 4 | 0 % | 5,5 |
| 14–20 septembre | 0 | 3 | 0 % | 6 |

Pages avec impressions (agrégation par page) : 7–13 septembre : `/` (1, position 10), `/en` (3, position 4). 14–20 septembre : `/en` (2, position 8), `/fr/bookmakers` (1, position 7), `/fr/bookmakers/winamax` (1, position 9), `/fr/pricing` (1, position 2), `/fr/sales-terms` (1, position 3), `/privacy` (1, position 5). Les 7 impressions cumulées par page la seconde semaine ne doivent pas être additionnées au total de propriété de 3 : Google agrège ces deux vues différemment.

Requête visible : `kali betting`, 1 impression (position 5) du 7 au 13 septembre, puis 2 impressions (position 8) du 14 au 20 septembre. Les autres requêtes ne sont pas exposées par GSC ; aucune requête commerciale exploitable n'apparaît. Aucun changement de title ou H1 ne se justifie avec ces volumes.

Au prochain relevé hebdomadaire : contrôler les 26 statuts sans relancer systématiquement 26 inspections ; suivre en priorité les deux doublons et la présence de `/fr` dans le rapport Pages. Archiver le nouvel état daté.
