# Corrections de sécurité Kalivoa — 20 octobre 2026

## Résultat final

Les priorités 1, 2, 3, 5 et 6 de l'audit sont traitées en production. La priorité 4 reste une limitation du forfait gratuit : la protection native Supabase contre les mots de passe compromis nécessite Pro. Aucun abonnement ajouté. Documentation : https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Données et base

PostgreSQL est passé de 17.6 à **17.11.0.003** ; le projet est ACTIVE_HEALTHY. La sauvegarde préalable, autorisée par le propriétaire, est chiffrée et conservée hors Git dans `.vercel/production-backups/2026-10-20-LpNe1N`. Sa restauration locale a vérifié 40 tables, 13 547 lignes applicatives et 92 lignes Auth. Aucun objet Storage n'était présent. Les sessions ne font pas partie de cette sauvegarde. Les clés de récupération restent dans le dossier privé, jamais dans ce rapport.

Après mise à jour, la comparaison des empreintes du contenu des 40 tables ne détecte aucune différence. Les comptages utilisateurs, comptes Auth, bankrolls et paris sont inchangés. Preuve : `audit-security/postgres-upgrade-content-2026-10-20.json`.

La migration SQL est appliquée en production et enregistrée dans l'historique Prisma. Les 40 tables ont RLS activé et aucune permission SELECT/INSERT/UPDATE/DELETE pour les rôles navigateur. Les valeurs par défaut du propriétaire des migrations empêchent aussi les nouveaux objets d'être exposés implicitement. Les permissions des objets Auth et Storage existants sont conservées.

## Application : fichiers modifiés

| Fichier | Changement |
| --- | --- |
| `src/app/auth/callback/route.ts` | Validation de l'origine et du chemin de retour après authentification ; blocage des redirections externes et variantes normalisées. |
| `src/app/auth/callback/route.test.ts` | Tests des destinations autorisées et malveillantes, récupération de mot de passe et attribution. |
| `src/lib/admin.ts` | Identité vérifiée côté serveur, e-mail confirmé, liste d'administrateurs et session AAL2 exigés pour l'administration. |
| `src/lib/admin.test.ts` | Tests des niveaux d'authentification, identités refusées et indisponibilité Auth. |
| `src/lib/admin-api.ts` | Réponses 401/403/503 et absence de cache pour les refus des API administrateur. |
| `src/lib/admin-api.test.ts` | Vérifie que les requêtes refusées n'atteignent ni la base ni le stockage. |
| `src/app/api/admin/partner-referrals/count/route.ts` | Contrôle administrateur avant lecture. |
| `src/app/api/admin/scan-quality/[id]/image/route.ts` | Contrôle administrateur avant accès aux captures. |
| `src/app/[locale]/(app)/admin/security/page.tsx` | Page de configuration et de validation du second facteur pour les administrateurs identifiés. |
| `src/components/admin/admin-security-form.tsx` | Configuration TOTP et validation du code ; aucun secret journalisé ou conservé dans les rapports. |
| `prisma/migrations/20261020205928_harden_server_only_api_privileges/migration.sql` | Retrait des permissions inutiles et durcissement des permissions par défaut. |
| `scripts/verify-server-only-api-privileges.mjs` | Vérification sur une base locale jetable ; aucune écriture en production. |
| `docs/AUDIT-SECURITE-2026-10-20.md` | Audit initial, annoté avec le suivi final. |
| `docs/SECURITE-CORRECTIONS-2026-10-20.md` | Présent bilan et limites. |
| `docs/audit-security/` | Preuves agrégées, sans contenu des lignes ni secret. |

L'administrateur a confirmé l'ouverture de l'administration avec son code. Vérification agrégée : un facteur TOTP vérifié et une session AAL2. La page de configuration ne permet pas de remplacer un facteur déjà vérifié avec une simple session AAL1. En cas de perte de l'authentificateur, le propriétaire doit vérifier l'identité dans Supabase avant toute récupération ; aucun contournement applicatif n'est ajouté.

## Vérifications

- 54 tests applicatifs réussis ; lint, types et compilation Vercel réussis.
- 14 refus de permissions vérifiés localement, données existantes conservées.
- Contrôle public final : 40 accès directs aux tables refusés, aucune ligne visible ; aucun objet Storage visible ; API administrateur 401 sans cache ; routes privées redirigées vers la connexion.
- 15 fichiers JavaScript publics comparés aux six valeurs secrètes connues : aucune valeur exposée.
- Conseiller Supabase après migration : aucune alerte de niveau ERROR ; avertissement restant sur les mots de passe compromis. Les 40 informations « RLS sans politique » correspondent au choix de refuser tout accès direct navigateur, l'application passant par le serveur.

Déploiement administrateur validé et promu : `dpl_BmMbFti6xJoz4qHVgzQvokaKhBUX`, commit `07dbf07`. Redirection corrigée dans `acec359`. Les migrations et preuves sont ensuite synchronisées sur master. Ce contrôle ciblé ne constitue pas une garantie d'absence de toute autre faille.
