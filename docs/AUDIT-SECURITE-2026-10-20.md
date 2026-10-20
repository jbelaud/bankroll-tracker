# Contrôle de sécurité Kalivoa — 20 octobre 2026

## Résultat

**Suivi final :** les priorités 1, 2, 3, 5 et 6 sont corrigées. L'administration avec authentification à deux facteurs a été validée par le propriétaire. La priorité 4 nécessite le forfait Supabase Pro, non souscrit. Voir `SECURITE-CORRECTIONS-2026-10-20.md` pour les résultats finaux. Les constats ci-dessous conservent l'état historique de l'audit initial.

Aucune exposition anonyme des données des tables, des captures privées ou de l'administration n'a été constatée sur les chemins testés. Une faiblesse de redirection après authentification est reproduite à partir du code publié. Plusieurs mesures de renforcement et une mise à jour de PostgreSQL restent à traiter.

Ce contrôle ponctuel combine revue du code, consultation des réglages et du catalogue de production, requêtes HTTP anonymes et tests locaux simulés. Ce n'est ni une certification ni la preuve qu'aucune autre faille n'existe.

## Suivi des corrections

- **Priorité 1 corrigée et publiée le 20 octobre 2026** : commit `acec359`, déploiement validé `dpl_5Fp3obGsio9opZeGJDWbsLx3kr2Z`. La destination OAuth est filtrée avant normalisation, son origine résolue est vérifiée et l'URL absolue validée est conservée jusqu'à la redirection. Les retours de récupération de mot de passe avec paramètres conservent leur traitement particulier. 25 tests ciblés, ESLint, vérification TypeScript et compilation Vercel réussis ; pages de connexion FR/EN et retours sans code contrôlés sur le domaine public. Les échanges Auth réussis sont couverts par simulation ; aucun compte réel n'a été utilisé pour les tests.
- **Priorité 2 terminée** : sauvegarde chiffrée et restauration locale vérifiées, puis mise à jour autorisée vers PostgreSQL `17.11.0.003`. Comparaison des 40 tables sans différence après la mise à jour.
- **Priorités 3, 5 et 6 terminées** : double authentification administrateur, refus HTTP explicites des API et retrait des permissions inutiles appliqués. Détails dans le rapport de corrections.

## Périmètre et méthode

- Site : `https://kalivoa.com`.
- Déploiement actif vérifié : `dpl_FJPucXHL5GDi3wbRV8yhyBHLG93C`.
- Commit fourni par les métadonnées Vercel : `16d9af92f3fdb4b59dbe7ac6203809b5b779b7d5`, branche `master`.
- Revue du code publié dans `.vercel/rustine-push`, comparé aux fonctions correspondantes du répertoire principal lorsque pertinent. Les travaux locaux non publiés ne sont pas présentés comme des protections du site actif.
- Supabase : permissions des rôles `anon` et `authenticated`, RLS, politiques, vues, fonctions privilégiées, Storage, Auth et Realtime.
- Aucun compte de production créé, aucun e-mail envoyé, aucune donnée utilisateur modifiée, aucun réglage de production changé.
- Les vérifications de tables demandent au maximum une ligne par table et ne conservent que le statut et le nombre de lignes visibles. Aucune donnée de ligne n'a été renvoyée.

## Points à traiter, par priorité

### 1. Redirection externe possible après authentification — priorité moyenne

**Emplacement :** `src/app/auth/callback/route.ts:19`, puis redirection à la ligne 41.

Le filtre accepte les chemins commençant par `/` sauf `//`. Il accepte cependant un chemin commençant par une barre oblique suivie d'une barre oblique inverse. Le parseur URL normalise cette variante en URL externe.

**Preuve locale, sans connexion ni requête vers un tiers :** une chaîne construite avec `String.fromCharCode(47, 92) + "example.invalid"` passe le filtre actuel, puis `new URL(chemin, "https://kalivoa.com").origin` vaut `https://example.invalid`.

**Condition :** la redirection intervient seulement après un échange de code Auth réussi. Aucun détournement d'une session réelle ni vol de jeton n'a été effectué ou démontré. Le risque établi est une redirection externe non souhaitée, exploitable notamment pour du phishing après connexion.

**Correction proposée :** résoudre et normaliser la destination avec une base de confiance, imposer une origine identique, rejeter les barres obliques inverses et caractères de contrôle, puis conserver uniquement le chemin interne validé. Ajouter des tests pour les chemins internes légitimes, les destinations externes et leurs variantes encodées dans le paramètre `next`.

### 2. Mise à jour PostgreSQL de production à planifier — priorité moyenne

**Preuve :** `current_setting('server_version')` retourne `17.6`. La version d'infrastructure annoncée par Supabase est `17.6.1.141`. Les extensions installées incluent `pgcrypto` ; aucune extension `ltree` ou `btree_gist` n'est installée.

Supabase annonce le passage de PostgreSQL 17.6 à 17.11, avec plusieurs cycles de correctifs de sécurité. Cela établit un retard de version à examiner, sans démontrer que chaque CVE de ces cycles est exploitable dans cette application.

**Action :** consulter l'option de mise à jour de la base dans le tableau de bord Supabase du projet ; vérifier la sauvegarde et la possibilité de restauration avant de programmer l'opération. Ne pas lancer un redémarrage ou une mise à jour d'infrastructure pendant un simple audit. Le changement de comportement de `pgcrypto` pour les anciens algorithmes doit être examiné si de telles données existent.

Source : [notes Supabase PostgreSQL 15.19 / 17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).

### 3. Administration sans exigence de second facteur — renforcement prioritaire

**Emplacement :** `src/lib/admin.ts:19`.

L'administration vérifie une session Supabase avec `getUser()` puis une liste d'adresses configurée côté serveur. Aucun rôle administrateur n'est accepté depuis les métadonnées modifiables par l'utilisateur. En revanche, aucun contrôle `aal2` ni parcours MFA n'est présent dans les sources examinées. Le catalogue Auth ne contient aucun facteur TOTP vérifié.

Ce n'est pas un accès administrateur ouvert : les pages sont protégées. La limite est qu'une session administrateur compromise ne rencontre pas de contrôle supplémentaire propre à l'application. Ces observations ne permettent pas de savoir si le compte Google utilisé bénéficie d'une double authentification chez Google.

**Correction proposée :** ajouter l'inscription et la vérification TOTP, puis exiger le niveau `aal2` sur les pages, API et actions administratives. Prévoir l'enrôlement et la récupération avant de rendre cette exigence obligatoire afin de ne pas bloquer le propriétaire.

Source : [MFA Supabase](https://supabase.com/docs/guides/auth/auth-mfa).

### 4. Protection des mots de passe compromis désactivée — renforcement

Le conseiller de sécurité Supabase renvoie `auth_leaked_password_protection`, niveau `WARN`. La confirmation d'e-mail est, elle, activée.

**Action :** examiner ce réglage dans Auth > paramètres de sécurité des mots de passe. Supabase indique que sa protection native contre les mots de passe divulgués nécessite Pro ou supérieur ; aucun changement de forfait n'a été effectué. L'absence de cette option ne démontre pas qu'un mot de passe utilisateur est compromis. Un mot de passe administrateur long, unique et un second facteur restent des mesures utiles sans souscrire à Rustine.

Source : [sécurité des mots de passe Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### 5. Droits SQL inutiles sur quatre tables et permissions futures trop larges — faible, préventif

Les tables `bankroll_reference_periods`, `personal_conversion_profiles`, `scan_drafts` et `staking_profiles` accordent encore SELECT/INSERT/UPDATE/DELETE à `anon` et `authenticated`. Le RLS est actif sans politique : il bloque les lignes. Les requêtes REST anonymes renvoient un tableau vide. Il ne s'agit donc pas d'une fuite actuelle constatée.

Les 36 autres tables n'accordent pas ces accès directs. Les privilèges par défaut de création d'objets restent larges pour les rôles de navigateur ; une future migration mal protégée pourrait donc créer une exposition.

**Correction proposée :** révoquer les accès directs inutiles aux quatre tables via une migration versionnée et durcir les privilèges par défaut pour les propriétaires réellement utilisés par les migrations. Conserver les accès du serveur nécessaires à Prisma. Vérifier ensuite les accès serveur et les refus Data API. Ne pas ajouter de politiques permissives pour faire disparaître les 40 informations « RLS enabled no policy » : dans cette architecture, le refus direct est intentionnel.

Source : [sécuriser la Data API Supabase](https://supabase.com/docs/guides/api/securing-your-api).

### 6. Deux API administratives renvoient 500 plutôt que 401 — faible

**Emplacements :** `src/app/api/admin/partner-referrals/count/route.ts:6` et `src/app/api/admin/scan-quality/[id]/image/route.ts:14`.

Une requête sans session déclenche une exception dans `requireUser()` via `requireAdmin()`. La réponse observée est 500, sans données métier ni trace de pile détectée dans le corps.

**Correction proposée :** traiter explicitement l'absence de session par une réponse 401, et le manque de droits par 403 ou 404, avec `Cache-Control: private, no-store`. Conserver les exceptions inattendues comme erreurs serveur. Il s'agit d'une mauvaise gestion du refus d'accès, pas d'un contournement établi.

## Protections vérifiées

| Domaine | Vérification | Résultat observé |
| --- | --- | --- |
| Tables | 40 tables publiques, RLS, politiques et droits des rôles navigateur | RLS actif sur 40/40 ; aucune politique permissive |
| REST anonyme | Lecture limitée sur les 40 tables | 36 refus ; 4 réponses vides ; aucune ligne visible |
| Vues | Inventaire des vues et vues matérialisées du schéma public | Aucune |
| Fonctions privilégiées | Fonction `handle_new_user` et permissions d'exécution | Fonction de trigger ; non exécutable par `anon` ou `authenticated` ; plan non issu de métadonnées utilisateur |
| Storage | Bucket de captures et règles sur les objets | Bucket privé ; RLS actif ; aucune politique publique ; liste anonyme vide |
| Realtime / Edge Functions | Inventaire | Aucune table publiée dans `supabase_realtime`, aucune Edge Function |
| Inscription | Réglages Auth publics | Inscription ouverte, confirmation d'e-mail requise, comptes anonymes désactivés |
| Comptes non confirmés | Comptage agrégé des sessions associées | Aucune session associée au compte non confirmé existant |
| Pages privées | Dashboard FR/EN, bankrolls, historique, compte, admin FR/EN, admin partenaires | Redirection vers la connexion |
| En-têtes forgés | Tentative de contournement du middleware sur admin et dashboard | Redirection vers la connexion maintenue |
| Scan / partage de capture | POST sans session depuis l'origine du site | 401 |
| Scan / partage de capture | POST depuis une origine externe | 403 |
| Tâche planifiée | Requête sans secret | 401 |
| Webhook Stripe | Requête sans signature | 400 |
| Fichiers sensibles | `.env`, `.env.local`, `.git/config`, schéma Prisma, en suivant les redirections | 404 ; aucun contenu de configuration détecté |
| Fichiers JavaScript publics | 15 fichiers chargés par l'accueil, la connexion et l'inscription ; comparaison avec 6 valeurs secrètes locales connues | Aucune de ces valeurs trouvée |
| Autorisations applicatives | Revue des filtres de propriétaire sur bankrolls, paris, imports, brouillons, tipsters, export et paramètres de compte | Filtres par utilisateur et contrôles de propriété présents sur les chemins examinés |
| Actions administratives | Revue des pages, routes et actions concernées | Garde serveur `requireAdmin()` présent |
| Pages de partage | Revue des pages publiques bankroll et tipster | Publication volontaire exigée ; suspension prise en compte ; adresses e-mail non sélectionnées dans les requêtes publiques examinées |

L'inscription ouverte est un choix normal pour ce service grand public ; ce n'est pas en soi une faille. Le profil administratif repose sur une configuration serveur, pas sur le simple fait de s'inscrire.

## Tests exécutés

85 tests réussis dans 10 fichiers de la source publiée : actions de paris, imports, déclarations partenaires, paramètres publics des bankrolls, tipsters, coûts de tipsters, publication, administration, suivi et middleware partenaires.

Les services et identités sont simulés. Ces tests incluent notamment des refus de références appartenant à d'autres utilisateurs et d'actions administratives appelées sans autorisation. Ils ne constituent pas un test complet en production avec deux comptes réels.

## Limites

- Aucun parcours authentifié complet avec deux nouveaux comptes de production ; aucune écriture d'exploitation, tentative de suppression ou modification de client réel.
- Les requêtes anonymes ne prouvent pas à elles seules l'absence d'IDOR entre utilisateurs connectés. La revue des filtres, les droits SQL et les tests simulés apportent des vérifications complémentaires.
- La redirection externe est reproduite avec le filtre et le parseur URL du code publié ; aucun échange OAuth réel n'a été déclenché.
- La recherche de secrets couvre les fichiers publics et les valeurs connues précisés ci-dessus, pas tous les secrets possibles, tout l'historique Git, ni tous les fichiers chargés après connexion.
- Aucun test de charge, bruteforce, audit du compte OVH, du compte Google ou de toutes les dépendances. Aucun test d'intrusion exhaustif.
- La présente revue ne modifie ni le code applicatif ni les réglages de production. Les corrections restent à réaliser.

## Fichiers produits

- `docs/AUDIT-SECURITE-2026-10-20.md` : présent rapport.
- `docs/audit-security/access-catalog-2026-10-20.json` : catalogue de permissions et synthèse des observations, sans lignes de données utilisateur.
- `docs/audit-security/public-checks-2026-10-20.json` : résultats HTTP et REST anonymes, sans clés ni contenu client. Les quatre sondes de fichiers sensibles y montrent la redirection initiale ; leur destination finale a été vérifiée séparément en 404.

Les scripts temporaires de contrôle sont conservés dans `.vercel/`, répertoire ignoré par Git.
