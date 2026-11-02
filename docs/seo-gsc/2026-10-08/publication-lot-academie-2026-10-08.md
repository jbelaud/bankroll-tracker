# Lot Académie — combinés, ROI et unités — 8 octobre 2026

## Périmètre préparé

Trois nouveaux articles originaux FR/EN :

- `/academie/suivre-pari-combine` : un ticket, plusieurs sélections, une seule mise ; preuve relevée dans le ticket/historique transmis le 25/09.
- `/academie/calculer-roi-paris` : ROI versus taux de réussite, dénominateur et périmètre ; preuve cohérente de deux simples perdus, 17,50 € engagés, −17,50 € de bénéfice net, ROI −100 %, réussite 0 % sur ces deux tickets seulement.
- `/academie/comprendre-unites-bankroll` : définition, conversion et périmètres publics ; preuve EGS Betting autorisée, datée du 08/10. Exemple 30 €/20 € explicitement fictif ; formule Kalivoa 1 u = 1 % du montant de référence vérifiée dans `bankroll-units.ts`.

Accueil organisé par besoins avec cinq articles, trois lectures de départ, dates/auteur et accès aux pages produit. Article + BreadcrumbList sur chaque nouvelle URL, canonical/hreflang FR/EN/x-default. Sitemap prévu : **42 URL** (36 publiques avant livraison + 6 nouveaux articles).

## Contrôle préalable de couverture

Sitemap public contrôlé le 08/10 : 36 URL, aucun des trois nouveaux articles. Pages marketing et traductions contrôlées : ROI et formats de paris mentionnés sans méthode détaillée ; l'article tipster précise que les montants sont en unités sans expliquer leur conversion. Intentions distinctes retenues. GSC disponible via export du 08/10 pour le 28/09–04/10 : aucune requête visible ; absence de données visibles ne prouve pas absence de classement. Title/H1 des pages et articles existants conservés.

Volume/difficulté : **à vérifier auprès de Jeremy**. Concurrence faible non mesurée ; aucune garantie de classement. Les alternatives et annuaires anglophones restent reportés selon son arbitrage.

## Preuves et originalité

Textes et traductions produits pour Kalivoa, sans reprise des articles concurrents. Aucune nouvelle image privée ou référence de ticket publiée. Le profit incohérent du combiné est exclu des exemples. Le ROI public utilise uniquement les deux simples dont ticket et historique concordent. L'exemple EGS conserve sa date et le statut « En observation », sans le présenter comme certifié.

## Livraisons et contrôles

Chantier isolé à partir de `2f1a2a8`, repris sur `1afb05d` avant livraison pour préserver la correction de conversion personnelle publiée entre-temps. TypeScript et lint ciblé réussis avant cette reprise ; compilation complète Webpack réussie après reprise. Rendu ROI et unités vérifié dans le navigateur, tableaux et textes présents. Aucun changement produit du checkout principal incorporé.

Commit `0b17b81a2dbb25bc5b2e3040b3464844c2668ba0` poussé sur `master` en avance rapide. Déploiement production `dpl_DLcFtShTwCRXdW3ASf94q8pDLXQ9` **READY**, alias `kalivoa.com`, aucune erreur d'alias. Six pages publiques HTTP 200, six canoniques propres vérifiées, Article + BreadcrumbList présents. Hreflang FR/EN contrôlés sur les six versions locales, conservés par le helper de métadonnées. Accueil public ouvert et cinq cartes présentes avec liens vers les trois nouveaux articles. Sitemap public vérifié : **42 URL**.

Liens FR publiés : [combiné](https://kalivoa.com/fr/academie/suivre-pari-combine), [ROI](https://kalivoa.com/fr/academie/calculer-roi-paris), [unités](https://kalivoa.com/fr/academie/comprendre-unites-bankroll). [Capture publique de l'accueil](academie-publiee-2026-10-08.png).

Contrôle final en production : hreflang `fr`, `en` et `x-default` présents sur les six nouvelles URL ; aucune balise robots `noindex` ni en-tête `X-Robots-Tag`. Sources archivées : [vérification publique](verification-lot-production.json) et [sitemap après livraison](sitemap-apres-lot.xml). Cela confirme leur disponibilité technique, pas leur indexation effective.

## Observation

Les six nouvelles URL et les deux accueils sont en observation jusqu'au **06/01/2027 environ**, à partir de la publication du 08/10. Les deux articles existants restent inchangés. Vérifier l'indexation dans GSC lors du suivi du lundi 12/10, sans déduire l'indexation d'une simple réponse HTTP 200. Les nouvelles pages peuvent être créées pendant cette période si leur intention est distincte et leur preuve disponible.
