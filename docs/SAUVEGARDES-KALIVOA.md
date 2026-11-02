# Sauvegardes Kalivoa

## Destination et périmètre

Le propriétaire a choisi son Google Drive connecté. Dossier privé vérifié, sans partage public : [Kalivoa — sauvegardes chiffrées](https://drive.google.com/drive/folders/1rS6DobPq5i_s5mJyohLkfWgXg8KcPb8G).

Chaque jeu comporte deux archives AES-256-GCM et un manifeste de récupération sans clé :

- Schéma applicatif `public`, données, RLS et droits.
- Données `auth.users` et `auth.identities`, pour conserver les identifiants et les liens de connexion. Les sessions et jetons de rafraîchissement sont exclus : une reconnexion sera requise après récupération.
- Paramètres des buckets Storage et contenu de leurs objets, lorsqu'ils existent. Le premier jeu du 19 octobre ne contient aucun objet, car le stockage de production était vide.

Le jeu du 19 octobre a été restauré dans PostgreSQL local : 40 tables applicatives, 12 528 lignes, plus 92 lignes d'identités/authentification comparées sans différence. Les archives ont ensuite été relues depuis Drive et leurs empreintes comparées aux fichiers locaux. Cela ne constitue pas un test d'authentification Google dans un nouveau projet Supabase ; les URLs OAuth et secrets du futur projet devront être reconfigurés lors d'une véritable reprise.

## Clé à conserver séparément

La clé maîtresse est dans `.vercel/production-backups/master-key.json`, ignoré par Git. Elle n'est ni dans Drive, ni dans le manifeste, ni dans les documents publics. Les futurs jeux réutilisent cette clé avec de nouveaux vecteurs d'initialisation aléatoires ; leur manifeste contient les paramètres non secrets nécessaires.

**Le propriétaire doit conserver une copie de cette clé dans un gestionnaire de mots de passe ou un support sécurisé distinct de cet ordinateur et de ce dossier Drive.** Sans cette copie, la perte de l'ordinateur peut rendre les sauvegardes inutilisables. Ne pas coller la clé dans le chat, ni la déposer à côté des archives.

## Exécution quotidienne et limites

L'automatisation Codex attachée à cette conversation exécute la procédure à 10 h, heure de Paris. L'ordinateur et l'application doivent être disponibles, ainsi que les connexions Supabase et Drive. Il s'agit d'une automatisation locale ; ce n'est pas un service cloud autonome fonctionnant ordinateur éteint. Les erreurs et besoins d'intervention doivent être signalés.

1. Depuis `C:/Developpement/bankroll-tracker`, exécuter `node scripts/backup-production-application.mjs`. Ne pas modifier la production : le script utilise une transaction en lecture seule et une restauration locale sur loopback.
2. Exiger un succès sans `failureStage`, `restored`, `authDataRestoredLocally` et `storageContentVerified` vrais dans `.vercel/production-backups/latest-verified.json` ; contrôler la date du jour. Ne jamais envoyer un jeu incomplet ou un ancien jeu comme s'il venait d'être créé.
3. Exécuter `node scripts/prepare-backup-upload.mjs`, puis lire `.vercel/production-backups/latest-upload.json`. Ce fichier donne les chemins et les noms exacts des deux archives et du manifeste ; il ne contient pas la clé.
4. Vérifier les permissions du dossier Drive `1rS6DobPq5i_s5mJyohLkfWgXg8KcPb8G` avant dépôt. Chercher les noms exacts pour éviter les doublons, envoyer les deux archives et le manifeste par le connecteur Google Drive, puis vérifier tailles et parents. Relire les fichiers chiffrés et comparer les SHA-256 ; ne pas afficher les URL de téléchargement temporaires.
5. Conserver les clés et diagnostics localement, hors Git. Consigner les IDs Drive et les empreintes dans le dernier relevé de sauvegarde, sans données clients ni secrets.
6. Après réussite d'un nouveau jeu complet, mettre uniquement les jeux `kalivoa-...` de plus de 30 jours de ce dossier dans la corbeille récupérable. Le connecteur ne fournit actuellement que la suppression définitive : utiliser l'interface Drive pour la corbeille ; ne jamais appeler `delete_file`. Si l'accès navigateur manque, signaler le nettoyage à effectuer. La corbeille Drive peut prolonger la récupération de 30 jours. Ne pas effacer de fichiers d'autres dossiers, ni les clés locales.

Le script limite actuellement le stockage exporté à 500 objets et 30 Mo ; un dépassement fait échouer le jeu et demande une révision de la méthode. Ce plafond évite une sauvegarde silencieusement partielle. Aucune extension de forfait n'a été souscrite.

## Reprise après incident

Télécharger les deux archives et leur manifeste dans un dossier privé. Vérifier la clé et l'intégrité sans créer de fichiers déchiffrés :

```powershell
node scripts/verify-encrypted-backup.mjs --manifest <manifeste-local> --key <cle-locale> --public <archive-application> --supplement <archive-auth-stockage>
```

Pour une reprise réelle, créer un projet de destination compatible et isolé, reconfigurer les fournisseurs de connexion et URLs de retour, restaurer les utilisateurs et identités dans son schéma Auth géré, puis le schéma applicatif. Recréer les buckets et remettre leurs objets avec leurs paramètres privés. Réappliquer les effacements et oppositions intervenus après la date du jeu ; vérifier droits, connexion, historique et accès privés avant toute bascule DNS ou changement de base. Ne jamais injecter une ancienne sauvegarde directement dans la production en activité.

Les clés Stripe, Resend, OAuth, l'historique du code et les réglages externes ne sont pas récupérés par l'archive de données : ils doivent être conservés dans les comptes fournisseurs et le gestionnaire de secrets. Les mots de passe et données Auth du jeu sont sensibles même si les connexions se font principalement par Google ; garder les archives chiffrées.

## Sources

- [Supabase — périmètre et limites des sauvegardes](https://supabase.com/docs/guides/platform/backups).
- [Documentation officielle OpenAI — exécution des tâches locales](https://learn.chatgpt.com/docs/automations?surface=app).
