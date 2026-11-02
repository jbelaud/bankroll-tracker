# Rétablissement de la page certification — 2 novembre 2026

Jeremy confirme que la page certification doit être présente et autorise explicitement commit et push sur master.

## Diagnostic

La production Vercel dpl_H2CY4NLSFaoA2qRK2emU2sgsmYBT, alias kalivoa.com, correspond au commit f827a548434d047073997c4c8de7022620e37596. Ce commit ne contient pas la route marketing certification ni son entrée de sitemap. Les fichiers existent dans le dossier local mais pas dans cette version déployée. Les URL FR/EN affichent une page introuvable et le sitemap public contient 44 URL. Le diagnostic ne permet pas d’attribuer cette différence à un retrait volontaire.

## Correctif isolé

Base : dernier origin/master récupéré, f827a548. Copie de travail isolée ; aucun autre fichier du dossier principal repris.

- Route publique /[locale]/certification restaurée pour FR/EN, avec métadonnées localisées, canonical et hreflang via marketingMetadata.
- Composants de présentation et textes bilingues existants repris depuis les fichiers locaux certification. Contenu produit, illustration explicitement signalée, niveaux de preuve et limites de certification ; pas de promesse de gain ou de certification absolue.
- Entrée certification ajoutée au sitemap, deux URL supplémentaires : total attendu 46.
- Lien Certification ajouté à la colonne produit du pied de page marketing pour rendre la page accessible.

## Vérifications avant push

- Guides Next.js embarqués page, sitemap et generateMetadata lus ; params attendu comme Promise conservé.
- Génération des types Next réussie ; avertissement existant de dépréciation Edge Runtime.
- Client Prisma généré séparément pour la copie propre : vérification TypeScript complète réussie. La première tentative utilisait les dépendances générées d’un autre schéma local ; aucun schéma ni migration modifié.
- Revue React : composants serveur, aucun nouvel état client ou appel réseau, données structurées sérialisées et caractères < échappés ; liens localisés, détails FAQ natifs, icônes décoratives masquées à l’accessibilité.
- ESLint ciblé non exécutable : dépendance locale @babel/types absente dans l’installation partagée. Ne pas présenter ce contrôle comme réussi.
- Vérification HTTP locale non aboutie : socket/refus réseau puis délai ; aucun résultat 200 local revendiqué. Le déploiement Vercel et les réponses publiques doivent être contrôlés après push.
- Différence Git contrôlée ; seuls les fichiers listés dans le commit doivent être livrés. Pas de migration, réglage de compte, e-mail ou tarification changé.

## Après publication

Vérifier le build Vercel, les deux URL publiques, les canoniques/hreflang et les 46 URL du sitemap. L’indexation Google n’est pas garantie par la mise en ligne. Consigner le déploiement effectif puis l’observation d’environ 90 jours ; ne pas relancer des retouches éditoriales sur cette période. Le pied de page constitue un changement de maillage commun, pas une réécriture des autres pages.
