# Phase 1 — Lots de scans Kalivoa

## Comportement

Les lots constituent la source de vérité. Le solde disponible est calculé à partir
des quantités attribuées, consommées, réservées et révoquées, des échéances et des
conditions du plan. Aucun solde global indépendant n'est ajouté.

- Types : mensuel, initial, parrainage, partenaire, promotionnel.
- Priorité : échéance la plus proche, puis attribution la plus ancienne, puis
  identifiant stable. Les crédits sans expiration passent ensuite ; les crédits
  initiaux permanents sont les derniers utilisés.
- Quotas inchangés : FREE 10, BETA_TESTER 50, BETA_PREMIUM 100, PREMIUM 200.
- Les fenêtres mensuelles restent de 30 jours. Après expiration, un lot actif
  renouvelé est disponible ; sa période commence à sa première utilisation.
  `periodStartedAt` est distinct de `grantedAt`. Il n'y a aucun report.
- Une baisse de plan limite les scans mensuels admissibles selon les usages de la
  période, sans réinitialiser cette période. Une hausse augmente le quota du même
  lot ; cette évolution est journalisée.
- Le bonus d'import de 300 scans reste unique par compte, valable 30 jours et
  utilisable avec un plan payant. Aucun nouveau bonus d'inscription n'est activé.
- Les règles et la pause du parrainage bêta restent inchangées. Chaque nouvelle
  récompense a son propre lot lié à `ReferralReward`.
- Les alertes concernent les échéances à sept jours ou moins. Les nombres par
  origine et les nombres par durée se recoupent : ils ne doivent pas être ajoutés
  entre eux. Le total correspond à la somme des lots admissibles.

## Transactions et journal

Chaque auteur de mouvements verrouille l'utilisateur avant de lire son solde.
Les bénéficiaires multiples sont verrouillés dans un ordre stable. L'appel IA ne
garde aucun verrou ouvert. Le résultat READY et la confirmation de consommation
sont enregistrés dans une seule transaction.

Les réservations identifient le lot, la requête et, pour l'API, la capture en cours.
La restitution est idempotente, rend le scan au lot original et ne prolonge pas
son expiration. Une restitution d'un lot révoqué ne réactive aucun scan. Un scan
réservé avant l'expiration peut terminer son analyse dans son délai de réservation.

Une réservation abandonnée est restituée après quinze minutes, au prochain accès
au portefeuille ou par le cron existant. Sa confirmation tardive est refusée.
Les validations de parrainage échouées restent rejouables par ce même cron.

`ScanCreditMovement` trace MIGRATE (solde d'ouverture), GRANT, ADJUST_QUOTA,
RESERVE, CONSUME, RELEASE et REVOKE. Les contraintes SQL interdisent les quantités
négatives, les dépassements, plusieurs lots mensuels actifs et les doublons de
déclencheur ou de droit. Les nouvelles tables sont protégées par RLS et ne sont
pas accessibles aux rôles navigateur `anon` et `authenticated`.

Les événements d'attribution, de validation et d'utilisation de scans offerts
sont conservés dans le système interne GrowthEvent. L'événement navigateur
d'affichage de l'alerte ne contient aucun solde ni date d'expiration.

## Attribution depuis un partenaire

Le service `grantScanBatch` est exclusivement serveur. Il ne doit être appelé
qu'après validation de l'action par une source fiable (webhook authentifié,
validation serveur ou administration autorisée). Aucun endpoint public de
réclamation arbitraire n'est ajouté pendant la phase 1.

Pour un partenaire, utiliser :

- `partnerId` : identifiant du partenaire confirmé ;
- `campaignId` : campagne ou offre concernée ;
- `grantKey` : clé stable de l'action validée, par exemple `partner:<id>:action:<id>` ;
- `entitlementKey` : portée stable du droit, par exemple `partner:<id>:offer:<id>`
  pour une attribution par utilisateur et par offre, ou `partner:<id>` si la
  limite s'applique au partenaire entier ;
- quantité, conditions, cumulabilité et expiration issues de l'offre côté serveur.

Les valeurs ne doivent jamais venir de paramètres client non vérifiés. Une
nouvelle clé de validation ne contourne pas une clé de droit déjà utilisée.
Aucune offre, campagne publique ou page Partenaires n'est créée par cette phase.

## Migration et mise en service

Migration additive : `20261001200000_scan_credit_batches`. Elle ajoute trois
tables, les enums et `users.scanWalletMigratedAt`, sans supprimer les champs ni
les récompenses historiques. La reprise est réalisée une seule fois par compte,
dans une transaction sous verrou, au premier accès au nouveau service.

1. Sauvegarder la base et vérifier les compteurs historiques, notamment les
   valeurs négatives, les dates incohérentes et les crédits initiaux sans date.
2. Suspendre les nouveaux scans et les mutations de récompenses pendant la
   bascule ; laisser terminer les requêtes déjà en cours. Les webhooks Stripe
   doivent être rejoués après cette fenêtre de maintenance.
3. Appliquer `pnpm exec prisma migrate deploy` sur l'environnement choisi.
4. Régénérer le client Prisma et déployer ensemble tous les appelants modifiés.
   Ne pas faire cohabiter l'ancien service de compteurs et le nouveau service.
5. Rouvrir le service et contrôler les totaux d'un compte gratuit, d'un compte
   payant et d'un compte avec crédits historiques de parrainage.

La migration a été validée dans une base PostgreSQL locale isolée ; elle n'a pas
été appliquée à la base déployée. La suite complète passe avec 372 tests, et la
compilation de production, le contrôle TypeScript et ESLint ont réussi.

Sur ce poste Windows, la régénération complète du client Prisma rencontre un
verrou sur sa DLL (`EPERM`). Avant la mise en service, arrêter proprement les
processus locaux qui utilisent Prisma puis relancer `pnpm exec prisma generate`.
Les modèles générés ont bien été utilisés par les tests et la compilation ;
ce verrou local ne dispense pas de réussir cette commande dans l'environnement
de déploiement.

Les compteurs anciens sont conservés comme projection de compatibilité et sont
mis à jour depuis les lots. Ils ne sont plus lus comme solde après la reprise.
Un retour arrière exige un arrêt des écritures et une réconciliation de cette
projection, notamment pour les nouveaux crédits partenaires/promotionnels que
l'ancien modèle ne pouvait pas représenter. Restaurer seulement une sauvegarde
ancienne ferait perdre les mouvements effectués depuis : ce n'est pas une
procédure de retour arrière valide.

### Limite de l'historique de parrainage

Les anciennes consommations ne précisent pas quelle récompense elles ont utilisée.
Le solde restant devient donc un lot `LEGACY_REFERRAL_BALANCE`. Le journal des
récompenses reste intact ; leurs montants complets ne sont jamais recrédités.

Une annulation d'une ancienne récompense dont des crédits de reprise subsistent
est refusée avec un message explicite. L'administrateur doit vérifier cette
ambiguïté avant de décider d'un ajustement, afin de ne pas supprimer les scans
issus d'autres récompenses. Les nouvelles récompenses sont révocables précisément
lot par lot, uniquement pour leurs crédits encore disponibles.

## Validation

`pnpm test` inclut les tests unitaires, le rendu français/anglais et les tests
PostgreSQL réels. PostgreSQL embarqué est une dépendance de développement : il
crée une base locale temporaire, uniquement sur 127.0.0.1, puis l'arrête et la
supprime. Aucun test n'utilise la connexion de production pour ses mutations.
Les scripts des binaires approuvés sont listés dans `pnpm.onlyBuiltDependencies`.

Les tests couvrent les cinq types, les soldes de reprise, les paliers de parrainage,
les échéances, les permanents, les quotas, vingt réservations simultanées, les
doublons, les restitutions répétées et tardives, les révocations, les changements
de plan, les contraintes SQL et l'absence d'accès public aux tables.

## Fichiers concernés

- Données : `prisma/schema.prisma`, migration ci-dessus.
- Comptabilisation : `src/lib/scan/credit-wallet.ts`, `credit-policy.ts`,
  `quota-config.ts`, `monthly-quota.ts`, `credit-priority.ts`.
- Parcours : `src/app/api/scan/route.ts`, `src/app/api/stripe/webhook/route.ts`,
  `src/app/api/cron/scan-quality-retention/route.ts`.
- Parrainage : `src/lib/referral/service.ts`, `overview.ts`,
  `src/lib/actions/referrals.ts`.
- Affichage : `src/components/account/scan-credit-summary.tsx`,
  `src/components/dashboard/quota-card.tsx`, pages compte/abonnement et dashboard.
- Traductions et événements : `messages/fr.json`, `messages/en.json`,
  `src/lib/growth/events.ts`.
- Validation : tests de politique/priorité, tests PostgreSQL du portefeuille,
  tests du rendu, tests du service de parrainage et des quotas des plans.
- Dépendance de test : `package.json`, `pnpm-lock.yaml`.
