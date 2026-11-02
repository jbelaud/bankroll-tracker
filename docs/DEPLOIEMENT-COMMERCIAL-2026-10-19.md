# Kalivoa — préparation commerciale publiée le 19 octobre 2026

**Dernière mise à jour du jour :** finalisation des documents et corrections de conservation publiées sous `dpl_E22fk2eksSAD7reL5Hqv5NeGsRXu`, CGV `2026-10-19.2-draft`, confidentialité `2026-10-19.1`. Sauvegarde désormais étendue à Auth/Storage et externalisée dans Drive, automatisation locale quotidienne active. L'IBAN et la correction de la convention sont confirmés. Le forfait Vercel Hobby doit être régularisé et la date de fin de bêta décidée avant ouverture. Voir [la synthèse actuelle](FINALISATION-COMMERCIALE-2026-10-19.md). Les descriptions suivantes conservent l'historique des opérations précédentes.

**Mise à jour ultérieure du même jour :** le numéro public confirmé par le propriétaire est publié dans Contact, les mentions légales et les CGV préparatoires. Déploiement actuel : `dpl_EQrqVmFTCdB1JAcUpKrHtUYKUtka` ; CGV `2026-10-19.1-draft`. Les ventes restent fermées. Voir [la publication des coordonnées et ses contrôles](CONTACT-PUBLIC-2026-10-19.md). Le détail ci-dessous décrit la publication commerciale précédente, conservée comme point de retour.

La version commerciale est publiée sur https://kalivoa.com. **La bêta reste active et les achats restent fermés.** Aucun abonnement, contrat, facture ou paiement réel n'a été créé pendant ces opérations.

## Sauvegarde et base

- Sauvegarde chiffrée AES-256-GCM des 36 tables du schéma applicatif `public`, structure, données, RLS et droits inclus dans l'archive PostgreSQL.
- Restauration réelle dans PostgreSQL local, accessible uniquement sur `127.0.0.1`, puis comparaison des 12 524 lignes. Les flottants sont comparés par leur représentation binaire exacte, indépendamment du rendu JSON entre PostgreSQL 17 et 18. Aucune différence restante.
- Les trois migrations ont d'abord été exécutées sur cette restauration, puis appliquées à Supabase `umyxyahkifdezohaotel` : éligibilité de bienvenue, archives commerciales, restriction des tables réservées au serveur. Les historiques Supabase et Prisma sont renseignés.
- Une migration de droits supplémentaire retire tout accès `anon` / `authenticated` aux quatre nouvelles archives ; RLS reste activé. Les contrôles de droits le confirment.
- Contrôle après publication : 46 profils, 5 044 paris, bêta `ACTIVE`, aucune éligibilité bêta perdue ; zéro contrat et zéro facture.

L'archive, la clé de récupération et les diagnostics privés sont conservés dans `.vercel/production-backups`, ignoré par Git. Les fichiers temporaires non chiffrés et la base locale de restauration sont supprimés. **Cette sauvegarde porte sur l'application : elle ne contient pas le schéma Auth ni les fichiers Storage.** Aucun objet Storage n'était présent au contrôle préalable. Ce n'est pas une sauvegarde hors site ou une politique de sauvegarde automatique. [Documentation Supabase sur la portée des sauvegardes](https://supabase.com/docs/guides/platform/backups).

## Version publiée

- Base : commit de production `4d50b35577fcf5f2ee506b8697e9729a9ba70093`.
- 88 fichiers commerciaux sélectionnés, fusionnés dans un dossier isolé ; changements de scan et de profil public sans lien avec la commercialisation exclus. Traductions commerciales sélectionnées par clés. Le dossier de travail en cours n'a pas été déployé en bloc.
- Compilation avec la configuration de production, sans affectation initiale des domaines ; vérification protégée, puis promotion du même build.
- Déploiement : `dpl_HrXxVcRcvqLDZaBL2WmByboWRP7k`, https://bankroll-tracker-knwfhp6s6-ets-belaud.vercel.app.
- Déploiement précédent conservé : `dpl_GZ96BGszWHB5A69GqaYQnv3E8CB3`. Un retour applicatif à cette version n'exige pas de retirer les colonnes et tables ajoutées. Une restauration de données en production reste une opération séparée, qui ne doit pas être déclenchée automatiquement.
- Aucun commit ni push des autres travaux en cours.

Les pages de tarification, accueil, offre de bienvenue, confidentialité, rétractation et documents commerciaux préparés sont publiées. Les CGV restent explicitement préparatoires (`2026-10-15.1-draft`) jusqu'à finalisation des informations du propriétaire.

## Stripe et emails

- Catalogue live, remises, TVA incluse, support, pied de facture et portail vérifiés à nouveau.
- Webhook Stripe `we_1USMJARZcB561pgVbZgDdq1f` actif, URL directe `/api/stripe/webhook`, API `2026-08-26.dahlia`, sept événements.
- Webhook Resend `26a85a47-7b8b-4493-8ad3-f2a069621a1f` actif, URL directe `/api/resend/webhook`, événements de livraison et d'échec. Le relais temporaire de recette reste désactivé.
- Expéditeur : `Kalivoa <notifications@kalivoa.com>` ; réponses vers `contact.kalivoa@gmail.com`. Domaine vérifié. Clé et secret enregistrés uniquement en production Vercel, sans affichage dans les rapports.
- Un seul email technique envoyé à `delivered@resend.dev`, le simulateur Resend : réception du vrai événement fournisseur signé sur kalivoa.com et passage à `DELIVERED` dans Supabase confirmés. Aucun destinataire client ou humain. Une ligne `TECHNICAL_DELIVERY_PROBE`, rattachée à un marqueur système sans compte utilisateur, est conservée comme preuve opérationnelle.

Les sondes Stripe signées sont générées localement et ignorées par le traitement métier : elles vérifient le raccordement et le secret sans créer de transaction. **Elles ne constituent pas un paiement live de bout en bout ni une livraison d'événement de paiement émis par Stripe.** Les quatre achats/remboursements restent ceux validés dans le bac à sable lors de la recette précédente.

## Contrôles

- 72 tests passent dans les six suites commerciales exécutées sur le code destiné au déploiement, dont rappels annuels, non-réutilisation des remises, rétractation, relances et signatures.
- Compilation Next.js et vérification TypeScript Vercel réussies.
- ESLint ciblé réussi sur sept fichiers de facturation, notifications et présentation des tarifs. La dépendance locale manquante observée dans le dossier principal ne bloque pas cette installation isolée.
- Dix contrôles HTTP réussis sur la version protégée, puis dix sur kalivoa.com : pages, accès privé, tâche planifiée sans autorisation, signatures invalides refusées et sondes signées acceptées.
- Vérification navigateur de l'offre publique : montants, échéance, conditions et indication de bêta toujours active présents ; le refus de mesure d'audience facultative fonctionne.

Le conseiller Supabase ne remonte pas de nouvelle erreur de sécurité. Les 40 informations « RLS sans politique » correspondent aux tables accessibles seulement par les connexions serveur. L'avertissement antérieur « protection contre les mots de passe compromis désactivée » reste présent ; aucun réglage d'authentification n'a été modifié. [Explication et remédiation Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Ouverture restant à décider

Les paramètres suivants restent `false` en production : `BILLING_LEGAL_READY`, `BILLING_RECIPE_ENABLED`, `COMMERCIAL_RECORDS_ENABLED`, `ACCOUNT_RETENTION_DELETION_ENABLED`.

Les tâches de rappels annuels et de suivi commercial sont publiées, mais leur exécution métier attend l'activation commerciale. La suppression automatique des comptes reste désactivée séparément.

Après réception des éléments du propriétaire : finaliser les coordonnées et la convention de médiation corrigée, publier une nouvelle version définitive et immuable des CGV, puis décider de la date de clôture de la bêta. L'activation des archives commerciales et des ventes se fera à ce moment-là, après le dernier contrôle. Le propriétaire vérifie l'IBAN de versement ; aucun réglage bancaire n'a été modifié.

## Preuves

- [Restauration et répétition des migrations](audit-commercial/production-backup-restore-2026-10-19.json)
- [Fichiers et empreintes de la version](audit-commercial/commercial-release-source-2026-10-19.json)
- [Contrôles HTTP publics](audit-commercial/commercial-public-http-2026-10-19.json)
- [Livraison Resend réelle vers simulateur](audit-commercial/production-email-delivery-2026-10-19.json)
- [Catalogue et configuration Stripe](audit-commercial/stripe-live-configuration-2026-10-19.json)
- [Offre publique capturée](audit-commercial/commercial-public-welcome-2026-10-19.jpg)
