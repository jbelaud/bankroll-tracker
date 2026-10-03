# Déclarations de parrainage bookmaker

Les membres déclarent leur inscription depuis **Partenaires**, après avoir utilisé un lien ou un code Kalivoa. Un clic ou une déclaration n'attribue aucun scan.

## Parcours membre et administration

- Le formulaire demande le pseudo chez le bookmaker, la date d'inscription et un message facultatif.
- Le bénéficiaire vient de la session vérifiée. Le navigateur ne choisit ni la quantité ni la campagne ni le destinataire de l'email.
- Une déclaration par compte Kalivoa et par campagne bookmaker ; les déclarations concurrentes sont sérialisées sous le verrou du compte.
- Le membre voit les statuts « En attente de validation », « Informations demandées », « Parrainage validé » et « Demande refusée ».
- **Administration → Parrainages bookmakers** mène à `/fr/admin/partners` ou `/en/admin/partners`. Le compteur de demandes à vérifier s'actualise toutes les 30 secondes lorsque la page est visible.
- L'administrateur vérifie le rapprochement avec le bookmaker et la réception de sa récompense, puis choisit « Valider et offrir 30 scans », « Demander un complément » ou « Refuser ».
- Un refus ou une demande de complément exige un motif. Le membre peut compléter uniquement une demande dans l'état `NEEDS_INFO` ; une révision protège contre une décision sur une ancienne version.
- Une validation ajoute un lot `PARTNER` permanent, marque la demande validée et crée l'email dans **la même transaction**. Un double clic ne recrée rien.
- Les demandes déposées avant la fin de l'offre restent validables ensuite. Le nom du partenaire, la quantité, les conditions et la date de fin sont figés lors de la déclaration.
- Les récompenses se cumulent entre bookmakers. La même offre ne donne jamais une seconde récompense au même compte.
- Le journal conserve les déclarations, compléments et décisions. Les tables ne sont pas accessibles par les rôles Supabase `anon` ou `authenticated` ; les lectures passent par les services serveur authentifiés.

## Email transactionnel

L'email est envoyé après validation, à l'adresse du membre enregistrée côté serveur. Il indique le bookmaker, la quantité de scans permanents et un lien vers **Mes scans**. Les versions française et anglaise utilisent la langue de la déclaration.

Configurer dans l'environnement de déploiement :

| Variable | Valeur attendue |
| --- | --- |
| `RESEND_API_KEY` | Clé serveur Resend, sans préfixe `NEXT_PUBLIC_` |
| `PARTNER_EMAIL_FROM` | Expéditeur autorisé sur un domaine vérifié, par exemple `Kalivoa <scans@domaine-verifie.fr>` |
| `NEXT_PUBLIC_APP_URL` | Origine publique de Kalivoa, normalement `https://kalivoa.com` |
| `CRON_SECRET` | Secret existant de la tâche de maintenance quotidienne |

Aucune clé ni adresse d'expéditeur fictive n'est configurée en production par le code. L'administration affiche une indication si l'envoi n'est pas configuré. Les validations ajoutent tout de même les scans et conservent les emails en file.

La file persistante `partner_reward_emails` protège les envois concurrents par une réservation limitée à 60 secondes. Une clé d'idempotence Resend et un contenu stable permettent de reprendre un envoi incertain dans sa fenêtre de validité. Les emails en attente ou en échec sont repris par la tâche quotidienne existante et peuvent être relancés dans l'administration, sans recréditer de scans.

Resend conserve ses clés pendant 24 heures. Après 23 heures sans confirmation d'un envoi tenté, la file passe à `NEEDS_REVIEW` plutôt que de risquer un renvoi automatique. L'administration demande alors de vérifier l'historique chez le prestataire avant un renvoi explicite. `SENT` signifie accepté par Resend, sans garantie que le message soit arrivé dans la boîte de réception.

Références : [API d'envoi Resend](https://resend.com/docs/api-reference/emails/send-email), [clés d'idempotence](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Migration et mise en ligne

Migration additive : `prisma/migrations/20261003110000_partner_referral_claims/migration.sql`.

Elle ajoute trois tables et deux énumérations, sans modifier les paris, bankrolls, abonnements ni scans existants. Elle active RLS, retire l'accès aux rôles publics et lie chaque validation à son lot de scans.

Appliquer la migration sur la destination explicitement vérifiée **avant** de déployer le code qui lit les demandes. Le fichier `.env.local` peut viser Neon Preview ; le fichier `.env` peut viser Supabase Production. Ne pas confondre les deux destinations. Aucun `migrate reset` ou `db push` ne doit être utilisé en production.

## Vérifications

Les tests PostgreSQL isolés couvrent les demandes répétées, l'attribution exactement une fois, les décisions périmées, l'accès au seul propriétaire, les compléments, les refus, la validation après expiration, le rollback transactionnel, les emails concurrents, les reprises après panne et la suppression d'un compte. Les tests d'actions vérifient les sessions et les droits administrateur avant toute écriture.

Le 3 octobre 2026 : 436 tests dans 79 fichiers réussis, dont les 15 tests PostgreSQL de ce parcours ; TypeScript, ESLint et compilation de production réussis. Le navigateur a vérifié la déclaration, le complément, la validation et le solde de 30 scans sur une base temporaire avec des comptes fictifs, ainsi que les onglets mobiles et le modèle d'email. Aucun email réel n'a été envoyé.

La migration a été appliquée sur Supabase Production le même jour. Les trois tables sont lisibles par le serveur, avec RLS activé et sans accès public. Aucune déclaration ni récompense fictive n'a été créée en production. L'activation de l'envoi réel nécessite les variables Resend et un expéditeur vérifié indiqués ci-dessus.
