# Diagnostic indexation et suite SEO/GEO — 22 octobre 2026
Contexte : Jeremy reporte ses preuves et souhaite avancer sans attendre. Aucune activation des abonnements demandée ni réalisée.
GSC Wizard toujours bloqué par abonnement ; interface GSC connectée utilisée.

## Résultats vérifiés aujourd'hui
- Sitemap public : **46 URL** (23 FR/23 EN), dont 14 URL Académie. Les deux nouvelles URL par rapport au 19/10 sont /fr/certification et /en/certification. Elles sont constatées en production, pas créées dans cette intervention.
- Audit HTTP des 46 : toutes 200, URL finale identique, canonique propre, aucun meta robots/googlebot noindex détecté, aucun en-tête X-Robots-Tag bloquant observé.
- Chaque URL a au moins un lien entrant depuis une autre page du périmètre ; aucun orphelin détecté dans ce périmètre. Chaque page contient trois liens hreflang. Ce contrôle n'est pas une validation exhaustive de tous les signaux ni un test Googlebot de toutes les URL.
- Robots public autorise l'exploration générale et OAI-SearchBot des pages publiques, exclut les espaces privés, bloque GPTBot. Aucun changement robots dans cette intervention.
- Rapport Pages GSC **daté du 16/10**, filtre sitemap : 24 indexées et 6 exclues, soit 30 prises en compte. Ne pas utiliser 24/46 comme ratio actuel.
- Rapport Sitemaps : envoi 12/10, **nouvelle lecture 21/10**, état « Opération effectuée », **44 URL découvertes**. L'écart 44/46 reflète des instantanés différents ; pas de renvoi répété nécessaire aujourd'hui.
- Inspection /fr/academie/verifier-ticket-pari-scan : **indexée** ; exploration 21/10 à 14:54:24, Googlebot smartphone, récupération réussie, indexation autorisée, canonique déclarée et sélection Google correspondant à l'URL inspectée. Un fil d'Ariane valide.
- Inspection /fr/academie/verifier-paris-tipster : **indexée**, HTTPS et un fil d'Ariane valide.
- Les dix autres URL d'articles et deux hubs ne sont pas inspectés individuellement aujourd'hui : statut individuel non disponible. Aucun taux d'indexation global Académie déduit.
- Inspection /fr/extension : détectée non indexée, aucune exploration historique. Test en ligne réussi : « Google a accès à cette URL », « La page peut être indexée ». **Demande d'indexation effectuée et confirmée le 22/10**. Confirmation de mise en file, pas preuve d'indexation.
- Inspection /fr/privacy : toujours doublon sur une exploration du **11/09**, antérieure au correctif du 25/09. Google avait choisi /privacy et ne voyait pas de canonique déclarée à cette date. Le contrôle public actuel retrouve une canonique propre. Découverte : « Erreur de traitement temporaire » affichée dans cette inspection ; ne pas généraliser en panne du sitemap, dont le rapport séparé signale une lecture réussie.
- Autres exclusions du rapport : /fr/responsible-gambling (doublon connu), /en/extension et /fr/partenaires /en/partenaires (détectées connues). Pas d'inspection individuelle de ces quatre URL aujourd'hui ; ne pas leur attribuer le résultat du test Extension FR.

## Interprétation
Le rapport global daté du 16/10 est en retard sur les inspections et la lecture du 21/10. La découverte a progressé depuis le 19/10 : au moins deux articles FR sont maintenant indexés. Cela ne garantit ni impressions, ni position, ni recommandation IA.
Le but n'est pas d'indexer toutes les redirections et les pages privées. Conserver les exclusions voulues ; prioriser les pages publiques utiles. Ne pas supprimer un noindex de connexion ou forcer une ancienne URL redirigée pour faire baisser un compteur.
Aucun correctif public nécessaire établi par cet audit ; pas de title/H1, contenu, robots ou maillage modifiés. Les fenêtres d'observation restent inchangées. Une demande d'indexation n'est pas une nouvelle optimisation de page.

## Travail indépendant des preuves de Jeremy
[Grille comparative documentée](../../seo-content/preparation-comparatif-2026-10-22.md) : caractéristiques annoncées dans les sources officielles de MaBankroll, Bet-Analytix et BettingTracker, distinction entre annonce et test, limites de comparaison. Livrée 22/10, **non publiée**.
Le scan OCR n'est pas exclusif à Kalivoa. Faire porter l'évaluation sur le parcours réel, la relecture, les données demandées, le périmètre statistique, les limites du partage et les offres effectivement ouvertes.
Cet ajout est une préparation documentaire dans le périmètre autorisé, pas une multiplication de pages. La priorité éditoriale hebdomadaire de témoignage reste en attente des réponses ; la recherche comparative avance pendant cette attente. Difficulté et volumes à vérifier auprès de Jeremy, contrôle sitemap+GSC final et preuve vécue nécessaires avant création/publication. Les preuves Kalivoa déjà validées peuvent être réutilisées si elles répondent exactement au besoin.
Aucun contact, publication externe, dépense ou ouverture d'abonnement effectué.

## Prochaines actions autonomes
1. Suivre la demande Extension FR sans la répéter ; prochain contrôle lors du relevé lundi.
2. Vérifier progressivement les autres pages utiles exclues, et compléter le statut des articles FR au besoin. Ne pas relancer 46 inspections par routine.
3. Compléter la comparaison documentaire et les limites réellement vérifiables, en conservant les brouillons tant que les conditions de création/publication ne sont pas réunies.

## Archives
audit-public.json (46 réponses et liens), sitemap.xml, robots.txt ; instantanés GSC index/scan/tipster/extension/privacy/sitemap ; captures de l'article scan indexé et de la demande Extension confirmée. Pas de nouveau relevé de performance hebdomadaire : se reporter au rapport du 19/10, sans réutiliser ses chiffres comme une actualisation du 22/10.
