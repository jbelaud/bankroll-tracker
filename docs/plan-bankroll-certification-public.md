# Plan — Référence, certification et bankroll publique

## Avancement au 5 septembre 2026

- Réalisé : périodes de référence, instantanés d'unités à la création des paris, affichage historique sur la référence figée, réconciliation explicite des références manquantes, profil personnel par bankroll avec calculateur et alertes configurables.
- Deux migrations additives appliquées sur Neon Preview après export local privé des bankrolls, paris et mouvements. Aucun changement sur Supabase Production.
- Le lanceur `scripts/preview-prisma.mjs` exige la branche Preview et l'hôte Neon précis ; le fichier `.env` ordinaire pointe toujours vers Supabase et ne doit jamais servir à une migration directe.
- Restent à réaliser : collecte et conservation des preuves, certification, journal des corrections, publication publique, tests de bout en bout de ces parcours. Les profils multiples indépendants d'une bankroll et les modes prédéfinis restent également à réaliser.
- Réconciliation : les anciens paris sans référence enregistrée n'ont pas reçu de valeur inventée. Ils demandent une déclaration explicite par période depuis le détail de la bankroll.

## Périmètre impératif

- Branche autorisée : `codex/bankroll-v2-preview`.
- Base autorisée : Neon Preview uniquement.
- Interdiction de pousser, fusionner ou déployer sur `master` ou en production.
- Aucune écriture dans Supabase Production.
- Avant toute migration ou tout déploiement, vérifier la branche et la destination réelle sans afficher les secrets.
- Une branche Preview ne garantit pas à elle seule que la connexion de base de données pointe vers Neon.

## 1. Référence et conservation des unités

Conserver séparément le capital actuel, le montant de référence privé et la taille d'une unité. Le capital actuel ne modifie jamais automatiquement la référence.

Pour la publication du tipster, conserver la convention 1u = 1 % du montant de référence. Pour le lecteur, permettre une taille d'unité personnelle configurable : avec une unité personnelle de 0,5 %, 2u représentent 1 % de sa référence. Ne jamais afficher 1u = 1 % comme une équivalence universelle lorsque ce réglage diffère.

Enregistrer les périodes de référence et figer, pour chaque pari, la référence appliquée et la mise en unités. Le résultat en unités utilise la même référence que la mise, même si le résultat arrive après un changement de réglage.

Pour un import historique, choisir la période applicable à la date du pari et demander une correction explicite si elle est inconnue. La date d'importation seule ne permet pas de reconstituer un ancien montant de référence.

Critères de validation :

- Un pari de 10 € enregistré avec une référence de 1 000 € reste à 1u après passage à 1 250 €.
- Un nouveau pari de 12,50 € avec la nouvelle référence vaut 1u.
- Les gains, pertes et statistiques historiques conservent ces valeurs.
- Une modification de référence ne réécrit pas les anciens paris.

## 2. Conversion personnelle et alertes

Permettre de configurer la référence privée, la taille d'unité, les seuils de notification et l'arrondi. Prévoir plusieurs profils si nécessaire, sans les imposer au premier usage.

La conversion affichée est un montant calculé selon les réglages personnels. Afficher le montant avant et après arrondi ; privilégier un arrondi inférieur pour ne pas dépasser la mise calculée.

Les alertes nécessitent une bankroll personnelle effectivement liée et des données suffisantes. Ne pas déduire le solde personnel des seuls paris publiés par un tipster. Distinguer capital total et argent disponible, ainsi que résultats et dépôts/retraits.

Présenter les écarts de référence comme des notifications configurables. Toute modification exige une action de l'utilisateur. Ne pas qualifier une augmentation de mise de nécessaire ou de garantie de prudence. Les éventuels modes prédéfinis restent des raccourcis de réglage transparents.

## 3. Collecte des preuves

Conserver l'origine du pari, les preuves reçues, leur horodatage serveur et les informations extraites. Les fichiers restent privés et les montants en euros ne figurent jamais dans les réponses publiques.

Utiliser l'heure de réception par Kalivoa pour déterminer si une preuve a été reçue avant l'événement. Ne pas se fier à la date du fichier. En cas d'heure de début inconnue ou incertaine, ne pas attribuer automatiquement le niveau fort. Pour un combiné, considérer le début de la première sélection.

Rattacher le scan résultat au ticket initial par identifiant bookmaker lorsque disponible, puis par cohérence des informations. Un rapprochement ambigu demande validation. Détecter les preuves et tickets réutilisés sans révéler les données d'autres utilisateurs.

Une capture permet d'évaluer un niveau de preuve ; elle ne garantit ni son authenticité absolue ni l'exhaustivité des paris du tipster.

## 4. États de certification et corrections

| Preuve initiale | Résultat | Niveau cible |
| --- | --- | --- |
| Scan reçu avant événement | Scan cohérent du résultat | Forte |
| Scan reçu avant événement | Résultat manuel | Partielle |
| Ajout manuel | Scan cohérent du résultat | Faible |
| Scan après résultat uniquement | Résultat visible | Limitée |
| Ajout manuel | Résultat manuel | Non certifié |

Un pari en cours avec preuve initiale reste « preuve avant événement reçue, résultat en attente ». Séparer les états en attente, incohérents et rejetés des niveaux définitifs.

Verrouiller les informations déterminantes après validation. Une correction conserve l'ancienne valeur, la nouvelle, sa date et sa justification ; elle déclenche une réévaluation. Conserver une trace d'un pari retiré de la publication afin qu'une suppression de perdant ne nettoie pas silencieusement l'historique ou le score.

Prévoir explicitement les remboursements, résultats partiels, cash-outs, combinés, reports et événements déjà commencés. Les cas non pris en charge restent signalés plutôt que certifiés automatiquement.

## 5. Score transparent

Calculer le score sur le volume de mises en unités figées, avec des règles versionnées et explicables. Publier séparément les volumes en attente et clôturés ; l'absence de résultat d'un pari encore en cours ne doit pas être confondue avec une preuve manquante sur un pari terminé.

Les coefficients proposés (100/70/40/20/0) et les niveaux Gold/Silver/Bronze sont des hypothèses à tester, pas des règles déjà validées. Définir leur seuil minimal de volume et de nombre de paris avant activation. Ne pas plafonner discrètement le poids d'un pari : cela changerait la promesse de pondération par volume.

Afficher distinctement le pourcentage de paris complets, le pourcentage de volume complet et le score pondéré. Un historique importé ou un pari supprimé ne doit pas disparaître opportunément du périmètre de calcul.

Positionnement : « Kalivoa rend visible le niveau de preuve derrière chaque pari. »

## 6. Migration et vérification privée

Avant migration Neon, inventorier les données et prévoir un point de restauration. Ajouter les nouveaux champs de façon compatible avec les données actuelles. Ne supprimer ni pari ni historique existant.

Ne pas inventer une ancienne référence ou une preuve avant événement. Les références manquantes nécessitent une réconciliation explicite ; les preuves insuffisantes restent identifiées comme telles.

Créer l'interface privée de suivi des preuves : niveaux, pièces manquantes, résultats à rapprocher, corrections et décomposition du score.

Tester les calculs d'unités et résultats, les changements de référence, les imports historiques, les doublons, le verrouillage et les autorisations avec des jeux de données Preview.

## 7. Bankroll publique

Créer une identité publique du propriétaire distincte des tipsters qu'il suit. Une identité pourra publier plusieurs bankrolls avec des liens séparés.

Toute bankroll existante reste privée par défaut. Prévoir publication explicite, prévisualisation, lien partageable et dépublication. Une visibilité par lien n'est pas une protection d'accès : toute personne possédant ce lien peut consulter la page.

La page affiche le profil, les paris en cours et clôturés, leurs preuves, les corrections, le volume et les statistiques en unités. Les cotes restent décimales.

Le suivi public démarre sur une base de performance de 100u et évolue par les résultats en unités. Exclure les dépôts et retraits de cette courbe. Présenter cette base comme un suivi normalisé, car elle ne représente pas nécessairement le capital privé actuel. Définir le ROI à partir des profits et mises en unités, et le drawdown à partir de la même courbe.

Les lectures publiques utilisent uniquement des champs explicitement autorisés. Ne transmettre ni euros, ni références privées, ni allocations financières, ni e-mails, ni fichiers de preuve originaux, y compris dans les données invisibles de la page ou les métadonnées sociales.

## 8. Livraison progressive

1. Fiabilisation et historique des unités.
2. Conversion personnelle et alertes configurables.
3. Preuves avant/après événement et rapprochement.
4. Verrouillage et journal des corrections.
5. Score et interface privée de certification.
6. Migration et validation des données Neon.
7. Profil et bankroll publique.
8. Vérification déconnectée, permissions, confidentialité et partage social.
9. Déploiement uniquement sur la Preview et recette utilisateur.

Chaque lot doit être vérifiable indépendamment. La livraison en production est exclue de ce plan et exige une nouvelle instruction explicite.
