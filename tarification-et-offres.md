# BetTrack — tarification et offres de lancement

Document de référence pour le lancement de BetTrack. Les limites techniques seront implémentées une fois l'application terminée et les coûts réels mesurés dans l'administration.

## Principes

- L'utilisateur doit pouvoir tester réellement BetTrack avant de payer.
- Les limitations portent sur les scans IA, jamais sur la saisie manuelle.
- Les quotas sont mensuels, car l'import de tickets se fait souvent en lots.
- Les gros imports bénéficient d'un crédit initial à l'abonnement.
- Les packs de scans additionnels sont prévus pour la V2 seulement.

## Phase bêta

### Accès bêta gratuit

- Inscription gratuite avec adresse e-mail vérifiée.
- 10 scans IA par mois pendant la bêta.
- Saisie manuelle illimitée.
- Fonctionnalités cœur accessibles : bankrolls, historique, statistiques et correction des paris extraits.
- Objectif : obtenir des retours sur le scan, la fiabilité des données et l'expérience utilisateur avant toute commercialisation.

### Protection des coûts

- Limite horaire par compte.
- Validation des captures avant l'appel IA.
- Les scans invalides, sans pari détecté ou en erreur ne consomment pas le quota mensuel.
- Suivi réel des tokens et coûts dans l'administration.
- À prévoir avant une campagne bêta large : protection anti-multi-comptes et vérification renforcée à l'inscription.

## Offre réservée aux bêta-testeurs

### Premium bêta — 9,99 € / an

- Offre réservée aux utilisateurs ayant participé à la bêta.
- Prix annuel préférentiel de lancement.
- 300 scans d'import initial, disponibles pendant les 30 premiers jours après l'abonnement.
- Puis 100 scans IA par mois.
- Bankrolls illimitées, statistiques complètes et saisie manuelle illimitée.
- Insights IA inclus avec un cooldown pour maîtriser le coût.

### Raison du crédit d'import initial

Un utilisateur qui importe environ 1 000 paris avec trois paris par capture a besoin d'environ 334 screenshots. Le crédit initial lui permet donc de démarrer immédiatement, sans attendre plusieurs mois malgré le quota mensuel.

## Offre publique après la bêta

### Prix de référence proposé — 19,99 € / an

- 300 scans d'import initial, disponibles pendant les 30 premiers jours après l'abonnement.
- Puis 200 scans IA par mois.
- Bankrolls illimitées, statistiques complètes et saisie manuelle illimitée.
- Insights IA inclus avec un cooldown.

Le tarif et les quotas publics seront confirmés après analyse des coûts réels collectés dans l'administration.

## Packs de scans — V2

Les packs ne font pas partie du lancement initial. Ils seront réservés aux abonnés Premium dans une V2 de l'application.

Piste retenue pour la V2 :

- 5 € pour 50 ou 100 scans supplémentaires.
- Crédits utilisables jusqu'à la fin du mois en cours.
- Aucun pack disponible pour les comptes gratuits, afin de préserver l'intérêt de l'abonnement.

## Économie et garde-fous

- Modèle d'extraction : Claude Haiku 4.5.
- Coût estimé d'une capture : environ 0,005 à 0,01 $ dans l'usage normal ; l'administration mesurera le coût réel par scan.
- 100 scans mensuels représentent un plafond annuel raisonnable pour l'offre à 9,99 €.
- 200 scans mensuels représentent le plafond cible de l'offre publique à 19,99 €.
- Les crédits initiaux sont ponctuels : ils facilitent l'import d'historique sans créer un coût mensuel illimité.

Sources : [tarification Claude](https://platform.claude.com/docs/en/about-claude/pricing), [vision Claude](https://platform.claude.com/docs/en/build-with-claude/vision), [tarification Stripe France](https://stripe.com/fr/pricing).

## Évolutions techniques à planifier après la finalisation du produit

1. Ajouter les statuts d'offre nécessaires : `FREE`, `BETA_PREMIUM` et `PREMIUM`.
2. Séparer les compteurs : quota mensuel, crédit d'import initial et éventuels packs V2.
3. Faire attribuer l'offre et les crédits par le webhook Stripe.
4. Afficher les crédits restants, les conditions de l'offre et la date d'expiration du crédit initial dans le compte utilisateur.
5. Ajouter les protections anti-abus avant l'ouverture d'une bêta large.
6. Ajuster les quotas avec les données de coût réelles de l'administration.

## Décision actuelle

La priorité est de terminer et fiabiliser BetTrack pour le proposer rapidement à des parieurs. La logique commerciale détaillée dans ce document sera implémentée après la finalisation des fonctionnalités essentielles et une première phase de test utilisateur.
