# Audit i18n — zones authentifiées

## Fondations en place

- `next-intl` est déjà la solution unique du projet.
- Les locales publiques sont `fr` et `en`, avec le français par défaut et le préfixe de route obligatoire.
- Les nouveaux écrans marketing utilisent exclusivement le namespace `marketing` dans `messages/fr.json` et `messages/en.json`.
- Les liens localisés conservent la locale et le sélecteur de langue s'appuie sur le routage `next-intl` existant.

## Zones encore partiellement ou non traduites

Ces surfaces ne sont pas annoncées comme entièrement localisées. Elles doivent être migrées vers les namespaces existants, sans modifier les routes ou les actions métier.

| Priorité | Zone | Fichiers concernés | État constaté |
| --- | --- | --- | --- |
| P1 | Administration bêta | `src/components/admin/beta-tester-manager.tsx` | Libellés, confirmations et erreurs codés en français. |
| P1 | Administration qualité des scans | `src/components/admin/scan-quality-queue.tsx` | Interface, confirmations, placeholders et alertes codés en français. |
| P1 | Rapports qualité du compte | `src/components/account/scan-quality-reports.tsx` | Titre et texte d'information codés en français. |
| P1 | Partage volontaire de scan | `src/components/scan/review-list.tsx` | Bloc de consentement et explication codés en français. |
| P2 | Écran d'erreur applicatif | `src/app/[locale]/(app)/error.tsx` | Bilingue via ternaire local ; à déplacer dans les messages pour une organisation homogène. |
| P2 | Erreurs renvoyées par les API de scan | `src/app/api/scan/route.ts`, `src/app/api/scan-quality/route.ts` | Messages français renvoyés par le serveur ; définir des codes d'erreur stables puis les afficher via les traductions côté client. |

## Ordre de migration recommandé

1. Ajouter les namespaces `admin`, `scanQuality` et `errors` dans les deux fichiers de messages.
2. Migrer les quatre composants P1, puis vérifier leurs interactions en français et en anglais avec un compte administrateur et un compte standard.
3. Remplacer les messages d'API destinés à l'interface par des codes d'erreur ; conserver les détails techniques uniquement dans les logs serveur.
4. Migrer l'écran d'erreur vers le namespace `errors` et ajouter un test de rendu pour chaque locale.

Les commentaires de code et les logs internes ne font pas partie du périmètre de traduction produit.
