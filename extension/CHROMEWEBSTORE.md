# Kalivoa — Chrome Web Store

Statut : soumis au Chrome Web Store, en attente d’examen (état vérifié le 1er octobre 2026).
ID Chrome Web Store : nmhjnidaoooclmmefpecbnphhonbjdlj
Tableau de bord : https://chrome.google.com/webstore/devconsole/70cba258-8721-4261-9ebc-13c743b36097/nmhjnidaoooclmmefpecbnphhonbjdlj/edit
Fiche, icône, capture, petite image promotionnelle, permissions, catégories de données, politique de confidentialité et instructions de test enregistrées.
Distribution : publique, toutes régions, achats via l’application déclarés (offres Kalivoa).
La finalisation et la soumission ont été réalisées par l’éditeur. L’approbation et la disponibilité publique ne sont pas encore confirmées. La bêta reste disponible via le ZIP et l’installation manuelle.
Version : 0.1.0
Paquet : public/downloads/kalivoa-extension-0.1.0.zip
Construction : pnpm extension:release (archive reproductible, fichiers explicitement autorisés).

## Fiche boutique
Nom : Kalivoa — Capture de paris
Résumé : Capturez vos tickets localement, puis vérifiez-les dans Kalivoa.
Langue : français
Catégorie proposée : Productivité
Site : https://kalivoa.com/fr/extension
Support : https://kalivoa.com/fr/contact
Confidentialité : https://kalivoa.com/fr/extension/privacy
Distribution : gratuite ; compte Kalivoa requis pour l’analyse, quotas et offres du site applicables.

Description :
Capturez vos tickets de paris dans Chrome et retrouvez-les dans le Scan Kalivoa.
1. Sélectionnez uniquement la zone du ticket sur la page ouverte.
2. Répétez les captures, jusqu’à 100 tickets (40 Mo maximum).
3. Cliquez sur Envoyer à Kalivoa.
4. Vérifiez les informations extraites et les doublons avant de confirmer l’import dans votre bankroll.
Le raccourci Alt + Maj + K accélère la capture. Les images restent dans votre navigateur jusqu’à votre envoi explicite. Capturer ne consomme aucun Scan ; chaque image analysée utilise les quotas habituels de Kalivoa.
Kalivoa ne place aucun pari et ne demande pas vos identifiants bookmaker. Le Scan habituel reste disponible sur mobile.

## Objectif unique
Capturer manuellement une zone de ticket puis envoyer les captures vers le Scan Kalivoa pour vérification et import dans la bankroll de l’utilisateur.

## Justification des permissions
activeTab : obtenir un accès temporaire à l’onglet après l’action explicite de l’utilisateur et capturer sa zone visible pour produire l’image recadrée du ticket.
scripting : injecter temporairement l’interface de sélection de zone et recadrer la capture après validation de l’utilisateur.
externally_connectable : seul https://kalivoa.com/* peut récupérer les captures du lot explicitement envoyé, et confirmer leur nettoyage. Aucun accès permanent aux sites bookmaker.
Aucun code distant ; scripts, polices et ressources intégralement inclus dans le paquet.

## Déclarations des données
Ne pas déclarer « aucune donnée collectée » : des images et métadonnées sont envoyées sur action explicite.
Les captures peuvent contenir des données personnelles, des informations financières et le contenu du site affiché. Les métadonnées contiennent l’identifiant, la date et le nom de domaine de capture. Des événements techniques d’interaction sont transmis lors de l’envoi du lot. Aucune collecte d’historique de navigation ni de mots de passe bookmaker.
Usage : fournir le Scan, enregistrer les paris confirmés et améliorer le service. Aucune vente, publicité ou évaluation de solvabilité.
Revoir les catégories exactes du formulaire Google avant certification : contenu de sites web, informations financières/personnelles pouvant apparaître dans les tickets, activité des utilisateurs.

## Instructions pour les examinateurs
La capture locale fonctionne sans connexion Kalivoa : ouvrir une page HTTPS affichant un ticket ou une image fictive, ouvrir l’extension, cliquer Capturer un pari, sélectionner une zone, vérifier l’aperçu et le compteur, supprimer la capture.
Pour tester l’envoi et l’OCR : compte Kalivoa avec bankroll active et quota de Scan disponible requis. Ouvrir plusieurs tickets fictifs, capturer, envoyer à Kalivoa, suivre le Scan puis vérifier avant l’import.
Ne pas publier de vrais tickets ni de secrets dans cette fiche. Fournir les identifiants d’un compte de démonstration dans le champ privé du tableau de bord si l’examinateur en a besoin.

## Assets
Icônes : extension/dist/icon-128.png (également 16,32,48).
Capture boutique : extension/store/screenshot-1280x800.png.
Visuel promotionnel : extension/store/promo-440x280.png.

## Publication
Se connecter au tableau de bord https://chrome.google.com/webstore/devconsole.
Téléverser le ZIP, remplir la fiche, les déclarations de confidentialité et les instructions de test, puis soumettre à l’examen Google.
Ne pas annoncer l’extension comme publiée avant confirmation de son état public.
Après publication, définir CHROME_EXTENSION_STORE_URL avec l’URL exacte https://chromewebstore.google.com/detail/<slug>/<id>, puis redéployer : la page d’installation utilisera le bouton Ajouter à Chrome.
