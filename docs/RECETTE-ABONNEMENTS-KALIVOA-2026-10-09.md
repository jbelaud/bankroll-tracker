# Recette des abonnements Kalivoa — 9 octobre 2026

Compte contrôlé : **Environnement de test Kalivoa**, `acct_1T7igFDNFQcoJN1N`. Aucun paiement réel, aucune activation de production, aucun e-mail envoyé aux clients.

**Dernier état : parcours authentifié complet validé en local.** Connexion Google → abonnement mensuel standard → paiement fictif de 4,99 € dans Checkout → livraison des webhooks → Premium avec 200 scans mensuels et un seul bonus permanent de 300 scans → portail client et facture payée → annulation programmée → fin effective simulée et retour au gratuit, bonus conservé mais bloqué. Les validations publiques et live restent distinctes.

## Résultats vérifiés

| Parcours Stripe réel en bac à sable | Première facture | Renouvellement vérifié | Résiliation |
| --- | --- | --- | --- |
| Mensuel standard | 4,99 € | 4,99 € | Fin de période, aucune facture supplémentaire |
| Annuel standard | 49,99 € | 49,99 € | Fin de période, aucune facture supplémentaire |
| Mensuel bienvenue | 2,99 € | 12 factures à 2,99 €, puis 13e à 4,99 € | Fin de période, aucune facture supplémentaire |
| Annuel bienvenue | 24,99 € | 49,99 € à la deuxième année | Fin de période, aucune facture supplémentaire |

Les quatre scénarios ont créé un Checkout dont le total a été contrôlé, puis expiré ce Checkout. Les paiements et renouvellements ont été exécutés par les API Billing avec des cartes fictives et des horloges Stripe. Ce contrôle ne remplace pas un achat complet depuis un compte utilisateur dans le navigateur. Les quatre abonnements de recette sont résiliés ; les simulations seront automatiquement nettoyées par Stripe.

Preuves avec identifiants des factures : [stripe-billing-tests-2026-10-09.json](audit-commercial/stripe-billing-tests-2026-10-09.json).

**64 tests locaux passent** dans cinq suites, dont 28 tests avec PostgreSQL temporaire isolé. Ils couvrent notamment :

- Prix et coupon propres à chaque périodicité, offre réservée à la liste d'éligibilité et non réutilisable après activation.
- Refus d'un compte Stripe erroné, d'une mauvaise remise et d'une seconde souscription ; réutilisation/expiration des Checkout ouverts et paramètres de reprise idempotents.
- Signature HMAC réelle du SDK, événements Checkout synchrones/asynchrones, événements d'abonnement et de facture, réponse 500 pour provoquer une nouvelle livraison après erreur.
- Attribution atomique et unique des 300 scans, sans expiration ; 200 scans pour les deux plans payants.
- Quota mensuel consommé avant le bonus ; bonus conservé mais inutilisable au retour au gratuit, disponible au réabonnement.
- Paiement en attente sans accès Premium ni attribution du bonus ; notifications anciennes ne supprimant pas une souscription plus récente.
- Respect des échéances des anciens bonus déjà datés ; aucune remise à zéro de leur attribution historique.

Compilation de production, contrôle TypeScript et lint ciblé réussis. Le client Prisma était ancien par rapport au schéma du dossier ; ses fichiers ont été actualisés. Windows a empêché le remplacement de la DLL déjà chargée par d'autres serveurs ; les tests avec le client actualisé et la compilation passent.

## Pages mises à jour et vérifiées localement

Accueil, tarification, FAQ et espace abonnement : français et anglais. Les CGV préparatoires reprennent les mêmes montants depuis le catalogue partagé. Mentions légales, contact et confidentialité intègrent la SASU ETS BELAUD et son adresse publique contact.kalivoa@gmail.com ; le contact par e-mail est accessible sans compte. Les pages de tarification sont aussi référencées dans llms.txt. Tarifs TTC, fréquence, remise initiale et retour au prix standard, bonus unique, quota de 30 jours, non-cumul, conservation et blocage du bonus après résiliation.

Le sélecteur mensuel/annuel se trouve dans l'espace abonnement après la bêta. Les clients ayant déjà un historique Stripe peuvent retrouver le portail pour leurs factures et moyens de paiement même après retour au gratuit.

Tarification française et anglaise, accueil, CGV, mentions légales, contact et confidentialité vérifiés dans le navigateur, sans erreur console sur la tarification. À 390 px, aucune largeur excédentaire observée. Aperçus dans `audit-commercial/kalivoa-tarification-2026-10-09.png` et `kalivoa-tarification-mobile-2026-10-09.png`.

## Configuration et limites de la recette

Les clés ne figurent dans aucun document ou fichier versionné. Les identifiants publics du nouveau bac à sable ont été raccordés dans `.env.local`. Le SDK Stripe est passé à 22.6.0. Les nouveaux coupons `kalivoa_welcome_monthly_v2` et `kalivoa_welcome_yearly_v2` sont utilisés ; leur limitation au produit est vérifiée avec `expand: ["applies_to"]`. Les anciens coupons v1 avaient aussi cette restriction et restent inutilisés par le nouveau code.

Les deux prix ont `tax_behavior=inclusive`. **Stripe Tax automatique reste désactivé** : le régime et les inscriptions de TVA d'ETS BELAUD ne sont pas encore confirmés. Les simulations vérifient le montant final demandé, pas la ventilation fiscale.

Le nouveau bac à sable ne comporte **aucune destination publique de webhook**. Le secret local présent n'est pas encore attesté comme celui d'une destination créée sur ce compte. Les tests locaux vérifient le handler, mais pas une livraison réelle Stripe → URL publique → base du site.

Le site de production n'a pas été déployé pendant cette recette. La bêta gratuite et son verrou de paiement ont été conservés. La publication du contenu et l'ouverture commerciale sont deux opérations distinctes ; les achats resteront fermés tant que la bêta est active.

Avant l'ouverture : configurer et vérifier une destination de webhook pour l'environnement déployé et y refaire le parcours d'achat ; définir précisément les premiers inscrits éligibles ; compléter l'adresse du siège, le capital, l'immatriculation, le téléphone, le directeur de publication et la TVA ; finaliser CGV, rétractation, médiation et preuves de consentement ; créer les objets et secrets live séparément.

L'identité juridique complète reste nécessaire sur un site professionnel déjà publié, même avant l'ouverture des ventes : [Service Public — mentions obligatoires pour une société](https://entreprendre.service-public.gouv.fr/vosdroits/F37351). Les CGV restent une version préparatoire, avec médiateur et parcours de consentement à finaliser.

## Commandes reproductibles

- `pnpm exec vitest run src/lib/actions/billing.test.ts src/app/api/stripe/webhook/route.test.ts src/lib/billing/plans.test.ts src/lib/scan/credit-policy.test.ts src/lib/scan/credit-wallet.integration.test.ts`
- `pnpm typecheck` et `pnpm build`
- `node scripts/stripe-test-readiness.mjs` : catalogue en lecture seule, clés live refusées.
- `node scripts/stripe-billing-smoke.mjs` : crée quatre nouvelles simulations dans le seul compte de test attendu, puis les résilie ; à relancer seulement lorsqu'une nouvelle recette est nécessaire.

## Clarification des récompenses existantes

Les textes de tarification et les CGV préparatoires distinguent désormais explicitement le bonus initial de 300 scans des récompenses de parrainage et des offres partenaires/bookmakers. La restriction à un abonnement payant concerne le bonus initial ; les autres récompenses conservent leurs propres conditions. Le moteur de consommation est inchangé : priorité aux lots expirant le plus tôt, puis aux permanents, avec le bonus initial permanent en dernier.

37 tests complémentaires passent sur la priorité des crédits, leur disponibilité, le catalogue partenaires et les paliers de parrainage. Les conditions corrigées ont été vérifiées dans le navigateur local et enregistrées dans `audit-commercial/kalivoa-regles-scans-2026-10-09.png`.

## Livraison réelle du webhook — recette locale

Le relais officiel Stripe CLI 1.53.1 transmet maintenant les événements du bac à sable au handler réel du projet, relié à une base PostgreSQL temporaire vide. La signature invalide est rejetée avec HTTP 400. Les événements réels `invoice.paid`, `customer.subscription.created`, `customer.subscription.updated` et `customer.subscription.deleted` ont chacun reçu HTTP 200.

Une facture fictive de 4,99 € a activé Premium et attribué une seule fois les 300 scans sans expiration. La résiliation en fin de période conserve l’accès payant ; la résiliation effective remet le profil au gratuit en conservant les 300 scans marqués comme réservés à un plan payant. Le profil utilisé est une fixture dans la base temporaire. Aucun abonnement de membre en production n’a été modifié.

Preuves : [stripe-webhook-real-delivery-2026-10-09.json](audit-commercial/stripe-webhook-real-delivery-2026-10-09.json). Ce premier passage validait la transmission Stripe → application → base locale avec une fixture ; le parcours authentifié complémentaire décrit ci-dessous est maintenant terminé.

Le mode `start-root` de `scripts/stripe-e2e-local.mjs` utilise directement les sources du projet avec les variables de recette transmises uniquement au processus du serveur. Il ne réécrit pas `.env.local`. Les secrets et l’état de la base restent dans `.vercel`, exclu de Git. Une destination publique pour le déploiement et les variables live restent à configurer séparément.

### Retour Google vers la production à vérifier

La tentative de connexion Google effectuée par l’utilisateur depuis la recette locale a abouti sur le domaine de production. Le parcours de recette demande `http://localhost:3013/auth/callback?next=%2Ffr%2Fdashboard`. Le code de connexion par mot de passe utilise une redirection interne et le proxy ne canonicalise pas `localhost`.

Le tableau de bord Authentication → URL Configuration confirmait quatre retours autorisés : le callback local sur le port 3000, le callback de production et deux adresses du déploiement preview. Le port 3013 utilisé pour la recette était absent. Après confirmation explicite de l’utilisateur, `http://localhost:3013/auth/callback` a été ajouté : le tableau affiche cinq adresses et confirme l’enregistrement. La Site URL reste `https://kalivoa.com`.

La tentative suivante est revenue en production avec `bad_oauth_state` / `OAuth state has expired`. Le contrôle officiel Supabase (`internal/utilities/request.go`, `IsRedirectURLValid`) compare les motifs autorisés à l’URL complète, sans son fragment : le paramètre `next` doit donc aussi correspondre. La première adresse ajoutée était incomplète pour le flux actuel.

Le même callback local, sous sa forme exacte `http://localhost:3013/auth/callback?next=%2Ffr%2Fdashboard`, est maintenant également enregistré (six adresses au total). Aucune ouverture à un autre domaine ou à un autre chemin n’a été ajoutée. Une nouvelle connexion Google a ensuite abouti sur `http://localhost:3013/fr/dashboard`, et l’achat complet a pu être réalisé. Capture du réglage enregistré : `audit-commercial/supabase-retour-local-configure-2026-10-09.png`.

## Achat authentifié dans le navigateur — terminé

Le compte habituel choisi et connecté par l’utilisateur a été créé uniquement dans la base applicative temporaire. Depuis l’espace Abonnement, le bouton de paiement a créé le Checkout `cs_test_a1wPPON8UAqz5KHqBo2VCclslL8Z1qi9eMth1gig4ZYYVIJ6YkxPqDo1jL`. Stripe a confirmé `livemode: false`, 499 centimes EUR, `complete` et `paid`, avec une carte fictive et une adresse de recette.

Le retour a abouti sur `http://localhost:3013/fr/account/subscription?checkout=success`. L’application affichait Premium et 500 scans : 200 mensuels, 300 permanents. La base confirme un seul lot INITIAL de 300 scans, sans échéance, réservé à un plan payant. Les trois événements Checkout terminé, facture payée et abonnement créé ont reçu HTTP 200.

Le portail ouvert depuis l’application affichait la facture payée de 4,99 €, la carte fictive et l’abonnement mensuel. La résiliation a été effectuée depuis ce portail et confirmée pour le 9 novembre 2026 ; Stripe la représente par `cancel_at`, tandis que `cancel_at_period_end` reste faux. Le plan demeure Premium jusqu’à la fin effective.

La fin effective a ensuite été simulée en résiliant immédiatement le seul abonnement de cette recette après contrôle du compte de test, du propriétaire et des métadonnées. Son webhook a été livré avec HTTP 200. La page locale affiche désormais Freemium, 10 scans disponibles et le message « 300 scans du bonus permanent sont conservés. Réactivez un abonnement payant pour les utiliser. » Le portail a été rouvert depuis ce forfait gratuit et donne toujours accès à la facture payée. Aucun renouvellement de cet abonnement de test ne reste actif.

Preuves : [stripe-browser-purchase-2026-10-09.json](audit-commercial/stripe-browser-purchase-2026-10-09.json), captures `kalivoa-premium-apres-checkout-2026-10-09.png` et `kalivoa-bonus-conserve-apres-resiliation-2026-10-09.png`. L’achat mensuel standard est validé par le navigateur ; les prix annuels et les offres de bienvenue restent couverts par les recettes API distinctes déjà réussies. La destination publique de webhook et l’ouverture live ne sont pas validées par ce test local.

Observation annexe : au premier retour Google dans la base vide, l’enregistrement analytique `signup_completed` a rencontré une contrainte de clé étrangère avant la création du profil applicatif. L’erreur est absorbée et n’a pas bloqué la connexion ou l’achat ; l’ordre de création et la distinction connexion/inscription restent à revoir pour fiabiliser les statistiques d’acquisition.

## Rappels de renouvellement par e-mail

Dans le seul bac à sable Kalivoa, les e-mails Stripe concernant les renouvellements à venir sont désormais activés avec un délai de **45 jours** et un lien vers le portail client pour gérer ou résilier l’abonnement. Les paramètres ont été enregistrés puis confirmés après rechargement du Dashboard. Aucun système d’envoi applicatif supplémentaire n’a été ajouté.

La documentation officielle Stripe précise que ces rappels concernent les abonnements prélevés automatiquement. En sandbox, l’envoi est limité aux adresses appartenant à un domaine vérifié ou à un membre actif de l’équipe. La réception effective d’un e-mail n’a pas été vérifiée pendant cette configuration. Le réglage live doit être repris et vérifié avant lancement. Un rappel distinct de fin d’accès après une résiliation n’est pas implémenté par cette modification.

Pour les contrats annuels concernés par la tacite reconduction, le délai choisi se situe entre un et trois mois avant l’échéance. Le contenu exact du message, la date limite de non-reconduction et le lien de résiliation restent à vérifier au regard de l’article L215-1 ; cette configuration seule ne constitue pas une validation de conformité juridique.

Sources : [Stripe — Customer emails](https://docs.stripe.com/billing/revenue-recovery/customer-emails), [Code de la consommation — tacite reconduction](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069565/LEGISCTA000032221235/). Preuves : [stripe-email-reminders-2026-10-09.json](audit-commercial/stripe-email-reminders-2026-10-09.json) et `audit-commercial/stripe-rappels-annuels-2026-10-09.png`.

## Attribution de l’offre de bienvenue — mise à jour

Page dédiée : `/fr/offre-bienvenue` et `/en/offre-bienvenue`. Tarifs partagés avec le catalogue : 2,99 € TTC/mois pendant douze mois puis 4,99 €, ou 24,99 € TTC la première année puis 49,99 €/an. Le coupon est appliqué automatiquement, sans code promo à saisir. L’offre est marquée utilisée après activation payante et ne peut pas être reprise au réabonnement.

L’offre est réservée aux bêta-testeurs, dont l’éligibilité est conservée après retour au gratuit, et aux **15 premiers nouveaux comptes hors bêta après sa clôture**. Les comptes administratifs ne consomment pas de place. Une place est attribuée à la création du profil applicatif sous verrou transactionnel ; les inscriptions répétées ou simultanées ne la multiplient pas, et la suppression d’un compte ne remet pas sa place en circulation. La liste historique BETA_TESTER_EMAILS reste prise en charge. Le lien public ne donne pas la réduction à un compte non éligible.

Souscription avant le **31 décembre 2026 à 23 h 59 (Europe/Paris)**, sans raccourcir une durée promotionnelle déjà activée. La vérification serveur refuse les nouvelles remises à partir du 1er janvier 2027 à minuit à Paris. Les Checkout créés dans les dernières 24 heures sont plafonnés à cette échéance. Stripe impose une durée minimale de 30 minutes : aucun nouveau Checkout promotionnel n’est créé dans les 30 dernières minutes, mais les sessions déjà ouvertes restent utilisables avant leur expiration.

Pendant la bêta gratuite, les achats restent bloqués jusqu’à la décision de l’administrateur. La page affiche cette attente et permet de retrouver son compte. La clôture administrative de la bêta conserve désormais l’éligibilité des participants lorsqu’elle les remet au gratuit.

**76 tests ciblés réussis**, puis **50 tests des fichiers ajustés à nouveau réussis** : concurrence réelle de 20 inscriptions (15 places), répétition d’un même profil, conservation de l’éligibilité bêta, suppression de compte, migration sur données antérieures et échéance de Paris. TypeScript, lint ciblé et compilation de production réussis. Les anciennes copies sous .vercel sont exclues de cette recette de tests.

Le parcours authentifié annuel a confirmé un Checkout de test à 24,99 €, avec l’annonce de 49,99 €/an à partir de l’année suivante. Aucun paiement n’a été soumis ; le Checkout a été expiré après vérification. Preuve : [welcome-offer-checkout-2026-10-09.json](audit-commercial/welcome-offer-checkout-2026-10-09.json). La base temporaire de recette a ensuite été rendue à la bêta gratuite, avec le compteur des nouvelles places à zéro.

La page a été vérifiée en français et en anglais avec la bêta active, sans erreur console. Aperçu : `audit-commercial/kalivoa-offre-bienvenue-2026-10-09.png`.

**Avant publication** : appliquer la migration Prisma `20261009190000_welcome_offer_enrollment` à la base cible, puis déployer les sources relues. La migration est additive et reprend les participants bêta existants ; seule une base PostgreSQL temporaire a été modifiée pendant cette recette. La page n’est pas encore publiée sur kalivoa.com et aucun e-mail de campagne n’a été envoyé.
