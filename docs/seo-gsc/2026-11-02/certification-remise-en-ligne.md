# Certification remise en ligne — 2 novembre 2026

Commit 89440cdf0bc9679ddc4afcd121a5c3099ddee4e0 poussé sur origin/master après accord explicite de Jeremy. Sept fichiers, depuis une copie propre basée sur f827a548. Les autres changements du dossier principal ne sont pas repris.

Déploiement Vercel dpl_5Pxk5JqW2bPHDUQGMzSUSixfKadv READY, alias kalivoa.com attaché. Compilation et vérification TypeScript de production terminées avec succès puisque le build complet est READY. TypeScript local réussi ; ESLint local indisponible (@babel/types manquant), vérification HTTP locale non aboutie. Aucun résultat de ces deux contrôles n’est inventé.

Vérifications réelles en production : /fr/certification et /en/certification affichent la page dans leur langue, H1 unique, canonical propre et trois hreflang cohérents (fr, en, x-default FR). Lien Certification présent dans le pied de page. Sitemap public : 46 URL, dont les deux URL certification restaurées. Capture et relevé DOM des métadonnées joints dans ce dossier.

Diagnostic : ces fichiers existaient localement mais étaient absents du commit f827a548 déployé. Aucune preuve d’une suppression volontaire ; remise en place demandée par Jeremy, puis commit/push explicitement autorisés.

Publication du correctif : 02/11/2026. Observation des pages restaurées jusqu’au 31/01/2027 environ ; changement du lien commun de pied de page consigné comme livraison de maillage. Aucune autre réécriture de contenu effectuée. Indexation de ces deux pages non encore contrôlée après rétablissement : disponibilité publique et sitemap ne valent pas confirmation d’indexation Google. Aucun renvoi de sitemap ou demande d’indexation répété dans cette livraison.
