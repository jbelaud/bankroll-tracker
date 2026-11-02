# Kalivoa — prestataires et suite de la recette

**Mise à jour du 12 octobre :** l’accord explicite « oui tu as mon accord » a été reçu. La base vide et son rôle limité sont créés ; la preview est déployée et les quatre offres passent avec événements signés, archives, emails simulés, résiliation et remboursement. L’accès public Vercel reste protégé. Les paragraphes d’attente ci-dessous décrivent l’état du 11 octobre et sont remplacés par le [relevé actuel](RECETTE-COMMERCIALE-KALIVOA-2026-10-12.md).

État vérifié le 11 octobre 2026. Production : Supabase. Prévisualisations : Neon. La bêta de production est toujours `ACTIVE`. Les paiements réels ne sont pas ouverts par ces travaux.

## Prestataires identifiés

| Prestataire | Usage et données | Localisation constatée | État |
| --- | --- | --- | --- |
| Supabase | Base de production, connexion, captures volontairement signalées | Projet `umyxyahkifdezohaotel`, `eu-west-1`, Irlande | Projet sain, PostgreSQL 17, forfait Free. Stockage des captures privé, limité à 8 Mo par fichier. |
| Neon | Bases de prévisualisation, séparées de la production | Connexion locale configurée en `eu-central-1` | Projet `bitter-rain-83972507`, forfait Free vérifié dans le Dashboard : une branche appelée `production`, une base, un serveur de calcul. La console est reconnectée ; l’ancien accès CLI de gestion a expiré. |
| Vercel | Hébergement et exécution du site | Déploiement de production actuel : région serveur `iad1`, États-Unis | Projet `bankroll-tracker`, équipe ETS Belaud. Les previews sont protégées par l’authentification Vercel. |
| Resend | Notifications contractuelles et de facturation | Domaine kalivoa.com configuré en Irlande | Domaine vérifié, expéditeur Kalivoa, email de test reçu. Le raccordement des nouveaux webhooks au site déployé reste à faire. |
| Stripe | Abonnements, paiements, factures et avoirs | Traitements soumis aux conditions et sous-traitants Stripe | Tests sur le seul bac à sable Kalivoa. Activation et reprise des réglages en mode réel à finaliser. |
| Google Gemini / Anthropic | Extraction et analyses IA | Région de traitement non vérifiée pour le compte effectivement utilisé | Variables Google présentes en production, Anthropic disponible dans la configuration. Facturation Google active et conditions réellement applicables restent à confirmer. |
| Google/Gmail | Réception des demandes à contact.kalivoa@gmail.com | Conditions de messagerie et transferts à vérifier | Ne pas présumer un contrat Google Workspace pour une adresse Gmail. La procédure d’archivage et d’effacement des emails de support reste à préciser. |
| OVH | Domaine et DNS | Hébergement applicatif assuré par Vercel | Les nouveaux DNS Resend sont vérifiés ; les autres enregistrements ont été conservés. |

La région d’une base ou d’un expéditeur ne prouve pas que toutes les opérations de tous les prestataires restent en Europe. Les pages de confidentialité locales distinguent maintenant explicitement Supabase en production, Neon pour les previews et Resend pour les notifications préparées.

## Contrats et transferts

Les DPA publiés par [Supabase](https://supabase.com/legal/customer-resources/data-processing-addendum), [Vercel](https://vercel.com/legal/dpa) et [Resend](https://resend.com/legal/dpa) prévoient notamment des clauses contractuelles types pour les transferts concernés. La version liée au compte ETS BELAUD, la date d’entrée en vigueur et les listes de sous-traitants doivent être conservées dans le dossier de conformité ; les pages publiques consultées ne constituent pas une preuve de signature personnalisée.

Les [conditions Gemini](https://ai.google.dev/gemini-api/terms) imposent les services payants pour une application proposée aux utilisateurs de l’EEE. Elles distinguent les usages des contenus selon le régime applicable et prévoient un traitement pour la sécurité du service. La présence d’une clé ne prouve pas l’association à un compte de facturation actif. Aucun réglage de facturation Google n’a été modifié.

## Protection de trois tables en production

Les tables de corrections de paris et de suivis (`bet_corrections`, `bankroll_follows`, `tipster_follows`) possédaient des droits Data API sans RLS. Les sondes publiques ont demandé zéro ligne, sans récupérer de données clients.

Le correctif est testé localement puis appliqué séparément par une migration Supabase : RLS activée et retrait des droits des rôles API `anon` et `authenticated`. Le serveur utilise Prisma et ses contrôles de propriété ; ces usages restent disponibles dans la recette. Après correction, les trois sondes publiques retournent 401 ; la page d’accueil reste à 200 et l’advisor ne signale plus de table publique sans RLS. La source de migration idempotente est conservée pour le prochain passage normal de Prisma.

Les messages d’advisor « RLS enabled, no policy » sont cohérents avec ces tables réservées au serveur. La protection des mots de passe compromis reste désactivée dans Supabase ; elle n’a pas été activée et doit être examinée selon les modes de connexion utilisés. [Référence de sécurité Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).

## Sauvegardes : résultat du contrôle

Le Dashboard confirme **« Free Plan does not include project backups »**. Aucune sauvegarde automatique restaurable de ce projet n’a été validée. Il faut choisir puis vérifier une sauvegarde indépendante, ou un forfait incluant les sauvegardes, avant le lancement payant. Aucun abonnement fournisseur ni option payante souscrits par l’agent.

La [documentation Supabase](https://supabase.com/docs/guides/platform/backups) recommande des exports conservés hors du projet pour le forfait gratuit. Une sauvegarde de base ne contient pas les fichiers de Storage ; les captures privées nécessitent une procédure distincte, compatible avec leur suppression après 30 jours. Les pièces comptables doivent rester récupérables sur leur durée de conservation propre.

Le relevé de structure effectué est **en lecture seule et sans lignes clients**. Il sert à valider les migrations ; il ne remplace pas une sauvegarde de données. La structure effective de production est reconstruite dans un PostgreSQL local temporaire, avec des profils fictifs. Les trois migrations prévues passent sur cette structure : offre de bienvenue, archives commerciales et restrictions d’accès. Les délais de grâce des anciens profils et supports clôturés sont préservés. Les migrations commerciales ne sont pas appliquées à la production.

## Préparation de la recette déployée

Le code autorise une recette distante uniquement avec le drapeau dédié, `VERCEL_ENV=preview`, une clé Stripe de test du bac à sable attendu, l’origine Vercel correcte, le serveur Neon attendu avec TLS, une base nommée pour cette recette et un rôle dédié, la suppression des comptes explicitement désactivée et le destinataire simulé `delivered@resend.dev`.

En recette, les destinataires réels des contrats sont conservés dans la base de test, mais les notifications vont au [simulateur Resend](https://resend.com/docs/dashboard/emails/send-test-emails). Les autres previews refusent l’envoi transactionnel. Une mauvaise isolation bloque l’envoi et le Checkout. Les refus de débit temporaires (429) restent réessayables, avec la même clé d’idempotence.

La suite sur les sources actuelles compte 83 tests réussis dans neuf fichiers, puis 32 tests réussis sur les deux modules modifiés, comprenant quatre contrôles supplémentaires d’origine, de TLS et d’isolation du nom de base et du rôle : **87 cas distincts couverts**. Les anciennes copies `.vercel` sont désormais exclues du lancement des tests pour éviter de compter des doublons obsolètes. Les six contrôles de droits API et les trois accès serveur sont également vérifiés dans la base locale jetable.

La nouvelle compilation complète passe : Next.js 16.2.11, Turbopack, compilation en 62 secondes, TypeScript en 72 secondes et génération des 17 pages statiques. La copie de compilation utilise la base PostgreSQL locale jetable et désactive les envois. Les modèles Prisma principaux sont aussi compatibles avec la copie reconstruite de la structure réelle de production après les migrations. L’apparence et les nouveaux paragraphes de confidentialité sont vérifiés dans le navigateur local.

La session de gestion Neon a expiré, mais la connexion SQL de la preview existante fonctionne. Une alternative est préparée : créer une base vide et un rôle limité sur le serveur de preview existant, en reconstruisant seulement la structure vérifiée de Supabase. Cette alternative reste une ressource persistante soumise au forfait Neon. Le contrôle d’approbation automatique a rejeté son exécution faute d’accord explicite après la question du propriétaire sur son utilité.

Le propriétaire a répondu « j’en sais rien » à la demande d’accord. Cette réponse n’est pas traitée comme une autorisation : aucune base ni aucun rôle distant créé. Les vérifications continuent en local. Le script affiche seulement sa proposition par défaut et exige `--apply` pour l’exécution, après accord. La recette distante, son déploiement et ses webhooks signés restent à finaliser avant l’ouverture payante. Le parcours navigateur complet et la livraison sur cette recette distante ne sont pas encore validés.

Le propriétaire confirme ensuite la reconnexion à la console Neon. Le Dashboard permet de vérifier le forfait Free, 35,52 Mo de stockage et 0,14 CU-heures sur octobre à cet instant. La branche existante porte le nom `production`, mais sert aux previews dans l’architecture de Kalivoa. La reconnexion n’est pas assimilée à un accord de création de ressources : la proposition reste en attente.

## Avant publication

Le checkout public demeure fermé tant que les CGV sont préparatoires. Les trois points du propriétaire restent : activation Stripe, médiateur, téléphone professionnel. À côté de ces points, il faut une sauvegarde restaurable et la validation des prestataires effectivement utilisés.

Le déploiement en production sert actuellement le commit `1fedba7…`, alors que le checkout local part de `1afb05d…` avec de nombreuses modifications en cours. Une migration déjà enregistrée en production (`20261006090000_public_tipster_profile_visibility`) est supprimée dans le dossier de travail. La publication devra conserver l’historique appliqué et intégrer les changements récents du site ; aucun déploiement global ni restauration des modifications d’autres travaux n’ont été effectués ici.
