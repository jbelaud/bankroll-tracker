# Configuration Stripe Kalivoa — préparation du 9 octobre 2026
## Actualisation du 11 octobre 2026

Le régime CA12 est confirmé, le numéro de TVA a été validé dans VIES, et Stripe Tax est désormais actif dans le seul bac à sable Kalivoa. Les quatre paiements TTC et remboursements avec avoir et TVA corrigée passent. Le domaine Resend est vérifié après ajout des DNS OVH et l’expéditeur préparé est Kalivoa <notifications@kalivoa.com>. Le profil public Stripe reste lié à l’activation du compte. Le détail actuel est dans [AVANCEMENT-COMMERCIAL-KALIVOA-2026-10-11.md](AVANCEMENT-COMMERCIAL-KALIVOA-2026-10-11.md). Les sections du 9 octobre ci-dessous sont historiques.

## État vérifié après recette du 9 octobre 2026

**Catalogue et cycle de facturation testés dans le nouveau bac à sable.** Les quatre scénarios Stripe et 64 tests locaux passent ; compilation de production réussie. Les nouveaux montants, quotas et conditions sont intégrés aux pages françaises et anglaises, vérifiées localement. Aucune publication en production effectuée.

Les coupons utilisés sont désormais les variantes v2, limitées au produit ; les variantes v1 avaient également cette restriction, accessible par une lecture API détaillée. Les prix ont un comportement fiscal inclusif. Le compte n’a aucune destination publique de webhook ; la livraison vers le site et le secret correspondant restent à configurer. Stripe Tax reste désactivé tant que le régime de TVA n’est pas confirmé.

Le relevé actuel détaillé est [RECETTE-ABONNEMENTS-KALIVOA-2026-10-09.md](RECETTE-ABONNEMENTS-KALIVOA-2026-10-09.md). Les sections ci-dessous décrivent les étapes historiques de préparation.


## Décisions confirmées

Vendeur : SASU ETS BELAUD, France. Service : Kalivoa, https://kalivoa.com.

La dénomination juridique est **ETS BELAUD** ; **Kalivoa** est le nom commercial du projet et du compte Stripe dédié. Edgemy est un autre projet déjà en production sur un autre compte/adresse Stripe, indiqué par le propriétaire ; aucune modification ni migration de ce compte n'a été réalisée.

Adresse administrative choisie : `ets.belaud@gmail.com`. Contact public choisi : `contact.kalivoa@gmail.com`. Il s’agit d’adresses Gmail choisies par le propriétaire ; aucune nouvelle boîte ou redirection n’a été créée.

| Formule | Prix TTC | Retour au prix normal |
| --- | ---: | --- |
| Premium mensuel | 4,99 €/mois | Sans remise |
| Premium annuel | 49,99 €/an | Sans remise |
| Bienvenue mensuel | 2,99 €/mois pendant la première année | 4,99 €/mois ensuite |
| Bienvenue annuel | 24,99 € la première année | 49,99 €/an ensuite |

Toutes les formules payantes donnent les mêmes droits : 200 scans par période mensuelle et un bonus initial de 300 scans, attribué une seule fois à la première souscription payante.

Les 300 scans n’expirent pas. Le solde est conservé après résiliation, mais inutilisable tant que le compte n’a pas un abonnement payant actif. Une reprise d’abonnement réactive le solde restant sans ajouter un nouveau bonus. L’ordre de consommation mensuel puis permanent est déjà géré et doit être préservé.

Le propriétaire indique un coût de scan de l’ordre de 0,005 €. Il s’agit de son estimation, sans nouvelle mesure indépendante dans cette préparation.

## Accès requis avant les écritures Stripe

Le lien de reconnexion a été fourni dans la conversation. Attendre la confirmation du propriétaire, puis relire les comptes accessibles et cibler explicitement le compte destiné à Kalivoa.

Ne pas enregistrer le lien temporaire d’autorisation, des clés API ou des secrets de webhook dans ce document.

## Organisation souhaitée

- Une connexion administrative durable pour ETS BELAUD.
- Un compte Stripe Kalivoa pour cette activité.
- Des comptes distincts pour les autres activités indépendantes, après identification de leurs noms et sites.
- Une adresse de support propre à chaque projet, éventuellement sous forme d’alias vers une boîte commune.
- Une organisation Stripe si plusieurs comptes justifient la centralisation.

L’accès Stripe ne donne pas automatiquement accès à la messagerie ou au domaine. La création d’alias nécessite de connaître les adresses choisies et le fournisseur, puis de disposer des accès correspondants. Un changement de connexion administrative ou une validation d’identité peut nécessiter une action personnelle du propriétaire.

## Configuration à réaliser après inspection du compte

1. Identifier l’entité existante, le compte et le mode test/live ; contrôler l’existence d’abonnements avant tout basculement.
2. Vérifier nom public Kalivoa, site, contacts, marque, libellé bancaire et identité légale ETS BELAUD ; renseigner uniquement des données réelles.
3. Créer ou réutiliser le produit Premium et les prix EUR mensuel/annuel convenus, avec comportement fiscal correspondant aux prix TTC.
4. Configurer la réduction de bienvenue et son échéance afin d’obtenir les montants exacts convenus, puis le tarif normal. Tester la première facture, les échéances et le renouvellement sans remise.
5. Conserver une seule utilisation de bienvenue par utilisateur. Règle retenue : bêta-testeurs avec éligibilité conservée après la bêta, et 15 premières nouvelles inscriptions hors bêta après sa clôture, jusqu’au 31 décembre 2026 à 23 h 59 (Paris). Les comptes administratifs sont exclus des 15 places. La page `/fr/offre-bienvenue` et les règles serveur sont préparées ; appliquer leur migration avant publication. Voir [le récapitulatif de l’offre](OFFRE-BIENVENUE-KALIVOA-2026-10-09.md).
6. Vérifier le portail : mise à jour du moyen de paiement, historique/factures, résiliation et fin d’accès clairement affichées. Définir les changements de formule et leur proratisation sans permettre de renouveler la remise.
7. Configurer les événements et le secret de webhook pour la destination appropriée, les retours vers kalivoa.com et la surveillance des erreurs.
8. Contrôler emails, factures, relances et rappels de renouvellement applicables. Lier les conditions définitives quand elles sont disponibles.
9. Lire les réglages fiscaux et inscriptions existants. Ne pas activer Stripe Tax sur la seule base du statut SASU : confirmer le régime, les inscriptions et les marchés avant calcul automatique.
10. Mettre à jour le raccordement applicatif au bon compte, y compris identifiants de prix/remises/portail ; traiter séparément toute migration de clients ou d’abonnements existants.

## Écarts applicatifs constatés lors de la préparation

- Checkout utilise actuellement un seul prix annuel et ne permet pas le choix mensuel/annuel.
- Les anciens montants 19,99 €/an et 9,99 € figurent encore dans les traductions.
- Le plan `BETA_PREMIUM` prévoit encore 100 scans, contre 200 pour Premium.
- Le bonus initial est actuellement configuré pour expirer après 30 jours ; le webhook calcule cette échéance. Il faut supprimer l’expiration pour la nouvelle offre et aligner l’affichage.
- La politique existante sait déjà rendre un lot indisponible en l’absence de plan payant.
- Les protections contre les doubles souscriptions, les événements désordonnés et l’activation différée restent à renforcer comme décrit dans l’audit.
- Les formulaires de rétractation/résiliation, l’acceptation des CGV et les preuves contractuelles nécessitent aussi un travail dans Kalivoa ; la configuration Stripe seule ne les réalise pas tous.

La phase bêta et les conditions préparatoires restent des états existants à coordonner avec l’ouverture commerciale. Créer les objets Stripe ne vaut pas lancement public du service.

## Recette attendue

- Prix et périodicité corrects pour chaque choix ; somme TTC conforme au montant affiché.
- Offre mensuelle de bienvenue terminée au bon moment ; offre annuelle limitée à la première année.
- Droits identiques Premium/Bienvenue et attribution du bonus une seule fois.
- Crédit permanent conservé, bloqué après fin des droits payants, réactivé après réabonnement.
- Pas de double abonnement lors d’appels concurrents, ni de double crédit sur webhook répété.
- Résiliation, impayé, retour au gratuit et réabonnement correctement synchronisés.
- Anciennes références Stripe non utilisées avec les clés du nouveau compte.

## État actuel

**Préparation enregistrée ; accès au compte cible en attente.** Le contrôle du connecteur ne montre que le compte `acct_1U1WeF6X5XLAj49T`, nommé « environnement de test BetTrack », en mode test, rattaché à `contact.bettrack@gmail.com` et à l’ancien site `https://bettrack-mvp.vercel.app/`. Ce compte ne correspond pas à l’adresse administrative indiquée pour la nouvelle configuration.

Inventaire en lecture seule : un produit « BetTrack Premium » et un prix annuel de 19,99 EUR ; aucun tarif mensuel dans les dix premiers prix, la réponse ne signale aucune suite. Paiements et virements non activés sur ce compte. Aucun compte live exposé par le connecteur.

Ne pas modifier cet ancien environnement sans identification explicite comme destination souhaitée. Faire autoriser le compte Kalivoa sous la bonne connexion, puis relire l’inventaire et ses réglages.

Diagnostic de connexion : le lien de gestion fourni par l’ancienne connexion a répondu « OAuth session does not belong to this user » lorsque le propriétaire l’a ouvert avec sa nouvelle identité Stripe. Ce lien ne constitue pas une nouvelle connexion. Ajouter la nouvelle identité depuis les réglages du plugin Stripe, ou déconnecter l’ancienne liaison puis lancer une nouvelle connexion depuis cette fiche. Ne plus réutiliser le lien de session de l’ancienne identité. Les outils disponibles ne permettent pas de réinitialiser directement cette identité OAuth.

### Mise à jour après reconnexion et renommage

La session du Dashboard a été vérifiée dans « Informations personnelles » : utilisateur `ets.belaud@gmail.com`, compte principal `acct_1T7ifpRZcB561pgV`. La nouvelle session OAuth ChatGPT est visible dans ce profil et vise le bac à sable `acct_1T7igFDNFQcoJN1N`. L'ancien compte du connecteur décrit plus haut est un inventaire historique et ne doit pas être utilisé comme cible.

Modifications enregistrées et vérifiées après rechargement du Dashboard :

- Bac à sable `acct_1T7igFDNFQcoJN1N` : « Environnement de test BetTrack » remplacé par **Environnement de test Kalivoa**.
- Compte principal `acct_1T7ifpRZcB561pgV`, réglages accessibles en mode test : nom du compte remplacé par **Kalivoa**.

Stripe redirige l'accès à la production vers son assistant d'activation ; les informations de l'entreprise restent à confirmer. Le renommage n'a pas renseigné ni validé l'identité juridique ETS BELAUD. Le contrôle automatique a d'abord refusé le renommage du compte principal car l'action avait été annoncée en production et la page était en mode test. Après vérification en lecture seule du contexte et du profil propriétaire, la modification a été autorisée et effectuée dans le mode réellement affiché.

Limitation actuelle : les outils Stripe du connecteur répondent « Unknown tool » malgré la nouvelle autorisation visible dans le Dashboard. Le renommage a été réalisé par l'interface du Dashboard. Les prix, remises, portail, webhooks et raccordement applicatif restent à configurer et à tester.

Preuve : `docs/audit-commercial/stripe-compte-kalivoa-2026-10-09.jpg`.

### Configuration du catalogue et du portail en bac à sable

Après confirmation du propriétaire, les objets suivants ont été créés dans **le bac à sable Kalivoa uniquement** (`acct_1T7igFDNFQcoJN1N`, mode test), depuis le Dashboard :

| Objet | Référence | Paramètres vérifiés dans le Dashboard |
| --- | --- | --- |
| Produit | `prod_VPLWyVsno2M2CM` | Kalivoa Premium ; description 200 scans/mois et bonus unique 300 scans sans expiration, utilisable avec abonnement payant actif ; métadonnée `app=kalivoa` ; libellé `KALIVOA` |
| Prix mensuel | `price_1UOWpQDNFQcoJN1NuaUzuhfJ` | 499 centimes EUR/mois ; clé `kalivoa_premium_monthly` ; prix par défaut |
| Prix annuel | `price_1UOWpQDNFQcoJN1NUbukzz28` | 4999 centimes EUR/an ; clé `kalivoa_premium_yearly` |
| Coupon mensuel | `kalivoa_welcome_monthly_v1` | 200 centimes EUR de remise pendant 12 mois ; limité au produit Premium |
| Coupon annuel | `kalivoa_welcome_yearly_v1` | 2500 centimes EUR de remise une fois ; limité au produit Premium |
| Portail par défaut | `bpc_1UOWvoDNFQcoJN1NlRcrI7Pf` | Historique de factures, modification des moyens de paiement et annulation en fin de période ; en-tête Kalivoa ; retour `https://kalivoa.com/fr/account` ; changements de formule/quantité désactivés |

Aucun code promotionnel public créé. Le serveur devra choisir le coupon correspondant au prix et vérifier une seule utilisation de bienvenue par utilisateur : la restriction Stripe porte sur le produit, qui contient les deux périodicités. Le coupon annuel ne doit jamais être appliqué au prix mensuel.

Les montants et durées ont été vérifiés sur les pages enregistrées. La recette Checkout/factures/renouvellement n'a pas encore été exécutée. Le texte de description des crédits ne change pas les droits dans l'application : les écarts applicatifs décrits plus haut restent à corriger.

Le formulaire de prix n'expose pas de réglage fiscal dans cet environnement non activé. L'intention TTC est enregistrée dans le libellé interne, mais ne remplace pas la vérification de `tax_behavior` et du calcul effectif après confirmation du régime de TVA. Stripe Tax n'a pas été activé. Les coordonnées publiques et liens juridiques renvoient vers un profil d'entreprise encore incomplet.

Inventaire machine lisible : `docs/audit-commercial/stripe-test-configuration-2026-10-09.json`. Preuves visuelles : `stripe-tarifs-test-2026-10-09.jpg` et `stripe-remises-test-2026-10-09.jpg`, dans le même dossier. Deux produits de test préexistants « Pro » et « Pousse » ont été laissés intacts.

Aucune clé ou variable de production modifiée ; aucun email/alias créé ; aucun paiement réalisé ; compte Edgemy inchangé. Raccordement applicatif, webhooks et validation complète du cycle d'abonnement restent à réaliser avec les clés du nouveau bac à sable.
