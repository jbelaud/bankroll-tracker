# Brouillon FR — bankroll publique et preuve des paris d'un tipster

**Statut :** brouillon actualisé le 08/10/2026, non publié. Jeremy a transmis la [bankroll publique d'EGS Betting](https://kalivoa.com/fr/p/Gi4RdWxXhbHFOIJL?view=all). La page a été lue le 08/10 ; l'accord du propriétaire pour la citer dans l'Académie et réutiliser une capture reste à confirmer. Recontrôler sitemap et GSC avant de créer une URL éditoriale ; le profil public dynamique `/fr/t/<handle>` et la bankroll `/fr/p/<slug>` existent déjà comme pages produit.

**Priorité actualisée le 08/10 :** ce sujet peut devenir le deuxième article de l'Académie après accord du tipster et validation d'une capture publique sans les préférences privées du visiteur. La page produit `/fr/p/<slug>` porte `noindex` dans son metadata et montre les paris d'un tipster ; l'article proposé répond à l'intention distincte « comment vérifier les paris d'un tipster ? ». Le sitemap actuel comprend 34 URL et aucune page éditoriale tipster. GSC Wizard refuse l'accès (`payment_required`) : les requêtes récentes sont **non disponibles**, pas présumées absentes.

**Intention visée :** « comment vérifier les paris publiés par un tipster ? ». Volume et difficulté : **à vérifier auprès de Jeremy**. La destination éditoriale exacte reste à décider après recherche de doublon. Ne pas cibler une requête générique « meilleur tipster » au DR actuel.

**Preuve à insérer :** [dossier de collecte](preuve-tipster-certification.md). Prévoir une capture datée de la zone « Certification Kalivoa » et, si possible, du journal de preuve d'un pari. La capture doit être prise hors session ou cadrée pour exclure les paramètres privés de conversion du visiteur ; masquer les références de tickets et les données personnelles. Montrer le statut actuel « En observation », jamais « bankroll certifiée ».

**Balisage prévu uniquement après publication :** `Article` ou `WebPage` selon le format final, `BreadcrumbList` si un fil d'Ariane est visible. Pas de `FAQPage` si aucune FAQ réelle n'apparaît. Les dates et les valeurs chiffrées viendront exclusivement de la page publique vérifiée.

---

# Comment consulter les paris publiés par un tipster sur Kalivoa ?

Une bankroll publique permet de consulter l'historique et les indicateurs que son propriétaire choisit de partager. Kalivoa affiche aussi un niveau de preuve des paris publiés. Il faut lire ce niveau avec le nombre de paris concernés, la période et les mises : il ne prouve ni l'argent détenu chez un bookmaker ni les résultats futurs du tipster.

## Que montre une bankroll publique ?

La page publique rassemble les paris visibles et des indicateurs calculés à partir d'eux, notamment le profit et le ROI lorsque les données le permettent. Pour interpréter ces chiffres, regardez combien de paris sont clôturés, sur quelle période ils ont été enregistrés et si les résultats disposent d'une preuve par capture. Une courte série ne permet pas de juger durablement une performance.

## Comment fonctionne le niveau de preuve ?

La publication démarre le suivi de certification. Un pari antérieur n'est pas certifié rétroactivement simplement parce qu'il apparaît dans l'historique. Le niveau de preuve le plus fort pour un pari clôturé demande une preuve initiale scannée après l'activation et avant l'événement, puis une preuve du résultat par un second scan. Un résultat saisi manuellement a un niveau de preuve inférieur. Le score global résume les niveaux des paris éligibles en tenant compte des mises exprimées en unités.

La règle publiée dans le code de production du 07/10 maintient la bankroll **« En observation » avant 10 paris clôturés éligibles depuis l'activation du suivi**. Les anciens paris visibles dans l'historique ne deviennent pas certifiés rétroactivement. Ce libellé décrit la quantité de preuves éligibles, pas la rentabilité ni la fiabilité personnelle du tipster.

## Exemple réel observé le 8 octobre 2026, à publier seulement après accord

La [bankroll publique d'EGS Betting](https://kalivoa.com/fr/p/Gi4RdWxXhbHFOIJL?view=all) affichait **26 paris** au total, dont **25 résultats** et **1 pari en cours**. Son bloc « Certification Kalivoa » affichait **10/100**, le niveau **« En observation »**, **0 % de paris avec preuve complète** et **2,5 unités de volume suivi**. Un pari du 8 octobre portait le statut « Preuve reçue » et un pari clôturé du 4 octobre « Preuve limitée ». Ces données sont un instantané : elles peuvent évoluer avec les nouveaux paris et corrections.

Cet exemple montre concrètement la différence entre un historique public de performances et le niveau de preuve de chaque pari. Les 25 résultats historiques ne signifient pas que 25 paris sont éligibles à la certification après l'activation du suivi. Le score 10/100 ne certifie pas les gains, les fonds détenus chez un bookmaker ou des résultats futurs. **Ne pas publier ces chiffres sans capture datée approuvée par le propriétaire.**

## Trois vérifications utiles avant de suivre un tipster

1. **Ouvrez la bankroll publique elle-même.** Comparez le résumé aux paris visibles, plutôt qu'à une capture isolée publiée ailleurs.
2. **Lisez le statut de preuve de chaque pari.** Un pari saisi manuellement ou ajouté après coup ne porte pas la même preuve qu'un ticket scanné avant l'événement puis confirmé par un second scan.
3. **Replacez les statistiques dans leur période.** Le profit, le ROI et le score de preuve répondent à des questions différentes. Aucun de ces indicateurs ne garantit les résultats futurs.

Pour comprendre le fonctionnement général du suivi, consultez [la page de suivi de bankroll](https://kalivoa.com/fr/bankroll-tracking). Si le suivi d'un tipster pousse à augmenter vos mises ou devient difficile à contrôler, consultez les ressources de [jeu responsable](https://kalivoa.com/fr/responsible-gambling).

## Validation avant publication

- Confirmer que le propriétaire consent à la citation de son profil et à l'utilisation de la capture, y compris si les données sont anonymisées.
- Vérifier en direct son état public, le niveau de preuve et la date ; retirer toute affirmation que l'exemple ne démontre pas.
- Contrôler le cadrage de la capture : un visiteur connecté peut voir sa conversion personnelle des unités, qui ne fait pas partie des données publiques du tipster.
- Vérifier sitemap, GSC, éventuelles pages profil et comparaison d'intention avant de créer une URL dédiée.
- Prévoir un vrai lien interne vers la future page sans modifier à répétition une page encore en observation.
- Inscrire le déploiement et la date de fin d'observation dans le tableau de suivi.
