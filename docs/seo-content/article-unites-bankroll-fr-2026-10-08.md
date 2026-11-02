# Pourquoi une bankroll publique affiche-t-elle les mises en unités ?

**Statut : texte original rédigé, non publié.** Candidat `/fr/academie/comprendre-unites-bankroll`. Vérifier la profondeur de couverture des pages produit et de l’article tipster avant de créer cette URL. Le sitemap du 08/10 ne comporte pas d’article dédié ; GSC ne donne aucune requête visible. Volume et difficulté : à vérifier auprès de Jeremy. Le cas public EGS est autorisé ; confirmer le vocabulaire et les règles de conversion sur la version produit qui sera publiée avec l’article. Date de publication à fixer.

Rédaction Kalivoa

Note de suivi : intégré en FR/EN dans le lot Académie du 08/10. La formule produit est vérifiée dans `bankroll-units.ts` : 1 u = 1 % du montant de référence. État de publication dans `docs/seo-gsc/2026-10-08/publication-lot-academie-2026-10-08.md`.

Une unité, notée « u », exprime une mise par rapport à une référence définie par le parieur. Elle permet de lire la taille des mises sans publier directement leur montant en euros. **Une mise de 1 u n’est pas un montant universel** : sa conversion dépend de la référence utilisée. Elle ne prouve ni le capital disponible sur un compte bookmaker ni la fiabilité d’un pronostic.

## Pourquoi afficher 1 u au lieu d’un montant en euros ?

Deux personnes peuvent engager des montants différents tout en décrivant leur mise comme une unité. Le chiffre public donne alors une échelle relative pour lire l’historique. Sans connaître la règle de conversion, il ne permet pas de retrouver les montants réellement engagés par l’auteur.

Pour le lecteur, les unités aident à comparer les mises d’un même historique. Une mise de 2 u représente deux fois une mise de 1 u lorsque les deux lignes utilisent la même référence. Cela ne signifie pas que le deuxième pari a deux fois plus de chances de gagner.

## Comment expliquer une conversion ?

La conversion s’écrit : **mise en unités = mise en devise ÷ valeur d’une unité dans cette devise**. Il faut connaître les deux montants et appliquer la même convention.

Illustration pédagogique, sans ticket réel associé : si la valeur d’une unité est fixée à 20 €, une mise de 30 € correspond à 1,5 u. Ce calcul explique le fonctionnement d’une échelle ; il n’est ni une recommandation de mise ni une observation de la bankroll d’EGS Betting.

Un outil peut utiliser une référence pour figer les unités à l’enregistrement, puis une autre pour afficher un équivalent privé au lecteur. Ces deux opérations doivent être distinguées : l’équivalent personnel affiché à un visiteur ne révèle pas le montant réel du ticket de l’auteur. Dans Kalivoa, vérifiez les réglages et les unités proposés avant de valider un import.

## Un cas réel sur une bankroll publique

Le 8 octobre 2026, la bankroll publique d’EGS Betting présentait 26 paris visibles, dont 25 réglés et un en attente. Son panneau de certification indiquait un volume suivi de 2,5 u et un statut « En observation », avec un score de 10/100. Ces valeurs ont été relevées sur la page publique avec l’accord du tipster.

| Donnée publique relevée | Ce qu’elle permet de lire |
|---|---|
| 26 paris visibles | Le nombre de lignes de cet historique au moment du relevé |
| 25 réglés, 1 en attente | La répartition des statuts à cette date |
| Volume suivi pour la certification : 2,5 u | Le volume du périmètre suivi affiché dans le panneau, pas la somme supposée de tous les tickets historiques |
| Statut « En observation » | Le niveau de suivi indiqué à cette date, sans le présenter comme une certification acquise |

Le nombre total de paris et le volume suivi pour la certification portent sur des périmètres différents. Un historique importé et la partie suivie depuis l’activation de la certification ne doivent pas être confondus. Il serait incorrect de diviser 2,5 u par 26 pour prétendre calculer la mise moyenne de la bankroll complète.

Source : [bankroll publique d’EGS Betting](https://kalivoa.com/fr/p/Gi4RdWxXhbHFOIJL?view=all), relevée le 8 octobre 2026. Les valeurs de cette page peuvent évoluer ; cet article conserve la date du relevé.

## Que faut-il vérifier avant de comparer deux historiques en unités ?

Commencez par la période et les paris inclus. Vérifiez que l’auteur explique sa convention, que les mises et résultats sont visibles et que les variations de référence n’ont pas rendu la série difficile à interpréter. Ne comparez pas un volume de certification avec l’ensemble des mises d’une autre bankroll.

Regardez ensuite les preuves associées aux tickets. Un historique en unités peut être lisible sans disposer de toutes les preuves nécessaires. Le format d’une mise et le statut de preuve répondent à deux questions différentes : comment le montant est exprimé, et ce qui permet de contrôler le pari.

## Les unités ne suppriment pas le risque

Exprimer une perte en « u » ne la rend pas virtuelle. Une mise représente toujours une somme exposée selon la conversion applicable. Le suivi en unités ne garantit pas les gains futurs et ne justifie pas de reproduire la mise d’un tipster. Fixez vos limites personnelles et utilisez les ressources de jeu responsable en cas de difficulté.

## Pour poursuivre

- [Vérifier les paris publiés par un tipster](/fr/academie/verifier-paris-tipster)
- [Suivre sa bankroll](/fr/bankroll-tracking)
- [Questions fréquentes](/fr/faq)
- [Jeu responsable](/fr/responsible-gambling)

**Balisage prévu :** Article + BreadcrumbList, avec citation de la page publique. Aucune capture de conversion personnelle, de capital privé ou d’identifiant de ticket ne sera publiée dans cette version.
