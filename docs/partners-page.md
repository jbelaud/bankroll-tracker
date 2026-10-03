# Phase 2 — Les partenaires Kalivoa

## Page et contenu

Présentation publique `/fr/partenaires`, traduction `/en/partenaires`, accessible
depuis le menu et le pied de page. Elle explique le concept et les avantages,
avec deux onglets et des aperçus, puis invite à ouvrir un compte Kalivoa ou à
accéder à son espace. Elle ne transmet aucun lien de parrainage ni code.

Espace membre `/fr/partners` et `/en/partners`, intégré au tableau de bord :
entrée « Partenaires » juste sous « Compte » dans « Mon espace », et dans le
menu mobile. L'en-tête compact laisse les onglets visibles sur mobile ; les
étapes et conditions sont dépliables. Les cartes proposent les liens et codes,
la déclaration du parrainage et son état de validation. « Mes scans » renvoie
au compte et à l'abonnement.

`getPartnerPreviews` construit les données publiques par sélection explicite
des champs. Les liens, codes et campagnes ne sont pas sérialisés dans ses props.
`getMemberPartnerOffers` vérifie le compte auprès de Supabase avant de lire le
catalogue complet. Sans session valide, il redirige vers la connexion. La route
est également protégée par le proxy et le layout de l'application ; elle est
exclue de l'indexation et n'est pas ajoutée au sitemap.

Les titres, descriptions SEO, URL canonique, langues alternatives et sitemap
sont prévus. Les textes sont en français et en anglais. Les états de chargement,
d'erreur et de liste vide sont inclus. Les logos officiels peuvent être renseignés
avec un fichier local et un texte alternatif ; en leur absence, les initiales du
nom servent de repère visuel sans prétendre reproduire un logo officiel.

## Source des offres

Les quatre liens sont ceux transmis par le propriétaire de Kalivoa.
Le catalogue est `src/lib/partners/catalogue.ts` : statut, catégorie, descriptions,
avantage confirmé, conditions, lien, code, logo éventuel, échéance, mise en avant
et ordre sont regroupés dans cette source. Le catalogue et les aperçus publics
ne dépendent pas de la base. Les déclarations membres utilisent les nouvelles
tables décrites dans [Parrainages bookmakers](bookmaker-referrals.md).

- Winamax : lien et code fournis ; aucun montant non vérifié annoncé.
- Betclic : avantage fourni et rapproché des conditions officielles ; le bonus
  est décrit comme des paris gratuits et non comme de l'argent retirable.
- PMU : carte visible, conditions actuelles à confirmer ; action d'inscription
  et code désactivés. La page d'offre retrouvée affiche une ancienne période.
- Unibet : lien fourni et échéance de la campagne officielle enregistrée.
- BetCroissant : « Collaboration à l'étude », aucun lien, code ou avantage
  attribué à une collaboration qui n'est pas encore confirmée.

Sources consultées le 2 octobre 2026 :

- [Betclic : conditions officielles](https://dam.begmedia.com/account/terms-and-conditions/BetclicFr/Fr/TermsAndConditions.html)
- [Unibet : campagne et conditions de parrainage](https://www.unibet.fr/paris-sportifs/parrainage)
- [PMU : page transmise, sans confirmation d'une offre actuelle](https://www.pmu.fr/turf/static/offre-parrainage/)

Les conditions des bookmakers peuvent évoluer. Les échéances sont recalculées
à chaque requête : une offre terminée reste identifiable, mais son action, son
code et sa récompense sont retirés. Un statut ARCHIVED retire complètement la
carte. Seules les URL HTTPS sans identifiants de connexion deviennent des liens.

## Avantages en scans

Le propriétaire a confirmé 30 scans permanents par offre bookmaker : Winamax,
Betclic, PMU et Unibet. Chaque configuration utilise une campagne stable et
`expiresAfterDays: null` : le lot attribué n'expire pas, même si la campagne
bookmaker prend fin ensuite. Une attribution par compte Kalivoa et par offre,
cumulable entre bookmakers. Les cartes actives affichent la quantité, la mention
« Scans permanents, sans expiration » et la validation du parrainage comme
condition. PMU garde cette configuration mais son avantage reste masqué tant
que son offre est indisponible. BetCroissant n'a pas de récompense en scans.

Pour activer une future offre, définir `scanReward` : campagne stable, quantité
approuvée, durée en jours ou absence d'expiration, conditions FR/EN et cumulabilité.
La carte affichera les scans et leurs conditions ; une configuration invalide
ne doit pas annoncer un avantage.

`grantValidatedPartnerScans` dans `src/lib/partners/rewards.ts` utilise le service
de lots de la phase 1. Il prend uniquement le compte, le partenaire, la campagne
et l'identifiant de l'action validée. Il relit quantité, durée et conditions côté
serveur. La clé de droit limite l'attribution à une fois par compte et par offre,
même si plusieurs identifiants de validation arrivent. Le lot possède son
partenaire, sa campagne et sa propre expiration ; la consommation garde la
priorité par expiration de la phase 1.

Le membre déclare son inscription avec son pseudo bookmaker et sa date
d'inscription. L'administration reçoit une demande à vérifier et peut demander
un complément, refuser avec un motif ou valider. La validation attribue les
30 scans permanents et prépare l'email dans une seule transaction, avec
protection contre les doublons. Elle utilise les conditions figées lors de la
déclaration, ce qui permet de traiter une demande après la fin de l'offre.
Un clic, une copie de code ou une déclaration ne déclenche aucune attribution.
Le rapprochement avec la récompense reçue chez le bookmaker reste manuel.
Le parcours et la configuration des emails sont documentés dans
[Parrainages bookmakers](bookmaker-referrals.md).

## Événements

Le système GrowthEvent existant reçoit : `partners_page_view`,
`partners_tab_changed`, `bookmaker_clicked`, `partner_clicked`, `promo_code_copied`.
Les propriétés nouvelles se limitent à la langue, l'onglet et l'identifiant
public du partenaire. Aucun code, URL complète, solde ou preuve de validation
n'est transmis par ces événements. Une erreur de suivi ou de stockage navigateur
ne bloque pas un lien ni la copie d'un code.

Les attributions et usages de scans offerts continuent d'utiliser les événements
internes et le journal de lots de la phase 1. `scan_reward_validated` est écrit
dans la même transaction que le nouveau lot partenaire, une seule fois même
en cas de validations répétées. Les tests PostgreSQL utilisent une
offre synthétique présente exclusivement dans les mocks de test, jamais dans le
catalogue public.

## Fichiers

- Route : `src/app/[locale]/(marketing)/partenaires/{page,loading,error}.tsx`.
- Affichage et test : `src/components/marketing/partners-page{,.test}.tsx`.
- Catalogue et test : `src/lib/partners/catalogue{,.test}.ts`.
- Attribution interne : `src/lib/partners/rewards.ts` et tests PostgreSQL existants.
- Accès membre : `src/lib/partners/access{,.test}.ts`.
- Page membre : `src/app/[locale]/(app)/partners/{page,loading,error}.tsx`.
- Affichage membre : `src/components/partners/member-partners-page{,.test}.tsx`.
- Protection de route : `src/proxy.ts` et `src/proxy.partners.test.ts`.
- Navigation connectée : `src/components/app-nav.tsx`.
- Navigation : en-tête/pied de page marketing, `src/app/sitemap.ts`.
- Traductions : `messages/fr.json`, `messages/en.json`.
- Suivi : `src/lib/growth/events.ts`.

## Points à confirmer avant activation des avantages

Configuration du service et de l'expéditeur des emails ; modalités PMU
actuelles ; logos officiels si souhaités ; finalisation de la collaboration
BetCroissant. Aucun partenariat non confirmé n'est annoncé comme actif.

## Vérification

Le 3 octobre 2026, la suite complète passe : 436 tests dans 79 fichiers,
avec TypeScript, ESLint et compilation de production réussis. La séparation
publique/membre, les sessions et les traductions FR/EN sont couvertes.
Les 15 tests PostgreSQL du parcours de déclaration vérifient notamment les
doublons, le cumul, les décisions concurrentes, les droits, les compléments,
les refus, la validation après expiration et les reprises des emails.

Une démonstration locale avec comptes fictifs, composants réels et base
temporaire a vérifié dans le navigateur : déclaration, complément demandé,
correction par le membre, validation et solde de 30 scans permanents.
Les onglets restent visibles à 390 pixels, sans débordement. Le modèle d'email
a été contrôlé visuellement ; aucun email réel n'a été envoyé.

La migration `20261003110000_partner_referral_claims` a été appliquée sur
Supabase Production. Les nouvelles tables sont protégées par RLS et ne sont
pas accessibles aux rôles publics. L'attribution reste indépendante des clics.
