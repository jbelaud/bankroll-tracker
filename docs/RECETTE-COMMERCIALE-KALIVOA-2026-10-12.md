# Kalivoa — recette commerciale hébergée du 12 octobre 2026

La preview est déployée : https://kalivoa-commercial-recette-ets-belaud.vercel.app/fr/offre-bienvenue. Elle conserve l’authentification Vercel et affiche un bandeau de test. L’accès de session expire après 23 heures. Déploiement validé : `dpl_Ck7g1chaMZprBQZXjBMxxJyxRMMX`, région serveur `fra1`. Aucun lancement de production ni paiement réel.

## Isolation

L’accord explicite « oui tu as mon accord » autorise la création effectuée aujourd’hui : base vide `kalivoa_commercial_recipe_20261012_fee6a6f04f` et rôle limité `kalivoa_recipe_20261012_fee6a6f04f` sur le Neon existant. Aucun nouveau serveur/projet ni copie de lignes clients. Structure issue de Supabase, puis les trois migrations préparées. Le rôle n’est pas superutilisateur, ne peut pas créer de base/rôle et ne peut pas lire les utilisateurs de l’ancienne base preview. Les secrets restent dans `.vercel/commercial-preview`, ignoré par Git, et dans les variables de ce seul déploiement.

La bêta est clôturée seulement en recette ; elle reste active en production. Suppression automatique désactivée. Clés IA, Discord et service Supabase neutralisées sur cette preview. Paiements limités au bac à sable Kalivoa. Tous les emails transactionnels vont à `delivered@resend.dev`, jamais à une boîte cliente. Les variables partagées de Vercel et le domaine de production ne sont pas modifiés.

## Résultats

| Offre | Paiement fictif TTC | TVA incluse | Remboursement confirmé |
| --- | ---: | ---: | ---: |
| Mensuelle normale | 4,99 € | 0,83 € | 4,99 € |
| Annuelle normale | 49,99 € | 8,33 € | 49,99 € |
| Mensuelle bienvenue | 2,99 € | 0,50 € | 2,99 € |
| Annuelle bienvenue | 24,99 € | 4,17 € | 24,99 € |

Les quatre cas traversent Stripe, le relais officiel signé, Vercel et la base de recette. Contrôles réussis : activation du forfait, un seul bonus permanent de 300 scans nécessitant le forfait payant, CGV immuables, facture PDF privée, confirmation via Resend avec CGV jointes, résiliation en fin de période sans perte anticipée d’accès, retour au gratuit à la clôture, conservation du bonus, absence de doublon, avoir reprenant la TVA et remboursement Stripe `succeeded`. Les quatre abonnements fictifs sont clôturés et remboursés.

Le relais utilise l’accès temporaire authentifié ; la preview n’est pas rendue publique. L’ouverture d’un alias sans expiration native a été refusée par la validation automatique. La solution authentifiée a ensuite permis de terminer les essais Stripe. Ce raccordement n’est pas présenté comme une livraison directe vers un webhook public de production.

Une carte attachable puis refusée (`tok_chargeCustomerFail`, [documentation officielle](https://docs.stripe.com/testing)) déclenche bien `invoice.payment_failed` : compte gratuit, aucun bonus, contrat payé ou confirmation accordés. L’abonnement incomplet fictif est clôturé.

Neuf contrôles HTTP réussissent : signatures Stripe/Resend invalides refusées ; tâche commerciale sans secret refusée ; pages offre, tarifs, confidentialité et rétractation disponibles pour la session ; compte privé redirigé vers la connexion. L’accès sans autorisation reste protégé par Vercel. Les 32 tests locaux des garde-fous et handlers passent ; ESLint des deux fichiers modifiés passe. La compilation complète Vercel réussit.

Le contrôle annuel vérifie l’absence de rappel prématuré à l’achat. Le rappel à 45 jours et le tarif de renouvellement après promotion restent couverts par les tests applicatifs antérieurs ; ils ne sont pas présentés comme une échéance annuelle réellement atteinte sur cette preview aujourd’hui.

Resend confirme par son tableau de bord et par le connecteur `Delivered` pour les confirmations annuelles de bienvenue à 24,99 € et mensuelles normales à 4,99 €, expéditeur `Kalivoa <notifications@kalivoa.com>`, réponse vers `contact.kalivoa@gmail.com`, CGV jointes. Ce sont des emails simulés. Aucun nouvel email n’est envoyé à la boîte de support. Le callback fournisseur est ensuite testé de bout en bout avec un relais Cloudflare limité à 45 minutes, autorisé explicitement après explication du transit des métadonnées. Notifications originales signées, destinataires simulateurs uniquement, protection Vercel maintenue. Livraison : `DELIVERED` ; rebond : `NEEDS_REVIEW` / `EMAIL_BOUNCED`. Le marqueur d’inactivité est posé seulement après livraison et reste inchangé lors du rejeu du callback. Le relais est arrêté et le webhook temporaire Resend est désactivé ; l’utilitaire téléchargé est retiré. Les emails émis avant ce raccordement restent `SENT` dans l’application : aucun statut n’est fabriqué rétroactivement.

## Vérification navigateur

Les tests dans le navigateur utilisent une carte Stripe fictive et une adresse de facturation fictive à Paris. Aucun paiement réel. Les deux contrats sont archivés, TVA incluse de 4,17 € et 0,83 € annulée par les avoirs. Les sept profils de recette sont gratuits, six contrats fictifs clôturés et aucun pari présent avant les deux profils de notification supplémentaires. Un bref décalage entre forfait et compteur au retour Checkout a été constaté puis corrigé. Le retour comporte l’identifiant Checkout ; le serveur vérifie le propriétaire et le paiement en lecture seule. L’écran attend la confirmation signée et s’actualise toutes les deux secondes, au plus pendant 30 secondes, puis propose une actualisation manuelle sans repayer. Un troisième paiement navigateur fictif de 4,99 € vérifie une attente prolongée, puis une simulation courte vérifie le passage automatique à Premium après le callback officiel. La confirmation email de ce dernier contrat est `DELIVERED` par le callback réel Resend. Le troisième contrat est ensuite rétracté et remboursé intégralement : tous les neuf profils de recette sont gratuits, aucun abonnement fictif actif, sept contrats archivés et aucun pari. Les droits restent attribués par webhook signé. Les 31 tests ciblés du retour et de Checkout passent ; ESLint ciblé et nouvelle compilation complète Vercel réussissent. Six contrôles HTTP finaux passent sur ce déploiement.

## Suite

- Les deux retours Supabase `/auth/callback` et `/auth/callback?next=%2Ffr%2Fdashboard` sont enregistrés après la confirmation explicite du propriétaire ; la liste passe de 6 à 8 adresses. L’adresse principale reste `https://kalivoa.com`. La première tentative Google revient en production avec `bad_oauth_state` / « OAuth state has expired ». Une session neuve est relancée depuis la preview : le journal serveur du 12 octobre à 16:46 UTC confirme l’origine de recette et `/auth/callback`. Cette session préparée expire également : le délai par défaut Supabase est de 300 secondes. Le propriétaire initie ensuite lui-même une connexion neuve depuis la page de login ; le retour connecté sur `/fr/dashboard` de la preview est vérifié.
- En production, configurer un webhook Resend direct vers `https://kalivoa.com/api/resend/webhook`, son secret serveur, puis activer la connexion seulement après publication du handler. Le webhook de recette reste désactivé. Le relais temporaire n’est pas une infrastructure de production.
- Achat navigateur annuel de bienvenue validé, portail avec résiliation en fin de période validé, rétractation téléchargée et remboursement de 24,99 € confirmé. Réabonnement navigateur mensuel à 4,99 € validé : remise non réutilisée, un seul bonus de 300 scans, facture privée et confirmation livrée au simulateur. Deuxième rétractation et remboursement de 4,99 € confirmés. Le compte revient au gratuit ; les 300 scans sont conservés et bloqués.
- Avant vente : médiateur, coordonnées légales restantes, Stripe live, sauvegarde restaurable, contrats prestataires, migrations Supabase et vérification finale. `BILLING_LEGAL_READY` reste faux. Aucun passage en production.

## Preuves

Les relevés `hosted-recipe-database`, `hosted-commercial-tests`, `hosted-stripe-deliveries` et `hosted-preview-guards`, datés du 12 octobre, sont dans `docs/audit-commercial`. Les captures `hosted-welcome-preview`, `hosted-resend-simulator-delivered`, `hosted-auth-redirect-saved`, `hosted-browser-checkout-pending`, `hosted-browser-checkout-timeout`, `hosted-browser-checkout-confirmed` et `hosted-browser-final-free` et `hosted-resend-webhook-disabled` y sont conservées. Les relevés complémentaires `hosted-browser-purchase`, `hosted-resend-callback-checks`, `hosted-resend-deliveries`, `hosted-preview-final-state` et `hosted-preview-final-http-checks` établissent les résultats finaux. Le téléchargement réel de l’accusé de rétractation annuel est également conservé.
