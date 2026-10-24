# Choix des e-mails Kalivoa — livraison locale du 24 octobre 2026

## Expérience prévue

- Inscription et connexion par Google ou e-mail : même choix facultatif après authentification, dans l'application. Aucune autorisation marketing déduite de Google OAuth.
- Première visite sans choix connu : carte non bloquante, case décochée, boutons Enregistrer mon choix et Non merci. Continuer à utiliser l'application reste possible sans répondre.
- Refus explicite : carte masquée aux visites suivantes. Un simple affichage ou une absence de réponse ne crée aucun accord.
- Mon compte > Profil : modification libre du choix. Retirer l'accord ne désactive pas les e-mails nécessaires au compte ou à la sécurité.
- Comptes existants : aucune reprise ni inscription automatique. Même invitation facultative.
- Changement d'adresse : un accord pour l'ancienne adresse n'abonne pas la nouvelle adresse ; nouveau choix demandé.
- Textes français et anglais. Texte d'accord versionné `2026-10-24-v1`.

## Stockage et sécurité

Migration additive : `prisma/migrations/20261024120000_email_marketing_preferences/migration.sql`.

Tables dédiées `email_marketing_preferences` et `email_marketing_choices` : choix courant et journal des acceptations/retraits, date serveur, adresse concernée, version et texte présenté, langue et source. Aucun contenu de pari n'est transmis. Écriture atomique sous verrou de l'utilisateur ; choix identique sans nouvel événement ni remplacement de la date de preuve. Suppression du compte : suppression liée de ces données.

RLS activée ; aucun accès pour PUBLIC, anon ou authenticated ; accès uniquement par le serveur. La Server Action vérifie la session et n'accepte pas d'identifiant utilisateur fourni par le formulaire. Aucun envoi Resend, import de contacts ni programmation automatique.

L'envoi d'une campagne devra vérifier juste avant l'expédition : choix actif pour l'adresse actuelle, adresse confirmée, absence de désinscription/rebond/plainte, exclusion des comptes internes/de test. Le mécanisme de désinscription sans connexion dans les e-mails reste à réaliser avant une campagne ; le réglage du compte n'en tient pas lieu.

## Vérifications

- 11 tests ciblés réussis (action serveur et stockage).
- 4 tests réussis sur PostgreSQL temporaire local : aucune reprise des anciens comptes, acceptation/retrait/nouvel accord, idempotence concurrente, interdiction de lecture et falsification pour les rôles navigateur.
- `tsc --noEmit --pretty false` : réussi.
- Revue React Best Practices : composants au niveau module, authentification serveur, libellés accessibles, erreur et confirmation annoncées, état pending bloquant les doubles soumissions, aucune mutation de consentement au rendu ou dans un effet.
- ESLint ciblé n'a pas pu démarrer : dépendance locale @babel/types introuvable dans l'installation existante. Aucun paquet modifié pour contourner ce problème.

## État de livraison

**Développé et testé localement, pas encore déployé.** Migration non appliquée à Supabase de production. Les comptes actuellement en ligne n'ont pas été modifiés.

Le checkout comporte de nombreuses autres modifications et fichiers non suivis antérieurs. Ne pas déployer tout le dossier. Intégrer ce changement dans une livraison isolée correspondant à la version en production, appliquer la migration additive avec le processus Prisma du projet, vérifier droits RLS et tables, puis vérifier les parcours e-mail et Google sur un compte de test. Ne jamais publier le code avant que les tables soient disponibles : le layout authentifié lit la préférence.

Aucun e-mail promotionnel envoyé et aucune offre commerciale modifiée.

## Actualisation — publication sur master du 24/10

Le changement a été isolé depuis origin/master df3ea174 afin de conserver les autres travaux locaux. La migration additive a été appliquée à Supabase umyxyahkifdezohaotel avant le push et enregistrée dans le journal Prisma avec son empreinte SHA-256. Les deux tables ont RLS activée et aucun accès navigateur ; elles sont vides, aucun compte préinscrit. Aucun e-mail envoyé ni programmé.

Sur cette copie propre : 15 tests réussis, dont 4 sur PostgreSQL temporaire ; ESLint ciblé réussi. Les types de routes sont générés avant la vérification TypeScript. L'indication de livraison locale ci-dessus décrit l'état antérieur à cette préparation de publication.
