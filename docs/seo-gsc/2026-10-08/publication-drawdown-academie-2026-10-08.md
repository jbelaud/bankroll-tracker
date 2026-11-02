# Article Académie — drawdown — 8 octobre 2026

## Intention et couverture

Question : « Comment lire le drawdown de sa bankroll en unités ? ». Volume et difficulté : **à vérifier auprès de Jeremy** ; concurrence facile non mesurée, aucune promesse de classement.

Sitemap public consulté avant création : 42 URL, aucune page dédiée. L'article ROI décrit le résultat global et mentionne les baisses sans expliquer leur calcul. L'article unités traite la conversion. La nouvelle page apporte une méthode de lecture de la courbe et une distinction entre drawdown courant/maximal et variation de capital.

Export GSC accessible du 28/09–04/10 : aucune requête visible. Cela ne prouve pas une absence de classement. Aucun title/H1 d'une page existante modifié.

## Preuve vécue

Bankroll publique d'EGS Betting, avec son accord déjà confirmé par Jeremy : https://kalivoa.com/fr/p/Gi4RdWxXhbHFOIJL?view=all

Second relevé du 08/10 : 25 paris réglés visibles, +9,41 u de bénéfice cumulé, drawdown maximal affiché −4,15 u. Les trois pertes datées des 13, 15 et 16 septembre sont −1,25 u, −1 u et −1,25 u. En plaçant l'origine de l'extrait juste après le pari du 12/09, le recul calculé est de 3,50 u.

La baisse de 3,50 u porte sur cet extrait seulement. Le drawdown global de 4,15 u est un chiffre relevé dans l'interface, pas une reconstitution prétendument exacte depuis des bénéfices arrondis. L'ordre de paris le même jour et les arrondis doivent être conservés pour recalculer la série complète. Aucune conversion privée, référence de compte ou identifiant de ticket publié.

Le nombre visible au second relevé diffère du premier relevé du 08/10 utilisé par les articles précédents (26, dont un en attente). Les articles antérieurs sont des instantanés datés ; ils ne sont pas retouchés pour suivre une page dynamique.

Preuve archivée : preuve-drawdown-egs.json.

## Livraison préparée

- /fr/academie/comprendre-drawdown-bankroll
- /en/academie/comprendre-drawdown-bankroll
- Texte original FR/EN : définition, méthode, tableau réel, distinction extrait/historique complet, unités versus pourcentage, limites.
- Article + BreadcrumbList, citation source, metadata canonical/hreflang via le helper existant.
- Une carte dans les hubs Académie et liens vers ROI, unités, suivi de bankroll et jeu responsable.
- Aucun changement de texte des cinq articles existants.
- Sitemap prévu : 44 URL ; Académie prévue : six articles.

## Contrôles avant mise en ligne

Lint ciblé, génération des types Next.js et TypeScript : réussis. Rendu de la page FR et tableau vérifiés en prévisualisation ; exemple retrouvé dans la version EN. Calcul de l'extrait vérifié : 1,25 + 1 + 1,25 = 3,50 u.

Publication confirmée : commit 1fedba7aaee35991540ded5df5bf621ba8a3ae5a, déploiement Vercel dpl_7nk9mVZ1bKEbiH4npsDm1jMaoVSE READY, alias kalivoa.com sans erreur. Versions FR/EN HTTP 200, canoniques propres, hreflang fr/en/x-default, Article et BreadcrumbList vérifiés ; aucune directive noindex. Sitemap public : 44 URL. Carte de navigation depuis le hub vérifiée dans le navigateur. Sources : verification-drawdown-production.json, sitemap-apres-drawdown.xml et drawdown-publie-2026-10-08.png.

## Observation

Après publication du 08/10, observer les deux nouveaux articles et les hubs touchés jusqu'au 06/01/2027 environ. Vérifier l'indexation lors du suivi du lundi 12/10 ; une réponse HTTP 200 ne confirme pas l'indexation.
