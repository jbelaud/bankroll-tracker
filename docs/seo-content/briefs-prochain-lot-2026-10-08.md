# Brief du prochain lot Académie — 8 octobre 2026

Statut : deux briefs préparés, aucune nouvelle URL créée, aucun article publié dans cette livraison. Recontrôle sitemap + GSC + contenu avant création obligatoire. Volume et difficulté des formulations exactes : **à vérifier auprès de Jeremy**.

## Priorité 1 — Comment enregistrer un cash out dans son historique de paris ?

### Besoin

Retrouver le montant réellement reçu pour un ticket fermé par cash out, sans le traiter automatiquement comme un gain plein à la cote initiale. L'article ROI exclut explicitement ce cas de son exemple ; la checklist mentionne le statut sans expliquer le traitement détaillé.

### Angle et cible

Formulation cible : « comment enregistrer un cash out dans son historique de paris ? ». Variantes possibles : « cash out et bénéfice net », « quelle somme noter après un cash out ». Ce sont des hypothèses éditoriales, pas des volumes observés.

Slug candidat : /academie/enregistrer-cash-out. Aucune route créée. Page à ne pas transformer en conseil pour décider d'accepter une offre de cash out.

### Preuve attendue

Un ticket original où le cash out est réglé et son montant reçu lisible, puis l'entrée correspondante dans Kalivoa. Relever la date, la mise, le montant reçu, la devise, le statut et le bénéfice affiché. Une capture anonymisée sera montrée à Jeremy pour validation avant publication ; un relevé chiffré autorisé et daté peut remplacer l'image.

Un cas mesuré sur un environnement de démonstration peut également servir de preuve produit s'il est clairement nommé comme test. Les nombres fictifs seuls ne suffisent pas.

### Trame originale

1. Réponse directe : conserver le ticket une seule fois et utiliser le règlement réellement reçu.
2. Distinguer la mise initiale, la cote initiale, l'offre affichée et le montant de cash out accepté et réglé.
3. Exemple réel : retour reçu moins mise en argent réel, avec calcul reproductible.
4. Parcours de vérification dans Kalivoa, relecture obligatoire et contrôle de l'historique.
5. Limites : cash out partiel, freebet, devise ou unités, conventions du bookmaker.
6. Liens vers ROI, relecture et suivi de bankroll.

Ne pas prétendre que tous les profils OCR détectent tous les cash outs. Vérifier le profil et la version produit testés. Le cash out partiel ne doit pas être présenté comme pris en charge sans test précis.

## Priorité 2 — Comment suivre un freebet sans le compter comme une mise en argent réel ?

### Besoin

Distinguer la valeur nominale d'une mise gratuite et l'argent réellement engagé, puis comprendre l'indicateur affiché. La relecture présente la case freebet ; l'article ROI indique qu'une convention doit être définie, sans développer le cas.

### Angle et cible

Formulation cible : « comment suivre un freebet sans le compter comme une mise en argent réel ? ». Variantes possibles : « freebet perdu et profit », « freebet et ROI de mon historique ». Slug candidat : /academie/suivre-freebet. Pas de page créée.

La recherche ponctuelle retrouve déjà des ressources MaBankroll autour du freebet/ROI. Faible concurrence non démontrée : mesurer la difficulté avant d'arbitrer la création.

### Vérification produit obligatoire

Dans la version publiée examinée :
- computeGlobalStats calcule le bénéfice global sur les paris éligibles, y compris les freebets ; les mises engagées du ROI excluent les mises freebet.
- publicPerformance inclut les profits des freebets dans le bénéfice public, avec leur mise exclue du volume réellement risqué.
- groupStats et bucketStats excluent les freebets des répartitions sport/type/tranches.
- Le calcul de performance en unités possède son propre périmètre.

Il serait donc inexact d'écrire simplement « Kalivoa exclut tous les freebets du ROI ». Identifier l'écran, l'indicateur, les filtres et la version avant l'exemple. Ce brief ne décide pas d'un changement produit.

### Preuve attendue

Un freebet réel réglé (gagné ou perdu), ticket original et historique Kalivoa, avec montant nominal, retour payé et statut. Vérifier les règles de l'offre : mise non rendue ou autre convention. Ne pas généraliser la formule d'une offre à tous les bookmakers.

Si le cas ne comporte que des freebets sans mise cash, expliquer précisément l'affichage du ROI quand le dénominateur est nul, sans inventer un pourcentage.

### Trame originale

1. Réponse directe : marquer le freebet et conserver séparément sa valeur nominale et l'argent engagé.
2. Différence entre une mise cash et un freebet ; vérifier si la mise est rendue.
3. Exemple réel gagné ou perdu, calcul et preuve.
4. Lire le bénéfice, les mises engagées et le ROI sur le même périmètre.
5. Comprendre les différences entre global et répartitions.
6. Liens vers ROI, relecture et FAQ.

Aucune recommandation d'offre promotionnelle ou de bookmaker. La page explique le suivi de tickets déjà joués.

## Sujet de réserve — pari remboursé

Question : « comment enregistrer un pari remboursé dans ses statistiques ? ». L'état remboursé est déjà mentionné dans la checklist et le combiné. Un article n'est justifié que s'il apporte un exemple de remboursement réel et distingue retour de mise, annulation de sélection, remboursement partiel et crédit en freebet. Ne pas créer en même temps quatre pages qui décrivent le même règlement.

## Conditions communes de livraison

- Valider le besoin, la concurrence et le contrôle de couverture final.
- Au moins une preuve vécue, datée et vérifiée ; aucune référence privée publiée.
- FR d'abord, EN ensuite ; Article + BreadcrumbList, canonical/hreflang, carte du hub livrée avec le lot.
- Regrouper les deux cartes dans une livraison pour le hub.
- Une date de publication et une fenêtre d'observation de 90 jours par page.
- Objectif : expliquer correctement un cas de suivi ; impressions/indexation seront mesurées, sans promesse de classement.
