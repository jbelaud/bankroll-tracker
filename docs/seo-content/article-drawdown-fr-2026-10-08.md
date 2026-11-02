# Comment lire le drawdown de sa bankroll en unités ?

Statut : publié en FR/EN le 8 octobre 2026, commit 1fedba7. Source et vérifications dans le rapport de publication.

Rédaction Kalivoa · 8 octobre 2026

Le drawdown mesure la baisse entre le plus haut atteint par une courbe et un point qui le suit. Sur une courbe de bénéfice cumulé en unités : drawdown = sommet précédent − bénéfice cumulé actuel. Le drawdown maximal est la plus grande de ces baisses sur la période observée. Un résultat final positif peut donc coexister avec une baisse importante en cours de route.

## Quelle courbe faut-il observer ?

Précisez ce que représente la courbe : un solde, un capital ou un bénéfice cumulé. La bankroll publique Kalivoa montre les bénéfices et les pertes cumulés en unités. Elle ne représente pas le solde réel du compte bookmaker.

Choisissez une période et un historique cohérent. Des paris manquants, des résultats corrigés ou une autre convention d’unités changent le parcours. Pour reproduire un calcul, conservez le même point de départ, les mêmes paris et le même ordre.

## Comment calculer la baisse, étape par étape ?

Parcourez les résultats dans l’ordre chronologique. Après chaque pari réglé, ajoutez son bénéfice ou sa perte au cumul. Gardez en mémoire le plus haut cumul déjà atteint, en incluant le point de départ.

À chaque point, soustrayez le cumul actuel de ce sommet précédent. Un nouveau sommet a une baisse nulle à cet instant. Conservez la plus grande baisse rencontrée pour obtenir le drawdown maximal du périmètre.

Une remontée réduit le drawdown courant ; elle n’efface pas la baisse maximale déjà traversée. Un nouveau sommet devient la référence pour les points suivants.

## Exemple réel : une baisse de 3,50 u du 12 au 16 septembre

Le 8 octobre 2026, l’historique public d’EGS Betting montrait un pari gagné le 12 septembre, puis trois paris perdus les 13, 15 et 16 septembre. Les pertes affichées étaient de 1,25 u, 1 u et 1,25 u. Aucune autre ligne n’était visible entre ces dates dans cet historique.

Pour lire cet extrait, plaçons l’origine à 0 u juste après le pari du 12 septembre. Ce zéro est un point de référence du calcul, pas le capital du tipster. Les pertes donnent ensuite −1,25 u, −2,25 u et −3,50 u de variation cumulée.

La baisse maximale de cet extrait est donc 0 − (−3,50) = 3,50 u. Elle ne doit pas être présentée comme le drawdown maximal de toute la bankroll.

| Point de l’extrait | Résultat ajouté | Variation cumulée | Baisse depuis le sommet de l’extrait |
| --- | --- | --- | --- |
| Après le pari du 12/09/2026 | Point de référence | 0 u | 0 u |
| 13/09/2026 | −1,25 u | −1,25 u | 1,25 u |
| 15/09/2026 | −1 u | −2,25 u | 2,25 u |
| 16/09/2026 | −1,25 u | −3,50 u | 3,50 u |

## Pourquoi la page indique-t-elle un drawdown maximal de 4,15 u ?

Au même relevé, la page publique affichait 25 paris réglés, un bénéfice cumulé de +9,41 u et un « Drawdown max » de −4,15 u. Ce dernier chiffre concerne toute la série affichée ; notre tableau décrit seulement l’extrait du 12 au 16 septembre.

Le signe négatif de l’interface décrit une baisse ; sa profondeur est de 4,15 u. Le bénéfice final donne le résultat cumulé à la fin. Le drawdown décrit le recul depuis un sommet antérieur. Un bilan positif ne signifie pas une progression sans pertes.

## 4,15 u ne signifie pas automatiquement 4,15 % du capital

Pour exprimer une baisse en pourcentage de capital, il faut connaître le capital au sommet et utiliser une série de capital compatible : baisse relative = (capital au sommet − capital après la baisse) ÷ capital au sommet × 100.

Le bénéfice cumulé peut commencer à zéro ou devenir négatif. Diviser la baisse par ce bénéfice ne donne pas un pourcentage de capital exploitable. Les montants privés du tipster ne sont pas connus : nous ne convertissons pas son drawdown en euros ou en pourcentage de son compte.

## Quelles limites garder en tête ?

La période, la fréquence des points et l’ordre des paris influencent le drawdown. Un regroupement par jour peut masquer un sommet ou un creux entre deux paris. Vérifiez ces conventions et le nombre de paris avant de comparer des historiques.

Le drawdown ne prouve pas que tous les tickets sont vérifiés et ne fixe pas un plafond aux pertes futures. Lisez séparément les preuves, le ROI et les baisses de la courbe. Ne relevez pas vos mises pour retrouver un ancien sommet : le suivi sert à comprendre votre exposition et vos limites.

## Source

Source : bankroll publique d’EGS Betting, relevé du 8 octobre 2026 après consultation des 25 paris visibles. Calcul sur les pertes des 13, 15 et 16 septembre. Les données peuvent évoluer. Exemple autorisé par le tipster ; aucune conversion personnelle ni référence de ticket reproduite.

[Bankroll publique source](https://kalivoa.com/fr/p/Gi4RdWxXhbHFOIJL?view=all)
