# Stripe Kalivoa — contrôle de production du 19 octobre 2026

**Mise à jour après déploiement :** la version commerciale est maintenant publiée, les migrations Supabase sont appliquées et les webhooks Stripe/Resend sont actifs. La bêta et les verrous d'achat sont maintenus. Le résultat final est décrit dans [le rapport de déploiement](DEPLOIEMENT-COMMERCIAL-2026-10-19.md). Les sections ci-dessous conservent l'état historique de la préparation avant publication.

## État final après préparation autorisée

Le catalogue et le raccordement de production sont préparés. **Les ventes restent fermées : aucun déploiement ni paiement client n'a été effectué.** Le contrôle en lecture seule `node scripts/stripe-live-readiness.mjs` passe sur le compte live `acct_1T7ifpRZcB561pgV`.

### Réglages terminés

- Kalivoa Premium : `prod_VTIXo0MxSL26Kl`, catégorie SaaS usage personnel `txcd_10103000`.
- 4,99 € TTC/mois et 49,99 € TTC/an ; remises limitées à ce produit : 2 € pendant douze mois et 25 € une seule fois. Les règles d'éligibilité bêta / quinze premiers et la date limite restent contrôlées côté serveur.
- Collecte France active. Un seul calcul Tax live de vérification (opération facturable par Stripe, sans paiement client) confirme 20 % inclus : 0,83 € sur 4,99 €, 8,33 € sur 49,99 €, 0,50 € sur 2,99 €, 4,17 € sur 24,99 €. Aucun deuxième calcul n'a été nécessaire.
- Numéro de TVA `FR61994223212` ajouté et défini par défaut sur les factures. Pied de facture enregistré : Kalivoa, ETS BELAUD SASU, capital 500 €, siège parisien, SIRET, RCS, TVA et email de contact. Numérotation séquentielle du compte conservée.
- Support `contact.kalivoa@gmail.com`, page de contact, confidentialité et CGV renseignés. Le téléphone déjà enregistré n'a pas été modifié ; l'option d'affichage sur reçus/factures était désactivée. Cela ne règle pas, à lui seul, la question des coordonnées légales du site.
- Portail `bpc_1USM8ARZcB561pgVx5POB3k8` : factures, mise à jour du paiement, résiliation à échéance ; changements de formule/quantité et lien public désactivés.
- Webhook `we_1USMJARZcB561pgVbZgDdq1f` préparé pour `https://kalivoa.com/api/stripe/webhook`, API `2026-08-26.dahlia`, sept événements, **désactivé** jusqu'au déploiement et à sa validation.
- Variables et secrets enregistrés uniquement pour la prochaine construction Vercel de production. Le secret webhook de preview reste séparé. Clés locales test et live séparées ; aucune clé dans les rapports.
- Garde-fou TVA corrigé pour accepter les schémas français `standard` et `small_seller` sans confondre lieu d'imposition et régime déclaratif CA12.

### Vérifications et limites

- 38 tests passent dans les suites TVA, facturation et verrou d'ouverture ; compilation TypeScript complète réussie ; vérification de syntaxe des scripts réussie.
- ESLint ne démarre pas : dépendance locale `@babel/types` manquante. Une remise en cohérence hors ligne n'a pas résolu ce problème ; aucun changement de dépendance supplémentaire effectué pour le contourner.
- Le déploiement actuellement publié reste `bankroll-tracker-kqyqzpmrd-ets-belaud.vercel.app`, révision `4d50b35577fcf5f2ee506b8697e9729a9ba70093` au moment du contrôle. Les nouveaux secrets et identifiants seront utilisés après déploiement.
- Le chemin Stripe publié répond 405 à GET (présence de la route, pas preuve de livraison signée) ; le nouveau webhook Resend répond encore 404. Aucune validation de bout en bout en production n'est revendiquée.

### À terminer avant ouverture

1. Finaliser les informations légales et la correction d'adresse de la convention de médiation ; confirmer les coordonnées requises et les accords avec les prestataires.
2. Vérifier une sauvegarde Supabase restaurable, appliquer les migrations commerciales revues et publier uniquement les changements retenus.
3. Vérifier les handlers Stripe et Resend publiés, leur signature, le traitement des événements, les notifications et rappels annuels ; activer ensuite le webhook Stripe préparé.
4. Contrôler le compte bancaire de versement dans Stripe avec le propriétaire. Aucun réglage bancaire n'a été changé.
5. Lever les verrous commerciaux seulement après ces validations. `BILLING_LEGAL_READY`, `BILLING_RECIPE_ENABLED` et `COMMERCIAL_RECORDS_ENABLED` restent à `false` en production préparée.

Identifiants structurés : [manifest](audit-commercial/stripe-live-configuration-2026-10-19.json). Preuve visuelle : [catalogue live](audit-commercial/stripe-live-catalogue-2026-10-19.jpg).

## Historique — inspection initiale avant configuration

Inspection du Dashboard en lecture seule. Aucun changement de réglage, création de produit, clé, webhook ou paiement. Le passage depuis le bac à sable n’active pas les abonnements du site.

## Constats actuels

- Compte de production : `acct_1T7ifpRZcB561pgV`, Kalivoa. Le bac à sable reste `acct_1T7igFDNFQcoJN1N`.
- État du compte : aucune tâche active ; paiements, paiements par carte et virements indiqués actifs. Une suspension de Scalapay est affichée, distincte des cartes et sans nécessité identifiée pour le lancement.
- Entreprise : ETS BELAUD ; nom commercial Kalivoa ; siège 61 rue de Lyon, 75012 Paris ; site kalivoa.com/fr ; libellé bancaire KALIVOA.
- Un numéro est enregistré comme téléphone public du support. Ne pas le recopier dans ce rapport ; le propriétaire souhaitait éviter d’exposer son téléphone personnel. À revoir avec lui avant ouverture.
- Catalogue live : vide (« Ajoutez votre premier produit »). Ne pas utiliser les identifiants du catalogue de recette pour la production.
- Paramètres Tax : siège France, catégorie par défaut « Général - services », inclusion automatique des taxes selon la devise. La catégorie SaaS et le comportement inclusif explicite des prix restent à préparer comme en recette.
- Territoire France : immatriculation « Petite entreprise (UE) », ajoutée le 19 octobre, statut « Intervention requise ». Stripe indique que l’immatriculation existe mais que la configuration de Tax n’est pas terminée. Ce libellé n’est pas une preuve de franchise en base : l’option européenne small seller concerne le lieu d’imposition des ventes transfrontalières. Vérifier l’option appropriée et sa compatibilité avec le garde-fou applicatif avant de modifier la configuration ; le régime déclaré par le propriétaire reste réel simplifié CA12.

## À terminer avant les ventes

### Mise à jour après intervention du propriétaire, le 19 octobre

Le détail de l’immatriculation française affiche désormais « Collecter des taxes » ; l’alerte de configuration incomplète a disparu. La collecte France est activée. Le type reste « Petite entreprise (UE) », distinct du régime déclaratif CA12 et ne signifiant pas une franchise en base. Aucun montant de facture live ni aucune classification de nouveau produit n’est validé par ce seul état. Avant raccordement, vérifier la compatibilité de cette option small seller avec `verifyAutomaticTax`, qui exige actuellement `place_of_supply_scheme === "standard"` : ne pas faire modifier une option fiscale uniquement pour satisfaire un garde-fou technique. Le catalogue et les autres étapes ci-dessous restent à préparer.

1. Finaliser Tax France, la classification SaaS et les prix TTC.
2. Préparer le produit Premium, les deux tarifs 499/4999 centimes et les réductions de bienvenue 200 centimes pendant douze mois / 2500 centimes une fois, limitées au produit.
3. Configurer et vérifier le portail live : factures, moyen de paiement et résiliation à échéance, sans renouveler une remise déjà consommée. Vérifier emails de paiement, échec et les notifications annuelles gérées côté Kalivoa.
4. Raccorder la production avec les identifiants et accès live limités ; enregistrer le webhook direct `https://kalivoa.com/api/stripe/webhook` et son secret live après publication du handler. Aucun webhook de production n’a été inspecté pendant ce contrôle ; ne pas déclarer son absence comme un fait vérifié.
5. Vérifier les factures et liens légaux définitifs ; côté propriétaire, contrôler le compte bancaire de versement dans Stripe. Le statut actif des virements ne prouve pas que l’IBAN correspond au compte souhaité.
6. Terminer les prérequis du site (CGV encore préparatoires, correction d’adresse de la convention de médiation, informations légales, sauvegarde restaurable, migrations et notifications de production). Aucun verrou d’ouverture n’est levé.

## Sources

- Dashboard live Kalivoa : État du compte, Informations sur votre entreprise, Catalogue, Paramètres Tax et Territoires fiscaux.
- https://docs.stripe.com/get-started/checklist/go-live
- https://docs.stripe.com/tax/set-up
- https://docs.stripe.com/tax/supported-countries/european-union
