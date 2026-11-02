# Kalivoa — préparation commerciale du 11 octobre 2026

**Suite vérifiée le 12 octobre :** après l’accord explicite du propriétaire, la recette Neon séparée est créée et déployée. Les quatre offres, leurs événements Stripe signés, contrats, factures, confirmations simulées, résiliations et remboursements passent sur la preview. Le parcours connecté et le webhook fournisseur Resend restent à finaliser. Voir [la recette hébergée et ses preuves](RECETTE-COMMERCIALE-KALIVOA-2026-10-12.md). La production et les paiements réels ne sont pas ouverts.

Les modifications commerciales du site sont préparées localement. La bêta publique demeure active. Les migrations d’offres et d’archives commerciales, la publication du site et les paiements réels ne sont pas activés. Une correction distincte des droits d’accès de trois tables a été testée puis appliquée sur Supabase en production ; elle ne modifie aucune donnée client.

La vérification complémentaire des prestataires, sauvegardes et préparatifs de recette est consignée dans [Prestataires et recette](PRESTATAIRES-ET-RECETTE-KALIVOA-2026-10-11.md). Elle confirme Supabase en production, Neon pour les previews, l’absence de sauvegardes de projet sur le forfait Supabase actuel et les contrôles supplémentaires des notifications de test.

La vérification finale complémentaire porte le total à 87 cas distincts couverts et confirme une nouvelle compilation complète réussie. La console Neon est reconnectée et son forfait Free confirmé. La création d’une ressource distante a été rejetée par le contrôle d’approbation automatique et n’a reçu aucun accord explicite ; les travaux de recette restent donc locaux. Aucun déploiement de preview ni ouverture payante effectués.

## Marque et société

Kalivoa est le nom visible du service et l’expéditeur préparé des notifications : `Kalivoa <notifications@kalivoa.com>`, avec réponse à `contact.kalivoa@gmail.com`. ETS BELAUD est la société exploitante : son identité reste dans les mentions légales, CGV, politique de confidentialité et documents contractuels/comptables.

Le nom « Kalivoa » est imposé en tête des nouveaux Checkout et vérifié dans une vraie page Stripe de test. L’API Stripe refuse la modification du profil public du compte standard ; le Dashboard demande l’activation de l’entreprise. Le libellé bancaire KALIVOA, le profil public et les mentions légales des factures doivent être confirmés lors de cette activation. Le changement de nom du compte interne ne suffit pas à valider ces éléments. Certains textes natifs du bac à sable portent encore son nom « Environnement de test Kalivoa ».

## Messagerie

Le domaine kalivoa.com a été ajouté à Resend en région Irlande (`eu-west-1`). Trois enregistrements DNS ont été ajoutés dans la zone OVH : TXT `resend._domainkey`, CNAME `rsend` et CNAME `send`, avec les valeurs réellement fournies par Resend. Les enregistrements existants du site, de Google et de la messagerie OVH sont conservés.

Les trois nouveaux enregistrements sont visibles publiquement et **Resend confirme le domaine Verified**. La réception Resend reste désactivée. Le suivi des clics/ouvertures n’a pas été configuré. Les réglages TLS sont ceux du fournisseur (opportunistic).

Un unique email de test a été envoyé après accord explicite à `contact.kalivoa@gmail.com`, objet « Kalivoa — test de l’expéditeur ». Resend confirme **Delivered** avec l’expéditeur **Kalivoa <notifications@kalivoa.com>** et le Reply-To de support ; le propriétaire confirme avoir reçu le message. Aucun second email envoyé.

L’application dispose d’une file persistante pour les confirmations de contrat, résiliation, rétractation, remboursements et rappels annuels. Elle distingue l’acceptation de l’envoi de la livraison réelle, vérifie les signatures Resend et garde les résultats incertains pour contrôle plutôt que de dupliquer un message. Le raccordement d’un webhook Resend public, sa clé de signature et la vérification de livraison restent à réaliser avec une version déployée proposant la nouvelle route. La clé locale d’envoi conserve ses droits limités.

## Facturation et remboursement

Le régime déclaré est réel simplifié (CA12). Le numéro FR61994223212 a été validé auprès de VIES le 11 octobre, qui retourne SAS ETS BELAUD, 61 rue de Lyon, Paris. La preuve est dans `audit-commercial/vies-ets-belaud-2026-10-11.json`.

La collecte française et la catégorie SaaS pour usage personnel ont été activées **uniquement dans le bac à sable Kalivoa**, conformément à l’accord du propriétaire. Les prix restent TTC et inclusifs.

| Scénario | Somme payée | TVA incluse | Remboursement confirmé |
| --- | ---: | ---: | ---: |
| Mensuel standard | 4,99 € | 0,83 € | 4,99 € |
| Annuel standard | 49,99 € | 8,33 € | 49,99 € |
| Mensuel bienvenue | 2,99 € | 0,50 € | 2,99 € |
| Annuel bienvenue | 24,99 € | 4,17 € | 24,99 € |

La recette réelle Stripe a révélé qu’un avoir créé seulement avec un montant global ne reprenait pas la TVA. La correction crédite les lignes de facture d’origine et contrôle l’aperçu avant toute résiliation ou remboursement. Les quatre scénarios corrigés passent : sommes TTC, TVA de facture, TVA de l’avoir, remboursement intégral, présence du numéro de TVA vendeur et clôture de l’abonnement fictif. Les essais initiaux ont aussi été remboursés et leurs abonnements clôturés ; leur relevé est conservé séparément. Aucun paiement réel.

Cette recette utilise des objets Stripe explicitement marqués comme fictifs. Les archives applicatives, quotas et emails sont vérifiés séparément dans une véritable base PostgreSQL temporaire avec un fournisseur Stripe simulé ; il reste à contrôler le parcours complet après déploiement de recette et raccordement des emails. Les essais historiques du 9 octobre couvrent aussi la fin des promotions mensuelles et annuelles.

## Contrats, confidentialité et rétractation

Les déclarations de commande sont vérifiées côté serveur : CGV, activation immédiate sans abandon du droit de rétractation, résidence et adresse française. Les versions de CGV acceptées sont archivées sans remplacer les anciens textes. La nouvelle version préparatoire est `2026-10-11.1-draft` ; l’encadré de garantie numérique continue est ajouté suivant le modèle du Code de la consommation.

La page de rétractation permet de sélectionner le contrat, vérifier la déclaration et confirmer. L’accusé horodaté est conservé et téléchargeable, y compris après rechargement. Les demandes concurrentes et les reprises après incident ne créent pas un second remboursement. Les paiements et avoirs sont archivés séparément des profils, avec stockage privé des PDF et accès restreint. La migration additive est préparée et testée, sans application à la production.

Les mesures facultatives de parcours attendent un consentement, avec refus aussi accessible que l’acceptation et possibilité de modifier le choix. Le refus retire les identifiants du navigateur et bloque les nouveaux événements facultatifs côté client et serveur.

Durées approuvées : historique tant que le compte est actif ; procédure après deux ans d’inactivité, avec avertissement réellement livré et au moins 30 jours pour se reconnecter/exporter ; brouillons après 30 jours sans modification ; signalements 30 jours ; support courant 12 mois après clôture ; parcours six mois ; pièces comptables au moins dix ans. Les litiges et obligations de preuve sont séparés. **La suppression automatique des comptes reste désactivée** jusqu’à vérification des livraisons et sauvegardes.

## Validation et points restant à obtenir

La première série de huit suites a validé 67 tests. Après correction des avoirs et du nom Checkout, les deux suites concernées valident 37 tests, dont un nouveau cas bloquant un aperçu d’avoir sans TVA : **68 tests distincts couverts** à ce stade. Vérification TypeScript et ESLint réussie sur les modifications contrôlées. Le serveur de recette est rétabli après son arrêt mémoire : imports d’icônes optimisés et limite locale ajustée. La page de confidentialité retourne HTTP 200 et s’affiche dans le navigateur. Refus, acceptation, modification puis retrait du consentement ont été vérifiés dans l’interface.

**La compilation complète Next.js 16.2.11 avec Turbopack a réussi**, y compris TypeScript et génération des 17 pages statiques. Elle utilise une copie isolée du site et la base PostgreSQL temporaire de recette, sans envoi d’email ni écriture en production. Le traitement Tailwind parcourait les dossiers générés et bloquait les premières tentatives : sa recherche est désormais limitée à `src`, en conservant les sources explicites des bibliothèques. La transformation directe des styles s’effectue en environ une seconde ; la compilation des pages prend 74 secondes, puis TypeScript 2,4 minutes. Le relevé est dans `audit-commercial/build-commercial-2026-10-11.json`. L’apparence de la confidentialité a été contrôlée après rechargement. Ces validations locales ne remplacent pas le parcours complet sur une recette déployée.

Avant vente :

- Adhésion à un médiateur compétent, puis ses nom, adresse et site dans les CGV. L’adhésion n’a pas été effectuée.
- Coordonnées téléphoniques légales encore manquantes ; le propriétaire refuse de publier son numéro personnel. Aucun numéro inventé ou personnel ajouté.
- Activation du compte Stripe dédié avec identité juridique ETS BELAUD, nom public Kalivoa, libellé bancaire et factures ; reprise des réglages en mode réel.
- Vérification des contrats prestataires, région/base réelle de production, transferts, journaux et sauvegardes.
- Déploiement de recette, migration contrôlée, raccordement des webhooks publics et confirmation de livraison des emails ; validation du parcours complet avant l’ouverture payante.

## Réponses à l’audit juridique

La médiation de la consommation est obligatoire pour une offre B2C française : [Service Public](https://entreprendre.service-public.gouv.fr/vosdroits/F33338).

Les CGV Bet-Analytix datées du 1er janvier 2025 mentionnent la médiation et annoncent que l’identité du médiateur est communiquée sur demande. Elles ne prouvent pas une adhésion effective et ne permettent pas d’affirmer que tous les concurrents disposent d’un médiateur : [CGV Bet-Analytix](https://www.bet-analytix.com/docs/conditions-generales-vente-bet-analytix.pdf). Sa [politique de confidentialité](https://www.bet-analytix.com/privacy) ne donne pas de durée générale chiffrée de conservation.

La clôture après deux ans d’inactivité est une règle proportionnée choisie pour Kalivoa, avec avertissement, et non une durée légale universelle : [CNIL](https://www.cnil.fr/fr/achat-de-contenus-numeriques-quelle-duree-de-conservation-des-comptes-inactifs).

La marque peut être mise en avant, mais les factures doivent identifier la société vendeuse : [mentions de facturation](https://entreprendre.service-public.gouv.fr/vosdroits/F31808). Modèle de garantie continue : [annexe D. 211-4](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045981322).
