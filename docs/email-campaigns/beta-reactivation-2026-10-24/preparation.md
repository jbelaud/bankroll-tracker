# Réactivation bêta — préparation du 24 octobre 2026

## Statut

**PRÉPARÉE — ENVOI DÉSACTIVÉ.** Aucun e-mail envoyé, programmé ou ajouté à une file de traitement. Aucune donnée utilisateur modifiée, aucune adresse importée dans Resend. Aucune offre commerciale ou date de fin appliquée en base.

**Confirmation de Jeremy le 24/10 : aucun consentement nouveautés/offres n'a été mis en place.** Le brouillon promotionnel reste non envoyable pour cette audience sur les éléments disponibles ; ne pas importer les comptes comme abonnés et ne pas marquer un consentement rétroactivement. Préparer à la place le recueil facultatif dans le produit. Une notification de fin effective de bêta ne sera envisageable qu'avec date et conséquences réelles confirmées, sans offre, urgence commerciale ni invitation à utiliser davantage le service. Ne pas recycler la campagne de réactivation en notification de service.

## Contrôles réels, en lecture seule

Projet Supabase vérifié : `umyxyahkifdezohaotel`, tables applicatives users/bankrolls/bets et beta_program. Résultats agrégés uniquement ; aucune liste nominative exportée.

| Plan | Comptes | Adresse confirmée | Comptes avec au moins un pari |
|---|---:|---:|---:|
| BETA_TESTER | 37 | 35 | 14 |
| BETA_PREMIUM | 6 | 6 | 6 |
| FREE | 3 | 3 | 2 |

Ces effectifs ne sont pas les nombres de destinataires autorisés. Ils peuvent inclure des comptes internes ou de test. Deux comptes BETA_TESTER sans adresse confirmée sont à exclure de la campagne. Aucun compte supprimé/banni trouvé dans ces trois groupes au contrôle. Le statut d'adresse confirmée prouve seulement la vérification de la boîte, pas un accord marketing.

Programme bêta : `global`, phase `ACTIVE`, `endedAt=null`. Le 27 novembre 2026 est la cible annoncée par Jeremy, pas une date déjà programmée dans le produit.

Resend : domaine kalivoa.com `verified`, envoi activé, région eu-west-1 ; suivi des ouvertures et clics désactivé. Aucun contact et aucune suppression retournés. L'absence de suppression n'est pas une preuve d'absence de rebond historique ou de consentement.

Aucun champ marketing/newsletter/désinscription repéré dans les colonnes publiques ; le consentement `scan_quality_reports.consentedAt` concerne le signalement de scans, pas la prospection. Le formulaire d'inscription local ne présente pas d'option d'inscription marketing. Les éventuels accords externes restent à vérifier avec Jeremy.

## Ciblage préparé

1. BETA_TESTER : adresses confirmées uniquement ; retirer comptes internes/de test, opposition, rebond et plainte ; vérifier la base permettant la relance promotionnelle pour chacun.
2. BETA_PREMIUM : groupe distinct. Vérifier d'abord les engagements individuels et droits déjà accordés ; ne pas annoncer une fin d'accès identique par défaut.
3. FREE : exclu de ce premier lot tant que l'éligibilité bêta n'a pas été vérifiée.
4. Aucun envoi à un utilisateur non éligible pour lui demander de consentir à cette promotion par e-mail.

La requête `audience-counts.sql` est en lecture seule et ne produit que des nombres. Une extraction nominative ou un import Resend n'a pas été réalisé.

## Message préparé

Complément demandé par Jeremy : deux paragraphes ajoutés au texte et à la maquette pour tester la certification côté tipsters et consulter les statuts côté parieurs. Ne pas présenter une bankroll en observation comme certifiée ; vérifier les statuts publics avant toute illustration nominative. Aucun exemple certifié disponible n'est affirmé dans cette préparation.

Une case de consentement dans ce premier e-mail promotionnel ne régularise pas rétroactivement son envoi. Prévoir le recueil facultatif dans le produit, avec date/version du texte et retrait possible ; aucune case précochée, aucun consentement inféré de l'absence de réponse. Pas de nouvelle liste importée ni d'envoi.

Objet : **Kalivoa : profite encore de la bêta gratuite**

Pré-en-tête : Teste un ticket et partage ton retour avant la fin de bêta prévue le 27 novembre.

Corps : `email.txt`. Maquette autonome : `apercu.html`.

Expéditeur proposé, à valider : Jeremy — Kalivoa <notifications@kalivoa.com>. Domaine vérifié ; adresse précise et configuration d'envoi à confirmer avant test. Réponse : contact.kalivoa@gmail.com.

La réduction est annoncée sans montant inventé. Les conditions (prix initial, renouvellement, durée, éligibilité) seront précisées avant vente. La date du 27/11 est formulée comme prévision. Aucun débit ou abonnement automatique n'est annoncé ou déclenché.

## Ce qui reste à faire avant un envoi réel

- Établir les consentements/éligibilités, y compris preuves externes si disponibles. La simple inscription n'est pas un consentement marketing.
- Préparer une désinscription effective. La maquette comporte un marqueur explicite `{{UNSUBSCRIBE_URL}}` ; ce n'est pas un lien fonctionnel et le fichier ne doit pas être envoyé tel quel.
- Confirmer la date et les conditions applicables aux bêta-testeurs, en séparant BETA_PREMIUM.
- Retirer comptes internes/de test et vérifier oppositions, rebonds, plaintes ; recontrôler juste avant envoi.
- Faire valider le rendu et un test à Jeremy, puis obtenir son accord sur la liste et l'envoi collectif.

Ne pas utiliser `transactional_emails` pour cette préparation : le traitement existant expédie automatiquement les lignes PENDING/FAILED. Ne pas classer la promotion comme e-mail transactionnel pour contourner le ciblage.

## Sources de référence

- https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique
- https://www.cnil.fr/fr/communication-electronique-quelles-regles
- Schéma Supabase actuel ; code local prisma/schema.prisma, src/components/auth/signup-form.tsx et src/lib/billing/transactional-emails.ts.

## Mesure envisagée

Utilisateurs revenus et premier pari enregistré dans les sept jours suivant l'envoi ; réponses utiles, désinscriptions et rebonds. Aucun suivi d'ouverture activé. Le lien de la maquette est un lien public sans identifiant personnel ni nouvelle mesure ajoutée.
