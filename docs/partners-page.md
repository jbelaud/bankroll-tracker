# Phase 2 — Les partenaires Kalivoa

## Page et contenu

Présentation publique `/fr/partenaires`, traduction `/en/partenaires`, accessible
depuis le menu et le pied de page. Elle explique le concept et les avantages,
avec deux onglets et des aperçus, puis invite à ouvrir un compte Kalivoa ou à
accéder à son espace. Elle ne transmet aucun lien de parrainage ni code.

Espace membre `/fr/partners` et `/en/partners`, intégré au tableau de bord :
entrée « Partenaires » juste sous « Compte » dans « Mon espace », et dans le
menu mobile. Présentation des avantages, étapes, état de préparation de la
validation, onglets et cartes avec conditions dépliables, codes copiables et
liens. « Mes scans disponibles » renvoie au compte et à l'abonnement.

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
et ordre sont regroupés dans cette source. Il ne dépend pas de la disponibilité
de la base pour afficher la page. Aucun nouveau schéma n'est nécessaire.

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

Le propriétaire a choisi de préparer d'abord les pages et de définir le
parcours de validation ensuite. Une mention visible dans l'espace membre
explique qu'aucun scan n'est attribué automatiquement pour le moment.
L'adaptateur est exclusivement serveur. Un futur webhook authentifié ou une
administration autorisée doit vérifier la preuve et le bénéficiaire avant de
l'appeler. Aucun endpoint public, clic ou copie de code ne déclenche d'attribution.
La quantité et la permanence sont approuvées. Le parcours réel d'attribution
reste à connecter à une source de validation fiable ; un lien de parrainage
seul ne fournit pas cette preuve.

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

Source et parcours de validation du parrainage ; modalités PMU
actuelles ; logos officiels si souhaités ; finalisation de la collaboration
BetCroissant. La préparation de cette page ne publie pas de partenariat fictif.

## Vérification

La séparation publique/membre passe la suite complète : 407 tests dans 76
fichiers. Les tests vérifient l'absence de liens/codes/campagnes dans les données
et le HTML publics, la redirection vers la connexion en FR/EN, les sessions
absentes/invalides/anonymes, et le rendu des offres membres dans les deux langues.
Compilation de production et ESLint réussis. La tentative de vérification
visuelle de cette correction avec un compte fictif et une base temporaire a
été interrompue par des délais d'attente répétés du navigateur intégré ; aucun
contrôle visuel mobile ou parcours de connexion navigateur n'est revendiqué
pour cette correction. Le serveur local a bien rendu la présentation publique.

La suite complète de la phase 2 passe avec 393 tests. Après confirmation des
30 scans permanents, les 47 tests ciblés passent : rendu FR/EN, cumul entre
bookmakers, permanence et validations simultanées. Le nettoyage de la base de
test tolère les verrous temporaires de Windows. La vérification TypeScript et
ESLint passe également. La compilation de production de la phase 2 a réussi.
Les tests PostgreSQL couvrent
aussi l'adaptateur partenaire : unicité du lot et de l'événement de validation,
expiration, consommation prioritaire et refus d'une offre non confirmée.

Le navigateur a vérifié les versions française et anglaise, les deux onglets,
la navigation, les conditions dépliables, la confirmation de copie, le clavier
et l'affichage à 390 pixels sans débordement. Aucun message d'erreur n'a été
observé. Les événements de visite, changement d'onglet et copie ont été retrouvés
dans une base PostgreSQL temporaire dédiée à cette vérification locale.

Aucune nouvelle migration de production n'est nécessaire pour les pages
publique et membre. L'attribution de scans reste indépendante des clics.
