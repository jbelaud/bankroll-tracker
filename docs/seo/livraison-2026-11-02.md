# Registre SEO et contrôles de publication — 02/11/2026

Article X de Nicholas Dulait consulté dans le navigateur : https://x.com/NicholasDulait/status/2117194945668714566. Il présente une organisation du contexte et des décisions pour Claude, avec promotion de ChatSEO. Adaptation à Kalivoa et Codex, sans reprise des commandes ni attribution à Codex des comportements de mémoire de Claude. Documentation officielle OpenAI consultée : https://learn.chatgpt.com/docs/agent-configuration/agents-md.

## Livré

Commit `04f0352e4ddebee485bc3f5082d7391d3db8f795` sur origin/master. Les changements parallèles c52327f (sécurité et accessibilité) ont été conservés par rebase, aucun push forcé. Déploiement Vercel `dpl_6de6RUdzKBD2wyUKH6thNGc3nGxp`, READY, kalivoa.com affecté à cette version.

- Point d’entrée docs/seo/README.md et consignes courtes dans AGENTS.md, règles Next existantes conservées.
- Registre 25 chemins / 50 URL localisées, intentions, états datés, preuves et observation des huit articles, sujets différés.
- État actuel et journal de décisions, sans remplacer les exports GSC ni considérer d’anciens brouillons comme encore en attente.
- Contrôle `pnpm seo:check` et exécution du vérificateur avant build de production ; étape dans la CI existante.
- Contrôle de disparition d’une route, perte d’une URL du sitemap, nouvelle page sans attribution, doublons d’intentions déclarées, preuves/dates des articles et changements des helpers robots/canonical/origine.

## Vérification

Neuf tests passent, dont simulations de disparition certification et normalisation Windows/Linux des empreintes. Registre actuel valide. Logs Vercel : `node scripts/seo-guardrails.mjs && next build` exécuté et succès du registre avant compilation ; build et déploiement réussis. Aucune dépendance ajoutée, aucun titre/H1 ou contenu public réécrit par cette livraison. Pas de nouvelle mesure GSC ni d’indexation supposée.

Les fichiers du registre et la consigne ont aussi été copiés/ajoutés au checkout principal en conservant les autres travaux. Les modifications applicatives, scripts et CI sont livrés via master distant ; le checkout principal très modifié n’a pas été réinitialisé ou remplacé par la copie de livraison.

## Limites

Le vérificateur est statique : il ne démontre ni indexation, ni qualité, ni absence de cannibalisation, ni conformité des métadonnées rendues. Son format est lié au tableau littéral publicPaths ; un refactor doit le mettre à jour explicitement. Les empreintes signalent une modification à examiner, elles ne constituent pas un verrou contre un changement malveillant de code et registre ensemble. Les tests ne transforment pas une difficulté inconnue en mot-clé facile.

Priorité de diffusion inchangée : post résultats par sport préparé ; Jeremy publie les trois posts X proposés. Aucun post, e-mail ou contact tiers envoyé. Aucune promesse de classement ou gain de trafic tirée du seul rangement des informations.
