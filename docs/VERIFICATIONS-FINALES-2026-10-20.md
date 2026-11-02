# Vérifications finales — 20 octobre 2026

Les derniers contrôles techniques passent. La bêta reste active et les ventes restent fermées. Aucun changement applicatif ni déploiement supplémentaire n'a été nécessaire.

## Résultats

- **129 tests réussis dans 16 fichiers**, exécutés sur les sources de la version isolée publiée : tarification, offre de bienvenue, confirmation de commande, protections de lancement, TVA, crédits de scans, rétractation, factures, notifications et tâche quotidienne.
- Dont **16 tests d'intégration avec PostgreSQL temporaire sur cet ordinateur**, avec prestataires simulés : archivage du contrat et de la facture, remboursement sans doublon, contrôle des correspondances client/facture, rappel annuel daté et dédupliqué au tarif standard, protection des archives, livraison des notifications et conservation des données. Aucune connexion à la base de production par ces tests.
- **10 contrôles HTTP commerciaux réussis** sur kalivoa.com : tarifs, offre de bienvenue, confidentialité, CGV préparatoires, protection de l'abonnement et du cron, rejet des signatures invalides et acceptation de sondes signées sans opération métier pour Stripe et Resend.
- **10 contrôles HTTP de présentation réussis** : accueil, certification, FAQ et tarifs FR/EN, sitemap et llms.txt.
- **Configuration Stripe live vérifiée en lecture seule** sur le compte Kalivoa attendu : prix 4,99 €/mois et 49,99 €/an, TVA incluse et immatriculation française active, remises initiales, identification TVA sur facture, portail et résiliation à fin de période, webhook actif.

Les tests automatisés utilisent des services simulés pour les scénarios de paiement et d'email. Les sondes HTTP signées sont générées localement et ne constituent pas une nouvelle preuve de livraison par les prestataires. La livraison réelle Resend vers un simulateur avait été vérifiée le 19 octobre ; aucun nouveau paiement ni email n'a été créé dans cette session. La vérification du catalogue du bac à sable n'a pas été relancée : la variable locale STRIPE_SECRET_KEY ne contient plus une clé de test ; aucune clé live n'a été utilisée à sa place.

Le premier lancement local des tests a été interrompu par des restrictions Windows sur les fichiers temporaires ; la relance autorisée s'est achevée avec 129 tests réussis. La première requête Stripe a également nécessité l'accès réseau autorisé ; le contrôle complet suivant a réussi.

## Informations et décisions

Le propriétaire confirme que les informations fiscales Google sont complétées. Ce point est clos sur sa déclaration, sans nouvelle saisie ni soumission par l'agent.

Restent pour l'ouverture payante : décision de fin de bêta, revalidation de l'échéance de l'offre de bienvenue actuellement au 31 décembre 2026, résolution du point d'hébergement déjà signalé, publication des CGV applicables et activation commerciale suivie d'un contrôle de lancement. Le choix actuel de conserver Vercel Hobby est respecté. La conservation séparée de la clé de récupération des sauvegardes reste une action personnelle du propriétaire.

## Preuves

- `audit-commercial/final-unit-2026-10-20.json`
- `audit-commercial/commercial-public-http-2026-10-20.json`
- `audit-commercial/stripe-live-readonly-2026-10-20.json`
- `audit-certification/public-2026-10-20.json`

Version publique contrôlée : `dpl_4fBeHKfb9XcM9Y3MBCWPCFH1QAuP`.
