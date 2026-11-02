# Développement et rédaction Académie — 8 octobre 2026

## État de cette livraison

**Suite du travail :** les deux brouillons ci-dessous sont maintenant intégrés en FR/EN au même lot. Consulter le [rapport de livraison groupée](../seo-gsc/2026-10-08/publication-lot-academie-2026-10-08.md) pour l'état de publication et les contrôles définitifs. Le présent document garde la trace de la première prévisualisation.

Développement dans le chantier isolé `seo-guides-fr`, à partir du commit publié `2f1a2a8`. Aucun changement produit du checkout principal incorporé. Cette livraison est préparée pour prévisualisation ; elle n’est pas encore déployée en production.

### Développé

- Accueil FR/EN : parcours « Commencer ici », navigation par besoin, cartes regroupées en historique et preuves, dates/auteur, accès aux pages produit existantes.
- Nouvel article FR/EN `/academie/suivre-pari-combine`, texte original avec exemple réel relevé dans les captures du 25/09, méthode, cas de règlement, doublons et liens internes.
- Balisage Article + BreadcrumbList, canonical/hreflang via le helper existant ; ajout au sitemap prévu : 38 URL après publication.
- Titres/H1 des articles existants conservés. La rubrique statistiques sera ajoutée avec un article disponible, sans carte vide ou lien vers une page inexistante.

### Rédigé, non intégré ni publié

- [ROI et taux de réussite](article-roi-taux-reussite-fr-2026-10-08.md) : calcul à partir des deux tickets simples perdus, mises de 10 € et 7,50 €, retours nuls ; ROI −100 %, réussite 0 % sur **ces deux tickets seulement**.
- [Unités de bankroll](article-unites-bankroll-fr-2026-10-08.md) : explication de la conversion, distinction avec l’équivalent personnel, preuve publique EGS datée et limites de périmètre. Exemple numérique fictif clairement étiqueté.

## Contrôle de couverture avant création du combiné

Sitemap public consulté directement le 08/10 : 36 URL, aucune consacrée au suivi détaillé d’un combiné. Pages produit et checklist de relecture contrôlées : prise en charge des combinés mentionnée, sans explication dédiée à une mise commune versus plusieurs sélections. Export GSC accessible du 28/09–04/10 : aucune requête visible ; absence de requête exploitable ne prouve pas l’absence de classement. Aucune modification du title/H1 des pages existantes pour transférer cette intention.

Requête conversationnelle : « comment suivre un pari combiné sans compter deux fois la mise ? ». Volume/difficulté : **à vérifier auprès de Jeremy**, pas d’estimation inventée. Candidat éditorial de niche ; faible concurrence non mesurée.

## Originalité et preuve

Textes écrits pour les parcours Kalivoa. Les trois sites de référence ont servi à étudier l’organisation et les formats, sans reprise de texte, illustration ou de leurs exemples chiffrés.

L’article combiné ne reproduit aucune image privée : il décrit les champs constatés sur le ticket et l’historique fournis par Jeremy. Les références de tickets sont exclues. Profit/ROI de ce combiné exclus en raison de l’écart de 0,05 € à clarifier. La validation visuelle préalable reste obligatoire avant toute future publication d’extrait anonymisé.

## Observation et suivi

La fenêtre de 90 jours de l’article combiné commencera à sa publication réelle. L’accueil reçoit cette livraison groupée ; dater son observation au même moment. Les articles de relecture et tipster existants ne sont pas retouchés. Jusqu’à déploiement, le sitemap public reste à 36 URL.

## Vérification

TypeScript, lint ciblé et compilation complète Webpack : réussis. Prévisualisation locale `http://localhost:3103/fr/academie` : HTTP 200 pour l'accueil et les articles combiné FR/EN ; présence du lien interne, exemple réel, Article, canonical et hreflang contrôlée. Navigation accueil → article testée dans le navigateur ; texte, titres, exemple et liens rendus. Aucun scénario d'import ou de modification de pari exécuté : cette livraison est éditoriale.

La configuration locale a dû être chargée au lancement du serveur depuis le fichier existant du projet ; aucune clé n'a été copiée dans les fichiers SEO. La compilation a signalé le choix de racine lié aux plusieurs lockfiles et le runtime edge d'une route préexistante, sans échec de build.

Prévisualisation de l'accueil : [capture locale](academie-preview-2026-10-08.png). Le serveur local reste ouvert pour relecture ; les nouveaux contenus ne sont pas encore en ligne sur kalivoa.com.
