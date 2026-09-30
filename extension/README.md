# Extension Kalivoa V1

Capture universelle, file locale et traitement par le Scan existant. Aucune lecture de tickets dans le DOM, navigation automatique ou intégration bookmaker n’est incluse.

## Préparer une recette locale

1. Appliquer la migration `20260930160000_extension_scan_receipts` sur la base **de développement choisie**, puis générer le client Prisma. La migration doit précéder le déploiement du code web : le Scan utilise la nouvelle colonne. Ne pas lancer une migration sans avoir vérifié la destination de la base.
2. Démarrer l’application locale sur `http://localhost:3000` et se connecter à son compte Kalivoa habituel.
3. Exécuter `pnpm extension:dev`.
4. Dans `chrome://extensions`, activer le mode développeur puis « Charger l’extension non empaquetée » et sélectionner `extension/dist`.
5. Ouvrir une page web et utiliser « Capturer un pari » ou Alt + Maj + K. Si Chrome réserve déjà ce raccourci, le changer dans `chrome://extensions/shortcuts`.
6. Encadrer le ticket avec la souris. Échap annule. La capture recadrée apparaît dans la popup ; la fermeture de celle-ci ne l’efface pas.
7. Répéter, puis choisir « Développement local » et « Envoyer à Kalivoa ».
8. Avec une seule bankroll active, le traitement commence automatiquement après « Envoyer ». Avec plusieurs bankrolls, choisir la destination et cliquer « Traiter les captures ». Ce choix explicite évite de débiter les Scans sur une bankroll choisie arbitrairement.
9. Corriger les paris dans la revue habituelle et confirmer l’import.

Pour une distribution de production, exécuter `pnpm extension:build` : le manifeste généré autorise uniquement `https://kalivoa.com`. Le dossier `dist` contient tout le code local nécessaire ; aucun code distant n’est exécuté.

## Architecture et réutilisation

Le projet reste une application Next.js unique. L’extension est un dossier indépendant compilé avec le TypeScript déjà installé, sans React ni nouveau framework d’exécution.

La popup reprend les tokens de `src/app/globals.css`, extraits à chaque compilation, et l’icône du site. Les polices Inter et JetBrains Mono sont embarquées avec leurs licences dans `extension/assets`, sans téléchargement distant à l’ouverture. Le sélecteur de destination n’apparaît que dans le build de développement. Après une mise à jour des fichiers de l’extension, cliquer sur « Recharger » dans `chrome://extensions` pour afficher le nouveau design ; les captures IndexedDB sont conservées.

| Partie | Existant réutilisé / ajout V1 |
| --- | --- |
| Authentification | Session Supabase de l’application, `requireUser`, vérification serveur ; aucun jeton dans l’extension |
| API | `/api/scan`, une image par requête, vérification de l’origine et de la bankroll |
| Vision / normalisation | Fournisseurs et logique `src/lib/scan` existants |
| Quotas | Quotas mensuels, crédits et limite horaire existants ; aucune consommation à la capture locale |
| Doublons | Hash de l’image côté serveur, références du ticket dans le lot, contrôles à l’import |
| Vérification / import | `ScanFlow`, `ReviewList`, brouillons, `importBets` et statistiques existants |
| Reprise | Reçus IndexedDB par compte / bankroll / capture, reçu serveur normalisé dans `ScanUsage` |
| Capture | `background.ts` : sélection injectée sur action utilisateur et recadrage dans `OffscreenCanvas` |
| File locale | `storage.ts` : IndexedDB transactionnel, 100 images, 40 Mo, 4 Mo par image |
| Interface extension | `popup.ts` : compteur, miniatures, suppression et ouverture de Kalivoa |
| Mesure | Événements `growth` ; compteurs locaux transmis après l’action d’envoi, jamais le contenu des images |

La sélection est une surcouche éphémère et n’analyse pas le DOM du bookmaker. Les captures ne conservent que l’horodatage, le hostname et un identifiant technique ; le chemin et les paramètres d’URL ne sont pas enregistrés. Le hostname n’est pas une preuve de bookmaker ou de certification. Le moteur Kalivoa conserve la responsabilité de l’extraction.

## Permissions et confidentialité

- `activeTab` accorde l’accès temporaire à l’onglet sur un clic ou le raccourci de l’utilisateur et permet `captureVisibleTab`.
- `scripting` injecte uniquement l’interface de sélection.
- Pas de permission `tabs`, `storage`, `unlimitedStorage`, `cookies`, `host_permissions` ni `<all_urls>`. IndexedDB stocke les images et les métadonnées.
- `externally_connectable` limite le dialogue au domaine canonique Kalivoa. Le service worker vérifie également l’origine et l’identifiant aléatoire du lot.
- Le build de développement ajoute uniquement `localhost` au manifeste ; la vérification runtime impose le port 3000.
- Le navigateur produit temporairement une image de l’onglet visible pour permettre le recadrage ; seule la zone choisie est persistée et envoyée.
- Conversion WebP qualité 94 %, résolution native conservée pour l’OCR ; les images dépassant 4 Mo sont refusées, sans réduire silencieusement leur lisibilité.
- Aucun secret serveur, mot de passe, clé privée ou jeton d’accès n’est présent dans l’extension.
- L’import réussi déclenche la suppression des captures traitées et des reçus navigateur. Les échecs restent locaux. La suppression manuelle reste accessible dans la popup.
- Les reçus serveur ne contiennent que les paris normalisés et les métadonnées de revue ; ils sont supprimés à la vérification et après 7 jours par le cron de rétention existant.

## Reprise et erreurs

Les captures sont transférées et analysées une par une, sans POST géant. L’application sauvegarde chaque fichier avant l’OCR et chaque résultat après. Une reprise saute les résultats déjà sauvegardés. Une réponse OCR perdue peut être récupérée depuis le reçu serveur sans nouveau Scan, tant que le reçu est conservé et que la vérification n’est pas terminée.

Une panne d’une image permet de continuer sur les suivantes. Une erreur d’authentification, d’accès ou de quota suspend les suivantes. L’utilisateur peut reprendre après connexion ou renouvellement du quota, ou vérifier uniquement les réussites. Un verrou navigateur empêche deux onglets de traitement simultanés dans le même profil. Les appels OCR de l’extension ont un délai de 120 secondes ; un délai dépassé ne supprime aucune capture.

Les limites actuelles restent applicables : 15 Scans/heure pour FREE et BETA_TESTER, 120 pour PREMIUM et BETA_PREMIUM, ainsi que les quotas mensuels. Une analyse vide est remboursée selon la règle actuelle du Scan. Les doublons déjà importés ne lancent pas d’OCR. Les brouillons acceptent désormais jusqu’à 5 000 paris, comme la limite d’import existante.

## Recette Chrome à effectuer

Les tests unitaires ne remplacent pas ces contrôles dans un vrai Chrome avec l’extension chargée.

| Scénario | Résultat attendu |
| --- | --- |
| Deux sites HTTPS différents, page défilée et ticket ouvert | Même sélection universelle, aucune automatisation du site |
| Zoom 80 %, 125 %, 200 %, écran HiDPI | Recadrage correct sans décalage ni surcouche dans l’image |
| Zone inférieure à 12 pixels / Échap | Refus explicite / annulation, aucune image ajoutée |
| Très grande capture | Refus au-delà de 4 Mo, ticket précédent conservé |
| Fermer popup, changer d’onglet, relancer Chrome | File et miniatures conservées |
| Supprimer une image / toutes les images | Compteur et stockage actualisés, confirmation pour tout supprimer |
| 100 captures, puis une 101e / dépasser 40 Mo | Limite explicite sans perte du lot existant |
| Envoi avec réseau lent | Progression visible ; ne pas fermer l’onglet pendant le traitement |
| Perte réseau après une réponse serveur / rechargement | Résultats sauvegardés réutilisés, reçu serveur récupérable |
| 97 réussites et 3 erreurs | Reprise uniquement des 3 échecs ; revue possible des 97 réussites |
| Déconnexion pendant le lot | Suspension, connexion puis reprise ; aucune image locale perdue |
| Quota atteint | Suspension et message API ; captures restantes conservées |
| Même ticket capturé deux fois / états ouvert et clôturé | Déduplication et conservation de l’état clôturé ; vérification avant import |
| Deux onglets Kalivoa | Un seul traitement autorisé dans le profil Chrome |
| Import réussi | Paris dans la bonne bankroll, statistiques actualisées, suppression locale |
| Origine extérieure / mauvais identifiant de lot | Aucun accès aux captures |

## Limites de cette livraison

- Pas de publication Chrome Web Store ou déploiement web réalisé. Préparer les icônes, captures de présentation et déclaration de confidentialité avant soumission.
- Le traitement se déroule dans un onglet Kalivoa ouvert ; aucun job OCR autonome n’est exécuté après fermeture du navigateur.
- Avec plusieurs bankrolls actives, la V1 demande le choix de la destination et le démarrage du traitement dans Kalivoa après « Envoyer ». Avec une seule, l’envoi suffit. Le transfert s’effectue ensuite sans interaction entre images.
- Si l’utilisateur n’est pas connecté, se connecter dans Kalivoa puis rouvrir « Envoyer » depuis la popup. Le lot reste local.
- Si la revue est reprise depuis un brouillon dans un autre onglet/appareil, supprimer les captures originales manuellement dans la popup après l’import ; le callback de nettoyage appartient à l’onglet du lot.
- Les fichiers reçus par l’application occupent également un espace local limité à 40 Mo. Le bouton « Effacer les copies locales » libère les copies du compte actif sans supprimer les captures originales de l’extension.
- La rétention de 7 jours dépend de l’exécution du cron existant. La reprise sans nouvel OCR n’est pas garantie après cette rétention ou après effacement des données locales.
- Les tests réels du recadrage, de Chrome, des sessions et du réseau avec OCR payant restent à réaliser selon la matrice ci-dessus.

Les futures entrées V2/V3 pourront fournir des captures ou des données structurées à Kalivoa. Aucun connecteur ni comportement V2/V3 n’a été développé.

## Bilan de validation du 30 septembre 2026

- Compilation de l’extension de production : réussie ; `extension/dist` peut être chargé dans Chrome.
- TypeScript : contrôle global réussi.
- ESLint ciblé sur les fichiers d’extension, Scan et import modifiés : réussi sans erreur ni avertissement.
- Schéma Prisma : validé, client généré. Migration créée mais non appliquée à une base distante.
- Tests ciblés de capture, manifeste, reprise, déduplication et Scan : 23 réussis.
- Suite complète : 304 réussis, 1 échec dans `src/lib/clv.test.ts`, fichier déjà non suivi avant cette tâche ; comparaison stricte de flottants `-0.9` / `-0.8999999999999999`.
- Compilation Next.js de production : bloquée par le téléchargement des polices Google Inter et JetBrains Mono dans cet environnement.
- Recette réelle Chrome et OCR connecté : non exécutée. La matrice ci-dessus doit être complétée avant distribution.

Fichiers créés : dossier `extension` (sources, manifeste, interface, compilation, tests et ce guide), `src/components/scan/extension-batch.tsx`, `src/lib/scan/extension-batch.ts` et son test, `src/lib/scan/extension-replay.ts` et son test, migration `20260930160000_extension_scan_receipts`.

Fichiers adaptés : page Scan, `ScanFlow`, client et route Scan, actions de brouillon et d’import, schéma Prisma, cron de rétention, liste des événements growth, scripts du projet et exclusions des fichiers générés.

Prochaine étape : appliquer la migration sur une base de développement identifiée, charger le build de développement dans Chrome et exécuter la recette avec une session Kalivoa et un quota suffisant. La livraison Web Store nécessite ensuite ses éléments de présentation et de confidentialité.

## Distribution
Page publique : https://kalivoa.com/fr/extension. La bêta téléchargeable se charge en mode développeur après extraction du ZIP.
`pnpm extension:release` reconstruit la version de production, ses icônes et le ZIP public avec son empreinte SHA-256. Le paquet contient uniquement les fichiers explicitement autorisés ; aucun fichier de développement ni secret.
La préparation Chrome Web Store est décrite dans CHROMEWEBSTORE.md. La publication Google est une étape distincte de la mise en ligne du ZIP.
