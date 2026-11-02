# Audit de préparation commerciale — Kalivoa

Audit réalisé les 8–9 octobre 2026 sur https://kalivoa.com et le dépôt local.

**Avis : préparer l’ouverture payante, puis l’activer après traitement des points P0.** Le produit, la vitrine et la structure SEO existent. Le cadre commercial est encore explicitement préparatoire, et l’intégration Stripe nécessite une recette et plusieurs protections supplémentaires. Modifier uniquement les prix ne suffirait pas.

Cadre confirmé par le propriétaire : **SASU ETS BELAUD, établie en France, clientèle surtout en France et en Francophonie**. L’audit prend comme hypothèse une vente d’abonnements SaaS à des particuliers. Le régime de TVA et la liste précise des pays ouverts à l’achat restent à confirmer. La Francophonie n’est pas une juridiction ou un régime fiscal unique.

**Décisions postérieures à cet audit :** le propriétaire a retenu une préparation à 4,99 €/mois ou 49,99 €/an TTC, avec une offre de première année à 2,99 €/mois ou 24,99 €/an. Les 300 scans offerts seront permanents mais utilisables uniquement avec un abonnement payant. Les constats ci-dessous décrivent l’état observé avant cette reconfiguration. Voir [la préparation Stripe](CONFIGURATION-STRIPE-KALIVOA.md) pour les décisions et le travail restant.

**Mise à jour de la recette :** le catalogue de test, les quatre scénarios de prix et renouvellements, ainsi que le parcours authentifié mensuel dans le navigateur sont maintenant validés. Le paiement active Premium avec 200 scans mensuels et un bonus unique de 300 permanents ; le portail et le retour au gratuit après résiliation ont été vérifiés. Voir [le compte rendu de recette](RECETTE-ABONNEMENTS-KALIVOA-2026-10-09.md). Les constats initiaux ci-dessous restent historiques : ils ne décrivent pas tous les correctifs réalisés depuis. Le lancement live, le webhook du déploiement public et la finalisation juridique restent à terminer.

## Périmètre et niveau de preuve

**Préparation juridique du 10 octobre :** le propriétaire confirme la vente en France au lancement et le remboursement intégral pour une rétractation dans les 14 jours, même après consommation de scans. CGV, confidentialité et formulaires FR/EN sont complétés en local ; les déclarations avant paiement sont contrôlées côté serveur et versionnées dans Stripe. Médiateur non choisi, TVA à reconfirmer et téléphone non fourni. Les documents restent préparatoires : rétractation en ligne, confirmations durables, consentement au suivi et durées de conservation restent à finaliser. Voir [le travail réalisé et les informations attendues](PREPARATION-JURIDIQUE-KALIVOA-2026-10-10.md).

**Identité de l’éditeur complétée le 10 octobre :** les informations d’ETS BELAUD fournies via Pappers sont reprises dans les mentions légales, les CGV préparatoires et la confidentialité : siège, capital, SIREN/SIRET, RCS et président/directeur de la publication. Téléphone professionnel, régime et identification de TVA et téléphone de l’hébergeur restent à confirmer. Voir [le relevé et ses sources](IDENTIFICATION-ETS-BELAUD-2026-10-10.md). Ces modifications sont locales.

**Offre de bienvenue préparée :** une page dédiée présente les deux tarifs réduits pour les bêta-testeurs et les 15 premières nouvelles inscriptions hors bêta après sa clôture. Activation avant le 31 décembre 2026 à 23 h 59 (Paris), avec douze mois de réduction conservés même au-delà de cette date. Éligibilité conservée en base et limite vérifiée sous transactions réelles. La page et sa migration restent à publier ; la bêta de production demeure ouverte. Voir [les règles et l’aperçu](OFFRE-BIENVENUE-KALIVOA-2026-10-09.md).

- **Production contrôlée** : accueil FR/EN, tarifs, confidentialité, mentions légales, CGV, contact, partenaires, bookmakers, Académie, robots.txt et les **44 URL du sitemap**. Résultats enregistrés dans [production-2026-10-09.json](audit-commercial/production-2026-10-09.json).
- **Code examiné** : Checkout, portail client, webhooks, plans/quota, sortie de bêta, collecte marketing, stockage des rapports de qualité, support, export/suppression et infrastructure SEO.
- **SEO historique** : exports Search Console présents dans `docs/seo-gsc`, dont le relevé du 8 octobre. L’accès GSC Wizard est indisponible à la suite de la fin de l’essai.
- **Non vérifié** : configuration réelle du compte Stripe, activation des paiements/virements, prix et coupon live, options du portail, mails effectivement délivrés, sauvegardes/restauration, configuration des fournisseurs IA et de la base en production. Le connecteur Stripe a renvoyé deux demandes de réauthentification sans donner accès aux comptes.
- Aucun paiement, remboursement ou changement de configuration n’a été effectué. Pas de recette authentifiée complète, de mesure Lighthouse/Core Web Vitals ni de test d’intrusion. Les contrôles HTTP ne démontrent pas la qualité visuelle sur mobile.
- Le dépôt contient des modifications en cours. La production a 44 URL dans son sitemap alors que le fichier local lu en contient 36 : préserver les contenus déployés lors d’une prochaine intervention et identifier la version de référence.

## Ce qui est déjà en place

| Domaine | Constat |
| --- | --- |
| Vitrine | Navigation, fonctionnalités, import par capture, compatibilité bookmaker, tarifs, FAQ, contact et pages juridiques accessibles. |
| SEO technique | 44/44 URL du sitemap répondent en HTTP 200. Chaque URL testée a une canonical, trois liens alternatifs de langue et un seul H1. Les pages publiques testées individuellement reçoivent une CSP et HSTS. |
| Contenu | Académie et guides ciblés déjà publiés ; suivi SEO daté et exports conservés. |
| Paiement dans le code | Stripe Checkout en abonnement, portail client, vérification de signature sur le corps brut du webhook, synchronisation des factures et abonnements. |
| Crédit initial | Clé d’attribution stable pour empêcher les doubles crédits lors des répétitions de webhook. |
| Vie privée | Export utilisateur, captures normales non persistées dans les brouillons serveur examinés ; rapport de qualité volontaire avec consentement, stockage privé et purge prévue. |
| Sécurité et exploitation | Sessions vérifiées côté serveur, en-têtes de sécurité, protections administrateur, quotas et workflow CI avec lint, types, tests et build. Leur présence ne confirme pas que les derniers contrôles passent. |
| Jeu responsable | Service décrit comme outil de suivi, majorité et ressources d’aide affichées, absence de promesse de gain. |

## P0 — à terminer avant la première vente

### 1. Publier l’identité légale dès maintenant

**Constat production :** `/fr/legal-notice` indique que l’identité de l’éditeur, son adresse, son immatriculation et son contact restent à renseigner. La page cite Vercel mais ne fournit pas son téléphone.

**Action pour ETS BELAUD :** publier la dénomination exacte, la forme SASU, le capital social, le siège, le SIREN et l’immatriculation au RCS avec la ville, le numéro de TVA lorsqu’applicable, les coordonnées électroniques et téléphoniques, le directeur de publication et les coordonnées complètes de l’hébergeur. Expliquer que Kalivoa est le service/la marque exploité par ETS BELAUD. Vérifier l’entité et l’adresse actuelles de Vercel au lieu de reprendre les coordonnées sans contrôle.

Les mentions légales concernent déjà un site professionnel en ligne, même si la bêta est gratuite. Le texte « avant commercialisation » ne reporte pas cette obligation. [Service Public — mentions d’un entrepreneur individuel](https://entreprendre.service-public.gouv.fr/vosdroits/F31228), [mentions d’une société](https://entreprendre.service-public.gouv.fr/vosdroits/F37351).

**Terminé quand :** informations réelles accessibles depuis toute page publique, versions FR/EN cohérentes, aucun texte préparatoire restant.

### 2. Finaliser les CGV et désigner un médiateur

**Constat production :** `/fr/sales-terms` est un projet précontractuel qui annonce qu’aucune offre payante n’est proposée. Les CGU courtes ne le remplacent pas.

**Action :** arrêter l’offre, son prix TTC, les fonctionnalités et restrictions, le calendrier de quotas, la durée, le renouvellement, la résiliation, les remboursements, le support et les conséquences du retour au gratuit. Inclure les informations propres au service numérique, notamment compatibilité et garanties. Faire apparaître un médiateur effectivement compétent après adhésion/convention appropriée, avec ses coordonnées.

La garantie légale du service numérique ne disparaît pas parce que le logiciel utilise une IA ou conserve une étiquette bêta. [Légifrance — conformité des services numériques](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069565/LEGISCTA000044132865/). Les coordonnées du médiateur doivent être communiquées sur le site et les CGV. [Service Public — médiation](https://entreprendre.service-public.gouv.fr/vosdroits/F33338).

**Terminé quand :** CGV datées applicables à l’offre vendue, support public et médiateur identifiés, version du contrat conservée pour chaque souscription.

### 3. Ajouter un véritable parcours de rétractation

**Constat code :** aucune fonctionnalité dédiée de rétractation ni formulaire type trouvé. Le portail Stripe sert à gérer l’abonnement ; une annulation de renouvellement ne traite pas nécessairement une rétractation et son remboursement.

**Action :** informer sur les 14 jours, fournir le formulaire type et définir le démarrage immédiat du service. Ne pas présumer une renonciation au droit parce que l’utilisateur s’est connecté ou a utilisé un scan. La qualification exacte du service et le traitement des consommations pendant ce délai doivent être arrêtés dans les CGV.

**Point récent : depuis le 19 juin 2026**, les contrats conclus par une interface en ligne doivent offrir une fonctionnalité gratuite de rétractation pendant le délai applicable. Prévoir identification du contrat, confirmation explicite et accusé de réception durable avec date/heure. [Article L221-21](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032226834/), [article D221-5](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053303365/2026-09-08).

**Terminé quand :** un utilisateur peut exercer ce droit en ligne ; la demande et son traitement financier sont traçables ; l’email de confirmation est délivré.

### 4. Rendre la résiliation explicite et fiable

**Constat code :** portail présent, bouton « Gérer mon abonnement ». Le statut `cancel_at_period_end` n’est pas synchronisé dans les champs et composants examinés ; le texte peut donc continuer à annoncer un renouvellement après une résiliation programmée.

**Action :** proposer une entrée claire « Résilier mon abonnement », vérifier que le portail autorise effectivement l’annulation, afficher la fin d’accès plutôt qu’un renouvellement lorsqu’il est annulé, et envoyer une confirmation durable. Prévoir aussi le rappel légal de non-reconduction si la formule retenue est un contrat à durée déterminée avec reconduction tacite.

La résiliation doit être facilement accessible en ligne. [Service Public — résiliation électronique](https://entreprendre.service-public.gouv.fr/vosdroits/F23455). La reconduction d’un contrat de services à durée déterminée a ses propres obligations d’information. [Légifrance — L215-1](https://www.legifrance.gouv.fr/codes/id/LEGIARTI000034072591).

**Terminé quand :** résiliation réalisable sans échange avec le support, date de fin claire, absence de prélèvement après la fin prévue.

### 5. Relier le paiement à des conditions acceptées et à une confirmation

**Constat code :** `createCheckoutSessionAction` ne configure pas de collecte d’acceptation des conditions ; aucun enregistrement de version/acceptation des CGV n’a été trouvé dans le parcours examiné. Une configuration du Dashboard pourrait compléter l’affichage, mais elle n’a pas été vérifiée.

**Action :** présenter le récapitulatif corrigeable, les CGV accessibles et leur acceptation prouvable, les informations de renouvellement et le montant à payer. Vérifier l’intitulé du bouton final Stripe. Envoyer une confirmation de contrat contenant les conditions/version convenues sur un support durable ; un simple reçu bancaire ne couvre pas automatiquement tout le contrat. [DGCCRF — commande et confirmation](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/e-commerce-les-regles-entre-professionnels-et-consommateurs).

**Terminé quand :** chaque commande peut être reliée à une offre, un prix, une version contractuelle et une date d’acceptation ; confirmation récupérable après évolution du site.

### 6. Compléter la confidentialité et corriger la promesse sur les captures

**Constat production :** la politique décrit les catégories de données mais n’identifie pas le responsable, les bases légales, les durées, les prestataires, les transferts éventuels ni la réclamation CNIL. Elle annonce globalement que les captures ne sont pas conservées.

**Constat code :** un rapport de qualité volontaire conserve une capture en stockage privé avec une échéance de 30 jours ; l’extension conserve également des images localement. Les extractions structurées peuvent être conservées même lorsque l’image originale ne l’est pas.

**Action :** expliquer ces cas distincts, identifier les fournisseurs réellement actifs (auth/base/stockage, hébergement, Stripe, IA, email), leurs rôles et les transferts éventuels ; fixer les durées des comptes, paris, brouillons, logs, événements marketing, captures de support et données comptables. Vérifier les contrats de sous-traitance, régions et conditions de réutilisation des données par l’IA.

Prévoir un contact RGPD accessible sans connexion, notamment pour un compte bloqué ou supprimé, et une procédure de réponse aux droits. Un bouton de suppression autonome est utile mais n’est pas, à lui seul, une obligation universelle. [CNIL — information des personnes](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence), [transferts hors UE](https://www.cnil.fr/fr/transferts-de-donnees-hors-ue-le-cadre-general-prevu-par-le-rgpd).

**Terminé quand :** texte conforme au comportement réel ; suppression couvrant Auth, données applicatives, captures et liens publics, avec conservation séparée des pièces légalement requises ; purge de qualité effectivement surveillée.

### 7. Mettre le suivi marketing en conformité

**Constat code :** `src/lib/growth/client.ts` crée un identifiant persistant en `localStorage`, conserve l’origine/UTM et envoie des événements dès la visite. `src/lib/growth/events.ts` rattache ensuite les événements antérieurs au compte lors de l’inscription. Aucune garde de consentement trouvée dans ces fichiers.

Ce rattachement à un compte ne correspond pas à une simple statistique anonyme exemptée. La CNIL exclut notamment le recoupement avec d’autres traitements de l’exemption de mesure d’audience. **Conclusion tirée du code : le dispositif actuel doit être corrigé**, sous réserve de vérifier que ce même parcours est actif en production. [CNIL — règles de mesure d’audience](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ).

**Action :** bloquer ce suivi avant accord avec refus aussi accessible et retrait possible, ou le remplacer par une mesure effectivement exemptée sans rattachement individuel. Inventorier également cookies de session, préférence de langue et parrainage : leurs finalités diffèrent. Une bannière n’est pas nécessaire pour les seuls cookies strictement nécessaires.

**Terminé quand :** pas d’identifiant marketing ni de suivi soumis à consentement avant l’accord ; choix persistant, retrait fonctionnel, information publiée.

### 8. Sécuriser le cycle d’abonnement Stripe

| Risque identifié dans le code | Conséquence possible | Correction attendue |
| --- | --- | --- |
| Checkout ne vérifie pas l’existence d’un abonnement actif et n’a pas de clé d’idempotence | Deux sessions, voire deux abonnements, depuis deux onglets/appels rapprochés | Protection serveur contre la souscription simultanée ; réutilisation/idempotence du parcours. |
| Création de client Stripe concurrente possible | Clients multiples, facturation et compte applicatif mal associés | Attribution atomique/idempotente du client. |
| `subscription.updated` applique l’objet reçu ; `deleted` remet au gratuit tous les comptes du customer sans vérifier l’abonnement courant | Un événement ancien ou relatif à un ancien abonnement peut écraser les droits actuels | Vérifier l’abonnement concerné, récupérer l’état courant, sérialiser/réconcilier les événements. |
| Bonus initial et consommation de l’offre bêta uniquement dans Checkout terminé lorsque la subscription est déjà active | Activation différée : plan activé par facture, mais bonus initial et marqueur de remise potentiellement manquants | Attribuer ces droits lors de la première activation confirmée, une seule fois quel que soit l’événement. |
| Seuls `active` et `trialing` donnent Premium | Une facture échouée/passage `past_due` peut retirer immédiatement l’accès | Définir et tester la politique d’impayé, d’information client et de délai de régularisation. |
| Annulation programmée non représentée dans l’UI examinée | Informations de renouvellement trompeuses | Synchroniser et afficher statut, fin et annulation. |

Fichiers concernés : `src/lib/actions/billing.ts`, `src/app/api/stripe/webhook/route.ts`, `prisma/schema.prisma`, `src/components/account/plan-card.tsx`.

Ces points sont des risques de code, pas des incidents constatés sur des clients. La signature du webhook et l’idempotence du bonus constituent déjà une bonne base.

**Recette à effectuer en environnement de test :** souscription, double clic/deux onglets, paiement refusé, authentification bancaire, activation différée si un moyen asynchrone est autorisé, fermeture avant retour à l’app, webhook répété et désordonné, renouvellement, remise expirée, résiliation, réabonnement, remboursement et panne/reprise du webhook. Vérifier aussi l’accès après changement de plan et le maintien des données.

**Contrôles live séparés :** compte prêt à encaisser/verser, prix et coupon live, endpoint/secret webhooks live, portail live, URL de retour, identité du vendeur, reçus/factures, alertes d’échec. Aucune de ces configurations n’a été confirmée ici.

### 9. Définir une offre rentable et uniforme

**Constat code :** tarifs encore écrits dans les traductions : 19,99 €/an ; bêta 9,99 € la première année puis 19,99 €/an. Checkout utilise séparément `STRIPE_PRICE_ID_PREMIUM` et un coupon. Modifier Stripe seul laisserait donc des montants obsolètes dans l’interface.

| Plan dans le code | Bankrolls actives | Scans par période de 30 jours |
| --- | ---: | ---: |
| Gratuit | 2 | 10 |
| Testeur bêta | 4 | 50 |
| Premium bêta | Sans limite définie | 100 |
| Premium | Sans limite définie | 200 |

Bonus initial payé : 300 scans valables 30 jours, accordés une seule fois. **Décalage à arbitrer :** la réduction bêta change également le quota (100 contre 200), et le marqueur de plan bêta peut persister lorsque le coupon expire et que le tarif normal revient. La promesse « puis 19,99 €/an » doit préciser les droits correspondants ou prévoir la migration adéquate.

À 19,99 €/an, 200 scans sur douze périodes représentent environ 2 400 scans, plus 300 initiaux la première année. Le calendrier réel est de 30 jours et doit être documenté ; ce calcul est un ordre de grandeur, pas une limite annuelle exacte.

| Coût moyen hypothétique d’un scan | Coût de 2 700 scans |
| --- | ---: |
| 0,002 € | 5,40 € |
| 0,005 € | 13,50 € |
| 0,010 € | 27,00 € |

Ces coûts sont **des scénarios, pas des mesures de Kalivoa**. Ils excluent frais de paiement/Billing, TVA éventuelle, cotisations, infrastructure, support, scans gratuits et autres appels IA. Le code enregistre déjà un `costUsd` par scan ; l’utiliser pour mesurer consommation réelle, moyenne et utilisateurs intensifs, puis rapprocher les estimations des factures fournisseurs. La table locale prévoit une hausse de coût d’un modèle au 1er janvier 2027 ; vérifier ce calendrier chez le fournisseur avant d’en faire une hypothèse budgétaire.

**Action :** définir d’abord la marge cible, le coût de service et la distinction gratuit/payant ; ensuite seulement choisir annuel/mensuel et montants. Ne pas annoncer « illimité » pour les scans. Expliquer ce qu’est un scan, son coût en crédit, les échecs, la remise à zéro et l’expiration des différents lots. Garder une source commune pour prix, périodicité et quotas présentés.

### 10. Arrêter le régime de TVA et de facturation

**Constat :** Checkout ne configure pas `automatic_tax`. Cela ne prouve pas une erreur fiscale : le régime du vendeur, les prix Stripe et la configuration réelle ne sont pas connus.

**Action :** déterminer assujettissement/franchise d’ETS BELAUD, pays et type de clients, puis les règles applicables aux services électroniques et les obligations OSS éventuelles. Le seul statut SASU ne permet pas de déduire le régime de TVA. Distinguer France, autres pays de l’UE (par exemple Belgique/Luxembourg) et pays hors UE (par exemple Suisse/Canada), selon les marchés réellement ouverts. Stripe ne dispense pas de déterminer les obligations et inscriptions fiscales. Configurer les factures au nom d’ETS BELAUD avec identité, numérotation et mentions correctes ; adapter la mention d’exonération si applicable. [Service Public — factures](https://entreprendre.service-public.gouv.fr/vosdroits/F31808), [guichet TVA OSS](https://entreprendre.service-public.gouv.fr/vosdroits/R42398).

Recommandation de lancement : ouvrir les ventes en France d’abord si les autres marchés ne sont pas encore préparés, puis les ajouter pays par pays. La langue de la page ne doit pas servir de contrôle du pays de facturation.

**Terminé quand :** une facture représentative et le prix réellement débité sont vérifiés pour chaque marché ouvert. Vérifier avec le comptable les obligations de facturation électronique/e-reporting selon statut et calendrier.

### 11. Préparer la sortie de bêta et le support public

**Constat code :** Checkout et portail sont bloqués lorsque `isBetaPhaseActive()` est vrai. L’absence d’une configuration bêta terminée est traitée comme bêta active. La fin de bêta et l’ouverture des prix publics ne sont donc pas automatiquement synchronisées.

**Action :** arrêter explicitement le calendrier de sortie, le devenir des testeurs et leur offre, puis aligner page Tarifs, CGV, UI et phase backend. Vérifier confirmation email, SMTP, réinitialisation de mot de passe et délivrabilité ; un avertissement du panneau admin rappelle que la confirmation était désactivée pendant la bêta.

**Constat production :** Contact demande une connexion et annonce l’absence d’email public. Publier une adresse réellement surveillée, utilisable avant inscription et après perte d’accès. Définir qui traite bugs, facturation, rétractations et demandes RGPD.

**Terminé quand :** un nouveau client peut s’inscrire, confirmer son email, acheter et obtenir de l’aide ; les anciens testeurs savent ce qui change ; aucun texte contradictoire ne subsiste.

## P1 — confiance, qualité du produit et exploitation

1. **Expliquer le retour au gratuit.** Le code conserve accessibles les deux plus anciennes bankrolls et verrouille les suivantes. Préciser accès en lecture, export, modification et déverrouillage ; tester chaque cas. Résiliation, suppression du compte et suppression des paris doivent rester compréhensibles séparément.
2. **Clarifier indépendance et parrainages.** Les mentions et la page Bookmakers affirment une absence d’affiliation, tandis que Partenaires décrit des liens rémunérés et propose des scans liés aux parrainages. La divulgation existe déjà sur Partenaires ; harmoniser les autres textes pour expliquer indépendance du produit et éventuelle rémunération sans ambiguïté. Marquer les liens commerciaux avec `rel="sponsored"` et maintenir les conditions d’offres à jour.
3. **Valider les parrainages comme usage commercial.** Le catalogue contient Winamax, Betclic et Unibet actifs, PMU indisponible. Confirmer que les programmes autorisent la diffusion sur un SaaS et les récompenses en scans. L’offre Unibet configurée expire le 12 octobre 2026 : vérifier son extinction effective. Contrôler les opérateurs et marchés visés dans la [liste ANJ](https://www.anj.fr/offre-de-jeu-et-marche/operateurs-agrees). La compatibilité d’import avec un bookmaker ne prouve ni partenariat ni autorisation de le promouvoir dans chaque pays.
4. **Encadrer les profils et bankrolls publics.** Expliquer données publiées, visibilité/indexation, retrait et délai des caches. Prévoir signalement et retrait des contenus litigieux, règles concernant noms/photos/liens de tipsters et justificatifs contenant des données tierces. Définir précisément ce que signifie la certification et ses limites ; elle ne doit pas être comprise comme garantie de gains ou validation exhaustive d’un historique. Vérifier les obligations de plateforme si la publication de contenus utilisateurs se développe.
5. **Vérifier sauvegardes et restauration.** Tester une restauration sur une destination isolée, documenter perte de données acceptable et reprise après incident. Contrôler réellement régions, RLS, droits des clés serveur, accès admin et tâches planifiées ; les documents du dépôt ne suffisent pas à confirmer la configuration actuelle.
6. **Surveiller les événements critiques.** Alertes sur panne des scans, dépassement de coûts, erreurs Stripe/webhook, tâches de purge et emails ; contrôler le traitement de plus de 100 rapports expirés (la purge examinée traite au plus 100 rapports par passage). Documenter les incidents de données et leur évaluation RGPD.
7. **Tester l’abus et les usages intensifs.** Quotas, multi-comptes gratuits, rate limiting auth/scan, fichiers volumineux et formats invalides, publication, accumulation de brouillons. Plafonner les dépenses des fournisseurs et disposer d’un mécanisme d’arrêt des appels coûteux.
8. **Recette mobile et accessibilité.** Au clavier, avec zoom et petit écran : inscription, upload/capture, revue, abonnement, résiliation et export. Vérifier libellés, focus, contrastes, messages d’erreur et tailles tactiles. Le commerce électronique entre dans le cadre d’accessibilité applicable depuis juin 2025, avec exemptions notamment pour certains petits prestataires : déterminer l’applicabilité selon le statut et la taille. [DGCCRF — accessibilité](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/professionnels-vos-produits-et-services-doivent-etre-conformes-la-directive-accessibilite).
9. **Vérifier les droits de diffusion.** Marque Kalivoa, visuels, polices, logos bookmakers, captures d’exemple et extension. Vérifier aussi cohérence entre déclarations de confidentialité de l’extension Chrome et fonctionnement réel.
10. **Mesurer le parcours commercial avec un suivi conforme.** Visite → inscription confirmée → première bankroll → premier import validé → paiement → rétention et résiliation. Distinguer paiements encaissés, utilisateurs actifs et scans utiles. Dans le code, `cleanProperties` accepte des clés en minuscules/snake_case mais le client envoie notamment `utmSource`, `utmMedium` et `acquisitionSource` : ces propriétés sont filtrées dans les événements publics. Harmoniser le contrat pour conserver les informations autorisées, après traitement du consentement.

## P1/P2 — SEO : conserver la base et construire l’acquisition

**Résultat technique de production :** aucun HTTP non-200, canonical manquante ou H1 absent/multiple détecté sur les 44 URL du sitemap. Trois liens de langue par URL. Ce contrôle ne valide ni l’indexation Google ni toutes les données structurées.

**Correction précise :** les six URL FR/EN `privacy`, `terms` et `responsible-gambling` portent le même titre « Kalivoa » et une description générique en anglais. Donner à chacune un titre et une description adaptés à son contenu/langue. Ces pages sont utiles pour la confiance, mais leur référencement est moins prioritaire que les pages produit.

**Données disponibles :** le relevé GSC du 8 octobre rapporte **1 clic et 3 impressions** pour le 28 septembre–4 octobre. Il indique 24 pages indexées sur les 30 URL que contenait le sitemap du rapport arrêté au 4 octobre ; le sitemap de production contient maintenant 44 URL. Ne pas extrapoler « 44 indexées » à partir du nombre d’URL actuelles. Les écarts de CTR et position sur aussi peu d’impressions n’indiquent pas une tendance.

**Actions utiles :**

- Vérifier dans GSC les nouvelles URL de l’Académie, Extension et Partenaires, puis les anciennes pages signalées en doublon. Une URL détectée mais non indexée n’est pas automatiquement une erreur.
- Soumettre/vérifier le sitemap actuel et suivre les clics/impressions hors marque ; conserver des fenêtres d’observation au lieu de réécrire titres et contenus chaque semaine.
- Faire de Tarifs une page répondant réellement aux questions d’achat : comparatif, prix TTC, limites, paiement annuel/mensuel retenu, renouvellement, résiliation, coût des scans et FAQ commerciale.
- Relier les articles Académie aux fonctions correspondantes et à l’offre avec des appels à l’action pertinents. Publier des exemples reproductibles, datés, sourcés et anonymisés ; obtenir progressivement des mentions externes pertinentes.
- Contrôler les données structurées après publication des prix : aucun prix provisoire, avis inventé ou promesse non vérifiable. Mesurer les performances réelles avant d’annoncer une amélioration Core Web Vitals.
- Maintenir FR/EN cohérents : l’anglais seul ne décide pas des pays fiscalement et commercialement ouverts.

**Mon avis :** le prochain progrès SEO viendra surtout d’un contenu démontrant l’utilité, du maillage et de la notoriété. Les volumes actuels ne permettent pas encore d’optimiser sérieusement la conversion organique ou de déduire un tarif du marché.

## Ordre de réalisation recommandé

1. Compléter les coordonnées et références d’ETS BELAUD ; publier immédiatement les mentions légales réelles.
2. Fixer marchés, fiscalité, offre, quotas et marge ; choisir le médiateur ; finaliser CGV/confidentialité.
3. Corriger le suivi marketing, les protections Stripe et les parcours rétractation/résiliation ; conserver les preuves contractuelles.
4. Mettre en place support/email, sauvegardes et alertes ; recetter inscription → paiement → droits → annulation/remboursement.
5. Publier les tarifs définitifs, aligner les langues et terminer la phase bêta lors d’une ouverture coordonnée.
6. Continuer SEO, contenus de preuve et acquisition en mesurant activation et rétention.

## Informations à fournir pour rendre les corrections concrètes

- Statut et pays déjà confirmés : SASU ETS BELAUD, France. Restent à fournir : siège, capital, SIREN/RCS, coordonnées professionnelles et directeur de publication.
- Régime de TVA et clientèle/pays autorisés à l’achat.
- Offre mensuelle/annuelle souhaitée, quotas, avantages réservés aux testeurs et devenir de leurs données.
- Médiateur choisi et politique de démarrage/rétractation/remboursement.
- Email de support et responsable des demandes.
- Compte Stripe concerné et configuration live à vérifier ; fournisseurs/régions réellement actifs.

Ce rapport identifie les écarts et les vérifications nécessaires. Les documents contractuels définitifs doivent être adaptés à ces informations réelles ; aucune identité, inscription fiscale ou configuration live n’est présumée.
